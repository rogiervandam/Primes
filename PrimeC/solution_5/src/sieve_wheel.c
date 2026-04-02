// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>

static char algorithm_name[] = "rogiervandam_wheel";
static char algorithm_type[] = "wheel";
#define ALGORITHM_WHEEL 1

// include helper functions
#include "generic/settings.h"
#include "benchmark/sieve_options.h"
#include "bitstorage/bitstorage_search.h"
#include "bitstorage/bitstorage_setBitsTrue.h"
#include "bitstorage/bitstorage_setBitsTrue_base.h"
#include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"

static unsigned int wheel_steps[8]={
    3,2,1,2,1,2,3,1
};

static unsigned int wheel_mask[15] = {
    0, // 31->15
    1, // 33->16
    1, // 35->17
    0, // 37->18
    1, // 39->19
    0, // 41->20
    0, // 43->21
    1, // 45->22
    0, // 47->23
    0, // 49->24
    1, // 51->25
    0, // 53->26
    1, // 55->27
    1, // 57->28
    0  // 59->29
};
#define wheel_size 15
#define wheel_max 2 // highest number in the wheel

static inline counter_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_wheel(const void* restrict bitstorage, register counter_t index) 
{
    uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    uint8_t wheelmask = wheel_mask[index % wheel_size];
    if (wheelmask && index > wheel_max) return 1; // if the number is not coprime
    return (bitstorage_sized[index_type(index, uint8_t)] & markmask_type(index, uint8_t));
}

static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
searchBitFalse_wheel(void* restrict bitstorage, register counter_t index) 
{
    #pragma GCC ivdep
    #pragma GCC unroll 4
    for (;checkBitTrue_wheel(bitstorage, ++index););

    return index;
}


/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    struct sieve_t *sieve = sieve_create(sieve_size);
    void* bitstorage = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    const counter_t sieve_bits = sieve->bits;
    const counter_t prime_max = prime_stop(sieve_bits);

    // use globals as constant
    const counter_t stripeprime_faster = global_stripeprime_faster;
    const counter_t blocksize_bits     = global_blocksize_bits;
    
    verbose5(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)blocksize_bits); )

    // code for algorithm = base
    sieve_clear(sieve);

    for (counter_t block_start = 0; block_start < sieve_bits; block_start += blocksize_bits) {
        const counter_t block_stop = block_start + blocksize_bits;
        const counter_t range_stop = min(sieve_bits, block_stop);
        counter_t prime = wheel_max, wheel_step = 0;

        prime = searchBitFalse_wheel(bitstorage, prime);
        #pragma GCC unroll 16
        while (prime < prime_max) {
            // if (checkBitTrue(bitstorage, prime)) {
            //     prime += wheel_steps[wheel_step++];
            //     wheel_step %= wheel_size;
            //     continue;
            // }

            register const counter_t step = prime * 2 + 1;
            register counter_t start = compute_start(prime, block_start);
            setBitsTrue_base(bitstorage, start, step, range_stop);
            prime = searchBitFalse_wheel(bitstorage, prime);
        }
    } 
    
    // return the completed sieve
    return sieve;
}

#include "benchmark/sieve_check_wheel.h"
#include "benchmark/sieve_main.h"
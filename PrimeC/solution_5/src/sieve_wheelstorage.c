// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>

static char algorithm_name[60] = "rogiervandam_wheelstorage";
static char algorithm_type[] = "wheel";

#define ALGORITHM_WHEEL 1
#define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

#ifndef WHEEL_SIZE
    #define WHEEL_SIZE 2*3*5
    #define WHEEL_MAX 5 // highest number in the wheel
#endif

// include helper functions
#include "generic/settings.h"
#include "benchmark/sieve_options.h"
#include "bitstorage/bitstorage_search.h"
#include "bitstorage/bitstorage_setBitsTrue.h"
#include "bitstorage/bitstorage_setBitsTrue_base.h"
#include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"

// static unsigned int wheel[WHEEL_SIZE/2];
static unsigned int wheelprimes[WHEEL_MAX]; // can't be more than highest prime in the wheel
static uint8_t wheelmask[WHEEL_SIZE];

static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_wheel(const void* restrict bitstorage, register counter_t index) 
{
    if (index <= WHEEL_MAX/2) return wheelprimes[index];

    uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    // if (wheel[index % (WHEEL_SIZE/2)]) return 1; 
    counter_t wheelindex = index % (WHEEL_SIZE/2);
    if (wheelmask[index_type(wheelindex, uint8_t)] & markmask_type(wheelindex, uint8_t)) return 1;
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

// this is the same as checkBitTrue_wheel but without the check for the wheel primes
// this is used in searchBitFalse_wheel_unsafe which is called in the inner loop of the sieve and thus needs to be as fast as possible
static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_wheel_unsafe(const void* restrict bitstorage, register counter_t index)
{
    uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    // if (wheel[index % (WHEEL_SIZE/2)]) return 1; 
    counter_t wheelindex = index % (WHEEL_SIZE/2);
    if (wheelmask[index_type(wheelindex, uint8_t)] & markmask_type(wheelindex, uint8_t)) return 1;
    return (bitstorage_sized[index_type(index, uint8_t)] & markmask_type(index, uint8_t));
}

static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
searchBitFalse_wheel_unsafe(void* restrict bitstorage, register counter_t index) 
{
    #pragma GCC ivdep
    #pragma GCC unroll 4
    for (;checkBitTrue_wheel_unsafe(bitstorage, ++index););
    return index;
}

uint8_t checkBitTrue_generic(void* restrict bitstorage, register counter_t index) {
    if (index % 2 == 0) return 1; // even numbers are not prime
    return checkBitTrue_wheel(bitstorage, index/2);
}
// uint8_t searchBitFalse_generic(void* restrict bitstorage, register counter_t index) {
//     return searchBitFalse_wheel(bitstorage, index);
// };

void build_wheel() {
    // find all the primes in the wheel up to WHEEL_MAX and store them in /2 format
    for (counter_t i = 0; i <= WHEEL_MAX/2; i++) {
        wheelprimes[i]=0;
        for (counter_t f = 1; f < i; f++) {
            if (((i*2+1) % (f*2+1)) == 0) {
                wheelprimes[i] = 1; // mark as non-prime
                break;
            }
        }
    }

    // clear the wheelmask
    for (counter_t i=0; i < WHEEL_SIZE/2/8; i++) {
            wheelmask[i] = 0; 
    }

    // for (counter_t i = 0; i < WHEEL_SIZE/2; i++) {
    //     wheel[i] = 0;
    //     for (counter_t f = 1; f <= WHEEL_MAX/2; f++) {
    //         if (((i*2+1)+WHEEL_SIZE) % (f*2+1) == 0) {
    //             wheel[i] = 1;
    //             break;
    //         }
    //     }
    // }

    // make a mask pattern to check if the modulus WHEEL_SIZE/2 of a number is divisible by any of the primes in the wheel
    // this is used in checkBitTrue_wheel to quickly check if a number is divisible by any of the wheel primes
    for (counter_t i = 0; i < WHEEL_SIZE/2; i++) {
        for (counter_t f = 1; f <= WHEEL_MAX/2; f++) {
            if (((i*2+1)+WHEEL_SIZE) % (f*2+1) == 0) {
                wheelmask[index_type(i, uint8_t)] |= markmask_type(i, uint8_t);
                break;
            }
        }
    }

    // print the wheelmask for debugging
    // for (counter_t i = 0; i < WHEEL_SIZE/2; i++) {
    //     printf("wheelmask[%ju] =%u\n", (uintmax_t)i, wheelmask[index_type(i, uint8_t)] & markmask_type(i, uint8_t) ? 1 : 0);
    // }

    counter_t wheelmask_count = 0;
    for (counter_t i=0; i <= WHEEL_SIZE/2/8; i++) {
        wheelmask_count += __builtin_popcount(wheelmask[i]);
    }

    // append the wheel size to the algorithm name
    size_t prefix_len = 0; while (algorithm_name[prefix_len] != '\0') prefix_len++;
    sprintf(algorithm_name + prefix_len, "_%uof%u", (WHEEL_SIZE/2)-wheelmask_count, WHEEL_SIZE);

}

#define PREPARE_FUNCTION 1 // signals sieve_main to call prepareSieveFunction() before the benchmark starts, this is used to build the wheel
void prepareSieveFunction() {
    build_wheel();
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
    
    verbose5(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)blocksize_bits,(uintmax_t)WHEEL_MAX); )

    // code for algorithm = base
    sieve_clear(sieve);

    for (counter_t block_start = 0; block_start < sieve_bits; block_start += blocksize_bits) {
        const counter_t block_stop = block_start + blocksize_bits;
        const counter_t range_stop = min(sieve_bits, block_stop);
        counter_t prime = searchBitFalse_wheel_unsafe(bitstorage, WHEEL_MAX/2); 
        #pragma GCC unroll 16
        while (prime < prime_max) {
            register const counter_t step = prime * 2 + 1;
            register counter_t start = compute_start(prime, block_start);
            setBitsTrue_base(bitstorage, start, step, range_stop);
            prime = searchBitFalse_wheel_unsafe(bitstorage, prime);
        }
    } 
    
    // return the completed sieve
    return sieve;
}

#include "benchmark/sieve_check_wheel.h"
// #include "benchmark/sieve_check_generic.h"
#include "benchmark/sieve_main.h"
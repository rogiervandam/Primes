// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>
#include <inttypes.h> // needed for PRIx macros

static char algorithm_name[60] = "rogiervandam_wheelstorage";
static char algorithm_type[] = "wheel";

#define ALGORITHM_WHEEL 1
// #define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

#ifndef WHEEL_SIZE
    #define WHEEL_MAX 5 // highest number in the wheel
    #define WHEEL_BASIC_SIZE (2*3*5)
    #define WHEEL_REPEATS 1
    #define WHEEL_SIZE (WHEEL_BASIC_SIZE * WHEEL_REPEATS) 
#endif

// include helper functions
#include "generic/settings.h"
#undef SHIFT_SIZE
#define SHIFT_SIZE 0 // correct because we are not storing even numbers, so the number of bits is the same as the size of the sieve

#include "benchmark/sieve_options.h"
#include "generic/tools.h" // used for debugging
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_wheel.h"

#define PREPARE_FUNCTION 1 // signals sieve_main to call prepareSieveFunction() before the benchmark starts, this is used to build the wheel
void prepareSieveFunction() {
    build_wheel();
    option.fixed_benchmark_settings.blocksize_bits          = 1000000;
    option.fixed_benchmark_settings.vectorsize              = 256;
    option.fixed_benchmark_settings.algorithm               = 1;
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    struct sieve_t *sieve = sieve_create(sieve_size, sieve_size * wheelmask_stripe_bytes * 8 / WHEEL_SIZE ); // TODO: can sieve_size be smaller?
    void* bitstorage = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    // const counter_t sieve_bits = sieve->bits;
    const counter_t prime_max = prime_stop_full(sieve_size);

    // use globals as constant
    const counter_t largestep_faster   = global_largestep_faster * WHEEL_SIZE / (wheelmask_stripe_bytes * 8)*8 ; 
    const counter_t smallstep_faster   = global_stripeprime_faster * WHEEL_SIZE / (wheelmask_stripe_bytes * 8);
    counter_t blocksize_bits           = global_blocksize_bits;
    
    verbose5(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)blocksize_bits,(uintmax_t)WHEEL_MAX); )

    // code for algorithm = base
    sieve_clear(sieve);

    // #pragma GCC unroll 2
    blocksize_bits = sieve_size; // TODO: get blocksize working again
    for (counter_t block_start = 0; block_start < sieve_size; block_start += blocksize_bits) {

        const counter_t range_stop = min(sieve_size, block_start + blocksize_bits);
        verbose6( printf("Processing block starting at %ju stop at %ju\n",(uintmax_t)block_start, (uintmax_t)range_stop); )

        // counter_t prime = searchBitFalse_wheel(bitstorage, WHEEL_MAX+1);
        counter_t prime = findUnmarked(sieve, WHEEL_MAX+1);

        #pragma GCC unroll 32
        while (prime < prime_max) {

            register counter_t start = compute_start_full(prime, block_start);
            register const counter_t step = prime * 2;

            markFactors(sieve, start, range_stop, step);
            prime = findUnmarked(sieve, ++prime);
        }
    }
    
    return sieve;
}

#include "benchmark/sieve_main.h"

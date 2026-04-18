// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>

static char algorithm_name[60] = "rogiervandam_wheel";
static char algorithm_type[] = "wheel";
// #define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

#ifndef WHEEL_SIZE
    #define WHEEL_SIZE 2*3*5*7*11*13
    #define WHEEL_MAX 13 // highest number in the wheel
#endif

// include helper functions
// #include "generic/settings.h"
#include "benchmark/sieve_options.h"
// #include "bitstorage/bitstorage_search.h"
// #include "bitstorage/bitstorage_setBitsTrue.h"
// #include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_half.h"
#include "sieve/sieve_markWheel.h"

// implement the 3 functions to integrate with sieve_check and the storage level
static inline void markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) { markFactors_wheel(sieve, start, stop, step); }
static inline uint8_t checkFactor(sieve_t* sieve, register counter_t factor) { return checkFactor_wheel(sieve, factor); }
static inline counter_t findUnmarked(sieve_t *sieve, counter_t factor) { return findUnmarked_wheel(sieve, factor); }

#define PREPARE_FUNCTION 1 // signals sieve_main to call prepareSieveFunction() before the benchmark starts, this is used to build the wheel
void prepareSieveFunction() {
    build_wheel();

    option.fixed_benchmark_settings.stripe_faster           = 1; // unused
    option.fixed_benchmark_settings.largestep_faster        = 1; // unused
    option.fixed_benchmark_settings.algorithm               = ALGORITHM_WHEEL;
    option.fixed_benchmark_settings.storage                 = STORAGE_HALF;
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static sieve_t* shakeSieve(const counter_t sieve_size)
{
    sieve_t *sieve = sieve_create(sieve_size, calcBitsize_half(sieve_size));
    sieve_clear(sieve);

    const counter_t prime_max = calcFactor_max(sieve_size);
    const counter_t factorBlock = calcFactorsize_half(global_blocksize_bits);

    verbose5( printf("\nShaking sieve to find all primes up to %ju with blocksize %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)factorBlock,(uintmax_t)WHEEL_MAX); )

    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t block_stop = min(sieve_size, block_start + factorBlock);

        for (counter_t prime = findUnmarked(sieve, WHEEL_MAX); prime < prime_max; prime = findUnmarked(sieve, prime)) {
            markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
            TRACE_STEP_META(sieve->bitstorage, "markFactors", (int64_t)(prime*2+1),
                       (int64_t)block_start, (int64_t)block_stop, (int64_t)calcFactor_step(prime),
                       "wheel: prime %jd (idx %jd), block [%jd-%jd] step %jd",
                       (intmax_t)(prime*2+1), (intmax_t)prime, (intmax_t)block_start,
                       (intmax_t)block_stop, (intmax_t)calcFactor_step(prime));
        }
    } 
    
    // return the completed sieve
    return sieve;
}

#include "benchmark/sieve_main.h"
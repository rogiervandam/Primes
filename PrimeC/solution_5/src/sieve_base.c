// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>

static char algorithm_name[] = "rogiervandam_base";
static char algorithm_type[] = "base";
#define ALGORITHM_BASE 1

// include helper functions
// #include "generic/settings.h"
#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_half.h"
#include "sieve/sieve_markBase.h"

// implement the 3 functions to integrate with sieve_check and the storage level
static inline void markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) { markFactors_base(sieve, start, stop, step); }
static inline uint8_t checkFactor(sieve_t* sieve, register counter_t factor) { return checkFactor_half(sieve, factor); }
static inline counter_t findUnmarked(sieve_t *sieve, counter_t factor) { return findUnmarked_half(sieve, factor); }

// This is the main module that directs all the work 
static sieve_t* shakeSieve(const counter_t sieve_size)
{
    sieve_t *sieve = sieve_create(sieve_size, calcBitsize_half(sieve_size));
    sieve_clear(sieve);

    const counter_t prime_max = calcFactor_max(sieve_size);
    const counter_t factorBlock = calcFactorsize_half(global_blocksize_bits);
    
    verbose5( printf("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)factorBlock); )

    #pragma GCC unroll 2
    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t block_stop = min(sieve_size, block_start + factorBlock);

        #pragma GCC unroll 16
        for (counter_t prime = 3; prime < prime_max; prime = findUnmarked(sieve, prime)) {
            markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
            TRACE_STEP_META(sieve->bitstorage, "markFactors", (int64_t)(prime*2+1),
                       (int64_t)block_start, (int64_t)block_stop, (int64_t)calcFactor_step(prime),
                       "base: prime %jd (idx %jd), block [%jd-%jd] step %jd",
                       (intmax_t)(prime*2+1), (intmax_t)prime, (intmax_t)block_start,
                       (intmax_t)block_stop, (intmax_t)calcFactor_step(prime));
        }
    } 
    
    return sieve;
}

#include "benchmark/sieve_main.h"

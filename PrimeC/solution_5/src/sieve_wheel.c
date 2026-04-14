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
    #define WHEEL_SIZE 2*3*5
    #define WHEEL_MAX 5 // highest number in the wheel
#endif

// include helper functions
// #include "generic/settings.h"
#include "benchmark/sieve_options.h"
#include "bitstorage/bitstorage_search.h"
#include "bitstorage/bitstorage_setBitsTrue.h"
#include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_markWheel.h"

#define PREPARE_FUNCTION 1 // signals sieve_main to call prepareSieveFunction() before the benchmark starts, this is used to build the wheel
void prepareSieveFunction() {
    build_wheel();

    option.fixed_benchmark_settings.largestep_faster        = 256;
    option.fixed_benchmark_settings.algorithm               = ALGORITHM_WHEEL;
    option.fixed_benchmark_settings.storage                 = STORAGE_HALF;
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    sieve_t *sieve = sieve_create(sieve_size, calcBitsize(sieve_size, STORAGE_HALF));
    sieve_clear(sieve);

    const counter_t prime_max = calcFactor_max(sieve_size);
    const counter_t factorBlock = calcFactorsize(global_blocksize_bits, STORAGE_HALF);

    verbose5( printf("\nShaking sieve to find all primes up to %ju with blocksize %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)factorBlock,(uintmax_t)WHEEL_MAX); )

    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t block_stop = min(sieve_size, block_start + factorBlock);

        for (counter_t prime = findUnmarked(sieve, WHEEL_MAX); prime < prime_max; prime = findUnmarked(sieve, prime)) {
            markFactors_wheel(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
        }
    } 
    
    // return the completed sieve
    return sieve;
}

#include "benchmark/sieve_main.h"
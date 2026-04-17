// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "wheelstorage"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>

static char algorithm_name[60] = "rogiervandam_wheelstorage";
static char algorithm_type[] = "wheel";

// #define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

// #ifndef WHEEL_STORAGE
//     #define WHEEL_STORAGE WHEEL_STORAGE_8OF30
// #endif

#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_wheel.h"

// implement the 3 functions to integrate with sieve_check and the storage level
static inline void markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) { markFactors_wheelstorage(sieve, start, stop, step); }
static inline uint8_t checkFactor(sieve_t* sieve, register counter_t factor) { return checkFactor_wheelstorage(sieve, factor); }
static inline counter_t findUnmarked(sieve_t *sieve, counter_t factor) { return findUnmarked_wheelstorage(sieve, factor); }


#define PREPARE_FUNCTION 1 // signals sieve_main to call prepareSieveFunction() before the benchmark starts, this is used to build the wheel
void prepareSieveFunction() {
    build_wheel();

    // append the wheel size to the algorithm name
    size_t prefix_len = 0; while (algorithm_name[prefix_len] != '\0') prefix_len++;
    sprintf(algorithm_name + prefix_len, "_%uof%u", wheelmask_stripes, WHEEL_SIZE);

    option.fixed_benchmark_settings.largestep_faster        = 256;
    option.fixed_benchmark_settings.algorithm               = ALGORITHM_WHEEL;
    option.fixed_benchmark_settings.storage                 = STORAGE_WHEELTESTING;
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static sieve_t* shakeSieve(const counter_t sieve_size)
{
    sieve_t *sieve = sieve_create(sieve_size, calcBitsize(sieve_size, STORAGE_WHEELTESTING) ); 
    sieve_clear(sieve);

    const counter_t prime_max = calcFactor_max(sieve_size);
    const counter_t factorBlock = calcFactorsize(global_blocksize_bits, global_storage);

    verbose5( printf("\nShaking sieve to find all primes up to %ju with blocks %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)factorBlock,(uintmax_t)WHEEL_MAX); )

    // #pragma GCC unroll 2
    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t block_stop = min(sieve_size, block_start + factorBlock);

        verbose6( printf("Processing block with range%ju - %ju\n",(uintmax_t)block_start, (uintmax_t)block_stop); )

        // #pragma GCC unroll 32
        for (counter_t prime = findUnmarked(sieve, WHEEL_MAX+1); prime < prime_max;  prime = findUnmarked(sieve, ++prime)) {
            markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
        }
    }
    
    return sieve;
}

#include "benchmark/sieve_main.h"

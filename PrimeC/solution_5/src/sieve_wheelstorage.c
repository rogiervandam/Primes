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

#define ALGORITHM_WHEEL 1
// #define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

#ifndef WHEEL_SIZE
    #define WHEEL_MAX 5 // highest number in the wheel
    #define WHEEL_BASIC_SIZE (2*3*5)
    #define WHEEL_REPEATS 1
    #define WHEEL_SIZE (WHEEL_BASIC_SIZE * WHEEL_REPEATS) 
#endif

#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_wheel.h"

#define PREPARE_FUNCTION 1 // signals sieve_main to call prepareSieveFunction() before the benchmark starts, this is used to build the wheel
void prepareSieveFunction() {
    build_wheel();

    // append the wheel size to the algorithm name
    size_t prefix_len = 0; while (algorithm_name[prefix_len] != '\0') prefix_len++;
    sprintf(algorithm_name + prefix_len, "_%uof%u", wheelmask_stripes, WHEEL_SIZE);

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
    sieve_clear(sieve);

    const counter_t prime_max = calcFactor_max(sieve_size);
    const counter_t factorBlock = global_blocksize_bits * 2;

    verbose5( printf("\nShaking sieve to find all primes up to %ju with blocks %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)factorBlock,(uintmax_t)WHEEL_MAX); )

    #pragma GCC unroll 2
    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t block_stop = min(sieve_size, block_start + factorBlock);

        verbose6( printf("Processing block with range%ju - %ju\n",(uintmax_t)block_start, (uintmax_t)block_stop); )

        #pragma GCC unroll 32
        for (counter_t prime = findUnmarked(sieve, WHEEL_MAX+1); prime < prime_max;  prime = findUnmarked(sieve, ++prime)) {
            markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
        }
    }
    
    return sieve;
}

#include "benchmark/sieve_main.h"

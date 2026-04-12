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
#include "generic/settings.h"
#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_half.h"

// This is the main module that directs all the work 
static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    sieve_t *sieve = sieve_create(sieve_size, sieve_size>>1);
    sieve_clear(sieve);

    const counter_t prime_max = calcFactor_max(sieve_size);
    const counter_t factorBlock = global_blocksize_bits * 2;
    
    verbose5( printf("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)factorBlock); )

    #pragma GCC unroll 2
    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t range_stop = min(sieve_size, block_start + factorBlock);

        #pragma GCC unroll 16
        for (counter_t prime = 3; prime < prime_max; prime = findUnmarked(sieve, prime)) {
            markFactors(sieve, calcFactor_start(prime, block_start), range_stop, calcFactor_step(prime));
        }
    } 
    
    return sieve;
}

#include "benchmark/sieve_main.h"

// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

static char algorithm_name[] = "rogiervandam_base";
static char algorithm_type[] = "base";

// include helper functions
#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_half.h"
#include "sieve/sieve_markBase.h"

void prepareBenchmark() {
    option.fixed_benchmark_settings.stripe_faster           = 1;
    option.fixed_benchmark_settings.largestep_faster        = 1;
    option.fixed_benchmark_settings.vectorsize              = 128;
    option.algorithm_max                                    = 8;
    option.fixed_benchmark_settings.storage                 = STORAGE_HALF;
}

// This is the main module that directs all the work 
static sieve_t* shakeSieve(const counter_t sieve_size)
{
    sieve_t *sieve = sieve_create(sieve_size, calcBitsize(sieve_size, global_storage) );
    sieve_clear(sieve);

    const counter_t prime_max = calcFactor_max(sieve_size);
    const counter_t factorBlock = calcFactorsize(global_blocksize_bits);
    
    log5("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)factorBlock);

    PRAGMA_LOOP_UNROLL_8
    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t block_stop = min(sieve_size, block_start + factorBlock);

        PRAGMA_LOOP_UNROLL_32
        for (counter_t prime = 3; prime < prime_max; prime = findUnmarked(sieve, prime)) {
            log5(sieve->bitstorage, "MarkFactors: base prime %jd (idx %jd), block [%jd-%jd] step %jd",
                       (intmax_t)(prime*2+1), (intmax_t)prime, (intmax_t)block_start, (intmax_t)block_stop, (intmax_t)calcFactor_step(prime));
            markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
        }
    } 
    
    return sieve;
}

#include "benchmark/sieve_main.h"

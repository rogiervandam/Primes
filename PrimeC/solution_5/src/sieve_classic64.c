// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "classic style"
static char algorithm_name[] = "rogiervandam_classic64bit";
static char algorithm_type[] = "base";

// include helper functions
#include "benchmark/sieve_options.h"
#include "bitstorage/bitstorage_search.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_calc.h"

static inline uint8_t checkFactor(sieve_t *sieve, counter_t factor) {
    uint8_t* bitstorage = sieve->bitstorage;
    if (factor > 2 && factor % 2 == 0) return 1;
    return (uint8_t)(bitstorage[index_type(factor>>1, uint8_t)] & markmask_type(factor>>1, uint8_t));
}
static inline counter_t findUnmarked(sieve_t *sieve, counter_t start) {
    for (; checkFactor(sieve, start); start++);
    return start * 2 + 1;
}

void prepareBenchmark() {
    option.fixed_benchmark_settings.stripe_faster           = 1;
    option.fixed_benchmark_settings.largestep_faster        = 1;
    option.fixed_benchmark_settings.vectorsize              = 128;
    option.algorithm_max                                    = 1;
    option.fixed_benchmark_settings.storage                 = STORAGE_HALF;
}

#define bitbucket_t uint64_t

// This is the main module that directs all the work
// sieve_size in a real number that is the maximum in the sieve (not in bits)
static sieve_t* shakeSieve(const counter_t sieve_size, storage_type storage)
{
    sieve_t* sieve = sieve_create(sieve_size, storage);
    bitbucket_t* bitstorage = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    const counter_t sieve_bits = sieve->bits;
    const counter_t prime_max = ((1 + usqrt( (sieve_size) + 1 )) >> 1);

    log5("Shaking sieve to find all primes up to %ju",(uintmax_t)sieve_size);

    sieve_clear(sieve);
    counter_t prime = 1;
 
    while (prime < prime_max) {
        logStart5(bitstorage, time_makeFactors_classic64bit, "Setting bits with step %d in range %d-%d for prime %d", (int)(prime * 2 + 1), (int)(prime * (prime * 2 + 3)), (int)sieve_bits, (int)(prime * 2 + 1));
        const counter_t step  = prime * 2 + 1;
        const counter_t start = prime * (step + 1);

        // #pragma GCC ivdep
        #pragma GCC unroll 32
        for(counter_t i=start; i < sieve_bits; i += step) {
            bitstorage[index_type(i, bitbucket_t)] |= markmask_calc_type(i,bitbucket_t);
        }
        logStop5(bitstorage, time_makeFactors_classic64bit, "Finished setting bits with step %d in range %d-%d for prime %d", (int)step, (int)start, (int)sieve_bits, (int)(prime * 2 + 1));

        // #pragma GCC ivdep
        #pragma GCC unroll 32
        for (prime++; bitstorage[index_type(prime, bitbucket_t)] & markmask_type(prime, bitbucket_t); prime++);
    }

    // return the completed sieve
    return sieve;
}

#include "benchmark/sieve_main.h"
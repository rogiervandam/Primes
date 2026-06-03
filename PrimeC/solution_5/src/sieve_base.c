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

#include "sieve/sieve_shakeSieve.h"
#include "benchmark/sieve_main.h"

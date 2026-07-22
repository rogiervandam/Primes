// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

static char algorithm_name[60] = "rogiervandam_wheel";
static char algorithm_type[] = "wheel";

#ifndef WHEEL_SIZE
    #define WHEEL_SIZE 2*3*5*7*11*13
    #define WHEEL_MAX 13 // highest number in the wheel
#endif

// include helper functions
#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_wheelfilter.h"
#include "sieve/sieve_markWheel.h"

void prepareBenchmark() {
    build_wheel();

    option.fixed_benchmark_settings.stripe_faster           = 1; // unused
    option.fixed_benchmark_settings.largestep_faster        = 1; // unused
    option.fixed_benchmark_settings.storage                 = STORAGE_HALF;
}

#include "sieve/sieve_shakeSieve.h"
#include "benchmark/sieve_main.h"
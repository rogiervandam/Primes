// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "wheelstorage"
// This enables the compiler to optimize the code better

static char algorithm_name[60] = "rogiervandam_wheelstorage";
static char algorithm_type[] = "wheel";

#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "wheelstorage/wheelstorage.h"

void prepareBenchmark() {
    buildWheel();

    // append the wheel size to the algorithm name
    size_t prefix_len = 0; while (algorithm_name[prefix_len] != '\0') prefix_len++;
    sprintf(algorithm_name + prefix_len, "_%juof%ju", (uintmax_t)wheel_bitalloc, (uintmax_t)WHEEL_SIZE);

    option.fixed_benchmark_settings.storage                 = STORAGE_WHEEL;
    option.fixed_benchmark_settings.stripe_faster           = 1;
}

#include "sieve/sieve_shakeSieve.h"
#include "benchmark/sieve_main.h"

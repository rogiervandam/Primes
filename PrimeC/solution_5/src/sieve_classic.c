// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#ifdef __APPLE__
#include <mach/mach_time.h>
#else
#define _POSIX_C_SOURCE 199309L
#endif

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
#include <string.h>
#include <ctype.h> /* For isdigit() function */
#include <inttypes.h>
#ifdef _OPENMP
#include <omp.h>
#endif

// include helper functions
#include "benchmark/sieve_helpers.h"
#include "benchmark/sieve_options.h"
#include "benchmark/sieve_timers.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_search.h"
#include "sieve/sieve_setbitstrue_word.h"
#include "sieve/sieve_setbitstrue_vector.h"
#include "sieve/sieve_stripe.h"

static char algorithm_name[] = "rogiervandam_classic";
static char algorithm_type[] = "classic";

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* sieve_shake(const counter_t sieve_size)
{
    struct sieve_t *sieve = sieve_create(sieve_size);
    bitword_t* bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;
    const counter_t prime_max = 1+usqrt(sieve_size)/2;

    verbose7(  printf("\nShaking sieve to find all primes up to %ju\n",(uintmax_t)sieve_size); )

    sieve_clear(sieve);
    counter_t prime = 1;
 
    while (prime < prime_max) {
        const counter_t step  = prime * 2 + 1;
        const counter_t start = prime * (step + 1);

        for(counter_t i=start; i < sieve_bits; i += step) {
            bitstorage[wordindex(i)] |= markmask(i);
        }

        do { prime++; } while (bitstorage[wordindex(prime)] & markmask(prime));
    }

    // return the completed sieve
    return sieve;
}

#include "benchmark/sieve_check.h"
#include "benchmark/sieve_benchmark.h"
#include "benchmark/sieve_benchmark_tune.h"
#include "benchmark/sieve_validate.h"
#include "benchmark/sieve_usage.h"
#include "benchmark/sieve_parse_commandline.h"
#include "benchmark/sieve_main.h"
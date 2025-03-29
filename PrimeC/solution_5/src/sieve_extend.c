// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "extend"
// This enables the compiler to optimize the code better

#ifdef __APPLE__
#include <mach/mach_time.h>
#else
#define _POSIX_C_SOURCE 199309L
#endif

#include <stdio.h>
#include <stdlib.h> // for malloc, free, exit and getenv
#include <stdint.h> 
#include <time.h>
#include <string.h> // for memset and memcpy
// #include <inttypes.h>

#ifdef _OPENMP
#include <omp.h>
#endif

static char algorithm_name[] = "rogiervandam_extend";
static char algorithm_type[] = "other";

// include helper functions
#include "generic/preset.h"
#include "generic/settings.h"
#include "generic/helpers.h"
#include "generic/types.h"
#include "generic/verbose.h"
#include "generic/tools.h"
#include "benchmark/sieve_options.h"
#include "benchmark/sieve_timers.h"
#include "bitstorage/bitstorage_search.h"
#include "bitstorage/bitstorage_setBitsTrue.h"
#include "bitstorage/bitstorage_continuePattern.h"
#include "sieve/sieve_prime_calculations.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_extend.h"
#include "sieve/sieve_stripe.h"
#include "benchmark/benchmark_setBitsTrue_functions.h"

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    struct sieve_t *sieve = sieve_create(sieve_size);
    bitword_t* bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;
    const counter_t prime_max = prime_stop(sieve_bits);

    // use globals as constant
    const counter_t stripeprime_faster = global_stripeprime_faster;
    const counter_t blocksize_bits = global_blocksize_bits;

    verbose5( printf("\nShaking sieve to find all primes up to %ju by marking multiples of all primes up to %ju\n", (uintmax_t)sieve_size, (uintmax_t)usqrt(sieve_size)); )
    verbose5( printf("Using compressed primes up to %ju with sieve size %ju and blocksize %ju\n",(uintmax_t)prime_max, (uintmax_t)sieve_bits,(uintmax_t)blocksize_bits); )

    // fill the entire sieve for lower primes by adding en copying incrementally
    counter_t prime = sieve_block_extend0(sieve, sieve_bits);
    // counter_t prime = 1;
    
    // continue from the prime that was processed in the pattern until the tuned value for blockwise processing
    // stripe off all the multiples of primes in the sieve
    prime = stripeSieve(bitstorage, sieve_bits, prime, stripeprime_faster);
    if (prime >= prime_max) return sieve;

    // in the sieve all bits for the multiples of primes up to startprime have been set
    // process the sieve and stripe all the multiples of primes > start_prime
    // do this block by block to minimize cache misses
    // first block requires fewer operations; it might be the whole sieve...

    if (blocksize_bits >= sieve_bits) {
        stripeSieveBlock0(bitstorage, sieve_bits, prime, prime_max);
        return sieve;
    }

    counter_t block_start = ((sieve_bits % blocksize_bits) + cache_line_bytes*8) & ~(cache_line_bytes*8-1); 
    // counter_t block_start = ((stripeprime_faster * stripeprime_faster) + cache_line_bytes*8) & ~(cache_line_bytes*8-1); 

    stripeSieveBlock0(bitstorage, min(block_start, sieve_bits), prime, prime_max);
    // counter_t block_start = ((sieve_bits % blocksize_bits)) ;// + cache_line_bytes) & (cache_line_bytes-1); 
    for (counter_t block_stop = block_start + blocksize_bits; block_start < sieve_bits; block_start += blocksize_bits, block_stop += blocksize_bits) {
        stripeSieveBlock(bitstorage, block_start, min(block_stop, sieve_bits), prime, prime_max);
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

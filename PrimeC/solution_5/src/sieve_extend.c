// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "extend"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h> // for malloc, free, exit and getenv
#include <time.h>
#include <stdint.h>

static char algorithm_name[] = "rogiervandam_extend";
static char algorithm_type[] = "other";

// include helper functions
#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_half.h"
#include "bitstorage/bitstorage_continuePattern.h"

// implement the 3 functions to integrate with sieve_check and the storage level
static inline void markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) { markFactors_half(sieve, start, stop, step); }
static inline uint8_t checkFactor(sieve_t* sieve, register counter_t factor) { return checkFactor_half(sieve, factor); }
static inline counter_t findUnmarked(sieve_t *sieve, counter_t factor) { return findUnmarked_half(sieve, factor); }

#include "sieve/sieve_markStripe.h"
#include "sieve/sieve_markExtend.h"

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static sieve_t* shakeSieve(const counter_t sieve_size)
{
    sieve_t* sieve      = sieve_create(sieve_size, calcBitsize(sieve_size, STORAGE_HALF));
    const counter_t prime_max  = calcFactor_max(sieve_size);

    // use globals as constant - these get optimized
    const counter_t stripeprime_faster  = global_stripeprime_faster;
    const counter_t blocksize_factor    = calcFactorsize(global_blocksize_bits, STORAGE_HALF);
    const counter_t algorithm           = global_algorithm;

    verbose5({
        printf("\nShaking sieve to find all primes up to %ju by marking multiples of all primes up to %ju\n", (uintmax_t)sieve_size, (uintmax_t)calcFactor_max(sieve_size));
        printf("Using compressed primes up to %ju with sieve size %ju and blocksize %ju\n",(uintmax_t)prime_max, (uintmax_t)sieve_size,(uintmax_t)blocksize_factor);
    })

    switch( algorithm ) 
    {
        case 1:
        {
            // fill the entire sieve for lower primes by striping off the multiples in a small sieve
            // and copying this pattern to a extended sieve, until the sieve size matches the entire sieve
            counter_t prime = markExtendSieveBlock0(sieve, sieve_size);
            
            // continue from last the prime that was processed and stripe off the multiples of this prime
            // repeat until it is faster to do this block by block
            prime = markSieve(sieve, sieve_size, prime, stripeprime_faster);

            // process the remaining primes block by block to minimize cache misses
            markSieveBlockByBlock(sieve, sieve_size, blocksize_factor, prime, prime_max);
        } break;

        case 2: // process both extend and stripe block by block
        {
            counter_t prime_next = markExtendSieveBlockByBlock(sieve, sieve_size, blocksize_factor, stripeprime_faster);
            markSieveBlockByBlock(sieve, sieve_size, blocksize_factor, prime_next, prime_max);
        } break;

        case 3: // process everything block by block -- can be set via --set a3 on command line
        {
            markSieveBlockByBlock(sieve, sieve_size, blocksize_factor, 3, prime_max);
        } break;
    }

    // return the completed sieve
    return sieve;
} 

#include "benchmark/sieve_main.h"

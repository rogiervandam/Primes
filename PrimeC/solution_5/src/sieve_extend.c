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
#include "generic/settings.h"
#include "benchmark/sieve_options.h"
// #include "bitstorage/bitstorage_search.h"
// #include "bitstorage/bitstorage_setBitsTrue.h"
#include "bitstorage/bitstorage_continuePattern.h"
// #include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_half.h"
#include "sieve/sieve_stripe.h"
#include "sieve/sieve_extend.h"

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    const counter_t sieve_bits = sieve_size >> 1;
    struct sieve_t *sieve      = sieve_create(sieve_size, sieve_bits);
    const counter_t prime_max_half  = calcFactor_max_half(sieve_bits);
    const counter_t prime_max       = calcFactor_max(sieve_size);

    // use globals as constant - these get optimized
    const counter_t stripeprime_faster  = global_stripeprime_faster;
    const counter_t blocksize_bits      = global_blocksize_bits;
    const counter_t blocksize_factor    = blocksize_bits * 2;
    const counter_t algorithm           = global_algorithm;

    verbose5({
        printf("\nShaking sieve to find all primes up to %ju by marking multiples of all primes up to %ju\n", (uintmax_t)sieve_size, (uintmax_t)usqrt(sieve_size));
        printf("Using compressed primes up to %ju with sieve size %ju and blocksize %ju\n",(uintmax_t)prime_max, (uintmax_t)sieve_bits,(uintmax_t)blocksize_bits);
    })

    switch( algorithm ) 
    {
        case 1:
        {
            // fill the entire sieve for lower primes by adding en copying incrementally
            counter_t prime = extendSieveBlock0_half(sieve->bitstorage, sieve_bits);
            
            // continue from last the prime that was processed and stripe off the multiples of this prime
            // repeat until it is faster to do this block by block
            prime = markSieve(sieve, sieve_size, prime * 2 + 1, stripeprime_faster * 2 + 1) / 2;

            // process the remaining primes block by block to minimize cache misses
            markSieveBlockByBlock(sieve, sieve_size, blocksize_factor, prime * 2 + 1, prime_max_half * 2 + 1);
        } break;

        case 2: // process extend and stripe block by block
        {
            counter_t prime_next = extendSieveBlockByBlock(sieve, sieve_size, blocksize_factor, stripeprime_faster * 2 + 1);
            markSieveBlockByBlock(sieve, sieve_size, blocksize_factor, prime_next, prime_max_half * 2 + 1);
        } break;

        // case 3: // process everything block by block -- can be set via --set a3 on command line
        // {
        //     stripeSieveBlockByBlock(sieve->bitstorage, sieve_bits, blocksize_bits, 1, prime_max);
        // } break;
    }

    // return the completed sieve
    return sieve;
} 

#include "benchmark/sieve_main.h"

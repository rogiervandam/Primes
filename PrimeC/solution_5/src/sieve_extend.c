// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "extend"
// This enables the compiler to optimize the code better

static char algorithm_name[] = "rogiervandam_extend";
static char algorithm_type[] = "other";

// include helper functions
#include "benchmark/sieve_options.h"
#include "sieve/sieve_manager.h"
#include "sieve/sieve_storage_half.h"
#include "bitstorage/bitstorage_continuePattern.h"
#include "sieve/sieve_markSieve.h"
#include "sieve/sieve_markExtend.h"

void prepareBenchmark() {
    option.algorithm_max                                    = 2;
    option.fixed_benchmark_settings.storage                 = STORAGE_HALF;
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static sieve_t* shakeSieve(const counter_t sieve_size, storage_type storage)
{
    sieve_t* sieve      = sieve_create(sieve_size, calcBitsize_half(sieve_size));
#ifdef COMPILE_TRACE
    // Keep traced diffs deterministic: start from a known all-clear bitstorage state.
    sieve_clear(sieve);
#endif
    const counter_t prime_max  = calcFactor_max(sieve_size);

    // use globals as constant - these get optimized
    const counter_t stripeprime_faster  = global_stripeprime_faster;
    const counter_t blocksize_factor    = calcFactorsize_half(global_blocksize_bits);
    const counter_t algorithm           = global_algorithm;

    log4("\nShaking sieve to find all primes up to %ju by marking multiples of all primes up to %ju\n", (uintmax_t)sieve_size, (uintmax_t)calcFactor_max(sieve_size));
    log4("Using compressed primes up to %ju with sieve size %ju and blocksize %ju\n",(uintmax_t)prime_max, (uintmax_t)sieve_size,(uintmax_t)blocksize_factor);

    switch( algorithm ) 
    {
        case 1: // extend for the whole sieve, then stripe off the remaining primes block by block
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

        case 2: // extend block by block and stripe block by block
        {
            counter_t prime_next = markExtendSieveBlockByBlock(sieve, sieve_size, blocksize_factor, stripeprime_faster);
            markSieveBlockByBlock(sieve, sieve_size, blocksize_factor, prime_next, prime_max);
        } break;

        // case 3: // stripe everything block by block, no extend used
        // {
        //     markSieveBlockByBlock(sieve, sieve_size, blocksize_factor, 3, prime_max);
        // } break;
    }

    // return the completed sieve
    return sieve;
} 

#include "benchmark/sieve_main.h"

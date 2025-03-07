// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
#include <string.h>
#include <ctype.h> /* For isdigit() function */
#ifdef _OPENMP
#include <omp.h>
#endif

// include helper functions
#include "sieve_helpers.h"
#include "sieve_options.h"
#include "sieve_helpers_timers.h"
#include "sieve_functions.h"
#include "sieve_extend_continuePattern.h"

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

    // use globals as constant
    const counter_t stripeprime_faster = global_stripeprime_faster;
    // const counter_t mediumstep_faster = global_mediumstep_faster;
    // const counter_t largestep_faster = global_largestep_faster;
    const counter_t blocksize_bits = global_blocksize_bits;
    
    verbose5(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)block_size); )

    // code for algorithm = base
    sieve_clear(sieve);
    counter_t prime = 1;

    // stripe off all the multiples of primes in the sieve
    prime = sieve_stripe(bitstorage, sieve_bits, prime, stripeprime_faster );

    // do this block by block to minimize cache misses
    // first block requires fewer operations; it might be the whole sieve...
    sieve_block_stripe0(bitstorage, min(blocksize_bits, sieve_bits), prime, prime_max);

    // // process the remaining blocks
    for (counter_t block_start = blocksize_bits, block_stop = 2*blocksize_bits-1; block_start <= sieve_bits; block_start += blocksize_bits, block_stop += blocksize_bits) {
        sieve_block_stripe(bitstorage, block_start, min(block_stop, sieve_bits), prime, prime_max);
    } 
    
    // return the completed sieve
    return sieve;
}

#include "sieve_checks.h"
#include "sieve_benchmark.h"
#include "sieve_checks2.h"

static char algorithm_name[] = "rogiervandam_base";
static char algorithm_type[] = "base";

#include "sieve_commandline.h"
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
#include "sieve_functions.h"
#include "sieve_extend_continuePattern.h"

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* sieve_shake(const counter_t sieve_size, const counter_t block_size) 
{
    struct sieve_t *sieve = sieve_create(sieve_size);
    bitword_t* bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;

    verbose4( printf("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)block_size); )

    // code for algorithm = base
    sieve_clear(sieve);
    counter_t prime_next = 1;
    
    // continue from the prime that was processed in the pattern until the tuned value for blockwise processing
    // stripe off all the multiples of primes in the sieve
    if (prime_next < global_smallprime_faster) {
        prime_next = sieve_block_stripe(bitstorage, 0, sieve_bits, prime_next, global_smallprime_faster);
    }

    // in the sieve all bits for the multiples of primes up to startprime have been set
    // process the sieve and stripe all the multiples of primes > start_prime
    // do this block by block to minimize cache misses
    counter_t prime_max = usqrt(sieve_size);
    for (counter_t block_start = 0, block_stop = block_size-1;    block_start <= sieve->bits;    block_start += block_size, block_stop += block_size) {
        sieve_block_stripe(bitstorage, block_start, min(block_stop, sieve_bits), prime_next, prime_max);
    } 

    // return the completed sieve
    return sieve;
}

#include "sieve_checks.h"
#include "sieve_benchmark.h"

char algorithm_name[] = "rogiervandam_base";
#include "sieve_commandline.h"
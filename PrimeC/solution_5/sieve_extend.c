// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

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

// returns prime that could not be handled:
// start is too large
// range is too big
static counter_t sieve_block_extend(struct sieve_t *sieve, const counter_t block_start, const counter_t block_stop) 
{
    bitword_t* restrict bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;
    bitstorage[0] = SAFE_ZERO; // only the first word has to be cleared; the rest is populated by the extension procedure

    register counter_t prime         = 1;
    counter_t step                   = prime * 2 + 1;
    counter_t start                  = prime * (step + 1);
    counter_t range_stop             = step * 2;  // range is x2 so the second block cointains all multiples of primes
    counter_t pattern_start          = 0;
    counter_t patternsize_bits       = 3;

    setBitsTrue_mediumStep(bitstorage, start, step, range_stop);

    for (;range_stop < block_stop;) {
        prime = searchBitFalse(bitstorage, prime);

        const counter_t step = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if unlikely(start > block_stop) break;

        range_stop = patternsize_bits * step * 2;  // range is x2 so the second block cointains all multiples of primes
        if unlikely(range_stop > block_stop) break;

        // continue the found pattern to the entire sieve
        pattern_start = patternsize_bits;
        continuePattern(bitstorage, pattern_start, patternsize_bits, range_stop);
        patternsize_bits *= step;

        if (step < global_mediumstep_faster)      setBitsTrue_mediumStep(bitstorage, start, step, range_stop);
        else if (step < global_vectorstep_faster) setBitsTrue_largeRange_vector(bitstorage, start, step, range_stop);
        else                                      setBitsTrue_largeRange(bitstorage, start, step, range_stop);
    } 

    // continue the found pattern to the entire sieve
    continuePattern(bitstorage, pattern_start, patternsize_bits, sieve_bits);
    return prime;
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* sieve_shake(const counter_t sieve_size, const counter_t block_size) 
{
    struct sieve_t *sieve = sieve_create(sieve_size);
    bitword_t* bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;

    verbose4(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)block_size); )

    // fill the entire sieve for lower primes by adding en copying incrementally
    counter_t prime_next = sieve_block_extend(sieve, 0, sieve_bits);
    
    // continue from the prime that was processed in the pattern until the tuned value for blockwise processing
    // stripe off all the multiples of primes in the sieve
    if (prime_next < global_smallprime_faster) {
        prime_next = sieve_block_stripe(bitstorage, 0, sieve_bits, prime_next, global_smallprime_faster);
    }

    // in the sieve all bits for the multiples of primes up to startprime have been set
    // process the sieve and stripe all the multiples of primes > start_prime
    // do this block by block to minimize cache misses
    counter_t prime_max = usqrt(sieve_size);
    for (counter_t block_start = 0, block_stop = block_size-1; block_start <= sieve->bits; block_start += block_size, block_stop += block_size) {
        sieve_block_stripe(bitstorage, block_start, min(block_stop, sieve_bits), prime_next, prime_max);
    } 

    // return the completed sieve
    return sieve;
}

#include "sieve_checks.h"
#include "sieve_benchmark.h"

static void algorithmWelcome() {
    verbose2({
        printf("Sieve algorithm by Rogier van Dam - 2025\n");
        printf("Find all primes up to \033[1;33m%ju\033[0m using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)\n", (uintmax_t)option.factor_max);
    })
    verbose1( printf("\nRunning sieve_extend variant u%juv%ju... \n", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); )
}

static void reportMessage(const char* extension, const char* extended_output, const benchmark_result_t benchmark_result, const counter_t threads) {
    printf("rogiervandam_extend%s%s;%ju;%f;%ju;algorithm=other,faithful=yes,bits=1\n",extension,extended_output,(uintmax_t)benchmark_result.passes,benchmark_result.elapsed_time,(uintmax_t)threads);
}

#include "sieve_commandline.h"



// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "classic style"

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>

static char algorithm_name[] = "rogiervandam_blockstorage30";
static char algorithm_type[] = "base";
#define ALGORITHM_CLASSIC 1
#define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

#define CALCSIZE 1000000
#define BLOCKS 210
#define BLOCK_CACHES ((CALCSIZE/BLOCKS/8/cache_line_bytes)+1)
#define BLOCKSIZE_BITS (BLOCK_CACHES*cache_line_bytes*8)
#define BLOCKSIZE_UNIT8 (BLOCKSIZE_BITS/8)

// include helper functions
#include "generic/settings.h"

#undef SHIFT_SIZE
#define SHIFT_SIZE 0 // correct because we are not storing even numbers, so the number of bits is the same as the size of the sieve

#include "benchmark/sieve_options.h"
#include "bitstorage/bitstorage_search.h"
#include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"


// This is the main module that directs all the work
// sieve_size in a real number that is the maximum in the sieve (not in bits)

#define bitbucket_t uint8_t

// Set one bit to true
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
setBitTrue_block(void* restrict bitstorage, const register counter_t index) 
{
    // if (index %2 == 0) return; // skip even numbers, they are not stored in the sieve
    register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    counter_t block_index = index / BLOCKS;
    counter_t block = index % BLOCKS;
    counter_t block_byte = block * BLOCKSIZE_UNIT8 + block_index / 8;
    counter_t bit_index = block_index % 8;
    // counter_t block_byte = index / 8;
    // counter_t bit_index = index % 8;
    // printf("Setting bit for index %ju: block %ju, block_index %ju, block_byte %ju, bit_index %ju\n",(uintmax_t)index,(uintmax_t)block,(uintmax_t)block_index,(uintmax_t)block_byte,(uintmax_t)bit_index);
    bitstorage_sized[block_byte] |= (uint8_t)((uint8_t)1ULL << bit_index);
}

static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_block(const void* restrict bitstorage, register counter_t index) 
{
    if (index % 2 == 0) return 1; // even numbers are not stored in the sieve, so they are always marked as true (not prime)
    uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    counter_t block_index = index / BLOCKS;
    counter_t block = index % BLOCKS;
    counter_t block_byte = block * BLOCKSIZE_UNIT8 + block_index / 8;
    counter_t bit_index = block_index % 8;
    // counter_t block_byte = index  / 8;
    // counter_t bit_index = index % 8;

    return (bitstorage_sized[block_byte] & (uint8_t)((uint8_t)1ULL << bit_index));
}

static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
searchBitFalse_block(void* restrict bitstorage, register counter_t index) 
{
    #pragma GCC ivdep
    #pragma GCC unroll 4
    for (;checkBitTrue_block(bitstorage, ++index););
    return index;
}

static inline counter_t __attribute__((always_inline, const)) 
prime_stop_full(const counter_t range_stop) {
    return ((1 + usqrt( (range_stop) + 1 )));
}

// calculate the first multiple of a prime number in a given range
static inline counter_t __attribute__((always_inline, const))
compute_start_full(const counter_t prime, const counter_t block_start) {
    register const counter_t step = prime * 2 + 1;
    register counter_t start = prime * (step + 1);
    if (block_start && start < block_start) {
        start = (block_start + prime) + prime - ((block_start + prime) % step);
    }
    return start;
}

static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    struct sieve_t *sieve = sieve_create(sieve_size*8);
    sieve->bits = sieve_size;
    bitbucket_t* bitstorage = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    const counter_t sieve_bits = sieve_size;
    const counter_t prime_max = prime_stop_full(sieve_bits);

    verbose5( printf("\nShaking sieve to find all primes up to %ju\n",(uintmax_t)sieve_size); )

    sieve_clear(sieve);
    counter_t prime = 3;
 
    // printf("Starting with prime %ju, marking multiples up to %ju\n",(uintmax_t)prime,(uintmax_t)sieve_bits);
    // printf("Block size: %ju bits, %ju bytes\n",(uintmax_t)BLOCKSIZE_BITS,(uintmax_t)BLOCKSIZE_UNIT8);

    while (prime < prime_max) {
        const counter_t step  = prime * 2;
        const counter_t start = prime * prime;

        // #pragma GCC ivdep
        // #pragma GCC unroll 32
        // printf("Marking multiples of %ju starting at %ju\n",(uintmax_t)prime,(uintmax_t)start);
        for(counter_t i=start; i < sieve_bits; i += step) {
            // printf("Marking %ju\n",(uintmax_t)i);
            setBitTrue_block(bitstorage, i);
            // if (i>100) break;
        }

        // #pragma GCC ivdep
        // #pragma GCC unroll 32
        for (prime++; checkBitTrue_block(bitstorage, prime); prime++);
        // break;
    }

    // return the completed sieve
    return sieve;
}

#include "benchmark/sieve_check_blockstorage.h"
#include "benchmark/sieve_main.h"
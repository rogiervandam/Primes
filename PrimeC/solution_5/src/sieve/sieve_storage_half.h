#pragma once

#include "../bitstorage/bitstorage_search.h"
#include "../bitstorage/bitstorage_setBitsTrue.h"

#define STORAGE_HALF_DEFINED 1

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
markFactor(sieve_t *sieve, counter_t index)
{
    setBitTrue_uint8(sieve->bitstorage, index>>1);
}

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
markFactors_half(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
{
    setBitsTrue(sieve->bitstorage, start>>1, stop>>1, step>>1);
}
    
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
findUnmarked_large(sieve_t *sieve, counter_t start) 
{
    return searchBitFalse_largestep_uint8(sieve->bitstorage, start>>1) * 2 + 1;
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
findUnmarked_half(sieve_t *sieve, counter_t start) 
{
    return searchBitFalse_uint8(sieve->bitstorage, start>>1) * 2 + 1;
}

static inline counter_t __attribute__((always_inline, const)) 
calcFactor_max_half(const counter_t range_stop) {
    return ((1 + usqrt( (range_stop << 1) + 1 )) >> 1);
}

// // calculate the first multiple of a prime number in a given range
static inline counter_t __attribute__((always_inline, const))
calcFactor_start_half(const counter_t prime, const counter_t block_start) {
    register const counter_t step = prime * 2 + 1;
    register counter_t start = prime * (step + 1);
    if (block_start && start < block_start) {
        start = (block_start + prime) + prime - ((block_start + prime) % step);
    }
    return start;
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcFactor_step_half(counter_t prime) 
{
    return prime * 2 + 1;
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcFactor_half(counter_t prime) 
{
    return ((prime << 1) & 1);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcBitsize_half(counter_t factorsize) 
{
    return (factorsize >> 1) + (factorsize & 1);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcFactorsize_half(counter_t bitsize) 
{
    return (bitsize << 1);
}

static inline uint8_t checkFactor_half(sieve_t *sieve, counter_t factor) {
    if (factor > 2 && factor % 2 == 0) return 1;
    return checkBitTrue_uint8(sieve->bitstorage, factor >> 1);
}

// integration with the generic sieve calculation functions
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcFactorsize(counter_t bitsize) 
{
    return calcFactorsize_half(bitsize);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcBitsize(counter_t factorsize) 
{
    return calcBitsize_half(factorsize);
}

#include "../sieve/sieve_calc.h"

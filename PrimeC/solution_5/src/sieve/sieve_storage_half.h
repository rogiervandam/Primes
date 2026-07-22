// #pragma once

#include "../bitstorage/bitstorage_search.h"
#include "../bitstorage/bitstorage_setBitsTrue.h"

#define STORAGE_HALF_DEFINED 1

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
markFactors_half(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
{
    setBitsTrue(sieve->bitstorage, start>>1, stop>>1, step>>1);
}
    
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
findUnmarked_half(sieve_t *sieve, counter_t start) 
{
    return searchBitFalse_uint8(sieve->bitstorage, start>>1) * 2 + 1;
}

static inline uint8_t 
checkFactor_half(sieve_t *sieve, counter_t factor) {
    if (factor > 2 && factor % 2 == 0) return 1;
    return checkBitTrue_uint8(sieve->bitstorage, factor >> 1);
}

#include "../sieve/sieve_calc.h"

static inline uint8_t checkFactor(sieve_t* sieve, register counter_t factor) { return checkFactor_half(sieve, factor); }
static inline counter_t findUnmarked(sieve_t *sieve, counter_t factor) { return findUnmarked_half(sieve, factor); }

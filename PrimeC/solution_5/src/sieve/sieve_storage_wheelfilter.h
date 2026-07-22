// #pragma once

#include "../bitstorage/bitstorage_search.h"
#include "../bitstorage/bitstorage_setBitsTrue.h"

#define STORAGE_HALF_DEFINED 1

// static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
// findUnmarked_half(sieve_t *sieve, counter_t start) 
// {
//     return searchBitFalse_uint8(sieve->bitstorage, start>>1) * 2 + 1;
// }

// static inline uint8_t 
// checkFactor_half(sieve_t *sieve, counter_t factor) {
//     if (factor > 2 && factor % 2 == 0) return 1;
//     return checkBitTrue_uint8(sieve->bitstorage, factor >> 1);
// }

static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_wheel(const void* restrict bitstorage, register counter_t factor) 
{
    uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t index = factor >> 1;
    counter_t wheelindex = index % (WHEEL_SIZE/2);
    if (wheelmask[index_type(wheelindex, uint8_t)] & markmask_type(wheelindex, uint8_t)) return 1;
    // if (wheel[wheelindex]) return 1;
    return (bitstorage_sized[index_type(index, uint8_t)] & markmask_type(index, uint8_t));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
markFactors_wheel(sieve_t *sieve, const counter_t start, const counter_t stop, const counter_t step)
{
    logStart5(sieve->bitstorage, time_markFactors_wheel, "Markfing with wheel range %ju - %ju, step %ju", start >> 1, stop >> 1, step >> 1);
    setBitsTrue(sieve->bitstorage, start >> 1, stop >> 1, step >> 1);
    logStop5(sieve->bitstorage, time_markFactors_wheel, "Finished marking with wheel range %ju - %ju, step %ju", start >> 1, stop >> 1, step >> 1);
}

uint8_t checkFactor_wheel(sieve_t* sieve, register counter_t factor) {
    if (factor > 2 && factor % 2 == 0) return 1;
    if (factor <= WHEEL_MAX) return wheel_primes[factor];
    return checkBitTrue_wheel(sieve->bitstorage, factor);
}

static inline counter_t __attribute__((always_inline, hot, nonnull, const))
findUnmarked_wheel(sieve_t *sieve, register counter_t factor)
{
    #pragma GCC ivdep
    #pragma GCC unroll 4
    for (; checkFactor_wheel(sieve, factor += 2););
    return factor;
}

#include "../sieve/sieve_calc.h"

static inline uint8_t checkFactor(sieve_t* sieve, register counter_t factor) { return checkFactor_wheel(sieve, factor); }
static inline counter_t findUnmarked(sieve_t *sieve, counter_t factor) { return findUnmarked_wheel(sieve, factor); }
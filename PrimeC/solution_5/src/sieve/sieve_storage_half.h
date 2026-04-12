#include "../bitstorage/bitstorage_search.h"
#include "../bitstorage/bitstorage_setBitsTrue.h"
#include "../bitstorage/bitstorage_setBitsTrue_base.h"
#include "../sieve/sieve_calc.h"

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
markFactor(sieve_t *sieve, counter_t index)
{
    setBitTrue_uint8(sieve->bitstorage, index>>1);
}

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
{
    setBitsTrue_base(sieve->bitstorage, start>>1, step>>1, stop>>1);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
findUnmarked(sieve_t *sieve, counter_t start) 
{
    return searchBitFalse_largestep_uint8(sieve->bitstorage, start>>1) * 2 + 1;
}

// static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
// calcFactor_start(counter_t prime, counter_t block_start) 
// {
//     return compute_start_full(prime, block_start);
// }

// static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
// calcFactor_step(counter_t prime) 
// {
//     return prime * 2;
// }

// static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
// calcFactor_max(counter_t sieve_size) 
// {
//     return prime_stop_full(sieve_size);
// }

#ifndef CHECK_FACTOR
#define CHECK_FACTOR
// This function decouples the factor from the bitstorage
static inline int checkFactor(sieve_t *sieve, counter_t factor) {
    if (factor > 2 && factor % 2 == 0) return 1;
    return checkBitTrue(sieve->bitstorage, factor >> 1);
}
#endif

#include "../generic/setsuffix.h"
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
NAME(setBitTrue,suffix)(void* restrict bitstorage __attribute__((aligned(cache_line_bytes))), const register counter_t index) 
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    bitstorage_sized[index_type(index,bitbucket_t)] |= markmask_type(index, bitbucket_t);
}

static void
NAME(setBitFalse,suffix)(void* restrict bitstorage, const register counter_t index) 
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    bitstorage_sized[index_type(index,bitbucket_t)] &= ~markmask_type(index, bitbucket_t);
}

static inline void __attribute__((always_inline, hot, nonnull)) 
NAME(setBitsTrue_range,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    #pragma GCC ivdep
    #pragma GCC unroll 32
    for(register counter_t index = range_start; index < range_stop; index += step) NAME(setBitTrue,suffix)(bitstorage, index);
}

// this function returns the last index that was set
static inline counter_t __attribute__((always_inline, hot, nonnull)) 
NAME(setBitsTrue_range_return,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    register counter_t index = range_start;
    #pragma GCC ivdep
    #pragma GCC unroll 32
    for(; index < range_stop; index += step) NAME(setBitTrue,suffix)(bitstorage, index);
    return index;
}

#include "../generic/cleansuffix.h"


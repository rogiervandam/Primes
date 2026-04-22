#include "../generic/variants/setsuffix.h"
#include "../generic/verbose.h"

// Set one bit to true
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(setBitTrue,suffix)(void* restrict bitstorage, const register counter_t index) 
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    bitstorage_sized[index_type(index,bitbucket_t)] |= markmask_type(index, bitbucket_t);
    log9(bitstorage, "SetBitTrue: setting bit at index %ju", (uintmax_t)index);
}

// Set one bit to false
static void
function(setBitFalse,suffix)(void* restrict bitstorage, const register counter_t index) 
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    bitstorage_sized[index_type(index,bitbucket_t)] &= ~markmask_type(index, bitbucket_t);
    log9(bitstorage, "SetBitFalse: clearing bit at index %ju", (uintmax_t)index);
}

// Set bits to true with a step in a range. 
static inline void __attribute__((always_inline, hot, nonnull)) 
function(setBitsTrue_range,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logBegins8(bitstorage, time_setBitsTrue_range, "SetBitsTrueRange: setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju repeating occurrences)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    #pragma GCC ivdep
    #pragma GCC unroll 32
    for(register counter_t index = range_start; index < range_stop; index += step) function(setBitTrue,suffix)(bitstorage, index);

    // log8(bitstorage,
    //            "SetBitsTrueRange: range_start=%ju range_stop=%ju step=%ju",
    //            (uintmax_t)range_start,
    //            (uintmax_t)range_stop,
    //            (uintmax_t)step);

    logEnds8(bitstorage, time_setBitsTrue_range,"SetBitsTrueRange: range_start=%ju range_stop=%ju step=%ju",
               (uintmax_t)range_start,
               (uintmax_t)range_stop,
               (uintmax_t)step);
}

// Set bits to true with a step in a range. This function returns the last index that was set
static inline counter_t __attribute__((always_inline, hot, nonnull)) 
function(setBitsTrue_range_return,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logBegins8(bitstorage, time_setBitsTrue_range_return, "SetBitsTrueRangeReturn: setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju repeating occurrences)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    register counter_t index = range_start; // outside the loop te be able to return it
    #pragma GCC ivdep
    #pragma GCC unroll 32
    for(; index < range_stop; index += step) function(setBitTrue,suffix)(bitstorage, index);

    // log8(bitstorage,
    //            "SetBitsTrueRangeReturn: range_start=%ju range_stop=%ju step=%ju",
    //            (uintmax_t)range_start,
    //            (uintmax_t)range_stop,
    //            (uintmax_t)step);

    logEnds8(bitstorage, time_setBitsTrue_range_return,"SetBitsTrueRangeReturn: range_start=%ju range_stop=%ju step=%ju",
               (uintmax_t)range_start,
               (uintmax_t)range_stop,
               (uintmax_t)step);
    return index;
}

#include "../generic/variants/cleansuffix.h"


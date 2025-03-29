
#ifndef variant
#define bitbucket_t uint8_t
#define suffix
// #include "../generic/setsuffix.h"
static inline void __attribute__((always_inline, hot, nonnull)) 
NAME(setBitTrue,suffix)(void* restrict bitstorage, const register counter_t index) 
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

// static inline void __attribute__((always_inline, , hot, nonnull)) 
static void
NAME(setBitsTrue_range,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    for(register counter_t index = range_start; index < range_stop; index += step) NAME(setBitTrue,suffix)(bitstorage, index);
}

// this function returns the last index that was set

static inline counter_t __attribute__((always_inline, hot, nonnull)) 
NAME(setBitsTrue_range_return,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    register counter_t index = range_start;
    for(; index < range_stop; index += step) NAME(setBitTrue,suffix)(bitstorage, index);
    return index;
}

#endif

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
#include "../generic/setsuffix.h"
// static inline void __attribute__((always_inline, nonnull, hot )) 
static void
NAME(setBitsTrue_largestep_norepeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju)  (%ju unique occurances)..", (uintmax_t)step,  STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_largestep_norepeat);

    register const counter_t loop_stop = safe_diff_type(range_stop, step * unrolls, counter_t);
    register counter_t index = range_start;

    #if unrolls == 4
        #pragma GCC ivdep
        #pragma GCC unroll 4
        for (; index < loop_stop; ) {
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
        }
    #elif unrolls == 8
        #pragma GCC ivdep
        #pragma GCC unroll 8
        for (; index < loop_stop; ) {
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
        }
    #endif            

    for (counter_t i=unrolls; i-- && index < range_stop; index += step) 
        setBitTrue(bitstorage, index);

    if unlikely(index==range_stop) setBitTrue(bitstorage, index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}

// #define subfunction _norepeat
#include "../generic/setsuffix.h"

#if unrolls == 4
// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// if we know that the mask will not repeat, we can save some time by not checking
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
// static inline void  __attribute__((always_inline, nonnull)) 
static void
NAME(setBitsTrue_smallstep_norepeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using smallstep%s in %ju bit range (%ju-%ju)  (%ju unique occurances)", (uintmax_t)step, STR(suffix),  (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_smallstep_norepeat);

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    for (register counter_t index = range_start; index < range_stop;) {
        register const counter_t index_bucket = index_type(index, bitbucket_t);  // set index_word here because the for loop will change index
        register bitbucket_t mask = (bitbucket_t)0U;
        for(; index_type(index, bitbucket_t) == index_bucket; index += step) mask |= markmask_type(index, bitbucket_t);
        bitstorage_sized[index_bucket] |= mask;
    }
    timer_laptime(time_setBitsTrue_smallstep_norepeat); verbose6( printf("\n"); )
}
#endif

#include "../generic/cleansuffix.h"


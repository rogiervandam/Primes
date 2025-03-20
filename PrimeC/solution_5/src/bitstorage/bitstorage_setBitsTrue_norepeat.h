#ifdef variant
#define bitbucket_t NAME(variant, _t)
#define variantsuffix NAME(_,variant)
#else
#define bitbucket_t uint8_t

static inline void __attribute__((always_inline)) 
setBitTrue(void* restrict bitstorage, const register counter_t index) 
{
    ((bitbucket_t*)bitstorage)[index_type(index,bitbucket_t)] |= markmask_calc_type(index, bitbucket_t);
}

static inline void __attribute__((always_inline)) 
setBitsTrue_range(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    for(register counter_t index = range_start; index < range_stop; index += step) setBitTrue(bitstorage, index);
}

#endif


#define subfunction _norepeat
#include "../generic/setsuffix.h"

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void __attribute__((always_inline)) NAME(setBitsTrue_largestep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using largestep-norepeat in %ju bit range (%ju-%ju)  (%ju unique occurances)..", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_largestep_norepeat);

    const counter_t step_2 = step * 2;
    const counter_t loop_stop = safe_diff_type(range_stop,step_2, counter_t);
    register counter_t index = range_start;

    #pragma GCC ivdep
    for (; index < loop_stop; index += step_2) {
        setBitTrue(bitstorage, index);
        setBitTrue(bitstorage, index + step);
    }

    for (counter_t i=2; i-- && index < range_stop; index += step) 
        setBitTrue(bitstorage, index);

    if unlikely(index==range_stop) setBitTrue(bitstorage, index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}

#define subfunction _norepeat
#include "../generic/setsuffix.h"

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// if we know that the mask will not repeat, we can save some time by not checking
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void  __attribute__((always_inline)) NAME(setBitsTrue_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using smallstep-norepeat in %ju bit range (%ju-%ju)  (%ju unique occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_smallstep_norepeat);

    for (register counter_t index = range_start; index < range_stop;) {
        register const counter_t index_bucket = index_type(index, bitbucket_t);  // set index_word here because the for loop will change index
        register bitbucket_t mask = (bitbucket_t)0U;
        for(; index_type(index, bitbucket_t) == index_bucket; index += step) mask |= markmask_type(index, bitbucket_t);
        ((bitbucket_t*)bitstorage)[index_bucket] |= mask;
    }
    timer_laptime(time_setBitsTrue_smallstep_norepeat); verbose6( printf("\n"); )
}

#undef variant
#undef variantsuffix
#undef unrollssuffix
#undef fullvariantsuffix
#undef bitbucket_t
#undef suffix
#undef subfunction

#ifdef UNSET_UNROLLS
    #undef unrolls
    #undef UNSET_UNROLLS
#endif
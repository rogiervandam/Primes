#ifdef variant
    #define bitbucket_t NAME(variant, _t)
    #define variantsuffix NAME(_,variant)
#else
    #define bitbucket_t bitword_t
#endif

#define subfunction _repeat
#include "../generic/setsuffix.h"

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// By joining the masks and then writing to memory, we might save some time.
// This is especially true for small steps over long ranges
// but it needs tuning, because there is some overhead of checking if the next step is in the same word
// this is *NOT* BASE ALGORITHM COMPLIANT: some bits are set together
static inline void __attribute__((always_inline)) NAME(setBitsTrue_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + bitcount_type(bitbucket_t) * step;

    verbose6( printf("Setting bits step %3ju using smallstep-repeat in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*bitcount_type(bitbucket_t)))); )
    timer_lapstart(time_setBitsTrue_smallstep_repeat);

    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_bucket = index_type(index, bitbucket_t); // set index_word here because the for loop will change index
        register bitbucket_t mask = (bitbucket_t)0U;
        for(; index_type(index, bitbucket_t) == index_bucket; index += step) mask |= markmask_type(index, bitbucket_t);
        NAME(applyMask,fullvariantsuffix)(bitstorage, step, range_stop, mask, index_bucket);
    }

    timer_laptime(time_setBitsTrue_smallstep_repeat); verbose6( printf("\n"); )
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
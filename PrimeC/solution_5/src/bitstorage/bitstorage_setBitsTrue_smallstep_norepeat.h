// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// if we know that the mask will not repeat, we can save some time by not checking
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually

#ifndef LARGESTEP_NOREPEAT_GUARD
    #define LARGESTEP_NOREPEAT_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_smallstep_norepeat.h"
    #include "../generic/variants/generate.h"
    
#elif defined(BUILD_WORDS_STAGE)

static inline void  __attribute__((always_inline, nonnull)) 
function(setBitsTrue_smallstep_norepeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logStart6(bitstorage, time_setBitsTrue_smallstep_norepeat, "setting bits step %3ju using smallstep_norepeat%s in %ju bit range (%ju-%ju) (%ju unique occurances)", 
        (uintmax_t)step, STR(suffix),  (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    for (register counter_t index = range_start; index < range_stop;) {
        register const counter_t current_bucket = index_type(index, bitbucket_t);  // set index_word here because the for loop will change index
        const counter_t bucket_end = bitbucket_end_type(index, bitbucket_t);
        register bitbucket_t mask = (bitbucket_t)0U;
        
        for(; index <= bucket_end; index += step) {
            mask |= markmask_type(index, bitbucket_t);
        }
        bitstorage_sized[current_bucket] |= mask;
    }

    logStop6(bitstorage, time_setBitsTrue_smallstep_norepeat, "Finished setting bits\n");
}

#endif
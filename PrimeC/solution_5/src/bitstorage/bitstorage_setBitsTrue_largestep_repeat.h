// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
#ifndef LARGESTEP_REPEAT_GUARD
    #define LARGESTEP_REPEAT_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_largestep_repeat.h"
    #include "../generic/variants/generate.h"
    
#elif defined(BUILD_WORDS_STAGE)

static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
function(setBitsTrue_largestep_repeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{ 
    logStart7(bitstorage, time_setBitsTrue_largestep_repeat, "setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju repeating occurrences)", 
        (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    const counter_t stop_bucket = index_type(range_stop, bitbucket_t);
    const counter_t range_start_new = function(setBitsTrue_range_return,variant_suffix)(bitstorage, range_start, bitbucket_next_type(range_start, bitbucket_t), step); 
    const counter_t stop_unique = bitbucket_start_type(range_start_new + bitcount_type(bitbucket_t) * step, bitbucket_t) ; 

    for (counter_t index = range_start_new; index < stop_unique; index += step) { 
        function(applyMask_index,suffix)(bitstorage, index_type(index, bitbucket_t), stop_bucket, step, markmask_type(index, bitbucket_t));
    } 

    logStop7(bitstorage, time_setBitsTrue_largestep_repeat,"finished setting bits using largestep%s", STR(suffix));
}

#endif


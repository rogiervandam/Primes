// assemble the word and vector functions
// these will make different versions of themselves for different types of bitstorage
// #include "bitstorage_setBitsTrue_assemble_word.h" 
// #include "bitstorage_setBitsTrue_assemble_vector.h" 


#ifndef variant
#define variant uint8
#endif

#include "../generic/setsuffix.h"

static inline void __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
setBitsTrue_smallstep_repeat_base(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + bitcount_type(bitbucket_t) * step;
    startAnalysis6(time_setBitsTrue_smallstep_repeat, "Setting bits step %3ju using smallstep_repeat%s in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*bitcount_type(bitbucket_t))));

    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_bucket = index_type(index, bitbucket_t); // set index_word here because the for loop will change index
        register bitbucket_t mask = (bitbucket_t)0U;
        for(; index_type(index, bitbucket_t) == index_bucket; index += step) {
            mask |= markmask_type(index, bitbucket_t);
            function(applyMask, suffix)(bitstorage, step, range_stop, mask, index_bucket);
        }
    }

    endAnalysis6(time_setBitsTrue_smallstep_repeat,"\n");
}

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// if we know that the mask will not repeat, we can save some time by not checking
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void  __attribute__((always_inline, nonnull)) 
setBitsTrue_smallstep_norepeat(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    startAnalysis6(time_setBitsTrue_smallstep_norepeat, "Setting bits step %3ju using smallstep_norepeat%s in %ju bit range (%ju-%ju)  (%ju unique occurances)", (uintmax_t)step, STR(suffix),  (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    for (register counter_t index = range_start; index < range_stop;) {
        register const counter_t index_bucket = index_type(index, bitbucket_t);  // set index_word here because the for loop will change index
        register bitbucket_t mask = (bitbucket_t)0U;
        for(; index_type(index, bitbucket_t) == index_bucket; index += step) {
            mask |= markmask_type(index, bitbucket_t);
        }
        bitstorage_sized[index_bucket] |= mask;
    }

    endAnalysis6(time_setBitsTrue_smallstep_norepeat,"\n");
}

static inline void  __attribute__((always_inline, nonnull)) 
setBitsTrue_base(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    startAnalysis6(time_setBitsTrue, "Setting bits step %3ju using setBitsTrue_base in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps)\n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step)));

    if (bitcount_type(bitbucket_t)/2 >=15 && step < bitcount_type(bitbucket_t)/2) {
        const counter_t range_stop_unique_word = range_start + bitcount_type(bitbucket_t) * step; 
        if (range_stop_unique_word <= range_stop) { // the wordmask will be reused
            setBitsTrue_smallstep_repeat_base(bitstorage, range_start, step, range_stop);
        }
        else {
            setBitsTrue_smallstep_norepeat(bitstorage, range_start, step, range_stop);
        }
    }
    else {
        setBitsTrue_largestep_repeat_uint8_unroll8(bitstorage, range_start, step, range_stop);
    }
    
    endAnalysis6(time_setBitsTrue);
}

#include "../generic/cleansuffix.h"

// make explicit versions for all types with different suffixes for different bitbucket_t sizes
#ifndef BITSTORAGE_BASE_INCLUDE_GUARD
    #define BITSTORAGE_BASE_INCLUDE_GUARD
    // #define variant uint8
    // #include "bitstorage_setBitsTrue_base.h"
    // #define variant uint16
    // #include "bitstorage_setBitsTrue_base.h"
    // #define variant uint32
    // #include "bitstorage_setBitsTrue_base.h"
    // #define variant uint64
    // #include "bitstorage_setBitsTrue_base.h"
#endif
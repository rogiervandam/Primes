#ifndef MARKBASE_GUARD
    #define MARKBASE_GUARD
    #define INCLUDE_FILE "../../../src/sieve/sieve_markBase.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_WORDS_STAGE) && (variant_bits == 8) && (unrolls == 1)

    static inline void __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
    setBitsTrue_smallstep_repeat_base(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        const counter_t range_stop_unique = range_start + bitcount_type(bitbucket_t) * step;
        const counter_t range_stop_index = index_type(range_stop, bitbucket_t);

        logStart6(bitstorage, time_setBitsTrue_smallstep_repeat, "SetBitsTrueSmallstepRepeatBase: setting bits step %3ju using smallstep_repeat%s in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*bitcount_type(bitbucket_t))));

        for (register counter_t index = range_start; index <= range_stop_unique;) {
            const counter_t word_index = index_type(index, bitbucket_t); // set index_word here because the for loop will change index
            register bitbucket_t mask = (bitbucket_t)0U;
            for(; index_type(index, bitbucket_t) == word_index; index += step) {
                mask |= markmask_type(index, bitbucket_t);
                function(applyMask_index, suffix)(bitstorage, word_index, range_stop_index, step, mask);
            }
        }

        logStop6(bitstorage, time_setBitsTrue_smallstep_repeat, "SetBitsTrueSmallstepRepeatBase: finished setting bits\n");
    }

    // Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
    // if we know that the mask will not repeat, we can save some time by not checking
    // this is a BASE ALGORITHM COMPLIANT: each bit is set individually
    static inline void  __attribute__((always_inline, nonnull)) 
    setBitsTrue_smallstep_norepeat(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        logStart6(bitstorage, time_setBitsTrue_smallstep_norepeat, "SetBitsTrueSmallstepNoRepeat: setting bits step %3ju using smallstep_norepeat%s in %ju bit range (%ju-%ju) (%ju unique occurances)", (uintmax_t)step, STR(suffix),  (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));

        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

        for (register counter_t index = range_start; index < range_stop;) {
            register const counter_t word_index = index_type(index, bitbucket_t);  // set index_word here because the for loop will change index
            register bitbucket_t mask = (bitbucket_t)0U;
            for(; index_type(index, bitbucket_t) == word_index; index += step) {
                mask |= markmask_type(index, bitbucket_t);
            }
            bitstorage_sized[word_index] |= mask;
        }

        logStop6(bitstorage, time_setBitsTrue_smallstep_norepeat, "SetBitsTrueSmallstepNoRepeat: finished setting bits\n");
    }

#elif defined(BUILD_WORDS_STAGE) && (variant_bits == 64) && (unrolls == 1)

    static inline void __attribute__((always_inline, hot)) 
    markFactors_base(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
    {
        // TRACE_ANALYSIS_START(5, start>>1, stop>>1);
        // if (bitcount_type(bitbucket_t)/2 >=15 && step/2 < bitcount_type(bitbucket_t)/2) {
        //     if ( start/2 + bitcount_type(bitbucket_t) * step <= stop/2) { // the wordmask will be reused
        //         setBitsTrue_smallstep_repeat_base(sieve->bitstorage, start/2, stop/2, step/2);
        //     }
        //     else {
        //         setBitsTrue_smallstep_norepeat(sieve->bitstorage, start/2, stop/2, step/2);
        //     }
        // }
        // else {
            setBitsTrue_largestep_repeat_uint8_unroll8(sieve->bitstorage, start>>1, stop>>1, step>>1);
        // }    
        // TRACE_ANALYSIS_END();
    }

#endif


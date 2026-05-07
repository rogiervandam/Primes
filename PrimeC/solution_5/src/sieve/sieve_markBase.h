#ifndef MARKBASE_GUARD
    #define MARKBASE_GUARD
    #define INCLUDE_FILE "../../../src/sieve/sieve_markBase.h"
    #include "../generic/variants/generate.h"
#else
#if defined(BUILD_WORDS_STAGE) && (unrolls == 1)

    static inline void __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
    function(setBitsTrue_smallstep_repeat_base, suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        const counter_t first_duplicate = min(range_start + bitcount_type(bitbucket_t) * step, range_stop);
        const counter_t stop_bucket = index_type(range_stop, bitbucket_t);

        logStart6(bitstorage, time_setBitsTrue_smallstep_repeat, "SetBitsTrueSmallstepRepeatBase: setting bits step %3ju using smallstep_repeat%s in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*bitcount_type(bitbucket_t))));

        for (register counter_t index = range_start; index < first_duplicate;) {
            const counter_t current_bucket = index_type(index, bitbucket_t); // set index_word here because the for loop will change index
            const counter_t bucket_end = bitbucket_end_type(index, bitbucket_t);
            register bitbucket_t mask = (bitbucket_t)0U;
            for(; index <= bucket_end; index += step) {
                mask |= markmask_type(index, bitbucket_t);
                function(applyMask_index, suffix)(bitstorage, current_bucket, stop_bucket, step, mask);
            }
        }

        logStop6(bitstorage, time_setBitsTrue_smallstep_repeat, "SetBitsTrueSmallstepRepeatBase: finished setting bits\n");
    }

#include "../bitstorage/bitstorage_setBitsTrue_smallstep_norepeat.h"
#endif

#if defined(BUILD_WORDS_STAGE) && (variant_bits == 64) && (unrolls == 1)

    static inline void __attribute__((always_inline, hot)) 
    markFactors_base(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
    {
        logStart6(sieve->bitstorage, time_markFactors_base, "setting factors step %3ju in %ju factor range (%ju-%ju) for prime %ju", (uintmax_t)step, (uintmax_t)safe_diff(stop,start),(uintmax_t)start,(uintmax_t)stop, (uintmax_t)(step/2));

        setBitsTrue_largestep_repeat_uint8_unroll8(sieve->bitstorage, start>>1, stop>>1, step>>1);
        
        logStop6(sieve->bitstorage, time_markFactors_base, "finished setting factors\n");

    }

#endif

#endif // MARKBASE_GUARD
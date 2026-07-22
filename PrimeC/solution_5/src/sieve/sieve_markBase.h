#ifndef MARKBASE_GUARD
    #define MARKBASE_GUARD
    #define INCLUDE_FILE "../../../src/sieve/sieve_markBase.h"
    #include "../generic/variants/generate.h"
#else

#if defined(BUILD_WORDS_STAGE) && (variant_bits == 64) && (unrolls == 1)

    static inline void __attribute__((always_inline, hot)) 
    markFactors_base(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
    {
        logStart6(sieve->bitstorage, time_markFactors_base, "setting factors step %3ju in %ju factor range (%ju-%ju) for prime %ju", (uintmax_t)step, (uintmax_t)safe_diff(stop,start),(uintmax_t)start,(uintmax_t)stop, (uintmax_t)(step/2));

        switch(global_algorithm) {
            case 1:  setBitsTrue_largestep_repeat_uint8_unroll4 (sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            case 2:  setBitsTrue_largestep_repeat_uint16_unroll4(sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            case 3:  setBitsTrue_largestep_repeat_uint32_unroll4(sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            case 4:  setBitsTrue_largestep_repeat_uint64_unroll4(sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            case 5:  setBitsTrue_largestep_repeat_uint8_unroll8 (sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            case 6:  setBitsTrue_largestep_repeat_uint16_unroll8(sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            case 7:  setBitsTrue_largestep_repeat_uint32_unroll8(sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            case 8:  setBitsTrue_largestep_repeat_uint64_unroll8(sieve->bitstorage, start>>1, stop>>1, step>>1); break;
            default: setBitsTrue_largestep_repeat_uint8_unroll8 (sieve->bitstorage, start>>1, stop>>1, step>>1); break;
        }
        
        logStop6(sieve->bitstorage, time_markFactors_base, "Finished setting factors");
    }

#endif

#if defined (include_once_last) 
static inline void markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) { markFactors_base(sieve, start, stop, step); }
#endif

#endif // MARKBASE_GUARD
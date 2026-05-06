// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
#ifndef LARGESTEP_NOREPEAT_GUARD
    #define LARGESTEP_NOREPEAT_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_largestep_norepeat.h"
    #include "../generic/variants/generate.h"
    
#elif defined(BUILD_WORDS_STAGE)

#include "../generic/variants/setsuffix.h"
static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
function(setBitsTrue_largestep_norepeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logStart7(bitstorage, time_setBitsTrue_largestep_norepeat, "setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju unique occurances)", 
        (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step));

    register counter_t index = range_start;
    register counter_t i=((range_start-range_start)/step);
    for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
        for(;i>j;i-=j) {
            for(int k=j; k--; index += step) {
                function(setBitTrue, variant_suffix)(bitstorage, index);
            }
        }
    }

    for (; index < range_stop; index += step) 
        function(setBitTrue, variant_suffix)(bitstorage, index);

    if unlikely(index==range_stop) function(setBitTrue, variant_suffix)(bitstorage, index);

    logStop7(bitstorage, time_setBitsTrue_largestep_norepeat,"finished settings bits using largestep%s", STR(suffix));
}

#endif



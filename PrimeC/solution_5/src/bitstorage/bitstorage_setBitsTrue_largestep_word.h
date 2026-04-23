// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
#ifndef LARGESTEP_WORD_GUARD
    #define LARGESTEP_WORD_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_largestep_word.h"
    #include "../generic/variants/generate.h"
    
#elif defined(BUILD_WORDS_STAGE)

#include "../generic/variants/setsuffix.h"
static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
function(setBitsTrue_largestep_repeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{ 
    logBegins7(bitstorage, time_setBitsTrue_largestep_repeat, "SetBitsTrueLargestepRepeat: setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju repeating occurrences)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    const counter_t range_stop_index = index_type(range_stop, bitbucket_t);
    const counter_t range_stop_unique = bitbucket_end_type(range_start + bitcount_type(bitbucket_t) * step, bitbucket_t) ; 
    register counter_t index = function(setBitsTrue_range_return,variantsuffix)(bitstorage, range_start, bitbucket_next_type(range_start, bitbucket_t), step); 

    #pragma GCC ivdep
    #pragma GCC unroll 8
    for (; index <= range_stop_unique; index += step) { 
        function(applyMask_index,suffix)(bitstorage, index_type(index, bitbucket_t), range_stop_index, step, markmask_type(index, bitbucket_t));
    } 

    logEnds7(bitstorage, time_setBitsTrue_largestep_repeat,"SetBitsTrueLargestepRepeat: finished setting bits using largestep%s\n", STR(suffix));
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
#include "../generic/variants/setsuffix.h"
static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
function(setBitsTrue_largestep_norepeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logBegins7(bitstorage, time_setBitsTrue_largestep_norepeat, "SetBitsTrueLargestepNoRepeat: setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju unique occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step));

    register counter_t index = range_start;
    register counter_t i=((range_start-range_start)/step);
    for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
        for(;i>j;i-=j) {
            for(int k=j; k--; index += step) {
                function(setBitTrue, variantsuffix)(bitstorage, index);
            }
        }
    }

    for (; index < range_stop; index += step) 
        function(setBitTrue, variantsuffix)(bitstorage, index);

    if unlikely(index==range_stop) function(setBitTrue, variantsuffix)(bitstorage, index);

    logEnds7(bitstorage, time_setBitsTrue_largestep_norepeat,"SetBitsTrueLargestepNoRepeat: finished settings bits using largestep%s\n", STR(suffix));
}

#endif

#include "../generic/variants/cleansuffix.h"



// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
#include "../generic/setsuffix.h"
static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
function(setBitsTrue_largestep_repeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{ 
    startAnalysis6(time_setBitsTrue_largestep_repeat, "Setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju repeating occurrences)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    const counter_t range_stop_unique = range_start + bitcount_type(bitbucket_t) * step; 

    // #pragma GCC ivdep
    // #pragma GCC unroll 4
    for (register counter_t index = range_start; index < range_stop_unique; index += step) { 
        function(applyMask_new,suffix)(bitstorage, index, step, range_stop, markmask_type(index, bitbucket_t));
        // function(applyMask,suffix)(bitstorage, step, range_stop, markmask_type(index, bitbucket_t), index_type(index, bitbucket_t));

    } 

    endAnalysis6(time_setBitsTrue_largestep_repeat,"\n");
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
#include "../generic/setsuffix.h"
static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
function(setBitsTrue_largestep_norepeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    startAnalysis6(time_setBitsTrue_largestep_norepeat, "Setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju)  (%ju unique occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step));

    #if unrolls == 1

    counter_t i=((range_start-range_start)/step);
    for(counter_t j=256; j; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
        for(;i>j;i-=j) {
            for(int k=k; k--; index_ptr += step) {
                setBitTrue(bitstorage, index);  index += step;
            }
        }
    }

    // for (;i>16;i-=16) {
    //     for(int j=16; j--;) {
    //         setBitTrue(bitstorage, index);  index += step;
    //     }
    // }
    // for (;i>8;i-=8) {
    //     for(int j=8; j--;) {
    //         setBitTrue(bitstorage, index);  index += step;
    //     }
    // }
    // for (;i>4;i-=4) {
    //     for(int j=4; j--;) {
    //         setBitTrue(bitstorage, index);  index += step;
    //     }
    // }
    // for (; i-- && index < range_stop; index += step) {
    //     setBitTrue(bitstorage, index);
    // }
    // if unlikely(index==range_stop) setBitTrue(bitstorage, index);
    endAnalysis6(time_setBitsTrue_largestep_norepeat,"\n");
    return;
    #endif

    register const counter_t loop_stop = safe_diff_type(range_stop, step * unrolls, counter_t);
    register counter_t index = range_start;

    #if unrolls == 4
        #pragma GCC ivdep
        #pragma GCC unroll 4
        for (; index < loop_stop; ) {
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
        }
    #elif unrolls == 8
        #pragma GCC ivdep
        #pragma GCC unroll 8
        for (; index < loop_stop; ) {
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
            setBitTrue(bitstorage, index);  index += step;
        }
    #endif            

    for (counter_t i=unrolls; i-- && index < range_stop; index += step) 
        setBitTrue(bitstorage, index);

    if unlikely(index==range_stop) setBitTrue(bitstorage, index);

    endAnalysis6(time_setBitsTrue_largestep_norepeat,"\n");
}

#include "../generic/cleansuffix.h"

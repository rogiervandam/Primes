static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
function(markFactors_wheelstorage_norepeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logStart6(bitstorage, time_markFactors_wheelstorage_norepeat, " setting factors step %3ju in %ju factor range (%ju-%ju)", 
        (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop);
    register counter_t index = range_start;
    register counter_t i=((range_stop-range_start)/step);
    for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
        for(;i>j;i-=j) {
            for(int k=j; k--; index += step) {
                function(markFactor_wheelstorage,suffix)(bitstorage, index);
            }
        }
    }

    for (; index <= range_stop; index += step) 
        function(markFactor_wheelstorage,suffix)(bitstorage, index);

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_norepeat, "finished setting factors\n");
}
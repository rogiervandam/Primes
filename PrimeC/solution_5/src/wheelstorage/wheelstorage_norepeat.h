    static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
    markFactors_wheelstorage_norepeat(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        logStart6(sieve->bitstorage, time_markFactors_wheelstorage_norepeat, " setting factors step %3ju in %ju factor range (%ju-%ju)", 
            (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop);
        register counter_t index = range_start;
        register counter_t i=((range_stop-range_start)/step);
        for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
            for(;i>j;i-=j) {
                for(int k=j; k--; index += step) {
                    markFactor_wheelstorage_uint8(sieve, index);
                }
            }
        }

        for (; index <= range_stop; index += step) 
            markFactor_wheelstorage_uint8(sieve, index);

        logStop6(sieve->bitstorage, time_markFactors_wheelstorage_norepeat, "finished setting factors\n");
    }
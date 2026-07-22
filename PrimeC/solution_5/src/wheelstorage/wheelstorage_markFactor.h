// mark a single factor in the sieve, by calculating its corresponding bit index in the bitstorage and setting that bit to true
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactor_wheelstorage,suffix)(void* restrict bitstorage, const register counter_t index) 
{
    logStart9(bitstorage, time_markFactor_wheelstorage, "marking factor %ju", (uintmax_t)index);

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    register const counter_t wheelstorage_bit = wheelstorage_bit_calc(index);

    #ifdef COMPILE_TRACE
        if (trace.enabled && wheelstorage_bit >= 0) primes_trace_add_pending_target((uint32_t)wheelstorage_bit);
    #endif
    
    if (wheelstorage_bit >= 0) bitstorage_sized[ index_type(wheelstorage_bit, bitbucket_t)] |= markmask_type(wheelstorage_bit, bitbucket_t);

    logStop9(bitstorage, time_markFactor_wheelstorage, "Finished marking factor %ju", (uintmax_t)index);
}
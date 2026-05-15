// mark a single factor in the sieve, by calculating its corresponding bit index in the bitstorage and setting that bit to true
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactor_wheelstorage,suffix)(sieve_t* sieve, const register counter_t index) 
{
    logStart9(sieve->bitstorage, time_markFactor_wheelstorage, "marking factor %ju", (uintmax_t)index);

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);
    register const counter_t wheel_bit = wheel_bit_calc(index);

    #ifdef COMPILE_TRACE
        if (g_trace.enabled && wheel_bit >= 0) primes_trace_add_pending_target((uint32_t)wheel_bit);
    #endif
    if (wheel_bit >= 0) bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask_type(wheel_bit, bitbucket_t);

    logStop9(sieve->bitstorage, time_markFactor_wheelstorage, "finished marking factor %ju", (uintmax_t)index);
}
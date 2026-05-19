static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
markFactors_wheelstorage(void* restrict bitstorage, counter_t start, counter_t stop, counter_t step) 
{
    logStart6(bitstorage, time_markFactors_wheelstorage, "setting factors step %3ju in %ju factor range (%ju-%ju) for prime %ju", (uintmax_t)step, (uintmax_t)safe_diff(stop,start),(uintmax_t)start,(uintmax_t)stop, (uintmax_t)(step/2));
    const counter_t prime = step / 2;

    // if (prime <= 7) {
    //     markFactors_wheelstorage_small_repeat_pair_rotate_uint64_unroll8(sieve, start, stop, step);
    // }
    // else
    // if (prime <= 32) {
    //     // markFactors_wheelstorage_small_repeat_pair_vector_uint64v4_unroll8(sieve, start, stop, step);
    //     markFactors_wheelstorage_small_repeat_mmask_uint64_unroll8(sieve, start, stop, step);
    // }
    // else
    if (step < global_largestep_faster) {
    // if (step < 256) {
        // markFactors_wheelstorage_small_repeat_mmask2_uint64_unroll8(bitstorage, start, stop, step);
        // markFactors_wheelstorage_small_repeat_uint64_unroll8(bitstorage, start, stop, step);
        // markFactors_wheelstorage_repeat_uint8_unroll8(bitstorage, start, stop, step);
        // markFactors_wheelstorage_repeat_uint64_unroll8(bitstorage, start, stop, step);
        markFactors_wheelstorage_small_repeat_pair_uint64_unroll8(bitstorage, start, stop, step);
    }
    else 
    function(markFactors_wheelstorage_repeat, wheelvariant_unroll_suffix)(bitstorage, start, stop, step);
    // markFactors_wheelstorage_small_repeat_uint64_unroll8(bitstorage, start, stop, step);
    // markFactors_wheelstorage_small_repeat_uint8_unroll8(bitstorage, start, stop, step);
    // markFactors_wheelstorage_norepeat_uint8_unroll8(bitstorage, start, stop, step);

    logStop6(bitstorage, time_markFactors_wheelstorage, "finished setting factors\n");
}
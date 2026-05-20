static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_repeat,suffix)(void* restrict bitstorage, const counter_t start_number, counter_t stop_number, const counter_t step)
{
    logStart7(bitstorage, time_markFactors_wheelstorage_repeat, "mark factors [%jd-%jd] with step %jd prime %jd", 
        (intmax_t)start_number, (intmax_t)stop_number, (intmax_t)step, (intmax_t)step/2);

    // const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number); 
    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number); 
    const counter_t wheel_step = reduce2power(step) * wheel_multiplier(bitbucket_t); // step in terms of the number of bitbuckets
    log9("Calculated wheel step: %ju (reduced from %ju) for prime %ju with bitbucket size %ju and wheel stripe bits %ju and reduce2power %ju", 
        (uintmax_t)wheel_step, (uintmax_t)step, (uintmax_t)step/2, (uintmax_t)bitcount_type(bitbucket_t), (uintmax_t)wheel_bitalloc, (uintmax_t)reduce2power(step));

    const counter_t last_number_unique = min(getFactor( wheelstorage_bit_estimate_last(start_number) - 1 + wheel_step * bitcount_type(bitbucket_t)), stop_number);

    for (register counter_t index_number = start_number; index_number <= last_number_unique; index_number += step) { 
        const counter_t wheelstorage_bit = wheelstorage_bit_calc(index_number);
        if (wheelstorage_bit >= 0) {
            const bitbucket_t markmask = markmask_type(wheelstorage_bit, bitbucket_t);
            // const counter_t start_bucket = index_type(wheelstorage_bit, bitbucket_t);
            const counter_t start_bucket = (wheel_bitalloc <= bitcount_type(bitbucket_t)) 
                    ? index_type(wheel_bitalloc * (index_number / WHEEL_SIZE), bitbucket_t)
                    : index_type(wheelstorage_bit, bitbucket_t);

            function(applyMask_index, suffix)(bitstorage, start_bucket, stop_bucket, wheel_step, markmask);
        }
    } 
    logStop7(bitstorage, time_markFactors_wheelstorage_repeat, "MarkingEnd: finished setting factors");
}

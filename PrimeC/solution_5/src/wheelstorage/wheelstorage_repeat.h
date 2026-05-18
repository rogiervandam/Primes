static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_repeat,suffix)(void* restrict bitstorage, const counter_t start_number, counter_t stop_number, const counter_t step)
{
    logStart7(bitstorage, time_markFactors_wheelstorage_repeat, "mark factors [%jd-%jd] with step %jd prime %jd", 
        (intmax_t)start_number, (intmax_t)stop_number, (intmax_t)step, (intmax_t)step/2);

    const counter_t bucket_stop = function(wheel_bucket_calc,variant_suffix)(stop_number + 1); // + because: don't stop too soon
    const counter_t wheel_step = reduce2power(step * max(bitcount_type(bitbucket_t), wheelmask_stripe_bits) / min(bitcount_type(bitbucket_t), wheelmask_stripe_bits)); // step in terms of the number of bitbuckets
    log9("Calculated wheel step: %ju (reduced from %ju) for prime %ju with bitbucket size %ju and wheel stripe bits %ju and reduce2power %ju", 
        (uintmax_t)wheel_step, (uintmax_t)step, (uintmax_t)step/2, (uintmax_t)bitcount_type(bitbucket_t), (uintmax_t)wheelmask_stripe_bits, (uintmax_t)reduce2power(step));

    const counter_t stop_number_unique = min(getFactor( bitbucket_start_type(wheel_bit_estimate_last(start_number), bitbucket_t) - 1 + wheel_step * wheelmask_stripe_bits * ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits)), stop_number);

    for (register counter_t index = start_number; index <= stop_number_unique; index += step) { 
        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit >= 0) {
            const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            const counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
                    ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
                    : index_type(wheel_bit, bitbucket_t);

            function(applyMask_index, suffix)(bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        }
    } 
    logStop7(bitstorage, time_markFactors_wheelstorage_repeat, "MarkingEnd: finished setting factors");
}

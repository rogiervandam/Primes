static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_repeat,suffix)(void* restrict bitstorage, const counter_t range_start, counter_t range_stop, const counter_t step)
{
    logStart7(bitstorage, time_markFactors_wheelstorage_repeat, "mark factors [%jd-%jd] with step %jd prime %jd", 
        (intmax_t)range_start, (intmax_t)range_stop, (intmax_t)step, (intmax_t)step/2);

    const counter_t bucket_stop = function(wheel_bucket_calc,variant_suffix)(range_stop + 1); // + because: don't stop too soon
    const counter_t wheel_step = reduce2power(step) * (max(bitcount_type(bitbucket_t), wheelmask_stripe_bits) / min(bitcount_type(bitbucket_t), wheelmask_stripe_bits)); // step in terms of the number of bitbuckets
    const counter_t first_duplicate = min(range_start + WHEEL_SIZE * (wheel_step + 2), range_stop); 
    log9("Calculated wheel step: %ju (reduced from %ju) for prime %ju with bitbucket size %ju and wheel stripe bits %ju and reduce2power %ju", 
        (uintmax_t)wheel_step, (uintmax_t)step, (uintmax_t)step/2, (uintmax_t)bitcount_type(bitbucket_t), (uintmax_t)wheelmask_stripe_bits, (uintmax_t)reduce2power(step));

    for (register counter_t index = range_start; index <= first_duplicate; index += step) { 
        const counter_t wheel_index = index % WHEEL_SIZE;
        const counter_t wheel_bit = wheelmask_bitpoint[wheel_index];
        if (wheel_bit >= 0) {
            const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            const counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
                    ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
                    : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheel_bit, bitbucket_t);
            log8("Marking pos %ju with markmask %ju at bucket start %ju bucket stop %ju for index %ju", (uintmax_t)wheel_bit, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)index);
            function(applyMask_index, suffix)(bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        }
    } 
    logStop7(bitstorage, time_markFactors_wheelstorage_repeat, "MarkingEnd: finished setting factors");
}

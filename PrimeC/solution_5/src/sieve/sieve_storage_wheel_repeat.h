// TODO: replace the fast wheelmask_compressed with something dynamic
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_repeat,suffix)(sieve_t* sieve, const counter_t range_start, counter_t range_stop, const counter_t step)
{
    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_repeat, "mark factors [%jd-%jd] with step %jd prime %jd", (intmax_t)range_start, (intmax_t)range_stop, (intmax_t)step, (intmax_t)step/2);

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

    const counter_t bucket_stop = function(wheel_bucket_calc,variant_suffix)(range_stop + 1); // + because: don't stop too soon
    const counter_t wheel_step = reduce2power(step) * (max(bitcount_type(bitbucket_t), wheelmask_stripe_bits) / min(bitcount_type(bitbucket_t), wheelmask_stripe_bits)); // step in terms of the number of bitbuckets
    const counter_t range_last_unique = min(range_start + WHEEL_SIZE * (wheel_step + 2), range_stop); 
    log9("Calculated wheel step: %ju (reduced from %ju) for prime %ju with bitbucket size %ju and wheel stripe bits %ju and reduce2power %ju", (uintmax_t)wheel_step, (uintmax_t)step, (uintmax_t)step/2, (uintmax_t)bitcount_type(bitbucket_t), (uintmax_t)wheelmask_stripe_bits, (uintmax_t)reduce2power(step));

    for (register counter_t index = range_start; index <= range_last_unique; index += step) { 
        const counter_t wheel_index = index % WHEEL_SIZE;
        const counter_t wheel_bit = wheelmask_bitpoint[wheel_index];
        if (wheel_bit >= 0) {
            const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            const counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
                    ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
                    : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheel_bit, bitbucket_t);
            log8("Marking pos %ju with markmask %ju at bucket start %ju bucket stop %ju for index %ju", (uintmax_t)wheel_bit, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)index);
            function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        }
    } 
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_repeat, "MarkingEnd: finished setting factors\n");
}


// TODO: replace the fast wheelmask_compressed with something dynamic
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_repeatv2,suffix)(sieve_t* sieve, const counter_t range_start, counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_repeat, "mark factors [%jd-%jd] with step %jd prime %jd", (intmax_t)range_start, (intmax_t)range_stop, (intmax_t)step, (intmax_t)step/2);

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

    // const counter_t bucket_stop = function(wheel_bucket_calc,variant_suffix)(range_stop + 1);
    const counter_t bucket_stop = function(wheel_bucket_calc,variant_suffix)(range_stop + 1); // + because: don't stop too soon

    const counter_t wheel_step = reduce2power(step) * (max(bitcount_type(bitbucket_t), wheelmask_stripe_bits) / min(bitcount_type(bitbucket_t), wheelmask_stripe_bits)); // step in terms of the number of bitbuckets
    // const counter_t wheel_step = step; // step in terms of the number of bitbuckets

    log9("Caculated wheel step: %ju (reduced from %ju) for prime %ju with bitbucket size %ju and wheel stripe bits %ju and reduce2power %ju", (uintmax_t)wheel_step, (uintmax_t)step, (uintmax_t)step/2, (uintmax_t)bitcount_type(bitbucket_t), (uintmax_t)wheelmask_stripe_bits, (uintmax_t)reduce2power(step));
    // Every WHEEL_BASIC_SIZE * wheel_step, the pattern of which bits to mark as true in the wheel repeats at byte level 
    // Because when the wheel is completely done, we are wheelmask_stripe_bytes further in the bitstorage
    const counter_t range_last_unique = min(range_start + WHEEL_SIZE * (wheel_step + 2), range_stop); 
    // const counter_t range_stop_unique = range_stop;

    counter_t wheel_bit;
    counter_t wheel_index = range_start % WHEEL_SIZE;
    counter_t wheel_start_bucket = wheelmask_stripe_bits * (range_start / WHEEL_SIZE);
    counter_t wheel_base_bitindex = wheelmask_stripe_bits * (range_start / WHEEL_SIZE); //
    // counter_t current_bucket = index_type(wheel_base_bitindex, bitbucket_t);
    const counter_t last_unique_bucket = function(wheel_bucket_calc,variant_suffix)(range_last_unique);
    // counter_t wheel_index = range_start % WHEEL_SIZE; // the index of the current bit in the wheel

    // for (; current_bucket <= last_unique_bucket;) {
    for (register counter_t index = range_start; index <= range_last_unique; index += step) { 

        // 77k
        // const counter_t wheel_bit = wheel_bit_calc(index);
        // if (wheel_bit <= 0) continue; // if the number is divisible by any
        // const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
        // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
        // applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_bucket_calc_uint8(index), bucket_stop, wheel_step, markmask);

        // if (wheel_bit) {
        //     const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
        //     function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
        // }

        // 83k
        // const uint8_t markmask = wheelmask_compressed[ index % WHEEL_SIZE ];
        // if (markmask) {
        //     applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_bucket_calc_uint8(index), bucket_stop, wheel_step, markmask);
        // }

        // 83k
        // const counter_t wheel_bit = wheel_bit_calc(index);
        // if (wheel_bit < 0) continue; // if the number is divisible by any
        // const uint8_t markmask = wheelmask_mask[(wheel_bit & 7)] ;

        // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);

        // 84k
        // const counter_t wheel_index = index % WHEEL_SIZE;
        // const bitbucket_t markmask = wheelmask_compressed[ wheel_index ];
        // if (markmask) {
        //     counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
        //             ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
        //             : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index] , bitbucket_t);
            
        //     log7("Marking: Marking index %ju in factorrange (%ju-%ju) with step %ju with markmask %ju at bucket start %ju bucket stop %ju with wheelstep %ju prime %ju\n", 
        //         (uintmax_t)index, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)step, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)wheel_step, (uintmax_t)step/2);
        //     // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        //     function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        // }

        // const counter_t wheel_bit = wheel_bit_calc(index);
        wheel_index = index % WHEEL_SIZE;
        const counter_t wheel_bit = wheelmask_bitpoint[wheel_index] ;
        if (wheel_bit >= 0) {
            
            const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            // counter_t bucket_start = index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index], bitbucket_t);
            // bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask;//markmask_type(wheel_bit, bitbucket_t);

            counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
                    ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
                    : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheel_bit, bitbucket_t);
            // counter_t bucket_start = index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheel_bit, bitbucket_t);
            // counter_t bucket_start = current_bucket;

            // counter_t bucket_start = function(wheel_bucket_calc,variant_suffix)(index);
            // bitstorage_sized[ bucket_start] |= markmask;//markmask_type(wheel_bit, bitbucket_t);

            log8("Marking pos %ju with markmask %ju at bucket start %ju for index %ju\n", (uintmax_t)wheel_bit, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)index);
            // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        }

        // wheel_index += step;
        // if (wheel_index >= WHEEL_SIZE) {
        //     const counter_t advance = wheel_index / WHEEL_SIZE;
        //     wheel_index -= advance * WHEEL_SIZE;
        //     wheel_base_bitindex += wheelmask_stripe_bits * advance;
        //     current_bucket = index_type(wheel_base_bitindex, bitbucket_t);
        // }

        // const counter_t wheel_index = index % WHEEL_SIZE;
        // const bitbucket_t markmask = wheelmask_compressed[ wheel_index ];
        // if (markmask) {
        //     counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
        //             ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
        //             : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index] , bitbucket_t);
            
        //     verbose8({ printf("Marking index %ju in factorrange (%ju-%ju) with step %ju with markmask %ju at bucket start %ju bucket stop %ju with wheelstep %ju\n", (uintmax_t)index, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)step, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)wheel_step); waitforkey(); })
        //     // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        //     function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        // }

        // const counter_t wheel_bit = wheel_bit_calc(index);
        // if (wheel_bit <= 0) continue; // if the number is divisible by any
        // const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
        // // bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask_type(wheel_bit, bitbucket_t);
        // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
        // // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), index_type(wheel_bit, bitbucket_t), wheel_step, markmask);

        // if (wheelmask_bitpoint[wheel_index] >= 0) {
        //     wheel_bit = wheel_start_bucket + wheelmask_bitpoint[wheel_index]  ;
        //     const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
        //     counter_t bucket_start = index_type(wheel_bit, bitbucket_t);
            
        //     log7("Marking: Marking index %ju in factorrange (%ju-%ju) with step %ju with markmask %ju at bucket start %ju bucket stop %ju with wheelstep %ju prime %ju\n", 
        //         (uintmax_t)index, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)step, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)wheel_step, (uintmax_t)step/2);
        //     // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        //     function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
        // }

        // wheel_index += step;
        // if (wheel_index >= WHEEL_SIZE) {
        //     wheel_index = (index + step) % WHEEL_SIZE;
        //     wheel_start_bucket = wheelmask_stripe_bits * ((index + step) / WHEEL_SIZE);
        // }
    } 
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_repeat, "MarkingEnd: finished setting factors\n");
}
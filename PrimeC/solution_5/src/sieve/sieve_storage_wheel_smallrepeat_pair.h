static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "Setting factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));   
 
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    register uint8_t* restrict bitstorage_sized_uint8 = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(range_stop + 1);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    const counter_t range_stop_unique = min(range_start + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE * (wheel_step + 2), range_stop);

    counter_t current_bucket = 0;

    // align to first full bucket

    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "aligning to first full bucket starting from index %ju", (uintmax_t)range_start);

    // TODO: calc range_start_aligned = (range_start + wheel_step * WHEEL_SIZE - 1) / (wheel_step * WHEEL_SIZE) * (wheel_step * WHEEL_SIZE); 
    // but this is more expensive than just iterating until we reach the first full bucket, because the step is large and we will likely already be close to 
    // a full bucket after a few iterations
    for (; range_start <= range_stop_unique && (current_bucket = function(wheel_bucket_calc,variant_suffix)(range_start)) < 2 ; range_start += step) {
        function(markFactor_wheelstorage,suffix)(sieve, range_start);
    }
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "finished aligning to first full bucket at index %ju", (uintmax_t)range_start);

    bitbucket_t current_mask = (bitbucket_t)0U, pending_mask = (bitbucket_t)0U;
    counter_t pending_bucket = 0;

    // TODO: make a larger wheel and check if we stay within the wheel so we have to take lesser % and /
    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_copy, "marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));
    for (counter_t index = range_start; index <= range_stop_unique; index += step) {
        const counter_t wheel_bit = wheel_bit_calc(index);
        const counter_t new_bucket = function(wheel_bucket_calc,variant_suffix)(index);

        if (wheel_bit <= 0) continue; // if the number is divisible by any of the wheel primes, skip it
        // const counter_t new_bucket = index_type(wheel_bit, bitbucket_t);

        if (new_bucket != current_bucket) {
            if (pending_mask) {
                if (current_mask && ((pending_bucket + 1) == current_bucket )) { 
                    function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask, current_mask);
                    current_mask = (bitbucket_t)0U; // will be copied to pending_mask
                }
                else {
                    function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
                }
            }

            pending_bucket = current_bucket;
            pending_mask = current_mask;
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
        }

        current_mask |= markmask_type(wheel_bit, bitbucket_t);
    }

    if (pending_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
    }
    if (current_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_copy, "finished marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "finished setting factors\n");
}

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair_v2,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "MarkFactorsWheelStorageSmallRepeatPair: setting factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));   
 
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    register uint8_t* restrict bitstorage_sized_uint8 = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(range_stop + 1);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    const counter_t range_stop_unique = min(range_start + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE * (wheel_step + 2), range_stop);

    counter_t current_bucket = 0;

    // align to first full bucket

    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "MarkFactorsWheelStorageSmallRepeatPair: aligning to first full bucket starting from index %ju", (uintmax_t)range_start);

    // TODO: calc range_start_aligned = (range_start + wheel_step * WHEEL_SIZE - 1) / (wheel_step * WHEEL_SIZE) * (wheel_step * WHEEL_SIZE); 
    // but this is more expensive than just iterating until we reach the first full bucket, because the step is large and we will likely already be close to 
    // a full bucket after a few iterations
    for (; range_start <= range_stop_unique && (current_bucket = function(wheel_bucket_calc,variant_suffix)(range_start)) < 2 ; range_start += step) {
        function(markFactor_wheelstorage,suffix)(sieve, range_start);
    }
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "finished aligning to first full bucket at index %ju", (uintmax_t)range_start);

    bitbucket_t current_mask = (bitbucket_t)0U, pending_mask = (bitbucket_t)0U;
    counter_t pending_bucket = 0;
   
    counter_t new_bucket = function(wheel_bucket_calc,variant_suffix)(range_start);
    counter_t wheel_index = range_start % WHEEL_SIZE; // the position in the wheel, which determines which bits to mark for each index. 
    counter_t wheel_base = wheelmask_stripe_bits * (range_start / WHEEL_SIZE); // the position where the wheel had a last reset
    counter_t next_bucket_index = wheel_bit_estimate(bitbucket_end_type(range_start, bitbucket_t)); // the index of the next bucket change
    
    // TODO: make a larger wheel and check if we stay within the wheel so we have to take lesser % and /
    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_copy, "marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));
    for (counter_t index = range_start; index <= range_stop_unique; index += step) {

        // wheel_index = (index) % WHEEL_SIZE;

        if (wheelmask_bitpoint[wheel_index] > 0) 
        {
            if (index > next_bucket_index) {
                new_bucket = function(wheel_bucket_calc,variant_suffix)(index);
                next_bucket_index = wheel_bit_estimate(bitbucket_end_type(range_start, bitbucket_t)); // the index of the next bucket change
                wheel_base = wheelmask_stripe_bits * (index / WHEEL_SIZE);

                // if (wheel_bit <= 0) continue; // if the number is divisible by any of the wheel primes, skip it
                // // const counter_t new_bucket = index_type(wheel_bit, bitbucket_t);

                if (new_bucket != current_bucket) {
                    if (pending_mask) {
                        if (current_mask && ((pending_bucket + 1) == current_bucket )) { 
                            function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask, current_mask);
                            current_mask = (bitbucket_t)0U; // will be copied to pending_mask
                        }
                        else {
                            function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
                        }
                    }

                    pending_bucket = current_bucket;
                    pending_mask = current_mask;
                    current_bucket = new_bucket;
                    current_mask = (bitbucket_t)0U;
                }
            }

            const counter_t wheel_bit = wheel_base + wheelmask_bitpoint[wheel_index] -1 ;
            current_mask |= markmask_type(wheel_bit, bitbucket_t);
        }

        wheel_index += step;
        if (wheel_index >= WHEEL_SIZE) wheel_index %= WHEEL_SIZE;
    }

    if (pending_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
    }
    if (current_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_copy, "finished marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "finished setting factors\n");
}

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair_vector,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_vector, "MarkFactorsWheelStorageSmallRepeatPairVector: setting factors step %3ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t stop_bucket = function(wheel_block_calc,variant_suffix)(range_stop + 1);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    // +2 ensures all unique masks are flushed by bucket transitions
    const counter_t range_stop_unique = min(range_start + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE * (wheel_step + 2), range_stop);

    // go to first aligned block 
    counter_t current_bucket = 0;

    // align to first full bucket
    for (; (current_bucket = function(wheel_block_calc,variant_suffix)(range_start)) < 1 && range_start <= range_stop_unique; range_start += step) {
        function(markFactor_wheelstorage,variant_base_suffix)(sieve, range_start);
    }

    bitbucket_t current_mask = BITBUCKET0, pending_mask = BITBUCKET0;
    counter_t pending_bucket = 0;

    for (counter_t index = range_start; index <= range_stop_unique; index += step) {
        const counter_t wheel_bit = wheel_bit_calc(index);
        const counter_t new_bucket = function(wheel_block_calc,variant_suffix)(index);

        if (wheel_bit <= 0) continue; 

        if (new_bucket != current_bucket) {
            // if (pending_bucket) {
                if (((pending_bucket + 1) == current_bucket)) { 
                    function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask, current_mask);
                    current_mask = BITBUCKET0; // will be copied to pending_mask
                    current_bucket = 0; 
                }
                else {
                    function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
                }
            // }

            pending_bucket = current_bucket;
            pending_mask = current_mask;
            current_bucket = new_bucket;
            current_mask = BITBUCKET0;
        }
        const counter_t element = index_type(wheel_bit, variant_base_type_t) & bitbucket_element_mask(bitbucket_t, variant_base_type_t);
        current_mask[element] |= markmask_type(wheel_bit, variant_base_type_t);
    }

    if (pending_bucket) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
    }
    if (current_bucket) {
        function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_vector, "MarkFactorsWheelStorageSmallRepeatPairVector: finished setting factors\n");
}

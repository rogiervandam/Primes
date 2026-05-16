static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair,suffix)(void* restrict bitstorage, counter_t start_number, const counter_t stop_number, const counter_t step)
{
    logStart7(bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "Setting factors for prime %ju with step %ju using 'repeating pairs' of %s in %ju number range (%ju-%ju)", 
        (uintmax_t)step/2, (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number);   

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number);
    const counter_t wheel_step = reduce2power((step * wheelmask_stripe_bits)); // step in words, accounting for stripe alignment

    // align to first full bucket
    const counter_t next_aligned = min(getFactor( bitbucket_end_type(wheel_bit_estimate_last(start_number)+1, bitbucket_t)), stop_number); // the next factor that is aligned to the wheel, this is the first index we can start marking from
    logStart8(bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Aligning to first full bitbucket starting at number %ju by marking in number range %ju-%ju (bits %ju-%ju)", 
        (uintmax_t)start_number, (uintmax_t)start_number, (uintmax_t)next_aligned, (uintmax_t)wheel_bit_estimate_last(start_number), (uintmax_t)wheel_bit_estimate_last(next_aligned));
    for (; start_number <= next_aligned; start_number += step) function(markFactor_wheelstorage,suffix)(bitstorage, start_number);
    logStop8(bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Finished aligning to first full bitbucket at number %ju", (uintmax_t)start_number);

    const counter_t stop_number_unique = min(getFactor( bitbucket_start_type(wheel_bit_estimate_last(start_number), bitbucket_t) - 1 + wheel_step * wheelmask_stripe_bits * ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits)), stop_number);
    bitbucket_t current_mask = (bitbucket_t)0U, pending_mask = (bitbucket_t)0U;
    counter_t pending_bucket = 0, current_bucket = 0; // initialize current_bucket to 0 always triggers pending mask, but maybe cheaper than calculating the first bucket beforehand

    log8(time_markFactors_wheelstorage_small_repeat_pair, "Marking numbers for prime %ju with step %ju using 'repeating pairs' of %s in %ju number range (%ju-%ju) starting at number %ju", 
        (uintmax_t)step/2, (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), 
        (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)) );

    for (counter_t index = start_number; index <= stop_number_unique; index += step) {

        const counter_t new_bucket = function(wheel_bucket_calc,variant_suffix)(index);
        if (new_bucket != current_bucket) {
            if (pending_mask) {
                if (current_mask && ((pending_bucket + 1) == current_bucket )) { 
                    // function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask, current_mask);
                    function(applyMask_index2_mmask_args,suffix)(bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask, current_mask);
                    current_mask = (bitbucket_t)0U; // will be copied to pending_mask
                }
                else {
                    function(applyMask_index,suffix)(bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
                }
            }

            pending_bucket = current_bucket;
            pending_mask = current_mask;
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
        }

        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit >= 0) current_mask |= markmask_type(wheel_bit, bitbucket_t);
    }

    if (pending_mask) {
        function(applyMask_index,suffix)(bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
    }
    if (current_mask) {
        function(applyMask_index,suffix)(bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }

    logStop7(bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "finished marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

}

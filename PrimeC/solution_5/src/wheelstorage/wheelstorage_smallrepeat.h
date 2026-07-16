static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat,suffix)(void* restrict bitstorage, counter_t start_number, const counter_t stop_number, const counter_t step)
{
    logStart6(bitstorage, time_markFactors_wheelstorage_small_repeat, "MarkFactorsWheelStorageSmallRepeat: setting factors step %3ju using markFactors_wheelstorage_small_repeat %s in %ju factor range (%ju-%ju) (%ju occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step));

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number + 1);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheel_bitalloc); // step in words, accounting for stripe alignment
    // +2 ensures we iterate past the last unique bucket, so all masks get flushed by a bucket transition

    // align to first full bucket
    const counter_t next_aligned = min(getFactor( bitbucket_end_type(wheelstorage_bit_estimate_last(start_number)+1, bitbucket_t)), stop_number); // the next factor that is aligned to the wheel, this is the first index_number we can start marking from
    logStart8(bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Aligning to first full bitbucket starting at number %ju by marking in number range %ju-%ju (bits %ju-%ju)", 
        (uintmax_t)start_number, (uintmax_t)start_number, (uintmax_t)next_aligned, (uintmax_t)wheelstorage_bit_estimate_last(start_number), (uintmax_t)wheelstorage_bit_estimate_last(next_aligned));
    for (; start_number <= next_aligned; start_number += step) function(markFactor_wheelstorage,suffix)(bitstorage, start_number);
    logStop8(bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Finished aligning to first full bitbucket at number %ju", (uintmax_t)start_number);

    const counter_t stop_number_unique = min(getFactor( bitbucket_end_type(wheelstorage_bit_estimate_last(start_number), bitbucket_t) - 1 + wheel_step * wheel_bitalloc * ((bitcount_type(bitbucket_t) + wheel_bitalloc - 1) / wheel_bitalloc)), stop_number);

    bitbucket_t current_mask = 0ULL;
    counter_t current_bucket = 0;

    // go to first aligned block 
    for (register counter_t index_number = start_number; index_number <= stop_number_unique; index_number += step) { 
        const counter_t new_bucket = function(wheel_bucket_calc,variant_suffix)(index_number);

        if (current_bucket < new_bucket) { // when going to the next block
            if (current_mask) { // apply previous mask if it exists
                function(applyMask_index,suffix)(bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
            }
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
        }

        const counter_t wheelstorage_bit = wheelstorage_bit_calc(index_number);
        if (wheelstorage_bit >= 0) current_mask |= markmask_type(wheelstorage_bit, bitbucket_t);
    } 

    if (current_mask) {
        function(applyMask_index,suffix)(bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }
    
    logStop6(bitstorage, time_markFactors_wheelstorage_small_repeat, "finished setting factors");
}
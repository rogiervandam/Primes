static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat, "MarkFactorsWheelStorageSmallRepeat: setting factors step %3ju using markFactors_wheelstorage_small_repeat %s in %ju factor range (%ju-%ju) (%ju occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step));

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(range_stop + 1);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    // +2 ensures we iterate past the last unique bucket, so all masks get flushed by a bucket transition
    const counter_t range_stop_unique = min(range_start + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_BASIC_SIZE * (wheel_step + 1), range_stop); 

    bitbucket_t current_mask = 0ULL;
    counter_t current_bucket = 0;

    // go to first aligned block 
    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_bit = wheel_bit_calc(index);
        const counter_t new_bucket = function(wheel_bucket_calc,variant_suffix)(index);

        if (wheel_bit <= 0) continue;
        // const counter_t new_bucket = index_type(wheel_bit, bitbucket_t);

        if (current_bucket < new_bucket) { // when going to the next block
            if (current_mask) { // apply previous mask if it exists
                function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
            }
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
        }

        current_mask |= markmask_type(wheel_bit, bitbucket_t);
    } 

    // TODO: This can be left out if WHEEL aligns well and range_stop_unique is chosen carefully
    if (current_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }
    
    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat, "MarkFactorsWheelStorageSmallRepeat: finished setting factors\n");
}
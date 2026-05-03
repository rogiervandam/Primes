#define max_masks 3

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_mmask,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: setting factors step %3ju using markFactors_wheelstorage_small_repeat_mmask %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t stop_bucket = function(wheel_block_calc,variant_suffix)(range_stop + 1);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    // +max_masks ensures all unique masks are flushed by bucket transitions
    const counter_t range_stop_unique = min(range_start + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE * (wheel_step + 2), range_stop);

    // go to first aligned block 
    counter_t current_bucket = 0;

    // align to first full bucket
    for (; (current_bucket = function(wheel_block_calc,variant_suffix)(range_start)) < 1 && range_start <= range_stop_unique; range_start += step) {
        function(markFactor_wheelstorage,variant_base_suffix)(sieve, range_start);
    }

    bitbucket_t masks[max_masks] = {(bitbucket_t)0U};
    counter_t run_start_bucket = 0;
    counter_t run_end = ~(counter_t)0;  // sentinel: no active run
    counter_t run_count = 0;
    bitbucket_t* run_mask = masks;
    counter_t wheel_index = range_start % WHEEL_SIZE;
    counter_t wheel_bit_base = wheelmask_stripe_bits * (range_start / WHEEL_SIZE);
    counter_t new_bucket = index_type(wheel_bit_base, bitbucket_t);

    for (counter_t index = range_start; index <= range_stop_unique; index += step) {
        const counter_t bitpoint = wheelmask_bitpoint[wheel_index];

        if (bitpoint > 0) {
            if (new_bucket != run_end) {
                if (new_bucket == run_end + 1 && run_count < max_masks) {
                    run_mask = &masks[run_count++];
                    *run_mask = (bitbucket_t)0U;
                    run_end = new_bucket;
                } else {
                    if (run_count > 0) function(applyMask_index_mmask,suffix)(sieve->bitstorage, run_start_bucket, stop_bucket, wheel_step, masks, run_count);
                    run_start_bucket = run_end = new_bucket;
                    *(run_mask = masks) = (bitbucket_t)0U;
                    run_count = 1;
                }
            }
            *run_mask |= markmask_type(wheel_bit_base + bitpoint - 1, bitbucket_t);
        }

        wheel_index += step;
        if (wheel_index >= WHEEL_SIZE) {
            const counter_t advance = wheel_index / WHEEL_SIZE;
            wheel_index -= advance * WHEEL_SIZE;
            wheel_bit_base += wheelmask_stripe_bits * advance;
            new_bucket = index_type(wheel_bit_base, bitbucket_t);
        }
    }

    function(applyMask_index_mmask,suffix)(sieve->bitstorage, run_start_bucket, stop_bucket, wheel_step, masks, run_count);

    #undef FLUSH_MASK_RUN
    #undef max_masks

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: finished setting factors\n");
}


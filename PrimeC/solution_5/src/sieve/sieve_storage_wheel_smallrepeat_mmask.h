#define max_masks 2

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_mmask,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: setting factors step %3ju using markFactors_wheelstorage_small_repeat_mmask %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

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

    bitbucket_t masks[max_masks] = {(bitbucket_t)0U};
    counter_t run_start_bucket = 0;
    counter_t run_count = 0;
    bitbucket_t current_mask = (bitbucket_t)0U;

    #define FLUSH_MASK_RUN() \
        do { \
            if (run_count == 1) { \
                function(applyMask_index,suffix)(sieve->bitstorage, run_start_bucket, stop_bucket, wheel_step, masks[0]); \
            } \
            else if (run_count > 1) { \
                function(applyMask_index_mmask,suffix)(sieve->bitstorage, run_start_bucket, stop_bucket, wheel_step, masks, run_count); \
            } \
            run_count = 0; \
        } while (0)

    #define PUSH_BUCKET_MASK(bucket, mask_value) \
        do { \
            if ((mask_value) == (bitbucket_t)0U) break; \
            if (run_count == 0) { \
                run_start_bucket = (bucket); \
                masks[0] = (mask_value); \
                run_count = 1; \
            } \
            else if (((bucket) == (run_start_bucket + run_count)) && (run_count < max_masks)) { \
                masks[run_count++] = (mask_value); \
            } \
            else { \
                FLUSH_MASK_RUN(); \
                run_start_bucket = (bucket); \
                masks[0] = (mask_value); \
                run_count = 1; \
            } \
        } while (0)

    // load all the masks for the next max_masks buckets, so we can apply them immediately when we hit the corresponding bucket, without having to calculate the mask on the fly
    for (counter_t index = range_start; index <= range_stop_unique; index += step) {
        const counter_t wheel_bit = wheel_bit_calc(index);
        const counter_t new_bucket = function(wheel_block_calc,variant_suffix)(index);

        if (wheel_bit <= 0) continue;

        if (new_bucket != current_bucket) {
            PUSH_BUCKET_MASK(current_bucket, current_mask);
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
        }

        current_mask |= markmask_type(wheel_bit, bitbucket_t);
    }

    PUSH_BUCKET_MASK(current_bucket, current_mask);
    FLUSH_MASK_RUN();

    #undef PUSH_BUCKET_MASK
    #undef FLUSH_MASK_RUN
    #undef max_masks

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: finished setting factors\n");
}


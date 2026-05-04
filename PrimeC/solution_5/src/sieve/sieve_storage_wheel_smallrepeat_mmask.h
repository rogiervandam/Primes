#ifndef max_masks
    #define max_masks 2
#endif

// MMASK_PASS_ARGS: when defined, pass masks as individual arguments for n=1 and n=2
// so the compiler can keep them in registers rather than loading from a pointer.
// For n>2 the pointer variant is used regardless.
#ifdef MMASK_PASS_ARGS
    #if max_masks == 1
        #define APPLYMASK_CALL(bitstorage, range_start_index, range_stop_index, step, masks) \
            function(applyMask_index1_mmask_args,suffix)(bitstorage, range_start_index, range_stop_index, step, (masks)[0])
    #elif max_masks == 2
        #define APPLYMASK_CALL(bitstorage, range_start_index, range_stop_index, step, masks) \
            function(applyMask_index2_mmask_args,suffix)(bitstorage, range_start_index, range_stop_index, step, (masks)[0], (masks)[1])
    #elif (max_masks >= 3) && (max_masks <= 8)
        #define APPLYMASK_DISPATCH_N(n, bitstorage, range_start_index, range_stop_index, step, masks) \
            function(applyMask_index##n##_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks)
        #define APPLYMASK_DISPATCH(bitstorage, range_start_index, range_stop_index, step, masks, n) \
            APPLYMASK_DISPATCH_N(n, bitstorage, range_start_index, range_stop_index, step, masks)
        #define APPLYMASK_CALL(bitstorage, range_start_index, range_stop_index, step, masks) \
            APPLYMASK_DISPATCH(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
    #else
        #define APPLYMASK_CALL(bitstorage, range_start_index, range_stop_index, step, masks) \
            function(applyMask_index_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
    #endif
#elif (max_masks >= 1) && (max_masks <= 8)
    #define APPLYMASK_DISPATCH_N(n, bitstorage, range_start_index, range_stop_index, step, masks) \
        function(applyMask_index##n##_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks)
    #define APPLYMASK_DISPATCH(bitstorage, range_start_index, range_stop_index, step, masks, n) \
        APPLYMASK_DISPATCH_N(n, bitstorage, range_start_index, range_stop_index, step, masks)
    #define APPLYMASK_CALL(bitstorage, range_start_index, range_stop_index, step, masks) \
        APPLYMASK_DISPATCH(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
#else
    #define APPLYMASK_CALL(bitstorage, range_start_index, range_stop_index, step, masks) \
        function(applyMask_index_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
#endif

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_mmask,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: setting factors step %3ju using markFactors_wheelstorage_small_repeat_mmask %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t stop_bucket = function(wheel_bucket_estimate,variant_suffix)(range_stop);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    // +max_masks ensures all unique masks are flushed by bucket transitions
    const counter_t range_last_unique = min(range_start + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE * (wheel_step + 1), range_stop);

    // go to first aligned block 
    // counter_t current_bucket = function(wheel_block_calc,variant_suffix)(range_start);

    // // align to first full bucket
    // for (; ((function(wheel_block_calc,variant_suffix)(range_start)) < current_bucket + 1) && range_start <= range_last_unique; range_start += step) {
    //     function(markFactor_wheelstorage,variant_base_suffix)(sieve, range_start);
    // }

    bitbucket_t masks[max_masks] = {(bitbucket_t)0U};
    counter_t wheel_stripe_index = range_start % WHEEL_SIZE; // the index of the current bit in the wheel
    counter_t wheel_base_bitindex = wheelmask_stripe_bits * (range_start / WHEEL_SIZE); //
    counter_t current_bucket = index_type(wheel_base_bitindex, bitbucket_t);
    counter_t start_bucket = current_bucket;
    counter_t target_bucket = start_bucket + max_masks;
    const counter_t last_unique_bucket = function(wheel_bucket_estimate,variant_suffix)(range_last_unique);

    for (; current_bucket <= last_unique_bucket;) {

    // for (counter_t index = range_start; index <= range_last_unique; index += step) {
        const counter_t bitpoint = wheelmask_bitpoint[wheel_stripe_index];

        if (bitpoint > 0) {
            if (current_bucket >= target_bucket) {
                APPLYMASK_CALL(sieve->bitstorage, start_bucket, stop_bucket, wheel_step, masks);
                for (counter_t i = 0; i < max_masks; i++) masks[i] = (bitbucket_t)0U;
                start_bucket = current_bucket;
                target_bucket = start_bucket + max_masks;
            }

            masks[current_bucket - start_bucket] |= markmask_type(wheel_base_bitindex + bitpoint - 1, bitbucket_t);
        }

        wheel_stripe_index += step;
        if (wheel_stripe_index >= WHEEL_SIZE) {
            const counter_t advance = wheel_stripe_index / WHEEL_SIZE;
            wheel_stripe_index -= advance * WHEEL_SIZE;
            wheel_base_bitindex += wheelmask_stripe_bits * advance;
            current_bucket = index_type(wheel_base_bitindex, bitbucket_t);
        }
    }

    const counter_t masks_remaining = min(stop_bucket - min(stop_bucket, start_bucket), max_masks);
    if (masks_remaining) APPLYMASK_CALL(sieve->bitstorage, start_bucket, stop_bucket, wheel_step, masks);

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: finished setting factors\n");
}


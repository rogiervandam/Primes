#ifndef max_masks
    #define max_masks 1
#endif

// MMASK_PASS_ARGS: when defined, pass masks as individual arguments for n=1 and n=2
// so the compiler can keep them in registers rather than loading from a pointer.
// For n>2 the pointer variant is used regardless.
#ifdef MMASK_PASS_ARGS
    #if max_masks == 1
        #define APPLYMASK_CALL(bitstorage, start_number_index, stop_number_index, step, masks) \
            function(applyMask_index1_mmask_args,suffix)(bitstorage, start_number_index, stop_number_index, step, (masks)[0])
    #elif max_masks == 2
        #define APPLYMASK_CALL(bitstorage, start_number_index, stop_number_index, step, masks) \
            function(applyMask_index2_mmask_args,suffix)(bitstorage, start_number_index, stop_number_index, step, (masks)[0], (masks)[1])
    #elif (max_masks >= 3) && (max_masks <= 8)
        #define APPLYMASK_DISPATCH_N(n, bitstorage, start_number_index, stop_number_index, step, masks) \
            function(applyMask_index##n##_mmask,suffix)(bitstorage, start_number_index, stop_number_index, step, masks)
        #define APPLYMASK_DISPATCH(bitstorage, start_number_index, stop_number_index, step, masks, n) \
            APPLYMASK_DISPATCH_N(n, bitstorage, start_number_index, stop_number_index, step, masks)
        #define APPLYMASK_CALL(bitstorage, start_number_index, stop_number_index, step, masks) \
            APPLYMASK_DISPATCH(bitstorage, start_number_index, stop_number_index, step, masks, max_masks)
    #else
        #define APPLYMASK_CALL(bitstorage, start_number_index, stop_number_index, step, masks) \
            function(applyMask_index_mmask,suffix)(bitstorage, start_number_index, stop_number_index, step, masks, max_masks)
    #endif
#elif (max_masks >= 1) && (max_masks <= 8)
    #define APPLYMASK_DISPATCH_N(n, bitstorage, start_number_index, stop_number_index, step, masks) \
        function(applyMask_index##n##_mmask,suffix)(bitstorage, start_number_index, stop_number_index, step, masks)
    #define APPLYMASK_DISPATCH(bitstorage, start_number_index, stop_number_index, step, masks, n) \
        APPLYMASK_DISPATCH_N(n, bitstorage, start_number_index, stop_number_index, step, masks)
    #define APPLYMASK_CALL(bitstorage, start_number_index, stop_number_index, step, masks) \
        APPLYMASK_DISPATCH(bitstorage, start_number_index, stop_number_index, step, masks, max_masks)
#else
    #define APPLYMASK_CALL(bitstorage, start_number_index, stop_number_index, step, masks) \
        function(applyMask_index_mmask,suffix)(bitstorage, start_number_index, stop_number_index, step, masks, max_masks)
#endif

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_mmask,suffix)(sieve_t* sieve, counter_t start_number, const counter_t stop_number, const counter_t step)
{
    logStart6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: setting factors step %3ju using markFactors_wheelstorage_small_repeat_mmask %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    // const counter_t stop_bucket = function(wheel_bucket_estimate,variant_suffix)(stop_number);
    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number) + 1;
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    // +max_masks ensures all unique masks are flushed by bucket transitions

        // align to first full bucket
    const counter_t next_aligned = min(getFactor( bitbucket_end_type(wheel_bit_estimate_last(start_number)+1, bitbucket_t)), stop_number); // the next factor that is aligned to the wheel, this is the first index we can start marking from
    logStart8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Aligning to first full bitbucket starting at number %ju by marking in number range %ju-%ju (bits %ju-%ju)", 
        (uintmax_t)start_number, (uintmax_t)start_number, (uintmax_t)next_aligned, (uintmax_t)wheel_bit_estimate_last(start_number), (uintmax_t)wheel_bit_estimate_last(next_aligned));
    for (; start_number <= next_aligned; start_number += step) function(markFactor_wheelstorage,suffix)(sieve, start_number);
    logStop8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Finished aligning to first full bitbucket at number %ju", (uintmax_t)start_number);

    // const counter_t range_last_unique = min(start_number + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE * (wheel_step + 1), stop_number);
    const counter_t stop_number_unique = min(getFactor( bitbucket_start_type(wheel_bit_estimate_last(start_number), bitbucket_t) - 1 + wheel_step * wheelmask_stripe_bits * ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits)), stop_number);
    // const counter_t stop_number_unique = min(start_number + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_BASIC_SIZE * (wheel_step + 1), stop_number); 

    bitbucket_t masks[max_masks] = {(bitbucket_t)0U};
    // bitbucket_t mask = (bitbucket_t)0U;
    // counter_t wheel_stripe_index = start_number % WHEEL_SIZE; // the index of the current bit in the wheel
    // counter_t wheel_base_bitindex = wheelmask_stripe_bits * (start_number / WHEEL_SIZE); //
    counter_t current_bucket = function(wheel_bucket_calc,variant_suffix)(start_number);
    counter_t start_bucket = current_bucket;
    counter_t target_bucket = start_bucket;
    // const counter_t last_unique_bucket = function(wheel_bucket_estimate,variant_suffix)(range_last_unique);
    // const counter_t last_unique_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number_unique);

    // for (; current_bucket <= last_unique_bucket;) {

    for (counter_t index = start_number; index <= stop_number_unique; index += step) {
        current_bucket = function(wheel_bucket_calc,variant_suffix)(index);

        if (current_bucket > target_bucket) {
            // APPLYMASK_CALL(sieve->bitstorage, start_bucket, stop_bucket, wheel_step, masks);
            function(applyMask_index,suffix)(sieve->bitstorage, start_bucket, stop_bucket, wheel_step, masks[0]);
            // function(applyMask_index,suffix)(sieve->bitstorage, start_bucket, stop_bucket, wheel_step, mask);
            for (counter_t i = 0; i < max_masks; i++) masks[i] = (bitbucket_t)0U;
            start_bucket = current_bucket;
            target_bucket = start_bucket;// + max_masks - 1;
        }

        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit >= 0) masks[0] |= markmask_type(wheel_bit, bitbucket_t);
    }

    const counter_t masks_remaining = min(stop_bucket - min(stop_bucket, start_bucket), max_masks);
    log9("Masks remaining after loop: %ju (target bucket: %ju, stop bucket: %ju, start bucket: %ju, max_masks: %ju)", (uintmax_t)masks_remaining, (uintmax_t)target_bucket, (uintmax_t)stop_bucket, (uintmax_t)start_bucket, (uintmax_t)max_masks);
    // if (masks_remaining) APPLYMASK_CALL(sieve->bitstorage, start_bucket, stop_bucket, wheel_step, masks);
    if (masks_remaining) function(applyMask_index,suffix)(sieve->bitstorage, start_bucket, stop_bucket, wheel_step, masks[0]);

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: finished setting factors\n");
}


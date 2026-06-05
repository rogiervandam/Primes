#ifdef MMASK_EMIT_FUNCTION
// ── Section A: emit one variant ─────────────────────────────────────────────
//    Entered via self-include from Section B with specific max_masks + suffix.
//    Emits: markFactors_wheelstorage_small_repeat_mmask<N>_<suffix>

    #undef APPLYMASK_CALL
    #undef APPLYMASK_DISPATCH
    #undef APPLYMASK_DISPATCH_N

    // MMASK_PASS_ARGS: pass masks as individual arguments for n=1 and n=2
    // so the compiler can keep them in registers rather than loading from a pointer.
    // For n>2 the pointer variant is used regardless.
    // #define MMASK_PASS_ARGS 1

    #ifdef MMASK_PASS_ARGS
        #if max_masks == 1
            #define APPLYMASK_CALL(bitstorage, start_number, stop_number, step, masks) \
                function(applyMask_index1_mmask_args,suffix)(bitstorage, start_number, stop_number, step, (masks)[0])
        #elif max_masks == 2
            #define APPLYMASK_CALL(bitstorage, start_number, stop_number, step, masks) \
                function(applyMask_index2_mmask_args,suffix)(bitstorage, start_number, stop_number, step, (masks)[0], (masks)[1])
        #elif (max_masks >= 3) && (max_masks <= 8)
            #define APPLYMASK_DISPATCH_N(n, bitstorage, start_number, stop_number, step, masks) \
                function(applyMask_index##n##_mmask,suffix)(bitstorage, start_number, stop_number, step, masks)
            #define APPLYMASK_DISPATCH(bitstorage, start_number, stop_number, step, masks, n) \
                APPLYMASK_DISPATCH_N(n, bitstorage, start_number, stop_number, step, masks)
            #define APPLYMASK_CALL(bitstorage, start_number, stop_number, step, masks) \
                APPLYMASK_DISPATCH(bitstorage, start_number, stop_number, step, masks, max_masks)
        #else
            #define APPLYMASK_CALL(bitstorage, start_number, stop_number, step, masks) \
                function(applyMask_index_mmask,suffix)(bitstorage, start_number, stop_number, step, masks, max_masks)
        #endif
    #else
        #if (max_masks >= 1) && (max_masks <= 8)
            #define APPLYMASK_DISPATCH_N(n, bitstorage, start_number, stop_number, step, masks) \
                function(applyMask_index##n##_mmask,suffix)(bitstorage, start_number, stop_number, step, masks)
            #define APPLYMASK_DISPATCH(bitstorage, start_number, stop_number, step, masks, n) \
                APPLYMASK_DISPATCH_N(n, bitstorage, start_number, stop_number, step, masks)
            #define APPLYMASK_CALL(bitstorage, start_number, stop_number, step, masks) \
                APPLYMASK_DISPATCH(bitstorage, start_number, stop_number, step, masks, max_masks)
        #else
            #define APPLYMASK_CALL(bitstorage, start_number, stop_number, step, masks) \
                function(applyMask_index_mmask,suffix)(bitstorage, start_number, stop_number, step, masks, max_masks)
        #endif
    #endif

    static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
    NAME(NAME(markFactors_wheelstorage_small_repeat_mmask, max_masks), suffix)(void* restrict bitstorage, counter_t start_number, const counter_t stop_number, const counter_t step)
    {
        logStart6(bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "Setting factors step %3ju using mmasks(%ju) %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)max_masks, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

        const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number) + 1;
        const counter_t wheel_step = reduce2power(step); // step in words, accounting for stripe alignment

        // align to first full bucket
        const counter_t next_aligned = min(getFactor( bitbucket_end_type(wheelstorage_bit_estimate_last(start_number)+1, bitbucket_t)), stop_number); // the next factor that is aligned to the wheel, this is the first index we can start marking from
        logStart8(bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Aligning to first full bitbucket starting at number %ju by marking in number range %ju-%ju (bits %ju-%ju)", 
            (uintmax_t)start_number, (uintmax_t)start_number, (uintmax_t)next_aligned, (uintmax_t)wheelstorage_bit_estimate_last(start_number), (uintmax_t)wheelstorage_bit_estimate_last(next_aligned));
        for (; start_number <= next_aligned; start_number += step) function(markFactor_wheelstorage,suffix)(bitstorage, start_number);
        logStop8(bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Finished aligning to first full bitbucket at number %ju", (uintmax_t)start_number);

        const counter_t stop_number_unique = min(getFactor( bitbucket_start_type(wheelstorage_bit_estimate_last(start_number), bitbucket_t) - 1 + wheel_step * wheel_bitalloc * ((bitcount_type(bitbucket_t) + wheel_bitalloc - 1) / wheel_bitalloc)), stop_number);

        bitbucket_t masks[max_masks];
        for (counter_t i = 0; i < max_masks; i++) masks[i] = (bitbucket_t)0U;
        counter_t start_bucket = function(wheel_bucket_calc,variant_suffix)(start_number);
        counter_t target_bucket = start_bucket + max_masks - 1;

        for (counter_t index_number = start_number; index_number <= stop_number_unique; index_number += step) {
            const counter_t current_bucket = function(wheel_bucket_calc,variant_suffix)(index_number);

            if (current_bucket > target_bucket) {
                APPLYMASK_CALL(bitstorage, start_bucket, stop_bucket, wheel_step, masks);
                for (counter_t i = 0; i < max_masks; i++) masks[i] = (bitbucket_t)0U;
                start_bucket = current_bucket;
                target_bucket = current_bucket + max_masks - 1;
            }

            const counter_t wheelstorage_bit = wheelstorage_bit_calc(index_number);
            if (wheelstorage_bit >= 0) masks[current_bucket - start_bucket] |= markmask_type(wheelstorage_bit, bitbucket_t);
        }

        const counter_t masks_remaining = min(stop_bucket - min(stop_bucket, start_bucket), (counter_t)max_masks);
        if (masks_remaining) function(applyMask_index_mmask,suffix)(bitstorage, start_bucket, stop_bucket, wheel_step, masks, masks_remaining);

        logStop6(bitstorage, time_markFactors_wheelstorage_small_repeat_mmask, "MarkFactorsWheelStorageSmallRepeatMmask: finished setting factors");
    }

    #undef APPLYMASK_CALL
    #undef APPLYMASK_DISPATCH
    #undef APPLYMASK_DISPATCH_N
    #undef MMASK_PASS_ARGS

#elif defined(BUILD_WORDS_STAGE) && defined(unrolls) && (unrolls > 1)

    #ifndef INCLUDE_MMASK_ME
        #define INCLUDE_MMASK_ME "wheelstorage_smallrepeat_mmask.h"
    #endif

    #define MMASK_EMIT_FUNCTION 1

    #define max_masks 1
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #define max_masks 2
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #define max_masks 3
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #define max_masks 4
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #define max_masks 5
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #define max_masks 6
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #define max_masks 7
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #define max_masks 8
    #include INCLUDE_MMASK_ME
    #undef max_masks

    #undef MMASK_EMIT_FUNCTION

#endif
// #ifndef max_masks
//     #define max_masks 2
// #endif

// // Bitstorage version of markFactors_wheelstorage_small_repeat_mmask:
// // like setBitsTrue_largestep_repeat but batches up to max_masks consecutive
// // bucket masks before flushing with a single applyMask_index_mmask call.
// #ifndef LARGESTEP_REPEAT_MMASK_GUARD
//     #define LARGESTEP_REPEAT_MMASK_GUARD

//     #include "../trace/sieve_trace.h"

//     #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_largestep_repeat_mmask.h"
//     #include "../generic/variants/generate.h"

// #elif defined(BUILD_WORDS_STAGE)

// // MMASK_PASS_ARGS: when defined, pass masks as individual arguments for n=1 and n=2
// // so the compiler can keep them in registers rather than loading from a pointer.
// // For n>2 the pointer variant is used regardless.
// #ifdef MMASK_PASS_ARGS
//     #if max_masks == 1
//         #define APPLYMASK_CALL_LSRM(bitstorage, range_start_index, range_stop_index, step, masks) \
//             function(applyMask_index1_mmask_args,suffix)(bitstorage, range_start_index, range_stop_index, step, (masks)[0])
//     #elif max_masks == 2
//         #define APPLYMASK_CALL_LSRM(bitstorage, range_start_index, range_stop_index, step, masks) \
//             function(applyMask_index2_mmask_args,suffix)(bitstorage, range_start_index, range_stop_index, step, (masks)[0], (masks)[1])
//     #elif (max_masks >= 3) && (max_masks <= 8)
//         #define APPLYMASK_DISPATCH_N_LSRM(n, bitstorage, range_start_index, range_stop_index, step, masks) \
//             function(applyMask_index##n##_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks)
//         #define APPLYMASK_DISPATCH_LSRM(bitstorage, range_start_index, range_stop_index, step, masks, n) \
//             APPLYMASK_DISPATCH_N_LSRM(n, bitstorage, range_start_index, range_stop_index, step, masks)
//         #define APPLYMASK_CALL_LSRM(bitstorage, range_start_index, range_stop_index, step, masks) \
//             APPLYMASK_DISPATCH_LSRM(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
//     #else
//         #define APPLYMASK_CALL_LSRM(bitstorage, range_start_index, range_stop_index, step, masks) \
//             function(applyMask_index_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
//     #endif
// #elif (max_masks >= 1) && (max_masks <= 8)
//     #define APPLYMASK_DISPATCH_N_LSRM(n, bitstorage, range_start_index, range_stop_index, step, masks) \
//         function(applyMask_index##n##_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks)
//     #define APPLYMASK_DISPATCH_LSRM(bitstorage, range_start_index, range_stop_index, step, masks, n) \
//         APPLYMASK_DISPATCH_N_LSRM(n, bitstorage, range_start_index, range_stop_index, step, masks)
//     #define APPLYMASK_CALL_LSRM(bitstorage, range_start_index, range_stop_index, step, masks) \
//         APPLYMASK_DISPATCH_LSRM(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
// #else
//     #define APPLYMASK_CALL_LSRM(bitstorage, range_start_index, range_stop_index, step, masks) \
//         function(applyMask_index_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks, max_masks)
// #endif

// static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
// function(setBitsTrue_largestep_repeat_mmask,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step)
// {
//     logStart7(bitstorage, time_setBitsTrue_largestep_repeat, "SetBitsTrueLargestepRepeatMmask: setting bits step %3ju using largestep_repeat_mmask%s (%d masks) in %ju bit range (%ju-%ju) (%ju repeating occurrences)", (uintmax_t)step, STR(suffix), max_masks, (uintmax_t)safe_diff(range_stop, range_start), (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)(safe_diff(range_stop, range_start) / (uintmax_t)(bitcount_type(bitbucket_t) * step)));

//     const counter_t range_stop_index  = index_type(range_stop, bitbucket_t);
//     const counter_t range_stop_unique = bitbucket_end_type(range_start + bitcount_type(bitbucket_t) * step, bitbucket_t);

//     bitbucket_t masks[max_masks] = {(bitbucket_t)0U};
//     counter_t start_bucket  = index_type(range_start, bitbucket_t);
//     counter_t target_bucket = start_bucket + max_masks;

//     for (counter_t index = range_start; index <= range_stop_unique; index += step) {
//         const counter_t current_bucket = index_type(index, bitbucket_t);

//         if (current_bucket >= target_bucket) {
//             APPLYMASK_CALL_LSRM(bitstorage, start_bucket, range_stop_index, step, masks);
//             for (counter_t i = 0; i < max_masks; i++) masks[i] = (bitbucket_t)0U;
//             start_bucket  = current_bucket;
//             target_bucket = start_bucket + max_masks;
//         }

//         masks[current_bucket - start_bucket] |= markmask_type(index, bitbucket_t);
//     }

//     const counter_t masks_remaining = min(range_stop_index - min(range_stop_index, start_bucket), (counter_t)max_masks);
//     if (masks_remaining) APPLYMASK_CALL_LSRM(bitstorage, start_bucket, range_stop_index, step, masks);

//     logStop7(bitstorage, time_setBitsTrue_largestep_repeat, "SetBitsTrueLargestepRepeatMmask: finished setting bits using largestep_repeat_mmask%s\n", STR(suffix));
// }

// #undef APPLYMASK_CALL_LSRM
// #ifdef APPLYMASK_DISPATCH_N_LSRM
//     #undef APPLYMASK_DISPATCH_N_LSRM
//     #undef APPLYMASK_DISPATCH_LSRM
// #endif

// #endif

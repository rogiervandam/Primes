#ifndef APPLYMASK_MMASK_GUARD
    #define APPLYMASK_MMASK_GUARD

    #include <stdio.h>
    #include "../trace/sieve_trace.h"

    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_applyMask_mmask.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_VECTORS_STAGE) || defined(BUILD_WORDS_STAGE)

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks, const counter_t mask_count)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s apply %ju %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), (uintmax_t)mask_count, STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);

    if unlikely(mask_count <= 0) {
        logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s skipped: no masks\n", STR(suffix));
        return;
    }

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    for (counter_t index = range_start_index; likely(index <= range_stop_index); index += step) {
        const counter_t apply_count = min(mask_count, safe_diff(range_stop_index, index) + 1);
        #pragma GCC ivdep
        for (counter_t mask_i = 0; mask_i < apply_count; mask_i++) {
            bitstorage_sized[index + mask_i] |= masks[mask_i];
        }
    }

    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif

    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s finished applying masks\n", STR(suffix));
}

#endif
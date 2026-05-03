#ifndef APPLYMASK_MMASK_GUARD
    #define APPLYMASK_MMASK_GUARD

    #include <stdio.h>
    #include "../trace/sieve_trace.h"

    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_applyMask_mmask.h"
    #include "../generic/variants/generate.h"

    // #define unroll_style 2

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

    if (mask_count == 3) {
        register const counter_t step_max = step * unrolls;
        register const counter_t step_2 = step * 2;
        register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2];
        register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
        register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
        register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 2)], sizeof(bitbucket_t));

        #if unrolls == 4
            #pragma GCC ivdep
            #pragma GCC unroll 32
            for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
                *(index_ptr)             |= mask1; *(index_ptr + 1)             |= mask2; *(index_ptr + 2)             |= mask3;
                *(index_ptr + step)      |= mask1; *(index_ptr + step + 1)      |= mask2; *(index_ptr + step + 2)      |= mask3;
                *(index_ptr + step_2)    |= mask1; *(index_ptr + step_2 + 1)    |= mask2; *(index_ptr + step_2 + 2)    |= mask3;
                *(index_ptr + step * 3)  |= mask1; *(index_ptr + step * 3 + 1)  |= mask2; *(index_ptr + step * 3 + 2)  |= mask3;
            }
        #endif

        #if unrolls == 8
            #pragma GCC ivdep
            #pragma GCC unroll 32
            for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
                *(index_ptr + step * 0) |= mask1; *(index_ptr + step * 0 + 1) |= mask2; *(index_ptr + step * 0 + 2) |= mask3;
                *(index_ptr + step * 1) |= mask1; *(index_ptr + step * 1 + 1) |= mask2; *(index_ptr + step * 1 + 2) |= mask3;
                *(index_ptr + step * 2) |= mask1; *(index_ptr + step * 2 + 1) |= mask2; *(index_ptr + step * 2 + 2) |= mask3;
                *(index_ptr + step * 3) |= mask1; *(index_ptr + step * 3 + 1) |= mask2; *(index_ptr + step * 3 + 2) |= mask3;
                *(index_ptr + step * 4) |= mask1; *(index_ptr + step * 4 + 1) |= mask2; *(index_ptr + step * 4 + 2) |= mask3;
                *(index_ptr + step * 5) |= mask1; *(index_ptr + step * 5 + 1) |= mask2; *(index_ptr + step * 5 + 2) |= mask3;
                *(index_ptr + step * 6) |= mask1; *(index_ptr + step * 6 + 1) |= mask2; *(index_ptr + step * 6 + 2) |= mask3;
                *(index_ptr + step * 7) |= mask1; *(index_ptr + step * 7 + 1) |= mask2; *(index_ptr + step * 7 + 2) |= mask3;
            }
        #endif

        for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
            const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
            const counter_t apply_count = min((counter_t)3, safe_diff(range_stop_index, base_index) + 1);
            *index_ptr |= mask1;
            if (apply_count > 1) *(index_ptr + 1) |= mask2;
            if (apply_count > 2) *(index_ptr + 2) |= mask3;
        }

        #ifdef COMPILE_TRACE
        log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
                 (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
        #endif

        logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s finished applying masks\n", STR(suffix));
        return;
    }

    if (mask_count == 4) {
        register const counter_t step_max = step * unrolls;
        register const counter_t step_2 = step * 2;
        register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2], mask4 = masks[3];
        register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
        register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
        register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 3)], sizeof(bitbucket_t));

        #if unrolls == 4
            #pragma GCC ivdep
            #pragma GCC unroll 32
            for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
                *(index_ptr)             |= mask1; *(index_ptr + 1)             |= mask2; *(index_ptr + 2)             |= mask3; *(index_ptr + 3)             |= mask4;
                *(index_ptr + step)      |= mask1; *(index_ptr + step + 1)      |= mask2; *(index_ptr + step + 2)      |= mask3; *(index_ptr + step + 3)      |= mask4;
                *(index_ptr + step_2)    |= mask1; *(index_ptr + step_2 + 1)    |= mask2; *(index_ptr + step_2 + 2)    |= mask3; *(index_ptr + step_2 + 3)    |= mask4;
                *(index_ptr + step * 3)  |= mask1; *(index_ptr + step * 3 + 1)  |= mask2; *(index_ptr + step * 3 + 2)  |= mask3; *(index_ptr + step * 3 + 3)  |= mask4;
            }
        #endif

        #if unrolls == 8
            #pragma GCC ivdep
            #pragma GCC unroll 32
            for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
                *(index_ptr + step * 0) |= mask1; *(index_ptr + step * 0 + 1) |= mask2; *(index_ptr + step * 0 + 2) |= mask3; *(index_ptr + step * 0 + 3) |= mask4;
                *(index_ptr + step * 1) |= mask1; *(index_ptr + step * 1 + 1) |= mask2; *(index_ptr + step * 1 + 2) |= mask3; *(index_ptr + step * 1 + 3) |= mask4;
                *(index_ptr + step * 2) |= mask1; *(index_ptr + step * 2 + 1) |= mask2; *(index_ptr + step * 2 + 2) |= mask3; *(index_ptr + step * 2 + 3) |= mask4;
                *(index_ptr + step * 3) |= mask1; *(index_ptr + step * 3 + 1) |= mask2; *(index_ptr + step * 3 + 2) |= mask3; *(index_ptr + step * 3 + 3) |= mask4;
                *(index_ptr + step * 4) |= mask1; *(index_ptr + step * 4 + 1) |= mask2; *(index_ptr + step * 4 + 2) |= mask3; *(index_ptr + step * 4 + 3) |= mask4;
                *(index_ptr + step * 5) |= mask1; *(index_ptr + step * 5 + 1) |= mask2; *(index_ptr + step * 5 + 2) |= mask3; *(index_ptr + step * 5 + 3) |= mask4;
                *(index_ptr + step * 6) |= mask1; *(index_ptr + step * 6 + 1) |= mask2; *(index_ptr + step * 6 + 2) |= mask3; *(index_ptr + step * 6 + 3) |= mask4;
                *(index_ptr + step * 7) |= mask1; *(index_ptr + step * 7 + 1) |= mask2; *(index_ptr + step * 7 + 2) |= mask3; *(index_ptr + step * 7 + 3) |= mask4;
            }
        #endif

        for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
            const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
            const counter_t apply_count = min((counter_t)4, safe_diff(range_stop_index, base_index) + 1);
            *index_ptr |= mask1;
            if (apply_count > 1) *(index_ptr + 1) |= mask2;
            if (apply_count > 2) *(index_ptr + 2) |= mask3;
            if (apply_count > 3) *(index_ptr + 3) |= mask4;
        }

        #ifdef COMPILE_TRACE
        log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
                 (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
        #endif

        logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s finished applying masks\n", STR(suffix));
        return;
    }

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
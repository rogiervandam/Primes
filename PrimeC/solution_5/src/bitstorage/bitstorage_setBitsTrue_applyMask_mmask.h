#ifndef APPLYMASK_MMASK_GUARD
    #define APPLYMASK_MMASK_GUARD

    #include <stdio.h>
    #include "../trace/sieve_trace.h"

    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_applyMask_mmask.h"
    #include "../generic/variants/generate.h"

    // #define unroll_style 2

#elif defined(BUILD_VECTORS_STAGE) || defined(BUILD_WORDS_STAGE)

#if defined(__clang__)
    #define LOOP_UNROLL_32 _Pragma("clang loop unroll_count(32)")
    #define LOOP_UNROLL_8 _Pragma("clang loop unroll_count(8)")
    #define LOOP_IVDEP
#elif defined(__GNUC__)
    #define LOOP_UNROLL_32 _Pragma("GCC unroll 32")
    #define LOOP_UNROLL_8 _Pragma("GCC unroll 8")
    #define LOOP_IVDEP _Pragma("GCC ivdep")
#else
    #define LOOP_UNROLL_32
    #define LOOP_UNROLL_8
    #define LOOP_IVDEP
#endif

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index1_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index1%s apply 1 %s (%ju bit) mask with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0];
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr)            |= mask1;
            *(index_ptr + step)     |= mask1;
            *(index_ptr + step * 2) |= mask1;
            *(index_ptr + step * 3) |= mask1;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr + step * 0) |= mask1;
            *(index_ptr + step * 1) |= mask1;
            *(index_ptr + step * 2) |= mask1;
            *(index_ptr + step * 3) |= mask1;
            *(index_ptr + step * 4) |= mask1;
            *(index_ptr + step * 5) |= mask1;
            *(index_ptr + step * 6) |= mask1;
            *(index_ptr + step * 7) |= mask1;
        }
    #endif
    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
        *index_ptr |= mask1;
    }
    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index1%s finished applying mask\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index2_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index2%s apply 2 %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0], mask2 = masks[1];
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 1)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr)            |= mask1; *(index_ptr + 1)            |= mask2;
            *(index_ptr + step)     |= mask1; *(index_ptr + step + 1)     |= mask2;
            *(index_ptr + step * 2) |= mask1; *(index_ptr + step * 2 + 1) |= mask2;
            *(index_ptr + step * 3) |= mask1; *(index_ptr + step * 3 + 1) |= mask2;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr + step * 0) |= mask1; *(index_ptr + step * 0 + 1) |= mask2;
            *(index_ptr + step * 1) |= mask1; *(index_ptr + step * 1 + 1) |= mask2;
            *(index_ptr + step * 2) |= mask1; *(index_ptr + step * 2 + 1) |= mask2;
            *(index_ptr + step * 3) |= mask1; *(index_ptr + step * 3 + 1) |= mask2;
            *(index_ptr + step * 4) |= mask1; *(index_ptr + step * 4 + 1) |= mask2;
            *(index_ptr + step * 5) |= mask1; *(index_ptr + step * 5 + 1) |= mask2;
            *(index_ptr + step * 6) |= mask1; *(index_ptr + step * 6 + 1) |= mask2;
            *(index_ptr + step * 7) |= mask1; *(index_ptr + step * 7 + 1) |= mask2;
        }
    #endif
    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
        const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
        const counter_t apply_count = min((counter_t)2, safe_diff(range_stop_index, base_index) + 1);
        *index_ptr |= mask1;
        if (apply_count > 1) *(index_ptr + 1) |= mask2;
    }
    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index2%s finished applying masks\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index3_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index3%s apply 3 %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2];
    register const counter_t step_max = step * unrolls;
    register const counter_t step_2 = step * 2;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 2)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr)            |= mask1; *(index_ptr + 1)            |= mask2; *(index_ptr + 2)            |= mask3;
            *(index_ptr + step)     |= mask1; *(index_ptr + step + 1)     |= mask2; *(index_ptr + step + 2)     |= mask3;
            *(index_ptr + step_2)   |= mask1; *(index_ptr + step_2 + 1)   |= mask2; *(index_ptr + step_2 + 2)   |= mask3;
            *(index_ptr + step * 3) |= mask1; *(index_ptr + step * 3 + 1) |= mask2; *(index_ptr + step * 3 + 2) |= mask3;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
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
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index3%s finished applying masks\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index4_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index4%s apply 4 %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2], mask4 = masks[3];
    register const counter_t step_max = step * unrolls;
    register const counter_t step_2 = step * 2;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 3)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr)            |= mask1; *(index_ptr + 1)            |= mask2; *(index_ptr + 2)            |= mask3; *(index_ptr + 3)            |= mask4;
            *(index_ptr + step)     |= mask1; *(index_ptr + step + 1)     |= mask2; *(index_ptr + step + 2)     |= mask3; *(index_ptr + step + 3)     |= mask4;
            *(index_ptr + step_2)   |= mask1; *(index_ptr + step_2 + 1)   |= mask2; *(index_ptr + step_2 + 2)   |= mask3; *(index_ptr + step_2 + 3)   |= mask4;
            *(index_ptr + step * 3) |= mask1; *(index_ptr + step * 3 + 1) |= mask2; *(index_ptr + step * 3 + 2) |= mask3; *(index_ptr + step * 3 + 3) |= mask4;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
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
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index4%s finished applying masks\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index5_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index5%s apply 5 %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2], mask4 = masks[3], mask5 = masks[4];
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 4)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr        )|=mask1; *(index_ptr        +1)|=mask2; *(index_ptr        +2)|=mask3; *(index_ptr        +3)|=mask4; *(index_ptr        +4)|=mask5;
            *(index_ptr+  step )|=mask1; *(index_ptr+  step +1)|=mask2; *(index_ptr+  step +2)|=mask3; *(index_ptr+  step +3)|=mask4; *(index_ptr+  step +4)|=mask5;
            *(index_ptr+step*2 )|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5;
            *(index_ptr+step*3 )|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr+step*0)|=mask1; *(index_ptr+step*0+1)|=mask2; *(index_ptr+step*0+2)|=mask3; *(index_ptr+step*0+3)|=mask4; *(index_ptr+step*0+4)|=mask5;
            *(index_ptr+step*1)|=mask1; *(index_ptr+step*1+1)|=mask2; *(index_ptr+step*1+2)|=mask3; *(index_ptr+step*1+3)|=mask4; *(index_ptr+step*1+4)|=mask5;
            *(index_ptr+step*2)|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5;
            *(index_ptr+step*3)|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5;
            *(index_ptr+step*4)|=mask1; *(index_ptr+step*4+1)|=mask2; *(index_ptr+step*4+2)|=mask3; *(index_ptr+step*4+3)|=mask4; *(index_ptr+step*4+4)|=mask5;
            *(index_ptr+step*5)|=mask1; *(index_ptr+step*5+1)|=mask2; *(index_ptr+step*5+2)|=mask3; *(index_ptr+step*5+3)|=mask4; *(index_ptr+step*5+4)|=mask5;
            *(index_ptr+step*6)|=mask1; *(index_ptr+step*6+1)|=mask2; *(index_ptr+step*6+2)|=mask3; *(index_ptr+step*6+3)|=mask4; *(index_ptr+step*6+4)|=mask5;
            *(index_ptr+step*7)|=mask1; *(index_ptr+step*7+1)|=mask2; *(index_ptr+step*7+2)|=mask3; *(index_ptr+step*7+3)|=mask4; *(index_ptr+step*7+4)|=mask5;
        }
    #endif
    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
        const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
        const counter_t apply_count = min((counter_t)5, safe_diff(range_stop_index, base_index) + 1);
        *index_ptr |= mask1;
        if (apply_count > 1) *(index_ptr + 1) |= mask2;
        if (apply_count > 2) *(index_ptr + 2) |= mask3;
        if (apply_count > 3) *(index_ptr + 3) |= mask4;
        if (apply_count > 4) *(index_ptr + 4) |= mask5;
    }
    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index5%s finished applying masks\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index6_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index6%s apply 6 %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2], mask4 = masks[3], mask5 = masks[4], mask6 = masks[5];
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 5)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr        )|=mask1; *(index_ptr        +1)|=mask2; *(index_ptr        +2)|=mask3; *(index_ptr        +3)|=mask4; *(index_ptr        +4)|=mask5; *(index_ptr        +5)|=mask6;
            *(index_ptr+  step )|=mask1; *(index_ptr+  step +1)|=mask2; *(index_ptr+  step +2)|=mask3; *(index_ptr+  step +3)|=mask4; *(index_ptr+  step +4)|=mask5; *(index_ptr+  step +5)|=mask6;
            *(index_ptr+step*2 )|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5; *(index_ptr+step*2+5)|=mask6;
            *(index_ptr+step*3 )|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5; *(index_ptr+step*3+5)|=mask6;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr+step*0)|=mask1; *(index_ptr+step*0+1)|=mask2; *(index_ptr+step*0+2)|=mask3; *(index_ptr+step*0+3)|=mask4; *(index_ptr+step*0+4)|=mask5; *(index_ptr+step*0+5)|=mask6;
            *(index_ptr+step*1)|=mask1; *(index_ptr+step*1+1)|=mask2; *(index_ptr+step*1+2)|=mask3; *(index_ptr+step*1+3)|=mask4; *(index_ptr+step*1+4)|=mask5; *(index_ptr+step*1+5)|=mask6;
            *(index_ptr+step*2)|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5; *(index_ptr+step*2+5)|=mask6;
            *(index_ptr+step*3)|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5; *(index_ptr+step*3+5)|=mask6;
            *(index_ptr+step*4)|=mask1; *(index_ptr+step*4+1)|=mask2; *(index_ptr+step*4+2)|=mask3; *(index_ptr+step*4+3)|=mask4; *(index_ptr+step*4+4)|=mask5; *(index_ptr+step*4+5)|=mask6;
            *(index_ptr+step*5)|=mask1; *(index_ptr+step*5+1)|=mask2; *(index_ptr+step*5+2)|=mask3; *(index_ptr+step*5+3)|=mask4; *(index_ptr+step*5+4)|=mask5; *(index_ptr+step*5+5)|=mask6;
            *(index_ptr+step*6)|=mask1; *(index_ptr+step*6+1)|=mask2; *(index_ptr+step*6+2)|=mask3; *(index_ptr+step*6+3)|=mask4; *(index_ptr+step*6+4)|=mask5; *(index_ptr+step*6+5)|=mask6;
            *(index_ptr+step*7)|=mask1; *(index_ptr+step*7+1)|=mask2; *(index_ptr+step*7+2)|=mask3; *(index_ptr+step*7+3)|=mask4; *(index_ptr+step*7+4)|=mask5; *(index_ptr+step*7+5)|=mask6;
        }
    #endif
    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
        const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
        const counter_t apply_count = min((counter_t)6, safe_diff(range_stop_index, base_index) + 1);
        *index_ptr |= mask1;
        if (apply_count > 1) *(index_ptr + 1) |= mask2;
        if (apply_count > 2) *(index_ptr + 2) |= mask3;
        if (apply_count > 3) *(index_ptr + 3) |= mask4;
        if (apply_count > 4) *(index_ptr + 4) |= mask5;
        if (apply_count > 5) *(index_ptr + 5) |= mask6;
    }
    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index6%s finished applying masks\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index7_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index7%s apply 7 %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2], mask4 = masks[3], mask5 = masks[4], mask6 = masks[5], mask7 = masks[6];
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 6)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr        )|=mask1; *(index_ptr        +1)|=mask2; *(index_ptr        +2)|=mask3; *(index_ptr        +3)|=mask4; *(index_ptr        +4)|=mask5; *(index_ptr        +5)|=mask6; *(index_ptr        +6)|=mask7;
            *(index_ptr+  step )|=mask1; *(index_ptr+  step +1)|=mask2; *(index_ptr+  step +2)|=mask3; *(index_ptr+  step +3)|=mask4; *(index_ptr+  step +4)|=mask5; *(index_ptr+  step +5)|=mask6; *(index_ptr+  step +6)|=mask7;
            *(index_ptr+step*2 )|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5; *(index_ptr+step*2+5)|=mask6; *(index_ptr+step*2+6)|=mask7;
            *(index_ptr+step*3 )|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5; *(index_ptr+step*3+5)|=mask6; *(index_ptr+step*3+6)|=mask7;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr+step*0)|=mask1; *(index_ptr+step*0+1)|=mask2; *(index_ptr+step*0+2)|=mask3; *(index_ptr+step*0+3)|=mask4; *(index_ptr+step*0+4)|=mask5; *(index_ptr+step*0+5)|=mask6; *(index_ptr+step*0+6)|=mask7;
            *(index_ptr+step*1)|=mask1; *(index_ptr+step*1+1)|=mask2; *(index_ptr+step*1+2)|=mask3; *(index_ptr+step*1+3)|=mask4; *(index_ptr+step*1+4)|=mask5; *(index_ptr+step*1+5)|=mask6; *(index_ptr+step*1+6)|=mask7;
            *(index_ptr+step*2)|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5; *(index_ptr+step*2+5)|=mask6; *(index_ptr+step*2+6)|=mask7;
            *(index_ptr+step*3)|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5; *(index_ptr+step*3+5)|=mask6; *(index_ptr+step*3+6)|=mask7;
            *(index_ptr+step*4)|=mask1; *(index_ptr+step*4+1)|=mask2; *(index_ptr+step*4+2)|=mask3; *(index_ptr+step*4+3)|=mask4; *(index_ptr+step*4+4)|=mask5; *(index_ptr+step*4+5)|=mask6; *(index_ptr+step*4+6)|=mask7;
            *(index_ptr+step*5)|=mask1; *(index_ptr+step*5+1)|=mask2; *(index_ptr+step*5+2)|=mask3; *(index_ptr+step*5+3)|=mask4; *(index_ptr+step*5+4)|=mask5; *(index_ptr+step*5+5)|=mask6; *(index_ptr+step*5+6)|=mask7;
            *(index_ptr+step*6)|=mask1; *(index_ptr+step*6+1)|=mask2; *(index_ptr+step*6+2)|=mask3; *(index_ptr+step*6+3)|=mask4; *(index_ptr+step*6+4)|=mask5; *(index_ptr+step*6+5)|=mask6; *(index_ptr+step*6+6)|=mask7;
            *(index_ptr+step*7)|=mask1; *(index_ptr+step*7+1)|=mask2; *(index_ptr+step*7+2)|=mask3; *(index_ptr+step*7+3)|=mask4; *(index_ptr+step*7+4)|=mask5; *(index_ptr+step*7+5)|=mask6; *(index_ptr+step*7+6)|=mask7;
        }
    #endif
    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
        const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
        const counter_t apply_count = min((counter_t)7, safe_diff(range_stop_index, base_index) + 1);
        *index_ptr |= mask1;
        if (apply_count > 1) *(index_ptr + 1) |= mask2;
        if (apply_count > 2) *(index_ptr + 2) |= mask3;
        if (apply_count > 3) *(index_ptr + 3) |= mask4;
        if (apply_count > 4) *(index_ptr + 4) |= mask5;
        if (apply_count > 5) *(index_ptr + 5) |= mask6;
        if (apply_count > 6) *(index_ptr + 6) |= mask7;
    }
    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index7%s finished applying masks\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index8_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index8%s apply 8 %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);
    register const bitbucket_t mask1 = masks[0], mask2 = masks[1], mask3 = masks[2], mask4 = masks[3], mask5 = masks[4], mask6 = masks[5], mask7 = masks[6], mask8 = masks[7];
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step_max + 7)], sizeof(bitbucket_t));
    #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr        )|=mask1; *(index_ptr        +1)|=mask2; *(index_ptr        +2)|=mask3; *(index_ptr        +3)|=mask4; *(index_ptr        +4)|=mask5; *(index_ptr        +5)|=mask6; *(index_ptr        +6)|=mask7; *(index_ptr        +7)|=mask8;
            *(index_ptr+  step )|=mask1; *(index_ptr+  step +1)|=mask2; *(index_ptr+  step +2)|=mask3; *(index_ptr+  step +3)|=mask4; *(index_ptr+  step +4)|=mask5; *(index_ptr+  step +5)|=mask6; *(index_ptr+  step +6)|=mask7; *(index_ptr+  step +7)|=mask8;
            *(index_ptr+step*2 )|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5; *(index_ptr+step*2+5)|=mask6; *(index_ptr+step*2+6)|=mask7; *(index_ptr+step*2+7)|=mask8;
            *(index_ptr+step*3 )|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5; *(index_ptr+step*3+5)|=mask6; *(index_ptr+step*3+6)|=mask7; *(index_ptr+step*3+7)|=mask8;
        }
    #endif
    #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *(index_ptr+step*0)|=mask1; *(index_ptr+step*0+1)|=mask2; *(index_ptr+step*0+2)|=mask3; *(index_ptr+step*0+3)|=mask4; *(index_ptr+step*0+4)|=mask5; *(index_ptr+step*0+5)|=mask6; *(index_ptr+step*0+6)|=mask7; *(index_ptr+step*0+7)|=mask8;
            *(index_ptr+step*1)|=mask1; *(index_ptr+step*1+1)|=mask2; *(index_ptr+step*1+2)|=mask3; *(index_ptr+step*1+3)|=mask4; *(index_ptr+step*1+4)|=mask5; *(index_ptr+step*1+5)|=mask6; *(index_ptr+step*1+6)|=mask7; *(index_ptr+step*1+7)|=mask8;
            *(index_ptr+step*2)|=mask1; *(index_ptr+step*2+1)|=mask2; *(index_ptr+step*2+2)|=mask3; *(index_ptr+step*2+3)|=mask4; *(index_ptr+step*2+4)|=mask5; *(index_ptr+step*2+5)|=mask6; *(index_ptr+step*2+6)|=mask7; *(index_ptr+step*2+7)|=mask8;
            *(index_ptr+step*3)|=mask1; *(index_ptr+step*3+1)|=mask2; *(index_ptr+step*3+2)|=mask3; *(index_ptr+step*3+3)|=mask4; *(index_ptr+step*3+4)|=mask5; *(index_ptr+step*3+5)|=mask6; *(index_ptr+step*3+6)|=mask7; *(index_ptr+step*3+7)|=mask8;
            *(index_ptr+step*4)|=mask1; *(index_ptr+step*4+1)|=mask2; *(index_ptr+step*4+2)|=mask3; *(index_ptr+step*4+3)|=mask4; *(index_ptr+step*4+4)|=mask5; *(index_ptr+step*4+5)|=mask6; *(index_ptr+step*4+6)|=mask7; *(index_ptr+step*4+7)|=mask8;
            *(index_ptr+step*5)|=mask1; *(index_ptr+step*5+1)|=mask2; *(index_ptr+step*5+2)|=mask3; *(index_ptr+step*5+3)|=mask4; *(index_ptr+step*5+4)|=mask5; *(index_ptr+step*5+5)|=mask6; *(index_ptr+step*5+6)|=mask7; *(index_ptr+step*5+7)|=mask8;
            *(index_ptr+step*6)|=mask1; *(index_ptr+step*6+1)|=mask2; *(index_ptr+step*6+2)|=mask3; *(index_ptr+step*6+3)|=mask4; *(index_ptr+step*6+4)|=mask5; *(index_ptr+step*6+5)|=mask6; *(index_ptr+step*6+6)|=mask7; *(index_ptr+step*6+7)|=mask8;
            *(index_ptr+step*7)|=mask1; *(index_ptr+step*7+1)|=mask2; *(index_ptr+step*7+2)|=mask3; *(index_ptr+step*7+3)|=mask4; *(index_ptr+step*7+4)|=mask5; *(index_ptr+step*7+5)|=mask6; *(index_ptr+step*7+6)|=mask7; *(index_ptr+step*7+7)|=mask8;
        }
    #endif
    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
        const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
        const counter_t apply_count = min((counter_t)8, safe_diff(range_stop_index, base_index) + 1);
        *index_ptr |= mask1;
        if (apply_count > 1) *(index_ptr + 1) |= mask2;
        if (apply_count > 2) *(index_ptr + 2) |= mask3;
        if (apply_count > 3) *(index_ptr + 3) |= mask4;
        if (apply_count > 4) *(index_ptr + 4) |= mask5;
        if (apply_count > 5) *(index_ptr + 5) |= mask6;
        if (apply_count > 6) *(index_ptr + 6) |= mask7;
        if (apply_count > 7) *(index_ptr + 7) |= mask8;
    }
    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif
    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index8%s finished applying masks\n", STR(suffix));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(applyMask_index_mmask,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, const counter_t step, const bitbucket_t* restrict masks, const counter_t mask_count)
{
    logStart8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s apply %ju %s (%ju bit) masks with step %ju in bitrange (%ju - %ju)", STR(suffix), (uintmax_t)mask_count, STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index + 1) * bitcount_type(bitbucket_t) - 1);

    if unlikely(mask_count <= 0) {
        logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s skipped: no masks\n", STR(suffix));
        return;
    }

    if (mask_count == 1) { function(applyMask_index1_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }
    if (mask_count == 2) { function(applyMask_index2_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }
    if (mask_count == 3) { function(applyMask_index3_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }
    if (mask_count == 4) { function(applyMask_index4_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }
    if (mask_count == 5) { function(applyMask_index5_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }
    if (mask_count == 6) { function(applyMask_index6_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }
    if (mask_count == 7) { function(applyMask_index7_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }
    if (mask_count == 8) { function(applyMask_index8_mmask,suffix)(bitstorage, range_start_index, range_stop_index, step, masks); return; }

    // Generic fallback for mask_count > 8: split into bounds-free main loop and bounded tail
    {
        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
        register bitbucket_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_start_index], sizeof(bitbucket_t));
        register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index], sizeof(bitbucket_t));
        register const bitbucket_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index, step + mask_count - 1)], sizeof(bitbucket_t));

        LOOP_IVDEP
        LOOP_UNROLL_8
        for (; likely(index_ptr < fast_loop_ptr); index_ptr += step) {
            LOOP_IVDEP
            for (counter_t k = 0; k < mask_count; k++) {
                index_ptr[k] |= masks[k];
            }
        }
        for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) {
            const counter_t base_index = (counter_t)(index_ptr - bitstorage_sized);
            const counter_t apply_count = min(mask_count, safe_diff(range_stop_index, base_index) + 1);
            for (counter_t k = 0; k < apply_count; k++) {
                index_ptr[k] |= masks[k];
            }
        }
    }

    #ifdef COMPILE_TRACE
    log_mask(8, bitstorage, timer_function_names[time_applyMask_mmask], (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
             (const void* const[]){masks}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif

    logStop8(bitstorage, time_applyMask_mmask, "ApplyMaskMmask_index%s finished applying masks\n", STR(suffix));
}

#endif
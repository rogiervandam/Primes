#ifndef APPLYMASK_GUARD
    #define APPLYMASK_GUARD

    #include <stdio.h>
    #include "../trace/sieve_trace.h"

    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_applyMask.h"
    #include "../generic/variants/generate.h"

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

// This applyMask variant takes range_start_index and range_stop_index as the word/vector index
static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(applyMask_index,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, counter_t step, const bitbucket_t mask) 
{
    logStart8(bitstorage, time_applyMask, "ApplyMask_index%s apply %s (%ju bit) mask with step %ju on index %ju-%ju that covers bitrange (%ju - %ju)", 
        STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t),(uintmax_t)step, 
        (uintmax_t)range_start_index, (uintmax_t)range_stop_index,  (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index+1) * bitcount_type(bitbucket_t)-1);
  
    register const counter_t step_max                         = step * unrolls;
    register       bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register       bitbucket_t* restrict index_ptr            = __builtin_assume_aligned(&bitstorage_sized[range_start_index],sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_index_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_index ],sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr        = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index,step_max)],sizeof(bitbucket_t));
 
    #if defined(__GNUC__) && !defined(__clang__) // optimized for GCC

        #if unrolls == 16
        LOOP_IVDEP
        LOOP_UNROLL_32
        for(;(index_ptr < fast_loop_ptr); ) {
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
        }
        #endif

        #if unrolls == 8
        LOOP_IVDEP
        LOOP_UNROLL_32
        for(;(index_ptr < fast_loop_ptr); ) {
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
        }
        #endif

        #if unrolls == 4
        LOOP_IVDEP
        LOOP_UNROLL_32
        for(;(index_ptr < fast_loop_ptr); ) {
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
        }
        #endif

    #elif defined(__clang__) // optimized for clang

        #if unrolls == 8
            LOOP_IVDEP
            LOOP_UNROLL_32
            for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
                *(index_ptr + step * 0) |= mask;
                *(index_ptr + step * 1) |= mask;
                *(index_ptr + step * 2) |= mask;
                *(index_ptr + step * 3) |= mask;
                *(index_ptr + step * 4) |= mask;
                *(index_ptr + step * 5) |= mask;
                *(index_ptr + step * 6) |= mask;
                *(index_ptr + step * 7) |= mask;
            }
        #endif

        #if unrolls == 4
            LOOP_IVDEP
            LOOP_UNROLL_32
            for (; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
                *(index_ptr)            |= mask;
                *(index_ptr + step)     |= mask;
                *(index_ptr + step * 2) |= mask;
                *(index_ptr + step * 3) |= mask;
            }
        #endif

    #endif // end of clang section

    for (; index_ptr <= range_stop_index_ptr; index_ptr += step) { 
        *index_ptr |= mask; 
    }

    #ifdef COMPILE_TRACE
    logMask9(bitstorage, time_applyMask, (uint64_t)bitcount_type(bitbucket_t), range_start_index, range_stop_index, step,
            (const void* const[]){&mask}, 1, sizeof(variant_base_type_t), BITBUCKET_ELEMENTS, (uint32_t)bitcount_type(variant_base_type_t));
    #endif

    logStop8(bitstorage, time_applyMask, "ApplyMask_index%s finished applying %s mask\n", STR(suffix), STR(variant_suffix));
}

#endif

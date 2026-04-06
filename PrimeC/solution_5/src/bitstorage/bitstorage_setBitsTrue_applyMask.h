#include "../generic/setsuffix.h"

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(applyMask,suffix)(void* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitbucket_t mask, const counter_t index_vector) 
{
    startAnalysis8(time_applyMask, "\nApplying %s mask with step %ju in range until %ju", STR(bitbucket_t), (uintmax_t)step, (uintmax_t)range_stop);

    register const counter_t step_max                   = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr            = __builtin_assume_aligned(&bitstorage_sized[index_vector],sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr  = __builtin_assume_aligned(&bitstorage_sized[safe_diff(index_type(range_stop, bitbucket_t),step_max)],sizeof(bitbucket_t));

    #if defined(__GNUC__) && !defined(__clang__) // optimized for GCC
        for(;likely(index_ptr < fast_loop_ptr);) {
            for(int i = unrolls; i--;) {
                *index_ptr |= mask;  index_ptr += step;
            }
        }
    #else // optimized for clang
        for(const counter_t step_2 = step * 2, step_3 = step_2 + step; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            // __builtin_prefetch(index_ptr + step * 4, 1, 3); // Prefetch for write, moderate locality
            *index_ptr            |= mask; 
            *(index_ptr + step  ) |= mask; 
            *(index_ptr + step_2) |= mask; 
            *(index_ptr + step_3) |= mask;
            #if unrolls > 4
            *(index_ptr + step * 4) |= mask;
            *(index_ptr + step * 5) |= mask;
            *(index_ptr + step * 6) |= mask;
            *(index_ptr + step * 7) |= mask;
            #endif 
        }
    #endif
    
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[index_type(range_stop, bitbucket_t)],sizeof(bitbucket_t));
    
    for (counter_t i=(unrolls+1); i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only < unrolls iterations are left
        *index_ptr |= mask; 
    }

    endAnalysis8(time_applyMask);
}

// This applyMask variant takes range_start and range_stop as the word/vector index
static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(applyMask_index,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop, const bitbucket_t mask) 
{
    startAnalysis8(time_applyMask, "\nApplying %s mask with step %ju in range until %ju", STR(bitbucket_t), (uintmax_t)step, (uintmax_t)range_stop);
  
    register const counter_t step_max                   = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr            = __builtin_assume_aligned(&bitstorage_sized[range_start],sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop],sizeof(bitbucket_t));
    register counter_t i = safe_diff(range_stop, range_start) / step;

    #if defined(__GNUC__) && !defined(__clang__) // optimized for GCC
    register const bitbucket_t* restrict fast_loop_ptr  = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop,step_max)],sizeof(bitbucket_t));

    #if unrolls == 16
    #pragma GCC ivdep
    #pragma GCC unroll 32
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
    #pragma GCC ivdep
    #pragma GCC unroll 64
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
    #pragma GCC ivdep
    #pragma GCC unroll 64
    for(;(index_ptr < fast_loop_ptr); ) {
        *index_ptr |= mask; index_ptr += step;
        *index_ptr |= mask; index_ptr += step;
        *index_ptr |= mask; index_ptr += step;
        *index_ptr |= mask; index_ptr += step;
    }
    #endif

    #elif defined(__clang__) // optimized for clang

    #if unrolls >= 8
        for (;i>8; i-=8, index_ptr += step * 8) {
            index_ptr[step * 0] |= mask;
            index_ptr[step * 1] |= mask;
            index_ptr[step * 2] |= mask;
            index_ptr[step * 3] |= mask;
            index_ptr[step * 4] |= mask;
            index_ptr[step * 5] |= mask;
            index_ptr[step * 6] |= mask;
            index_ptr[step * 7] |= mask;
        }
    #elif unrolls >= 4
        for (;i>4; i-=4, index_ptr += step * 4) {
            index_ptr[step * 0] |= mask;
            index_ptr[step * 1] |= mask;
            index_ptr[step * 2] |= mask;
            index_ptr[step * 3] |= mask;
        }
    #endif

    #endif

    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only < unrolls iterations are left
        *index_ptr |= mask; 
    }
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(applyMask_new,suffix)(void* restrict bitstorage, const counter_t index, const counter_t step, const counter_t range_stop, const bitbucket_t mask) 
{
    return function(applyMask_index,suffix)(bitstorage, index_type(index, bitbucket_t), step, index_type(range_stop, bitbucket_t), mask);
}

#include "../generic/cleansuffix.h"

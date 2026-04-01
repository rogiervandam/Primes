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

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(applyMask_new,suffix)(void* restrict bitstorage, const counter_t index, const counter_t step, const counter_t range_stop, const bitbucket_t mask) 
{
    startAnalysis8(time_applyMask, "\nApplying %s mask with step %ju in range until %ju", STR(bitbucket_t), (uintmax_t)step, (uintmax_t)range_stop);
  
    register const counter_t step_max                   = step * unrolls;
    register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register bitbucket_t* restrict index_ptr            = __builtin_assume_aligned(&bitstorage_sized[index_type(index, bitbucket_t)],sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[index_type(range_stop, bitbucket_t)],sizeof(bitbucket_t));
    register counter_t i = safe_diff(range_stop, index) / (step * bitcount_type(bitbucket_t));

    #if defined(__GNUC__) && !defined(__clang__) // optimized for GCC
    register const bitbucket_t* restrict fast_loop_ptr  = __builtin_assume_aligned(&bitstorage_sized[safe_diff(index_type(range_stop, bitbucket_t),step_max)],sizeof(bitbucket_t));

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

    // for(counter_t j=unrolls; j>=4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
    //     for(;i>j;i-=j) {
    //         for(counter_t k=0; k<j>; k++) {
    //             *index_ptr |= mask; index_ptr += step;
    //         }
    //     }
    // }

    // #pragma GCC ivdep
    // #pragma GCC unroll 4
    // for(int j=unrolls; j>=4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
    //     for(;i>j; i-=j, index_ptr += step * j) {
    //         for(int k = 0; k < j; ++k ) {
    //             index_ptr[k * step] |= mask;
    //         }
    //     }
    // }

    // clang
    // for(counter_t j=8; j>2; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
    //     for(;i>j;i-=j,index_ptr += step * j) {
    //         for(counter_t k=0; k<j; k++) {
    //             *(index_ptr + k * step) |= mask;
    //         }
    //     }
    // }

    // clang
    // const counter_t j = 8;
    // for(;likely(index_ptr < fast_loop_ptr);index_ptr += step * j) {
    //     for(counter_t k=0; k<j; k++) {
    //         *(index_ptr + k * step) |= mask;
    //     }
    // }

    // for(;likely(index_ptr < fast_loop_ptr);index_ptr += step * 8) {
    //     #pragma unroll 8
    //     for(int k = 0; k < 8; ++k ) {
    //         index_ptr[k * step] |= mask;
    //         // *(index_prt_base + k * step) |= mask;
    //     }
    // }

    #elif defined(__clang__) // optimized for clang

    // #if unrolls >= 8
    // for(;i>8; i-=8, index_ptr += step * 8) {
    //     #pragma clang loop unroll(full)
    //     for(int k = 0; k < 8; ++k ) {
    //         index_ptr[step * k] |= mask;
    //     }
        
    // }
    // #endif

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

#include "../generic/cleansuffix.h"

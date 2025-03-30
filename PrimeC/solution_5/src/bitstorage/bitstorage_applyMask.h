#include "../generic/setsuffix.h"

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
NAME(applyMask,suffix)(void* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitbucket_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying " ##bitbucket_t " mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask);

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t range_stop_vector = index_type(range_stop, bitbucket_t);
   
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict index_ptr            =  __builtin_assume_aligned(&bitstorage_sized[index_vector],sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_vector,step_max)],sizeof(bitbucket_t));

    #if defined(__GNUC__) && !defined(__clang__)// optimized for GCC
        #if unrolls == 4
            #pragma GCC ivdep
            #pragma GCC unroll 4
            for(;likely(index_ptr < fast_loop_ptr);) {
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
            }
        #elif unrolls == 8
            #pragma GCC ivdep
            #pragma GCC unroll 8
            for(;likely(index_ptr < fast_loop_ptr);) {
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
                *index_ptr |= mask;  index_ptr += step;
            }
        #endif
    #else // optimized for clang
        for(const counter_t step_2 = step * 2, step_3 = step_2 + step; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
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
    
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_vector],sizeof(bitbucket_t));
    
    for (counter_t i=(unrolls+1); i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes)))
NAME(applyMask_pair,suffix)(void* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitbucket_t mask1, const bitbucket_t mask2, counter_t index_vector) 
{
    verbose8( printf("Applying " ##bitbucket_t " mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t range_stop_vector                   = index_type(range_stop, bitbucket_t);

    register const counter_t step_max                   = step * unrolls;
    register bitbucket_t* restrict index_ptr            =  __builtin_assume_aligned(&bitstorage_sized[index_vector],sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_vector,step_max)],sizeof(bitbucket_t));

    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    
    #if unrolls == 4
        #pragma GCC ivdep
        #pragma GCC unroll 4
        for(;likely(index_ptr < fast_loop_ptr);) {
            *index_ptr                |= mask1; 
            *(index_ptr + 1         ) |= mask2; 
            *(index_ptr + step      ) |= mask1; 
            *(index_ptr + step + 1  ) |= mask2; 
            *(index_ptr + step_2)     |= mask1; 
            *(index_ptr + step_2 + 1) |= mask2; 
            *(index_ptr + step_3)     |= mask1; 
            *(index_ptr + step_3 + 1) |= mask2; 
            index_ptr += step_max;
        }
    #elif unrolls == 8
        #pragma GCC ivdep
        #pragma GCC unroll 8
        while likely(index_ptr < fast_loop_ptr) {
            *index_ptr                  |= mask1;
            *(index_ptr + 1           ) |= mask2;  
            *(index_ptr + step        ) |= mask1; 
            *(index_ptr + step + 1    ) |= mask2;  
            *(index_ptr + step_2      ) |= mask1; 
            *(index_ptr + step_2 + 1  ) |= mask2;  
            *(index_ptr + step_3      ) |= mask1; 
            *(index_ptr + step_3 + 1  ) |= mask2;  
            *(index_ptr + step * 4    ) |= mask1;
            *(index_ptr + step * 4 + 1) |= mask2;
            *(index_ptr + step * 5    ) |= mask1;
            *(index_ptr + step * 5 + 1) |= mask2;
            *(index_ptr + step * 6    ) |= mask1;
            *(index_ptr + step * 6 + 1) |= mask2;
            *(index_ptr + step * 7    ) |= mask1;
            *(index_ptr + step * 7 + 1) |= mask2;
            index_ptr += step_max;
        }
    #endif 
    
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_vector],sizeof(bitbucket_t));
    
    for (counter_t i=(unrolls+1); i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr     |= mask1; 
        *(index_ptr+1) |= mask2; 
    }
    
    if (index_ptr == range_stop_ptr) {
        *index_ptr     |= mask1; 
    }
    timer_laptime(time_applyMask); verbose8( printf("\n"); )
}

#include "../generic/cleansuffix.h"

#undef subfunction
#define subfunction _rotate_pairv3
#include "../generic/setsuffix.h"

static inline void __attribute__((always_inline)) NAME(applyMask,suffix)(void* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitbucket_t mask1, const bitbucket_t mask2, counter_t index_vector) 
{
    verbose8( printf("Applying " ##bitbucket_t " mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    register bitbucket_t* restrict bitstorage_sized = (bitbucket_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t range_stop_vector = index_type(range_stop, bitbucket_t);

    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict index_ptr            =  __builtin_assume_aligned(&bitstorage_sized[index_vector],sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_vector,step_max)],sizeof(bitbucket_t));

    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    
    #pragma GCC ivdep
    while likely(index_ptr < fast_loop_ptr) {
        *index_ptr                |= mask1;
        *(index_ptr + 1         ) |= mask2;  
        *(index_ptr + step      ) |= mask1; 
        *(index_ptr + step + 1  ) |= mask2;  
        *(index_ptr + step_2)     |= mask1; 
        *(index_ptr + step_2 + 1) |= mask2;  
        *(index_ptr + step_3)     |= mask1; 
        *(index_ptr + step_3 + 1) |= mask2;  
        #if unrolls <= 4
        index_ptr += step_max;
        #else
        *(index_ptr + step * 4    ) |= mask1;
        *(index_ptr + step * 4 + 1) |= mask2;
        *(index_ptr + step * 5    ) |= mask1;
        *(index_ptr + step * 5 + 1) |= mask2;
        *(index_ptr + step * 6    ) |= mask1;
        *(index_ptr + step * 6 + 1) |= mask2;
        *(index_ptr + step * 7    ) |= mask1;
        *(index_ptr + step * 7 + 1) |= mask2;
        index_ptr += step_max;
        #endif 
    }
    
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_sized[range_stop_vector],sizeof(bitbucket_t));
    
    for (counter_t i=(unrolls+1); i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr     |= mask1; 
        *(index_ptr+1) |= mask2; 
    }
    
    if (index_ptr == range_stop_ptr) {
        *index_ptr     |= mask1; 
    }
    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) NAME(create_mask_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // verbose7(  { const counter_t range_stop_unique = min(range_start + step * bitcount_type(bitbucket_t), range_stop);
    //     printf("\n..Setting bits step %3ju using create_mask_vector_smallstep in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps starting at %ju)", 
    //     (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bitcount_type(bitbucket_t)*step)), (uintmax_t)range_stop_unique ); })
    timer_lapstart(time_create_mask_vector_smallstep);

    register bitbucket_t* restrict bitstorage_vector = (bitbucket_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    __builtin_prefetch(&bitstorage_vector[index_type(range_start, bitbucket_t)], 1, 3); // prefetch the memory that will be written soon while creating mask

    // build the pattern, pattern_size en pattern_wordshift efficiently
    register const bitshift_t step_shift = bitindex_calc_type(step, variant_base_type_t); // to enable the compiler to optimize the shift
    register bitshift_t pattern_size = step_shift;
    register variant_base_type_t pattern = (variant_base_type_t) 1U;
    while (pattern_size <= bitcount_type(variant_base_type_t)) { pattern |= markmask_type(pattern_size, variant_base_type_t); pattern_size += step_shift; }
    const bitshift_t pattern_wordshift = pattern_size - bitcount_type(variant_base_type_t);

    register const variant_base_type_t pattern_vectorshift = (variant_base_type_t) (((pattern_size - bitcount_type(variant_base_type_t)) * (bitshift_t)BITBUCKET_ELEMENTS) % step_shift) & mask_type(variant_base_type_t);
    register bitbucket_t pattern_vectorshift_vector = BITBUCKET_BASE(pattern_vectorshift);
    register bitbucket_t step_shift_vector = BITBUCKET_BASE(step_shift);

    const bitshift_t shift = bitindex_calc_type(range_start, variant_base_type_t); 
    bitbucket_t mask_vector = BITBUCKET_BASE(pattern) << (BITBUCKET_BASE(shift) + (BITBUCKET_BASE(pattern_wordshift) * BITBUCKET_BYTEINDEX)) % BITBUCKET_BASE(step);

    // precaulcate the unique range_stop
    const counter_t range_stop_unique_vector = min(range_start + step * bitcount_type(bitbucket_t), range_stop);
    register const counter_t vector_max = index_type(range_stop_unique_vector, bitbucket_t);
    
    counter_t current_vector = index_type(range_start, bitbucket_t);

    // Apply this vectormask standalone until we align on the cache line
    for (;current_vector&1; current_vector++) {
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
        mask_vector = (mask_vector << pattern_vectorshift_vector) | (mask_vector >> (step_shift_vector - pattern_vectorshift_vector)); 
    }

    // Process vectormasks in pairs from the cacheline
    for (; current_vector < vector_max; current_vector += 2) {
        bitbucket_t mask_vector2 = (mask_vector << pattern_vectorshift_vector) | (mask_vector >> (step_shift_vector - pattern_vectorshift_vector)); 
        NAME(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector, mask_vector2, current_vector);
        mask_vector = (mask_vector2 << pattern_vectorshift_vector) | (mask_vector2 >> (step_shift_vector - pattern_vectorshift_vector)); 
    }

    // Process the last vectormask if needed
    NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);

    timer_laptime(time_create_mask_vector_smallstep); 
}

static inline void __attribute__((always_inline)) NAME(setBitsTrue_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using smallstep%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_wordstep);

    const counter_t range_start_nexttvector = vectorstart_type(range_start, bitbucket_t) + bitcount_type(bitbucket_t); // find next vector
    if (range_start_nexttvector + 4 * bitcount_type(bitbucket_t) > range_stop) {
        setBitsTrue_range(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
        return;
    }

    const counter_t range_start_new = setBitsTrue_range_return(bitstorage, range_start, step, range_start_nexttvector);
    NAME(create_mask_smallstep,suffix)(bitstorage, range_start_new, step, range_stop);

    timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
}

#include "../generic/cleansuffix.h"

#define subfunction _rotate
#include "../generic/setsuffix.h"


#undef  BITBUCKET_ELEMENTS
#define BITBUCKET_ELEMENTS variant_elements

#if BITBUCKET_ELEMENTS == 16
  #define BITBUCKET_BASE(pattern)      ((bitbucket_t){ pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern })
  #define BITBUCKET_BYTEINDEX          ((bitbucket_t){ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 })
#elif BITBUCKET_ELEMENTS == 8
  #define BITBUCKET_BASE(pattern)      ((bitbucket_t){ pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern })
  #define BITBUCKET_BYTEINDEX          ((bitbucket_t){ 0, 1, 2, 3, 4, 5, 6, 7 })
#elif BITBUCKET_ELEMENTS == 4
  #define BITBUCKET_BASE(pattern)      ((bitbucket_t){ pattern, pattern, pattern, pattern })
  #define BITBUCKET_BYTEINDEX          ((bitbucket_t){ 0, 1, 2, 3 })
#elif BITBUCKET_ELEMENTS == 2
  #define BITBUCKET_BASE(pattern)      ((bitbucket_t){ pattern, pattern })
  #define BITBUCKET_BYTEINDEX          ((bitbucket_t){ 0, 1})
#else
    //error
    #endif


// setBitsTrue_smallstep_vector_rotate_shorter
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
    register const counter_t vector_max = index_type(range_stop, bitbucket_t);
    for (counter_t current_vector = index_type(range_start, bitbucket_t); current_vector < vector_max; current_vector++) {
        bitstorage_vector[current_vector] = mask_vector;
        mask_vector = (mask_vector << pattern_vectorshift_vector) | (mask_vector >> (step_shift_vector - pattern_vectorshift_vector)); 
    }
    timer_laptime(time_create_mask_vector_smallstep); 
}

static inline void __attribute__((always_inline)) NAME(setBitsTrue_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_word in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_wordstep);

    const counter_t range_start_nexttvector = vectorstart_type(range_start, bitbucket_t) + bitcount_type(bitbucket_t); // find next vector
    const counter_t range_start_new = setBitsTrue_range(bitstorage, range_start, step, range_start_nexttvector);
    if (range_start_new > range_stop) return;
    NAME(create_mask_smallstep,suffix)(bitstorage, range_start_new, step, range_stop);

    timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
}


#undef subfunction
#define subfunction _rotate_pair
#include "../generic/setsuffix.h"


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
        NAME(applyMask_pair,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, mask_vector2, current_vector);
        mask_vector = (mask_vector2 << pattern_vectorshift_vector) | (mask_vector2 >> (step_shift_vector - pattern_vectorshift_vector)); 
    }

    // Process the last vectormask if needed
    if (current_vector == vector_max) {
      NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
    }

    timer_laptime(time_create_mask_vector_smallstep); 
}


static inline void __attribute__((always_inline)) NAME(setBitsTrue_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_word in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_wordstep);

    const counter_t range_start_nexttvector = vectorstart_type(range_start, bitbucket_t) + bitcount_type(bitbucket_t); // find next vector
    if (range_start_nexttvector + 4 * bitcount_type(bitbucket_t) > range_stop) {
        setBitsTrue_range(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
        return;
    }

    const counter_t range_start_new = setBitsTrue_range(bitstorage, range_start, step, range_start_nexttvector);
    NAME(create_mask_smallstep,suffix)(bitstorage, range_start_new, step, range_stop);

    timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
}





#include "../generic/cleansuffix.h"
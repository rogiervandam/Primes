
#undef subfunction
#define subfunction _totalshift
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
    register variant_base_type_t pattern_size = step_shift;
    register variant_base_type_t pattern = (variant_base_type_t) 1U;
    while (pattern_size <= bitcount_type(variant_base_type_t)) { pattern |= markmask_type(pattern_size, variant_base_type_t); pattern_size += step_shift; }

    register const bitbucket_t shift_vector = BITBUCKET_BASE(bitindex_calc_type(range_start, variant_base_type_t)) + (BITBUCKET_BASE(pattern_size - bitcount_type(variant_base_type_t)) * BITBUCKET_BYTEINDEX);
    register const bitbucket_t step_vector = BITBUCKET_BASE(step);
    register const bitbucket_t mask_vector_base = BITBUCKET_BASE(pattern);
    register const bitbucket_t pattern_vectorshift_vector = BITBUCKET_BASE(((pattern_size - bitcount_type(variant_base_type_t)) * (bitshift_t)BITBUCKET_ELEMENTS) % step_shift);

    const counter_t range_stop_unique_vector = min(range_start + step * bitcount_type(bitbucket_t), range_stop);
    const counter_t range_startvector = index_type(range_start,bitbucket_t);
    const counter_t index_vector_max = index_type(range_stop_unique_vector, bitbucket_t) - range_startvector;

    // manual unrolling of the loop with each mask independent
    variant_base_type_t index_vector = 0U;
    for (; index_vector+4 < index_vector_max; index_vector+=4) {
        register const bitbucket_t mask_vector1 = mask_vector_base << ((shift_vector + ((variant_base_type_t)index_vector * pattern_vectorshift_vector) ) % step_vector);
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector1, range_startvector + index_vector);
        register const bitbucket_t mask_vector2 = mask_vector_base << ((shift_vector + ((variant_base_type_t)(index_vector+1) * pattern_vectorshift_vector) ) % step_vector);
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector2, range_startvector + index_vector+1);
        register const bitbucket_t mask_vector3 = mask_vector_base << ((shift_vector + ((variant_base_type_t)(index_vector+2) * pattern_vectorshift_vector) ) % step_vector);
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector3, range_startvector + index_vector+2);
        register const bitbucket_t mask_vector4 = mask_vector_base << ((shift_vector + ((variant_base_type_t)(index_vector+3) * pattern_vectorshift_vector) ) % step_vector);
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector4, range_startvector + index_vector+3);
    }

    for (; index_vector <= index_vector_max; index_vector++) {
        const bitbucket_t mask_vector = mask_vector_base << ((shift_vector + ((BITBUCKET_BASE(index_vector)) * pattern_vectorshift_vector) ) % step_vector);
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, range_startvector + index_vector);
    }

    timer_laptime(time_create_mask_vector_smallstep); 
}

static inline void __attribute__((always_inline)) NAME(setBitsTrue_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_word in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_wordstep);

    const counter_t range_start_nexttvector = vectorstart_type(range_start, bitbucket_t) + bitcount_type(bitbucket_t); // find next vector
    if (range_start_nexttvector + 8 * bitcount_type(bitbucket_t) > range_stop) {
        setBitsTrue_range(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
        return;
    }

    const counter_t range_start_new = setBitsTrue_range_return(bitstorage, range_start, step, range_start_nexttvector);
    NAME(create_mask_smallstep,suffix)(bitstorage, range_start_new, step, range_stop);

    timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
}

#include "../generic/cleansuffix.h"
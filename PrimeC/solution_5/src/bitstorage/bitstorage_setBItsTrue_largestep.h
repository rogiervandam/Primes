
#define subfunction _largestep
#include "../generic/setsuffix.h"

// Largestep (> WORD_SIZE and < VECTOR_SIZE) means the same vectormask can be reused
static inline void __attribute__((always_inline)) NAME(create_mask_vector,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // verbose6(  printf("\n..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_create_mask_vector_largestep);

    bitbucket_t* restrict bitstorage_vector = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t range_stop_unique_vector = range_start + step * bitcount_type(bitbucket_t) + bitcount_type(bitbucket_t);  // extra size TODO: is sometime needed when size < blocklimit
    counter_t current_vector = index_type(range_start, bitbucket_t);

    for (counter_t index = range_start; index <= range_stop_unique_vector; current_vector++) {
        const counter_t current_vector_start = vectorstart_type(index, bitbucket_t);
        bitbucket_t mask_vector = BITBUCKET_BASE((variant_base_type_t) 0U);
        for (counter_t i=0; i < BITBUCKET_ELEMENTS; i++) {
            if (vectorstart_type(index,variant_base_type_t) == (current_vector_start + (bitcount_type(variant_base_type_t)*i))) {
                mask_vector[i] = markmask_calc_type(index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
                index += step;
            }
        }
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
    }

    timer_laptime(time_create_mask_vector_largestep); 
}

// #undef unrolls
#undef subfunction
#define subfunction _vector
#include "../generic/setsuffix.h"

static inline void __attribute__((always_inline, nonnull)) 
NAME(setBitsTrue_largestep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

    // const counter_t range_start_nexttvector = vectorstart_type(range_start, bitbucket_t) + bitcount_type(bitbucket_t); // find next vector
    const counter_t range_start_nexttvector = vectorindex_next_type(range_start, bitbucket_t); // find next vector

    const counter_t range_start_new = setBitsTrue_range_return(bitstorage, range_start, step, range_start_nexttvector);
    if (range_start_new > range_stop) return;
    NAME(create_mask_vector_largestep,fullvariantsuffix)(bitstorage, range_start_new, step, range_stop);
    timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
}

#include "../generic/cleansuffix.h"



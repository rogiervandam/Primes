#ifdef variant
    #define bitbucket_t NAME(variant, _t)
    #define variantsuffix NAME(_,variant)
#else
    #define bitbucket_t uint64v4
#endif

#define subfunction _largestep
#include "../generic/setsuffix.h"

// Largestep (> WORD_SIZE and < VECTOR_SIZE) means the same vectormask can be reused
static inline void __attribute__((always_inline)) NAME(create_mask_vector,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    verbose6(  printf("\n..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_create_mask_vector_largestep);

    bitbucket_t* restrict bitstorage_vector = (bitbucket_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t range_stop_unique_vector = range_start + step * bitcount_type(bitbucket_t) + bitcount_type(bitbucket_t);  // extra size TODO: is sometime needed when size < blocklimit
    counter_t current_vector = index_type(range_start, bitbucket_t);

    for (counter_t index = range_start; index <= range_stop_unique_vector;) {
        const counter_t current_vector_start = vectorstart_type(index, bitbucket_t);
        bitbucket_t mask_vector; //
        for (counter_t i=0; i < bitcount_type(bitbucket_t)/bitcount_type(variant_base_type); i++) {
            if ((index & ~mask_type(variant_base_type)) == (current_vector_start + (bitcount_type(variant_base_type)*i))) {
                mask_vector[i] = markmask_type(index, variant_base_type); // TODO: this was sensitive to wordsize. vector_markmask(index) didnt work; markmask_calc(index) worked
                index += step;
            }
        }
        // applyMask_vector(bitstorage_vector, step, range_stop, mask_vector, current_vector);
        NAME(applyMask,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
        current_vector++;
    }
    // if (checkInvalid_range(bitstorage, range_start, step, range_stop)) {
    //    printf("not valid");
    //    exit(1);
    // }
    timer_laptime(time_create_mask_vector_largestep); 
}

// #undef unrolls
#undef subfunction
#define subfunction _vector
#include "../generic/setsuffix.h"

// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void __attribute__((always_inline)) NAME(setBitsTrue_largestep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_vectorstep in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

    const counter_t range_start_nexttvector = index_type(range_start, bitbucket_t) + bitcount_type(bitbucket_t); // find next vector
    register counter_t range_start_new = range_start; // not in the inner loop because we want to use the value after the loop

    for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
        setBitTrue(bitstorage, range_start_new);
        // bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
    }

    NAME(create_mask_vector_largestep,fullvariantsuffix)(bitstorage, range_start_new, step, range_stop);
    timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
}

#undef variant
#undef variantsuffix
#undef unrollssuffix
#undef fullvariantsuffix
#undef bitbucket_t
#undef suffix
#undef subfunction

#ifdef UNSET_UNROLLS
#undef unrolls
#undef UNSET_UNROLLS
#endif
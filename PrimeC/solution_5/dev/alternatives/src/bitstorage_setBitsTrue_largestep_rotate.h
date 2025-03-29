
// Largestep (> WORD_SIZE and < VECTOR_SIZE) means the same vectormask can be reused
#include "../generic/setsuffix.h"
// static inline void __attribute__((always_inline)) 

#ifdef preset_uint64v4
static void
NAME(create_mask_largestep_rotate,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // verbose6(  printf("\n..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_create_mask_vector_largestep);

    uint64v4_t*  bitstorage_vector = bitstorage;
    const counter_t range_stop_unique_vector = range_start + step * bitcount_type(bitbucket_t) + bitcount_type(bitbucket_t);  // extra size TODO: is sometime needed when size < blocklimit
    counter_t current_vector = index_type(range_start, bitbucket_t);

    // #pragma GCC ivdep
    // for (counter_t index = range_start; index <= range_stop_unique_vector; current_vector++) {
    //     const counter_t current_vector_start = vectorstart_type(index, bitbucket_t);
    //     bitbucket_t mask_vector = BITBUCKET_BASE((variant_base_type_t) 0U);

    //     #pragma clang loop vectorize(enable) interleave(enable)
    //     #pragma GCC ivdep
    //     for (counter_t i=0; i < BITBUCKET_ELEMENTS; i++) {
    //         if (vectorstart_type(index,variant_base_type_t) == (current_vector_start + (bitcount_type(variant_base_type_t)*i))) {
    //             mask_vector[i] = markmask_calc_type(index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
    //             index += step;
    //         }
    //     }
    //     NAME(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
    // }

    setBitsTrue_range(bitstorage, range_start, step, range_stop);

    // if (step == 67) {
    //     printf("\nRange start %ju  Step %ju   Stop %ju\n", (uintmax_t) range_start, (uintmax_t)step, (uintmax_t)range_stop);
    //     #ifdef preset_uint64v4
    //     counter_t start = index_type(range_start, uint64v4_t);
    //     counter_t nr=0;
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     { printf("%4d ", nr++); uint64v4_t preview = bitstorage_vector[start];  printVector(preview); start += 1; } 
    //     #endif
    // }

    current_vector = index_type(range_start, bitbucket_t);

    counter_t it = 0;
    #pragma GCC ivdep
    for (counter_t index = range_start; index <= range_stop_unique_vector; current_vector++) {
        const counter_t current_vector_start = vectorstart_type(index, bitbucket_t);
        bitbucket_t mask_vector = BITBUCKET_BASE((variant_base_type_t) 0U);

        #pragma clang loop vectorize(enable) interleave(enable)
        #pragma GCC ivdep
        for (counter_t i=0; i < BITBUCKET_ELEMENTS; i++) {
            if (vectorstart_type(index,variant_base_type_t) == (current_vector_start + (bitcount_type(variant_base_type_t)*i))) {
                mask_vector[i] = markmask_calc_type(index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
                index += step;
            }
        }
        // NAME(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);

        counter_t virtual_index = index;
        counter_t next_vector_start = vectorstart_type(virtual_index,bitbucket_t);
        bitbucket_t mask_nextvector = BITBUCKET_BASE((variant_base_type_t) 0U);
        for (counter_t i=0; i < BITBUCKET_ELEMENTS; i++) {
            if (vectorstart_type(virtual_index,variant_base_type_t) == (next_vector_start + (bitcount_type(variant_base_type_t)*i))) {
                mask_nextvector[i] = markmask_calc_type(virtual_index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
                virtual_index += step;
            }
        }

        
        counter_t start_mask2 = range_start + step * bitcount_type(variant_base_type_t);
        // if (it++ ==0 && step == 109) {
        //     #ifdef preset_uint64v4
        //     printf("\n");
        //     // printVector(mask_nextvector);
        //     printf("0    "); printVector(mask_vector);
        //     printf("next "); printVector(mask_nextvector);
        //     bitbucket_t mask_vector2 =__builtin_shufflevector(mask_vector, mask_nextvector, 1,2,3,4 ); // rotate mask
        //     printf("Pred "); printVector(mask_vector2);
        //     // 
        //     counter_t start = index_type(range_start, bitbucket_t);
        //     counter_t nr=0;
        //     printf("%4d ", nr++); printVector(bitstorage_vector[start]); start += 1;

        //     #endif
        // }

        // NAME(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector2, index_type(start_mask2, bitbucket_t));
    }
    timer_laptime(time_create_mask_vector_largestep); 
}

#include "../generic/setsuffix.h"
// static inline void __attribute__((always_inline, nonnull)) 
static void
NAME(setBitsTrue_largestep_rotate,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

    const counter_t range_start_nexttvector = index_next_type(range_start, bitbucket_t); // find next vector
    const counter_t range_start_new = setBitsTrue_range_return(bitstorage, range_start, step, range_start_nexttvector);
    if (range_start_new > range_stop) return;
    NAME(create_mask_largestep_rotate,suffix)(bitstorage, range_start_new, step, range_stop);
    timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
}

#endif

#include "../generic/cleansuffix.h"



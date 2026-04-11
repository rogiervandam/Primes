// this file is included multiple times with different macro definitions to generate different variants of the function, 
// so we need to use include guards to prevent multiple definitions of the same function in the same compilation unit
#ifndef BITSTORAGE_ASSEMBLE_WHEEL_GUARD
    #define BITSTORAGE_ASSEMBLE_WHEEL_GUARD
    #define INCLUDE_FILE "../../src/bitstorage/bitstorage_setBitsTrue_wheel.h"
    #include "../generic/generate_varianttypes.h"
#else

    #include "../generic/setsuffix.h"

    #ifndef unrolls

        static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
        function(wheel_block_calc,variantsuffix)(counter_t index) {
            return index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, bitbucket_t);
        }

    #endif

    #ifndef variant_elements // only for non-vectors

    #endif
//     #define KEEP_VARIANT
// #include "../generic/cleansuffix.h"

// #include "../generic/setsuffix.h"

// static inline void __attribute__((always_inline, aligned(cache_line_bytes))) 
// function(create_mask_vector_largestep_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
// {
//     bitbucket_t* restrict bitstorage_vector = __builtin_assume_aligned(bitstorage, cache_line_bytes);
//     const counter_t range_stop_unique_vector = range_start + step * bitcount_type(bitbucket_t) + bitcount_type(bitbucket_t);  // extra size is sometime needed when size < blocklimit

//     #pragma GCC ivdep
//     for (counter_t index = range_start, current_vector = index_type(range_start, bitbucket_t); index <= range_stop_unique_vector; current_vector++) {
//         const counter_t current_vector_start = vectorstart_type(index, bitbucket_t);
//         bitbucket_t mask_vector = BITBUCKET_BASE((variant_base_type_t) 0ULL);

//         #pragma GCC ivdep
//         for (counter_t element = 0; element < BITBUCKET_ELEMENTS; element++) {
//             if (vectorstart_type(index,variant_base_type_t) == (current_vector_start + (bitcount_type(variant_base_type_t) * element))) {
//                 mask_vector[element] = markmask_calc_type(index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
//                 index += step;
//             }
//         }
//         // function(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
//         // function(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
//         function(applyMask_new,suffix)(bitstorage_vector, current_vector*bitcount_type(bitbucket_t), step, range_stop, mask_vector);
//     }
// }

// #include "../generic/setsuffix.h"
// static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
// function(setBitsTrue_largestep_vector_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
// {
//     startAnalysis6(time_setBitsTrue_largestep_vector, "Setting bits step %3ju using largestep_vector%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step)));

//     const counter_t start_vector = index_type(range_start, bitbucket_t);
//     counter_t current_vector = start_vector;

//     // TODO: refactor
//     register counter_t index = range_start; 

//     // walk to next vector, setting bits on the way 
//     #pragma GCC ivdep
//     #pragma GCC unroll 32
//     for(; index <= range_stop; index += step) { 
//         current_vector = index_type(index, bitbucket_t);
//         if (current_vector != start_vector) break; // if we are in a new vector, we need to recalculate the mask vector, because the pattern of which bits to mark as true in the wheel repeats every WHEEL_BASIC_SIZE * step
//         setBitsTrue_wheel(bitstorage, index);
//     }
//     function(create_mask_vector_largestep_wheel,suffix)(bitstorage, index, step, range_stop);
    
//     endAnalysis6(time_setBitsTrue_largestep_vector,"\n");
// }

// // WORKING ON THIS
// //only suiteable if wheel_stripe_primes fits in the vector type

    #ifdef variant_elements  // only for vectors

    #if defined unrolls && unrolls != 1

        static void __attribute__((nonnull, aligned(cache_line_bytes))) 
        function(setBitsTrue_smallstep_rotate_pair_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
        {
            register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);

            counter_t start_vector = function(wheel_block_calc,variantsuffix)(range_start);
            counter_t current_vector = start_vector;

            // TODO: refactor
            register counter_t index = range_start; 

            // walk to next vector, setting bits on the way 
            #pragma GCC ivdep
            #pragma GCC unroll 32
            for(; index <= range_stop; index += step) { 
                current_vector = function(wheel_block_calc,variantsuffix)(index);
                if (current_vector != start_vector) break; // if we are in a new vector, we need to recalculate the mask vector, because the pattern of which bits to mark as true in the wheel repeats every WHEEL_BASIC_SIZE * step
                setBitsTrue_wheel(bitstorage, index);
            }
            start_vector = current_vector;
            
            // counter_t vector_start_index = index;
            bitbucket_t mask_vector = BITBUCKET_BASE(0LL);
            variant_base_type_t mask_element = 0LL;
            counter_t mask_element_index = 0;

            // guarantee that all variations can land
            const counter_t range_stop_vector = function(wheel_block_calc,variantsuffix)(range_stop);
            const counter_t range_stop_unique = min(index + WHEEL_BASIC_SIZE * bitcount_type(bitbucket_t) / (wheelmask_stripe_bytes * 8) * step, range_stop);
            
            for(; index <= range_stop_unique; index += step) {
                current_vector = function(wheel_block_calc,variantsuffix)(index);

                if (current_vector != start_vector) {
                    if (mask_element) {
                        mask_vector[mask_element_index] = mask_element;
                        mask_element = 0LL;
                    }
                    function(applyMask_index,suffix)(bitstorage, start_vector, step, range_stop_vector, mask_vector);
                    mask_vector = BITBUCKET_BASE(0LL);
                    start_vector = current_vector;
                    mask_element_index = 0;
                }

                // counter_t vector_element = wheel_block_calc_uint64(index) & (elementcount_type(bitbucket_t, variant_base_type_t)-1);
                // counter_t vector_element = index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, uint64_t) & (elementcount_type(bitbucket_t, variant_base_type_t)-1);
                counter_t vector_element = vectorelement_type((wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE), bitbucket_t, variant_base_type_t);

                if (mask_element_index != vector_element) {
                    if (mask_element) {
                        mask_vector[mask_element_index] = mask_element;
                        mask_element = 0LL;
                    }
                    mask_element_index = vector_element;
                }
                if (wheelmask_compressed[index % WHEEL_SIZE]) {
                    // counter_t vector_element = (wheel_bit_calc(i) / bitcount_type(variant_base_type_t)) % elementcount_type(bitbucket_t, variant_base_type_t);
                    // mask_vector[vector_element] |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc(index) & 7) *8);
                    mask_element |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc(index) & 7) *8);
                }
            }
            // function(applyMask_index,suffix)(bitstorage, start_vector, step, range_stop_vector, mask_vector);
            // bitstorage_sized[start_vector] |= mask_vector; // apply the last mask

            endAnalysis6(time_setBitsTrue_smallstep_rotate_pair,"\n");
        }
        #endif // end of unrolled function
    #endif // end of vector only function

    // #undef KEEP_VARIANT
    #include "../generic/cleansuffix.h"
#endif

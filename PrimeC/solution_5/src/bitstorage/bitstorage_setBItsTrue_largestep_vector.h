// // Largestep (> WORD_SIZE and < VECTOR_SIZE) means the same vectormask can be reused
// static inline void __attribute__((always_inline)) create_mask_vector_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
// {
//     verbose6(  printf("\n..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
//     timer_lapstart(time_create_mask_vector_largestep);

//     bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
//     const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_BITS * step + VECTOR_SIZE_BITS; 
//     counter_t current_vector = vectorindex(range_start);

//     for (counter_t index = range_start; index <= range_stop_unique_vector;) {
//         const counter_t current_vector_start = vectorstart(index);
//         bitvector_t mask_vector = VECTOR_BASE(VECTOR_SAFE_ZERO);
//         for (counter_t i=0; i<VECTOR_ELEMENTS; i++) {
//             if (vector_wordstart(index) == (current_vector_start + (VECTORWORD_SIZE_BITS*i))) {
//                 mask_vector[i] = vector_markmask_calc(index); // TODO: this was sensitive to wordsize. vector_markmask(index) didnt work; markmask_calc(index) worked
//                 index += step;
//             }
//         }
//         // applyMask_vector(bitstorage_vector, step, range_stop, mask_vector, current_vector);
//         applyMask_uint64v4(bitstorage_vector, step, range_stop, mask_vector, current_vector);
//         current_vector++;
//     }
//     timer_laptime(time_create_mask_vector_largestep); 
// }

// // this is a BASE ALGORITHM COMPLIANT: each bit is set individually
// static inline void __attribute__((always_inline)) setBitsTrue_largestep_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
// {
//     verbose6(  printf("Setting bits step %3ju using largestep vector_vectorstep in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
//     timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

//     const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_BITS; // find next vector
//     register counter_t range_start_new = range_start; // not in the inner loop because we want to use the value after the loop

//     for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
//         setBitTrue(bitstorage, range_start_new);
//         // bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
//     }

//     create_mask_vector_largestep(bitstorage, range_start_new, step, range_stop);
//     timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
// }

// // static inline void __attribute__((always_inline)) create_mask_vector_largestep_uint64v8(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
// // {
// //     verbose6(  printf("\n..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
// //     timer_lapstart(time_create_mask_vector_largestep);

// //     uint64v8_bitvector_t* restrict bitstorage_vector = (uint64v8_bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
// //     const counter_t range_stop_unique_vector = range_start + 64*8 * step + 64*8; 
// //     counter_t current_vector = range_start >> 9;

// //     for (counter_t index = range_start; index <= range_stop_unique_vector;) {
// //         const counter_t current_vector_start = index & ~511;
// //         uint64v8_bitvector_t mask_vector = {(uint64_t)0U,(uint64_t)0U,(uint64_t)0U,(uint64_t)0U,(uint64_t)0U,(uint64_t)0U,(uint64_t)0U,(uint64_t)0U  };
// //         for (counter_t i=0; i<8; i++) {
// //             if ((index & ~63) == (current_vector_start + (64*i))) {
// //                 mask_vector[i] = 1ULL << (index & 63); // TODO: this was sensitive to wordsize. vector_markmask(index) didnt work; markmask_calc(index) worked
// //                 index += step;
// //             }
// //         }
// //         applyMask_vector_uint64v8(bitstorage_vector, step, range_stop, mask_vector, current_vector);
// //         current_vector++;
// //     }
// //     timer_laptime(time_create_mask_vector_largestep); 
// // }

// // // this is a BASE ALGORITHM COMPLIANT: each bit is set individually
// // static inline void __attribute__((always_inline)) setBitsTrue_largestep_vector_uint64v8(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
// // {
// //     verbose6(  printf("Setting bits step %3ju using largestep vector_vectorstep in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
// //     timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

// //     const counter_t range_start_nexttvector = (range_start & ~511) + 512; // find next vector
// //     register counter_t range_start_new = range_start; // not in the inner loop because we want to use the value after the loop

// //     for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
// //         bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
// //     }

// //     create_mask_vector_largestep_uint64v8(bitstorage, range_start_new, step, range_stop);
// //     timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
// // }


// // static inline void __attribute__((always_inline)) create_mask_vector_largestep_uint64v4(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
// // {
// //     verbose6(printf("\n..Setting bits step %3ju using create_mask_vector_largestep_uint64v4 in %ju bit range (%ju-%ju) (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
// //     timer_lapstart(time_create_mask_vector_largestep);

// //     uint64v4_bitvector_t* restrict bitstorage_vector = (uint64v4_bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
// //     const counter_t range_stop_unique_vector = range_start + 64*4 * step + 64*4; 
// //     counter_t current_vector = range_start >> 8; // 256 bits = 2^8

// //     for (counter_t index = range_start; index <= range_stop_unique_vector;) {
// //         const counter_t current_vector_start = index & ~255; // 256-bit alignment
// //         uint64v4_bitvector_t mask_vector = {(uint64_t)0U,(uint64_t)0U,(uint64_t)0U,(uint64_t)0U};
// //         for (counter_t i=0; i<4; i++) {
// //             if ((index & ~63) == (current_vector_start + (64*i))) {
// //                 mask_vector[i] = 1ULL << (index & 63);
// //                 index += step;
// //             }
// //         }
// //         applyMask_vector_uint64v4(bitstorage_vector, step, range_stop, mask_vector, current_vector);
// //         current_vector++;
// //     }
// //     timer_laptime(time_create_mask_vector_largestep); 
// // }

// // static inline void __attribute__((always_inline)) setBitsTrue_largestep_vector_uint64v4(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
// // {
// //     verbose6(printf("Setting bits step %3ju using largestep vector_uint64v4 in %ju bit range (%ju-%ju) (%ju occurances)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step)); )
// //     timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

// //     const counter_t range_start_nexttvector = (range_start & ~255) + 256; // find next vector
// //     register counter_t range_start_new = range_start;

// //     for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
// //         bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
// //     }

// //     create_mask_vector_largestep_uint64v4(bitstorage, range_start_new, step, range_stop);
// //     timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6(printf("\n"); )
// // }

// // // === uint32v16 implementation ===
// // static inline void __attribute__((always_inline)) create_mask_vector_largestep_uint32v16(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
// // {
// //     verbose6(printf("\n..Setting bits step %3ju using create_mask_vector_largestep_uint32v16 in %ju bit range (%ju-%ju) (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
// //     timer_lapstart(time_create_mask_vector_largestep);

// //     uint32v16_bitvector_t* restrict bitstorage_vector = (uint32v16_bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
// //     const counter_t range_stop_unique_vector = range_start + 32*16 * step + 32*16; 
// //     counter_t current_vector = range_start >> 9; // 512 bits = 2^9

// //     for (counter_t index = range_start; index <= range_stop_unique_vector;) {
// //         const counter_t current_vector_start = index & ~511; // 512-bit alignment
// //         uint32v16_bitvector_t mask_vector = {0U,0U,0U,0U,0U,0U,0U,0U,0U,0U,0U,0U,0U,0U,0U,0U};
// //         for (counter_t i=0; i<16; i++) {
// //             if ((index & ~31) == (current_vector_start + (32*i))) {
// //                 mask_vector[i] = 1U << (index & 31);
// //                 index += step;
// //             }
// //         }
// //         applyMask_vector_uint32v16(bitstorage_vector, step, range_stop, mask_vector, current_vector);
// //         current_vector++;
// //     }
// //     timer_laptime(time_create_mask_vector_largestep); 
// // }

// // static inline void __attribute__((always_inline)) setBitsTrue_largestep_vector_uint32v16(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
// // {
// //     verbose6(printf("Setting bits step %3ju using largestep vector_uint32v16 in %ju bit range (%ju-%ju) (%ju occurances)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step)); )
// //     timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

// //     const counter_t range_start_nexttvector = (range_start & ~511) + 512; // find next vector
// //     register counter_t range_start_new = range_start;

// //     for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
// //         bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
// //     }

// //     create_mask_vector_largestep_uint32v16(bitstorage, range_start_new, step, range_stop);
// //     timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6(printf("\n"); )
// // }

// #define DEFINE_VECTOR_LARGESTEP_FUNCTIONS(TYPE_PREFIX, ELEMENT_TYPE, VECTOR_SIZE, BITS_PER_ELEMENT, ZERO_INIT, VECTOR_SHIFT, VECTOR_ALIGN_MASK) \
// \
// static inline void __attribute__((always_inline)) create_mask_vector_largestep_##TYPE_PREFIX( \
//     bitword_t* restrict bitstorage, \
//     const counter_t range_start, \
//     const counter_t step, \
//     const counter_t range_stop) \
// { \
//     verbose6(printf("\n..Setting bits step %3ju using create_mask_vector_largestep_" #TYPE_PREFIX " in %ju bit range (%ju-%ju) (%ju occurances)", \
//         (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start, \
//         (uintmax_t)range_start, (uintmax_t)range_stop, \
//         (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); ) \
//     timer_lapstart(time_create_mask_vector_largestep); \
// \
//     TYPE_PREFIX##_bitvector_t* restrict bitstorage_vector = (TYPE_PREFIX##_bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes); \
//     const counter_t bits_per_vector = VECTOR_SIZE * BITS_PER_ELEMENT; \
//     const counter_t range_stop_unique_vector = range_start + bits_per_vector * step + bits_per_vector; \
//     counter_t current_vector = range_start >> VECTOR_SHIFT; \
// \
//     for (counter_t index = range_start; index <= range_stop_unique_vector;) { \
//         const counter_t current_vector_start = index & VECTOR_ALIGN_MASK; \
//         TYPE_PREFIX##_bitvector_t mask_vector; \
//         for (int i = 0; i < VECTOR_SIZE; i++) { \
//             mask_vector[i] = ZERO_INIT; \
//         } \
//         for (counter_t i = 0; i < VECTOR_SIZE; i++) { \
//             if ((index & ~(BITS_PER_ELEMENT-1)) == (current_vector_start + (BITS_PER_ELEMENT*i))) { \
//                 mask_vector[i] = (ELEMENT_TYPE)1 << (index & (BITS_PER_ELEMENT-1)); \
//                 index += step; \
//             } \
//         } \
//         applyMask_##TYPE_PREFIX(bitstorage_vector, step, range_stop, mask_vector, current_vector); \
//         current_vector++; \
//     } \
//     timer_laptime(time_create_mask_vector_largestep); \
// } \
// \
// static inline void __attribute__((always_inline)) setBitsTrue_largestep_vector_##TYPE_PREFIX( \
//     bitword_t* restrict bitstorage, \
//     const counter_t range_start, \
//     const counter_t step, \
//     const counter_t range_stop) \
// { \
//     verbose6(printf("Setting bits step %3ju using largestep vector_" #TYPE_PREFIX " in %ju bit range (%ju-%ju) (%ju occurances)", \
//         (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start), \
//         (uintmax_t)range_start, (uintmax_t)range_stop, \
//         (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step)); ) \
//     timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep); \
// \
//     const counter_t bits_per_vector = VECTOR_SIZE * BITS_PER_ELEMENT; \
//     const counter_t range_start_nexttvector = (range_start & VECTOR_ALIGN_MASK) + bits_per_vector; \
//     register counter_t range_start_new = range_start; \
// \
//     for (; range_start_new <= range_start_nexttvector; range_start_new += step) { \
//         bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new); \
//     } \
// \
//     create_mask_vector_largestep_##TYPE_PREFIX(bitstorage, range_start_new, step, range_stop); \
//     timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6(printf("\n"); ) \
// }

// // DEFINE_VECTOR_LARGESTEP_FUNCTIONS(
// //     uint64v4,         // Vector type prefix
// //     uint64_t,         // Element type
// //     4,                // Number of elements
// //     64,               // Bits per element
// //     0ULL,             // Zero initialization value
// //     8,                // Vector shift (2^8 = 256 bits)
// //     ~255UL            // Vector alignment mask (256-bit alignment)
// // )

// // Define uint32v16 functions (16 elements of 32 bits = 512 bits)
// DEFINE_VECTOR_LARGESTEP_FUNCTIONS(
//     uint32v16,        // Vector type prefix
//     uint32_t,         // Element type
//     16,               // Number of elements
//     32,               // Bits per element
//     0U,               // Zero initialization value
//     9,                // Vector shift (2^9 = 512 bits)
//     ~511UL            // Vector alignment mask (512-bit alignment)
// )

// // Define uint64v8 functions (8 elements of 64 bits = 512 bits)
// // DEFINE_VECTOR_LARGESTEP_FUNCTIONS(
// //     uint64v8,         // Vector type prefix
// //     uint64_t,         // Element type
// //     8,                // Number of elements
// //     64,               // Bits per element
// //     0ULL,             // Zero initialization value
// //     9,                // Vector shift (2^9 = 512 bits)
// //     ~511UL            // Vector alignment mask (512-bit alignment)
// // )

// // Define uint64v8 functions (8 elements of 64 bits = 512 bits)
// DEFINE_VECTOR_LARGESTEP_FUNCTIONS(
//     uint16v32,         // Vector type prefix
//     uint16_t,         // Element type
//     32,               // Number of elements
//     16,               // Bits per element
//     0U,               // Zero initialization value
//     9,                // Vector shift (2^9 = 512 bits)
//     ~511UL            // Vector alignment mask (512-bit alignment)
// )

// DEFINE_VECTOR_LARGESTEP_FUNCTIONS(
//     uint16v8,         // Vector type prefix
//     uint16_t,         // Element type
//     8,                // Number of elements
//     16,               // Bits per element
//     0U,             // Zero initialization value
//     7,                // Vector shift (2^7 = 128 bits)
//     ~127UL            // Vector alignment mask (128-bit alignment)
// )

// // Define uint64v2 functions (2 elements of 64 bits = 128 bits)
// // DEFINE_VECTOR_LARGESTEP_FUNCTIONS(
// //     uint64v2,         // Vector type prefix
// //     uint64_t,         // Element type
// //     2,                // Number of elements
// //     64,               // Bits per element
// //     0ULL,             // Zero initialization value
// //     7,                // Vector shift (2^7 = 128 bits)
// //     ~127UL            // Vector alignment mask (128-bit alignment)
// // )

// // Define uint32v8 functions (8 elements of 32 bits = 256 bits)
// DEFINE_VECTOR_LARGESTEP_FUNCTIONS(
//     uint32v8,         // Vector type prefix
//     uint32_t,         // Element type
//     8,                // Number of elements
//     32,               // Bits per element
//     0U,               // Zero initialization value
//     8,                // Vector shift (2^8 = 256 bits)
//     ~255UL            // Vector alignment mask (256-bit alignment)
// )

#undef unrolls
#define variant_base_type uint64_t 
#define variant uint64v2
#include "bitstorage_setBItsTrue_largestep_vbody.h" 
#define variant uint64v4
#include "bitstorage_setBItsTrue_largestep_vbody.h" 
#define variant uint64v8
#include "bitstorage_setBItsTrue_largestep_vbody.h" 

#undef variant_base_type
#define variant_base_type uint32_t 
// #define variant uint32v2
// #include "bitstorage_setBItsTrue_largestep_vbody.h" 
// #define variant uint32v4
// #include "bitstorage_setBItsTrue_largestep_vbody.h" 
#define variant uint32v8
#include "bitstorage_setBItsTrue_largestep_vbody.h" 

#undef variant_base_type
#define variant_base_type uint16_t 
// #define variant uint16v2
// #include "bitstorage_setBItsTrue_largestep_vbody.h" 
// #define variant uint16v4
// #include "bitstorage_setBItsTrue_largestep_vbody.h" 
#define variant uint16v8
#include "bitstorage_setBItsTrue_largestep_vbody.h" 

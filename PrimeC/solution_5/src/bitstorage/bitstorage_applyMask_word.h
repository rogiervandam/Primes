// Macro for manual unrolling, one per unroll size
#define APPLY_MASK_UNROLL_4(index_ptr, step, mask) \
    *(index_ptr) |= mask; \
    *(index_ptr + step) |= mask; \
    *(index_ptr + step * 2) |= mask; \
    *(index_ptr + step * 3) |= mask;

#define APPLY_MASK_UNROLL_8(index_ptr, step, mask) \
    *(index_ptr) |= mask; \
    *(index_ptr + step) |= mask; \
    *(index_ptr + step * 2) |= mask; \
    *(index_ptr + step * 3) |= mask; \
    *(index_ptr + step * 4) |= mask; \
    *(index_ptr + step * 5) |= mask; \
    *(index_ptr + step * 6) |= mask; \
    *(index_ptr + step * 7) |= mask;

#define APPLY_MASK_UNROLL_16(index_ptr, step, mask) \
    *(index_ptr) |= mask; \
    *(index_ptr + step) |= mask; \
    *(index_ptr + step * 2) |= mask; \
    *(index_ptr + step * 3) |= mask; \
    *(index_ptr + step * 4) |= mask; \
    *(index_ptr + step * 5) |= mask; \
    *(index_ptr + step * 6) |= mask; \
    *(index_ptr + step * 7) |= mask; \
    *(index_ptr + step * 8) |= mask; \
    *(index_ptr + step * 9) |= mask; \
    *(index_ptr + step * 10) |= mask; \
    *(index_ptr + step * 11) |= mask; \
    *(index_ptr + step * 12) |= mask; \
    *(index_ptr + step * 13) |= mask; \
    *(index_ptr + step * 14) |= mask; \
    *(index_ptr + step * 15) |= mask;

#define APPLY_MASK_UNROLL_32(index_ptr, step, mask) \
    *(index_ptr) |= mask; \
    *(index_ptr + step) |= mask; \
    *(index_ptr + step * 2) |= mask; \
    *(index_ptr + step * 3) |= mask; \
    *(index_ptr + step * 4) |= mask; \
    *(index_ptr + step * 5) |= mask; \
    *(index_ptr + step * 6) |= mask; \
    *(index_ptr + step * 7) |= mask; \
    *(index_ptr + step * 8) |= mask; \
    *(index_ptr + step * 9) |= mask; \
    *(index_ptr + step * 10) |= mask; \
    *(index_ptr + step * 11) |= mask; \
    *(index_ptr + step * 12) |= mask; \
    *(index_ptr + step * 13) |= mask; \
    *(index_ptr + step * 14) |= mask; \
    *(index_ptr + step * 15) |= mask; \
    *(index_ptr + step * 16) |= mask; \
    *(index_ptr + step * 17) |= mask; \
    *(index_ptr + step * 18) |= mask; \
    *(index_ptr + step * 19) |= mask; \
    *(index_ptr + step * 20) |= mask; \
    *(index_ptr + step * 21) |= mask; \
    *(index_ptr + step * 22) |= mask; \
    *(index_ptr + step * 23) |= mask; \
    *(index_ptr + step * 24) |= mask; \
    *(index_ptr + step * 25) |= mask; \
    *(index_ptr + step * 26) |= mask; \
    *(index_ptr + step * 27) |= mask; \
    *(index_ptr + step * 28) |= mask; \
    *(index_ptr + step * 29) |= mask; \
    *(index_ptr + step * 30) |= mask; \
    *(index_ptr + step * 31) |= mask;


#define APPLY_MASK_GENERIC(type, bits, unroll, funcname) \
static inline void __attribute__((always_inline)) funcname( \
    bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, \
    const type mask, const counter_t index_word) \
{ \
    type* restrict bitstorage_sized = (type*) __builtin_assume_aligned(bitstorage, cache_line_bytes); \
    verbose8( printf("Applying mask %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); ) \
    timer_lapstart(time_applyMask_word); \
    \
    register type* restrict index_ptr = &bitstorage_sized[index_word]; \
    const counter_t range_stop_word = range_stop >> bits; \
    \
    register const type* restrict fast_loop_ptr = __builtin_assume_aligned( \
        &bitstorage_sized[((range_stop_word > step * unroll) ? (range_stop_word - step * unroll):0)], \
        sizeof(type)); \
    \
    _Pragma("GCC ivdep") \
    while (index_ptr < fast_loop_ptr) { \
        if (unroll == 4) { \
            APPLY_MASK_UNROLL_4(index_ptr, step, mask) \
        } else if (unroll == 8) { \
            APPLY_MASK_UNROLL_8(index_ptr, step, mask) \
        } else if (unroll == 16) { \
            APPLY_MASK_UNROLL_16(index_ptr, step, mask) \
        } else if (unroll == 32) { \
            APPLY_MASK_UNROLL_32(index_ptr, step, mask) \
        } \
        index_ptr += step * unroll; \
    } \
    \
    register const type* restrict range_stop_ptr = (&bitstorage_sized[range_stop_word]); \
    for (counter_t i=unroll+1; i-- && (index_ptr <= range_stop_ptr); index_ptr += step) { \
        *index_ptr |= mask; \
    } \
    \
    timer_laptime(time_applyMask_word); verbose8( printf("\n"); ) \
}

// Generate all the versions you need
APPLY_MASK_GENERIC(uint8_t, 3, 4, applyMask_uint8_unroll4)
APPLY_MASK_GENERIC(uint8_t, 3, 8, applyMask_uint8_unroll8)
APPLY_MASK_GENERIC(uint8_t, 3, 16, applyMask_uint8_unroll16)
APPLY_MASK_GENERIC(uint8_t, 3, 32, applyMask_uint8_unroll32)
APPLY_MASK_GENERIC(uint16_t, 4, 4, applyMask_uint16_unroll4)
APPLY_MASK_GENERIC(uint16_t, 4, 8, applyMask_uint16_unroll8)
APPLY_MASK_GENERIC(uint16_t, 4, 16, applyMask_uint16_unroll16)
APPLY_MASK_GENERIC(uint16_t, 4, 32, applyMask_uint16_unroll32)
APPLY_MASK_GENERIC(uint32_t, 5, 4, applyMask_uint32_unroll4)
APPLY_MASK_GENERIC(uint32_t, 5, 8, applyMask_uint32_unroll8)
APPLY_MASK_GENERIC(uint32_t, 5, 8, applyMask_uint32_unroll16)
APPLY_MASK_GENERIC(uint64_t, 6, 4, applyMask_uint64_unroll4)
APPLY_MASK_GENERIC(uint64_t, 6, 8, applyMask_uint64_unroll8)
APPLY_MASK_GENERIC(bitword_t, SHIFT_WORD, 4, applyMask_word)

// static inline void __attribute__((always_inline)) applyMask_uint8_unroll16(bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint8_t mask, const counter_t index_word) 
// {
//     uint8_t* restrict bitstorage_uint8 = (uint8_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);

//     verbose8( printf("Applying mask %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); )
//     timer_lapstart(time_applyMask_word);

//     register uint8_t* restrict index_ptr = &bitstorage_uint8[index_word];
//     const counter_t range_stop_word = range_stop >> 3;

//     register const uint8_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_uint8[((range_stop_word > step * 16) ? (range_stop_word - step * 16):0)], sizeof(uint8_t));;
//     #pragma GCC ivdep
//     while (index_ptr < fast_loop_ptr) {
//         *(index_ptr            ) |= mask; 
//         *(index_ptr + step * 1 ) |= mask; 
//         *(index_ptr + step * 2 ) |= mask; 
//         *(index_ptr + step * 3 ) |= mask; 
//         *(index_ptr + step * 4 ) |= mask; 
//         *(index_ptr + step * 5 ) |= mask; 
//         *(index_ptr + step * 6 ) |= mask; 
//         *(index_ptr + step * 7 ) |= mask; 
//         *(index_ptr + step * 8 ) |= mask; 
//         *(index_ptr + step * 9 ) |= mask; 
//         *(index_ptr + step * 10 ) |= mask; 
//         *(index_ptr + step * 11) |= mask; 
//         *(index_ptr + step * 12 ) |= mask; 
//         *(index_ptr + step * 13 ) |= mask; 
//         *(index_ptr + step * 14 ) |= mask; 
//         *(index_ptr + step * 15 ) |= mask; 
//         index_ptr += step * 16;
//     }

//     register const uint8_t* restrict range_stop_ptr = (&bitstorage_uint8[range_stop_word]);
//     for (counter_t i=17; i-- && (index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
//         *index_ptr |= mask; 
//     }

//     timer_laptime(time_applyMask_word); verbose8( printf("\n"); )
// }

// static inline void __attribute__((always_inline)) applyMask_uint8_unroll16(bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint8_t mask, const counter_t index_word) 
// {
//     uint8_t* restrict bitstorage_uint8 = (uint8_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);

//     verbose8( printf("Applying mask %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); )
//     timer_lapstart(time_applyMask_word);

//     register uint8_t* restrict index_ptr = &bitstorage_uint8[index_word];
//     const counter_t range_stop_word = range_stop >> 3;

//     register const uint8_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_uint8[((range_stop_word > step * 16) ? (range_stop_word - step * 16):0)], sizeof(uint8_t));;
//     // #pragma GCC ivdep
//     while (index_ptr < fast_loop_ptr) {
//         // *(index_ptr            ) |= mask; 
//         // *(index_ptr + step * 1 ) |= mask; 
//         // *(index_ptr + step * 2 ) |= mask; 
//         // *(index_ptr + step * 3 ) |= mask; 
//         // *(index_ptr + step * 4 ) |= mask; 
//         // *(index_ptr + step * 5 ) |= mask; 
//         // *(index_ptr + step * 6 ) |= mask; 
//         // *(index_ptr + step * 7 ) |= mask; 
//         // *(index_ptr + step * 8 ) |= mask; 
//         // *(index_ptr + step * 9 ) |= mask; 
//         // *(index_ptr + step * 10 ) |= mask; 
//         // *(index_ptr + step * 11)  |= mask; 
//         // *(index_ptr + step * 12 ) |= mask; 
//         // *(index_ptr + step * 13 ) |= mask; 
//         // *(index_ptr + step * 14 ) |= mask; 
//         // *(index_ptr + step * 15 ) |= mask; 
//         // index_ptr += step * 16;

//         // #define unroll_size (counter_t)8
//         #pragma clang loop unroll(full)
//         for (counter_t i=0; i<16; i++) { 
//             *(index_ptr + step * i) |= mask; 
//         } 
//         index_ptr += step * 16; 
//     }

//     register const uint8_t* restrict range_stop_ptr = (&bitstorage_uint8[range_stop_word]);
//     for (;  (index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
//         *index_ptr |= mask; 
//     }

//     timer_laptime(time_applyMask_word); verbose8( printf("\n"); )
// }
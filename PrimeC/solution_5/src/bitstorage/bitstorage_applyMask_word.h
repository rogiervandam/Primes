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
        for (counter_t i=0; i<unroll; i++) { \
            *(index_ptr + step * i) |= mask; \
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
APPLY_MASK_GENERIC(uint8_t, 3, 8, applyMask_uint8_unroll16)
APPLY_MASK_GENERIC(uint8_t, 3, 8, applyMask_uint8_unroll32)
APPLY_MASK_GENERIC(uint16_t, 4, 4, applyMask_uint16_unroll4)
APPLY_MASK_GENERIC(uint16_t, 4, 8, applyMask_uint16_unroll8)
APPLY_MASK_GENERIC(uint16_t, 4, 8, applyMask_uint16_unroll16)
APPLY_MASK_GENERIC(uint16_t, 4, 8, applyMask_uint16_unroll32)
APPLY_MASK_GENERIC(bitword_t, SHIFT_WORD, 4, applyMask_word)

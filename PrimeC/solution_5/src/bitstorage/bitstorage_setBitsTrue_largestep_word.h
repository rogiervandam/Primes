
// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
#define SET_BITS_TRUE_LARGESTEP_REPEAT(suffix, word_type, bits_width, shift_amount, apply_mask_func, mask_expr, index_expr) \
static inline void __attribute__((always_inline)) setBitsTrue_largestep_repeat##suffix( \
    bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) \
{ \
    const counter_t range_stop_unique = range_start + bits_width * step; \
    verbose6(printf("Setting bits step %3ju using largestep-repeat" #suffix " in %ju bit range (%ju-%ju) (%ju repeating occurrences)", \
        (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start, \
        (uintmax_t)range_start, (uintmax_t)range_stop, \
        (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bits_width*step)))); \
    timer_lapstart(time_setBitsTrue_largestep_repeat); \
    \
    for (register counter_t index = range_start; index < range_stop_unique; index += step) { \
        apply_mask_func(bitstorage, step, range_stop, mask_expr, index_expr); \
    } \
    timer_laptime(time_setBitsTrue_largestep_repeat); verbose6(printf("\n")); \
}

// Generate the three versions
SET_BITS_TRUE_LARGESTEP_REPEAT(,         bitword_t, WORD_SIZE_BITS, SHIFT_WORD, applyMask_word,            markmask(index),                  wordindex(index))
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint64_unroll8 ,  uint64_t,  64,            6,          applyMask_uint64_unroll8,  ((uint64_t)1) << (index & 63),    index >> 6)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint64_unroll4 ,  uint64_t,  64,            6,          applyMask_uint64_unroll4,  ((uint64_t)1) << (index & 63),    index >> 6)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint32_unroll16,  uint32_t,  32,            5,          applyMask_uint32_unroll16, ((uint32_t)1) << (index & 31),    index >> 5)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint32_unroll8 ,  uint32_t,  32,            5,          applyMask_uint32_unroll8,  ((uint32_t)1) << (index & 31),    index >> 5)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint32_unroll4 ,  uint32_t,  32,            5,          applyMask_uint32_unroll4,  ((uint32_t)1) << (index & 31),    index >> 5)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint16_unroll32,  uint16_t,  16,            4,          applyMask_uint16_unroll32, ((uint16_t)1) << (index & 15),    index >> 4)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint16_unroll16,  uint16_t,  16,            4,          applyMask_uint16_unroll16, ((uint16_t)1) << (index & 15),    index >> 4)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint16_unroll8 ,  uint16_t,  16,            4,          applyMask_uint16_unroll8,  ((uint16_t)1) << (index & 15),    index >> 4)
SET_BITS_TRUE_LARGESTEP_REPEAT(_uint16_unroll4 ,  uint16_t,  16,            4,          applyMask_uint16_unroll4,  ((uint16_t)1) << (index & 15),    index >> 4)
SET_BITS_TRUE_LARGESTEP_REPEAT( _uint8_unroll32,   uint8_t,   8,            3,          applyMask_uint8_unroll32,  ( (uint8_t)1) << (index &  7),    index >> 3)
SET_BITS_TRUE_LARGESTEP_REPEAT( _uint8_unroll16,   uint8_t,   8,            3,          applyMask_uint8_unroll16,  ( (uint8_t)1) << (index &  7),    index >> 3)
SET_BITS_TRUE_LARGESTEP_REPEAT( _uint8_unroll8 ,   uint8_t,   8,            3,          applyMask_uint8_unroll8,   ( (uint8_t)1) << (index &  7),    index >> 3)
SET_BITS_TRUE_LARGESTEP_REPEAT( _uint8_unroll4 ,   uint8_t,   8,            3,          applyMask_uint8_unroll4,   ( (uint8_t)1) << (index &  7),    index >> 3)

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void __attribute__((always_inline)) setBitsTrue_largestep_norepeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using largestep-norepeat in %ju bit range (%ju-%ju)  (%ju unique occurances)..", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_largestep_norepeat);

    const counter_t step_4 = step * 4;
    #if is_signed(counter_t)
    const counter_t loop_stop = range_stop - step_4;
    #else
    const counter_t loop_stop = (range_stop > step_2) ? range_stop - step_2 : 0;
    #endif
    register counter_t index = range_start;

    #pragma GCC ivdep
    for (; index < loop_stop; index += step_4) {
        bitstorage[wordindex(index           )] |= markmask(index);
        bitstorage[wordindex(index + step    )] |= markmask(index + step );
        bitstorage[wordindex(index + step * 2)] |= markmask(index + step * 2);
        bitstorage[wordindex(index + step * 3)] |= markmask(index + step * 3);
    }

    for (counter_t i=4; i-- && index < range_stop; index += step) 
        bitstorage[wordindex(index)] |= markmask(index);

    if unlikely(index==range_stop)
        bitstorage[wordindex(index)] |= markmask(index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}

static inline void __attribute__((always_inline)) setBitsTrue_largestep_norepeat_unroll2(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using largestep-norepeat in %ju bit range (%ju-%ju)  (%ju unique occurances)..", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_largestep_norepeat);

    const counter_t step_2 = step * 2;
    #if is_signed(counter_t)
    const counter_t loop_stop = range_stop - step_2;
    #else
    const counter_t loop_stop = (range_stop > step_2) ? range_stop - step_2 : 0;
    #endif
    register counter_t index = range_start;

    #pragma GCC ivdep
    for (; index < loop_stop; index += step_2) {
        bitstorage[wordindex(index           )] |= markmask(index);
        bitstorage[wordindex(index + step    )] |= markmask(index + step );
    }

    for (counter_t i=2; i-- && index < range_stop; index += step) 
        bitstorage[wordindex(index)] |= markmask(index);

    if unlikely(index==range_stop)
        bitstorage[wordindex(index)] |= markmask(index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}
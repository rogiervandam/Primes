
// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void  __attribute__((always_inline)) setBitsTrue_largestep_repeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + WORD_SIZE_BITS * step;
    verbose6(  printf("Setting bits step %3ju using largestep-repeat in %ju bit range (%ju-%ju)  (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(WORD_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue_largestep_repeat);

    for (register counter_t index = range_start; index < range_stop_unique; index += step) {
        applyMask_word(bitstorage, step, range_stop, markmask(index), wordindex(index));
    }
    timer_laptime(time_setBitsTrue_largestep_repeat); verbose6( printf("\n"); )
}

// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void  __attribute__((always_inline)) setBitsTrue_largestep_repeat_uint16(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + 16 * step;
    verbose6(  printf("Setting bits step %3ju using largestep-repeat-uint16 in %ju bit range (%ju-%ju)  (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(16*step))); )
    timer_lapstart(time_setBitsTrue_largestep_repeat);

    for (register counter_t index = range_start; index < range_stop_unique; index += step) {
        applyMask_uint16(bitstorage, step, range_stop, ((uint16_t)1) << (index & 15), index >> 4);
    }
    timer_laptime(time_setBitsTrue_largestep_repeat); verbose6( printf("\n"); )
}

// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void  __attribute__((always_inline)) setBitsTrue_largestep_repeat_uint8(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + 8 * step;
    verbose6(  printf("Setting bits step %3ju using largestep-repeat-uint8 in %ju bit range (%ju-%ju)  (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(16*step))); )
    timer_lapstart(time_setBitsTrue_largestep_repeat);

    for (register counter_t index = range_start; index < range_stop_unique; index += step) {
        applyMask_uint8(bitstorage, step, range_stop, ((uint8_t)1) << (uint8_t)(index & 7), index >> 3);
    }
    timer_laptime(time_setBitsTrue_largestep_repeat); verbose6( printf("\n"); )
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void __attribute__((always_inline)) setBitsTrue_largestep_norepeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
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
        bitstorage[wordindex(index         )] |= markmask(index);
        bitstorage[wordindex(index + step  )] |= markmask(index + step );
    }

    for (counter_t i=2; i-- && index < range_stop; index += step) 
        bitstorage[wordindex(index)] |= markmask(index);

    if unlikely(index==range_stop)
        bitstorage[wordindex(index)] |= markmask(index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}
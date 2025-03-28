// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_BITS
// This is the BASE ALGORITHM COMPLIANT version
static inline void  __attribute__((always_inline, nonnull)) 
setBitsTrue_base(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using setBitsTrue_base in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue);

    if (step < bitcount_type(uint64_t) /2) {
        const counter_t range_stop_unique_word = range_start + bitcount_type(uint64_t) * step; 
        if (range_stop_unique_word <= range_stop) { // the wordmask will be reused
            setBitsTrue_smallstep_repeat_base_uint8(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
        else {
            setBitsTrue_smallstep_norepeat_uint8(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
    }

    if (range_start + step * 8 * 8 * 8 <= range_stop) { // // 8 bit 8 roll 8 tuned value
        setBitsTrue_largestep_repeat_uint8_unroll8(bitstorage, range_start, step, range_stop);
        return;
    } 

    if (range_start + step * 8 * 4  <= range_stop) {  // 8 bit 4 roll 8 tuned value
        setBitsTrue_largestep_repeat_uint8_unroll4(bitstorage, range_start, step, range_stop);
        return;
    } 

    setBitsTrue_largestep_norepeat_uint8_unroll4(bitstorage, range_start, step, range_stop);

    timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
}
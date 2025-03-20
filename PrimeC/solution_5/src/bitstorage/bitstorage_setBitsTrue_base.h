// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_BITS
// This is the BASE ALGORITHM COMPLIANT version
static inline void  __attribute__((always_inline)) setBitsTrue_base(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using setBitsTrue_base in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue);

    if (step < WORD_SIZE_BITS /2) {
        const counter_t range_stop_unique_word = range_start + WORD_SIZE_BITS * step; 
        if (range_stop_unique_word <= range_stop) { // the wordmask will be reused
            setBitsTrue_smallstep_repeat_base(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
        else {
            setBitsTrue_smallstep_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
    }

    setBitsTrue_largestep(bitstorage, range_start, step, range_stop);
    timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
}
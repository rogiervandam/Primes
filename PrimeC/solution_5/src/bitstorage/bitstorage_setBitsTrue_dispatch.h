
static inline void  __attribute__((always_inline)) setBitsTrue_largestep(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    if (range_start + step * 8 * 8 * 8 <= range_stop) { // // 8 bit 8 roll 8 tuned value
        setBitsTrue_largestep_repeat_uint8_unroll8(bitstorage, range_start, step, range_stop);
        return;
    } 

    if (range_start + step * 8 * 6  <= range_stop) {  // 8 bit 4 roll 8 tuned value
        setBitsTrue_largestep_repeat_uint8_unroll4(bitstorage, range_start, step, range_stop);
        return;
    } 

    setBitsTrue_largestep_norepeat(bitstorage, range_start, step, range_stop);
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_BITS
static inline void  __attribute__((always_inline)) setBitsTrue(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using setBitsTrue in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue);

    if (step <= 63) {
        if (step < global_mediumstep_faster) {
            // no check for repeat needed; this is fast
            setBitsTrue_smallstep_rotate_pair_uint64v4(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }

        // if (step < WORD_SIZE_BITS /2) {
        //     const counter_t range_stop_unique_word = range_start + WORD_SIZE_BITS * step; 
        //     if (range_stop_unique_word <= range_stop) { // the wordmask will be reused
        //         setBitsTrue_smallstep_repeat(bitstorage, range_start, step, range_stop);
        //         timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
        //         return;
        //     }
        //     else {
        //         setBitsTrue_smallstep_norepeat(bitstorage, range_start, step, range_stop);
        //         timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
        //         return;
        //     }
        // }

        setBitsTrue_largestep(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
        return;
    }
    // else if (step > 64 && step <= 108) {
    //     const counter_t range_stop_unique_vector = range_start + 256 * step;
    //     if (range_stop_unique_vector <= range_stop) {
    //         setBitsTrue_largestep_vector_uint64v4(bitstorage, range_start, step, range_stop);
    //         timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
    //         return;
    //     }
    // }
    else if (step <= 255) {
        if (step < global_largestep_faster) {
            const counter_t range_stop_unique_vector = range_start + 255 * step;
            if (range_stop_unique_vector <= range_stop) {
                setBitsTrue_largestep_vector_uint64v4(bitstorage, range_start, step, range_stop);
                timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
                return;
            }
        }
    }
 
    setBitsTrue_largestep(bitstorage, range_start, step, range_stop);
    timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
}
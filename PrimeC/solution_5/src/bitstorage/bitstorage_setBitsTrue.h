
#include "bitstorage_setBitsTrue_assemble_word.h" 
#include "bitstorage_setBitsTrue_assemble_vector.h" 

static inline void  __attribute__((always_inline, nonnull)) 
setBitsTrue(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    // verbose6(  printf("Setting bits step %3ju using setBitsTrue in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue);

    counter_t range = range_stop - range_start;
    counter_t ratio = range / step;

    if (step < 16) {
        setBitsTrue_smallstep_rotate_pair_uint16v16(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
        return;
    }

    if (step < 32) {
        setBitsTrue_smallstep_rotate_pair_uint32v16(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
        return;
    }

    if (step < 64) {
        setBitsTrue_smallstep_rotate_pair_uint64v4(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
        return;
    }

    if (step < 128) {
        // if (step < global_largestep_faster) {
            // setBitsTrue_largestep_rotate_pair_uint64v4(bitstorage, range_start, step, range_stop);
            setBitsTrue_largestep_vector_uint64v4(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        // }
    }
    if (step < 256) {
        if (step < global_largestep_faster) {
            setBitsTrue_largestep_vector_uint64v4(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
    }
    if (step <= 512) {
        if (step < global_largestep_faster) {
            setBitsTrue_largestep_vector_uint64v8(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
    }
 
    if (ratio > 512) {
        setBitsTrue_largestep_repeat_uint8_unroll8(bitstorage, range_start, step, range_stop);
        return;
    } 

    if (ratio > 32) {
        setBitsTrue_largestep_repeat_uint8(bitstorage, range_start, step, range_stop);
        return;
    } 

    setBitsTrue_largestep_norepeat_uint8(bitstorage, range_start, step, range_stop);
    timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
}

#include "bitstorage_setBitsTrue_base.h"
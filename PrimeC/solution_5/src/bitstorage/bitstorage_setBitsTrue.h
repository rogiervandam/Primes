// vector size operations
#include "bitstorage_applyMask_vector.h"
#include "bitstorage_setBItsTrue_largestep_vector.h"
#include "bitstorage_setBitsTrue_smallstep_vector.h"

// word size operations
#include "bitstorage_applyMask_word.h"
#include "bitstorage_setBitsTrue_largestep_word.h"
#include "bitstorage_setBitsTrue_smallstep_word.h"


static inline void  __attribute__((always_inline)) setBitsTrue_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // const counter_t range_stop_unique_word = range_start + WORD_SIZE_BITS * step; 
    // if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
    //     setBitsTrue_largestep_repeat(bitstorage, range_start, step, range_stop);
    //     return;
    // } 

    // const counter_t range_stop_unique_uint16 = range_start + 16 * step; 
    // if (range_stop_unique_uint16 <= range_stop) { // the range will repeat itself; try to resuse the mask
    //     setBitsTrue_largestep_repeat_uint16(bitstorage, range_start, step, range_stop);
    //     return;
    // } 

    const counter_t range_stop_unique_uint8 = range_start + 8 * step; 
    if (range_stop_unique_uint8 <= range_stop) { // the range will repeat itself; try to resuse the mask
        setBitsTrue_largestep_repeat_uint8(bitstorage, range_start, step, range_stop);
        return;
    } 

    setBitsTrue_largestep_norepeat(bitstorage, range_start, step, range_stop);
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_BITS
static inline void  __attribute__((always_inline)) setBitsTrue(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using setBitsTrue in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue);

    if (step <= VECTORWORD_SIZE_BITS) {
        if (step < global_mediumstep_faster) {
            const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_BITS * step; 
            if (range_stop_unique_vector <= range_stop) { // the vectormask will be reused
                setBitsTrue_smallstep_vector(bitstorage, range_start, step, range_stop);
                timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
                return;
            }
        }

        if (step < WORD_SIZE_BITS /2) {
            const counter_t range_stop_unique_word = range_start + WORD_SIZE_BITS * step; 
            if (range_stop_unique_word <= range_stop) { // the wordmask will be reused
                #ifdef ALGORITHM_BASE
                setBitsTrue_smallstep_repeat_base(bitstorage, range_start, step, range_stop);
                #else
                setBitsTrue_smallstep_repeat(bitstorage, range_start, step, range_stop);
                #endif
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
        return;
    }
    else if (step <= VECTOR_SIZE_BITS) {
        if (step < global_largestep_faster) {
            const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_BITS * step;
            if (range_stop_unique_vector <= range_stop) {
                setBitsTrue_largestep_vector(bitstorage, range_start, step, range_stop);
                timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
                return;
            }
        }
    }
 
    setBitsTrue_largestep(bitstorage, range_start, step, range_stop);
    timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
}

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
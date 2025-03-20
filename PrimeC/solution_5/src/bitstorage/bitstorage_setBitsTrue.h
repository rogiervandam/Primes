#define bitbucket_t uint8_t
static inline void __attribute__((always_inline)) 
setBitTrue(void* restrict bitstorage, const register counter_t index) 
{
    ((bitbucket_t*)bitstorage)[index_type(index,bitbucket_t)] |= markmask_calc_type(index, bitbucket_t);
}
#undef bitbucket_t

static inline void __attribute__((always_inline)) 
setBitsTrue_range(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    for(register counter_t index = range_start; index < range_stop; index += step) setBitTrue(bitstorage, index);
}


// vector size operations
#include "bitstorage_applyMask_vector.h"
#include "bitstorage_setBitsTrue_smallstep_vector.h"

// word size operations
#include "bitstorage_applyMask_word.h"

#define variant uint8
#include "bitstorage_setBitsTrue_norepeat.h"

#undef variant
#include "bitstorage_setBitsTrue_norepeat.h"

#undef unrolls
#define variant_base_type uint64_t 
#define variant uint64v2
#include "bitstorage_setBItsTrue_largestep.h" 
#define variant uint64v4
#include "bitstorage_setBItsTrue_largestep.h" 
#define variant uint64v8
#include "bitstorage_setBItsTrue_largestep.h" 

#undef variant_base_type
#define variant_base_type uint32_t 
// #define variant uint32v2
// #include "bitstorage_setBItsTrue_largestep.h" 
// #define variant uint32v4
// #include "bitstorage_setBItsTrue_largestep.h" 
#define variant uint32v8
#include "bitstorage_setBItsTrue_largestep.h" 

#undef variant_base_type
#define variant_base_type uint16_t 
// #define variant uint16v2
// #include "bitstorage_setBItsTrue_largestep.h" 
// #define variant uint16v4
// #include "bitstorage_setBItsTrue_largestep.h" 
#define variant uint16v8
#include "bitstorage_setBItsTrue_largestep.h" 


// create smallstep functions
#undef unrolls
#undef variant
#include "bitstorage_setBitsTrue_repeat.h"

#define unrolls 4
#define variant uint8
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint16
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint32
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint64
#include "bitstorage_setBitsTrue_repeat.h"
#undef unrolls

#define unrolls 8
#define variant uint8
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint16
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint32
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint64
#include "bitstorage_setBitsTrue_repeat.h"
#undef unrolls


static inline void  __attribute__((always_inline)) setBitsTrue_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
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
static inline void  __attribute__((always_inline)) setBitsTrue(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using setBitsTrue in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue);

    if (step <= VECTORWORD_SIZE_BITS) {
        if (step < global_mediumstep_faster) {
            const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_BITS * step; 
            if (range_stop_unique_vector <= range_stop) { // the vectormask will be reused
                setBitsTrue_smallstep_vector_rotate_pair(bitstorage, range_start, step, range_stop);
                timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
                return;
            }
        }

        if (step < WORD_SIZE_BITS /2) {
            const counter_t range_stop_unique_word = range_start + WORD_SIZE_BITS * step; 
            if (range_stop_unique_word <= range_stop) { // the wordmask will be reused
                setBitsTrue_smallstep_repeat(bitstorage, range_start, step, range_stop);
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
    else if (step > 64 && step <= 108) {
        const counter_t range_stop_unique_vector = range_start + 256 * step;
        if (range_stop_unique_vector <= range_stop) {
            setBitsTrue_largestep_vector_uint64v4(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
    }
    // else if (step <= VECTOR_SIZE_BITS) {
    //     if (step < global_largestep_faster) {
    //         const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_BITS * step;
    //         if (range_stop_unique_vector <= range_stop) {
    //             setBitsTrue_largestep_vector_uint64v2(bitstorage, range_start, step, range_stop);
    //             timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
    //             return;
    //         }
    //     }
    // }
 
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
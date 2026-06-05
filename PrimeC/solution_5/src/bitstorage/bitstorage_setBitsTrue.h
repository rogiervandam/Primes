// assemble the word and vector functions
// these will make differt versions of themselves for different types of bitstorage
# pragma once

#include "bitstorage_setBitsTrue_setBit.h"
#include "bitstorage_setBitsTrue_applyMask.h"
#include "bitstorage_setBitsTrue_applyMask_pair.h"
#include "bitstorage_setBitsTrue_applyMask_mmask.h"
#include "bitstorage_setBitsTrue_largestep_norepeat.h"
#include "bitstorage_setBitsTrue_largestep_vector.h"
#include "bitstorage_setBitsTrue_largestep_repeat.h"
#include "bitstorage_setBitsTrue_smallstep_rotate_pair.h" 

#define ratio1 80
#define ratio2 40

// Function to dispatch the correct setBitsTrue function based on the step size and occurrences
static inline void  __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
setBitsTrue_v128(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    if (1==0) {}
    else if (step  <  64)  setBitsTrue_smallstep_rotate_pair_uint64v2_unroll8(bitstorage, range_start, range_stop, step); 
    else if (step  < 128 && step < global_largestep_faster)  setBitsTrue_largestep_vector_uint64v2_unroll4(bitstorage, range_start, range_stop, step); 
    else if (step  < 256 && step < global_largestep_faster)  setBitsTrue_largestep_vector_uint64v4_unroll4(bitstorage, range_start, range_stop, step); 
    else {
        const counter_t range = range_stop - range_start, ratio = range / step;
        if  (1==0) {}
        else if (ratio > ratio1) { setBitsTrue_largestep_repeat_uint8_unroll8   (bitstorage, range_start, range_stop, step); } 
        else if (ratio > ratio2) { setBitsTrue_largestep_repeat_uint8_unroll4   (bitstorage, range_start, range_stop, step); } 
        else                       setBitsTrue_largestep_norepeat_uint8_unroll4 (bitstorage, range_start, range_stop, step);
    }
}

// Function to dispatch the correct setBitsTrue function based on the step size and occurrences
static inline void  __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
setBitsTrue_v256(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    if (step < 64) {
        setBitsTrue_smallstep_rotate_pair_uint64v4_unroll8 (bitstorage, range_start, range_stop, step); 
        return;
    }
    else
    if (step  < 256 && step < global_largestep_faster)  { 
        setBitsTrue_largestep_vector_uint64v4_unroll4(bitstorage, range_start, range_stop, step); 
        return; 
    }
    else {
        const counter_t range = range_stop - range_start, ratio = range / step;
        if  (1==0) {}
        else if (ratio > ratio1) { setBitsTrue_largestep_repeat_uint8_unroll8   (bitstorage, range_start, range_stop, step); } 
        else if (ratio > ratio2) { setBitsTrue_largestep_repeat_uint8_unroll4   (bitstorage, range_start, range_stop, step); } 
        else                       setBitsTrue_largestep_norepeat_uint8_unroll4 (bitstorage, range_start, range_stop, step);
    }
}

// Function to dispatch the correct setBitsTrue function based on the step size and occurrences
static inline void  __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
setBitsTrue_v512(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    if (1==0) {}
    else if (step  <  64)  setBitsTrue_smallstep_rotate_pair_uint64v8_unroll4 (bitstorage, range_start, range_stop, step); 
    else if (step  < 512 && step < global_largestep_faster)  setBitsTrue_largestep_vector_uint64v8_unroll8(bitstorage, range_start, range_stop, step); 
    else {
        const counter_t range = range_stop - range_start, ratio = range / step;
        if  (1==0) {}
        else if (ratio > ratio1) { setBitsTrue_largestep_repeat_uint8_unroll8   (bitstorage, range_start, range_stop, step); } 
        else if (ratio > ratio2) { setBitsTrue_largestep_repeat_uint8_unroll4   (bitstorage, range_start, range_stop, step); } 
        else                       setBitsTrue_largestep_norepeat_uint8_unroll4 (bitstorage, range_start, range_stop, step);
    }
}

static inline void  __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
setBitsTrue(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logStart6(bitstorage, time_setBitsTrue, "SetBitsTrue: setting bits step %3ju in %ju bit range (%ju-%ju) with %ju bits to set", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step));
    switch(global_vectorsize) {
        case 128: setBitsTrue_v128 (bitstorage, range_start, range_stop, step); break;
        case 256: setBitsTrue_v256 (bitstorage, range_start, range_stop, step); break;
        case 512: setBitsTrue_v512 (bitstorage, range_start, range_stop, step); break;
    }
    logStop6(bitstorage, time_setBitsTrue, "SetBitsTrue: finished setting bits step %3ju in %ju bit range (%ju-%ju) with %ju bits to set", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step));
}


#include "bitstorage_setBitsTrue_assemble_word.h" 
#include "bitstorage_setBitsTrue_assemble_vector.h" 

static inline void  __attribute__((always_inline, nonnull)) 
setBitsTrue(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{

    if      (step  <  16)  setBitsTrue_smallstep_rotate_pair_uint16v16(bitstorage, range_start, step, range_stop);
    else if (step  <  32)  setBitsTrue_smallstep_rotate_pair_uint32v16(bitstorage, range_start, step, range_stop);
    else if (step  <  64)  setBitsTrue_smallstep_rotate_pair_uint64v4 (bitstorage, range_start, step, range_stop); 
    else if (step  < 128)  setBitsTrue_largestep_vector_uint64v4      (bitstorage, range_start, step, range_stop); 
    else {
        const counter_t range = range_stop - range_start, ratio = range / step;
        if      (ratio > 512) { setBitsTrue_largestep_repeat_uint8_unroll8 (bitstorage, range_start, step, range_stop);   } 
        else if (ratio >  32) { setBitsTrue_largestep_repeat_uint8         (bitstorage, range_start, step, range_stop);   } 
        else                    setBitsTrue_largestep_norepeat_uint8       (bitstorage, range_start, step, range_stop);
    }
}

#include "bitstorage_setBitsTrue_base.h"
#define unrolls 4 
#define variant uint8 
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint16
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint32
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint64
#include "bitstorage_setBitsTrue_largestep_body.h"
#undef unrolls

#define unrolls 8   
#define variant uint8 
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint16
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint32
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint64
#include "bitstorage_setBitsTrue_largestep_body.h"
#undef unrolls

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
        bitstorage[wordindex(index           )] |= markmask(index);
        bitstorage[wordindex(index + step    )] |= markmask(index + step );
    }

    for (counter_t i=2; i-- && index < range_stop; index += step) 
        setBitTrue(bitstorage, index);
        // bitstorage[wordindex(index)] |= markmask(index);

    if unlikely(index==range_stop)
        bitstorage[wordindex(index)] |= markmask(index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}
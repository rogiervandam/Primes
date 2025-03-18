static inline void __attribute__((always_inline)) setBitsTrue_largestep_norepeat_unroll4(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using largestep-norepeat in %ju bit range (%ju-%ju)  (%ju unique occurances)..", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_largestep_norepeat);

    const counter_t step_4 = step * 4;
    #if is_signed(counter_t)
    const counter_t loop_stop = range_stop - step_4;
    #else
    const counter_t loop_stop = (range_stop > step_2) ? range_stop - step_2 : 0;
    #endif
    register counter_t index = range_start;

    #pragma GCC ivdep
    for (; index < loop_stop; index += step_4) {
        bitstorage[wordindex(index           )] |= markmask(index);
        bitstorage[wordindex(index + step    )] |= markmask(index + step );
        bitstorage[wordindex(index + step * 2)] |= markmask(index + step * 2);
        bitstorage[wordindex(index + step * 3)] |= markmask(index + step * 3);
    }

    for (counter_t i=4; i-- && index < range_stop; index += step) 
        bitstorage[wordindex(index)] |= markmask(index);

    if unlikely(index==range_stop)
        bitstorage[wordindex(index)] |= markmask(index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}


// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
// doing this multiple times on the same word is likely to have the cache still ready
static inline void __attribute__((always_inline)) setBitsTrue_smallstep_repeat_base(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + WORD_SIZE_BITS * step;

    verbose6( printf("Setting bits step %3ju using smallstep-repeat in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*WORD_SIZE_BITS))); )
    timer_lapstart(time_setBitsTrue_smallstep_repeat);

    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_word = wordindex(index);                        // set index_word here because the for loop will change index
        for(register const counter_t index_word_start = wordstart(index); wordstart(index) == index_word_start; index += step) {
            register bitword_t mask = markmask(index);
            applyMask_word(bitstorage, step, range_stop, mask, index_word);
        }
    }

    timer_laptime(time_setBitsTrue_smallstep_repeat); verbose6( printf("\n"); )
}


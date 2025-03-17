// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// By joining the masks and then writing to memory, we might save some time.
// This is especially true for small steps over long ranges
// but it needs tuning, because there is some overhead of checking if the next step is in the same word
// this is *NOT* BASE ALGORITHM COMPLIANT: some bits are set together
static inline void __attribute__((always_inline)) setBitsTrue_smallstep_repeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + WORD_SIZE_BITS * step;

    verbose6( printf("Setting bits step %3ju using smallstep-repeat in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*WORD_SIZE_BITS))); )
    timer_lapstart(time_setBitsTrue_smallstep_repeat);

    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_word = wordindex(index);                        // set index_word here because the for loop will change index
        register bitword_t mask = SAFE_ZERO;
        for(register const counter_t index_word_start = wordstart(index); wordstart(index) == index_word_start; index += step) mask |= markmask(index);
        applyMask_word(bitstorage, step, range_stop, mask, index_word);
    }

    timer_laptime(time_setBitsTrue_smallstep_repeat); verbose6( printf("\n"); )
}

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

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// if we know that the mask will not repeat, we can save some time by not checking
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void  __attribute__((always_inline)) setBitsTrue_smallstep_norepeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using smallstep-norepeat in %ju bit range (%ju-%ju)  (%ju unique occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_smallstep_norepeat);

    for (register counter_t index = range_start; index < range_stop;) {
        register const counter_t index_word = wordindex(index);                    // set index_word here because the for loop will change index
        register bitword_t mask = SAFE_ZERO;
        for(; wordindex(index) == index_word; index += step) mask |= markmask(index);
        bitstorage[index_word] |= mask;
    }
    timer_laptime(time_setBitsTrue_smallstep_norepeat); verbose6( printf("\n"); )
}

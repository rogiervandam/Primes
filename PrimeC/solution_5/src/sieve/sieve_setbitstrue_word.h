// apply the same word mask at large ranges
// manually unlooped - this here is where the main speed increase comes from
// idea from PrimeRust/solution_1 by Michael Barber 
static inline void __attribute__((always_inline)) applyMask_word(bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitword_t mask, const counter_t index_word) 
{
    verbose8( printf("Applying mask %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_word);

    register bitword_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage[index_word], sizeof(bitword_t));

    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    register const counter_t step_4 = step << 2;

    const counter_t range_stop_word = wordindex(range_stop);

    // register const counter_t step_8 = step << 3;
    // register const bitword_t* restrict fast_loop_ptr8 = __builtin_assume_aligned(&bitstorage[((range_stop_word>step_8) ? (range_stop_word - step_8):0)], sizeof(bitword_t));

    // #pragma GCC ivdep
    // while (index_ptr < fast_loop_ptr8) {
    //     // __builtin_prefetch(index_ptr + step_4, 1, 3); // prefetch the memory that will be written soon
    //     *index_ptr            |= mask; 
    //     *(index_ptr + step  ) |= mask; 
    //     *(index_ptr + step_2) |= mask; 
    //     *(index_ptr + step_3) |= mask; 
    //     *(index_ptr + step_4         ) |= mask; 
    //     *(index_ptr + step_4 + step  ) |= mask; 
    //     *(index_ptr + step_4 + step_2) |= mask; 
    //     *(index_ptr + step_4 + step_3) |= mask; 
    //     index_ptr += step_8;
    // }

    register const bitword_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage[((range_stop_word>step_4) ? (range_stop_word - step_4):0)], sizeof(bitword_t));
    #pragma GCC ivdep
    while (index_ptr < fast_loop_ptr) {
        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask; 
        index_ptr += step_4;
    }

    register const bitword_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[range_stop_word], sizeof(bitword_t));
    for (counter_t i=5; i-- && (index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_word); verbose8( printf("\n"); )
}

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// By joining the masks and then writing to memory, we might save some time.
// This is especially true for small steps over long ranges
// but it needs tuning, because there is some overhead of checking if the next step is in the same word
static inline void __attribute__((always_inline)) setBitsTrue_smallstep_repeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + WORD_SIZE_counter * step;

    verbose6( printf("Setting bits step %3ju using smallstep-repeat in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*WORD_SIZE_counter))); )
    timer_lapstart(time_setBitsTrue_smallstep_repeat);

    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_word = wordindex(index);                        // set index_word here because the for loop will change index
        register bitword_t mask = SAFE_ZERO;
        for(register const counter_t index_word_start = wordstart(index); wordstart(index) == index_word_start; index += step) mask |= markmask(index);
        applyMask_word(bitstorage, step, range_stop, mask, index_word);
    }

    timer_laptime(time_setBitsTrue_smallstep_repeat); verbose6( printf("\n"); )
}

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// is we know that the mask will not repeat, we can save some time by not checking
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

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
static inline void  __attribute__((always_inline)) setBitsTrue_largestep_repeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + WORD_SIZE_counter * step;
    verbose6(  printf("Setting bits step %3ju using largestep-repeat in %ju bit range (%ju-%ju)  (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(WORD_SIZE_counter*step))); )
    timer_lapstart(time_setBitsTrue_largestep_repeat);

    for (register counter_t index = range_start; index < range_stop_unique; index += step) {
        applyMask_word(bitstorage, step, range_stop, markmask(index), wordindex(index));
    }
    timer_laptime(time_setBitsTrue_largestep_repeat); verbose6( printf("\n"); )
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
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
        bitstorage[wordindex(index         )] |= markmask(index);
        bitstorage[wordindex(index + step  )] |= markmask(index + step  );
    }

    for (counter_t i=2; i-- && index < range_stop; index += step) 
        bitstorage[wordindex(index)] |= markmask(index);

    if unlikely(index==range_stop)
        bitstorage[wordindex(index)] |= markmask(index);

    timer_laptime(time_setBitsTrue_largestep_norepeat); verbose6( printf("\n"); )
}
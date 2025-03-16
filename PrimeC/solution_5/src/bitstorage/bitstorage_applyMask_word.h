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

static inline void __attribute__((always_inline)) applyMask_uint16(bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint16_t mask, const counter_t index_word) 
{
    uint16_t* restrict bitstorage_uint16 = (uint16_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);

    verbose8( printf("Applying mask %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_word);

    register uint16_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage_uint16[index_word], sizeof(uint16_t));
    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    register const counter_t step_4 = step << 2;
    const counter_t range_stop_word = range_stop >> 4;

    register const uint16_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage_uint16[((range_stop_word>step_4) ? (range_stop_word - step_4):0)], sizeof(uint16_t));
    #pragma GCC ivdep
    while (index_ptr < fast_loop_ptr) {
        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask; 
        index_ptr += step_4;
    }

    register const uint16_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage_uint16[range_stop_word], sizeof(uint16_t));
    for (counter_t i=5; i-- && (index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_word); verbose8( printf("\n"); )
}

// static inline void __attribute__((always_inline)) applyMask_uint8(bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint8_t mask, const counter_t index_word) 
// {
//     uint8_t* restrict bitstorage_uint8 = (uint8_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);

//     verbose8( printf("Applying mask %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); )
//     timer_lapstart(time_applyMask_word);

//     register uint8_t* restrict index_ptr = &bitstorage_uint8[index_word];
//     register const counter_t step_2 = step << 1;
//     register const counter_t step_3 = step_2 + step;
//     register const counter_t step_4 = step << 2;
//     const counter_t range_stop_word = range_stop >> 4;

//     register const uint8_t* restrict fast_loop_ptr = &bitstorage_uint8[((range_stop_word>step_4) ? (range_stop_word - step_4):0)];
//     #pragma GCC ivdep
//     while (index_ptr < fast_loop_ptr) {
//         *index_ptr            |= mask; 
//         *(index_ptr + step  ) |= mask; 
//         *(index_ptr + step_2) |= mask; 
//         *(index_ptr + step_3) |= mask; 
//         index_ptr += step_4;
//     }

//     register const uint8_t* restrict range_stop_ptr = (&bitstorage_uint8[range_stop_word]);
//     for (counter_t i=5; i-- && (index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
//         *index_ptr |= mask; 
//     }

//     timer_laptime(time_applyMask_word); verbose8( printf("\n"); )
// }
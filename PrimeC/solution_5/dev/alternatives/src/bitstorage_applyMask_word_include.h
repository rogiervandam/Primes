// apply the same word mask at large ranges
// manually unlooped - this here is where the main speed increase comes from
// idea from PrimeRust/solution_1 by Michael Barber 

// This header would be included multiple times with different defines
#ifndef FUNCTION_NAME
#error "FUNCTION_NAME must be defined before including this header"
#endif


#ifndef BITWORD_SIZED
#error "BITWORD_SIZED must be defined before including this header"
#endif

#ifndef BITWORD_SIZED_SHIFT
#error "BITWORD_SIZED_SHIFT must be defined before including this header"
#endif

#ifndef UNROLL_COUNT
#define UNROLL_COUNT 4
#endif

#define FUNC_NAME_HELPER(name) applyMask_##name
#define FUNC_NAME(name)  FUNC_NAME_HELPER(name)

static inline void __attribute__((always_inline)) FUNC_NAME(FUNCTION_NAME)(
        bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, 
    const BITWORD_SIZED mask, const counter_t index_word) 
{
    BITWORD_SIZED* restrict bitstorage_sized = (BITWORD_SIZED*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    
    verbose8( printf("Applying mask-##BITWORD_SIZED## %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_word);
    
    register BITWORD_SIZED* restrict index_ptr = &bitstorage_sized[index_word];
    const counter_t range_stop_word = range_stop >> BITWORD_SIZED_SHIFT;
    
    register const BITWORD_SIZED* restrict fast_loop_ptr = __builtin_assume_aligned(
        &bitstorage_sized[((range_stop_word > step * UNROLL_COUNT) ? 
        (range_stop_word - step * UNROLL_COUNT):0)], sizeof(BITWORD_SIZED));
    
    #pragma GCC ivdep
    while (index_ptr < fast_loop_ptr) {
        for (counter_t i=0; i<UNROLL_COUNT; i++) {
            *(index_ptr + step * i) |= mask; 
        }
        index_ptr += step * UNROLL_COUNT;
    }
    
    register const BITWORD_SIZED* restrict range_stop_ptr = (&bitstorage_sized[range_stop_word]);
    for (counter_t i=UNROLL_COUNT+1; i-- && (index_ptr <= range_stop_ptr); index_ptr += step) {
        *index_ptr |= mask; 
    }
    
    timer_laptime(time_applyMask_word); verbose8( printf("\n"); )
}

#undef FUNCTION_NAME
#undef BITWORD_SIZED
#undef BITWORD_SIZED_SHIFT
#undef UNROLL_COUNT
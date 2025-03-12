// same as word mask, but at a vector level - uses the sse/avx extensions, hopefully
static inline void __attribute__((always_inline)) applyMask_vector(bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitvector_t *mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = vectorindex(range_stop);
   
    register const counter_t step_4 = step << 2;
    register bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(bitvector_t));
    #if is_signed(counter_t)
    register bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(bitvector_t));
    #else
    register bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(bitvector_t));
    #endif

    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    
    #pragma GCC ivdep
    while likely(index_ptr < fast_loop_ptr) {
        *index_ptr            |= *mask; 
        *(index_ptr + step  ) |= *mask; 
        *(index_ptr + step_2) |= *mask; 
        *(index_ptr + step_3) |= *mask; 
        index_ptr += step_4;
    }
    
    register const bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(bitvector_t));
    
    for (counter_t i=4; i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        // __builtin_prefetch(index_ptr + step, 1, 3); // prefetch the memory that will be written soon
        *index_ptr |= *mask; 
    }

    // doing this instead of index_ptr <= above is faster. unexplained. 
    if (index_ptr == range_stop_ptr) {
        *index_ptr |= *mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

// smallstep (< WORD_SIZE ) means the same vectormask can be reused
// THe vectormask can be build by extending the WORD size mask
// TODO: check loop unrolling this
static inline void __attribute__((always_inline)) create_mask_vector_smallstep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    verbose7(  { const counter_t range_stop_unique = min(range_start + step * VECTOR_SIZE_counter, range_stop);
        printf("..Setting bits step %3ju using create_mask_vector_smallstep in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps starting at %ju)", 
        (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_counter*step)), (uintmax_t)range_stop_unique ); })
    timer_lapstart(time_create_mask_vector_smallstep);

    register bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    __builtin_prefetch(&bitstorage_vector[vectorindex(range_start)], 1, 3); // prefetch the memory that will be written soon while creating mask

    register const bitshift_t step_shift = vector_bitindex_calc(step); // to enable the compiler to optimize the shift
    register bitshift_t pattern_size = step_shift;
    register bitword_t pattern = BITVECTORWORD_SHIFTBIT;
    while (pattern_size <= VECTORWORD_SIZE_bitshift) {
        pattern |= vector_markmask(pattern_size);
        pattern_size += step_shift;
    }

    const bitshift_t shift = vector_bitindex_calc(range_start); 
    const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_bitshift;

    const bitvector_t shift_base_vector = VECTOR_BASE(shift);
    const bitvector_t vector_byteindex = VECTOR_BYTEINDEX;
    const bitvector_t pattern_wordshift_vector = VECTOR_BASE(pattern_wordshift) * vector_byteindex;
    const bitvector_t step_vector = VECTOR_BASE(step);
    const bitvector_t quadmask_base = VECTOR_BASE(pattern);
    const bitvector_t shift_vector = shift_base_vector + pattern_wordshift_vector;
    const bitvector_t shift_vector_minimal = shift_vector % step_vector;
    bitvector_t quadmask = quadmask_base << shift_vector_minimal;

    // shorter alternative; maybe just as fast
    // bitvector_t quadmask = VECTOR_BASE(pattern);
    // for (counter_t i=0; i<VECTOR_ELEMENTS; i++) {
    //     bitword_vector_t totalshift = (shift + pattern_wordshift * i);
    //     while (totalshift >= step) totalshift -= step;
    //     quadmask[i] = quadmask[i] << totalshift;
    // }

    register const bitword_vector_t pattern_vectorshift = (bitword_vector_t) (((pattern_size - VECTORWORD_SIZE_bitshift) * (bitshift_t)VECTOR_ELEMENTS) % step_shift) & VECTORWORDMASK;
    const counter_t range_stop_unique_vector = min(range_start + step * VECTOR_SIZE_counter, range_stop);
    register const counter_t vector_max = vectorindex(range_stop_unique_vector);
    // debug_hits += debug_final_plan;
    for (counter_t current_vector = vectorindex(range_start); current_vector < vector_max; current_vector++) {
        // debug_hits += debug_final_benchmarking;
        applyMask_vector(bitstorage_vector, step, range_stop, &quadmask, current_vector);
        quadmask = (quadmask << pattern_vectorshift) | (quadmask >> (step_shift - pattern_vectorshift));
    }
    timer_laptime(time_create_mask_vector_smallstep); 
}

// Largestep (> WORD_SIZE and < VECTOR_SIZE) means the same vectormask can be reused
static inline void __attribute__((always_inline)) create_mask_vector_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    verbose6(  printf("..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_create_mask_vector_largestep);

    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_counter * step; 
    counter_t current_vector = vectorindex(range_start);
    for (counter_t index = range_start; index < range_stop_unique_vector;) {
        const counter_t current_vector_start = vectorstart(index);
        bitvector_t quadmask = VECTOR_BASE(SAFE_ZERO);
        for (counter_t i=0; i<VECTOR_ELEMENTS; i++) {
            if (vector_wordstart(index) == (current_vector_start + (VECTORWORD_SIZE_counter*i))) {
                quadmask[i] = markmask_calc(  index); // TODO: this was sensitive to wordsize. vector_markmask(index) didnt work; markmask_calc(index) worked
                index += step;
            }
        }

        // use mask on all n*step multiples
        applyMask_vector(bitstorage_vector, step, range_stop, &quadmask, current_vector);
        current_vector++;
    }
    timer_laptime(time_create_mask_vector_largestep); 
}

static inline void __attribute__((always_inline)) setBitsTrue_largestep_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_vectorstep in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

    const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_counter; // find next vector
    register counter_t range_start_new = range_start; // not in the inner loop because we want to use the value after the loop

    for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
        bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
    }

    // setBitsTrue_largestep_norepeat(bitstorage, range_start_new, step, range_stop);
    create_mask_vector_largestep(bitstorage, range_start_new, step, range_stop);
    timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
}

static inline void __attribute__((always_inline)) setBitsTrue_smallstep_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_word in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_wordstep);

    const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_counter; // find next vector

    register counter_t range_start_new = range_start;
    for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
        bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
    }

    // const counter_t range_stop_unique_vector = range_start_new + VECTOR_SIZE_counter * step; 
    // verbose7(  printf("..building masks with size %ju < %ju in range %ju-%ju with %ju bit vectors\n", (uintmax_t)step, (uintmax_t) WORD_SIZE_counter, (uintmax_t)range_start_new,  (uintmax_t)range_stop, (uintmax_t)VECTOR_SIZE_counter); )

    if (range_start_new > range_stop) return;
    create_mask_vector_smallstep(bitstorage, range_start_new, step, range_stop);

    timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
}


// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_counter
static inline void  __attribute__((always_inline)) setBitsTrue(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using setBitsTrue in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector);

    if (step <= VECTORWORD_SIZE_counter) {

        if (step < global_mediumstep_faster) {
            const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_counter * step; 
            if (range_stop_unique_vector <= range_stop) { // the vectormask will be reused
                setBitsTrue_smallstep_vector(bitstorage, range_start, step, range_stop);
                timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
                return;
            }
        }

        const counter_t range_stop_unique_word = range_start + WORD_SIZE_counter * step; 
        if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_smallstep_repeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
            return;
        } 
        else {
            setBitsTrue_smallstep_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
            return;
        }
    }
    else if (step <= VECTOR_SIZE_counter) {
        // setBitsTrue_largestep_vector_vectorstep(bitstorage, range_start, step, range_stop);

        if (step < global_largestep_faster) {
            const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_counter * step;
            if (range_stop_unique_vector <= range_stop) {
                setBitsTrue_largestep_vector(bitstorage, range_start, step, range_stop);
                timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
                return;
            }
        }
        const counter_t range_stop_unique_word = range_start + WORD_SIZE_counter * step; 
        if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_largestep_repeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
            return;
        } 
        else {
            setBitsTrue_largestep_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
            return;
        }
    }
    else {
        const counter_t range_stop_unique_word = range_start + WORD_SIZE_counter * step; 
        if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_largestep_repeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
            return;
        } 
        else {
            setBitsTrue_largestep_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
            return;
        }
    }

    timer_laptime(time_setBitsTrue_largestep_vector); verbose7( printf("\n"); )
}
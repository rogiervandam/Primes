// same as word mask, but at a vector level - uses the sse/avx extensions, hopefully
static inline void __attribute__((always_inline)) applyMask_vector(bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitvector_t mask, counter_t index_vector) 
{
    verbose5( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_word);

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
        __builtin_prefetch(index_ptr + step_4, 1, 3); // prefetch the memory that will be written soon
        // __builtin_prefetch(index_ptr + step_4 + step, 1, 3); // prefetch the memory that will be written soon
        // __builtin_prefetch(index_ptr + step_4 + step * 2, 1, 3); // prefetch the memory that will be written soon
        // __builtin_prefetch(index_ptr + step_4 + step * 3, 1, 3); // prefetch the memory that will be written soon
        // *index_ptr |= mask; index_ptr += step;
        // *index_ptr |= mask; index_ptr += step;
        // *index_ptr |= mask; index_ptr += step;
        // *index_ptr |= mask; index_ptr += step;

        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask; 
        index_ptr += step_4;
    }
    
    register const bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(bitvector_t));
    
    for (counter_t i=4; i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        __builtin_prefetch(index_ptr + step, 1, 3); // prefetch the memory that will be written soon
        *index_ptr |= mask; 
    }

    // doing this instead of index_ptr <= above is faster. unexplained. 
    if (index_ptr == range_stop_ptr) {
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_word); verbose5( printf("\n"); )
}

// Smallstep (< WORD_SIZE ) means the same vectormask can be reused
// THe vectormask can be build by extending the WORD size mask
// TODO: check loop unrolling this
static inline void create_mask_vector_smallstep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    verbose5(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using create_mask_vector_smallstep (%ju occurances; %ju stamps)", 
        (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    timer_lapstart(time_create_mask_vector_smallstep);

    register bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);

    const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
    register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
    bitshift_t pattern_size = (bitshift_t) step;
    register const bitshift_t step_shift = (bitshift_t) step; // to enable the compiler to optimize the shift

    if (pattern_size < (VECTORWORD_SIZE_bitshift >> 2)) {
        pattern |= (pattern_base << step_shift) | (pattern_base << step_shift*2) | (pattern_base << step_shift*3);
        pattern_size = step_shift << 2;
    }
    for (; pattern_size <= VECTORWORD_SIZE_bitshift; pattern_size += step_shift) pattern |= (pattern_base << pattern_size);

    const bitshift_t shift = (bitshift_t) vector_bitindex_calc(range_start); 
    const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_bitshift;
    const bitvector_t shift_base_vector = VECTOR_BASE(shift);
    const bitvector_t vector_byteindex = VECTOR_BYTEINDEX;
    const bitvector_t pattern_wordshift_vector = VECTOR_BASE(pattern_wordshift) * vector_byteindex;
    const bitvector_t step_vector = VECTOR_BASE(step);
    const bitvector_t quadmask_base = VECTOR_BASE(pattern);
    const bitvector_t shift_vector = shift_base_vector + pattern_wordshift_vector;
    const bitvector_t shift_vector_minimal = shift_vector % step_vector;

    register bitvector_t quadmask = quadmask_base << shift_vector_minimal;
    register const bitshift_t pattern_vectorshift = ((pattern_size - VECTORWORD_SIZE_bitshift) * (bitshift_t)VECTOR_ELEMENTS) % step_shift;
    register const counter_t vector_max = vectorindex(range_stop_unique);
    for (counter_t current_vector = vectorindex(range_start); current_vector < vector_max; current_vector++) {
        // debug_hits += debug_final_benchmarking;
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        quadmask = (quadmask << pattern_vectorshift) | (quadmask >> (step_shift - pattern_vectorshift));
    }
    timer_laptime(time_create_mask_vector_smallstep); verbose5( printf("\n"); )
}

// Largestep (> WORD_SIZE and < VECTOR_SIZE) means the same vectormask can be reused
static inline void __attribute__((always_inline)) create_mask_vector_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    verbose5(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using create_mask_vector_largestep (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_create_mask_vector_smallstep);

    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    counter_t current_vector = vectorindex(range_start);
    for (counter_t index = range_start; index < range_stop_unique;) {
        const counter_t current_vector_start = vectorstart(index);
        bitvector_t quadmask = VECTOR_BASE(SAFE_ZERO);
        // #pragma GCC ivdep
        for (counter_t i=0; i<VECTOR_ELEMENTS; i++) {
            if (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter*i))) {
                quadmask[i] = vector_markmask(index);
                index += step;
            }
        }

        // use mask on all n*step multiples
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        current_vector++;
    }

    timer_laptime(time_create_mask_vector_smallstep); verbose5( printf("\n"); )
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_counter
static inline void  __attribute__((always_inline)) setBitsTrue_largeRange_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose5(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange vector (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    timer_lapstart(time_setBitsTrue_largeRange_vector);

    verbose5(  printf("\n..Going to the start %ju of the next vector %ju",(uintmax_t)vectorstart(range_start) + VECTOR_SIZE_counter); ) 

    if (step <= VECTORWORD_SIZE_counter) {
        const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_counter; // find next vector
        const counter_t range_start_new = setBitsTrue_smallStep_norepeat(bitstorage, range_start, step, range_start_nexttvector);
        const counter_t range_stop_unique_vector = range_start_new + VECTOR_SIZE_counter * step; 
        verbose5(  printf("..building masks with size %ju < %ju in range %ju-%ju with %ju bit vectors", (uintmax_t)step, (uintmax_t) WORD_SIZE_counter, (uintmax_t)range_start_new, (uintmax_t)range_stop_unique_vector, (uintmax_t)VECTOR_SIZE_counter); )
        // create_mask_vector_smallstep_totalshift(bitstorage, range_start, step, range_stop_unique, range_stop);
        // create_mask_vector_smallstep_newpattern(bitstorage, range_start, step, range_stop_unique, range_stop);
        create_mask_vector_smallstep(bitstorage, range_start_new, step, range_stop_unique_vector, range_stop);
        timer_laptime(time_setBitsTrue_largeRange_vector); verbose5( printf("\n"); )
        return;
    }

    if (step <= VECTOR_SIZE_counter) {
        const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_counter; // find next vector
        register counter_t range_start_new = setBitsTrue_smallStep_norepeat(bitstorage, range_start, step, range_start_nexttvector);
            const counter_t range_stop_unique_vector = range_start_new + VECTOR_SIZE_counter * step; 
        if (range_stop_unique_vector <= range_stop) {
            verbose5(  printf("..building masks in range %ju-%ju with %ju bit vectors", (uintmax_t)range_start_new, (uintmax_t)range_stop_unique_vector, (uintmax_t)VECTOR_SIZE_counter); )
            create_mask_vector_largestep(bitstorage, range_start_new, step, range_stop_unique_vector, range_stop);
            timer_laptime(time_setBitsTrue_largeRange_vector); verbose5( printf("\n"); )
            return;
        }
    }

    const counter_t range_stop_unique_word = range_start + WORD_SIZE_counter * step;
    verbose5( printf("\n..Vector will not repeat. Changing methods..\n"); )
    if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
        setBitsTrue_largeRange_repeat(bitstorage, range_start, step, range_stop);
    } else {
        setBitsTrue_largeRange_norepeat(bitstorage, range_start, step, range_stop);
    }

    timer_laptime(time_setBitsTrue_largeRange_vector); verbose5( printf("\n"); )
}
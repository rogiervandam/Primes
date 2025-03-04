// TODO: test if we can just shift the shiftmask in the second iteration instead of creating a new one
// TODO: explore __builtin_shufflevector 

static inline void __attribute__((always_inline)) create_mask_vector_smallstep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);

    const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
    register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
    bitshift_t pattern_size = (bitshift_t) step;
    const bitshift_t step_shift = (bitshift_t) step; // to enable the compiler to optimize the shift

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
    register bitvector_t quadmask = quadmask_base << (shift_base_vector + pattern_wordshift_vector) % step_vector;
    const bitshift_t pattern_vectorshift = ((pattern_size - VECTORWORD_SIZE_bitshift) * (bitshift_t)VECTOR_ELEMENTS) % step_shift;
    const counter_t vector_max = vectorindex(range_stop_unique);
    for (counter_t current_vector = vectorindex(range_start); current_vector < vector_max; current_vector++) {
        // debug_hits += debug_final_benchmarking;
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        quadmask = (quadmask << pattern_vectorshift) | (quadmask >> (step_shift - pattern_vectorshift));
    }
}

static inline void __attribute__((always_inline)) create_mask_vector_smallstep_recalc(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);

    const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
    register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
    bitshift_t pattern_size = (bitshift_t) step;
    const bitshift_t step_shift = (bitshift_t) step; // to enable the compiler to optimize the shift

    if (pattern_size < (VECTORWORD_SIZE_bitshift >> 2)) {
        pattern |= (pattern_base << step_shift) | (pattern_base << step_shift*2) | (pattern_base << step_shift*3);
        pattern_size = step_shift << 2;
    }
    for (; pattern_size <= VECTORWORD_SIZE_bitshift; pattern_size += step_shift) pattern |= (pattern_base << pattern_size);

    const bitshift_t shift = (bitshift_t) vector_bitindex_calc(range_start); 
    const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_bitshift;
    const bitvector_t shift_base_vector = VECTOR_BASE(shift);
    const bitvector_t vector_byteindex = VECTOR_BYTEINDEX;
    const bitvector_t pattern_wordshift_vector = VECTOR_BASE(pattern_wordshift);
    const bitvector_t pattern_wordshift_vector_plus = pattern_wordshift_vector * vector_byteindex;
    const bitvector_t step_vector = VECTOR_BASE(step);
    const bitvector_t quadmask_base = VECTOR_BASE(pattern);
    const bitshift_t pattern_vectorshift = ((pattern_size - VECTORWORD_SIZE_bitshift) * (bitshift_t)VECTOR_ELEMENTS) % step_shift;
    const bitvector_t pattern_vecorshift_vector = VECTOR_BASE(pattern_vectorshift);

    const counter_t range_startvector = vectorindex(range_start);
    const counter_t index_vector_max = vectorindex(range_stop_unique) - range_startvector;

    #pragma GCC ivdep
    for (counter_t index_vector = 0; index_vector < index_vector_max; index_vector++) {
        const bitvector_t quadmask = quadmask_base << ((shift_base_vector + (index_vector * pattern_vecorshift_vector) + pattern_wordshift_vector_plus) % step_vector);
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, range_startvector + index_vector);
    }
}
static inline void __attribute__((always_inline)) create_mask_vector_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
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
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
static inline void  __attribute__((always_inline)) setBitsTrue_largeRange_vector(bitword_t* restrict bitstorage, const counter_t range_start_original, const counter_t step, const counter_t range_stop) 
{
    verbose4(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange vector (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start_original,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    verbose4( timerLapStart(); )

    const counter_t range_start_atvector = vectorstart(range_start_original);
    register counter_t range_start = range_start_original;

    if likely(( range_start_atvector + step) < range_start_original) { // not the first step possible in this vector - would give incomplete copies
        verbose4(  printf("\n..Range start %ju not at start of vector %ju\n",(uintmax_t)range_start, (uintmax_t)range_start_atvector); ) 

        const counter_t range_start_nexttvector = range_start_atvector + VECTOR_SIZE_counter; // find next vector
        if (unlikely(range_start_nexttvector > range_stop)) { // we should not be here; just handle without vector
            // #pragma GCC ivdep
            for (counter_t index = range_start_original; index <= range_stop; index += step) 
                bitstorage[wordindex(index)] |= markmask(index);
            verbose4( timerLapTime(); )
            return;
        }

        // #pragma GCC ivdep
        for (; range_start < range_start_nexttvector; range_start += step) 
            bitstorage[wordindex(range_start)] |= markmask(range_start);

        if unlikely(range_start==range_start_nexttvector)
            bitstorage[wordindex(range_start)] |= markmask(range_start);
    }
    
    const counter_t range_stop_unique =  range_start + VECTOR_SIZE_counter * step; 
    if (range_stop_unique > range_stop || step > VECTOR_SIZE_counter) { // fallback to other methods if vector is too large to repeat -> TODO: remove and fix in VECTORSIZE check

        if (step < global_mediumstep_faster) setBitsTrue_mediumStep(bitstorage, range_start, step, range_stop);
        else setBitsTrue_largeRange(bitstorage, range_start, step, range_stop);
        verbose4( timerLapTime(); )
        return;
    }

    verbose4(  printf("..building masks in range %ju-%ju with WORD_SIZE %ju", (uintmax_t)range_start, (uintmax_t)range_stop_unique, (uintmax_t)WORD_SIZE_counter); )

    if (step < VECTORWORD_SIZE_counter) 
    create_mask_vector_smallstep(bitstorage, range_start, step, range_stop_unique, range_stop);
    else
        create_mask_vector_largestep(bitstorage, range_start, step, range_stop_unique, range_stop);
    
    verbose4( timerLapTime(); )
}

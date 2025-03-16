
// smallstep (< WORD_SIZE ) means the same vectormask can be reused
// THe vectormask can be build by extending the WORD size mask
// TODO: check loop unrolling this
static inline void __attribute__((always_inline)) create_mask_vector_smallstep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // verbose7(  { const counter_t range_stop_unique = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
    //     printf("\n..Setting bits step %3ju using create_mask_vector_smallstep in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps starting at %ju)", 
    //     (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_BITS*step)), (uintmax_t)range_stop_unique ); })
    timer_lapstart(time_create_mask_vector_smallstep);

    register bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    __builtin_prefetch(&bitstorage_vector[vectorindex(range_start)], 1, 3); // prefetch the memory that will be written soon while creating mask

    // build the pattern, pattern_size en pattern_wordshift efficiently
    register const bitshift_t step_shift = vector_bitindex_calc(step); // to enable the compiler to optimize the shift
    register bitshift_t pattern_size = step_shift;
    register bitword_vector_t pattern = BITVECTORWORD_SHIFTBIT;
    while (pattern_size <= VECTORWORD_SIZE_BITS) { pattern |= vector_markmask(pattern_size); pattern_size += step_shift; }
    const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_BITS;

    register const bitword_vector_t pattern_vectorshift = (bitword_vector_t) (((pattern_size - VECTORWORD_SIZE_BITS) * (bitshift_t)VECTOR_ELEMENTS) % step_shift) & VECTORWORDMASK;

    register bitvector_t pattern_vectorshift_vector = VECTOR_BASE(pattern_vectorshift);
    register bitvector_t step_shift_vector = VECTOR_BASE(step_shift);

    const bitshift_t shift = vector_bitindex_calc(range_start); 
    bitvector_t quadmask = VECTOR_BASE(pattern) << (VECTOR_BASE(shift) + (VECTOR_BASE(pattern_wordshift) * VECTOR_BYTEINDEX)) % VECTOR_BASE(step);

    // precaulcate the unique range_stop
    const counter_t range_stop_unique_vector = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
    register const counter_t vector_max = vectorindex(range_stop_unique_vector);
    for (counter_t current_vector = vectorindex(range_start); current_vector < vector_max; current_vector++) {
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        quadmask = (quadmask << pattern_vectorshift_vector) | (quadmask >> (step_shift_vector - pattern_vectorshift_vector)); 
    }
    timer_laptime(time_create_mask_vector_smallstep); 
}

static inline void __attribute__((always_inline)) create_mask_vector_smallstep_rotate(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // verbose7(  { const counter_t range_stop_unique = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
    //     printf("\n..Setting bits step %3ju using create_mask_vector_smallstep in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps starting at %ju)", 
    //     (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_BITS*step)), (uintmax_t)range_stop_unique ); })
    timer_lapstart(time_create_mask_vector_smallstep);

    register bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    __builtin_prefetch(&bitstorage_vector[vectorindex(range_start)], 1, 3); // prefetch the memory that will be written soon while creating mask

    // build the pattern, pattern_size en pattern_wordshift efficiently
    register const bitshift_t step_shift = vector_bitindex_calc(step); // to enable the compiler to optimize the shift
    register bitshift_t pattern_size = step_shift;
    register bitword_vector_t pattern = BITVECTORWORD_SHIFTBIT;
    while (pattern_size <= VECTORWORD_SIZE_BITS) { pattern |= vector_markmask(pattern_size); pattern_size += step_shift; }
    const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_BITS;

    register const bitword_vector_t pattern_vectorshift = (bitword_vector_t) (((pattern_size - VECTORWORD_SIZE_BITS) * (bitshift_t)VECTOR_ELEMENTS) % step_shift) & VECTORWORDMASK;

    register bitvector_t pattern_vectorshift_vector = VECTOR_BASE(pattern_vectorshift);
    register bitvector_t step_shift_vector = VECTOR_BASE(step_shift);

    const bitshift_t shift = vector_bitindex_calc(range_start); 
    bitvector_t quadmask = VECTOR_BASE(pattern) << (VECTOR_BASE(shift) + (VECTOR_BASE(pattern_wordshift) * VECTOR_BYTEINDEX)) % VECTOR_BASE(step);

    // precaulcate the unique range_stop
    register const counter_t vector_max = vectorindex(range_stop);
    for (counter_t current_vector = vectorindex(range_start); current_vector < vector_max; current_vector++) {
        bitstorage_vector[current_vector] = quadmask;
        quadmask = (quadmask << pattern_vectorshift_vector) | (quadmask >> (step_shift_vector - pattern_vectorshift_vector)); 
    }
    timer_laptime(time_create_mask_vector_smallstep); 
}

static inline void __attribute__((always_inline)) create_mask_vector_smallstep_rotate_pair(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // verbose7(  { const counter_t range_stop_unique = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
    //     printf("\n..Setting bits step %3ju using create_mask_vector_smallstep in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps starting at %ju)", 
    //     (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_BITS*step)), (uintmax_t)range_stop_unique ); })
    timer_lapstart(time_create_mask_vector_smallstep);

    register bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    __builtin_prefetch(&bitstorage_vector[vectorindex(range_start)], 1, 3); // prefetch the memory that will be written soon while creating mask

    // build the pattern, pattern_size en pattern_wordshift efficiently
    register const bitshift_t step_shift = vector_bitindex_calc(step); // to enable the compiler to optimize the shift
    register bitshift_t pattern_size = step_shift;
    register bitword_vector_t pattern = BITVECTORWORD_SHIFTBIT;
    while (pattern_size <= VECTORWORD_SIZE_BITS) { pattern |= vector_markmask(pattern_size); pattern_size += step_shift; }
    const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_BITS;

    register const bitword_vector_t pattern_vectorshift = (bitword_vector_t) (((pattern_size - VECTORWORD_SIZE_BITS) * (bitshift_t)VECTOR_ELEMENTS) % step_shift) & VECTORWORDMASK;

    register bitvector_t pattern_vectorshift_vector = VECTOR_BASE(pattern_vectorshift);
    register bitvector_t step_shift_vector = VECTOR_BASE(step_shift);

    const bitshift_t shift = vector_bitindex_calc(range_start); 
    bitvector_t quadmask = VECTOR_BASE(pattern) << (VECTOR_BASE(shift) + (VECTOR_BASE(pattern_wordshift) * VECTOR_BYTEINDEX)) % VECTOR_BASE(step);

    // precaulcate the unique range_stop
    const counter_t range_stop_unique_vector = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
    register const counter_t vector_max = vectorindex(range_stop_unique_vector);
    
    counter_t current_vector = vectorindex(range_start);

    // Apply this vectormask standalone until we align on the cache line
    for (;current_vector&1; current_vector++) {
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        quadmask = (quadmask << pattern_vectorshift_vector) | (quadmask >> (step_shift_vector - pattern_vectorshift_vector)); 
    }

    // Process vectormasks in pairs from the cacheline
    for (; current_vector < vector_max; current_vector += 2) {
        bitvector_t quadmask2 = (quadmask << pattern_vectorshift_vector) | (quadmask >> (step_shift_vector - pattern_vectorshift_vector)); 
        applyMask_vector_pair(bitstorage_vector, step, range_stop, quadmask, quadmask2, current_vector);
        quadmask = (quadmask2 << pattern_vectorshift_vector) | (quadmask2 >> (step_shift_vector - pattern_vectorshift_vector)); 
    }

    // Process the last vectormask if needed
    if (current_vector == vector_max) {
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
    }

    timer_laptime(time_create_mask_vector_smallstep); 
}

// static inline void __attribute__((always_inline)) create_mask_vector_smallstep_totalshift(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
// {
//     // verbose7(  { const counter_t range_stop_unique = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
//     //     printf("\n..Setting bits step %3ju using create_mask_vector_smallstep in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps starting at %ju)", 
//     //     (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_BITS*step)), (uintmax_t)range_stop_unique ); })
//     timer_lapstart(time_create_mask_vector_smallstep);

//     bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);

//     register const bitshift_t step_shift = vector_bitindex_calc(step); // to enable the compiler to optimize the shift
//     register bitshift_t pattern_size = step_shift;
//     register bitword_vector_t pattern = BITVECTORWORD_SHIFTBIT;
//     while (pattern_size <= VECTORWORD_SIZE_BITS) {
//         pattern |= vector_markmask(pattern_size);
//         pattern_size += step_shift;
//     }

//     // register const bitshift_t shift = vector_bitindex_calc(range_start); 
//     // register const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_BITS;
//     // register const bitword_vector_t pattern_vectorshift = (bitword_vector_t) (((pattern_size - VECTORWORD_SIZE_BITS) * (bitshift_t)VECTOR_ELEMENTS) % step_shift) & VECTORWORDMASK;

//     register const bitvector_t shift_vector = VECTOR_BASE(vector_bitindex_calc(range_start)) + (VECTOR_BASE(pattern_size - VECTORWORD_SIZE_BITS) * VECTOR_BYTEINDEX);
//     register const bitvector_t step_vector = VECTOR_BASE(step);
//     register const bitvector_t quadmask_base = VECTOR_BASE(pattern);
//     register const bitvector_t pattern_vectorshift_vector = VECTOR_BASE(((pattern_size - VECTORWORD_SIZE_BITS) * (bitshift_t)VECTOR_ELEMENTS) % step_shift);

//     const counter_t range_stop_unique_vector = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
//     const counter_t range_startvector = vectorindex(range_start);
//     const counter_t index_vector_max = vectorindex(range_stop_unique_vector) - range_startvector;

//     // manual unrolling of the loop with each mask independent
//     counter_t index_vector = 0;
//     for (; index_vector+4 < index_vector_max; index_vector+=4) {
//         register const bitvector_t quadmask1 = quadmask_base << ((shift_vector + (index_vector * pattern_vectorshift_vector) ) % step_vector);
//         applyMask_vector(bitstorage_vector, step, range_stop, quadmask1, range_startvector + index_vector);
//         register const bitvector_t quadmask2 = quadmask_base << ((shift_vector + ((index_vector+1) * pattern_vectorshift_vector) ) % step_vector);
//         applyMask_vector(bitstorage_vector, step, range_stop, quadmask2, range_startvector + index_vector+1);
//         register const bitvector_t quadmask3 = quadmask_base << ((shift_vector + ((index_vector+2) * pattern_vectorshift_vector) ) % step_vector);
//         applyMask_vector(bitstorage_vector, step, range_stop, quadmask3, range_startvector + index_vector+2);
//         register const bitvector_t quadmask4 = quadmask_base << ((shift_vector + ((index_vector+3) * pattern_vectorshift_vector) ) % step_vector);
//         applyMask_vector(bitstorage_vector, step, range_stop, quadmask4, range_startvector + index_vector+3);
//     }

//     for (; index_vector <= index_vector_max; index_vector++) {
//         const bitvector_t quadmask = quadmask_base << ((shift_vector + ((VECTOR_BASE(index_vector)) * pattern_vectorshift_vector) ) % step_vector);
//         applyMask_vector(bitstorage_vector, step, range_stop, quadmask, range_startvector + index_vector);
//     }
//     timer_laptime(time_create_mask_vector_smallstep); 
// }

// static inline void __attribute__((always_inline)) create_mask_vector_smallstep_recalc(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
// {
//     bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);

//     const bitword_vector_t pattern_base = BITVECTORWORD_SHIFTBIT;
//     register bitword_vector_t pattern   = BITVECTORWORD_SHIFTBIT;
//     bitshift_t pattern_size = (bitshift_t) step;
//     const bitshift_t step_shift = (bitshift_t) step; // to enable the compiler to optimize the shift

//     if (pattern_size < (VECTORWORD_SIZE_BITS >> 2)) {
//         pattern |= (pattern_base << step_shift) | (pattern_base << step_shift*2) | (pattern_base << step_shift*3);
//         pattern_size = step_shift << 2;
//     }
//     for (; pattern_size <= VECTORWORD_SIZE_BITS; pattern_size += step_shift) pattern |= (pattern_base << pattern_size);

//     const bitshift_t shift = (bitshift_t) vector_bitindex_calc(range_start); 
//     const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_BITS;
//     const bitvector_t shift_base_vector = VECTOR_BASE(shift);
//     const bitvector_t vector_byteindex = VECTOR_BYTEINDEX;
//     const bitvector_t pattern_wordshift_vector = VECTOR_BASE(pattern_wordshift);
//     const bitvector_t pattern_wordshift_vector_plus = pattern_wordshift_vector * vector_byteindex;
//     const bitvector_t step_vector = VECTOR_BASE(step);
//     const bitvector_t quadmask_base = VECTOR_BASE(pattern);
//     const bitshift_t pattern_vectorshift = ((pattern_size - VECTORWORD_SIZE_BITS) * (bitshift_t)VECTOR_ELEMENTS) % step_shift;
//     const bitvector_t pattern_vectorshift_vector = VECTOR_BASE(pattern_vectorshift);

//     const counter_t range_stop_unique_vector = min(range_start + step * VECTOR_SIZE_BITS, range_stop);
//     const counter_t range_startvector = vectorindex(range_start);
//     const counter_t index_vector_max = vectorindex(range_stop_unique_vector) - range_startvector;

//     #pragma GCC ivdep
//     for (counter_t index_vector = 0; index_vector < index_vector_max; index_vector++) {
//         const bitvector_t quadmask = quadmask_base << ((shift_base_vector + (index_vector * pattern_vectorshift_vector) + pattern_wordshift_vector_plus) % step_vector);
//         applyMask_vector(bitstorage_vector, step, range_stop, quadmask, range_startvector + index_vector);
//     }
// }

static inline void __attribute__((always_inline)) setBitsTrue_smallstep_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_word in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_wordstep);

    const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_BITS; // find next vector

    register counter_t range_start_new = range_start;
    for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
        bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
    }

    if (range_start_new > range_stop) return;
    create_mask_vector_smallstep_rotate_pair(bitstorage, range_start_new, step, range_stop);
    // create_mask_vector_smallstep(bitstorage, range_start_new, step, range_stop);

    timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6( printf("\n"); )
}


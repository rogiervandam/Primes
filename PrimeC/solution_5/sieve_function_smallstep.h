// TODO: test if we can just shift the shiftmask in the second iteration instead of creating a new one
// TODO: Use better algorithm for creating the shiftmask
static inline void __attribute__((always_inline)) create_mask_vector_smallstep_modulo(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    counter_t current_vector =  vectorindex(range_start);

    const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
    register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
    bitshift_t pattern_size = step;

    // if (pattern_size < (VECTORWORD_SIZE_bitshift >> (6 - VECTOR_ELEMENTS/2))) {
    if (pattern_size < (VECTORWORD_SIZE_bitshift >> 2)) {
        pattern |= (pattern_base << step) | (pattern_base << step*2) | (pattern_base << step*3);
        pattern_size = step << 2;
    }
    for (; pattern_size <= VECTORWORD_SIZE_bitshift; pattern_size += step) pattern |= (pattern_base << pattern_size);

    register bitshift_t       shift         = vector_bitindex_calc(range_start); 
    register const bitshift_t pattern_shift = VECTORWORD_SIZE_bitshift + step - pattern_size; 

    register bitvector_t quadmask_base = VECTOR_BASE(pattern);

    counter_t debug_run = 0;
    bitshift_t pattern_vectorshift = VECTOR_ELEMENTS*(pattern_size - VECTORWORD_SIZE_bitshift);
    bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_bitshift;
    register bitvector_t shiftmask = VECTOR_BASE(0);

    const counter_t shift_original = shift;

    counter_t index = 0;

    for (counter_t current_word = vector_wordindex(range_start); current_word < vector_wordindex(range_stop_unique); current_word += VECTOR_ELEMENTS) {
        debug_hits+= debug_final_benchmarking;

        for(counter_t i=0; i<VECTOR_ELEMENTS;i++) {
            shiftmask[i] = (shift_original + i * pattern_wordshift + index * pattern_vectorshift) % step;
        }

        const bitvector_t quadmask = quadmask_base << shiftmask;
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        current_vector++;
        index++;
    }
}

// uint32_t rotl32c (uint32_t x, uint32_t n)
// {
//   assert (n<32);
//   return (x<<n) | (x>>(-n&31));
// }
// https://blog.regehr.org/archives/1063
static inline uint64_t rotl64c (uint64_t x, uint64_t n)
{
//   assert (n<64);
    // return (x<<n);
    n &= 63;
    return (x<<n) | (x>>(64-n));
}

static inline void __attribute__((always_inline)) create_mask_vector_smallstep_base_initial(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    counter_t current_vector =  vectorindex(range_start);

    const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
    register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
    bitshift_t pattern_size = step;

    // if (pattern_size < (VECTORWORD_SIZE_bitshift >> (6 - VECTOR_ELEMENTS/2))) {
    if (pattern_size < (VECTORWORD_SIZE_bitshift >> 2)) {
        pattern |= (pattern_base << step) | (pattern_base << step*2) | (pattern_base << step*3);
        pattern_size = step << 2;
    }
    for (; pattern_size <= VECTORWORD_SIZE_bitshift; pattern_size += step) pattern |= (pattern_base << pattern_size);

    const bitshift_t shift         = vector_bitindex_calc(range_start); 
    const bitshift_t pattern_shift = VECTORWORD_SIZE_bitshift + step - pattern_size; 

    const bitshift_t pattern_wordshift = pattern_size & VECTORWORDMASK;

    const bitvector_t pattern_vector = VECTOR_BASE(pattern);
    const bitvector_t shift_base_vector = VECTOR_BASE(shift);
    const bitvector_t byteindex_vector = VECTOR_BYTEINDEX;
    const bitvector_t pattern_wordshift_vector = VECTOR_BASE(pattern_wordshift) * byteindex_vector;
    const bitvector_t step_vector = VECTOR_BASE(step);
    register bitvector_t quadmask = pattern_vector << (shift_base_vector + pattern_wordshift_vector) % step_vector;

    const bitshift_t pattern_vectorshift = (VECTOR_ELEMENTS*(pattern_size - VECTORWORD_SIZE_bitshift))%step;

    for (counter_t current_word = vector_wordindex(range_start); current_word < vector_wordindex(range_stop_unique); current_word += VECTOR_ELEMENTS) {
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        quadmask = (quadmask << pattern_vectorshift) | (quadmask >> (step - pattern_vectorshift));
        current_vector++;
    }
}

static inline void __attribute__((always_inline)) create_mask_vector_smallstep_shifting(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);

    const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
    register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
    bitshift_t pattern_size = step;

    // if (pattern_size < (VECTORWORD_SIZE_bitshift >> (6 - VECTOR_ELEMENTS/2))) {
    if (pattern_size < (VECTORWORD_SIZE_bitshift >> 2)) {
        pattern |= (pattern_base << step) | (pattern_base << step*2) | (pattern_base << step*3);
        pattern_size = step << 2;
    }
    for (; pattern_size <= VECTORWORD_SIZE_bitshift; pattern_size += step) pattern |= (pattern_base << pattern_size);

    register bitshift_t       shift         = vector_bitindex_calc(range_start); 
    register const bitshift_t pattern_shift = VECTORWORD_SIZE_bitshift + step - pattern_size; 

    const bitshift_t pattern_wordshift = pattern_size - VECTORWORD_SIZE_bitshift;

    const bitvector_t shift_base_vector = VECTOR_BASE(shift);
    const bitvector_t vector_byteindex = VECTOR_BYTEINDEX;
    const bitvector_t pattern_wordshift_vector = VECTOR_BASE(pattern_wordshift) * vector_byteindex;
    const bitvector_t step_vector = VECTOR_BASE(step);
    register bitvector_t shiftmask = (shift_base_vector + pattern_wordshift_vector) % step_vector;

    // shiftmask = (shift_base_vector + pattern_wordshift_vector) % step_vector;

        // counter_t current_vector_after_original = current_vector;

    const bitvector_t quadmask_base = VECTOR_BASE(pattern);
    register bitvector_t quadmask = quadmask_base << shiftmask;
    register counter_t current_vector = vectorindex(range_start);
    const bitshift_t pattern_vectorshift = (VECTOR_ELEMENTS*(pattern_size - VECTORWORD_SIZE_bitshift))%step;

    for (counter_t current_word = vector_wordindex(range_start); current_word < vector_wordindex(range_stop_unique); current_word += VECTOR_ELEMENTS) {
        // debug_hits+= debug_final_benchmarking;
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        quadmask = (quadmask << pattern_vectorshift) | (quadmask >> (step - pattern_vectorshift));
        current_vector++;
        // current_vector_after_original++;
    }

    // counter_t current_vector_after_alternative = vectorindex(range_start);

    // slower, because it does more iterations.. researching
    // const counter_t vector_max = vectorindex(range_start) + ((vector_wordindex(range_stop_unique) - vector_wordindex(range_start)) / VECTOR_ELEMENTS);
    // const counter_t vector_max = vectorindex(range_start) + ((vectorindex(range_stop_unique) - vectorindex(range_start)));

    // for (counter_t current_vector = vectorindex(range_start); current_vector < vector_max; current_vector++) {
    //     applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
    //     quadmask = (quadmask << pattern_vectorshift) | (quadmask >> (step - pattern_vectorshift));
    //     current_vector_after_alternative++;
    // }

    // if (current_vector_after_original != current_vector_after_alternative) {
    //     printf("Error in shifting\n");
    //     printf("current_vector_after_original: %ju\n", (uintmax_t) current_vector_after_original);
    //     printf("current_vector_after_alternative: %ju\n", (uintmax_t) current_vector_after_alternative);
    //     exit(0);
    // }

}

static inline void __attribute__((always_inline)) create_mask_vector_smallstep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    counter_t current_vector =  vectorindex(range_start);

    const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
    register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
    bitshift_t pattern_size = step;

    // if (pattern_size < (VECTORWORD_SIZE_bitshift >> (6 - VECTOR_ELEMENTS/2))) {
    if (pattern_size < (VECTORWORD_SIZE_bitshift >> 2)) {
        pattern |= (pattern_base << step) | (pattern_base << step*2) | (pattern_base << step*3);
        pattern_size = step << 2;
    }
    for (; pattern_size <= VECTORWORD_SIZE_bitshift; pattern_size += step) pattern |= (pattern_base << pattern_size);

    register bitshift_t       shift         = vector_bitindex_calc(range_start); 
    register const bitshift_t pattern_shift = VECTORWORD_SIZE_bitshift + step - pattern_size; 

    #if VECTOR_ELEMENTS == 8
        register bitvector_t quadmask_base = { pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern };
    #elif VECTOR_ELEMENTS == 4
        register bitvector_t quadmask_base = { pattern, pattern, pattern, pattern };
    #else 
        register bitvector_t quadmask_base = { pattern, pattern };
    #endif

    for (counter_t current_word = vector_wordindex(range_start); current_word < vector_wordindex(range_stop_unique); current_word += VECTOR_ELEMENTS) {
        const bitshift_t shift1 = shift;
        if (pattern_shift > shift) shift += step;
        shift -= pattern_shift;
        const bitshift_t shift2 = shift;
        if (pattern_shift > shift) shift += step;
        shift -= pattern_shift;
        #if VECTOR_ELEMENTS <= 2
            register bitvector_t shiftmask = { shift1, shift2 };
        #else
            const bitshift_t shift3 = shift;
            if (pattern_shift > shift) shift += step;
            shift -= pattern_shift;
            const bitshift_t shift4 = shift;
            if (pattern_shift > shift) shift += step;
            shift -= pattern_shift;
            #if VECTOR_ELEMENTS <= 4
            const bitvector_t shiftmask = { shift1, shift2, shift3, shift4 };
            #else
                const bitshift_t shift5 = shift;
                if (pattern_shift > shift) shift += step;
                shift -= pattern_shift;
                const bitshift_t shift6 = shift;
                if (pattern_shift > shift) shift += step;
                shift -= pattern_shift;
                const bitshift_t shift7 = shift;
                if (pattern_shift > shift) shift += step;
                shift -= pattern_shift;
                const bitshift_t shift8 = shift;
                if (pattern_shift > shift) shift += step;
                shift -= pattern_shift;
                const bitvector_t shiftmask = { shift1, shift2, shift3, shift4, shift5, shift6, shift7, shift8 };
            #endif
        #endif

        const bitvector_t quadmask = quadmask_base << shiftmask;
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        current_vector++;
    }
}

static inline void __attribute__((always_inline)) create_mask_vector_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop_unique, const counter_t range_stop)
{
    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    counter_t current_vector =  vectorindex(range_start);
    for (counter_t index = range_start; index < range_stop_unique;) {
        const counter_t current_vector_start = vectorstart(index);
        // bitvector_t quadmask;
        #if VECTOR_ELEMENTS == 8
        bitvector_t quadmask = { SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO };
        #elif VECTOR_ELEMENTS == 4
        bitvector_t quadmask = { SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO };
        #else 
        bitvector_t quadmask = { SAFE_ZERO, SAFE_ZERO };
        #endif

        // unrolled version of the loop
        if     (vector_wordstart(index) == (current_vector_start                              )) { quadmask[0] = vector_markmask(index); index += step; }
        if     (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter  ))) { quadmask[1] = vector_markmask(index); index += step; }
        #if VECTOR_ELEMENTS > 2
            if (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter*2))) { quadmask[2] = vector_markmask(index); index += step; }
            if (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter*3))) { quadmask[3] = vector_markmask(index); index += step; }
        #endif
        #if VECTOR_ELEMENTS > 4
            if (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter*4))) { quadmask[4] = vector_markmask(index); index += step; }
            if (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter*5))) { quadmask[5] = vector_markmask(index); index += step; }
            if (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter*6))) { quadmask[6] = vector_markmask(index); index += step; }
            if (vector_wordstart(index) == (current_vector_start | (VECTORWORD_SIZE_counter*7))) { quadmask[7] = vector_markmask(index); index += step; }
        #endif

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
        // if (step < WORD_SIZE_counter) setBitsTrue_mediumStep(bitstorage, range_start, step, range_stop);
        else setBitsTrue_largeRange(bitstorage, range_start, step, range_stop);
        // setBitsTrue_largeRange(bitstorage, range_start, step, range_stop);
        verbose4( timerLapTime(); )
        return;
    }

    verbose4(  printf("..building masks in range %ju-%ju with WORD_SIZE %ju", (uintmax_t)range_start, (uintmax_t)range_stop_unique, (uintmax_t)WORD_SIZE_counter); )


    if (step < VECTORWORD_SIZE_counter) 
        // create_mask_vector_smallstep_shifting(bitstorage, range_start, step, range_stop_unique, range_stop);
        create_mask_vector_smallstep_base_initial(bitstorage, range_start, step, range_stop_unique, range_stop);
        // create_mask_vector_smallstep_modulo(bitstorage, range_start, step, range_stop_unique, range_stop);
        // create_mask_vector_smallstep(bitstorage, range_start, step, range_stop_unique, range_stop);
    else
        create_mask_vector_largestep(bitstorage, range_start, step, range_stop_unique, range_stop);
    
    verbose4( timerLapTime(); )
}


        // debugging
        // if (index >4) exit(0);

        // bitvector_t shiftmask_correct = VECTOR_BASE(0);
        // for(counter_t i=0; i<VECTOR_ELEMENTS;i++) {
        //     shiftmask_correct[i] = (shift_original + i * pattern_wordshift + index * pattern_vectorshift) % step;
        // }
        // bitvector_t quadmask_correct = quadmask_base << shiftmask_correct;


        // if (memcmp(&quadmask, &quadmask_correct, sizeof(quadmask)) != 0) {
        //     printf("NOT correct in step %ju\n", (uintmax_t)index);
        //     printf("Base vector         ");
        //     printVector(quadmask_base);

        //     printf("Last vector         ");
        //     printVector(quadmask_last);

        //     printf("New vector left     ");
        //     quadmask_alternative = quadmask_last << pattern_vectorshift;
        //     printVector(quadmask_alternative);

        //     printf("New vector right    ");
        //     quadmask_alternative = ((quadmask_last >> (step - pattern_vectorshift)));
        //     printVector(quadmask_alternative);

        //     printf("Current vector      ");
        //     printVector(quadmask);

        //     printf("Correct vector      ");
        //     printVector(quadmask_correct);

        //     printf("Alternative1 vector ");
        //     counter_t pattern_vectorshift_new = pattern_vectorshift % step;
        //     quadmask_alternative = (quadmask_last << pattern_vectorshift_new);
        //     printVector(quadmask_alternative);
        //     printf("pattern_vectorshift_new %ju\n", (uintmax_t)pattern_vectorshift_new);

        //     printf("Alternative1 vector2");
        //     quadmask_alternative = quadmask_last >> (step - pattern_vectorshift_new);
        //     printVector(quadmask_alternative);
        //     printf("pattern_vectorshift_new %ju\n", (uintmax_t)pattern_vectorshift_new);


        //     // printf("Alternative2 vector ");
        //     // quadmask_alternative = (quadmask << pattern_vectorshift) | (quadmask >> (step - pattern_vectorshift));
        //     // printVector(quadmask_alternative);

        //     // printf("Alternative3 vector ");
        //     // quadmask_alternative = (quadmask_base << index*pattern_vectorshift) ;
        //     // printVector(quadmask_alternative);

        //     // printf("Alternative4 vector ");
        //     // quadmask_alternative = (quadmask_base >> index*(step - pattern_size));
        //     // printVector(quadmask_alternative);

        //     printf("shift_original %ju pattern_shift %ju pattern_size %ju step %ju pattern_vectorshift %ju\n", (uintmax_t) shift_original, (uintmax_t) pattern_shift, (uintmax_t) pattern_size, (uintmax_t) step, (uintmax_t)pattern_vectorshift); 

        //     exit(0);
        // }

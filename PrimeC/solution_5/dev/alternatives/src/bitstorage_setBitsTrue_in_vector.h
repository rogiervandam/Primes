static inline counter_t __attribute__((always_inline)) create_mask_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    verbose6(  printf("\n..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_create_mask_vector_largestep);

    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    counter_t current_vector = vectorindex(range_start);

    bitvector_t quadmask = VECTOR_BASE(VECTOR_SAFE_ZERO);
    counter_t current_vector_start = vectorstart(range_start);
    counter_t index = range_start;

    while ( index <= range_stop ) {
        while (vectorstart(index) == current_vector_start) {
            const counter_t vector_element = ((index) & VECTORMASK) >> SHIFT_VECTORWORD;
            quadmask[vector_element] |= vector_markmask_calc(index);
            index += step;
        }
        bitstorage_vector[current_vector] |= quadmask;
        for (int i=0; i<VECTOR_ELEMENTS; i++) quadmask[i] = VECTOR_SAFE_ZERO;
        current_vector_start = vectorstart(index);
        current_vector = vectorindex(index);
    }
    timer_laptime(time_create_mask_vector_largestep); 
    return index;
}

static inline void __attribute__((always_inline)) setBitsTrue_in_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_vectorstep in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

    const counter_t range_start_nexttvector = min(range_stop, vectorstart(range_start) + VECTOR_SIZE_BITS); // find next vector
    register counter_t range_start_new = range_start; // not in the inner loop because we want to use the value after the loop

    for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
        bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
    }

    if (range_start_new <= range_stop + VECTOR_SIZE_BITS) {
        range_start_new = create_mask_vector(bitstorage, range_start_new, step, range_stop);
    }

    for (; range_start_new <= range_stop; range_start_new += step) {
        bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
    }

    timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
}
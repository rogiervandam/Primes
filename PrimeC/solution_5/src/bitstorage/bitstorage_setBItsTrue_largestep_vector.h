// Largestep (> WORD_SIZE and < VECTOR_SIZE) means the same vectormask can be reused
static inline void __attribute__((always_inline)) create_mask_vector_largestep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    verbose6(  printf("\n..Setting bits step %3ju using create_mask_vector_largestep in %ju bit range (%ju-%ju)  (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_create_mask_vector_largestep);

    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_BITS * step + VECTOR_SIZE_BITS; 
    counter_t current_vector = vectorindex(range_start);

    for (counter_t index = range_start; index <= range_stop_unique_vector;) {
        const counter_t current_vector_start = vectorstart(index);
        bitvector_t quadmask = VECTOR_BASE(VECTOR_SAFE_ZERO);
        for (counter_t i=0; i<VECTOR_ELEMENTS; i++) {
            if (vector_wordstart(index) == (current_vector_start + (VECTORWORD_SIZE_BITS*i))) {
                quadmask[i] = vector_markmask_calc(index); // TODO: this was sensitive to wordsize. vector_markmask(index) didnt work; markmask_calc(index) worked
                index += step;
            }
        }
        applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
        current_vector++;
    }
    timer_laptime(time_create_mask_vector_largestep); 
}

static inline void __attribute__((always_inline)) setBitsTrue_largestep_vector(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using largestep vector_vectorstep in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue_largestep_vector_vectorstep);

    const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_BITS; // find next vector
    register counter_t range_start_new = range_start; // not in the inner loop because we want to use the value after the loop

    for (; range_start_new <= range_start_nexttvector; range_start_new += step) {
        bitstorage[wordindex(range_start_new)] |= markmask_calc(range_start_new);
    }

    create_mask_vector_largestep(bitstorage, range_start_new, step, range_stop);
    timer_laptime(time_setBitsTrue_largestep_vector_vectorstep); verbose6( printf("\n"); )
}



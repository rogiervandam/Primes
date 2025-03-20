#ifdef variant
#define bitbucket_t NAME(variant,_bitvector_t)
#define suffix NAME(_,variant)
#else
#define bitbucket_t bitvector_t
#define suffix
#endif
static inline void __attribute__((always_inline)) NAME(applyMask_vector,suffix)(bitbucket_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitbucket_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying " ##bitbucket_t " mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = vectorindex_type(range_stop, bitbucket_t);
   
    register const counter_t step_4 = step << 2;
    register bitbucket_t* restrict index_ptr            =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[safe_diff(range_stop_vector,step_4)],sizeof(bitbucket_t));

    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    
    #pragma GCC ivdep
    while likely(index_ptr < fast_loop_ptr) {
        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask; 
        index_ptr += step_4;
    }
    
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[range_stop_vector],sizeof(bitbucket_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

#undef bitbucket_t
#undef suffix
#ifdef variant
    #undef variant
#endif

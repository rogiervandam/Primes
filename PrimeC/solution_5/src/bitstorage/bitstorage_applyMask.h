#ifdef variant
#define bitbucket_t NAME(variant, _t)
#define variantsuffix NAME(_,variant)
#endif

#ifdef unrolls
    #define unrollssuffix NAME(_unroll,unrolls)
    #define suffix NAME(variantsuffix, unrollssuffix)
#else
    #define unrolls 4
    #define UNSET_UNROLLS 1
    #define suffix variantsuffix
#endif

static inline void __attribute__((always_inline)) NAME(applyMask,suffix)(bitbucket_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitbucket_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying " ##bitbucket_t " mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = vectorindex_type(range_stop, bitbucket_t);
   
    register const counter_t step_max = step * unrolls;
    register bitbucket_t* restrict index_ptr            =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(bitbucket_t));
    register const bitbucket_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[safe_diff(range_stop_vector,step_max)],sizeof(bitbucket_t));

    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    
    #pragma GCC ivdep
    while likely(index_ptr < fast_loop_ptr) {
        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask;
        #if unrolls <= 4
        index_ptr += step_max;
        #else
        *(index_ptr + step * 4) |= mask;
        *(index_ptr + step * 5) |= mask;
        *(index_ptr + step * 6) |= mask;
        *(index_ptr + step * 7) |= mask;
        index_ptr += step_max;
        #endif 
    }
    
    register const bitbucket_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[range_stop_vector],sizeof(bitbucket_t));
    
    for (counter_t i=(unrolls+1); i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

#undef variant
#undef variantsuffix
#undef unrollssuffix
#undef fullvariantsuffix
#undef bitbucket_t
#undef suffix
#undef subfunction

#ifdef UNSET_UNROLLS
    #undef unrolls
    #undef UNSET_UNROLLS
#endif
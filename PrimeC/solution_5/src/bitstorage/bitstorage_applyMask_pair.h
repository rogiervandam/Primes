

// static inline void __attribute__((always_inline)) applyMask_vector_pair(bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitvector_t mask1, const bitvector_t mask2, counter_t index_vector) 
// {
//     verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
//     timer_lapstart(time_applyMask_vector);

//     const counter_t range_stop_vector = vectorindex(range_stop);
   
//     register const counter_t step_4 = step << 2;

//     register bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(bitvector_t));
//     #if is_signed(counter_t)
//     register bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(bitvector_t));
//     #else
//     register bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(bitvector_t));
//     #endif

//     register const counter_t step_2 = step << 1;
//     register const counter_t step_3 = step_2 + step;
    
//     #pragma GCC ivdep
//     while likely(index_ptr < fast_loop_ptr) {
//         *index_ptr                |= mask1;
//         *(index_ptr + 1)          |= mask2;  
//         *(index_ptr + step  )     |= mask1; 
//         *(index_ptr + step + 1)   |= mask2;  
//         *(index_ptr + step_2)     |= mask1; 
//         *(index_ptr + step_2 + 1) |= mask2;  
//         *(index_ptr + step_3)     |= mask1; 
//         *(index_ptr + step_3 + 1) |= mask2;  
//         index_ptr += step_4;
//     }
    
//     register const bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(bitvector_t));
    
//     for (counter_t i=5; i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
//         *index_ptr     |= mask1; 
//         *(index_ptr+1) |= mask2; 
//     }
    
//     if (index_ptr == range_stop_ptr) {
//         *index_ptr     |= mask1; 
//     }
//     timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
// }

// same as word mask, but at a vector level - uses the sse/avx extensions, hopefully
static inline void __attribute__((always_inline)) applyMask_vector(bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitvector_t mask, counter_t index_vector) 
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
        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask; 
        index_ptr += step_4;
    }
    
    register const bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_pair(bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitvector_t mask1, const bitvector_t mask2, counter_t index_vector) 
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
        *index_ptr                |= mask1;
        *(index_ptr + 1)          |= mask2;  
        *(index_ptr + step  )     |= mask1; 
        *(index_ptr + step + 1)   |= mask2;  
        *(index_ptr + step_2)     |= mask1; 
        *(index_ptr + step_2 + 1) |= mask2;  
        *(index_ptr + step_3)     |= mask1; 
        *(index_ptr + step_3 + 1) |= mask2;  
        index_ptr += step_4;
    }
    
    register const bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr     |= mask1; 
        *(index_ptr+1) |= mask2; 
    }
    
    if (index_ptr == range_stop_ptr) {
        *index_ptr     |= mask1; 
    }
    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_uint64v8(uint64v8_bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint64v8_bitvector_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = range_stop >> (3+3+3);
   
    register const counter_t step_4 = step << 2;
    register uint64v8_bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(uint64v8_bitvector_t));
    #if is_signed(counter_t)
    register uint64v8_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(uint64v8_bitvector_t));
    #else
    register uint64v8_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(uint64v8_bitvector_t));
    #endif

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
    
    register const uint64v8_bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(uint64v8_bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_uint64v4(uint64v4_bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint64v4_bitvector_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = range_stop >> 8; // 256 bits = 2^8
   
    register const counter_t step_4 = step << 2;
    register uint64v4_bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(uint64v4_bitvector_t));
    #if is_signed(counter_t)
    register uint64v4_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(uint64v4_bitvector_t));
    #else
    register uint64v4_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(uint64v4_bitvector_t));
    #endif

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
    
    register const uint64v4_bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(uint64v4_bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_uint32v16(uint32v16_bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint32v16_bitvector_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = range_stop >> 9; // 512 bits = 2^9
   
    register const counter_t step_4 = step << 2;
    register uint32v16_bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(uint32v16_bitvector_t));
    #if is_signed(counter_t)
    register uint32v16_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(uint32v16_bitvector_t));
    #else
    register uint32v16_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(uint32v16_bitvector_t));
    #endif

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
    
    register const uint32v16_bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(uint32v16_bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_uint16v32(uint16v32_bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint16v32_bitvector_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = range_stop >> 9; // 512 bits = 2^9
   
    register const counter_t step_4 = step << 2;
    register uint16v32_bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(uint16v32_bitvector_t));
    #if is_signed(counter_t)
    register uint16v32_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(uint16v32_bitvector_t));
    #else
    register uint16v32_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(uint16v32_bitvector_t));
    #endif

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
    
    register const uint16v32_bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(uint16v32_bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_uint64v2(uint64v2_bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint64v2_bitvector_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = range_stop >> 7; // 128 bits = 2^7
   
    register const counter_t step_4 = step << 2;
    register uint64v2_bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(uint64v2_bitvector_t));
    #if is_signed(counter_t)
    register uint64v2_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(uint64v2_bitvector_t));
    #else
    register uint64v2_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(uint64v2_bitvector_t));
    #endif

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
    
    register const uint64v2_bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(uint64v2_bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_uint16v8(uint16v8_bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint16v8_bitvector_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = range_stop >> 7; // 128 bits = 2^7
   
    register const counter_t step_4 = step << 2;
    register uint16v8_bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(uint16v8_bitvector_t));
    #if is_signed(counter_t)
    register uint16v8_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(uint16v8_bitvector_t));
    #else
    register uint16v8_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(uint16v8_bitvector_t));
    #endif

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
    
    register const uint16v8_bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(uint16v8_bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}

static inline void __attribute__((always_inline)) applyMask_vector_uint32v8(uint32v8_bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const uint32v8_bitvector_t mask, counter_t index_vector) 
{
    verbose8( printf("Applying mask with step %ju in range until %ju", (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_vector);

    const counter_t range_stop_vector = range_stop >> 8; // 256 bits = 2^8
   
    register const counter_t step_4 = step << 2;
    register uint32v8_bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(uint32v8_bitvector_t));
    #if is_signed(counter_t)
    register uint32v8_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(uint32v8_bitvector_t));
    #else
    register uint32v8_bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(uint32v8_bitvector_t));
    #endif

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
    
    register const uint32v8_bitvector_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[(range_stop_vector)],sizeof(uint32v8_bitvector_t));
    
    for (counter_t i=5; i-- && likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    timer_laptime(time_applyMask_vector); verbose8( printf("\n"); )
}
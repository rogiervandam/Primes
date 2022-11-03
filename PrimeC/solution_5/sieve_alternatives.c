static void sieve_block_stripe(struct sieve_state *sieve, const counter_t block_start, const counter_t block_stop, const counter_t prime_start) {
    counter_t prime = prime_start;
    counter_t start = prime * prime * 2 + prime * 2;
    counter_t step  = prime * 2 + 1;
    bitword_t* bitarray = sieve->bitarray;

    debug printf("Block strip for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop);
    
    // while (start <= block_stop) {
    //     step  = prime * 2 + 1;
    //     if unlikely(step > SMALLSTEP_FASTER) break;
    //     if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
    //     setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
    //     prime = searchBitFalse(bitarray, prime+1 );
    //     start = prime * prime * 2 + prime * 2;
    // }
    
    // while (start <= block_stop) {
    //     step  = prime * 2 + 1;
    //     if unlikely(step > MEDIUMSTEP_FASTER) break;
    //     if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
    //     setBitsTrue_mediumStep(bitarray, start, step, block_stop);
    //     prime = searchBitFalse(bitarray, prime+1 );
    //     start = prime * prime * 2 + prime * 2;
    // }

//     counter_t start1 = 0; // save value
//     counter_t step1 = 0; // save value
//     while (start <= block_stop) {
//         step  = prime * 2 + 1;
//         if (step > 64) break;
//         if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
//         start1 = start; // save value
//         step1 = step; // save value
//         prime = searchBitFalse(bitarray, prime+1 );
//         start = prime * prime * 2 + prime * 2;
//         step  = prime * 2 + 1;
//         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
//         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop);
// //        else                     setBitsTrue_largeSteps(bitarray, start1, step1, block_stop);
//         prime = searchBitFalse(bitarray, prime+1 );
//         start = prime * prime * 2 + prime * 2;
//     }

    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if unlikely(step > VECTORSTEP_FASTER) break;
        if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }

    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
        setBitsTrue_largeRange(bitarray, start, step, block_stop);
        prime = searchBitFalse_longRange(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }

    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        if likely(start <= block_stop)
            setBitsTrue_largeSteps(bitarray, start, step, block_stop);
        prime = searchBitFalse_longRange(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }
}

static void sieve_block_stripe_from0(bitword_t* bitarray, const counter_t block_stop, const counter_t prime_start) {
    counter_t prime = prime_start;
    counter_t start = prime * prime * 2 + prime * 2;
    counter_t step  = prime * 2 + 1;

    debug printf("Block strip for block 0 - %ju\n",(uintmax_t)block_stop);
    
    while (start <= block_stop && step < VECTORSTEP_FASTER) {
        setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
        step  = prime * 2 + 1;
    }

    while (start <= block_stop) {
        setBitsTrue_largeSteps(bitarray, start, step, block_stop);
        prime = searchBitFalse_longRange(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
        step  = prime * 2 + 1;
    }
}

static void sieve_block_stripe(bitword_t* bitarray, const counter_t block_start, const counter_t block_stop, const counter_t prime_start) {
    counter_t prime = prime_start;
    counter_t start = prime * prime * 2 + prime * 2;
    counter_t step  = prime * 2 + 1;
    if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);

    debug printf("Block strip for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop);
    
    // while (start <= block_stop && step < VECTORSTEP_FASTER) {
    //     setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
    //     prime = searchBitFalse(bitarray, prime+1 );
    //     start = prime * prime * 2 + prime * 2;
    //     step  = prime * 2 + 1;
    //     if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
    // }

    while (start <= block_stop) {
        setBitsTrue_largeSteps(bitarray, start, step, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
        step  = prime * 2 + 1;
        if likely(block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
    }
}


#define forward_distance 3
static void extendSieve_shiftright_ptr(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));
   
    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
    register counter_t source_word = wordindex(source_start);
    register counter_t copy_word = wordindex(copy_start);

    if (copy_word >= destination_stop_word) { 
        bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose data
                                | (bitarray[copy_word] >> shift_flipped))
                                & keepmask(copy_start) & chopmask(destination_stop);
        return; // rapid exit for one word variant
    }

    bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose data
                                | (bitarray[copy_word] >> shift_flipped))
                                & keepmask(copy_start);

    copy_word++;

    debug printf("..copy distance %ju\n",(uintmax_t) copy_word - (uintmax_t) source_word);
    if (((copy_word - source_word) > forward_distance)) {
        // shiftvec(&bitarray[copy_word], &bitarray[source_word],size_word,shift );
        
        bitword_t* __restrict copy_ptr   = &bitarray[copy_word];
        bitword_t* __restrict source_ptr = &bitarray[source_word];
        // bitword_t* copy_ptr   = &bitarray[copy_word];
        // bitword_t* source_ptr = &bitarray[source_word];
        bitword_t* __restrict dest_ptr   = &bitarray[destination_stop_word];
        counter_t size_word_ptr   = dest_ptr - copy_ptr;

        #pragma GCC ivdep 
        for (counter_t i = 0; (i+forward_distance) < size_word_ptr; i+=forward_distance, copy_ptr+=forward_distance, source_ptr+=forward_distance) {
            #pragma GCC ivdep
            for (counter_t j = 0; j < forward_distance; ++j) 
                *(copy_ptr+j)  = (*(source_ptr+j  ) >> shift_flipped); 
            #pragma GCC ivdep
            for (counter_t j = 0; j < forward_distance; ++j) 
                *(copy_ptr+j) |= (*(source_ptr+j+1) << shift);
        }

        size_word_ptr = dest_ptr - copy_ptr;
        #pragma GCC ivdep 
        for (counter_t i=0; i <= size_word_ptr; i++)
            *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);

        // #pragma GCC ivdep
        // for (; i <= size_word; i++) 
        //     *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);
    }
    else {
        register counter_t i = 0;
        bitword_t* copy_ptr   = &bitarray[copy_word];
        bitword_t* source_ptr = &bitarray[source_word];
        bitword_t* dest_ptr   = &bitarray[destination_stop_word];
        counter_t size_word_ptr   = dest_ptr - copy_ptr;
        for (; i <= size_word_ptr; i++)
            *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);
    }

    // for (; i <= size_word; i++) 
    //     *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);

    // for (; i <= size_word; i++) 
    //     bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_word+i+1] << shift);

    // for (; copy_word <= destination_stop_word; copy_word++, source_word++ ) 
    //     bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] << shift);
}


//static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
//    const bitword_t* destination_stop_ptr = &bitarray[wordindex(destination_stop)];
//    const counter_t copy_start = source_start + size;
//    register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
//    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
//    register bitword_t* source_ptr = &bitarray[wordindex(source_start)];
//    register bitword_t* copy_ptr = &bitarray[wordindex(copy_start)];
//    const bitword_t* aligned_copy_ptr = min(source_ptr + size, destination_stop_ptr); // after <<size>> words, just copy at word level
//
//    *copy_ptr |= ((*source_ptr >> shift) | (*(source_ptr+1) << shift_flipped)) & ~chopmask2(copy_start); // because this is the first word, dont copy the extra bits in front of the source
//    copy_ptr++;
//    source_ptr++;
//
//    while (copy_ptr+3 <= aligned_copy_ptr) {
//        bitword_t source0 = *source_ptr >> shift;
//        bitword_t source1 = *(source_ptr+1);
//        *copy_ptr = (source0) | (source1 << shift_flipped);
//        bitword_t source2 = *(source_ptr+2);
//        *(copy_ptr+1) = (source1 >> shift) | (source2 << shift_flipped);
//        bitword_t source3 = *(source_ptr+3);
//        *(copy_ptr+2) = (source2 >> shift) | (source3 << shift_flipped);
//
//        copy_ptr+=3;
//        source_ptr+=3;
//    }
//
//    while (copy_ptr <= aligned_copy_ptr) {
//        register bitword_t source0 = *source_ptr >> shift;
//        source_ptr++;
//        register bitword_t source1 = *source_ptr << shift_flipped;
//        *copy_ptr = source0 | source1;
//        copy_ptr++;
//    }
//
//    if (copy_ptr >= destination_stop_ptr) return;
//
//    source_ptr = copy_ptr - size; // recalibrate
//    const size_t memsize = (size_t)size*sizeof(bitword_t);
//     while (copy_ptr + size <= destination_stop_ptr) {
//         memcpy(copy_ptr, source_ptr, memsize );
//         copy_ptr += size;
//     }
//
//    while (copy_ptr <= destination_stop_ptr) {
//        // *copy_ptr++ = *source_ptr++;
//        *copy_ptr = *source_ptr;
//        copy_ptr++;
//        source_ptr++;
//    }
//
//}

static inline void applyMask_ptr(bitword_t* __restrict bitarray, const counter_t step, const counter_t range_stop, const bitword_t mask, counter_t index_word) {
   const counter_t range_stop_word = wordindex(range_stop);
   register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],8);
   register bitword_t* __restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitarray[((range_stop_word>step*5) ? (range_stop_word - step*5):0)],8);

   //#pragma GCC unroll 10
   #pragma GCC ivdep
   while likely(index_ptr < fast_loop_ptr) {
       *index_ptr |= mask;
       index_ptr+=step;
       *index_ptr |= mask;
       index_ptr+=step;
       *index_ptr |= mask;
       index_ptr+=step;
       *index_ptr |= mask;
       index_ptr+=step;
       *index_ptr |= mask;
       index_ptr+=step;
   }

   register const bitword_t* __restrict range_stop_ptr = &bitarray[(range_stop_word)];
   while likely(index_ptr < range_stop_ptr) {
       *index_ptr |= mask;
       index_ptr+=step;
   }

   if (index_ptr == range_stop_ptr) { // index_ptr could also end above range_stop_ptr, depending on steps. Then a chop is not needed
      *index_ptr |= (mask & chopmask(range_stop));
   }

//    const counter_t range_stop_word = wordindex(range_stop);
//    bitword_t* __restrict index_ptr = &bitarray[index_word];
//    bitword_t* __restrict fast_loop_ptr = &bitarray[((range_stop_word>step*4) ? (range_stop_word - step*4):0)];//>step_4) ? (range_stop_word - step_4) : 0];
//    bitword_t* __restrict range_stop_ptr = &bitarray[(range_stop_word)];//>step_4) ? (range_stop_word - step_4) : 0];
//    const int loop_iterations = ((range_stop_word - index_word) / (step*4));

//      debug printf("..%ju loop iterations for step %ju range in words (%ju - %ju)\n",(uintmax_t)loop_iterations,step, index_word, range_stop_word);

//     //#pragma GCC unroll 1
//    #pragma GCC ivdep
//    for ( int i=0; i < loop_iterations; i++) {
//        *(index_ptr) |= mask;
//        *(index_ptr+step) |= mask;
//        *(index_ptr+2*step) |= mask;
//        *(index_ptr+3*step) |= mask;
//        index_ptr += 4*step;
//    }

//    while ( index_ptr < range_stop_ptr) {
//        *index_ptr |= mask;
//        index_ptr+=step;
//    }

//    if (index_ptr == range_stop_ptr) {
//       *range_stop_ptr |= (mask & chopmask(range_stop));
//    }
//#endif
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
static inline void setBitsTrue_largeRange(bitword_t* __restrict bitarray, const counter_t range_start, const counter_t step, const counter_t range_stop) {
    debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange (%ju occurances)\n", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));
    const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;

    //#pragma GCC unroll 16
    #pragma GCC ivdep
    for (register counter_t index = range_start; index < range_stop_unique; index += step) {
        #if __APPLE__
            applyMask_array(bitarray, step, range_stop, markmask(index), wordindex(index));
        #else
            applyMask_ptr(bitarray, step, range_stop, markmask(index), wordindex(index));
        #endif
    }
}


static inline void applyMask_vector_ptr(bitvector_t* __restrict bitarray, const counter_t step, const counter_t range_stop, const bitvector_t mask, counter_t index_vector) {
    const counter_t range_stop_vector = vectorindex(range_stop);
    register bitvector_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_vector],8);
    register bitvector_t* __restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitarray[((range_stop_vector>step*5) ? (range_stop_vector - step*5):0)],8);
    
    //#pragma GCC unroll 16
    #pragma GCC ivdep
    while likely(index_ptr < fast_loop_ptr) {
        *index_ptr |= mask; index_ptr+=step;
        *index_ptr |= mask; index_ptr+=step;
        *index_ptr |= mask; index_ptr+=step;
        *index_ptr |= mask; index_ptr+=step;
        *index_ptr |= mask; index_ptr+=step;
    }
    
    register const bitvector_t* __restrict range_stop_ptr = &bitarray[(range_stop_vector)];
    while likely(index_ptr <= range_stop_ptr) {
        *index_ptr |= mask; index_ptr+=step;
    }
}

static inline void applyMask_vector_array(bitvector_t* __restrict bitarray_word, const counter_t step, const counter_t range_stop, const bitvector_t mask, counter_t index_vector) {

    bitvector_t* __restrict bitarray_vector = __builtin_assume_aligned( (bitvector_t*) bitarray_word, anticiped_cache_line_bytesize);
    counter_t current_vector = index_vector;
    const counter_t range_stop_vector = vectorindex(range_stop);

    const counter_t step_2 = step * 2;
    const counter_t step_3 = step * 3;
    const counter_t step_4 = step * 4;

    if (current_vector+step_4 <= range_stop_vector) {
        register const counter_t loop_stop_vector = (range_stop_vector > step_4) ? (range_stop_vector - step_4) : 0;
        //#pragma GCC unroll 16
        #pragma GCC ivdep
        for(; current_vector <= loop_stop_vector; current_vector += step_4) {
            bitarray_vector[current_vector       ] |= mask;
            bitarray_vector[current_vector+step  ] |= mask;
            bitarray_vector[current_vector+step_2] |= mask;
            bitarray_vector[current_vector+step_3] |= mask;
        }
    }
    
    //#pragma GCC unroll 16
    #pragma GCC ivdep 
    for(; current_vector <= range_stop_vector; current_vector += step) {
        bitarray_vector[current_vector] |= mask;
    }
    
}

static void setBitsTrue_largeRange_vector(bitword_t* __restrict bitarray_word, counter_t range_start, const counter_t step, const counter_t range_stop) {
    debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange vector (%ju occurances)\n", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));

    // const counter_t range_stop_unique_oneword =  min(range_start + WORD_SIZE_counter * step, range_stop);
    // for (counter_t index = range_start; index <= range_stop_unique_oneword; index += step) {
    //     applyMask(bitarray_word, step, range_stop, markmask(index), wordindex(index));
    // }
    // return;

    bitvector_t* __restrict bitarray_vector = __builtin_assume_aligned( (bitvector_t*) bitarray_word, anticiped_cache_line_bytesize);
    
    // find out where the first complete vector is
    // printWord(range_start); printf("\n");
    // printWord(~VECTORMASK); printf("\n");
    // printWord(vectorstart(range_start)); printf("\n\n");
    counter_t range_start_atvector = vectorstart(range_start);
    if likely((range_start_atvector + step) < range_start) { // not the first step possible in this vector
        debug { printf("Range start+step %ju not at start of vector %ju\n",(uintmax_t)range_start+(uintmax_t)step, (uintmax_t)range_start_atvector); }

        range_start_atvector += VECTOR_SIZE; // find next vector
        if (unlikely(range_start_atvector > range_stop)) { // we should not be here; just handle without vector
            debug2 printf("..Marking and returning without vector\n");

            for (counter_t index = range_start; index <= range_stop; index += step) 
                bitarray_word[wordindex(index)] |= markmask(index);
            return;                 
        }

        debug2 printf("..Marking without vector until %ju\n",(uintmax_t)range_start_atvector);
        // register counter_t index = range_start; // outside to later adjust range_start
        //#pragma GCC unroll 16
        #pragma GCC ivdep 
        for (; range_start <= range_start_atvector; range_start += step) 
            bitarray_word[wordindex(range_start)] |= markmask(range_start);
    }
    
    const counter_t range_stop_unique =  min(range_start + VECTOR_SIZE_counter * step, range_stop);

    //#pragma GCC unroll 16
    #pragma GCC ivdep 
    for (counter_t index = range_start; index < range_stop_unique;) {
        const counter_t current_vector_start_word =  vectorindex(index) << (SHIFT_VECTOR - SHIFT_WORD);
        register bitvector_t quadmask = { };
        register counter_t word = wordindex(index) - current_vector_start_word;
        
        // build a quadmask
        //#pragma GCC unroll 16
        #pragma GCC ivdep 
        do {
            quadmask[word] |= markmask(index);
            index += step;
            word = wordindex(index) - current_vector_start_word;
        } while (word < (VECTOR_ELEMENTS));// && index <= range_stop_unique);
        
        // use mask on all n*step multiples
        register counter_t current_vector = current_vector_start_word >> (SHIFT_VECTOR - SHIFT_WORD);
        // const counter_t range_stop_vector = vectorindex(range_stop);

        applyMask_vector_ptr(bitarray_vector, step, range_stop, quadmask, current_vector);

        // if (current_vector+step_4 <= range_stop_vector) {
        //     register const counter_t loop_stop_vector = (range_stop_vector > step_4) ? (range_stop_vector - step_4) : 0;
        //      //#pragma GCC unroll 16
        //     #pragma GCC ivdep
        //     for(; current_vector <= loop_stop_vector; current_vector += step_4) {
        //         bitarray_vector[current_vector       ] |= quadmask;
        //         bitarray_vector[current_vector+step  ] |= quadmask;
        //         bitarray_vector[current_vector+step_2] |= quadmask;
        //         bitarray_vector[current_vector+step_3] |= quadmask;
        //     }
        // }


        // #pragma GCC ivdep 
        // for(; current_vector+step_4 < range_stop_vector; current_vector += step_4) {
        //     bitarray_vector[current_vector       ] |= quadmask;
        //     bitarray_vector[current_vector+step  ] |= quadmask;
        //     bitarray_vector[current_vector+step_2] |= quadmask;
        //     bitarray_vector[current_vector+step_3] |= quadmask;
        // }

        // #pragma GCC ivdep 
        // for(; current_vector < range_stop_vector; current_vector += step) {
        //     bitarray_vector[current_vector] |= quadmask;
        // }
        
        // if unlikely(current_vector == range_stop_vector) {
        //     counter_t index_word = current_vector * VECTOR_ELEMENTS;
        //     counter_t range_stop_word = wordindex(range_stop);
        //     if likely(index_word <= range_stop_word) {
        //         #pragma GCC ivdep
        //         for (word =0; word < VECTOR_ELEMENTS; word++) {
        //             if unlikely(index_word+word <= range_stop_word)
        //                 bitarray_word[index_word+word] |= quadmask[word];
        //         }
        //     }

        // }
    }
}
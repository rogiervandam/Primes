#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
#include <math.h>
#include <string.h>

#define debug if (0)
#define default_sieve_limit 1000000
#define default_blocksize (32*1024*8-1024)
#define default_sieve_duration 5
#define default_sample_duration 0.1
#define default_sample_max 5
#define default_verbose_level 1
#define default_tune_level 1
#define default_check_level 1
#define option_runonce 0

#define anticiped_cache_line_bytesize 128

// 64 bit
#define TYPE uint64_t

// calculate the rest dynamically
#define counter_t int64_t
#define bitshift_t int64_t
#define bitword_t TYPE

#define WORD_SIZE (sizeof(TYPE)*8)
#define WORD_SIZE_counter ((counter_t)(sizeof(TYPE)*8))
#define WORD_SIZE_bitshift ((bitshift_t)(sizeof(TYPE)*8))
#define pow(base,pow) (pow*((base>>pow)&1U))
#define SHIFT ((bitshift_t)(pow(WORD_SIZE,1)+pow(WORD_SIZE,2)+pow(WORD_SIZE,3)+pow(WORD_SIZE,4)+pow(WORD_SIZE,5)+pow(WORD_SIZE,6)+pow(WORD_SIZE,7)+pow(WORD_SIZE,8)))

// globals for tuning
counter_t global_SMALLSTEP_FASTER = 16;
counter_t global_MEDIUMSTEP_FASTER = WORD_SIZE;

#define SAFE_SHIFTBIT (bitword_t)1U
#define SAFE_ZERO  (bitword_t)0U
#define SMALLSTEP_FASTER ((counter_t)global_SMALLSTEP_FASTER)
#define MEDIUMSTEP_FASTER ((counter_t)global_MEDIUMSTEP_FASTER)
#define wordindex(index) (((counter_t)index) >> (bitshift_t)SHIFT)
// modern processors do a & over the shiftssize, so we only have to do that ourselve when using the shiftsize in calculations. 
#define bitindex(index) ((bitshift_t)(index))
// #define bitindex(index) ((bitshift_t)(index)&((bitword_t)(WORD_SIZE-1)))
#define bitindex_calc(index) ((bitshift_t)(index)&((bitword_t)(WORD_SIZE-1)))
#define  markmask(index) (SAFE_SHIFTBIT << bitindex(index))
#define  markmask_calc(index) (SAFE_SHIFTBIT << bitindex_calc(index))
// #define chopmask(index) ((SAFE_SHIFTBIT << bitindex(index))-SAFE_SHIFTBIT)
// #define chopmask2(index) (((bitword_t)2U << bitindex(index))-SAFE_SHIFTBIT)
#define chopmask(index) (~SAFE_ZERO >> (WORD_SIZE-1-bitindex_calc(index)))
#define chopmask2(index) chopmask(index)

#define min(a,b) ((a<b) ? a : b)

counter_t debug_hitpoint[5] = { 0,0,0,0,0};

struct sieve_state {
    bitword_t* bitarray;
    counter_t  bits;
    counter_t  size;
};

// use cache lines as much as possible - alignment might be key
#define ceiling(x,y) (((x) + (y) - 1) / (y)) // Return the smallest multiple N of y such that:  x <= y * N
static struct sieve_state *create_sieve(counter_t maxints) {
    struct sieve_state *sieve = aligned_alloc(8, sizeof(struct sieve_state));
    size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytesize*8) * anticiped_cache_line_bytesize; //make multiple of 8

    sieve->bitarray = aligned_alloc((size_t)anticiped_cache_line_bytesize, (size_t)memSize );
    sieve->bits     = maxints >> SAFE_SHIFTBIT;
    sieve->size     = maxints;

    // moved clearing the sieve with 0 to the sieve_block_extend
    // it gave weird malloc problems at this point
    return sieve;
}

static void delete_sieve(struct sieve_state *sieve) {
    free(sieve->bitarray);
    free(sieve);
}

// not much performance gain at smaller sieves, but its's nice to have an implementation
static inline counter_t searchBitFalse(bitword_t* bitarray, counter_t index) {
    counter_t newindex = index;
    while (bitarray[wordindex(newindex)] & markmask(newindex)) newindex++;

    counter_t index_word = wordindex(index);
    bitshift_t index_bit  = bitindex_calc(index);
    bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bit));  // take inverse to be able to use ctz
    index += distance;
    distance += index_bit;

    while (distance == WORD_SIZE_bitshift) { // to prevent a bug from optimzer
        index_word++;
        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
        index += distance;
    } 

    return index;
}

// not much performance gain at smaller sieves, but its's nice to have an implementation
static inline counter_t searchBitFalse_safe(bitword_t* bitarray, counter_t index) {
    while (bitarray[wordindex(index)] & markmask(index)) index++;
    return index;
}

static void inline applyMask(bitword_t* bitarray, const counter_t step, const counter_t range_stop, const bitword_t mask, counter_t index_word) {
//      register const counter_t step_2 = step * 2;
//      register const counter_t step_3 = step * 3;
//      register const counter_t step_4 = step * 4;
//      register const counter_t step_5 = step * 5;
//      register const counter_t range_stop_word = wordindex(range_stop);
//      register const counter_t loop_stop_word = (range_stop_word > step_4) ? (range_stop_word - step_4) : (counter_t)0U;
// //     register counter_t index_word = range_start_word;

//      while (index_word < loop_stop_word) {
//          bitarray[index_word         ] |= mask;
//          bitarray[index_word + step  ] |= mask;
//          bitarray[index_word + step_2] |= mask;
//          bitarray[index_word + step_3] |= mask;
//          bitarray[index_word + step_4] |= mask;
//          index_word += step_5;
//      }
    
//      while (index_word < range_stop_word) {
//          bitarray[index_word] |= mask;
//          index_word += step;
//      }

//      if (index_word == wordindex(range_stop)) {
//          bitarray[wordindex(range_stop)] |= (mask & chopmask2(range_stop));
//      }

//    ALTERNATIVE using pointers is faster in gcc
   const counter_t range_stop_word = wordindex(range_stop);
   register bitword_t* index_ptr = &bitarray[index_word];
   register bitword_t* fast_loop_ptr = &bitarray[((range_stop_word>step*5) ? (range_stop_word - step*5):0)];//>step_4) ? (range_stop_word - step_4) : 0];
   register bitword_t* range_stop_ptr = &bitarray[(range_stop_word)];//>step_4) ? (range_stop_word - step_4) : 0];

   while ( index_ptr < fast_loop_ptr) {
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

   while ( index_ptr < range_stop_ptr) {
       *index_ptr |= mask;
       index_ptr+=step;
   }

   if (index_ptr == range_stop_ptr) {
      *range_stop_ptr |= (mask & chopmask2(range_stop));
   }


}

// set bits by creating a pattern and then extending it to word and range size
static void inline setBitsTrue_smallStep(bitword_t* bitarray, const counter_t range_start, const bitshift_t step, const counter_t range_stop) {

    // build the pattern in a word
	bitword_t pattern = SAFE_SHIFTBIT;
    for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) {
        pattern |= (pattern << patternsize);
    }

    const counter_t range_stop_word = wordindex(range_stop);
    counter_t copy_word = wordindex(range_start);
 
    if (copy_word == range_stop_word) { // shortcut
       bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask2(range_stop)) ;
       return;
    }

    // from now on, we are before range_stop_word
    // first word is special, because it should not set bits before the range_start_bit
    bitarray[copy_word] |= (pattern << (bitshift_t)bitindex(range_start));
    pattern = (pattern << (bitindex_calc(range_start) % step)); // correct for inital offset  

    bitshift_t pattern_shift = (bitshift_t) WORD_SIZE % step;
    bitshift_t pattern_shift_flipped = (bitshift_t)WORD_SIZE - pattern_shift - pattern_shift;
    copy_word++;

    while (copy_word < range_stop_word) {
        pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
        bitarray[copy_word] |= pattern;
        copy_word++;
    } 

    pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
    bitarray[copy_word] |= pattern & chopmask2(range_stop);
}

// Medium steps could be within the same word.
// By joining the masks and then writing to memory, we might save some time.
// This is especially true for longer ranges
static void inline setBitsTrue_mediumStep(bitword_t* bitarray, const counter_t range_start, const counter_t step, const counter_t range_stop) {
    const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;

    if (range_stop_unique > range_stop) { // the range will not repeat itself; no need to try to resuse the mask
        for (counter_t index = range_start; index <= range_stop;) {
            counter_t index_word = wordindex(index);
            bitword_t mask = SAFE_ZERO;
            do {
                mask |= markmask(index);
                index += step;
            } while (index_word == wordindex(index));
            bitarray[index_word] |= mask;
        }
    }
    else { // this mask will reoccur at a interval of step words -> fill mask and reapply as a interval of step
        for (counter_t index = range_start; index <= range_stop_unique;) {
            register counter_t index_word = wordindex(index);
            register bitword_t mask = SAFE_ZERO;
            do {
                mask |= markmask(index);
                index += step;
            } while (index_word == wordindex(index));
            applyMask(bitarray, step, range_stop, mask, index_word);
        }
    }
}

// small ranges (< WORD_SIZE * step) mean the mask is unique
static inline void setBitsTrue_smallRange(bitword_t* bitarray, const counter_t range_start, const counter_t step, const counter_t range_stop) {
    for (counter_t index = range_start; index <= range_stop; index += step) {
        bitarray[wordindex(index)] |= markmask(index);
    }
}

// small ranges (< WORD_SIZE * step) mean the mask is unique
static void setBitsTrue_race(bitword_t* bitarray, counter_t index1, counter_t index2, const counter_t step1, const counter_t step2, const counter_t range_stop) {

    counter_t index1_word = wordindex(index1);
    counter_t index2_word = wordindex(index2);
    
    while (1) {
        if (index1_word == index2_word) {
            bitword_t mask = SAFE_ZERO;
            counter_t index_word = index1_word;
            do {
                mask |= markmask(index1);
                index1 += step1;
                index1_word = wordindex(index1);
            } while (index1_word == index_word);
            do {
                mask |= markmask(index2);
                index2 += step2;
                index2_word = wordindex(index2);
            } while (index2_word == index_word);
            bitarray[index_word] |= mask;
        }

        // because step is larger, index2 is the most likely to get out of bounds first
        if (index2 > range_stop) {
            while (index1 <= range_stop) {
                bitarray[wordindex(index1)] |= markmask(index1);
                index1 += step1;
            }
            return;
        }

        if (index1 > range_stop) {
            while (index2 <= range_stop) {
                bitarray[wordindex(index2)] |= markmask(index2);
                index2 += step2;
            }
            return;
        }

        while (index1_word < index2_word) {
            bitarray[index1_word] |= markmask(index1);
            index1 += step1;
            index1_word = wordindex(index1);
        }
        
        while (index2_word < index1_word){
            bitarray[index2_word] |= markmask(index2);
            index2 += step2;
            index2_word = wordindex(index2);
        }

    }
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
static void setBitsTrue_largeRange(bitword_t* bitarray, const counter_t range_start, const counter_t step, const counter_t range_stop) {
    counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
    for (counter_t index = range_start; index <= range_stop_unique; index += step) {
        bitword_t mask = markmask(index);
        applyMask(bitarray, step, range_stop, mask, wordindex(index));
    }
}

static void extendSieve_smallSize(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    counter_t source_word = wordindex(source_start);
    bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | (bitarray[source_word+1] << (WORD_SIZE-bitindex_calc(source_start)))) & chopmask2(size);
    for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZE_bitshift; pattern_size += pattern_size) pattern |= (pattern << pattern_size);

    counter_t copy_start = source_start + size;
    counter_t copy_word = wordindex(copy_start);
    bitarray[copy_word] |= (pattern << bitindex(copy_start));

    counter_t destination_stop_word = wordindex(destination_stop);
    if (copy_word == destination_stop_word) return;

    bitshift_t pattern_shift = WORD_SIZE_counter % size;
    bitshift_t pattern_size = WORD_SIZE - pattern_shift;
    bitshift_t shift = WORD_SIZE_bitshift - bitindex_calc(copy_start);

    while (copy_word < destination_stop_word) { // = will be handled as well because increment is after this 
        copy_word++;
        bitarray[copy_word] = (pattern << (pattern_size-shift)) | (pattern >> shift);
        shift = (shift + pattern_shift) & ((WORD_SIZE_bitshift-1));  // alternative, but faster
    }
}

static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    counter_t source_word = wordindex(source_start);
    counter_t copy_word = wordindex(copy_start);
    
    bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);

    while (copy_word + size <= destination_stop_word) {
        memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
        copy_word += size;
    }

   while (copy_word < destination_stop_word) {
        bitarray[copy_word] = bitarray[source_word];
        source_word++;
        copy_word++;
    }

}

static void extendSieve_shiftright(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
    const bitshift_t shift_flipped = WORD_SIZE-shift;
    counter_t source_word = wordindex(source_start);
    counter_t copy_word = wordindex(copy_start);
    counter_t source_lastword = wordindex(copy_start);
    bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose data
                                | (bitarray[source_lastword] >> shift_flipped))
                                & ~chopmask2(copy_start);
    copy_word++;
    source_word++;

    const counter_t aligned_copy_word = min(source_word + size, destination_stop_word); // after <<size>> words, just copy at word level
    const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_copy_word - 2) : 0; // safe for unsigned ints
    while (copy_word < fast_loop_stop_word) {
            bitword_t sourcen = bitarray[source_word-1];
            bitword_t source0 = bitarray[source_word  ];

            bitarray[copy_word  ] = (source0 << shift) | (sourcen >> shift_flipped);
            bitword_t source1 = bitarray[source_word+1];
            bitarray[copy_word+1] = (source1 << shift) | (source0 >> shift_flipped);
            copy_word += 2;
            source_word += 2;
    }

    while (copy_word <= aligned_copy_word) {
        bitarray[copy_word] = (bitarray[source_word-1] >> shift_flipped) | (bitarray[source_word] << shift);
        copy_word++;
        source_word++;
    }
    
    if (copy_word >= destination_stop_word) return;

    source_word = copy_word - size;
    while (copy_word + size <= destination_stop_word) {
        memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
        copy_word += size;
    }

    while (copy_word <= destination_stop_word) {
        bitarray[copy_word] = bitarray[source_word];
        copy_word++;
        source_word++;
    }

}


// static inline counter_t extendSieve_shiftleft_unrolled(bitword_t* bitarray, const counter_t aligned_copy_word, const bitshift_t shift, counter_t copy_word, counter_t source_word) {
//     const bitshift_t shift_flipped = WORD_SIZE-shift;
//     const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_copy_word - 2) : 0; // safe for unsigned ints
//     while (copy_word < fast_loop_stop_word) {
//         bitword_t source0 = bitarray[source_word  ];
//         bitword_t source1 = bitarray[source_word+1];
//         bitarray[copy_word  ] = (source0 >>= shift) | (source1 << shift_flipped);
//         bitword_t source2 = bitarray[source_word+2];
//         bitarray[copy_word+1] = (source1 >>= shift) | (source2 <<= shift_flipped);
//         copy_word += 2;
//         source_word += 2;
//     }
//     return copy_word;
// }

static inline counter_t extendSieve_shiftleft_unrolled(bitword_t* bitarray, const counter_t aligned_copy_word, const bitshift_t shift, counter_t copy_word, counter_t source_word) {
    const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_copy_word - 2) : 0; // safe for unsigned ints
    register const bitshift_t shift_flipped = WORD_SIZE-shift;
    counter_t distance = 0;
    while (copy_word < fast_loop_stop_word) {
        bitword_t source0 = bitarray[source_word  ];
        bitword_t source1 = bitarray[source_word+1];
        bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
        bitword_t source2 = bitarray[source_word+2];
        bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
        copy_word += 2;
        source_word += 2;
        distance += 2;
    }
    return distance;
}

static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    const bitword_t* destination_stop_ptr = &bitarray[wordindex(destination_stop)];
    const counter_t copy_start = source_start + size;
    register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
    register const bitshift_t shift_flipped = WORD_SIZE-shift;
    register bitword_t* source_ptr = &bitarray[wordindex(source_start)];
    register bitword_t* copy_ptr = &bitarray[wordindex(copy_start)];
    const bitword_t* aligned_copy_ptr = min(source_ptr + size, destination_stop_ptr); // after <<size>> words, just copy at word level

    *copy_ptr |= ((*source_ptr >> shift) | (*(source_ptr+1) << shift_flipped)) & ~chopmask2(copy_start); // because this is the first word, dont copy the extra bits in front of the source
    copy_ptr++;
    source_ptr++;

    while (copy_ptr+3 <= aligned_copy_ptr) {
        bitword_t source0 = *source_ptr >> shift;
        bitword_t source1 = *(source_ptr+1);
        *copy_ptr = (source0) | (source1 << shift_flipped);
        bitword_t source2 = *(source_ptr+2);
        *(copy_ptr+1) = (source1 >> shift) | (source2 << shift_flipped);
        bitword_t source3 = *(source_ptr+3);
        *(copy_ptr+2) = (source2 >> shift) | (source3 << shift_flipped);

        copy_ptr+=3;
        source_ptr+=3;
    }

    while (copy_ptr <= aligned_copy_ptr) {
        register bitword_t source0 = *source_ptr >> shift;
        source_ptr++;
        register bitword_t source1 = *source_ptr << shift_flipped;
        *copy_ptr = source0 | source1;
        copy_ptr++;
    }

    if (copy_ptr >= destination_stop_ptr) return;

    source_ptr = copy_ptr - size; // recalibrate
    const size_t memsize = size*sizeof(bitword_t);
    // while (copy_ptr + size <= destination_stop_ptr) {
    //     memcpy(copy_ptr, source_ptr, memsize );
    //     copy_ptr += size;
    // }

    while (copy_ptr <= destination_stop_ptr) {
        // *copy_ptr++ = *source_ptr++;
        *copy_ptr = *source_ptr;
        copy_ptr++;
        source_ptr++;
    }

}

// static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
//     const counter_t destination_stop_word = wordindex(destination_stop);
//     const counter_t copy_start = source_start + size;
//     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
//     register const bitshift_t shift_flipped = WORD_SIZE-shift;
//     register counter_t source_word = wordindex(source_start);
//     register counter_t copy_word = wordindex(copy_start);
//     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
//                                 | (bitarray[source_word+1] << shift_flipped))
//                                 & ~chopmask(copy_start); // because this is the first word, dont copy the extra bits in front of the source

//     copy_word++;
//     source_word++;

//     const counter_t aligned_copy_word = min(source_word + size, destination_stop_word); // after <<size>> words, just copy at word level
//     // const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, copy_word, source_word);
//     // source_word += distance;
//     // copy_word += distance;

//     while (copy_word <= aligned_copy_word) {
//         register bitword_t source0 = bitarray[source_word  ] >> shift;
//         source_word++;
//         register bitword_t source1 = bitarray[source_word  ] << shift_flipped;
//         bitarray[copy_word] = source0 | source1;
//         copy_word++;
//     }

//     if (copy_word >= destination_stop_word) return;

//     source_word = copy_word - size; // recalibrate
//     const size_t memsize = size*sizeof(bitword_t);
//     while (copy_word + size <= destination_stop_word) {
//         // memcpy(&bitarray[copy_word], &bitarray[source_word], (size_t)size*sizeof(bitword_t) );
//         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
//         copy_word += size;
//     }

//     while (copy_word <= destination_stop_word) {
//         bitarray[copy_word] = bitarray[source_word];
//         copy_word++;
//         source_word++;
//     }

// }

static inline void extendSieve(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop)	{
    if (size < WORD_SIZE)           extendSieve_smallSize (bitarray, source_start, size, destination_stop);

    const counter_t copy_start  = source_start + size;
    const bitshift_t copy_bit   = bitindex_calc(copy_start);
    const bitshift_t source_bit = bitindex_calc(source_start);

    if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_start, size, destination_stop);
    else if (source_bit < copy_bit) extendSieve_shiftright(bitarray, source_start, size, destination_stop);
    else                            extendSieve_aligned   (bitarray, source_start, size, destination_stop);
}

static void sieve_block_stripe(struct sieve_state *sieve, const counter_t block_start, const counter_t block_stop, const counter_t prime_start) {
    counter_t prime = prime_start;
    counter_t start = prime * prime * 2 + prime * 2;
    counter_t step  = prime * 2 + 1;
    bitword_t* bitarray = sieve->bitarray;
    
    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if (step > SMALLSTEP_FASTER) break;
        if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }
    
    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if (step > MEDIUMSTEP_FASTER) break;
        if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        setBitsTrue_mediumStep(bitarray, start, step, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }

    counter_t start1 = 0; // save value
    counter_t step1 = 0; // save value
    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if (step > 64) break;
        if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        start1 = start; // save value
        step1 = step; // save value
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
        step  = prime * 2 + 1;
        if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop);
        else                     setBitsTrue_smallRange(bitarray, start1, step1, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }
    
    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        if (start + step * WORD_SIZE_counter > block_stop) break;
        setBitsTrue_largeRange(bitarray, start, step, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }

    while (start <= block_stop) {
        step  = prime * 2 + 1;
        if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);
        setBitsTrue_smallRange(bitarray, start, step, block_stop);
        prime = searchBitFalse(bitarray, prime+1 );
        start = prime * prime * 2 + prime * 2;
    }
}

struct block {
    counter_t pattern_size; // size of pattern applied 
    counter_t pattern_start; // start of pattern
    counter_t prime; // next prime to be striped
};

// returns prime that could not be handled:
// start is too large
// range is too big
static struct block sieve_block_extend(struct sieve_state *sieve, const counter_t block_start, const counter_t block_stop) {
    counter_t prime            = 0;
    counter_t patternsize_bits = 1;
    counter_t pattern_start    = 0;
    counter_t range_stop       = block_stop;
    bitword_t* bitarray        = sieve->bitarray;
    struct block block = { .prime = 0, .pattern_start = 0, .pattern_size = 0 };

    sieve->bitarray[0] = SAFE_ZERO; // only the first word has to be cleared; the rest is populated by the extension procedure
    
    do {
        prime = searchBitFalse(bitarray, prime+1);
        counter_t start = prime * prime * 2 + prime * 2;
        if (start > block_stop) break;

        const counter_t step  = prime * 2 + 1;
        if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime) % step);

        range_stop = block_start + patternsize_bits * step * 2;  // range is x2 so the second block cointains all multiples of primes
        block.pattern_size = patternsize_bits;
        block.pattern_start = pattern_start;
        if (range_stop > block_stop) return block; //range_stop = block_stop;

        if (patternsize_bits>1) {
            pattern_start = block_start | patternsize_bits;
            extendSieve(bitarray, pattern_start, patternsize_bits, range_stop);
        }
        patternsize_bits *= step;

        if      (step < SMALLSTEP_FASTER)  setBitsTrue_smallStep (bitarray, start, (bitshift_t)step, range_stop);
        else if (step < MEDIUMSTEP_FASTER) setBitsTrue_mediumStep(bitarray, start, step, range_stop);
        else                               setBitsTrue_largeRange(bitarray, start, step, range_stop);
        block.prime = prime;
    } while (range_stop < block_stop);

    return block;
}

static struct sieve_state *sieve(const counter_t maxints, const counter_t blocksize) {
    struct sieve_state *sieve = create_sieve(maxints);
    counter_t prime         = 0;
    counter_t block_start   = 0;
    counter_t block_stop    = blocksize-1;
    bitword_t* bitarray        = sieve->bitarray;

    // fill the whole sieve bij adding en copying incrementally
    struct block block = sieve_block_extend(sieve, 0, sieve->bits);
    extendSieve(bitarray, block.pattern_start, block.pattern_size, sieve->bits);
    prime = block.prime;

    do {
        if (block_stop > sieve->bits) block_stop = sieve->bits;
        prime = searchBitFalse(bitarray, prime);
        sieve_block_stripe(sieve, block_start, block_stop, prime);
        // sieve_block_stripe(bitarray, block_start, block_stop, prime+1);
        block_start += blocksize;
        block_stop += blocksize;
    } while (block_start <= sieve->bits);

    return sieve;
}

// https://stackoverflow.com/questions/31117497/fastest-integer-square-root-in-the-least-amount-of-instructions
static inline counter_t isqrt(counter_t val) {
    counter_t temp, g=0, b = 0x8000, bshft = 15;
    do {
        if (val >= (temp = (((g << 1) + b)<<bshft--))) {
           g += b;
           val -= temp;
        }
    } while (b >>= 1);
    return g;
}

static void show_primes(struct sieve_state *sieve) {
    counter_t       bits = sieve->bits;
    bitword_t  *bitarray = sieve->bitarray;
    counter_t primecount = 1;    // We already have 2
    for (counter_t factor=1; factor < bits; factor++) {
        if ((bitarray[wordindex(factor)] & markmask(factor))==0) {
            if (primecount < 100) {
                printf("%3ju ",(uintmax_t)factor*2+1);
                if (primecount % 10 == 0) printf("\n");
                printf(" \b"); 
            }
            primecount++;
        }
    }
    puts("");
}

static counter_t count_primes(struct sieve_state *sieve) {
    counter_t       bits = sieve->bits;
    bitword_t  *bitarray = sieve->bitarray;
    counter_t primecount = 1;    // We already have 2
    counter_t     factor = 1;
    do {
        primecount++;
        counter_t last_prime = factor;
        counter_t prime_predict = factor+1;
        while (bitarray[wordindex(prime_predict)] & markmask(prime_predict) ) { prime_predict++; }

        factor = searchBitFalse_safe(bitarray, factor+1); 
    } while (factor < bits);
    return primecount;
}

static void deepAnalyzePrimes(struct sieve_state *sieve) {
    printf("DeepAnalyzing\n");
    counter_t range_to =  sieve->bits;
    counter_t warn_prime = 0;
    counter_t warn_nonprime = 0;
    for (counter_t prime = 1; prime < range_to; prime++ ) {
        if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
            counter_t q = (isqrt(prime*2+1)|1)*2+1;
            for(counter_t c=1; c<=q; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
                    if (warn_prime++ < 30) {
                        printf("Number %ju (%ju) was marked prime, but %ju * %ju = %ju\n", (uintmax_t)prime*2+1, (uintmax_t)prime, (uintmax_t)c*2+1, (uintmax_t)((prime*2+1)/(c*2+1)), (uintmax_t)prime*2+1 );
                    }
                }
            }
        }
        else {
            counter_t q = (isqrt(prime*2+1)|1)*2+1;
            counter_t c_prime = 0;
            for(counter_t c=1; c<=q; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
                    c_prime++;
                    break;
                }
            }
            if (c_prime==0) {
                if (warn_nonprime++ < 30) {
                    printf("Number %ju (%ju) was marked non-prime, but no factors found. So it is prime\n", (uintmax_t)prime*2+1,(uintmax_t) prime);
                }
            }
        }
    }
}


int validatePrimeCount(struct sieve_state *sieve, int option_verboselevel) {

    counter_t primecount = count_primes(sieve);
    counter_t valid_primes;
    switch(sieve->size) {
        case 10:            valid_primes = 4;        break;
        case 100:           valid_primes = 25;       break;
        case 1000:          valid_primes = 168;      break;
        case 10000:         valid_primes = 1229;     break;
        case 100000:        valid_primes = 9592;     break;
        case 1000000:       valid_primes = 78498;    break;
        case 10000000:      valid_primes = 664579;   break;
        case 100000000:     valid_primes = 5761455;  break;
        case 1000000000:    valid_primes = 50847534; break;
        default:            valid_primes=-1;
    }

    int valid = (valid_primes == primecount);
    if (valid  && option_verboselevel >= 4) printf("Result: Sievesize %ju is expected to have %ju primes. algorithm produced %ju primes\n",(uintmax_t)sieve->size,(uintmax_t)valid_primes,(uintmax_t)primecount );
    if (!valid && option_verboselevel >= 1) {
        printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produced %ju primes\n",(uintmax_t)sieve->size,(uintmax_t)valid_primes,(uintmax_t)primecount );
        if (!valid && option_verboselevel >= 2) show_primes(sieve);
    }
    if (!valid && option_verboselevel >= 3) deepAnalyzePrimes(sieve);
    return (valid);
}

void usage(char *name) {
    fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
    fprintf(stderr, "Options:\n");
    fprintf(stderr, "  --verbose <level> Show more output to a certain level:\n");
    fprintf(stderr, "                    1 - show phase progress\n");
    fprintf(stderr, "                    2 - show general progress within the phase\n");
    fprintf(stderr, "                    3 - show actual work\n");
    fprintf(stderr, "  --check           check the correctness of the algorithm\n");
    fprintf(stderr, "  --tune  <level>   find the best settings for the current os and hardware\n");
    fprintf(stderr, "                    1 - fast tuning\n");
    fprintf(stderr, "                    2 - refined tuning\n");
    fprintf(stderr, "                    3 - maximum tuning (takes long)\n");
    exit(1);
}

typedef struct  {
    counter_t maxints;
    counter_t blocksize_bits;
    counter_t blocksize_kb;
    counter_t free_bits;
    counter_t smallstep_faster;
    counter_t mediumstep_faster;
    counter_t sample_max;
    double    sample_duration;
    counter_t passes;
    double    elapsed_time;
    double    avg;
} tuning_result_type;

int compare_tuning_result(const void *a, const void *b) {
    tuning_result_type *resultA = (tuning_result_type *)a;
    tuning_result_type *resultB = (tuning_result_type *)b;
    return (resultB->avg > resultA->avg ? 1 : -1);
}

static void tune_benchmark(tuning_result_type* tuning_result, counter_t tuning_result_index) {
    counter_t passes = 0;
    double elapsed_time = 0;
    struct timespec start_time,end_time;
    struct sieve_state *sieve_instance;

    global_SMALLSTEP_FASTER = tuning_result[tuning_result_index].smallstep_faster;
    global_MEDIUMSTEP_FASTER = tuning_result[tuning_result_index].mediumstep_faster;

    clock_gettime(CLOCK_MONOTONIC,&start_time);
    while (elapsed_time <= tuning_result[tuning_result_index].sample_duration && passes < tuning_result[tuning_result_index].sample_max) {
        sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_result_index].blocksize_bits);//blocksize_bits);
        delete_sieve(sieve_instance);
        passes++;
        clock_gettime(CLOCK_MONOTONIC,&end_time);
        elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time.tv_nsec*1e-9;
    }
    tuning_result[tuning_result_index].passes = passes;
    tuning_result[tuning_result_index].elapsed_time = elapsed_time;
    tuning_result[tuning_result_index].avg = passes/elapsed_time;
}

static tuning_result_type tune(counter_t tune_level, counter_t maxints, counter_t option_verboselevel) {
    counter_t best_blocksize_bits = default_blocksize;

    double best_avg = 0;
    best_blocksize_bits = 0;
    counter_t best_smallstep_faster = 0;
    counter_t best_mediumstep_faster = 0;
    counter_t smallstep_faster_steps = 4;
    counter_t mediumstep_faster_steps = 4;
    counter_t freebits_steps = anticiped_cache_line_bytesize;
    counter_t sample_max = default_sample_max;
    double sample_duration = default_sample_duration;

    // determines the size of the resultset
    switch (tune_level) {
        case 1:
            smallstep_faster_steps  = WORD_SIZE/4;
            mediumstep_faster_steps = WORD_SIZE/4;
            freebits_steps = anticiped_cache_line_bytesize*8*2;
            sample_max = 4;
            sample_duration = 0.1;
            break;
        case 2:
            smallstep_faster_steps  = WORD_SIZE/8;
            mediumstep_faster_steps = WORD_SIZE/8;
            freebits_steps = anticiped_cache_line_bytesize*8;
            sample_max = 4;
            sample_duration = 0.2;
            break;
        case 3:
            smallstep_faster_steps  = WORD_SIZE/16;
            mediumstep_faster_steps = WORD_SIZE/16;
            freebits_steps = anticiped_cache_line_bytesize/2;
            sample_max = 4;
            sample_duration = 0.4;
            break;
    }
    
    if (option_verboselevel >= 1) printf("Tuning..."); if (option_verboselevel >= 2) printf("\n");
    const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(WORD_SIZE_counter/mediumstep_faster_steps)+1) * 32 * (size_t)(anticiped_cache_line_bytesize*8*4/freebits_steps);
    tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
    counter_t tuning_results=0;
    counter_t tuning_result_index=0;
    
    for (counter_t smallstep_faster = 0; smallstep_faster <= WORD_SIZE/2; smallstep_faster += smallstep_faster_steps) {
        for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; mediumstep_faster += mediumstep_faster_steps) {
            for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /= 2) {
                for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (free_bits < blocksize_kb * 1024 * 8)); free_bits += freebits_steps) {
                    counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;

                    // set variables
                    tuning_results++;
                    tuning_result[tuning_result_index].maxints = maxints;
                    tuning_result[tuning_result_index].sample_duration = sample_duration;
                    tuning_result[tuning_result_index].sample_max = sample_max;
                    tuning_result[tuning_result_index].blocksize_kb = blocksize_kb;
                    tuning_result[tuning_result_index].free_bits = free_bits;
                    tuning_result[tuning_result_index].blocksize_bits = blocksize_bits;
                    tuning_result[tuning_result_index].smallstep_faster = smallstep_faster;
                    tuning_result[tuning_result_index].mediumstep_faster = mediumstep_faster;
                    tune_benchmark(tuning_result, tuning_result_index);

                    if ( tuning_result[tuning_result_index].avg > best_avg) {
                        best_avg = tuning_result[tuning_result_index].avg;
                        best_blocksize_bits = blocksize_bits;
                        best_smallstep_faster = smallstep_faster;
                        best_mediumstep_faster = mediumstep_faster;
                        if (option_verboselevel >=2) printf(".(>)blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; mediumstep %2ju; passes %3ju/%3ju; time %f/%f;average %f\n", 
                        (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tuning_result[tuning_result_index].blocksize_kb,(uintmax_t)tuning_result[tuning_result_index].free_bits,
                        (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)tuning_result[tuning_result_index].mediumstep_faster,
                        (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_result[tuning_result_index].sample_max,
                        tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_result_index].sample_duration, tuning_result[tuning_result_index].avg);
                    }
                    if (option_verboselevel >= 3) printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; mediumstep %2ju; passes %3ju/%3ju; time %f/%f;average %f\n", 
                        (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tuning_result[tuning_result_index].blocksize_kb,(uintmax_t)tuning_result[tuning_result_index].free_bits,
                        (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)tuning_result[tuning_result_index].mediumstep_faster,
                        (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_result[tuning_result_index].sample_max,
                        tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_result_index].sample_duration, tuning_result[tuning_result_index].avg);
                    tuning_result_index++;
                }
            }
        }
    }
    if (option_verboselevel >= 2) {
        printf("%ju results. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju\n",(uintmax_t)tuning_results,(uintmax_t)best_blocksize_bits, (uintmax_t)best_smallstep_faster,(uintmax_t)best_mediumstep_faster);
        printf("Best options\n");
    }
    counter_t step=0;
    while (tuning_results>4) {
        qsort(tuning_result, (size_t)tuning_results, sizeof(tuning_result_type), compare_tuning_result);
        step++;
        if (option_verboselevel >= 2) {
            tuning_result_index = 0;
            printf("(%ju) blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; mediumstep %2ju; passes %3ju/%3ju; time %f/%f;average %f\n", (uintmax_t)step,
                            (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tuning_result[tuning_result_index].blocksize_kb,(uintmax_t)tuning_result[tuning_result_index].free_bits,
                            (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)tuning_result[tuning_result_index].mediumstep_faster,
                            (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_result[tuning_result_index].sample_max,
                            tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_result_index].sample_duration, tuning_result[tuning_result_index].avg);
            if (option_verboselevel >= 3) {
                for (counter_t tuning_result_index=0; tuning_result_index<min(10,tuning_results); tuning_result_index++) {
                    printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; mediumstep %2ju; passes %3ju/%3ju; time %f/%f;average %f\n", 
                            (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tuning_result[tuning_result_index].blocksize_kb,(uintmax_t)tuning_result[tuning_result_index].free_bits,
                            (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)tuning_result[tuning_result_index].mediumstep_faster,
                            (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_result[tuning_result_index].sample_max,
                            tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_result_index].sample_duration, tuning_result[tuning_result_index].avg);
                }
            }
        }

        tuning_results = tuning_results / 2;

        for (counter_t tuning_result_index=0; tuning_result_index<tuning_results; tuning_result_index++) {
            tune_benchmark(tuning_result, tuning_result_index);
            tuning_result[tuning_result_index].sample_max += sample_max;
        }
        
    }
    tuning_result_type best_result = tuning_result[0];
    if (option_verboselevel >= 1) {
        tuning_result_index = 0;
        printf(".Best result: blocksize %4jukb; free_bits %ju; smallstep: %ju; mediumstep %ju; passes %3ju/%3ju; time %f/%f;average %f\n", 
                 (uintmax_t)tuning_result[tuning_result_index].blocksize_kb,(uintmax_t)tuning_result[tuning_result_index].free_bits,
                (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)tuning_result[tuning_result_index].mediumstep_faster,
                (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_result[tuning_result_index].sample_max,
                tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_result_index].sample_duration, tuning_result[tuning_result_index].avg);
    }

    free(tuning_result);
    return best_result;
}

int main(int argc, char *argv[]) {
    
    counter_t maxints  = default_sieve_limit;
    if (option_runonce) { // used for stats and debugging
        struct sieve_state* sieve_instance = sieve(maxints, maxints);
        delete_sieve(sieve_instance);
//        for(int x=0; x<5; x++) {
//            printf("%d hits: %jd\n",x,debug_hitpoint[x]);
//        }
        exit(0);
    }

    int option_verboselevel = default_verbose_level;
    int option_check = default_check_level;
    int option_tunelevel = default_tune_level;
    for (int arg=1; arg < argc; arg++) {
        if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
        else if (strcmp(argv[arg], "--verbose")==0) {
            if (++arg >= argc) { fprintf(stderr, "No verbose level specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option_verboselevel > 4) {
                fprintf(stderr, "Error: Invalid measurement time: %s\n", argv[arg]); usage(argv[0]);
            }
            printf("Verbose level set to %d\n",option_verboselevel);
        } 
        else if (strcmp(argv[arg], "--check")==0) { option_check=1; }
        else if (strcmp(argv[arg], "--tune")==0) { option_tunelevel=0;
            if (++arg >= argc) { fprintf(stderr, "No tune level specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tunelevel > 4) {
                fprintf(stderr, "Error: Invalid tune level: %s\n", argv[arg]); usage(argv[0]);
            }
            printf("Tune level set to %d\n",option_tunelevel);
        }
        else if (sscanf(argv[arg], "%ju", (uintmax_t*)&maxints) != 1) {
            fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(argv[0]); 
            printf("Maximum set to %ju\n",(uintmax_t)maxints);
        }
    }

    struct timespec start_time,end_time;

    if (option_check) {
        // Count the number of primes and validate the result
        if (option_verboselevel >= 1) printf("Validating... ");
        if (option_verboselevel >= 2) printf("\n");

        // validate algorithm - run one time for all sizes
        for (counter_t sieveSize_check = 100; sieveSize_check <= 100000000; sieveSize_check *=10) {
            if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_check);
            struct sieve_state *sieve_instance_check;
            for (counter_t blocksize_bits=1024; blocksize_bits<=2*1024*8; blocksize_bits *= 2) {
                if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
                sieve_instance_check = sieve(sieveSize_check, blocksize_bits);
                int valid = validatePrimeCount(sieve_instance_check,option_verboselevel);
                delete_sieve(sieve_instance_check);
                if (!valid) return 0; else if (option_verboselevel >= 3) printf("valid;");
            }
            if (option_verboselevel >= 2) printf("\n");
        }
        if (option_verboselevel >= 1) printf("...Valid algorithm\n");
    }
    
    counter_t best_blocksize_bits = default_blocksize;
    if (option_tunelevel) {
        tuning_result_type tuning_result = tune(option_tunelevel, maxints, option_verboselevel);
        global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
        global_MEDIUMSTEP_FASTER = tuning_result.mediumstep_faster;
        best_blocksize_bits = tuning_result.blocksize_bits;
    }

    double max_time = default_sieve_duration;
    if (best_blocksize_bits > 0) {
        if (option_verboselevel >= 1) printf("Benchmarking... with blocksize %ju steps: %ju/%ju\n", (uintmax_t)best_blocksize_bits,(uintmax_t)global_SMALLSTEP_FASTER, (uintmax_t)global_MEDIUMSTEP_FASTER );
        counter_t passes = 0;
        counter_t blocksize_bits = best_blocksize_bits;
        double elapsed_time = 0;
        struct sieve_state *sieve_instance;
        clock_gettime(CLOCK_MONOTONIC,&start_time);
        while (elapsed_time <= max_time) {
            sieve_instance = sieve(maxints, blocksize_bits);//blocksize_bits);
            delete_sieve(sieve_instance);
            passes++;
            clock_gettime(CLOCK_MONOTONIC,&end_time);
            elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time.tv_nsec*1e-9;
        }
        printf("rogiervandam_extend;%ju;%f;1;algorithm=other,faithful=yes,bits=1\n", (uintmax_t)passes,elapsed_time);
        // printf("rogiervandam_extend;%ju;%f;1;algorithm=other,faithful=yes,bits=1\n", (uintmax_t)(passes*5/max_time),elapsed_time*5/max_time/5);
    }
}

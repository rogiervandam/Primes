// SIeve alogithm by Rogier van Dam

// TODO; Check why vector is not working with range > 1000000

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
#include <math.h>
#include <string.h>

//add debug in front of a line to only compile it if the value below is set to 1 (or !=0)
#define option_runonce 0
#define debug if (option_runonce)
#define debug2 if (option_runonce>=2)

#define default_sieve_limit 1000000
#define default_blocksize (32*1024*8-1024)
#define default_sieve_duration 5
#define default_sample_duration 0.1
#define default_sample_max 5
#define default_verbose_level 2
#define default_tune_level 0
#define default_check_level 1
#define default_show_primes_on_error 100
#define default_showMaxFactor (0 || option_runonce?100:0)
#define anticiped_cache_line_bytesize 128

// 64 bit
#define TYPE uint64_t

// calculate the rest dynamically
#define counter_t TYPE
#define bitshift_t TYPE
#define bitword_t uint64_t

#define WORD_SIZE (sizeof(bitword_t)*8)
#define WORD_SIZE_counter ((counter_t)WORD_SIZE)
#define WORD_SIZE_bitshift ((bitshift_t)WORD_SIZE)
#define pow(base,pow) (pow*((base>>pow)&1U))
//#define SHIFT ((bitshift_t)(pow(WORD_SIZE,1)+pow(WORD_SIZE,2)+pow(WORD_SIZE,3)+pow(WORD_SIZE,4)+pow(WORD_SIZE,5)+pow(WORD_SIZE,6)+pow(WORD_SIZE,7)+pow(WORD_SIZE,8)))
#define SHIFT_WORD ((bitshift_t)(pow(WORD_SIZE,1)+pow(WORD_SIZE,2)+pow(WORD_SIZE,3)+pow(WORD_SIZE,4)+pow(WORD_SIZE,5)+pow(WORD_SIZE,6)+pow(WORD_SIZE,7)+pow(WORD_SIZE,8)+pow(WORD_SIZE,9)+pow(WORD_SIZE,10)))

#define VECTOR_ELEMENTS 4
#define VECTOR_SIZE_bytes (sizeof(bitword_t)*VECTOR_ELEMENTS)
#define VECTOR_SIZE_counter (VECTOR_SIZE_bytes*8)
#define VECTOR_SIZE (VECTOR_SIZE_bytes*8)
#define SHIFT_VECTOR ((bitshift_t)(pow(VECTOR_SIZE,1)+pow(VECTOR_SIZE,2)+pow(VECTOR_SIZE,3)+pow(VECTOR_SIZE,4)+pow(VECTOR_SIZE,5)+pow(VECTOR_SIZE,6)+pow(VECTOR_SIZE,7)+pow(VECTOR_SIZE,8)+pow(VECTOR_SIZE,9)+pow(VECTOR_SIZE,10)))

typedef bitword_t bitvector_t __attribute__ ((vector_size(VECTOR_SIZE_bytes)));

// globals for tuning
counter_t global_SMALLSTEP_FASTER = 0;
counter_t global_MEDIUMSTEP_FASTER = 0;
counter_t global_VECTORSTEP_FASTER = VECTOR_SIZE/2;

#define SAFE_SHIFTBIT (bitshift_t)1U
#define SAFE_ZERO  (bitword_t)0U
#define BITWORD_SHIFTBIT (bitword_t)1U
#define WORDMASK ((~SAFE_ZERO)>>(WORD_SIZE_bitshift-SHIFT_WORD))
#define VECTORMASK ((~SAFE_ZERO)>>(WORD_SIZE_bitshift-SHIFT_VECTOR))
// #define SMALLSTEP_FASTER ((counter_t)0)
// #define MEDIUMSTEP_FASTER ((counter_t)16)
// #define VECTORSTEP_FASTER ((counter_t)128)

#define SMALLSTEP_FASTER ((counter_t)global_SMALLSTEP_FASTER)
#define MEDIUMSTEP_FASTER ((counter_t)global_MEDIUMSTEP_FASTER)
#define VECTORSTEP_FASTER ((counter_t)global_VECTORSTEP_FASTER)

#define wordindex(index) (((counter_t)index) >> (bitshift_t)SHIFT_WORD)
#define wordend(index) ((counter_t)index|WORDMASK)
#define wordstart(index) ((counter_t)index&~WORDMASK)
#define vectorindex(index) (((counter_t)index) >> (bitshift_t)SHIFT_VECTOR)
#define vectorstart(index) (((counter_t)index) & (counter_t)~VECTORMASK)
#define vectorfromword(word) ((counter_t)(word)>>(SHIFT_VECTOR-SHIFT_WORD))

// modern processors do a & over the shiftssize, so we only have to do that ourselve when using the shiftsize in calculations. 
#define bitindex(index) ((bitshift_t)(index))
// #define bitindex(index) ((bitshift_t)(index)&((bitword_t)(WORD_SIZE-1)))
//#define bitindex_calc(index) ((bitshift_t)(index)&((bitshift_t)(WORD_SIZE_bitshift-SAFE_SHIFTBIT)))
#define bitindex_calc(index) ((bitshift_t)(index)&((bitshift_t)(WORDMASK)))
#define  markmask(index) (BITWORD_SHIFTBIT << bitindex(index))
#define  markmask_calc(index) (BITWORD_SHIFTBIT << bitindex_calc(index))
// #define chopmask(index) ((SAFE_SHIFTBIT << bitindex(index))-SAFE_SHIFTBIT)
// #define chopmask2(index) (((bitword_t)2U << bitindex(index))-SAFE_SHIFTBIT)
#define chopmask(index) (~SAFE_ZERO >> (WORD_SIZE-1-bitindex_calc(index)))
#define keepmask(index) (~SAFE_ZERO << (bitindex_calc(index)))
#define chopmask2(index) chopmask(index)
#define real(bit) (bit*2+1)

#define min(a,b) ((a<b) ? a : b)
#define uintsafeminus(a,b) ((a>b)?(a-b):0)

#define likely(x)       (__builtin_expect((x),1))
#define unlikely(x)     (__builtin_expect((x),0))

counter_t debug_hitpoint[5] = { 0,0,0,0,0};

struct sieve_t {
    bitword_t* bitarray;
    counter_t  bits;
    counter_t  size;
};

#include "debugtools.h"

// use cache lines as much as possible - alignment might be key
#define ceiling(x,y) (((x) + (y) - 1) / (y)) // Return the smallest multiple N of y such that:  x <= y * N
static struct sieve_t *sieve_create(counter_t size) {
    struct sieve_t *sieve = aligned_alloc(8, sizeof(struct sieve_t));
    size_t memSize = ceiling(1+((size_t)size/2), anticiped_cache_line_bytesize*8) * anticiped_cache_line_bytesize; //make multiple of 8

    sieve->bitarray = aligned_alloc((size_t)anticiped_cache_line_bytesize, (size_t)memSize );
    sieve->bits     = size >> 1;
    sieve->size     = size;

    // moved clearing the sieve with 0 to the sieve_block_extend
    // it gave weird malloc problems at this point
    return sieve;
}

static void sieve_delete(struct sieve_t *sieve) {
    free(sieve->bitarray);
    free(sieve);
}

// not much performance gain at smaller sieves, but its's nice to have an implementation
static inline counter_t searchBitFalse(bitword_t* bitarray, register counter_t index) {
    while (bitarray[wordindex(index)] & markmask(index)) index++;
    return index;
}

// not much performance gain at smaller sieves, but its's nice to have an implementation
static inline counter_t searchBitFalse_longRange(bitword_t* bitarray, register counter_t index) {
    // return searchBitFalse(bitarray, index);

   register counter_t index_word = wordindex(index);
   bitshift_t index_bit  = bitindex_calc(index);
   register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bit));  // take inverse to be able to use ctz
   index += distance;
   distance += index_bit;

   while unlikely(distance == WORD_SIZE_bitshift) { // to prevent a bug from optimzer
       index_word++;
       distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
       index += distance;
   }

   return index;
}


static inline void applyMask_array(bitword_t* __restrict bitarray, const counter_t step, const counter_t range_stop, const bitword_t mask, counter_t index_word) {
    register const counter_t step_2 = step * 2;
    register const counter_t step_3 = step * 3;
    register const counter_t step_4 = step * 4;
    register const counter_t range_stop_word = wordindex(range_stop);
    const counter_t loop_stop_word = (range_stop_word > step_3) ? (range_stop_word - step_3) : (counter_t)0U;

    #pragma GCC ivdep
    for (;index_word < loop_stop_word;  index_word += step_4) {
        bitarray[index_word         ] |= mask;
        bitarray[index_word + step  ] |= mask;
        bitarray[index_word + step_2] |= mask;
        bitarray[index_word + step_3] |= mask;
    }

    #pragma GCC ivdep
    while (index_word < range_stop_word) {
        bitarray[index_word] |= mask;
        index_word += step;
    }

    if (index_word == wordindex(range_stop)) {
        bitarray[wordindex(range_stop)] |= (mask & chopmask(range_stop)); //only needed if blocks not aligned
        
    }
}

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
}

// set bits by creating a pattern and then extending it to word and range size
static inline void setBitsTrue_smallStep(bitword_t* __restrict bitarray, const counter_t range_start, const bitshift_t step, const counter_t range_stop) {
    debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using smallstep (%ju occurances)\n", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));

    // build the pattern in a word
	register bitword_t pattern = BITWORD_SHIFTBIT;
    for (bitshift_t patternsize = step; patternsize <= WORD_SIZE_bitshift; patternsize += patternsize)
        pattern |= (pattern << patternsize);

    // debug if (step==13) { printf("Before\n"); dump_bitarray(bitarray,10); }
    
    // initialize loop variables and stop if this is it
    const counter_t range_stop_word = wordindex(range_stop);
    register counter_t range_start_word = wordindex(range_start);
     if (range_start_word >= range_stop_word) { // shortcut
       bitarray[range_start_word] |= (pattern << bitindex(range_start)) & chopmask(range_stop);
        //  debug if (step==13) { printf("After\n"); dump_bitarray(bitarray,10); }
       return;
    }
    
    bitarray[range_start_word] |= (pattern << bitindex(range_start));

   // from now on, we are before range_stop_word
   // first word is special, because it should not set bits before the range_start_bit
   register bitshift_t pattern_size = WORD_SIZE_bitshift - (WORD_SIZE_bitshift % step);
   register bitshift_t pattern_shift = step - (WORD_SIZE_bitshift % step);
   register bitshift_t shift = (bitindex_calc(range_start))%step ;
   counter_t loop_range = range_stop_word - range_start_word;
   //#pragma GCC unroll 16
   #pragma GCC ivdep
   for (counter_t i=1; i <= loop_range; i++) {
        bitshift_t totalshift = (shift+i*pattern_shift) % step;
       bitarray[range_start_word+i] |=  (pattern >> (pattern_size-totalshift)) | (pattern << (totalshift));

        // bitarray[range_start_word+i] |=  (pattern >> (pattern_size-((shift+i*pattern_shift) % step) )) | (pattern << (((shift+i*pattern_shift) % step)));
   }
   bitarray[range_stop_word] &= chopmask(range_stop);

//    for(counter_t check=range_start; check<=range_stop; check+=step) {
//         if (!(bitarray[wordindex(check)] & markmask(check))) {
//             printf("Bit %ju not set\n",check);
//             dump_bitarray(bitarray,4);
//             printWord(pattern); printf("\n");
//             exit(0);
//         }
//    }

    // pattern = (pattern << (bitindex_calc(range_start) % step)); // correct for inital offset
    // const register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
    // const register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
    // const register counter_t loop_range = range_stop_word - range_start_word;
    // //#pragma GCC unroll 16
    // #pragma GCC ivdep
    // for (counter_t i=1; i <= loop_range; i++) {
    //     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
    //     bitarray[range_start_word+i] |= pattern;
    // }
    // bitarray[range_stop_word] &= chopmask(range_stop);
}

// Medium steps could be within the same word (e.g. less than 64 bits apart).
// By joining the masks and then writing to memory, we might save some time.
// This is especially true for small steps over long ranges
// but it needs tuning, because there is some overhead of checking if the next step is in the same word
static void  setBitsTrue_mediumStep(bitword_t* __restrict bitarray, const counter_t range_start, const counter_t step, const counter_t range_stop) {
    const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;

    if (range_stop_unique > range_stop) { // the range will not repeat itself; no need to try to resuse the mask
        debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-unique (%ju occurances)\n", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));

        #pragma GCC ivdep
        for (register counter_t index = range_start; index <= range_stop;) {
            register counter_t index_word = wordindex(index);
            register bitword_t mask = SAFE_ZERO;
            #pragma GCC ivdep
            do {
                mask |= markmask(index);
                index += step;
            } while (index_word == wordindex(index));
            // for (; index_word == wordindex(index);  index += step) 
            //     mask |= markmask(index);
            bitarray[index_word] |= mask;
        }
    }
    else { // this mask will reoccur at a interval of step words -> fill mask and reapply as a interval of step
        debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-repeat (%ju occurances)\n", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));
        
        #pragma GCC ivdep
        for (register counter_t index = range_start; index <= range_stop_unique;) {
            register counter_t index_word = wordindex(index);
            register bitword_t mask = SAFE_ZERO;
            #pragma GCC ivdep
            do {
                mask |= markmask(index);
                index += step;
            } while (index_word == wordindex(index));
            // #pragma GCC ivdep
            // for (; index_word == wordindex(index);  index += step) 
            //     mask |= markmask(index);
            #if __APPLE__
               applyMask_array(bitarray, step, range_stop, mask, index_word);
            #else
               applyMask_ptr(bitarray, step, range_stop, mask, index_word);
            #endif
        }
    }
}

// large steps in small ranges (< WORD_SIZE * step) mean the mask is unique
static inline void setBitsTrue_largeSteps(bitword_t* __restrict bitarray, const counter_t range_start, const counter_t step, const counter_t range_stop) {
    debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largesteps (%ju occurances)\n", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));
    
    //#pragma GCC unroll 16
    #pragma GCC ivdep
    for (counter_t index = range_start; index <= range_stop; index += step) {
        bitarray[wordindex(index)] |= markmask(index);
    }
}

static inline void setBitsTrue_largeSteps_unroll(bitword_t* __restrict bitarray, const counter_t range_start, const counter_t step, const counter_t range_stop) {
    debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largesteps (%ju occurances)\n", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step));
    
    counter_t loop_iterations = (range_stop - range_start) / step;
    //#pragma GCC unroll 16
    #pragma GCC ivdep 
    for (register counter_t i = 0; i <= loop_iterations; i++) {
         bitarray[wordindex(range_start+i*step)] |= markmask(range_start+i*step);
    }
}

// small ranges (< WORD_SIZE * step) mean the mask is unique
static void setBitsTrue_race(bitword_t* bitarray, counter_t index1, counter_t index2, const counter_t step1, const counter_t step2, const counter_t range_stop) {
    debug printf("Setting bits step %ju and %ju in %ju bit range (%ju-%ju) using race (%ju occurances)\n", (uintmax_t)step1,(uintmax_t)step2, (uintmax_t)range_stop-(uintmax_t)index1,(uintmax_t)index1,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)index1)/(uintmax_t)step1));

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
    register bitvector_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_vector],anticiped_cache_line_bytesize);
    register bitvector_t* __restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitarray[((range_stop_vector>step*5) ? (range_stop_vector - step*5):0)],anticiped_cache_line_bytesize);
    
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

static inline void applyMask_vector_array(bitvector_t* __restrict bitarray_vector, const counter_t step, const counter_t range_stop, const bitvector_t mask, counter_t index_vector) {

//    bitvector_t* __restrict bitarray_vector = __builtin_assume_aligned( (bitvector_t*) bitarray_word, anticiped_cache_line_bytesize);
    register counter_t current_vector = index_vector;
    register const counter_t range_stop_vector = vectorindex(range_stop);
    register const counter_t step_2 = step * 2;
    register const counter_t step_3 = step * 3;
    register const counter_t step_4 = step * 4;

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

    bitvector_t* __restrict bitarray_vector = __builtin_assume_aligned( (bitvector_t*) bitarray_word, anticiped_cache_line_bytesize);
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

        applyMask_vector_array(bitarray_vector, step, range_stop, quadmask, current_vector);
    }
}

static void extendSieve_smallSize(bitword_t* __restrict bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));
    // debug { printf("...At start. "); dump_bitarray(bitarray, 4); }

    const counter_t source_word = wordindex(source_start);
    register bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | (bitarray[source_word+1] << (WORD_SIZE_counter-bitindex_calc(source_start)))) & chopmask(size);
    for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZE_bitshift; pattern_size += pattern_size)
        pattern |= (pattern << pattern_size);

    const counter_t destination_start = source_start + size;
    counter_t destination_start_word = wordindex(destination_start);
    counter_t destination_stop_word = wordindex(destination_stop);
    if (destination_start_word >= destination_stop_word) {
        bitarray[destination_start_word] |= (pattern << bitindex(destination_start)) & chopmask(destination_stop);
        return;
    }

    bitarray[destination_start_word] |= (pattern << bitindex(destination_start));

    // TODO: refactor according to smallstep
    register const bitshift_t pattern_shift = WORD_SIZE_counter % size;
    register const bitshift_t pattern_size = WORD_SIZE_bitshift - pattern_shift;
    register bitshift_t shift = (WORD_SIZE_bitshift - bitindex_calc(destination_start)) & WORDMASK; // be sure this stays > 0
    register counter_t loop_range = destination_stop_word - destination_start_word;
    destination_start_word++;
    
    //#pragma GCC unroll 16
    #pragma GCC ivdep
    for (counter_t i=0; i<=loop_range; ++i ) {
        bitarray[destination_start_word+i] = (pattern << (pattern_size - ((shift+i*pattern_shift) & WORDMASK)  ) ) | (pattern >> ((shift+i*pattern_shift) & WORDMASK));
    }
    bitarray[destination_stop_word] &= chopmask(destination_stop);
}

static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));

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

//https://stackoverflow.com/questions/1898153/how-to-determine-if-memory-is-aligned
#define is_unaligned(POINTER, BYTE_COUNT) (((uintptr_t)(const void *)(POINTER)) % (BYTE_COUNT))

void shiftvec(uint64_t* __restrict dst, const uint64_t* __restrict src, int size, int shift)
{
    int i = 0;
    // MSVC: use steps of 2 for SSE, 4 for AVX2, 8 for AVX512
    for (; i+4 < size; i+=4,dst+=4,src+=4)
    {
        for (int j = 0; j < 4; ++j)
            *(dst+j) = (*(src+j))<<shift;
        for (int j = 0; j < 4; ++j)
            *(dst+j) |= (*(src+1)>>(64-shift));
    }
    for (; i < size; ++i,++src,++dst)
    {
        *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
    }    
}

#define forward_distance 4
static void extendSieve_shiftright_vector(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));
   
    bitvector_t* bitarray_vector = (bitvector_t*) bitarray;

    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
    register counter_t source_word = wordindex(source_start);
    register counter_t copy_word = wordindex(copy_start);

    bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose data
                                | (bitarray[copy_word] >> shift_flipped))
                                & keepmask(copy_start);

    if (copy_word >= destination_stop_word) { 
        return; // rapid exit for one word variant
    }

    copy_word++;

    debug printf("..copy distance %ju\n",(uintmax_t) copy_word - (uintmax_t) source_word);
    if (((copy_word - source_word) > 8)) {

        // move one vector further
        counter_t target_word = wordindex(vectorstart(source_start+size)+VECTOR_SIZE_counter);
        counter_t delta_word   = 4-((copy_word-source_word-1) % 4);
        if (delta_word==0) { 
            target_word += 8;
        }

        debug printf("..source_word %ju copy_word %ju mod %ju target_word %ju\n",source_word, copy_word, (copy_word-source_word)%4, target_word);

        for (; copy_word < target_word; copy_word++, source_word++ ) {
            bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] << shift);
        }

        if (delta_word==0) { 
            delta_word = 4;
            source_word += 4;
        }

        counter_t source_vector = vectorfromword(source_word+1);
        counter_t copy_vector = vectorfromword(copy_word);

        // debug printf("..using vectors source_vector %ju copy vector %ju target_word %ju delta_word %ju copy_word %ju\n",source_vector,copy_vector,target_word,delta_word,copy_word);

        const bitvector_t shuffle1 = { delta_word-1, delta_word, delta_word+1, delta_word+2 };
        const bitvector_t shuffle2 = { delta_word, delta_word+1, delta_word+2, delta_word+3 };
        const bitvector_t shift_vector = { shift, shift, shift, shift };
        const bitvector_t shift_flipped_vector = { shift_flipped, shift_flipped, shift_flipped, shift_flipped };

        counter_t target_vector = vectorindex(destination_stop);

        // debug printf("..should be copy from source_word %ju to %ju, but takes vector %ju to %ju with delta %ju => from %ju to %ju\n", source_word, copy_word,    source_vector, copy_vector, delta_word, source_vector*4+delta_word-1, copy_vector*4 );

        // dump_bitarray(bitarray, copy_word+4);

        // debug printf("Will copy from %ju to %ju  vector %ju to %ju at copy_word %ju\n",source_vector*4+delta_word-1, copy_vector*4, source_vector, copy_vector, copy_word);
        for (; copy_vector <= target_vector; copy_vector++, source_vector++ ) {
            bitvector_t source0 = bitarray_vector[source_vector];
            bitvector_t source1 = bitarray_vector[source_vector+1];
            bitvector_t copy1 = __builtin_shuffle(source0,source1,shuffle1) >> shift_flipped_vector;
            bitvector_t copy2 = __builtin_shuffle(source0,source1,shuffle2) << shift_vector;
            bitarray_vector[copy_vector] = copy1 | copy2;
            // copy_word += 4;
            // source_word += 4;
        }

        target_word = target_vector*4;
        for (; copy_word <= target_word; copy_word++, source_word++ ) {
            bitword_t shouldbe = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] << shift);
            bitword_t asis = bitarray[copy_word];
            debug printf("Copy_word = %ju\n",copy_word);
            if (shouldbe != asis) {
                printf("ERROR expected at copy_word %ju\n", copy_word);
                printWord(shouldbe);
                printf("\n");
                printf("But is\n");
                printWord(asis);
                printf("\n");
                // dump_bitarray(bitarray, copy_word+4);
                exit(0);
            }
            else {
                // debug printf("Correct for copy_word %ju\n",copy_word);
            }
        }

        // copy_word += 4;
        // source_word += 4;


        #pragma GCC ivdep 
        for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
            bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] << shift);
        }
        bitarray[copy_word] &= chopmask(destination_stop);
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
}

static inline counter_t extendSieve_shiftleft_unrolled(bitword_t* bitarray, const counter_t aligned_copy_word, const bitshift_t shift, counter_t copy_word, counter_t source_word) {
    const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_copy_word - 2) : 0; // safe for unsigned ints
    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
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




static void extendSieve_shiftright_ivdep(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
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

    debug { printf("...start - %ju - %ju - end\n",(uintmax_t)wordindex(copy_start), (uintmax_t)destination_stop_word) ; }

    if (size >= WORD_SIZE_counter) {
        register const counter_t loop_distance = destination_stop_word - copy_word;

        //#pragma GCC unroll 16
        #pragma GCC ivdep
        for (register counter_t i = 0; i <loop_distance; i++) {
            bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_word+1+i] << shift);
        }
        source_word += loop_distance; copy_word+= loop_distance;
    }

    for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
        bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] << shift);
    }
    bitarray[copy_word] &= chopmask(destination_stop);

}

static void  extendSieve_shiftright_base(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
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

    debug { printf("...start - %ju - %ju - end\n",(uintmax_t)wordindex(copy_start), (uintmax_t)destination_stop_word) ; }

    for (; copy_word <= destination_stop_word; copy_word++, source_word++ ) 
        bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] << shift);
    // bitarray[copy_word] &= chopmask(destination_stop);

}

static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop) {
    debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));

    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
    register counter_t source_word = wordindex(source_start);
    register counter_t copy_word = wordindex(copy_start);
    bitarray[copy_word] |= ((bitarray[source_word] >> shift)
                             | (bitarray[source_word+1] << shift_flipped))
                             & ~chopmask(copy_start); // because this is the first word, dont copy the extra bits in front of the source

    copy_word++;
    source_word++;

    const counter_t aligned_copy_word = min(source_word + size, destination_stop_word); // after <<size>> words, just copy at word level
    const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, copy_word, source_word);
    source_word += distance;
    copy_word += distance;

     debug { counter_t fast_loop_stop_word = uintsafeminus(aligned_copy_word,2); printf("...start - %ju - end fastloop - %ju - start alignment - %ju - end\n", (uintmax_t)fast_loop_stop_word - (uintmax_t)wordindex(copy_start), (uintmax_t)aligned_copy_word - (uintmax_t)fast_loop_stop_word, (uintmax_t)destination_stop_word - (uintmax_t)aligned_copy_word); }

    #pragma GCC ivdep
    for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
        bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shift_flipped);
    }

    if (copy_word >= destination_stop_word) return;

    source_word = copy_word - size; // recalibrate
    const size_t memsize = (size_t)size*sizeof(bitword_t);

    #pragma GCC ivdep
    for (;copy_word + size <= destination_stop_word; copy_word += size) 
        memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );

    #pragma GCC ivdep
    for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
        bitarray[copy_word] = bitarray[source_word];


 }

static inline void extendSieve(bitword_t* bitarray, const counter_t source_start, const counter_t size, const counter_t destination_stop)	{
    if (size < WORD_SIZE_counter)   {
        extendSieve_smallSize (bitarray, source_start, size, destination_stop);
        return; // rapid exit for small sizes
    }

    const counter_t copy_start  = source_start + size;
    const bitshift_t copy_bit   = bitindex_calc(copy_start);
    const bitshift_t source_bit = bitindex_calc(source_start);

    if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_start, size, destination_stop);
    else if (source_bit < copy_bit) extendSieve_shiftright_vector(bitarray, source_start, size, destination_stop);
    else                            extendSieve_aligned   (bitarray, source_start, size, destination_stop);
}

static void sieve_block_stripe(bitword_t* bitarray, const counter_t block_start, const counter_t block_stop, const counter_t prime_start) {
    counter_t prime = prime_start;
    counter_t start = 0;
    counter_t step  = prime * 2 + 1;

    debug printf("Block strip for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop);
    
    while (prime*step <= block_stop) {
        if likely(block_start >= (prime + 1)) 
            start = block_start + prime + prime - ((block_start + prime) % step);
        else 
            start = prime * prime * 2 + prime * 2;

        if (step < VECTORSTEP_FASTER) {
            setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
            prime = searchBitFalse(bitarray, prime+1 );
        }
        else {
            setBitsTrue_largeRange(bitarray, start, step, block_stop);
            prime = searchBitFalse_longRange(bitarray, prime+1 );
        }

        start = prime * prime * 2 + prime * 2;
        step  = prime * 2 + 1;
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
static struct block sieve_block_extend(struct sieve_t *sieve, const counter_t block_start, const counter_t block_stop) {
    register counter_t prime   = 0;
    counter_t patternsize_bits = 1;
    counter_t pattern_start    = 0;
    counter_t range_stop       = block_start;
    bitword_t* bitarray        = sieve->bitarray;
    struct block block = { .prime = 0, .pattern_start = 0, .pattern_size = 0 };

    sieve->bitarray[0] = SAFE_ZERO; // only the first word has to be cleared; the rest is populated by the extension procedure
    
    for (;range_stop < block_stop;) {
        prime = searchBitFalse(bitarray, prime+1);
        counter_t start = prime * prime * 2 + prime * 2;
        if unlikely(start > block_stop) break;

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

        // if      (step < SMALLSTEP_FASTER)      setBitsTrue_smallStep (bitarray, start, (bitshift_t)step, range_stop);
        // else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_stop);
        if (step < VECTORSTEP_FASTER)     setBitsTrue_largeRange_vector(bitarray, start, step, range_stop);
        else                              setBitsTrue_largeRange(bitarray, start, step, range_stop);
        block.prime = prime;
    } 

    return block;
}

static struct sieve_t* sieve_shake(const counter_t maxints, const counter_t blocksize) {
    struct sieve_t *sieve = sieve_create(maxints);
    bitword_t* bitarray = sieve->bitarray;

    debug printf("Running sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)maxints,(uintmax_t)blocksize);

    // fill the whole sieve bij adding en copying incrementally
    struct block block = sieve_block_extend(sieve, 0, sieve->bits);
    extendSieve(bitarray, block.pattern_start, block.pattern_size, sieve->bits);
    counter_t startprime = block.prime;

    // //#pragma GCC unroll 8
    for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <= sieve->bits; block_start += blocksize, block_stop += blocksize) {
        if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
        counter_t prime = searchBitFalse(bitarray, startprime);
        sieve_block_stripe(bitarray, block_start, block_stop, prime);
    } 

    return sieve;
}

static struct sieve_t *sieve_blockbyblock(const counter_t maxints, const counter_t blocksize) {
    struct sieve_t *sieve = sieve_create(maxints);
    counter_t prime     = 1;
    bitword_t* bitarray = sieve->bitarray;
    for(counter_t index=0; index<wordindex(maxints/2); index++) {
        bitarray[index]=SAFE_ZERO;
    }

    debug printf("Running sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)maxints,(uintmax_t)blocksize);

    // //#pragma GCC unroll 8
    for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <= sieve->bits; block_start += blocksize, block_stop += blocksize) {
        if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
        prime = searchBitFalse(bitarray, prime);
        sieve_block_stripe(bitarray, block_start, block_stop, prime);
    } 

    return sieve;
}

static void show_primes(struct sieve_t *sieve, counter_t maxFactor) {
    counter_t primeCount = 1;    // We already have 2
    for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitarray, factor+1)) {
        primeCount++;
        if (factor < maxFactor/2) {
            printf("%3ju ",(uintmax_t)factor*2+1);
            if (primeCount % 10 == 0) printf("\n");
        }
    }
    printf("\nFound %ju primes until %ju\n",(uintmax_t)primeCount, (uintmax_t)sieve->bits*2+1);
}

static counter_t count_primes(struct sieve_t *sieve) {
    counter_t primeCount = 1;
    for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitarray, factor+1)) primeCount++;
    return primeCount;
}

static void deepAnalyzePrimes(struct sieve_t *sieve) {
    printf("DeepAnalyzing\n");
    counter_t warn_prime = 0;
    counter_t warn_nonprime = 0;
    for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
        if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
            for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
                    if (warn_prime++ < 30) printf("Number %ju (%ju) was marked prime, but %ju * %ju = %ju\n", (uintmax_t)prime*2+1, (uintmax_t)prime, (uintmax_t)c*2+1, (uintmax_t)((prime*2+1)/(c*2+1)), (uintmax_t)prime*2+1 );
                }
            }
        }
        else {
            counter_t c_prime = 0;
            for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
            }
            if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju) was marked non-prime, but no factors found. So it is prime\n", (uintmax_t)prime*2+1,(uintmax_t) prime);
        }
    }
}


int validatePrimeCount(struct sieve_t *sieve, int option_verboselevel) {

    counter_t primecount = count_primes(sieve);
    counter_t valid_primes = 0;
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
        default:            valid_primes= 0;
    }

    int valid = (valid_primes == primecount);
    if (valid  && option_verboselevel >= 4) printf("Result: Sievesize %ju is expected to have %ju primes. algorithm produced %ju primes\n",(uintmax_t)sieve->size,(uintmax_t)valid_primes,(uintmax_t)primecount );
    if (!valid && option_verboselevel >= 1) {
        printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produced %ju primes\n",(uintmax_t)sieve->size,(uintmax_t)valid_primes,(uintmax_t)primecount );
        if (!valid && option_verboselevel >= 2) show_primes(sieve, default_show_primes_on_error);
    }
    if (!valid && option_verboselevel >= 2) deepAnalyzePrimes(sieve);
    return (valid);
}

void usage(char *name) {
    fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
    fprintf(stderr, "Options:\n");
    fprintf(stderr, "  --verbose <level>  Show more output to a certain level:\n");
    fprintf(stderr, "                     1 - show phase progress\n");
    fprintf(stderr, "                     2 - show general progress within the phase\n");
    fprintf(stderr, "                     3 - show actual work\n");
    fprintf(stderr, "  --check            check the correctness of the algorithm\n");
    fprintf(stderr, "  --show <maximum>   Show the primes found up to the maximum\n");
    fprintf(stderr, "  --tune  <level>    find the best settings for the current os and hardware\n");
    fprintf(stderr, "                     1 - fast tuning\n");
    fprintf(stderr, "                     2 - refined tuning\n");
    fprintf(stderr, "                     3 - maximum tuning (takes long)\n");
    exit(1);
}

typedef struct  {
    counter_t maxints;
    counter_t blocksize_bits;
    counter_t blocksize_kb;
    counter_t free_bits;
    counter_t smallstep_faster;
    counter_t mediumstep_faster;
    counter_t vectorstep_faster;
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
    struct sieve_t *sieve;

    global_SMALLSTEP_FASTER = tuning_result[tuning_result_index].smallstep_faster;
    global_MEDIUMSTEP_FASTER = tuning_result[tuning_result_index].mediumstep_faster;
    global_VECTORSTEP_FASTER = tuning_result[tuning_result_index].vectorstep_faster;

    clock_gettime(CLOCK_MONOTONIC,&start_time);
    while (elapsed_time <= tuning_result[tuning_result_index].sample_duration && passes < tuning_result[tuning_result_index].sample_max) {
        sieve = sieve_shake(tuning_result[tuning_result_index].maxints, tuning_result[tuning_result_index].blocksize_bits);//blocksize_bits);
        sieve_delete(sieve);
        passes++;
        clock_gettime(CLOCK_MONOTONIC,&end_time);
        elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time.tv_nsec*1e-9;
    }
    tuning_result[tuning_result_index].passes = passes;
    tuning_result[tuning_result_index].elapsed_time = elapsed_time;
    tuning_result[tuning_result_index].avg = passes/elapsed_time;
}

static inline void tuning_result_print(tuning_result_type tuning_result) {
    printf("blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; small %2ju; medium %2ju; vector %2ju; passes %3ju/%3ju; time %f/%f;average %f\n", 
                            (uintmax_t)tuning_result.blocksize_bits, (uintmax_t)tuning_result.blocksize_kb,(uintmax_t)tuning_result.free_bits,
                            (uintmax_t)tuning_result.smallstep_faster,(uintmax_t)tuning_result.mediumstep_faster,(uintmax_t)tuning_result.vectorstep_faster,
                            (uintmax_t)tuning_result.passes, (uintmax_t) tuning_result.sample_max,
                            tuning_result.elapsed_time, tuning_result.sample_duration, tuning_result.avg);
}

static tuning_result_type tune(int tune_level, counter_t maxints, int option_verboselevel) {
    counter_t best_blocksize_bits = default_blocksize;

    double best_avg = 0;
    best_blocksize_bits = 0;
    counter_t best_smallstep_faster = 0;
    counter_t best_mediumstep_faster = 0;
    counter_t best_vectorstep_faster = 0;
    counter_t smallstep_faster_steps = 4;
    counter_t mediumstep_faster_steps = 4;
    counter_t vectorstep_faster_steps = 32;
    counter_t freebits_steps = anticiped_cache_line_bytesize;
    counter_t sample_max = default_sample_max;
    double sample_duration = default_sample_duration;

    // determines the size of the resultset
    switch (tune_level) {
        case 1:
            smallstep_faster_steps  = WORD_SIZE/4;
            mediumstep_faster_steps = WORD_SIZE/4;
            vectorstep_faster_steps = WORD_SIZE/2;
            freebits_steps = anticiped_cache_line_bytesize*8*2;
            sample_max = 8;
            sample_duration = 0.1;
            break;
        case 2:
            smallstep_faster_steps  = WORD_SIZE/8;
            mediumstep_faster_steps = WORD_SIZE/8;
            vectorstep_faster_steps = WORD_SIZE/4;
            freebits_steps = anticiped_cache_line_bytesize*8;
            sample_max = 8;
            sample_duration = 0.2;
            break;
        case 3:
            smallstep_faster_steps  = WORD_SIZE/16;
            mediumstep_faster_steps = WORD_SIZE/16;
            vectorstep_faster_steps = WORD_SIZE/16;
            freebits_steps = anticiped_cache_line_bytesize/2;
            sample_max = 8;
            sample_duration = 0.2;
            break;
    }
    
    if (option_verboselevel >= 1) printf("Tuning..."); 
    if (option_verboselevel >= 2) printf("\n");
    const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(WORD_SIZE_counter/mediumstep_faster_steps)+1) * ((size_t)(VECTOR_SIZE_counter/vectorstep_faster_steps)+1) * 32 * (size_t)(anticiped_cache_line_bytesize*8*4/freebits_steps);
    tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
    counter_t tuning_results=0;
    counter_t tuning_result_index=0;
    
    for (counter_t smallstep_faster = 0; smallstep_faster <= WORD_SIZE/2; smallstep_faster += smallstep_faster_steps) {
        for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; mediumstep_faster += mediumstep_faster_steps) {
            for (counter_t vectorstep_faster = mediumstep_faster; vectorstep_faster <= VECTOR_SIZE; vectorstep_faster += vectorstep_faster_steps) {
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
                        tuning_result[tuning_result_index].vectorstep_faster = vectorstep_faster;
                        tune_benchmark(tuning_result, tuning_result_index);

                        if ( tuning_result[tuning_result_index].avg > best_avg) {
                            best_avg = tuning_result[tuning_result_index].avg;
                            best_blocksize_bits = blocksize_bits;
                            best_smallstep_faster = smallstep_faster;
                            best_mediumstep_faster = mediumstep_faster;
                            best_vectorstep_faster = vectorstep_faster;
                            if (option_verboselevel >=2) { printf(".(>)"); tuning_result_print(tuning_result[tuning_result_index]); }
                        }
                        if (option_verboselevel >= 3) { printf("...."); tuning_result_print(tuning_result[tuning_result_index]); }
                        tuning_result_index++;
                    }
                }
            }
        }
    }
    if (option_verboselevel >= 2) {
        printf("%ju results. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju; best vectorstep %ju\n",(uintmax_t)tuning_results,(uintmax_t)best_blocksize_bits, (uintmax_t)best_smallstep_faster,(uintmax_t)best_mediumstep_faster, (uintmax_t)best_vectorstep_faster);
        printf("Best options\n");
    }
    counter_t step=0;
    while (tuning_results>4) {
        qsort(tuning_result, (size_t)tuning_results, sizeof(tuning_result_type), compare_tuning_result);
        step++;
        if (option_verboselevel >= 2) {
            tuning_result_index = 0;
            printf("(%ju) ",(uintmax_t)step); tuning_result_print(tuning_result[tuning_result_index]);
            if (option_verboselevel >= 3) {
                for (counter_t tuning_result_index=0; tuning_result_index<min(10,tuning_results); tuning_result_index++) {
                    printf("..."); tuning_result_print(tuning_result[tuning_result_index]);
                }
            }
        }

        tuning_results = tuning_results / 2;

        for (counter_t i=0; i<tuning_results; i++) {
            tune_benchmark(tuning_result, i);
            tuning_result[i].sample_max += sample_max;
        }
        
    }
    tuning_result_type best_result = tuning_result[0];
    if (option_verboselevel >= 1) {
        tuning_result_index = 0;
        printf(".Best result:"); tuning_result_print(tuning_result[tuning_result_index]);
    }

    free(tuning_result);
    return best_result;
}

void printfcomma2 (int n) {
    if (n < 1000) {
        printf ("%d", n);
        return;
    }
    printfcomma2 (n/1000);
    printf (",%03d", n%1000);
}

void printfcomma (int n) {
    if (n < 0) {
        printf ("-");
        n = -n;
    }
    printfcomma2 (n);
}

int benchmark(double max_time, void (*function)(bitword_t*, counter_t ), bitword_t* bitarray, counter_t max ) {
    struct timespec start_time,end_time;
    int passes = 0;
    double elapsed_time = 0;
    clock_gettime(CLOCK_MONOTONIC,&start_time);
    while (elapsed_time <= max_time) {
        function(bitarray, max);
        passes++;
        clock_gettime(CLOCK_MONOTONIC,&end_time);
        elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time.tv_nsec*1e-9;
    }
    return passes;
}

void test(bitword_t* __restrict bitarray, counter_t max) {
    //#pragma GCC unroll 16
    #pragma GCC ivdep 
    for (counter_t x=0; x<max; x++) {
        bitarray[wordindex(x)] = markmask(x);
    }
}

void test2(bitword_t* __restrict bitarray, counter_t max) {
    //#pragma GCC unroll 16
    #pragma GCC ivdep 
    for (counter_t x=0; x<max; x++) {
        *(bitarray+wordindex(x)) = markmask(x);
    }
}

void test3(bitword_t* __restrict bitarray, counter_t max) {
    for (register counter_t x=0; x<max; ) {
        register bitword_t mask = SAFE_ZERO;
        register counter_t index_word = wordstart(x);

        #pragma GCC ivdep
        do {
            mask |= markmask(x);
            x++;
        } while(wordstart(x)==index_word);
        bitarray[wordindex(index_word)] = mask;
    }
}

//void test4(bitword_t* __restrict bitarray, counter_t max) {
//    bitvector_t* bitvector = (bitvector_t*) bitarray;
//    for (register int x=0; x<max; ) {
//        register bitvector_t mask = {};
//        register counter_t index_vector = vectorstart(x);
//        register counter_t index_word = wordindex(x);
//        register word = wordindex(x);
//        #pragma GCC ivdep
//        do {
//            mask[word[] |= markmask(x);
//            x++;
//            word =
//        } while(wordstart(x)==index_word);
//        bitvector[wordindex(index_word)] = mask;
//    }
//}

void testshuffle_vector(bitword_t* __restrict bitarray, counter_t max) {
    
    bitword_t* bitarray_word     = (bitword_t*)bitarray;
    bitvector_t* bitarray_vector = (bitvector_t*)bitarray;
    
    for (counter_t i=1; i<8*64 && i < max; i+=20) {
        bitarray_word[wordindex(i)] |= markmask(i);
    }

    counter_t source_start = 66+64;
    counter_t destination_start = 3*4*64 + 12;
    bitarray_word[wordindex(source_start)]  |= markmask_calc(source_start);
    bitarray_word[wordindex(source_start+1)]  |= markmask_calc(source_start+1);


    counter_t source_vector = vectorindex(source_start);
    counter_t delta_word   = 4-((wordindex(destination_start) - wordindex(source_start)) % 4);
    int32_t delta_bit    = bitindex_calc(destination_start) - bitindex_calc(source_start); // could be negative
    
    bitshift_t shift_bit = delta_bit; 
    bitshift_t shift_bit_flipped = WORD_SIZE_bitshift - shift_bit; 

//    if (delta_bit) ....

    const bitvector_t shuffle1 = { delta_word-1, delta_word, delta_word+1, delta_word+2 };
    const bitvector_t shuffle2 = { delta_word, delta_word+1, delta_word+2, delta_word+3 };
    const bitvector_t shift = { shift_bit, shift_bit, shift_bit, shift_bit };
    const bitvector_t shift_flipped = { shift_bit_flipped, shift_bit_flipped, shift_bit_flipped, shift_bit_flipped };

    for (counter_t copy_vector = 3; copy_vector<400; copy_vector++, source_vector++ ) {
        bitvector_t source0 = bitarray_vector[source_vector];
        bitvector_t source1 = bitarray_vector[source_vector+1];
        bitvector_t dest1 = __builtin_shuffle(source0,source1,shuffle1) >> shift_flipped;
        bitvector_t dest2 = __builtin_shuffle(source0,source1,shuffle2) << shift;
        bitarray_vector[copy_vector] = dest1 | dest2;
    }
}

void testshuffle_vector2(bitword_t* __restrict bitarray, counter_t max) {
    
    bitword_t* bitarray_word     = (bitword_t*)bitarray;
    bitvector_t* bitarray_vector = (bitvector_t*)bitarray;

    for (counter_t i=1; i<8*64 && i < max; i+=20) {
        bitarray_word[wordindex(i)] |= markmask(i);
    }

    counter_t source_start = 66+64;
    counter_t destination_start = 3*4*64 + 12;
    bitarray_word[wordindex(source_start)]  |= markmask_calc(source_start);
    bitarray_word[wordindex(source_start+1)]  |= markmask_calc(source_start+1);


    counter_t source_vector = vectorindex(source_start);
    counter_t delta_word   = 4-((wordindex(destination_start) - wordindex(source_start)) % 4);
    int32_t delta_bit    = bitindex_calc(destination_start) - bitindex_calc(source_start); // could be negative
    
    bitshift_t shift_bit = delta_bit; 
    bitshift_t shift_bit_flipped = WORD_SIZE_bitshift - shift_bit; 

//    if (delta_bit) ....

    register const bitvector_t shuffle1 = { delta_word-1, delta_word, delta_word+1, delta_word+2 };
    register const bitvector_t shuffle2 = { delta_word, delta_word+1, delta_word+2, delta_word+3 };
    register const bitvector_t shift = { shift_bit, shift_bit, shift_bit, shift_bit };
    register const bitvector_t shift_flipped = { shift_bit_flipped, shift_bit_flipped, shift_bit_flipped, shift_bit_flipped };

    for (counter_t copy_vector = 3; copy_vector<400; copy_vector++, source_vector++ ) {
        register bitvector_t source0 = bitarray_vector[source_vector];
        register bitvector_t source1 = bitarray_vector[source_vector+1];
        bitarray_vector[copy_vector] = (__builtin_shuffle(source0,source1,shuffle1) >> shift_flipped) | (__builtin_shuffle(source0,source1,shuffle2) << shift);
    }
}

void testshuffle_word(bitword_t* __restrict bitarray, counter_t max) {
    
    bitword_t* bitarray_word     = (bitword_t*)bitarray;

    for (counter_t i=1; i<8*64 && i<max; i+=20) {
        bitarray_word[wordindex(i)] |= markmask(i);
    }

    counter_t source_start = 66+64;
    counter_t destination_start = 3*4*64 + 12;
    bitarray_word[wordindex(source_start)]  |= markmask_calc(source_start);
    bitarray_word[wordindex(source_start+1)]  |= markmask_calc(source_start+1);

    counter_t source_vector = vectorindex(source_start);
    int32_t delta_bit    = bitindex_calc(destination_start) - bitindex_calc(source_start); // could be negative
    
    bitshift_t shift_bit = delta_bit; 
    bitshift_t shift_bit_flipped = WORD_SIZE_bitshift - shift_bit; 

    for (counter_t copy_vector = 3; copy_vector<400; copy_vector++, source_vector++) {
        bitarray_word[copy_vector*4  ] = (bitarray_word[source_vector*4-1] >> shift_bit_flipped) | (bitarray_word[source_vector*4  ] << shift_bit);
        bitarray_word[copy_vector*4+1] = (bitarray_word[source_vector*4  ] >> shift_bit_flipped) | (bitarray_word[source_vector*4+1] << shift_bit);
        bitarray_word[copy_vector*4+2] = (bitarray_word[source_vector*4+1] >> shift_bit_flipped) | (bitarray_word[source_vector*4+2] << shift_bit);
        bitarray_word[copy_vector*4+3] = (bitarray_word[source_vector*4+2] >> shift_bit_flipped) | (bitarray_word[source_vector*4+3] << shift_bit);
    }
}
int main(int argc, char *argv[]) {
    
//     struct sieve_t* sieve = sieve_create(1000000);
//     bitvector_t* bitarray = (bitvector_t*)sieve->bitarray;

//     int passes1 = benchmark(1, testshuffle_vector , sieve->bitarray, 500000);
//     int passes2 = benchmark(1, testshuffle_vector2, sieve->bitarray, 500000);
//     // int passes3 = benchmark(1, test3, sieve->bitarray, 500000);

//     // testshuffle(bitarray,1000000);
// //    dump_bitarray((bitword_t *)bitarray,20);

//     sieve_delete(sieve);
//     printf("Passes1:"); printfcomma2(passes1);printf("\n");
//     printf("Passes2:"); printfcomma2(passes2);printf("\n");
//     // printf("Passes3:"); printfcomma2(passes3);printf("\n");
//     exit(0);
    
    
    counter_t option_maxFactor  = default_sieve_limit;
    counter_t option_showMaxFactor = default_showMaxFactor;
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
        else if (strcmp(argv[arg], "--show")==0) { option_showMaxFactor=0;
            if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) != 1 || option_showMaxFactor > option_maxFactor) {
                fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
            }
            printf("Show maximum set to %ju\n",(uintmax_t)option_showMaxFactor);
        }
        else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_maxFactor) != 1) {
            fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(argv[0]); 
            printf("Maximum set to %ju\n",(uintmax_t)option_maxFactor);
        }
    }

    if (option_runonce) { // used for stats and debugging
        struct sieve_t* sieve = sieve_shake(option_maxFactor, default_blocksize);
        printf("\nResult set:\n");
        show_primes(sieve, option_showMaxFactor);
        int valid = validatePrimeCount(sieve,3);
        if (!valid) printf("The sieve is NOT valid\n");
        else printf("The sieve is VALID\n");
        sieve_delete(sieve);
        exit(0);
    }

    struct timespec start_time,end_time;

    if (option_verboselevel >=1) {
        #if __APPLE__
            printf("Apple detected. Using arrays instead of pointers\n");
        #else
            printf("Using Pointers\n");
        #endif
    }
        
    if (option_check) {
        // Count the number of primes and validate the result
        if (option_verboselevel >= 1) printf("Validating... ");
        if (option_verboselevel >= 2) printf("\n");

        // validate algorithm - run one time for all sizes
        for (counter_t sieveSize_check = 100; sieveSize_check <= 1000000; sieveSize_check *=10) {
            if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_check);
            struct sieve_t *sieve_check;
            for (counter_t blocksize_bits=1024; blocksize_bits<=2*1024*8; blocksize_bits *= 2) {
                if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
                sieve_check = sieve_shake(sieveSize_check, blocksize_bits);
                int valid = validatePrimeCount(sieve_check,option_verboselevel);
                sieve_delete(sieve_check);
                if (!valid) return 0; else if (option_verboselevel >= 3) printf("valid;");
            }
            if (option_verboselevel >= 2) printf("\n");
        }
        if (option_verboselevel >= 1) printf("...Valid algorithm\n");
    }
    
    counter_t best_blocksize_bits = default_blocksize;
    if (option_tunelevel) {
        tuning_result_type tuning_result = tune(option_tunelevel, option_maxFactor, option_verboselevel);
        global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
        global_MEDIUMSTEP_FASTER = tuning_result.mediumstep_faster;
        global_VECTORSTEP_FASTER = tuning_result.vectorstep_faster;
        best_blocksize_bits = tuning_result.blocksize_bits;
    }

    double max_time = default_sieve_duration;
    if (best_blocksize_bits > 0) {
        if (option_verboselevel >= 1) printf("Benchmarking... with blocksize %ju steps: %ju/%ju/%ju\n", (uintmax_t)best_blocksize_bits,(uintmax_t)global_SMALLSTEP_FASTER, (uintmax_t)global_MEDIUMSTEP_FASTER,(uintmax_t)global_VECTORSTEP_FASTER );
        counter_t passes = 0;
        counter_t blocksize_bits = best_blocksize_bits;
        double elapsed_time = 0;
        struct sieve_t *sieve;
        clock_gettime(CLOCK_MONOTONIC,&start_time);
        while (elapsed_time <= max_time) {
            sieve = sieve_shake(option_maxFactor, blocksize_bits);//blocksize_bits);
            sieve_delete(sieve);
            passes++;
            clock_gettime(CLOCK_MONOTONIC,&end_time);
            elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time.tv_nsec*1e-9;
        }
        printf("rogiervandam_extend;%ju;%f;1;algorithm=other,faithful=yes,bits=1\n", (uintmax_t)passes,elapsed_time);
        if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - per second %f\n", 5*passes/elapsed_time, passes/elapsed_time);
    }
    
    if (option_showMaxFactor > 0) {
        printf("Show result set:\n");
        struct sieve_t* sieve = sieve_shake(option_maxFactor, option_maxFactor);
        show_primes(sieve, option_showMaxFactor);
        sieve_delete(sieve);
        printf("\n");
    }
}

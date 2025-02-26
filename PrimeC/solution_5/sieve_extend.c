// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
#include <string.h>
#include <ctype.h> /* For isdigit() function */
#ifdef _OPENMP
#include <omp.h>
#endif

// defaults
#define compile_explain_level           0   // Set to 1 to enable compiling messages about the inner workings of the sieve for debugging
#define compile_verbose_level           0   // Set to 1-4 to enable compiling different verbose levels
#define anticiped_cache_line_bytesize   128 // How to align the caches

// include helper functions
#include "sieve_extend_helpers.h"
#include "sieve_extend_options.h"

struct sieve_t {
    bitword_t* bitstorage;
    counter_t  bits;
    counter_t  size;
};

// allocate memory for a sieve block
// NOTES:
// - use cache lines as much as possible - alignment might be key
// - moved clearing the sieve with 0 to the sieve_block_extend - it gave weird malloc problems at this point
// - switched to one malloc for the sieve, instead of one for the sieve and one for the storage
// - bitstorage will be aligned on the anticiped_cache_line_bytesize
static inline struct sieve_t * __attribute__((always_inline)) sieve_create(counter_t size) 
{
    struct sieve_t *sieve = malloc(((sizeof(struct sieve_t) + (size_t)(size>>1))|(anticiped_cache_line_bytesize-1))+1+anticiped_cache_line_bytesize);
    sieve->bitstorage     = __builtin_assume_aligned((void *) (( (uintptr_t) (sieve + sizeof(struct sieve_t))|(anticiped_cache_line_bytesize-1))+1),anticiped_cache_line_bytesize);
    sieve->bits           = size >> 1;
    sieve->size           = size;

    // code below not needed: only clearing the first word of each block will do the trick
    // for (counter_t index_word = 0; index_word <= wordindex(sieve->bits); index_word++) sieve->bitstorage[index_word] = SAFE_ZERO;
    return sieve;
}

static inline void __attribute__((always_inline)) sieve_clear(struct sieve_t *sieve) 
{
    for (counter_t index_word = 0; index_word <= wordindex(sieve->bits); index_word++) sieve->bitstorage[index_word] = SAFE_ZERO;
}


static inline void __attribute__((always_inline)) sieve_delete(struct sieve_t *sieve) 
{
    free(sieve);
}

// Finds the index of the next unset (false) bit in a bitmap, starting from a given index.
static inline counter_t __attribute__((always_inline)) searchBitFalse(bitword_t* bitstorage, register counter_t index) {

    // Normal function - really fast for small offsets
    do { index++; } while (bitstorage[wordindex(index)] & markmask(index));
    return index;
}

// Finds the index of the next unset (false) bit in a bitmap, starting from a given index
// Optimized function for large ranges which are not common
static inline counter_t __attribute__((always_inline)) searchBitFalse_largeRange(bitword_t* bitstorage, register counter_t index) {


    // Move to the next position after the starting index
    ++index;
    
    // Get the current word and bit position
    register counter_t word_index = wordindex(index);
    register counter_t bit_index  = bitindex_calc(index);
    register bitword_t current_word = bitstorage[word_index];

    if likely(bit_index) 
        current_word = (bitstorage[word_index] >> bit_index) | (bitstorage[word_index+1] << (WORD_SIZE_bitshift - bit_index));

    while unlikely(current_word == SAFE_FILL) {
        current_word = bitstorage[++word_index];
        index += (WORD_SIZE_bitshift - bit_index);
        bit_index = 0;
    }

    // Find the first unset bit using builtin_ffs
    // Note: ~current_word inverts the bits so we find first 0 instead of 1
    return index + builtin_ctz(~current_word);
}

// apply the same word mask at large ranges
// manually unlooped - this here is where the main speed increase comes from
// idea from PrimeRust/solution_1 by Michael Barber 
static inline void __attribute__((always_inline)) applyMask_word(bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitword_t mask, const counter_t index_word) 
{
    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    register const counter_t step_4 = step << 2;

    register bitword_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage[index_word], sizeof(bitword_t));

    const counter_t range_stop_word = wordindex(range_stop);
    register const bitword_t* restrict fast_loop_ptr  =  &bitstorage[((range_stop_word>step_4) ? (range_stop_word - step_4):0)];

    #pragma GCC ivdep
    while (index_ptr < fast_loop_ptr) {
        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask; 
        index_ptr += step_4;
    }
    register const bitword_t* restrict range_stop_ptr = &bitstorage[(range_stop_word)];

    for (counter_t i=4; i-- && likely(index_ptr < range_stop_ptr);  index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    // doing this instead of index_ptr <= above is faster. unexplained. 
    if (index_ptr == range_stop_ptr) { // index_ptr could also end above range_stop_ptr, depending on steps. 
        *index_ptr |= mask; // chop not needed is block-size aligned with word size
    }
}

// same as word mask, but at a vector level - uses the sse/avx extensions, hopefully
static inline void __attribute__((always_inline)) applyMask_vector(bitvector_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitvector_t mask, counter_t index_vector) 
{
    const counter_t range_stop_vector = vectorindex(range_stop);
    register const counter_t step_4 = step << 2;
    register bitvector_t* restrict index_ptr      =  __builtin_assume_aligned(&bitstorage[index_vector],sizeof(bitvector_t));
    #if is_signed(counter_t)
    register bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[range_stop_vector] - step_4,sizeof(bitvector_t));
    #else
    register bitvector_t* restrict fast_loop_ptr  =  __builtin_assume_aligned(&bitstorage[((range_stop_vector > step_4) ? (range_stop_vector - step_4):0)],sizeof(bitvector_t));
    #endif

    #pragma GCC ivdep
    while likely(index_ptr < fast_loop_ptr) {
        *index_ptr |= mask; index_ptr += step;
        *index_ptr |= mask; index_ptr += step;
        *index_ptr |= mask; index_ptr += step;
        *index_ptr |= mask; index_ptr += step;
    }
    
    register const bitvector_t* restrict range_stop_ptr = &bitstorage[(range_stop_vector)];
    
    for (counter_t i=4; i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    // doing this instead of index_ptr <= above is faster. unexplained. 
    if (index_ptr == range_stop_ptr) {
        *index_ptr |= mask; 
    }
}

// Medium steps could be within the same word (e.g. less than 64 bits apart).
// By joining the masks and then writing to memory, we might save some time.
// This is especially true for small steps over long ranges
// but it needs tuning, because there is some overhead of checking if the next step is in the same word
static inline void  __attribute__((always_inline)) setBitsTrue_mediumStep(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    // verbose4( timerLapStart(); )

    // fast exit for small ranges / large steps
    if unlikely(range_start + step > range_stop) {
        verbose3( printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-nostep (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
        bitstorage[wordindex(range_start)] |= markmask(range_start);
        verbose4( timerLapTime(); )
        return;
    }

    const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;

    if unlikely(range_stop_unique > range_stop) { // the range will not repeat itself; no need to try to reuse the mask
        verbose3( printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-unique (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
        for (register counter_t index = range_start; index <= range_stop;) {
            const counter_t index_word = wordindex(index);
            register bitword_t mask = SAFE_ZERO;
            for(counter_t index_word_start = wordstart(index); index_word_start == wordstart(index); index += step) mask |= markmask(index);
            bitstorage[index_word] |= mask;
        }
        verbose4( timerLapTime(); )
        return;
    }

    verbose3( printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-repeat (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_word = wordindex(index);
        register bitword_t mask = SAFE_ZERO;
        for(counter_t index_word_start = wordstart(index); index_word_start == wordstart(index); index += step) mask |= markmask(index);
        applyMask_word(bitstorage, step, range_stop, mask, index_word);
    }
    verbose4( timerLapTime(); )
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
static inline void  __attribute__((always_inline)) setBitsTrue_largeRange(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose4( timerLapStart(); )

    const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;

    if likely(range_stop_unique <= range_stop) { // the range will not repeat itself; no need to try to resuse the mask
        verbose3(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange-repeat (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
        verbose4( timerLapStart(); )
        for (register counter_t index = range_start; index < range_stop_unique; index += step) {
            applyMask_word(bitstorage, step, range_stop, markmask(index), wordindex(index));
        }
    }
    else {
        verbose3(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange-unique (%ju occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
        verbose4( timerLapStart(); )

        const counter_t step_2 = step * 2;
        #if is_signed(counter_t)
        const counter_t loop_stop = range_stop - step_2;
        #else
        const counter_t loop_stop = (range_stop > step_2) ? range_stop - step_2 : 0;
        #endif
        register counter_t index = range_start;

        #pragma GCC ivdep
        for (; index < loop_stop; index += step_2) {
            bitstorage[wordindex(index         )] |= markmask(index);
            bitstorage[wordindex(index + step  )] |= markmask(index + step  );
        }

        for (counter_t i=4; i-- && index < range_stop; index += step) 
            bitstorage[wordindex(index)] |= markmask(index);

        if unlikely(index==range_stop)
            bitstorage[wordindex(index)] |= markmask(index);
    }
    verbose4( timerLapTime(); )
}

static inline void  __attribute__((always_inline)) setBitsTrue_largeRange_vector(bitword_t* restrict bitstorage, counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose3(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange vector (%ju occurances; %ju stamps) ", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step), (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    verbose4( timerLapStart(); )

    counter_t range_start_atvector = vectorstart(range_start);
    if likely(( range_start_atvector + step) < range_start) { // not the first step possible in this vector - would give incomplete copies
        verbose3(  printf("\n..Range start %ju not at start of vector %ju\n",(uintmax_t)range_start, (uintmax_t)range_start_atvector); ) 

        range_start_atvector += VECTOR_SIZE; // find next vector
        if (unlikely(range_start_atvector > range_stop)) { // we should not be here; just handle without vector
            // #pragma GCC ivdep
            for (counter_t index = range_start; index <= range_stop; index += step) 
                bitstorage[wordindex(index)] |= markmask(index);
            verbose4( timerLapTime(); )
            return;
        }

        // #pragma GCC ivdep
        for (; range_start < range_start_atvector; range_start += step) 
            bitstorage[wordindex(range_start)] |= markmask(range_start);

        if unlikely(range_start==range_start_atvector)
            bitstorage[wordindex(range_start)] |= markmask(range_start);
    }
    
    const counter_t range_stop_unique =  range_start + VECTOR_SIZE_counter * step; 
    if (range_stop_unique > range_stop || step > VECTOR_SIZE_counter) { // fallback to other methods if vector is too large to repeat -> TODO: remove and fix in VECTORSIZE check
        if (step < WORD_SIZE_counter) setBitsTrue_mediumStep(bitstorage, range_start, step, range_stop);
        else setBitsTrue_largeRange(bitstorage, range_start, step, range_stop);
        verbose4( timerLapTime(); )
        return;
    }

    verbose3(  printf("..building masks in range %ju-%ju with WORD_SIZE %ju", (uintmax_t)range_start, (uintmax_t)range_stop_unique, (uintmax_t)WORD_SIZE_counter); )

    bitvector_t* restrict bitstorage_vector = (bitvector_t*) __builtin_assume_aligned(bitstorage, anticiped_cache_line_bytesize);
    counter_t current_vector =  vectorindex(range_start);

    if (step < VECTORWORD_SIZE_counter) {
        const bitword_t pattern_base = BITVECTORWORD_SHIFTBIT;
        register bitword_t pattern   = BITVECTORWORD_SHIFTBIT;
        bitshift_t pattern_size = step;

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
            register bitshift_t shift1 = shift;
            if (pattern_shift > shift) shift += step;
            shift -= pattern_shift;
            register bitshift_t shift2 = shift;
            if (pattern_shift > shift) shift += step;
            shift -= pattern_shift;
            #if VECTOR_ELEMENTS <= 2
                register bitvector_t shiftmask = { shift1, shift2 };
            #else
                register bitshift_t shift3 = shift;
                if (pattern_shift > shift) shift += step;
                shift -= pattern_shift;
                register bitshift_t shift4 = shift;
                if (pattern_shift > shift) shift += step;
                shift -= pattern_shift;
                #if VECTOR_ELEMENTS <= 4
                    register bitvector_t shiftmask = { shift1, shift2, shift3, shift4 };
                #else
                    register bitshift_t shift5 = shift;
                    if (pattern_shift > shift) shift += step;
                    shift -= pattern_shift;
                    register bitshift_t shift6 = shift;
                    if (pattern_shift > shift) shift += step;
                    shift -= pattern_shift;
                    register bitshift_t shift7 = shift;
                    if (pattern_shift > shift) shift += step;
                    shift -= pattern_shift;
                    register bitshift_t shift8 = shift;
                    if (pattern_shift > shift) shift += step;
                    shift -= pattern_shift;
                    register bitvector_t shiftmask = { shift1, shift2, shift3, shift4, shift5, shift6, shift7, shift8 };
                #endif
            #endif

            register bitvector_t quadmask = quadmask_base << shiftmask;
            applyMask_vector(bitstorage_vector, step, range_stop, quadmask, current_vector);
            current_vector++;
        }
    }
    else {
        for (counter_t index = range_start; index < range_stop_unique;) {
            register const counter_t current_vector_start = vectorstart(index);

            // bitvector_t quadmask;
            #if VECTOR_ELEMENTS == 8
            register bitvector_t quadmask = { SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO };
            #elif VECTOR_ELEMENTS == 4
            register bitvector_t quadmask = { SAFE_ZERO, SAFE_ZERO, SAFE_ZERO, SAFE_ZERO };
            #else 
            register bitvector_t quadmask = { SAFE_ZERO, SAFE_ZERO };
            #endif

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

    verbose4( timerLapTime(); )
}

static inline void __attribute__((always_inline)) continuePattern_smallSize(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose3(  printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    verbose4( timerLapStart(); )

    const counter_t source_word = wordindex(source_start);
    register const bitword_t base_pattern = ((bitstorage[source_word] >> bitindex(source_start)) | (bitstorage[source_word+1] << (WORD_SIZE_counter-bitindex_calc(source_start)))) & chopmask(size);
    register bitword_t pattern = base_pattern;

    register counter_t pattern_size = size;
    if (pattern_size < (WORD_SIZE_counter >> 2)) {
        pattern |= (base_pattern << size) | (base_pattern << size*2) | (base_pattern << size*3);
        pattern_size = size << 2;
    }

    const counter_t destination_start = source_start + size;
    if ((destination_stop - destination_start) > pattern_size) {
        for (; pattern_size <= WORD_SIZE_counter; pattern_size += size) pattern |= (base_pattern << pattern_size);
        pattern_size -= size;
    }

    counter_t destination_start_word = wordindex(destination_start);
    const counter_t destination_stop_word = wordindex(destination_stop);
    if (destination_start_word >= destination_stop_word) {
        bitstorage[destination_start_word] |= (pattern << bitindex(destination_start)) & chopmask(destination_stop);
        verbose4( timerLapTime(); )
        return;
    }

    bitstorage[destination_start_word] |= (pattern << bitindex(destination_start));

    register const bitshift_t pattern_shift = WORD_SIZE_bitshift - pattern_size;
    register bitshift_t shift = (WORD_SIZE_bitshift - bitindex_calc(destination_start)) & WORDMASK; // be sure this stays > 0
    register counter_t loop_range = destination_stop_word - destination_start_word;
    destination_start_word++;
    
    #pragma GCC ivdep
    for (counter_t i=0; i<=loop_range; ++i ) {
        bitstorage[destination_start_word+i] = (pattern << (pattern_size - ((shift+i*pattern_shift) & WORDMASK)  ) ) | (pattern >> ((shift+i*pattern_shift) & WORDMASK));
    }
    // bitstorage[destination_stop_word] &= chopmask(destination_stop); // not needed with appropriate block_size

    verbose4( timerLapTime(); )
}

static inline void  __attribute__((always_inline)) continuePattern_aligned(bitword_t* bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose3( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    verbose4( timerLapStart(); )

    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    counter_t source_word = wordindex(source_start);
    counter_t copy_word = wordindex(copy_start);
    
    bitstorage[copy_word] = bitstorage[source_word] & ~chopmask(copy_start);

    while (copy_word + size <= destination_stop_word) {
        memcpy(&bitstorage[copy_word], &bitstorage[source_word], (uintmax_t)size*sizeof(bitword_t) );
        copy_word += size;
    }

    while (copy_word < destination_stop_word) {
        bitstorage[copy_word] = bitstorage[source_word];
        source_word++;
        copy_word++;
    }
    verbose4( timerLapTime(); )
}

static inline void  __attribute__((always_inline)) continuePattern_shiftright(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose3( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    verbose4( timerLapStart(); )

    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
    register counter_t source_word = wordindex(source_start);
    register counter_t copy_word = wordindex(copy_start);

    if unlikely(copy_word >= destination_stop_word) { 
        bitstorage[copy_word] |= ((bitstorage[source_word] << shift)  // or the start in to not lose data
                                | (bitstorage[copy_word] >> shift_flipped))
                                & keepmask(copy_start) & chopmask(destination_stop);
        return; // rapid exit for one word variant
    }

    bitstorage[copy_word] |= ((bitstorage[source_word] << shift)  // or the start in to not lose data
                                | (bitstorage[copy_word] >> shift_flipped))
                                & keepmask(copy_start);
    
    copy_word++;

    verbose3( printf("...start - %ju - %ju - end..",(uintmax_t)wordindex(copy_start), (uintmax_t)destination_stop_word); )

    if (copy_word < source_word + VECTOR_ELEMENTS) {
        verbose3(  printf("...continue word by word (because source and copy are close together).."); )
        for (;copy_word <= destination_stop_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
        return; 
    }

    counter_t copy_size_byte  = size;
    counter_t copy_start_word = wordindex(vectorend(copy_start + (copy_size_byte << SHIFT_BYTE))+1); 
    if (copy_start_word > destination_stop_word) copy_start_word = destination_stop_word;

    // copy with shift - needed the not aligned at bytelevel
    // speed up when source and copy are further apart - may vectorize the loop

    verbose3(  printf("...speed copy until word %ju..", (uintmax_t)copy_start_word); )

    #ifdef WORD_SIZE_64
        #pragma GCC ivdep // only for 64bit
        for (; copy_word <= copy_start_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
    #else
        for (; copy_word <= copy_start_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
    #endif
    // end if we reached the destination already
    if (copy_word >= destination_stop_word) return;

    register uint8_t* restrict source_byte            = (u_int8_t*)((uintptr_t) bitstorage + (copy_start_word << (SHIFT_WORD-SHIFT_BYTE) ) - copy_size_byte);
    register uint8_t* restrict copy_byte              = (u_int8_t*)((uintptr_t) bitstorage + (copy_start_word << (SHIFT_WORD-SHIFT_BYTE) ));
    const uint8_t* restrict destination_stop_byte     = (u_int8_t*)((uintptr_t) bitstorage + ((destination_stop_word + 1) << SHIFT_BYTE) );

    do {
        memcpy(copy_byte, source_byte, copy_size_byte);
        copy_byte += copy_size_byte;
        copy_size_byte += copy_size_byte;
    } while (copy_byte + copy_size_byte < destination_stop_byte);

    memcpy(copy_byte, source_byte, destination_stop_byte - copy_byte);

    verbose4( timerLapTime(); )
}

static inline counter_t  __attribute__((always_inline)) continuePattern_shiftleft_unrolled(bitword_t* restrict bitstorage, const counter_t aligned_copy_word, const bitshift_t shift, counter_t copy_word, counter_t source_word) 
{
    #if is_signed(bitword_t)
    const counter_t fast_loop_stop_word = aligned_copy_word;
    #else
    const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_copy_word - 2) : 0; // safe for unsigned ints
    #endif

    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
    counter_t distance = 0;

    while (copy_word < fast_loop_stop_word) {
        register const bitword_t source0 = bitstorage[source_word  ];
        register const bitword_t source1 = bitstorage[source_word+1];
        bitstorage[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
        register const bitword_t source2 = bitstorage[source_word+2];
        bitstorage[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
        copy_word += 2;
        source_word += 2;
        distance += 2;
    }
    return distance;
}

static inline void __attribute__((always_inline)) continuePattern_shiftleft(bitword_t* bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose3( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    verbose4( timerLapStart(); )
    
    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
    register counter_t source_word = wordindex(source_start);
    register counter_t copy_word = wordindex(copy_start);
    bitstorage[copy_word] |= ((bitstorage[source_word] >> shift)
                             | (bitstorage[source_word+1] << shift_flipped))
                             & ~chopmask(copy_start); // because this is the first word, dont copy the extra bits in front of the source

    copy_word++;
    source_word++;

    const counter_t aligned_copy_word_unchecked = source_word + size;
    const counter_t aligned_copy_word = min(aligned_copy_word_unchecked, destination_stop_word); // after <<size>> words, just copy at word level
    const counter_t distance  = continuePattern_shiftleft_unrolled(bitstorage, aligned_copy_word, shift, copy_word, source_word);
    source_word += distance;
    copy_word += distance;

    verbose3( { 
        counter_t fast_loop_stop_word = uintsafeminus(aligned_copy_word,2); 
        printf("...start - %ju - end fastloop - %ju - start alignment - %ju - end", (uintmax_t)fast_loop_stop_word - (uintmax_t)wordindex(copy_start), (uintmax_t)aligned_copy_word - (uintmax_t)fast_loop_stop_word, (uintmax_t)destination_stop_word - (uintmax_t)aligned_copy_word); 
    } )

    for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
        bitstorage[copy_word] = (bitstorage[source_word  ] >> shift) | (bitstorage[source_word+1 ] << shift_flipped);
    }

    if (copy_word >= destination_stop_word) return;

    source_word = copy_word - size; // recalibrate
    const size_t memsize = (size_t)size*sizeof(bitword_t);

    for (;copy_word + size <= destination_stop_word; copy_word += size) 
        memcpy(&bitstorage[copy_word], &bitstorage[source_word],memsize );

    for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
        bitstorage[copy_word] = bitstorage[source_word];

    verbose4( timerLapTime(); )
}

// continue a pattern that start at <source_start> with a size of <size>.
// repeat this pattern up to <destination_stop>.
// for small sizes, this is done on a word level
// for larger sizes, we look at the offset / start bit and apply the appropriate algorithm.
// note that these algorithms are general for bitstorage and have no specialized assumptions for the sieve application
static inline void __attribute__((always_inline)) continuePattern(bitword_t* bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    if (size < WORD_SIZE_counter) {
        continuePattern_smallSize (bitstorage, source_start, size, destination_stop);
        return;
    }

    const bitshift_t copy_bit   = bitindex_calc(source_start + size);
    const bitshift_t source_bit = bitindex_calc(source_start);

    if      (source_bit > copy_bit) continuePattern_shiftleft (bitstorage, source_start, size, destination_stop);
    else if (source_bit < copy_bit) continuePattern_shiftright(bitstorage, source_start, size, destination_stop);
    else                            continuePattern_aligned   (bitstorage, source_start, size, destination_stop);
}

static counter_t sieve_block_stripe(bitword_t* bitstorage, const counter_t block_start, const counter_t block_stop, counter_t prime, const counter_t prime_max)
{
    // counter_t prime = prime_start;

    verbose3(  printf("Block stripe for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    
    while (prime < prime_max) {
        counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);

        // early exit when start is beyond block
        if unlikely(start > block_stop) return prime;

        // adjust start to begin within block
        if likely(block_start > start) {
            start = (block_start + prime) + prime - ((block_start + prime) % step);

            // there might be higher primes that will align before block_stop
            // early exit (optional; setbittrue does not set beyond block_stop)
            if (start > block_stop) {
                prime = searchBitFalse(bitstorage, prime);
                continue; 
            }
        }

        // set all multiples of prime in the block
        if (step < global_MEDIUMSTEP_FASTER) {
            setBitsTrue_mediumStep(bitstorage, start, step, block_stop);
            prime = searchBitFalse(bitstorage, prime);
        }
        else 
        if (step < global_VECTORSTEP_FASTER) { // speed up setting bits using bitvector;
            setBitsTrue_largeRange_vector(bitstorage, start, step, block_stop);
            prime = searchBitFalse(bitstorage, prime);
        }
        else { 
            setBitsTrue_largeRange(bitstorage, start, step, block_stop);
            prime = searchBitFalse_largeRange(bitstorage, prime);
        }
    }
    return prime; 
}

// structure to help sieve_block_extend report back to the main module
// struct block {
//     counter_t pattern_size; // size of pattern applied 
//     counter_t pattern_start; // start of pattern
//     counter_t prime_next; // next prime to be striped
// };

// returns prime that could not be handled:
// start is too large
// range is too big
static counter_t sieve_block_extend(struct sieve_t *sieve, const counter_t block_start, const counter_t block_stop) 
{
    bitword_t* restrict bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;
    bitstorage[0] = SAFE_ZERO; // only the first word has to be cleared; the rest is populated by the extension procedure

    register counter_t prime         = 1;

    counter_t step = prime * 2 + 1;
    counter_t start = prime * (step + 1);
    
    counter_t range_stop = step * 2;  // range is x2 so the second block cointains all multiples of primes
    counter_t pattern_start          = 0;
    counter_t patternsize_bits       = 3;

    setBitsTrue_mediumStep(bitstorage, start, step, range_stop);

    for (;range_stop < block_stop;) {
        prime = searchBitFalse(bitstorage, prime);

        const counter_t step = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if unlikely(start > block_stop) break;

        // if (block_start > prime) start = (block_start + prime) + prime - ((block_start + prime) % step);

        range_stop = patternsize_bits * step * 2;  // range is x2 so the second block cointains all multiples of primes
        if unlikely(range_stop > block_stop) break;

        pattern_start = patternsize_bits;
        continuePattern(bitstorage, pattern_start, patternsize_bits, range_stop);
        patternsize_bits *= step;

        if (step < global_MEDIUMSTEP_FASTER)      setBitsTrue_mediumStep(bitstorage, start, step, range_stop);
        else if (step < global_VECTORSTEP_FASTER) setBitsTrue_largeRange_vector(bitstorage, start, step, range_stop);
        else                                      setBitsTrue_largeRange(bitstorage, start, step, range_stop);
    } 

    // continue the found pattern to the entire sieve
    // continuePattern(bitstorage, block.pattern_start, block.pattern_size, sieve->bits);
    continuePattern(bitstorage, pattern_start, patternsize_bits, sieve_bits);
    return prime;
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* sieve_shake(const counter_t sieve_size, const counter_t block_size) 
{
    struct sieve_t *sieve = sieve_create(sieve_size);
    bitword_t* bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;

    verbose3(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)sieve_size,(uintmax_t)block_size); )

    // code for algorithm = base
    sieve_clear(sieve);
    counter_t prime_next = 1;
    //

    // code for algorithm = other
    // fill the entire sieve for lower primes by adding en copying incrementally
    // counter_t prime_next = sieve_block_extend(sieve, 0, sieve_bits);
    
    // continue from the prime that was processed in the pattern until the tuned value for blockwise processing
    // stripe off all the multiples of primes in the sieve
    if (prime_next < global_smallprime_faster) {
        prime_next = sieve_block_stripe(bitstorage, 0, sieve_bits, prime_next, global_smallprime_faster);
    }

    // in the sieve all bits for the multiples of primes up to startprime have been set
    // process the sieve and stripe all the multiples of primes > start_prime
    // do this block by block to minimize cache misses
    counter_t prime_max = usqrt(sieve_size);
    for (counter_t block_start = 0, block_stop = block_size-1; block_start <= sieve->bits; block_start += block_size, block_stop += block_size) {
        sieve_block_stripe(bitstorage, block_start, min(block_stop, sieve_bits), prime_next, prime_max);
    } 

    // return the completed sieve
    return sieve;
}

#include "sieve_extend_checks.h"
#include "sieve_extend_benchmark.h"
#include "sieve_extend_commandline.h"


int main(int argc, char *argv[]) 
{
    verbose2( printf("\nRunning sieve algorithm by Rogier van Dam with the following target:\n"));
    verbose2( printf("Count all primes up to \033[1;33m%ju\033[0m using the sieve of Eratosthenes\n", (uintmax_t)option.maxFactor));
    verbose1( printf("\n") );

    option = setDefaultOptions();
    option = parseCommandLine(argc, argv, option);

    #if compile_verbose_level >= 4
    verbose4( if (option.explain>=1) {
        explainSieveShake();
        printf("Exit\n");
        exit(0);
    })
    #endif

    // command line --check can be used to check the algorithm for all sieve/blocksize combinations
    if (option.check) checkSieveAlgorithm(); 

    benchmark_result_t benchmark_result;
    benchmark_result.sample_duration   = option.maxTime;
    benchmark_result.blocksize_bits    = option.blocksize_bits;
    benchmark_result.smallprime_faster = option.smallprime_faster;
    benchmark_result.mediumstep_faster = option.mediumStep;
    benchmark_result.vectorstep_faster = option.vectorStep; 
    benchmark_result.maxFactor         = option.maxFactor;

    option.explain = 0; // always turn off explain before benchmarking.

    counter_t runs = 0;
    for(counter_t threads=option.threads; threads >= 1 && runs < 2; threads = (threads>>1), runs++ ) {

        // prepare settings
        benchmark_result.threads = threads;

        // tuning - try combinations of different settings and apply these
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tune(option.tunelevel, option.maxFactor, threads, option.blocksize_kB);
            benchmark_result.smallprime_faster  = tuning_result.smallprime_faster;
            benchmark_result.mediumstep_faster = tuning_result.mediumstep_faster;
            benchmark_result.vectorstep_faster = tuning_result.vectorstep_faster;
            benchmark_result.blocksize_bits    = tuning_result.blocksize_bits;
        }

        if (option.blocksize_kB) benchmark_result.blocksize_bits = option.blocksize_kB*1024*8; // overrule all settings with user specified blocksize

        // encode settings for reporting
        char extension[50];
        char extended_output[50];
        if (threads > 1)
            sprintf(extension,"-u%juv%jub%jut%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_result.blocksize_bits/1024/8,(uintmax_t)threads);
        else
            sprintf(extension,"-u%juv%jub%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_result.blocksize_bits/1024/8);

        if (option.extended_output) {
            sprintf(extended_output,"-s%jum%juv%ju", (uintmax_t) benchmark_result.smallprime_faster,(uintmax_t)benchmark_result.mediumstep_faster, (uintmax_t)benchmark_result.vectorstep_faster);
        }

        verbose1( { printf("Benchmarking... with settings: %ju/%ju/%ju/%ju/%ju/%ju (blockstep, mediumstep, vectorstep, wordsize, vector elements, blocksize) and %ju threads for %.1f seconds - Results: (wait %.1lf seconds)...\n", 
                  (uintmax_t)benchmark_result.smallprime_faster, (uintmax_t)benchmark_result.mediumstep_faster, (uintmax_t)benchmark_result.vectorstep_faster, 
                  (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_result.blocksize_bits,
                  (uintmax_t)threads, benchmark_result.sample_duration, benchmark_result.sample_duration );
            fflush(stdout);
        })

        // one last check to make sure this is a valid algorithm for these settings
        struct sieve_t* sieve_check = sieve_shake(benchmark_result.maxFactor, benchmark_result.blocksize_bits);
        int valid = validatePrimeCount(sieve_check);
        sieve_delete(sieve_check);
        if (!valid) { fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for these settings\n"); exit(1); }
        else {
            verbose3(  printf("valid;\n"); )
        }
        // perform benchmark -> outputs passes, elapsed time and avg in result 
        benchmark(&benchmark_result);

        // report results
        #ifdef _OPENMP
        printf("rogiervandam_extend_epar%s%s;%ju;%f;%ju;algorithm=other,faithful=yes,bits=1\n",extension,extended_output,(uintmax_t)benchmark_result.passes,benchmark_result.elapsed_time,(uintmax_t)threads);
        #else
        printf("rogiervandam_extend%s%s;%ju;%f;%ju;algorithm=other,faithful=yes,bits=1\n",extension,extended_output,(uintmax_t)benchmark_result.passes,benchmark_result.elapsed_time,(uintmax_t)threads);
        #endif
        verbose1({
            printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", option.maxTime, option.maxTime*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
            if (option.maxTime!=5.0) printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 5.0, 5.0*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
            if (threads>1) printf("\033[0;32m(Passes per thread (total %ju) - per %.1f seconds: %.1f - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 
                                 (uintmax_t)threads,  option.maxTime, option.maxTime*benchmark_result.passes/benchmark_result.elapsed_time/threads, benchmark_result.passes/benchmark_result.elapsed_time/threads);
        })
        fflush(stdout);
    }

    // show results for --show command line option
    if (option.showMaxFactor > 0) {
        printf("Show result set:\n");
        struct sieve_t* sieve = sieve_shake(option.maxFactor, option.maxFactor);
        show_primes(sieve, option.showMaxFactor);
        sieve_delete(sieve);
    }
}

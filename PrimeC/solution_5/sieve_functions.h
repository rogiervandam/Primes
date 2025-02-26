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
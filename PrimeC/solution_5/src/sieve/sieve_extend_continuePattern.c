// This file is part of the sieve of Eratosthenes project and is exclusively used for the sieve_extend module.
// This file contains the continuePattern function that is used to extend (copy) a pattern in a bitstorage.
// The function is optimized for different sizes and offsets of the pattern and uses different algorithms for this.


static inline void __attribute__((always_inline)) continuePattern_smallSize(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose5( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using continuePattern_smallSize (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern_smallSize);

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
        timer_laptime(time_continuePattern_smallSize); verbose5( printf("early exit\n"); )
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
    timer_laptime(time_continuePattern_smallSize); verbose5( printf("\n"); )
}

static inline void  __attribute__((always_inline)) continuePattern_aligned(bitword_t* bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose5( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using continuePattern_aligned (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern_aligned);

    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    register counter_t source_word = wordindex(source_start);
    register counter_t copy_word = wordindex(copy_start);
    
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

    timer_laptime(time_continuePattern_aligned); verbose5( printf("\n"); )
}

static inline void  __attribute__((always_inline)) continuePattern_shiftright(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose5( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using continuePattern_shiftright (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern_shiftright);

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
        timer_laptime(time_continuePattern_shiftright); verbose5( printf("\n"); )
        return; // rapid exit for one word variant
    }

    bitstorage[copy_word] |= ((bitstorage[source_word] << shift)  // or the start in to not lose data
                                | (bitstorage[copy_word] >> shift_flipped))
                                & keepmask(copy_start);
    
    copy_word++;

    verbose5( printf("...start - %ju - %ju - end..",(uintmax_t)wordindex(copy_start), (uintmax_t)destination_stop_word); )

    if (copy_word < source_word + VECTOR_ELEMENTS) {
        verbose5(  printf("...continue word by word (because source and copy are close together).."); )
        for (;copy_word <= destination_stop_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
        timer_laptime(time_continuePattern_shiftright); verbose5( printf("\n"); )
        return; 
    }

    counter_t copy_size_byte  = size;
    counter_t copy_start_word = wordindex(vectorend(copy_start + (copy_size_byte << SHIFT_BYTE))+1); 
    if (copy_start_word > destination_stop_word) copy_start_word = destination_stop_word;

    // copy with shift - needed the not aligned at bytelevel
    // speed up when source and copy are further apart - may vectorize the loop

    verbose5(  printf("...speed copy until word %ju..", (uintmax_t)copy_start_word); )

    #ifdef WORD_SIZE_64
        #pragma GCC ivdep // only for 64bit
        for (; copy_word <= copy_start_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
    #else
        for (; copy_word <= copy_start_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
    #endif
    // end if we reached the destination already
    if (copy_word >= destination_stop_word) {
        timer_laptime(time_continuePattern_shiftright); verbose5( printf("\n"); )
        return;
    }

    register uint8_t* restrict source_byte            = (uint8_t*)((uintptr_t) bitstorage + (copy_start_word << (SHIFT_WORD-SHIFT_BYTE) ) - copy_size_byte);
    register uint8_t* restrict copy_byte              = (uint8_t*)((uintptr_t) bitstorage + (copy_start_word << (SHIFT_WORD-SHIFT_BYTE) ));
    const uint8_t* restrict destination_stop_byte     = (uint8_t*)((uintptr_t) bitstorage + ((destination_stop_word + 1) << SHIFT_BYTE) );

    do {
        memcpy(copy_byte, source_byte, copy_size_byte);
        copy_byte += copy_size_byte;
        copy_size_byte += copy_size_byte;
    } while (copy_byte + copy_size_byte < destination_stop_byte);

    memcpy(copy_byte, source_byte, destination_stop_byte - copy_byte);

    timer_laptime(time_continuePattern_shiftright); verbose5( printf("\n"); )
}

static inline counter_t  __attribute__((always_inline)) continuePattern_shiftleft_unrolled(bitword_t* restrict bitstorage, const counter_t aligned_copy_word, const bitshift_t shift, counter_t copy_word, counter_t source_word) 
{
    verbose5( printf("...continuePattern_shiftleft_unrolled with aligned copy word %ju, shift %ju, copy_word %ju, source_word %ju..", (uintmax_t)aligned_copy_word, (uintmax_t)shift, (uintmax_t)copy_word, (uintmax_t)source_word); )
    timer_lapstart(time_continuePattern_shiftleft_unrolled);

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

    timer_laptime(time_continuePattern_shiftleft_unrolled); verbose5( printf("\n"); )
    return distance;
}

static inline void __attribute__((always_inline)) continuePattern_shiftleft(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose5( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using continuePattern_shiftleft (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern_shiftleft);

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
    const counter_t distance = continuePattern_shiftleft_unrolled(bitstorage, aligned_copy_word, shift, copy_word, source_word);
    source_word += distance;
    copy_word += distance;

    for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
        bitstorage[copy_word] = (bitstorage[source_word] >> shift) | (bitstorage[source_word+1] << shift_flipped);
    }

    if (copy_word >= destination_stop_word) {
        timer_laptime(time_continuePattern_shiftleft); verbose5( printf("\n"); )
        return;
    }

    source_word = copy_word - size; // recalibrate
    const size_t memsize = (size_t)size*sizeof(bitword_t);

    // TODO: check if memsize could be larger or applyword could be reused
    for (;copy_word + size <= destination_stop_word; copy_word += size) 
    bitstorage[copy_word] = bitstorage[source_word];
        // memcpy(&bitstorage[copy_word], &bitstorage[source_word],memsize );

    for (;copy_word <= destination_stop_word; copy_word++, source_word++)
        bitstorage[copy_word] = bitstorage[source_word];

    timer_laptime(time_continuePattern_shiftleft); verbose5( printf("\n"); )
}

// continue a pattern that start at <source_start> with a size of <size>.
// repeat this pattern up to <destination_stop>.
// for small sizes, this is done on a word level
// for larger sizes, we look at the offset / start bit and apply the appropriate algorithm.
// note that these algorithms are general for bitstorage and have no specialized assumptions for the sieve application
static inline void __attribute__((always_inline)) continuePattern(bitword_t* bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose5( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using continuePattern (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern);
    if (size < WORD_SIZE_counter) {
        continuePattern_smallSize(bitstorage, source_start, size, destination_stop);
        timer_laptime(time_continuePattern); verbose5( printf("\n"); )
        return;
    }

    const bitshift_t copy_bit   = bitindex_calc(source_start + size);
    const bitshift_t source_bit = bitindex_calc(source_start);

    if      (source_bit > copy_bit) continuePattern_shiftleft (bitstorage, source_start, size, destination_stop);
    else if (source_bit < copy_bit) continuePattern_shiftright(bitstorage, source_start, size, destination_stop);
    else                            continuePattern_aligned   (bitstorage, source_start, size, destination_stop);

    timer_laptime(time_continuePattern); verbose5( printf("\n"); )
}

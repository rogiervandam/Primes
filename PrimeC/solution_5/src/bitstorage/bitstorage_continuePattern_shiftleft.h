
static inline counter_t  __attribute__((always_inline)) continuePattern_shiftleft_unrolled(bitword_t* restrict bitstorage, const counter_t aligned_copy_word, const bitshift_t shift, counter_t copy_word, counter_t source_word) 
{
    verbose7( printf("...continuePattern_shiftleft_unrolled with aligned copy word %ju, shift %ju, copy_word %ju, source_word %ju..", (uintmax_t)aligned_copy_word, (uintmax_t)shift, (uintmax_t)copy_word, (uintmax_t)source_word); )
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

    timer_laptime(time_continuePattern_shiftleft_unrolled); verbose7( printf("\n"); )
    return distance;
}

static inline void __attribute__((always_inline)) continuePattern_shiftleft(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose7( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using continuePattern_shiftleft (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
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
        timer_laptime(time_continuePattern_shiftleft); verbose7( printf("\n"); )
        return;
    }

    source_word = copy_word - size; // recalibrate
    const size_t memsize = (size_t)size*sizeof(bitword_t);

    for (;copy_word + size <= destination_stop_word; copy_word += size) 
        bitstorage[copy_word] = bitstorage[source_word];

    for (;copy_word <= destination_stop_word; copy_word++, source_word++)
        bitstorage[copy_word] = bitstorage[source_word];

    timer_laptime(time_continuePattern_shiftleft); verbose7( printf("\n"); )
}



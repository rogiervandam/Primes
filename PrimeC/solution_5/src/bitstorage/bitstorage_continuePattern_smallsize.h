static inline void __attribute__((always_inline)) continuePattern_smallSize(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose7( printf("Continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern_smallSize (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
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
        timer_laptime(time_continuePattern_smallSize); verbose7( printf("early exit\n"); )
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
    timer_laptime(time_continuePattern_smallSize); verbose7( printf("\n"); )
}
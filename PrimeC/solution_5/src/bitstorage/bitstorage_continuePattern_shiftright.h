static inline void  __attribute__((always_inline)) continuePattern_shiftright(bitword_t* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose7( printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using continuePattern_shiftright (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
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
        timer_laptime(time_continuePattern_shiftright); verbose7( printf("\n"); )
        return; // rapid exit for one word variant
    }

    bitstorage[copy_word] |= ((bitstorage[source_word] << shift)  // or the start in to not lose data
                                | (bitstorage[copy_word] >> shift_flipped))
                                & keepmask(copy_start);
    
    copy_word++;

    verbose7( printf("...startword - %ju - copystartword %ju - endword %ju..",(uintmax_t)source_word, (uintmax_t)copy_word, (uintmax_t)destination_stop_word); )

    if (copy_word < source_word + VECTOR_ELEMENTS) {
        verbose7(  printf("...continue word by word (because source and copy are close together).."); )
        for (;copy_word <= destination_stop_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
        timer_laptime(time_continuePattern_shiftright); verbose7( printf("\n"); )
        return; 
    }

    // search for the first word that is aligned at bytelevel
    counter_t copy_size_bytes = size; // at bytelevel, the size is the same
    counter_t copy_start_word = wordindex(vectorend(copy_start + (copy_size_bytes << SHIFT_BYTE))+1); 
    if (copy_start_word > destination_stop_word) copy_start_word = destination_stop_word;

    // copy with shift - needed when not aligned at bytelevel
    // speed up when source and copy are further apart - may vectorize the loop

    verbose7(  printf("...speed copy until word %ju..", (uintmax_t)copy_start_word); )

    // copy the pattern until we reach bytelevel alignment
    #if BITWORD_T_SIZE_PP == 64
        #pragma GCC ivdep // only for 64bit
        for (; copy_word <= copy_start_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
    #else
        for (; copy_word <= copy_start_word; copy_word++, source_word++ ) 
            bitstorage[copy_word] = (bitstorage[source_word] >> shift_flipped) | (bitstorage[source_word+1] << shift);
    #endif

    // end if we reached the destination already
    if (copy_word >= destination_stop_word) {
        timer_laptime(time_continuePattern_shiftright); verbose7( printf("\n"); )
        return;
    }

    uint8_t* source_byte           = (uint8_t*) &bitstorage[copy_start_word] - copy_size_bytes;
    uint8_t* copy_byte             = (uint8_t*) &bitstorage[copy_start_word];
    uint8_t* destination_stop_byte = (uint8_t*) &bitstorage[destination_stop_word+1];

    // Copy the pattern. Now the pattern is 2x the size of the original pattern. Repeat.
    do {
        memcpy(copy_byte, source_byte, copy_size_bytes);
        copy_byte += copy_size_bytes;
        copy_size_bytes += copy_size_bytes;
    } while (copy_byte + copy_size_bytes < destination_stop_byte);

    // Copy the last part of the pattern
    memcpy(copy_byte, source_byte, destination_stop_byte - copy_byte);

    timer_laptime(time_continuePattern_shiftright); verbose7( printf("\n"); )
}
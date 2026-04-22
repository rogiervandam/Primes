static inline void __attribute__((always_inline, hot, nonnull)) 
continuePattern_smallSize(void* restrict bitstorage, const counter_t source_start, const counter_t destination_stop, const counter_t size)
{
    logBegin7(time_continuePattern_smallSize, "ContinuePatternSmallSize: continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern_smallSize (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));

    bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    const counter_t source_word = index_type(source_start, bitbucket_t);
    register const bitbucket_t base_pattern = ((bitstorage_sized[source_word  ] >> bitindex_calc_type(source_start, bitbucket_t)) 
                                              |(bitstorage_sized[source_word+1] << (bitcount_type(bitbucket_t)-bitindex_calc_type(source_start, bitbucket_t)))) 
                                              &chopmask_type(size, bitbucket_t);
    register bitbucket_t pattern = base_pattern;
    register counter_t pattern_size = size;

    const counter_t destination_start = source_start + size;
    if ((destination_stop - destination_start) > pattern_size) {
        for (; pattern_size <= bitcount_type(bitbucket_t); pattern_size += size) pattern |= (base_pattern << pattern_size);
        pattern_size -= size;
    }

    counter_t destination_start_word = index_type(destination_start, bitbucket_t);
    const counter_t destination_stop_word = index_type(destination_stop, bitbucket_t);

    if (destination_start_word >= destination_stop_word) {
        bitstorage_sized[destination_start_word] |= (pattern << bitindex_calc_type(destination_start, bitbucket_t)) & chopmask_type(destination_stop, bitbucket_t);

        log9(bitstorage, "ContinuePatternSmallSize: handled with small size in one word destination_start=%ju destination_stop=%ju size=%ju", (uintmax_t)destination_start, (uintmax_t)destination_stop, (uintmax_t)size);
        // TRACE_STEP(bitstorage,
        //            "ContinuePatternSmallSize: handled with small size in one word destination_start=%ju destination_stop=%ju size=%ju",
        //            (uintmax_t)destination_start,
        //            (uintmax_t)destination_stop,
        //            (uintmax_t)size);

        logEnd7(time_continuePattern_smallSize,"\n");
        return;
    }

    bitstorage_sized[destination_start_word++] |= (pattern << bitindex_type(destination_start, bitbucket_t));
    log9(bitstorage,
        "ContinuePattern_smallsize: setting first word of destination_start=%ju destination_stop=%ju size=%ju",
        (uintmax_t)source_start,
        (uintmax_t)destination_stop,
        (uintmax_t)size);

    register const bitshift_t pattern_shift = bitcount_type(bitbucket_t) - pattern_size;
    register bitshift_t shift = (bitcount_type(bitbucket_t) - bitindex_calc_type(destination_start, bitbucket_t)) & mask_type(bitbucket_t); // be sure this stays > 0
    // destination_start_word++;
    register counter_t loop_range = destination_stop_word - destination_start_word;
    
    // log7(bitstorage, "Destination start word %ju, stop word %ju, loop range %ju\n", (uintmax_t)destination_start_word, (uintmax_t)destination_stop_word, (uintmax_t)loop_range);
        // TRACE_STEP(bitstorage, "Destination start word %ju, stop word %ju, loop range %ju\n", (uintmax_t)destination_start_word, (uintmax_t)destination_stop_word, (uintmax_t)loop_range);

    #pragma GCC ivdep
    for (counter_t i = 0; i <= loop_range; ++i ) {
        bitstorage_sized[destination_start_word + i] = (pattern << (pattern_size - ((shift + i * pattern_shift) & mask_type(bitbucket_t)))) 
                                                     | (pattern >>                 ((shift + i * pattern_shift) & mask_type(bitbucket_t)));

        log7(bitstorage, "ContinuePatternSmallSize: handled with small size in loop destination_start=%ju destination_stop=%ju size=%ju loop_index=%ju", (uintmax_t)destination_start, (uintmax_t)destination_stop, (uintmax_t)size, (uintmax_t)i);  
        // TRACE_STEP(bitstorage,
        //            "ContinuePatternSmallSize: handled with small size in loop destination_start=%ju destination_stop=%ju size=%ju loop_index=%ju",
        //            (uintmax_t)destination_start,
        //            (uintmax_t)destination_stop,
        //            (uintmax_t)size,
        //            (uintmax_t)i);
    }
    // bitstorage[destination_stop_word] &= chopmask(destination_stop); // not needed with appropriate block_size
    logEnd7(time_continuePattern_smallSize,"\n");
}
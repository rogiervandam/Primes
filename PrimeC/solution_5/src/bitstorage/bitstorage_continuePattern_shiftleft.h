static inline counter_t __attribute__((always_inline, hot, nonnull)) 
continuePattern_shiftleft_unrolled(void* restrict bitstorage, const counter_t aligned_copy_word, const bitshift_t shift, counter_t copy_word, counter_t source_word) 
{
    verbose7( printf("...continuePattern_shiftleft_unrolled with aligned copy word %ju, shift %ju, copy_word %ju, source_word %ju..", (uintmax_t)aligned_copy_word, (uintmax_t)shift, (uintmax_t)copy_word, (uintmax_t)source_word); )
    timer_lapstart(time_continuePattern_shiftleft_unrolled);

    bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t fast_loop_stop_word = safe_diff_type(aligned_copy_word, 8, counter_t); // Increase unrolling to 8
    const bitshift_t shift_flipped = bitcount_type(bitbucket_t)-shift;
    counter_t distance = 0;

    // Set up direct pointers for faster access
    bitbucket_t* restrict src_ptr = &bitstorage_sized[source_word];
    bitbucket_t* restrict dst_ptr = &bitstorage_sized[copy_word];
    
    // Add more aggressive prefetching
    __builtin_prefetch(src_ptr + 16, 0, 0);
    __builtin_prefetch(src_ptr + 24, 0, 0);
    
    // 8x unrolled loop for better instruction-level parallelism
    while (copy_word < fast_loop_stop_word) {
        // Prefetch data for future iterations
        __builtin_prefetch(src_ptr + 32, 0, 0);
        
        // Load all source data first (using direct pointer dereferencing)
        const bitbucket_t source0 = src_ptr[0];
        const bitbucket_t source1 = src_ptr[1];
        const bitbucket_t source2 = src_ptr[2];
        const bitbucket_t source3 = src_ptr[3];
        const bitbucket_t source4 = src_ptr[4];
        const bitbucket_t source5 = src_ptr[5];
        const bitbucket_t source6 = src_ptr[6];
        const bitbucket_t source7 = src_ptr[7];
        const bitbucket_t source8 = src_ptr[8];
        
        // Store results directly via pointers
        dst_ptr[0] = (source0 >> shift) | (source1 << shift_flipped);
        dst_ptr[1] = (source1 >> shift) | (source2 << shift_flipped);
        dst_ptr[2] = (source2 >> shift) | (source3 << shift_flipped);
        dst_ptr[3] = (source3 >> shift) | (source4 << shift_flipped);
        dst_ptr[4] = (source4 >> shift) | (source5 << shift_flipped);
        dst_ptr[5] = (source5 >> shift) | (source6 << shift_flipped);
        dst_ptr[6] = (source6 >> shift) | (source7 << shift_flipped);
        dst_ptr[7] = (source7 >> shift) | (source8 << shift_flipped);
        
        src_ptr += 8;
        dst_ptr += 8;
        copy_word += 8;
        source_word += 8;
        distance += 8;
    }
    
    // 4x unrolled loop for remaining elements that can be processed in groups of 4
    while (copy_word + 3 < aligned_copy_word) {
        const bitbucket_t source0 = src_ptr[0];
        const bitbucket_t source1 = src_ptr[1];
        const bitbucket_t source2 = src_ptr[2];
        const bitbucket_t source3 = src_ptr[3];
        const bitbucket_t source4 = src_ptr[4];
        
        dst_ptr[0] = (source0 >> shift) | (source1 << shift_flipped);
        dst_ptr[1] = (source1 >> shift) | (source2 << shift_flipped);
        dst_ptr[2] = (source2 >> shift) | (source3 << shift_flipped);
        dst_ptr[3] = (source3 >> shift) | (source4 << shift_flipped);
        
        src_ptr += 4;
        dst_ptr += 4;
        copy_word += 4;
        source_word += 4;
        distance += 4;
    }
    
    // Handle final elements one by one
    while (copy_word < aligned_copy_word) {
        const bitbucket_t source0 = *src_ptr;
        const bitbucket_t source1 = *(src_ptr + 1);
        *dst_ptr = (source0 >> shift) | (source1 << shift_flipped);
        
        src_ptr++;
        dst_ptr++;
        copy_word++;
        source_word++;
        distance++;
    }

    timer_laptime(time_continuePattern_shiftleft_unrolled); verbose7( printf("\n"); )
    return distance;
}

static inline void __attribute__((always_inline)) 
continuePattern_shiftleft(void* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose7( printf("Continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern_shiftleft (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern_shiftleft);

    bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    const counter_t destination_stop_word = index_type(destination_stop, bitbucket_t);
    const counter_t copy_start = source_start + size;
    register const bitshift_t shift = bitindex_calc_type(source_start, bitbucket_t) - bitindex_calc_type(copy_start, bitbucket_t);
    register const bitshift_t shift_flipped = bitcount_type(bitbucket_t)-shift;
    register counter_t source_word = index_type(source_start, bitbucket_t);
    register counter_t copy_word = index_type(copy_start, bitbucket_t);
    bitstorage_sized[copy_word] |= ((bitstorage_sized[source_word] >> shift)
                                | (bitstorage_sized[source_word+1] << shift_flipped))
                                & ~chopmask_type(copy_start, bitbucket_t); // because this is the first word, dont copy the extra bits in front of the source

    copy_word++;
    source_word++;

    const counter_t aligned_copy_word_unchecked = source_word + size;
    const counter_t aligned_copy_word = min(aligned_copy_word_unchecked, destination_stop_word); // after <<size>> words, just copy at word level
    const counter_t distance = continuePattern_shiftleft_unrolled(bitstorage, aligned_copy_word, shift, copy_word, source_word);
    source_word += distance;
    copy_word += distance;

    // 4-way unrolled loop for better ILP
    for (;copy_word + 3 <= aligned_copy_word; copy_word += 4, source_word += 4) {
        bitstorage_sized[copy_word] = (bitstorage_sized[source_word] >> shift) | (bitstorage_sized[source_word+1] << shift_flipped);
        bitstorage_sized[copy_word+1] = (bitstorage_sized[source_word+1] >> shift) | (bitstorage_sized[source_word+2] << shift_flipped);
        bitstorage_sized[copy_word+2] = (bitstorage_sized[source_word+2] >> shift) | (bitstorage_sized[source_word+3] << shift_flipped);
        bitstorage_sized[copy_word+3] = (bitstorage_sized[source_word+3] >> shift) | (bitstorage_sized[source_word+4] << shift_flipped);
    }
    
    // Handle remaining elements
    for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
        bitstorage_sized[copy_word] = (bitstorage_sized[source_word] >> shift) | (bitstorage_sized[source_word+1] << shift_flipped);
    }

    if (copy_word >= destination_stop_word) {
        timer_laptime(time_continuePattern_shiftleft); verbose7( printf("\n"); )
        return;
    }

    source_word = copy_word - size; // recalibrate
    
    // Use memcpy for bulk operations if the pattern size is large enough
    const size_t word_size = sizeof(bitbucket_t);
    if (size >= 8) {
        const size_t memsize = (size_t)size*word_size;
        // Copy in larger chunks with memcpy
        counter_t src_pos = source_word;
        while (copy_word + size <= destination_stop_word) {
            memcpy(&bitstorage_sized[copy_word], &bitstorage_sized[src_pos], memsize);
            copy_word += size;
        }
    } else {
        // Original loop but fixed to increment source_word properly
        for (;copy_word + size <= destination_stop_word; copy_word += size, source_word += size) {
            // Unroll small patterns for better performance
            for (counter_t i = 0; i < size; i++) {
                bitstorage_sized[copy_word + i] = bitstorage_sized[source_word + i];
            }
        }
    }

    // Handle remaining elements
    for (;copy_word <= destination_stop_word; copy_word++, source_word++)
        bitstorage_sized[copy_word] = bitstorage_sized[source_word];

    timer_laptime(time_continuePattern_shiftleft); verbose7( printf("\n"); )
}



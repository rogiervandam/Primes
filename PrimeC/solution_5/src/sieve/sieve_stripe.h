static inline counter_t __attribute__((always_inline)) prime_stripe_start_beyond_block_stop_calc(const counter_t block_stop) {
    return (counter_t) (usqrt(block_stop << 1) - 1) >> 1;
}

static inline counter_t __attribute__((always_inline)) prime_pattern_not_repeating_in_block(const counter_t range_start, const counter_t range_stop, const counter_t blocksize) {
    // We need to solve: 2*prime² + 2*(blocksize+1)*prime + blocksize >= range_stop
    counter_t low = 1;
    counter_t high;

    // Find a reasonable upper bound
    if (range_stop > blocksize) {
        high = range_stop / (2 * blocksize); 
        if (high == 0) high = 1;
    } else {
        high = 1;
    }

    // Double until we find a valid upper bound
    for (;;) {
        counter_t step = high * 2 + 1;
        
#if COUNTER_T_SIZE_PP == 32
        // Use 64-bit arithmetic to avoid overflow on 32-bit types
        uint64_t high64 = (counter_t)high;
        uint64_t calculated = high64 * 2 * (high64 + 1);
        
        // Check if we'd exceed range_stop or if multiplication would overflow
        if (calculated > range_stop || 
            step > UINT32_MAX / blocksize ||     // Check for multiplication overflow
            high >= UINT32_MAX / 4) break;       // Prevent overflow in high*2*(high+1)
            
        // Check if the condition is satisfied
        counter_t block_step = (counter_t)blocksize * step;
        if (block_step >= (range_stop - (counter_t)calculated)) break;
#else
        // For 64-bit types, we can do direct calculations in most cases
        // Only check for extreme values
        counter_t calculated = high * 2 * (high + 1);
               
        // Only check for overflow in extreme cases
        if (high > (UINT64_MAX / 4) || calculated > range_stop) break;

        // Check if the condition is satisfied
        if (blocksize * step >= (range_stop - calculated)) break;
#endif
        
        high = high * 2;
    }
    
    // Binary search
    while (low < high) {
        debug_hits += debug_final_plan;
        counter_t mid = low + (high - low) / 2;
        counter_t step = mid * 2 + 1;
        
#if COUNTER_T_SIZE_PP == 32
        // Use 64-bit arithmetic for calculations
        uint64_t mid64 = (uint64_t)mid;
        uint64_t calculated = mid64 * 2 * (mid64 + 1);
        
        // Adjust calculation to account for range_start
        calculated = calculated < range_start ? range_start : calculated;
        
        if (calculated > range_stop) {
            high = mid;
        } else {
            uint64_t block_step = (uint64_t)blocksize * step;
            if (block_step >= (range_stop - (counter_t)calculated)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
#else
        // 64-bit direct calculation
        counter_t calculated = mid * 2 * (mid + 1);
        
        // Adjust calculation to account for range_start
        calculated = calculated < range_start ? range_start : calculated;
        
        if (calculated > range_stop) {
            high = mid;
        } else {
            if (blocksize * step >= (range_stop - calculated)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
#endif
    }
    
    return low;
}

static inline counter_t __attribute__((always_inline)) compute_start(const counter_t prime, const counter_t block_start) {
    register const counter_t step = prime * 2 + 1;
    register counter_t start = prime * (step + 1);
    if (block_start && start < block_start) {
        start = (block_start + prime) + prime - ((block_start + prime) % step);
    }
    return start;
}

static inline counter_t __attribute__((always_inline)) sieve_block_stripe(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe);

    const counter_t prime_stripe_start_beyond_block_stop = prime_stripe_start_beyond_block_stop_calc(block_stop);
    const counter_t prime_vectorpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, VECTOR_SIZE_counter);
    const counter_t prime_wordpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, WORD_SIZE_counter*3);

    const counter_t prime_endloop5 = min(prime_max, prime_stripe_start_beyond_block_stop);
    const counter_t prime_endloop4 = min(prime_endloop5, prime_wordpattern_not_repeating_in_block);
    const counter_t prime_endloop3 = min(min(min(prime_endloop4, prime_vectorpattern_not_repeating_in_block), VECTOR_SIZE_counter/2),  global_largestep_faster/2);
    const counter_t prime_endloop2 = min(prime_endloop3, VECTORWORD_SIZE_counter/2);  
    const counter_t prime_endloop1 = min(prime_endloop2, global_mediumstep_faster/2);
 
    counter_t prime = prime_start;

    verbose5( printf("Plan start with prime %ju up to %ju using range %ju - %ju:\n", (uintmax_t)prime_start*2+1, (uintmax_t)prime_max*2+1, (uintmax_t)block_start, (uintmax_t)block_stop ); )
    verbose5( if(prime_start    < prime_endloop1) printf("(1) Prime %3ju - %3ju : Use vectors with rolling words for bitsize %3ju up to %3ju\n", (uintmax_t)prime_start    *2+1, (uintmax_t)prime_endloop1 *2+1, (uintmax_t)prime_start,    (uintmax_t)prime_endloop1); )
    verbose5( if(prime_endloop1 < prime_endloop2) printf("(2) Prime %3ju - %3ju : Use repeating wordsize masks   for bitsize %3ju up to %3ju\n", (uintmax_t)prime_endloop1 *2+1, (uintmax_t)prime_endloop2 *2+1, (uintmax_t)prime_endloop1, (uintmax_t)prime_endloop2); )
    verbose5( if(prime_endloop2 < prime_endloop3) printf("(3) Prime %3ju - %3ju : Use vectors with large steps   for bitsize %3ju up to %3ju\n", (uintmax_t)prime_endloop2 *2+1, (uintmax_t)prime_endloop3 *2+1, (uintmax_t)prime_endloop2, (uintmax_t)prime_endloop3); )
    verbose5( if(prime_endloop3 < prime_endloop4) printf("(4) Prime %3ju - %3ju : Use repeating word masks       for bitsize %3ju up to %3ju\n", (uintmax_t)prime_endloop3 *2+1, (uintmax_t)prime_endloop4 *2+1, (uintmax_t)prime_endloop3, (uintmax_t)prime_endloop4); )
    verbose5( if(prime_endloop4 < prime_endloop5) printf("(5) Prime %3ju - %3ju : Use setting bit one by one     for bitsize %3ju up to %3ju\n", (uintmax_t)prime_endloop4 *2+1, (uintmax_t)prime_endloop5 *2+1, (uintmax_t)prime_endloop4, (uintmax_t)prime_endloop5); )
    timer_laptime(time_sieve_block_stripe); verbose7( printf("\n"); )

    // the < instad of <= is to prevent the last prime to be processed in all the loop
    // the implication is that the prime_endloop must be met step/2, not spep/2-1

    while (prime < prime_endloop1) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_smallstep_vector(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop2) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_smallstep_repeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop3) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_largestep_vector(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop4) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_largestep_repeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep(bitstorage, prime);
    }

    while (prime <= prime_endloop5) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_largestep_norepeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep(bitstorage, prime);
    }

    return prime; 
}

static inline __attribute__((always_inline)) counter_t sieve_block_stripe0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return sieve_block_stripe(bitstorage, 0, block_stop, prime_start, prime_max);
}

static inline  __attribute__((always_inline)) counter_t sieve_stripe(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return  sieve_block_stripe(bitstorage, 0, block_stop, prime_start, prime_max);
}

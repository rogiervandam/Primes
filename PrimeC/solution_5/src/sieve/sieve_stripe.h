
static inline counter_t __attribute__((always_inline)) prime_stripe_start_beyond_block_stop_calc(const counter_t block_stop) {
    return (counter_t) (usqrt(block_stop << 1) - 1) >> 1;
}

static inline counter_t __attribute__((always_inline)) prime_pattern_not_repeating_in_block(const counter_t range_start, const counter_t range_stop, const counter_t blocksize) {
    // We need to solve: 2*prime² + 2*(blocksize+1)*prime + blocksize >= range_stop
    // Binary search approach to find the smallest prime that satisfies the condition
    counter_t low = 1;
    counter_t high;

    // if ((range_stop - range_start) > blocksize) return 0;

    // Find a reasonable upper bound
    // Since prime grows roughly with sqrt(range_stop), we can start with a simple estimate
    if (range_stop > blocksize) { high = range_stop / (2 * blocksize);} 
    else { high = 1; }

    // Double until we find a valid upper bound
    while (1) {
        counter_t step = high * 2 + 1;
        counter_t calculated_range_start = high * 2 * (high + 1);
        if (blocksize * step >= (range_stop - calculated_range_start) || high >= (counter_t)-1/2) break;
        high = high * 2;
    }
    
    // Binary search for the smallest value that satisfies our condition
    while (low < high) {
        counter_t mid = low + (high - low) / 2;
        counter_t step = mid * 2 + 1;
        counter_t calculated_range_start = mid * 2 * (mid + 1);
        
        if (blocksize * step >= (range_stop - calculated_range_start)) { high = mid; } 
        else { low = mid + 1; }
    }
    
    return low;
}

static inline counter_t __attribute__((always_inline)) sieve_block_stripe(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe);

    counter_t prime_stripe_start_beyond_block_stop = prime_stripe_start_beyond_block_stop_calc(block_stop);
    counter_t prime_vectorpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, VECTOR_SIZE_counter);
    counter_t prime_wordpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, WORD_SIZE_counter);

    counter_t prime_endloop5 = min(prime_max, prime_stripe_start_beyond_block_stop);
    counter_t prime_endloop4 = min(prime_endloop5, prime_wordpattern_not_repeating_in_block);
    counter_t prime_endloop3 = min(prime_endloop4, prime_vectorpattern_not_repeating_in_block);
              prime_endloop3 = min(prime_endloop3, VECTOR_SIZE_counter/2);                 // cannot be used beyond VECTOR_SIZE
              prime_endloop3 = min(prime_endloop3, global_largestep_faster/2);                 // allow tuning with largestep

    counter_t prime_endloop2 = min(prime_endloop3, VECTORWORD_SIZE_counter/2);  
    counter_t prime_endloop1 = min(prime_endloop2, global_mediumstep_faster/2);
 
    counter_t prime = prime_start;

    verbose5( printf("Plan start with prime %ju up to %ju using range %ju - %ju:\n", (uintmax_t)prime_start*2+1, (uintmax_t)prime_max*2+1, (uintmax_t)block_start, (uintmax_t)block_stop ); )
    verbose5( printf("(1) Prime %3ju - %3ju : Use vectors with wordroll  for primes up to %ju\n", (uintmax_t)prime_start    *2+1, (uintmax_t)prime_endloop1 *2+1, (uintmax_t)prime_endloop1); )
    verbose5( printf("(2) Prime %3ju - %3ju : Use repeating word masks   for primes up to %ju\n", (uintmax_t)prime_endloop1 *2+1, (uintmax_t)prime_endloop2 *2+1, (uintmax_t)prime_endloop3); )
    verbose5( printf("(3) Prime %3ju - %3ju : Use vectors sparse steps   for primes up to %ju\n", (uintmax_t)prime_endloop2 *2+1, (uintmax_t)prime_endloop3 *2+1, (uintmax_t)prime_endloop4); )
    verbose5( printf("(4) Prime %3ju - %3ju : Use repeating word masks   for primes up to %ju\n", (uintmax_t)prime_endloop3 *2+1, (uintmax_t)prime_endloop4 *2+1, (uintmax_t)prime_endloop5); )
    verbose5( printf("(5) Prime %3ju - %3ju : Use setting bit one by one for primes up to %ju\n", (uintmax_t)prime_endloop4 *2+1, (uintmax_t)prime_endloop5 *2+1, (uintmax_t)prime_endloop5); )

    // the < instad of <= is to prevent the last prime to be processed in all the loop
    // the implication is that the prime_endloop must be met step/2, not spep/2-1

    while (prime < prime_endloop1) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_smallstep_vector(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop2) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_smallstep_repeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop3) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largestep_vector(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop4) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largestep_repeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep(bitstorage, prime);
    }

    while (prime <= prime_endloop5) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if (start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largestep_norepeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep(bitstorage, prime);
    }

    timer_laptime(time_sieve_block_stripe); verbose7( printf("\n"); )
    return prime; 
}

static inline __attribute__((always_inline)) counter_t sieve_block_stripe0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe0 for block %ju - %ju\n",(uintmax_t)0,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe0);

    const counter_t prime = sieve_block_stripe(bitstorage, 0, block_stop, prime_start, prime_max);

    timer_laptime(time_sieve_block_stripe0); verbose7( printf("\n"); )
    return prime; 
}

// assume that prim
static inline  __attribute__((always_inline)) counter_t sieve_stripe(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nStripe for sieve %ju - %ju start with prime %ju up to prime %ju\n",(uintmax_t)0, (uintmax_t)block_stop, (uintmax_t)prime_start, (uintmax_t)prime_max ); )
    timer_lapstart(time_sieve_stripe);

    const counter_t prime = sieve_block_stripe0(bitstorage, block_stop, prime_start, prime_max);

    timer_laptime(time_sieve_stripe); verbose7( printf("\n"); )
    return prime; 
}

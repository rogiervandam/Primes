static inline counter_t __attribute__((always_inline)) sieve_block_stripe(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe);

    counter_t prime = prime_start;
    const counter_t mediumstep_faster = global_mediumstep_faster;
    // const counter_t prime_endloop1 = min(mediumstep_faster, prime_max);
    counter_t prime_endloop1 = prime_max;

    while (prime < prime_endloop1) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);

        // early exit when start is beyond block
        if unlikely(block_stop < start) {
            timer_laptime(time_sieve_block_stripe); verbose7( printf("\n"); )
            return prime;
        }
        if likely(start < block_start) {
            start = (block_start + prime) + prime - ((block_start + prime) % step);
            // there might be higher primes that will align before block_stop
            // early exit (optional; setbittrue does not set beyond block_stop)
            if (block_stop < start) {
                prime = searchBitFalse(bitstorage, prime);
                continue; 
            }
        }

        setBitsTrue_largeRange_vector_old(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_max) {
        counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);

        // early exit when start is beyond block
        if unlikely(block_stop < start) {
            timer_laptime(time_sieve_block_stripe); verbose7( printf("\n"); )
            return prime;
        }
        if likely(start < block_start) {
            start = (block_start + prime) + prime - ((block_start + prime) % step);

            // there might be higher primes that will align before block_stop
            // early exit (optional; setbittrue does not set beyond block_stop)
            if (block_stop < start) {
                prime = searchBitFalse(bitstorage, prime);
                continue; 
            }
        }

        const counter_t range_stop_unique = start + WORD_SIZE_counter * step;
        if likely(range_stop_unique <= block_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
        } else {
            setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
        }

        // setBitsTrue_largeRange(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largeRange(bitstorage, prime);
    }

    timer_laptime(time_sieve_block_stripe); verbose7( printf("\n"); )
    return prime; 
}

// integer Newton's method 
// TODO: Overflow with factor_max 10000000
// TODO: this procedure is really slow when switched to 64 bit
static inline counter_t __attribute__((always_inline)) prime_stripe_start_beyond_block_stop_calc(const counter_t block_stop) {
    // Initial guess close to the solution
    counter_t prime = block_stop / 4;
    const counter_t block_stop_internal = block_stop;
    while (2 * prime * (prime ) <= block_stop_internal) prime++;
    while (2 * prime * (prime ) > block_stop_internal)  prime--;
    return (counter_t) prime;
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

static inline counter_t __attribute__((always_inline)) sieve_block_stripe_new(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe);

    counter_t prime_stripe_start_beyond_block_stop = prime_stripe_start_beyond_block_stop_calc(block_stop-1);
    counter_t prime_vectorpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, VECTOR_SIZE_counter);
    counter_t prime_wordpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, WORD_SIZE_counter);

    counter_t prime_endloop4 = min(prime_max, prime_stripe_start_beyond_block_stop);
    counter_t prime_endloop3 = min(prime_endloop4, prime_wordpattern_not_repeating_in_block);
    counter_t prime_endloop2 = min(prime_endloop3, prime_vectorpattern_not_repeating_in_block);
              prime_endloop2 = min(prime_endloop2, VECTOR_SIZE_counter/2-1);                 // cannot be used beyond VECTOR_SIZE
              prime_endloop2 = min(prime_endloop2, global_largestep_faster/2-1);                 // allow tuning with largestep

    counter_t prime_endloop1b = min(prime_endloop2, VECTORWORD_SIZE_counter/2-1);  
    counter_t prime_endloop1  = min(prime_endloop1b, global_mediumstep_faster/2-1);
 
    counter_t prime = prime_start;

    verbose5( printf("Plan start with prime %ju up to %ju using range %ju - %ju:\n", (uintmax_t)prime_start, (uintmax_t)prime_max, (uintmax_t)block_start, (uintmax_t)block_stop ); )
    verbose5( printf("(1) Prime %3ju - %3ju : Use vectors with wordroll  for primes up to %ju\n", (uintmax_t)prime_start, (uintmax_t)prime_endloop1, (uintmax_t)prime_endloop1); )
    verbose5( printf("(2) Prime %3ju - %3ju : Use repeating word masks   for primes up to %ju\n", (uintmax_t)prime_endloop1, (uintmax_t)prime_endloop1b, (uintmax_t)prime_endloop1b); )
    verbose5( printf("(3) Prime %3ju - %3ju : Use vectors sparse steps   for primes up to %ju\n", (uintmax_t)prime_endloop1b, (uintmax_t)prime_endloop2, (uintmax_t)prime_endloop2); )
    verbose5( printf("(4) Prime %3ju - %3ju : Use repeating word masks   for primes up to %ju\n", (uintmax_t)prime_endloop2, (uintmax_t)prime_endloop3, (uintmax_t)prime_endloop3); )
    verbose5( printf("(5) Prime %3ju - %3ju : Use setting bit one by one for primes up to %ju\n", (uintmax_t)prime_endloop3, (uintmax_t)prime_endloop4, (uintmax_t)prime_endloop4); )

    while (prime < prime_endloop1) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largeRange_vector_wordstep(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }
    verbose5( printf("Prime endloop 1: %ju\n", (uintmax_t)prime); )

    while (prime < prime_endloop1b) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largeRange(bitstorage, prime);
    }
    verbose5( printf("Prime endloop 1b: %ju\n", (uintmax_t)prime); )

    while (prime < prime_endloop2) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largeRange_vector_vectorstep(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }
    verbose5( printf("Prime endloop 2: %ju\n", (uintmax_t)prime); )

    while (prime < prime_endloop3) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if likely(start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largeRange(bitstorage, prime);
    }
    verbose5( printf("Prime endloop 3: %ju\n", (uintmax_t)prime); )

    while (prime < prime_endloop4) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if (start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largeRange(bitstorage, prime);
    }
    verbose5( printf("Prime endloop 4: %ju\n", (uintmax_t)prime); )

    while (prime < prime_max) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);
        if (start < block_start)  { start = (block_start + prime) + prime - ((block_start + prime) % step);}
        setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largeRange(bitstorage, prime);
    }
    verbose5( printf("Prime endloop final: %ju\n", (uintmax_t)prime); )

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

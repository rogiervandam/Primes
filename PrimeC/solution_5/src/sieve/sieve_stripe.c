static inline counter_t __attribute__((always_inline)) sieve_block_stripe(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe);

    counter_t prime = prime_start;
    const counter_t mediumstep_faster = global_mediumstep_faster/2;
    // const counter_t prime_endloop1 = min(mediumstep_faster, prime_max);
    counter_t prime_endloop1 = prime_max;

    while (prime < prime_endloop1) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);

        // early exit when start is beyond block
        if unlikely(block_stop < start) {
            timer_laptime(time_sieve_block_stripe); verbose5( printf("\n"); )
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

        setBitsTrue_largeRange_vector(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_max) {
        counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);

        // early exit when start is beyond block
        if unlikely(block_stop < start) {
            timer_laptime(time_sieve_block_stripe); verbose5( printf("\n"); )
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

    timer_laptime(time_sieve_block_stripe); verbose5( printf("\n"); )
    return prime; 
}

static inline __attribute__((always_inline)) counter_t sieve_block_stripe0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe for block %ju - %ju\n",(uintmax_t)0,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe0);

    const counter_t prime = sieve_block_stripe(bitstorage, 0, block_stop, prime_start, prime_max);

    // counter_t prime = prime_start;
    // const counter_t mediumstep_faster = global_mediumstep_faster;
    // // const counter_t prime_endloop1 = min(mediumstep_faster, prime_max);
    // const counter_t prime_endloop1 = min(mediumstep_faster, prime_max);;
    
    // while (prime < prime_endloop1) {
    //     const counter_t step  = prime * 2 + 1;
    //     const counter_t start = prime * (step + 1);
    //     if unlikely(block_stop < start) return prime;
    //     setBitsTrue_largeRange_vector(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse(bitstorage, prime);
    // }

    // while (prime < prime_max) {
    //     counter_t step  = prime * 2 + 1;
    //     counter_t start = prime * (step + 1);
    //     if unlikely(block_stop < start) return prime;
        
    //     const counter_t range_stop_unique =  start + WORD_SIZE_counter * step;
    //     if likely(range_stop_unique <= block_stop) { // the range will repeat itself; try to resuse the mask
    //         setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
    //     } else {
    //         setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
    //     }
    //     prime = searchBitFalse_largeRange(bitstorage, prime);
    // }

    timer_laptime(time_sieve_block_stripe0); verbose5( printf("\n"); )
    return prime; 
}

// assume that prim
static inline  __attribute__((always_inline)) counter_t sieve_stripe(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nStripe for sieve %ju - %ju start with prime %ju up to prime %ju\n",(uintmax_t)0, (uintmax_t)block_stop, (uintmax_t)prime_start, (uintmax_t)prime_max ); )
    timer_lapstart(time_sieve_stripe);

    const counter_t prime = sieve_block_stripe0(bitstorage, block_stop, prime_start, prime_max);

    // counter_t prime = prime_start;
    // const counter_t largestep_faster = global_largestep_faster; // largestep_faster is twice the prime size
    // // const counter_t prime_endloop1 = min(largestep_faster, prime_max);
    // const counter_t prime_endloop1 = min(largestep_faster, prime_max);
    // // allow the use of vector optimizations in a tunable range
    // while (prime < prime_endloop1) {
    //     const counter_t step  = prime * 2 + 1;
    //     const counter_t start = prime * (step + 1);
    //     setBitsTrue_largeRange_vector(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse(bitstorage, prime);
    // }

    // while (prime < prime_max) {
    //     const counter_t step  = prime * 2 + 1;
    //     const counter_t start = prime * (step + 1);
    //     const counter_t range_stop_unique = start + WORD_SIZE_counter * step;
    //     if likely(range_stop_unique <= block_stop) { // the range will repeat itself; try to resuse the mask
    //         setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
    //     } else {
    //         setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
    //     }
    //     prime = searchBitFalse_largeRange(bitstorage, prime);
    // }

    timer_laptime(time_sieve_stripe); verbose5( printf("\n"); )
    return prime; 
}

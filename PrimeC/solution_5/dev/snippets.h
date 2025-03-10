static inline counter_t __attribute__((always_inline)) sieve_block_stripe_old(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
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

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_counter
static inline void  __attribute__((always_inline)) setBitsTrue_largeRange_vector_old(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose7(  printf("Setting bits step %3ju using largerange vector in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_counter*step))); )
    timer_lapstart(time_setBitsTrue_largeRange_vector);

    if (step <= VECTORWORD_SIZE_counter) {

        if (step < global_mediumstep_faster) {
            const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_counter * step; 
            if (range_stop_unique_vector <= range_stop) { // the vectormask will be reused
                // setBitsTrue_largeRange_vector_wordstep(bitstorage, range_start, step, range_stop);
                const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_counter; // find next vector
                const counter_t range_start_new = setBitsTrue_smallStep_norepeat(bitstorage, range_start, step, range_start_nexttvector);
                const counter_t range_stop_unique_vector = range_start_new + VECTOR_SIZE_counter * step; 
    
                verbose7(  printf("..building masks with size %ju < %ju in range %ju-%ju with %ju bit vectors", (uintmax_t)step, (uintmax_t) WORD_SIZE_counter, (uintmax_t)range_start_new, (uintmax_t)range_stop_unique_vector, (uintmax_t)VECTOR_SIZE_counter); )
                create_mask_vector_smallstep(bitstorage, range_start_new, step, range_stop);
                return;
            }
        }

        const counter_t range_stop_unique_word = range_start + WORD_SIZE_counter * step; // * 3 added to force some reuse of the mask
        if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_largeRange_repeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
            return;
        } 
        else {
            setBitsTrue_largeRange_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
            return;
        }
    }
    else if (step <= VECTOR_SIZE_counter) {
        // setBitsTrue_largeRange_vector_vectorstep(bitstorage, range_start, step, range_stop);

        if (step < global_largestep_faster) {

            const counter_t range_stop_unique_vector = range_start + VECTOR_SIZE_counter * step;
            if (range_stop_unique_vector <= range_stop) {
                const counter_t range_start_nexttvector = vectorstart(range_start) + VECTOR_SIZE_counter; // find next vector
                register counter_t range_start_new = setBitsTrue_smallStep_norepeat(bitstorage, range_start, step, range_start_nexttvector);
                const counter_t range_stop_unique_vector = range_start_new + VECTOR_SIZE_counter * step; 

                verbose7(  printf("..building masks in range %ju-%ju with %ju bit vectors", (uintmax_t)range_start_new, (uintmax_t)range_stop_unique_vector, (uintmax_t)VECTOR_SIZE_counter); )
                create_mask_vector_largestep(bitstorage, range_start_new, step, range_stop);
                timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
                return;
            }
        }

        verbose7( printf("\n..Vector will not repeat. Changing methods..\n"); )
        const counter_t range_stop_unique_word = range_start + WORD_SIZE_counter * step; // * 3 added to force some reuse of the mask
        if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_largeRange_repeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
            return;
        } 
        else {
            setBitsTrue_largeRange_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
            return;
        }
    }
    else {
        verbose7( printf("\n..Vector will not repeat. Changing methods..\n"); )
        const counter_t range_stop_unique_word = range_start + WORD_SIZE_counter * step; // * 3 added to force some reuse of the mask
        if (range_stop_unique_word <= range_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_largeRange_repeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
            return;
        } 
        else {
            setBitsTrue_largeRange_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
            return;
        }
    }

    // if all fails...
    // setBitsTrue_largeRange_norepeat(bitstorage, range_start, step, range_stop);
    timer_laptime(time_setBitsTrue_largeRange_vector); verbose7( printf("\n"); )
}
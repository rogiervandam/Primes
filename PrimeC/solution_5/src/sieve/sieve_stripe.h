
static inline counter_t __attribute__((always_inline)) stripeSieveBlock(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieveStripeBlock);

    const counter_t prime_stripe_start_beyond_block_stop = prime_stop(block_stop) ;
    const counter_t prime_vectorpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, VECTOR_SIZE_BITS);
    // const counter_t prime_wordpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, WORD_SIZE_BITS*3);
    const counter_t prime_wordpattern_not_repeating_in_block = prime_max;

    const counter_t prime_endloop5 = min(prime_max, prime_stripe_start_beyond_block_stop);
    const counter_t prime_endloop4 = min(prime_endloop5, prime_wordpattern_not_repeating_in_block);
    const counter_t prime_endloop3 = min(min(min(prime_endloop4, prime_vectorpattern_not_repeating_in_block), VECTOR_SIZE_BITS/2),  global_largestep_faster/2);
    const counter_t prime_endloop2 = min(prime_endloop3, VECTORWORD_SIZE_BITS/2);  
    const counter_t prime_endloop1 = min(prime_endloop2, global_mediumstep_faster/2);
 
    counter_t prime = prime_start;

    verbose5( printf("Plan: start with factor %ju up to %ju using range %ju - %ju:\n", (uintmax_t)prime_start*2+1, (uintmax_t)prime_max*2+1, (uintmax_t)block_start, (uintmax_t)block_stop ); )
    verbose5( if(prime_start    < prime_endloop1) printf("(1) Factor %4ju - %4ju : Use vectors with rolling words (bitsize %4ju up to %4ju)\n", (uintmax_t)prime_start    *2+1, (uintmax_t)prime_endloop1 *2+1, (uintmax_t)prime_start,    (uintmax_t)prime_endloop1); )
    verbose5( if(prime_endloop1 < prime_endloop2) printf("(2) Factor %4ju - %4ju : Use repeating wordsize masks   (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop1,prime_start) *2+1, (uintmax_t)prime_endloop2 *2+1, (uintmax_t)prime_endloop1, (uintmax_t)prime_endloop2); )
    verbose5( if(prime_endloop2 < prime_endloop3) printf("(3) Factor %4ju - %4ju : Use vectors with large steps   (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop2,prime_start) *2+1, (uintmax_t)prime_endloop3 *2+1, (uintmax_t)prime_endloop2, (uintmax_t)prime_endloop3); )
    verbose5( if(prime_endloop3 < prime_endloop4) printf("(4) Factor %4ju - %4ju : Use repeating word masks       (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop3,prime_start) *2+1, (uintmax_t)prime_endloop4 *2+1, (uintmax_t)prime_endloop3, (uintmax_t)prime_endloop4); )
    verbose5( if(prime_endloop4 < prime_endloop5) printf("(5) Factor %4ju - %4ju : Use setting bit one by one     (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop4,prime_start) *2+1, (uintmax_t)prime_endloop5 *2+1, (uintmax_t)prime_endloop4, (uintmax_t)prime_endloop5); )
    timer_laptime(time_sieveStripeBlock); verbose7( printf("\n"); )

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
        // setBitsTrue_largestep_repeat(bitstorage, start, step, block_stop);
        setBitsTrue_largestep(bitstorage, start, step, block_stop);
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

static inline __attribute__((always_inline)) counter_t stripeSieveBlock0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}

static inline  __attribute__((always_inline)) counter_t stripeSieve(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return  stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}

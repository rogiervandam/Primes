
static inline counter_t __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
stripeSieveBlock_planned(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieveStripeBlock);

    const counter_t prime_endloop6 = min(prime_max, prime_pattern_not_repeating_in_block(block_start, block_stop, 32));
    const counter_t prime_endloop5 = min(prime_endloop6, prime_pattern_not_repeating_in_block(block_start, block_stop, 512));
    const counter_t prime_endloop4 = min(prime_endloop5, 128/2);
    const counter_t prime_endloop3 = min(prime_endloop4, 64/2);
    const counter_t prime_endloop2 = min(prime_endloop3, 32/2);
    const counter_t prime_endloop1 = min(prime_endloop2, 16/2);
 
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
        setBitsTrue_smallstep_rotate_pair_uint16v16(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop2) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_smallstep_rotate_pair_uint32v16(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop3) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_smallstep_rotate_pair_uint64v4(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_endloop4) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_largestep_vector_uint64v4(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime <= prime_endloop5) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_largestep_repeat_uint8_unroll8(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep(bitstorage, prime);
    }

    while (prime <= prime_endloop6) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_largestep_repeat_uint8(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep(bitstorage, prime);
    }

    while (prime <= prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue_largestep_norepeat_uint8(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep(bitstorage, prime);
    }

    return prime; 
}

static inline counter_t __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
stripeSieveBlock(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieveStripeBlock);

    const counter_t prime_endloop_shortstepsearch = min(prime_max, 128/2);
    counter_t prime = prime_start;

    while (prime < prime_endloop_shortstepsearch) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue(bitstorage, start, step, block_stop);
        prime = searchBitFalse_uint8(bitstorage, prime);
    }

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep_uint8(bitstorage, prime);
    }

    timer_laptime(time_sieveStripeBlock); verbose7( printf("\n"); )
    return prime; 
}

static inline counter_t __attribute__((always_inline, nonnull)) 
stripeSieveBlock0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}

static inline void __attribute__((always_inline, nonnull)) 
stripeSieveBlockByBlock(bitword_t* restrict bitstorage, const counter_t sieve_bits, const counter_t blocksize_bits, const counter_t prime_start, const counter_t prime_max)
{
    if (prime_start >= prime_max) return;

    if (blocksize_bits >= sieve_bits) {
        stripeSieveBlock0(bitstorage, sieve_bits, prime_start, prime_max);
        return;
    }

    // size the first block, optimizing for large following blocks and aligning to cache line
    counter_t block0_stop = ((sieve_bits % blocksize_bits) + cache_line_bytes*8) & ~(cache_line_bytes*8-1); 
    stripeSieveBlock0(bitstorage, min(block0_stop, sieve_bits), prime_start, prime_max);

    // process the rest of the sieve in blocks of blocksize_bits
    for (counter_t block_start = block0_stop, block_stop = block_start + blocksize_bits; block_start < sieve_bits; block_start += blocksize_bits, block_stop += blocksize_bits) {
        // stripe a block, stopping at the end of the sieve and only for primes that have multiples are in the block
        stripeSieveBlock(bitstorage, block_start, min(block_stop, sieve_bits), prime_start, min(prime_stop(block_stop),prime_max));
    } 
}

static inline counter_t __attribute__((always_inline, nonnull)) 
stripeSieve(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}


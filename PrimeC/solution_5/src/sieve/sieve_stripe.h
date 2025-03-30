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


static inline counter_t __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
stripeSieveBlock(void* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    startAnalysis5(time_sieveStripeBlock, "\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop)

    const counter_t prime_endloop_shortstepsearch = min(prime_max, 128/2);
    counter_t prime = prime_start;

    while (prime < prime_endloop_shortstepsearch) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = calcFactor_start_half(prime, block_start);
        setBitsTrue(bitstorage, start, step, block_stop);
        prime = searchBitFalse_uint8(bitstorage, prime);
    }

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = calcFactor_start_half(prime, block_start);
        setBitsTrue(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largestep_uint8(bitstorage, prime);
    }

    endAnalysis5(time_sieveStripeBlock, "\n");
    return prime; 
}

static inline counter_t __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
markSieveBlock(sieve_t* sieve, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    return stripeSieveBlock(sieve->bitstorage, block_start/2, block_stop/2, prime_start/2, prime_max/2) * 2 + 1;
}

static inline counter_t __attribute__((always_inline, nonnull)) 
stripeSieveBlock0(void* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}

static inline counter_t __attribute__((always_inline, nonnull)) 
markSieveBlock0(sieve_t* sieve, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    return markSieveBlock(sieve, 0, block_stop, prime_start, prime_max);
}

static inline void __attribute__((always_inline, nonnull)) 
stripeSieveBlockByBlock(void* restrict bitstorage, const counter_t sieve_bits, const counter_t blocksize_bits, const counter_t prime_start, const counter_t prime_max)
{
    if (prime_start >= prime_max) return;

    if (blocksize_bits >= sieve_bits) {
        stripeSieveBlock0(bitstorage, sieve_bits, prime_start, prime_max);
        return;
    }

    // size the first block, optimizing for large following blocks and aligning to cache line
    counter_t block0_stop = ((sieve_bits % blocksize_bits) + cache_line_bytes*8) & ~(cache_line_bytes*8-1); 

    // first block requires fewer operations; it might be the whole sieve...
    stripeSieveBlock0(bitstorage, min(block0_stop, sieve_bits), prime_start, prime_max);

    // process the rest of the sieve in blocks of blocksize_bits
    for (counter_t block_start = block0_stop, block_stop = block_start + blocksize_bits; block_start < sieve_bits; block_start += blocksize_bits, block_stop += blocksize_bits) {
        // stripe a block, stopping at the end of the sieve and only for primes that have multiples are in the block
        stripeSieveBlock(bitstorage, block_start, min(block_stop, sieve_bits), prime_start, min(calcFactor_max_half(block_stop),prime_max));
    } 
}

static inline void __attribute__((always_inline, nonnull))
markSieveBlockByBlock(sieve_t* sieve, const counter_t sieve_size, const counter_t blocksize_factor, const counter_t prime_start, const counter_t prime_max) {
    if (prime_start >= prime_max) return;

    if (blocksize_factor >= sieve_size) {
        markSieveBlock0(sieve, sieve_size, prime_start, prime_max);
        return;
    }

    // size the first block, optimizing for large following blocks and aligning to cache line
    counter_t block0_stop = ((sieve_size % blocksize_factor) + cache_line_bytes*8) & ~(cache_line_bytes*8-1); 

    // first block requires fewer operations; it might be the whole sieve...
    markSieveBlock0(sieve, min(block0_stop, sieve_size), prime_start, prime_max);

    // process the rest of the sieve in blocks of blocksize_factor
    for (counter_t block_start = block0_stop, block_stop = block_start + blocksize_factor; block_start < sieve_size; block_start += blocksize_factor, block_stop += blocksize_factor) {
        // stripe a block, stopping at the end of the sieve and only for primes that have multiples are in the block
        markSieveBlock(sieve, block_start, min(block_stop, sieve_size), prime_start, min(calcFactor_max(block_stop),prime_max));
    } 
}

static inline counter_t __attribute__((always_inline, nonnull)) 
stripeSieve(void* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}

static inline counter_t __attribute__((always_inline, nonnull)) 
markSieve(sieve_t* sieve, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    return markSieveBlock(sieve, 0, block_stop, prime_start, prime_max);
}
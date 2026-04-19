static inline counter_t __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
markSieveBlock(sieve_t* sieve, const counter_t block_start, const counter_t block_stop, counter_t prime, const counter_t prime_max) {
    startAnalysisTrace5(time_sieveStripeBlock, "markFactors", block_start, block_stop, "\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop);

    const counter_t prime_endloop_shortstepsearch = min(prime_max, 128);

    for (; prime < prime_endloop_shortstepsearch; prime = findUnmarked(sieve, prime)) {
        TRACE_STEP_META(sieve->bitstorage, "markFactors", (int64_t)(prime*2+1),
                   (int64_t)block_start, (int64_t)block_stop, (int64_t)calcFactor_step(prime),
                   "stripe: prime %jd (idx %jd), block [%jd-%jd] step %jd",
                   (intmax_t)(prime*2+1), (intmax_t)prime, (intmax_t)block_start,
                   (intmax_t)block_stop, (intmax_t)calcFactor_step(prime));
        markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
    }

    for (; prime < prime_max; prime = findUnmarked(sieve, prime)) {
        TRACE_STEP_META(sieve->bitstorage, "markFactors", (int64_t)(prime*2+1),
                   (int64_t)block_start, (int64_t)block_stop, (int64_t)calcFactor_step(prime),
                   "stripe: prime %jd (idx %jd), block [%jd-%jd] step %jd",
                   (intmax_t)(prime*2+1), (intmax_t)prime, (intmax_t)block_start,
                   (intmax_t)block_stop, (intmax_t)calcFactor_step(prime));
        markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
    }

    endAnalysisTrace5(time_sieveStripeBlock, "\n");
    return prime; 
}

static inline counter_t __attribute__((always_inline, nonnull)) 
markSieve(sieve_t* sieve, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    return markSieveBlock(sieve, 0, block_stop, prime_start, prime_max);
}

static inline void __attribute__((always_inline, nonnull))
markSieveBlockByBlock(sieve_t* sieve, const counter_t sieve_size, const counter_t blocksize_factor, const counter_t prime_start, const counter_t prime_max) {
    if (prime_start >= prime_max) return;

    if (blocksize_factor >= sieve_size) {
        markSieve(sieve, sieve_size, prime_start, prime_max);
        return;
    }

    // size the first block, optimizing for large following blocks and aligning to cache line
    counter_t block0_stop = ((sieve_size % blocksize_factor) + cache_line_bytes*8) & ~(cache_line_bytes*8-1); 

    // first block requires fewer operations; it might be the whole sieve...
    markSieveBlock(sieve, 0, min(block0_stop, sieve_size), prime_start, prime_max);

    // process the rest of the sieve in blocks of blocksize_factor
    for (counter_t block_start = block0_stop, block_stop = block_start + blocksize_factor; block_start < sieve_size; block_start += blocksize_factor, block_stop += blocksize_factor) {
        
        // stripe a block, stopping at the end of the sieve and only for primes that have multiples are in the block
        markSieveBlock(sieve, block_start, min(block_stop, sieve_size), prime_start, min(calcFactor_max(block_stop),prime_max));
    } 
}


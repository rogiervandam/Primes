
static inline counter_t __attribute__((always_inline, nonnull)) 
stripeSieveBlock(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieveStripeBlock);

    const counter_t prime_endloop = min(prime_max, prime_stop(block_stop));
    counter_t prime = prime_start;
    
    for (; prime < prime_endloop; ) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue(bitstorage, start, step, block_stop);
        prime = searchBitFalse_uint8(bitstorage, prime);
    }

    return prime; 
}

static inline counter_t __attribute__((always_inline, nonnull)) 
stripeSieveBlock0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}

static inline counter_t  __attribute__((always_inline, nonnull)) 
stripeSieve(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}


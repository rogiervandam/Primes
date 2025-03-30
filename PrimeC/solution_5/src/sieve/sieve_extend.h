// returns prime that could not be handled:
// start is too large
// range is too big
// block stop should not exceed sieve size for faster handling
static inline counter_t __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
sieve_block_extend0(struct sieve_t *sieve, const counter_t block_stop) 
{
    verbose5(  printf("Extending sieve block to range %ju\n",(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_extend);

    void* restrict bitstorage = sieve->bitstorage;
    const counter_t sieve_bits = sieve->bits;
    ((uint64_t*)bitstorage)[0] = (uint64_t)0ULL; // only the first word has to be cleared; the rest is populated by the extension procedure

    // const counter_t stripeprime_faster = global_stripeprime_faster;
    // const counter_t mediumstep_faster = global_mediumstep_faster;
    // const counter_t largestep_faster = global_largestep_faster;

    counter_t prime_start            = 1;
    counter_t prime                  = 1;
    counter_t step                   = prime * 2 + 1;
    counter_t start                  = prime * (step + 1);
    counter_t range_stop             = step * 2;  // range is x2 so the second block cointains all multiples of primes
    // counter_t pattern_start          = 0;
    counter_t patternsize_bits       = 3;

    setBitsTrue_range(bitstorage, start, step, range_stop);

    for (;range_stop < block_stop;) {
        prime = searchBitFalse(bitstorage, prime);

        step = prime * 2 + 1;
        start = prime * (step + 1);
        if unlikely(start > block_stop) break;

        range_stop = patternsize_bits * step * 2;  // range is x2 so the second block cointains all multiples of primes
        if unlikely(range_stop > block_stop) break;

        // continue the found pattern to the entire sieve
        continuePattern(bitstorage, patternsize_bits, patternsize_bits, range_stop);
        patternsize_bits *= step;

        setBitsTrue(bitstorage, start, step, range_stop);
    } 
    verbose5( printf("Plan: fill pattern and continue pattern for factor %ju up to %ju in range %ju - %ju:\n", (uintmax_t)prime_start*2+1, (uintmax_t)prime*2+1, (uintmax_t)0, (uintmax_t)block_stop ); )

    // continue the found pattern to the entire sieve
    continuePattern(bitstorage, patternsize_bits, patternsize_bits, sieve_bits);

    verbose5( printf("Plan: copy bitpattern from %ju - %ju to range %ju - %ju:\n", (uintmax_t)patternsize_bits, (uintmax_t)2*patternsize_bits-1, (uintmax_t)2*patternsize_bits, (uintmax_t)sieve_bits ); )

    return prime;
}


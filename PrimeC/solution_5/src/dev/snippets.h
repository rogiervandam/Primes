

static inline counter_t __attribute__((always_inline)) sieve_block_stripe_old(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe);

    counter_t prime = prime_start;

    while (prime < prime_max) {
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

        setBitsTrue_largestep_vector(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    timer_laptime(time_sieve_block_stripe); verbose7( printf("\n"); )
    return prime; 
}


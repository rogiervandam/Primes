#if defined include_once_first //---- include this once before all variants

    // returns the bit index for a given number index, or -1 if the number is divisible by any of the wheel primes
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_calc(counter_t number_index) {
        const counter_t wheel_index = number_index % WHEEL_SIZE;
        if (wheelmask_bitpoint[wheel_index] < 0) return -1;
        return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index];
    }

    // returns the bit index for a given number index or -(bit estimate) if the number is divisible by any of the wheel primes
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_calc_estimate(counter_t number_index) {
        const counter_t wheel_index = number_index % WHEEL_SIZE;
        if (wheelmask_bitpoint[wheel_index] < 0) return (-1 * (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index]); 
        return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index];
    }

    // returns the bit index for a given number index, and if that number is divisible by any of the wheel primes, returns the next nearest bit
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_estimate_next(counter_t number_index) {
        counter_t wheel_index = number_index % WHEEL_SIZE;
        return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) + abs(wheelmask_bitpoint[wheel_index]);
    }

    // returns the bit index for a given number index, and if it is divisible by any of the wheel primes, return the previous nearest bit
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_estimate_last(counter_t number_index) {
        counter_t wheel_index = number_index % WHEEL_SIZE;
        if (wheelmask_bitpoint[wheel_index] < 0) return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) - wheelmask_bitpoint[wheel_index] - 1;
        return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index];
    }

    // returns the factor (real number) at a given bit index in the bitstorage
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
    getFactor(counter_t bitindex) {
        const counter_t factor = (bitindex / wheelmask_stripe_bits) * WHEEL_SIZE + wheel_number[bitindex % wheelmask_stripe_bits];
        return factor;
    }

#endif

#if (defined(BUILD_WORDS_STAGE) || defined(BUILD_VECTORS_STAGE)) && defined variant_suffix && (!defined unrolls || unrolls == 1)

    // wheel_bucket is guaranteed to give back a bucket, regardless of the index is a multiple of a prime
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    function(wheel_bucket_calc,variant_suffix)(counter_t index) {

        // compile time short path to avoid the index % WHEEL_SIZE
        if (bitcount_type(bitbucket_t) % wheelmask_stripe_bits == 0) {
            return index_type((index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t);
        }

        return index_type(((wheelmask_stripe_bits * (index / WHEEL_SIZE)) + abs(wheelmask_bitpoint[index % WHEEL_SIZE] )), bitbucket_t);
    }
#endif

#if defined include_once_first //---- include this once before all variants

    // returns the bit index for a given number index, or -1 if the number is divisible by any of the wheel primes
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheelstorage_bit_calc(counter_t index_number) {
        const counter_t wheel_index = index_number % WHEEL_SIZE;
        if (wheel_bit[wheel_index] < 0) return -1;
        return (wheel_bitalloc * (index_number / WHEEL_SIZE)) + wheel_bit[wheel_index];
    }

    // returns the bit index for a given number index or -(bit estimate) if the number is divisible by any of the wheel primes
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheelstorage_bit_calc_estimate(counter_t index_number) {
        const counter_t wheel_index = index_number % WHEEL_SIZE;
        if (wheel_bit[wheel_index] < 0) return (-1 * (wheel_bitalloc * (index_number / WHEEL_SIZE)) + wheel_bit[wheel_index]); 
        return (wheel_bitalloc * (index_number / WHEEL_SIZE)) + wheel_bit[wheel_index];
    }

    // returns the bit index for a given number index, and if that number is divisible by any of the wheel primes, returns the next nearest bit
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheelstorage_bit_estimate_next(counter_t index_number) {
        counter_t wheel_index = index_number % WHEEL_SIZE;
        return (wheel_bitalloc * (index_number / WHEEL_SIZE)) + abs(wheel_bit[wheel_index]);
    }

    // returns the bit index for a given number index, and if it is divisible by any of the wheel primes, return the previous nearest bit
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheelstorage_bit_estimate_last(counter_t index_number) {
        counter_t wheel_index = index_number % WHEEL_SIZE;
        if (wheel_bit[wheel_index] < 0) return (wheel_bitalloc * (index_number / WHEEL_SIZE)) - wheel_bit[wheel_index] - 1;
        return (wheel_bitalloc * (index_number / WHEEL_SIZE)) + wheel_bit[wheel_index];
    }

    // returns the factor (real number) at a given bit index in the bitstorage
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
    getFactor(counter_t bitindex) {
        const counter_t factor = (bitindex / wheel_bitalloc) * WHEEL_SIZE + wheel_number[bitindex % wheel_bitalloc];
        return factor;
    }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
    calcFactorsize(counter_t bitsize, storage_type storage_id) 
    {
        return (bitsize * storage_table[storage_id].factorsize) / storage_table[storage_id].bitsize + ((bitsize * storage_table[storage_id].factorsize) % storage_table[storage_id].bitsize != 0);
    }
#endif

#if (defined(BUILD_WORDS_STAGE) || defined(BUILD_VECTORS_STAGE)) && defined variant_suffix && (!defined unrolls || unrolls == 1)

    // wheel_bucket is guaranteed to give back a bucket, regardless of the index is a multiple of a prime
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    function(wheel_bucket_calc,variant_suffix)(counter_t index) {

        // compile time short path to avoid the index % WHEEL_SIZE
        if (bitcount_type(bitbucket_t) % wheel_bitalloc == 0) {
            return index_type((index / WHEEL_SIZE) * wheel_bitalloc, bitbucket_t);
        }

        return index_type(((wheel_bitalloc * (index / WHEEL_SIZE)) + abs(wheel_bit[index % WHEEL_SIZE] )), bitbucket_t);
    }
#endif

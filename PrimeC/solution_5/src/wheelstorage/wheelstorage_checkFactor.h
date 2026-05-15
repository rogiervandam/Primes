#if defined BUILD_WORDS_STAGE

    // checks if the factor is marked in the wheelstorage, returns 1 if it is marked (not prime), 0 if it is not marked (prime)
    // unsafe because the results are wrong for the very first numbers (1,2,3,5 .. WHEEL_MAX)
    static inline bitbucket_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
    function(checkFactor_wheelstorage_unsafe,suffix)(sieve_t* sieve, register counter_t index)
    {
        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit < 0) return 1; // if the number is divisible by any of the wheel primes, it is not prime
        return (bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] & markmask_type(wheel_bit, bitbucket_t)) != 0;

    }

    // checks if the factor is marked in the wheelstorage, returns 1 if it is marked (not prime), 0 if it is not marked (prime)
    // safe because it returns the correct results for the very first numbers (1,2,3,5 .. WHEEL_MAX) by checking the wheelprimes array
    static inline bitbucket_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
    function(checkFactor_wheelstorage,suffix)(sieve_t* sieve, register counter_t factor) {
        if (factor <= WHEEL_MAX) {
            return wheelprimes[factor];
        }
        return function(checkFactor_wheelstorage_unsafe,suffix)(sieve, factor);
    }    

#endif


#if defined(include_once_last) //---- include this once after all variants

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    findUnmarked_wheelstorage(sieve_t *sieve, counter_t factor) 
    {
        #pragma GCC ivdep
        #pragma GCC unroll 4
        for (;checkFactor_wheelstorage_uint8(sieve, ++factor););
        return factor;
    }

#endif
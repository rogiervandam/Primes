static inline bitbucket_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(checkFactor_wheelstorage_unsafe,suffix)(sieve_t* sieve, register counter_t index)
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    const counter_t wheel_bit = wheel_bit_calc(index);
    if (wheel_bit < 0) return 1; // if the number is divisible by any of the wheel primes, it is not prime
    return (bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] & markmask_type(wheel_bit, bitbucket_t)) != 0;

}

static inline bitbucket_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
function(checkFactor_wheelstorage,suffix)(sieve_t* sieve, register counter_t factor) {
    if (factor <= WHEEL_MAX) {
        return wheelprimes[factor];
    }
    return function(checkFactor_wheelstorage_unsafe,suffix)(sieve, factor);
}    

#pragma once

// calculate the first multiple of a prime number in a given range
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcFactor_start(counter_t prime, counter_t block_start) 
{
    register const counter_t step = 2 * prime;
    register counter_t start = prime * prime;
    if (block_start && start < block_start) {
        start = (block_start + prime) + prime - ((block_start + prime) % step);
    }
    return start;
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcFactor_step(counter_t prime) 
{
    return prime * 2;
}

// calculate the maximum prime number that can be used for a given range in bits
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcFactor_max(counter_t range_stop) 
{
    return (usqrt(range_stop));
}

static const storage_t storage_table[STORAGE_WHEEL + 1] = {
    [STORAGE_FULL] = { STORAGE_FULL, 1, 1, 2 }
    ,[STORAGE_HALF] = { STORAGE_HALF, 1, 2, 2 }
#if defined WHEEL_SIZE && defined WHEEL_STRIPE_BITS
    ,[STORAGE_WHEEL] = { STORAGE_WHEEL, WHEEL_STRIPE_BITS, WHEEL_SIZE, WHEEL_MAX } // this is used for testing the wheel storage with a small wheel, it is not a real storage type
#endif
};
// these are necessary for a generic calculation in the benchmark settings
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcBitsize_storage(counter_t factorsize, storage_type storage_id) 
{
    return (factorsize * storage_table[storage_id].bitsize) / storage_table[storage_id].factorsize + ((factorsize * storage_table[storage_id].bitsize) % storage_table[storage_id].factorsize != 0);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcFactorsize_storage(counter_t bitsize, storage_type storage_id) 
{
    return (bitsize * storage_table[storage_id].factorsize) / storage_table[storage_id].bitsize + ((bitsize * storage_table[storage_id].factorsize) % storage_table[storage_id].bitsize != 0);
}

static inline const char*
getStorageModelName(storage_type storage_id)
{
    switch (storage_id) {
        case STORAGE_FULL:             return "full";
        case STORAGE_HALF:             return "half";
        case STORAGE_WHEEL:            return "wheel";
        default:                       return "unknown";
    }
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcSize(counter_t factorsize, storage_type storage_id) 
{
    return (factorsize * storage_table[storage_id].bitsize) / storage_table[storage_id].factorsize + ((factorsize * storage_table[storage_id].bitsize) % storage_table[storage_id].factorsize != 0);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcMax(counter_t sieve_size, storage_type storage_id) 
{
    return calcFactor_max(sieve_size);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcStep(counter_t prime, storage_type storage_id) 
{
    #if defined(STORAGE_HALF_DEFINED)
    if (storage_id == STORAGE_HALF) {
        return calcFactor_step_half(prime);
    }
    #endif

    return calcFactor_step(prime);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcStart(counter_t prime, counter_t block_start, storage_type storage_id) 
{
    #if defined(STORAGE_HALF_DEFINED)
    if (storage_id == STORAGE_HALF) {
        return calcFactor_start_half(prime, block_start);
    }
    #endif

    return calcFactor_start(prime, block_start);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcStop(counter_t sieve_size, storage_type storage_id) 
{
    #if defined(STORAGE_HALF_DEFINED)
    if (storage_id == STORAGE_HALF) {
        return calcBitsize_half(sieve_size);
    }
    #endif

    return sieve_size;
}
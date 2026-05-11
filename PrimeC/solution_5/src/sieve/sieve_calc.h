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

static const storage_t storage_table[STORAGE_WHEELTESTING + 1] = {
    [STORAGE_FULL] = { STORAGE_FULL, 1, 1 }
    ,[STORAGE_HALF] = { STORAGE_HALF, 1, 2 }
#if defined WHEEL_SIZE && defined WHEEL_STRIPE_BITS
    ,[STORAGE_WHEEL2OF6] = { STORAGE_WHEEL2OF6, 2, 6 }
    ,[STORAGE_WHEEL8OF30] = { STORAGE_WHEEL8OF30, 8, 30 }
    ,[STORAGE_WHEEL48OF210] = { STORAGE_WHEEL48OF210, 48, 210 }
    ,[STORAGE_WHEEL480OF2310] = { STORAGE_WHEEL480OF2310, 480, 2310 }
    ,[STORAGE_WHEEL5760OF30030] = { STORAGE_WHEEL5760OF30030, 5760, 30030 }
    ,[STORAGE_WHEELTESTING] = { STORAGE_WHEELTESTING, WHEEL_STRIPE_BITS, WHEEL_SIZE } // this is used for testing the wheel storage with a small wheel, it is not a real storage type
#endif
};
// these are necessary for a generic calculation in the benchmark settings
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcBitsize(counter_t factorsize, int storage_id) 
{
    return (factorsize * storage_table[storage_id].bitsize) / storage_table[storage_id].factorsize + ((factorsize * storage_table[storage_id].bitsize) % storage_table[storage_id].factorsize != 0);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcFactorsize(counter_t bitsize, int storage_id) 
{
    return (bitsize * storage_table[storage_id].factorsize) / storage_table[storage_id].bitsize + ((bitsize * storage_table[storage_id].factorsize) % storage_table[storage_id].bitsize != 0);
}

static inline const char*
getStorageModelName(int storage_id)
{
    switch (storage_id) {
        case STORAGE_FULL:             return "full";
        case STORAGE_HALF:             return "half";
        case STORAGE_WHEEL2OF6:        return "wheel2of6";
        case STORAGE_WHEEL8OF30:       return "wheel8of30";
        case STORAGE_WHEEL48OF210:     return "wheel48of210";
        case STORAGE_WHEEL480OF2310:   return "wheel480of2310";
        case STORAGE_WHEEL5760OF30030: return "wheel5760of30030";
        case STORAGE_WHEELTESTING:     return "wheeltesting";
        default:                       return "unknown";
    }
}

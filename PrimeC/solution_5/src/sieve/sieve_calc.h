// fast integer square root
// https://en.wikipedia.org/wiki/Fast_inverse_square_root
static inline counter_t __attribute__((always_inline, const)) 
usqrt(counter_t x) 
{
    union { float f; int i; } conv;
    float x2 = 0.5F * x;
    conv.f = (float) x;
    conv.i = 0x5f3759df - (conv.i >> 1); 
    float y = conv.f;
    y = y * (1.5F - (x2 * y * y));
    y = y * (1.5F - (x2 * y * y));
    return (counter_t) (x * y + 1.5f); // 1.5f for rounding and increment by 1 to alyways round up
}

// calculate the maximum prime number that can be used for a given range in bits - 
// static inline counter_t __attribute__((always_inline, const)) 
// prime_stop(const counter_t range_stop) {
//     return ((1 + usqrt( (range_stop << 1) + 1 )) >> 1);
// }

// // // calculate the first multiple of a prime number in a given range
// static inline counter_t __attribute__((always_inline, const))
// compute_start(const counter_t prime, const counter_t block_start) {
//     register const counter_t step = prime * 2 + 1;
//     register counter_t start = prime * (step + 1);
//     if (block_start && start < block_start) {
//         start = (block_start + prime) + prime - ((block_start + prime) % step);
//     }
//     return start;
// }

static inline counter_t __attribute__((always_inline, const)) 
calcFactor_max_half(const counter_t range_stop) {
    return ((1 + usqrt( (range_stop << 1) + 1 )) >> 1);
}

// // calculate the first multiple of a prime number in a given range
static inline counter_t __attribute__((always_inline, const))
calcFactor_start_half(const counter_t prime, const counter_t block_start) {
    register const counter_t step = prime * 2 + 1;
    register counter_t start = prime * (step + 1);
    if (block_start && start < block_start) {
        start = (block_start + prime) + prime - ((block_start + prime) % step);
    }
    return start;
}

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

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcFactor_step_half(counter_t prime) 
{
    return prime * 2 + 1;
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcFactor_half(counter_t prime) 
{
    return ((prime << 1) & 1);
}

// calculate the maximum prime number that can be used for a given range in bits
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcFactor_max(counter_t range_stop) 
{
    return (usqrt(range_stop));
}

enum {
    STORAGE_FULL             = 0,
    STORAGE_HALF             = 1,
    STORAGE_WHEEL2OF6        = 2,
    STORAGE_WHEEL8OF30       = 3,
    STORAGE_WHEEL48OF210     = 4,
    STORAGE_WHEEL480OF2310   = 5,
    STORAGE_WHEEL5760OF30030 = 6,
    STORAGE_WHEELTESTING     = 99
};

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

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcBitsize(counter_t factorsize, int storage_id) 
{
    return (factorsize * storage_table[storage_id].bitsize) / storage_table[storage_id].factorsize;
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
calcFactorsize(counter_t bitsize, int storage_id) 
{
    return (bitsize * storage_table[storage_id].factorsize) / storage_table[storage_id].bitsize;
}

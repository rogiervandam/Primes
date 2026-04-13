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
    if (block_start) 
        return prime + (block_start + prime) - ((block_start + prime) % (prime * 2 + 1));
    else 
        return prime * (prime * 2 + 1);
}

// calculate the first multiple of a prime number in a given range
static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
calcFactor_start(counter_t prime, counter_t block_start) 
{
    if (block_start) 
        return prime + (block_start + prime) - ((block_start + prime) % (2 * prime));
    else 
        return prime * prime;
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
    return (usqrt(range_stop)-1);
}

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

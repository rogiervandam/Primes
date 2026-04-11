#include "../bitstorage/bitstorage_search.h"
#include "../bitstorage/bitstorage_setBitsTrue.h"
#include "../sieve/sieve_calc.h"

// static unsigned int wheel[WHEEL_SIZE/2];
static unsigned int wheelprimes[WHEEL_MAX+1]; // can't be more than highest prime in the wheel
static uint8_t wheelmask[WHEEL_SIZE];
static uint64_t wheelmask_compressed[WHEEL_SIZE];
static uint8_t wheelmask_index[WHEEL_SIZE];
static uint8_t wheelmask_offset[WHEEL_SIZE];

// static const counter_t wheelmask_stripes = 8; // the number of possible primes per wheel, e.g. 8 when storing 8of30
static counter_t wheelmask_stripes; // the number of possible primes per wheel, e.g. 8 when storing 8of30
static counter_t wheelmask_stripe_bytes; // the number of bytes for storing <WHEEL_SIZE> bits

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
wheel_bit_calc(counter_t index) {
    // counter_t wheel_index = index % WHEEL_SIZE;
    // return index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, uint8_t) + wheelmask_index[index % WHEEL_SIZE];
    return wheelmask_stripe_bytes * index / WHEEL_SIZE * 8 + wheelmask_index[index % WHEEL_SIZE] * 8 + shift_calc(wheelmask_compressed[index % WHEEL_SIZE]);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
wheel_block_calc(counter_t index) {
    // counter_t wheel_index = index % WHEEL_SIZE;
    // return index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, uint8_t) + wheelmask_index[index % WHEEL_SIZE];
    return wheelmask_stripe_bytes * index / WHEEL_SIZE + wheelmask_index[index % WHEEL_SIZE];
}

// Set one bit to true
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
setBitsTrue_wheel(void* restrict bitstorage, const register counter_t index) 
{
    register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    counter_t wheel_index = index % WHEEL_SIZE;
    counter_t wheel_block = wheel_block_calc(index);
    bitstorage_sized[wheel_block] |= wheelmask_compressed[wheel_index]; // first check if the number is divisible by any of the wheel primes, if it is, mark it as non-prime
}

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
setBitsTrue_wheel_repeat(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);

    const counter_t byte_stop = wheel_block_calc(range_stop + 1);
    const counter_t wheel_step = step * wheelmask_stripe_bytes;

    // Every WHEEL_BASIC_SIZE * wheel_step, the pattern of which bits to mark as true in the wheel repeats at byte level 
    // Because when the wheel is completely done, we are wheelmask_stripe_bytes further in the bitstorage
    const counter_t range_stop_unique = range_start + WHEEL_BASIC_SIZE * wheel_step; 

    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_index = index % WHEEL_SIZE;
        const uint8_t markmask = wheelmask_compressed[wheel_index];
        if (markmask) {
            applyMask_index_uint8_unroll8(bitstorage, wheel_block_calc(index), wheel_step, byte_stop, markmask);
        }
    } 
}

#include "../bitstorage/bitstorage_setBitsTrue_wheel.h"

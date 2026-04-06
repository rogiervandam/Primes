// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>

static char algorithm_name[60] = "rogiervandam_wheelstorage";
static char algorithm_type[] = "wheel";

#define ALGORITHM_WHEEL 1
#define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

#ifndef WHEEL_SIZE
    #define WHEEL_MAX 5 // highest number in the wheel
    #define WHEEL_BASIC_SIZE (2*3*5)
    #define WHEEL_REPEATS 1
    #define WHEEL_SIZE (WHEEL_BASIC_SIZE * WHEEL_REPEATS) 
#endif

// include helper functions
#include "generic/settings.h"
#undef SHIFT_SIZE
#define SHIFT_SIZE 0 // correct because we are not storing even numbers, so the number of bits is the same as the size of the sieve

#include "benchmark/sieve_options.h"
#include "bitstorage/bitstorage_search.h"
#include "bitstorage/bitstorage_setBitsTrue.h"
#include "bitstorage/bitstorage_setBitsTrue_base.h"
#include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"

// static unsigned int wheel[WHEEL_SIZE/2];
static unsigned int wheelprimes[WHEEL_MAX+1]; // can't be more than highest prime in the wheel
static uint8_t wheelmask[WHEEL_SIZE];
static uint8_t wheelmask_compressed[WHEEL_SIZE];
static uint8_t wheelmask_index[WHEEL_SIZE];
// static const counter_t wheelmask_stripes = 8; // the number of possible primes per wheel, e.g. 8 when storing 8of30
static counter_t wheelmask_stripes; // the number of possible primes per wheel, e.g. 8 when storing 8of30
static counter_t wheelmask_stripe_bytes; // the number of bytes for storing <WHEEL_SIZE> bits

static inline counter_t __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
wheel_block_calc(counter_t index) {
    counter_t wheel_index = index % WHEEL_SIZE;
    return index_type(wheelmask_stripe_bytes * 8 * (index / WHEEL_SIZE), uint8_t) + wheelmask_index[wheel_index];
}

// Set one bit to true
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
setBitTrue_wheel(void* restrict bitstorage, const register counter_t index) 
{
    register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);
    counter_t wheel_index = index % WHEEL_SIZE;
    counter_t wheel_block = wheel_block_calc(index);
    bitstorage_sized[wheel_block] |= wheelmask_compressed[wheel_index]; // first check if the number is divisible by any of the wheel primes, if it is, mark it as non-prime
}

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
setBitTrue_wheel_repeat(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage,cache_line_bytes);

    const counter_t byte_stop = wheel_block_calc(range_stop + 1);
    const counter_t wheel_step = step * wheelmask_stripe_bytes;
    const counter_t range_stop_unique = range_start + WHEEL_BASIC_SIZE * wheel_step; 

    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_index = index % WHEEL_SIZE;
        const uint8_t markmask = wheelmask_compressed[wheel_index];
        if (markmask) {
            applyMask_index_uint8_unroll8(bitstorage, wheel_block_calc(index), wheel_step, byte_stop, markmask);
        }
    } 
}

// this is the same as checkBitTrue_wheel but without the check for the wheel primes
// this can only be used if index > WHEEL_MAX
static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_wheel_unsafe(const void* restrict bitstorage, register counter_t index)
{
    register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    counter_t wheel_index = index % WHEEL_SIZE;
    counter_t wheel_block = wheel_block_calc(index);

    return !wheelmask_compressed[wheel_index] || 
           (bitstorage_sized[wheel_block] & wheelmask_compressed[wheel_index]);
}

static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_wheel(const void* restrict bitstorage, register counter_t index) 
{
    if (index <= WHEEL_MAX) return wheelprimes[index];
    return checkBitTrue_wheel_unsafe(bitstorage, index);
}

static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
searchBitFalse_wheel(void* restrict bitstorage, register counter_t index) 
{
    #pragma GCC ivdep
    #pragma GCC unroll 4
    for (;checkBitTrue_wheel(bitstorage, ++index););
    return index;
}

// static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
// searchBitFalse_wheel_maxcheck(void* restrict bitstorage, register counter_t index, register counter_t maxindex) 
// {
//     #pragma GCC ivdep
//     #pragma GCC unroll 4
//     for (;index < maxindex && checkBitTrue_wheel(bitstorage, ++index););
//     return index;
// }

uint8_t checkBitTrue_generic(void* restrict bitstorage, register counter_t index) {
    // if (index % 2 == 0) return 1; // even numbers are not prime
    return checkBitTrue_wheel(bitstorage, index);
}

void build_wheel() {
    // find all the primes in the wheel up to WHEEL_MAX and store them
    for (counter_t i = 0; i < WHEEL_MAX; i++) {
        wheelprimes[i]=0;
        for (counter_t f = 2; f < i; f++) {
            if ((i % f) == 0) {
                wheelprimes[i] = 1; // mark the index of a non-prime
                break;
            }
        }
    }

    // clear the wheelmask
    for (counter_t i=0; i <= WHEEL_SIZE/8; i++) {
            wheelmask[i] = 0; 
    }

    // make a mask pattern to check if the modulus WHEEL_SIZE/2 of a number is divisible by any of the primes in the wheel
    // this is used in checkBitTrue_wheel to quickly check if a number is divisible by any of the wheel primes
    counter_t stripe_count = 0;
    for (counter_t i = 0; i < WHEEL_SIZE; i++) {
        wheelmask_compressed[i]=0;
        wheelmask_index[i]=0;
        for (counter_t f = 2; f <= WHEEL_MAX; f++) {
            if (((i+WHEEL_SIZE) % f) == 0) { // this is a non-prime
                wheelmask[index_type(i, uint8_t)] |= markmask_type(i, uint8_t); // mark it in the mask
                break;
            }
        }
        if (!(wheelmask[index_type(i, uint8_t)] & markmask_type(i, uint8_t))) {
            wheelmask_compressed[i] |= markmask_type(stripe_count, uint8_t);
            wheelmask_index[i] = index_type(stripe_count, uint8_t);
            stripe_count++;
        }
    }
    wheelmask_stripes = stripe_count;
    wheelmask_stripe_bytes = (wheelmask_stripes - 1) / 8 + 1;

    counter_t wheelmask_count = 0;
    for (counter_t i=0; i <= WHEEL_SIZE/8; i++) {
        wheelmask_count += __builtin_popcount(wheelmask[i]);
    }

    // append the wheel size to the algorithm name
    size_t prefix_len = 0; while (algorithm_name[prefix_len] != '\0') prefix_len++;
    sprintf(algorithm_name + prefix_len, "_%uof%u", WHEEL_SIZE-wheelmask_count, WHEEL_SIZE);

}

#define PREPARE_FUNCTION 1 // signals sieve_main to call prepareSieveFunction() before the benchmark starts, this is used to build the wheel
void prepareSieveFunction() {
    build_wheel();
}

/* This is the main module that directs all the work
   sieve_size in a real number that is the maximum in the sieve (not in bits)
   block_size is in bits and determines how large the blocks are which are processed 
*/
static struct sieve_t* shakeSieve(const counter_t sieve_size)
{
    struct sieve_t *sieve = sieve_create(sieve_size, sieve_size * wheelmask_stripe_bytes * 8 / WHEEL_SIZE ); // TODO: can sieve_size be smaller?
    void* bitstorage = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    // const counter_t sieve_bits = sieve->bits;
    const counter_t prime_max = prime_stop_full(sieve_size);

    // use globals as constant
    const counter_t stripeprime_faster = global_stripeprime_faster;
    counter_t blocksize_bits           = global_blocksize_bits;
    
    verbose5(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)blocksize_bits,(uintmax_t)WHEEL_MAX); )

    // code for algorithm = base
    sieve_clear(sieve);

    // #pragma GCC unroll 2
    // blocksize_bits = sieve_size; // TODO: get blocksize working again
    for (counter_t block_start = 0; block_start < sieve_size; block_start += blocksize_bits) {

        const counter_t range_stop = min(sieve_size, block_start + blocksize_bits);
        verbose6( printf("Processing block starting at %ju stop at %ju\n",(uintmax_t)block_start, (uintmax_t)range_stop); )

        counter_t prime = 2;

        #pragma GCC unroll 32
        while (prime < prime_max) {
            register counter_t start = compute_start_full(prime, block_start);
            register const counter_t step = prime * 2;

            setBitTrue_wheel_repeat(bitstorage, start, step, range_stop);
            prime = searchBitFalse_wheel(bitstorage, ++prime);
        }
    } 
    
    return sieve;
}

// #include "benchmark/sieve_check_wheel.h"
#include "benchmark/sieve_check_generic.h"
#include "benchmark/sieve_main.h"
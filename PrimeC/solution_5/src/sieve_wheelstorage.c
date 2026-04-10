// Sieve algorithm by Rogier van Dam - 2025
// Find all primes up to <max int> using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

// This file includes all the building blocks for the sieve algorithm "base"
// This enables the compiler to optimize the code better

#include "generic/timepriority.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdint.h>
#include <inttypes.h> // needed for PRIx macros

static char algorithm_name[60] = "rogiervandam_wheelstorage";
static char algorithm_type[] = "wheel";

#define ALGORITHM_WHEEL 1
// #define ALTERNATIVE_CHECK 1 // signals sieve_check to use the alternative check function

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
#include "generic/tools.h" // used for debugging
#include "bitstorage/bitstorage_search.h"
#include "bitstorage/bitstorage_setBitsTrue.h"
#include "bitstorage/bitstorage_setBitsTrue_base.h"
#include "sieve/sieve_calc.h"
#include "sieve/sieve_manager.h"

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

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
wheel_block_calc_uint64(counter_t index) {
    counter_t wheel_index = index % WHEEL_SIZE;
    return index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, uint64_t);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
wheel_block_calc_uint64v4(counter_t index) {
    counter_t wheel_index = index % WHEEL_SIZE;
    return index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, uint64v4_t);
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

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
setBitsTrue_wheel_small_repeat_uint64(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    register uint64_t* restrict bitstorage_sized_64 = __builtin_assume_aligned(bitstorage,cache_line_bytes);

    if (step >= 64) {
        setBitsTrue_wheel_repeat(bitstorage, range_start, step, range_stop);
        return;
    }
    const counter_t block_stop = wheel_block_calc_uint64(range_stop + 1);
    const counter_t wheel_step = step * wheelmask_stripe_bytes;
    const counter_t range_stop_unique = min(range_start + WHEEL_BASIC_SIZE * wheel_step * 8 + WHEEL_BASIC_SIZE * 8 * wheelmask_stripe_bytes, range_stop); 

    uint64_t reuse_markmask = 0ULL;
    uint64_t reuse_markmask_new = 0ULL;
    counter_t reuse_block_start = 0;

    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_block = wheel_block_calc_uint64(index);

        if (reuse_block_start < wheel_block) { // when going to the next block
            if (reuse_markmask) { // apply previous mask if it exists
                if (reuse_block_start) {  // don't repeat the first block, it may be misaligned
                    applyMask_index_uint64_unroll8(bitstorage, reuse_block_start, wheel_step, block_stop, reuse_markmask);
                }
                else bitstorage_sized_64[0] |= reuse_markmask; // if the previous block was the first block, we can apply the mask directly without going through the function
            }
            reuse_block_start = wheel_block;
            reuse_markmask = 0ULL;
            // reuse_markmask_new = 0ULL;
        }

        const counter_t wheel_index = index % WHEEL_SIZE;
        const uint64_t markmask = wheelmask_compressed[wheel_index];
        // if (wheelmask_offset[wheel_index]) {
        //     reuse_markmask |= (1ULL << (((wheelmask_stripe_bytes * index / WHEEL_SIZE) & 7)*8+(wheelmask_offset[wheel_index]-1)));
        // }
        reuse_markmask |= markmask << ((wheel_block_calc(index) & 7) *8); // combine the markmask for the current block if it is the same as the previous one
        // reuse_markmask |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc(index) & 7) << 3); // combine the markmask for the current block if it is the same as the previous one
    } 

    // we can ignore the last mask because it should already be set
    // can be wrong if wheel is large and range is small.
    bitstorage_sized_64[reuse_block_start] |= reuse_markmask;
}

#define preset_uint64v4
#include "generic/setsuffix.h"
static inline void __attribute__((always_inline, aligned(cache_line_bytes))) 
function(create_mask_vector_largestep_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    bitbucket_t* restrict bitstorage_vector = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t range_stop_unique_vector = range_start + step * bitcount_type(bitbucket_t) + bitcount_type(bitbucket_t);  // extra size is sometime needed when size < blocklimit

    #pragma GCC ivdep
    for (counter_t index = range_start, current_vector = index_type(range_start, bitbucket_t); index <= range_stop_unique_vector; current_vector++) {
        const counter_t current_vector_start = vectorstart_type(index, bitbucket_t);
        bitbucket_t mask_vector = BITBUCKET_BASE((variant_base_type_t) 0ULL);

        #pragma GCC ivdep
        for (counter_t element = 0; element < BITBUCKET_ELEMENTS; element++) {
            if (vectorstart_type(index,variant_base_type_t) == (current_vector_start + (bitcount_type(variant_base_type_t) * element))) {
                mask_vector[element] = markmask_calc_type(index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
                index += step;
            }
        }
        // function(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
        // function(applyMask,suffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);
        function(applyMask_new,suffix)(bitstorage_vector, current_vector*bitcount_type(bitbucket_t), step, range_stop, mask_vector);
    }
}

#include "generic/setsuffix.h"
static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
function(setBitsTrue_largestep_vector_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    startAnalysis6(time_setBitsTrue_largestep_vector, "Setting bits step %3ju using largestep_vector%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step)));

    const counter_t start_vector = index_type(range_start, bitbucket_t);
    counter_t current_vector = start_vector;

    // TODO: refactor
    register counter_t index = range_start; 

    // walk to next vector, setting bits on the way 
    #pragma GCC ivdep
    #pragma GCC unroll 32
    for(; index <= range_stop; index += step) { 
        current_vector = index_type(index, bitbucket_t);
        if (current_vector != start_vector) break; // if we are in a new vector, we need to recalculate the mask vector, because the pattern of which bits to mark as true in the wheel repeats every WHEEL_BASIC_SIZE * step
        setBitsTrue_wheel(bitstorage, index);
    }
    function(create_mask_vector_largestep_wheel,suffix)(bitstorage, index, step, range_stop);
    
    endAnalysis6(time_setBitsTrue_largestep_vector,"\n");
}

// WORKING ON THIS
//only suiteable if wheel_stripe_primes fits in the vector type
static void __attribute__((nonnull, aligned(cache_line_bytes))) 
function(setBitsTrue_smallstep_rotate_pair_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    counter_t start_vector = wheel_block_calc_uint64v4(range_start);
    counter_t current_vector = start_vector;

    // TODO: refactor
    register counter_t index = range_start; 

    // walk to next vector, setting bits on the way 
    #pragma GCC ivdep
    #pragma GCC unroll 32
    for(; index <= range_stop; index += step) { 
        current_vector = wheel_block_calc_uint64v4(index);
        if (current_vector != start_vector) break; // if we are in a new vector, we need to recalculate the mask vector, because the pattern of which bits to mark as true in the wheel repeats every WHEEL_BASIC_SIZE * step
        setBitsTrue_wheel(bitstorage, index);
    }
    counter_t vector_start_index = index;
    bitbucket_t mask_vector = BITBUCKET_BASE(0LL);
    start_vector = current_vector;

    // guarantee that all variations can land
    const counter_t range_stop_unique = min(vector_start_index + WHEEL_BASIC_SIZE * step * 32, range_stop);
    counter_t range_stop_vector = wheel_block_calc_uint64v4(range_stop);
    
    for(counter_t i = index; i <= range_stop_unique; i += step) {
        current_vector = wheel_block_calc_uint64v4(i);

        if (current_vector != start_vector) {
            function(applyMask_index,suffix)(bitstorage, start_vector, step, range_stop_vector, mask_vector);
            mask_vector = BITBUCKET_BASE(0LL);
            start_vector = current_vector;
        }
        if (wheelmask_compressed[i % WHEEL_SIZE]) {
            counter_t vector_element = (wheel_bit_calc(i) / bitcount_type(variant_base_type_t)) % elementcount_type(bitbucket_t, variant_base_type_t);
            mask_vector[vector_element] |= wheelmask_compressed[i % WHEEL_SIZE] << ((wheel_block_calc(i) & 7) *8);
        }
    }
    // function(applyMask_index,suffix)(bitstorage, start_vector, step, range_stop_vector, mask_vector);
    // bitstorage_sized[start_vector] |= mask_vector; // apply the last mask

    endAnalysis6(time_setBitsTrue_smallstep_rotate_pair,"\n");
}

#include "generic/cleansuffix.h"


static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
setBitsTrue_wheel_small_repeat_pair_uint64(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    register uint64_t* restrict bitstorage_sized_64 = __builtin_assume_aligned(bitstorage,cache_line_bytes);

    // if (step >= 32) {
    //     setBitsTrue_wheel_repeat(bitstorage, range_start, step, range_stop);
    //     return;
    // }
    const counter_t block_stop = wheel_block_calc_uint64(range_stop + 1);
    const counter_t wheel_step = step * wheelmask_stripe_bytes;
    const counter_t range_stop_unique = min(range_start + WHEEL_BASIC_SIZE * wheel_step * 8 + 2 * WHEEL_BASIC_SIZE * 8 * wheelmask_stripe_bytes, range_stop); 

    uint64_t reuse_markmask = 0ULL;
    uint64_t reuse_markmask1 = 0ULL;
    counter_t reuse_block_start = 0;

    register counter_t index = range_start;

    for (; index <= range_stop_unique; index += step) { 
        const counter_t wheel_block = wheel_block_calc_uint64(index);
        if ((wheel_block & 1) == 0)  break;
        setBitsTrue_wheel(bitstorage, index); 
    }

    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_block = wheel_block_calc_uint64(index);

        if ((reuse_block_start + 1) < wheel_block) { // when going to the next block
            if (reuse_markmask || reuse_markmask1) { // apply previous mask if it exists
                if (reuse_block_start) {  // don't repeat the first block, it may be misaligned
                    // applyMask_index_uint64_unroll8(bitstorage, reuse_block_start, wheel_step, block_stop, reuse_markmask);
                    // applyMask_index_uint64_unroll8(bitstorage, reuse_block_start+1, wheel_step, block_stop, reuse_markmask1);
                    applyMask_index_pair_uint64_unroll8(bitstorage, reuse_block_start, wheel_step, block_stop, reuse_markmask, reuse_markmask1);
                }
                else {
                    bitstorage_sized_64[0] |= reuse_markmask; // if the previous block was the first block, we can apply the mask directly without going through the function
                    bitstorage_sized_64[1] |= reuse_markmask1;
                }
            }
            reuse_block_start = wheel_block;
            reuse_markmask = 0ULL;
            reuse_markmask1 = 0ULL;
        }

        const counter_t wheel_index = index % WHEEL_SIZE;
        const uint64_t markmask = wheelmask_compressed[wheel_index];
        uint8_t wheel_mask_block = wheel_block_calc(index);
        if (wheel_mask_block & 8) { // if the mask is for the next block, put it in the second markmask
            reuse_markmask1 |= markmask << ((wheel_mask_block & 7) << 3); // combine the markmask for the current block if it is the same as the previous one
        }
        else
        reuse_markmask |= markmask << ((wheel_mask_block & 7) << 3); // combine the markmask for the current block if it is the same as the previous one
    } 

    // we can ignore the last mask because it should already be set
    // can be wrong if wheel is large and range is small.
    bitstorage_sized_64[reuse_block_start] |= reuse_markmask;
    bitstorage_sized_64[reuse_block_start + 1] |= reuse_markmask1;
}

static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
setBitsTrue_wheel_norepeat(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    register counter_t index = range_start;
    register counter_t i=((range_start-range_start)/step);
    for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
        for(;i>j;i-=j) {
            for(int k=j; k--; index += step) {
                setBitsTrue_wheel(bitstorage, index);
            }
        }
    }

    for (; index < range_stop; index += step) 
        setBitsTrue_wheel(bitstorage, index);

    if unlikely(index==range_stop) setBitsTrue_wheel(bitstorage, index);
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

// custom function for storage, used in sieve_check.
#define CHECK_FACTOR
uint8_t checkFactor(void* restrict bitstorage, register counter_t factor) {
    return checkBitTrue_wheel(bitstorage, factor);
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
        wheelmask_offset[i]=0;
        for (counter_t f = 2; f <= WHEEL_MAX; f++) {
            if (((i+WHEEL_SIZE) % f) == 0) { // this is a non-prime
                wheelmask[index_type(i, uint8_t)] |= markmask_type(i, uint8_t); // mark it in the mask
                break;
            }
        }
        if (!(wheelmask[index_type(i, uint8_t)] & markmask_type(i, uint8_t))) {
            wheelmask_compressed[i] |= markmask_type(stripe_count, uint8_t);
            wheelmask_index[i] = index_type(stripe_count, uint8_t);
            wheelmask_offset[i] = stripe_count + 1;
            stripe_count++;
        }
    }
    wheelmask_stripes = stripe_count;
    wheelmask_stripe_bytes = (wheelmask_stripes - 1) / 8 + 1;
    printf("Wheel size: %u, Wheel stripes: %ju, Wheel stripe bytes: %ju\n", WHEEL_SIZE, (uintmax_t)wheelmask_stripes, (uintmax_t)wheelmask_stripe_bytes);

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
    // option.fixed_benchmark_settings.stripe_faster           = 1;
    // option.fixed_benchmark_settings.largestep_faster        = 1;
    option.fixed_benchmark_settings.blocksize_bits          = 1000000;
    option.fixed_benchmark_settings.vectorsize              = 256;
    option.fixed_benchmark_settings.algorithm               = 1;
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
    const counter_t largestep_faster   = global_largestep_faster * WHEEL_SIZE / (wheelmask_stripe_bytes * 8)*8 ; 
    const counter_t smallstep_faster   = global_stripeprime_faster * WHEEL_SIZE / (wheelmask_stripe_bytes * 8);
    counter_t blocksize_bits           = global_blocksize_bits;
    
    verbose5(  printf("\nShaking sieve to find all primes up to %ju with blocksize %ju using the wheel with primes up to %ju\n",(uintmax_t)sieve_size,(uintmax_t)blocksize_bits,(uintmax_t)WHEEL_MAX); )

    // code for algorithm = base
    sieve_clear(sieve);

    // #pragma GCC unroll 2
    // blocksize_bits = sieve_size; // TODO: get blocksize working again
    for (counter_t block_start = 0; block_start < sieve_size; block_start += blocksize_bits) {

        const counter_t range_stop = min(sieve_size, block_start + blocksize_bits);
        verbose6( printf("Processing block starting at %ju stop at %ju\n",(uintmax_t)block_start, (uintmax_t)range_stop); )

        counter_t prime = searchBitFalse_wheel(bitstorage, WHEEL_MAX+1);

        #pragma GCC unroll 32
        while (prime < prime_max) {

            register counter_t start = compute_start_full(prime, block_start);
            register const counter_t step = prime * 2;
            // const counter_t bitstep = step * wheelmask_stripe_bytes * 8 / WHEEL_SIZE;

            if (prime <= 11 ) {
                setBitsTrue_smallstep_rotate_pair_wheel_uint64v4_unroll8(bitstorage, start, prime, range_stop);
            }
            else 
            if (prime < smallstep_faster) {
                // setBitsTrue_wheel_small_repeat_pair_uint64(bitstorage, start, step, range_stop);
                setBitsTrue_wheel_small_repeat_uint64(bitstorage, start, step, range_stop);
            }
            else 
            if (prime < largestep_faster) {
                setBitsTrue_wheel_repeat(bitstorage, start, step, range_stop);
            }
            else {
            setBitsTrue_wheel_norepeat(bitstorage, start, step, range_stop);
            }

            prime = searchBitFalse_wheel(bitstorage, ++prime);
        }
    }
    
    return sieve;
}

#include "benchmark/sieve_main.h"

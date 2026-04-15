

// #ifndef included_once //---- include this once
#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    // static unsigned int wheel[WHEEL_SIZE/2];
    #include "../bitstorage/bitstorage_search.h"
    #include "../bitstorage/bitstorage_setBitsTrue.h"

    #define wheelmask_t uint8_t

    #define WHEEL_STORAGE_2OF6        2
    #define WHEEL_STORAGE_8OF30       3
    #define WHEEL_STORAGE_48OF210     4
    #define WHEEL_STORAGE_480OF2310   5
    #define WHEEL_STORAGE_5760OF30030 6

// enum {
//     STORAGE_FULL             = 0,
//     STORAGE_HALF             = 1,
//     STORAGE_WHEEL2OF6        = 2,
//     STORAGE_WHEEL8OF30       = 3,
//     STORAGE_WHEEL48OF210     = 4,
//     STORAGE_WHEEL480OF2310   = 5,
//     STORAGE_WHEEL5760OF30030 = 6,
//     STORAGE_WHEELTESTING     = 99
// };

    #define WHEEL_MAX 5
    #define WHEEL_BASIC_SIZE (2 * 3 * 5)
    #define WHEEL_STRIPES 8
    #define WHEEL_REPEATS 1

    #define WHEEL_SIZE (WHEEL_BASIC_SIZE * WHEEL_REPEATS)
    #define WHEEL_STRIPE_BYTES 1 //(((WHEEL_STRIPES) - 1) / 8 + 1)
    #define WHEEL_STRIPE_BITS  ((WHEEL_STRIPE_BYTES) * 8)

// #if defined(WHEEL_STORAGE) && !defined(WHEEL_SIZE)
//     #if WHEEL_STORAGE == WHEEL_STORAGE_2OF6
//         #define WHEEL_MAX 3
//         #define WHEEL_BASIC_SIZE (2 * 3)
//         #define WHEEL_STRIPES 2
//     #elif WHEEL_STORAGE == WHEEL_STORAGE_8OF30
//         #define WHEEL_MAX 5
//         #define WHEEL_BASIC_SIZE (2 * 3 * 5)
//         #define WHEEL_STRIPES 8
//     #elif WHEEL_STORAGE == WHEEL_STORAGE_48OF210
//         #define WHEEL_MAX 7
//         #define WHEEL_BASIC_SIZE (2 * 3 * 5 * 7)
//         #define WHEEL_STRIPES 48
//     #elif WHEEL_STORAGE == WHEEL_STORAGE_480OF2310
//         #define WHEEL_MAX 11
//         #define WHEEL_BASIC_SIZE (2 * 3 * 5 * 7 * 11)
//         #define WHEEL_STRIPES 480
//     #elif WHEEL_STORAGE == WHEEL_STORAGE_5760OF30030
//         #define WHEEL_MAX 13
//         #define WHEEL_BASIC_SIZE (2 * 3 * 5 * 7 * 11 * 13)
//         #define WHEEL_STRIPES 5760
//     #else
//         #error Unsupported WHEEL_STORAGE configuration
//     #endif

//     #ifndef WHEEL_REPEATS
//         #define WHEEL_REPEATS 1
//     #endif

//     #define WHEEL_SIZE (WHEEL_BASIC_SIZE * WHEEL_REPEATS)
//     #define WHEEL_STRIPE_BYTES (((WHEEL_STRIPES) - 1) / 8 + 1)
//     #define WHEEL_STRIPE_BITS  ((WHEEL_STRIPE_BYTES) * 8)

//     #if WHEEL_STRIPE_BYTES > 1
//         #error WHEEL_STORAGE selects a multi-byte wheel stripe. The current wheelstorage implementation supports only single-byte stripe wheels (2of6 and 8of30).
//     #endif
// #endif

// static const storage_t storage_table[STORAGE_WHEELTESTING + 1] = {
//     [STORAGE_FULL] = { STORAGE_FULL, 1, 1 },
//     [STORAGE_HALF] = { STORAGE_HALF, 1, 2 },
//     [STORAGE_WHEEL2OF6] = { STORAGE_WHEEL2OF6, 2, 6 },
//     [STORAGE_WHEEL8OF30] = { STORAGE_WHEEL8OF30, 8, 30 },
//     [STORAGE_WHEEL48OF210] = { STORAGE_WHEEL48OF210, 48, 210 },
//     [STORAGE_WHEEL480OF2310] = { STORAGE_WHEEL480OF2310, 480, 2310 },
//     [STORAGE_WHEEL5760OF30030] = { STORAGE_WHEEL5760OF30030, 5760, 30030 },
//     [STORAGE_WHEELTESTING] = { STORAGE_WHEELTESTING, WHEEL_STRIPE_BITS, WHEEL_SIZE } // this is used for testing the wheel storage with a small wheel, it is not a real storage type
// };

    #define wheelmask_stripes      WHEEL_STRIPES
    #define wheelmask_stripe_bytes WHEEL_STRIPE_BYTES
    #define wheelmask_stripe_bits  WHEEL_STRIPE_BITS

    #include "../sieve/sieve_calc.h"

    static unsigned int wheelprimes[WHEEL_MAX+1]; // can't be more than highest prime in the wheel
    static uint8_t wheelmask[WHEEL_SIZE];
    static wheelmask_t wheelmask_compressed[WHEEL_SIZE];
    static uint8_t wheelmask_index[WHEEL_SIZE];
    // static counter_t wheelmask_offset[WHEEL_SIZE];

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
            // wheelmask_offset[i]=0;
            for (counter_t f = 2; f <= WHEEL_MAX; f++) {
                if (((i+WHEEL_SIZE) % f) == 0) { // this is a non-prime
                    wheelmask[index_type(i, uint8_t)] |= markmask_type(i, uint8_t); // mark it in the mask
                    break;
                }
            }
            if (!(wheelmask[index_type(i, uint8_t)] & markmask_type(i, uint8_t))) {
                wheelmask_compressed[i] |= markmask_type(stripe_count, wheelmask_t);
                wheelmask_index[i] = index_type(stripe_count, wheelmask_t);
                // wheelmask_offset[i] = stripe_count + 1;
                stripe_count++;
            }
        }
        verbose3 (printf("Wheel size: %u, Wheel stripes: %ju, Wheel stripe bytes: %ju\n", WHEEL_SIZE, (uintmax_t)wheelmask_stripes, (uintmax_t)wheelmask_stripe_bytes) );
    }

#endif

#include "../generic/variants/setsuffix.h" 
// sets bitbucket_t (e.g. uint64_t), variantsuffix (e.g. _uint64) and suffix (e.g. _uint64_unroll8) 
// for the current variant, based on the presets defined in varianttypes.h

#if defined variantsuffix && !defined unrolls

    // #if defined variant && !VARIANT_IS_UINT8(variant)
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    function(wheel_block_calc,variantsuffix)(counter_t index) {

        if (wheelmask_stripe_bits <= bitcount_type(wheelmask_t)) {
            return index_type(wheelmask_stripe_bits * (index / WHEEL_SIZE), bitbucket_t);
        }

        return (index_type(wheelmask_stripe_bits * (index / WHEEL_SIZE), wheelmask_t)) + wheelmask_index[index % WHEEL_SIZE];
    }
#endif

#if defined include_for_words //---- include only the variant function

    #if defined unrolls && unrolls > 1
        #include "sieve_storage_wheel_smallrepeat.h"
    #endif

    #if defined unrolls && unrolls > 1
        #include "sieve_storage_wheel_smallrepeat_pair.h"
    #endif // end of unrolled function
#endif

#if defined include_for_vectors   

    #if defined unrolls && unrolls > 1
        #include "sieve_storage_wheel_smallrepeat_pair_vector.h"
    #endif // end of unrolled function

#endif


#if defined include_once_last //---- include this once after all variants

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_calc(counter_t index) {
        return wheelmask_stripe_bits * (index / WHEEL_SIZE) + wheelmask_index[index % WHEEL_SIZE] * bitcount_type(wheelmask_t) + shift_calc(wheelmask_compressed[index % WHEEL_SIZE]);
    }

    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    markFactor_wheelstorage(sieve_t* sieve, const register counter_t index) 
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);
        bitstorage_sized[ wheel_block_calc_uint8(index)] |= wheelmask_compressed[index % WHEEL_SIZE]; // first check if the number is divisible by any of the wheel primes, if it is, mark it as non-prime
    }

    #define bitbucket_t uint8_t
    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    markFactors_wheelstorage_repeat(sieve_t* sieve, const counter_t range_start, counter_t range_stop, const counter_t step)
    {
        // register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

        const counter_t byte_stop = wheel_block_calc_uint8(range_stop + 1);
        const counter_t wheel_step = (step >> shift_calc(step)) * (bitcount_type(bitbucket_t) / min(bitcount_type(bitbucket_t), wheelmask_stripe_bits)); // step in terms of the number of bitbuckets

        // Every WHEEL_BASIC_SIZE * wheel_step, the pattern of which bits to mark as true in the wheel repeats at byte level 
        // Because when the wheel is completely done, we are wheelmask_stripe_bytes further in the bitstorage
        const counter_t range_stop_unique = range_start + WHEEL_SIZE * (wheel_step + 1); 

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
            const uint8_t markmask = wheelmask_compressed[ index % WHEEL_SIZE ];
            if (markmask) {
                applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_block_calc_uint8(index), byte_stop, wheel_step, markmask);
            }
        } 
    }

    static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
    markFactors_wheelstorage_norepeat(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        register counter_t index = range_start;
        register counter_t i=((range_start-range_start)/step);
        for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
            for(;i>j;i-=j) {
                for(int k=j; k--; index += step) {
                    markFactor_wheelstorage(sieve, index);
                }
            }
        }

        for (; index < range_stop; index += step) 
            markFactor_wheelstorage(sieve, index);

        if unlikely(index==range_stop) markFactor_wheelstorage(sieve, index);
    }

    // this is the same as checkFactor_wheel but without the check for the wheel primes
    // this can only be used if index > WHEEL_MAX
    static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
    checkFactor_wheelstorage_unsafe(sieve_t* sieve, register counter_t index)
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
        counter_t wheel_index = index % WHEEL_SIZE;
        counter_t wheel_block = wheel_block_calc_uint8(index);

        return !wheelmask_compressed[wheel_index] || 
            (bitstorage_sized[wheel_block] & wheelmask_compressed[wheel_index]);
    }

    #define CHECK_FACTOR
    static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
    checkFactor_wheelstorage(sieve_t* sieve, register counter_t factor) {
        if (factor <= WHEEL_MAX) {
            return wheelprimes[factor];
        }
        return checkFactor_wheelstorage_unsafe(sieve, factor);
    }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    findUnmarked_wheelstorage(sieve_t *sieve, counter_t factor) 
    {
        #pragma GCC ivdep
        #pragma GCC unroll 4
        for (;checkFactor_wheelstorage(sieve, ++factor););
        return factor;
    }

    static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    markFactors_wheelstorage(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
    {
        const counter_t prime = step / 2;

        // markFactors_wheelstorage_repeat(sieve, start, stop, step); return;
        
        if (prime < global_stripeprime_faster ) {
            // markFactors_wheelstorage_small_repeat_pair_vector_uint64v2_unroll8(sieve, start, stop, step);
            markFactors_wheelstorage_small_repeat_pair_uint64_unroll8(sieve, start, stop, step);
            // markFactors_wheelstorage_small_repeat_uint64_unroll8(sieve, start, stop, step);
        }
        else 
        if ( (stop-start) > (step * wheelmask_stripe_bits * WHEEL_SIZE)) { // TODO: rough estimate
            markFactors_wheelstorage_repeat(sieve, start, stop, step);
        }
        else 
        {
            markFactors_wheelstorage_norepeat(sieve, start, stop, step);
        }
    }
#endif

#include "../generic/variants/cleansuffix.h"

#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD
    #define INCLUDE_FILE "../../../src/sieve/sieve_storage_wheel.h"
    #include "../generic/variants/generate.h"
#endif

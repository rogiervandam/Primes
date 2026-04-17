

// #ifndef included_once //---- include this once
#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    // static unsigned int wheel[WHEEL_SIZE/2];
    #include "../bitstorage/bitstorage_search.h"
    #include "../bitstorage/bitstorage_setBitsTrue.h"

    #define wheelvariant _uint8
    #define wheelmask_t uint8_t

    #define WHEEL_STORAGE_2OF6        2
    #define WHEEL_STORAGE_8OF30       3
    #define WHEEL_STORAGE_48OF210     4
    #define WHEEL_STORAGE_480OF2310   5
    #define WHEEL_STORAGE_5760OF30030 6

    #define WHEEL_MAX 5
    #define WHEEL_BASIC_SIZE (2 * 3 * 5)
    #define WHEEL_STRIPES 8
    #define WHEEL_REPEATS 1

    #define WHEEL_SIZE (WHEEL_BASIC_SIZE * WHEEL_REPEATS)
    #define WHEEL_STRIPE_BYTES 3 //(((WHEEL_STRIPES) - 1) / 8 + 1)
    #define WHEEL_STRIPE_BITS  ((WHEEL_STRIPE_BYTES) * 8)

    #define wheelmask_stripes      WHEEL_STRIPES
    #define wheelmask_stripe_bytes WHEEL_STRIPE_BYTES
    #define wheelmask_stripe_bits  WHEEL_STRIPE_BITS

    #include "../sieve/sieve_calc.h"

    static unsigned int wheelprimes[WHEEL_MAX+1]; // can't be more than highest prime in the wheel
    static uint8_t wheelmask[WHEEL_SIZE];
    static wheelmask_t wheelmask_compressed[WHEEL_SIZE];
    static uint8_t wheelmask_index[WHEEL_SIZE];
    static counter_t wheelmask_bitpoint[WHEEL_SIZE];
    static counter_t wheelmask_mask[8] = { 1, 2, 4, 8, 16, 32, 64, 128};

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
            wheelmask_bitpoint[i] = -1;
            for (counter_t f = 2; f <= WHEEL_MAX; f++) {
                if (((i+WHEEL_SIZE) % f) == 0) { // this is a non-prime
                    wheelmask[index_type(i, uint8_t)] |= markmask_type(i, uint8_t); // mark it in the mask
                    break;
                }
            }
            if (!(wheelmask[index_type(i, uint8_t)] & markmask_type(i, uint8_t))) {
                wheelmask_compressed[i] |= markmask_type(stripe_count, wheelmask_t);
                wheelmask_index[i] = index_type(stripe_count, wheelmask_t);
                wheelmask_bitpoint[i] = stripe_count + 1;
                stripe_count++;
            }
        }
        verbose2 (printf("Wheel size: %u, Wheel stripes: %ju, Wheel stripe bytes: %ju Wheel stripe bits: %ju\n", WHEEL_SIZE, (uintmax_t)wheelmask_stripes, (uintmax_t)wheelmask_stripe_bytes, (uintmax_t)wheelmask_stripe_bits) );

        // print the wheel for debugging
        // for (counter_t i = 0; i < WHEEL_SIZE; i++) {
        //     printf("%u: %u, %u, %u, %ju\n", i, wheelmask[i/8], wheelmask_compressed[i], wheelmask_index[i], (uintmax_t)wheelmask_bitpoint[i]);
        // }    

    }

    // static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    // wheel_bit_calc(counter_t index) {
    //     return wheelmask_stripe_bits * (index / WHEEL_SIZE) + wheelmask_index[index % WHEEL_SIZE] * bitcount_type(wheelmask_t) + shift_calc(wheelmask_compressed[index % WHEEL_SIZE]);
    // }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_calc(counter_t index) {
        const counter_t wheel_index = index % WHEEL_SIZE;
        if (wheelmask_bitpoint[wheel_index] < 0) return -1; 
        return (wheelmask_stripe_bits * (index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index] -1 ;
    }

    #define bitbucket_t uint64_t
    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    markFactor_wheelstorage(sieve_t* sieve, const register counter_t index) 
    {
        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);
        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit <= 0) return; // if the number is divisible by any of the wheel primes, skip it
        
        verbose8({ printf("Marking index %ju with wheel bit %ju\n", (uintmax_t)index, (uintmax_t)wheel_bit); waitforkey(); });
        bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask_type(wheel_bit, bitbucket_t);
    }

#endif

#include "../generic/variants/setsuffix.h" 
// sets bitbucket_t (e.g. uint64_t), variantsuffix (e.g. _uint64) and suffix (e.g. _uint64_unroll8) 
// for the current variant, based on the presets defined in varianttypes.h

#if defined variantsuffix && !defined unrolls

    // #if defined variant && !VARIANT_IS_UINT8(variant)

    // wheel_bucket is guaranteed to give back a bucket, regardless of the index is a multiple of a prime
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    function(wheel_block_calc,variantsuffix)(counter_t index) {

        // compile time short path to avoid the index % WHEEL_SIZE
        if (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) {
            return index_type((index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t);
        }

        const counter_t wheel_index = index % WHEEL_SIZE;
        // if (wheelmask_bitpoint[wheel_index] < 0) return 0;

        // return index_type((wheelmask_stripe_bits * (index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index]-1, bitbucket_t);
        return index_type((wheelmask_stripe_bits * ((index / WHEEL_SIZE)+1)), bitbucket_t);
    }

#endif

#if defined include_for_words

    // TODO: replace the fast wheelmask_compressed with something dymanic
    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    function(markFactors_wheelstorage_repeat,suffix)(sieve_t* sieve, const counter_t range_start, counter_t range_stop, const counter_t step)
    {
        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

        // const counter_t bucket_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
        const counter_t bucket_stop = function(wheel_block_calc,variantsuffix)(range_stop); // + because: don't stop too soon

        const counter_t wheel_step = reduce2power(step) * (max(bitcount_type(bitbucket_t), wheelmask_stripe_bits) / min(bitcount_type(bitbucket_t), wheelmask_stripe_bits)); // step in terms of the number of bitbuckets
        // const counter_t wheel_step = step; // step in terms of the number of bitbuckets

        // Every WHEEL_BASIC_SIZE * wheel_step, the pattern of which bits to mark as true in the wheel repeats at byte level 
        // Because when the wheel is completely done, we are wheelmask_stripe_bytes further in the bitstorage
        const counter_t range_stop_unique = min(range_start + WHEEL_SIZE * (wheel_step + 2), range_stop); 
        // const counter_t range_stop_unique = range_stop;

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 

            // 77k
            // const counter_t wheel_bit = wheel_bit_calc(index);
            // if (wheel_bit <= 0) continue; // if the number is divisible by any
            // const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
            // applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_block_calc_uint8(index), bucket_stop, wheel_step, markmask);

            // if (wheel_bit) {
            //     const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            //     function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
            // }

            // 83k
            // const uint8_t markmask = wheelmask_compressed[ index % WHEEL_SIZE ];
            // if (markmask) {
            //     applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_block_calc_uint8(index), bucket_stop, wheel_step, markmask);
            // }

            // 83k
            // const counter_t wheel_bit = wheel_bit_calc(index);
            // if (wheel_bit < 0) continue; // if the number is divisible by any
            // const uint8_t markmask = wheelmask_mask[(wheel_bit & 7)] ;

            // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);

            // 84k
            const counter_t wheel_index = index % WHEEL_SIZE;
            const bitbucket_t markmask = wheelmask_compressed[ wheel_index ];
            if (markmask) {
                counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
                        ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
                        : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index] - 1, bitbucket_t);
                
                verbose8({ printf("Marking index %ju in factorrange (%ju-%ju) with step %ju with markmask %ju at bucket start %ju bucket stop %ju with wheelstep %ju\n", (uintmax_t)index, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)step, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)wheel_step); waitforkey(); })
                // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
                function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            }

            // const counter_t wheel_bit = wheel_bit_calc(index);
            // const counter_t wheel_index = index % WHEEL_SIZE;
            // const bitbucket_t markmask = wheelmask_compressed[ wheel_index ];
            // if (markmask) {
            //     // counter_t bucket_start = index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index], bitbucket_t);
            //     // bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask;//markmask_type(wheel_bit, bitbucket_t);
                
            //     counter_t bucket_start = function(wheel_block_calc,variantsuffix)(index);
            //     // bitstorage_sized[ bucket_start] |= markmask;//markmask_type(wheel_bit, bitbucket_t);

            //     verbose8({ printf("Marking pos %ju with markmask %ju at bucket start %ju for index %ju\n", (uintmax_t)wheel_bit, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)index); })
            //     applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            //     // function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            // }

            // const counter_t wheel_bit = wheel_bit_calc(index);
            // if (wheel_bit <= 0) continue; // if the number is divisible by any
            // const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            // // bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask_type(wheel_bit, bitbucket_t);
            // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
            // // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), index_type(wheel_bit, bitbucket_t), wheel_step, markmask);
        } 
    }

#endif

#if defined include_for_words //---- include only the variant function

    #if defined unrolls && unrolls > 1
        #include "sieve_storage_wheel_smallrepeat.h"
    #endif

#endif

#if defined include_for_words //---- include only the variant function

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

    // TODO: wheelstorage_mask is faster here
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
        // counter_t wheel_index = index % WHEEL_SIZE;

        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit <= 0) return 1; // if the number is divisible by any of the wheel primes, it is not prime
        return (bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] & markmask_type(wheel_bit, bitbucket_t)) != 0;

        // counter_t wheel_block = wheel_block_calc_uint8(index);

        // return !wheelmask_compressed[wheel_index] || 
        //     (bitstorage_sized[wheel_block] & wheelmask_compressed[wheel_index]);
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

        // markFactors_wheelstorage_norepeat(sieve, start, stop, step); return;
        // markFactors_wheelstorage_repeat_uint16_unroll8(sieve, start, stop, step); return;
        
        if (prime < global_stripeprime_faster ) {
            // markFactors_wheelstorage_small_repeat_pair_vector_uint64v4_unroll4(sieve, start, stop, step);
            markFactors_wheelstorage_small_repeat_pair_uint64_unroll8(sieve, start, stop, step);
            // markFactors_wheelstorage_small_repeat_uint64_unroll8(sieve, start, stop, step);
        }
        else 
        markFactors_wheelstorage_repeat_uint8_unroll8(sieve, start, stop, step);
        // markFactors_wheelstorage_norepeat(sieve, start, stop, step);
    }
#endif

#include "../generic/variants/cleansuffix.h"

#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD
    #define INCLUDE_FILE "../../../src/sieve/sieve_storage_wheel.h"
    #include "../generic/variants/generate.h"
#endif

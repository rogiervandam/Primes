

// #ifndef BUILD_ONCE //---- include this once

#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD

    #include "../generic/log.h"
    #include "../bitstorage/bitstorage_search.h"
    #include "../bitstorage/bitstorage_setBitsTrue.h"
    #include "wheelstorage_buildWheel.h"

    // wheel_bit_calc returns the bit index  for a given number index, or -1 if the number is divisible by any of the wheel primes
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_calc(counter_t index) {
        const counter_t wheel_index = index % WHEEL_SIZE;
        if (wheelmask_bitpoint[wheel_index] < 0) return -1; 
        return (wheelmask_stripe_bits * (index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index];
    }

    // wheel_bit_estimate_next returns the bit index for a given number index, and if that number is divisible by any of the wheel primes, returns the next nearest bit
    // used for trace and logging
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_estimate_next(counter_t number_index) {
        counter_t wheel_index = number_index % WHEEL_SIZE;
        return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) + abs(wheelmask_bitpoint[wheel_index]);
    }

    // wheel_bit_estimate_last returns the bit index for a given number index, and if it is divisible by any of the wheel primes, return the previous nearest bit
    // used for trace and logging
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_estimate_last(counter_t number_index) {
        counter_t wheel_index = number_index % WHEEL_SIZE;
        if (wheelmask_bitpoint[wheel_index] < 0) return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) - wheelmask_bitpoint[wheel_index] - 1;
        return (wheelmask_stripe_bits * (number_index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index];
    }

    // returns the factor (real number) at a given bit index in the bitstorage
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
    getFactor(counter_t index) {
        const counter_t factor = (index / wheelmask_stripe_bits) * WHEEL_SIZE + wheel_number[index % wheelmask_stripe_bits];
        return factor;
    }

    #ifdef COMPILE_TRACE
    static inline void __attribute__((cold))
    trace_write_current_wheel_definition(void)
    {
        trace_write_wheel_definition(WHEEL_SIZE, WHEEL_STRIPE_BITS, WHEEL_BASIC_SIZE, WHEEL_REPEATS, WHEEL_MAX, wheel_number, wheelmask_stripes);
    }
    #endif

    #define INCLUDE_FILE "../../../src/wheelstorage/wheelstorage.h"
    #include "../generic/variants/generate.h"

#endif

#if (defined(BUILD_WORDS_STAGE) || defined(BUILD_VECTORS_STAGE)) && defined variant_suffix && (!defined unrolls || unrolls == 1)
    // wheel_bucket is guaranteed to give back a bucket, regardless of the index is a multiple of a prime
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    function(wheel_bucket_calc,variant_suffix)(counter_t index) {

        // compile time short path to avoid the index % WHEEL_SIZE
        if (bitcount_type(bitbucket_t) % wheelmask_stripe_bits == 0) {
            return index_type((index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t);
        }

        return index_type(((wheelmask_stripe_bits * (index / WHEEL_SIZE)) + abs(wheelmask_bitpoint[index % WHEEL_SIZE] )), bitbucket_t);
    }
#endif

#if defined BUILD_WORDS_STAGE //---- include only the variant function

    #include "wheelstorage_markFactor.h"

    #if defined unrolls && unrolls > 1
        #include "wheelstorage_repeat.h"
        #include "wheelstorage_smallrepeat.h"
        #include "wheelstorage_smallrepeat_pair.h"
        #include "wheelstorage_smallrepeat_mmask.h"
    #endif

#endif

#if defined BUILD_VECTORS_STAGE   

    #if defined unrolls && unrolls > 1
        #include "wheelstorage_smallrepeat_pair_vector.h"
    #endif 

#endif


#if defined(include_once_last) //---- include this once after all variants

    // TODO: wheelstorage_mask is faster here
    #include "wheelstorage_norepeat.h"

    // this is the same as checkFactor_wheel but without the check for the wheel primes
    // this can only be used if index > WHEEL_MAX
    #define bitbucket_t uint8_t
    static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
    checkFactor_wheelstorage_unsafe(sieve_t* sieve, register counter_t index)
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit < 0) return 1; // if the number is divisible by any of the wheel primes, it is not prime
        return (bitstorage_sized[ index_type(wheel_bit, uint8_t)] & markmask_type(wheel_bit, uint8_t)) != 0;

    }
    #undef bitbucket_t

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

    #include "wheelstorage_markFactors.h"
#endif

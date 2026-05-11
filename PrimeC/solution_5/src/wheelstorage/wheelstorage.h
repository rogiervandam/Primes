

// #ifndef BUILD_ONCE //---- include this once

#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD

    // static unsigned int wheel[WHEEL_SIZE/2];
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

    // wheel_bit_estimate returns the bit index for a given number index, and if it is divisible by any of the wheel primes, return the nearest that isn't
    // used for trace and logging
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_estimate(counter_t index) {
        counter_t wheel_index = index % WHEEL_SIZE;
        counter_t factor_start = wheelmask_stripe_bits * (index / WHEEL_SIZE);
        for(; wheelmask_bitpoint[wheel_index] < 0 && wheel_index < WHEEL_SIZE; wheel_index++);
        if (wheel_index <= WHEEL_SIZE) return (factor_start + wheelmask_bitpoint[wheel_index]);
        factor_start += WHEEL_SIZE; // reached the end of the wheel, so we need to wrap around to the next repetition of the wheel
        for(; wheelmask_bitpoint[wheel_index] < 0; wheel_index++);
        return (factor_start + wheelmask_bitpoint[wheel_index] );
    }

    // returns the factor (real number) at a given bit index in the bitstorage
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes)))
    getFactor(counter_t index) {
        const counter_t wheel_index = index % wheelmask_stripe_bits;
        const counter_t factor = (index / wheelmask_stripe_bits) * WHEEL_SIZE + wheel_number[wheel_index];
        return factor;
    }

    #ifdef COMPILE_TRACE
    static inline void __attribute__((cold))
    trace_write_current_wheel_definition(void)
    {
        uint32_t map_count = 0;
        for (counter_t number_offset = 0; number_offset < WHEEL_SIZE; number_offset++) {
            if (wheelmask_bitpoint[number_offset] >= 0) map_count++;
        }
        if (map_count == 0) return;

        uint64_t* map_numbers = (uint64_t*)malloc((size_t)map_count * sizeof(uint64_t));
        uint64_t* map_bits = (uint64_t*)malloc((size_t)map_count * sizeof(uint64_t));
        if (!map_numbers || !map_bits) {
            free(map_numbers);
            free(map_bits);
            return;
        }

        uint32_t out_index = 0;
        for (counter_t number_offset = 0; number_offset < WHEEL_SIZE; number_offset++) {
            if (wheelmask_bitpoint[number_offset] < 0) continue;
            map_numbers[out_index] = (uint64_t)number_offset;
            map_bits[out_index] = (uint64_t)(wheelmask_bitpoint[number_offset] );
            out_index++;
        }

        trace_write_wheel_definition((uint64_t)WHEEL_SIZE, (uint64_t)WHEEL_STRIPE_BITS, (uint64_t)WHEEL_BASIC_SIZE,(uint64_t)WHEEL_REPEATS,(uint64_t)WHEEL_MAX,
                                    map_numbers,map_bits,map_count);

        free(map_numbers);
        free(map_bits);
    }
    #endif

    #define INCLUDE_FILE "../../../src/wheelstorage/wheelstorage.h"
    #include "../generic/variants/generate.h"

#endif

// sets bitbucket_t (e.g. uint64_t), variant_suffix (e.g. _uint64) and suffix (e.g. _uint64_unroll8) 
// for the current variant, based on the presets defined in varianttypes.h
#if defined(BUILD_WORDS_STAGE) || defined(BUILD_VECTORS_STAGE)
    #if defined variant_suffix && (!defined unrolls || unrolls == 1)

        // wheel_bucket is guaranteed to give back a bucket, regardless of the index is a multiple of a prime
        static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
        function(wheel_bucket_calc,variant_suffix)(counter_t index) {

            // compile time short path to avoid the index % WHEEL_SIZE
            // if (wheelmask_stripe_bits % bitcount_type(bitbucket_t) == 0) {
            // if (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) {
            if (bitcount_type(bitbucket_t) % wheelmask_stripe_bits == 0) {
                // log9("wheel_bucket_calc for index: %ju means wheel %ju, starting at bitpoint %ju which is in the %ju bucket of %s which is enough because stripe %ju <= size %ju", 
                //     (uintmax_t)index, (uintmax_t)(index / WHEEL_SIZE), (uintmax_t)((index / WHEEL_SIZE) * wheelmask_stripe_bits), (uintmax_t)((index / WHEEL_SIZE) * wheelmask_stripe_bits / bitcount_type(bitbucket_t)), STR(suffix), (uintmax_t)wheelmask_stripe_bits, (uintmax_t)bitcount_type(bitbucket_t));
                return index_type((index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t);
            }

            const counter_t wheel_index = index % WHEEL_SIZE;
                // log9("wheel_bucket_calc for index: %ju means wheel %ju, starting at bitpoint %ju incremented by %ju which gives the %ju bucket of %s", 
                //     (uintmax_t)index, (uintmax_t)(index / WHEEL_SIZE), (uintmax_t)((index / WHEEL_SIZE) * wheelmask_stripe_bits), (uintmax_t)abs(wheelmask_bitpoint[wheel_index]), (uintmax_t)(((index / WHEEL_SIZE) * wheelmask_stripe_bits + abs(wheelmask_bitpoint[wheel_index])) / bitcount_type(bitbucket_t)), STR(suffix));
            return index_type(((wheelmask_stripe_bits * (index / WHEEL_SIZE)) + abs(wheelmask_bitpoint[wheel_index] )), bitbucket_t);
        }

    #endif
#endif

#if defined BUILD_WORDS_STAGE

    // mark a single factor in the sieve, by calculating its corresponding bit index in the bitstorage and setting that bit to true
    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    function(markFactor_wheelstorage,suffix)(sieve_t* sieve, const register counter_t index) 
    {
        logStart9(sieve->bitstorage, time_markFactor_wheelstorage, "marking factor %ju", (uintmax_t)index);

        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);
        register const counter_t wheel_bit = wheel_bit_calc(index);
#ifdef COMPILE_TRACE
        /* item 233/#230: accumulate target bit so logStop9 can emit target_bits in the trace */
        if (g_trace.enabled && wheel_bit >= 0) primes_trace_add_pending_target((uint32_t)wheel_bit);
#endif
        if (wheel_bit >= 0) bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask_type(wheel_bit, bitbucket_t);

        logStop9(sieve->bitstorage, time_markFactor_wheelstorage, "finished marking factor %ju", (uintmax_t)index);
    }

#endif

#if defined BUILD_WORDS_STAGE //---- include only the variant function

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

    static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    markFactors_wheelstorage(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
    {
        logStart6(sieve->bitstorage, time_markFactors_wheelstorage, "setting factors step %3ju in %ju factor range (%ju-%ju) for prime %ju", (uintmax_t)step, (uintmax_t)safe_diff(stop,start),(uintmax_t)start,(uintmax_t)stop, (uintmax_t)(step/2));
        const counter_t prime = step / 2;

        // function(markFactors_wheelstorage_repeat, wheelvariant_unroll_suffix)(sieve, start, stop, step); return;

        if (prime < global_largestep_faster) {
            // markFactors_wheelstorage_small_repeat_pair_vector_uint64v4_unroll8(sieve, start, stop, step);
            markFactors_wheelstorage_small_repeat_pair_uint64_unroll8(sieve, start, stop, step);
            // markFactors_wheelstorage_small_repeat_mmask_uint64_unroll8(sieve, start, stop, step);
            // markFactors_wheelstorage_small_repeat_uint64_unroll8(sieve, start, stop, step);
        }
        else 
        // markFactors_wheelstorage_repeat_uint8_unroll8(sieve, start, stop, step);
        function(markFactors_wheelstorage_repeat, wheelvariant_unroll_suffix)(sieve, start, stop, step);
        // function(markFactors_wheelstorage_repeatv2, wheelvariant_unroll_suffix)(sieve, start, stop, step);
        // markFactors_wheelstorage_norepeat(sieve, start, stop, step);

        logStop6(sieve->bitstorage, time_markFactors_wheelstorage, "finished setting factors\n");
    }
#endif

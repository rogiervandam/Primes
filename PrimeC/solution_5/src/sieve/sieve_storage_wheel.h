

// #ifndef BUILD_ONCE //---- include this once

#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD

    // static unsigned int wheel[WHEEL_SIZE/2];
    #include "../bitstorage/bitstorage_search.h"
    #include "../bitstorage/bitstorage_setBitsTrue.h"

    #define wheelvariant uint32
    #define wheelvariant_suffix NAME(_,wheelvariant)
    #define wheelmask_t NAME(wheelvariant, _t)
    #define unroll_suffix NAME(_unroll,8)
    #define wheelvariant_unroll_suffix NAME(wheelvariant_suffix, unroll_suffix)

    #define WHEEL_MAX 5
    #define WHEEL_BASIC_SIZE (2 * 3 * 5)
    #define WHEEL_STRIPES 8
    #define WHEEL_REPEATS 1
    #define WHEEL_SIZE (WHEEL_BASIC_SIZE * WHEEL_REPEATS)
    #define WHEEL_STRIPE_BITS  (((WHEEL_STRIPES * WHEEL_REPEATS - 1) / bitcount_type(wheelmask_t) + 1) * bitcount_type(wheelmask_t))

    #define wheelmask_stripe_bits  WHEEL_STRIPE_BITS 

    #include "../sieve/sieve_calc.h"

    static uint8_t     wheelprimes[WHEEL_MAX+1]; // which primes are in the wheel
    // static wheelmask_t wheelmask_compressed[WHEEL_SIZE]; // the mask to apply to the bitbucket for this index
    // static uint8_t     wheelmask_index[WHEEL_SIZE]; // the number of wheelmask_t to forward to apply the mask, e.g. 
    static counter_t   wheelmask_bitpoint[WHEEL_SIZE]; // the number of shifts needed to get the bitmask for this index to the right position in the bitbucket. Might be greater than the number of bits in wheelmask_t, in which case we need to forward to the next bitbucket(s) as well
    static counter_t   wheelstripe       [WHEEL_STRIPES]; // contains the mapping from bit to number: the nth bit corresponds to the wheelstripe[n] number in the wheel
    static counter_t   wheelmask_mask    [8] = { 1, 2, 4, 8, 16, 32, 64, 128};

    // Runtime path: compute wheel data from scratch.
    void build_wheel() {
        // find all the primes in the wheel up to WHEEL_MAX and store them
        for (counter_t i = 0; i < WHEEL_MAX; i++) {
            wheelprimes[i]=0;
            for (counter_t f = 2; f < i; f++) {
                if ((i % f) == 0) wheelprimes[i] = 1; // mark the index of a non-prime
            }
        }

        // make a mask pattern to check if the modulus WHEEL_SIZE/2 of a number is divisible by any of the primes in the wheel
        // this is used in checkBitTrue_wheel to quickly check if a number is divisible by any of the wheel primes
        counter_t stripe_count = 0;
        for (counter_t i = 0; i < WHEEL_SIZE; i++) {
            // wheelmask_index[i] = index_type(stripe_count, uint8_t); // this is always set, for easier estimation of the bucket index 
            for (counter_t f = 2; f <= WHEEL_MAX; f++) { // for each factor, try if it divides the number corresponding to this index in the wheel
                if (((i + WHEEL_SIZE) % f) == 0) {
                    wheelmask_bitpoint[i] = -1;
                }
            }
            if (wheelmask_bitpoint[i] != -1) { // when no factors found
                // wheelmask_compressed[i] |= markmask_type(stripe_count, wheelmask_t);
                wheelmask_bitpoint[i] = stripe_count;
                wheelstripe[stripe_count] = i;
                stripe_count++;
            }
        }

        verbose2 (printf("Wheel size: %u, Wheel stripes: %ju, Wheel stripe bytes: %ju Wheel stripe bits: %ju\n", WHEEL_SIZE, (uintmax_t)wheelmask_stripe_bits, (uintmax_t)wheelmask_stripe_bits/8, (uintmax_t)wheelmask_stripe_bits) );
    }

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
        const counter_t factor = (index / wheelmask_stripe_bits) * WHEEL_SIZE + wheelstripe[wheel_index];
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

    #define INCLUDE_FILE "../../../src/sieve/sieve_storage_wheel.h"
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
            if (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) {
                return index_type((index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t);
            }

            const counter_t wheel_index = index % WHEEL_SIZE;
            return index_type(((wheelmask_stripe_bits * (index / WHEEL_SIZE)) + wheelmask_bitpoint[wheel_index] ), bitbucket_t);
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
        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit <= 0) {
            logStop9(sieve->bitstorage, time_markFactor_wheelstorage, "finished marking factor %ju - skipped because divisible by wheel prime", (uintmax_t)index);
            return; // if the number is divisible by any of the wheel primes, skip it
        }
        
        bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask_type(wheel_bit, bitbucket_t);

        logStop9(sieve->bitstorage, time_markFactor_wheelstorage, "finished marking factor %ju", (uintmax_t)index);
    }

    // TODO: replace the fast wheelmask_compressed with something dynamic
    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    function(markFactors_wheelstorage_repeat,suffix)(sieve_t* sieve, const counter_t range_start, counter_t range_stop, const counter_t step)
    {
        logStart6(sieve->bitstorage, time_markFactors_wheelstorage_repeat, "factors [%jd-%jd] step %jd prime %jd", (intmax_t)range_start, (intmax_t)range_stop, (intmax_t)step, (intmax_t)step/2);

        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

        // const counter_t bucket_stop = function(wheel_bucket_calc,variant_suffix)(range_stop + 1);
        const counter_t bucket_stop = function(wheel_bucket_calc,variant_suffix)(range_stop); // + because: don't stop too soon

        const counter_t wheel_step = reduce2power(step) * (max(bitcount_type(bitbucket_t), wheelmask_stripe_bits) / min(bitcount_type(bitbucket_t), wheelmask_stripe_bits)); // step in terms of the number of bitbuckets
        // const counter_t wheel_step = step; // step in terms of the number of bitbuckets

        log9("Caculated wheel step: %ju (reduced from %ju) for prime %ju with bitbucket size %ju and wheel stripe bits %ju and reduce2power %ju\n", (uintmax_t)wheel_step, (uintmax_t)step, (uintmax_t)step/2, (uintmax_t)bitcount_type(bitbucket_t), (uintmax_t)wheelmask_stripe_bits, (uintmax_t)reduce2power(step));
        // Every WHEEL_BASIC_SIZE * wheel_step, the pattern of which bits to mark as true in the wheel repeats at byte level 
        // Because when the wheel is completely done, we are wheelmask_stripe_bytes further in the bitstorage
        const counter_t range_last_unique = min(range_start + WHEEL_SIZE * (wheel_step + 2), range_stop); 
        // const counter_t range_stop_unique = range_stop;

        counter_t wheel_bit;
        counter_t wheel_index = range_start % WHEEL_SIZE;
        counter_t wheel_start_bucket = wheelmask_stripe_bits * (range_start / WHEEL_SIZE);
        counter_t wheel_base_bitindex = wheelmask_stripe_bits * (range_start / WHEEL_SIZE); //
        counter_t current_bucket = index_type(wheel_base_bitindex, bitbucket_t);
        const counter_t last_unique_bucket = function(wheel_bucket_calc,variant_suffix)(range_last_unique);
        counter_t wheel_stripe_index = range_start % WHEEL_SIZE; // the index of the current bit in the wheel
    
        // for (; current_bucket <= last_unique_bucket;) {
        for (register counter_t index = range_start; index <= range_last_unique; index += step) { 

            // 77k
            // const counter_t wheel_bit = wheel_bit_calc(index);
            // if (wheel_bit <= 0) continue; // if the number is divisible by any
            // const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
            // applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_bucket_calc_uint8(index), bucket_stop, wheel_step, markmask);

            // if (wheel_bit) {
            //     const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            //     function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
            // }

            // 83k
            // const uint8_t markmask = wheelmask_compressed[ index % WHEEL_SIZE ];
            // if (markmask) {
            //     applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_bucket_calc_uint8(index), bucket_stop, wheel_step, markmask);
            // }

            // 83k
            // const counter_t wheel_bit = wheel_bit_calc(index);
            // if (wheel_bit < 0) continue; // if the number is divisible by any
            // const uint8_t markmask = wheelmask_mask[(wheel_bit & 7)] ;

            // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);

            // 84k
            // const counter_t wheel_index = index % WHEEL_SIZE;
            // const bitbucket_t markmask = wheelmask_compressed[ wheel_index ];
            // if (markmask) {
            //     counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
            //             ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
            //             : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index] , bitbucket_t);
                
            //     log7("Marking: Marking index %ju in factorrange (%ju-%ju) with step %ju with markmask %ju at bucket start %ju bucket stop %ju with wheelstep %ju prime %ju\n", 
            //         (uintmax_t)index, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)step, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)wheel_step, (uintmax_t)step/2);
            //     // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            //     function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            // }

            // const counter_t wheel_bit = wheel_bit_calc(index);
            const counter_t wheel_stripe_index = index % WHEEL_SIZE;
            // const bitbucket_t markmask = wheelmask_compressed[ wheel_index ];

            if (wheelmask_bitpoint[wheel_stripe_index] >= 0) {
                const counter_t wheel_bit = wheelmask_bitpoint[wheel_stripe_index] ;
                const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
                // counter_t bucket_start = index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index], bitbucket_t);
                // bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask;//markmask_type(wheel_bit, bitbucket_t);

                counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
                        ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
                        : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index] , bitbucket_t);
                // counter_t bucket_start = current_bucket;

                // counter_t bucket_start = function(wheel_bucket_calc,variant_suffix)(index);
                // bitstorage_sized[ bucket_start] |= markmask;//markmask_type(wheel_bit, bitbucket_t);

                verbose8({ printf("Marking pos %ju with markmask %ju at bucket start %ju for index %ju\n", (uintmax_t)wheel_bit, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)index); })
                // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
                function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            }

            // wheel_stripe_index += step;
            // if (wheel_stripe_index >= WHEEL_SIZE) {
            //     const counter_t advance = wheel_stripe_index / WHEEL_SIZE;
            //     wheel_stripe_index -= advance * WHEEL_SIZE;
            //     wheel_base_bitindex += wheelmask_stripe_bits * advance;
            //     current_bucket = index_type(wheel_base_bitindex, bitbucket_t);
            // }

            // const counter_t wheel_index = index % WHEEL_SIZE;
            // const bitbucket_t markmask = wheelmask_compressed[ wheel_index ];
            // if (markmask) {
            //     counter_t bucket_start = (wheelmask_stripe_bits <= bitcount_type(bitbucket_t)) 
            //             ? index_type(( index / WHEEL_SIZE) * wheelmask_stripe_bits, bitbucket_t)
            //             : index_type(((index / WHEEL_SIZE) * wheelmask_stripe_bits) + wheelmask_bitpoint[wheel_index] , bitbucket_t);
                
            //     verbose8({ printf("Marking index %ju in factorrange (%ju-%ju) with step %ju with markmask %ju at bucket start %ju bucket stop %ju with wheelstep %ju\n", (uintmax_t)index, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)step, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)wheel_step); waitforkey(); })
            //     // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            //     function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            // }

            // const counter_t wheel_bit = wheel_bit_calc(index);
            // if (wheel_bit <= 0) continue; // if the number is divisible by any
            // const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            // // bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] |= markmask_type(wheel_bit, bitbucket_t);
            // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), bucket_stop, wheel_step, markmask);
            // // function(applyMask_index, suffix)(sieve->bitstorage, index_type(wheel_bit, bitbucket_t), index_type(wheel_bit, bitbucket_t), wheel_step, markmask);

            // if (wheelmask_bitpoint[wheel_index] >= 0) {
            //     wheel_bit = wheel_start_bucket + wheelmask_bitpoint[wheel_index]  ;
            //     const bitbucket_t markmask = markmask_type(wheel_bit, bitbucket_t);
            //     counter_t bucket_start = index_type(wheel_bit, bitbucket_t);
                
            //     log7("Marking: Marking index %ju in factorrange (%ju-%ju) with step %ju with markmask %ju at bucket start %ju bucket stop %ju with wheelstep %ju prime %ju\n", 
            //         (uintmax_t)index, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)step, (uintmax_t)markmask, (uintmax_t)bucket_start, (uintmax_t)bucket_stop, (uintmax_t)wheel_step, (uintmax_t)step/2);
            //     // applyMask_index_uint8_unroll8(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            //     function(applyMask_index, suffix)(sieve->bitstorage, bucket_start, bucket_stop, wheel_step, markmask);
            // }

            // wheel_index += step;
            // if (wheel_index >= WHEEL_SIZE) {
            //     wheel_index = (index + step) % WHEEL_SIZE;
            //     wheel_start_bucket = wheelmask_stripe_bits * ((index + step) / WHEEL_SIZE);
            // }
        } 
        logStop6(sieve->bitstorage, time_markFactors_wheelstorage_repeat, "MarkingEnd: finished setting factors\n");
    }

#endif

#if defined BUILD_WORDS_STAGE //---- include only the variant function

    #if defined unrolls && unrolls > 1
        #include "sieve_storage_wheel_smallrepeat.h"
        #include "sieve_storage_wheel_smallrepeat_pair.h"
        #include "sieve_storage_wheel_smallrepeat_mmask.h"
    #endif

#endif

#if defined BUILD_VECTORS_STAGE   

    #if defined unrolls && unrolls > 1
        #include "sieve_storage_wheel_smallrepeat_pair_vector.h"
    #endif // end of unrolled function

#endif


#if defined(include_once_last) //---- include this once after all variants

    // TODO: wheelstorage_mask is faster here
    static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
    markFactors_wheelstorage_norepeat(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        logStart6(sieve->bitstorage, time_markFactors_wheelstorage_norepeat, "MarkFactorsWheelStorageNoRepeat: setting factors step %3ju in %ju factor range (%ju-%ju)", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop);
        register counter_t index = range_start;
        register counter_t i=((range_start-range_start)/step);
        for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
            for(;i>j;i-=j) {
                for(int k=j; k--; index += step) {
                    markFactor_wheelstorage_uint8(sieve, index);
                }
            }
        }

        for (; index < range_stop; index += step) 
            markFactor_wheelstorage_uint8(sieve, index);

        if unlikely(index==range_stop) markFactor_wheelstorage_uint8(sieve, index);
        logStop6(sieve->bitstorage, time_markFactors_wheelstorage_norepeat, "MarkFactorsWheelStorageNoRepeat: finished setting factors\n");
    }

    // this is the same as checkFactor_wheel but without the check for the wheel primes
    // this can only be used if index > WHEEL_MAX
    #define bitbucket_t uint8_t
    static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
    checkFactor_wheelstorage_unsafe(sieve_t* sieve, register counter_t index)
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
        // counter_t wheel_index = index % WHEEL_SIZE;

        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit <= 0) return 1; // if the number is divisible by any of the wheel primes, it is not prime
        return (bitstorage_sized[ index_type(wheel_bit, bitbucket_t)] & markmask_type(wheel_bit, bitbucket_t)) != 0;

        // counter_t wheel_block = wheel_bucket_calc_uint8(index);

        // return !wheelmask_compressed[wheel_index] || 
        //     (bitstorage_sized[wheel_block] & wheelmask_compressed[wheel_index]);
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
        // TRACE_ANALYSIS_START(5, start, stop);
        const counter_t prime = step / 2;

        // log5(sieve->bitstorage,
        //        "MarkFactorsWheelStorage: prime %jd (idx %jd), factors [%jd-%jd] step %jd",
        //            (intmax_t)(step + 1), (intmax_t)prime, (intmax_t)start,
        //            (intmax_t)stop, (intmax_t)step);

        // markFactors_wheelstorage_norepeat(sieve, start, stop, step); return;
        // markFactors_wheelstorage_repeat_uint16_unroll8(sieve, start, stop, step); return;
        
        // if (prime < global_stripeprime_faster ) {
        //     // markFactors_wheelstorage_small_repeat_pair_vector_uint64v4_unroll8(sieve, start, stop, step);
        //     markFactors_wheelstorage_small_repeat_pair_uint64_unroll8(sieve, start, stop, step);
        //     // markFactors_wheelstorage_small_repeat_mmask_uint64_unroll8(sieve, start, stop, step);
        //     // markFactors_wheelstorage_small_repeat_uint64_unroll8(sieve, start, stop, step);
        // }
        // else 
        // markFactors_wheelstorage_repeat_uint8_unroll8(sieve, start, stop, step);
        function(markFactors_wheelstorage_repeat, wheelvariant_unroll_suffix)(sieve, start, stop, step);
        // markFactors_wheelstorage_norepeat(sieve, start, stop, step);
        // TRACE_ANALYSIS_END();
    }
#endif



// #ifndef included_once //---- include this once
#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    // static unsigned int wheel[WHEEL_SIZE/2];
    static unsigned int wheelprimes[WHEEL_MAX+1]; // can't be more than highest prime in the wheel
    static uint8_t wheelmask[WHEEL_SIZE];
    static uint64_t wheelmask_compressed[WHEEL_SIZE];
    static uint8_t wheelmask_index[WHEEL_SIZE];
    static uint8_t wheelmask_offset[WHEEL_SIZE];

    // static const counter_t wheelmask_stripes = 8; // the number of possible primes per wheel, e.g. 8 when storing 8of30
    static counter_t wheelmask_stripes_var;      // the number of possible primes per wheel, e.g. 8 when storing 8of30
    static counter_t wheelmask_stripe_bytes_var; // the number of bytes for storing <WHEEL_SIZE> bits
    static counter_t wheelmask_stripe_bits_var;  // the number of bits for storing <WHEEL_SIZE> bits, should be wheelmask_stripe_bytes * 8

    #define wheelmask_stripes      8 // wheelmask_stripes_var
    #define wheelmask_stripe_bytes 1 // wheelmask_stripe_bytes_var
    #define wheelmask_stripe_bits  (8*wheelmask_stripe_bytes) // wheelmask_stripe_bits_var

    #include "../bitstorage/bitstorage_search.h"
    #include "../bitstorage/bitstorage_setBitsTrue.h"
    #include "../sieve/sieve_calc.h"
    #include "../generic/cleansuffix.h"

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
        wheelmask_stripes_var      = stripe_count;
        wheelmask_stripe_bytes_var = (wheelmask_stripes - 1) / 8 + 1;
        wheelmask_stripe_bits_var  = wheelmask_stripe_bytes * 8; 
        verbose3 (printf("Wheel size: %u, Wheel stripes: %ju, Wheel stripe bytes: %ju\n", WHEEL_SIZE, (uintmax_t)wheelmask_stripes, (uintmax_t)wheelmask_stripe_bytes) );
    }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_calc(counter_t index) {
        return wheelmask_stripe_bits * (index / WHEEL_SIZE)  + wheelmask_index[index % WHEEL_SIZE] * 8 + shift_calc(wheelmask_compressed[index % WHEEL_SIZE]);
    }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_block_calc(counter_t index) {
        return (wheelmask_stripe_bytes * (index / WHEEL_SIZE)) + wheelmask_index[index % WHEEL_SIZE];
    }

    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    markFactor_wheel(sieve_t* sieve, const register counter_t index) 
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);
        bitstorage_sized[ wheel_block_calc(index)] |= wheelmask_compressed[index % WHEEL_SIZE]; // first check if the number is divisible by any of the wheel primes, if it is, mark it as non-prime
    }

    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    markFactors_wheel_repeat(sieve_t* sieve, const counter_t range_start, counter_t range_stop, const counter_t step)
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

        const counter_t byte_stop = wheel_block_calc(range_stop + 1);
        const counter_t wheel_step = (step >> shift_calc(step)) * (bitcount_type(uint8_t) / wheelmask_stripe_bits); // step in terms of the number of bitbuckets

        // Every WHEEL_BASIC_SIZE * wheel_step, the pattern of which bits to mark as true in the wheel repeats at byte level 
        // Because when the wheel is completely done, we are wheelmask_stripe_bytes further in the bitstorage
        const counter_t range_stop_unique = range_start + WHEEL_BASIC_SIZE * wheel_step; 

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
            const uint8_t markmask = wheelmask_compressed[ index % WHEEL_SIZE];
            if (markmask) {
                applyMask_index_uint8_unroll8(sieve->bitstorage, wheel_block_calc(index), byte_stop, wheel_step, markmask);
            }
        } 
    }

    static inline void __attribute__((always_inline, nonnull, hot,  aligned(cache_line_bytes) )) 
    markFactors_wheel_norepeat(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        register counter_t index = range_start;
        register counter_t i=((range_start-range_start)/step);
        for(register counter_t j=256; j>4; j>>=1) { // unroll loops by powers of 2, to allow for more efficient code generation on some compilers
            for(;i>j;i-=j) {
                for(int k=j; k--; index += step) {
                    // setBitsTrue_wheel(sieve->bitstorage, index);
                    markFactor_wheel(sieve, index);
                }
            }
        }

        for (; index < range_stop; index += step) 
            markFactor_wheel(sieve, index);

        if unlikely(index==range_stop) markFactor_wheel(sieve, index);
    }

    // this is the same as checkFactor_wheel but without the check for the wheel primes
    // this can only be used if index > WHEEL_MAX
    static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
    checkFactor_wheel_unsafe(sieve_t* sieve, register counter_t index)
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
        counter_t wheel_index = index % WHEEL_SIZE;
        counter_t wheel_block = wheel_block_calc(index);

        return !wheelmask_compressed[wheel_index] || 
            (bitstorage_sized[wheel_block] & wheelmask_compressed[wheel_index]);
    }

    #define CHECK_FACTOR
    static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
    checkFactor(sieve_t* sieve, register counter_t factor) {
        if (factor <= WHEEL_MAX) return wheelprimes[factor];
        return checkFactor_wheel_unsafe(sieve, factor);
    }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    findUnmarked(sieve_t *sieve, counter_t factor) 
    {
        #pragma GCC ivdep
        #pragma GCC unroll 4
        for (;checkFactor(sieve, ++factor););
        return factor;
    }
#endif

#include "../generic/setsuffix.h" 
// sets bitbucket_t (e.g. uint64_t), variantsuffix (e.g. _uint64) and suffix (e.g. _uint64_unroll8) 
// for the current variant, based on the presets defined in varianttypes.h

#if defined variantsuffix && !defined unrolls
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    function(wheel_block_calc,variantsuffix)(counter_t index) {
        return index_type(wheelmask_stripe_bits * (index / WHEEL_SIZE), bitbucket_t);
    }
#endif

#ifdef include_for_words //---- include only the variant function

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheel_small_repeat,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step)
{
    register bitbucket_t* restrict bitstorage_sized_64 = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

    if (step >= bitcount_type(bitbucket_t)) {
        markFactors_wheel_repeat(sieve, range_start, range_stop, step);
        return;
    }
    const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
    // const counter_t wheel_step = step * wheelmask_stripe_bytes;
    // const counter_t range_stop_unique = min(range_start + WHEEL_BASIC_SIZE * step * wheelmask_stripe_bits + WHEEL_BASIC_SIZE * wheelmask_stripe_bits, range_stop); 

    const counter_t wheel_step = step >> shift_calc(step); // step in terms of the number of bitbuckets
    const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) / wheelmask_stripe_bits * WHEEL_BASIC_SIZE * (wheel_step + 1), range_stop); 

    bitbucket_t reuse_markmask = 0ULL;
    bitbucket_t reuse_markmask_new = 0ULL;
    counter_t reuse_block_start = 0;

    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_block = function(wheel_block_calc,variantsuffix)(index);

        if (reuse_block_start < wheel_block) { // when going to the next block
            if (reuse_markmask) { // apply previous mask if it exists
                if (reuse_block_start) {  // don't repeat the first block, it may be misaligned
                    function(applyMask_index,_uint64_unroll8)(sieve->bitstorage, reuse_block_start, block_stop, wheel_step, reuse_markmask);
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

#if defined unrolls && unrolls > 1
    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    function(markFactors_wheel_small_repeat_pair,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t step, const counter_t range_stop)
    {
        register uint64_t* restrict bitstorage_sized_64 = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

        // if (step >= 32) {
        //     setBitsTrue_wheel_repeat(bitstorage, range_start, step, range_stop);
        //     return;
        // }
        const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
        const counter_t wheel_step = step * wheelmask_stripe_bytes;
        const counter_t range_stop_unique = min(range_start + WHEEL_BASIC_SIZE * wheel_step * 8 + 2 * WHEEL_BASIC_SIZE * wheelmask_stripe_bits, range_stop); 

        uint64_t reuse_markmask = 0ULL;
        uint64_t reuse_markmask1 = 0ULL;
        counter_t reuse_block_start = 0;

        register counter_t index = range_start;

        for (; index <= range_stop_unique; index += step) { 
            const counter_t wheel_block = function(wheel_block_calc,variantsuffix)(index);
            if ((wheel_block & 1) == 0)  break;
            markFactors_wheel(sieve, index);
            // setBitsTrue_wheel(bitstorage, index); 
        }

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
            const counter_t wheel_block = function(wheel_block_calc,variantsuffix)(index);

            if ((reuse_block_start + 1) < wheel_block) { // when going to the next block
                if (reuse_markmask || reuse_markmask1) { // apply previous mask if it exists
                    if (reuse_block_start) {  // don't repeat the first block, it may be misaligned
                        function(applyMask_index_pair,suffix)(sieve->bitstorage, reuse_block_start, block_stop, wheel_step, reuse_markmask, reuse_markmask1);
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
            uint8_t wheel_mask_block = function(wheel_block_calc,variantsuffix)(index);
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
    #endif // end of unrolled function
#endif

#ifdef include_forvectors 
    #if defined unrolls && unrolls != 1

    static void __attribute__((nonnull, aligned(cache_line_bytes))) 
    function(markFactors_wheel_smallstep_rotate_vectorpair,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

        counter_t start_vector = function(wheel_block_calc,variantsuffix)(range_start);
        counter_t current_vector = start_vector;
    // function(setBitsTrue_smallstep_rotate_pair_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 

        // TODO: refactor
        register counter_t index = range_start; 

        // walk to next vector, setting bits on the way 
        #pragma GCC ivdep
        #pragma GCC unroll 32
        for(; index <= range_stop; index += step) { 
            current_vector = function(wheel_block_calc,variantsuffix)(index);
            if (current_vector != start_vector) break; // if we are in a new vector, we need to recalculate the mask vector, because the pattern of which bits to mark as true in the wheel repeats every WHEEL_BASIC_SIZE * step
            markFactor_wheel(sieve, index);
        }
        start_vector = current_vector;
        
        // counter_t vector_start_index = index;
        bitbucket_t mask_vector = BITBUCKET0;
        variant_base_type_t mask_element = (variant_base_type_t)0;
        counter_t mask_element_index = 0;

        // guarantee that all variations can land
        const counter_t range_stop_index = function(wheel_block_calc,variantsuffix)(range_stop);
        const counter_t range_stop_unique = min(index + WHEEL_BASIC_SIZE * bitcount_type(bitbucket_t) / (wheelmask_stripe_bits) * step, range_stop);
        
        for(; index <= range_stop_unique; index += step) {
            current_vector = function(wheel_block_calc,variantsuffix)(index);

            if (current_vector != start_vector) {
                if (mask_element) {
                    mask_vector[mask_element_index] = mask_element;
                    mask_element = (variant_base_type_t)0;
                }
                function(applyMask_index,suffix)(sieve->bitstorage, start_vector, range_stop_index, step, mask_vector);
                mask_vector = BITBUCKET0;
                start_vector = current_vector;
                mask_element_index = 0;
            }

            // counter_t vector_element = wheel_block_calc_uint64(index) & (elementcount_type(bitbucket_t, variant_base_type_t)-1);
            // counter_t vector_element = index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, uint64_t) & (elementcount_type(bitbucket_t, variant_base_type_t)-1);
            counter_t vector_element = vectorelement_type((wheelmask_stripe_bits * (index / WHEEL_SIZE)), bitbucket_t, variant_base_type_t);

            if (mask_element_index != vector_element) {
                if (mask_element) {
                    mask_vector[mask_element_index] = mask_element;
                    mask_element = (variant_base_type_t)0;
                }
                mask_element_index = vector_element;
            }
            if (wheelmask_compressed[index % WHEEL_SIZE]) {
                // counter_t vector_element = (wheel_bit_calc(i) / bitcount_type(variant_base_type_t)) % elementcount_type(bitbucket_t, variant_base_type_t);
                // mask_vector[vector_element] |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc(index) & 7) *8);
                mask_element |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc(index) & 7) *8);
            }
        }
        // function(applyMask_index,suffix)(bitstorage, start_vector, range_stop_vector, step, mask_vector);
        // bitstorage_sized[start_vector] |= mask_vector; // apply the last mask

        endAnalysis6(time_setBitsTrue_smallstep_rotate_pair,"\n");
    }
    #endif // end of unrolled function
#endif // end of vector only function
#include "../generic/cleansuffix.h"


#if defined include_once_last //---- include this once after all variants

    static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
    {
        const counter_t prime = step / 2;
        // if (prime <= 7 ) {
        //     markFactors_wheel_smallstep_rotate_vectorpair_uint64v8_unroll8(sieve, start, stop, step);
        // }
        // else 
        if (prime < global_stripeprime_faster * WHEEL_SIZE / (wheelmask_stripe_bits)) {
            markFactors_wheel_small_repeat_uint64(sieve, start, stop, step);
        }
        else 
        if (prime < global_largestep_faster * WHEEL_SIZE / (wheelmask_stripe_bits)*8) {
            markFactors_wheel_repeat(sieve, start, stop, step);
        }
        else 
        {
            markFactors_wheel_norepeat(sieve, start, stop, step);
        }
    }
#endif

#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD
    #define INCLUDE_FILE "../../src/sieve/sieve_storage_wheel.h"
    #include "../generic/generate_varianttypes.h"
#endif

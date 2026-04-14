

// #ifndef included_once //---- include this once
#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    // static unsigned int wheel[WHEEL_SIZE/2];
    static unsigned int wheelprimes[WHEEL_MAX+1]; // can't be more than highest prime in the wheel
    static uint8_t wheelmask[WHEEL_SIZE];
    static uint64_t wheelmask_compressed[WHEEL_SIZE];
    static counter_t wheelmask_index[WHEEL_SIZE];
    static counter_t wheelmask_offset[WHEEL_SIZE];

    #define wheelmask_stripes      WHEEL_STRIPES
    #define wheelmask_stripe_bytes WHEEL_STRIPE_BYTES
    #define wheelmask_stripe_bits  WHEEL_STRIPE_BITS

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
        verbose3 (printf("Wheel size: %u, Wheel stripes: %ju, Wheel stripe bytes: %ju\n", WHEEL_SIZE, (uintmax_t)wheelmask_stripes, (uintmax_t)wheelmask_stripe_bytes) );
    }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_bit_calc(counter_t index) {
        return wheelmask_stripe_bits * (index / WHEEL_SIZE)  + wheelmask_index[index % WHEEL_SIZE] * 8 + shift_calc(wheelmask_compressed[index % WHEEL_SIZE]);
    }

    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    wheel_block_calc_uint8(counter_t index) {
        return (wheelmask_stripe_bytes * (index / WHEEL_SIZE)) + wheelmask_index[index % WHEEL_SIZE];
    }

    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    markFactor_wheelstorage(sieve_t* sieve, const register counter_t index) 
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);
        bitstorage_sized[ wheel_block_calc_uint8(index)] |= wheelmask_compressed[index % WHEEL_SIZE]; // first check if the number is divisible by any of the wheel primes, if it is, mark it as non-prime
    }

    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    markFactors_wheelstorage_repeat(sieve_t* sieve, const counter_t range_start, counter_t range_stop, const counter_t step)
    {
        register uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

        const counter_t byte_stop = wheel_block_calc_uint8(range_stop + 1);
        const counter_t wheel_step = (step >> shift_calc(step)) * (bitcount_type(uint8_t) / wheelmask_stripe_bits); // step in terms of the number of bitbuckets

        // Every WHEEL_BASIC_SIZE * wheel_step, the pattern of which bits to mark as true in the wheel repeats at byte level 
        // Because when the wheel is completely done, we are wheelmask_stripe_bytes further in the bitstorage
        const counter_t range_stop_unique = range_start + WHEEL_BASIC_SIZE * wheel_step; 

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
            const uint8_t markmask = wheelmask_compressed[ index % WHEEL_SIZE];
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
                    // setBitsTrue_wheel(sieve->bitstorage, index);
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
        if (factor <= WHEEL_MAX) return wheelprimes[factor];
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
#endif

#include "../generic/setsuffix.h" 
// sets bitbucket_t (e.g. uint64_t), variantsuffix (e.g. _uint64) and suffix (e.g. _uint64_unroll8) 
// for the current variant, based on the presets defined in varianttypes.h

#if defined variantsuffix && !defined unrolls

    #if defined variant && !VARIANT_IS_UINT8(variant)
    static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    function(wheel_block_calc,variantsuffix)(counter_t index) {
        return index_type(wheelmask_stripe_bits * (index / WHEEL_SIZE), bitbucket_t);
    }
    #endif
#endif

#ifdef include_for_words //---- include only the variant function

#if defined unrolls && unrolls > 1

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step)
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

    // if (step >= bitcount_type(bitbucket_t)) {
    //     markFactors_wheelstorage_repeat(sieve, range_start, range_stop, step);
    //     return;
    // }
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
                    function(applyMask_index,suffix)(sieve->bitstorage, reuse_block_start, block_stop, wheel_step, reuse_markmask);
                }
                else bitstorage_sized[0] |= reuse_markmask; // if the previous block was the first block, we can apply the mask directly without going through the function
            }
            reuse_block_start = wheel_block;
            reuse_markmask = 0ULL;
            // reuse_markmask_new = 0ULL;
        }

        const counter_t wheel_index = index % WHEEL_SIZE;
        const bitbucket_t markmask = (bitbucket_t) wheelmask_compressed[wheel_index];
        // if (wheelmask_offset[wheel_index]) {
        //     reuse_markmask |= (1ULL << (((wheelmask_stripe_bytes * index / WHEEL_SIZE) & 7)*8+(wheelmask_offset[wheel_index]-1)));
        // }
        reuse_markmask |= markmask << ((wheel_block_calc_uint8(index) & 7) *8); // combine the markmask for the current block if it is the same as the previous one
        // reuse_markmask |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc_uint8(index) & 7) << 3); // combine the markmask for the current block if it is the same as the previous one
    } 

    // we can ignore the last mask because it should already be set
    // can be wrong if wheel is large and range is small.
    bitstorage_sized[reuse_block_start] |= reuse_markmask;
}
#endif

#if defined unrolls && unrolls > 1
    static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
    function(markFactors_wheelstorage_small_repeat_pair,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step)
    {
        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

        const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
        const counter_t wheel_step = step >> shift_calc(step);
        const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) / wheelmask_stripe_bits * WHEEL_BASIC_SIZE * (wheel_step + 1), range_stop);
        const counter_t word_bytemask = sizeof(bitbucket_t) - 1;

        bitbucket_t current_mask = (bitbucket_t)0U;
        counter_t current_block = 0;
        uint8_t has_current = 0;

        bitbucket_t pending_mask = (bitbucket_t)0U;
        counter_t pending_block = 0;
        uint8_t has_pending = 0;

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) {
            const counter_t wheel_block_word = function(wheel_block_calc,variantsuffix)(index);

            if (!has_current) {
                has_current = 1;
                current_block = wheel_block_word;
            }
            else if (wheel_block_word != current_block) {
                if (current_block == 0) {
                    bitstorage_sized[0] |= current_mask;
                }
                else if (has_pending) {
                    if ((pending_block + 1) == current_block) {
                        if (pending_mask || current_mask) {
                            function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask, current_mask);
                        }
                        has_pending = 0;
                    }
                    else {
                        if (pending_mask) {
                            function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
                        }
                        pending_block = current_block;
                        pending_mask = current_mask;
                    }
                }
                else {
                    has_pending = 1;
                    pending_block = current_block;
                    pending_mask = current_mask;
                }

                current_block = wheel_block_word;
                current_mask = (bitbucket_t)0U;
            }

            const counter_t wheel_block_byte = wheel_block_calc_uint8(index);
            const bitbucket_t markmask = (bitbucket_t) wheelmask_compressed[index % WHEEL_SIZE];
            current_mask |= markmask << ((bitshift_t)((wheel_block_byte & word_bytemask) << SHIFT_BYTE));
        }

        if (!has_current) return;

        if (has_pending && pending_mask) {
            function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
        }

        bitstorage_sized[current_block] |= current_mask;
    }
    #endif // end of unrolled function
#endif
#include "../generic/cleansuffix.h"


#if defined include_once_last //---- include this once after all variants

    static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
    markFactors_wheelstorage(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
    {
        const counter_t prime = step / 2;
        
        if (prime < global_stripeprime_faster ) {
            markFactors_wheelstorage_small_repeat_pair_uint64_unroll8(sieve, start, stop, step);
        }
        else 
        if ( (stop-start) > (step * bitcount_type(uint8_t) / wheelmask_stripe_bits * WHEEL_BASIC_SIZE)) { // if the range is large enough to benefit from the repeat function, use it, otherwise use the non-repeat function which has less overhead for small ranges
            markFactors_wheelstorage_repeat(sieve, start, stop, step);
        }
        else 
        {
            markFactors_wheelstorage_norepeat(sieve, start, stop, step);
        }
    }
#endif

#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD
    #define INCLUDE_FILE "../../src/sieve/sieve_storage_wheel.h"
    #include "../generic/generate_varianttypes.h"
#endif

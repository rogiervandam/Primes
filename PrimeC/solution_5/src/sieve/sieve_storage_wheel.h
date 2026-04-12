#ifndef BITSTORAGE_ASSEMBLE_WHEELSTORAGE_GUARD
    #define BITSTORAGE_ASSEMBLE_WHEELSTORAGE_GUARD
    
    // static unsigned int wheel[WHEEL_SIZE/2];
    static unsigned int wheelprimes[WHEEL_MAX+1]; // can't be more than highest prime in the wheel
    static uint8_t wheelmask[WHEEL_SIZE];
    static uint64_t wheelmask_compressed[WHEEL_SIZE];
    static uint8_t wheelmask_index[WHEEL_SIZE];
    static uint8_t wheelmask_offset[WHEEL_SIZE];

    // static const counter_t wheelmask_stripes = 8; // the number of possible primes per wheel, e.g. 8 when storing 8of30
    static counter_t wheelmask_stripes; // the number of possible primes per wheel, e.g. 8 when storing 8of30
    static counter_t wheelmask_stripe_bytes; // the number of bytes for storing <WHEEL_SIZE> bits

    #include "../bitstorage/bitstorage_search.h"
    #include "../bitstorage/bitstorage_setBitsTrue.h"
    #include "../sieve/sieve_calc.h"

    #define INCLUDE_FILE "../../src/sieve/sieve_storage_wheel.h"
    #include "../generic/generate_varianttypes.h"

    // #include "../bitstorage/bitstorage_setBitsTrue_wheel.h"
#elif defined include_once_first //---- include this once

    // #ifdef include_once_first //---- include this once

    
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

// static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
// checkBitTrue_wheel(const void* restrict bitstorage, register counter_t index) 
// {
//     if (index <= WHEEL_MAX) return wheelprimes[index];
//     return checkBitTrue_wheel_unsafe(bitstorage, index);
// }

// static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
// searchBitFalse_wheel(void* restrict bitstorage, register counter_t index) 
// {
//     #pragma GCC ivdep
//     #pragma GCC unroll 4
//     for (;checkBitTrue_wheel(bitstorage, ++index););
//     return index;
// }

#define CHECK_FACTOR
static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
checkFactor(sieve_t* sieve, register counter_t factor) {
    if (factor <= WHEEL_MAX) return wheelprimes[factor];
    return checkBitTrue_wheel_unsafe(sieve->bitstorage, factor);

    // return checkBitTrue_wheel(bitstorage, factor);
}

static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
findUnmarked(sieve_t *sieve, counter_t factor) 
{
    #pragma GCC ivdep
    #pragma GCC unroll 4
    for (;checkFactor(sieve, ++factor););
    return factor;

    // return searchBitFalse_wheel(sieve->bitstorage, start);
}
#elif defined include_once_last //---- include this once after all variants

    static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
markFactors(sieve_t *sieve, counter_t start, counter_t stop, counter_t step) 
{
    const counter_t prime = step / 2;
    if (prime <= 5 ) {
        setBitsTrue_smallstep_rotate_pair_wheel_uint64v8_unroll8(sieve->bitstorage, start, step, stop);
    }
    else 
    if (prime < global_stripeprime_faster * WHEEL_SIZE / (wheelmask_stripe_bytes * 8)) {
        // setBitsTrue_wheel_small_repeat_pair_uint64(bitstorage, start, step, range_stop);
        setBitsTrue_wheel_small_repeat_uint64(sieve->bitstorage, start, step, stop);
    }
    else 
    if (prime < global_largestep_faster * WHEEL_SIZE / (wheelmask_stripe_bytes * 8)*8) {
        setBitsTrue_wheel_repeat(sieve->bitstorage, start, step, stop);
    }
    else {
    setBitsTrue_wheel_norepeat(sieve->bitstorage, start, step, stop);
    }
}
#else


    #include "../generic/setsuffix.h"

    #ifndef unrolls
        static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
        function(wheel_block_calc,variantsuffix)(counter_t index) {
            return index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, bitbucket_t);
        }
    #endif

    #ifdef include_for_words //---- include only the variant function

    static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
    function(setBitsTrue_wheel_small_repeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
    {
        register uint64_t* restrict bitstorage_sized_64 = __builtin_assume_aligned(bitstorage,cache_line_bytes);

        if (step >= 64) {
            setBitsTrue_wheel_repeat(bitstorage, range_start, step, range_stop);
            return;
        }
        const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
        const counter_t wheel_step = step * wheelmask_stripe_bytes;
        const counter_t range_stop_unique = min(range_start + WHEEL_BASIC_SIZE * wheel_step * 8 + WHEEL_BASIC_SIZE * 8 * wheelmask_stripe_bytes, range_stop); 

        uint64_t reuse_markmask = 0ULL;
        uint64_t reuse_markmask_new = 0ULL;
        counter_t reuse_block_start = 0;

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
            const counter_t wheel_block = function(wheel_block_calc,variantsuffix)(index);

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

    #if defined unrolls && unrolls > 1
        static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
        function(setBitsTrue_wheel_small_repeat_pair,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
        {
            register uint64_t* restrict bitstorage_sized_64 = __builtin_assume_aligned(bitstorage,cache_line_bytes);

            // if (step >= 32) {
            //     setBitsTrue_wheel_repeat(bitstorage, range_start, step, range_stop);
            //     return;
            // }
            const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
            const counter_t wheel_step = step * wheelmask_stripe_bytes;
            const counter_t range_stop_unique = min(range_start + WHEEL_BASIC_SIZE * wheel_step * 8 + 2 * WHEEL_BASIC_SIZE * 8 * wheelmask_stripe_bytes, range_stop); 

            uint64_t reuse_markmask = 0ULL;
            uint64_t reuse_markmask1 = 0ULL;
            counter_t reuse_block_start = 0;

            register counter_t index = range_start;

            for (; index <= range_stop_unique; index += step) { 
                const counter_t wheel_block = function(wheel_block_calc,variantsuffix)(index);
                if ((wheel_block & 1) == 0)  break;
                setBitsTrue_wheel(bitstorage, index); 
            }

            for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
                const counter_t wheel_block = function(wheel_block_calc,variantsuffix)(index);

                if ((reuse_block_start + 1) < wheel_block) { // when going to the next block
                    if (reuse_markmask || reuse_markmask1) { // apply previous mask if it exists
                        if (reuse_block_start) {  // don't repeat the first block, it may be misaligned
                            // applyMask_index_uint64_unroll8(bitstorage, reuse_block_start, wheel_step, block_stop, reuse_markmask);
                            // applyMask_index_uint64_unroll8(bitstorage, reuse_block_start+1, wheel_step, block_stop, reuse_markmask1);
                            function(applyMask_index_pair,suffix)(bitstorage, reuse_block_start, wheel_step, block_stop, reuse_markmask, reuse_markmask1);
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
        function(setBitsTrue_smallstep_rotate_pair_wheel,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
        {
            register bitbucket_t* restrict bitstorage_sized     = __builtin_assume_aligned(bitstorage, cache_line_bytes);

            counter_t start_vector = function(wheel_block_calc,variantsuffix)(range_start);
            counter_t current_vector = start_vector;

            // TODO: refactor
            register counter_t index = range_start; 

            // walk to next vector, setting bits on the way 
            #pragma GCC ivdep
            #pragma GCC unroll 32
            for(; index <= range_stop; index += step) { 
                current_vector = function(wheel_block_calc,variantsuffix)(index);
                if (current_vector != start_vector) break; // if we are in a new vector, we need to recalculate the mask vector, because the pattern of which bits to mark as true in the wheel repeats every WHEEL_BASIC_SIZE * step
                setBitsTrue_wheel(bitstorage, index);
            }
            start_vector = current_vector;
            
            // counter_t vector_start_index = index;
            bitbucket_t mask_vector = BITBUCKET_BASE(0LL);
            variant_base_type_t mask_element = 0LL;
            counter_t mask_element_index = 0;

            // guarantee that all variations can land
            const counter_t range_stop_vector = function(wheel_block_calc,variantsuffix)(range_stop);
            const counter_t range_stop_unique = min(index + WHEEL_BASIC_SIZE * bitcount_type(bitbucket_t) / (wheelmask_stripe_bytes * 8) * step, range_stop);
            
            for(; index <= range_stop_unique; index += step) {
                current_vector = function(wheel_block_calc,variantsuffix)(index);

                if (current_vector != start_vector) {
                    if (mask_element) {
                        mask_vector[mask_element_index] = mask_element;
                        mask_element = 0LL;
                    }
                    function(applyMask_index,suffix)(bitstorage, start_vector, step, range_stop_vector, mask_vector);
                    mask_vector = BITBUCKET_BASE(0LL);
                    start_vector = current_vector;
                    mask_element_index = 0;
                }

                // counter_t vector_element = wheel_block_calc_uint64(index) & (elementcount_type(bitbucket_t, variant_base_type_t)-1);
                // counter_t vector_element = index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, uint64_t) & (elementcount_type(bitbucket_t, variant_base_type_t)-1);
                counter_t vector_element = vectorelement_type((wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE), bitbucket_t, variant_base_type_t);

                if (mask_element_index != vector_element) {
                    if (mask_element) {
                        mask_vector[mask_element_index] = mask_element;
                        mask_element = 0LL;
                    }
                    mask_element_index = vector_element;
                }
                if (wheelmask_compressed[index % WHEEL_SIZE]) {
                    // counter_t vector_element = (wheel_bit_calc(i) / bitcount_type(variant_base_type_t)) % elementcount_type(bitbucket_t, variant_base_type_t);
                    // mask_vector[vector_element] |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc(index) & 7) *8);
                    mask_element |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc(index) & 7) *8);
                }
            }
            // function(applyMask_index,suffix)(bitstorage, start_vector, step, range_stop_vector, mask_vector);
            // bitstorage_sized[start_vector] |= mask_vector; // apply the last mask

            endAnalysis6(time_setBitsTrue_smallstep_rotate_pair,"\n");
        }
        #endif // end of unrolled function
    #endif // end of vector only function
    #include "../generic/cleansuffix.h"



#endif



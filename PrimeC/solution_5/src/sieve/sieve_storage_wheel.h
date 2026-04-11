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
#else

    #ifdef include_once //---- include this once

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
    #endif //---- end of include_once

    #include "../generic/setsuffix.h"

    #ifndef unrolls
        static inline counter_t __attribute__((always_inline, hot, aligned(cache_line_bytes))) 
        function(wheel_block_calc,variantsuffix)(counter_t index) {
            return index_type(wheelmask_stripe_bytes * 8 * index / WHEEL_SIZE, bitbucket_t);
        }
    #endif

    #ifdef include_for_words //---- include only the variant function
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



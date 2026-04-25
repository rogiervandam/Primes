#ifndef LARGESTEP_VECTOR_GUARD
    #define LARGESTEP_VECTOR_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_largestep_vector.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_VECTORS_STAGE)

    static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
    function(setBitsTrue_largestep_vector,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        logBegins7(bitstorage, time_setBitsTrue_largestep_bitbucket, "SetBitsTrueLargestepVector: setting bits step %3ju using largestep_bitbucket%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

        const counter_t range_start_next_bitbucket = index_next_type(range_start, bitbucket_t); // find next bitbucket
        const counter_t range_start_new = setBitsTrue_range_return_uint8(bitstorage, range_start, range_start_next_bitbucket, step);
        if (range_start_new > range_stop) return;
        // function(create_mask_bitbucket_largestep,suffix)(bitstorage, range_start_new, range_stop, step);
        
        // bitbucket_t* restrict bitstorage_bitbucket = __builtin_assume_aligned(bitstorage, cache_line_bytes);
        const counter_t range_stop_unique_bitbucket = index_type(range_start_new, bitbucket_t) + step;  // extra size is sometimes needed when size < blocklimit
        const counter_t range_stop_index = index_type(range_stop, bitbucket_t);
        const bitbucket_t empty_bitbucket = BITBUCKET_BASE((variant_base_type_t) 0U);

        #pragma GCC ivdep
        for (counter_t index = range_start_new, current_bitbucket = index_type(range_start_new, bitbucket_t); current_bitbucket <= range_stop_unique_bitbucket; current_bitbucket++) {
            const counter_t current_bitbucket_start = bitbucket_start_type(index, bitbucket_t);
            const counter_t current_bitbucket_end = current_bitbucket_start + bitcount_type(bitbucket_t);
            register bitbucket_t mask_bitbucket = empty_bitbucket;

            #pragma GCC ivdep
            #pragma unroll 8
            for (counter_t element = 0; element < BITBUCKET_ELEMENTS; element++) {
                if (bitbucketelement_type(index, bitbucket_t, variant_base_type_t) == element) {
                    mask_bitbucket[element] = markmask_calc_type(index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
                    index += step;
                }
            }

            // #pragma GCC ivdep
            // for (counter_t element = 0; element < BITBUCKET_ELEMENTS; element++) {
            //     if (bitbucketelement_type(index, bitbucket_t, variant_base_type_t) == element) {
            //         mask_bitbucket[element] = markmask_calc_type(index, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
            //         index += step;
            //     }
            // }
            
            // const counter_t current_bitbucket_end = min(index_next_type(index, bitbucket_t), range_stop);

            // counter_t fillcount = 1 + (current_bitbucket_end - current_bitbucket_start) / step;
            // if (index + fillcount * step >= current_bitbucket_end) fillcount--;
            // if (index + fillcount * step >= current_bitbucket_end) fillcount--;
            // if (index + fillcount * step >= current_bitbucket_end) fillcount--;
            // if (index + fillcount * step >= current_bitbucket_end) fillcount--;
            // if (index + fillcount * step >= current_bitbucket_end) fillcount--;
            // if (index + fillcount * step >= current_bitbucket_end) fillcount--;

            // counter_t fillcount = (current_bitbucket_end - index - 1) / step;
            // #pragma GCC ivdep
            // #pragma unroll 8
            // for(counter_t fills = 0, elements = BITBUCKET_ELEMENTS; fills <= fillcount && elements > 0; fills++, elements--) {
            //     mask_bitbucket[bitbucketelement_type(index + fills * step, bitbucket_t, variant_base_type_t)] = markmask_calc_type(index + fills * step, variant_base_type_t);
            // }
            // index += (fillcount + 1) * step;

            // const counter_t current_bitbucket_end = current_bitbucket_start + bitcount_type(bitbucket_t);
            // counter_t count = 0;
            // #pragma GCC unroll 32
            // for (; index < current_bitbucket_end && count < BITBUCKET_ELEMENTS; index += step, count++) {
            //     mask_bitbucket[bitbucketelement_type(index, bitbucket_t, variant_base_type_t)] = markmask_calc_type(index, variant_base_type_t);
            // }

            function(applyMask_index,suffix)(bitstorage, current_bitbucket, range_stop_index, step, mask_bitbucket);
        }

        logEnds7(bitstorage, time_setBitsTrue_largestep_bitbucket,"SetBitsTrueLargestepBitbucket: finished setting bits using largestep%s\n", STR(suffix));
    }

#endif

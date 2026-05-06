#ifndef LARGESTEP_VECTOR_GUARD
    #define LARGESTEP_VECTOR_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_largestep_vector.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_VECTORS_STAGE)

    static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
    function(setBitsTrue_largestep_vector,suffix)(void* restrict bitstorage, counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        logStart7(bitstorage, time_setBitsTrue_largestep_bitbucket, "setting bits step %3ju using largestep_bitbucket%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));
        const bitbucket_t empty_bitbucket = BITBUCKET_BASE((variant_base_type_t) 0U);

        // mark until the next bitbucket boundary
        range_start = setBitsTrue_range_return_uint8(bitstorage, range_start, index_next_type(range_start, bitbucket_t), step);
        if unlikely(range_start > range_stop) return;
        
        counter_t current_bucket = index_type(range_start, bitbucket_t);
        const counter_t stop_bucket = index_type(range_stop , bitbucket_t); // which bucket to stop at
        const counter_t last_unique_bucket = index_type(range_start, bitbucket_t) + step - 1; // extra size is sometimes needed when size < blocklimit

        #pragma GCC ivdep
        for (counter_t index = range_start; current_bucket <= last_unique_bucket; current_bucket++) {
            register bitbucket_t mask_bitbucket = BITBUCKET_BASE((variant_base_type_t) 0U);
            counter_t next_bucket_start = index_next_type(index, bitbucket_t); // next bucket boundary, used to stop the loop when the next bucket is reached
            
            #pragma GCC ivdep
            #pragma unroll variant_elements
            for (counter_t element = 0, bucketindex = index; element < variant_elements; element++) {
                if (bitbucketelement_type(bucketindex, bitbucket_t, variant_base_type_t) == element) {
                    mask_bitbucket[element] = markmask_calc_type(bucketindex, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
                    bucketindex += step;
                }
            }

            // disconnect the loop from the current bitbucket for more possble optimzations
            for (index += step; index < next_bucket_start; index += step); 

            function(applyMask_index,suffix)(bitstorage, current_bucket, stop_bucket, step, mask_bitbucket);
        }

        logStop7(bitstorage, time_setBitsTrue_largestep_bitbucket,"SetBitsTrueLargestepBitbucket: finished setting bits using largestep%s\n", STR(suffix));
    }

    #endif

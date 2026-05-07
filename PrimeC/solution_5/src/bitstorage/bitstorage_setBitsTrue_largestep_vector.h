#ifndef LARGESTEP_VECTOR_GUARD
    #define LARGESTEP_VECTOR_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_largestep_vector.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_VECTORS_STAGE)

    static inline void __attribute__((always_inline, nonnull,  aligned(cache_line_bytes))) 
    function(setBitsTrue_largestep_vector,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
    {
        logStart7(bitstorage, time_setBitsTrue_largestep_bitbucket, "setting bits step %3ju using largestep_bitbucket%s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

        // mark until the next bitbucket boundary
        const counter_t range_stop_next_bucketstart = (range_start | (mask_type(bitbucket_t)*2)) + 2; // find nice alignment
        if (range_stop_next_bucketstart + step * bitcount_type(bitbucket_t) > range_stop) {
            setBitsTrue_largestep_norepeat_uint8_unroll4(bitstorage, range_start, range_stop, step);
            logStop7(bitstorage, time_setBitsTrue_smallstep_rotate_pair, "finished setting bits step %3ju in %ju bit range (%ju-%ju) with %ju bits to set; handed of to setBitsTrue_range because of a short range (%ju-%ju)", 
                (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)range_start, (uintmax_t)range_stop);
            return;
        }

        const counter_t range_start_new = setBitsTrue_range_return_uint8(bitstorage, range_start, range_stop_next_bucketstart, step);
        if unlikely(range_start_new > range_stop) return;
        
        const counter_t stop_bucket = index_type(range_stop, bitbucket_t); // which bucket to stop at
        const counter_t first_duplicate_bucket = index_type(range_start_new, bitbucket_t) + step; // extra size is sometimes needed when size < blocklimit
        counter_t current_bucket = index_type(range_start_new, bitbucket_t);

        #pragma GCC ivdep
        for (counter_t index = range_start_new; current_bucket < first_duplicate_bucket; current_bucket++) {
            register bitbucket_t mask = BITBUCKET_BASE((variant_base_type_t) 0U);
            counter_t bitbucket_end = bitbucket_end_type(index, bitbucket_t); // next bucket boundary, used to stop the loop when the next bucket is reached
            
            #pragma GCC ivdep
            #pragma unroll variant_elements
            for (counter_t element = 0, bucketindex = index; element < variant_elements; element++) {
                if (bitbucketelement_type(bucketindex, bitbucket_t, variant_base_type_t) == element) {
                    mask[element] = markmask_calc_type(bucketindex, variant_base_type_t); // in clang, markmask_type is enough, not in gcc
                    bucketindex += step;
                }
            }

            // disconnect the loop from the current bitbucket for more possble optimzations
            for (index += step; index <= bitbucket_end; index += step); 

            function(applyMask_index,suffix)(bitstorage, current_bucket, stop_bucket, step, mask);
        }

        logStop7(bitstorage, time_setBitsTrue_largestep_bitbucket,"finished setting bits using largestep%s\n", STR(suffix));
    }

    #endif

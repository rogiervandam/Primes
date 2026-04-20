#include <stdio.h>

#include "../generic/variants/setsuffix.h"

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes)))
function(applyMask_index_pair,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step, const bitbucket_t mask1, const bitbucket_t mask2) 
{
    logBegin8(time_applyMask_pair, "ApplyMaskPair: apply %s (%ju bit) mask in pairs with step %ju in bitrange (%ju - %ju)", STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start * bitcount_type(bitbucket_t), (uintmax_t)range_stop * bitcount_type(bitbucket_t));

    register const counter_t step_max = step * unrolls, step_2 = step * 2, step_3 = step_2 + step;
    register const bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register const bitbucket_t* restrict fast_loop_ptr    = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop,step_max)],sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr   = __builtin_assume_aligned(&bitstorage_sized[range_stop],sizeof(bitbucket_t));
    register bitbucket_t* restrict index_ptr              = __builtin_assume_aligned(&bitstorage_sized[range_start],sizeof(bitbucket_t));
    
    #if unrolls == 4
        #pragma GCC ivdep
        #pragma GCC unroll 32
        for(;likely(index_ptr < fast_loop_ptr);) {
            *index_ptr                |= mask1; 
            *(index_ptr + 1         ) |= mask2; 
            *(index_ptr + step      ) |= mask1; 
            *(index_ptr + step + 1  ) |= mask2; 
            *(index_ptr + step_2)     |= mask1; 
            *(index_ptr + step_2 + 1) |= mask2; 
            *(index_ptr + step_3)     |= mask1; 
            *(index_ptr + step_3 + 1) |= mask2; 
            index_ptr += step_max;
        }
    #endif

    #if unrolls == 8
        #pragma GCC ivdep
        #pragma GCC unroll 32
        for(; likely(index_ptr < fast_loop_ptr); index_ptr += step_max) {
            *index_ptr                  |= mask1;
            *(index_ptr + 1           ) |= mask2;  
            *(index_ptr + step        ) |= mask1; 
            *(index_ptr + step + 1    ) |= mask2;  
            *(index_ptr + step_2      ) |= mask1; 
            *(index_ptr + step_2 + 1  ) |= mask2;  
            *(index_ptr + step_3      ) |= mask1; 
            *(index_ptr + step_3 + 1  ) |= mask2;  
            *(index_ptr + step * 4    ) |= mask1;
            *(index_ptr + step * 4 + 1) |= mask2;
            *(index_ptr + step * 5    ) |= mask1;
            *(index_ptr + step * 5 + 1) |= mask2;
            *(index_ptr + step * 6    ) |= mask1;
            *(index_ptr + step * 6 + 1) |= mask2;
            *(index_ptr + step * 7    ) |= mask1;
            *(index_ptr + step * 7 + 1) |= mask2;
        }
    #endif 
        
    for (counter_t i=(unrolls+1); i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <unrolls iterations are left
        *index_ptr     |= mask1; 
        *(index_ptr+1) |= mask2; 
    }
    
    if (index_ptr == range_stop_ptr) {
        *index_ptr     |= mask1; 
    }

    char mask1_bits[2048] = {0};
    char mask2_bits[2048] = {0};
    char* mask1_bits_ptr = mask1_bits;
    char* mask2_bits_ptr = mask2_bits;
    size_t mask1_bits_remaining = sizeof(mask1_bits);
    size_t mask2_bits_remaining = sizeof(mask2_bits);

    #if defined(variant_base_type_t) && defined(BITBUCKET_ELEMENTS)
    for (counter_t element_index = 0; element_index < BITBUCKET_ELEMENTS; element_index++) {
        const uintmax_t lane_mask1 = (uintmax_t)mask1[element_index];
        const uintmax_t lane_mask2 = (uintmax_t)mask2[element_index];
        for (counter_t bit_offset = 0; bit_offset < bitcount_type(variant_base_type_t); bit_offset++) {
            const uintmax_t absolute_bit = (uintmax_t)(element_index * bitcount_type(variant_base_type_t) + bit_offset);

            if ((lane_mask1 & ((uintmax_t)1 << bit_offset)) != 0 && mask1_bits_remaining > 1) {
                const int written = snprintf(mask1_bits_ptr, mask1_bits_remaining, mask1_bits_ptr == mask1_bits ? "%ju" : ",%ju", absolute_bit);
                if (written > 0 && (size_t)written < mask1_bits_remaining) {
                    mask1_bits_ptr += written;
                    mask1_bits_remaining -= (size_t)written;
                } else {
                    mask1_bits_ptr[mask1_bits_remaining - 1] = '\0';
                    mask1_bits_remaining = 1;
                }
            }

            if ((lane_mask2 & ((uintmax_t)1 << bit_offset)) != 0 && mask2_bits_remaining > 1) {
                const int written = snprintf(mask2_bits_ptr, mask2_bits_remaining, mask2_bits_ptr == mask2_bits ? "%ju" : ",%ju", absolute_bit);
                if (written > 0 && (size_t)written < mask2_bits_remaining) {
                    mask2_bits_ptr += written;
                    mask2_bits_remaining -= (size_t)written;
                } else {
                    mask2_bits_ptr[mask2_bits_remaining - 1] = '\0';
                    mask2_bits_remaining = 1;
                }
            }
        }
    }
    #else
    const uintmax_t scalar_mask1 = (uintmax_t)mask1;
    const uintmax_t scalar_mask2 = (uintmax_t)mask2;
    for (counter_t bit_offset = 0; bit_offset < bitcount_type(bitbucket_t); bit_offset++) {
        if ((scalar_mask1 & ((uintmax_t)1 << bit_offset)) != 0 && mask1_bits_remaining > 1) {
            const int written = snprintf(mask1_bits_ptr, mask1_bits_remaining, mask1_bits_ptr == mask1_bits ? "%ju" : ",%ju", (uintmax_t)bit_offset);
            if (written > 0 && (size_t)written < mask1_bits_remaining) {
                mask1_bits_ptr += written;
                mask1_bits_remaining -= (size_t)written;
            } else {
                mask1_bits_ptr[mask1_bits_remaining - 1] = '\0';
                mask1_bits_remaining = 1;
            }
        }
        if ((scalar_mask2 & ((uintmax_t)1 << bit_offset)) != 0 && mask2_bits_remaining > 1) {
            const int written = snprintf(mask2_bits_ptr, mask2_bits_remaining, mask2_bits_ptr == mask2_bits ? "%ju" : ",%ju", (uintmax_t)bit_offset);
            if (written > 0 && (size_t)written < mask2_bits_remaining) {
                mask2_bits_ptr += written;
                mask2_bits_remaining -= (size_t)written;
            } else {
                mask2_bits_ptr[mask2_bits_remaining - 1] = '\0';
                mask2_bits_remaining = 1;
            }
        }
    }
    #endif

    log8(bitstorage,
        "ApplyMaskPair: word_bits=%ju word_start=%ju word_stop=%ju step_words=%ju mask1_bits=%s mask2_bits=%s focus_start=%ju focus_stop=%ju bitrange=%ju-%ju",
        (uintmax_t)bitcount_type(bitbucket_t),
        (uintmax_t)range_start,
        (uintmax_t)range_stop,
        (uintmax_t)step,
        mask1_bits,
        mask2_bits,
        (uintmax_t)(range_start * bitcount_type(bitbucket_t)),
        (uintmax_t)((range_stop + 1) * bitcount_type(bitbucket_t) - 1),
        (uintmax_t)(range_start * bitcount_type(bitbucket_t)),
        (uintmax_t)((range_stop + 1) * bitcount_type(bitbucket_t) - 1));
    logEnd8(time_applyMask_pair);
}

#include "../generic/variants/cleansuffix.h"

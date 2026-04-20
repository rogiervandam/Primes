#include <stdio.h>

#include "../generic/variants/setsuffix.h"

// This applyMask variant takes range_start and range_stop as the word/vector index
static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(applyMask_index,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, counter_t step, const bitbucket_t mask) 
{
    logBegin8(time_applyMask, "ApplyMask: apply %s (%ju bit) mask with step %ju in bitrange (%ju - %ju)", STR(bitbucket_t), bitcount_type(bitbucket_t),(uintmax_t)step, (uintmax_t)range_start * bitcount_type(bitbucket_t), (uintmax_t)(range_stop+1) * bitcount_type(bitbucket_t)-1);
  
    register       bitbucket_t* restrict bitstorage_sized   = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register       bitbucket_t* restrict index_ptr          = __builtin_assume_aligned(&bitstorage_sized[range_start],sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_ptr     = __builtin_assume_aligned(&bitstorage_sized[range_stop],sizeof(bitbucket_t));
 
    #if defined(__GNUC__) && !defined(__clang__) // optimized for GCC
        register const counter_t step_max                   = step * unrolls;
        register const bitbucket_t* restrict fast_loop_ptr  = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop,step_max)],sizeof(bitbucket_t));

        #if unrolls == 16
        #pragma GCC ivdep
        #pragma GCC unroll 32
        for(;(index_ptr < fast_loop_ptr); ) {
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
        }
        #endif

        #if unrolls == 8
        #pragma GCC ivdep
        #pragma GCC unroll 64
        for(;(index_ptr < fast_loop_ptr); ) {
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
        }
        #endif

        #if unrolls == 4
        #pragma GCC ivdep
        #pragma GCC unroll 64
        for(;(index_ptr < fast_loop_ptr); ) {
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
            *index_ptr |= mask; index_ptr += step;
        }
        #endif

    #elif defined(__clang__) // optimized for clang

        register counter_t i = safe_diff(range_stop, range_start) / step;

        #if unrolls >= 8
            register const counter_t step_8 = step * 8;
            for (; i > 8 ; i -= 8, index_ptr += step_8) {
                index_ptr[step * 0] |= mask;
                index_ptr[step * 1] |= mask;
                index_ptr[step * 2] |= mask;
                index_ptr[step * 3] |= mask;
                index_ptr[step * 4] |= mask;
                index_ptr[step * 5] |= mask;
                index_ptr[step * 6] |= mask;
                index_ptr[step * 7] |= mask;
            }
        #elif unrolls >= 4
            register const counter_t step_4 = step * 4;
            for (; i > 4 ; i -= 4, index_ptr += step_4) {
                index_ptr[step * 0] |= mask;
                index_ptr[step * 1] |= mask;
                index_ptr[step * 2] |= mask;
                index_ptr[step * 3] |= mask;
            }
        #endif

    #endif // end of clang section

    for (; likely(index_ptr <= range_stop_ptr); index_ptr += step) { // signal compiler that only < unrolls iterations are left
        *index_ptr |= mask; 
    }
    char mask_bits[2048] = {0};
    char* mask_bits_ptr = mask_bits;
    size_t mask_bits_remaining = sizeof(mask_bits);
    #if defined(variant_base_type_t) && defined(BITBUCKET_ELEMENTS)
    for (counter_t element_index = 0; element_index < BITBUCKET_ELEMENTS && mask_bits_remaining > 1; element_index++) {
        const uintmax_t lane_mask = (uintmax_t)mask[element_index];
        for (counter_t bit_offset = 0; bit_offset < bitcount_type(variant_base_type_t) && mask_bits_remaining > 1; bit_offset++) {
            if ((lane_mask & ((uintmax_t)1 << bit_offset)) == 0) continue;
            const uintmax_t absolute_bit = (uintmax_t)(element_index * bitcount_type(variant_base_type_t) + bit_offset);
            const int written = snprintf(mask_bits_ptr, mask_bits_remaining, mask_bits_ptr == mask_bits ? "%ju" : ",%ju", absolute_bit);
            if (written <= 0 || (size_t)written >= mask_bits_remaining) {
                mask_bits_ptr[mask_bits_remaining - 1] = '\0';
                mask_bits_remaining = 1;
                break;
            }
            mask_bits_ptr += written;
            mask_bits_remaining -= (size_t)written;
        }
    }
    #else
    const uintmax_t scalar_mask = (uintmax_t)mask;
    for (counter_t bit_offset = 0; bit_offset < bitcount_type(bitbucket_t) && mask_bits_remaining > 1; bit_offset++) {
        if ((scalar_mask & ((uintmax_t)1 << bit_offset)) == 0) continue;
        const int written = snprintf(mask_bits_ptr, mask_bits_remaining, mask_bits_ptr == mask_bits ? "%ju" : ",%ju", (uintmax_t)bit_offset);
        if (written <= 0 || (size_t)written >= mask_bits_remaining) {
            mask_bits_ptr[mask_bits_remaining - 1] = '\0';
            mask_bits_remaining = 1;
            break;
        }
        mask_bits_ptr += written;
        mask_bits_remaining -= (size_t)written;
    }
    #endif

    log8(bitstorage,
        "ApplyMask: word_bits=%ju word_start=%ju word_stop=%ju step_words=%ju mask_bits=%s focus_start=%ju focus_stop=%ju bitrange=%ju-%ju",
        (uintmax_t)bitcount_type(bitbucket_t),
        (uintmax_t)range_start,
        (uintmax_t)range_stop,
        (uintmax_t)step,
        mask_bits,
        (uintmax_t)(range_start * bitcount_type(bitbucket_t)),
        (uintmax_t)((range_stop + 1) * bitcount_type(bitbucket_t) - 1),
        (uintmax_t)(range_start * bitcount_type(bitbucket_t)),
        (uintmax_t)((range_stop + 1) * bitcount_type(bitbucket_t) - 1));
    logEnd8(time_applyMask, "\n");
}

#include "../generic/variants/cleansuffix.h"

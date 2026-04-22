#include <stdio.h>

#include "../generic/variants/setsuffix.h"
#include "../trace/sieve_trace.h"

// This applyMask variant takes range_start_index and range_stop_index as the word/vector index
static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
function(applyMask_index,suffix)(void* restrict bitstorage, const counter_t range_start_index, const counter_t range_stop_index, counter_t step, const bitbucket_t mask) 
{
    logBegins8(bitstorage, time_applyMask, "ApplyMask_index%s: apply %s (%ju bit) mask with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t),(uintmax_t)step, (uintmax_t)range_start_index * bitcount_type(bitbucket_t), (uintmax_t)(range_stop_index+1) * bitcount_type(bitbucket_t)-1);
  
    register       bitbucket_t* restrict bitstorage_sized   = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    register       bitbucket_t* restrict index_ptr          = __builtin_assume_aligned(&bitstorage_sized[range_start_index],sizeof(bitbucket_t));
    register const bitbucket_t* restrict range_stop_index_ptr     = __builtin_assume_aligned(&bitstorage_sized[range_stop_index],sizeof(bitbucket_t));
 
    #if defined(__GNUC__) && !defined(__clang__) // optimized for GCC
        register const counter_t step_max                   = step * unrolls;
        register const bitbucket_t* restrict fast_loop_ptr  = __builtin_assume_aligned(&bitstorage_sized[safe_diff(range_stop_index,step_max)],sizeof(bitbucket_t));

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

        register counter_t i = safe_diff(range_stop_index, range_start_index) / step;

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

    for (; likely(index_ptr <= range_stop_index_ptr); index_ptr += step) { // signal compiler that only < unrolls iterations are left
        *index_ptr |= mask; 
    }

    if (primes_log_should_trace(8) || primes_log_should_explain(8)) {
        char annotation[4096] = {0};
        char mask_bits_text[2048] = {0};
        uint32_t mask_bits[1024] = {0};
        uint64_t* mask_target_words = NULL;
        uint32_t* mask_target_slots = NULL;
        uint32_t mask_target_count = 0;
        uint32_t mask_count = 0;

        #if defined(variant_base_type_t) && defined(BITBUCKET_ELEMENTS)
        mask_count = primes_trace_collect_mask_bits(mask_bits,
                                                    1024,
                                                    &mask,
                                                    sizeof(variant_base_type_t),
                                                    BITBUCKET_ELEMENTS,
                                                    bitcount_type(variant_base_type_t));
        #else
        mask_count = primes_trace_collect_mask_bits(mask_bits,
                                                    1024,
                                                    &mask,
                                                    sizeof(bitbucket_t),
                                                    1,
                                                    bitcount_type(bitbucket_t));
        #endif

        primes_trace_format_mask_bits(mask_bits_text,
                                      sizeof(mask_bits_text),
                                      &mask,
                                      #if defined(variant_base_type_t) && defined(BITBUCKET_ELEMENTS)
                                      sizeof(variant_base_type_t),
                                      BITBUCKET_ELEMENTS,
                                      bitcount_type(variant_base_type_t)
                                      #else
                                      sizeof(bitbucket_t),
                                      1,
                                      bitcount_type(bitbucket_t)
                                      #endif
                                      );

        snprintf(annotation,
                 sizeof(annotation),
                 "ApplyMask: word_bits=%ju word_start=%ju word_stop=%ju step_words=%ju mask_bits=%s focus_start=%ju focus_stop=%ju bitrange=%ju-%ju",
                 (uintmax_t)bitcount_type(bitbucket_t),
                 (uintmax_t)range_start_index,
                 (uintmax_t)range_stop_index,
                 (uintmax_t)step,
                 mask_bits_text,
                 (uintmax_t)(range_start_index * bitcount_type(bitbucket_t)),
                 (uintmax_t)((range_stop_index + 1) * bitcount_type(bitbucket_t) - 1),
                 (uintmax_t)(range_start_index * bitcount_type(bitbucket_t)),
                 (uintmax_t)((range_stop_index + 1) * bitcount_type(bitbucket_t) - 1));

        if (primes_log_should_explain(8)) {
            primes_log_emit_verbose(8, option.verbose_level, annotation);
        }

        if (primes_log_should_trace(8)) {
            const uint64_t target_capacity = range_stop_index >= range_start_index ? (uint64_t)((range_stop_index - range_start_index) / step) + 1 : 0;
            if (target_capacity > 0) {
                mask_target_words = (uint64_t*)malloc(sizeof(uint64_t) * (size_t)target_capacity);
                mask_target_slots = (uint32_t*)malloc(sizeof(uint32_t) * (size_t)target_capacity);
            }
            if ((target_capacity == 0) || (mask_target_words && mask_target_slots)) {
                for (counter_t word_index = range_start_index; word_index <= range_stop_index; word_index += step) {
                    mask_target_words[mask_target_count] = (uint64_t)word_index;
                    mask_target_slots[mask_target_count] = 0;
                    mask_target_count++;
                }
                trace_record_applymask_step_labeled(bitstorage,
                                                    annotation,
                                                    "ApplyMask",
                                                    8,
                                                    (uint64_t)bitcount_type(bitbucket_t),
                                                    (uint64_t)range_start_index,
                                                    (uint64_t)range_stop_index,
                                                    (uint64_t)step,
                                                    mask_bits,
                                                    mask_count,
                                                    NULL,
                                                    0,
                                                    mask_target_words,
                                                    mask_target_slots,
                                                    mask_target_count);
            }
        }

        free(mask_target_words);
        free(mask_target_slots);
    }

    logEnds8(bitstorage, time_applyMask, "ApplyMask_index%s: finished applying mask\n", STR(suffix));
}

#include "../generic/variants/cleansuffix.h"

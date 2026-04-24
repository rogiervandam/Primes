#ifndef APPLYMASK_PAIR_GUARD
    #define APPLYMASK_PAIR_GUARD

    #include <stdio.h>
    #include "../trace/sieve_trace.h"

    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_applyMask_pair.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_VECTORS_STAGE) || defined(BUILD_WORDS_STAGE)

#include "../generic/variants/setsuffix.h"

static inline void __attribute__((always_inline, hot, aligned(cache_line_bytes)))
function(applyMask_index_pair,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step, const bitbucket_t mask1, const bitbucket_t mask2) 
{
    logBegins8(bitstorage, time_applyMask_pair, "ApplyMaskPair_index%s: apply %s (%ju bit) mask in pairs with step %ju in bitrange (%ju - %ju)", STR(suffix), STR(bitbucket_t), bitcount_type(bitbucket_t), (uintmax_t)step, (uintmax_t)range_start * bitcount_type(bitbucket_t), (uintmax_t)(range_stop + 1) * bitcount_type(bitbucket_t) - 1);

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

    if (primes_log_should_trace(8) || primes_log_should_explain(8)) {
        char annotation[4096] = {0};
        char mask1_bits_text[2048] = {0};
        char mask2_bits_text[2048] = {0};
        uint32_t mask1_bits[1024] = {0};
        uint32_t mask2_bits[1024] = {0};
        uint64_t* mask_target_words = NULL;
        uint32_t* mask_target_slots = NULL;
        uint32_t mask_target_count = 0;
        uint32_t mask1_count = 0;
        uint32_t mask2_count = 0;

        #if defined(variant_base_type_t) && defined(BITBUCKET_ELEMENTS)
        mask1_count = primes_trace_collect_mask_bits(mask1_bits,
                                                     1024,
                                                     &mask1,
                                                     sizeof(variant_base_type_t),
                                                     BITBUCKET_ELEMENTS,
                                                     bitcount_type(variant_base_type_t));
        mask2_count = primes_trace_collect_mask_bits(mask2_bits,
                                                     1024,
                                                     &mask2,
                                                     sizeof(variant_base_type_t),
                                                     BITBUCKET_ELEMENTS,
                                                     bitcount_type(variant_base_type_t));
        #else
        mask1_count = primes_trace_collect_mask_bits(mask1_bits,
                                                     1024,
                                                     &mask1,
                                                     sizeof(bitbucket_t),
                                                     1,
                                                     bitcount_type(bitbucket_t));
        mask2_count = primes_trace_collect_mask_bits(mask2_bits,
                                                     1024,
                                                     &mask2,
                                                     sizeof(bitbucket_t),
                                                     1,
                                                     bitcount_type(bitbucket_t));
        #endif

        primes_trace_format_mask_bits(mask1_bits_text,
                                      sizeof(mask1_bits_text),
                                      &mask1,
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
        primes_trace_format_mask_bits(mask2_bits_text,
                                      sizeof(mask2_bits_text),
                                      &mask2,
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
                 "ApplyMaskPair: word_bits=%ju word_start=%ju word_stop=%ju step_words=%ju mask1_bits=%s mask2_bits=%s focus_start=%ju focus_stop=%ju bitrange=%ju-%ju",
                 (uintmax_t)bitcount_type(bitbucket_t),
                 (uintmax_t)range_start,
                 (uintmax_t)range_stop,
                 (uintmax_t)step,
                 mask1_bits_text,
                 mask2_bits_text,
                 (uintmax_t)(range_start * bitcount_type(bitbucket_t)),
                 (uintmax_t)((range_stop + 1) * bitcount_type(bitbucket_t) - 1),
                 (uintmax_t)(range_start * bitcount_type(bitbucket_t)),
                 (uintmax_t)((range_stop + 1) * bitcount_type(bitbucket_t) - 1));

        log8(annotation);

        if (primes_log_should_trace(8)) {
            const uint64_t pair_capacity = range_stop > range_start ? (uint64_t)(((range_stop - range_start - 1) / step) + 1) : 0;
            const uint64_t target_capacity = pair_capacity * 2 + 1;
            if (target_capacity > 0) {
                mask_target_words = (uint64_t*)malloc(sizeof(uint64_t) * (size_t)target_capacity);
                mask_target_slots = (uint32_t*)malloc(sizeof(uint32_t) * (size_t)target_capacity);
            }
            if ((target_capacity == 0) || (mask_target_words && mask_target_slots)) {
                for (counter_t word_index = range_start; word_index < range_stop; word_index += step) {
                    mask_target_words[mask_target_count] = (uint64_t)word_index;
                    mask_target_slots[mask_target_count] = 0;
                    mask_target_count++;

                    mask_target_words[mask_target_count] = (uint64_t)(word_index + 1);
                    mask_target_slots[mask_target_count] = 1;
                    mask_target_count++;
                }
                if (range_start <= range_stop && ((range_stop - range_start) % step) == 0) {
                    mask_target_words[mask_target_count] = (uint64_t)range_stop;
                    mask_target_slots[mask_target_count] = 0;
                    mask_target_count++;
                }

                trace_record_applymask_step_labeled(bitstorage,
                                                    annotation,
                                                    "ApplyMaskPair",
                                                    9,
                                                    (uint64_t)bitcount_type(bitbucket_t),
                                                    (uint64_t)range_start,
                                                    (uint64_t)range_stop,
                                                    (uint64_t)step,
                                                    mask1_bits,
                                                    mask1_count,
                                                    mask2_bits,
                                                    mask2_count,
                                                    mask_target_words,
                                                    mask_target_slots,
                                                    mask_target_count);
            }
        }

        free(mask_target_words);
        free(mask_target_slots);
    }

    logEnds8(bitstorage, time_applyMask_pair, "ApplyMaskPair_index%s: finished applying mask in pairs\n", STR(suffix));
}

#endif

#include "../generic/variants/cleansuffix.h"

#ifndef SMALLSTEP_ROTATE_PAIR_GUARD
    #define SMALLSTEP_ROTATE_PAIR_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_setBitsTrue_smallstep_rotate_pair.h"
    #include "../generic/variants/generate.h"
    
#elif defined(BUILD_VECTORS_STAGE) 

static inline void __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
// function(create_mask_smallstep_rotate_pair,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step)
function(create_mask_smallstep_rotate_pair,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step, variant_base_type_t base_pattern)
{
    // register bitbucket_t* restrict bitstorage_vector = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    // __builtin_prefetch(&bitstorage_vector[index_type(range_start, bitbucket_t)], 1, 3); // prefetch the memory that will be written soon while creating mask

    // build the wordsize pattern, pattern_size en pattern_wordshift efficiently
    register const bitshift_t step_shift = bitindex_calc_type(step, variant_base_type_t); // to enable the compiler to optimize the shift
    register bitshift_t pattern_size = step_shift;
    register variant_base_type_t pattern = base_pattern;
    for (;pattern_size < bitcount_type(variant_base_type_t); pattern_size += step_shift) { pattern |= base_pattern << pattern_size; }
    const bitshift_t pattern_wordshift = pattern_size - bitcount_type(variant_base_type_t);

    // prepare the vectorsized shifts and mask
    register const variant_base_type_t pattern_vectorshift = (variant_base_type_t) ((pattern_wordshift * (bitshift_t)BITBUCKET_ELEMENTS) % step_shift) & mask_type(variant_base_type_t);
    register bitbucket_t pattern_vectorshift_vector = BITBUCKET_BASE(pattern_vectorshift);
    register bitbucket_t step_shift_vector = BITBUCKET_BASE(step_shift);
    const bitshift_t shift = bitindex_calc_type(range_start, variant_base_type_t); 
    bitbucket_t mark = BITBUCKET_BASE(pattern) << (BITBUCKET_BASE(shift) + (BITBUCKET_BASE(pattern_wordshift) * BITBUCKET_BYTEINDEX)) % BITBUCKET_BASE(step);

    // precaulcate the unique range_stop
    const counter_t stop_bucket = index_type(range_stop, bitbucket_t);
    const counter_t last_unique_bucket = index_type(range_start, bitbucket_t) + step - 1;
 
    // Process vectormasks in pairs from the cacheline
    #pragma GCC ivdep
    for (counter_t current_bucket = index_type(range_start, bitbucket_t); current_bucket <= last_unique_bucket; current_bucket += 2) {
        // __builtin_prefetch(&bitstorage_vector[current_bucket+step], 1, 3); // prefetch the memory that will be written soon while creating mask
        bitbucket_t mark2 = (mark << pattern_vectorshift_vector) | (mark >> (step_shift_vector - pattern_vectorshift_vector)); 
        function(applyMask_index_pair,suffix)(bitstorage, current_bucket, stop_bucket, step, mark, mark2);
        mark = (mark2 << pattern_vectorshift_vector) | (mark2 >> (step_shift_vector - pattern_vectorshift_vector)); 
    }
}

// static inline void __attribute__((always_inline, nonnull)) 
static void __attribute__((nonnull, aligned(cache_line_bytes))) 
function(setBitsTrue_smallstep_rotate_pair,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    logStart7(bitstorage, time_setBitsTrue_smallstep_rotate_pair, "setting bits step %3ju using smallstep%-10s in %ju bit range (%ju-%ju) with %ju bits to set; using %ju copies of %ju bit mask", 
        (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)), (uintmax_t)bitcount_type(bitbucket_t));

    const counter_t range_stop_next_bucketstart = (range_start | (mask_type(bitbucket_t)*2)) + 2; // find nicealignment

    if unlikely(range_stop_next_bucketstart + step * bitcount_type(bitbucket_t) > range_stop) {
        setBitsTrue_largestep_norepeat_uint8_unroll4(bitstorage, range_start, range_stop, step);
        logStop7(bitstorage, time_setBitsTrue_smallstep_rotate_pair, "finished setting bits step %3ju in %ju bit range (%ju-%ju) with %ju bits to set; handed of to setBitsTrue_range because of a short range (%ju-%ju)", 
            (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)range_start, (uintmax_t)range_stop);
        return;
    }

    const counter_t range_start_new = setBitsTrue_range_return_uint8(bitstorage, range_start, range_stop_next_bucketstart, step);
    function(create_mask_smallstep_rotate_pair,suffix)(bitstorage, range_start_new, range_stop, step, 1ULL);

    logStop7(bitstorage, time_setBitsTrue_smallstep_rotate_pair, "finished setting bits step %3ju using smallstep%-10s in %ju bit range (%ju-%ju) with %ju bits to set; using %ju copies of %ju bit mask", 
        (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)), (uintmax_t)bitcount_type(bitbucket_t));
}
#endif




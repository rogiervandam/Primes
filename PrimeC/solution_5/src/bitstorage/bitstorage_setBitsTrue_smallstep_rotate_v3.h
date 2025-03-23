
#undef subfunction
#define subfunction _rotate_v3
#include "../generic/setsuffix.h"

#include <immintrin.h>

#undef bitbucket_t
typedef __m256i bitbucket_t;

static inline void __attribute__((always_inline)) NAME(create_mask_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    timer_lapstart(time_create_mask_vector_smallstep);

    bitbucket_t* restrict bitstorage_vector = (bitbucket_t*)bitstorage;
    
    // Early prefetch of data
    // _mm_prefetch((const char*)&bitstorage_vector[index_type(range_start, bitbucket_t)], _MM_HINT_T0);

    // Calculate bit pattern based on step
    register const bitshift_t step_shift = bitindex_calc_type(step, uint64_t);
    
    // Pre-generate the pattern using fast bit arithmetic
    register uint64_t pattern = 0ULL;
    for (bitshift_t shift = 0; shift < 64; shift += step_shift) {
        pattern |= 1ULL << shift;
    }
    
    // Calculate the patterns for all 64-bit parts of the 256-bit vector
    uint64_t masks[4] __attribute__((aligned(32))); // Ensure proper alignment
    
    // Calculate appropriate offsets for each 64-bit segment
    const uint64_t base_shift = (bitindex_calc_type(range_start, uint64_t)) % step;
    
    // Create shifted patterns for each 64-bit segment - unrolled for performance
    uint64_t adjusted_shift0 = (base_shift + 0 * (64 % step_shift)) % step;
    uint64_t adjusted_shift1 = (base_shift + 1 * (64 % step_shift)) % step;
    uint64_t adjusted_shift2 = (base_shift + 2 * (64 % step_shift)) % step;
    uint64_t adjusted_shift3 = (base_shift + 3 * (64 % step_shift)) % step;
    
    masks[0] = pattern << adjusted_shift0;
    masks[1] = pattern << adjusted_shift1;
    masks[2] = pattern << adjusted_shift2;
    masks[3] = pattern << adjusted_shift3;
    
    // Load the patterns into AVX2 register
    __m256i mask_vector = _mm256_load_si256((__m256i*)masks);
    
    // Apply masks to entire range
    register const counter_t vector_max = index_type(range_stop, bitbucket_t);
    counter_t current_vector = index_type(range_start, bitbucket_t);
    
    // Process in blocks of 4 for better throughput
    const counter_t block_size = 4;
    const counter_t safe_vector_max = vector_max - block_size;
    
    #pragma GCC ivdep
    while (current_vector < safe_vector_max) {
        // Prefetch ahead
        _mm_prefetch((const char*)&bitstorage_vector[current_vector + 8], _MM_HINT_T1);
        
        // Store current mask to memory
        _mm256_store_si256(&bitstorage_vector[current_vector], mask_vector);
        _mm256_store_si256(&bitstorage_vector[current_vector + 1], mask_vector);
        _mm256_store_si256(&bitstorage_vector[current_vector + 2], mask_vector);
        _mm256_store_si256(&bitstorage_vector[current_vector + 3], mask_vector);
        
        // Rotate mask for next block - using constant indices to fix the compile error
        uint64_t rotated_masks[4] __attribute__((aligned(32)));
        
        // Extract each 64-bit element with constant indices
        rotated_masks[0] = _mm256_extract_epi64(mask_vector, 0);
        rotated_masks[1] = _mm256_extract_epi64(mask_vector, 1);
        rotated_masks[2] = _mm256_extract_epi64(mask_vector, 2);
        rotated_masks[3] = _mm256_extract_epi64(mask_vector, 3);
        
        // Rotate each mask by step_shift
        rotated_masks[0] = (rotated_masks[0] << step_shift) | (rotated_masks[0] >> (64 - step_shift));
        rotated_masks[1] = (rotated_masks[1] << step_shift) | (rotated_masks[1] >> (64 - step_shift));
        rotated_masks[2] = (rotated_masks[2] << step_shift) | (rotated_masks[2] >> (64 - step_shift));
        rotated_masks[3] = (rotated_masks[3] << step_shift) | (rotated_masks[3] >> (64 - step_shift));
        
        // Load rotated masks back into vector
        mask_vector = _mm256_load_si256((__m256i*)rotated_masks);
        
        current_vector += block_size;
    }
    
    // Handle remaining vectors
    while (current_vector < vector_max) {
        _mm256_store_si256(&bitstorage_vector[current_vector], mask_vector);
        
        // Rotate mask for next iteration - with constant indices
        uint64_t rotated_masks[4] __attribute__((aligned(32)));
        
        rotated_masks[0] = _mm256_extract_epi64(mask_vector, 0);
        rotated_masks[1] = _mm256_extract_epi64(mask_vector, 1);
        rotated_masks[2] = _mm256_extract_epi64(mask_vector, 2);
        rotated_masks[3] = _mm256_extract_epi64(mask_vector, 3);
        
        rotated_masks[0] = (rotated_masks[0] << step_shift) | (rotated_masks[0] >> (64 - step_shift));
        rotated_masks[1] = (rotated_masks[1] << step_shift) | (rotated_masks[1] >> (64 - step_shift));
        rotated_masks[2] = (rotated_masks[2] << step_shift) | (rotated_masks[2] >> (64 - step_shift));
        rotated_masks[3] = (rotated_masks[3] << step_shift) | (rotated_masks[3] >> (64 - step_shift));
        
        mask_vector = _mm256_load_si256((__m256i*)rotated_masks);
        
        current_vector++;
    }

    _mm256_store_si256(&bitstorage_vector[current_vector], mask_vector);


    // Apply the final mask to handle any edge cases
    // NAME(applyMask_v3,fullvariantsuffix)(bitstorage_vector, step, range_stop, mask_vector, current_vector);

    timer_laptime(time_create_mask_vector_smallstep); 
}
static inline void __attribute__((always_inline)) NAME(setBitsTrue_smallstep,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(printf("Setting bits step %3ju using optimized AVX2 in %ju bit range (%ju-%ju)", 
           (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),
           (uintmax_t)range_start, (uintmax_t)range_stop));
    timer_lapstart(time_setBitsTrue_largestep_vector_wordstep);

    // Handle small ranges with direct bit setting
    const counter_t min_vector_range = 1024; // Minimum size for vectorization to be beneficial
    if (safe_diff(range_stop, range_start) < min_vector_range) {
        setBitsTrue_range(bitstorage, range_start, step, range_stop);
        timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6(printf("\n"));
        return;
    }

    // Align to vector boundary for better performance
    const counter_t range_start_nexttvector = vectorstart_type(range_start, bitbucket_t) + 256;
    
    // Handle initial unaligned portion using scalar code
    const counter_t range_start_new = setBitsTrue_range_return(bitstorage, range_start, step, range_start_nexttvector);
    
    // Process the bulk with vectorized code
    NAME(create_mask_smallstep,suffix)(bitstorage, range_start_new, step, range_stop);

    timer_laptime(time_setBitsTrue_largestep_vector_wordstep); verbose6(printf("\n"));
}

#include "../generic/cleansuffix.h"
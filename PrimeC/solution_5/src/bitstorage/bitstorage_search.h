// Finds the index of the next unset (false) bit in a bitstorage, starting from a given index.
#ifndef BITSTORAGE_SEARCH_INCLUDE_GUARD
    #define BITSTORAGE_SEARCH_INCLUDE_GUARD
    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_search.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_WORDS_STAGE) && (unrolls == 1)

// convenience macro to build function names and calls with different suffixes for different implementations
#define checkBitTrue_suffix(...)             NAME(checkBitTrue,suffix            )(__VA_ARGS__)
#define checkBitFalse_suffix(...)            NAME(checkBitFalse,suffix           )(__VA_ARGS__)
#define countInvalidInStripe_suffix(...)     NAME(countInvalidInStripe,suffix    )(__VA_ARGS__)
#define countBitsTrue_suffix(...)            NAME(countBitsTrue,suffix           )(__VA_ARGS__)
#define faultInvalidInStripe_suffix(...)     NAME(faultInvalidInStripe,suffix    )(__VA_ARGS__)
#define searchBitFalse_suffix(...)           NAME(searchBitFalse,suffix          )(__VA_ARGS__)
#define searchBitFalse_largestep_suffix(...) NAME(searchBitFalse_largestep,suffix)(__VA_ARGS__)

static inline bitbucket_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_suffix(const void* restrict bitstorage, register counter_t index) 
{
    bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    return (bitstorage_sized[index_type(index, bitbucket_t)] & markmask_type(index, bitbucket_t));
}

static inline bitbucket_t __attribute__((always_inline, hot, nonnull)) 
checkBitFalse_suffix(const void* restrict bitstorage, register counter_t index) 
{
    return !checkBitTrue_suffix(bitstorage, index);
}

static inline counter_t __attribute__((always_inline)) 
function(countInvalidInStripe,suffix)(const void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    counter_t count = 0;
    for (counter_t index = range_start; index < range_stop; index += step) {
        if (checkBitFalse_suffix(bitstorage, index)) count++;
    }
    return count;
}

static inline counter_t __attribute__((always_inline)) 
function(countBitsTrue,suffix)(const void* bitstorage, const counter_t range_start, const counter_t range_stop) 
{
    counter_t count = 0;
    for (counter_t index = range_start; index < range_stop; index++) {
        if (checkBitTrue_suffix(bitstorage, index)) count++;
    }
    return count;
}

static inline counter_t __attribute__((always_inline)) 
function(faultInvalidInStripe,suffix)(const void* restrict bitstorage, const counter_t range_start, const counter_t range_stop, const counter_t step) 
{
    counter_t count = 0;
    for (counter_t index = range_start; index < range_stop; index += step) {
        count += checkBitFalse_suffix(bitstorage, index) ? 1 : 0;
        if (count) {
            printf("In range from %ju to %ju, found bit not set at index %ju\n", (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)index);
            exit(0);
        }
    }
    return count;
}

// Finds the index of the next unset (false) bit in a bitmap, starting from a given index
// Optimized function for short ranges which are common
static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
function(searchBitFalse,suffix)(void* restrict bitstorage, register counter_t index) 
{
    logStart9(bitstorage, time_searchBitFalse, "searchBitFalse from prime %ju (step %ju)", (uintmax_t)index, (uintmax_t)index*2+1);

    // #pragma GCC ivdep
    // #pragma GCC unroll 4
    for (;checkBitTrue_suffix(bitstorage, ++index);)

    logStop9(bitstorage, time_searchBitFalse, " next prime %ju (step %ju)\n", (uintmax_t) index, (uintmax_t)index*2+1);
    return index;
}


// Finds the index of the next unset (false) bit in a bitmap, starting from a given index
// Optimized function for large ranges which are not common
static inline counter_t __attribute__((always_inline, hot, nonnull, const)) 
function(searchBitFalse_largestep,suffix)(const void* restrict bitstorage, register counter_t index) 
{
    logStart9(bitstorage, time_searchBitFalse_largestep, "searchBitFalse_largestep from prime %ju (step %ju)", (uintmax_t)index, (uintmax_t)index*2+1);

    bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    // Move to the next position after the starting index
    ++index;
    
    // Get the current word and bit position
    register const bitshift_t bit_index_in_word = bitindex_calc_type(index, bitbucket_t);
    register counter_t word_index = index_type(index, bitbucket_t);
    register bitbucket_t current_word = bitstorage_sized[word_index];

    if likely(bit_index_in_word) {
        current_word >>= bit_index_in_word ;
        current_word |= (bitstorage_sized[word_index+1] << (bitcount_type(bitbucket_t) - bit_index_in_word));

        if (current_word == safe_fill_type(bitbucket_t)) {
            current_word = bitstorage_sized[++word_index];
            index += (bitcount_type(bitbucket_t) - bit_index_in_word);
        }
    }

    while (current_word == safe_fill_type(bitbucket_t)) {
        current_word = bitstorage_sized[++word_index];
        index += bitcount_type(bitbucket_t);
    }

    logStop9(bitstorage, time_searchBitFalse_largestep, " next prime %ju (step %ju)\n", (uintmax_t) (index + builtin_ctz(~current_word)), (uintmax_t)(index + builtin_ctz(~current_word))*2+1);

    // Note: ~current_word inverts the bits so we find first 0 instead of 1
    return index + builtin_ctz(~current_word);
}
#endif


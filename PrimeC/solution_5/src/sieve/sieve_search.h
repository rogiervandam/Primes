// Finds the index of the next unset (false) bit in a bitstorage, starting from a given index.
static inline counter_t __attribute__((always_inline)) searchBitFalse(const bitword_t* restrict bitstorage, register counter_t index) 
{
    verbose8( printf("searchBitFalse from prime %ju (step %ju)", (uintmax_t)index, (uintmax_t)index*2+1); )
    timer_lapstart(time_searchBitFalse);

    // Normal function - really fast for small offsets
    do { index++; } while (bitstorage[wordindex(index)] & markmask_calc(index));

    timer_laptime(time_searchBitFalse); verbose8( printf(" next prime %ju (step %ju)\n", (uintmax_t) index, (uintmax_t)index*2+1); )
    return index;
}

// Finds the index of the next unset (false) bit in a bitmap, starting from a given index
// Optimized function for large ranges which are not common
static inline counter_t __attribute__((always_inline)) searchBitFalse_largestep(const bitword_t* restrict bitstorage, register counter_t index) 
{
    verbose8( printf("searchBitFalse_largestep from %ju (step %ju)", (uintmax_t)index, (uintmax_t)index*2+1); )
    timer_lapstart(time_searchBitFalse_largestep);

    // Move to the next position after the starting index
    ++index;
    
    // Get the current word and bit position
    register const bitshift_t bit_index  = bitindex_calc(index);
    register counter_t word_index = wordindex(index);
    register bitword_t current_word = bitstorage[word_index];

    if likely(bit_index) {
        current_word >>= bit_index ;
        current_word |= (bitstorage[word_index+1] << (WORD_SIZE_bitshift - bit_index));

        if (current_word == SAFE_FILL) {
            current_word = bitstorage[++word_index];
            index += (WORD_SIZE_bitshift - bit_index);
        }
    }

    while (current_word == SAFE_FILL) {
        current_word = bitstorage[++word_index];
        index += WORD_SIZE_bitshift;
    }

    timer_laptime(time_searchBitFalse_largestep); verbose8( printf(" next prime %ju (step %ju)\n", (uintmax_t) (index + builtin_ctz(~current_word)), (uintmax_t)(index + builtin_ctz(~current_word))*2+1));

    // Note: ~current_word inverts the bits so we find first 0 instead of 1
    return index + builtin_ctz(~current_word);
}
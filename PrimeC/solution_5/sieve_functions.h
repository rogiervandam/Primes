// allocate memory for a sieve block
// NOTES:
// - use cache lines as much as possible - alignment might be key
// - moved clearing the sieve with 0 to the sieve_block_extend - it gave weird malloc problems at this point
// - switched to one malloc for the sieve, instead of one for the sieve and one for the storage
// - bitstorage will be aligned on the anticiped_cache_line_bytesize

static inline struct sieve_t * __attribute__((always_inline)) sieve_create(const counter_t size) 
{
    struct sieve_t *sieve = malloc(((sizeof(struct sieve_t) + (size_t)(size>>1))|(anticiped_cache_line_bytesize-1))+1+anticiped_cache_line_bytesize);
    sieve->bitstorage     = __builtin_assume_aligned((void *) (( (uintptr_t) (sieve + sizeof(struct sieve_t))|(anticiped_cache_line_bytesize-1))+1),anticiped_cache_line_bytesize);
    sieve->bits           = size >> 1;
    sieve->bitstorage = __builtin_assume_aligned(sieve->bitstorage, anticiped_cache_line_bytesize);
    return sieve;
}

static inline void __attribute__((always_inline)) sieve_clear(struct sieve_t *sieve) 
{
    memset(sieve->bitstorage, SAFE_ZERO, sieve->bits / 8);
}

static inline void __attribute__((always_inline)) sieve_delete(struct sieve_t *sieve) 
{
    free(sieve);
}

// Finds the index of the next unset (false) bit in a bitmap, starting from a given index.
static inline counter_t __attribute__((always_inline)) searchBitFalse(const bitword_t* restrict bitstorage, register counter_t index) {

    verbose5( printf("searchBitFalse from prime %ju (step %ju)", (uintmax_t)index, (uintmax_t)index*2+1); )
    timer_lapstart(time_searchBitFalse);

    // Normal function - really fast for small offsets
    do { index++; } while (bitstorage[wordindex(index)] & markmask(index));

    timer_laptime(time_searchBitFalse); verbose5( printf(" next prime %ju (step %ju)\n", (uintmax_t) index, (uintmax_t)index*2+1); )

    return index;
}

// Finds the index of the next unset (false) bit in a bitmap, starting from a given index
// Optimized function for large ranges which are not common
static inline counter_t __attribute__((always_inline)) searchBitFalse_largeRange(const bitword_t* restrict bitstorage, register counter_t index) 
{
    verbose5( printf("searchBitFalse_largeRange from %ju (step %ju)", (uintmax_t)index, (uintmax_t)index*2+1); )
    timer_lapstart(time_searchBitFalse_largeRange);

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

    timer_laptime(time_searchBitFalse_largeRange); verbose5( printf(" next prime %ju (step %ju)\n", (uintmax_t) (index + builtin_ctz(~current_word)), (uintmax_t)(index + builtin_ctz(~current_word))*2+1));
    // Find the first unset bit using builtin_ffs
    // Note: ~current_word inverts the bits so we find first 0 instead of 1
    return index + builtin_ctz(~current_word);
}

// apply the same word mask at large ranges
// manually unlooped - this here is where the main speed increase comes from
// idea from PrimeRust/solution_1 by Michael Barber 
static inline void __attribute__((always_inline)) applyMask_word(bitword_t* restrict bitstorage, const counter_t step, const counter_t range_stop, const bitword_t mask, const counter_t index_word) 
{
    verbose5( printf("Applying mask %ju at step %ju in range %ju", (uintmax_t)mask, (uintmax_t)step, (uintmax_t)range_stop); )
    timer_lapstart(time_applyMask_word);

    register bitword_t* restrict index_ptr = __builtin_assume_aligned(&bitstorage[index_word], sizeof(bitword_t));

    register const counter_t step_2 = step << 1;
    register const counter_t step_3 = step_2 + step;
    register const counter_t step_4 = step << 2;

    const counter_t range_stop_word = wordindex(range_stop);
    register const bitword_t* restrict fast_loop_ptr = __builtin_assume_aligned(&bitstorage[((range_stop_word>step_4) ? (range_stop_word - step_4):0)], sizeof(bitword_t));

    #pragma GCC ivdep
    while (index_ptr < fast_loop_ptr) {
        // __builtin_prefetch(index_ptr + step_4, 1, 3); // prefetch the memory that will be written soon
        *index_ptr            |= mask; 
        *(index_ptr + step  ) |= mask; 
        *(index_ptr + step_2) |= mask; 
        *(index_ptr + step_3) |= mask; 
        index_ptr += step_4;
    }

    register const bitword_t* restrict range_stop_ptr = __builtin_assume_aligned(&bitstorage[range_stop_word], sizeof(bitword_t));

    for (counter_t i=4; i-- && likely(index_ptr < range_stop_ptr); index_ptr += step) { // signal compiler that only <4 iterations are left
        *index_ptr |= mask; 
    }

    // doing this instead of index_ptr <= above is faster. unexplained. 
    if (index_ptr == range_stop_ptr) { // index_ptr could also end above range_stop_ptr, depending on steps. 
        *index_ptr |= mask; // chop not needed is block-size aligned with word size
    }

    timer_laptime(time_applyMask_word); verbose5( printf("\n"); )
}

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// By joining the masks and then writing to memory, we might save some time.
// This is especially true for small steps over long ranges
// but it needs tuning, because there is some overhead of checking if the next step is in the same word

static inline void __attribute__((always_inline)) setBitsTrue_smallStep_repeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + WORD_SIZE_counter * step;

    verbose5( printf("Setting bits step %ju in %ju bit range (%ju-%ju) using smallstep-repeat (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*WORD_SIZE_counter))); )
    timer_lapstart(time_setBitsTrue_smallStep_repeat);

    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_word = wordindex(index);                        // set index_word here because the for loop will change index
        register bitword_t mask = SAFE_ZERO;
        for(register const counter_t index_word_start = wordstart(index); wordstart(index) == index_word_start; index += step) mask |= markmask(index);
        applyMask_word(bitstorage, step, range_stop, mask, index_word);
    }

    timer_laptime(time_setBitsTrue_smallStep_repeat); verbose5( printf("\n"); )
}

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// is we know that the mask will not repeat, we can save some time by not checking
static inline counter_t  __attribute__((always_inline)) setBitsTrue_smallStep_norepeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose5( printf("Setting bits step %ju in %ju bit range (%ju-%ju) using smallstep-norepeat (%ju unique occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_smallStep_norepeat);

    register counter_t index = range_start;

    // #pragma GCC no_unroll no_vector
    for (; index < range_stop;) {
        register const counter_t index_word = wordindex(index);                    // set index_word here because the for loop will change index
        register bitword_t mask = SAFE_ZERO;
        for(; wordindex(index) == index_word; index += step) mask |= markmask(index);
        bitstorage[index_word] |= mask;
    }
    timer_laptime(time_setBitsTrue_smallStep_norepeat); verbose5( printf("\n"); )
    return index;
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
static inline void  __attribute__((always_inline)) setBitsTrue_largeRange_repeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + WORD_SIZE_counter * step;
    verbose5(  printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange-repeat (%ju repeating occurances)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(WORD_SIZE_counter*step))); )
    timer_lapstart(time_setBitsTrue_largeRange_vector);
    for (register counter_t index = range_start; index < range_stop_unique; index += step) {
        applyMask_word(bitstorage, step, range_stop, markmask(index), wordindex(index));
    }
    timer_laptime(time_setBitsTrue_largeRange_vector); verbose5( printf("\n"); )
}

// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
static inline void __attribute__((always_inline)) setBitsTrue_largeRange_norepeat(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose5( printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange-norepeat (%ju unique occurances)..", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_largeRange_norepeat);

    const counter_t step_2 = step * 2;
    #if is_signed(counter_t)
    const counter_t loop_stop = range_stop - step_2;
    #else
    const counter_t loop_stop = (range_stop > step_2) ? range_stop - step_2 : 0;
    #endif
    register counter_t index = range_start;

    #pragma GCC ivdep
    for (; index < loop_stop; index += step_2) {
        bitstorage[wordindex(index         )] |= markmask(index);
        bitstorage[wordindex(index + step  )] |= markmask(index + step  );
    }

    for (counter_t i=2; i-- && index < range_stop; index += step) 
        bitstorage[wordindex(index)] |= markmask(index);

    if unlikely(index==range_stop)
        bitstorage[wordindex(index)] |= markmask(index);
    
    timer_laptime(time_setBitsTrue_largeRange_norepeat); verbose5( printf("\n"); )
}

#include "sieve_function_vector.h"

static inline counter_t __attribute__((always_inline)) sieve_block_stripe(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe);

    counter_t prime = prime_start;
    const counter_t mediumstep_faster = global_mediumstep_faster/2;
    const counter_t prime_endloop1 = min(mediumstep_faster, prime_max);

    while (prime < prime_endloop1) {
        const counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);

        // early exit when start is beyond block
        if unlikely(block_stop < start) {
            timer_laptime(time_sieve_block_stripe); verbose5( printf("\n"); )
            return prime;
        }
        if likely(start < block_start) {
            start = (block_start + prime) + prime - ((block_start + prime) % step);
            // there might be higher primes that will align before block_stop
            // early exit (optional; setbittrue does not set beyond block_stop)
            if (block_stop < start) {
                prime = searchBitFalse(bitstorage, prime);
                continue; 
            }
        }

        setBitsTrue_largeRange_vector(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    while (prime < prime_max) {
        counter_t step  = prime * 2 + 1;
        counter_t start = prime * (step + 1);

        // early exit when start is beyond block
        if unlikely(block_stop < start) {
            timer_laptime(time_sieve_block_stripe); verbose5( printf("\n"); )
            return prime;
        }
        if likely(start < block_start) {
            start = (block_start + prime) + prime - ((block_start + prime) % step);

            // there might be higher primes that will align before block_stop
            // early exit (optional; setbittrue does not set beyond block_stop)
            if (block_stop < start) {
                prime = searchBitFalse(bitstorage, prime);
                continue; 
            }
        }

        const counter_t range_stop_unique =  start + WORD_SIZE_counter * step;
        if likely(range_stop_unique <= block_stop) { // the range will repeat itself; try to resuse the mask
            setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
        } else {
            setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
        }

        // setBitsTrue_largeRange(bitstorage, start, step, block_stop);
        prime = searchBitFalse_largeRange(bitstorage, prime);
    }

    timer_laptime(time_sieve_block_stripe); verbose5( printf("\n"); )
    return prime; 
}

static inline __attribute__((always_inline)) counter_t sieve_block_stripe0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nBlock stripe for block %ju - %ju\n",(uintmax_t)0,(uintmax_t)block_stop); )
    timer_lapstart(time_sieve_block_stripe0);

    const counter_t prime = sieve_block_stripe(bitstorage, 0, block_stop, prime_start, prime_max);

    // counter_t prime = prime_start;
    // const counter_t mediumstep_faster = global_mediumstep_faster;
    // // const counter_t prime_endloop1 = min(mediumstep_faster, prime_max);
    // const counter_t prime_endloop1 = min(mediumstep_faster, prime_max);;
    
    // while (prime < prime_endloop1) {
    //     const counter_t step  = prime * 2 + 1;
    //     const counter_t start = prime * (step + 1);
    //     if unlikely(block_stop < start) return prime;
    //     setBitsTrue_largeRange_vector(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse(bitstorage, prime);
    // }

    // while (prime < prime_max) {
    //     counter_t step  = prime * 2 + 1;
    //     counter_t start = prime * (step + 1);
    //     if unlikely(block_stop < start) return prime;
        
    //     const counter_t range_stop_unique =  start + WORD_SIZE_counter * step;
    //     if likely(range_stop_unique <= block_stop) { // the range will repeat itself; try to resuse the mask
    //         setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
    //     } else {
    //         setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
    //     }
    //     prime = searchBitFalse_largeRange(bitstorage, prime);
    // }

    timer_laptime(time_sieve_block_stripe0); verbose5( printf("\n"); )
    return prime; 
}

// assume that prim
static inline  __attribute__((always_inline)) counter_t sieve_stripe(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    verbose5(  printf("\nStripe for sieve %ju - %ju start with prime %ju up to prime %ju\n",(uintmax_t)0, (uintmax_t)block_stop, (uintmax_t)prime_start, (uintmax_t)prime_max ); )
    timer_lapstart(time_sieve_stripe);

    const counter_t prime = sieve_block_stripe0(bitstorage, block_stop, prime_start, prime_max);

    // counter_t prime = prime_start;
    // const counter_t largestep_faster = global_largestep_faster; // largestep_faster is twice the prime size
    // // const counter_t prime_endloop1 = min(largestep_faster, prime_max);
    // const counter_t prime_endloop1 = min(largestep_faster, prime_max);
    // // allow the use of vector optimizations in a tunable range
    // while (prime < prime_endloop1) {
    //     const counter_t step  = prime * 2 + 1;
    //     const counter_t start = prime * (step + 1);
    //     setBitsTrue_largeRange_vector(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse(bitstorage, prime);
    // }

    // while (prime < prime_max) {
    //     const counter_t step  = prime * 2 + 1;
    //     const counter_t start = prime * (step + 1);
    //     const counter_t range_stop_unique = start + WORD_SIZE_counter * step;
    //     if likely(range_stop_unique <= block_stop) { // the range will repeat itself; try to resuse the mask
    //         setBitsTrue_largeRange_repeat(bitstorage, start, step, block_stop);
    //     } else {
    //         setBitsTrue_largeRange_norepeat(bitstorage, start, step, block_stop);
    //     }
    //     prime = searchBitFalse_largeRange(bitstorage, prime);
    // }

    timer_laptime(time_sieve_stripe); verbose5( printf("\n"); )
    return prime; 
}

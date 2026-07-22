// This file contains the continuePattern function that is used to extend (copy) a pattern in a bitstorage.
// The function is optimized for different sizes and offsets of the pattern and uses different algorithms for this.

#ifndef CONTINUEPATTERN_GUARD
    #define CONTINUEPATTERN_GUARD

    #include <stdio.h>
    #include "../trace/sieve_trace.h"
    #include "../generic/verbose.h"

    #define INCLUDE_FILE "../../../src/bitstorage/bitstorage_continuePattern.h"
    #include "../generic/variants/generate.h"

#elif defined(BUILD_WORDS_STAGE) 

    // included here because they don't have their own header
    #include "bitstorage_continuePattern_smallsize.h"
    #include "bitstorage_continuePattern_aligned.h"
    #include "bitstorage_continuePattern_shiftleft.h"
    #include "bitstorage_continuePattern_shiftright.h"

    // continue a pattern that start at <source_start> with a size of <size>.
    // repeat this pattern up to <destination_stop>.
    // for small sizes, this is done on a word level
    // for larger sizes, look at the offset / start bit and apply the appropriate algorithm.
    // note that these algorithms are general for bitstorage and have no specialized assumptions for the sieve application
    static inline void __attribute__((always_inline, nonnull)) 
    function(continuePattern,suffix)(void* restrict bitstorage, const counter_t source_start, const counter_t destination_stop, const counter_t size)
    {
        logStart6(bitstorage, time_continuePattern, "continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern (%ju copies) for range (%ju-%ju)", 
            (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, 
            (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size), (uintmax_t)source_start, (uintmax_t)destination_stop );

        if (size < bitcount_type(bitbucket_t)) {
            function(continuePattern_smallSize,suffix)(bitstorage, source_start, destination_stop, size);
            logStop6(bitstorage, time_continuePattern, "handled with smallsize%s source_start %ju destination_stop %ju size %ju for range (%ju-%ju)", 
                STR(suffix), (uintmax_t)source_start, (uintmax_t)destination_stop, (uintmax_t)size, (uintmax_t)source_start, (uintmax_t)destination_stop);
            return;
        }

        const bitshift_t copy_bit   = bitindex_calc_type(source_start + size, bitbucket_t);
        const bitshift_t source_bit = bitindex_calc_type(source_start, bitbucket_t);

        if      (source_bit > copy_bit) function(continuePattern_shiftleft ,suffix)(bitstorage, source_start, destination_stop, size);
        else if (source_bit < copy_bit) function(continuePattern_shiftright,suffix)(bitstorage, source_start, destination_stop, size);
        else                            function(continuePattern_aligned   ,suffix)(bitstorage, source_start, destination_stop, size);

        logStop6(bitstorage, time_continuePattern,"Finished continue pattern with source_start %ju destination_stop %ju size %ju", (uintmax_t)source_start, (uintmax_t)destination_stop, (uintmax_t)size);
    }

#endif

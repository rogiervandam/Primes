// This file contains the continuePattern function that is used to extend (copy) a pattern in a bitstorage.
// The function is optimized for different sizes and offsets of the pattern and uses different algorithms for this.
#undef bitbucket_t
#define bitbucket_t uint32_t
#undef variant_base_type_t
#define variant_base_type_t bitbucket_t
#define suffix _uint32

#include "bitstorage_continuePattern_smallsize.h"
#include "bitstorage_continuePattern_aligned.h"
#include "bitstorage_continuePattern_shiftleft.h"
#include "bitstorage_continuePattern_shiftright.h"
#include "../generic/verbose.h"

// continue a pattern that start at <source_start> with a size of <size>.
// repeat this pattern up to <destination_stop>.
// for small sizes, this is done on a word level
// for larger sizes, look at the offset / start bit and apply the appropriate algorithm.
// note that these algorithms are general for bitstorage and have no specialized assumptions for the sieve application
static inline void __attribute__((always_inline, nonnull)) 
function(continuePattern,suffix)(void* restrict bitstorage, const counter_t source_start, const counter_t destination_stop, const counter_t size)
{
    logBegins6(bitstorage, time_continuePattern, "ContinuePattern: continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern (%ju copies)\n", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));

    // log6(bitstorage,
    //            "ContinuePattern: at start, source_start=%ju destination_stop=%ju size=%ju",
    //            (uintmax_t)source_start,
    //            (uintmax_t)destination_stop,
    //            (uintmax_t)size);

    if (size < bitcount_type(bitbucket_t)) {
        function(continuePattern_smallSize,suffix)(bitstorage, source_start, destination_stop, size);
        // log6(bitstorage,
        //            "ContinuePattern: handled with small size source_start=%ju destination_stop=%ju size=%ju",
        //            (uintmax_t)source_start,
        //            (uintmax_t)destination_stop,
        //            (uintmax_t)size);
        logEnds6(bitstorage, time_continuePattern, "ContinuePattern: handled with small size source_start=%ju destination_stop=%ju size=%ju",
                   (uintmax_t)source_start,
                   (uintmax_t)destination_stop,
                   (uintmax_t)size);
        return;
    }

    const bitshift_t copy_bit   = bitindex_calc_type(source_start + size, bitbucket_t);
    const bitshift_t source_bit = bitindex_calc_type(source_start, bitbucket_t);

    if      (source_bit > copy_bit) function(continuePattern_shiftleft,suffix) (bitstorage, source_start, destination_stop, size);
    else if (source_bit < copy_bit) function(continuePattern_shiftright,suffix)(bitstorage, source_start, destination_stop, size);
    else                            function(continuePattern_aligned,suffix)   (bitstorage, source_start, destination_stop, size);

    // log6(bitstorage,
    //            "ContinuePattern: source_start=%ju destination_stop=%ju size=%ju",
    //            (uintmax_t)source_start,
    //            (uintmax_t)destination_stop,
    //            (uintmax_t)size);

    logEnds6(bitstorage, time_continuePattern,"ContinuePattern: source_start=%ju destination_stop=%ju size=%ju",
               (uintmax_t)source_start,
               (uintmax_t)destination_stop,
               (uintmax_t)size);
}

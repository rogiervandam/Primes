// The setsuffix.h file is used to define a suffix for the bitbucket_t type.
// It also makes a "suffix" that can be used to create function variants
// The cleansuffx.h file is used to unset 

// The bitbucket_t type can be provided by setting "variant" or by providing a "preset"
// The possibilities are listed in varianttypes.h

#include "varianttypes.h"

#ifdef variant
    #define bitbucket_t NAME(variant, _t) // the type used for the bitbuckets, e.g. uint64_t
    #define variant_suffix NAME(_,variant) // the name of the variant with an underscore, e.g. _uint64
    #define variant_base_suffix NAME(_,variant_base)// the name of the variant base type with an underscore, e.g. _uint64 for variant uint64v4
#elif !defined bitbucket_t
        #define bitbucket_t uint8_t
#endif

#if defined variant_suffix
    #if defined unrolls && unrolls != 1
        #define suffix NAME(variant_suffix, NAME(_unroll,unrolls))
    #else
        #define suffix variant_suffix
    #endif
#else    
    #define suffix
#endif


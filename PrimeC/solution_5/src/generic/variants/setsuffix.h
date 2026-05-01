// The setsuffix.h file is used to define a suffix for the bitbucket_t type.
// It also makes a "suffix" that can be used to create function variants
// The cleansuffx.h file is used to unset 

// The bitbucket_t type can be provided by setting "variant" or by providing a "preset"
// The possibilities are listed in varianttypes.h

#include "varianttypes.h"

#ifdef variant
    #define bitbucket_t NAME(variant, _t)
    #define variant_suffix NAME(_,variant)
    #define variant_base_suffix NAME(_,variant_base)
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


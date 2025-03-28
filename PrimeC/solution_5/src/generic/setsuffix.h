#include "../generic/varianttypes.h"

#ifdef variant
    #define bitbucket_t NAME(variant, _t)
    #define variantsuffix NAME(_,variant)
#endif

#if defined variantsuffix
    #if defined unrolls && unrolls != 4
        #define suffix NAME(variantsuffix, NAME(_unroll,unrolls))
    #else
        #define suffix variantsuffix
    #endif
#else    
    #define suffix
#endif

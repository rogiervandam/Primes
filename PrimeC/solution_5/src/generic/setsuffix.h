#include "../generic/varianttypes.h"

#ifdef variant
    #define bitbucket_t NAME(variant, _t)
    #define variantsuffix NAME(_,variant)
#endif

#undef suffix
#undef fullvariantsuffix
#undef unrollsuffix
#ifdef UNSET_UNROLLS
    #undef unrolls
    #undef UNSET_UNROLLS
#endif

#ifdef unrolls
    #define unrollssuffix NAME(_unroll,unrolls)
#else
    #define unrolls 4
    #define UNSET_UNROLLS 1
#endif

#ifdef variantsuffix
    #ifdef unrollssuffix
        #define fullvariantsuffix NAME(variantsuffix, unrollssuffix)
        #ifdef subfunction
            #define suffix NAME(subfunction, fullvariantsuffix)
        #else
            #define suffix fullvariantsuffix
        #endif
    #else
        #define fullvariantsuffix variantsuffix
        #ifdef subfunction
            #define suffix NAME(subfunction,variantsuffix)
        #else
            #define suffix variantsuffix
        #endif
    #endif
#else
    #define suffix subfunction
    #define fullvariantsuffix _word // TODO: remove when full converted
#endif

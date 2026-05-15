#ifndef ASSEMBLE_WHEELSTORAGE_GUARD
    #define ASSEMBLE_WHEELSTORAGE_GUARD

    #include "../generic/log.h"
    #include "../bitstorage/bitstorage_search.h"
    #include "../bitstorage/bitstorage_setBitsTrue.h"
    
    #define INCLUDE_FILE "../../../src/wheelstorage/wheelstorage.h"
    #include "../generic/variants/generate.h"

#endif

#include "wheelstorage_buildWheel.h"
#include "wheelstorage_calc.h"

#if defined BUILD_WORDS_STAGE //---- include only the variant function

    #include "wheelstorage_markFactor.h"
    #include "wheelstorage_checkFactor.h"

    #if defined unrolls && unrolls > 1
        #include "wheelstorage_repeat.h"
        #include "wheelstorage_smallrepeat.h"
        #include "wheelstorage_smallrepeat_pair.h"
        #include "wheelstorage_smallrepeat_mmask.h"
        #include "wheelstorage_norepeat.h"
    #endif

#endif

#if defined BUILD_VECTORS_STAGE && defined unrolls && unrolls > 1
    #include "wheelstorage_smallrepeat_pair_vector.h"
#endif

#if defined(include_once_last) //---- include this once after all variants
    #include "wheelstorage_checkFactor.h" // for findUmarkedFactors
    #include "wheelstorage_markFactors.h"
#endif

#undef preset
#undef unrolls
#undef variant

#define INCLUDE_FILE_FULL INCLUDE_FILE

#include INCLUDE_FILE_FULL
#define BUILD_ONCE 1

#define include_once_first 1
    #include INCLUDE_FILE_FULL
#undef include_once_first

#define BUILD_WORDS_STAGE 1
    #undef unrolls
    
    #define unrolls 1
        #include "wordsize.h"
        #undef unrolls

    #define unrolls 4
        #include "wordsize.h"
        #undef unrolls

    #define unrolls 8
        #include "wordsize.h"
        #undef unrolls

    #define unrolls 16
        #include "wordsize.h"
        #undef unrolls

    #undef variant
#undef BUILD_WORDS_STAGE

#define BUILD_VECTORS_STAGE 1
    #undef unrolls

    #define unrolls 1
        #include "vectorsize.h"
        #undef unrolls

    #define unrolls 4
        #include "vectorsize.h"
        #undef unrolls

    #define unrolls 8
        #include "vectorsize.h"
        #undef unrolls
#undef BUILD_VECTORS_STAGE

#define include_once_last 1
    #include INCLUDE_FILE_FULL
#undef include_once_last

#undef BUILD_ONCE
#undef INCLUDE_FILE_FULL
#undef INCLUDE_FILE

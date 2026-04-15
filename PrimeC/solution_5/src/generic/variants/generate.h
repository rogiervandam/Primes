#undef preset
#undef unrolls
#undef variant

// include
#define INCLUDE_FILE_FULL INCLUDE_FILE

#include INCLUDE_FILE_FULL
#define included_once 1

#define include_for_words 1
    
    // #define unrolls 1
    // // #include "../bitstorage/bitstorage_setBitsTrue_setBit.h"
    #undef unrolls
        #include "wordsize.h"
        #undef unrolls

    #define unrolls 4
        #include "wordsize.h"
        #undef unrolls

    #define unrolls 8
        #include "wordsize.h"
        #undef unrolls

    #undef variant

#undef include_for_words

#define include_for_vectors 1

    #undef unrolls
        #include "vectorsize.h"

    #define unrolls 4
        #include "vectorsize.h"
        #undef unrolls

    #define unrolls 8
        #include "vectorsize.h"
        #undef unrolls

#undef include_for_vectors

#define include_once_last 1
#include INCLUDE_FILE_FULL
#undef include_once_last

#undef included_once
#undef INCLUDE_FILE_FULL
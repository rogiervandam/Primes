// in the first iteration, read this file for each preset
// the guard will prevent an infinite loop of includes
#ifndef BITSTORAGE_ASSEMBLE_WORD_GUARD
    #define BITSTORAGE_ASSEMBLE_WORD_GUARD
    #undef INCLUDE_FILE
    #define INCLUDE_FILE_FULL "../../bitstorage/bitstorage_setBitsTrue_assemble_word.h"

    #undef unrolls
    #undef variant

    #define unrolls 1
        #include "../bitstorage/bitstorage_setBitsTrue_setBit.h"
        #include "../generic/variants/wordsize.h"
        #undef unrolls

    #define unrolls 4
        #include "../generic/variants/wordsize.h"
        #undef unrolls

    #define unrolls 8
        #include "../generic/variants/wordsize.h"
        #undef unrolls

    #define unrolls 16
        #define variant uint8
        #include "bitstorage_setBitsTrue_assemble_word.h" 
        #undef unrolls

    #define unrolls 32
        #define variant uint8
        #include "bitstorage_setBitsTrue_assemble_word.h" 
        #undef unrolls

    #undef INCLUDE_FILE_FULL

#else
    #define KEEP_VARIANT
    #include "../bitstorage/bitstorage_setBitsTrue_applyMask.h"
    #include "../bitstorage/bitstorage_setBitsTrue_applyMask_pair.h"
    #include "../bitstorage/bitstorage_setBitsTrue_setBit.h"
    #include "../bitstorage/bitstorage_setBitsTrue_largestep_word.h"
    #undef KEEP_VARIANT
    #include "../generic/variants/cleansuffix.h"
#endif
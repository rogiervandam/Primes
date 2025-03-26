#ifndef BITSTORAGE_ASSEMBLE_WORD_GUARD
    #define BITSTORAGE_ASSEMBLE_WORD_GUARD

    #undef unrolls
    #undef variant
    // #include "bitstorage_setBitsTrue_assemble_word.h" 

    #include "../bitstorage/bitstorage_setBitsTrue_norepeat.h"

    #undef unrolls
    #define variant uint8
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint16
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint32
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint64
    #include "bitstorage_setBitsTrue_assemble_word.h" 

    #define unrolls 4
    #define variant uint8
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint16
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint32
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint64
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #undef unrolls

    #define unrolls 8
    #define variant uint8
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint16
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint32
    #include "bitstorage_setBitsTrue_assemble_word.h" 
    #define variant uint64
    #include "bitstorage_setBitsTrue_assemble_word.h" 

#else

    #include "../generic/setsuffix.h"
    #define KEEP_VARIANT
    #include "../bitstorage/bitstorage_applyMask.h"
    #include "../bitstorage/bitstorage_setBitsTrue_repeat.h"
    #include "../bitstorage/bitstorage_setBitsTrue_norepeat.h"
    #undef KEEP_VARIANT
    #include "../generic/cleansuffix.h"

#endif
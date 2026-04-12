#undef preset
#undef unrolls
#undef variant

#define include_once_first 1
#include INCLUDE_FILE
#undef include_once_first

    #define include_for_words 1
        
        // #define unrolls 1
        // // #include "../bitstorage/bitstorage_setBitsTrue_setBit.h"
        #define variant uint8
        #include INCLUDE_FILE 

        #define variant uint32
        #include INCLUDE_FILE 
        // #undef variant
        #define variant uint64
        #include INCLUDE_FILE 
        // #undef variant

        // #undef unrolls

        // #define unrolls 4
        // #define variant uint32
        // #include INCLUDE_FILE 
        // #define variant uint64
        // #include INCLUDE_FILE 
        // #undef unrolls

        // #define unrolls 8
        // #define variant uint32
        // #include INCLUDE_FILE 
        // #define variant uint64
        // #include INCLUDE_FILE 
        #undef unrolls
        // #define preset uint64v4
        // #include INCLUDE_FILE
    #undef include_for_words
    #undef variant


#define include_forvectors 1
#undef unrolls
    #undef variant

        #define preset_uint64v8
        #include INCLUDE_FILE
        #define preset_uint64v4
        #include INCLUDE_FILE
        #define preset_uint64v2
        #include INCLUDE_FILE

    #define unrolls 4

        #define preset_uint64v8
        #include INCLUDE_FILE
        #define preset_uint64v4
        #include INCLUDE_FILE
        #define preset_uint64v2
        #include INCLUDE_FILE
    
    // #define preset_uint32v16
    // #include INCLUDE_FILE
    // #define preset_uint32v8
    // #include INCLUDE_FILE
    // #define preset_uint32v4
    // #include INCLUDE_FILE
    // #define preset_uint32v2
    // #include "bitstorage_setBitsTrue_assemble_vector.h" 
    
    // #define preset_uint16v32
    // #include INCLUDE_FILE
    // #define preset_uint16v16
    // #include INCLUDE_FILE
    // #define preset_uint16v8
    // #include INCLUDE_FILE
        #undef unrolls

    #define unrolls 8

        #define preset_uint64v8
        #include INCLUDE_FILE
        #define preset_uint64v4
        #include INCLUDE_FILE
        #define preset_uint64v2
        #include INCLUDE_FILE
   
    // #define preset_uint16v32
    // #include INCLUDE_FILE
    // #define preset_uint16v16
    // #include INCLUDE_FILE
    // #define preset_uint16v8
    // #include INCLUDE_FILE

        #undef unrolls

    #undef include_forvectors

    #define include_once_last 1
    #include INCLUDE_FILE
    #undef include_once_last

    #undef INCLUDE_FILE
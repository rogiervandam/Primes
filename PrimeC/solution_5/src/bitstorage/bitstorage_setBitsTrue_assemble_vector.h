// in the first iteration, read this file for each preset
// the guard will prevent an infinite loop of includes
#ifndef BITSTORAGE_ASSEMBLE_VECTOR_GUARD
#define BITSTORAGE_ASSEMBLE_VECTOR_GUARD
    #undef INCLUDE_FILE_FULL
    #define INCLUDE_FILE_FULL "../../bitstorage/bitstorage_setBitsTrue_assemble_vector.h"

    #undef unrolls
    #define unrolls 4
        #include "../generic/variants/vectorsize.h"
        #undef unrolls      

    #define unrolls 8
        #include "../generic/variants/vectorsize.h"
        #undef unrolls      

  #undef INCLUDE_FILE_FULL
    
#else // this section will be read for each preset
    #define KEEP_VARIANT
    #include "../bitstorage/bitstorage_setBitsTrue_applyMask.h"
    #include "../bitstorage/bitstorage_setBitsTrue_applyMask_pair.h"
    #include "../bitstorage/bitstorage_setBitsTrue_largestep_vector.h" 
    #include "../bitstorage/bitstorage_setBitsTrue_smallstep_rotate_pair.h" 
    #undef KEEP_VARIANT
    #include "../generic/variants/cleansuffix.h"
#endif
#ifndef BITSTORAGE_ASSEMBLE_VECTOR_GUARD
    #define BITSTORAGE_ASSEMBLE_VECTOR_GUARD
    
    #undef unrolls
    #define preset_uint64v8
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint64v4
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint64v2
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    
    #undef variant_base_type_t
    #define preset_uint32v2
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint32v4
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint32v8
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint32v16
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    
    #undef variant_base_type_t
    #define preset_uint16v2
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint16v4
    #include "bitstorage_setBitsTrue_assemble_vector.h"  
    #define preset_uint16v8
    #include "bitstorage_setBitsTrue_assemble_vector.h"  
    
    #undef variant_base_type_t
    #define unrolls 8
    #define preset_uint16v2
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint16v4
    #include "bitstorage_setBitsTrue_assemble_vector.h"  
    #define preset_uint16v8
    #include "bitstorage_setBitsTrue_assemble_vector.h"  
    
    #undef variant_base_type_t
    #define preset_uint64v8
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint64v4
    #include "bitstorage_setBitsTrue_assemble_vector.h" 
    #define preset_uint64v2
    #include "bitstorage_setBitsTrue_assemble_vector.h" 

#else

    #include "../generic/setsuffix.h"
    #define KEEP_VARIANT
    #include "../bitstorage/bitstorage_applyMask.h"
    #include "../bitstorage/bitstorage_setBitsTrue_largestep.h" 
    #include "../bitstorage/bitstorage_setBitsTrue_smallstep_rotate.h" 
    #include "../bitstorage/bitstorage_setBitsTrue_smallstep_rotate_pair.h" 
    #undef KEEP_VARIANT
    #include "../generic/cleansuffix.h"

#endif
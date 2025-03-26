#undef variant
#include "bitstorage_setBitsTrue_norepeat.h"

#define variantsuffix _word
#define bitbucket_t bitword_t
#include "bitstorage_applyMask.h"

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
#undef unrolls

#include "bitstorage_setBitsTrue_dispatch.h"
#include "bitstorage_setBitsTrue_base.h"



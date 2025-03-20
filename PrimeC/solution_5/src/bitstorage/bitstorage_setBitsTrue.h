#undef variant
#include "bitstorage_setBitsTrue_norepeat.h"

#define variant uint8
#include "bitstorage_setBitsTrue_norepeat.h"


// vector size operations
#include "bitstorage_applyMask_vector.h"
#include "bitstorage_setBitsTrue_smallstep_vector.h"

// word size operations
#include "bitstorage_applyMask_word.h"

#undef unrolls
#define variant_base_type uint64_t 
#define variant uint64v2
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint64v4
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint64v8
#include "bitstorage_setBitsTrue_largestep.h" 

#undef variant_base_type
#define variant_base_type uint32_t 
#define variant uint32v2
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint32v4
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint32v8
#include "bitstorage_setBitsTrue_largestep.h" 

#undef variant_base_type
#define variant_base_type uint16_t 
#define variant uint16v2
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint16v4
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint16v8
#include "bitstorage_setBitsTrue_largestep.h" 
#define unrolls 8
#define variant uint16v2
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint16v4
#include "bitstorage_setBitsTrue_largestep.h" 
#define variant uint16v8
#include "bitstorage_setBitsTrue_largestep.h" 

// create smallstep functions
#undef unrolls
#undef variant
#include "bitstorage_setBitsTrue_repeat.h"

#define unrolls 4
#define variant uint8
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint16
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint32
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint64
#include "bitstorage_setBitsTrue_repeat.h"
#undef unrolls

#define unrolls 8
#define variant uint8
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint16
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint32
#include "bitstorage_setBitsTrue_repeat.h"
#define variant uint64
#include "bitstorage_setBitsTrue_repeat.h"
#undef unrolls

#include "bitstorage_setBitsTrue_dispatch.h"
#include "bitstorage_setBitsTrue_base.h"



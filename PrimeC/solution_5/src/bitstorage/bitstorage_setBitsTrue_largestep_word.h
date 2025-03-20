#define unrolls 4 
#define variant uint8 
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint16
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint32
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint64
#include "bitstorage_setBitsTrue_largestep_body.h"
#undef unrolls

#define unrolls 8   
#define variant uint8 
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint16
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint32
#include "bitstorage_setBitsTrue_largestep_body.h"
#define variant uint64
#include "bitstorage_setBitsTrue_largestep_body.h"
#undef unrolls

#define variant uint8
#include "bitstorage_setBitsTrue_norepeat.h"

#undef variant
#include "bitstorage_setBitsTrue_norepeat.h"

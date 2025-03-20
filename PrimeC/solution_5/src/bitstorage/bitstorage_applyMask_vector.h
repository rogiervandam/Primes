// make the general applyMask_vector function (TODO: remove later)
#define variantsuffix _vector
#define bitbucket_t bitvector_t
#include "bitstorage_applyMask.h"

// make the versions for the different vector sizes
#define unrolls 8
#define variant uint64v2
#include "bitstorage_applyMask.h"
#define variant uint64v4
#include "bitstorage_applyMask.h"
#define variant uint64v8
#include "bitstorage_applyMask.h"
#define variant uint16v8
#include "bitstorage_applyMask.h"
#define variant uint16v32
#include "bitstorage_applyMask.h"
#define variant uint32v8
#include "bitstorage_applyMask.h"
#define variant uint32v16
#include "bitstorage_applyMask.h"
#undef unrolls

#define unrolls 4
#define variant uint64v2
#include "bitstorage_applyMask.h"
#define variant uint64v4
#include "bitstorage_applyMask.h"
#define variant uint64v8
#include "bitstorage_applyMask.h"
#define variant uint16v8
#include "bitstorage_applyMask.h"
#define variant uint16v32
#include "bitstorage_applyMask.h"
#define variant uint32v8
#include "bitstorage_applyMask.h"
#define variant uint32v16
#include "bitstorage_applyMask.h"
#undef unrolls

#define variant uint64v2
#include "bitstorage_applyMask.h"
#define variant uint64v4
#include "bitstorage_applyMask.h"
#define variant uint64v8
#include "bitstorage_applyMask.h"
#define variant uint16v8
#include "bitstorage_applyMask.h"
#define variant uint16v32
#include "bitstorage_applyMask.h"
#define variant uint32v8
#include "bitstorage_applyMask.h"
#define variant uint32v16
#include "bitstorage_applyMask.h"

#include "bitstorage_applyMask_pair.h"
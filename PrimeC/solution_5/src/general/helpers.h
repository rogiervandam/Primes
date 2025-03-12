
// helper calc functions
#define pow(base,pow)       (pow*((base>>pow)&1U))
#define min(a,b)            ((a<b) ? a : b)
#define max(a,b)            ((a<b) ? b : a)
#define safe_diff(a,b)      ((a>b) ? (a-b) : 0)

// helper compile time check functions
#define uintsafeminus(a,b)  ((a>b)?(a-b):0)
#define likely(x)           (__builtin_expect((x),1))
#define unlikely(x)         (__builtin_expect((x),0))
#define is_signed(type) (((type)-1)<0)

#define PPCAT_NX(A, B) A ## B
#define PPCAT(A, B) PPCAT_NX(A, B)

#define STR_HELPER(x) #x
#define STR(x) STR_HELPER(x)
#include <stdint.h>
#if __STDC_VERSION__ >= 201112L
    #define TYPE_SHORT_NAME(x) _Generic((x)0, \
         uint32_t: "u32", \
         uint64_t: "u64", \
         int32_t:  "i32", \
         int64_t:  "i64", \
         default:  "unknown" )
#else
    #define TYPE_SHORT_NAME(x) "unsupported"
#endif

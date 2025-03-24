
// helper calc functions
#define pow(base,pow)       (pow*((base>>pow)&1U))
#define min(a,b)            ((a<b) ? a : b)
#define max(a,b)            ((a<b) ? b : a)

// helper compile time check functions
// #define uintsafeminus(a,b)  ((a>b)?(a-b):0)
#define likely(x)           (__builtin_expect((x),1))
#define unlikely(x)         (__builtin_expect((x),0))
#define is_signed(type)     (((type)-1)<0)
#define shift_calc(bits)    (__builtin_ctz(bits))
// #define shift_calc(bits)    (pow(bits,1)+pow(bits,2)+pow(bits,3)+pow(bits,4)+pow(bits,5)+pow(bits,6)+pow(bits,7)+pow(bits,8)+pow(bits,9)+pow(bits,10)+pow(bits,11)+pow(bits,12))
#define shift_type(TYPE)    (shift_calc(sizeof(TYPE)*8))

#define safe_diff(a,b)            ((a>b) ? (a-b) : 0)
#define safe_diff_type(a,b,type)  (is_signed(type) ? a-b : ((a>b) ? (a-b) : 0))

#define CONCAT(a, b) a##b
#define NAME(a, b) CONCAT(a, b)

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

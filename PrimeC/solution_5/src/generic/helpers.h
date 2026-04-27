
// #include <stdarg.h>
#include <stdio.h>
// #include <string.h>
#include <sys/ioctl.h>
// #include <unistd.h>

// helper calc functions
#define pow(base,pow)             (pow*((base>>pow)&1U))
#define min(a,b)                  ((a<b) ? a : b)
#define max(a,b)                  ((a<b) ? b : a)

// fast integer square root
// https://en.wikipedia.org/wiki/Fast_inverse_square_root
static inline counter_t __attribute__((always_inline, const)) 
usqrt(counter_t x) 
{
    union { float f; int i; } conv;
    float x2 = 0.5F * x;
    conv.f = (float) x;
    conv.i = 0x5f3759df - (conv.i >> 1); 
    float y = conv.f;
    y = y * (1.5F - (x2 * y * y));
    y = y * (1.5F - (x2 * y * y));
    return (counter_t) (x * y + 1.5f); // 1.5f for rounding and increment by 1 to alyways round up
}

// helper compile time check functions
#define likely(x)                 (__builtin_expect((x),1))
#define unlikely(x)               (__builtin_expect((x),0))
#define is_signed(type)           (((type)-1)<0)

#define safe_diff(a,b)            ((a>b) ? (a-b) : 0)
#define safe_diff_type(a,b,type)  (is_signed(type) ? a-b : ((a>b) ? (a-b) : 0))

#define CONCAT(a, b) a##b
#define NAME(a, b) CONCAT(a, b)

#define STR_HELPER(x) #x
#define STR(x) STR_HELPER(x)

#define function(name, suffix) CONCAT(name, suffix)

#define TYPE_SHORT_NAME(x) _Generic((x)0, \
uint32_t: "u32", \
uint64_t: "u64", \
int32_t:  "i32", \
int64_t:  "i64", \
default:  "unknown" )

static inline void local_memcpy(void *dest, void *src, size_t n) 
{ 
    // Typecast src and dest addresses to (char *) 
    char *csrc = (char *)src; 
    char *cdest = (char *)dest; 

    // Copy contents of src[] to dest[] 
    for (int i=0; i<n; i++) cdest[i] = csrc[i]; 
} 

static inline void local_memcpy_uint8(uint8_t *dest, uint8_t *src, counter_t n) 
{ 
    // Copy contents of src[] to dest[] 
    for (counter_t i=0; i<n; i++) dest[i] = src[i]; 
}

static inline void local_memcpy_uint64(uint64_t *dest, uint64_t *src, counter_t n) 
{ 
    // Copy contents of src[] to dest[] 
    for (counter_t i=0; i<n; i++) dest[i] = src[i]; 
} 


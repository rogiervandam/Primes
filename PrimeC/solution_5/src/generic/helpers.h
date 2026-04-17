
#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>

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

#define startAnalysis0(timer, printf_args...) verbose0(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis1(timer, printf_args...) verbose1(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis2(timer, printf_args...) verbose2(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis3(timer, printf_args...) verbose3(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis4(timer, printf_args...) verbose4(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis5(timer, printf_args...) verbose5(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis6(timer, printf_args...) verbose6(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis7(timer, printf_args...) verbose7(printf(printf_args);) timer_lapstart(timer); 
#define startAnalysis8(timer, printf_args...) verbose8(printf(printf_args);) timer_lapstart(timer); 
#define endAnalysis0(timer, ...) timer_laptime(timer); __VA_OPT__(verbose0(printf(__VA_ARGS__);))
#define endAnalysis1(timer, ...) timer_laptime(timer); __VA_OPT__(verbose1(printf(__VA_ARGS__);))
#define endAnalysis2(timer, ...) timer_laptime(timer); __VA_OPT__(verbose2(printf(__VA_ARGS__);))
#define endAnalysis3(timer, ...) timer_laptime(timer); __VA_OPT__(verbose3(printf(__VA_ARGS__);))
#define endAnalysis4(timer, ...) timer_laptime(timer); __VA_OPT__(verbose4(printf(__VA_ARGS__);))
#define endAnalysis5(timer, ...) timer_laptime(timer); __VA_OPT__(verbose5(printf(__VA_ARGS__);))
#define endAnalysis6(timer, ...) timer_laptime(timer); __VA_OPT__(verbose6(printf(__VA_ARGS__);))
#define endAnalysis7(timer, ...) timer_laptime(timer); __VA_OPT__(verbose7(printf(__VA_ARGS__);))
#define endAnalysis8(timer, ...) timer_laptime(timer); __VA_OPT__(verbose8(printf(__VA_ARGS__);))

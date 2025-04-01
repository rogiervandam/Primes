
// helper calc functions
#define pow(base,pow)             (pow*((base>>pow)&1U))
#define min(a,b)                  ((a<b) ? a : b)
#define max(a,b)                  ((a<b) ? b : a)

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

// ANSI color codes
#define COLOR_RED         "\033[31m"
#define COLOR_GREEN       "\033[32m"
#define COLOR_YELLOW      "\033[33m"
#define COLOR_BLUE        "\033[34m"
#define COLOR_MAGENTA     "\033[35m"
#define COLOR_BOLD        "\033[1m"
#define COLOR_BLINK       "\033[5m"
#define COLOR_BLINK_OFF   "\033[25m"
#define COLOR_UNDERLINE   "\033[4m"
#define COLOR_RESET       "\033[0m"
#define COLOR_BOLD_YELLOW "\033[1;33m"
#define COLOR_BOLD_GREEN  "\033[1;32m"
#define COLOR_DARK_GRAY   "\033[0;90m"

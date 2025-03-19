// defaults
#ifndef COMPILE_VERBOSE_LEVEL
    #define COMPILE_VERBOSE_LEVEL 2  // Set to 1-9 to enable compiling different verbose levels
#endif

// #define COMPILE_CHECKALL                 

// #define COMPILE_EXPLAIN                  


// How to align the caches
#define cache_line_bytes      128 


// type for handling non-vector bitwise operations in the bitstorage
#ifndef bitword_t
    #define bitword_t         uint32_t 
    #define BITWORD_T_SIZE_PP 32
#endif

// type for describing the index of a bit in the sieve and general loops
#ifndef counter_t
    #if defined(USE_64BIT_COUNTER)
        #define counter_t         int64_t
        #define COUNTER_T_SIZE_PP 64
    #else
        #define counter_t         int32_t
        #define COUNTER_T_SIZE_PP 32
    #endif
#endif

// type used to shift bits
#ifndef bitshift_t
    #define bitshift_t counter_t 
#endif

// #define COMPILE_FUNCTION_TIMINGS

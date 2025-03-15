// defaults
#ifndef COMPILE_VERBOSE_LEVEL
    #define COMPILE_VERBOSE_LEVEL 2  // Set to 1-9 to enable compiling different verbose levels
#endif

#define cache_line_bytes   256 // How to align the caches
// #define COMPILE_CHECKALL                 
// #define COMPILE_EXPLAIN                  


#ifndef bitword_t
    #ifdef __APPLE__
        #define bitword_t  uint32_t // type used to store bits
        #define BITWORD_T_SIZE_PP 32
    #else
        #define bitword_t  uint64_t // type used to store bits
        #define BITWORD_T_SIZE_PP 64
    #endif
#endif

#ifndef counter_t
    #ifdef __APPLE__
        #define counter_t int32_t     // apple m1 really likes 32 bit int for counters and not 64
        #define COUNTER_T_SIZE_PP 32
    #else
        #define counter_t  int64_t  // type used to count loops, etc. Some processors/compilers are faster at 32 bits
        #define COUNTER_T_SIZE_PP 64
    #endif
#endif

#ifndef bitshift_t
    #define bitshift_t counter_t // type used to shift bits
#endif




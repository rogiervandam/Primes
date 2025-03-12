// defaults
#define compile_verbose_level           2  // Set to 1-4 to enable compiling different verbose levels
#define anticiped_cache_line_bytesize   128 // How to align the caches
// #define COMPILE_CHECKALL                 
// #define COMPILE_EXPLAIN                  

#ifndef bitword_t
    #define bitword_t  uint64_t // type used to store bits
    #define BITWORD_T_SIZE_PP 64
#endif

#ifndef counter_t
    #define counter_t  int64_t  // type used to count loops, etc. Some processors/compilers are faster at 32 bits
    #define COUNTER_T_SIZE_PP 64
#endif

#ifndef bitshift_t
    #define bitshift_t counter_t // type used to shift bits
#endif

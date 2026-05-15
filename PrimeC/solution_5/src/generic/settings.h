// Set to 1-9 to enable compiling different verbose levels
// Higher levels are necessary for --explain.
// But they cost time, so are only compiled if specified

#include <stdint.h> // for uint64_t and uint32_t

#ifndef COMPILE_VERBOSE_LEVEL
    #define COMPILE_VERBOSE_LEVEL 2  
#endif

// these options are set using the command line tool ./sieve
#ifdef COMPILE_FULL
    #undef COMPILE_CHECKALL
    #undef COMPILE_EXPLAIN                  
    #undef COMPILE_BENCHMARK_STRIPERS
    #undef COMPILE_CHECK_STRIPERS
    #undef COMPILE_TUNE
    #define COMPILE_CHECKALL                 
    #define COMPILE_EXPLAIN                  
    #define COMPILE_BENCHMARK_STRIPERS
    #define COMPILE_CHECK_STRIPERS
    #define COMPILE_TUNE
#endif

#if COMPILE_VERBOSE_LEVEL > 5 || defined(COMPILE_TRACE)
    #undef COMPILE_TIMERS
    #define COMPILE_TIMERS
#endif

// How to align the caches
#define cache_line_bytes 128

// type for describing the index of a bit in the sieve and general loops
#if defined(USE_64BIT_COUNTER)
    typedef int64_t counter_t;
    #define COUNTER_T_MAX_VALUE INT64_MAX
    #define counter_suffix _uint64
#else
    typedef int32_t counter_t;
    #define COUNTER_T_MAX_VALUE INT32_MAX
    #define counter_suffix _uint32
#endif

// type used to shift bits
#ifndef bitshift_t
    #define bitshift_t counter_t 
#endif

#include "timepriority.h"
#include "types.h"
#include "helpers.h"
#include "terminal.h"
#include "verbose.h"
#include "environment.h"


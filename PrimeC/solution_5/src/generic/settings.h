// Set to 1-9 to enable compiling different verbose levels
// Higher levels are necessary for --explain.
// But they cost time, so are only compiled if specified

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

// How to align the caches
#define cache_line_bytes 256

// type for describing the index of a bit in the sieve and general loops
#if defined(USE_64BIT_COUNTER)
    typedef int64_t counter_t;
    #define COUNTER_T_MAX_VALUE INT64_MAX
#else
    typedef int32_t counter_t;
    #define COUNTER_T_MAX_VALUE INT32_MAX
#endif

// type used to shift bits
#ifndef bitshift_t
    #define bitshift_t counter_t 
#endif

#include "types.h"
#include "helpers.h"
#include "terminal.h"
#include "verbose.h"

// Trace macros: compile-time gated via -DCOMPILE_TRACE
#ifdef COMPILE_TRACE
  #include "../trace/sieve_trace.h"
  #define TRACE_STEP(bitstorage_ptr, fmt, ...) trace_record_step_fmt(bitstorage_ptr, fmt, ##__VA_ARGS__)
  #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...) \
      trace_record_step_meta(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ##__VA_ARGS__)
  #define TRACE_ANALYSIS_START(op, bstart, bstop) trace_set_context(op, (int64_t)(bstart), (int64_t)(bstop))
  #define TRACE_ANALYSIS_END() trace_clear_context()
  #define TRACE_DUMP(filename, bitstorage_ptr, sieve_size, bit_count) \
      trace_dump_memory(filename, bitstorage_ptr, sieve_size, bit_count)

  // Combined startAnalysis + trace context: folds trace into the analysis construct
  #define startAnalysisTrace5(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis5(timer, printf_args) TRACE_ANALYSIS_START(trace_op, bstart, bstop);
  #define endAnalysisTrace5(timer, ...) \
      TRACE_ANALYSIS_END(); endAnalysis5(timer, ##__VA_ARGS__)

  // Subtask-level trace macros (level 8 = applyMask granularity)
  #define startAnalysisTrace8(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis8(timer, printf_args) TRACE_ANALYSIS_START(trace_op, bstart, bstop);
  #define endAnalysisTrace8(timer, ...) \
      TRACE_ANALYSIS_END(); endAnalysis8(timer, ##__VA_ARGS__)
#else
  #define TRACE_STEP(bitstorage_ptr, fmt, ...)
  #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...)
  #define TRACE_ANALYSIS_START(op, bstart, bstop)
  #define TRACE_ANALYSIS_END()
  #define TRACE_DUMP(filename, bitstorage_ptr, sieve_size, bit_count)
  #define startAnalysisTrace5(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis5(timer, printf_args)
  #define endAnalysisTrace5(timer, ...) \
      endAnalysis5(timer, ##__VA_ARGS__)
  #define startAnalysisTrace8(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis8(timer, printf_args)
  #define endAnalysisTrace8(timer, ...) \
      endAnalysis8(timer, ##__VA_ARGS__)
#endif

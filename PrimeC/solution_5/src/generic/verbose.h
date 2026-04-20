
#ifndef VERBOSE_H
#define VERBOSE_H

// Verbose level allows some code to only be compiled when targeting a certain verbose level
#ifdef COMPILE_EXPLAIN
  #if COMPILE_VERBOSE_LEVEL < 7
     #undef COMPILE_VERBOSE_LEVEL
     #define COMPILE_VERBOSE_LEVEL 7
  #endif
#endif

#define verbose0(statement) statement
#define verbose1(statement)
#define verbose2(statement)
#define verbose3(statement)
#define verbose4(statement)
#define verbose5(statement)
#define verbose6(statement)
#define verbose7(statement)
#define verbose8(statement)
#define verbose9(statement)
#define verbose_at2(statement)
#define verbose_at3(statement)

#if COMPILE_VERBOSE_LEVEL >= 1
  #undef verbose1
  #define verbose1(statement) if (option.verbose_level >= 1) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 2
  #undef verbose2
  #define verbose2(statement) if (option.verbose_level >= 2) statement
  #undef verbose_at2
  #define verbose_at2(statement) if (option.verbose_level == 2) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 3
  #undef verbose3
  #define verbose3(statement) if (option.verbose_level >= 3) statement
  #undef verbose_at3
  #define verbose_at3(statement) if (option.verbose_level == 3) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 4
  #undef verbose4
  #define verbose4(statement) if (option.verbose_level >= 4) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 5
  #undef verbose5
  #define verbose5(statement) if (option.verbose_level >= 5) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 6
  #undef verbose6
  #define verbose6(statement) if (option.verbose_level >= 6) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 7
  #undef verbose7
  #define verbose7(statement) if (option.verbose_level >= 7) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 8
  #undef verbose8
  #define verbose8(statement) if (option.verbose_level >= 8) { waitforkey(); { statement } }
#endif
#if COMPILE_VERBOSE_LEVEL >= 9
  #undef verbose9
  #define verbose9(statement) if (option.verbose_level >= 9) { waitforkey(); { statement } }
#endif

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

// Trace macros: compile-time gated via -DCOMPILE_TRACE
#ifdef COMPILE_TRACE
  #include "../trace/sieve_trace.h"
  #define TRACE_STEP(bitstorage_ptr, fmt, ...) trace_record_step_fmt(bitstorage_ptr, fmt, ##__VA_ARGS__)
  #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...) \
      trace_record_step_meta(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ##__VA_ARGS__)
  #define TRACE_TEXT(fmt, ...) trace_append_text_fmt(fmt, ##__VA_ARGS__)
  #define TRACE_ANALYSIS_START(level, op, bstart, bstop) trace_set_context(level, op, (int64_t)(bstart), (int64_t)(bstop))
  #define TRACE_ANALYSIS_END() trace_clear_context()
  #define TRACE_DUMP(filename, bitstorage_ptr, sieve_size, bit_count) \
      trace_dump_memory(filename, bitstorage_ptr, sieve_size, bit_count)
  #define TRACE_DUMP_HEX(filename, bitstorage_ptr, sieve_size, bit_count) \
      trace_dump_memory_with_format(filename, bitstorage_ptr, sieve_size, bit_count, "hex")
  #define TRACE_DUMP_BINARY(filename, bitstorage_ptr, sieve_size, bit_count) \
      trace_dump_memory_with_format(filename, bitstorage_ptr, sieve_size, bit_count, "binary")

  #define startAnalysisTrace5(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis5(timer, printf_args) TRACE_ANALYSIS_START(5, trace_op, bstart, bstop);
  #define endAnalysisTrace5(timer, ...) \
      TRACE_ANALYSIS_END(); endAnalysis5(timer, ##__VA_ARGS__)
  #define startAnalysisTrace6(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis6(timer, printf_args) TRACE_ANALYSIS_START(6, trace_op, bstart, bstop);
  #define endAnalysisTrace6(timer, ...) \
      TRACE_ANALYSIS_END(); endAnalysis6(timer, ##__VA_ARGS__)
  #define startAnalysisTrace7(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis7(timer, printf_args) TRACE_ANALYSIS_START(7, trace_op, bstart, bstop);
  #define endAnalysisTrace7(timer, ...) \
      TRACE_ANALYSIS_END(); endAnalysis7(timer, ##__VA_ARGS__)
  #define startAnalysisTrace8(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis8(timer, printf_args) TRACE_ANALYSIS_START(8, trace_op, bstart, bstop);
  #define endAnalysisTrace8(timer, ...) \
      TRACE_ANALYSIS_END(); endAnalysis8(timer, ##__VA_ARGS__)
#else
  #define TRACE_STEP(bitstorage_ptr, fmt, ...)
  #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...)
  #define TRACE_TEXT(fmt, ...)
  #define TRACE_ANALYSIS_START(level, op, bstart, bstop)
  #define TRACE_ANALYSIS_END()
  #define TRACE_DUMP(filename, bitstorage_ptr, sieve_size, bit_count)
  #define TRACE_DUMP_HEX(filename, bitstorage_ptr, sieve_size, bit_count)
  #define TRACE_DUMP_BINARY(filename, bitstorage_ptr, sieve_size, bit_count)
  #define startAnalysisTrace5(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis5(timer, printf_args)
  #define endAnalysisTrace5(timer, ...) \
      endAnalysis5(timer, ##__VA_ARGS__)
  #define startAnalysisTrace6(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis6(timer, printf_args)
  #define endAnalysisTrace6(timer, ...) \
      endAnalysis6(timer, ##__VA_ARGS__)
  #define startAnalysisTrace7(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis7(timer, printf_args)
  #define endAnalysisTrace7(timer, ...) \
      endAnalysis7(timer, ##__VA_ARGS__)
  #define startAnalysisTrace8(timer, trace_op, bstart, bstop, printf_args...) \
      startAnalysis8(timer, printf_args)
  #define endAnalysisTrace8(timer, ...) \
      endAnalysis8(timer, ##__VA_ARGS__)
#endif

#ifndef log5
  #ifdef COMPILE_TRACE
    #define log5(fmt, ...) do { \
        verbose5(printf((fmt) "\n", ##__VA_ARGS__)); \
        TRACE_TEXT(fmt, ##__VA_ARGS__); \
    } while (0)
  #else
    #define log5(fmt, ...) verbose5(printf((fmt) "\n", ##__VA_ARGS__))
  #endif
#endif

#ifndef log6
  #define log6(fmt, ...) verbose6(printf((fmt) "\n", ##__VA_ARGS__))
#endif

#endif
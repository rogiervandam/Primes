
#ifndef VERBOSE_H
#define VERBOSE_H

#include "../benchmark/sieve_functions.h"

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
  #define verbose8(statement) if (option.verbose_level >= 8) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 9
  #undef verbose9
  #define verbose9(statement) if (option.verbose_level >= 9) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 10
  #undef verbose9
  #define verbose9(statement) if (option.verbose_level >= 10) { waitforkey(); { statement } }
#endif

#define verbose(level, statement) function(verbose, level)(statement)

int waitforkey(void);

// Trace macros: compile-time gated via -DCOMPILE_TRACE
#define PRIMES_TRACE_IS_INTEGER(x) _Generic((x), \
  char: 1, signed char: 1, unsigned char: 1, short: 1, unsigned short: 1, \
  int: 1, unsigned int: 1, long: 1, unsigned long: 1, long long: 1, unsigned long long: 1, \
  default: 0)

#define PRIMES_TRACE_IS_CSTRING(x) _Generic((x), \
  char*: 1, const char*: 1, \
  default: 0)

#ifdef COMPILE_TRACE
  #include "../trace/sieve_trace.h"
  #define TRACE_STEP(bitstorage_ptr, fmt, ...) trace_record_step_fmt(bitstorage_ptr, fmt, ##__VA_ARGS__)
  #define TRACE_STEP_LEVEL(level, bitstorage_ptr, fmt, ...) trace_record_step_fmt_level(bitstorage_ptr, level, fmt, ##__VA_ARGS__)
  #define TRACE_EVENT(bitstorage_ptr, fmt, ...) \
      trace_record_step_fmt(bitstorage_ptr, fmt, ##__VA_ARGS__)
  #define TRACE_EVENT_LEVEL(level, bitstorage_ptr, fmt, ...) \
      trace_record_step_fmt_level(bitstorage_ptr, level, fmt, ##__VA_ARGS__)
  #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...) \
      TRACE_EVENT(bitstorage_ptr, fmt, ##__VA_ARGS__)
    #define TRACE_TEXT(fmt, ...) trace_record_text_fmt(fmt, ##__VA_ARGS__)
    #define TRACE_TEXT_LEVEL(level, fmt, ...) trace_record_text_fmt_level(level, fmt, ##__VA_ARGS__)
    #ifdef COMPILE_TIMERS
      #define TRACE_TEXT_TIMER(timer, fmt, ...) trace_record_text_labeled_fmt(timer_function_names[(counter_t)(timer)], fmt, ##__VA_ARGS__)
      #define TRACE_TEXT_TIMER_LEVEL(level, timer, fmt, ...) trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(timer)], fmt, ##__VA_ARGS__)
      #define TRACE_EVENT_TIMER(bitstorage_ptr, timer, fmt, ...) trace_record_step_labeled_fmt(bitstorage_ptr, timer_function_names[(counter_t)(timer)], fmt, ##__VA_ARGS__)
      #define TRACE_EVENT_TIMER_LEVEL(level, bitstorage_ptr, timer, fmt, ...) trace_record_step_labeled_fmt_level(bitstorage_ptr, level, timer_function_names[(counter_t)(timer)], fmt, ##__VA_ARGS__)
    #else
      #define TRACE_TEXT_TIMER(timer, fmt, ...) TRACE_TEXT(fmt, ##__VA_ARGS__)
      #define TRACE_TEXT_TIMER_LEVEL(level, timer, fmt, ...) TRACE_TEXT_LEVEL(level, fmt, ##__VA_ARGS__)
      #define TRACE_EVENT_TIMER(bitstorage_ptr, timer, fmt, ...) TRACE_EVENT(bitstorage_ptr, fmt, ##__VA_ARGS__)
      #define TRACE_EVENT_TIMER_LEVEL(level, bitstorage_ptr, timer, fmt, ...) TRACE_EVENT_LEVEL(level, bitstorage_ptr, fmt, ##__VA_ARGS__)
    #endif
    #define TRACE_ANALYSIS_PUSH(level) primes_trace_set_context(level)
    #define TRACE_ANALYSIS_START(level, ...) do { TRACE_ANALYSIS_PUSH(level); } while (0)
    #define TRACE_ANALYSIS_END() do { \
      primes_trace_clear_context(); \
    } while (0)
  #define TRACE_DUMP(filename, bitstorage_ptr, sieve_size, bit_count) \
      trace_dump_memory(filename, bitstorage_ptr, sieve_size, bit_count)
  #define TRACE_DUMP_HEX(filename, bitstorage_ptr, sieve_size, bit_count) \
      trace_dump_memory_with_format(filename, bitstorage_ptr, sieve_size, bit_count, "hex")
  #define TRACE_DUMP_BINARY(filename, bitstorage_ptr, sieve_size, bit_count) \
      trace_dump_memory_with_format(filename, bitstorage_ptr, sieve_size, bit_count, "binary")

  // #define PRIMES_LOG_BEGIN(level, timer, printf_args...) \
  //     verbose(level, printf(printf_args);) timer_lapstart(timer) TRACE_TEXT_TIMER(timer, printf_args); TRACE_ANALYSIS_PUSH(level)
  // #define PRIMES_LOG_END(level, timer, ...) \
  //     TRACE_ANALYSIS_END(); timer_laptime(timer); __VA_OPT__(verbose(level, printf(__VA_ARGS__);))
#else
  #define TRACE_STEP(bitstorage_ptr, fmt, ...)
  #define TRACE_STEP_LEVEL(level, bitstorage_ptr, fmt, ...)
  #define TRACE_EVENT(bitstorage_ptr, fmt, ...)
  #define TRACE_EVENT_LEVEL(level, bitstorage_ptr, fmt, ...)
  #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...)
  #define TRACE_TEXT(fmt, ...)
  #define TRACE_TEXT_LEVEL(level, fmt, ...)
  #define TRACE_TEXT_TIMER(timer, fmt, ...)
  #define TRACE_TEXT_TIMER_LEVEL(level, timer, fmt, ...)
  #define TRACE_EVENT_TIMER(bitstorage_ptr, timer, fmt, ...)
  #define TRACE_EVENT_TIMER_LEVEL(level, bitstorage_ptr, timer, fmt, ...)
  #define TRACE_ANALYSIS_PUSH(level)
  #define TRACE_ANALYSIS_START(level, ...)
  #define TRACE_ANALYSIS_END()
  #define TRACE_DUMP(filename, bitstorage_ptr, sieve_size, bit_count)
  #define TRACE_DUMP_HEX(filename, bitstorage_ptr, sieve_size, bit_count)
  #define TRACE_DUMP_BINARY(filename, bitstorage_ptr, sieve_size, bit_count)
  // #define PRIMES_LOG_BEGIN(level, timer, printf_args...) verbose(level, printf(printf_args);) timer_lapstart(timer)
  // #define PRIMES_LOG_END(level, timer, ...)              timer_laptime(timer); __VA_OPT__(verbose(level, printf(__VA_ARGS__);))
#endif

static inline int primes_log_should_explain(counter_t level);
static inline int primes_log_should_trace(counter_t level);
static inline void primes_log_emit_verbose(counter_t level, counter_t runtime_verbose_level, const char* annotation);
static inline void primes_log_text(counter_t level, counter_t runtime_verbose_level, const char* fmt, ...);
static inline void primes_log_text_timer(counter_t level, counter_t runtime_verbose_level, counter_t timer, const char* fmt, ...);
static inline void primes_log_event(counter_t level, counter_t runtime_verbose_level, void* bitstorage_ptr, const char* fmt, ...);
static inline void primes_log_event_timer(counter_t level, counter_t runtime_verbose_level, void* bitstorage_ptr, counter_t timer, const char* fmt, ...);

#define PRIMES_LOG_BEGIN(level, timer, printf_args...) \
     primes_log_text_timer(level, option.trace_level, timer, printf_args); timer_lapstart(timer) TRACE_ANALYSIS_PUSH(level) 
#define PRIMES_LOG_END(level, timer, ...) \
     TRACE_ANALYSIS_END(); timer_laptime(timer); __VA_OPT__(primes_log_text(level, option.trace_level, __VA_ARGS__); ) 

#define PRIMES_LOG_SELECT_SECOND(arg, on_integer, on_other)            _Generic((arg), function_id_t: on_integer, default: on_other)
#define PRIMES_LOG_SELECT_FIRST(arg, on_integer, on_cstring, on_other) _Generic((arg), function_id_t: on_integer, char*: on_cstring, const char*: on_cstring, default: on_other)

#define PRIMES_VA_COUNT_IMPL(  _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, N, ...) N
#define PRIMES_VA_COUNT(...)  PRIMES_VA_COUNT_IMPL(__VA_ARGS__, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1)

#define PRIMES_LOG_DISPATCH_1(level, a1)              if (primes_log_should_explain(level)) { a1; }
#define PRIMES_LOG_DISPATCH_2(level, a1, a2)          PRIMES_LOG_SELECT_FIRST(a1, primes_log_text_timer, primes_log_text, primes_log_event)(level, option.trace_level, a1, a2)
#define PRIMES_LOG_DISPATCH_3(level, a1, a2, a3)      PRIMES_LOG_SELECT_FIRST(a1, primes_log_text_timer, primes_log_text, PRIMES_LOG_SELECT_SECOND(a2, primes_log_event_timer, primes_log_event))(level, option.trace_level, a1, a2, a3)
#define PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ...) PRIMES_LOG_SELECT_FIRST(a1, primes_log_text_timer, primes_log_text, PRIMES_LOG_SELECT_SECOND(a2, primes_log_event_timer, primes_log_event))(level, option.trace_level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_5(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_6(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_7(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_8(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_9(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_10(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_11(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_12(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_13(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_14(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_15(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_16(level, a1, a2, a3, ...) PRIMES_LOG_DISPATCH_4(level, a1, a2, a3, ##__VA_ARGS__)

#define PRIMES_LOG_DISPATCH_SELECT_IMPL(count) PRIMES_LOG_DISPATCH_##count
#define PRIMES_LOG_DISPATCH_SELECT(count) PRIMES_LOG_DISPATCH_SELECT_IMPL(count)
#if COMPILE_VERBOSE_LEVEL >= 5
  #define PRIMES_LOG_DISPATCH(level, ...) \
    PRIMES_LOG_DISPATCH_SELECT(PRIMES_VA_COUNT(__VA_ARGS__))(level, __VA_ARGS__)
#else
  #define PRIMES_LOG_DISPATCH(level, ...)
#endif

#define logBegin5(timer, printf_args...) PRIMES_LOG_BEGIN(5, timer, printf_args)
#define logEnd5(timer, ...) PRIMES_LOG_END(5, timer, ##__VA_ARGS__)
#define logBegin6(timer, printf_args...) PRIMES_LOG_BEGIN(6, timer, printf_args)
#define logEnd6(timer, ...) PRIMES_LOG_END(6, timer, ##__VA_ARGS__)
#define logBegin7(timer, printf_args...) PRIMES_LOG_BEGIN(7, timer, printf_args)
#define logEnd7(timer, ...) PRIMES_LOG_END(7, timer, ##__VA_ARGS__)
#define logBegin8(timer, printf_args...) PRIMES_LOG_BEGIN(8, timer, printf_args)
#define logEnd8(timer, ...) PRIMES_LOG_END(8, timer, ##__VA_ARGS__)
#define logBegin9(timer, printf_args...) PRIMES_LOG_BEGIN(9, timer, printf_args)
#define logEnd9(timer, ...) PRIMES_LOG_END(9, timer, ##__VA_ARGS__)

#define log4(...) verbose(4, printf(__VA_ARGS__))
#define log5(...) PRIMES_LOG_DISPATCH(5, __VA_ARGS__)
#define log6(...) PRIMES_LOG_DISPATCH(6, __VA_ARGS__)
#define log7(...) PRIMES_LOG_DISPATCH(7, __VA_ARGS__)
#define log8(...) PRIMES_LOG_DISPATCH(8, __VA_ARGS__)
#define log9(...) PRIMES_LOG_DISPATCH(9, __VA_ARGS__)

#endif
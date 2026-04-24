#ifndef LOG_GUARD
#define LOG_GUARD

// Trace macros: compile-time gated via -DCOMPILE_TRACE
// #define PRIMES_TRACE_IS_INTEGER(x) _Generic((x), \
//   char: 1, signed char: 1, unsigned char: 1, short: 1, unsigned short: 1, \
//   int: 1, unsigned int: 1, long: 1, unsigned long: 1, long long: 1, unsigned long long: 1, \
//   default: 0)

// #define PRIMES_TRACE_IS_CSTRING(x) _Generic((x), \
//   char*: 1, const char*: 1, \
//   default: 0)

#ifdef COMPILE_TRACE
  #include "../trace/sieve_trace.h"
#endif

#define primes_log_should_explain(level) (option.explain_level >= (counter_t)(level))
// static inline int
// primes_log_should_explain(counter_t level)
// {
//     return option.explain_level >= level;
// }

#ifdef COMPILE_TRACE
  #define primes_log_should_trace(level) (option.trace_level >= (counter_t)(level))
#else
  #define primes_log_should_trace(level) (0)
#endif

// static inline int
// primes_log_should_trace(counter_t level)
// {
//     #ifdef COMPILE_TRACE
//     return g_trace.enabled && option.trace_level >= level;
//     #else
//     (void)level;
//     return 0;
//     #endif
// }

#ifdef COMPILE_TRACE
  #include "../trace/sieve_trace.h"
  #define TRACE_STEP(bitstorage_ptr, fmt, ...) trace_record_step_fmt(bitstorage_ptr, fmt, ##__VA_ARGS__)
  #define TRACE_STEP_LEVEL(level, bitstorage_ptr, fmt, ...) trace_record_step_fmt_level(bitstorage_ptr, level, fmt, ##__VA_ARGS__)
  #define TRACE_EVENT(bitstorage_ptr, fmt, ...) \
      trace_record_step_fmt(bitstorage_ptr, fmt, ##__VA_ARGS__)
  #define TRACE_EVENT_LEVEL(level, bitstorage_ptr, fmt, ...) \
      trace_record_step_fmt_level(bitstorage_ptr, level, fmt, ##__VA_ARGS__)
  // #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...) \
  //     TRACE_EVENT(bitstorage_ptr, fmt, ##__VA_ARGS__)
    #define TRACE_TEXT(fmt, ...) trace_record_text_fmt(fmt, ##__VA_ARGS__)
    #define TRACE_TEXT_LEVEL(level, fmt, ...) (primes_log_should_trace(level) ? trace_record_text_fmt_level(level, fmt, ##__VA_ARGS__) : (void)0)
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
  // #define TRACE_STEP_META(bitstorage_ptr, op, prime, bstart, bstop, fstep, fmt, ...)
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

// #define primes_log_text(...) TRACE_TEXT_LEVEL(__VA_ARGS__)

// static inline int primes_log_should_explain(counter_t level);
// static inline int primes_log_should_trace(counter_t level);
// static inline void primes_log_emit_verbose(counter_t level, const char* annotation);
// static inline void primes_log_text(counter_t level, const char* fmt, ...);
// static inline void primes_log_text_timer(counter_t level, counter_t timer, const char* fmt, ...);
// static inline void primes_log_event(counter_t level, const void* bitstorage_ptr, const char* fmt, ...);
// static inline void primes_log_event_timer(counter_t level, const void* bitstorage_ptr, counter_t timer, const char* fmt, ...);

// #define PRIMES_LOG_BEGIN(level, timer, printf_args...) \
//     verbose5( primes_log_text_timer(level, timer, printf_args); timer_lapstart(timer) TRACE_ANALYSIS_PUSH(level) )
// #define PRIMES_LOG_END(level, timer, ...) \
//     verbose5( TRACE_ANALYSIS_END(); timer_laptime(timer); __VA_OPT__(primes_log_text(level, __VA_ARGS__); ) )

// log<x>() can take different forms:
// log<x>(function, printf_args...)
// log<x>(printf_args...)
// log<x>(bitstorage, function, printf_args...)
// log<x>(bitstorage, printf_args...)

#define PRIMES_LOG_SELECT_SECOND(arg, on_integer, on_other)            _Generic((arg), function_id_t: on_integer, default: on_other)
#define PRIMES_LOG_SELECT_FIRST(arg, on_integer, on_cstring, on_other) _Generic((arg), function_id_t: on_integer, char*: on_cstring, const char*: on_cstring, default: on_other)

#define PRIMES_VA_COUNT_IMPL(  _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, N, ...) N
#define PRIMES_VA_COUNT(...)  PRIMES_VA_COUNT_IMPL(__VA_ARGS__, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1)

#define PRIMES_LOG_DISPATCH_1(level, a1)                PRIMES_LOG_SELECT_FIRST(a1, \
                                                            trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(a1)], ""), \
                                                            trace_record_text_fmt_level(level, a1), \
                                                            trace_record_step_fmt_level(a1, level))
#define PRIMES_LOG_DISPATCH_2(level, a1, a2)            PRIMES_LOG_SELECT_FIRST(a1, \
                                                            trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(a1)], a2), \
                                                            trace_record_text_fmt_level(level, a1, a2), \
                                                            trace_record_step_fmt_level(a1, level, a2))
#define PRIMES_LOG_DISPATCH_3(level, a1, a2, a3, ...)   PRIMES_LOG_SELECT_FIRST(a1, primes_log_text_timer, primes_log_text, PRIMES_LOG_SELECT_SECOND(a2, primes_log_event_timer,primes_log_event))(level, a1, a2, a3, ##__VA_ARGS__)

// #define PRIMES_LOG_DISPATCH_3(level, a1, a2, a3, ...)   PRIMES_LOG_SELECT_FIRST(a1, primes_log_text_timer(level, a1, a2, a3, ##__VA_ARGS__), primes_log_text(level, a1, a2, a3, ##__VA_ARGS__), PRIMES_LOG_SELECT_SECOND(a2, primes_log_event_timer(level, a1, a2, a3, ##__VA_ARGS__),primes_log_event(level, a1, a2, a3, ##__VA_ARGS__)))

// #define PRIMES_LOG_DISPATCH_3(level, a1, a2, a3, ...)   PRIMES_LOG_SELECT_FIRST(a1, \
//                                                             trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(a1)]), \
//                                                             trace_record_text_fmt_level(level, a1), \
//                                                             trace_record_step_fmt_level(a1, level, a2, ##__VA_ARGS__))

// PRIMES_LOG_SELECT_FIRST(a1, \
//                                                             trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(a1)], a2), \
//                                                             trace_record_text_fmt_level(level, a1, a2, a3, ##__VA_ARGS__), \
//                                                             trace_record_step_fmt_level(a1, level, a2))
//                                                             // PRIMES_LOG_SELECT_SECOND(a2, \
//                                                             //     trace_record_step_labeled_fmt_level(a1, level, timer_function_names[(counter_t)(a2)],""), \
//                                                             //     trace_record_step_fmt_level(a1, level,"") \
//                                                             // ))

#define PRIMES_LOG_DISPATCH_SELECT_IMPL(count) PRIMES_LOG_DISPATCH_##count
#define PRIMES_LOG_DISPATCH_SELECT(count) PRIMES_LOG_DISPATCH_SELECT_IMPL(count)
#if COMPILE_VERBOSE_LEVEL >= 5
  #define PRIMES_LOG_DISPATCH(level, ...) \
    PRIMES_LOG_DISPATCH_SELECT(PRIMES_VA_COUNT(__VA_ARGS__))(level, __VA_ARGS__)
#else
  #define PRIMES_LOG_DISPATCH(level, ...)
#endif

// these are the new functions
#define log4(...) verbose(4, printf(__VA_ARGS__))
#define log5(...) PRIMES_LOG_DISPATCH(5, __VA_ARGS__)
#define log6(...) PRIMES_LOG_DISPATCH(6, __VA_ARGS__)
#define log7(...) PRIMES_LOG_DISPATCH(7, __VA_ARGS__)
#define log8(...) PRIMES_LOG_DISPATCH(8, __VA_ARGS__)
#define log9(...) PRIMES_LOG_DISPATCH(9, __VA_ARGS__)

// trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(timer)], fmt, ##__VA_ARGS__)
#define logBegins(level, bitstorage, timer, printf_args...) \
          primes_trace_set_context(level); \
          trace_record_step_labeled_fmt_level(bitstorage, level, timer_function_names[timer], printf_args); \
          timer_lapstart(timer);

// #define logBegins(level, bitstorage, timer, printf_args...) \
// verbose5( trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(timer)], printf_args) ); \
// timer_lapstart(timer); \
// primes_trace_set_context(level); \
// trace_record_step_labeled_fmt_level(bitstorage, level, timer_function_names[timer], printf_args);


// #define logBegins(level, bitstorage, timer, printf_args...) verbose5( primes_log_text_timer(level, timer, printf_args) ); timer_lapstart(timer); TRACE_ANALYSIS_PUSH(level); PRIMES_LOG_DISPATCH(level, bitstorage, timer, printf_args); 
#define logEnds(level, bitstorage, timer, printf_args...) \
          timer_laptime(timer); \
          trace_record_step_labeled_fmt_level(bitstorage, level, timer_function_names[timer], printf_args); \
          primes_trace_clear_context(); 

// verbose5( trace_record_text_labeled_fmt_level(level, timer_function_names[(counter_t)(timer)], printf_args) ); 
#ifndef COMPILE_TRACE
  #undef logBegins
  #define logBegins(level, bitstorage, timer, printf_args...) 
  #undef logEnds
  #define logEnds(level, bitstorage, timer, printf_args...) 
#endif

#define logBegins5(bitstorage, timer, printf_args...) logBegins(5, bitstorage, timer, printf_args)
#define logBegins6(bitstorage, timer, printf_args...) logBegins(6, bitstorage, timer, printf_args)
#define logBegins7(bitstorage, timer, printf_args...) logBegins(7, bitstorage, timer, printf_args)
#define logBegins8(bitstorage, timer, printf_args...) logBegins(8, bitstorage, timer, printf_args)
#define logBegins9(bitstorage, timer, printf_args...) logBegins(9, bitstorage, timer, printf_args)

#define logEnds5(bitstorage, timer, printf_args...) logEnds(5, bitstorage, timer, printf_args)
#define logEnds6(bitstorage, timer, printf_args...) logEnds(6, bitstorage, timer, printf_args)
#define logEnds7(bitstorage, timer, printf_args...) logEnds(7, bitstorage, timer, printf_args)
#define logEnds8(bitstorage, timer, printf_args...) logEnds(8, bitstorage, timer, printf_args)
#define logEnds9(bitstorage, timer, printf_args...) logEnds(9, bitstorage, timer, printf_args)


static inline void
primes_log_emit_verbose(counter_t level, const char* annotation)
{
        if (option.explain_level < level) return;
        printf("%s\n", annotation);
}

// #define primes_log_text(...) TRACE_TEXT_LEVEL(__VA_ARGS__)

static inline void
primes_log_text(counter_t level, const char* fmt, ...)
{
    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    // if (primes_log_should_explain(level)) {
        primes_log_emit_verbose(level, annotation);
    // }
    if (primes_log_should_trace(level)) {
        TRACE_TEXT_LEVEL(level, "%s", annotation);
    }
}

static inline void
primes_log_text_timer(counter_t level, counter_t timer, const char* fmt, ...)
{
    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    // if (primes_log_should_explain(level)) {
        primes_log_emit_verbose(level, annotation);
    // }
    if (primes_log_should_trace(level)) {
        TRACE_TEXT_TIMER_LEVEL(level, timer, "%s", annotation);
    }
}

static inline void
primes_log_event(counter_t level, const void* bitstorage_ptr, const char* fmt, ...)
{
    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    // if (primes_log_should_explain(level)) {
        primes_log_emit_verbose(level, annotation);
    // }
    if (primes_log_should_trace(level)) {
        TRACE_EVENT_LEVEL(level, bitstorage_ptr, "%s", annotation);
    }
}

static inline void
primes_log_event_timer(counter_t level, const void* bitstorage_ptr, counter_t timer, const char* fmt, ...)
{
    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    // if (primes_log_should_explain(level)) {
        primes_log_emit_verbose(level, annotation);
    // }
    if (primes_log_should_trace(level)) {
        TRACE_EVENT_TIMER_LEVEL(level, bitstorage_ptr, timer, "%s", annotation);
    }
}


#endif
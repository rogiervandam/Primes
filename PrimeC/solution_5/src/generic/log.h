#ifndef LOG_GUARD
#define LOG_GUARD

#ifdef COMPILE_TRACE
  #include "../trace/sieve_trace.h"
#endif

#define primes_log_should_explain(level) (option.explain_level >= (counter_t)(level))

#ifdef COMPILE_TRACE
  #define primes_log_should_trace(level) (option.trace_level >= (counter_t)(level))
#else
  #define primes_log_should_trace(level) (0)
#endif

#define PRIMES_LOG_SELECT_FIRST(arg, on_integer, on_cstring, on_other) _Generic((arg), function_id_t: on_integer, char*: on_cstring, const char*: on_cstring, default: on_other)

#define PRIMES_VA_COUNT_IMPL(  _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, N, ...) N
#define PRIMES_VA_COUNT(...)  PRIMES_VA_COUNT_IMPL(__VA_ARGS__, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1)

#define PRIMES_LOG_DISPATCH_1(level, a1)                PRIMES_LOG_SELECT_FIRST(a1, \
                                                            trace_record_text, \
                                                            trace_record_text_unlabeled, \
                                                            trace_record_event)(level, a1)
#define PRIMES_LOG_DISPATCH_2(level, a1, a2)            PRIMES_LOG_SELECT_FIRST(a1, \
                                                            trace_record_text, \
                                                            trace_record_text_unlabeled, \
                                                            trace_record_event)(level, a1, a2)
#define PRIMES_LOG_DISPATCH_3(level, a1, a2, ...)       PRIMES_LOG_SELECT_FIRST(a1, \
                                                            trace_record_text_functionid, \
                                                            trace_record_text_unlabeled, \
                                                            PRIMES_LOG_SELECT_FIRST(a2, \
                                                                trace_record_event_functionid, \
                                                                trace_record_text_unlabeled, \
                                                                trace_record_event) \
                                                        )(level, a1, a2, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_SELECT_IMPL(count) PRIMES_LOG_DISPATCH_##count
#define PRIMES_LOG_DISPATCH_SELECT(count) PRIMES_LOG_DISPATCH_SELECT_IMPL(count)
#if COMPILE_VERBOSE_LEVEL >= 5
  #define PRIMES_LOG_DISPATCH(level, ...) \
    PRIMES_LOG_DISPATCH_SELECT(PRIMES_VA_COUNT(__VA_ARGS__))(level, __VA_ARGS__)
#else
  #define PRIMES_LOG_DISPATCH(level, ...)
#endif

#define log4(...) verbose(4, printf(__VA_ARGS__))
#define log5(...) PRIMES_LOG_DISPATCH(5, __VA_ARGS__)
#define log6(...) PRIMES_LOG_DISPATCH(6, __VA_ARGS__)
#define log7(...) PRIMES_LOG_DISPATCH(7, __VA_ARGS__)
#define log8(...) PRIMES_LOG_DISPATCH(8, __VA_ARGS__)
#define log9(...) PRIMES_LOG_DISPATCH(9, __VA_ARGS__)

#define logBegins(level, bitstorage, timer, printf_args...) \
          primes_trace_set_context(level); \
          trace_record_event(level, bitstorage, timer_function_names[timer], 0, printf_args); \
          timer_lapstart(timer);

#define logEnds(level, bitstorage, timer, printf_args...) \
          trace_record_event(level, bitstorage, timer_function_names[timer], timer_laptime_function(timer), printf_args); \
          primes_trace_clear_context(); 

#ifndef COMPILE_TRACE
  #undef logBegins
  #define logBegins(level, bitstorage, timer, printf_args...) timer_lapstart(timer);
  #undef logEnds
  #define logEnds(level, bitstorage, timer, printf_args...) timer_laptime(timer);
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

#ifdef COMPILE_TRACE
static inline void
trace_record_text_functionid(int level, function_id_t function_id, const char* fmt, ...)
{
    char annotation[1024];
    va_list args; va_start(args, fmt); vsnprintf(annotation, sizeof(annotation), fmt, args); va_end(args);
    trace_record_text_full(level, timer_function_names[function_id], annotation);
}

static inline void
trace_record_event_functionid(int level, void* bitstorage, function_id_t function_id, const char* fmt, ...)
{
    char annotation[1024];
    va_list args; va_start(args, fmt); vsnprintf(annotation, sizeof(annotation), fmt, args); va_end(args);
    trace_record_event_full(level, bitstorage, timer_function_names[function_id], (double)0, annotation);
}

#endif

#endif
#ifndef LOG_GUARD
#define LOG_GUARD

// Logging feature

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
                                                            log_text_functionid, \
                                                            log_text_unlabeled, \
                                                            log_event_untimed)(level, a1)
#define PRIMES_LOG_DISPATCH_2(level, a1, a2)            PRIMES_LOG_SELECT_FIRST(a1, \
                                                            log_text_functionid, \
                                                            log_text_unlabeled, \
                                                            log_event_untimed)(level, a1, a2)
#define PRIMES_LOG_DISPATCH_3(level, a1, a2, ...)       PRIMES_LOG_SELECT_FIRST(a1, \
                                                            log_text_functionid, \
                                                            log_text_unlabeled, \
                                                            PRIMES_LOG_SELECT_FIRST(a2, \
                                                                log_event_functionid, \
                                                                log_event_bare, \
                                                                log_event) \
                                                        )(level, a1, a2, ##__VA_ARGS__)
#define PRIMES_LOG_DISPATCH_SELECT_IMPL(count) PRIMES_LOG_DISPATCH_##count
#define PRIMES_LOG_DISPATCH_SELECT(count) PRIMES_LOG_DISPATCH_SELECT_IMPL(count)
#if COMPILE_VERBOSE_LEVEL >= 5
  #define PRIMES_LOG_DISPATCH(level, ...) \
    { if (option.trace_level >= level) { \
      primes_trace_set_context(level); \
      { PRIMES_LOG_DISPATCH_SELECT(PRIMES_VA_COUNT(__VA_ARGS__))(level, __VA_ARGS__); } \
      primes_trace_clear_context(); \
    } }
#else
  #define PRIMES_LOG_DISPATCH(level, ...)
#endif

#define log(level, ...) PRIMES_LOG_DISPATCH(level, __VA_ARGS__)
#define log4(...) verbose(4, printf(__VA_ARGS__))
#define log5(...) PRIMES_LOG_DISPATCH(5, __VA_ARGS__)
#define log6(...) PRIMES_LOG_DISPATCH(6, __VA_ARGS__)
#define log7(...) PRIMES_LOG_DISPATCH(7, __VA_ARGS__)
#define log8(...) PRIMES_LOG_DISPATCH(8, __VA_ARGS__)
#define log9(...) PRIMES_LOG_DISPATCH(9, __VA_ARGS__)

// logBegin does 3 things:
// 1. Record a trace record and start a context
// 2. Record a explain record
// 3. Record a timer start

#define logStart(level, bitstorage, timer, printf_args...) \
          { if (option.trace_level >= level) primes_trace_set_context(level); } \
          log_event(level, bitstorage, timer_function_names[timer], 0, printf_args); \
          timer_lapstart(timer);

#define logStop(level, bitstorage, timer, printf_args...) \
          { if (option.trace_level >= level) log_event(level, bitstorage, timer_function_names[timer], timer_laptime_function(timer), printf_args); } \
          { if (option.trace_level >= level) primes_trace_clear_context(); }

#ifndef COMPILE_TRACE
  #undef logStart
  #define logStart(level, bitstorage, timer, printf_args...) timer_lapstart(timer);
  // #define logStart(level, bitstorage, timer, printf_args...)
  #undef logStop
  #define logStop(level, bitstorage, timer, printf_args...) timer_laptime(timer);
  // #define logStop(level, bitstorage, timer, printf_args...) 
#endif

#define logStart5(bitstorage, timer, printf_args...) logStart(5, bitstorage, timer, printf_args)
#define logStart6(bitstorage, timer, printf_args...) logStart(6, bitstorage, timer, printf_args)
#define logStart7(bitstorage, timer, printf_args...) logStart(7, bitstorage, timer, printf_args)
#define logStart8(bitstorage, timer, printf_args...) logStart(8, bitstorage, timer, printf_args)
#define logStart9(bitstorage, timer, printf_args...) logStart(9, bitstorage, timer, printf_args)

#define logStop5(bitstorage, timer, printf_args...) logStop(5, bitstorage, timer, printf_args)
#define logStop6(bitstorage, timer, printf_args...) logStop(6, bitstorage, timer, printf_args)
#define logStop7(bitstorage, timer, printf_args...) logStop(7, bitstorage, timer, printf_args)
#define logStop8(bitstorage, timer, printf_args...) logStop(8, bitstorage, timer, printf_args)
#define logStop9(bitstorage, timer, printf_args...) logStop(9, bitstorage, timer, printf_args)

#ifdef COMPILE_TRACE
static inline void
log_text_functionid(int level, function_id_t function_id, const char* fmt, ...)
{
    char annotation[1024];
    va_list args; va_start(args, fmt); vsnprintf(annotation, sizeof(annotation), fmt, args); va_end(args);
    trace_record_text_full(level, timer_function_names[function_id], annotation);
}

static inline void
log_event_functionid(int level, void* bitstorage, function_id_t function_id, const char* fmt, ...)
{
    char annotation[1024];
    va_list args; va_start(args, fmt); vsnprintf(annotation, sizeof(annotation), fmt, args); va_end(args);
    trace_record_event_full(level, bitstorage, timer_function_names[function_id], (double)0, annotation);
}

// static inline void
// log_event_byFunction(int level, void* bitstorage, function_id_t function_id, const char* fmt, ...)
// {
//     char annotation[1024];
//     va_list args; va_start(args, fmt); vsnprintf(annotation, sizeof(annotation), fmt, args); va_end(args);
//     if 
//     trace_record_event_full(level, bitstorage, timer_function_names[function_id], (double)0, annotation);
//     explain
// }

#define COLLECT_ARGS(string, maxlength, fmt, args) \
    char string[maxlength]; va_list args; va_start(args, fmt); vsnprintf(string, sizeof(string), fmt, args); va_end(args);

    static void
log_text(int level, const char* label, const char* fmt, ...)
{
    COLLECT_ARGS(annotation, 1024, fmt, args);
    if (option.trace_level >= level) trace_record_text_full(level, label, annotation);
    if (option.explain_level >= level) {
        if (label) {
            printf("%s: %s\n", label, annotation);
        } else {
            printf("%s\n", annotation);
        }
    }
}

// passes all to log_text but NULL for label
static void
log_text_unlabeled(int level, const char* fmt, ...)
{
    COLLECT_ARGS(annotation, 1024, fmt, args);
    if (option.trace_level >= level) trace_record_text_full(level, NULL, annotation);
    if (option.explain_level >= level) printf("%s\n", annotation);
}

static void
log_event(int level, const void* bitstorage, const char* label, double time, const char* fmt, ...)
{
    COLLECT_ARGS(annotation, 1024, fmt, args);
    if (option.trace_level >= level) trace_record_event_full(level, bitstorage, label, time, annotation);
    if (option.explain_level >= level) {
        if (label) {
            printf("%s: %s\n", label, annotation);
        } else {
            printf("%s\n", annotation);
        }
    }
}

static void
log_event_untimed(int level, const void* bitstorage, const char* label, const char* fmt, ...)
{
    COLLECT_ARGS(annotation, 1024, fmt, args);
    if (option.trace_level >= level) trace_record_event_full(level, bitstorage, label, 0.0, annotation);
    if (option.explain_level >= level) {
        if (label) {
            printf("%s: %s\n", label, annotation);
        } else {
            printf("%s\n", annotation);
        }
    }
}

static void
log_event_bare(int level, const void* bitstorage, const char* fmt, ...)
{
    COLLECT_ARGS(annotation, 1024, fmt, args);
    if (option.trace_level >= level) trace_record_event_full(level, bitstorage, NULL, 0.0, annotation);
    if (option.explain_level >= level) printf("%s\n", annotation);
}

static inline void
log_mask(int level, void* bitstorage,
        uint64_t word_bits,
        counter_t range_start_index,
        counter_t range_stop_index,
        counter_t step,
        const void* mask_ptr,
        size_t mask_lane_bytes,
        uint32_t mask_lane_count,
        uint32_t mask_lane_bits)
{
    if (!(primes_log_should_trace(level) || primes_log_should_explain(level))) return;

    char annotation[4096] = {0};
    char mask_bits_text[2048] = {0};
    uint32_t mask_bits[1024] = {0};
    uint64_t* mask_target_words = NULL;
    uint32_t* mask_target_slots = NULL;
    uint32_t mask_target_count = 0;
    uint32_t mask_count = 0;

    mask_count = primes_trace_collect_mask_bits(mask_bits, 1024, mask_ptr, mask_lane_bytes, mask_lane_count, mask_lane_bits);

    primes_trace_format_mask_bits(mask_bits_text, sizeof(mask_bits_text), mask_ptr, mask_lane_bytes, mask_lane_count, mask_lane_bits);

    snprintf(annotation,
             sizeof(annotation),
             "ApplyMask: word_bits=%ju word_start=%ju word_stop=%ju step_words=%ju mask_bits=%s focus_start=%ju focus_stop=%ju bitrange=%ju-%ju",
             (uintmax_t)word_bits,
             (uintmax_t)range_start_index,
             (uintmax_t)range_stop_index,
             (uintmax_t)step,
             mask_bits_text,
             (uintmax_t)(range_start_index * word_bits),
             (uintmax_t)((range_stop_index + 1) * word_bits - 1),
             (uintmax_t)(range_start_index * word_bits),
             (uintmax_t)((range_stop_index + 1) * word_bits - 1));

    log(level, annotation);

    if (primes_log_should_trace(level)) {
        const uint64_t target_capacity = range_stop_index >= range_start_index
            ? (uint64_t)((range_stop_index - range_start_index) / step) + 1
            : 0;
        if (target_capacity > 0) {
            mask_target_words = (uint64_t*)malloc(sizeof(uint64_t) * (size_t)target_capacity);
            mask_target_slots = (uint32_t*)malloc(sizeof(uint32_t) * (size_t)target_capacity);
        }
        if ((target_capacity == 0) || (mask_target_words && mask_target_slots)) {
            for (counter_t word_index = range_start_index; word_index <= range_stop_index; word_index += step) {
                mask_target_words[mask_target_count] = (uint64_t)word_index;
                mask_target_slots[mask_target_count] = 0;
                mask_target_count++;
            }
            trace_record_applymask_step_labeled(bitstorage,
                                                annotation,
                                                "ApplyMask",
                                                level,
                                                word_bits,
                                                (uint64_t)range_start_index,
                                                (uint64_t)range_stop_index,
                                                (uint64_t)step,
                                                mask_bits,
                                                mask_count,
                                                NULL,
                                                0,
                                                mask_target_words,
                                                mask_target_slots,
                                                mask_target_count);
        }
    }

    free(mask_target_words);
    free(mask_target_slots);
}

static inline void
log_mask_pair(int level, void* bitstorage,
        uint64_t word_bits,
        counter_t range_start_index,
        counter_t range_stop_index,
        counter_t step,
        const void* mask1_ptr,
        const void* mask2_ptr,
        size_t mask_lane_bytes,
        uint32_t mask_lane_count,
        uint32_t mask_lane_bits)
{
    if (!(primes_log_should_trace(level) || primes_log_should_explain(level))) return;

    char annotation[4096] = {0};
    char mask1_bits_text[2048] = {0};
    char mask2_bits_text[2048] = {0};
    uint32_t mask1_bits[1024] = {0};
    uint32_t mask2_bits[1024] = {0};
    uint64_t* mask_target_words = NULL;
    uint32_t* mask_target_slots = NULL;
    uint32_t mask_target_count = 0;
    uint32_t mask1_count = 0;
    uint32_t mask2_count = 0;

    mask1_count = primes_trace_collect_mask_bits(mask1_bits, 1024, mask1_ptr, mask_lane_bytes, mask_lane_count, mask_lane_bits);
    mask2_count = primes_trace_collect_mask_bits(mask2_bits, 1024, mask2_ptr, mask_lane_bytes, mask_lane_count, mask_lane_bits);

    primes_trace_format_mask_bits(mask1_bits_text, sizeof(mask1_bits_text), mask1_ptr, mask_lane_bytes, mask_lane_count, mask_lane_bits);
    primes_trace_format_mask_bits(mask2_bits_text, sizeof(mask2_bits_text), mask2_ptr, mask_lane_bytes, mask_lane_count, mask_lane_bits);

    snprintf(annotation,
             sizeof(annotation),
             "ApplyMaskPair: word_bits=%ju word_start=%ju word_stop=%ju step_words=%ju mask1_bits=%s mask2_bits=%s focus_start=%ju focus_stop=%ju bitrange=%ju-%ju",
             (uintmax_t)word_bits,
             (uintmax_t)range_start_index,
             (uintmax_t)range_stop_index,
             (uintmax_t)step,
             mask1_bits_text,
             mask2_bits_text,
             (uintmax_t)(range_start_index * word_bits),
             (uintmax_t)((range_stop_index + 1) * word_bits - 1),
             (uintmax_t)(range_start_index * word_bits),
             (uintmax_t)((range_stop_index + 1) * word_bits - 1));

    log(level, annotation);

    if (primes_log_should_trace(level)) {
        const uint64_t pair_capacity = range_stop_index > range_start_index
            ? (uint64_t)(((range_stop_index - range_start_index - 1) / step) + 1)
            : 0;
        const uint64_t target_capacity = pair_capacity * 2 + 1;
        if (target_capacity > 0) {
            mask_target_words = (uint64_t*)malloc(sizeof(uint64_t) * (size_t)target_capacity);
            mask_target_slots = (uint32_t*)malloc(sizeof(uint32_t) * (size_t)target_capacity);
        }
        if ((target_capacity == 0) || (mask_target_words && mask_target_slots)) {
            for (counter_t word_index = range_start_index; word_index < range_stop_index; word_index += step) {
                mask_target_words[mask_target_count] = (uint64_t)word_index;
                mask_target_slots[mask_target_count] = 0;
                mask_target_count++;

                mask_target_words[mask_target_count] = (uint64_t)(word_index + 1);
                mask_target_slots[mask_target_count] = 1;
                mask_target_count++;
            }
            if (range_start_index <= range_stop_index && ((range_stop_index - range_start_index) % step) == 0) {
                mask_target_words[mask_target_count] = (uint64_t)range_stop_index;
                mask_target_slots[mask_target_count] = 0;
                mask_target_count++;
            }
            trace_record_applymask_step_labeled(bitstorage,
                                                annotation,
                                                "ApplyMaskPair",
                                                level,
                                                word_bits,
                                                (uint64_t)range_start_index,
                                                (uint64_t)range_stop_index,
                                                (uint64_t)step,
                                                mask1_bits,
                                                mask1_count,
                                                mask2_bits,
                                                mask2_count,
                                                mask_target_words,
                                                mask_target_slots,
                                                mask_target_count);
        }
    }

    free(mask_target_words);
    free(mask_target_slots);
}

#endif

#endif
#ifndef LOG_GUARD
#define LOG_GUARD

// Logging feature

#ifdef COMPILE_TRACE
  #include "functions.h" // for function_id_t and timer_function_names
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
#define log1(...) verbose(1, printf(__VA_ARGS__))
#define log2(...) verbose(2, printf(__VA_ARGS__))
#define log3(...) verbose(3, printf(__VA_ARGS__))
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
          { if (option.trace_level >= level) primes_trace_set_context(level+1); log_event(((level)+1), bitstorage, timer_function_names[timer], timer_laptime_function(timer), printf_args);  \
            if (option.trace_level >= level) primes_trace_clear_context(); }

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

#define logMask7(bitstorage, timer, printf_args...) log_mask(7, bitstorage, timer_function_names[timer], printf_args)
#define logMask8(bitstorage, timer, printf_args...) log_mask(8, bitstorage, timer_function_names[timer], printf_args)
#define logMask9(bitstorage, timer, printf_args...) log_mask(9, bitstorage, timer_function_names[timer], printf_args)

#ifdef COMPILE_TRACE
static inline void
log_text_functionid(int level, function_id_t function_id, const char* fmt, ...)
{
    char annotation[1024];
    va_list args; va_start(args, fmt); vsnprintf(annotation, sizeof(annotation), fmt, args); va_end(args);
    trace_record_text(level, timer_function_names[function_id], annotation);
}

static inline void
log_event_functionid(int level, void* bitstorage, function_id_t function_id, const char* fmt, ...)
{
    char annotation[1024];
    va_list args; va_start(args, fmt); vsnprintf(annotation, sizeof(annotation), fmt, args); va_end(args);
    trace_record_event(level, bitstorage, timer_function_names[function_id], (double)0, annotation);
}

#define COLLECT_ARGS(string, maxlength, fmt, args) \
    char string[maxlength]; va_list args; va_start(args, fmt); vsnprintf(string, sizeof(string), fmt, args); va_end(args);

static void
log_text(int level, const char* label, const char* fmt, ...)
{
    COLLECT_ARGS(annotation, 1024, fmt, args);
    if (option.trace_level >= level) trace_record_text(level, label, annotation);
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
    if (option.trace_level >= level) trace_record_text(level, NULL, annotation);
    if (option.explain_level >= level) printf("%s\n", annotation);
}

static void
log_event(int level, const void* bitstorage, const char* label, double time, const char* fmt, ...)
{
    COLLECT_ARGS(annotation, 1024, fmt, args);
    if (option.trace_level >= level) trace_record_event(level, bitstorage, label, time, annotation);
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
    if (option.trace_level >= level) trace_record_event(level, bitstorage, label, 0.0, annotation);
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
    if (option.trace_level >= level) trace_record_event(level, bitstorage, NULL, 0.0, annotation);
    if (option.explain_level >= level) printf("%s\n", annotation);
}

static inline void
log_mask(int level, const void* bitstorage, const char* label, uint64_t word_bits,
        counter_t range_start_index, counter_t range_stop_index, counter_t step,
        const void* const* mask_ptrs, uint32_t mask_slot_count,
        size_t mask_lane_bytes, uint32_t mask_lane_count, uint32_t mask_lane_bits)
{
    if (!(primes_log_should_trace(level) || primes_log_should_explain(level))) return;
    if (mask_slot_count == 0 || mask_slot_count > 8) return;

    // static const char* s_opnames[] = {"", "ApplyMask", "ApplyMaskPair", "ApplyMaskTriple", "ApplyMaskQuad"};

    char annotation[4096] = {0};
    uint32_t all_mask_bits[8][1024];
    uint32_t all_mask_counts[8] = {0};
    char mask_bits_texts[8][1024];
    uint64_t* mask_target_words = NULL;
    uint32_t* mask_target_slots = NULL;
    uint32_t mask_target_count = 0;

    memset(all_mask_bits, 0, sizeof(all_mask_bits));
    memset(mask_bits_texts, 0, sizeof(mask_bits_texts));

    for (uint32_t s = 0; s < mask_slot_count; s++) {
        all_mask_counts[s] = primes_trace_collect_mask_bits(all_mask_bits[s], 1024, mask_ptrs[s],
                                                            mask_lane_bytes, mask_lane_count, mask_lane_bits);
        primes_trace_format_mask_bits(mask_bits_texts[s], sizeof(mask_bits_texts[s]), mask_ptrs[s],
                                      mask_lane_bytes, mask_lane_count, mask_lane_bits);
    }

    /* Build mask-bits portion of the annotation */
    char mask_part[2048] = {0};
    // if (mask_slot_count == 1) {
    //     snprintf(mask_part, sizeof(mask_part), "mask_bits=%s", mask_bits_texts[0]);
    // } else {
    //     char* p = mask_part;
    //     size_t rem = sizeof(mask_part);
    //     for (uint32_t s = 0; s < mask_slot_count && rem > 1; s++) {
    //         int n = snprintf(p, rem, "%smask%u_bits=%s", s > 0 ? " " : "", s + 1, mask_bits_texts[s]);
    //         if (n > 0) { p += (size_t)n; rem -= (size_t)n; }
    //     }
    // }

    snprintf(annotation, sizeof(annotation),
             "%s: with mask of %ju bits, start bucket %ju stop bucket %ju step %ju %s focus_start %ju focus_stop %ju bitrange %ju-%ju",
             label,//s_opnames[mask_slot_count],
             (uintmax_t)word_bits, (uintmax_t)range_start_index, (uintmax_t)range_stop_index, (uintmax_t)step,
             mask_part,
             (uintmax_t)(range_start_index * word_bits), (uintmax_t)((range_stop_index + 1) * word_bits - 1),
             (uintmax_t)(range_start_index * word_bits), (uintmax_t)((range_stop_index + 1) * word_bits - 1));

    // log(level, annotation);

    if (primes_log_should_trace(level)) {
        /* Upper-bound capacity: all step-aligned positions × slots */
        const uint64_t total_steps = range_stop_index >= range_start_index
            ? (uint64_t)((range_stop_index - range_start_index) / step) + 1
            : 0;
        const uint64_t target_capacity = total_steps * mask_slot_count;
        if (target_capacity > 0) {
            mask_target_words = (uint64_t*)malloc(sizeof(uint64_t) * (size_t)target_capacity);
            mask_target_slots = (uint32_t*)malloc(sizeof(uint32_t) * (size_t)target_capacity);
        }
        if ((target_capacity == 0) || (mask_target_words && mask_target_slots)) {
            counter_t word_index;
            /* Full groups: all mask_slot_count consecutive words fit within range */
            for (word_index = range_start_index;
                 word_index + (counter_t)(mask_slot_count - 1) <= range_stop_index;
                 word_index += step) {
                for (uint32_t s = 0; s < mask_slot_count; s++) {
                    mask_target_words[mask_target_count] = (uint64_t)(word_index + (counter_t)s);
                    mask_target_slots[mask_target_count] = s;
                    mask_target_count++;
                }
            }
            /* Partial remainder: slots that still fit within range_stop_index */
            for (uint32_t s = 0; s < mask_slot_count - 1; s++) {
                if (word_index + (counter_t)s > range_stop_index) break;
                mask_target_words[mask_target_count] = (uint64_t)(word_index + (counter_t)s);
                mask_target_slots[mask_target_count] = s;
                mask_target_count++;
            }
            const uint32_t* slot_bits_ptrs[8] = {
                all_mask_bits[0], all_mask_bits[1], all_mask_bits[2], all_mask_bits[3],
                all_mask_bits[4], all_mask_bits[5], all_mask_bits[6], all_mask_bits[7]
            };
            trace_record_applymask(level, bitstorage, label, annotation,
                                                word_bits, (uint64_t)range_start_index, (uint64_t)range_stop_index, (uint64_t)step,
                                                slot_bits_ptrs, all_mask_counts, mask_slot_count,
                                                mask_target_words, mask_target_slots, mask_target_count);
        }
    }

    free(mask_target_words);
    free(mask_target_slots);
}

#endif

#endif
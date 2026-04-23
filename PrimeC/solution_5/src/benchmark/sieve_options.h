
#include "../generic/settings.h"

typedef struct  {
    counter_t factor_max;
    counter_t stripe_faster;
    counter_t largestep_faster;
    counter_t blocksize_bits;
    counter_t vectorsize;
    counter_t algorithm;
    counter_t storage;
    counter_t threads;
    double    sample_duration;
} benchmark_settings_t;

typedef struct  {
    benchmark_settings_t settings;
    counter_t passes;
    double    elapsed_time;
    double    avg;
} benchmark_result_t;

static struct options_t {
    benchmark_settings_t fixed_benchmark_settings;
    counter_t show_explain_factor_max;
    counter_t show_tuning_results_max;
    counter_t show_primes_on_error;
    counter_t show_nonprimes_on_error;
    counter_t verbose_level;
    counter_t explain;
    counter_t explain_level;
    counter_t trace_level;
    counter_t timers;
    counter_t check;
    counter_t tunelevel;
    counter_t extended_output;
    double    initial_sample_duration;
    double    next_sample_duration;
    double    warmup_duration;
    double    tune_duration_max;
    counter_t tune_keeppercent_longlist;
    counter_t tune_keeppercent_shortlist;
    char*     program_name;
    char*     dockerfile_type;
    char*     extension;
    char*     trace_filename;
} option;

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

static struct options_t __attribute__((cold)) 
setDefaultOptions() 
{
    option.show_explain_factor_max    = 0;
    option.show_tuning_results_max    = 50;
    option.show_primes_on_error       = 100;
    option.show_nonprimes_on_error    = 10;
    option.verbose_level              = 0; // to what max level must output generation be (pre)compiled, must be >= explain_level and trace_level to get output
    option.explain                    = 0; //deprecated, use --explain-level instead
    option.explain_level              = 0; // to what level must explain output be generated
    option.trace_level                = 0; // to what level must trace output be generated
    option.timers                     = 0;

    option.check                      = 2;
    option.tunelevel                  = 2;
    option.initial_sample_duration    = 0.0005;
    option.next_sample_duration       = 0.002;
    option.warmup_duration            = 1;
    option.tune_duration_max          = 5.0;
    option.tune_keeppercent_longlist  = 20;
    option.tune_keeppercent_shortlist = 25;

    option.fixed_benchmark_settings.factor_max              = 1000000;
    option.fixed_benchmark_settings.threads                 = 1;
    option.fixed_benchmark_settings.stripe_faster           = 0;
    option.fixed_benchmark_settings.largestep_faster        = 0;
    option.fixed_benchmark_settings.blocksize_bits          = 0;
    option.fixed_benchmark_settings.vectorsize              = 0;
    option.fixed_benchmark_settings.algorithm               = 0;
    option.fixed_benchmark_settings.storage                 = 0;
    option.fixed_benchmark_settings.sample_duration         = 5;

    option.dockerfile_type = getenv("DOCKERFILE_TYPE"); 
    option.trace_filename  = NULL;

    // changes though compilation options
    #ifdef _OPENMP
    option.fixed_benchmark_settings.threads                 = omp_get_max_threads();
    #endif

    #ifdef COMPILE_TIMERS
    option.timers = 1;
    #endif

    #ifdef _OPENMP
    option.extension = "_epar";
    #else
    option.extension = "";
    #endif

    #ifdef ALGORITHM_CLASSIC
    option.tunelevel = 0;
    #endif

    // good to remember
    #define default_explain_level 6 
    #define default_trace_level 9

    return option;
}

#include "sieve_timers.h"
#include "../generic/tools.h"

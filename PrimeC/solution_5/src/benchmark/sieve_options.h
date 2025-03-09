struct sieve_t {
    bitword_t* bitstorage __attribute__((aligned(anticiped_cache_line_bytesize)));  // Align to cache line
    counter_t bits;
  } __attribute__((aligned(anticiped_cache_line_bytesize)));  // Align the whole structure

typedef struct  {
    counter_t factor_max;
    counter_t stripe_faster;
    counter_t mediumstep_faster;
    counter_t largestep_faster;
    counter_t blocksize_bits;
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
    double    time_max;
    
    benchmark_settings_t fixed_benchmark_settings;
    counter_t show_explain_factor_max;
    counter_t show_tuning_results_max;
    int       show_primes_on_error;
    int       verbose_level;
    int       explain;
    int       timers;
    int       check;
    int       tunelevel;
    int       extended_output;
    double    sample_duration;
    double    tune_duration_max;
    counter_t tune_keeppercent;
} option;

static struct options_t setDefaultOptions() {
    option.time_max                = 5;

    option.show_explain_factor_max = 0;
    option.show_tuning_results_max = 100;
    option.show_primes_on_error    = 100;
    option.verbose_level           = 2;
    option.explain                 = 0;
    option.timers                  = 0;

    option.check                   = 1; // set to 2 to stop after the check algorithm
    option.tunelevel               = 1;
    option.sample_duration         = 0.0002;
    option.tune_duration_max       = 5.0;
    option.tune_keeppercent        = 10;

    option.fixed_benchmark_settings.factor_max              = 1000000;
    option.fixed_benchmark_settings.threads                 = 1;
    option.fixed_benchmark_settings.stripe_faster           = 0;
    option.fixed_benchmark_settings.mediumstep_faster       = 0;
    option.fixed_benchmark_settings.largestep_faster        = 0;
    option.fixed_benchmark_settings.blocksize_bits          = 0;

    // changes though compilation options
    #ifdef _OPENMP
    option.fixed_benchmark_settings.threads                 = omp_get_max_threads();
    #endif

    #ifdef COMPILE_EXPLAIN
    option.explain = 1;
    option.verbose_level = 5;
    #endif

    #ifdef COMPILE_TIMERS
    option.timers = 1;
    #endif

    return option;
}


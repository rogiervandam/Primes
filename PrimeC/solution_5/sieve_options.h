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
    // counter_t factor_max;
    
    benchmark_settings_t fixed_benchmark_settings;
    // counter_t stripe_faster;
    // counter_t mediumstep_faster;
    // counter_t largestep_faster;
    // counter_t blocksize_bits;
    // int       threads;

    counter_t show_explain_factor_max;
    counter_t show_tuning_results_max;
    int       show_primes_on_error;
    int       verbose_level;
    int       explain;
    int       check;
    int       tunelevel;
    int       extended_output;
    double    sample_duration;
    double    tune_duration_max;
    counter_t tune_keeppercent;
} option;

static struct options_t setDefaultOptions() {
    option.time_max                = 10;

    option.show_explain_factor_max = 100;
    option.show_tuning_results_max = 100;
    option.show_primes_on_error    = 100;
    option.extended_output         = 1;
    option.verbose_level           = 1;
    option.explain                 = 0;

    option.check                   = 1; // set to 2 to stop after the check algorithm
    option.tunelevel               = 1;
    option.sample_duration         = 0.0004;
    option.tune_duration_max       = 5.0;
    option.tune_keeppercent        = 10;

    option.fixed_benchmark_settings.factor_max              = 1000000;
    option.fixed_benchmark_settings.threads                 = 1;
    option.fixed_benchmark_settings.stripe_faster           = 0;
    option.fixed_benchmark_settings.mediumstep_faster       = 0;
    option.fixed_benchmark_settings.largestep_faster        = 0;
    // option.fixed_benchmark_settings.stripe_faster           = 0;
    // option.fixed_benchmark_settings.mediumstep_faster       = 0;
    // option.fixed_benchmark_settings.largestep_faster        = 0;
    option.fixed_benchmark_settings.blocksize_bits          = 0;

    #ifdef _OPENMP
    option.fixed_benchmark_settings.threads                 = omp_get_max_threads();
    #endif

    return option;
}


static struct options_t {
    double    time_max;
    counter_t factor_max;
    counter_t show_explain_factor_max;
    int       show_tuning_results_max;
    int       show_primes_on_error;
    int       verbose_level;
    int       explain;
    int       check;
    int       tunelevel;
    int       threads;
    int       extended_output;
    double    sample_duration;
    double    tune_duration_max;
    counter_t stripe_faster;
    counter_t mediumstep_faster;
    counter_t vectorstep_faster;
    counter_t blocksize_kB;
    counter_t blocksize_bits;
    counter_t tune_keeppercent;
} option;

static struct options_t setDefaultOptions() {
    option.time_max                = 5;
    option.factor_max              = 1000000;

    option.show_explain_factor_max = 0;
    option.show_tuning_results_max = 100;
    option.show_primes_on_error    = 100;
    option.extended_output         = 1;
    option.verbose_level           = 2;
    option.explain                 = 0;

    option.check                   = 1;
    option.tunelevel               = 1;
    option.sample_duration         = 0.0002;
    option.tune_duration_max       = 5.0;
    option.tune_keeppercent        = 10;

    option.threads                 = 1;
    option.stripe_faster           = 0;
    option.mediumstep_faster       = 0;
    option.vectorstep_faster       = 0;
    option.blocksize_kB            = 0; // this is what the user entered
    option.blocksize_bits          = (32*1024*8);

    #ifdef _OPENMP
    option.threads                 = omp_get_max_threads();
    #endif

    return option;
}


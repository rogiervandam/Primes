static struct options_t {
    double    maxTime;
    counter_t maxFactor;
    counter_t showMaxFactor;
    int       show_max_tuning_results;
    int       show_primes_on_error;
    int       verboselevel;
    int       explain;
    int       check;
    int       tunelevel;
    int       threads;
    int       extended_output;
    double    sample_duration;
    double    maxTuneDuration;
    counter_t smallprime_faster;
    counter_t mediumstep_faster;
    counter_t vectorstep_faster;
    counter_t blocksize_kB;
    counter_t blocksize_bits;
} option;

static struct options_t setDefaultOptions() {
    option.maxTime                 = 5;
    option.maxFactor               = 1000000;
    option.showMaxFactor           = 0;
    option.show_max_tuning_results = 10;
    option.show_primes_on_error    = 100;
    option.verboselevel            = 1;
    option.explain                 = 0;
    option.check                   = 1;
    option.tunelevel               = 1;
    option.sample_duration         = 0.0002;
    option.maxTuneDuration         = 5.0;
    option.extended_output         = 1;
    option.threads                 = 1;
    option.smallprime_faster       = 0;
    option.mediumstep_faster       = 0;
    option.vectorstep_faster       = 0;
    option.blocksize_kB            = 0; // this is what the user entered
    option.blocksize_bits          = (32*1024*8);
    #ifdef _OPENMP
    option.threads                 = omp_get_max_threads();
    #endif

    return option;
}


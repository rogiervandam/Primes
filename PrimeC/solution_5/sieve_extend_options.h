static struct options_t {
    double    maxTime;
    counter_t maxFactor;
    counter_t blocksize_kB;
    counter_t blocksize_bits;
    counter_t showMaxFactor;
    int       verboselevel;
    int       explain;
    int       check;
    int       tunelevel;
    int       threads;
    int       extended_output;
    int       show_primes_on_error;
    double    sample_duration;
    counter_t BLOCKWISE_FASTER_prime_min;
    counter_t mediumStep;
    counter_t vectorStep;
} option;

static struct options_t setDefaultOptions() {
    option.maxTime         = 5;
    option.maxFactor       = 1000000;
    option.blocksize_kB    = 0; // this is what the user entered
    option.blocksize_bits  = (32*1024*8);
    option.showMaxFactor   = 0;
    option.explain         = 0;
    option.verboselevel    = 1;
    option.tunelevel       = 1;
    option.check           = 1;
    option.sample_duration = 0.0004;
    option.extended_output = 1;
    option.threads         = 1;
    option.show_primes_on_error = 100;
    #ifdef _OPENMP
    option.threads = omp_get_max_threads();
    #endif

    return option;
}
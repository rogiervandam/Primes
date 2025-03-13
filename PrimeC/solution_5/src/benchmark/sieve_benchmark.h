static inline void setSettingsFromTuning(benchmark_settings_t* benchmark_settings, benchmark_settings_t* tuning_settings) 
{
    benchmark_settings->stripe_faster     = tuning_settings->stripe_faster;
    benchmark_settings->mediumstep_faster = tuning_settings->mediumstep_faster;
    benchmark_settings->largestep_faster  = tuning_settings->largestep_faster;
    benchmark_settings->blocksize_bits    = tuning_settings->blocksize_bits;
}

static inline benchmark_settings_t check_benchmark_settings(benchmark_settings_t benchmark_settings) 
{
    counter_t prime_max = usqrt(benchmark_settings.factor_max) / 2;

    benchmark_settings.stripe_faster     = min(benchmark_settings.stripe_faster, prime_max);
    benchmark_settings.mediumstep_faster = min(benchmark_settings.mediumstep_faster, VECTORWORD_SIZE_counter);
    benchmark_settings.mediumstep_faster = min(benchmark_settings.mediumstep_faster, prime_max);
    benchmark_settings.mediumstep_faster = max(benchmark_settings.mediumstep_faster, 2); // allow for conversion from step to prime
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, benchmark_settings.mediumstep_faster);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, VECTORWORD_SIZE_counter);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, VECTOR_SIZE_counter);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, prime_max);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, 2); // allow for conversion from step to prime
    benchmark_settings.blocksize_bits    = min(benchmark_settings.blocksize_bits, benchmark_settings.factor_max/2);
    if (benchmark_settings.blocksize_bits == 0) benchmark_settings.blocksize_bits = benchmark_settings.factor_max/2;
    return benchmark_settings;
}

static inline void reset_benchmark_result(benchmark_result_t* benchmark_result, benchmark_settings_t benchmark_settings) 
{
    benchmark_result->settings = benchmark_settings;
    benchmark_result->passes = 0;
    benchmark_result->elapsed_time = 0;
    benchmark_result->avg = 0;
}

static inline benchmark_settings_t benchmarkInit(counter_t threads) 
{
    benchmark_settings_t benchmark_settings = option.fixed_benchmark_settings;
    benchmark_settings.threads           = threads;
    benchmark_settings.sample_duration   = option.time_max;
    return benchmark_settings;
}

static inline char* benchmark_settings_as_string(char* settings_string, benchmark_settings_t benchmark_settings) {
    verbose1({
        sprintf(settings_string, "s%03ju-m%03ju-l%03ju-b%07ju-u%02ju-v%ju%s-c%s", 
            (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.mediumstep_faster, (uintmax_t)benchmark_settings.largestep_faster, 
            (uintmax_t)benchmark_settings.blocksize_bits, (uintmax_t)WORD_SIZE_counter, (uintmax_t)(VECTOR_SIZE_counter/WORD_SIZE_counter), TYPE_SHORT_NAME(bitword_vector_t), TYPE_SHORT_NAME(counter_t));
    })
    // verbose1({
    //     sprintf(settings_string, "s%03ju-m%03ju-l%03ju-b%07ju-u%02ju-v%ju-c", 
    //         (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.mediumstep_faster, (uintmax_t)benchmark_settings.largestep_faster, 
    //         (uintmax_t)benchmark_settings.blocksize_bits, (uintmax_t)WORD_SIZE_counter, (uintmax_t)(VECTOR_SIZE_counter/WORD_SIZE_counter);
    // })
    return settings_string;
}

static inline double benchmarkTime() 
{
    struct timespec t;

    #ifdef __APPLE__
        clock_gettime(CLOCK_MONOTONIC_RAW, &t);
    #else
        clock_gettime(CLOCK_MONOTONIC, &t);
    #endif
    return (t.tv_sec + t.tv_nsec * 1e-9);
 }

static inline void prepareBenchmarkGlobals(benchmark_settings_t benchmark_settings) {
    global_stripeprime_faster = benchmark_settings.stripe_faster;
    global_mediumstep_faster  = benchmark_settings.mediumstep_faster;
    global_largestep_faster   = benchmark_settings.largestep_faster;
    global_blocksize_bits     = benchmark_settings.blocksize_bits;

    verbose5 ( { char settings_string[100]=""; benchmark_settings_as_string(settings_string, benchmark_settings); printf("Using settings \033[1;32m%s\033[0m\n",settings_string); } )
}

static int checkSieveWithBenchmarkSettings(benchmark_settings_t benchmark_settings) 
{
    const counter_t factor_max = benchmark_settings.factor_max;
    prepareBenchmarkGlobals(benchmark_settings);
    struct sieve_t* sieve_check = sieve_shake(factor_max);
    const int valid = validatePrimeCount(sieve_check, factor_max);
    sieve_delete(sieve_check);
    return valid;
}

static benchmark_result_t benchmark(benchmark_settings_t benchmark_settings) 
{
    benchmark_result_t benchmark_result;
    benchmark_settings = check_benchmark_settings(benchmark_settings);
    benchmark_result.settings = benchmark_settings;

    counter_t sieve_bits = benchmark_settings.factor_max >> 1;

    // set global variables used in the sieve functions
    prepareBenchmarkGlobals(benchmark_result.settings); // TODO; change back to benchmark_settings

    // prepare for the benchmark
    counter_t passes = 0;
    const counter_t sieve_size = benchmark_result.settings.factor_max;
    const double time_sample = benchmark_result.settings.sample_duration * benchmark_settings.threads; // do this before we set the clock

    double time_elapsed = 0;
    const double time_start = benchmarkTime();
    const double time_target = time_start + time_sample; // use target time to avoid substraction in the while loop

    #ifdef _OPENMP
    omp_set_num_threads(benchmark_settings.threads);
    #pragma omp parallel reduction(+:passes)
    {
        double time_elapsed = 0;
        // const double time_start = benchmarkTime();
        // const double time_target = time_start + time_sample; // use target time to avoid substraction in the while loop
        while (time_elapsed <= time_target) {
            struct sieve_t *sieve = sieve_shake(sieve_size);
            sieve_delete(sieve);
            time_elapsed = benchmarkTime();         
            passes++;
        }
    }
    #else
    while (time_elapsed <= time_target) {
        struct sieve_t *sieve = sieve_shake(sieve_size);
        sieve_delete(sieve);
        time_elapsed = benchmarkTime();         
        passes++;
    }
    time_elapsed = benchmarkTime() - time_start;         
    #endif

    // calculate results
    benchmark_result.passes       = passes;
    benchmark_result.elapsed_time = time_elapsed / benchmark_settings.threads;
    benchmark_result.avg          = benchmark_result.passes / benchmark_result.elapsed_time; // TODO: check if thhreads are correct

    return benchmark_result;
}


// REPORTING

static void outputBenchmarkStats(benchmark_result_t benchmark_result)
{
    verbose1( printf("\nResult: Passes \033[1;33m%ju\033[0m \033[0;32m(per %.1f seconds)\033[0m - average \033[1;33m%.1f\033[0m per second \n", 
        (uintmax_t) benchmark_result.passes, benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);)
    // if (option.time_max!=5.0)     printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 5.0, 5.0*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
    // if (threads>1) printf("        \033[0;32mPasses per thread (total %ju) - per %.1f seconds: %.1f - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 
    //                      (uintmax_t)benchmark_result.settings.threads, benchmark_result.settings.sample_duration, option.time_max*benchmark_result.passes/benchmark_result.elapsed_time/threads, benchmark_result.passes/benchmark_result.elapsed_time/threads);
    verbose1( printf("\033[0;32mOutput message:\033[0m "); )
}






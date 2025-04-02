static inline benchmark_settings_t initBenchmarkSettings(counter_t threads) 
{
    benchmark_settings_t benchmark_settings = option.fixed_benchmark_settings;
    benchmark_settings.threads              = threads;
    benchmark_settings.sample_duration      = option.time_max;
    return benchmark_settings;
}


// check the settings to make sure they are valid
static inline benchmark_settings_t checkBenchmarkSettings(benchmark_settings_t benchmark_settings) 
{
    counter_t prime_max = prime_stop(benchmark_settings.factor_max);
    benchmark_settings.stripe_faster     = min(benchmark_settings.stripe_faster, prime_max);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, VECTORWORD_SIZE_BITS);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, VECTOR_SIZE_BITS);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, prime_max*2+1);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, 2); // allow for conversion from step to prime
    benchmark_settings.blocksize_bits    = min(benchmark_settings.blocksize_bits, benchmark_settings.factor_max/2);
    if (benchmark_settings.blocksize_bits == 0) benchmark_settings.blocksize_bits = benchmark_settings.factor_max/2;
    return benchmark_settings;
}

static inline char* setBenchmarkSettingAsString(char* settings_string, benchmark_settings_t benchmark_settings) 
{
    snprintf(settings_string, 50, "s%03ju-l%03ju-b%07ju", (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.largestep_faster, (uintmax_t)benchmark_settings.blocksize_bits);
    return settings_string;
}

static inline void prepareBenchmarkGlobals(benchmark_settings_t benchmark_settings) 
{
    global_stripeprime_faster = benchmark_settings.stripe_faster;
    global_largestep_faster   = benchmark_settings.largestep_faster;
    global_blocksize_bits     = benchmark_settings.blocksize_bits;
    verbose5 ( { char settings_string[50]=""; setBenchmarkSettingAsString(settings_string, benchmark_settings); printf("Using settings " COLOR_GREEN "%s" COLOR_RESET "\n",settings_string); } )
}

static int checkSieveWithBenchmarkSettings(benchmark_settings_t benchmark_settings) 
{
    const counter_t factor_max = benchmark_settings.factor_max;
    benchmark_settings = checkBenchmarkSettings(benchmark_settings);
    prepareBenchmarkGlobals(benchmark_settings);
    struct sieve_t* sieve_check = shakeSieve(factor_max);
    const int valid = validateSieve(sieve_check, factor_max);
    verbose3( if (!valid) deepAnalyzeSieve(sieve_check); )
    sieve_delete(sieve_check);
    if (!valid) exit(1);
    return valid;
}

static inline void requestPower(void) 
{
    #ifdef __APPLE__
    pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0);
    #elif defined(__linux__)
    if (option.fixed_benchmark_settings.threads == 1) {
        cpu_set_t cpuset;
        CPU_ZERO(&cpuset);
        CPU_SET(0, &cpuset);
        sched_setaffinity(0, sizeof(cpu_set_t), &cpuset);
    }   
    // Set real-time scheduling
    struct sched_param param;
    param.sched_priority = sched_get_priority_max(SCHED_FIFO); // Mid-level real-time priority
    if (sched_setscheduler(0, SCHED_FIFO, &param) != 0) {
        // Fallback if we don't have permission
        param.sched_priority = 0;
        sched_setscheduler(0, SCHED_OTHER, &param);
        int n10 = nice(-10); // Try to increase priority within normal scheduling
        int n20 = nice(-20); // Try to increase priority within normal scheduling
    }
    #endif
}

static inline double benchmarkTime() 
{
    struct timespec time;
    #ifdef __APPLE__
        clock_gettime(CLOCK_MONOTONIC_RAW, &time);
    #else
        clock_gettime(CLOCK_MONOTONIC, &time);
    #endif
    return (time.tv_sec + time.tv_nsec * 1e-9);
}

static inline void updateBenchmarkResult(benchmark_result_t *result, counter_t passes, double time_elapsed) {
    result->passes       += passes;
    result->elapsed_time += time_elapsed / result->settings.threads;
    result->avg           = result->passes / result->elapsed_time;
}

static benchmark_result_t benchmark(benchmark_settings_t benchmark_settings) 
{
    benchmark_result_t benchmark_result = { .settings = checkBenchmarkSettings(benchmark_settings), .passes = 0, .elapsed_time = 0, .avg = 0 };

    // set global variables used in the sieve functions
    prepareBenchmarkGlobals(benchmark_result.settings); // TODO; change back to benchmark_settings

    // prepare for the benchmark
    const counter_t sieve_size   = benchmark_result.settings.factor_max;
    const double time_sample     = benchmark_result.settings.sample_duration; // do this before we set the clock
    register double time_elapsed = 0;
    register counter_t passes    = 0;
    
    #ifdef _OPENMP
        omp_set_num_threads(benchmark_result.settings.threads);
        #pragma omp parallel reduction(+:passes) reduction(+:time_elapsed)
        {
            requestPower();
            double thread_elapsed = 0;
            const double time_start = benchmarkTime(), time_target = time_start + time_sample; // use target time to avoid substraction in the while loop
            while (thread_elapsed <= time_target) {
                struct sieve_t *sieve = shakeSieve(sieve_size);
                sieve_delete(sieve);
                thread_elapsed = benchmarkTime();         
                passes++;
            }
            time_elapsed = thread_elapsed - time_start;
        }
    #else
        requestPower();
        const double time_start = benchmarkTime(), time_target = time_start + time_sample; // use target time to avoid substraction in the while loop
        while (time_elapsed <= time_target) {
            struct sieve_t *sieve = shakeSieve(sieve_size);
            sieve_delete(sieve);
            time_elapsed = benchmarkTime();         
            passes++;
        }
        time_elapsed -= time_start;         
    #endif

    // calculate results
    updateBenchmarkResult(&benchmark_result, passes, time_elapsed);

    return benchmark_result;
}

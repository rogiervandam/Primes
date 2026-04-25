#ifndef SIEVE_BENCHMARK_GUARD
#define SIEVE_BENCHMARK_GUARD

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

#endif

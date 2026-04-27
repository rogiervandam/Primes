#pragma once
// #ifndef SIEVE_BENCHMARK_GUARD
// #define SIEVE_BENCHMARK_GUARD

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

static inline char* setBenchmarkSettingAsString(char* settings_string, benchmark_settings_t benchmark_settings) 
{
    snprintf(settings_string, 50, "s%03ju-l%03ju-b%07ju-v%3ju-a%1ju", (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.largestep_faster, (uintmax_t)benchmark_settings.blocksize_bits, (uintmax_t)benchmark_settings.vectorsize, (uintmax_t)benchmark_settings.algorithm);
    return settings_string;
}

static char      global_settings_string[50] = ""; // settings string to use where it is directly outputted
static inline char *getBenchmarkSettingAsString(benchmark_settings_t benchmark_settings) 
{
    return setBenchmarkSettingAsString(global_settings_string, benchmark_settings);
}

// #endif

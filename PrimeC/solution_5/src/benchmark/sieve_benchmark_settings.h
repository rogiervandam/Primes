// structures and functions for benchmark settings and results

#pragma once
#include <stdio.h> // for snprintf
#include "../sieve/sieve_calc.h" // for calcFactor_max and calcBitsize_storage

static inline char* setBenchmarkSettingAsString(char* settings_string, benchmark_settings_t benchmark_settings) 
{
    snprintf(settings_string, 50, "s%03ju-l%03ju-b%07ju-v%3ju-a%1ju", (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.largestep_faster, (uintmax_t)benchmark_settings.blocksize_bits, (uintmax_t)benchmark_settings.vectorsize, (uintmax_t)benchmark_settings.algorithm);
    return settings_string;
}

static char global_settings_string[50] = ""; // settings string to use where it is directly outputted
static inline char *getBenchmarkSettingAsString(benchmark_settings_t benchmark_settings) 
{
    return setBenchmarkSettingAsString(global_settings_string, benchmark_settings);
}

static inline void resetBenchmarkResult(benchmark_result_t* benchmark_result, benchmark_settings_t benchmark_settings) 
{
    benchmark_result->settings     = benchmark_settings;
    benchmark_result->passes       = 0;
    benchmark_result->elapsed_time = 0;
    benchmark_result->avg          = 0;
}

static inline benchmark_settings_t initBenchmarkSettings(const counter_t threads) 
{
    benchmark_settings_t benchmark_settings = option.fixed_benchmark_settings;
    if (!option.fixed_benchmark_settings.stripe_faster    ) { benchmark_settings.stripe_faster    = 64;           }
    if (!option.fixed_benchmark_settings.largestep_faster ) { benchmark_settings.largestep_faster = 128;          }
    if (!option.fixed_benchmark_settings.blocksize_bits   ) { benchmark_settings.blocksize_bits   = 32*1024*8;    }
    if (!option.fixed_benchmark_settings.vectorsize       ) { benchmark_settings.vectorsize       = 256;          }
    if (!option.fixed_benchmark_settings.algorithm        ) { benchmark_settings.algorithm        = 1;            }
    if (!option.fixed_benchmark_settings.storage          ) { benchmark_settings.storage          = STORAGE_HALF; }
    benchmark_settings.threads = threads;
    return benchmark_settings;
}

// check the settings to make sure they are valid, dont overlap, etc.
static inline benchmark_settings_t checkBenchmarkSettings(benchmark_settings_t benchmark_settings) 
{
    counter_t prime_max = calcFactor_max(benchmark_settings.factor_max );
    benchmark_settings.stripe_faster     = min(benchmark_settings.stripe_faster, prime_max);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, prime_max);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, 2); // allow for conversion from step to prime
    benchmark_settings.blocksize_bits    = min(benchmark_settings.blocksize_bits, calcBitsize_storage(benchmark_settings.factor_max, benchmark_settings.storage)); 
    if (benchmark_settings.blocksize_bits == 0) benchmark_settings.blocksize_bits = calcBitsize_storage(benchmark_settings.factor_max, benchmark_settings.storage);
    if (benchmark_settings.algorithm < 1 || benchmark_settings.algorithm > option.algorithm_max) benchmark_settings.algorithm = 1; // default to sieve algorithm 1
    if (benchmark_settings.vectorsize != 128 && benchmark_settings.vectorsize != 256 && benchmark_settings.vectorsize != 512) {
        benchmark_settings.vectorsize = 256; // default to 256 bit vectors
    }
    return benchmark_settings;
}

static inline void prepareBenchmarkGlobals(benchmark_settings_t benchmark_settings) 
{
#ifndef EMBED_SETTINGS
    global_stripeprime_faster   = benchmark_settings.stripe_faster;
    global_largestep_faster     = benchmark_settings.largestep_faster;
    global_blocksize_bits       = benchmark_settings.blocksize_bits;
    global_vectorsize           = benchmark_settings.vectorsize;
#endif
    global_algorithm            = benchmark_settings.algorithm;  
    global_storage              = benchmark_settings.storage;
    verbose5({ printf("Using settings " COLOR_GREEN "%s" COLOR_RESET "\n", getBenchmarkSettingAsString(benchmark_settings)); })
}

static inline void updateBenchmarkResult(benchmark_result_t *result, const counter_t passes, const double time_elapsed) {
    result->passes       += passes;
    result->elapsed_time += time_elapsed / result->settings.threads;
    result->avg           = result->passes / result->elapsed_time;
}

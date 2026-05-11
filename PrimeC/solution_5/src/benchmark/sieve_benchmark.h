// prepare the benchmark settings using defaults
#pragma once
#include "sieve_functions_benchmark.h"
#include "sieve_benchmark_settings.h"

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
    // benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, 64);
    // benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, benchmark_settings.vectorsize);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, prime_max);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, 2); // allow for conversion from step to prime
    benchmark_settings.blocksize_bits    = min(benchmark_settings.blocksize_bits, calcBitsize(benchmark_settings.factor_max, benchmark_settings.storage)); 
    if (benchmark_settings.blocksize_bits == 0) benchmark_settings.blocksize_bits = calcBitsize(benchmark_settings.factor_max, benchmark_settings.storage);
    if (benchmark_settings.algorithm < 1 || benchmark_settings.algorithm >option.algorithm_max) benchmark_settings.algorithm = 1; // default to sieve algorithm 1
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

// do a benchmark of the given function with the given settings (including time target), and return the result
static benchmark_result_t 
benchmark(benchmark_settings_t benchmark_settings, sieve_t* (*benchmarkableFunction)(const counter_t))
{
    benchmark_result_t benchmark_result = { .settings = checkBenchmarkSettings(benchmark_settings), .passes = 0, .elapsed_time = 0, .avg = 0 };

    // set global variables used in the sieve functions
    prepareBenchmarkGlobals(benchmark_result.settings); 

    // prepare for the benchmark
    const counter_t sieve_size   = benchmark_result.settings.factor_max;
    const double time_sample     = benchmark_result.settings.sample_duration; // do this before we set the clock
    register double time_elapsed = 0;
    register counter_t passes    = 0;
    
    #ifdef _OPENMP
        omp_set_num_threads(benchmark_result.settings.threads);
        #pragma omp parallel reduction(+:passes) reduction(+:time_elapsed)
        {
            requestBenchmarkStability(option.fixed_benchmark_settings.threads);
            double thread_elapsed = 0;
            const double time_start = benchmarkTime(), time_target = time_start + time_sample; // use target time to avoid substraction in the while loop
            while (thread_elapsed <= time_target) {
                sieve_t* sieve = benchmarkableFunction(sieve_size);
                sieve_delete(sieve);
                thread_elapsed = benchmarkTime();         
                passes++;
            }
            time_elapsed = thread_elapsed - time_start;
        }
    #else
        requestBenchmarkStability(option.fixed_benchmark_settings.threads);
        const double time_start = benchmarkTime(), time_target = time_start + time_sample; // use target time to avoid substraction in the while loop
        while (time_elapsed <= time_target) {
            sieve_t* sieve = benchmarkableFunction(sieve_size);
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

// prepare the benchmark settings using defaults
#pragma once
// #include "sieve_functions_benchmark.h"

// do a benchmark of the given function with the given settings (including time target), and return the result
static benchmark_result_t 
benchmark(benchmark_settings_t benchmark_settings, sieve_t* (*benchmarkableFunction)(const counter_t, const storage_type))
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
            requestBenchmarkStability(benchmark_result.settings.threads);
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
        requestBenchmarkStability(benchmark_result.settings.threads);
        const double time_start = benchmarkTime(), time_target = time_start + time_sample; // use target time to avoid substraction in the while loop
        while (time_elapsed <= time_target) {
            sieve_t* sieve = benchmarkableFunction(sieve_size, benchmark_result.settings.storage);
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

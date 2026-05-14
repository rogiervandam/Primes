#pragma once
#include "sieve_time.h"

// perform benchmarks with different settings 
// outputs results in a format that can be parsed by the benchmarking system

static int 
performBenchmarks(options_t option, sieve_t* (*sieveFunction)(const counter_t), const char* algorithm_name, const char* algorithm_type)
{
    if (option.explain_level || option.trace_level) return runSingleSievePass(option.fixed_benchmark_settings, sieveFunction, algorithm_name, algorithm_type);

    #ifdef COMPILE_BENCHMARK_STRIPERS
    if (option.tunelevel == 5) return benchmarkSieveSetBitsTrue(option, sieveFunction);
    if (option.tunelevel == 6) return createStepplan(option.fixed_benchmark_settings);
    #endif

    for(counter_t threads=option.fixed_benchmark_settings.threads, runs = 0; threads >= 1 && runs < 4; threads = (threads/2), runs++ ) {

        // prepare settings
        benchmark_settings_t benchmark_settings = initBenchmarkSettings(threads);

        // tuning - try combinations of different settings and apply these
        #ifdef COMPILE_TUNE
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tuneSieveSettings(option.tunelevel, benchmark_settings, sieveFunction);
            setSettingsFromTuning(&benchmark_settings, &(tuning_result.settings));
        }
        if (option.tunelevel == 3) return 0; // do one extra tuning run with the best settings to get a better result for the final benchmark
        if (option.tunelevel == 4) return continuousBenchmarkTopOptions(sieveFunction); // continuous benchmarking of top 4 options
        #endif

        // one last check to make sure this is a valid algorithm for these settings
        benchmark_settings = checkBenchmarkSettings(benchmark_settings);

        // save settings for future --embed use
        saveLastSettings(benchmark_settings);

        debug_final_plan = 1; // allow to count something in only one run
        if (!checkSieveWithBenchmarkSettings(sieveFunction, benchmark_settings)) { 
            verbose1( fprintf(stderr, "The sieve is " COLOR_RED "NOT" COLOR_RESET " valid for settings %s with factor %ju\n", 
                              getBenchmarkSettingAsString(benchmark_settings), (uintmax_t) benchmark_settings.factor_max); )
            return 1; 
        } 
        else { verbose2( printf("Verified that algortihm with settings %s and max %ju is " COLOR_GREEN "valid" COLOR_RESET ".\n", 
                        getBenchmarkSettingAsString(benchmark_settings), (uintmax_t) benchmark_settings.factor_max); 
        )}
        debug_final_plan = 0;
    
        // warm up the cache for a short time
        verbose2( printf("Warming up the cache and processing units in %.1f seconds\n", option.warmup_duration); )	
        benchmark_settings_t final_tuning_settings = benchmark_settings;
        final_tuning_settings.sample_duration = option.warmup_duration;
        benchmark(final_tuning_settings, sieveFunction);

        // perform benchmark -> outputs passes, elapsed time and avg in result 
        verbose2( printf("Benchmarking with settings: " COLOR_GREEN "%s" COLOR_RESET " and " COLOR_GREEN "%ju" COLOR_RESET " threads for " COLOR_GREEN "%.1f" COLOR_RESET " seconds\n"
                         "Results: " COLOR_BLINK "(wait " COLOR_GREEN "%.1lf" COLOR_RESET " seconds)" COLOR_BLINK_OFF "...", 
                         getBenchmarkSettingAsString(benchmark_settings),(uintmax_t)benchmark_settings.threads, benchmark_settings.sample_duration, benchmark_settings.sample_duration );
        )

        #ifdef COMPILE_TIMERS
        if (option.timers) {
            timer_init();
            verbose2( printf("Timing the different parts of the algorithm\n"); )
        }
        #endif

        debug_final_benchmarking = 1; // allow to count something in the final benchmark runs
        benchmark_result_t benchmark_result = benchmark(benchmark_settings, sieveFunction);
        debug_final_benchmarking = 0;

        // report results
        verbose2({
            printf("\nResult: Passes " COLOR_YELLOW "%ju" COLOR_RESET " " COLOR_GREEN "(per %.1f seconds)" COLOR_RESET " - average " COLOR_YELLOW "%.1f" COLOR_RESET " per second using " COLOR_MAGENTA "%ju" COLOR_RESET " threads\n", 
                    (uintmax_t) benchmark_result.passes, benchmark_result.elapsed_time, benchmark_result.avg, (uintmax_t) benchmark_result.settings.threads);

            if (benchmark_result.settings.threads > 1) 
            printf("Used " COLOR_MAGENTA "%ju" COLOR_RESET " threads. Passes per thread: " COLOR_YELLOW "%ju" COLOR_RESET " " COLOR_GREEN "(per %.1f seconds)" COLOR_RESET " - average " COLOR_YELLOW "%.1f" COLOR_RESET " per second per thread.\n", 
                   (uintmax_t)benchmark_result.settings.threads, (uintmax_t) benchmark_result.passes / benchmark_result.settings.threads, benchmark_result.elapsed_time, benchmark_result.avg / benchmark_result.settings.threads);
            
            printf(COLOR_GREEN "Output message:" COLOR_RESET " \n"); 
        })
        
        // output the results in a format that can be parsed by the benchmarking system
        printf("%s%s;%ju;%f;%ju;algorithm=%s,faithful=yes,bits=1",algorithm_name, option.extension, (uintmax_t)benchmark_result.passes, benchmark_result.elapsed_time, (uintmax_t)threads, algorithm_type);

        #ifdef COMPILE_TIMERS
        {
            // derive_benchmark_timing_filename(timings_filename, sizeof(timings_filename));
            save_timing_table_to_file(option.timings_filename, benchmark_result);
            verbose2( printf("Benchmark timing table saved to %s\n", option.timings_filename); )

            if (option.timers) print_timing_table();
        }
        #endif

        // add extra information to the output for research purposes
        verbose1({ 
            if (option.dockerfile_type) printf(";docker=" COLOR_BLUE "%s" COLOR_RESET "",option.dockerfile_type);
            printf(";" COLOR_GREEN "%s" COLOR_RESET, getBenchmarkSettingAsString(benchmark_settings)); 
        }) 
        printf("\n");

        if (threads > 4 && threads < 8) threads = 8; // force looking at 4 and 2 by setting threads to 8 which will be halved (4) next loop run
    }

    // debug information for developers
    if (debug_hits) { verbose2( printf("Hits: %ju\n",(uintmax_t)debug_hits); ) }

    return 0;
}
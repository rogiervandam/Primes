static int performBenchmarks(struct options_t option, sieve_t* (*benchmarkableFunction)(const counter_t))
{
    #ifdef COMPILE_BENCHMARK_STRIPERS
    if (option.tunelevel) {
        if (option.tunelevel == 5) {
            benchmarkSieveSetBitsTrue();
            return (0);
        }
        if (option.tunelevel == 6) {
            createStepplan(option.fixed_benchmark_settings);
            return (0);
        }
    }
    #endif

    #ifdef COMPILE_TIMERS
    if (option.timers) {
        timer_init();
        verbose2( printf("Timing the different parts of the algorithm\n"); )
    }
    #endif

    for(counter_t threads=option.fixed_benchmark_settings.threads, runs = 0; threads >= 1 && runs < 4; threads = (threads/2), runs++ ) {

        // prepare settings
        benchmark_settings_t benchmark_settings = initBenchmarkSettings(threads);

        // tuning - try combinations of different settings and apply these
        #ifdef COMPILE_TUNE
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tuneSieveSettings(option.tunelevel, benchmark_settings, benchmarkableFunction);
            setSettingsFromTuning(&benchmark_settings, &(tuning_result.settings));
        }
        if (option.tunelevel == 3) { // do one extra tuning run with the best settings to get a better result for the final benchmark
            return 0;
        }
        if (option.tunelevel == 4) { // continuous benchmarking of top 4 options
            verbose3({
                counter_t top_count = tuning_top_results_count;
                benchmark_result_t accumulated[4];
                char settings_strings[4][50];
                for (counter_t i = 0; i < top_count; i++) {
                    accumulated[i].settings = checkBenchmarkSettings(tuning_top_results[i].settings);
                    accumulated[i].passes = 0;
                    accumulated[i].elapsed_time = 0;
                    accumulated[i].avg = 0;
                    setBenchmarkSettingAsString(settings_strings[i], accumulated[i].settings);
                }
                printf("Continuous benchmarking of top %ju options (Ctrl+C to stop)\n", (uintmax_t)top_count);
                for (counter_t i = 0; i < top_count; i++) {
                    printf("  Option %ju: %s\n", (uintmax_t)(i+1), settings_strings[i]);
                }
                counter_t round = 0;
                while (1) {
                    for (counter_t i = 0; i < top_count; i++) {
                        benchmark_settings_t bench_settings = accumulated[i].settings;
                        bench_settings.sample_duration = 2.0;
                        benchmark_result_t result = benchmark(bench_settings, benchmarkableFunction);
                        updateBenchmarkResult(&accumulated[i], result.passes, result.elapsed_time);
                        printf(COLOR_CLEAR_LINE "Round %ju | ", (uintmax_t)(round + 1));
                        for (counter_t j = 0; j < top_count; j++) {
                            double extrapolated = accumulated[j].avg * 5.0;
                            if (j == i) printf("[" COLOR_BOLD_YELLOW "%ju" COLOR_RESET ":" COLOR_BOLD_GREEN "%7.0f" COLOR_RESET "] ", (uintmax_t)(j+1), extrapolated);
                            else        printf(" " COLOR_YELLOW "%ju" COLOR_RESET ":" COLOR_GREEN "%7.0f" COLOR_RESET "  ", (uintmax_t)(j+1), extrapolated);
                        }
                        fflush(stdout);
                    }
                    round++;
                }
            })
            exit(0);
        }
        #endif

        // one last check to make sure this is a valid algorithm for these settings
        benchmark_settings = checkBenchmarkSettings(benchmark_settings);

        // save settings for future --embed use
        saveLastSettings(benchmark_settings);

        debug_final_plan = 1; // allow to count something in only one run
        if (!checkSieveWithBenchmarkSettings(benchmark_settings)) { 
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
        benchmark(final_tuning_settings, benchmarkableFunction);

        // perform benchmark -> outputs passes, elapsed time and avg in result 
        verbose2( printf("Benchmarking with settings: " COLOR_GREEN "%s" COLOR_RESET " and " COLOR_GREEN "%ju" COLOR_RESET " threads for " COLOR_GREEN "%.1f" COLOR_RESET " seconds\n"
                         "Results: " COLOR_BLINK "(wait " COLOR_GREEN "%.1lf" COLOR_RESET " seconds)" COLOR_BLINK_OFF "...", 
                         getBenchmarkSettingAsString(benchmark_settings),(uintmax_t)benchmark_settings.threads, benchmark_settings.sample_duration, benchmark_settings.sample_duration );
        )
        debug_final_benchmarking = 1; // allow to count something in the final benchmark runs
        benchmark_result_t benchmark_result = benchmark(benchmark_settings, benchmarkableFunction);
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

        // add extra information to the output for research purposes
        verbose1({ 
            if (option.dockerfile_type) printf(";docker=" COLOR_BLUE "%s" COLOR_RESET "",option.dockerfile_type);
            printf(";" COLOR_GREEN "%s" COLOR_RESET, getBenchmarkSettingAsString(benchmark_settings)); 
        }) 
        printf("\n");

        if (threads > 4 && threads < 8) threads = 8; // force looking at 4 and 2 by setting threads to 8 which will be halved (4) next loop run
    }
    return 0;
}
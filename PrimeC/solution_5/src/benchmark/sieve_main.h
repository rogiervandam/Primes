static inline char* extension_as_string(char* extension) {
    #ifdef _OPENMP
    verbose1( sprintf(extension,"_epar-u%juv%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); )
    #else
    verbose1( sprintf(extension,"-u%juv%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); )
    #endif
    return extension;
}

int main(int argc, char *argv[]) 
{
    verbose1( setbuf(stdout, NULL); ) // prevent buffering of stdout

    option = setDefaultOptions();
    verbose1( option = parseCommandLine(argc, argv, option); )

    verbose3({
        printf("Sieve algorithm by Rogier van Dam - 2025\n");
        printf("Find all primes up to \033[1;33m%ju\033[0m using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)\n", (uintmax_t)option.fixed_benchmark_settings.factor_max);
    })
    verbose2( printf("\nRunning sieve variant \033[1;33m%s\033[0m u%ju-v%ju-c%s \n", algorithm_name, 
        (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, TYPE_SHORT_NAME(counter_t)); )
    
    #ifdef COMPILE_EXPLAIN
    if (option.explain >= 1) {
        explainSieveShake(option.fixed_benchmark_settings);
        return(0);
    }
    #endif

    #ifdef COMPILE_TIMERS
    if (option.timers) {
        timer_init();
        verbose2( printf("Timing the different parts of the algorithm\n"); )
    }
    #endif

    // command line --check can be used to check the algorithm for all sieve/blocksize combinations
    if (option.check) { 
        if (!checkSieveAlgorithm(option.fixed_benchmark_settings)) return 1; 
        if (option.check == 2) return 0;
    }

    for(counter_t threads=option.fixed_benchmark_settings.threads, runs = 0; threads >= 1 && runs < 2; threads = (threads>>1), runs++ ) {

        // prepare settings
        benchmark_settings_t benchmark_settings = benchmarkInit(threads);

        // tuning - try combinations of different settings and apply these
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tune(option.tunelevel, benchmark_settings);
            setSettingsFromTuning(&benchmark_settings, &(tuning_result.settings));
        }

        // encode settings for reporting
        verbose1( char settings_string[100]=""; benchmark_settings_as_string(settings_string, benchmark_settings); )
        verbose2( { printf("Benchmarking with settings: \033[1;32m%s\033[0m (stripeprime, mediumstep, largestep, blocksize, wordsize, vectorsize) and \033[1;32m%ju\033[0m threads for \033[1;32m%.1f\033[0m seconds\nResults: \033[5m(wait \033[1;32m%.1lf\033[39m seconds)\033[25m...\033[0m", 
            settings_string,(uintmax_t)benchmark_settings.threads, benchmark_settings.sample_duration, benchmark_settings.sample_duration );
        })

        // one last check to make sure this is a valid algorithm for these settings
        debug_final_plan = 1; // allow to count something in only one run
        if (!checkSieveWithBenchmarkSettings(benchmark_settings)) { verbose1( fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) benchmark_settings.factor_max) ); return 1; } 
        else { verbose2(  printf("(verified that settings %s and max %ju is \033[1;32mvalid\033[0m)", settings_string, (uintmax_t) benchmark_settings.factor_max); ) }
        debug_final_plan = 0;
    
        // perform benchmark -> outputs passes, elapsed time and avg in result 
        debug_final_benchmarking = 1; // allow to count something in the final benchmark runs
        benchmark_result_t benchmark_result = benchmark(benchmark_settings);
        debug_final_benchmarking = 0;
        verbose2(outputBenchmarkStats(benchmark_result);)

        // report results
        verbose1 (
            char extension[50] = ""; extension_as_string(extension);      
            benchmark_settings_as_string(settings_string, benchmark_result.settings);
            printf("%s%s;%ju;%f;%ju;algorithm=%s,faithful=yes,bits=1",algorithm_name,extension,(uintmax_t)benchmark_result.passes,benchmark_result.elapsed_time,(uintmax_t)threads, algorithm_type);
            verbose1( { printf(";%s",settings_string); } ) 
            printf("\n");
        )
    }

    // show results for --show command line option
    if (option.show_explain_factor_max > 0) showResult(option.fixed_benchmark_settings);

    if (option.timers) print_timing_table();

    if (debug_hits || debug_hits2) { verbose2( printf("Hits: %ju %ju\n",(uintmax_t)debug_hits, (uintmax_t)debug_hits2); ) }

}

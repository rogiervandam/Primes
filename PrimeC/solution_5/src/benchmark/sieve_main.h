static inline char* extension_as_string(char* extension) 
{
    #ifdef _OPENMP
    verbose0( snprintf(extension,50,"_epar-u%ju-v%ju%s-c%s", (uintmax_t)WORD_SIZE_BITS, (uintmax_t)VECTOR_ELEMENTS, TYPE_SHORT_NAME(bitword_vector_t),TYPE_SHORT_NAME(counter_t)); )
    #else
    verbose0( snprintf(extension,50,"-u%ju-v%ju%s-c%s",      (uintmax_t)WORD_SIZE_BITS, (uintmax_t)VECTOR_ELEMENTS, TYPE_SHORT_NAME(bitword_vector_t),TYPE_SHORT_NAME(counter_t)); )
    #endif
    return extension;
}

int main(int argc, char *argv[]) 
{
    verbose1( setbuf(stdout, NULL); ) // prevent buffering of stdout
    const char *dockerfile_type = getenv("DOCKERFILE_TYPE"); 

    option = setDefaultOptions();
    verbose1( option = parseCommandLine(argc, argv, option); )

    verbose3({
        printf("Sieve algorithm by Rogier van Dam - 2025\n");
        printf("Find all primes up to \033[1;33m%ju\033[0m using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)\n", (uintmax_t)option.fixed_benchmark_settings.factor_max);
    })
    verbose2( printf("\nRunning sieve variant \033[1;33m%s\033[0m u%ju-v%ju%s-c%s ", algorithm_name, 
        (uintmax_t)WORD_SIZE_BITS, (uintmax_t)VECTOR_ELEMENTS, TYPE_SHORT_NAME(bitword_vector_t), TYPE_SHORT_NAME(counter_t) ); )
    verbose2( if (dockerfile_type) printf("in docker \033[1;34m%s\033[0m ", dockerfile_type); )
    verbose2( printf("with max %ju \n", (uintmax_t)option.fixed_benchmark_settings.factor_max); )
        
    #ifdef COMPILE_FUNCTION_TIMINGS
    struct sieve_t* sieve = shakeSieve(option.fixed_benchmark_settings.factor_max);
    benchmarkSetBitsTrue(sieve->bitstorage, 1000000/4, 2*1000000/4, 2, 500);
    sieve_delete(sieve);
    exit(0);
    #endif

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
        benchmark_settings_t benchmark_settings = initBenchmarkSettings(threads);

        // tuning - try combinations of different settings and apply these
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tuneSieveSettings(option.tunelevel, benchmark_settings);
            setSettingsFromTuning(&benchmark_settings, &(tuning_result.settings));
        }

        // encode settings for reporting
        verbose0( char settings_string[50]=""; setBenchmarkSettingAsString(settings_string, benchmark_settings); )

        // one last check to make sure this is a valid algorithm for these settings
        debug_final_plan = 1; // allow to count something in only one run
        if (!checkSieveWithBenchmarkSettings(benchmark_settings)) { verbose1( fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) benchmark_settings.factor_max) ); return 1; } 
        else { verbose2(  printf("Verified that algortihm with settings %s and max %ju is \033[1;32mvalid\033[0m.\n", settings_string, (uintmax_t) benchmark_settings.factor_max); ) }
        debug_final_plan = 0;
    
        // warm up the cache
        verbose2( printf("Warming up the cache and processing units\n"); )	
        benchmark_settings_t final_tuning_settings = benchmark_settings;
        final_tuning_settings.sample_duration = 1;
        benchmark(final_tuning_settings);

        // perform benchmark -> outputs passes, elapsed time and avg in result 
        verbose2( { printf("Benchmarking with settings: \033[1;32m%s\033[0m (stripeprime, mediumstep, largestep, blocksize, wordsize, vectorsize) and \033[1;32m%ju\033[0m threads for \033[1;32m%.1f\033[0m seconds\nResults: \033[5m(wait \033[1;32m%.1lf\033[39m seconds)\033[25m...\033[0m", 
            settings_string,(uintmax_t)benchmark_settings.threads, benchmark_settings.sample_duration, benchmark_settings.sample_duration );
        })
        debug_final_benchmarking = 1; // allow to count something in the final benchmark runs
        benchmark_result_t benchmark_result = benchmark(benchmark_settings);
        debug_final_benchmarking = 0;
        verbose2(outputBenchmarkStats(benchmark_result);)

        // report results
        verbose0(
            verbose2( 
                printf("\nResult: Passes \033[1;33m%ju\033[0m \033[0;32m(per %.1f seconds)\033[0m - average \033[1;33m%.1f\033[0m per second using \033[0;35m%ju\033[0m threads\n", 
                (uintmax_t) benchmark_result.passes, benchmark_result.elapsed_time, benchmark_result.avg, (uintmax_t) benchmark_result.settings.threads);
            )
        
            verbose2( if (benchmark_result.settings.threads > 1) 
                printf(  "Used \033[0;35m%ju\033[0m threads. Passes per thread: \033[0;33m%ju\033[0m \033[0;32m(per %.1f seconds)\033[0m - average \033[1;33m%.1f\033[0m per second per thread.\n", 
                                 (uintmax_t)benchmark_result.settings.threads, (uintmax_t) benchmark_result.passes / benchmark_result.settings.threads, benchmark_result.elapsed_time, benchmark_result.avg / benchmark_result.settings.threads);
            )
            verbose2( printf("\033[0;32mOutput message:\033[0m \n"); )

            char extension[50] = ""; extension_as_string(extension);      
            // setBenchmarkSettingAsString(settings_string, benchmark_result.settings);

            // output the results in a format that can be parsed by the benchmarking system
            printf("%s%s;%ju;%f;%ju;algorithm=%s,faithful=yes,bits=1",algorithm_name,extension,(uintmax_t)benchmark_result.passes,benchmark_result.elapsed_time,(uintmax_t)threads, algorithm_type);

            // add extra information to the output for research purposes
            verbose1( { 
                if (dockerfile_type) printf(";docker=\033[1;34m%s\033[0m",dockerfile_type);
                printf(";\033[1;32m%s\033[0m total \033[1;33m%ju\033[0m",settings_string, (uintmax_t)benchmark_result.passes); 
            } ) 
            printf("\n");
        )
    }

    // show results for --show command line option
    if (option.show_explain_factor_max > 0) showResult(option.fixed_benchmark_settings);

    #ifdef COMPILE_TIMERS
    if (option.timers) print_timing_table();
    #endif
    
    if (debug_hits || debug_hits2) { verbose2( printf("Hits: %ju %ju\n",(uintmax_t)debug_hits, (uintmax_t)debug_hits2); ) }

}

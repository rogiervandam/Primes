static inline char* extension_as_string(char* extension) {
    #ifdef _OPENMP
    sprintf(extension,"_epar-u%juv%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS);
    #else
    sprintf(extension,"-u%juv%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS);
    #endif
    return extension;
}

static void usage(char *program_name, int exit_code) 
{
    const char help_text[] =
        "Usage: %s [options] [maximum]\n"
        "Options:\n"
        "  --check                   Check the correctness of the algorithm\n"
        "  --nocheck                 Skip check of the correctness of the algorithm\n"
#ifdef COMPILE_EXPLAIN
        "  --explain                 Explain the steps of the algorithm - only when compiled for explain\n"
#endif
        "  --help                    This help function\n"
        "  --max                     Set the maximum prime to examine\n"
        "  --set s<prime>            Set the cutoff prime for blockwise striping\n"
        "        m<bits>             Set the cutoff number of bits for wordwise striping\n"
        "        l<bits>             Set the cutoff number of bits for vectorwise striping\n"
        "        b<bits>             Set the block size to a specific <size> in bits\n"
        "  --show  <maximum>         Show the primes found up to the maximum\n"
#ifdef _OPENMP
        "  --threads <count>         Set the maximum number of threads to be used (only when compiled for openmp)\n"
        "                            Use 'all' to use all available threads or 'half' for /2 (e.g. for no hyperthreading)\n"
#endif
        "  --time  <seconds>         The maximum time (in seconds) to run passes of the sieve algorithm\n"
#ifdef COMPILE_TIMERS
        "  --timers                  Give the timings for submodules - only when compiled for timers\n"
#endif
        "  --tune  <level>           find the best settings for the current os and hardware\n"
        "                            0 - no tuning\n"
        "                            1 - fast tuning\n"
        "                            2 - refined tuning\n"
        "                            3 - maximum tuning (takes long)\n"
        "  --verbose <level>         Show more output to a certain level:\n"
        "                            1 - show phase progress\n"
        "                            2 - show general progress within the phase\n"
        "                            3 - show actual work\n"
        "                            4 - show timing\n"
        "[maximum] is the heighest prime to examine. Defaults to %ju\n";
    
    
    if (exit_code == 0) fprintf(stdout, help_text, program_name, (uintmax_t)option.fixed_benchmark_settings.factor_max);
    else                fprintf(stderr, help_text, program_name, (uintmax_t)option.fixed_benchmark_settings.factor_max);
    exit(exit_code);
}

static struct options_t parseCommandLine(int argc, char *argv[], struct options_t option)
{
    char *program_name = argv[0];
    program_name = max(program_name, strrchr(program_name, '/')+1);
    program_name = max(program_name, strrchr(program_name, '\\')+1);

    // processing command line changes to options
    for (int arg=1; arg < argc; arg++) {
        if (strcmp(argv[arg], "--help")==0) { usage(program_name, 0); }
        else if (strcmp(argv[arg], "--verbose")==0) { option.verbose_level=0;
            if (++arg >= argc) { fprintf(stderr, "No verbose level specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%d", &option.verbose_level) != 1 || option.verbose_level > 4) {
                fprintf(stderr, "Error: Invalid measurement time: %s\n", argv[arg]); usage(program_name, 1);
            }
            verbose1( printf("Verbose level set to %d\n",option.verbose_level); )
        } 
        #ifdef COMPILE_EXPLAIN
        else if (strcmp(argv[arg], "--explain")==0) { option.explain=1; }
        #endif
        #ifdef COMPILE_TIMERS
        else if (strcmp(argv[arg], "--timers")==0) { option.timers=1; }
        #endif
        else if (strcmp(argv[arg], "--check")==0) { option.check=1; }
        else if (strcmp(argv[arg], "--nocheck")==0) { option.check=0; }
        else if (strcmp(argv[arg], "--tune")==0) { option.tunelevel=0;
            if (++arg >= argc) { fprintf(stderr, "No tune level specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%d", &option.tunelevel) != 1 || option.tunelevel > 4) {
                fprintf(stderr, "Error: Invalid tune level: %s\n", argv[arg]); usage(program_name, 1);
            }
            verbose1( printf("Tune level set to %d\n",option.tunelevel); )
        }
        else if (strcmp(argv[arg], "--time")==0) { option.time_max=0;
            if (++arg >= argc) { fprintf(stderr, "No time specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%lf", &option.time_max) != 1 ) {
                fprintf(stderr, "Error: Invalid max time: %s\n", argv[arg]); usage(program_name, 1);
            }
            verbose1( printf("Max time is set to %f seconds\n",option.time_max); )
        }
        else if (strcmp(argv[arg], "--show")==0) { option.show_explain_factor_max=0;
            if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.show_explain_factor_max) != 1 || option.show_explain_factor_max > option.fixed_benchmark_settings.factor_max) {
                fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(program_name, 1);
            }
            verbose1( printf("Show maximum set to %ju\n",(uintmax_t)option.show_explain_factor_max); )
        }
        else if (strcmp(argv[arg], "--max")==0) { option.fixed_benchmark_settings.factor_max = 0;
            if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.fixed_benchmark_settings.factor_max) != 1) {
                fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(program_name, 1);
            }
            verbose1( printf("Maximum set to %ju\n",(uintmax_t)option.fixed_benchmark_settings.factor_max); )
        }
        else if (strcmp(argv[arg], "--set")==0) {
            if (++arg >= argc) {
                fprintf(stderr, "No settings specified for --set\n");
                usage(program_name, 1);
            }
            
            char *p = argv[arg];
            while (*p) {
                // Skip any hyphens
                if (*p == '-') {
                    p++;
                    continue;
                }
                
                // Get the parameter type
                char param_type = *p++;
                uintmax_t value = 0;
                
                // Skip to first digit
                while (*p && !isdigit(*p)) p++;
                
                // Parse the number
                if (*p && isdigit(*p)) {
                    if (sscanf(p, "%ju", &value) != 1) {
                        fprintf(stderr, "Error: Invalid number after '%c'\n", param_type);
                        usage(program_name, 1);
                    }
                    
                    // Apply the value based on parameter type
                    switch(param_type) {
                        case 's': option.fixed_benchmark_settings.stripe_faster = value; break;
                        case 'm': option.fixed_benchmark_settings.mediumstep_faster = value; break;
                        case 'l': option.fixed_benchmark_settings.largestep_faster = value; break;
                        case 'b': option.fixed_benchmark_settings.blocksize_bits = value; break; 
                        case 'u': break;
                        case 'v': break;
                        case 't': option.fixed_benchmark_settings.threads = value; break;
                        default:
                            fprintf(stderr, "Error: Unknown parameter '%c'\n", param_type);
                            usage(program_name, 1);
                    }
                    
                    // Skip the parsed number
                    while (*p && isdigit(*p)) p++;
                }
            }
            
            verbose1( {
                printf("Settings: blockwise=%ju, stripe_faster=%ju, largestep=%ju, blocksize=%ju bits \n", 
                (uintmax_t)option.fixed_benchmark_settings.stripe_faster,
                (uintmax_t)option.fixed_benchmark_settings.mediumstep_faster,
                (uintmax_t)option.fixed_benchmark_settings.largestep_faster,
                (uintmax_t)option.fixed_benchmark_settings.blocksize_bits);
            })
        }
        else if (strcmp(argv[arg], "--threads")==0) { 
            if (++arg >= argc) { fprintf(stderr, "No thread maximum specified\n"); usage(program_name, 1); }
        #ifdef _OPENMP
            counter_t max_threads = (counter_t) omp_get_max_threads();
            if (strcmp(argv[arg], "all")==0) option.fixed_benchmark_settings.threads = max_threads;
            else if (strcmp(argv[arg], "half")==0) option.fixed_benchmark_settings.threads = max_threads>>1;
            else if (sscanf(argv[arg], "%d", (int *)&option.fixed_benchmark_settings.threads) != 1 ) { fprintf(stderr, "Error: Invalid max threads: %s\n", argv[arg]); usage(program_name, 1); }
            if (option.fixed_benchmark_settings.threads <1)  option.fixed_benchmark_settings.threads = 1;
            if (option.fixed_benchmark_settings.threads > max_threads)  option.fixed_benchmark_settings.threads = max_threads;
            verbose1( printf("Thread maximum set to %ju\n",(uintmax_t)option.fixed_benchmark_settings.threads); )
        #else
            verbose1( printf("This is the version without multithreading - ignoring threads\n"); )
        #endif
        }
        else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.fixed_benchmark_settings.factor_max) != 1) {
            fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(program_name, 1); 
            printf("Maximum set to %ju\n",(uintmax_t)option.fixed_benchmark_settings.factor_max);
        }
    }
    return option;
}

int main(int argc, char *argv[]) 
{
    setbuf(stdout, NULL); // prevent buffering of stdout

    option = setDefaultOptions();
    option = parseCommandLine(argc, argv, option);
    verbose2({
        printf("Sieve algorithm by Rogier van Dam - 2025\n");
        printf("Find all primes up to \033[1;33m%ju\033[0m using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)\n", (uintmax_t)option.fixed_benchmark_settings.factor_max);
    })
    verbose1( printf("\nRunning sieve_extend variant \033[1;33m%s\033[0m u%juv%ju... \n", algorithm_name, (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); )
    
    #ifdef COMPILE_EXPLAIN
    if (option.explain >= 1) {
        explainSieveShake(option.fixed_benchmark_settings);
        exit(0);
    }
    #endif

    #ifdef COMPILE_TIMERS
    if (option.timers) {
        timer_init();
        verbose1( printf("Timing the different parts of the algorithm\n"); )
    }
    #endif

    // command line --check can be used to check the algorithm for all sieve/blocksize combinations
    if (option.check) checkSieveAlgorithm(option.fixed_benchmark_settings); 

    for(counter_t threads=option.fixed_benchmark_settings.threads, runs = 0; threads >= 1 && runs < 2; threads = (threads>>1), runs++ ) {

        // prepare settings
        benchmark_settings_t benchmark_settings = benchmarkInit(threads);

        // tuning - try combinations of different settings and apply these
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tune(option.tunelevel, benchmark_settings);
            setSettingsFromTuning(&benchmark_settings, &(tuning_result.settings));
        }

        // encode settings for reporting
        char settings_string[100]=""; benchmark_settings_as_string(settings_string, benchmark_settings);
        verbose1( { printf("Benchmarking with settings: \033[1;32m%s\033[0m (stripeprime, mediumstep, largestep, blocksize, wordsize, vectorsize) and \033[1;32m%ju\033[0m threads for \033[1;32m%.1f\033[0m seconds\nResults: \033[5m(wait \033[1;32m%.1lf\033[39m seconds)\033[25m...\033[0m", 
            settings_string,(uintmax_t)benchmark_settings.threads, benchmark_settings.sample_duration, benchmark_settings.sample_duration );
        })

        // one last check to make sure this is a valid algorithm for these settings
        if (!checkSieveWithBenchmarkSettings(benchmark_settings)) { fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) benchmark_settings.factor_max); exit(1); }
        else { verbose1(  printf("(verified that settings %s and max %ju is \033[1;32mvalid\033[0m)", settings_string, (uintmax_t) benchmark_settings.factor_max); ) }
    
        // perform benchmark -> outputs passes, elapsed time and avg in result 
        debug_final_benchmarking = 1;
        benchmark_result_t benchmark_result = benchmark(benchmark_settings);
        debug_final_benchmarking = 0;
        verbose1(outputBenchmarkStats(benchmark_result);)

        // report results
        char extension[50] = "";      extension_as_string(extension);      
        benchmark_settings_as_string(settings_string, benchmark_result.settings);
        printf("%s%s;%ju;%f;%ju;algorithm=%s,faithful=yes,bits=1",algorithm_name,extension,(uintmax_t)benchmark_result.passes,benchmark_result.elapsed_time,(uintmax_t)threads, algorithm_type);
    }

    // show results for --show command line option
    if (option.show_explain_factor_max > 0) showResult(option.fixed_benchmark_settings);

    if (option.timers) print_timing_table();

    // if (debug_hits || debug_hits2) 
    printf("Hits: %ju %ju\n",(uintmax_t)debug_hits, (uintmax_t)debug_hits2);

}

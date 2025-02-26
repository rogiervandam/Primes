
static void usage(char *name) 
{
    fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
    fprintf(stderr, "Options:\n");
    fprintf(stderr, "  --check                   Check the correctness of the algorithm\n");
    fprintf(stderr, "  --nocheck                 Skip check of the correctness of the algorithm\n");
    #if compile_verbose_level >= 4
    fprintf(stderr, "  --explain                 Explain the steps of the algorithm - only when compiled for debug\n");
    #endif
    fprintf(stderr, "  --help                    This help function\n");
    fprintf(stderr, "  --show  <maximum>         Show the primes found up to the maximum\n");
    #ifdef _OPENMP
    fprintf(stderr, "  --threads <count>         Set the maximum number of threads to be used (only when compiled for openmp)\n");
    fprintf(stderr, "                            Use 'all' to use all available threads or 'half' for /2 (e.g. for no hyperthreading)\n");
    #endif
    fprintf(stderr, "  --time  <seconds>         The maximum time (in seconds) to run passes of the sieve algorithm\n");
    fprintf(stderr, "  --tune  <level>           find the best settings for the current os and hardware\n");
    fprintf(stderr, "                            0 - no tuning\n");
    fprintf(stderr, "                            1 - fast tuning\n");
    fprintf(stderr, "                            2 - refined tuning\n");
    fprintf(stderr, "                            3 - maximum tuning (takes long)\n");
    fprintf(stderr, "  --verbose <level>         Show more output to a certain level:\n");
    fprintf(stderr, "                            1 - show phase progress\n");
    fprintf(stderr, "                            2 - show general progress within the phase\n");
    fprintf(stderr, "                            3 - show actual work\n");
    fprintf(stderr, "                            4 - show timing\n");
    fprintf(stderr, "  --set_block <kilobyte>    Set the block size to a specific <size> in kilobytes\n");
    fprintf(stderr, "  --set_blockwise <prime>   Set the cutoff prime for blockwise striping\n");
    fprintf(stderr, "  --set_mediumstep <bits>   Set the cutoff number of bits for wordwise striping\n");
    fprintf(stderr, "  --set_vectorstep <bits>   Set the cutoff number of bits for vectorwise striping\n");
    fprintf(stderr, "\n    Set all in one go:\n");
    fprintf(stderr, "  --set <blockwise>/<mediumstep>/<vectorstep>  \n");
    fprintf(stderr, "Maximum is the heighest prime to examine.\n");

    exit(1);
}

static struct options_t parseCommandLine(int argc, char *argv[], struct options_t option)
{
    // processing command line changes to options
    for (int arg=1; arg < argc; arg++) {
        if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
        else if (strcmp(argv[arg], "--verbose")==0) { option.verboselevel=0;
            if (++arg >= argc) { fprintf(stderr, "No verbose level specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%d", &option.verboselevel) != 1 || option.verboselevel > 4) {
                fprintf(stderr, "Error: Invalid measurement time: %s\n", argv[arg]); usage(argv[0]);
            }
            verbose(1) printf("Verbose level set to %d\n",option.verboselevel);
        } 
        #if compile_debuggable
        else if (strcmp(argv[arg], "--explain")==0) { option.explain=1; }
        #endif
        else if (strcmp(argv[arg], "--check")==0) { option.check=1; }
        else if (strcmp(argv[arg], "--nocheck")==0) { option.check=0; }
        else if (strcmp(argv[arg], "--tune")==0) { option.tunelevel=0;
            if (++arg >= argc) { fprintf(stderr, "No tune level specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%d", &option.tunelevel) != 1 || option.tunelevel > 4) {
                fprintf(stderr, "Error: Invalid tune level: %s\n", argv[arg]); usage(argv[0]);
            }
            verbose(1) printf("Tune level set to %d\n",option.tunelevel);
        }
        else if (strcmp(argv[arg], "--time")==0) { option.maxTime=0;
            if (++arg >= argc) { fprintf(stderr, "No time specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%lf", &option.maxTime) != 1 ) {
                fprintf(stderr, "Error: Invalid max time: %s\n", argv[arg]); usage(argv[0]);
            }
            verbose(1) printf("Max time is set to %d seconds\n",option.tunelevel);
        }
        else if (strcmp(argv[arg], "--show")==0) { option.showMaxFactor=0;
            if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.showMaxFactor) != 1 || option.showMaxFactor > option.maxFactor) {
                fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
            }
            verbose(1) printf("Show maximum set to %ju\n",(uintmax_t)option.showMaxFactor);
        }
        else if (strcmp(argv[arg], "--set_block")==0) {
            if (++arg >= argc) { fprintf(stderr, "No block size specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.blocksize_kB) != 1) {
                fprintf(stderr, "Error: Invalid size in kilobyte: %s\n", argv[arg]); usage(argv[0]);
            }
            counter_t sieve_bits = option.maxFactor >> 1;
            if ((option.blocksize_kB*1024*8) > (sieve_bits)) option.blocksize_kB = (sieve_bits / (1024*8))+1;
            verbose(1) printf("Blocksize set to %ju kB\n",(uintmax_t)option.blocksize_kB);
        } 
        else if (strcmp(argv[arg], "--set_blockwise")==0) { option.smallprime_faster=0;
            if (++arg >= argc) { fprintf(stderr, "No blockwise number specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.smallprime_faster) != 1 ) {
                fprintf(stderr, "Error: Invalid blockwise setting: %s\n", argv[arg]); usage(argv[0]);
            }
            verbose(1) printf("Blockwise set to %ju\n",(uintmax_t)option.smallprime_faster);
        }
        else if (strcmp(argv[arg], "--set_mediumstep")==0) { option.mediumStep=0;
            if (++arg >= argc) { fprintf(stderr, "No mediumstep number specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.mediumStep) != 1 ) {
                fprintf(stderr, "Error: Invalid mediumstep setting: %s\n", argv[arg]); usage(argv[0]);
            }
            verbose(1) printf("Vectorstep set to %ju\n",(uintmax_t)option.mediumStep);
        }
        else if (strcmp(argv[arg], "--set_vectorstep")==0) { option.vectorStep=0;
            if (++arg >= argc) { fprintf(stderr, "No vectorstep number specified\n"); usage(argv[0]); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.vectorStep) != 1 ) {
                fprintf(stderr, "Error: Invalid vectorstep setting: %s\n", argv[arg]); usage(argv[0]);
            }
            verbose(1) printf("Vectorstep set to %ju\n",(uintmax_t)option.vectorStep);
        }
        else if (strcmp(argv[arg], "--set")==0) {
            if (++arg >= argc) {
                fprintf(stderr, "No settings specified for --set\n");
                usage(argv[0]);
            }
            
            uintmax_t blocksize = option.blocksize_kB;             // Initialize with current values
            uintmax_t blockwise = option.smallprime_faster;
            uintmax_t mediumstep = option.mediumStep;
            uintmax_t vectorstep = option.vectorStep;
            
            int found_any = 0;
            char *param = argv[arg];
            char *p = param;
            
            // Parse all parameters if present
            while (*p) {
                if (*p == 'b') {
                    p++;
                    if (sscanf(p, "%ju", &blocksize) != 1) {
                        fprintf(stderr, "Error: Invalid blocksize value after 'b'\n");
                        usage(argv[0]);
                    }
                    found_any = 1;
                    while (*p && isdigit(*p)) p++;
                }
                else if (*p == 's') {
                    p++;
                    if (sscanf(p, "%ju", &blockwise) != 1) {
                        fprintf(stderr, "Error: Invalid blockwise value after 's'\n");
                        usage(argv[0]);
                    }
                    found_any = 1;
                    while (*p && isdigit(*p)) p++;
                }
                else if (*p == 'm') {
                    p++;
                    if (sscanf(p, "%ju", &mediumstep) != 1) {
                        fprintf(stderr, "Error: Invalid mediumstep value after 'm'\n");
                        usage(argv[0]);
                    }
                    found_any = 1;
                    while (*p && isdigit(*p)) p++;
                }
                else if (*p == 'v') {
                    p++;
                    if (sscanf(p, "%ju", &vectorstep) != 1) {
                        fprintf(stderr, "Error: Invalid vectorstep value after 'v'\n");
                        usage(argv[0]);
                    }
                    found_any = 1;
                    while (*p && isdigit(*p)) p++;
                }
                else {
                    fprintf(stderr, "Error: Unknown parameter identifier '%c'\n", *p);
                    fprintf(stderr, "Format should use b/s/m/v prefixes like: b128s1000m500v200\n");
                    fprintf(stderr, "Parameters are optional - only specified values are changed\n");
                    usage(argv[0]);
                }
            }
            
            if (!found_any) {
                fprintf(stderr, "Error: No valid parameters found in '%s'\n", param);
                fprintf(stderr, "Format should use b/s/m/v prefixes like: b128s1000m500v200\n");
                fprintf(stderr, "Parameters are optional - only specified values are changed\n");
                usage(argv[0]);
            }
            
            // Set blocksize with the same validation as in --set_block
            option.blocksize_kB = blocksize;
            counter_t sieve_bits = option.maxFactor >> 1;
            if ((option.blocksize_kB*1024*8) > (sieve_bits)) option.blocksize_kB = (sieve_bits / (1024*8))+1;
            
            option.smallprime_faster = blockwise;
            option.mediumStep = mediumstep;
            option.vectorStep = vectorstep;
            
            verbose(1) printf("Settings: blocksize=%ju kB, blockwise=%ju, mediumstep=%ju, vectorstep=%ju\n", 
                (uintmax_t)option.blocksize_kB,
                (uintmax_t)option.smallprime_faster,
                (uintmax_t)option.mediumStep,
                (uintmax_t)option.vectorStep);
        }
        else if (strcmp(argv[arg], "--threads")==0) { 
            if (++arg >= argc) { fprintf(stderr, "No thread maximum specified\n"); usage(argv[0]); }
        #ifdef _OPENMP
            int max_threads = omp_get_max_threads();
            if (strcmp(argv[arg], "all")==0) option.threads = max_threads;
            else if (strcmp(argv[arg], "half")==0) option.threads = max_threads>>1;
            else if (sscanf(argv[arg], "%d", &option.threads) != 1 ) { fprintf(stderr, "Error: Invalid max threads: %s\n", argv[arg]); usage(argv[0]); }
            if (option.threads <1)  option.threads = 1;
            if (option.threads > max_threads)  option.threads = max_threads;
            verbose(1) printf("Thread maximum set to %ju\n",(uintmax_t)option.threads);
        #else
            verbose(1) printf("This is the version without multithreading - ignoring threads\n");
        #endif
        }
        else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.maxFactor) != 1) {
            fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(argv[0]); 
            printf("Maximum set to %ju\n",(uintmax_t)option.maxFactor);
        }

        counter_t sieve_bits = option.maxFactor >> 1;
        if ((option.blocksize_kB*1024*8) > (sieve_bits)) {
            option.blocksize_kB = (sieve_bits / (1024*8))+1;
            verbose(1) printf("Blocksize corrected to %ju kB\n",(uintmax_t)option.blocksize_kB);
        }

    }
    return option;
}


int main(int argc, char *argv[]) 
{
    verbose2( algorithmWelcome(); )
    verbose1( printf("\n"); )

    option = setDefaultOptions();
    option = parseCommandLine(argc, argv, option);

    #if compile_verbose_level >= 4
    verbose4( if (option.explain>=1) {
        explainSieveShake();
        printf("Exit\n");
        exit(0);
    })
    #endif

    // command line --check can be used to check the algorithm for all sieve/blocksize combinations
    if (option.check) checkSieveAlgorithm(); 

    for(counter_t threads=option.threads, runs = 0; threads >= 1 && runs < 2; threads = (threads>>1), runs++ ) {

        // prepare settings
//        benchmark_result_t benchmark_result = benchmarkInit(threads);
        benchmark_settings_t benchmark_settings = benchmarkInit(threads, option.blocksize_kB);

        // tuning - try combinations of different settings and apply these
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tune(option.tunelevel, benchmark_settings);
            setSettingsFromTuning(&benchmark_settings, &(tuning_result.settings));
        }

        // encode settings for reporting
        char extension[50] = "";
        char extended_output[50] = "";
        prepareSettingsForOutput(benchmark_settings, extension, extended_output);
        
        // one last check to make sure this is a valid algorithm for these settings
        checkSieveWithBenchmarkSettings(benchmark_settings);

        // perform benchmark -> outputs passes, elapsed time and avg in result 
        benchmark_result_t benchmark_result = benchmark(benchmark_settings);
        verbose1(outputBenchmarkStats(benchmark_result, threads);)

        // report results
        reportMessage(extension, extended_output, benchmark_result, threads);
    }

    // show results for --show command line option
    if (option.showMaxFactor > 0) showResult();
}

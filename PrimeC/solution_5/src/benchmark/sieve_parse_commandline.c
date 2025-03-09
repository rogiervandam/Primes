static inline int local_isdigit(int c) {
    return (c >= '0' && c <= '9');
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
                verbose1( fprintf(stderr, "Error: Invalid measurement time: %s\n", argv[arg]); usage(program_name, 1); )
            }
            verbose2( printf("Verbose level set to %d\n",option.verbose_level); )
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
                verbose1( fprintf(stderr, "Error: Invalid tune level: %s\n", argv[arg]); usage(program_name, 1); )
            }
            verbose2( printf("Tune level set to %d\n",option.tunelevel); )
        }
        else if (strcmp(argv[arg], "--time")==0) { option.time_max=0;
            if (++arg >= argc) { fprintf(stderr, "No time specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%lf", &option.time_max) != 1 ) {
                verbose1( fprintf(stderr, "Error: Invalid max time: %s\n", argv[arg]); usage(program_name, 1); )
            }
            verbose2( printf("Max time is set to %f seconds\n",option.time_max); )
        }
        else if (strcmp(argv[arg], "--show")==0) { option.show_explain_factor_max=0;
            if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.show_explain_factor_max) != 1 || option.show_explain_factor_max > option.fixed_benchmark_settings.factor_max) {
                fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(program_name, 1);
            }
            verbose2( printf("Show maximum set to %ju\n",(uintmax_t)option.show_explain_factor_max); )
        }
        else if (strcmp(argv[arg], "--max")==0) { option.fixed_benchmark_settings.factor_max = 0;
            if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(program_name, 1); }
            if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.fixed_benchmark_settings.factor_max) != 1) {
                verbose1( fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(program_name, 1); )
            }
            verbose2( printf("Maximum set to %ju\n",(uintmax_t)option.fixed_benchmark_settings.factor_max); )
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
                while (*p && !local_isdigit(*p)) p++;
                
                // Parse the number
                if (*p && local_isdigit(*p)) {
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
                    while (*p && local_isdigit(*p)) p++;
                }
            }
            
            verbose2( {
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
            verbose2( printf("Thread maximum set to %ju\n",(uintmax_t)option.fixed_benchmark_settings.threads); )
        #else
            verbose2( printf("This is the version without multithreading - ignoring threads\n"); )
        #endif
        }
        else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.fixed_benchmark_settings.factor_max) != 1) {
            verbose1( fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(program_name, 1); )
            verbose2( printf("Maximum set to %ju\n",(uintmax_t)option.fixed_benchmark_settings.factor_max); )
        }
    }
    return option;
}
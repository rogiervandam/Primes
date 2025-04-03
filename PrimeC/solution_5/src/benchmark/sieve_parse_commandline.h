#if COMPILE_VERBOSE_LEVEL >= 1

static inline int __attribute__((cold, const)) 
isdigit_local(int c) {
    return (c >= '0' && c <= '9');
}

static inline char __attribute__((cold, nonnull, returns_nonnull)) 
*strrchr_local(const char *s, int c) {
    const char *p = NULL;
    for (;;) {
        if (*s == (char)c) p = s;
        if (*s++ == '\0')  return (char *)p;
    }
}

static inline int __attribute__((cold)) 
strcmp_local(const char *s1, const char *s2) {
    while (*s1 && (*s1 == *s2)) { s1++; s2++; }
    return (((unsigned char)*s1 - (unsigned char)*s2) == 0);
}

// Helper function to check for next argument
static inline int __attribute__((cold))
ensure_next_arg(int arg, int argc, char *program_name, const char *option_name) {
    if (arg >= argc) {
        fprintf(stderr, "No %s specified\n", option_name);
        usage(program_name, 1);
        return 0; // Never reached due to usage() exit
    }
    return 1;
}

// Helper function for integer argument parsing
static inline int __attribute__((cold))
parse_int_arg(char *arg_str, counter_t *value, counter_t max_value, char *program_name, const char *error_msg) {
    uintmax_t temp_value; // Use a local variable instead of a pointer
    if (sscanf(arg_str, "%ju", &temp_value) != 1 || temp_value > max_value) {
        verbose1(fprintf(stderr, "Error: %s: %s\n", error_msg, arg_str); usage(program_name, 1));
        return 0; // Never reached due to usage() exit
    }
    *value = (counter_t)temp_value; // Assign the value after casting
    return 1;
}

// Helper function for double argument parsing
static inline int __attribute__((cold))
parse_double_arg(char *arg_str, double *value,  char *program_name, const char *error_msg) {
    if (sscanf(arg_str, "%lf", value) != 1) {
        verbose1(fprintf(stderr, "Error: %s: %s\n", error_msg, arg_str); usage(program_name, 1));
        return 0; // Never reached due to usage() exit
    }
    return 1;
}

// Helper function to handle set parameters
static inline void __attribute__((cold))
handle_set_parameter(char param_type, uintmax_t value, struct options_t *option) {
    switch(param_type) {
        case 's': option->fixed_benchmark_settings.stripe_faster = value; break;
        case 'l': option->fixed_benchmark_settings.largestep_faster = value; break;
        case 'b': option->fixed_benchmark_settings.blocksize_bits = value; break; 
        case 'u': break; // can only set compile time; ignore
        case 'v': break; // can only set compile time; ignore
        case 'c': break; // can only set compile time; ignore
        case 't': option->fixed_benchmark_settings.threads = value; break;
        default:
            fprintf(stderr, "Error: Unknown parameter '%c'\n", param_type);
            usage(NULL, 1); // program_name will be set when function is called
    }
}

static void __attribute__((cold)) 
parseCommandLine(int argc, char *argv[])
{
    char *program_name = argv[0];
    program_name = max(program_name, strrchr_local(program_name, '/')+1);
    program_name = max(program_name, strrchr_local(program_name, '\\')+1);

    // processing command line changes to options
    for (int arg=1; arg < argc; arg++) {
        if (strcmp_local(argv[arg], "--help")) { 
            usage(program_name, 0); 
        }
        else if (strcmp_local(argv[arg], "--verbose")) { 
            ensure_next_arg(++arg, argc, program_name, "verbose level");
            parse_int_arg(argv[arg], &option.verbose_level, 9, program_name, "Invalid measurement time");
            verbose2(printf("Verbose level set to %d\n", option.verbose_level));
        } 
        #ifdef COMPILE_EXPLAIN
        else if (strcmp_local(argv[arg], "--explain")) { 
            option.explain = 1;  
            verbose2(printf("Explain ON\n"));
        }
        #endif
        #ifdef COMPILE_TIMERS 
        else if (strcmp_local(argv[arg], "--timers")) { 
            option.timers = 2; 
        }
        #endif
        else if (strcmp_local(argv[arg], "--check")) { 
            ensure_next_arg(++arg, argc, program_name, "check level");
            parse_int_arg(argv[arg], &option.check, 7, program_name, "Invalid check level");
            verbose2(printf("Check level set to %d\n", option.check));
        }
        else if (strcmp_local(argv[arg], "--nocheck")) { 
            option.check = 0; 
        }
        else if (strcmp_local(argv[arg], "--tune")) { 
            ensure_next_arg(++arg, argc, program_name, "tune level");
            parse_int_arg(argv[arg], &option.tunelevel, 4, program_name, "Invalid tune level");
            verbose2(printf("Tune level set to %d\n", option.tunelevel));
        }
        else if (strcmp_local(argv[arg], "--time")) {
            ensure_next_arg(++arg, argc, program_name, "time");
            parse_double_arg(argv[arg], &option.fixed_benchmark_settings.sample_duration, program_name, "Invalid max time");
            verbose2(printf("Max time is set to %f seconds\n", option.fixed_benchmark_settings.sample_duration));
        }
        else if (strcmp_local(argv[arg], "--show")==0) {
            ensure_next_arg(++arg, argc, program_name, "show maximum");
            parse_int_arg(argv[arg], &option.show_explain_factor_max, option.fixed_benchmark_settings.factor_max, program_name, "Invalid show maximum");
            verbose2(printf("Show maximum set to %ju\n", (uintmax_t)option.show_explain_factor_max));
        }
        else if (strcmp_local(argv[arg], "--max")) {
            ensure_next_arg(++arg, argc, program_name, "show maximum");
            parse_int_arg(argv[arg], &option.fixed_benchmark_settings.factor_max, COUNTER_T_MAX_VALUE, program_name, "Invalid sieve maximum");
            verbose2(printf("Maximum set to %ju\n", (uintmax_t)option.fixed_benchmark_settings.factor_max));
        }
        else if (strcmp_local(argv[arg], "--set")==0) {
            arg++;
            ensure_next_arg(arg, argc, program_name, "settings for --set");
            
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
                while (*p && !isdigit_local(*p)) p++;
                
                // Parse the number
                if (*p && isdigit_local(*p)) {
                    if (sscanf(p, "%ju", &value) != 1) {
                        fprintf(stderr, "Error: Invalid number after '%c'\n", param_type);
                        usage(program_name, 1);
                    }
                    
                    // Apply the value based on parameter type
                    handle_set_parameter(param_type, value, &option);
                    
                    // Skip the parsed number
                    while (*p && isdigit_local(*p)) p++;
                }
            }
            
            verbose2({
                char settings_string[50] = "";
                setBenchmarkSettingAsString(settings_string, option.fixed_benchmark_settings);
                printf("Initial settings: " COLOR_BOLD_GREEN "%s" COLOR_RESET "\n", settings_string);
            })
        }
        else if (strcmp_local(argv[arg], "--threads")) { 
            arg++;
            ensure_next_arg(arg, argc, program_name, "thread maximum");
            
        #ifdef _OPENMP
            counter_t max_threads = (counter_t) omp_get_max_threads();
            if (strcmp_local(argv[arg], "all")) {
                option.fixed_benchmark_settings.threads = max_threads;
            }
            else if (strcmp_local(argv[arg], "half")) {
                option.fixed_benchmark_settings.threads = max_threads>>1;
            }
            else if (sscanf(argv[arg], "%d", (int *)&option.fixed_benchmark_settings.threads) != 1) { 
                fprintf(stderr, "Error: Invalid max threads: %s\n", argv[arg]); 
                usage(program_name, 1); 
            }
            
            // Ensure thread count is within valid range
            if (option.fixed_benchmark_settings.threads < 1) {
                option.fixed_benchmark_settings.threads = 1;
            }
            if (option.fixed_benchmark_settings.threads > max_threads) {
                option.fixed_benchmark_settings.threads = max_threads;
            }
            
            verbose2(printf("Thread maximum set to %ju\n", (uintmax_t)option.fixed_benchmark_settings.threads));
        #else
            verbose2(printf("This is the version without multithreading - ignoring threads\n"));
        #endif
        }
        else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.fixed_benchmark_settings.factor_max) != 1) {
            verbose1(fprintf(stderr, "Invalid size %s\n", argv[arg]); usage(program_name, 1));
            verbose2(printf("Maximum set to %ju\n", (uintmax_t)option.fixed_benchmark_settings.factor_max));
        }
    }
}
#endif
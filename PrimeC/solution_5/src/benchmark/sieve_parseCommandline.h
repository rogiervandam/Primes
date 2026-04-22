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
        verbose1( fprintf(stderr, "No %s specified\n", option_name); )
        usage(program_name, 1);
        return 0; // Never reached due to usage() exit
    }
    return 1;
}

// Custom string to uintmax_t converter
static inline int __attribute__((cold))
str_to_uintmax(const char *str, uintmax_t *value) {
    // skip empty string and non-digit characters
    if (!str || !*str || !isdigit_local(*str)) return 0;
    
    uintmax_t result = 0;
    for (; *str && isdigit_local(*str); str++) {
        // Check for overflow before adding new digit
        if (result > UINTMAX_MAX / 10) return 0;
        result *= 10;
        
        uintmax_t digit = *str - '0';
        if (result > UINTMAX_MAX - digit) return 0;
        result += digit;
    }
    
    // If we stopped on non-whitespace/null/hyphen, it's invalid
    if (*str && *str != ' ' && *str != '\t'  && *str != '-') return 0;
    
    *value = result;
    return 1;
}

// Helper function for integer argument parsing
static inline int __attribute__((cold))
parse_int_arg(char *arg_str, counter_t *value, counter_t max_value, char *program_name, const char *error_msg) {
    uintmax_t temp_value; // Use a local variable instead of a pointer
    if (str_to_uintmax(arg_str, &temp_value) != 1 || temp_value > max_value) {
        verbose1({ fprintf(stderr, "Error: %s: %s\n", error_msg, arg_str); usage(program_name, 1); });
        return 0; // Never reached due to usage() exit
    }
    *value = (counter_t)temp_value; // Assign the value after casting
    return 1;
}

// Custom string to double converter
static inline int __attribute__((cold))
str_to_double(const char *str, double *value) {
    if (!str || !*str) return 0;
    
    // Parse integer part
    double result = 0.0;
    int have_digits = 0;
    for (; *str && isdigit_local(*str); str++) {
        result = result * 10.0 + (*str - '0');
    }
    
    // Parse fractional part
    if (*str == '.') {
        str++;
        double fraction = 0.1;
        for (;*str && isdigit_local(*str); str++) {
            result += (*str - '0') * fraction;
            fraction *= 0.1;
        }
    }
   
    // If we stopped on non-whitespace/null, it's invalid
    if (*str && *str != ' ' && *str != '\t') return 0;
    
    *value = result;
    return 1;
}

// Helper function for double argument parsing
static inline int __attribute__((cold))
parse_double_arg(char *arg_str, double *value,  char *program_name, const char *error_msg) {
    if (str_to_double(arg_str, value) != 1) {
        verbose1({ fprintf(stderr, "Error: %s: %s\n", error_msg, arg_str); usage(program_name, 1); });
        return 0; // Never reached due to usage() exit
    }
    return 1;
}

// Helper function to handle set parameters
static inline void __attribute__((cold))
handle_set_parameter(char param_type, uintmax_t value, struct options_t *optionref) {
    switch(param_type) {
        case 's': optionref->fixed_benchmark_settings.stripe_faster = value; break;
        case 'l': optionref->fixed_benchmark_settings.largestep_faster = value; break;
        case 'b': optionref->fixed_benchmark_settings.blocksize_bits = value; break; 
        case 'v': optionref->fixed_benchmark_settings.vectorsize = value; break;
        case 'a': optionref->fixed_benchmark_settings.algorithm = value; break;
        case 't': optionref->fixed_benchmark_settings.threads = value; break;
        default:
            verbose1( fprintf(stderr, "Error: Unknown parameter '%c'\n", param_type); )
            usage(NULL, 1); // program_name will be set when function is called
    }
}

static inline void __attribute__((cold))
parse_set_parameter(char *arg, char *program_name, struct options_t *optionref) {
    char *p = arg;
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
            if (str_to_uintmax(p, &value) != 1) {
                verbose1( fprintf(stderr, "Error: Invalid number after '%c'\n", param_type); )
                usage(program_name, 1);
            }

            // Apply the value based on parameter type
            handle_set_parameter(param_type, value, optionref);

            // Skip the parsed number
            while (*p && isdigit_local(*p)) p++;
        }
    }

}

static inline char* setBenchmarkSettingAsString(char* settings_string, benchmark_settings_t benchmark_settings) 
{
    snprintf(settings_string, 50, "s%03ju-l%03ju-b%07ju-v%3ju-a%1ju", (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.largestep_faster, (uintmax_t)benchmark_settings.blocksize_bits, (uintmax_t)benchmark_settings.vectorsize, (uintmax_t)benchmark_settings.algorithm);
    return settings_string;
}

static char      global_settings_string[50] = ""; // settings string to use where it is directly outputted
static inline char *getBenchmarkSettingAsString(benchmark_settings_t benchmark_settings) 
{
    return setBenchmarkSettingAsString(global_settings_string, benchmark_settings);
}

static inline const char *getBenchmarkProgramName(void)
{
    static char normalized_program_name[256];
    const char *program_name = option.program_name ? option.program_name : "sieve";
    size_t length = strlen(program_name);

    if (length >= sizeof(normalized_program_name)) {
        length = sizeof(normalized_program_name) - 1;
    }

    memcpy(normalized_program_name, program_name, length);
    normalized_program_name[length] = '\0';

    if (length >= 6 && strcmp(normalized_program_name + length - 6, "_trace") == 0) {
        normalized_program_name[length - 6] = '\0';
    }

    return normalized_program_name;
}

static inline int hasTraceOutput(void)
{
    #ifdef COMPILE_TRACE
    return option.trace_filename != NULL;
    #else
    return 0;
    #endif
}

static inline int isExplainOrTraceMode(void)
{
    return option.explain_level > 0 || hasTraceOutput();
}

// check if --set was used (any of the four hot-path settings are non-zero)
static inline int hasExplicitSettings(void) {
    return option.fixed_benchmark_settings.stripe_faster
        || option.fixed_benchmark_settings.largestep_faster
        || option.fixed_benchmark_settings.blocksize_bits
        || option.fixed_benchmark_settings.vectorsize;
}

static inline int shouldLoadLastSettings(void)
{
    if (hasExplicitSettings()) {
        return 0;
    }

    return option.tunelevel == 0 || isExplainOrTraceMode();
}

static void __attribute__((cold))
loadLastSettings(void)
{
    char settings_path[256];
    snprintf(settings_path, sizeof(settings_path), "dev/build/%s_settings.txt", getBenchmarkProgramName());
    FILE* f = fopen(settings_path, "r");
    if (f) {
        char buf[64];
        if (fgets(buf, sizeof(buf), f)) {
            // strip newline
            for (char *p = buf; *p; p++) { if (*p == '\n' || *p == '\r') { *p = '\0'; break; } }
            // parse settings string inline (format: s063-l128-b0262144-v256-a1)
            for (char *p = buf; *p; ) {
                if (*p == '-') { p++; continue; }
                char key = *p++;
                uintmax_t val = 0;
                while (*p >= '0' && *p <= '9') { val = val * 10 + (*p - '0'); p++; }
                switch (key) {
                    case 's': option.fixed_benchmark_settings.stripe_faster    = val; break;
                    case 'l': option.fixed_benchmark_settings.largestep_faster = val; break;
                    case 'b': option.fixed_benchmark_settings.blocksize_bits   = val; break;
                    case 'v': option.fixed_benchmark_settings.vectorsize       = val; break;
                    case 'a': option.fixed_benchmark_settings.algorithm        = val; break;
                    default: break;
                }
            }
            verbose2(printf("Loaded settings from %s: " COLOR_GREEN "%s" COLOR_RESET "\n", settings_path, buf);)
        }
        fclose(f);
    }
}

static void __attribute__((cold))
saveLastSettings(benchmark_settings_t settings)
{
    char settings_path[256];
    snprintf(settings_path, sizeof(settings_path), "dev/build/%s_settings.txt", getBenchmarkProgramName());
    FILE* f = fopen(settings_path, "w");
    if (f) {
        char settings_string[50];
        setBenchmarkSettingAsString(settings_string, settings);
        fprintf(f, "%s\n", settings_string);
        fclose(f);
        verbose3(printf("Saved settings to %s\n", settings_path);)
    }
}

static void __attribute__((cold)) 
parseCommandLine(int argc, char *argv[])
{
    setbuf(stdout, NULL); // prevent buffering of stdout
    setDefaultOptions();

    option.program_name = argv[0];
    option.program_name = max(option.program_name, strrchr_local(option.program_name, '/')+1);
    option.program_name = max(option.program_name, strrchr_local(option.program_name, '\\')+1);
    char *program_name = option.program_name;

    // processing command line changes to options
    for (int arg=1; arg < argc; arg++) {

        if (strcmp_local(argv[arg], "--verbose")) { 
            ensure_next_arg(++arg, argc, program_name, "verbose level");
            parse_int_arg(argv[arg], &option.verbose_level, 9, program_name, "Invalid verbose level");
        } 
        else if (strcmp_local(argv[arg], "--tune")) { 
            ensure_next_arg(++arg, argc, program_name, "tune level");
            parse_int_arg(argv[arg], &option.tunelevel, 6, program_name, "Invalid tune level");
            verbose4(printf("Tune level set to %d\n", option.tunelevel));
        }
        else if (strcmp_local(argv[arg], "--time")) {
            ensure_next_arg(++arg, argc, program_name, "time");
            parse_double_arg(argv[arg], &option.fixed_benchmark_settings.sample_duration, program_name, "Invalid max time");
            verbose4(printf("Max time is set to %f seconds\n", option.fixed_benchmark_settings.sample_duration));
        }
        else if (strcmp_local(argv[arg], "--max")) {
            ensure_next_arg(++arg, argc, program_name, "sieve maximum");
            parse_int_arg(argv[arg], &option.fixed_benchmark_settings.factor_max, COUNTER_T_MAX_VALUE, program_name, "Invalid sieve maximum");
            verbose4(printf("Maximum set to %ju\n", (uintmax_t)option.fixed_benchmark_settings.factor_max);)
        }
        else if (strcmp_local(argv[arg], "--set")) {
            ensure_next_arg(++arg, argc, program_name, "settings for --set");
            parse_set_parameter(argv[arg], program_name, &option);
            verbose4(printf("Initial settings: " COLOR_BOLD_GREEN "%s" COLOR_RESET "\n", getBenchmarkSettingAsString(option.fixed_benchmark_settings));)
        }
        else if (strcmp_local(argv[arg], "--threads")) { 
            ensure_next_arg(++arg, argc, program_name, "thread maximum");
            
            #ifdef _OPENMP
                counter_t max_threads = (counter_t) omp_get_max_threads();
                if (strcmp_local(argv[arg], "all")) {
                    option.fixed_benchmark_settings.threads = max_threads;
                }
                else if (strcmp_local(argv[arg], "half")) {
                    option.fixed_benchmark_settings.threads = max_threads>>1;
                }
                else if (sscanf(argv[arg], "%d", (int *)&option.fixed_benchmark_settings.threads) != 1) { 
                    verbose1( fprintf(stderr, "Error: Invalid max threads: %s\n", argv[arg]); )
                    usage(program_name, 1); 
                }
                
                // Ensure thread count is within valid range
                if (option.fixed_benchmark_settings.threads < 1) {
                    option.fixed_benchmark_settings.threads = 1;
                }
                if (option.fixed_benchmark_settings.threads > max_threads) {
                    option.fixed_benchmark_settings.threads = max_threads;
                }
                
                verbose4(printf("Thread maximum set to %ju\n", (uintmax_t)option.fixed_benchmark_settings.threads));
            #else
                verbose2(printf("This is the version without multithreading - ignoring threads\n"));
            #endif
        }
        else if (strcmp_local(argv[arg], "--show")) {
            ensure_next_arg(++arg, argc, program_name, "show maximum");
            parse_int_arg(argv[arg], &option.show_explain_factor_max, option.fixed_benchmark_settings.factor_max, program_name, "Invalid show maximum");
            verbose4(printf("Show maximum set to %ju\n", (uintmax_t)option.show_explain_factor_max);)
        }
        else if (strcmp_local(argv[arg], "--help")) { 
            usage(program_name, 0); 
        }
        #ifdef COMPILE_EXPLAIN
        else if (strcmp_local(argv[arg], "--explain")) {
            option.explain = 1;
            if (option.explain_level < default_explain_level) {
                option.explain_level = default_explain_level;
            }
            verbose2(printf("Explain level set to %d\n", option.explain_level));
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
            verbose4(printf("Check level set to %d\n", option.check));
        }
        else if (strcmp_local(argv[arg], "--nocheck")) { 
            option.check = 0; 
        }
        #ifdef COMPILE_TRACE
        else if (strcmp_local(argv[arg], "--trace")) {
            /* --trace [optional level]: enable trace-level logging */
            if (arg + 1 < argc && isdigit_local(argv[arg + 1][0])) {
                parse_int_arg(argv[++arg], &option.trace_level, 9, program_name, "Invalid trace level");
                if (option.trace_level < 5 || option.trace_level > 9) {
                    verbose1({ fprintf(stderr, "Invalid trace level %ju (expected 5-9)\n", (uintmax_t)option.trace_level); usage(program_name, 1); });
                }
            }
            else if (option.trace_level < default_trace_level) {
                option.trace_level = default_trace_level;
            }
            if (!option.trace_filename) {
                /* Mark for auto-generation after all args are parsed (factor_max may not be set yet) */
                option.trace_filename = (char*)"__auto__";
            }
        }
        else if (strcmp_local(argv[arg], "--trace-filename")) {
            ensure_next_arg(++arg, argc, program_name, "trace filename");
            option.trace_filename = argv[arg];
        }
        #endif
        else if (strcmp_local(argv[arg], "--notune")) { 
            option.tunelevel = 0; 
        }
        else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option.fixed_benchmark_settings.factor_max) != 1) {
            verbose1({ fprintf(stderr, "Invalid size %s\n", argv[arg]); usage(program_name, 1); });
        }
        else {
            verbose4(printf("Maximum set to %ju\n", (uintmax_t)option.fixed_benchmark_settings.factor_max);)
        }
    }

    #ifdef COMPILE_TRACE
    /* Generate default trace filename now that factor_max is known */
    if (option.trace_filename && strcmp(option.trace_filename, "__auto__") == 0) {
        option.trace_filename = (char*)trace_generate_default_filename(
            program_name, option.fixed_benchmark_settings.factor_max);
        verbose2(printf("Trace output: %s\n", option.trace_filename));
    }
    #endif

    option.verbose_level = max(option.verbose_level, option.explain_level); // ensure verbose level is sufficient for explain output
    option.verbose_level = max(option.verbose_level, option.trace_level);   // ensure verbose level is sufficient for trace output

    // if not tuning, or if explain/trace is doing a single run, load previously saved settings
    if (shouldLoadLastSettings()) {
        loadLastSettings();
    }
}

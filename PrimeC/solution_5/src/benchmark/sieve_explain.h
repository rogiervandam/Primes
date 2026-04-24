/*
Explain / Trace levels:


5: Processing a block/subset
6: Doing the entire stripe of a sieve
7: Orchestrating the setting of bits in a subfunction
8: Setting a group of bits with a mask, showing the mask and the target bits being set
9: Setting a single bit


*/

static inline void
initSingleRunTrace(benchmark_settings_t benchmark_settings)
{
    #ifdef COMPILE_TRACE
    if (option.trace_filename) {
        counter_t trace_bit_count = calcBitsize(benchmark_settings.factor_max, benchmark_settings.storage);
        char trace_settings_tag[128];
                char trace_title[192];
                char trace_info[256];
        snprintf(trace_settings_tag, sizeof(trace_settings_tag), "%s;t=%ju;d=%.3f;storage=%ju;factor_max=%ju",
                 getBenchmarkSettingAsString(benchmark_settings),
                 (uintmax_t)benchmark_settings.threads,
                 benchmark_settings.sample_duration,
                 (uintmax_t)benchmark_settings.storage,
                 (uintmax_t)benchmark_settings.factor_max);
                snprintf(trace_title, sizeof(trace_title), "%s - Extend algorithm", option.program_name ? option.program_name : "sieve");
                snprintf(trace_info, sizeof(trace_info),
                                 "settings=%s | max=%ju | storage=%ju | threads=%ju | duration=%.3f",
                                 getBenchmarkSettingAsString(benchmark_settings),
                                 (uintmax_t)benchmark_settings.factor_max,
                                 (uintmax_t)benchmark_settings.storage,
                                 (uintmax_t)benchmark_settings.threads,
                                 benchmark_settings.sample_duration);

        trace_set_console_feedback(primes_log_should_explain(2));
        trace_init(option.trace_filename,
                   (uint64_t)benchmark_settings.factor_max,
                   (uint64_t)trace_bit_count,
                   (int)option.trace_level,
                                     trace_settings_tag,
                                     trace_title,
                                     trace_info);

        if (g_trace.enabled) {
            trace_record_text_fmt_level((int)option.trace_level, "Settings used: %s", trace_settings_tag);

            uint8_t* empty = (uint8_t*)calloc(1, (size_t)((trace_bit_count + 7) / 8));
            if (empty) {
                trace_record_step(0, empty, "Initial", "Initial state: all bits clear");
                free(empty);
            }
        }
    }
    #else
    (void)benchmark_settings;
    #endif
}

static inline void
finalizeSingleRunTrace(sieve_t* sieve)
{
    #ifdef COMPILE_TRACE
    if (option.trace_filename && g_trace.enabled) {
        trace_record_step(0, sieve->bitstorage, "Final", "Final state: sieve complete");
        trace_finalize();
        verbose2( printf("Trace saved to %s\n", option.trace_filename); )
    }
    #else
    (void)sieve;
    #endif
}

static int __attribute__((cold))
runSingleSievePass(benchmark_settings_t benchmark_settings, sieve_t* (*sieveFunction)(const counter_t))
{
    benchmark_settings = checkBenchmarkSettings(benchmark_settings);
    prepareBenchmarkGlobals(benchmark_settings);

    #ifdef COMPILE_TIMERS
    if (option.timers) {
        timer_init();
        verbose2( printf("Timing the different parts of the algorithm\n"); )
    }
    #endif

    initSingleRunTrace(benchmark_settings);

    debug_final_plan = 1;
    sieve_t* sieve = sieveFunction(benchmark_settings.factor_max);
    debug_final_plan = 0;

    finalizeSingleRunTrace(sieve);

    if (option.show_explain_factor_max) {
        showPrimesinSieve(sieve, option.show_explain_factor_max);
    }

    const int valid = validateSieve(sieve, benchmark_settings.factor_max);
    if (!valid) {
        printf("The sieve for factors up to %ju is \033[0;31m\033[5mNOT\033[0;0m valid...\n", (uintmax_t) benchmark_settings.factor_max);
        deepAnalyzeSieve(sieve, benchmark_settings.factor_max);
    }
    else {
        printf("The sieve for factors up to %ju is \033[0;32mvalid\033[0;0m\n", (uintmax_t) benchmark_settings.factor_max);
    }

    sieve_delete(sieve);

    if (debug_hits) {
        printf("Hits: %ju\n", (uintmax_t)debug_hits);
    }

    #ifdef COMPILE_TIMERS
    if (option.timers) print_timing_table();
    #endif

    return valid ? 0 : 1;
}

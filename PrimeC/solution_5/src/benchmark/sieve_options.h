
#pragma once

#include "../generic/settings.h"
// #include <inttypes.h>
#include "sieve_benchmark_settings.h"
typedef struct  {
    benchmark_settings_t fixed_benchmark_settings;
    counter_t show_explain_factor_max;
    counter_t show_tuning_results_max;
    counter_t show_primes_on_error;
    counter_t show_nonprimes_on_error;
    counter_t verbose_level;
    counter_t explain;
    counter_t explain_level;
    counter_t trace_level;
    counter_t timers;
    counter_t check;
    counter_t tunelevel;
    counter_t extended_output;
    double    initial_sample_duration;
    double    next_sample_duration;
    double    warmup_duration;
    double    tune_duration_max;
    counter_t tune_keeppercent_longlist;
    counter_t tune_keeppercent_shortlist;
    char*     program_name;
    char*     dockerfile_type;
    char*     extension;
    char*     trace_filename;
    char*     trace_title;
    char*     timings_filename;
} options_t;

options_t option; // global options variable, this is used to store all the options that can be set by the user and accessed throughout the program

/*
 * Generate a default trace filename under ./log/
 * Format: log/YYYY-MM-DD_HH-MM_<program_name>_<max_factor>.sievetrace
 */
static const char* __attribute__((cold))
set_trace_default_filename(const char* program_name, uint64_t max_factor)
{
    char timestamp[32];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d_%H-%M", localtime(&(time_t){time(NULL)}));
    snprintf(option.trace_filename, 256, "log/%s_%s_%ju.sievetrace", timestamp, program_name, (uintmax_t)max_factor);
    return option.trace_filename;
}

static const char* __attribute__((cold))
set_timings_default_filename(const char* program_name, uint64_t max_factor)
{
    char timestamp[32];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d_%H-%M", localtime(&(time_t){time(NULL)}));
    snprintf(option.timings_filename, 256, "log/%s_%s_%ju.timings.json", timestamp, program_name, (uintmax_t)max_factor);
    return option.timings_filename;
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

// empty and NULL terminated string buffers to hold generated filenames if user requested generation by setting --trace or --benchmark-log without a filename
static char trace_filename[256] = "";
static char timings_filename[256] = "";
static char trace_title[256] = "";

static options_t __attribute__((cold)) 
setDefaultOptions() 
{
    option.show_explain_factor_max    = 0;
    option.show_tuning_results_max    = 50;
    option.show_primes_on_error       = 100;
    option.show_nonprimes_on_error    = 10;
    option.verbose_level              = 0; // to what max level must output generation be (pre)compiled, must be >= explain_level and trace_level to get output
    option.explain                    = 0; //deprecated, use --explain-level instead
    option.explain_level              = 0; // to what level must explain output be generated
    option.trace_level                = 0; // to what level must trace output be generated
    option.timers                     = 0;

    option.check                      = 2;
    option.tunelevel                  = 2;
    option.initial_sample_duration    = 0.0005;
    option.next_sample_duration       = 0.002;
    option.warmup_duration            = 1;
    option.tune_duration_max          = 5.0;
    option.tune_keeppercent_longlist  = 20;
    option.tune_keeppercent_shortlist = 25;

    option.fixed_benchmark_settings.factor_max              = 1000000;
    option.fixed_benchmark_settings.threads                 = 1;
    option.fixed_benchmark_settings.stripe_faster           = 0;
    option.fixed_benchmark_settings.largestep_faster        = 0;
    option.fixed_benchmark_settings.blocksize_bits          = 0;
    option.fixed_benchmark_settings.vectorsize              = 0;
    option.fixed_benchmark_settings.algorithm               = 0;
    option.fixed_benchmark_settings.storage                 = 0;
    option.fixed_benchmark_settings.sample_duration         = 5;

    option.dockerfile_type = getenv("DOCKERFILE_TYPE"); 
    option.trace_filename  = trace_filename; 
    option.timings_filename = timings_filename; 
    option.trace_title = trace_title;

    // changes though compilation options
    #ifdef _OPENMP
    option.fixed_benchmark_settings.threads                 = omp_get_max_threads();
    #endif

    #ifdef COMPILE_TIMERS
    option.timers = 1;
    #endif

    #ifdef _OPENMP
    option.extension = "_epar";
    #else
    option.extension = "";
    #endif

    #ifdef ALGORITHM_CLASSIC
    option.tunelevel = 0;
    #endif

    // good to remember
    #define default_explain_level 6 
    #define default_trace_level 9

    return option;
}

#include "sieve_timers.h"
#include "../generic/tools.h"
#include "../generic/log.h"
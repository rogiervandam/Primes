#pragma once
// #ifndef SIEVE_TIME_GUARD
// #define SIEVE_TIME_GUARD
#include "sieve_timers.h"

#ifdef COMPILE_TIMERS
static void print_timing_table(void) {
    verbose1( printf("%-50s %15s %20s\n", "Functions", "Hits", "Total time (s)"); )
    for (counter_t i = 0; i < timer_count; i++) {
        if (timer_hits[i] == 0) continue;
        verbose1( printf("%-50s %15ju %20.9f\n", timer_function_names[i], (uintmax_t)timer_hits[i], timer_time[i] * 1e-9); )
    }
}

// save the timing table to a file for later analysis as a json object
// include the benchmark results in the json object for easier correlation between timing and benchmark results
static void save_timing_table_to_file(const char* filename, benchmark_result_t benchmark_result) {
    FILE* file = fopen(filename, "w");
    if (file == NULL) {
        fprintf(stderr, "Error opening file for writing: %s\n", filename);
        return;
    }

    fprintf(file, "{\n");
    fprintf(file, "  \"benchmark\": {\n");
    fprintf(file, "    \"passes\": %ju,\n", (uintmax_t)benchmark_result.passes);
    fprintf(file, "    \"elapsed_time\": %.9f,\n", benchmark_result.elapsed_time);
    fprintf(file, "    \"avg\": %.9f,\n", benchmark_result.avg);
    fprintf(file, "    \"settings\": \"%s\"\n", getBenchmarkSettingAsString(benchmark_result.settings));
    fprintf(file, "  },\n");
    fprintf(file, "  \"timings\": [\n");
    counter_t written = 0;
    for (counter_t i = 0; i < timer_count; i++) {
        if (timer_hits[i] == 0) continue;
        if (written > 0) fprintf(file, ",\n");
        fprintf(file, "    {\n");
        fprintf(file, "      \"function\": \"%s\",\n", timer_function_names[i]);
        fprintf(file, "      \"hits\": %ju,\n", (uintmax_t)timer_hits[i]);
        fprintf(file, "      \"total_time_s\": %.9f,\n", timer_time[i] * 1e-9);
        fprintf(file, "      \"avg_time_per_pass_s\": %.12f,\n", benchmark_result.passes > 0 ? (timer_time[i] * 1e-9) / benchmark_result.passes : 0.0);
        fprintf(file, "      \"avg_time_per_call_s\": %.12f\n", timer_hits[i] > 0 ? (timer_time[i] * 1e-9) / timer_hits[i] : 0.0);
        fprintf(file, "    }");
        written++;
    }
    if (written > 0) fprintf(file, "\n");
    fprintf(file, "  ]\n");
    fprintf(file, "}\n");

    fclose(file);
}
#endif

// #endif

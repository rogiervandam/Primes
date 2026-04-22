#ifdef COMPILE_TIMERS

// helper functions for timing parts of code in debugging mode

#define timer_count 24
struct timespec timer_timers[timer_count];
counter_t timer_hits[timer_count];
double timer_time[timer_count];

#include "sieve_functions.h"

static inline void __attribute__((always_inline, hot))
time_mark(struct timespec* timer) {
    #ifdef __APPLE__
        clock_gettime(CLOCK_MONOTONIC_RAW, timer);
    #else
        clock_gettime(CLOCK_MONOTONIC, timer);
    #endif
}

static void timer_laptime_function(counter_t timer) {
    struct timespec lapend;
    time_mark(&lapend);
    double elapsed_time = (lapend.tv_sec - timer_timers[timer].tv_sec) * 1e9 + (lapend.tv_nsec - timer_timers[timer].tv_nsec);
    timer_time[timer] += elapsed_time;
    timer_hits[timer]++;

    verbose7({
        if      (elapsed_time > 2000) printf("...time: \033[0;31m%.0f" COLOR_RESET "ns", elapsed_time);
        else if (elapsed_time > 1000) printf("...time: \033[0;35m%.0f" COLOR_RESET "ns", elapsed_time);
        else if (elapsed_time > 100)  printf("...time: \033[0;36m%.0f" COLOR_RESET "ns", elapsed_time);
        else                          printf("...time: \033[0;32m%.0f" COLOR_RESET "ns", elapsed_time);
        printf(" (%s) ", timer_function_names[timer]);
    })
}

static void timer_init() {
    for (counter_t i = 0; i < timer_count; i++) timer_hits[i] = 0;
    for (counter_t i = 0; i < timer_count; i++) timer_time[i] = 0;
}

static void print_timing_table(void) {
    verbose1( printf("%-40s %15s %20s\n", "Functions", "Hits", "Total time (s)"); )
    for (counter_t i = 0; i < timer_count; i++) {
        if (timer_hits[i] == 0) continue;
        verbose1( printf("%-40s %15ju %20.9f\n", timer_function_names[i], (uintmax_t)timer_hits[i], timer_time[i] * 1e-9); )
    }
}

#define timer_lapstart(timer) time_mark(&timer_timers[timer]);
#define timer_laptime(timer) timer_laptime_function(timer);

#else
    #define timer_lapstart(timer) 
    #define timer_laptime(timer) 
#endif

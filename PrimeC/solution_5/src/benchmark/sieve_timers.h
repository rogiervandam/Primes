#pragma once
// #ifndef SIEVE_TIMERS_GUARD
// #define SIEVE_TIMERS_GUARD
#ifndef COMPILE_TIMERS // enable using timer_lapstart in code
    #define timer_lapstart(timer) 
    #define timer_laptime(timer) 
#endif

#ifdef COMPILE_TIMERS
#include "../generic/functions.h"
// helper functions for timing parts of code in debugging mode

#define timer_count 100 // TODO: tune this
struct timespec timer_timers[timer_count];
counter_t timer_hits[timer_count];
double timer_time[timer_count];


static inline void __attribute__((always_inline, hot))
time_mark(struct timespec* timer) {
    #ifdef __APPLE__
        clock_gettime(CLOCK_MONOTONIC_RAW, timer);
    #else
        clock_gettime(CLOCK_MONOTONIC, timer);
    #endif
}

static double timer_laptime_function(counter_t timer) {
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

    return elapsed_time;
}

static void timer_init() {
    for (counter_t i = 0; i < timer_count; i++) timer_hits[i] = 0;
    for (counter_t i = 0; i < timer_count; i++) timer_time[i] = 0;
}

#define timer_lapstart(timer) time_mark(&timer_timers[timer]);
#define timer_laptime(timer) timer_laptime_function(timer);

#endif // COMPILE_TIMERS
// #endif // SIEVE_TIMERS_GUARD

#ifdef COMPILE_TIMERS

// helper functions for timing parts of code in debugging mode

#define timer_count 24
struct timespec timer_timers[timer_count];
counter_t timer_hits[timer_count];
double timer_time[timer_count];

#define function_id_t int
#define time_setBitsTrue (function_id_t) 0
#define time_searchBitFalse (function_id_t) 1
#define time_searchBitFalse_largestep (function_id_t) 2
#define time_applyMask (function_id_t) 3
#define time_applyMask_pair (function_id_t) 4
#define time_setBitsTrue_smallstep_rotate_pair (function_id_t) 5
#define time_setBitsTrue_smallstep_repeat (function_id_t) 6
#define time_setBitsTrue_smallstep_norepeat (function_id_t) 7
#define time_setBitsTrue_largestep_vector (function_id_t) 8
#define time_setBitsTrue_largestep_repeat (function_id_t) 9
#define time_setBitsTrue_largestep_norepeat (function_id_t) 10
#define time_continuePattern (function_id_t) 11
#define time_continuePattern_smallSize (function_id_t) 12
#define time_continuePattern_aligned (function_id_t) 13
#define time_continuePattern_shiftleft_unrolled (function_id_t) 14
#define time_continuePattern_shiftleft (function_id_t) 15
#define time_continuePattern_shiftright (function_id_t) 16
#define time_sieveStripeBlock (function_id_t) 17
#define time_stripeSieve (function_id_t) 18
#define time_sieve_block_extend (function_id_t) 19
#define time_setBitsTrue_range (function_id_t) 20
#define time_setBitsTrue_range_return (function_id_t) 21
#define time_setBitsTrue_largestep_bitbucket (function_id_t) 22
#define time_markFactors_wheelstorage_small_repeat_pair_vector (function_id_t) 23

static const char* timer_function_names[100] = {
    [time_setBitsTrue] = "setBitsTrue",
    [time_searchBitFalse] = "searchBitFalse",
    [time_searchBitFalse_largestep] = "searchBitFalse_largestep",
    [time_applyMask] = "applyMask",
    [time_applyMask_pair] = "applyMask_pair",
    [time_setBitsTrue_smallstep_rotate_pair] = "setBitsTrue_smallstep_rotate_pair",
    [time_setBitsTrue_smallstep_repeat] = "setBitsTrue_smallstep_repeat",
    [time_setBitsTrue_smallstep_norepeat] = "setBitsTrue_smallstep_norepeat",
    [time_setBitsTrue_largestep_vector] = "setBitsTrue_largestep_vector",
    [time_setBitsTrue_largestep_repeat] = "setBitsTrue_largestep_repeat",
    [time_setBitsTrue_largestep_norepeat] = "setBitsTrue_largestep_norepeat",
    [time_continuePattern] = "continuePattern",
    [time_continuePattern_smallSize] = "continuePattern_smallSize",
    [time_continuePattern_aligned] = "continuePattern_aligned",
    [time_continuePattern_shiftleft_unrolled] = "continuePattern_shiftleft_unrolled",
    [time_continuePattern_shiftleft] = "continuePattern_shiftleft",
    [time_continuePattern_shiftright] = "continuePattern_shiftright",
    [time_sieveStripeBlock] = "sieveStripeBlock",
    [time_stripeSieve] = "stripeSieve",
    [time_sieve_block_extend] = "sieve_block_extend",
        [time_setBitsTrue_range] = "setBitsTrue_range",
        [time_setBitsTrue_range_return] = "setBitsTrue_range_return",
        [time_setBitsTrue_largestep_bitbucket] = "setBitsTrue_largestep_bitbucket",
        [time_markFactors_wheelstorage_small_repeat_pair_vector] = "markFactors_wheelstorage_small_repeat_pair_vector",
  };


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

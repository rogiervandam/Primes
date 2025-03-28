#ifdef COMPILE_TIMERS

// helper functions for timing parts of code in debugging mode
static struct timespec timer_lap, timer_elapsed;

#define timer_count 100
struct timespec timer_timers[timer_count];
// static double timer_timers[timer_count];
counter_t timer_hits[timer_count];
double timer_time[timer_count];

#define time_setBitsTrue 0
#define time_setBitsTrue_largestep_vector_wordstep 1
#define time_setBitsTrue_largestep_vector_vectorstep 2
#define time_create_mask_vector_smallstep 3
#define time_create_mask_vector_largestep 4
#define time_applyMask 5
#define time_setBitsTrue_smallstep_repeat 10
#define time_setBitsTrue_smallstep_norepeat 11
#define time_setBitsTrue_largestep_repeat 12
#define time_setBitsTrue_largestep_norepeat 13
#define time_searchBitFalse 20
#define time_searchBitFalse_largestep 21
#define time_continuePattern 40
#define time_continuePattern_smallSize 41
#define time_continuePattern_aligned 42
#define time_continuePattern_shiftleft_unrolled 43
#define time_continuePattern_shiftleft 44
#define time_continuePattern_shiftright 45
#define time_stripeSieve 50
#define time_sieveStripeBlock 51
#define time_stripeSieveBlock0 52
#define time_sieveStripeBlock_vector 53
#define time_sieve_block_extend 54

static const char* timer_function_names[100] = {
    [time_setBitsTrue] = "setBitsTrue",
    [time_setBitsTrue_largestep_vector_wordstep] = "setBitsTrue_largestep_vector_wordstep",
    [time_setBitsTrue_largestep_vector_vectorstep] = "setBitsTrue_largestep_vector_vectorstep",
    [time_create_mask_vector_largestep] = "create_mask_vector_largestep",
    [time_create_mask_vector_smallstep] = "create_mask_vector_smallstep",
    [time_applyMask_vector] = "applyMask",
    [time_setBitsTrue_largestep_repeat] = "setBitsTrue_largestep_repeat",
    [time_setBitsTrue_largestep_norepeat] = "setBitsTrue_largestep_norepeat",
    [time_setBitsTrue_smallstep_repeat] = "setBitsTrue_smallstep_repeat",
    [time_setBitsTrue_smallstep_norepeat] = "setBitsTrue_smallstep_norepeat",
    [time_searchBitFalse_largestep] = "searchBitFalse_largestep",
    [time_continuePattern] = "continuePattern",
    [time_continuePattern_smallSize] = "continuePattern_smallSize",
    [time_continuePattern_aligned] = "continuePattern_aligned",
    [time_continuePattern_shiftleft_unrolled] = "continuePattern_shiftleft_unrolled",
    [time_continuePattern_shiftleft] = "continuePattern_shiftleft",
    [time_continuePattern_shiftright] = "continuePattern_shiftright",
    [time_stripeSieve] = "stripeSieve",
    [time_stripeSieveBlock0] = "stripeSieveBlock0",
    [time_sieveStripeBlock] = "sieveStripeBlock",
    [time_sieveStripeBlock_vector] = "sieveStripeBlock_vector",
    [time_searchBitFalse] = "searchBitFalse",
    [time_sieve_block_extend] = "sieve_block_extend",
  };

// static inline double time_mark() {
//     struct timespec t;
//     clock_gettime(CLOCK_UPTIME_RAW, &t);
//     return t;
//     // return (t.tv_sec + t.tv_nsec * 1e-9) ;
// //    return (double)clock();
// }
static inline void time_mark(struct timespec* timer) {
    #ifdef __APPLE__
        clock_gettime(CLOCK_MONOTONIC_RAW, timer);
    #else
        clock_gettime(CLOCK_MONOTONIC, timer);
    #endif
}

#define timer_lapstart(timer) time_mark(&timer_timers[timer]);
#define timer_laptime(timer) timer_laptime_function(timer);

static void timer_laptime_function(counter_t timer) {
    struct timespec lapend;
    time_mark(&lapend);

    // printf("\nlapstart tv_sec: %ld, lapstart.tv_nsec: %ld\n", timer_timers[timer].tv_sec, timer_timers[timer].tv_nsec);
    // printf(  "lapend  .tv_sec: %ld, lapend.  tv_nsec: %ld\n", lapend.tv_sec, lapend.tv_nsec);

    // const double timer_lap = time_mark();
    // const double elapsed_time_s = timer_lap - timer_timers[timer];
    double elapsed_time = (lapend.tv_sec - timer_timers[timer].tv_sec) * 1e9 + (lapend.tv_nsec - timer_timers[timer].tv_nsec);
    timer_time[timer] += elapsed_time;
    timer_hits[timer]++;

    verbose7({
        if      (elapsed_time > 2000) printf("...time: \033[0;31m%.0f\033[0mns", elapsed_time);
        else if (elapsed_time > 1000) printf("...time: \033[0;35m%.0f\033[0mns", elapsed_time);
        else if (elapsed_time > 100)  printf("...time: \033[0;36m%.0f\033[0mns", elapsed_time);
        else                          printf("...time: \033[0;32m%.0f\033[0mns", elapsed_time);
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

#else

#define timer_lapstart(timer) 
#define timer_laptime(timer) 

#endif

  

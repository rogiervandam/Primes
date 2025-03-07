
// helper functions for timing parts of code in debugging mode
// call timerLapStart() to start timing a part of code
// call timerLapTime() to mark this lap and output the elapsed time with color for extra quick feedback
static struct timespec timer_lap, timer_elapsed;
// #define timerLapStart() clock_gettime(CLOCK_PROCESS_CPUTIME_ID ,&timer_lap)

// static void timerLapTime() {
//   clock_gettime(CLOCK_PROCESS_CPUTIME_ID ,&timer_elapsed);
//   long seconds = timer_elapsed.tv_sec - timer_lap.tv_sec;
//   long nanoseconds = timer_elapsed.tv_nsec - timer_lap.tv_nsec;
//   double elapsed_time = seconds*1e-9 + nanoseconds;
//   // double elapsed_time = timer_elapsed.tv_sec + timer_elapsed.tv_nsec*1e-9 - timer_lap.tv_sec - timer_lap.tv_nsec*1e-9;
//   if      (elapsed_time > 2000) printf("...time: \033[0;31m%.0f\033[0m ns\n", elapsed_time);
//   else if (elapsed_time > 1000) printf("...time: \033[0;35m%.0f\033[0m ns\n", elapsed_time);
//   else if (elapsed_time > 100)  printf("...time: \033[0;36m%.0f\033[0m ns\n", elapsed_time);
//   else                          printf("...time: %.0f ns\n", elapsed_time);
// }

#define timer_count 100
struct timespec timer_timers[timer_count];
// static double timer_timers[timer_count];
counter_t timer_hits[timer_count];
double timer_time[timer_count];

#define time_setBitsTrue_largeRange_vector 0
#define time_applyMask_word 1
#define time_searchBitFalse_largeRange 2
#define time_applyMask_vector 3
#define time_setBitsTrue_smallStep_repeat 4
#define time_setBitsTrue_smallStep_norepeat 5
#define time_continuePattern_smallSize 6
#define time_continuePattern_aligned 7
#define time_continuePattern_shiftleft_unrolled 8
#define time_continuePattern_shiftleft 9
#define time_continuePattern_shiftright 10
#define time_setBitsTrue_largeRange_repeat 11
#define time_setBitsTrue_largeRange_norepeat 12
#define time_sieve_block_stripe0 13
#define time_sieve_stripe 14
#define time_sieve_block_stripe 15
#define time_sieve_block_stripe_vector 16
#define time_continuePattern 17
#define time_create_mask_vector_smallstep 18 
#define time_searchBitFalse 19
#define time_sieve_block_extend 20

static const char* timer_function_names[100] = {
    [time_setBitsTrue_largeRange_vector] = "setBitsTrue_largeRange_vector",
    [time_applyMask_word] = "applyMask_word",	
    [time_searchBitFalse_largeRange] = "searchBitFalse_largeRange",
    [time_applyMask_vector] = "applyMask_vector",
    [time_setBitsTrue_smallStep_repeat] = "setBitsTrue_smallStep_repeat",
    [time_setBitsTrue_smallStep_norepeat] = "setBitsTrue_smallStep_norepeat",
    [time_continuePattern_smallSize] = "continuePattern_smallSize",
    [time_continuePattern_aligned] = "continuePattern_aligned",
    [time_continuePattern_shiftleft_unrolled] = "continuePattern_shiftleft_unrolled",
    [time_continuePattern_shiftleft] = "continuePattern_shiftleft",
    [time_continuePattern_shiftright] = "continuePattern_shiftright",
    [time_setBitsTrue_largeRange_repeat] = "setBitsTrue_largeRange_repeat",
    [time_setBitsTrue_largeRange_norepeat] = "setBitsTrue_largeRange_norepeat",
    [time_sieve_block_stripe0] = "sieve_block_stripe0",
    [time_sieve_stripe] = "sieve_stripe",
    [time_sieve_block_stripe] = "sieve_block_stripe",
    [time_sieve_block_stripe_vector] = "sieve_block_stripe_vector",
    [time_continuePattern] = "continuePattern",
    [time_create_mask_vector_smallstep] = "create_mask_vector_smallstep",
    [time_searchBitFalse] = "searchBitFalse",
    [time_sieve_block_extend] = "sieve_block_extend"
    
    // voeg hier andere functienamen toe op basis van hun timer-ID
  };

#ifdef COMPILE_TIMERS

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

    verbose5({
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

#else

#define timer_lapstart(timer) ((void)0)
#define timer_laptime(timer) ((void)0)

#endif

static void print_timing_table(void) {
    printf("%-40s %15s %20s\n", "Functions", "Hits", "Total time (s)");
    for (counter_t i = 0; i < timer_count; i++) {
        if (timer_hits[i] == 0) continue;
        printf("%-40s %15ju %20.9f\n", timer_function_names[i], (uintmax_t)timer_hits[i], timer_time[i] * 1e-9);
    }
}
  



static inline char* benchmark_settings_as_string(char* settings_string, benchmark_settings_t benchmark_settings) {
    sprintf(settings_string, "s%03ju-m%03ju-l%03ju-b%07ju-u%02ju-v%02ju", 
        (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.mediumstep_faster, (uintmax_t)benchmark_settings.largestep_faster, 
        (uintmax_t)benchmark_settings.blocksize_bits, (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_SIZE_counter);
    return settings_string;
}

static inline void reset_benchmark_result(benchmark_result_t* benchmark_result, benchmark_settings_t benchmark_settings) {
    benchmark_result->settings = benchmark_settings;
    benchmark_result->passes = 0;
    benchmark_result->elapsed_time = 0;
    benchmark_result->avg = 0;
}

static inline benchmark_settings_t benchmarkInit(counter_t threads) {
    benchmark_settings_t benchmark_settings = option.fixed_benchmark_settings;
    // benchmark_settings.factor_max        = option.factor_max;
    benchmark_settings.threads           = threads;
    benchmark_settings.sample_duration   = option.time_max;
    return benchmark_settings;
}

static int compare_tuning_result(const void *a, const void *b) 
{
    benchmark_result_t *resultA = (benchmark_result_t *)a;
    benchmark_result_t *resultB = (benchmark_result_t *)b;
    return (resultB->avg > resultA->avg ? 1 : -1);
}

static void setSettingsFromTuning(benchmark_settings_t* benchmark_settings, benchmark_settings_t* tuning_settings) {
    benchmark_settings->stripe_faster     = tuning_settings->stripe_faster;
    benchmark_settings->mediumstep_faster = tuning_settings->mediumstep_faster;
    benchmark_settings->largestep_faster  = tuning_settings->largestep_faster;
    benchmark_settings->blocksize_bits    = tuning_settings->blocksize_bits;
}

static inline double benchmarkTime() {
    struct timespec t;

    #ifdef __APPLE__
        clock_gettime(CLOCK_MONOTONIC_RAW, &t);
    #else
        clock_gettime(CLOCK_MONOTONIC, &t);
    #endif
    return (t.tv_sec + t.tv_nsec * 1e-9);
  //    return (double)clock();
 }

static inline benchmark_settings_t check_benchmark_settings(benchmark_settings_t benchmark_settings) {
    counter_t prime_max = usqrt(benchmark_settings.factor_max) / 2;

    // printf("Before Prime max %ju stripe faster %ju medium faster %ju large faster %ju blocksize %ju\n", (uintmax_t)prime_max, (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.mediumstep_faster, (uintmax_t)benchmark_settings.largestep_faster, (uintmax_t)benchmark_settings.blocksize_bits);

    benchmark_settings.stripe_faster     = min(benchmark_settings.stripe_faster, prime_max);
    benchmark_settings.mediumstep_faster = min(benchmark_settings.mediumstep_faster, VECTORWORD_SIZE_counter/2-1);
    benchmark_settings.mediumstep_faster = min(benchmark_settings.mediumstep_faster, prime_max);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, benchmark_settings.mediumstep_faster);
    benchmark_settings.largestep_faster  = max(benchmark_settings.largestep_faster, VECTORWORD_SIZE_counter/2);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, VECTOR_SIZE_counter/2);
    benchmark_settings.largestep_faster  = min(benchmark_settings.largestep_faster, prime_max);
    benchmark_settings.blocksize_bits    = min(benchmark_settings.blocksize_bits, benchmark_settings.factor_max);

    // printf("After  Prime max %ju stripe faster %ju medium faster %ju large faster %ju blocksize %ju\n", (uintmax_t)prime_max, (uintmax_t)benchmark_settings.stripe_faster, (uintmax_t)benchmark_settings.mediumstep_faster, (uintmax_t)benchmark_settings.largestep_faster, (uintmax_t)benchmark_settings.blocksize_bits);
    return benchmark_settings;
}

static inline void prepareBenchmarkGlobals(benchmark_settings_t benchmark_settings) {
    global_stripeprime_faster = benchmark_settings.stripe_faster;
    global_mediumstep_faster  = benchmark_settings.mediumstep_faster;
    global_largestep_faster   = benchmark_settings.largestep_faster;
    global_blocksize_bits     = benchmark_settings.blocksize_bits;

    verbose5( printf("Setting globals from benchmark: Stripe=%ju, Medium=%ju, Large=%ju, Block=%ju\n", (uintmax_t)global_stripeprime_faster, (uintmax_t)global_mediumstep_faster, (uintmax_t)global_largestep_faster, (uintmax_t)global_blocksize_bits); )
}

static int checkSieveWithBenchmarkSettings(benchmark_settings_t benchmark_settings) 
{
    const counter_t factor_max = benchmark_settings.factor_max;
    prepareBenchmarkGlobals(benchmark_settings);
    struct sieve_t* sieve_check = sieve_shake(factor_max);
    const int valid = validatePrimeCount(sieve_check, factor_max);
    sieve_delete(sieve_check);
    return valid;
}

static benchmark_result_t benchmark(benchmark_settings_t benchmark_settings) 
{
    benchmark_result_t benchmark_result;
    benchmark_settings = check_benchmark_settings(benchmark_settings);
    benchmark_result.settings = benchmark_settings;

    counter_t sieve_bits = benchmark_settings.factor_max >> 1;

    // check logic
    // if (benchmark_result.settings.largestep_faster > VECTOR_SIZE_counter ) benchmark_result.settings.largestep_faster = VECTOR_SIZE_counter;
    // if (benchmark_result.settings.blocksize_bits > sieve_bits) benchmark_result.settings.blocksize_bits = sieve_bits;


    // set global variables used in the sieve functions
    prepareBenchmarkGlobals(benchmark_settings);

    // prepare for the benchmark
    counter_t passes = 0;
    const counter_t sieve_size = benchmark_result.settings.factor_max;
    // const counter_t blocksize_bits = benchmark_result.settings.blocksize_bits;
    const double time_sample = benchmark_result.settings.sample_duration * benchmark_settings.threads; // do this before we set the clock
//    const double time_sample = benchmark_result.settings.sample_duration * CLOCKS_PER_SEC * benchmark_settings.threads; // do this before we set the clock

    double time_elapsed = 0;
    const double time_start = benchmarkTime();
    const double time_target = time_start + time_sample; // use target time to avoid substraction in the while loop

    #ifdef _OPENMP
    omp_set_num_threads(benchmark_settings.threads);
    #pragma omp parallel reduction(+:passes)
    {
        double time_elapsed = 0;
        // const double time_start = benchmarkTime();
        // const double time_target = time_start + time_sample; // use target time to avoid substraction in the while loop
        while (time_elapsed <= time_target) {
            struct sieve_t *sieve = sieve_shake(sieve_size);
            sieve_delete(sieve);
            time_elapsed = benchmarkTime();         
            passes++;
        }
    }
    #else
    while (time_elapsed <= time_target) {
        struct sieve_t *sieve = sieve_shake(sieve_size);
        sieve_delete(sieve);
        time_elapsed = benchmarkTime();         
        passes++;
    }
    time_elapsed = benchmarkTime() - time_start;         
    #endif

    // calculate results
    benchmark_result.passes       = passes;
    benchmark_result.elapsed_time = time_elapsed / benchmark_settings.threads;
    benchmark_result.avg          = benchmark_result.passes / benchmark_result.elapsed_time; // TODO: check if thhreads are correct

    return benchmark_result;
}

static inline void tuning_result_print(benchmark_result_t tuning_result) 
{
    char settings[100]=""; benchmark_settings_as_string(settings, tuning_result.settings);
    printf("average \033[1;33m%f\033[0m with options \033[1;32m%s\033[0m was achieved with \033[1;33m%3ju\033[0m passes in \033[1;33m%f\033[0m seconds\n", 
    tuning_result.avg, settings, (uintmax_t)tuning_result.passes, tuning_result.elapsed_time);
}

static benchmark_result_t tune(int tune_level, benchmark_settings_t start_tuning_settings) 
{
    counter_t stripe_faster_steps = 4;
    counter_t mediumstep_faster_steps = 4;
    counter_t largestep_faster_steps = 32;
    double    sample_duration         = option.sample_duration;
    counter_t prime_max               = usqrt(start_tuning_settings.factor_max) / 2; // divide by 2 to compensate for bitwise representation 
    char settings_string[100]=""; 

    // determines the size of the resultset
    switch (tune_level) {
        case 1:
            stripe_faster_steps = 16;
            mediumstep_faster_steps = 16;
            largestep_faster_steps = 32;
            sample_duration = option.sample_duration;
            break;
        case 2:
            stripe_faster_steps = 8;
            mediumstep_faster_steps = 8;
            largestep_faster_steps = VECTOR_SIZE_counter/16;
            sample_duration = option.sample_duration*2;
            break;
        case 3:
            stripe_faster_steps = 4;
            mediumstep_faster_steps = 4;
            largestep_faster_steps = VECTOR_SIZE_counter/32;
            sample_duration =option.sample_duration*4;
            break;
    }
    
    verbose2( { 
        verbose3( printf("\n"); )
        printf("Tuning... compiled for \033[1;32mu%ju_v%ju\033[0m (word, vector)", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); 
        verbose3( {
            benchmark_settings_as_string(settings_string, start_tuning_settings);
            printf(".. best options (shown when found) for steps s%jum%juv%ju:\n", (uintmax_t)stripe_faster_steps, (uintmax_t) mediumstep_faster_steps, (uintmax_t) largestep_faster_steps); 
        } )
    })

    // prepare a table to store the tuning results
    const size_t max_results = ((stripe_faster_steps)+1) * ((size_t)(VECTOR_SIZE_counter/mediumstep_faster_steps)+1) * ((size_t)(VECTOR_SIZE_counter/largestep_faster_steps)+1) * 32;
    benchmark_result_t* tuning_result = malloc(max_results * sizeof(tuning_result));
    benchmark_settings_t tuning_settings = benchmarkInit(start_tuning_settings.threads);
    benchmark_result_t best_tuning_result = tuning_result[0];
    counter_t tuning_results=0;
    counter_t tuning_result_index=0;

    // start the timer
    const double time_start = (double)clock();
    const double time_target = time_start + option.tune_duration_max * CLOCKS_PER_SEC;

    // build the tuning table
    for (counter_t stripe_faster = 0; stripe_faster <= prime_max; stripe_faster += stripe_faster_steps, stripe_faster_steps*=2) { // increase the stepsize exponentially to reduce the number of options
        for (counter_t mediumstep_faster = 0; mediumstep_faster <= VECTORWORD_SIZE_counter/2-1; mediumstep_faster += mediumstep_faster_steps) {
            for (counter_t largestep_faster = VECTORWORD_SIZE_counter/2-1; largestep_faster <= VECTOR_SIZE_counter/2-1; largestep_faster += largestep_faster_steps) { // TODO: start vectorstep at a nice % from mediumstep
                for (counter_t blocksize_bits=128*1024*8; blocksize_bits>=9*1024*8; blocksize_bits /= 2) {
                    for (counter_t smallprime_direction=0; smallprime_direction<=1; smallprime_direction++) { // helper to exponentially start at top and bottom of range

                        // hack to ovrrule tuning of user setting
                        if (option.fixed_benchmark_settings.stripe_faster)     { stripe_faster = option.fixed_benchmark_settings.stripe_faster; }
                        if (option.fixed_benchmark_settings.mediumstep_faster) { mediumstep_faster = option.fixed_benchmark_settings.mediumstep_faster; }
                        if (option.fixed_benchmark_settings.largestep_faster)  { largestep_faster = option.fixed_benchmark_settings.largestep_faster; }
                        if (option.fixed_benchmark_settings.blocksize_bits)    { blocksize_bits = option.fixed_benchmark_settings.blocksize_bits; }

                        // set variables
                        tuning_settings.blocksize_bits = blocksize_bits - 4 * 1024 * 8; // keep some room for the beginning of the sieve
                        tuning_settings.stripe_faster = (smallprime_direction==0) ? stripe_faster : (prime_max - stripe_faster);
                        tuning_settings.mediumstep_faster = mediumstep_faster;
                        tuning_settings.largestep_faster = largestep_faster;
                        tuning_settings.sample_duration = sample_duration;
                        tuning_results++;

                        #ifdef COMPILE_CHECKALL
                        tuning_settings = check_benchmark_settings(tuning_settings);
                        const int valid = checkSieveWithBenchmarkSettings(tuning_settings);
                        if (!valid) {
                            char settings_string[100]=""; benchmark_settings_as_string(settings_string, tuning_settings);
                            fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) tuning_settings.factor_max);
                            exit(1);
                        }
                        #endif
                        
                        tuning_result[tuning_result_index] = benchmark(tuning_settings);
                        verbose5( { printf("...."); tuning_result_print(tuning_result[tuning_result_index]); } )

                        if ( tuning_result[tuning_result_index].avg >= best_tuning_result.avg) {
                            best_tuning_result = tuning_result[tuning_result_index];
                            verbose3( { printf("\033[0;37m.(<)\033[0m"); tuning_result_print(best_tuning_result); } )
                        }
                        tuning_result_index++;
                        verbose_at2( { printf("\rTuning...tuning \033[1;32m%5ju\033[0m options..in \033[1;32m%lf\033[0m seconds  ",(uintmax_t)tuning_results, (double)tuning_results*sample_duration ); } )
                        if (option.fixed_benchmark_settings.stripe_faster) break;
                    }
                    if (option.fixed_benchmark_settings.blocksize_bits) break;
                }
                if (option.fixed_benchmark_settings.largestep_faster) break;
            }
            if (option.fixed_benchmark_settings.mediumstep_faster) break;
        }
        if (option.fixed_benchmark_settings.stripe_faster) break;
    }
    verbose_at2( { printf("\rTuning...tuned %ju options..",(uintmax_t)tuning_results); } )
    verbose3( {
        benchmark_settings_as_string(settings_string, best_tuning_result.settings);
        printf("Finished scan of \033[1;33m%ju\033[0m options. Inital best %s\n",(uintmax_t)tuning_results, settings_string);
        printf("Finding the best option by reevaluating the top options with a longer sample duration.\n");
    })

    // char filename[256];
    // sprintf(filename,"tuning_results-u%juv%ju.csv", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS);
    // saveTuningResultsToCSV(filename, tuning_result, tuning_results); 

    // reduce the tuning results to the best options
    // keep the best of the results and reevaluate them with a longer sample duration

    counter_t tuning_results_max = tuning_results; // keep this value for verbose messages
    counter_t step=1;
    for (; tuning_results > 1; step++) {
        qsort(tuning_result, (size_t)tuning_results, sizeof(benchmark_result_t), compare_tuning_result);

        // prevent the tuning from running too long
        // after sorting so the best results are on top
        if ((double)clock() > time_target) { verbose3( { printf("\nTune time expired\n"); } );  break; }

        // keep the best results
        counter_t tuning_results_selected = tuning_results * option.tune_keeppercent / 100;
        if (tuning_results_selected < 1) break;

        // verbose messages
        verbose3( {
            printf("\n");
            printf("\r\033[0;90m(iteration %1ju) - %5ju options left - selecting %5ju\033[0m options\n",(uintmax_t)step, (uintmax_t)tuning_results,(uintmax_t)tuning_results_selected) ; 
            verbose_at3(  printf(">> \033[0;34m");tuning_result_print(tuning_result[0]); printf("\033[0m");  )
            verbose3( {
                for (tuning_result_index=1; tuning_result_index<min( option.show_tuning_results_max,tuning_results); tuning_result_index++) {
                    printf("...\033[0;90m"); tuning_result_print(tuning_result[tuning_result_index]); printf("\033[0m");
                }
            })

        })

        tuning_results = tuning_results_selected;

        // add variations of the best results
        for (counter_t i=0; i<tuning_results_selected; i++) {
            benchmark_settings_t tuning_settings = tuning_result[i].settings;

            counter_t largestep_faster_steps_diff = largestep_faster_steps >> step; 
            if (!option.fixed_benchmark_settings.largestep_faster) {
                if (largestep_faster_steps_diff > 1) {
                    if (tuning_settings.largestep_faster < VECTOR_SIZE_counter/2-1 - largestep_faster_steps_diff) {
                        reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                        tuning_result[tuning_results].settings.largestep_faster += largestep_faster_steps_diff;
                        tuning_results++;
                    }
                    if (tuning_settings.largestep_faster > 2) {
                        reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                        tuning_result[tuning_results].settings.largestep_faster -= 2;
                        tuning_results++;
                    }
                }
            }

            counter_t mediumstep_faster_steps_diff = mediumstep_faster_steps >> step; 
            if (!option.fixed_benchmark_settings.mediumstep_faster) {
                if (mediumstep_faster_steps_diff > 1) {

                        if (tuning_settings.mediumstep_faster < VECTORWORD_SIZE_counter/2-1 - mediumstep_faster_steps_diff) {
                        reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                        tuning_result[tuning_results].settings.mediumstep_faster += mediumstep_faster_steps_diff;
                        tuning_results++;
                    }
                    if (tuning_settings.mediumstep_faster > mediumstep_faster_steps_diff) {
                        reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                        tuning_result[tuning_results].settings.mediumstep_faster -= mediumstep_faster_steps_diff;
                        tuning_results++;
                    }
                }
            }

            counter_t stripe_faster_steps_diff = stripe_faster_steps >> step; 
            if (!option.fixed_benchmark_settings.stripe_faster) {
                if (stripe_faster_steps_diff > 1) {
                    reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                    tuning_result[tuning_results].settings.stripe_faster += stripe_faster_steps_diff;
                    tuning_results++;
                    if (tuning_settings.stripe_faster > stripe_faster_steps_diff) {
                        reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                        tuning_result[tuning_results].settings.stripe_faster -= stripe_faster_steps_diff;
                        tuning_results++;
                    }
                }
            }

            // reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
            // tuning_result[tuning_results].settings.blocksize_bits += anticiped_cache_line_bytesize*8;
            // tuning_results++;
            if (!option.fixed_benchmark_settings.blocksize_bits) {
                if (tuning_settings.blocksize_bits > anticiped_cache_line_bytesize*8) {
                    reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                    tuning_result[tuning_results].settings.blocksize_bits -= anticiped_cache_line_bytesize*8;
                    tuning_results++;
                }
            }
        }

        // join results with the same settings
        // add passes and times to the first one and recalculate the average
        // set the second one to zero

        tuning_results_selected = tuning_results;
        for (counter_t i=0; i<tuning_results; i++) {
            if (tuning_result[i].avg != 0) {
                for (counter_t j=i+1; j<tuning_results; j++) {
                    if (tuning_result[j].avg != 0 &&
                        tuning_result[i].settings.stripe_faster == tuning_result[j].settings.stripe_faster &&
                        tuning_result[i].settings.mediumstep_faster == tuning_result[j].settings.mediumstep_faster &&
                        tuning_result[i].settings.largestep_faster == tuning_result[j].settings.largestep_faster &&
                        tuning_result[i].settings.blocksize_bits == tuning_result[j].settings.blocksize_bits) {
                        tuning_result[i].passes       += tuning_result[j].passes;
                        tuning_result[i].elapsed_time += tuning_result[j].elapsed_time;
                        tuning_result[i].avg           = tuning_result[i].passes / tuning_result[i].elapsed_time;
                        tuning_result[j].passes       = 0;
                        tuning_result[j].elapsed_time = 0;
                        tuning_result[j].avg          = 0;
                        tuning_results_selected--;
                    }
                }
            }
        }
        qsort(tuning_result, (size_t)tuning_results, sizeof(benchmark_result_t), compare_tuning_result);
        tuning_results = tuning_results_selected;

        // take longer samples of the best results and their variations
        for (counter_t i=0; i<tuning_results; i++) {
            benchmark_settings_t tuning_settings = tuning_result[i].settings;

            tuning_settings.sample_duration += 2 * step * sample_duration;
            verbose2( { 
                benchmark_settings_as_string(settings_string, tuning_settings);
                printf("\rTuning step \033[1;32m%2ju\033[0m with \033[1;33m%5ju\033[0m options. Benchmarking option \033[1;32m%5ju\033[0m: %s in progress  ",(uintmax_t)step,(uintmax_t)tuning_results, (uintmax_t)i, settings_string  ); 
            })
            
            counter_t passes       = tuning_result[i].passes;
            double    elapsed_time = tuning_result[i].elapsed_time;

            #ifdef COMPILE_CHECKALL
            tuning_settings = check_benchmark_settings(tuning_settings);
            const int valid = checkSieveWithBenchmarkSettings(tuning_settings);
            if (!valid) {
                char settings_string[100]=""; benchmark_settings_as_string(settings_string, tuning_settings);
                fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) tuning_settings.factor_max);
                exit(1);
            }
            #endif
            
            // PERFORM THE BENCHMARK
            tuning_result[i] = benchmark(tuning_settings);

            // add the results to the previous results
            tuning_result[i].passes       += passes;
            tuning_result[i].elapsed_time += elapsed_time;
            tuning_result[i].avg           = tuning_result[i].passes / tuning_result[i].elapsed_time;

            if ((double)clock() > time_target) { break; }
        }
    }

    // take best result
    benchmark_result_t best_result = tuning_result[0];
    free(tuning_result);
    verbose2( { printf("\33[2K\rTuning done. Evaluated %ju options in %ju steps. Best result: ", (uintmax_t) tuning_results_max, (uintmax_t) step ); tuning_result_print(best_result);} );
    return best_result;
}

static void outputBenchmarkStats(benchmark_result_t benchmark_result)
{
    
    printf("\rResult: Passes \033[1;33m%ju\033[0m \033[0;32m(per %.1f seconds)\033[0m - average \033[1;33m%.1f\033[0m per second \n", 
        (uintmax_t) benchmark_result.passes, benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
    // if (option.time_max!=5.0)     printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 5.0, 5.0*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
    // if (threads>1) printf("        \033[0;32mPasses per thread (total %ju) - per %.1f seconds: %.1f - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 
    //                      (uintmax_t)benchmark_result.settings.threads, benchmark_result.settings.sample_duration, option.time_max*benchmark_result.passes/benchmark_result.elapsed_time/threads, benchmark_result.passes/benchmark_result.elapsed_time/threads);
    printf("\033[0;32mOutput message:\033[0m ");
}






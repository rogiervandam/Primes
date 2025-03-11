static int compare_tuning_result(const void *a, const void *b) 
{
    benchmark_result_t *resultA = (benchmark_result_t *)a;
    benchmark_result_t *resultB = (benchmark_result_t *)b;
    return (resultB->avg > resultA->avg ? 1 : -1);
}

static inline void tuning_result_print(benchmark_result_t tuning_result) 
{
    char settings[100]=""; benchmark_settings_as_string(settings, tuning_result.settings);
    verbose2( printf("average \033[1;33m%13.6f\033[0m with options \033[1;32m%s\033[0m was achieved with \033[1;33m%3ju\033[0m passes in \033[1;33m%f\033[0m seconds\n", 
    tuning_result.avg, settings, (uintmax_t)tuning_result.passes, tuning_result.elapsed_time); )
}

static benchmark_result_t tune(int tune_level, benchmark_settings_t start_tuning_settings) 
{
    counter_t stripe_faster_steps = 4;
    counter_t mediumstep_faster_steps = 4;
    counter_t largestep_faster_steps = 32;
    double    sample_duration         = option.sample_duration;
    counter_t prime_max               = usqrt(start_tuning_settings.factor_max) / 2; // divide by 2 to compensate for bitwise representation 
    counter_t sieve_bits              = start_tuning_settings.factor_max >> 1;
    char settings_string[100]=""; 

    // warm up the cache
    verbose2( printf("Warming up the cache and processing units\n"); )	
    for(counter_t i=0; i<256; i++ ) { 
        benchmark_settings_t tuning_settings = benchmarkInit(start_tuning_settings.threads);
        tuning_settings.stripe_faster = 10;
        tuning_settings.mediumstep_faster = VECTORWORD_SIZE_counter/4;
        tuning_settings.largestep_faster = VECTOR_SIZE_counter/4;
        tuning_settings.blocksize_bits = tuning_settings.factor_max/2;
        tuning_settings = check_benchmark_settings(tuning_settings);
        const int valid = checkSieveWithBenchmarkSettings(tuning_settings);
    }

    switch (tune_level) {
        case 1:
            stripe_faster_steps = prime_max/4;
            mediumstep_faster_steps = VECTORWORD_SIZE_counter/4;
            largestep_faster_steps = VECTOR_SIZE_counter/4;
            sample_duration = option.sample_duration;
            break;
        case 2:
            stripe_faster_steps = prime_max/8;
            mediumstep_faster_steps = VECTORWORD_SIZE_counter/8;
            largestep_faster_steps = VECTOR_SIZE_counter/8;
            sample_duration = option.sample_duration*2;
            break;
        case 3:
            stripe_faster_steps = prime_max/16;
            mediumstep_faster_steps = VECTORWORD_SIZE_counter/16;
            largestep_faster_steps = VECTOR_SIZE_counter/16;
            sample_duration =option.sample_duration*3;
            break;
    }
    
    verbose2( { 
        verbose3( printf("\n"); )
        printf("Tuning... compiled for \033[1;32mu%juv%ju\033[0m (word, vector)", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); 
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
        for (counter_t smallprime_direction = 0; smallprime_direction<=1; smallprime_direction++) { // helper to exponentially start at top and bottom of range
            for (counter_t mediumstep_faster = 0; mediumstep_faster <= VECTORWORD_SIZE_counter; mediumstep_faster += mediumstep_faster_steps) {
                for (counter_t largestep_faster = VECTORWORD_SIZE_counter; largestep_faster <= VECTOR_SIZE_counter; largestep_faster += largestep_faster_steps) { // TODO: start vectorstep at a nice % from mediumstep
                    counter_t blocksize_bits=8*1024*8;
                    do {
                        blocksize_bits *= 2;
                        counter_t stripe_faster_directed = (smallprime_direction==0) ? stripe_faster : (prime_max - stripe_faster);
                        if (blocksize_bits > sieve_bits) blocksize_bits = sieve_bits; // try to avoid duplicate results and prevent from doing too much work
                        if (stripe_faster_directed >= prime_max) blocksize_bits = sieve_bits; // avoid blocksize if not doing blockwise stripe

                        // hack to ovrrule tuning of user setting
                        if (option.fixed_benchmark_settings.stripe_faster)     { stripe_faster = option.fixed_benchmark_settings.stripe_faster; }
                        if (option.fixed_benchmark_settings.mediumstep_faster) { mediumstep_faster = option.fixed_benchmark_settings.mediumstep_faster; }
                        if (option.fixed_benchmark_settings.largestep_faster)  { largestep_faster = option.fixed_benchmark_settings.largestep_faster; }
                        if (option.fixed_benchmark_settings.blocksize_bits)    { blocksize_bits = option.fixed_benchmark_settings.blocksize_bits; }

                        // set variables
                        tuning_settings.blocksize_bits = blocksize_bits;
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
                            verbose1( { fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) tuning_settings.factor_max); } )
                            exit(1);
                        }
                        #endif
                        
                        tuning_result[tuning_result_index] = benchmark(tuning_settings);
                        verbose4( { printf("...."); tuning_result_print(tuning_result[tuning_result_index]); } )

                        if ( tuning_result[tuning_result_index].avg >= best_tuning_result.avg) {
                            best_tuning_result = tuning_result[tuning_result_index];
                            verbose3( { printf("\033[0;37m.(<)\033[0m"); tuning_result_print(best_tuning_result); } )
                        }

                        tuning_result_index++;
                        verbose_at2( { printf("\rTuning...tuning \033[1;32m%5ju\033[0m options..in \033[1;32m%lf\033[0m seconds  ",(uintmax_t)tuning_results, (double)tuning_results*sample_duration ); } )

                        if (option.fixed_benchmark_settings.blocksize_bits) break;
                    } while (blocksize_bits < sieve_bits);
                    if (option.fixed_benchmark_settings.largestep_faster) break;
                }
                if (option.fixed_benchmark_settings.mediumstep_faster) break;
            }
            if (option.fixed_benchmark_settings.stripe_faster) break;
        }
        if (option.fixed_benchmark_settings.stripe_faster) break;
    }
    verbose_at2( { printf("\rTuning...tuned %ju options..",(uintmax_t)tuning_results); } )
    verbose3( {
        benchmark_settings_as_string(settings_string, best_tuning_result.settings);
        printf("Finished scan of \033[1;33m%ju\033[0m options. Inital best %s\n",(uintmax_t)tuning_results, settings_string);
        printf("Finding the best option by reevaluating the top options with a longer sample duration.\n");
    })

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
        tuning_results_max += tuning_results;

        // add variations of the best results
        for (counter_t i=0; i<tuning_results_selected; i++) {
            benchmark_settings_t tuning_settings = tuning_result[i].settings;

            counter_t largestep_faster_steps_diff = largestep_faster_steps >> step; 
            if (!option.fixed_benchmark_settings.largestep_faster) {
                if (largestep_faster_steps_diff > 1) {
                    if (tuning_settings.largestep_faster < VECTOR_SIZE_counter - largestep_faster_steps_diff) {
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

                    if (tuning_settings.mediumstep_faster < VECTORWORD_SIZE_counter - mediumstep_faster_steps_diff) {
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

                    if (tuning_settings.stripe_faster < prime_max - stripe_faster_steps_diff) {
                        reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                        tuning_result[tuning_results].settings.stripe_faster += stripe_faster_steps_diff;
                        tuning_results++;
                    }

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
            // decrease blocksize slightly to allow room for starting of the sieve

            // if (!option.fixed_benchmark_settings.blocksize_bits) {
            //     if (tuning_settings.blocksize_bits > anticiped_cache_line_bytesize*8) { 
            //         reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
            //         tuning_result[tuning_results].settings.blocksize_bits -= anticiped_cache_line_bytesize*8;
            //         tuning_results++;
            //     }
            // }
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
                verbose1( fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) tuning_settings.factor_max); )
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
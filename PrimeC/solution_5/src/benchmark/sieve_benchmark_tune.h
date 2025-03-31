
static int compareTuningResults(const void *resultA, const void *resultB) 
{
    return ( ((benchmark_result_t *)resultB)->avg >  ((benchmark_result_t *)resultA)->avg ? 1 : -1);
}

static inline void printTuningResult(benchmark_result_t tuning_result) 
{
    char settings[50]=""; setBenchmarkSettingAsString(settings, tuning_result.settings);
    verbose2( printf("average \033[1;33m%13.6f\033[0m with options \033[1;32m%s\033[0m was achieved with \033[1;33m%3ju\033[0m passes in \033[1;33m%f\033[0m seconds\n", 
    tuning_result.avg, settings, (uintmax_t)tuning_result.passes, tuning_result.elapsed_time); )
}

static inline void resetBenchmarkResult(benchmark_result_t* benchmark_result, benchmark_settings_t benchmark_settings) 
{
    benchmark_result->settings     = benchmark_settings;
    benchmark_result->passes       = 0;
    benchmark_result->elapsed_time = 0;
    benchmark_result->avg          = 0;
}

typedef struct {
    counter_t prime_max;
    counter_t stripe_faster_steps;
    counter_t largestep_faster_steps;
    double sample_duration;
    counter_t sieve_bits;
    double time_target;
    counter_t tuning_results_max;
    counter_t step;
} tuning_parameters_t;

static counter_t buildInitialTuningTable(
    benchmark_result_t* tuning_result,
    benchmark_settings_t tuning_settings,
    tuning_parameters_t tuning_parameters
) {
    counter_t tuning_results = 0;
    counter_t tuning_result_index = 0;
    
    for (counter_t stripe_faster = 0; stripe_faster <= tuning_parameters.prime_max; stripe_faster += tuning_parameters.stripe_faster_steps) {
        for (counter_t largestep_faster = VECTORWORD_SIZE_BITS; largestep_faster <= VECTOR_SIZE_BITS; largestep_faster += tuning_parameters.largestep_faster_steps) { 
            for (counter_t blocksize_bits=8*1024*8; blocksize_bits <= tuning_parameters.sieve_bits; blocksize_bits += 8*1024*8) {
                if (stripe_faster == tuning_parameters.prime_max) blocksize_bits = tuning_parameters.sieve_bits;
                if (blocksize_bits > tuning_parameters.sieve_bits) blocksize_bits = tuning_parameters.sieve_bits;

                // override with user settings if specified
                if (option.fixed_benchmark_settings.stripe_faster)     { stripe_faster    = option.fixed_benchmark_settings.stripe_faster; }
                if (option.fixed_benchmark_settings.largestep_faster)  { largestep_faster = option.fixed_benchmark_settings.largestep_faster; }
                if (option.fixed_benchmark_settings.blocksize_bits)    { blocksize_bits   = option.fixed_benchmark_settings.blocksize_bits; }

                // set variables
                tuning_settings.blocksize_bits   = blocksize_bits;
                tuning_settings.stripe_faster    = stripe_faster;
                tuning_settings.largestep_faster = largestep_faster;
                tuning_settings.sample_duration  = tuning_parameters.sample_duration;
                tuning_settings = checkBenchmarkSettings(tuning_settings);
                tuning_results++;

                resetBenchmarkResult(&tuning_result[tuning_result_index], tuning_settings);

                tuning_result_index++;
                verbose_at2( { printf("\rTuning...tuning \033[1;32m%5ju\033[0m options..in \033[1;32m%lf\033[0m seconds  ",
                    (uintmax_t)tuning_results, (double)tuning_results*tuning_parameters.sample_duration ); } )

                if (option.fixed_benchmark_settings.blocksize_bits) break;
                if (stripe_faster == tuning_parameters.prime_max) break;
            }
            if (option.fixed_benchmark_settings.largestep_faster) break;
        }
        if (option.fixed_benchmark_settings.stripe_faster) break;
    }
    
    return tuning_results;
}

static counter_t addTuningVariations(
    benchmark_result_t* tuning_result, 
    counter_t tuning_results, 
    counter_t tuning_results_selected,
    tuning_parameters_t tuning_parameters
) {
    counter_t new_tuning_results = tuning_results;
    
    for (counter_t i=0; i<tuning_results_selected; i++) {
        benchmark_settings_t tuning_settings = tuning_result[i].settings;

        counter_t largestep_faster_steps_diff = tuning_parameters.largestep_faster_steps >> tuning_parameters.step; 
        if (!option.fixed_benchmark_settings.largestep_faster) {
            if (largestep_faster_steps_diff > 1) {
                if (tuning_settings.largestep_faster < VECTOR_SIZE_BITS - largestep_faster_steps_diff) {
                    resetBenchmarkResult(&tuning_result[new_tuning_results], tuning_settings);
                    tuning_result[new_tuning_results].settings.largestep_faster += largestep_faster_steps_diff;
                    new_tuning_results++;
                }
                if (tuning_settings.largestep_faster > 2) {
                    resetBenchmarkResult(&tuning_result[new_tuning_results], tuning_settings);
                    tuning_result[new_tuning_results].settings.largestep_faster -= 2;
                    new_tuning_results++;
                }
            }
        }

        counter_t stripe_faster_steps_diff = tuning_parameters.stripe_faster_steps >> tuning_parameters.step; 
        if (!option.fixed_benchmark_settings.stripe_faster) {
            if (stripe_faster_steps_diff > 1) {
                if (tuning_settings.stripe_faster < tuning_parameters.prime_max - stripe_faster_steps_diff) {
                    resetBenchmarkResult(&tuning_result[new_tuning_results], tuning_settings);
                    tuning_result[new_tuning_results].settings.stripe_faster += stripe_faster_steps_diff;
                    new_tuning_results++;
                }

                if (tuning_settings.stripe_faster > stripe_faster_steps_diff) {
                    resetBenchmarkResult(&tuning_result[new_tuning_results], tuning_settings);
                    tuning_result[new_tuning_results].settings.stripe_faster -= stripe_faster_steps_diff;
                    new_tuning_results++;
                }
            }
        }
    }
    
    return new_tuning_results;
}

static counter_t joinTuningResults(benchmark_result_t* tuning_result, counter_t tuning_results) 
{
    counter_t tuning_results_selected = tuning_results;
    
    for (counter_t i=0; i<tuning_results; i++) {
        if (tuning_result[i].avg != 0) {
            for (counter_t j=i+1; j<tuning_results; j++) {
                if (tuning_result[j].avg != 0 &&
                    tuning_result[i].settings.stripe_faster    == tuning_result[j].settings.stripe_faster &&
                    tuning_result[i].settings.largestep_faster == tuning_result[j].settings.largestep_faster &&
                    tuning_result[i].settings.blocksize_bits   == tuning_result[j].settings.blocksize_bits
                ) {
                    tuning_result[i].passes                    += tuning_result[j].passes;
                    tuning_result[i].elapsed_time              += tuning_result[j].elapsed_time;
                    tuning_result[i].avg                        = tuning_result[i].passes / tuning_result[i].elapsed_time;

                    tuning_result[j].passes                     = 0;
                    tuning_result[j].elapsed_time               = 0;
                    tuning_result[j].avg                        = 0;
                    tuning_results_selected--;
                }
            }
        }
    }
    
    return tuning_results_selected;
}

static benchmark_result_t tuneSieveSettings(int tune_level, benchmark_settings_t start_tuning_settings) 
{
    counter_t prime_max               = usqrt(start_tuning_settings.factor_max) / 2; // divide by 2 to compensate for bitwise representation 
    // counter_t stripe_faster_steps     = 64;
    // counter_t largestep_faster_steps  = 32;
    // double    sample_duration         = option.sample_duration;
    // counter_t sieve_bits              = start_tuning_settings.factor_max >> 1;
    char      settings_string[50]     = ""; 

    tuning_parameters_t tuning_parameters;
    tuning_parameters.prime_max = prime_max / 2;
    tuning_parameters.stripe_faster_steps = 64;
    tuning_parameters.largestep_faster_steps = 32;
    tuning_parameters.sample_duration = option.sample_duration;
    tuning_parameters.sieve_bits = start_tuning_settings.factor_max >> 1;
    tuning_parameters.step = 0;
    tuning_parameters.tuning_results_max = 0;
    
    switch (tune_level) {
        case 1:
            tuning_parameters.stripe_faster_steps    = prime_max/4;
            tuning_parameters.largestep_faster_steps = 32;
            tuning_parameters.sample_duration        = option.sample_duration;
            break;
        case 2:
            tuning_parameters.stripe_faster_steps    = prime_max/8;
            tuning_parameters.largestep_faster_steps = 32;
            tuning_parameters.sample_duration        = option.sample_duration*2;
            break;
    }
    
    verbose2( { 
        verbose3( printf("\n"); )
        printf("Tuning... "); 
        verbose3( {
            setBenchmarkSettingAsString(settings_string, start_tuning_settings);
            printf(".. best options (shown when found) for steps s%juv%ju:\n", (uintmax_t)stripe_faster_steps, (uintmax_t) largestep_faster_steps); 
        } )
    })

    // prepare a table to store the tuning results
    const size_t max_results = ((prime_max)+1) * ((size_t)(VECTOR_SIZE_BITS/tuning_parameters.largestep_faster_steps)+1) * 32;
    benchmark_result_t* tuning_result = malloc(max_results * sizeof(tuning_result));
    benchmark_settings_t tuning_settings = initBenchmarkSettings(start_tuning_settings.threads);
    benchmark_result_t best_tuning_result = tuning_result[0];
    counter_t tuning_results=0;
    counter_t tuning_result_index=0;

    // start the timer
    const double time_start = (double)clock();
    const double time_target = time_start + option.tune_duration_max * CLOCKS_PER_SEC;

    // build the initial tuning table
    tuning_results = buildInitialTuningTable(tuning_result, tuning_settings, tuning_parameters);

    verbose_at2( { printf("\rTuning...tuned %ju options..",(uintmax_t)tuning_results); } )
    verbose3( {
        printf("Finding the best option by reevaluating the top options with a longer sample duration.\n");
    })

    // reduce the tuning results to the best options
    // keep the best of the results and reevaluate them with a longer sample duration
    counter_t tuning_results_max = tuning_results; // keep this value for verbose messages
    tuning_parameters.step = 0;

    for (; tuning_results > 1; tuning_parameters.step++) {
        for (counter_t i=0; i<tuning_results; i++) {
            benchmark_settings_t tuning_settings = tuning_result[i].settings;

            tuning_settings.sample_duration += 2 * tuning_parameters.step * tuning_parameters.sample_duration;
            verbose2( { 
                setBenchmarkSettingAsString(settings_string, tuning_settings);
                printf("\rTuning step \033[1;32m%2ju\033[0m with \033[1;33m%5ju\033[0m options. Benchmarking option \033[1;32m%5ju\033[0m: %s in progress  ",(uintmax_t)tuning_parameters.step,(uintmax_t)tuning_results, (uintmax_t)i, settings_string  ); 
            })
            
            #ifdef COMPILE_CHECKALL
            tuning_settings = checkBenchmarkSettings(tuning_settings);
            const int valid = checkSieveWithBenchmarkSettings(tuning_settings);
            if (!valid) {
                char settings_string[50]=""; setBenchmarkSettingAsString(settings_string, tuning_settings);
                verbose1( fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for settings %s with factor %ju\n", settings_string, (uintmax_t) tuning_settings.factor_max); )
                exit(1);
            }
            #endif
            
            // PERFORM THE BENCHMARK
            tuning_result[i] = benchmark(tuning_settings);

            if ((double)clock() > time_target) { break; }
        }
        qsort(tuning_result, (size_t)tuning_results, sizeof(benchmark_result_t), compareTuningResults);

        // prevent the tuning from running too long
        // after sorting so the best results are on top
        if ((double)clock() > time_target) { verbose3( { printf("\nTune time expired\n"); } );  break; }

        // keep the best results
        counter_t tuning_results_selected = tuning_results * option.tune_keeppercent / 100;
        if (tuning_results_selected < 1) break;

        verbose3( {
            printf("\n");
            printf("\r\033[0;90m(iteration %1ju) - %5ju options left - selecting %5ju\033[0m options\n",(uintmax_t)step, (uintmax_t)tuning_results,(uintmax_t)tuning_results_selected) ; 
            verbose_at3(  printf(">> \033[0;34m");printTuningResult(tuning_result[0]); printf("\033[0m");  )
            verbose3( {
                for (tuning_result_index=1; tuning_result_index<min( option.show_tuning_results_max,tuning_results); tuning_result_index++) {
                    printf("...\033[0;90m"); printTuningResult(tuning_result[tuning_result_index]); printf("\033[0m");
                }
            })
        })

        tuning_results = tuning_results_selected;
        tuning_results_max += tuning_results;

        // add variations of the best results
        tuning_results = addTuningVariations(tuning_result, tuning_results, tuning_results_selected, tuning_parameters);

        // join results with the same settings; set the second one to zero. Sorting will flush them out
        tuning_results_selected = joinTuningResults(tuning_result, tuning_results);
        qsort(tuning_result, (size_t)tuning_results, sizeof(benchmark_result_t), compareTuningResults);
        tuning_results = tuning_results_selected;
    }

    // take best result
    benchmark_result_t best_result = tuning_result[0];
    free(tuning_result);

    if (tuning_results_max) {
        verbose2( { printf("\33[2K\rTuning done. Evaluated %ju options in %ju steps. Best result: ", (uintmax_t) tuning_results_max, (uintmax_t) tuning_parameters.step ); printTuningResult(best_result);} );
    }
    return best_result;
}
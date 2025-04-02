
static int compareTuningResults(const void *resultA, const void *resultB) 
{
    return ( ((benchmark_result_t *)resultB)->avg >  ((benchmark_result_t *)resultA)->avg ? 1 : -1);
}

static inline int sameTuningResult(benchmark_result_t* resultA, benchmark_result_t* resultB) 
{
    return (resultA->settings.stripe_faster    == resultB->settings.stripe_faster &&
            resultA->settings.largestep_faster == resultB->settings.largestep_faster &&
            resultA->settings.blocksize_bits   == resultB->settings.blocksize_bits);
}

static inline void setSettingsFromTuning(benchmark_settings_t* benchmark_settings, benchmark_settings_t* tuning_settings) 
{
    benchmark_settings->stripe_faster     = tuning_settings->stripe_faster;
    benchmark_settings->largestep_faster  = tuning_settings->largestep_faster;
    benchmark_settings->blocksize_bits    = tuning_settings->blocksize_bits;
}

static inline void resetBenchmarkResult(benchmark_result_t* benchmark_result, benchmark_settings_t benchmark_settings) 
{
    benchmark_result->settings     = benchmark_settings;
    benchmark_result->passes       = 0;
    benchmark_result->elapsed_time = 0;
    benchmark_result->avg          = 0;
}

static inline void printTuningResult(benchmark_result_t tuning_result) 
{
    char settings[50]=""; setBenchmarkSettingAsString(settings, tuning_result.settings);
    verbose2( printf("average " COLOR_BOLD_YELLOW "%13.6f" COLOR_RESET " with options " COLOR_BOLD_GREEN "%s" COLOR_RESET 
                     " was achieved with " COLOR_BOLD_YELLOW "%3ju" COLOR_RESET " passes in " COLOR_BOLD_YELLOW "%f" COLOR_RESET " seconds\n", 
                    tuning_result.avg, settings, (uintmax_t)tuning_result.passes, tuning_result.elapsed_time); )
}

typedef struct {
    counter_t prime_max;
    counter_t stripe_faster_steps;
    counter_t largestep_faster_steps;
    double    sample_duration;
    counter_t sieve_bits;
    double    time_target;
    counter_t tuning_results_max;
    counter_t step;
} tuning_parameters_t;

static counter_t buildInitialTuningTable(benchmark_result_t* tuning_result, benchmark_settings_t tuning_settings, tuning_parameters_t tuning_parameters) {
    counter_t tuning_results = 0;
    
    for (counter_t stripe_faster = 0; stripe_faster <= tuning_parameters.prime_max; stripe_faster += tuning_parameters.stripe_faster_steps) {
        for (counter_t largestep_faster = VECTORWORD_SIZE_BITS; largestep_faster <= VECTOR_SIZE_BITS; largestep_faster += tuning_parameters.largestep_faster_steps) { 
            counter_t blocksize_bits=8*1024*8;
            do { // do loop because user can set this beyound sieve_bits
                if (blocksize_bits > tuning_parameters.sieve_bits) blocksize_bits = tuning_parameters.sieve_bits;
                if (stripe_faster == tuning_parameters.prime_max) blocksize_bits = tuning_parameters.sieve_bits;

                // override with user settings if specified
                if (option.fixed_benchmark_settings.stripe_faster)     { stripe_faster    = option.fixed_benchmark_settings.stripe_faster; }
                if (option.fixed_benchmark_settings.largestep_faster)  { largestep_faster = option.fixed_benchmark_settings.largestep_faster; }
                if (option.fixed_benchmark_settings.blocksize_bits)    { blocksize_bits   = option.fixed_benchmark_settings.blocksize_bits; }

                // set variables
                tuning_settings.blocksize_bits   = blocksize_bits;
                tuning_settings.stripe_faster    = stripe_faster;
                tuning_settings.largestep_faster = largestep_faster;
                tuning_settings.sample_duration  = tuning_parameters.sample_duration;
                resetBenchmarkResult(&tuning_result[tuning_results++], checkBenchmarkSettings(tuning_settings));

                // tuning_result_index++;
                verbose2( { printf("\rTuning...tuning " COLOR_BOLD_GREEN "%5ju" COLOR_RESET " options..in " COLOR_BOLD_GREEN "%lf" COLOR_RESET " seconds  ",
                    (uintmax_t)tuning_results, (double)tuning_results*tuning_parameters.sample_duration ); } )

                if (option.fixed_benchmark_settings.blocksize_bits) break;
                if (stripe_faster == tuning_parameters.prime_max) break;
                blocksize_bits += 8*1024*8;
            } while ( blocksize_bits <= tuning_parameters.sieve_bits );
            if (option.fixed_benchmark_settings.largestep_faster) break;
        }
        if (option.fixed_benchmark_settings.stripe_faster) break;
    }

    return tuning_results;
}

static counter_t addTuningVariations(benchmark_result_t* tuning_result, counter_t tuning_results, counter_t tuning_results_selected, tuning_parameters_t tuning_parameters) 
{
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


// join results with the same settings; set the second one to zero. Sorting will flush them out.
static counter_t joinTuningResults(benchmark_result_t* tuning_result, const counter_t tuning_results) 
{
    counter_t tuning_results_selected = tuning_results;
    
    for (counter_t i=0; i<tuning_results; i++) {
        if (tuning_result[i].avg != 0) {
            for (counter_t j=i+1; j<tuning_results; j++) {
                if (tuning_result[j].avg != 0 && sameTuningResult(&tuning_result[i], &tuning_result[j])) {
                    updateBenchmarkResult(&tuning_result[i], tuning_result[j].passes, tuning_result[j].elapsed_time);
                    resetBenchmarkResult(&tuning_result[j], tuning_result[j].settings);
                    tuning_results_selected--;
                }
            }
        }
    }
    qsort(tuning_result, (size_t)tuning_results, sizeof(benchmark_result_t), compareTuningResults);
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

    tuning_parameters_t tuning_parameters = {
        .prime_max = prime_max / 2,
        .stripe_faster_steps = 64,
        .largestep_faster_steps = 32,
        .sample_duration = option.sample_duration,
        .sieve_bits = start_tuning_settings.factor_max >> 1,
        .time_target = 0, // This field wasn't initialized in your original code
        .step = 0,
        .tuning_results_max = 0
    };
    
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
            printf(".. best options (shown when found) for steps s%juv%ju:\n", (uintmax_t)tuning_parameters.stripe_faster_steps, (uintmax_t) tuning_parameters.largestep_faster_steps); 
        } )
    })

    // prepare a table to store the tuning results
    const size_t max_results = ((prime_max)+1) * ((size_t)(VECTOR_SIZE_BITS/tuning_parameters.largestep_faster_steps)+1) * 32;
    benchmark_result_t* tuning_result = malloc(max_results * sizeof(tuning_result));
    benchmark_settings_t tuning_settings = initBenchmarkSettings(start_tuning_settings.threads);

    // start the timer
    const double time_start = (double)clock();
    const double time_target = time_start + option.tune_duration_max * CLOCKS_PER_SEC;

    // build the initial tuning table
    counter_t tuning_results = buildInitialTuningTable(tuning_result, tuning_settings, tuning_parameters);
    if (tuning_results == 0) {
        verbose1( fprintf(stderr, "No tuning results found\n"); )
        free(tuning_result);
        exit(1);
    }

    verbose_at2( { printf("\rTuning...tuned %ju options..",(uintmax_t)tuning_results); })
    verbose3(    { printf("Finding the best option by reevaluating the top options with a longer sample duration.\n"); })

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
                printf("\rTuning step " COLOR_BOLD_GREEN "%2ju" COLOR_RESET " with " COLOR_BOLD_YELLOW "%5ju" COLOR_RESET " options. Benchmarking option " COLOR_BOLD_GREEN "%5ju" COLOR_RESET ": %s in progress  ",(uintmax_t)tuning_parameters.step,(uintmax_t)tuning_results, (uintmax_t)i, settings_string  ); 
            })
            
            #ifdef COMPILE_CHECKALL
            tuning_settings = checkBenchmarkSettings(tuning_settings);
            const int valid = checkSieveWithBenchmarkSettings(tuning_settings);
            if (!valid) {
                char settings_string[50]=""; setBenchmarkSettingAsString(settings_string, tuning_settings);
                verbose1( fprintf(stderr, "The sieve is \033[0;31mNOT" COLOR_RESET " valid for settings %s with factor %ju\n", settings_string, (uintmax_t) tuning_settings.factor_max); )
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
            printf("\r\033[0;90m(iteration %1ju) - %5ju options left - selecting %5ju" COLOR_RESET " options\n",(uintmax_t)tuning_parameters.step, (uintmax_t)tuning_results,(uintmax_t)tuning_results_selected) ; 
            verbose_at3(  printf(">> \033[0;34m");printTuningResult(tuning_result[0]); printf("" COLOR_RESET "");  )
            verbose3( {
                for (counter_t tuning_result_index=1; tuning_result_index<min( option.show_tuning_results_max,tuning_results); tuning_result_index++) {
                    printf("...\033[0;90m"); printTuningResult(tuning_result[tuning_result_index]); printf("" COLOR_RESET "");
                }
            })
        })

        tuning_results = tuning_results_selected;
        tuning_results_max += tuning_results;

        // add variations of the best results
        tuning_results = addTuningVariations(tuning_result, tuning_results, tuning_results_selected, tuning_parameters);
        tuning_results = joinTuningResults(tuning_result, tuning_results);
    }

    // take best result
    benchmark_result_t best_result = tuning_result[0];
    free(tuning_result);

    if (tuning_results_max) {
        verbose2( { printf("\33[2K\rTuning done. Evaluated %ju options in %ju steps. Best result: ", (uintmax_t) tuning_results_max, (uintmax_t) tuning_parameters.step ); printTuningResult(best_result);} );
    }
    return best_result;
}
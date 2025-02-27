typedef struct  {
    counter_t maxFactor;
    counter_t smallprime_faster;
    counter_t mediumstep_faster;
    counter_t vectorstep_faster;
    counter_t blocksize_bits;
    counter_t threads;
    double    sample_duration;
} benchmark_settings_t;

typedef struct  {
    benchmark_settings_t settings;
    counter_t passes;
    double    elapsed_time;
    double    avg;
} benchmark_result_t;

#include <stdio.h>

// Function to save tuning results to a CSV file
static void saveTuningResultsToCSV(const char* filename, benchmark_result_t* tuning_results, counter_t tuning_results_count) {
    FILE* file = fopen(filename, "w");
    if (!file) {
        fprintf(stderr, "Error: Could not open file %s for writing\n", filename);
        return;
    }

    // Write CSV header
    fprintf(file, "blocksize_bits,blocksize_kB,smallprime_faster,mediumstep_faster,vectorstep_faster,passes,elapsed_time,sample_duration,average\n");

    // Write tuning results
    for (counter_t i = 0; i < tuning_results_count; i++) {
        benchmark_result_t result = tuning_results[i];
        fprintf(file, "%ju,%ju,%ju,%ju,%ju,%ju,%f,%f,%f\n",
                (uintmax_t)result.settings.blocksize_bits,
                (uintmax_t)result.settings.blocksize_bits / 8 / 1024,
                (uintmax_t)result.settings.smallprime_faster,
                (uintmax_t)result.settings.mediumstep_faster,
                (uintmax_t)result.settings.vectorstep_faster,
                (uintmax_t)result.passes,
                result.elapsed_time,
                result.settings.sample_duration,
                result.avg);
    }

    fclose(file);
    verbose3( printf("Tuning results saved to %s\n", filename); )
}

static void reset_benchmark_result(benchmark_result_t* benchmark_result, benchmark_settings_t benchmark_settings) {
    benchmark_result->settings = benchmark_settings;
    benchmark_result->passes = 0;
    benchmark_result->elapsed_time = 0;
    benchmark_result->avg = 0;
}

static benchmark_settings_t benchmarkInit(counter_t threads, counter_t option_blocksize_kB) {
    benchmark_settings_t benchmark_settings;
    benchmark_settings.smallprime_faster = option.smallprime_faster;
    benchmark_settings.mediumstep_faster = option.mediumstep_faster;
    benchmark_settings.vectorstep_faster = option.vectorstep_faster; 
    benchmark_settings.blocksize_bits    = option_blocksize_kB * 1024 * 8;
    benchmark_settings.maxFactor         = option.maxFactor;
    benchmark_settings.threads           = threads;
    benchmark_settings.sample_duration   = option.maxTime;
    return benchmark_settings;
}

static int compare_tuning_result(const void *a, const void *b) 
{
    benchmark_result_t *resultA = (benchmark_result_t *)a;
    benchmark_result_t *resultB = (benchmark_result_t *)b;
    return (resultB->avg > resultA->avg ? 1 : -1);
}

static void setSettingsFromTuning(benchmark_settings_t* benchmark_settings, benchmark_settings_t* tuning_settings) {
    benchmark_settings->smallprime_faster = tuning_settings->smallprime_faster;
    benchmark_settings->mediumstep_faster = tuning_settings->mediumstep_faster;
    benchmark_settings->vectorstep_faster = tuning_settings->vectorstep_faster;
    benchmark_settings->blocksize_bits    = tuning_settings->blocksize_bits;
}

static benchmark_result_t benchmark(benchmark_settings_t benchmark_settings) 
{
    benchmark_result_t benchmark_result;
    benchmark_result.settings = benchmark_settings;

    // don't use VECTORSTEP for steps larger than VECTOR_SIZE
    if (benchmark_result.settings.vectorstep_faster > VECTOR_SIZE_counter ) benchmark_result.settings.vectorstep_faster = VECTOR_SIZE_counter;

    // set global variables used in the sieve functions
    global_smallprime_faster = benchmark_result.settings.smallprime_faster;
    global_mediumstep_faster = benchmark_result.settings.mediumstep_faster;
    global_vectorstep_faster = benchmark_result.settings.vectorstep_faster;

    // prepare for the benchmark
    counter_t passes = 0;
    double time_elapsed = 0;
    const counter_t sieve_size = benchmark_result.settings.maxFactor;
    const counter_t blocksize_bits = benchmark_result.settings.blocksize_bits;
    const double time_sample = benchmark_result.settings.sample_duration * CLOCKS_PER_SEC; // do this before we set the clock
    const double time_start = (double) clock();
    const double time_target = time_start + time_sample; // use target time to avoid substraction in the while loop

    #ifdef _OPENMP
    omp_set_num_threads(benchmark_settings.threads);
    // sample_duration *= tuning_result->threads;
    #pragma omp parallel reduction(+:passes)
    #endif

    // run the benchmark
    while (time_elapsed <= time_target) {
        struct sieve_t *sieve = sieve_shake(sieve_size, blocksize_bits);
        sieve_delete(sieve);
        time_elapsed = (double) clock();         
        passes++;
    }

    // calculate results
    time_elapsed -= time_start;
    benchmark_result.passes       = passes;
    benchmark_result.elapsed_time = time_elapsed / CLOCKS_PER_SEC / benchmark_settings.threads;
    benchmark_result.avg          = benchmark_result.passes / benchmark_result.elapsed_time; // TODO: check if thhreads are correct

    return benchmark_result;
}

static inline void tuning_result_print(benchmark_result_t tuning_result) 
{
    printf("\033[0;90mblocksize_bits %10ju; blocksize %4jukB; small %4ju; medium %2ju; vector %3ju; passes %3ju; time %f/%f;average %f\n\033[0m", 
                            (uintmax_t)tuning_result.settings.blocksize_bits, (uintmax_t)tuning_result.settings.blocksize_bits/8/1024,
                            (uintmax_t)tuning_result.settings.smallprime_faster,(uintmax_t)tuning_result.settings.mediumstep_faster,(uintmax_t)tuning_result.settings.vectorstep_faster,
                            (uintmax_t)tuning_result.passes, tuning_result.elapsed_time, tuning_result.settings.sample_duration, tuning_result.avg);
}

static benchmark_result_t tune(int tune_level, benchmark_settings_t start_tuning_settings) 
{
    counter_t smallprime_faster_steps = 4;
    counter_t mediumstep_faster_steps = 4;
    counter_t vectorstep_faster_steps = 32;
    counter_t freebits_steps          = anticiped_cache_line_bytesize;
    double    sample_duration         = option.sample_duration;
    counter_t prime_max               = usqrt(start_tuning_settings.maxFactor) / 2; // divide by 2 to compensate for bitwise representation 

    // determines the size of the resultset
    switch (tune_level) {
        case 1:
            smallprime_faster_steps = 16;
            mediumstep_faster_steps = 16;
            vectorstep_faster_steps = VECTOR_SIZE_counter/8;
            freebits_steps = anticiped_cache_line_bytesize*8*2;
            sample_duration = option.sample_duration;
            break;
        case 2:
            smallprime_faster_steps = 8;
            mediumstep_faster_steps = 8;
            vectorstep_faster_steps = VECTOR_SIZE_counter/16;
            freebits_steps = anticiped_cache_line_bytesize*8;
            sample_duration = option.sample_duration*2;
            break;
        case 3:
            smallprime_faster_steps = 4;
            mediumstep_faster_steps = 4;
            vectorstep_faster_steps = VECTOR_SIZE_counter/32;
            freebits_steps = anticiped_cache_line_bytesize/2;
            sample_duration =option.sample_duration*4;
            break;
    }
    
    verbose1( { 
        verbose2( printf("\n"); )
        printf("Tuning... compiled for %ju/%ju (word, vector)", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); 
        verbose2( printf(".. best options (shown when found) for steps s%jum%juv%ju:\n", (uintmax_t)smallprime_faster_steps, (uintmax_t) mediumstep_faster_steps, (uintmax_t) vectorstep_faster_steps); )
        fflush(stdout);
    })

    // prepare a table to store the tuning results
    const size_t max_results = ((prime_max)) * ((size_t)(WORD_SIZE_counter/mediumstep_faster_steps)+1) * ((size_t)(VECTOR_SIZE_counter/vectorstep_faster_steps)+1) * 32 * (size_t)(anticiped_cache_line_bytesize*8*4/freebits_steps);
    benchmark_result_t* tuning_result = malloc(max_results * sizeof(tuning_result));
    benchmark_settings_t tuning_settings = benchmarkInit(start_tuning_settings.threads, option.blocksize_kB);
    benchmark_result_t best_tuning_result;
    counter_t tuning_results=0;
    counter_t tuning_result_index=0;

    // start the timer
    const double time_start = (double)clock();
    const double time_target = time_start + option.maxTuneDuration * CLOCKS_PER_SEC;

    // build the tuning table
    for (counter_t smallprime_faster = 0; smallprime_faster <= prime_max; smallprime_faster += smallprime_faster_steps, smallprime_faster_steps*=2) { // increase the stepsize exponentially to reduce the number of options
        for (counter_t mediumstep_faster = 0; mediumstep_faster <= WORD_SIZE_counter; mediumstep_faster += mediumstep_faster_steps) {
            for (counter_t vectorstep_faster = 0; vectorstep_faster <= VECTOR_SIZE_counter; vectorstep_faster += vectorstep_faster_steps) { // TODO: start vectorstep at a nice % from mediumstep
                for (counter_t blocksize_kB=128; blocksize_kB>=16; blocksize_kB /= 2) {
                    counter_t free_bits = 0;
                    // for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (free_bits < blocksize_kB * 1024 * 8)); free_bits += freebits_steps) {
                        for (counter_t smallprime_direction=0; smallprime_direction<=1; smallprime_direction++) { // helper to exponentially start at top and bottom of range
                            counter_t smallprime_faster_directed = (smallprime_direction==0) ? smallprime_faster : (prime_max - smallprime_faster);

                            // hack to ovrrule tuning of user setting
                            if (option.blocksize_kB)      { blocksize_kB = option.blocksize_kB; free_bits=0; }
                            if (option.vectorstep_faster) { vectorstep_faster = option.vectorstep_faster; }
                            if (option.mediumstep_faster) { mediumstep_faster = option.mediumstep_faster; }
                            if (option.smallprime_faster) { smallprime_faster = option.smallprime_faster; }

                            counter_t blocksize_bits = (blocksize_kB * 1024 * 8) - free_bits;

                            // set variables
                            tuning_settings.blocksize_bits = blocksize_bits;
                            tuning_settings.smallprime_faster = smallprime_faster_directed;
                            tuning_settings.mediumstep_faster = mediumstep_faster;
                            tuning_settings.vectorstep_faster = vectorstep_faster;
                            tuning_settings.sample_duration = sample_duration;
                            tuning_results++;

                            tuning_result[tuning_result_index] = benchmark(tuning_settings);

                            if ( tuning_result[tuning_result_index].avg > best_tuning_result.avg) {
                                best_tuning_result = tuning_result[tuning_result_index];
                                verbose2( { printf("\033[0;37m.(<)\033[0m"); tuning_result_print(tuning_result[tuning_result_index]); fflush(stdout); } )
                            }
                            verbose4( { printf("...."); tuning_result_print(tuning_result[tuning_result_index]); } )
                            tuning_result_index++;
                            verbose1_at( { printf("\rTuning...tuning %ju options..in %lf seconds  ",(uintmax_t)tuning_results, (double)tuning_results*sample_duration ); fflush(stdout); } )
                        }
                        if (option.smallprime_faster) break;
                    // }
                    if (option.blocksize_kB) break;
                }
                if (option.vectorstep_faster) break;
            }
            if (option.mediumstep_faster) break;
        }
        if (option.smallprime_faster) break;
    }
    verbose1_at( { printf("\rTuning...tuned %ju options..",(uintmax_t)tuning_results); } )
    verbose2( {
        printf("Finished scan of \033[1;33m%ju\033[0m options. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju; best vectorstep %ju\n",(uintmax_t)tuning_results,(uintmax_t)best_tuning_result.settings.blocksize_bits, (uintmax_t)best_tuning_result.settings.smallprime_faster,(uintmax_t)best_tuning_result.settings.mediumstep_faster, (uintmax_t)best_tuning_result.settings.vectorstep_faster);
        printf("Finding the best option by reevaluating the top options with a longer sample duration.\n");
    })

    char filename[256];
    sprintf(filename,"tuning_results-u%juv%ju.csv", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS);
    saveTuningResultsToCSV(filename, tuning_result, tuning_results); 

    // reduce the tuning results to the best options
    // keep the best of the results and reevaluate them with a longer sample duration

    counter_t tuning_results_max = tuning_results; // keep this value for verbose messages
    for (counter_t step=0; tuning_results > 2; step++) {
        qsort(tuning_result, (size_t)tuning_results, sizeof(benchmark_result_t), compare_tuning_result);

        // prevent the tuning from running too long
        // after sorting so the best results are on top
        if ((double)clock() > time_target) { verbose2( { printf("\nTune time expired\n"); } );  break; }

        // keep the best results
        counter_t tuning_results_selected = tuning_results / 12;

        // verbose messages
        verbose2( {
            printf("\n");
            printf("\r(iteration %1ju) - %ju results left - selecting %ju\n",(uintmax_t)step, (uintmax_t)tuning_results,(uintmax_t)tuning_results_selected) ; 
            verbose2_at(  printf(">> ");tuning_result_print(tuning_result[0]);  )
            verbose2( {
                for (tuning_result_index=0; tuning_result_index<min( option.show_max_tuning_results,tuning_results); tuning_result_index++) {
                    printf("..."); tuning_result_print(tuning_result[tuning_result_index]);
                }
            })

        })

        tuning_results = tuning_results_selected;

        // add variations of the best results
        for (counter_t i=0; i<tuning_results_selected; i++) {
            benchmark_settings_t tuning_settings = tuning_result[i].settings;

            if (tuning_settings.vectorstep_faster < VECTOR_SIZE_counter - 2) {
                reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                tuning_result[tuning_results].settings.vectorstep_faster += 2;
                tuning_results++;
            }
            if (tuning_settings.vectorstep_faster > 2) {
                reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                tuning_result[tuning_results].settings.vectorstep_faster -= 2;
                tuning_results++;
            }

            if (tuning_settings.mediumstep_faster < WORD_SIZE_counter - 4) {
                reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                tuning_result[tuning_results].settings.mediumstep_faster += 4;
                tuning_results++;
            }
            if (tuning_settings.mediumstep_faster > 4) {
                reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                tuning_result[tuning_results].settings.mediumstep_faster -= 4;
                tuning_results++;
            }

            reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
            tuning_result[tuning_results].settings.smallprime_faster += 4;
            tuning_results++;
            if (tuning_settings.smallprime_faster > 4) {
                reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                tuning_result[tuning_results].settings.smallprime_faster -= 4;
                tuning_results++;
            }

            // reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
            // tuning_result[tuning_results].settings.blocksize_bits += anticiped_cache_line_bytesize*8;
            // tuning_results++;
            if (tuning_settings.blocksize_bits > anticiped_cache_line_bytesize*4) {
                reset_benchmark_result(&tuning_result[tuning_results], tuning_settings);
                tuning_result[tuning_results].settings.blocksize_bits -= anticiped_cache_line_bytesize*4;
                tuning_results++;
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
                        tuning_result[i].settings.smallprime_faster == tuning_result[j].settings.smallprime_faster &&
                        tuning_result[i].settings.mediumstep_faster == tuning_result[j].settings.mediumstep_faster &&
                        tuning_result[i].settings.vectorstep_faster == tuning_result[j].settings.vectorstep_faster &&
                        tuning_result[i].settings.blocksize_bits == tuning_result[j].settings.blocksize_bits) {
                        // tuning_result[i].passes       += tuning_result[j].passes;
                        // tuning_result[i].elapsed_time += tuning_result[j].elapsed_time;
                        // tuning_result[i].avg           = tuning_result[i].passes / tuning_result[i].elapsed_time;
                        // tuning_result[j].passes       = 0;
                        // tuning_result[j].elapsed_time = 0;
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

            tuning_settings.sample_duration += 4 * sample_duration;
            verbose1( { printf("\rTuning...found %ju options..benchmarking step %ju - tuning %3ju options in %lf seconds",(uintmax_t)tuning_results,(uintmax_t)step, (uintmax_t)i, (double)tuning_results*sample_duration); fflush(stdout); })
            
            counter_t passes       = tuning_result[i].passes;
            double    elapsed_time = tuning_result[i].elapsed_time;

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
    verbose1( {
        printf("\33[2K\r");
        verbose2( { printf("Best result:  "); tuning_result_print(best_result); printf("\n"); } )
    })
    return best_result;
}

void outputBenchmarkStats(benchmark_result_t benchmark_result, counter_t threads)
{
    printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", benchmark_result.settings.sample_duration,benchmark_result.settings.sample_duration*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
    if (option.maxTime!=5.0) printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 5.0, 5.0*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
    if (threads>1) printf("\033[0;32m(Passes per thread (total %ju) - per %.1f seconds: %.1f - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 
                         (uintmax_t)benchmark_result.settings.threads, benchmark_result.settings.sample_duration, option.maxTime*benchmark_result.passes/benchmark_result.elapsed_time/threads, benchmark_result.passes/benchmark_result.elapsed_time/threads);
    fflush(stdout);
}

static void checkSieveWithBenchmarkSettings(benchmark_settings_t benchmark_settings) {
    struct sieve_t* sieve_check = sieve_shake(benchmark_settings.maxFactor, benchmark_settings.blocksize_bits);
    int valid = validatePrimeCount(sieve_check);
    sieve_delete(sieve_check);
    if (!valid) { fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for these settings\n"); exit(1); }
    else {
        verbose3(  printf("valid;\n"); )
    }
}

static void prepareSettingsForOutput(benchmark_settings_t benchmark_settings, char* extension, char* extended_output ) {
    #ifdef _OPENMP
    sprintf(extension,"_epar-u%juv%jub%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_settings.blocksize_bits/1024/8);
    #else
    sprintf(extension,"-u%juv%jub%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_settings.blocksize_bits/1024/8);
    #endif
    
    if (option.extended_output) {
        sprintf(extended_output,"-s%jum%juv%ju", (uintmax_t) benchmark_settings.smallprime_faster,(uintmax_t)benchmark_settings.mediumstep_faster, (uintmax_t)benchmark_settings.vectorstep_faster);
    }
    
    verbose1( { printf("Benchmarking... with settings: %ju/%ju/%ju/%ju/%ju/%ju (stripeprime, mediumstep, vectorstep, wordsize, vector elements, blocksize) and %ju threads for %.1f seconds - Results: (wait %.1lf seconds)...\n", 
              (uintmax_t)benchmark_settings.smallprime_faster, (uintmax_t)benchmark_settings.mediumstep_faster, (uintmax_t)benchmark_settings.vectorstep_faster, 
              (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_settings.blocksize_bits,
              (uintmax_t)benchmark_settings.threads, benchmark_settings.sample_duration, benchmark_settings.sample_duration );
        fflush(stdout);
    })
}




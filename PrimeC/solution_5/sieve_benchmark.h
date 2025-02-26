typedef struct  {
    counter_t maxFactor;
    counter_t blocksize_bits;
    counter_t blocksize_kB;
    counter_t free_bits;
    counter_t smallprime_faster;
    counter_t mediumstep_faster;
    counter_t vectorstep_faster;
    counter_t threads;
    double    sample_duration;
    counter_t passes;
    double    elapsed_time;
    double    avg;
} benchmark_result_t;

typedef struct  {
    counter_t maxFactor;
    counter_t blocksize_bits;
    counter_t blocksize_kB;
    counter_t free_bits;
    counter_t smallprime_faster;
    counter_t mediumstep_faster;
    counter_t vectorstep_faster;
    counter_t threads;
    double    sample_duration;
    counter_t passes;
    double    elapsed_time;
    double    avg;
} benchmark_settings;

static benchmark_result_t benchmarkInit(counter_t threads) {
    benchmark_result_t benchmark_result;
    benchmark_result.sample_duration   = option.maxTime;
    benchmark_result.blocksize_bits    = option.blocksize_bits;
    benchmark_result.smallprime_faster = option.smallprime_faster;
    benchmark_result.mediumstep_faster = option.mediumStep;
    benchmark_result.vectorstep_faster = option.vectorStep; 
    benchmark_result.maxFactor         = option.maxFactor;
    benchmark_result.threads           = threads;
    return benchmark_result;
}

static int compare_tuning_result(const void *a, const void *b) 
{
    benchmark_result_t *resultA = (benchmark_result_t *)a;
    benchmark_result_t *resultB = (benchmark_result_t *)b;
    return (resultB->avg > resultA->avg ? 1 : -1);
}

static void setSettingsFromTuning(benchmark_result_t* benchmark_result, benchmark_result_t* tuning_result) {
    benchmark_result->smallprime_faster = tuning_result->smallprime_faster;
    benchmark_result->mediumstep_faster = tuning_result->mediumstep_faster;
    benchmark_result->vectorstep_faster = tuning_result->vectorstep_faster;
    benchmark_result->blocksize_bits    = tuning_result->blocksize_bits;
}

static void benchmark(benchmark_result_t* tuning_result) 
{
    // don't use VECTORSTEP for steps larger than VECTOR_SIZE
    if (tuning_result->vectorstep_faster > VECTOR_SIZE_counter ) tuning_result->vectorstep_faster = VECTOR_SIZE_counter;

    // set global variables used in the sieve functions
    global_smallprime_faster = tuning_result->smallprime_faster;
    global_MEDIUMSTEP_FASTER = tuning_result->mediumstep_faster;
    global_VECTORSTEP_FASTER = tuning_result->vectorstep_faster;

    // prepare for the benchmark
    double sample_duration = tuning_result->sample_duration * CLOCKS_PER_SEC;
    counter_t passes = 0;
    double elapsed_time = 0;
    const counter_t sieve_size = tuning_result->maxFactor;
    const counter_t blocksize_bits = tuning_result->blocksize_bits;
    const clock_t startTime = clock();
    const double targetTime = startTime + sample_duration;

    #ifdef _OPENMP
    omp_set_num_threads(tuning_result->threads);
    // sample_duration *= tuning_result->threads;
    #pragma omp parallel reduction(+:passes)
    #endif

    // run the benchmark
    while (elapsed_time <= targetTime) {
        struct sieve_t *sieve = sieve_shake(sieve_size, blocksize_bits);
        sieve_delete(sieve);
        elapsed_time = (double)(clock());         
        passes++;
    }

    // calculate results
    elapsed_time -= startTime;
    tuning_result->passes = passes;
    tuning_result->elapsed_time = elapsed_time / CLOCKS_PER_SEC / tuning_result->threads;
    tuning_result->avg = passes/elapsed_time;
}

static inline void tuning_result_print(benchmark_result_t tuning_result) 
{
    printf("blocksize_bits %10ju; blocksize %4jukB; free_bits %5ju; small %4ju; medium %2ju; vector %3ju; passes %3ju; time %f/%f;average %f\n", 
                            (uintmax_t)tuning_result.blocksize_bits, (uintmax_t)tuning_result.blocksize_kB,(uintmax_t)tuning_result.free_bits,
                            (uintmax_t)tuning_result.smallprime_faster,(uintmax_t)tuning_result.mediumstep_faster,(uintmax_t)tuning_result.vectorstep_faster,
                            (uintmax_t)tuning_result.passes, tuning_result.elapsed_time, tuning_result.sample_duration, tuning_result.avg);
}

static benchmark_result_t tune(int tune_level, counter_t maxFactor, counter_t threads, counter_t option_blocksize_kB) 
{
    counter_t best_blocksize_bits = option.sample_duration;

    double best_avg = 0;
    best_blocksize_bits = 0;
    counter_t best_smallprime_faster = 0;
    counter_t best_mediumstep_faster = 0;
    counter_t best_vectorstep_faster = 0;
    counter_t smallprime_faster_steps = 4;
    counter_t mediumstep_faster_steps = 4;
    counter_t vectorstep_faster_steps = 32;
    counter_t freebits_steps = anticiped_cache_line_bytesize;
    double sample_duration = option.sample_duration;

    // determines the size of the resultset
    switch (tune_level) {
        case 1:
            smallprime_faster_steps  = WORD_SIZE*2;
            mediumstep_faster_steps = WORD_SIZE/4;
            vectorstep_faster_steps = VECTOR_SIZE_counter/4;
            freebits_steps = anticiped_cache_line_bytesize*8*2;
            sample_duration = option.sample_duration;
            break;
        case 2:
            smallprime_faster_steps  = WORD_SIZE;
            mediumstep_faster_steps = WORD_SIZE/8;
            vectorstep_faster_steps = VECTOR_SIZE_counter/8;
            freebits_steps = anticiped_cache_line_bytesize*8;
            sample_duration = option.sample_duration*2;
            break;
        case 3:
            smallprime_faster_steps  = WORD_SIZE/2;
            mediumstep_faster_steps = WORD_SIZE/16;
            vectorstep_faster_steps = VECTOR_SIZE_counter/16;
            freebits_steps = anticiped_cache_line_bytesize/2;
            sample_duration =option.sample_duration*4;
            break;
    }
    
    verbose1( { 
        verbose2( printf("\n"); )
        printf("Tuning... compiled for %ju/%ju (word, vector)", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); 
        verbose2( printf(".. best options (shown when found):\n"); )
        fflush(stdout);
    })
    counter_t prime_max = usqrt(maxFactor);

    const size_t max_results = ((prime_max)) * ((size_t)(WORD_SIZE_counter/mediumstep_faster_steps)+1) * ((size_t)(VECTOR_SIZE_counter/vectorstep_faster_steps)+1) * 32 * (size_t)(anticiped_cache_line_bytesize*8*4/freebits_steps);
    benchmark_result_t* tuning_result = malloc(max_results * sizeof(tuning_result));
    counter_t tuning_results=0;
    counter_t tuning_result_index=0;

    for (counter_t smallprime_faster = 0; smallprime_faster <= prime_max; smallprime_faster += smallprime_faster_steps) {
        for (counter_t mediumstep_faster = 0; mediumstep_faster <= WORD_SIZE_counter; mediumstep_faster += mediumstep_faster_steps) {
            for (counter_t vectorstep_faster = 0; vectorstep_faster <= VECTOR_SIZE_counter; vectorstep_faster += vectorstep_faster_steps) { // TODO: start vectorstep at a nice % from mediumstep
                for (counter_t blocksize_kB=128; blocksize_kB>=2; blocksize_kB /= 2) {
                    for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (free_bits < blocksize_kB * 1024 * 8)); free_bits += freebits_steps) {

                        // hack to ovrrule tuning of user setting
                        if (option_blocksize_kB) { blocksize_kB=option_blocksize_kB; free_bits=0; }
                        if (option.vectorStep) { vectorstep_faster = option.vectorStep; }
                        if (option.mediumStep) { mediumstep_faster = option.mediumStep; }
                        if (option.smallprime_faster) { smallprime_faster = option.smallprime_faster; }

                        counter_t blocksize_bits = (blocksize_kB * 1024 * 8) - free_bits;

                        // set variables
                        tuning_results++;
                        tuning_result[tuning_result_index].maxFactor = maxFactor;
                        tuning_result[tuning_result_index].sample_duration = sample_duration;
                        tuning_result[tuning_result_index].blocksize_kB = blocksize_kB;
                        tuning_result[tuning_result_index].free_bits = free_bits;
                        tuning_result[tuning_result_index].blocksize_bits = blocksize_bits;
                        tuning_result[tuning_result_index].smallprime_faster = smallprime_faster;
                        tuning_result[tuning_result_index].mediumstep_faster = mediumstep_faster;
                        tuning_result[tuning_result_index].vectorstep_faster = vectorstep_faster;
                        tuning_result[tuning_result_index].threads = threads;
                        benchmark(&tuning_result[tuning_result_index]);

                        if ( tuning_result[tuning_result_index].avg > best_avg) {
                            best_avg = tuning_result[tuning_result_index].avg;
                            best_blocksize_bits = blocksize_bits;
                            best_smallprime_faster = smallprime_faster;
                            best_mediumstep_faster = mediumstep_faster;
                            best_vectorstep_faster = vectorstep_faster;
                            verbose2( { printf(".(<)"); tuning_result_print(tuning_result[tuning_result_index]); fflush(stdout); } )
                        }
                        verbose3( { printf("...."); tuning_result_print(tuning_result[tuning_result_index]); } )
                        tuning_result_index++;
                        verbose1_at( { printf("\rTuning...tuning %ju options..in %lf seconds  ",(uintmax_t)tuning_results, (double)tuning_results*sample_duration ); fflush(stdout); } )
                        if (option_blocksize_kB) break;
                    }
                    if (option_blocksize_kB) break;
                }
                if (option.vectorStep) break;
            }
            if (option.mediumStep) break;
        }
        if (option.smallprime_faster) break;
    }
    verbose1_at( { printf("\rTuning...tuned %ju options..",(uintmax_t)tuning_results); } )
    verbose2( {
        printf("Finished scan of \033[1;33m%ju\033[0m options. Inital best blocksize: %ju; best blockstep %ju; best mediumstep %ju; best vectorstep %ju\n",(uintmax_t)tuning_results,(uintmax_t)best_blocksize_bits, (uintmax_t)best_smallprime_faster,(uintmax_t)best_mediumstep_faster, (uintmax_t)best_vectorstep_faster);
        printf("Finding the best option by reevaluating the top options with a longer sample duration.\n");
    })

    counter_t tuning_results_max = tuning_results; // keep this value for verbose messages
    for (counter_t step=0; tuning_results>4; step++) {
        qsort(tuning_result, (size_t)tuning_results, sizeof(benchmark_result_t), compare_tuning_result);
        verbose2( {
            printf("\n");
            printf("\r(iteration %1ju) - %ju results left - selecting %ju\n",(uintmax_t)step, (uintmax_t)tuning_results,(uintmax_t)tuning_results/4) ; tuning_result_print(tuning_result[0]); fflush(stdout);
            verbose2( {
                for (tuning_result_index=0; tuning_result_index<min(10,tuning_results); tuning_result_index++) {
                    printf("..."); tuning_result_print(tuning_result[tuning_result_index]);
                }
            })
        })

        tuning_results = tuning_results / 4;
        sample_duration *= 4;

        for (counter_t i=0; i<tuning_results; i++) {
            tuning_result[i].sample_duration = sample_duration;
            verbose1( { printf("\rTuning...found %ju options..benchmarking step %ju - tuning %3ju options in %lf seconds",(uintmax_t)tuning_results_max,(uintmax_t)step, (uintmax_t)i, (double)tuning_results*sample_duration); fflush(stdout); })
            benchmark(&tuning_result[i]);
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
    printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", benchmark_result.sample_duration,benchmark_result.sample_duration*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
    if (option.maxTime!=5.0) printf("\033[0;32m(Passes - per %.1f seconds: \033[1;33m%f\033[0m - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 5.0, 5.0*benchmark_result.passes/benchmark_result.elapsed_time, benchmark_result.passes/benchmark_result.elapsed_time);
    if (threads>1) printf("\033[0;32m(Passes per thread (total %ju) - per %.1f seconds: %.1f - per second \033[1;33m%.1f\033[0;32m)\033[0m\n", 
                         (uintmax_t)threads,  option.maxTime, option.maxTime*benchmark_result.passes/benchmark_result.elapsed_time/threads, benchmark_result.passes/benchmark_result.elapsed_time/threads);
    fflush(stdout);
}

static void checkSieveWithBenchmarkSettings(benchmark_result_t benchmark_result) {
    struct sieve_t* sieve_check = sieve_shake(benchmark_result.maxFactor, benchmark_result.blocksize_bits);
    int valid = validatePrimeCount(sieve_check);
    sieve_delete(sieve_check);
    if (!valid) { fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for these settings\n"); exit(1); }
    else {
        verbose3(  printf("valid;\n"); )
    }
}

static void prepareSettingsForOutput(benchmark_result_t benchmark_result, char* extension, char* extended_output ) {
    #ifdef _OPENMP
    sprintf(extension,"_epar-u%juv%jub%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_result.blocksize_bits/1024/8);
    #else
    sprintf(extension,"-u%juv%jub%ju", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_result.blocksize_bits/1024/8);
    #endif
    
    if (option.extended_output) {
        sprintf(extended_output,"-s%jum%juv%ju", (uintmax_t) benchmark_result.smallprime_faster,(uintmax_t)benchmark_result.mediumstep_faster, (uintmax_t)benchmark_result.vectorstep_faster);
    }
    
    verbose1( { printf("Benchmarking... with settings: %ju/%ju/%ju/%ju/%ju/%ju (blockstep, mediumstep, vectorstep, wordsize, vector elements, blocksize) and %ju threads for %.1f seconds - Results: (wait %.1lf seconds)...\n", 
              (uintmax_t)benchmark_result.smallprime_faster, (uintmax_t)benchmark_result.mediumstep_faster, (uintmax_t)benchmark_result.vectorstep_faster, 
              (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS, (uintmax_t)benchmark_result.blocksize_bits,
              (uintmax_t)threads, benchmark_result.sample_duration, benchmark_result.sample_duration );
        fflush(stdout);
    })
}






#if COMPILE_EXPLAIN
static void explainSieveShake(benchmark_settings_t benchmark_settings) 
{
    benchmark_settings = checkBenchmarkSettings(benchmark_settings);
    prepareBenchmarkGlobals(benchmark_settings);

    debug_final_benchmarking = 1;
    struct sieve_t* sieve = shakeSieve(benchmark_settings.factor_max);
    debug_final_benchmarking = 0;

    printf("\nResult set:\n");
    option.verbose_level = 3; // set back to 3 because we don't need explanations anymore
    if (option.show_explain_factor_max) {
        showPrimesinSieve(sieve, option.show_explain_factor_max);
    }
    int valid = validateSieve(sieve, benchmark_settings.factor_max);
    if (!valid) {
        printf("The sieve is \033[0;31m\033[5mNOT\033[0;0m valid...\n");
        deepAnalyzeSieve(sieve);
    }
    else {
        printf("The sieve is \033[0;32mvalid\033[0;0m\n");
    }
    sieve_delete(sieve);

    printf("Hits: %ju\n",(uintmax_t)debug_hits);
    #ifdef COMPILE_TIMERS
    if (option.timers) print_timing_table();
    #endif
}

#endif

static int checkSieveAlgorithm(benchmark_settings_t benchmark_settings)
{
    verbose2( { 
        printf("Validating variant u%juv%ju... ", (uintmax_t)WORD_SIZE_BITS, (uintmax_t)VECTOR_ELEMENTS); 
        verbose3( printf("\n");) 
    })

    char settings_string[50] = ""; 

    // validate algorithm - run one time for all sizes
    for (counter_t sieveSize_check = 100; sieveSize_check <= 1000000; sieveSize_check *=10) {
        verbose3( {
            printf("..Checking size %ju ...",(uintmax_t)sieveSize_check); 
            verbose4( printf("\n"); )
        })
        for (counter_t blocksize_bits=1024; blocksize_bits<=32*1024*8; blocksize_bits *= 2) {
            verbose4( printf("....Blocksize %ju:",(uintmax_t)blocksize_bits); )
            benchmark_settings.blocksize_bits = blocksize_bits;
            benchmark_settings.factor_max = sieveSize_check;
            benchmark_settings = checkBenchmarkSettings(benchmark_settings);
            setBenchmarkSettingAsString(settings_string, benchmark_settings);

            int valid = checkSieveWithBenchmarkSettings(benchmark_settings); 

            if (!valid) {
                verbose1( fprintf(stderr,"Invalid count for %ju Settings used: %s\n",(uintmax_t)sieveSize_check, settings_string); )
                return valid;
            }
            else {
                verbose4( printf("\033[0;32mvalid\033[0;0m for %ju Settings used: %s\n", (uintmax_t)sieveSize_check, settings_string); )
            }
        }
        verbose3( printf("\033[0;32mvalid\033[0;0m for %ju Settings used: %s\n", (uintmax_t)sieveSize_check, settings_string); )
    }
    verbose2( printf("\033[0;32mvalid\033[0;0m algorithm\n"); )
    
    return 1;
}

static void showResult(benchmark_settings_t benchmark_settings)
{
    verbose2( printf("Show result set:\n"); )
    struct sieve_t* sieve = shakeSieve(benchmark_settings.factor_max);
    showPrimesinSieve(sieve, option.show_explain_factor_max);
    sieve_delete(sieve);
}


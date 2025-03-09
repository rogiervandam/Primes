

#if COMPILE_EXPLAIN
static void explainSieveShake(benchmark_settings_t benchmark_settings) 
{
    benchmark_settings = check_benchmark_settings(benchmark_settings);
    prepareBenchmarkGlobals(benchmark_settings);

    debug_final_benchmarking = 1;
    struct sieve_t* sieve = sieve_shake(benchmark_settings.factor_max);
    debug_final_benchmarking = 0;

    printf("\nResult set:\n");
    option.verbose_level = 3; // set back to 3 because we don't need explanations anymore
    if (option.show_explain_factor_max) {
        show_primes(sieve, min(option.show_explain_factor_max, 100));
    }
    int valid = validatePrimeCount(sieve, benchmark_settings.factor_max);
    if (!valid) printf("The sieve is \033[0;31m\033[5mNOT\033[0;0m valid...\n");
    else printf("The sieve is \033[0;32mvalid\033[0;0m\n");
    sieve_delete(sieve);
    printf("Hits: %ju\n",(uintmax_t)debug_hits);
    if (option.timers) print_timing_table();
}
#endif

static void deepAnalyzePrimes(struct sieve_t *sieve) 
{
    printf("DeepAnalyzing\n");
    counter_t warn_prime = 0;
    counter_t warn_nonprime = 0;
    for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
        if ((sieve->bitstorage[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
            for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
                    if (warn_prime++ < 30) printf("Number %ju (%ju) was marked prime, but %ju * %ju = %ju\n", (uintmax_t)prime*2+1, (uintmax_t)prime, (uintmax_t)c*2+1, (uintmax_t)((prime*2+1)/(c*2+1)), (uintmax_t)prime*2+1 );
                }
            }
        }
        else {
            counter_t c_prime = 0;
            for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
            }
            if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju) was marked non-prime, but no factors found. So it is prime\n", (uintmax_t)prime*2+1,(uintmax_t) prime);
        }
    }
}

static void checkSieveAlgorithm(benchmark_settings_t benchmark_settings)
{
    verbose2( { 
        printf("Validating variant u%juv%ju... ", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); 
        verbose3( printf("\n");) 
    })

    char settings_string[100] = ""; 

    // validate algorithm - run one time for all sizes
    for (counter_t sieveSize_check = 100; sieveSize_check <= 1000000; sieveSize_check *=10) {
        verbose3( {
            printf("..Checking size %ju ...",(uintmax_t)sieveSize_check); 
            verbose4( printf("\n"); )
        })
        struct sieve_t *sieve_check;
        for (counter_t blocksize_bits=1024; blocksize_bits<=32*1024*8; blocksize_bits *= 2) {
            verbose4( printf("....Blocksize %ju:",(uintmax_t)blocksize_bits); )
            benchmark_settings.blocksize_bits = blocksize_bits;
            benchmark_settings.factor_max = sieveSize_check;

            benchmark_settings = check_benchmark_settings(benchmark_settings);
            benchmark_settings_as_string(settings_string, benchmark_settings);

            int valid = checkSieveWithBenchmarkSettings(benchmark_settings); 

            // printf("Bitstorage is %s\n", is_aligned(sieve_check->bitstorage, anticiped_cache_line_bytesize) ? "aligned" : "not aligned");
            // printf("Sieve is %s\n", is_aligned(sieve_check, anticiped_cache_line_bytesize) ? "aligned" : "not aligned");

            if (!valid) {
                fprintf(stderr,"Invalid count for %ju Settings used: %s\n",(uintmax_t)sieveSize_check, settings_string);
                exit(1); 
            }
            else {
                verbose4( printf("\033[0;32mvalid\033[0;0m for %ju Settings used: %s\n", (uintmax_t)sieveSize_check, settings_string); )
            }
        }
        verbose3( printf("\033[0;32mvalid\033[0;0m for %ju Settings used: %s\n", (uintmax_t)sieveSize_check, settings_string); )
    }
    verbose2( printf("\033[0;32mvalid\033[0;0m algorithm\n"); )
    
    if (option.check == 2) exit(0);
}

static void showResult(benchmark_settings_t benchmark_settings)
{
    printf("Show result set:\n");
    struct sieve_t* sieve = sieve_shake(benchmark_settings.factor_max);
    show_primes(sieve, option.show_explain_factor_max);
    sieve_delete(sieve);
}


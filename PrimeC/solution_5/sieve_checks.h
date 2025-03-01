static void show_primes(struct sieve_t *sieve, counter_t factor_max) 
{
    counter_t primeCount = 1;    // We already have 2
    for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitstorage, factor)) {
        primeCount++;
        if (factor < factor_max/2) {
            printf("%3ju ",(uintmax_t)factor*2+1);
            if (primeCount % 10 == 0) printf("\n");
        }
    }
    printf("\nFound %ju primes until %ju\n",(uintmax_t)primeCount, (uintmax_t)sieve->bits*2+1);
}

static counter_t count_primes(struct sieve_t *sieve) 
{
    counter_t primeCount = 1;
    for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitstorage, factor)) primeCount++;
    return primeCount;
}

// 
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

static int validatePrimeCount(struct sieve_t *sieve) 
{
    counter_t primecount = count_primes(sieve);
    counter_t valid_primes = 0;
    switch(sieve->size) {
        case 10:            valid_primes = 4;         break;
        case 100:           valid_primes = 25;        break;
        case 1000:          valid_primes = 168;       break;
        case 10000:         valid_primes = 1229;      break;
        case 100000:        valid_primes = 9592;      break;
        case 1000000:       valid_primes = 78498;     break;
        case 10000000:      valid_primes = 664579;    break;
        case 100000000:     valid_primes = 5761455;   break;
        case 1000000000:    valid_primes = 50847534;  break;
        case 10000000000:   valid_primes = 455052511; break;
        default:            valid_primes= 0;
    }

    int valid = (valid_primes == primecount);
    verbose4( if (valid) printf("Result: Sievesize %ju is expected to have %ju primes. algorithm produced %ju primes\n",(uintmax_t)sieve->size,(uintmax_t)valid_primes,(uintmax_t)primecount ); )
    verbose1( if (!valid) {
        printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produced %ju primes\n",(uintmax_t)sieve->size,(uintmax_t)valid_primes,(uintmax_t)primecount );
        verbose2( show_primes(sieve, option.show_primes_on_error); )
        verbose2( deepAnalyzePrimes(sieve); )
    })
    return (valid);
}

#if compile_verbose_level >= 4
static void explainSieveShake() 
{
    // warm up
    // int org_option_explain = option.explain;
    // option.explain = 0;
    // for (int i=0; i<10; i++) {
    //     struct sieve_t* sieve = sieve_shake(option.factor_max, default_blocksize);
    //     sieve_delete(sieve);
    // }    
    // option.explain = org_option_explain;

    struct sieve_t* sieve = sieve_shake(option.factor_max, option.blocksize_bits);
    printf("\nResult set:\n");
    show_primes(sieve, min(option.showMaxFactor,100));
    int valid = validatePrimeCount(sieve);
    if (!valid) printf("The sieve is \033[0;31m\033[5mNOT\033[0;0m valid...\n");
    else printf("The sieve is \033[0;mVALID\033[0;0m\n");
    sieve_delete(sieve);
}
#endif


// Controleert of een gegeven pointer uitgelijnd is op een bepaalde bytegrens
static int is_aligned(void *ptr, size_t alignment) {
    return ((uintptr_t)ptr % alignment) == 0;
}


static void checkSieveAlgorithm(benchmark_settings_t benchmark_settings)
{
    verbose1( { 
        printf("Validating variant u%juv%ju... ", (uintmax_t)WORD_SIZE_counter, (uintmax_t)VECTOR_ELEMENTS); 
        verbose2( printf("\n");)
        fflush(stdout); 
    })

    prepareBenchmarkGlobals(benchmark_settings);
    char settings_string[100] = ""; benchmark_settings_as_string(settings_string, benchmark_settings);

    // validate algorithm - run one time for all sizes
    for (counter_t sieveSize_check = 100; sieveSize_check <= 100000000; sieveSize_check *=10) {
        verbose2( {
            printf("..Checking size %ju ...",(uintmax_t)sieveSize_check); 
            verbose(3) printf("\n");
            fflush(stdout); 
        })
        struct sieve_t *sieve_check;
        for (counter_t blocksize_bits=1024; blocksize_bits<=256*1024*8; blocksize_bits *= 2) {
            verbose(3) printf("....Blocksize %ju:",(uintmax_t)blocksize_bits);
            global_blocksize_bits = blocksize_bits;

            sieve_check = sieve_shake(sieveSize_check);
            int valid = validatePrimeCount(sieve_check);

            // printf("Bitstorage is %s\n", is_aligned(sieve_check->bitstorage, anticiped_cache_line_bytesize) ? "aligned" : "not aligned");
            // printf("Sieve is %s\n", is_aligned(sieve_check, anticiped_cache_line_bytesize) ? "aligned" : "not aligned");
            

            sieve_delete(sieve_check);
            if (!valid) {
                fprintf(stderr,"Invalid count for %ju Settings used: %s\n",(uintmax_t)sieveSize_check, settings_string);
                exit(1); 
            }
            else verbose(3) printf("\033[0;32mvalid\033[0;0m\n");
        }
        verbose2( printf("\033[0;32mvalid\033[0;0m\n"); )
    }
    verbose1( printf("\033[0;32mvalid\033[0;0m algorithm\n"); )
    if (option.check == 2) exit(0);
}

static void showResult(benchmark_settings_t benchmark_settings)
{
    printf("Show result set:\n");
    struct sieve_t* sieve = sieve_shake(benchmark_settings.factor_max);
    show_primes(sieve, option.show_explain_factor_max);
    sieve_delete(sieve);
}

static void checkSieveWithBenchmarkSettings(benchmark_settings_t benchmark_settings) {
    struct sieve_t* sieve_check = sieve_shake(benchmark_settings.factor_max);
    int valid = validatePrimeCount(sieve_check);
    sieve_delete(sieve_check);
    if (!valid) { fprintf(stderr, "The sieve is \033[0;31mNOT\033[0m valid for these settings\n"); exit(1); }
    else {
        verbose3(  printf("valid;\n"); )
    }
}

static counter_t count_primes(struct sieve_t *sieve) 
{
    counter_t primecount = 1;
    for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitstorage, factor)) primecount++;
    return primecount;
}

static void show_primes(struct sieve_t *sieve, counter_t factor_max) 
{
    counter_t primecount = 1;    // We already have 2
    for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitstorage, factor)) {
        primecount++;
        if (factor < factor_max/2) {
            verbose2( printf("%3ju ",(uintmax_t)factor*2+1); )
            if (primecount % 10 == 0) { verbose2( printf("\n"); ) }
        }
    }
    verbose1( printf("\nFound %ju primes until %ju\n",(uintmax_t)primecount, (uintmax_t)sieve->bits*2+1); )
}

static void deepAnalyzePrimes(struct sieve_t *sieve) 
{
    verbose2( printf("DeepAnalyzing\n"); )
    counter_t warn_prime = 0;
    counter_t warn_nonprime = 0;
    for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
        if ((sieve->bitstorage[wordindex(prime)] & markmask(prime))==0) { // is this a prime?
            for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
                    if (warn_prime++ < 30) {
                        verbose2( printf("Factor %ju was marked prime, but %ju * %ju = %ju (in prime/2: %ju,%ju and %ju)\n",
                         (uintmax_t)prime*2+1, (uintmax_t)c*2+1, (uintmax_t)((prime*2+1)/(c*2+1)), (uintmax_t)prime*2+1, 
                         (uintmax_t)c, (uintmax_t)((prime*2+1)/(c*2+1)/2),(uintmax_t)prime); )
                    }
                }
            }
        }
        else {
            counter_t c_prime = 0;
            for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
                if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
            }
            if (c_prime==0 && warn_nonprime++ < 30) {
                verbose2( printf("Number %ju (%ju) was marked non-prime, but no factors found. So it is prime\n", 
                    (uintmax_t)prime*2+1,(uintmax_t) prime); )
            }
        }
    }
}

static inline int validatePrimeCount(struct sieve_t *sieve, counter_t factor_max)
{
    counter_t primecount = count_primes(sieve);
    counter_t valid_primes = 0;
    switch(factor_max) {
        case 10:            valid_primes = 4;         break;
        case 100:           valid_primes = 25;        break;
        case 1000:          valid_primes = 168;       break;
        case 10000:         valid_primes = 1229;      break;
        case 100000:        valid_primes = 9592;      break;
        case 1000000:       valid_primes = 78498;     break;
        case 10000000:      valid_primes = 664579;    break;
        case 100000000:     valid_primes = 5761455;   break;
        #if COUNTER_T_MAX_SAFE_VALUE >= 10000000000ULL
        case 1000000000:    valid_primes = 50847534;  break;
        case 10000000000:   valid_primes = 455052511; break;
        #endif
        default:            valid_primes= 0;
    }

    return (valid_primes == primecount);
}


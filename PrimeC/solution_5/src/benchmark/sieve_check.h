static counter_t __attribute__((cold, nonnull)) 
countPrimesInSieve(struct sieve_t *sieve, counter_t factor_max) 
{
    verbose5( printf("Counting primes in sieve up to %ju\n",(uintmax_t)factor_max); )
    counter_t prime_count = 0;
    for (counter_t factor=2; factor < factor_max; factor++) {
        if (!checkFactor(sieve, factor)) prime_count++;
    }
    verbose5( printf("Result: %ju primes in sieve up to %ju\n",(uintmax_t)prime_count,(uintmax_t)factor_max); )
    return prime_count;
}

static void __attribute__((cold, nonnull)) 
showPrimesinSieve(struct sieve_t *sieve, counter_t factor_max) 
{ 
    verbose1( printf("Result set (<%ju):\n",(uintmax_t)factor_max); )
    counter_t prime_count = 0;
    for (counter_t factor=2; factor < factor_max; factor++) {
        if (checkFactor(sieve, factor)) continue; // is this a prime?
        prime_count++;
        verbose1( printf("%4ju ",(uintmax_t)factor); )
        if (prime_count % 10 == 0) { verbose2( printf("\n"); ) }
    }
    verbose1( printf("\n"); )
}

counter_t validPrimes(counter_t factor_max) {
    switch(factor_max) {
        case 10:            return 4;         break;
        case 100:           return 25;        break;
        case 1000:          return 168;       break;
        case 10000:         return 1229;      break;
        case 100000:        return 9592;      break;
        case 1000000:       return 78498;     break;
        case 10000000:      return 664579;    break;
        case 100000000:     return 5761455;   break;
        #if COUNTER_T_MAX_VALUE >= 10000000000ULL
        case 1000000000:    return 50847534;  break;
        case 10000000000:   return 455052511; break;
        #endif
        default:            return 0;
    }
}

static void __attribute__((cold, nonnull)) 
deepAnalyzeSieve(struct sieve_t *sieve, counter_t factor_max) 
{
    verbose2( printf("\nDeepAnalyzing...\n"); )
    verbose2( printf("Checking if the numbers up to " COLOR_BOLD_YELLOW "%ju" COLOR_RESET " are correctly marked as prime or non-prime\n",(uintmax_t)factor_max); )
    verbose2( printf("Prime count is " COLOR_BOLD_YELLOW "%ju" COLOR_RESET " and should be " COLOR_BOLD_YELLOW "%ju" COLOR_RESET "\n", (uintmax_t)countPrimesInSieve(sieve, factor_max), (uintmax_t)validPrimes(factor_max)); )
    verbose2( printf("\n"); )
    showPrimesinSieve(sieve, option.show_primes_on_error);

    verbose2( printf("\nErrors:\n"); )

    counter_t warn_prime = 0;
    counter_t warn_nonprime = 0;
    for (counter_t prime = 2; prime < factor_max; prime++ ) {
        if (!checkFactor(sieve, prime)) { // is this a prime?
            for(counter_t c = 2; c <= factor_max && c*c <= prime; c++) {
                if ((prime % c) == 0 && (c != prime)) {
                    if (warn_prime++ < option.show_nonprimes_on_error) {
                        verbose2( printf("Number " COLOR_RED "%4ju" COLOR_RESET " was marked prime, but %4ju * %4ju = " COLOR_RED "%4ju" COLOR_RESET "\n",
                         (uintmax_t)prime, (uintmax_t)c, (uintmax_t)(prime/c), (uintmax_t)prime ); )
                    }
                }
            }
        }
        else {
            counter_t c_prime = 0;
            for(counter_t c=1; c<=sieve->bits && c*c <= prime; c++) {
                if ((prime) % (c) == 0 && (c) != (prime)) c_prime++;
            }
            if (c_prime == 0 && warn_nonprime++ < option.show_nonprimes_on_error) {
                verbose2( printf("Number " COLOR_RED "%4ju" COLOR_RESET " was marked non-prime, but no factors found. So it is prime\n", 
                    (uintmax_t)prime); )
            }
        }
    }
}

static inline int __attribute__((cold, nonnull)) 
validateSieve(struct sieve_t *sieve, const counter_t factor_max)
{
    const counter_t prime_count = countPrimesInSieve(sieve, factor_max);
    return (prime_count == validPrimes(factor_max));
}


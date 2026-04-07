#ifndef CHECK_FACTOR
#define CHECK_FACTOR

// This function decouples the factor from the bitstorage
static inline int checkFactor(void* restrict bitstorage, counter_t factor) {
    if (factor > 2 && factor % 2 == 0) return 1;
    return checkBitTrue(bitstorage, factor/2);
}

#endif

static counter_t __attribute__((cold, nonnull)) 
countPrimesInSieve(struct sieve_t *sieve, counter_t factor_max) 
{
    verbose5( printf("Counting primes in sieve up to %ju\n",(uintmax_t)factor_max); )
    counter_t prime_count = 0;
    for (counter_t factor=2; factor < factor_max; factor++) {
        if (!checkFactor(sieve->bitstorage, factor)) prime_count++;
    }
    verbose5( printf("Result: %ju primes in sieve up to %ju\n",(uintmax_t)prime_count,(uintmax_t)factor_max); )
    return prime_count;
}

static void __attribute__((cold, nonnull)) 
showPrimesinSieve(struct sieve_t *sieve, counter_t factor_max) 
{ 
    verbose1( printf("Result set:\n"); )
    counter_t prime_count = 0;
    for (counter_t factor=2; factor < factor_max; factor++) {
        if (checkFactor(sieve->bitstorage, factor)) continue; // is this a prime?
        prime_count++;
        verbose1( printf("%3ju ",(uintmax_t)factor); )
        if (prime_count % 20 == 0) { verbose2( printf("\n"); ) }
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
    uint8_t *bitstorage = sieve->bitstorage;

    verbose2( printf("DeepAnalyzing\n"); )
    verbose2( printf("Checking if the numbers up to %ju are correctly marked as prime or non-prime\n",(uintmax_t)factor_max); )
    verbose2( printf("Prime count is %ju and should be %ju \n", (uintmax_t)countPrimesInSieve(sieve, factor_max), (uintmax_t)validPrimes(sieve->bits)); )
    verbose2( printf("\n"); )
    showPrimesinSieve(sieve, 100);

    counter_t warn_prime = 0;
    counter_t warn_nonprime = 0;
    for (counter_t prime = 2; prime < factor_max; prime++ ) {
        if (!checkFactor(bitstorage, prime)) { // is this a prime?
            for(counter_t c = 2; c <= factor_max && c*c <= prime; c++) {
                if ((prime % c) == 0 && (c != prime)) {
                    if (warn_prime++ < 30) {
                        verbose2( printf("Factor %ju was marked prime, but %ju * %ju = %ju (in bits: %ju, %ju and %ju)\n",
                         (uintmax_t)prime, (uintmax_t)c, (uintmax_t)(prime/c), (uintmax_t)prime, 
                         (uintmax_t)c, (uintmax_t)(prime/c),(uintmax_t)prime); )
                    }
                }
            }
        }
        else {
            counter_t c_prime = 0;
            for(counter_t c=1; c<=sieve->bits && c*c <= prime; c++) {
                if ((prime) % (c) == 0 && (c) != (prime)) c_prime++;
            }
            if (c_prime == 0 && warn_nonprime++ < 30) {
                verbose2( printf("Number %ju (%ju) was marked non-prime, but no factors found. So it is prime\n", 
                    (uintmax_t)prime,(uintmax_t) prime); )
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


// static unsigned int wheel[WHEEL_SIZE/2];
static unsigned int wheel_primes[WHEEL_MAX + 1]; // can't be more than highest prime in the wheel

#define wheeltype_t uint8_t

static wheeltype_t wheelmask[(index_type(WHEEL_SIZE, wheeltype_t)+1)/2];
void build_wheel() {
    // find all the primes in the wheel up to WHEEL_MAX and store them
    for (counter_t i = 0; i <= WHEEL_MAX; i++) {
        wheel_primes[i] = i < 2;
        for (counter_t f = 2; f < i; f++) {
            if ((i % f) == 0) {
                wheel_primes[i] = 1; // mark as non-prime
                break;
            }
        }
    }

    // clear the wheelmask
    for (counter_t i=0; i < (index_type(WHEEL_SIZE, wheeltype_t)+1)/2; i++) {
        wheelmask[i] = 0; 
    }

    // make a mask pattern to check if the modulus WHEEL_SIZE/2 of a number is divisible by any of the primes in the wheel
    // this is used in checkBitTrue_wheel to quickly check if a number is divisible by any of the wheel primes
    for (counter_t i = 0; i < WHEEL_SIZE/2; i++) {
        for (counter_t f = 1; f <= WHEEL_MAX/2; f++) {
            if (((i*2+1)+WHEEL_SIZE) % (f*2+1) == 0) {
                wheelmask[index_type(i, wheeltype_t)] |= markmask_type(i, wheeltype_t);
                break;
            }
        }
    }

    counter_t wheelmask_count = 0;
    for (counter_t i=0; i <= index_type(WHEEL_SIZE, wheeltype_t)/2; i++) {
        wheelmask_count += __builtin_popcount(wheelmask[i]);
    }
    sprintf(algorithm_name, "rogiervandam_wheel_%uof%u", (WHEEL_SIZE/2)-wheelmask_count, WHEEL_SIZE);

}

static inline uint8_t __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
checkBitTrue_wheel(const void* restrict bitstorage, register counter_t factor) 
{
    uint8_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t index = factor >> 1;
    counter_t wheelindex = index % (WHEEL_SIZE/2);
    if (wheelmask[index_type(wheelindex, uint8_t)] & markmask_type(wheelindex, uint8_t)) return 1;
    // if (wheel[wheelindex]) return 1;
    return (bitstorage_sized[index_type(index, uint8_t)] & markmask_type(index, uint8_t));
}

static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes)))
markFactors_wheel(sieve_t *sieve, const counter_t start, const counter_t stop, const counter_t step)
{
    logStart5(sieve->bitstorage, time_markFactors_wheel, "Markfing with wheel range %ju - %ju, step %ju", start >> 1, stop >> 1, step >> 1);
    setBitsTrue(sieve->bitstorage, start >> 1, stop >> 1, step >> 1);
    logStop5(sieve->bitstorage, time_markFactors_wheel, "Finished marking with wheel range %ju - %ju, step %ju", start >> 1, stop >> 1, step >> 1);
}

uint8_t checkFactor_wheel(sieve_t* sieve, register counter_t factor) {
    if (factor > 2 && factor % 2 == 0) return 1;
    if (factor <= WHEEL_MAX) return wheel_primes[factor];
    return checkBitTrue_wheel(sieve->bitstorage, factor);
}

static inline counter_t __attribute__((always_inline, hot, nonnull, const))
findUnmarked_wheel(sieve_t *sieve, register counter_t factor)
{
    #pragma GCC ivdep
    #pragma GCC unroll 4
    for (; checkFactor_wheel(sieve, factor += 2););
    return factor;
}



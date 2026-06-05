#if defined include_once_first //---- include this once before all variants

    #define wheelvariant uint8
    #define wheelvariant_suffix NAME(_,wheelvariant)
    #define wheelmask_t NAME(wheelvariant, _t)
    #define unroll_suffix NAME(_unroll,8)
    #define wheelvariant_unroll_suffix NAME(wheelvariant_suffix, unroll_suffix)

    #ifndef WHEEL_MAX                           // the wheel might be defined externally to allow for different wheel sizes
        #define WHEEL_MAX 5                     // WHEEL_MAX is the largest prime in the wheel, and determines the size of the wheel. 
        #define WHEEL_BASIC_SIZE (2 * 3 * 5 )   // the size of the wheel before repetition, must be a multiple of the product of the primes in the wheel (WHEEL_MAX#) 
        #define WHEEL_REPEATS 1                 // the number of times the wheel is repeated, which might help alignment with bytes/vectors/cachelines
        #define WHEEL_STRIPES 8                 // the number of places for potential primes in each repetition of the wheel, this determines how many bits we need

    #endif
    #define WHEEL_SIZE                  (WHEEL_BASIC_SIZE * WHEEL_REPEATS)
    #define WHEEL_STRIPE_BITS           (((WHEEL_STRIPES * WHEEL_REPEATS - 1) / bitcount_type(wheelmask_t) + 1) * bitcount_type(wheelmask_t)) 

    // #define wheel_bitcount_single    (WHEEL_STRIPES)                 // the number of stripes in the wheel
    #define wheel_bitcount              (WHEEL_STRIPES * WHEEL_REPEATS) // the number of bits mapped to numbers in the wheel (there can be unmapped ones too)
    #define wheel_bitalloc              (WHEEL_STRIPE_BITS)             // the number of bits reserved for each repetition of the wheel
    #define wheel_aligned_type(type)    (bitcount_type(type) % wheel_bitcount == 0 || wheel_bitcount % bitcount_type(type) == 0) // whether the wheel stripes align with the bitbuckets, which allows for more efficient marking
    #define wheel_multiplier(type)      (wheel_bitcount >= bitcount_type(type) ? (wheel_bitcount / bitcount_type(type)) : reduce2power(wheel_bitcount)) // how many bitbuckets we need to combine to get a full wheel stripe, this is used for marking when the wheel stripes do not align with the bitbuckets

    #include "../sieve/sieve_calc.h"

    static uint8_t     wheel_primes     [WHEEL_MAX+1];    // which primes are in the wheel
    static counter_t   wheel_number     [wheel_bitalloc]; // contains the mapping from bit to number: the nth bit corresponds to the wheel_number[n] number in the wheel
    static counter_t   wheel_bit        [WHEEL_SIZE];     // the number of shifts needed to get the bitmask for this index to the right position in the bitbucket. 
                                                          // Might be greater than the number of bits in wheelmask_t, in which case we need to forward to the next bitbucket(s) as well

    // Runtime path: compute wheel data from scratch.
    void buildWheel() {
        // find all the primes in the wheel up to WHEEL_MAX and store them - used by checkFactor when the factor is smaller than WHEEL_MAX
        for (counter_t i = 0; i < WHEEL_MAX; i++) {
            wheel_primes[i]=0;
            for (counter_t f = 2; f < i; f++) {
                if ((i % f) == 0) wheel_primes[i] = 1; // mark the index of a non-prime
            }
        }

        // make a mask pattern to check if the modulus WHEEL_SIZE/2 of a number is divisible by any of the primes in the wheel
        // this is used in checkBitTrue_wheel to quickly check if a number is divisible by any of the wheel primes
        counter_t stripe_count = 0;
        for (counter_t i = 0; i < WHEEL_SIZE; i++) {
            wheel_bit[i] = stripe_count; // default to -1, meaning the number is divisible by a wheel prime, and we will find the nearest non-divisible number by looking forward in the wheel_bit array until we find a non-negative value
            for (counter_t f = 2; f <= WHEEL_MAX; f++) { // for each factor, try if it divides the number corresponding to this index in the wheel
                if (((i + WHEEL_SIZE) % f) == 0) {
                    wheel_bit[i] = - 1 - stripe_count; // negative to approximate the position for estimations
                }
            }
            if (wheel_bit[i] >= 0) { // when no factors found
                wheel_bit[i] = stripe_count;
                wheel_number[stripe_count] = i;
                // wheel_mask[i] = markmask_type(stripe_count, wheelmask_t);
                stripe_count++;
            }
        }
        for (; stripe_count < wheel_bitalloc; stripe_count++) {
            wheel_number[stripe_count] = WHEEL_SIZE - 1; // refer the rest to the end of the wheel
        }

        verbose2 (printf("Wheel size: %u, Wheel stripes: %ju, Wheel stripe bytes: %ju Wheel stripe bits: %ju Wheel max: %ju\n", WHEEL_SIZE, (uintmax_t)wheel_bitalloc, (uintmax_t)wheel_bitalloc/8, (uintmax_t)wheel_bitalloc, (uintmax_t)WHEEL_MAX) );

        // register the wheel data in the sieve_calc storage table for the wheel storage type, so that it can be used in the generic calculations for the benchmark settings
        storage_table[STORAGE_WHEEL] = (storage_specs){ STORAGE_WHEEL, WHEEL_STRIPE_BITS, WHEEL_SIZE, WHEEL_MAX };
};
    
#endif
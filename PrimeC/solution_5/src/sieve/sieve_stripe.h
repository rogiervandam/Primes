
static inline counter_t __attribute__((always_inline)) stripeSieveBlock(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max) {
    verbose5(  printf("\nBlock stripe (new) for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop); )
    timer_lapstart(time_sieveStripeBlock);

    const counter_t prime_stripe_start_beyond_block_stop = prime_stop(block_stop) ;
    const counter_t prime_vectorpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, VECTOR_SIZE_BITS);
    const counter_t prime_wordpattern_not_repeating_in_block = prime_pattern_not_repeating_in_block(block_start, block_stop, WORD_SIZE_BITS*3);
    // const counter_t prime_wordpattern_not_repeating_in_block = prime_max;

    const counter_t prime_endloop5 = min(prime_max, prime_stripe_start_beyond_block_stop);
    const counter_t prime_endloop4 = min(prime_endloop5, prime_wordpattern_not_repeating_in_block);
    const counter_t prime_endloop3 = min(min(min(prime_endloop4, prime_vectorpattern_not_repeating_in_block), VECTOR_SIZE_BITS/2),  global_largestep_faster/2);
    const counter_t prime_endloop2 = min(prime_endloop3, VECTORWORD_SIZE_BITS/2);  
    const counter_t prime_endloop1 = min(prime_endloop2, global_mediumstep_faster/2);
 
    counter_t prime = prime_start;

    verbose5( printf("Plan: start with factor %ju up to %ju using range %ju - %ju:\n", (uintmax_t)prime_start*2+1, (uintmax_t)prime_max*2+1, (uintmax_t)block_start, (uintmax_t)block_stop ); )
    verbose5( if(prime_start    < prime_endloop1) printf("(1) Factor %4ju - %4ju : Use vectors with rolling words (bitsize %4ju up to %4ju)\n", (uintmax_t)prime_start    *2+1, (uintmax_t)prime_endloop1 *2+1, (uintmax_t)prime_start,    (uintmax_t)prime_endloop1); )
    verbose5( if(prime_endloop1 < prime_endloop2) printf("(2) Factor %4ju - %4ju : Use repeating wordsize masks   (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop1,prime_start) *2+1, (uintmax_t)prime_endloop2 *2+1, (uintmax_t)prime_endloop1, (uintmax_t)prime_endloop2); )
    verbose5( if(prime_endloop2 < prime_endloop3) printf("(3) Factor %4ju - %4ju : Use vectors with large steps   (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop2,prime_start) *2+1, (uintmax_t)prime_endloop3 *2+1, (uintmax_t)prime_endloop2, (uintmax_t)prime_endloop3); )
    verbose5( if(prime_endloop3 < prime_endloop4) printf("(4) Factor %4ju - %4ju : Use repeating word masks       (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop3,prime_start) *2+1, (uintmax_t)prime_endloop4 *2+1, (uintmax_t)prime_endloop3, (uintmax_t)prime_endloop4); )
    verbose5( if(prime_endloop4 < prime_endloop5) printf("(5) Factor %4ju - %4ju : Use setting bit one by one     (bitsize %4ju up to %4ju)\n", (uintmax_t)max(prime_endloop4,prime_start) *2+1, (uintmax_t)prime_endloop5 *2+1, (uintmax_t)prime_endloop4, (uintmax_t)prime_endloop5); )
    timer_laptime(time_sieveStripeBlock); verbose7( printf("\n"); )

    // the < instad of <= is to prevent the last prime to be processed in all the loop
    // the implication is that the prime_endloop must be met step/2, not spep/2-1

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);
        setBitsTrue(bitstorage, start, step, block_stop);
        prime = searchBitFalse(bitstorage, prime);
    }

    // while (prime < prime_endloop1) {
    //     register const counter_t step  = prime * 2 + 1;
    //     register counter_t start = compute_start(prime, block_start);
    //     setBitsTrue_smallstep_vector(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse(bitstorage, prime);
    // }

    // while (prime < prime_endloop2) {
    //     register const counter_t step  = prime * 2 + 1;
    //     register counter_t start = compute_start(prime, block_start);
    //     setBitsTrue_smallstep_repeat(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse(bitstorage, prime);
    // }

    // while (prime < prime_endloop3) {
    //     register const counter_t step  = prime * 2 + 1;
    //     register counter_t start = compute_start(prime, block_start);
    //     setBitsTrue_largestep_vector(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse(bitstorage, prime);
    // }

    // while (prime < prime_endloop4) {
    //     register const counter_t step  = prime * 2 + 1;
    //     register counter_t start = compute_start(prime, block_start);
    //     // setBitsTrue_largestep_repeat(bitstorage, start, step, block_stop);
    //     setBitsTrue_largestep(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse_largestep(bitstorage, prime);
    // }

    // while (prime <= prime_endloop5) {
    //     register const counter_t step  = prime * 2 + 1;
    //     register counter_t start = compute_start(prime, block_start);
    //     setBitsTrue_largestep_norepeat(bitstorage, start, step, block_stop);
    //     prime = searchBitFalse_largestep(bitstorage, prime);
    // }

    return prime; 
}

static inline __attribute__((always_inline)) counter_t stripeSieveBlock0(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}

static inline  __attribute__((always_inline)) counter_t stripeSieve(bitword_t* restrict bitstorage, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    return  stripeSieveBlock(bitstorage, 0, block_stop, prime_start, prime_max);
}


static inline double stripeBenchmarkTime() 
{
    struct timespec t;

    #ifdef __APPLE__
        clock_gettime(CLOCK_MONOTONIC_RAW, &t);
    #else
        clock_gettime(CLOCK_MONOTONIC, &t);
    #endif
    return (t.tv_sec + t.tv_nsec * 1e-9);
}
// this function is used for the benchmarking
// it knows all the different ways to setBitsTrue for a given range and step
// it benchmarks the different methods and keeps the resulting times or passed in an array
// it sorts the results from best to worst
// the array contains for each stepsize the best method
static inline void benschmark_stripe(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    counter_t prime = prime_start;

    struct timespec stripe_lapstart;
    struct timespec stripe_lapend;

    counter_t stripe_passes[1000][20];
    for(int i=0; i<1000; i++) { for(int j=0; j<20; j++) { stripe_passes[i][j] = 0; } }

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);

        #define methods 18
        for(int method=0; method<=methods; method++) {
            const double time_start = stripeBenchmarkTime();
            const double time_target = time_start + 0.002; 
            double time_elapsed = 0;
            counter_t passes = 0;
            
            while (time_elapsed <= time_target) {
                switch(method) {
                    case  0: setBitsTrue(bitstorage, start, step, block_stop); passes++; break;
                    case  1: if (step < VECTORWORD_SIZE_BITS) { setBitsTrue_smallstep_vector(bitstorage, start, step, block_stop); passes++; } break;
                    case  2: if (step < WORD_SIZE_BITS) { setBitsTrue_smallstep_repeat(bitstorage, start, step, block_stop); passes++; } break;
                    case  3: if (step > VECTORWORD_SIZE_BITS) { setBitsTrue_largestep_vector(bitstorage, start, step, block_stop); passes++; } break;
                    case  4: setBitsTrue_largestep_repeat(bitstorage, start, step, block_stop); passes++; break;
                    case  5: setBitsTrue_largestep_norepeat(bitstorage, start, step, block_stop); passes++; break;
                    case  6: setBitsTrue_largestep_repeat_uint8_unroll4(bitstorage, start, step, block_stop); passes++; break;
                    case  7: setBitsTrue_largestep_repeat_uint16_unroll4(bitstorage, start, step, block_stop); passes++; break;
                    case  8: setBitsTrue_largestep_repeat_uint32_unroll4(bitstorage, start, step, block_stop); passes++; break;
                    case  9: setBitsTrue_largestep_repeat_uint64_unroll4(bitstorage, start, step, block_stop); passes++; break;
                    case 10: setBitsTrue_largestep_repeat_uint8_unroll8(bitstorage, start, step, block_stop); passes++; break;
                    case 11: setBitsTrue_largestep_repeat_uint16_unroll8(bitstorage, start, step, block_stop); passes++; break;
                    case 12: setBitsTrue_largestep_repeat_uint32_unroll8(bitstorage, start, step, block_stop); passes++; break;
                    case 13: setBitsTrue_largestep_repeat_uint64_unroll8(bitstorage, start, step, block_stop); passes++; break;
                    case 14: setBitsTrue_largestep_repeat_uint8_unroll16(bitstorage, start, step, block_stop); passes++; break;
                    case 15: setBitsTrue_largestep_repeat_uint16_unroll16(bitstorage, start, step, block_stop); passes++; break;
                    case 16: setBitsTrue_largestep_repeat_uint32_unroll16(bitstorage, start, step, block_stop); passes++; break;
                    case 17: setBitsTrue_largestep_repeat_uint8_unroll32(bitstorage, start, step, block_stop); passes++; break;
                    case 18: setBitsTrue_largestep_repeat_uint16_unroll32(bitstorage, start, step, block_stop); passes++; break;

                }
                time_elapsed = stripeBenchmarkTime();         
            }
            stripe_passes[step][method] = passes;

        }
        prime = searchBitFalse(bitstorage, prime);
    }

    /* output all the lap times 
       skip the steps that are not prime
       each step is a row, each method is a column
       put all the times from different methods on one row
    */

    printf("Step      "); for(int method=0; method<=methods; method++) printf("%6ju ", (uintmax_t) method); printf("\n");

    for(int step=1; step<prime_max*2+1; step+=2) {
        counter_t prime = (step-1) >> 1;
        if (checkBitFalse(bitstorage, prime)==0 ) {
            printf("Step %4ju ", (uintmax_t)step);
            
            // Find the maximum and second largest value among methods 4-18
            counter_t max_value = 0;
            counter_t second_max_value = 0;
            for(int method=4; method<=methods; method++) {
                if (stripe_passes[step][method] > max_value) {
                    second_max_value = max_value;
                    max_value = stripe_passes[step][method];
                } else if (stripe_passes[step][method] > second_max_value) {
                    second_max_value = stripe_passes[step][method];
                }
            }
            
            // Print all method values, highlighting the max and second largest among methods 4-18
            for(int method=0; method<=methods; method++) {
                if (method >= 4 && method <= 18 && stripe_passes[step][method] == max_value && max_value > 0) {
                    printf("\033[32m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Green for max
                } else if (method >= 4 && method <= 18 && stripe_passes[step][method] == second_max_value && second_max_value > 0) {
                    printf("\033[33m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Yellow for second largest
                } else {
                    printf("%6ju ", (uintmax_t)stripe_passes[step][method]);
                }
            }
            printf("\n");
        }
    }

}




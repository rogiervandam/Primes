
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
static inline void benchmarkSetBitsTrue(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    counter_t prime = prime_start;

    struct timespec stripe_lapstart;
    struct timespec stripe_lapend;

    counter_t stripe_passes[1000][20];
    for(int i=0; i<1000; i++) { for(int j=0; j<20; j++) { stripe_passes[i][j] = 0; } }

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);

        #define methods 19
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
                    case 19: setBitsTrue_largestep_norepeat_unroll2(bitstorage, start, step, block_stop); passes++; break;
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
                if (method >= 4 && stripe_passes[step][method] == max_value && max_value > 0) {
                    printf("\033[32m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Green for max
                } else if (method >= 4  && stripe_passes[step][method] == second_max_value && second_max_value > 0) {
                    printf("\033[33m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Yellow for second largest
                } else if (method == 0 && max_value > 0 && stripe_passes[step][0] <= max_value * 0.95) {
                    printf("\033[33;1m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Orange (bold yellow) for method 0 when 10% worse
                } else {
                    printf("%6ju ", (uintmax_t)stripe_passes[step][method]);
                }
            }
            counter_t range = block_stop - block_start;
            printf("     rep:%7ju  m4 %5ju  m8 %5ju  m16 %5ju  m32 %5ju\n", (uintmax_t)range/step, 
                (uintmax_t)(range/step/4), (uintmax_t)(range/step/8), (uintmax_t)(range/step/16), (uintmax_t)(range/step/32));
        }
    }

}




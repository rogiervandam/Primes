
// Define a function pointer type for setBitsTrue functions
typedef void (*setBitsTrueFunc)(void* restrict, const counter_t, const counter_t, const counter_t);

// Define benchmark timing constants
#define BENCHMARK_DURATION 0.002  // seconds per test

// Structure to hold function information
typedef struct {
    int number;                     // Method number/index
    const char* name;               // Function name 
    setBitsTrueFunc func;           // Function pointer
    counter_t min_step;             // Minimum applicable step value
    counter_t max_step;             // Maximum applicable step value
    int enabled;                    // Whether this function is enabled in benchmarking
} SetBitsTrueMethod;


// Global array with all setBitsTrue functions
static const SetBitsTrueMethod setBitsTrueMethods[] = {
    {0, "setBitsTrue", setBitsTrue, 0, INT32_MAX, 1},
    {1, "setBitsTrue_smallstep_rotate_pair_uint64v8", setBitsTrue_smallstep_rotate_pair_uint64v8, 0, 63, 1},
    {1, "setBitsTrue_smallstep_rotate_pair_uint64v4", setBitsTrue_smallstep_rotate_pair_uint64v4, 0, 63, 1},
    {1, "setBitsTrue_smallstep_rotate_pair_uint64v2", setBitsTrue_smallstep_rotate_pair_uint64v2, 0, 63, 1},
    {1, "setBitsTrue_smallstep_rotate_pair_uint32v8", setBitsTrue_smallstep_rotate_pair_uint32v8, 0, 31, 1},
    {1, "setBitsTrue_smallstep_rotate_pair_uint32v4", setBitsTrue_smallstep_rotate_pair_uint32v4, 0, 31, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint32v2", setBitsTrue_smallstep_rotate_pair_uint32v2, 0, 31, 1},
    {2, "setBitsTrue_smallstep_vector_rotate", setBitsTrue_smallstep_rotate_uint64v4, 0, 63, 1},
    {2, "setBitsTrue_smallstep_vector_rotate_uint64v4", setBitsTrue_smallstep_rotate_uint64v4, 0, 63, 1},
    {2, "setBitsTrue_smallstep_vector_rotate_uint64v8", setBitsTrue_smallstep_rotate_uint64v8, 0, 63, 1},
    {3, "setBitsTrue_smallstep_repeat", setBitsTrue_smallstep_repeat, 0, WORD_SIZE_BITS-1, 1},
    {4, "setBitsTrue_smallstep_repeat_uint64_unroll8", setBitsTrue_smallstep_repeat_uint64_unroll8, 0, WORD_SIZE_BITS-1, 1},
    {5, "setBitsTrue_largestep_vector_uint64v8", setBitsTrue_largestep_vector_uint64v8, 65, 511, 1},
    {6, "setBitsTrue_largestep_vector_uint64v4", setBitsTrue_largestep_vector_uint64v4, 65, 255, 1},
    {7, "setBitsTrue_largestep_vector_uint64v2", setBitsTrue_largestep_vector_uint64v2, 65, 127, 1},
    {8, "setBitsTrue_largestep_vector_uint32v8", setBitsTrue_largestep_vector_uint32v8, 33, 255, 0},
    {8, "setBitsTrue_largestep_vector_uint32v4", setBitsTrue_largestep_vector_uint32v4, 33, 255, 0},
    {8, "setBitsTrue_largestep_vector_uint32v2", setBitsTrue_largestep_vector_uint32v2, 33, 255, 0},
    {9, "setBitsTrue_largestep_vector_uint16v8", setBitsTrue_largestep_vector_uint16v8, 17, 127, 0},
    {9, "setBitsTrue_largestep_vector_uint16v4", setBitsTrue_largestep_vector_uint16v4, 17, 127, 0},
    {9, "setBitsTrue_largestep_vector_uint16v2", setBitsTrue_largestep_vector_uint16v2, 17, 127, 0},
    {9, "largestep_vector_uint16v8_unroll8", setBitsTrue_largestep_vector_uint16v8_unroll8, 17, 127, 0},
    // {10, "largestep_vector", setBitsTrue_largestep_vector, VECTORWORD_SIZE_BITS+1, INT32_MAX, 0},
    {11, "largestep_norepeat", setBitsTrue_largestep_norepeat, 0, INT32_MAX, 1},
    {12, "largestep_repeat_uint8_unroll4", setBitsTrue_largestep_repeat_uint8_unroll4, 0, INT32_MAX, 1},
    {13, "largestep_repeat_uint16_unroll4", setBitsTrue_largestep_repeat_uint16_unroll4, 0, INT32_MAX, 1},
    {14, "largestep_repeat_uint32_unroll4", setBitsTrue_largestep_repeat_uint32_unroll4, 0, INT32_MAX, 1},
    {15, "largestep_repeat_uint64_unroll4", setBitsTrue_largestep_repeat_uint64_unroll4, 0, INT32_MAX, 1},
    {16, "largestep_repeat_uint8_unroll8", setBitsTrue_largestep_repeat_uint8_unroll8, 0, INT32_MAX, 1},
    {17, "largestep_repeat_uint16_unroll8", setBitsTrue_largestep_repeat_uint16_unroll8, 0, INT32_MAX, 1},
    {18, "largestep_repeat_uint32_unroll8", setBitsTrue_largestep_repeat_uint32_unroll8, 0, INT32_MAX, 1},
    {19, "largestep_repeat_uint64_unroll8", setBitsTrue_largestep_repeat_uint64_unroll8, 0, INT32_MAX, 1},
    // {20, "largestep_norepeat_unroll2", setBitsTrue_largestep_norepeat_unroll2, 0, INT32_MAX, 0}
};

static int checkSetBitsTrueMethod(const SetBitsTrueMethod* method, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // create sieve
    struct sieve_t* sieve = sieve_create(range_stop);
    void* bitstorage = sieve->bitstorage;
    if (bitstorage == NULL) {
        fprintf(stderr, "Error: Unable to allocate memory for bitstorage\n");
        exit(1);
    }

    sieve_clear(sieve);

    setBitsTrue_range(bitstorage, range_start, step, range_stop);
    counter_t target_count = countBitsTrue(bitstorage, range_start, range_stop);

    sieve_clear(sieve);

    method->func(bitstorage, range_start, step, range_stop);
    counter_t actual_count = countBitsTrue(bitstorage, range_start, range_stop);

    if (actual_count != target_count) {
        printf("Method %s failed with %ju bits set, expected %ju", method->name, (uintmax_t)actual_count, (uintmax_t)target_count);
        sieve_delete(sieve);
        return 0;
    }
    
    // check if the method is correct
    counter_t invalid = countInvalidInStripe(bitstorage, range_start, step, range_stop);
    if (invalid) {
        printf("Method %s failed with %ju invalid bits", method->name, (uintmax_t)invalid);
        sieve_delete(sieve);
        return 0;
    }

    sieve_delete(sieve);
    return 1;
}  

#define NUM_METHODS (sizeof(setBitsTrueMethods) / sizeof(SetBitsTrueMethod))
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

    #define methods NUM_METHODS
    #define nonvector 1

    counter_t stripe_passes[1000][methods+1];
    for(int i=0; i<1000; i++) { for(int j=0; j<methods; j++) { stripe_passes[i][j] = 0; } }

    for(int method=0; method<methods; method++) {
        printf("%3d %s ", method, setBitsTrueMethods[method].name);
        counter_t min_step = max(setBitsTrueMethods[method].min_step, 3);
        int valid = checkSetBitsTrueMethod(&setBitsTrueMethods[method], compute_start(min_step, block_start), min_step, block_stop);
        if (valid) printf("\033[32m✓ valid\033[0m ");
        else printf("\033[31m✗ NOT VALID\033[0m ");
        printf("\n");
    }
    printf("\n\n");

    while (prime < prime_max) {
        register const counter_t step = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);

        for(int m=0; m < methods; m++) {
            const SetBitsTrueMethod* method = &setBitsTrueMethods[m];
            
            // Skip disabled methods
            // if (!method->enabled) continue;
            if (step >= method->min_step && step <= method->max_step) {
                const double time_start = stripeBenchmarkTime();
                const double time_target = time_start + BENCHMARK_DURATION;
                double time_elapsed = 0;
                counter_t passes = 0;
                
                while (time_elapsed <= time_target) {
                        method->func(bitstorage, start, step, block_stop);
                        passes++;
                        time_elapsed = stripeBenchmarkTime();
                }
                stripe_passes[step][m] = passes;
            }
        }
        prime = searchBitFalse(bitstorage, prime);
    }

    /* output all the lap times 
       skip the steps that are not prime
       each step is a row, each method is a column
       put all the times from different methods on one row
    */

    // Output results header with method numbers
    // Output method names in a separate row for reference

    printf("Step      ");
    for(int method=0; method<methods; method++) {
        printf("%6ju ", (uintmax_t)method);
    }
    printf("\n");

    
    printf("Step      "); for(int method=0; method<methods; method++) printf("%6ju ", (uintmax_t) method); printf("\n");

    for(int step=1; step<prime_max*2+1; step+=2) {
        counter_t prime = (step-1) >> 1;
        if (checkBitFalse(bitstorage, prime) ) {
            printf("Step %4ju ", (uintmax_t)step);
            
            // Find the maximum and second largest value among methods 4-18
            counter_t max_value = 0;
            counter_t second_max_value = 0;
            for(int method=0; method<methods; method++) {
                if (stripe_passes[step][method] > max_value) {
                    second_max_value = max_value;
                    max_value = stripe_passes[step][method];
                } else if (stripe_passes[step][method] > second_max_value) {
                    second_max_value = stripe_passes[step][method];
                }
            }
            
            // Print all method values, highlighting the max and second largest among methods 4-18
            for(int method=0; method<methods; method++) {
                if (method >= nonvector && stripe_passes[step][method] == max_value && max_value > 0) {
                    printf("\033[32m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Green for max
                } else if (method >= nonvector && stripe_passes[step][method] >= max_value * 0.95 && stripe_passes[step][method] < max_value && max_value > 0) {
                    printf("\033[33m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Yellow for within 5% of max
                } else if (method == 0 && max_value > 0 && stripe_passes[step][0] >= max_value * 0.95) {
                    printf("\033[32;1m%6ju\033[0m ", (uintmax_t)stripe_passes[step][method]); // Green for method when 95% of max
                } else {
                    printf("%6ju ", (uintmax_t)stripe_passes[step][method]);
                }
            }
            counter_t range = block_stop - block_start;
            printf("\n");
            // printf("     rep:%7ju  m4 %5ju  m8 %5ju  m16 %5ju  m32 %5ju\n", (uintmax_t)range/step, 
            //     (uintmax_t)(range/step/4), (uintmax_t)(range/step/8), (uintmax_t)(range/step/16), (uintmax_t)(range/step/32));
        }
    }

}




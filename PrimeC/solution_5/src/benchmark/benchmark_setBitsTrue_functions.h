// Define a function pointer type for setBitsTrue functions
typedef void (*setBitsTrueFunc)(void* restrict, const counter_t, const counter_t, const counter_t);

static inline void clear_cache() {
    // Clear the cache
    const size_t size = 128*1024*1024;
    char* data = (char*)malloc(size);
    for (size_t i = 0; i < size; i++) {
        data[i] = i;
    }
    free(data);
}

// Define benchmark timing constants
#define BENCHMARK_DURATION 0.002  // seconds per test

#include "../bitstorage/bitstorage_setBitsTrueFunctionList.h"

#define methods (sizeof(setBitsTrueMethods) / sizeof(SetBitsTrueMethod))
#define nonvector 1

int stepplan[1000];
setBitsTrueFunc best_stepfunction[1000];

static uint8_t checkSetBitsTrueMethod_stripe(const SetBitsTrueMethod* method, const counter_t range_start, const counter_t step, const counter_t range_stop)
{
    // create sieve
    struct sieve_t* sieve = sieve_create((range_stop+1024)*2);
    void* bitstorage = sieve->bitstorage;
    sieve_clear(sieve);
    setBitsTrue_range(bitstorage, range_start, step, range_stop);
    counter_t target_count = countBitsTrue(bitstorage, range_start, range_stop+1024);
    sieve_delete(sieve);

    sieve = sieve_create(range_stop*2+1024); // reserve extra to check set bits after range stop
    bitstorage = sieve->bitstorage;
    sieve_clear(sieve);
    // setBitsTrue_range(bitstorage, range_start, step, range_stop);

    method->func(bitstorage, range_start, step, range_stop);
    counter_t actual_count_inrange = countBitsTrue(bitstorage, range_start, range_stop); // add 1024 to check the bits after the range
    counter_t actual_count_atrange = checkBitTrue(bitstorage, range_stop) ? 1 : 0;
    counter_t actual_count_afterrange = countBitsTrue(bitstorage, range_stop+1, range_stop+1024);

    uint8_t correct_inrange = (actual_count_inrange == target_count);
    uint8_t correct_atrange = (actual_count_atrange == 0);
    uint8_t correct_afterrange = (actual_count_afterrange == 0);

    if (!(actual_count_inrange == target_count )) {
        // printf("\nMethod %s for stripe with step %ju in range %ju-%ju failed with %ju bits set, expected %ju ", method->name, (uintmax_t) step, (uintmax_t) range_start, (uintmax_t) range_stop, (uintmax_t)actual_count, (uintmax_t)target_count);
        // return 0;
    }
    
    // // check if the method is correct
    // counter_t invalid = countInvalidInStripe(bitstorage, range_start, step, range_stop);
    // if (invalid) {
    //     // printf("Method %s failed with %ju invalid bits", method->name, (uintmax_t)invalid);
    //     return 0;
    // }
    sieve_delete(sieve);

    return correct_inrange | (correct_atrange << 1) | (correct_afterrange << 2);
}  

static inline uint8_t checkSetBitsTrueMethod(const SetBitsTrueMethod* method, const counter_t range_start, const counter_t range_stop) 
{
    // build a base sieve for getting the right primes
    struct sieve_t* sieve_base = sieve_create(range_stop*2);
    void* bitstorage_base = sieve_base->bitstorage;
    counter_t prime = 1, prime_max = prime_stop(range_stop);

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, range_start);
        setBitsTrue_range(bitstorage_base, start, step, range_stop);
        prime = searchBitFalse(bitstorage_base, prime);
    }

    // reset prime to 1; loop through all primes and when min_step < step < max_step, check the method
    uint8_t allvalid = 7;
    prime = 1;
    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        if (step >= method->min_step && step <= method->max_step) {
            // printf("Checking method %s for step %ju\n", method->name, (uintmax_t)step);
            allvalid &= checkSetBitsTrueMethod_stripe(method, compute_start(prime, range_start), step, range_stop);
        }
        prime = searchBitFalse(bitstorage_base, prime);
    }
    sieve_delete (sieve_base);
    return allvalid;
}

static inline uint8_t checkSetBitsTrueMethods(const SetBitsTrueMethod* SetBitsTrueMethods, const counter_t range_start, const counter_t range_stop) {
    int allvalid = 1;

    for(int m=0; m<methods; m++) {
        SetBitsTrueMethod setBitsTrueMethod = SetBitsTrueMethods[m];

        if (m % 2 == 1) printf("  "); // Start a new row for every two methods
        printf("%3d %-50s ", m, setBitsTrueMethod.name);
        uint8_t valid = checkSetBitsTrueMethod(&setBitsTrueMethod, range_start, range_stop);
        printf("In range: "   ); if (valid&1) {printf("\033[32m✓ valid    \033[0m "); } else { printf("\033[31m✗ NOT VALID\033[0m "); }
        printf("At range: "   ); if (valid&2) {printf("\033[32m✓ valid    \033[0m "); } else { printf("\033[31m✗ NOT VALID\033[0m "); }
        printf("After range: "); if (valid&4) {printf("\033[32m✓ valid    \033[0m "); } else { printf("\033[31m✗ NOT VALID\033[0m "); }
        if (m % 2 == 1) printf("\n"); // End the row after two methods
        if (valid != 7) { allvalid = 0; }
    }
    return allvalid;
}

static inline uint8_t checkSetBitsTrueMethodsBlocks(const SetBitsTrueMethod* SetBitsTrueMethods, const counter_t range_start, const counter_t range_stop) 
{
    uint8_t allvalid = 7;
    global_mediumstep_faster = 64;

    for(int m=0; m<methods; m++) {
        SetBitsTrueMethod setBitsTrueMethod = SetBitsTrueMethods[m];
        printf("%3d %-50s ", m, setBitsTrueMethod.name);
        uint8_t methodvalid = 7;
        for (counter_t blocksize_bits=1024; blocksize_bits<=32*1024*8; blocksize_bits *= 2) {
            for (counter_t block_start = blocksize_bits, block_stop = 2*blocksize_bits-1; block_start < range_stop; block_start += blocksize_bits, block_stop += blocksize_bits) {
                uint8_t valid = checkSetBitsTrueMethod(&setBitsTrueMethod, block_start, min(block_stop, range_stop));
                // if (valid != 7) { printf("Block %ju-%ju: \033[31m✗ NOT VALID\033[0m ", (uintmax_t)block_start, (uintmax_t)block_stop); } else { printf("Block %ju-%ju: \033[32m✓ valid\033[0m ", (uintmax_t)block_start, (uintmax_t)block_stop); }
                methodvalid &= valid;
                allvalid &= valid;
            } 
        }
        uint8_t valid = methodvalid;
        printf("In range: "   ); if (valid&1) {printf("\033[32m✓ valid    \033[0m "); } else { printf("\033[31m✗ NOT VALID\033[0m "); }
        printf("At range: "   ); if (valid&2) {printf("\033[32m✓ valid    \033[0m "); } else { printf("\033[31m✗ NOT VALID\033[0m "); }
        printf("After range: "); if (valid&4) {printf("\033[32m✓ valid    \033[0m "); } else { printf("\033[31m✗ NOT VALID\033[0m "); }
        printf("\n");
    }
    
    return allvalid;
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


static void listSetBitsTrueMethods() {
    // List methods    
    // checkSetBitsTrueMethods(setBitsTrueMethods, block_start, block_stop);
    printf("----------------------\n");
    for (int m = 0; m < methods; m++) {
        printf("%3d %-50s", m, setBitsTrueMethods[m].name);
        if ((m + 1) % 4 == 0 || m == methods - 1) {
            printf("\n");
        }
    }
    printf("----------------------\n");
}

// this function is used for the benchmarking
// it knows all the different ways to setBitsTrue for a given range and step
// it benchmarks the different methods and keeps the resulting times or passed in an array
// it sorts the results from best to worst
// the array contains for each stepsize the best method
static inline void benchmarkSetBitsTrue(bitword_t* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max)
{
    counter_t prime = prime_start;

    counter_t stripe_passes[1000][methods+1];
    for(int i=0; i<1000; i++) { for(int j=0; j<methods; j++) { stripe_passes[i][j] = 0; } }

    listSetBitsTrueMethods();


    // Loop through all primes and benchmark the methods
    while (prime < prime_max) {
        register const counter_t step = prime * 2 + 1;
        register counter_t start = compute_start(prime, block_start);

        for(int m=0; m < methods; m++) {
            const SetBitsTrueMethod* method = &setBitsTrueMethods[m];
            
            // Skip disabled methods
            // if (!method->enabled) continue;
            if (step >= method->min_step && step <= method->max_step) {
                clear_cache();
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

static void playStepplan(struct sieve_t* sieve, const counter_t prime_max) 
{
    counter_t prime = 1, range_start = 0;
    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, range_start);
        (*best_stepfunction[step])(sieve->bitstorage, start, step, sieve->bits);
        prime = searchBitFalse(sieve->bitstorage, prime);
    }
   
}

static void createStepplan(benchmark_settings_t settings) {
    counter_t range_start = 0, range_stop = settings.factor_max/2;
    counter_t prime = 1;
    counter_t prime_max = prime_stop(range_stop);

    struct sieve_t* sieve = sieve_create(range_stop*2);
    void* bitstorage = sieve->bitstorage;
    counter_t stripe_passes[1000][methods+1];
    for(int i=0; i<1000; i++) { for(int j=0; j<methods; j++) { stripe_passes[i][j] = 0; } }

    listSetBitsTrueMethods();

    printf("Step      ");
    for(int method=0; method<methods; method++) {
        printf("%6ju ", (uintmax_t)method);
    }
    printf("\n");

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, range_start);

        printf("Step %4ju ", (uintmax_t)step);

        // try all methods for this step and benchmark them
        for(int m=0; m<methods; m++) {
            SetBitsTrueMethod method = setBitsTrueMethods[m];
            if (step >= method.min_step && step <= method.max_step) {
                const double time_start = stripeBenchmarkTime();
                const double time_target = time_start + 0.005;
                double time_elapsed = 0;
                counter_t passes = 0;
                
                while (time_elapsed <= time_target) {
                        // prepare the cache in the relevant state
                        playStepplan(sieve, prime-1);
                        method.func(bitstorage, start, step, range_stop);
                        passes++;
                        time_elapsed = stripeBenchmarkTime();
                }
                stripe_passes[step][m] = passes;
            }
        }

        // find the best method for this step - skip 0
        counter_t max_value = 0;
        counter_t best_method = 0;
        for(int m=1; m<methods; m++) {
            if (stripe_passes[step][m] > max_value) {
                max_value = stripe_passes[step][m];
                best_method = m;
            }
        }
        stepplan[step] = best_method;
        best_stepfunction[step] = setBitsTrueMethods[best_method].func;
        
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

        printf("Selecting method %2d %s \n", best_method, setBitsTrueMethods[best_method].name);

        prime = searchBitFalse(sieve->bitstorage, prime);
    }
    sieve_delete(sieve);

    // // print final stepplan
    // for(int step=1; step<prime_max*2+1; step+=2) {
    //     if (stepplan[step] != 0)  printf("Step %4ju: %s\n", (uintmax_t)step, setBitsTrueMethods[stepplan[step]].name);
    // }

    // benchmark the final stepplan for 5 seconds
    printf("Benchmarking the final stepplan for 5 seconds\n");
    double time_elapsed = 0;
    counter_t passes = 0;
    const double time_start = stripeBenchmarkTime();
    const double time_target = time_start + 5.0;

    while (time_elapsed <= time_target) {
            // prepare the cache in the relevant state
            playStepplan(sieve, prime_max);
            passes++;
            time_elapsed = stripeBenchmarkTime();
    }

    printf("Final stepplan: %ju passes in 5 seconds\n", (uintmax_t)passes);

}

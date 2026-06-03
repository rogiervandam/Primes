// benchmark single sieve passes functions and check the results for correctness

#ifdef COMPILE_BENCHMARK_STRIPERS

#include "../sieve/sieve_markBase.h" 
#include "../sieve/sieve_storage_half.h"

#define FUNCTIONS_COMPILED 1
#include "../generic/functions.h"

#define nonvector 1
#define compute_start(prime, start) calcFactor_start_half(prime, start)
#define BENCHMARK_DURATION 0.002  // seconds per test

static inline void clear_cache() {
    const size_t size = 128*1024*1024;
    char* data = (char*)malloc(size);
    for (size_t i = 0; i < size; i++) data[i] = i;
    free(data);
}

static void listSetBitsTrueMethods() {
    for (int m = 0; m < methods; m++) {
        printf("%3d %-50s", m, setBitsTrueMethods[m].name);
        if ((m + 1) % 2 == 0 || m == methods - 1) printf("\n");
    }
}

static void printStripePasses(const counter_t stripe_passes[methods + 1], counter_t max_value) {
    for (int method = 0; method < methods; method++) {
        if (method >= nonvector && stripe_passes[method] == max_value && max_value > 0) {
            printf("\033[32m%6ju" COLOR_RESET " ", (uintmax_t)stripe_passes[method]); // Green for max
        } else if (method >= nonvector && stripe_passes[method] >= max_value * 0.95 && stripe_passes[method] < max_value && max_value > 0) {
            printf("\033[33m%6ju" COLOR_RESET " ", (uintmax_t)stripe_passes[method]); // Yellow for within 5% of max
        } else if (method == 0 && max_value > 0 && stripe_passes[0] >= max_value * 0.95) {
            printf("\033[32;1m%6ju" COLOR_RESET " ", (uintmax_t)stripe_passes[method]); // Green for method when 95% of max
        } else {
            printf("%6ju ", (uintmax_t)stripe_passes[method]);
        }
    }
}
// this function is used for the benchmarking
// it knows all the different ways to setBitsTrue for a given range and step
// it benchmarks the different methods and keeps the resulting times or passed in an array
// it sorts the results from best to worst
// the array contains for each stepsize the best method
static inline void benchmarkSetBitsTrue(void* restrict bitstorage, const counter_t block_start, const counter_t block_stop, const counter_t prime_start, const counter_t prime_max, storage_type storage)
{
    // shake the sieve one time to make an array of primes between prime_start and prime_max in the cache
    counter_t primes[1000] = {0}, prime_count = 0;
    sieve_t* sieve = shakeSieve(prime_max * prime_max);
    for (counter_t p = prime_start; p < prime_max && prime_count < 1000; p = findUnmarked(sieve, p), prime_count++) {
        primes[prime_count] = p;
    }
    sieve_delete(sieve);

    log1("Benchmarking setBitsTrue functions for block range %ju - %ju and prime range %ju - %ju (%ju primes)", (uintmax_t)block_start, (uintmax_t)block_stop, (uintmax_t)prime_start, (uintmax_t)prime_max, (uintmax_t)prime_count);
    // counter_t storage = option.fixed_benchmark_settings.storage;

    counter_t stripe_passes[1000][methods+1];
    for(int i=0; i<1000; i++) { for(int j=0; j<methods; j++) { stripe_passes[i][j] = 0; } }

    printf("\n");
    listSetBitsTrueMethods();

    // Loop through all primes and benchmark the methods
    for(counter_t prime_index=0; prime_index < prime_count; prime_index++) {
        // log1("Benchmarking for prime index %ju\n", (uintmax_t)prime_index);
        counter_t prime = primes[prime_index];
        register const counter_t step = calcStep(prime, storage);
        register counter_t start = calcStart(prime, block_start, storage);
        register counter_t stop = calcStop(block_stop, storage);
        // log1("Benchmarking for prime %ju with step %ju start %ju stop %ju\n", (uintmax_t)prime, (uintmax_t)step, (uintmax_t)start, (uintmax_t)stop);

        for(int m=0; m < methods; m++) {
            const SetBitsTrueMethod* method = &setBitsTrueMethods[m];
            
            // Skip disabled methods
            // if (!method->enabled) continue;
            if (step >= method->min_step && step <= method->max_step) {
                clear_cache();
                const double time_start = benchmarkTime();
                const double time_target = time_start + BENCHMARK_DURATION;
                double time_elapsed = 0;
                counter_t passes = 0;
                
                while (time_elapsed <= time_target) {
                        method->func(bitstorage, start, stop, step);
                        passes++;
                        time_elapsed = benchmarkTime();
                }
                stripe_passes[step][m] = passes;
            }
        }
    }

    // Print the results. First row has the method numbers
    printf( COLOR_DARK_GRAY " Prime " COLOR_RESET COLOR_BLUE  " Step ");  for(int method=0; method < methods; method++) printf("%6ju ", (uintmax_t)method);  printf( COLOR_RESET "\n");

    // Loop through all steps and print the results
    for(counter_t prime_index=0; prime_index < prime_count; prime_index++) {
        counter_t prime = primes[prime_index];
        counter_t step = calcStep(prime, storage);
        // Find the maximum and second largest value among methods 4-18
        counter_t max_value = 0 ,second_max_value = 0;
        for(int method=0; method<methods; method++) {
            if (stripe_passes[step][method] > max_value) {
                second_max_value = max_value;
                max_value = stripe_passes[step][method];
            } 
            else if (stripe_passes[step][method] > second_max_value) {
                second_max_value = stripe_passes[step][method];
            }
        }
        
        // Print all method values, highlighting the max and second largest among methods 4-18
        printf( COLOR_DARK_GRAY "%6ju " COLOR_RESET COLOR_BLUE "%5ju " COLOR_RESET, (uintmax_t)prime, (uintmax_t)step);
        printStripePasses(stripe_passes[step], max_value);
        printf( COLOR_DARK_GRAY " - Ratio: %8.2f" COLOR_RESET "\n", (block_stop - compute_start(prime, block_start)) / (double)step);
    }
}

static inline int 
benchmarkSieveSetBitsTrue(options_t option, sieve_t* (*sieveFunction)(const counter_t, const storage_type))
{
    const counter_t max_factor = option.fixed_benchmark_settings.factor_max;
    storage_type storage = option.fixed_benchmark_settings.storage;
    sieve_t* sieve = sieveFunction(max_factor);
    // benchmarkSetBitsTrue(sieve->bitstorage, 1024, calcBitsize(max_factor, option.fixed_benchmark_settings.storage), 2, calcFactor_max(max_factor));
    log1("Benchmarking setBitsTrue functions for max factor %ju and storage type %d\n", (uintmax_t)max_factor, (int)storage);
    benchmarkSetBitsTrue(sieve->bitstorage, 1024, max_factor, 1, calcMax(max_factor, storage)/2, storage);
    sieve_delete(sieve);
    return 0;
}

static int 
playStepplan(sieve_t* sieve, const counter_t prime_max, setBitsTrueFunc* local_best_stepfunction) 
{
    counter_t prime = 1, range_start = 0;
    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, range_start);
        (*local_best_stepfunction[step])(sieve->bitstorage, start, sieve->bits, step);
        prime = searchBitFalse_uint8(sieve->bitstorage, prime);
    }
    return 0;
}

static int createStepplan(benchmark_settings_t settings) {
    counter_t range_start = 0, range_stop = settings.factor_max/2;
    counter_t prime = 1, prime_max = calcFactor_max_half(range_stop), step_max = prime_max * 2 + 1;

    sieve_t* sieve = sieve_create(range_stop*2, range_stop);
    void* bitstorage = sieve->bitstorage;

    int stepplan[step_max];
    setBitsTrueFunc best_stepfunction[step_max];
    counter_t stripe_passes[step_max][methods+1];

    for(int i=0; i<step_max; i++) { for(int j=0; j<methods; j++) { stripe_passes[i][j] = 0; } }

    listSetBitsTrueMethods();

    printf( COLOR_BLUE "Step      ");  for(int method=0; method < methods; method++) printf("%6ju ", (uintmax_t)method);  printf( COLOR_RESET "\n");

    while (prime < prime_max) {
        register const counter_t step  = prime * 2 + 1;
        register counter_t start = compute_start(prime, range_start);

        // try all methods for this step and benchmark them
        for(int m=0; m<methods; m++) {
            SetBitsTrueMethod method = setBitsTrueMethods[m];
            if (step >= method.min_step && step <= method.max_step) {
                const double time_start = benchmarkTime(), time_target = time_start + 0.005;
                double time_elapsed = 0;
                counter_t passes = 0;
                
                while (time_elapsed <= time_target) {
                        playStepplan(sieve, prime-1, &best_stepfunction[0]); // prepare the cache in the relevant state by replaying the stepplan
                        method.func(bitstorage, start, range_stop, step);
                        passes++;
                        time_elapsed = benchmarkTime();
                }
                stripe_passes[step][m] = passes;
            }
        }

        // find the best method for this step - skip 0
        counter_t max_value = 0;
        for(int m=1; m<methods; m++) {
            if (stripe_passes[step][m] > max_value) {
                max_value = stripe_passes[step][m];
                stepplan[step] = m;
                best_stepfunction[step] = setBitsTrueMethods[m].func;
            }
        }
        
        printf( COLOR_BLUE "Step %4ju " COLOR_RESET, (uintmax_t)step);
        printStripePasses(stripe_passes[step], max_value);
        printf("Selecting method %2ju %s \n", (uintmax_t) stepplan[step], setBitsTrueMethods[stepplan[step]].name);

        prime = searchBitFalse_uint8(bitstorage, prime);
    }
    sieve_delete(sieve);

    // benchmark the final stepplan for 5 seconds
    printf("Benchmarking the final stepplan of the best functions for 5 seconds\n");
    counter_t passes = 0;
    const double time_start = benchmarkTime();
    const double time_target = time_start + 5.0;
    double time_elapsed = 0;

    while (time_elapsed <= time_target) {
            // prepare the cache in the relevant state
            playStepplan(sieve, prime_max, &best_stepfunction[0]);
            passes++;
            time_elapsed = benchmarkTime();
    }
    printf("Final stepplan: %ju passes in 5 seconds\n", (uintmax_t)passes);

    return 0;
}
#endif
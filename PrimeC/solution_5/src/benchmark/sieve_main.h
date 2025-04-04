#include "sieve_check.h"
#include "sieve_benchmark.h"

#ifdef COMPILE_EXPLAIN
#include "sieve_explain.h"
#endif

#ifdef COMPILE_CHECK_STRIPERS
#include "sieve_checkFunctions.h"
#endif

#ifdef COMPILE_BENCHMARK_STRIPERS
#include "sieve_benchmarkFunctions.h"
#endif

#ifdef COMPILE_TUNE
#include "sieve_tune.h"
#endif

#include "sieve_validate.h"
#include "sieve_usage.h"
#include "sieve_parseCommandline.h"

static inline char* __attribute__((cold, nonnull, returns_nonnull)) 
extension_as_string(char* extension) 
{
    #ifdef _OPENMP
    return "_epar";
    #else
    return "";
    #endif
    return extension;
}

int main(int argc, char *argv[]) 
{
    verbose1( setbuf(stdout, NULL); ) // prevent buffering of stdout
    setDefaultOptions();
    parseCommandLine(argc, argv);

    verbose3( { printf("Sieve algorithm by Rogier van Dam - 2025\n"
                       "Find all primes up to " COLOR_YELLOW "%ju" COLOR_RESET 
                       " using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)\n", (uintmax_t)option.fixed_benchmark_settings.factor_max);})
    verbose2( { printf("\nRunning sieve variant " COLOR_YELLOW "%s" COLOR_RESET "%s" COLOR_BLUE "%s" COLOR_RESET " with max %ju\n" , 
                  algorithm_name, (option.dockerfile_type ? " in docker " : ""), (option.dockerfile_type ? option.dockerfile_type : ""), (uintmax_t)option.fixed_benchmark_settings.factor_max); })

    #ifdef COMPILE_EXPLAIN
    if (option.explain >= 1) {
        explainSieveShake(option.fixed_benchmark_settings);
        return(0);
    }
    #endif

    // command line --check can be used to check the algorithm for all sieve/blocksize combinations
    if (option.check) CheckOptions(option.check, option.fixed_benchmark_settings);

    #ifdef COMPILE_BENCHMARK_STRIPERS
    if (option.tunelevel) {
        if (option.tunelevel == 3) {
            struct sieve_t* sieve = shakeSieve(option.fixed_benchmark_settings.factor_max);
            benchmarkSetBitsTrue(sieve->bitstorage, 256*1024, min(1000000/2, 512*1024), 2, 500);
            sieve_delete(sieve);
            return 0;
        }
        if (option.tunelevel == 4) {
            createStepplan(option.fixed_benchmark_settings);
            exit(0);
        }
    }
    #endif

    #ifdef COMPILE_TIMERS
    if (option.timers) {
        timer_init();
        verbose2( printf("Timing the different parts of the algorithm\n"); )
    }
    #endif

    for(counter_t threads=option.fixed_benchmark_settings.threads, runs = 0; threads >= 1 && runs < 2; threads = (threads>>1), runs++ ) {

        // prepare settings
        benchmark_settings_t benchmark_settings = initBenchmarkSettings(threads);

        // tuning - try combinations of different settings and apply these
        #ifdef COMPILE_TUNE
        if (option.tunelevel) { 
            benchmark_result_t tuning_result = tuneSieveSettings(option.tunelevel, benchmark_settings);
            setSettingsFromTuning(&benchmark_settings, &(tuning_result.settings));
        }
        #else // with no tuning, use defaults
            if (!option.fixed_benchmark_settings.stripe_faster)     { benchmark_settings.stripe_faster    = 64; }
            if (!option.fixed_benchmark_settings.largestep_faster ) { benchmark_settings.largestep_faster = 128; }
            if (!option.fixed_benchmark_settings.blocksize_bits)    { benchmark_settings.blocksize_bits   = 32*1024*8; }
            benchmark_settings = checkBenchmarkSettings(benchmark_settings);
        #endif

        // one last check to make sure this is a valid algorithm for these settings
        debug_final_plan = 1; // allow to count something in only one run
        setBenchmarkSettingAsString(global_settings_string, benchmark_settings);
        if (!checkSieveWithBenchmarkSettings(benchmark_settings)) { 
            verbose1( fprintf(stderr, "The sieve is " COLOR_RED "NOT" COLOR_RESET " valid for settings %s with factor %ju\n", global_settings_string, (uintmax_t) benchmark_settings.factor_max) ); 
            return 1; 
        } 
        else { verbose2({ setBenchmarkSettingAsString(global_settings_string, benchmark_settings); 
            printf("Verified that algortihm with settings %s and max %ju is " COLOR_GREEN "valid" COLOR_RESET ".\n", global_settings_string, (uintmax_t) benchmark_settings.factor_max); 
        })}
        debug_final_plan = 0;
    
        // warm up the cache for 3 seconds
        verbose2( printf("Warming up the cache and processing units\n"); )	
        benchmark_settings_t final_tuning_settings = benchmark_settings;
        final_tuning_settings.sample_duration = 3;
        benchmark(final_tuning_settings);

        // perform benchmark -> outputs passes, elapsed time and avg in result 
        verbose2({ 
            setBenchmarkSettingAsString(global_settings_string, benchmark_settings);
            printf("Benchmarking with settings: " COLOR_GREEN "%s" COLOR_RESET " (stripeprime, largestep, blocksize) and " COLOR_GREEN "%ju" COLOR_RESET " threads for " COLOR_GREEN "%.1f" COLOR_RESET " seconds\nResults: " COLOR_BLINK "(wait " COLOR_GREEN "%.1lf" COLOR_RESET " seconds)" COLOR_BLINK_OFF "...", 
            global_settings_string,(uintmax_t)benchmark_settings.threads, benchmark_settings.sample_duration, benchmark_settings.sample_duration );
        })
        debug_final_benchmarking = 1; // allow to count something in the final benchmark runs
        benchmark_result_t benchmark_result = benchmark(benchmark_settings);
        debug_final_benchmarking = 0;

        // report results
        verbose2({
            printf("\nResult: Passes " COLOR_YELLOW "%ju" COLOR_RESET " " COLOR_GREEN "(per %.1f seconds)" COLOR_RESET " - average " COLOR_YELLOW "%.1f" COLOR_RESET " per second using " COLOR_MAGENTA "%ju" COLOR_RESET " threads\n", 
            (uintmax_t) benchmark_result.passes, benchmark_result.elapsed_time, benchmark_result.avg, (uintmax_t) benchmark_result.settings.threads);

            if (benchmark_result.settings.threads > 1) 
            printf(  "Used " COLOR_MAGENTA "%ju" COLOR_RESET " threads. Passes per thread: " COLOR_YELLOW "%ju" COLOR_RESET " " COLOR_GREEN "(per %.1f seconds)" COLOR_RESET " - average " COLOR_YELLOW "%.1f" COLOR_RESET " per second per thread.\n", 
                                (uintmax_t)benchmark_result.settings.threads, (uintmax_t) benchmark_result.passes / benchmark_result.settings.threads, benchmark_result.elapsed_time, benchmark_result.avg / benchmark_result.settings.threads);
            
            printf(COLOR_GREEN "Output message:" COLOR_RESET " \n"); 
        })
        
        char extension[50] = ""; extension_as_string(extension);      

        // output the results in a format that can be parsed by the benchmarking system
        printf("%s%s;%ju;%f;%ju;algorithm=%s,faithful=yes,bits=1",algorithm_name,extension,(uintmax_t)benchmark_result.passes,benchmark_result.elapsed_time,(uintmax_t)threads, algorithm_type);

        // add extra information to the output for research purposes
        verbose1( { 
            if (option.dockerfile_type) printf(";docker=" COLOR_BLUE "%s" COLOR_RESET "",option.dockerfile_type);
            setBenchmarkSettingAsString(global_settings_string, benchmark_settings);
            printf(";" COLOR_GREEN "%s" COLOR_RESET " total " COLOR_YELLOW "%ju" COLOR_RESET "",global_settings_string, (uintmax_t)benchmark_result.passes); 
        } ) 
        printf("\n");
    }

    // show results for --show command line option
    if (option.show_explain_factor_max > 0) showResult(option.fixed_benchmark_settings);

    #ifdef COMPILE_TIMERS
    if (option.timers) print_timing_table();
    #endif
    
    if (debug_hits || debug_hits2) { verbose2( printf("Hits: %ju %ju\n",(uintmax_t)debug_hits, (uintmax_t)debug_hits2); ) }

    return 0;
}

#include "sieve_check.h"
#include "sieve_usage.h"
#include "sieve_parseCommandline.h"
#include "sieve_benchmark.h"
#include "sieve_explain.h"
#include "sieve_tune.h"
#include "sieve_validate.h"
#include "sieve_performBenchmark.h"

int main(int argc, char *argv[]) 
{
    parseCommandLine(argc, argv);

    #ifdef PREPARE_FUNCTION
      prepareSieveFunction();
    #endif
  
    verbose3({ printf("Sieve algorithm by Rogier van Dam - 2025\n"
                       "Find all primes up to " COLOR_YELLOW "%ju" COLOR_RESET " using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)\n"
                       , (uintmax_t)option.fixed_benchmark_settings.factor_max);})
    verbose2({ printf("Running sieve variant " COLOR_YELLOW "%s" COLOR_RESET "%s" COLOR_BLUE "%s" COLOR_RESET " with max %ju\n", 
                         algorithm_name, (option.dockerfile_type ? " in docker " : ""), (option.dockerfile_type ? option.dockerfile_type : ""), (uintmax_t)option.fixed_benchmark_settings.factor_max); })

    // command line --check can be used to check the algorithm for all sieve/blocksize combinations
    if (option.check && !isExplainOrTraceMode()) handleCheckOption(option.check, shakeSieve, option.fixed_benchmark_settings);

    int valid = performBenchmarks(option, shakeSieve);

    // // save settings for future --embed use
    // saveLastSettings(option.fixed_benchmark_settings);

    // show results for --show command line option and other developer information
    if (option.show_explain_factor_max > 0 && option.tunelevel <= 4) showResult(shakeSieve, option.fixed_benchmark_settings);

    return valid;
}

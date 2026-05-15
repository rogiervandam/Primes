#include "sieve_check.h"
#include "sieve_parseCommandline.h"
#include "sieve_benchmark.h"
#include "sieve_explain.h"
#include "sieve_tune.h"
#include "sieve_validate.h"
#include "sieve_performBenchmark.h"
#include "sieve_welcome.h"

int main(int argc, char *argv[]) 
{
    parseCommandLine(argc, argv);

    #ifdef PREPARE_FUNCTION
      prepareBenchmark();
    #endif
  
    showWelcomeMessage(algorithm_name, option);

    // command line --check can be used to check the algorithm for all sieve/blocksize combinations
    if (option.check) handleCheckOption(option.check, shakeSieve, option.fixed_benchmark_settings);

    int valid = performBenchmarks(option, shakeSieve, algorithm_name, algorithm_type);

    // show results for --show command line option and other developer information
    showResult(shakeSieve, option.fixed_benchmark_settings);

    return valid;
}

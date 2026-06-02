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
    prepareBenchmark();
    showWelcomeMessage(algorithm_name, option);
    if (option.check) handleCheckOption(option.check, shakeSieve, option.fixed_benchmark_settings);
    int valid = performBenchmarks(option, shakeSieve, algorithm_name, algorithm_type);
    showResult(shakeSieve, option.fixed_benchmark_settings);
    return valid;
}

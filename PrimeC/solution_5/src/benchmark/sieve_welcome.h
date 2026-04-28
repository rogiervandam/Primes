static void
showWelcomeMessage(const char* algorithm_name, options_t option) 
{
    verbose3({ printf("Sieve algorithm by Rogier van Dam - 2025\n"
                       "Find all primes up to " COLOR_YELLOW "%ju" COLOR_RESET " using the Sieve of Eratosthenes (https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)\n"
                       , (uintmax_t)option.fixed_benchmark_settings.factor_max);})
    verbose2({ printf("Running sieve variant " COLOR_YELLOW "%s" COLOR_RESET "%s" COLOR_BLUE "%s" COLOR_RESET " with max %ju\n", 
                         algorithm_name, (option.dockerfile_type ? " in docker " : ""), (option.dockerfile_type ? option.dockerfile_type : ""), (uintmax_t)option.fixed_benchmark_settings.factor_max); })
}
                         
static void usage(char *program_name, int exit_code) 
{
    const char help_text[] =
        "Usage: %s [options] [maximum]\n"
        "Options:\n"
        "  --check                   Check the correctness of the algorithm\n"
        "                            0 - no check\n"
        "                            1 - check prime count for the sieve size\n"
        "                            2 - check prime count for every sieve size\n"
        "                            3 - check prime count for every sieve size and blocksize\n"
        "                            4 - check stripe algorithms for the sieve size\n"
        "                            5 - check stripe algorithms for every sieve size\n"
        "                            6 - check stripe algorithms for the sieve size and every blocksize\n"
        "                            7 - check all and halt\n"
        "  --nocheck                 Skip check of the correctness of the algorithm\n"
#ifdef COMPILE_EXPLAIN
        "  --explain                 Explain the steps of the algorithm - only when compiled for explain\n"
#endif
        "  --help                    This help function\n"
        "  --max                     Set the maximum prime to examine\n"
        "  --set s<prime>            Set the cutoff prime for blockwise striping\n"
        "        m<bits>             Set the cutoff number of bits for wordwise striping\n"
        "        l<bits>             Set the cutoff number of bits for vectorwise striping\n"
        "        b<bits>             Set the block size to a specific <size> in bits\n"
        "  --show  <maximum>         Show the primes found up to the maximum\n"
#ifdef _OPENMP
        "  --threads <count>         Set the maximum number of threads to be used (only when compiled for openmp)\n"
        "                            Use 'all' to use all available threads or 'half' for /2 (e.g. for no hyperthreading)\n"
#endif
        "  --time  <seconds>         The maximum time (in seconds) to run passes of the sieve algorithm\n"
#ifdef COMPILE_TIMERS
        "  --timers                  Give the timings for submodules - only when compiled for timers\n"
#endif
        "  --tune  <level>           find the best settings for the current os and hardware\n"
        "                            0 - no tuning\n"
        "                            1 - fast tuning\n"
        "                            2 - refined tuning\n"
        "                            3 - maximum tuning (takes long)\n"
        "  --verbose <level>         Show more output to a certain level:\n"
        "                            0 - only show result string"
        "                            1 - show result string with additional setings information"
        "                            2 - show general phase progress\n"
        "                            3 - show general progress within the phase\n"
        "                            4 - show actual work\n"
        "                            5 - show high-level plan\n"
        "                            6 - show detailed plan\n"
        "                            7 - show more details\n"
        "                            8 - show debug details\n"
        "                            9 - show timing\n"
        "[maximum] is the heighest prime to examine. Defaults to %ju\n";
    
    verbose1({
        if (exit_code == 0) { fprintf(stdout, help_text, program_name, (uintmax_t)option.fixed_benchmark_settings.factor_max); }
        else {                fprintf(stderr, help_text, program_name, (uintmax_t)option.fixed_benchmark_settings.factor_max); }
    })
    exit(exit_code);
}

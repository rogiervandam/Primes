#pragma once

#include "sieve_checkFunctions.h"

static void deepAnalyzeWithBenchmarkSettings(sieve_t* (*sieveFunction)(const counter_t), benchmark_settings_t benchmark_settings) 
{
    prepareBenchmarkGlobals(benchmark_settings);
    sieve_t* sieve = sieveFunction(benchmark_settings.factor_max);
    deepAnalyzeSieve(sieve, benchmark_settings.factor_max);
    sieve_delete(sieve);
}

static int checkSieveWithBenchmarkSettings(sieve_t* (*sieveFunction)(const counter_t), benchmark_settings_t benchmark_settings) 
{
    benchmark_settings = checkBenchmarkSettings(benchmark_settings);
    prepareBenchmarkGlobals(benchmark_settings);
    const counter_t factor_max = benchmark_settings.factor_max;
    sieve_t* sieve_check = sieveFunction(factor_max);
    const int valid = validateSieve(sieve_check, factor_max);
    verbose1( if (!valid) {
        fprintf(stderr, "The sieve is " COLOR_RED "NOT" COLOR_RESET " valid for settings " COLOR_GREEN "%s" COLOR_RESET " with factor %ju\n", getBenchmarkSettingAsString(benchmark_settings), (uintmax_t) factor_max);
        deepAnalyzeSieve(sieve_check, factor_max);
    })
    sieve_delete(sieve_check);
    return valid;
}

// check with every sievesize, but not with every blocksize
static int __attribute__((cold)) 
checkSieveAlgorithm(sieve_t* (*sieveFunction)(const counter_t), benchmark_settings_t benchmark_settings)
{
    verbose2( printf("Validating variant " COLOR_YELLOW "%s" COLOR_RESET ".. ", algorithm_name); )
    verbose3( printf("\n"); )

    // validate algorithm - run one time for all sizes
    for (counter_t sieveSize_check = 100; sieveSize_check <= 10000000; sieveSize_check *=10) {
        verbose3( printf("..Checking size %ju ...",(uintmax_t)sieveSize_check); ) verbose4( printf("\n"); )
        benchmark_settings.blocksize_bits = sieveSize_check / 2;
        benchmark_settings.factor_max = sieveSize_check;
        benchmark_settings = checkBenchmarkSettings(benchmark_settings);

        int valid = checkSieveWithBenchmarkSettings(sieveFunction, benchmark_settings); 

        if (!valid) {
            verbose1( fprintf(stderr,"Invalid count for %ju Settings used: %s\n",(uintmax_t)sieveSize_check, getBenchmarkSettingAsString(benchmark_settings)); )
            deepAnalyzeWithBenchmarkSettings(sieveFunction, benchmark_settings);
            if (option.check == 7) exit(1);
            return valid;
        }
        verbose3( printf(COLOR_GREEN "valid" COLOR_RESET " for %ju Settings used: %s\n", (uintmax_t)sieveSize_check, getBenchmarkSettingAsString(benchmark_settings)); )
    }
    verbose2( printf(COLOR_GREEN "valid" COLOR_RESET " algorithm\n"); )
    
    return 1;
}

// check with every sievesize and blocksize
static int __attribute__((cold)) 
checkSieveAlgorithmAll(sieve_t* (*sieveFunction)(const counter_t), benchmark_settings_t benchmark_settings)
{
    verbose2( printf("Validating variant " COLOR_YELLOW "%s" COLOR_RESET " with different block sizes... ", algorithm_name); ) verbose3( printf("\n"); ) 

    // validate algorithm - run one time for all sizes
    for (counter_t sieveSize_check = 100; sieveSize_check <= 1000000; sieveSize_check *=10) {
        verbose3( {
            printf("..Checking size %ju ...",(uintmax_t)sieveSize_check); 
            verbose4( printf("\n"); )
        })
        for (counter_t blocksize_bits=1024; blocksize_bits<=32*1024*8; blocksize_bits *= 2) {
            verbose4( printf("....Blocksize %ju:",(uintmax_t)blocksize_bits); )
            benchmark_settings.blocksize_bits = blocksize_bits;
            benchmark_settings.factor_max = sieveSize_check;
            benchmark_settings = checkBenchmarkSettings(benchmark_settings);
            int valid = checkSieveWithBenchmarkSettings(sieveFunction, benchmark_settings); 

            if (!valid) {
                verbose1( printf("Test\n"); )
                verbose1( fprintf(stderr,"Invalid count for %ju Settings used: %s\n",(uintmax_t)sieveSize_check, getBenchmarkSettingAsString(benchmark_settings)); )
                deepAnalyzeWithBenchmarkSettings(sieveFunction, benchmark_settings);
                if (option.check == 7) exit(1);
                return valid;
            }
            else {
                verbose4( printf(COLOR_GREEN "valid" COLOR_RESET " for %ju Settings used: %s\n", (uintmax_t)sieveSize_check, getBenchmarkSettingAsString(benchmark_settings)); )
            }
        }
        verbose3( printf(COLOR_GREEN "valid" COLOR_RESET " for %ju Settings used: %s\n", (uintmax_t)sieveSize_check, getBenchmarkSettingAsString(benchmark_settings)); )
    }
    verbose2( printf(COLOR_GREEN "valid" COLOR_RESET " algorithm\n"); )
    
    return 1;
}

static void __attribute__((cold)) 
showResult(sieve_t* (*sieveFunction)(const counter_t), benchmark_settings_t benchmark_settings)
{
    verbose2( printf("Show result set:\n"); )
    sieve_t* sieve = sieveFunction(benchmark_settings.factor_max);
    showPrimesinSieve(sieve, option.show_explain_factor_max);
    counter_t prime_count = countPrimesInSieve(sieve, benchmark_settings.factor_max);
    verbose1( printf("\nFound %ju primes until %ju\n",(uintmax_t)prime_count, (uintmax_t)benchmark_settings.factor_max); )
    sieve_delete(sieve);
}

static inline void __attribute__((cold)) 
handleCheckOption(int check, sieve_t* (*sieveFunction)(const counter_t), benchmark_settings_t benchmark_settings) {
    #ifdef COMPILE_CHECK_STRIPERS
    if (check >= 4) checkSetBitsTrueMethods(setBitsTrueMethods, 0, benchmark_settings.factor_max);
    if (check >= 5) {
        for (counter_t sieveSize_check = 100; sieveSize_check <= 1000000; sieveSize_check *=10) {
            checkSetBitsTrueMethods(setBitsTrueMethods, 0, sieveSize_check);
        }
    }
    if (check >= 6) checkSetBitsTrueMethodsBlocks(setBitsTrueMethods, 0, benchmark_settings.factor_max);
    #endif

    if (check >= 1) if (!checkSieveWithBenchmarkSettings(sieveFunction, benchmark_settings)) exit(1);
    if (check >= 2) if (!checkSieveAlgorithm(sieveFunction, benchmark_settings)) exit(1);
    if (check >= 3) if (!checkSieveAlgorithmAll(sieveFunction, benchmark_settings)) exit(1);

    if (check == 1) exit(0);
    if (check == 3) exit(0);
    if (check == 7) exit(0);
}

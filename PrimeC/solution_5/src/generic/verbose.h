
#ifndef VERBOSE_GUARD
#define VERBOSE_GUARD

#include "../benchmark/sieve_functions.h"

// Verbose level allows some code to only be compiled when targeting a certain verbose level
#ifdef COMPILE_EXPLAIN
  #if COMPILE_VERBOSE_LEVEL < 7
     #undef COMPILE_VERBOSE_LEVEL
     #define COMPILE_VERBOSE_LEVEL 7
  #endif
#endif

#define verbose(level, statement) if (option.verbose_level >= level) statement

#define verbose0(statement) statement
#define verbose1(statement)
#define verbose2(statement)
#define verbose3(statement)
#define verbose4(statement)
#define verbose5(statement)
#define verbose6(statement)
#define verbose7(statement)
#define verbose8(statement)
#define verbose9(statement)
#define verbose_at2(statement)
#define verbose_at3(statement)

#if COMPILE_VERBOSE_LEVEL >= 1
  #undef verbose1
  #define verbose1(statement) verbose(1, statement)
#endif
#if COMPILE_VERBOSE_LEVEL >= 2
  #undef verbose2
  #define verbose2(statement) verbose(2, statement)
  #undef verbose_at2
  #define verbose_at2(statement) if (option.verbose_level == 2) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 3
  #undef verbose3
  #define verbose3(statement) verbose(3, statement)
  #undef verbose_at3
  #define verbose_at3(statement) if (option.verbose_level == 3) statement
#endif
#if COMPILE_VERBOSE_LEVEL >= 4
  #undef verbose4
  #define verbose4(statement) verbose(4, statement)
#endif
#if COMPILE_VERBOSE_LEVEL >= 5
  #undef verbose5
  #define verbose5(statement) verbose(5, statement)
  #undef verbose6
  #define verbose6(statement) verbose(6, statement)
  #undef verbose7
  #define verbose7(statement) verbose(7, statement)
  #undef verbose8
  #define verbose8(statement) verbose(8, statement)
  #undef verbose9
  #define verbose9(statement) verbose(9, statement)
  #undef verbose9
  #define verbose9(statement) if (option.verbose_level >= 10) { waitforkey(); { statement } }
#endif

// #define verbose(level, statement) function(verbose, level)(statement)
#endif

// #include "../generic/log.h"
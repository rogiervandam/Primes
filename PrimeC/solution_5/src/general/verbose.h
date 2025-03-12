
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

#if compile_verbose_level >= 1
  #undef verbose1
  #define verbose1(statement) statement
#endif
#if compile_verbose_level >= 2
  #undef verbose2
  #define verbose2(statement) if (option.verbose_level >= 2) statement
  #undef verbose_at2
  #define verbose_at2(statement) if (option.verbose_level == 2) statement
#endif
#if compile_verbose_level >= 3
  #undef verbose3
  #define verbose3(statement) if (option.verbose_level >= 3) statement
  #undef verbose_at3
  #define verbose_at3(statement) if (option.verbose_level == 3) statement
#endif
#if compile_verbose_level >= 4
  #undef verbose4
  #define verbose4(statement) if (option.verbose_level >= 4) statement
#endif
#if compile_verbose_level >= 5
  #undef verbose5
  #define verbose5(statement) if (option.verbose_level >= 5) statement
#endif
#if compile_verbose_level >= 6
  #undef verbose6
  #define verbose6(statement) if (option.verbose_level >= 6) statement
#endif
#if compile_verbose_level >= 7
  #undef verbose7
  #define verbose7(statement) if (option.verbose_level >= 7) statement
#endif
#if compile_verbose_level >= 8
  #undef verbose8
  #define verbose8(statement) if (option.verbose_level >= 8) statement
#endif
#if compile_verbose_level >= 9
  #undef verbose9
  #define verbose9(statement) if (option.verbose_level >= 9) statement
#endif
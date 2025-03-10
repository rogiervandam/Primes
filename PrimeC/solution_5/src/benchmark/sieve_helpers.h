// This file contains all helper functions

// defaults
#define compile_verbose_level           3  // Set to 1-4 to enable compiling different verbose levels
#define anticiped_cache_line_bytesize   256 // How to align the caches
// #define COMPILE_CHECKALL                 // Set to 1 to enable all checks

#ifdef COMPILE_EXPLAIN // define compile_explain with compilation options
#undef compile_verbose_level
#define compile_verbose_level           7
#endif

#define bitshift_t uint64_t // type used to shift bits
#define counter_t  int32_t  // type used to count loops, etc. Some processors/compilers are faster at 32 bits

#if defined(counter_t) && (counter_t == int32_t || counter_t == uint32_t)
    #define COUNTER_T_MAX_SAFE_VALUE 1000000000ULL
#elif defined(counter_t) && (counter_t == int64_t || counter_t == uint64_t)
    #define COUNTER_T_MAX_SAFE_VALUE 10000000000ULL
#else
    #error "counter_t must be defined as int32_t, uint32_t, int64_t, or uint64_t"
#endif

//set compile_debuggable to 1 to enable explain plan
// #define compile_debuggable (0 || compile_explain_level)
// #if compile_debuggable
// #define debug if (compile_debuggable && option.explain)
// #else
// #define debug if unlikely(0)
// #endif

// set this to the level of verbose messages that will be compiled
  // #define verbose(level)    if (level <= compile_verbose_level) if (option.verbose_level >= level) 
  // #define verbose_at(level) if (level <= compile_verbose_level) if (option.verbose_level == level) 
// #endif

#define verbose1(statement)
#define verbose2(statement)
#define verbose3(statement)
#define verbose4(statement)
#define verbose5(statement)
#define verbose6(statement)
#define verbose7(statement)
#define verbose_at2(statement)
#define verbose_at3(statement)

#if compile_verbose_level >= 1
  #undef verbose1
  #define verbose1(statement) if (option.verbose_level >= 1) statement
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

// helper calc functions
#define pow(base,pow)       (pow*((base>>pow)&1U))
#define min(a,b)            ((a<b) ? a : b)
#define max(a,b)            ((a<b) ? b : a)
#define safe_diff(a,b)      ((a>b) ? (a-b) : 0)

// helper compile time check functions
#define uintsafeminus(a,b)  ((a>b)?(a-b):0)
#define likely(x)           (__builtin_expect((x),1))
#define unlikely(x)         (__builtin_expect((x),0))
#define is_signed(type) (((type)-1)<0)

#define PPCAT_NX(A, B) A ## B
#define PPCAT(A, B) PPCAT_NX(A, B)

#if defined u16_v2
#define bitword_t       uint16_t
#define VECTOR_ELEMENTS 2
#define VECTOR_SETTING  u16_v2
#define SAFE_SHIFT 1 // - set to 1 for 32<= bit (needs mask on shift)
#elif defined u32_v2
#define bitword_t       uint32_t
#define VECTOR_ELEMENTS 2
#define VECTOR_SETTING  u32_v2
#elif defined u64_v2
#define bitword_t       uint64_t
#define VECTOR_ELEMENTS 2
#define VECTOR_SETTING  u64_v2
#define WORD_SIZE_64    64
#elif defined u8_v4
#define bitword_t       uint8_t
#define VECTOR_ELEMENTS 4
#define VECTOR_SETTING  u8_v4
#define SAFE_SHIFT 1 // - set to 1 for 32<= bit (needs mask on shift)
#elif defined u16_v4
#define bitword_t       uint16_t
#define VECTOR_ELEMENTS 4
#define VECTOR_SETTING  u16_v4
#define SAFE_SHIFT 1 // - set to 1 for 32<= bit (needs mask on shift)
#elif defined u32_v4
#define bitword_t       uint32_t
#define VECTOR_ELEMENTS 4
#define VECTOR_SETTING  u32_v4
#elif defined u64_v4
#define bitword_t       uint64_t
#define VECTOR_ELEMENTS 4
#define VECTOR_SETTING  u64_v4
#define WORD_SIZE_64    64
#elif defined u8_v8
#define bitword_t       uint8_t
#define VECTOR_ELEMENTS 8
#define VECTOR_SETTING  u8_v8
#define SAFE_SHIFT 1 // - set to 1 for 32<= bit (needs mask on shift)
#elif defined u16_v8
#define bitword_t       uint16_t
#define VECTOR_ELEMENTS 8
#define VECTOR_SETTING  u16_v8
#define SAFE_SHIFT 1 // - set to 1 for 32<= bit (needs mask on shift)
#elif defined u32_v8
#define bitword_t       uint32_t
#define VECTOR_ELEMENTS 8
#define VECTOR_SETTING  u32_v8
#define SAFE_SHIFT 1 // - set to 1 for 32<= bit (needs mask on shift)
#elif defined u64_v8
#define bitword_t       uint64_t
#define VECTOR_ELEMENTS 8
#define VECTOR_SETTING  u64_v8
#define WORD_SIZE_64    64
#endif

// defaults
#ifndef bitword_t
#define bitword_t  uint64_t // type used to store bits
#endif
#ifndef VECTOR_ELEMENTS
#define VECTOR_ELEMENTS 4
#endif
#ifndef VECTOR_SETTING
#define VECTOR_SETTING PPCAT(bitword_t,VECTOR_ELEMENTS)
#endif

// follow main bitword setting in vectors. Change is otherwise needed
#define bitword_vector_t bitword_t
#ifdef WORD_SIZE_64
#define VECTORWORDSIZE_64 64 // enable this is wordsize is 64 - will allow further optimizations
#endif

// masks and mask helpers
#define SHIFT_BYTE          3
#define WORD_SIZE           (sizeof(bitword_t)*8)
#define WORD_SIZE_counter   ((counter_t)WORD_SIZE)
#define WORD_SIZE_bitshift  ((bitshift_t)WORD_SIZE)
#define SHIFT_WORD          ((bitshift_t)(pow(WORD_SIZE,1)+pow(WORD_SIZE,2)+pow(WORD_SIZE,3)+pow(WORD_SIZE,4)+pow(WORD_SIZE,5)+pow(WORD_SIZE,6)+pow(WORD_SIZE,7)+pow(WORD_SIZE,8)+pow(WORD_SIZE,9)+pow(WORD_SIZE,10)))

#define VECTORWORD_SIZE           (sizeof(bitword_vector_t)*8)
#define VECTORWORD_SIZE_counter   ((counter_t)VECTORWORD_SIZE)
#define VECTORWORD_SIZE_bitshift  ((bitshift_t)VECTORWORD_SIZE)
#define SHIFT_VECTORWORD          ((bitshift_t)(pow(VECTORWORD_SIZE,1)+pow(VECTORWORD_SIZE,2)+pow(VECTORWORD_SIZE,3)+pow(VECTORWORD_SIZE,4)+pow(VECTORWORD_SIZE,5)+pow(VECTORWORD_SIZE,6)+pow(VECTORWORD_SIZE,7)+pow(VECTORWORD_SIZE,8)+pow(VECTORWORD_SIZE,9)+pow(VECTORWORD_SIZE,10)))

#define VECTOR_SIZE_bytes   (sizeof(bitword_vector_t)*VECTOR_ELEMENTS)
#define VECTOR_SIZE         (VECTOR_SIZE_bytes*8)
#define VECTOR_SIZE_counter ((counter_t)VECTOR_SIZE_bytes*8)
#define SHIFT_VECTOR        ((bitshift_t)(pow(VECTOR_SIZE,1)+pow(VECTOR_SIZE,2)+pow(VECTOR_SIZE,3)+pow(VECTOR_SIZE,4)+pow(VECTOR_SIZE,5)+pow(VECTOR_SIZE,6)+pow(VECTOR_SIZE,7)+pow(VECTOR_SIZE,8)+pow(VECTOR_SIZE,9)+pow(VECTOR_SIZE,10)))

// types (II) - calculated
typedef bitword_vector_t bitvector_t __attribute__ ((vector_size(VECTOR_SIZE_bytes), aligned(anticiped_cache_line_bytesize))); 
// typedef bitword_vector_t bitvector_t __attribute__ ((vector_size(VECTOR_SIZE_bytes), aligned(64))); 

// this might be handy
// typedef union {
//   bitvector_t vec;
//   char dummy[sizeof(bitvector_t) < anticiped_cache_line_bytesize ? anticiped_cache_line_bytesize : sizeof(bitvector_t)];
// } aligned_bitvector_t;

// globals for tuning
static counter_t global_stripeprime_faster  = 32ULL; // if step > BLOCKSTEP use blocks, else use the whole sieve
static counter_t global_mediumstep_faster   = 16ULL; // if step < MEDIUMSTEP_FASTER, use medium steps
static counter_t global_largestep_faster    = 128ULL; // if step < VECTORSTAP_FASTER, use large steps
static counter_t global_blocksize_bits      = 128*1024*8; // blocksize in bits
static counter_t debug_hits                 = 0;
static counter_t debug_hits2                = 0;
static counter_t debug_final_benchmarking   = 0;
static counter_t debug_final_plan           = 0;

// Patterns based on types
#define SAFE_SHIFTBIT        (bitshift_t)1ULL
#define SAFE_ZERO            (bitword_t)0ULL
#define SAFE_FILL            (bitword_t)~0ULL
#define BITWORD_SHIFTBIT     (bitword_t)1ULL
#define BITVECTORWORD_SHIFTBIT (bitword_vector_t)1ULL
#define WORDMASK             ((((counter_t)1)<<SHIFT_WORD)-(counter_t)1)
#define VECTORWORDMASK       ((((counter_t)1)<<SHIFT_VECTORWORD)-(counter_t)1)
#define VECTORMASK           ((((counter_t)1)<<SHIFT_VECTOR)-(counter_t)1)
#if VECTOR_ELEMENTS == 8
  #define VECTOR_BASE(pattern) ((bitvector_t){ pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern })
  #define VECTOR_BYTEINDEX     ((bitvector_t){ 0, 1, 2, 3, 4, 5, 6, 7 })
#elif VECTOR_ELEMENTS == 4
  #define VECTOR_BASE(pattern) ((bitvector_t){ pattern, pattern, pattern, pattern })
  #define VECTOR_BYTEINDEX     ((bitvector_t){ 0, 1, 2, 3 })
#else
  #define VECTOR_BASE(pattern) ((bitvector_t){ pattern, pattern })
  #define VECTOR_BYTEINDEX     ((bitvector_t){ 0, 1})
#endif
// helpder functions for word/vector indexing
#define wordindex(index)     (((counter_t)index) >> SHIFT_WORD)
#define wordend(index)       ((counter_t)(index) |  WORDMASK)
#define wordstart(index)     ((counter_t)(index) &  (counter_t)(~WORDMASK))
#define vectorindex(index)   (((counter_t)index) >> (bitshift_t)SHIFT_VECTOR)
#define vectorstart(index)   (((counter_t)index) &  (counter_t)~VECTORMASK)
#define vectorend(index)     (((counter_t)index) |  (counter_t)VECTORMASK)
#define vector_wordstart(index)     ((counter_t)(index) & (counter_t)(~VECTORWORDMASK))
#define vector_wordindex(index)     (((counter_t)index) >> SHIFT_VECTORWORD)
// #define vectorfromword(word) ((counter_t)(word ) >> (counter_t)SHIFT_VECTOR-SHIFT_WORD))
// #define wordinvector(index)  (((counter_t)index >> SHIFT_WORD) & (VECTORMASK >> SHIFT_WORD))

// modern processors do a & over the shiftssize, so we only have to do that ourselve when using the shiftsize in calculations. 
#define bitindex_calc(index)        ((bitshift_t)(((counter_t)(index))&((counter_t)(WORDMASK))))
#define vector_bitindex(index)      ((bitshift_t)(index))
#define vector_bitindex_calc(index) ((bitshift_t)(((counter_t)(index))&((counter_t)(VECTORWORDMASK))))

// #define wordindex(index)     ((index) >> SHIFT_WORD)
// #define wordend(index)       ((index) |  WORDMASK)
// #define wordstart(index)     ((index) &  (~WORDMASK))
// #define vectorindex(index)   ((index) >> SHIFT_VECTOR)
// #define vectorstart(index)   ((index) &  ~VECTORMASK)
// #define vectorend(index)     ((index) |  VECTORMASK)
// #define vector_wordstart(index)     ((index) & (~VECTORWORDMASK))
// #define vector_wordindex(index)     ((index) >> SHIFT_VECTORWORD)
// // #define vectorfromword(word) ((counter_t)(word ) >> (counter_t)SHIFT_VECTOR-SHIFT_WORD))
// // #define wordinvector(index)  (((counter_t)index >> SHIFT_WORD) & (VECTORMASK >> SHIFT_WORD))

// // modern processors do a & over the shiftssize, so we only have to do that ourselve when using the shiftsize in calculations. 
// #define bitindex_calc(index)        ((((index))&(WORDMASK)))
// #define vector_bitindex(index)      ((index))
// #define vector_bitindex_calc(index) ((((index))&(VECTORWORDMASK)))



#if SAFE_SHIFT == 1
#define bitindex(index)      ((bitshift_t)(index)&((bitshift_t)(WORDMASK)))
#else
#define bitindex(index)      ((bitshift_t)(index))
#endif

#define markmask(index)        (BITWORD_SHIFTBIT << bitindex(index))
#define markmask_calc(index)   (BITWORD_SHIFTBIT << bitindex_calc(index))

// vector_markmask
#ifdef VECTORWORDSIZE_64 // mask will be applied automatically
#define vector_markmask(index) (BITVECTORWORD_SHIFTBIT << vector_bitindex(index))
#else
#define vector_markmask(index) (BITVECTORWORD_SHIFTBIT << vector_bitindex_calc(index))
#endif

#define chopmask(index)        (SAFE_FILL >> (WORD_SIZE_bitshift-SAFE_SHIFTBIT-bitindex_calc(index)))
#define keepmask(index)        (SAFE_FILL << (bitindex(index)))

// builtin_ffs
#ifdef WORD_SIZE_64
    #define builtin_ffs(x) __builtin_ffsll((int64_t)(x))
#else
    #define builtin_ffs(x) __builtin_ffsl((int32_t)(x))
#endif

// builtin_ctz
#ifdef WORD_SIZE_64
    #define builtin_ctz(x) __builtin_ctzll((int64_t)(x))
#else
    #define builtin_ctz(x) __builtin_ctzl((int32_t)(x))
#endif

// used only for debugging
static inline void printWord(bitword_t bitword)
{
    char row[WORD_SIZE*2] = {};
    int col=0;
    for (int i=WORD_SIZE-1; i>=0; i--) {
      row[col++] = (bitword & (BITWORD_SHIFTBIT<<i))?'1':'.';
      if (!(i%8)) row[col++] = ' ';
    }

    printf("%s", row);
}

static void printVector(bitvector_t bitvector)
{
    // Use a union to extract the scalar elements from the vector
    union {
        bitvector_t vec;
        bitword_t arr[VECTOR_ELEMENTS];
    } u;
    u.vec = bitvector;

    char row[VECTOR_SIZE*2] = {0};
    int col = 0;
    // Each vector element is a bitword_t with WORD_SIZE bits
    for (int j = VECTOR_ELEMENTS - 1; j >= 0; j--) {
        for (int i = WORD_SIZE - 1; i >= 0; i--) {
            row[col++] = (u.arr[j] & (BITWORD_SHIFTBIT << i)) ? '1' : '.';
            if (i % 8 == 0)
                row[col++] = ' ';
        }
        row[col++] = 'x'; row[col++] = ' ';
      }
    row[col] = '\0';
    printf("%s\n", row);
}

static void printVectorNumeric(bitvector_t bitvector)
{
  for(counter_t i=0; i < VECTOR_ELEMENTS; i++) {
        printf("%ju,", (uintmax_t) bitvector[i]);
  }
  printf("\n");	
}

static unsigned int usqrt(int n)
{
    unsigned int x;
    unsigned int xLast;

    xLast = 0;
    x = n / 2;

    while (x != xLast) {
        xLast = x;
        x = (x + n / x) / 2;
    }
    return x;
}





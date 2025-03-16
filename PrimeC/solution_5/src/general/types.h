#if COUNTER_T_SIZE_PP == 32
    #define COUNTER_T_MAX_SAFE_VALUE 1000000000ULL
#elif COUNTER_T_SIZE_PP == 64
    #define COUNTER_T_MAX_SAFE_VALUE 10000000000ULL
#endif

#ifndef VECTOR_ELEMENTS
#define VECTOR_ELEMENTS 4
#endif

// follow main bitword setting in vectors. Change is otherwise needed
#ifndef bitword_vector_t
  #define bitword_vector_t uint64_t
  #define VECTORWORDSIZE_PP 64
#endif

// masks and mask helpers
#define SHIFT_SIZE                  1 // the shift needed to get from SIZE to BIT (1 because even numbers arr not storing in the bitstorage)
#define SHIFT_BYTE                  3 // the shift needed to get from BIT to BYTE
#define WORD_SIZE_BITS              (sizeof(bitword_t) * 8)
#define VECTORWORD_SIZE_BITS        (sizeof(bitword_vector_t) * 8)
#define VECTOR_SIZE_BYTES           (sizeof(bitword_vector_t)*VECTOR_ELEMENTS)
#define VECTOR_SIZE_BITS            (VECTOR_SIZE_BYTES * 8)
#define SHIFT_WORD                  ((pow(WORD_SIZE_BITS,1)+pow(WORD_SIZE_BITS,2)+pow(WORD_SIZE_BITS,3)+pow(WORD_SIZE_BITS,4)+pow(WORD_SIZE_BITS,5)+pow(WORD_SIZE_BITS,6)+pow(WORD_SIZE_BITS,7)+pow(WORD_SIZE_BITS,8)+pow(WORD_SIZE_BITS,9)+pow(WORD_SIZE_BITS,10)))
#define SHIFT_VECTORWORD            ((pow(VECTORWORD_SIZE_BITS,1)+pow(VECTORWORD_SIZE_BITS,2)+pow(VECTORWORD_SIZE_BITS,3)+pow(VECTORWORD_SIZE_BITS,4)+pow(VECTORWORD_SIZE_BITS,5)+pow(VECTORWORD_SIZE_BITS,6)+pow(VECTORWORD_SIZE_BITS,7)+pow(VECTORWORD_SIZE_BITS,8)+pow(VECTORWORD_SIZE_BITS,9)+pow(VECTORWORD_SIZE_BITS,10)))
#define SHIFT_VECTOR                ((pow(VECTOR_SIZE_BITS,1)+pow(VECTOR_SIZE_BITS,2)+pow(VECTOR_SIZE_BITS,3)+pow(VECTOR_SIZE_BITS,4)+pow(VECTOR_SIZE_BITS,5)+pow(VECTOR_SIZE_BITS,6)+pow(VECTOR_SIZE_BITS,7)+pow(VECTOR_SIZE_BITS,8)+pow(VECTOR_SIZE_BITS,9)+pow(VECTOR_SIZE_BITS,10)+pow(VECTOR_SIZE_BITS,11)+pow(VECTOR_SIZE_BITS,12)))

// Patterns based on types
#define SAFE_SHIFTBIT               (bitshift_t)        1
#define SAFE_ZERO                   (bitword_t)         0
#define VECTOR_SAFE_ZERO            (bitword_vector_t)  0
#define SAFE_FILL                   (bitword_t)        ~0
#define BITWORD_SHIFTBIT            (bitword_t)         1
#define BITVECTORWORD_SHIFTBIT      (bitword_vector_t)  1
#define WORDMASK                    ((SAFE_SHIFTBIT<<SHIFT_WORD      )-SAFE_SHIFTBIT)
#define VECTORWORDMASK              ((SAFE_SHIFTBIT<<SHIFT_VECTORWORD)-SAFE_SHIFTBIT)
#define VECTORMASK                  ((SAFE_SHIFTBIT<<SHIFT_VECTOR    )-SAFE_SHIFTBIT)

typedef bitword_vector_t bitvector_t __attribute__ ((vector_size( VECTOR_SIZE_BYTES ), aligned( cache_line_bytes ))); 

#if VECTOR_ELEMENTS == 16
  #define VECTOR_BASE(pattern)      ((bitvector_t){ pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern })
  #define VECTOR_BYTEINDEX          ((bitvector_t){ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 })
#elif VECTOR_ELEMENTS == 8
  #define VECTOR_BASE(pattern)      ((bitvector_t){ pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern })
  #define VECTOR_BYTEINDEX          ((bitvector_t){ 0, 1, 2, 3, 4, 5, 6, 7 })
#elif VECTOR_ELEMENTS == 4
  #define VECTOR_BASE(pattern)      ((bitvector_t){ pattern, pattern, pattern, pattern })
  #define VECTOR_BYTEINDEX          ((bitvector_t){ 0, 1, 2, 3 })
#else
  #define VECTOR_BASE(pattern)      ((bitvector_t){ pattern, pattern })
  #define VECTOR_BYTEINDEX          ((bitvector_t){ 0, 1})
#endif

// helper macros for word/vector indexing
#define wordindex(index)            ((index) >>       SHIFT_WORD)
#define wordend(index)              ((index) |          WORDMASK)
#define wordstart(index)            ((index) &         ~WORDMASK)
#define vectorindex(index)          ((index) >>     SHIFT_VECTOR)
#define vectorstart(index)          ((index) &       ~VECTORMASK)
#define vectorend(index)            ((index) |        VECTORMASK)
#define vector_wordstart(index)     ((index) &   ~VECTORWORDMASK)
#define vector_wordindex(index)     ((index) >> SHIFT_VECTORWORD)

#define bitindex_calc(index)        ((index) & WORDMASK)
#define vector_bitindex(index)      (index)
#define vector_bitindex_calc(index) ((index) & VECTORWORDMASK)

#if BITWORD_T_SIZE_PP == 64
#define bitindex(index)             (index)
#else
#define bitindex(index)             ((index)&(WORDMASK))
#endif

// helper macros for masking and shifting
#define markmask(index)             (BITWORD_SHIFTBIT << bitindex(index))
#define markmask_calc(index)        (BITWORD_SHIFTBIT << bitindex_calc(index))
#define chopmask(index)             (SAFE_FILL >> (WORD_SIZE_BITS - SAFE_SHIFTBIT - bitindex_calc(index)))
#define keepmask(index)             (SAFE_FILL << (bitindex(index)))

// vector_markmasks
// modern processors do a & over the shiftssize, so we only have to do that ourselve when using the shiftsize in calculations. 
#if VECTORWORDSIZE_PP == 64 //mask will be applied automatically
#define vector_markmask(index)      (BITVECTORWORD_SHIFTBIT << vector_bitindex(index))
#else
#define vector_markmask(index)      (BITVECTORWORD_SHIFTBIT << vector_bitindex_calc(index))
#endif

#define vector_markmask_calc(index) (BITVECTORWORD_SHIFTBIT << vector_bitindex_calc(index))



// builtin_ffs
#if BITWORD_T_SIZE_PP == 64
    #define builtin_ffs(x) __builtin_ffsll((int64_t)(x))
#else
    #define builtin_ffs(x) __builtin_ffsl((int32_t)(x))
#endif

// builtin_ctz
#if BITWORD_T_SIZE_PP == 64
    #define builtin_ctz(x) __builtin_ctzll((int64_t)(x))
#else
    #define builtin_ctz(x) __builtin_ctzl((int32_t)(x))
#endif


// globals for tuning
static counter_t global_stripeprime_faster  = 32ULL; // if step > BLOCKSTEP use blocks, else use the whole sieve
static counter_t global_mediumstep_faster   = 16ULL; // if step < MEDIUMSTEP_FASTER, use medium steps
static counter_t global_largestep_faster    = 128ULL; // if step < VECTORSTAP_FASTER, use large steps
static counter_t global_blocksize_bits      = 128*1024*8; // blocksize in bits
static counter_t debug_hits                 = 0;
static counter_t debug_hits2                = 0;
static counter_t debug_final_benchmarking   = 0;
static counter_t debug_final_plan           = 0;

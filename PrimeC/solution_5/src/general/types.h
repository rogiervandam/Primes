#if COUNTER_T_SIZE_PP == 32
    #define COUNTER_T_MAX_SAFE_VALUE 1000000000ULL
#elif COUNTER_T_SIZE_PP == 64
    #define COUNTER_T_MAX_SAFE_VALUE 10000000000ULL
#endif

#ifndef VECTOR_ELEMENTS
#define VECTOR_ELEMENTS 4
#endif

// follow main bitword setting in vectors. Change is otherwise needed
#define bitword_vector_t bitword_t
#define VECTORWORDSIZE_PP BITWORD_T_SIZE_PP 

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

// modern processors do a & over the shiftssize, so we only have to do that ourselve when using the shiftsize in calculations. 
#define bitindex_calc(index)        ((bitshift_t)(((counter_t)(index))&((counter_t)(WORDMASK))))
#define vector_bitindex(index)      ((bitshift_t)(index))
#define vector_bitindex_calc(index) ((bitshift_t)(((counter_t)(index))&((counter_t)(VECTORWORDMASK))))

#if BITWORD_T_SIZE_PP == 64
#define bitindex(index)      ((bitshift_t)(index))
#else
#define bitindex(index)      ((bitshift_t)(index)&((bitshift_t)(WORDMASK)))
#endif

#define markmask(index)        (BITWORD_SHIFTBIT << bitindex(index))
#define markmask_calc(index)   (BITWORD_SHIFTBIT << bitindex_calc(index))

// vector_markmask
#if VECTORWORDSIZE_PP == 64 //mask will be applied automatically
#define vector_markmask(index) (BITVECTORWORD_SHIFTBIT << vector_bitindex(index))
#else
#define vector_markmask(index) (BITVECTORWORD_SHIFTBIT << vector_bitindex_calc(index))
#endif

#define chopmask(index)        (SAFE_FILL >> (WORD_SIZE_bitshift-SAFE_SHIFTBIT-bitindex_calc(index)))
#define keepmask(index)        (SAFE_FILL << (bitindex(index)))

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



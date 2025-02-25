// This file contains all helper functions

//set compile_debuggable to 1 to enable explain plan
#define compile_debuggable (0 || compile_explain_level)
#if compile_debuggable
#define debug if (compile_debuggable && option.explain)
#else
#define debug if unlikely(0)
#endif

// set this to the level of verbose messages that will be compiled
#define verbose(level)    if (level <= compile_verbose_level) if (option.verboselevel >= level) if (!(option.verboselevel >= 3 && option.explain == 0)) 
#define verbose_at(level) if (level <= compile_verbose_level) if (option.verboselevel == level) if (!(option.verboselevel >= 3 && option.explain == 0)) 

// helper calc functions
#define pow(base,pow)       (pow*((base>>pow)&1U))
#define min(a,b)            ((a<b) ? a : b)

// helper compile time check functions
#define uintsafeminus(a,b)  ((a>b)?(a-b):0)
#define likely(x)           (__builtin_expect((x),1))
#define unlikely(x)         (__builtin_expect((x),0))
#define is_signed(type) (((type)-1)<0)

// helper functions for timing parts of code in debugging mode
// call timerLapStart() to start timing a part of code
// call timerLapTime() to mark this lap and output the elapsed time with color for extra quick feedback
static struct timespec timer_lap, timer_elapsed;
#define timerLapStart() clock_gettime(CLOCK_PROCESS_CPUTIME_ID ,&timer_lap)
void timerLapTime() {
    clock_gettime(CLOCK_PROCESS_CPUTIME_ID ,&timer_elapsed);
    long seconds = timer_elapsed.tv_sec - timer_lap.tv_sec;
    long nanoseconds = timer_elapsed.tv_nsec - timer_lap.tv_nsec;
    double elapsed_time = seconds*1e-9 + nanoseconds;
    // double elapsed_time = timer_elapsed.tv_sec + timer_elapsed.tv_nsec*1e-9 - timer_lap.tv_sec - timer_lap.tv_nsec*1e-9;
    if      (elapsed_time > 2000) printf("...time: \033[0;31m%.0f\033[0m ns\n", elapsed_time);
    else if (elapsed_time > 1000) printf("...time: \033[0;35m%.0f\033[0m ns\n", elapsed_time);
    else if (elapsed_time > 100)  printf("...time: \033[0;36m%.0f\033[0m ns\n", elapsed_time);
    else                          printf("...time: %.0f ns\n", elapsed_time);
}


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

// DEFAULTS
#ifndef bitword_t
#define bitword_t  uint64_t // type used to store bits
#endif
#ifndef VECTOR_ELEMENTS
#define VECTOR_ELEMENTS 4
#endif
#ifndef VECTOR_SETTING
#define VECTOR_SETTING PPCAT(bitword_t,VECTOR_ELEMENTS)
#endif

// types

// follow main bitword setting in vectors. Change is otherwise needed
#define bitword_vector_t bitword_t
#ifdef WORD_SIZE_64
#define VECTORWORDSIZE_64 64 // enable this is wordsize is 64 - will allow further optimizations
#endif

#define bitshift_t uint64_t // type used to shift bits
#define counter_t  uint64_t // type used to count loops, etc


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
typedef bitword_vector_t bitvector_t __attribute__ ((vector_size(VECTOR_SIZE_bytes))); 

// globals for tuning
// #define BLOCKWISE_FASTER_prime_min ((counter_t)0)
// #define MEDIUMSTEP_FASTER ((counter_t)16)
// #define VECTORSTEP_FASTER ((counter_t)0)
static counter_t global_BLOCKWISE_FASTER_prime_min  =   0ULL; // if step > BLOCKSTEP use blocks, else use the whole sieve
static counter_t global_MEDIUMSTEP_FASTER =  16ULL; // if step < MEDIUMSTEP_FASTER, use medium steps
static counter_t global_VECTORSTEP_FASTER = 128ULL; // if step < VECTORSTAP_FASTER, use large steps
// static counter_t global_BLOCKSIZE_BITS = default_blocksize;
// #define BLOCKWISE_FASTER_prime_min     ((counter_t)global_BLOCKWISE_FASTER_prime_min)
// #define MEDIUMSTEP_FASTER    ((counter_t)global_MEDIUMSTEP_FASTER)
// #define VECTORSTEP_FASTER    ((counter_t)global_VECTORSTEP_FASTER)
// #define BLOCKSIZE_BITS       ((counter_t)global_BLOCKSIZE_BITS)

// Patterns based on types
#define SAFE_SHIFTBIT        (bitshift_t)1ULL
#define SAFE_ZERO            (bitword_t)0ULL
#define SAFE_FILL            (bitword_t)~0ULL
#define BITWORD_SHIFTBIT     (bitword_t)1ULL
#define BITVECTORWORD_SHIFTBIT (bitword_vector_t)1ULL
#define WORDMASK             ((((counter_t)1)<<SHIFT_WORD)-(counter_t)1)
#define VECTORWORDMASK       ((((counter_t)1)<<SHIFT_VECTORWORD)-(counter_t)1)
#define VECTORMASK           ((((counter_t)1)<<SHIFT_VECTOR)-(counter_t)1)

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
#define bitindex_calc(index)        ((bitshift_t)(index)&((bitshift_t)(WORDMASK      )))
#define vector_bitindex(index)      ((bitshift_t)(index))
#define vector_bitindex_calc(index) ((bitshift_t)(index)&((bitshift_t)(VECTORWORDMASK)))

#if SAFE_SHIFT == 1
#define bitindex(index)      ((bitshift_t)(index)&((bitshift_t)(WORDMASK)))
#else
#define bitindex(index)      ((bitshift_t)(index))
#endif

#define markmask(index)        (BITWORD_SHIFTBIT << bitindex(index))
#define markmask_calc(index)   (BITWORD_SHIFTBIT << bitindex_calc(index))

// vector_markmask
#ifdef VECTORWORDSIZE_64 // mask will be applied automatically
#define vector_markmask(index) (BITWORD_SHIFTBIT << vector_bitindex(index))
#else
#define vector_markmask(index) (BITWORD_SHIFTBIT << vector_bitindex_calc(index))
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

unsigned int usqrt(int n)
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
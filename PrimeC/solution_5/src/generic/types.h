// masks and mask helpers
#define builtin_ctz(x)                     __builtin_ctzll((int64_t)(x))
#define shift_calc(bits)                   ((bits > 0) ? builtin_ctz(bits) : 0)
#define shift_type(TYPE)                   (shift_calc(sizeof(TYPE)*8))
#define shift_type_from_to(index,from,to)  (sizeof(from) > sizeof(to) ? ((index) << shift_calc(sizeof(from)/sizeof(to))) : ((index) >> shift_calc(sizeof(to)/sizeof(from))))
#define reduce2power(x)                    ((x) >> shift_calc(x))
// #define vectorindex_type(index, type)      ((index)>>shift_type(type))
#define bitbucket_index_type(index, type)  ((index)>>shift_type(type))
#define index_type(index, type)            ((index)>>shift_type(type)) // type is how the bits are stored, e.g.: uint8_t, uint16_t
#define mask_type(type)                    (sizeof(type)*8-1)
#define bitindex_calc_type(index, type)    ((index) & mask_type(type))
#define bitindex_unsafe_type(index, type)  ((index))
#define bitindex_type(index, type)         ((bitindex_calc_type(index, type)))
#define markmask_calc_type(index, type)    ((type)1ULL << bitindex_calc_type(index, type))
#define markmask_unsafe_type(index, type)  ((type)1ULL << (index))
#define markmask_type(index, type)         (sizeof(type)==8 ? markmask_unsafe_type(index, type) : markmask_calc_type(index, type))
#define bitcount_type(type)                (sizeof(type)*8) 
#define elementcount_type(type, base_type) (sizeof(type)/sizeof(base_type))
// #define vectorstart_type(index, type)      ((index) & ~mask_type(type))
// #define vectorend_type(index, type)        ((index) | mask_type(type))
#define bitbucket_start_type(index, type)  ((index) & ~mask_type(type))
#define bitbucket_end_type(index, type)    ((index) | mask_type(type))
#define bitbucket_next_type(index, type)   (((index) | mask_type(type)) + 1)

#define safe_fill_type(type)               ((type)(~(type)0U))
#define keepmask_type(index, type)         (safe_fill_type(type) << bitindex_calc_type(index, type))
#define chopmask_type(index, type)         (safe_fill_type(type) >> (bitcount_type(type) - bitindex_calc_type(index, type) - 1))
#define index_next_type(index, type)       (((index) & ~mask_type(type)) + bitcount_type(type))
// #define vectorelement_type(index, type, base_type)    ((index_type((index), base_type)) & (elementcount_type(type, base_type) -1))
#define bitbucket_element_mask(type, base_type)      (elementcount_type(type, base_type)-1)
#define bitbucketelement_type(index, type, base_type)    ((index_type((index), base_type)) & (elementcount_type(type, base_type) -1))

// globals for tuning
// When EMBED_SETTINGS is defined, hot-path globals are compile-time constants from sieve_embed.h
// allowing the compiler to eliminate dead branches and optimize dispatch
#ifdef EMBED_SETTINGS
#include "sieve_embed.h"
#else
static counter_t global_stripeprime_faster  = 0; // if step > BLOCKSTEP use blocks, else use the whole sieve
static counter_t global_largestep_faster    = 0; // if step < VECTORSTAP_FASTER, use large steps
static counter_t global_blocksize_bits      = 0; // blocksize in bits
static counter_t global_vectorsize          = 0; // vectorsize in bits
#endif
static counter_t global_algorithm           = 0; // algorithm to use for the sieve
static counter_t global_storage             = 0; // storage type to use for the sieve
static counter_t debug_hits                 = 0;
static counter_t debug_final_benchmarking   = 0;
static counter_t debug_final_plan           = 0;
static counter_t debug_waitforkeys          = 0;

#if defined(__clang__)
    #define PRAGMA_LOOP_UNROLL_32 _Pragma("clang loop unroll_count(32)")
    #define PRAGMA_LOOP_UNROLL_8 _Pragma("clang loop unroll_count(8)")
    #define PRAGMA_LOOP_IVDEP
#elif defined(__GNUC__)
    #define PRAGMA_LOOP_UNROLL_32 _Pragma("GCC unroll 32")
    #define PRAGMA_LOOP_UNROLL_8 _Pragma("GCC unroll 8")
    #define PRAGMA_LOOP_IVDEP _Pragma("GCC ivdep")
#else
    #define PRAGMA_LOOP_UNROLL_32
    #define PRAGMA_LOOP_UNROLL_8
    #define PRAGMA_LOOP_IVDEP
#endif

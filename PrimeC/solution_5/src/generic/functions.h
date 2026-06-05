#ifndef FUNCTIONS_GUARD
#define FUNCTIONS_GUARD

#define function_id_t int
#define time_setBitsTrue (function_id_t) 0
#define time_searchBitFalse (function_id_t) 1
#define time_searchBitFalse_largestep (function_id_t) 2
#define time_applyMask (function_id_t) 3
#define time_applyMask_pair (function_id_t) 4
#define time_setBitsTrue_smallstep_rotate_pair (function_id_t) 5
#define time_setBitsTrue_smallstep_repeat (function_id_t) 6
#define time_setBitsTrue_smallstep_norepeat (function_id_t) 7
#define time_setBitsTrue_largestep_vector (function_id_t) 8
#define time_setBitsTrue_largestep_repeat (function_id_t) 9
#define time_setBitsTrue_largestep_norepeat (function_id_t) 10
#define time_continuePattern (function_id_t) 11
#define time_continuePattern_smallSize (function_id_t) 12
#define time_continuePattern_aligned (function_id_t) 13
#define time_continuePattern_shiftleft_unrolled (function_id_t) 14
#define time_continuePattern_shiftleft (function_id_t) 15
#define time_continuePattern_shiftright (function_id_t) 16
#define time_sieveStripeBlock (function_id_t) 17
#define time_stripeSieve (function_id_t) 18
#define time_sieve_block_extend (function_id_t) 19
#define time_setBitsTrue_range (function_id_t) 20
#define time_setBitsTrue_range_return (function_id_t) 21
#define time_setBitsTrue_largestep_bitbucket (function_id_t) 22
#define time_markFactors_wheelstorage_small_repeat_pair_vector (function_id_t) 23
#define time_markFactors_wheelstorage_small_repeat_pair 24
#define time_markFactors_wheelstorage_small_repeat 25
#define time_markFactors_wheelstorage_repeat 26
#define time_markFactors_wheelstorage_norepeat 27
#define time_markFactor_wheelstorage 28
#define time_markFactors_wheelstorage_small_repeat_pair_align 29
#define time_markFactors_wheelstorage_small_repeat_pair_copy 30
#define time_makeFactors_classic64bit 31
#define time_makeFactors_classic8bit 32
#define time_markFactors_wheel 33
#define time_checkFactor_wheel 34
#define time_findUnmarked_wheel 35
#define time_applyMask_mmask 36
#define time_markFactors_wheelstorage_small_repeat_mmask 37
#define time_wheelstorage_blockprocessing 38
#define time_markFactors_wheelstorage 39
#define time_markFactors_wheelstorage_small_repeat_pairv2 40
#define time_markFactors_wheelstorage_small_repeat_pairv2_align 41
#define time_markFactors_wheelstorage_small_repeat_pairv2_copy 42
#define time_markFactors_wheelstorage_small_repeat_pair_rotate 43
#define time_markFactors_base 44

static const char* timer_function_names[100] = {
    [time_setBitsTrue] = "setBitsTrue",
    [time_searchBitFalse] = "searchBitFalse",
    [time_searchBitFalse_largestep] = "searchBitFalse_largestep",
    [time_applyMask] = "applyMask",
    [time_applyMask_pair] = "applyMask_pair",
    [time_setBitsTrue_smallstep_rotate_pair] = "setBitsTrue_smallstep_rotate_pair",
    [time_setBitsTrue_smallstep_repeat] = "setBitsTrue_smallstep_repeat",
    [time_setBitsTrue_smallstep_norepeat] = "setBitsTrue_smallstep_norepeat",
    [time_setBitsTrue_largestep_vector] = "setBitsTrue_largestep_vector",
    [time_setBitsTrue_largestep_repeat] = "setBitsTrue_largestep_repeat",
    [time_setBitsTrue_largestep_norepeat] = "setBitsTrue_largestep_norepeat",
    [time_continuePattern] = "continuePattern",
    [time_continuePattern_smallSize] = "continuePattern_smallSize",
    [time_continuePattern_aligned] = "continuePattern_aligned",
    [time_continuePattern_shiftleft_unrolled] = "continuePattern_shiftleft_unrolled",
    [time_continuePattern_shiftleft] = "continuePattern_shiftleft",
    [time_continuePattern_shiftright] = "continuePattern_shiftright",
    [time_sieveStripeBlock] = "sieveStripeBlock",
    [time_stripeSieve] = "stripeSieve",
    [time_sieve_block_extend] = "sieve_block_extend",
    [time_setBitsTrue_range] = "setBitsTrue_range",
    [time_setBitsTrue_range_return] = "setBitsTrue_range_return",
    [time_setBitsTrue_largestep_bitbucket] = "setBitsTrue_largestep_bitbucket",
    [time_markFactors_wheelstorage_small_repeat_pair_vector] = "small_repeat_pair_vector",
    [time_markFactors_wheelstorage_small_repeat_pair] = "small_repeat_pair",
    [time_markFactors_wheelstorage_small_repeat] = "small_repeat",
    [time_markFactors_wheelstorage_repeat] = "repeat",
    [time_markFactors_wheelstorage_norepeat] = "norepeat",
    [time_markFactor_wheelstorage] = "markFactor wheel",
    [time_markFactors_wheelstorage_small_repeat_pair_align] = "align",
    [time_markFactors_wheelstorage_small_repeat_pair_copy] = "copy",
    [time_makeFactors_classic64bit] = "makeFactors_classic64bit",
    [time_makeFactors_classic8bit] = "makeFactors_classic8bit",
    [time_markFactors_wheel] = "markFactors_wheel",
    [time_checkFactor_wheel] = "checkFactor_wheel",
    [time_findUnmarked_wheel] = "findUnmarked_wheel",
    [time_applyMask_mmask] = "applyMask_mmask",
    [time_markFactors_wheelstorage_small_repeat_mmask] = "markFactors_wheelstorage_small_repeat_mmask",
    [time_wheelstorage_blockprocessing] = "wheelstorage_blockprocessing",
    [time_markFactors_wheelstorage] = "markFactors_wheelstorage",
    [time_markFactors_wheelstorage_small_repeat_pairv2] = "markFactors_wheelstorage_small_repeat_pairv2",
    [time_markFactors_wheelstorage_small_repeat_pairv2_align] = "markFactors_wheelstorage_small_repeat_pairv2_align",
    [time_markFactors_wheelstorage_small_repeat_pairv2_copy] = "markFactors_wheelstorage_small_repeat_pairv2_copy",
    [time_markFactors_wheelstorage_small_repeat_pair_rotate] = "markFactors_wheelstorage_small_repeat_pair_rotate",
    [time_markFactors_base] = "markFactors_base",
};

#endif

#if !defined(BITSTORAGE_SETBITSTRUE_FUNCTIONLIST_GUARD) && defined(FUNCTIONS_COMPILED)
#define BITSTORAGE_SETBITSTRUE_FUNCTIONLIST_GUARD 1

// Define a function pointer type for setBitsTrue functions
typedef void (*setBitsTrueFunc)(void* restrict, const counter_t, const counter_t, const counter_t);

typedef enum function_type {
    FUNCTION_TYPE_NUMBERS,
    FUNCTION_TYPE_BITS,
} function_type;

typedef struct {
    const char* name;               // Function name 
    setBitsTrueFunc func;           // Function pointer
    counter_t min_step;             // Minimum applicable step value
    counter_t max_step;             // Maximum applicable step value
    int enabled;                    // Whether this function is enabled in benchmarking
    function_type type;             // Function type
} SetBitsTrueMethod;


// Global array with all setBitsTrue functions
static SetBitsTrueMethod setBitsTrueMethods[] = {
    // { "setBitsTrue                                 ", setBitsTrue                                 , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_range                           ", setBitsTrue_range_uint8                    , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_rotate_pair_uint64v8  ", setBitsTrue_smallstep_rotate_pair_uint64v8  , 0, 63, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_rotate_pair_uint64v4  ", setBitsTrue_smallstep_rotate_pair_uint64v4  , 0, 63, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_rotate_pair_uint32v16 ", setBitsTrue_smallstep_rotate_pair_uint32v16 , 0, 31, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_rotate_pair_uint16v16 ", setBitsTrue_smallstep_rotate_pair_uint16v16 , 0, 15, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_rotate_pair_uint32v4  ", setBitsTrue_smallstep_rotate_pair_uint32v4  , 0, 31, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_rotate_pair_uint16v8  ", setBitsTrue_smallstep_rotate_pair_uint16v8  , 0, 15, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_vector_uint64v8       ", setBitsTrue_largestep_vector_uint64v8       , 65, 511, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_vector_uint64v4       ", setBitsTrue_largestep_vector_uint64v4       , 65, 255, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_vector_uint32v16      ", setBitsTrue_largestep_vector_uint32v16      , 33, 255, 0, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint64         ", setBitsTrue_largestep_repeat_uint64         , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint32         ", setBitsTrue_largestep_repeat_uint32         , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint8_unroll16 ", setBitsTrue_largestep_repeat_uint8_unroll16 , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint8_unroll8  ", setBitsTrue_largestep_repeat_uint8_unroll8  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint8_unroll4  ", setBitsTrue_largestep_repeat_uint8_unroll4  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint8          ", setBitsTrue_largestep_repeat_uint8          , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_norepeat_uint8_unroll8", setBitsTrue_largestep_norepeat_uint8_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_norepeat_uint8_unroll4", setBitsTrue_largestep_norepeat_uint8_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_norepeat_uint8        ", setBitsTrue_largestep_norepeat_uint8        , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_repeat_base           ", setBitsTrue_smallstep_repeat_base           , 0, 15, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_smallstep_norepeat              ", setBitsTrue_smallstep_norepeat              , 0, 15, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_mmask_uint64  ", setBitsTrue_largestep_repeat_mmask_uint64  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_mmask_uint32  ", setBitsTrue_largestep_repeat_mmask_uint32  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_mmask_uint8   ", setBitsTrue_largestep_repeat_mmask_uint8   , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_old_uint8_unroll8  ", setBitsTrue_largestep_repeat_old_uint8_unroll8  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_old_uint8_unroll8  ", setBitsTrue_largestep_repeat_old_uint8_unroll8  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint8_unroll8  ", setBitsTrue_largestep_repeat_uint8_unroll8  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint8_unroll8  ", setBitsTrue_largestep_repeat_uint8_unroll8  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_old_uint64_unroll8  ", setBitsTrue_largestep_repeat_old_uint64_unroll8  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    // { "setBitsTrue_largestep_repeat_uint64_unroll8  ", setBitsTrue_largestep_repeat_uint64_unroll8  , 0, INT32_MAX, 1, FUNCTION_TYPE_BITS },
    { "markFactors_wheelstorage", markFactors_wheelstorage, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_repeat_uint64_unroll8", markFactors_wheelstorage_repeat_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_repeat_uint64_unroll4", markFactors_wheelstorage_repeat_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_repeat_uint8_unroll8", markFactors_wheelstorage_repeat_uint8_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_repeat_uint8_unroll4", markFactors_wheelstorage_repeat_uint8_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_norepeat_uint8_unroll8", markFactors_wheelstorage_norepeat_uint8_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_norepeat_uint8_unroll4", markFactors_wheelstorage_norepeat_uint8_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_uint64_unroll8", markFactors_wheelstorage_small_repeat_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_uint64_unroll4", markFactors_wheelstorage_small_repeat_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_uint32_unroll8", markFactors_wheelstorage_small_repeat_uint32_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_uint32_unroll4", markFactors_wheelstorage_small_repeat_uint32_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_pair_uint64_unroll8", markFactors_wheelstorage_small_repeat_pair_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_pair_uint64_unroll4", markFactors_wheelstorage_small_repeat_pair_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_mmask1_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask1_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_mmask2_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask2_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask3_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask3_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_mmask4_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask4_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask5_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask5_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask6_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask6_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask7_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask7_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask8_uint64_unroll8", markFactors_wheelstorage_small_repeat_mmask8_uint64_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_mmask1_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask1_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_mmask2_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask2_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask3_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask3_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    { "markFactors_wheelstorage_small_repeat_mmask4_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask4_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask5_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask5_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask6_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask6_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask7_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask7_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask8_uint64_unroll4", markFactors_wheelstorage_small_repeat_mmask8_uint64_unroll4, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask_uint32_unroll8", markFactors_wheelstorage_small_repeat_mmask_uint32_unroll8, 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { "markFactors_wheelstorage_small_repeat_mmask_uint8_unroll8 ", markFactors_wheelstorage_small_repeat_mmask_uint8_unroll8 , 0, INT32_MAX, 1, FUNCTION_TYPE_NUMBERS },
    // { }
};

#define methods (sizeof(setBitsTrueMethods) / sizeof(SetBitsTrueMethod))

#endif
#ifndef SIEVE_FUNCTIONS_H
#define SIEVE_FUNCTIONS_H

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
    [time_markFactors_wheelstorage_small_repeat_pair_vector] = "markFactors_wheelstorage_small_repeat_pair_vector",
    [time_markFactors_wheelstorage_small_repeat_pair] = "markFactors_wheelstorage_small_repeat_pair",
    [time_markFactors_wheelstorage_small_repeat] = "markFactors_wheelstorage_small_repeat",
    [time_markFactors_wheelstorage_repeat] = "markFactors_wheelstorage_repeat",
    [time_markFactors_wheelstorage_norepeat] = "markFactors_wheelstorage_norepeat",
    [time_markFactor_wheelstorage] = "markFactor_wheelstorage",
    [time_markFactors_wheelstorage_small_repeat_pair_align] = "markFactors_wheelstorage_small_repeat_pair_align",
    [time_markFactors_wheelstorage_small_repeat_pair_copy] = "markFactors_wheelstorage_small_repeat_pair_copy",
  };

#endif // SIEVE_FUNCTIONS_H
static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair_vector,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    startAnalysis6(time_markFactors_wheelstorage_small_repeat_pair_vector, "Setting bits step %3ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju bit range (%ju-%ju) (%ju occurances; %ju stamps)", (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    register uint8_t* restrict bitstorage_sized_uint8 = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
    const counter_t wheel_step = step >> shift_calc(step);
    const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) / wheelmask_stripe_bits * WHEEL_BASIC_SIZE * (wheel_step + 2), range_stop);
    const counter_t word_bytemask = sizeof(bitbucket_t) - 1;

    bitbucket_t current_mask = BITBUCKET0;
    counter_t current_block = function(wheel_block_calc,variantsuffix)(range_start);

    bitbucket_t pending_mask = BITBUCKET0;
    counter_t pending_block = 0;

    // go to first aligned block 
    if (current_block < 2) {
        for (; function(wheel_block_calc,variantsuffix)(range_start) < 2; range_start += step) {
            bitstorage_sized_uint8[ wheel_block_calc_uint8(range_start)] |= wheelmask_compressed[range_start % WHEEL_SIZE];
        }
        current_block = function(wheel_block_calc,variantsuffix)(range_start);
    }

    for (counter_t index = range_start; index <= range_stop_unique; index += step) {
        const counter_t wheel_block_word = function(wheel_block_calc,variantsuffix)(index);

        if (wheel_block_word != current_block) {
            if (pending_block) {
                if (((pending_block + 1) == current_block)) { //} && ((pending_block&1)==0)) {
                    function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask, current_mask);
                    current_mask = BITBUCKET0; // will be copied to pending_mask
                    current_block = 0; //
                }
                else {
                    function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
                }
            }

            pending_block = current_block;
            pending_mask = current_mask;
            current_block = wheel_block_word;
            current_mask = BITBUCKET0;
        }

        const counter_t wheel_block_byte = wheel_block_calc_uint8(index);
        const variant_base_type_t markmask = (variant_base_type_t) wheelmask_compressed[index % WHEEL_SIZE];
        const counter_t element = (wheel_block_byte >> 3) & 3;
        current_mask[element] |= markmask << ((bitshift_t)((wheel_block_byte & word_bytemask) << SHIFT_BYTE));
    }

    // Choosing range_stop_unique avoids dealing with the last cases
    if (pending_block) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
    }
    // if (current_mask) {
    //     function(applyMask_index,suffix)(sieve->bitstorage, current_block, block_stop, wheel_step, current_mask);
    // }
    bitstorage_sized[current_block] |= current_mask;

    endAnalysis6(time_markFactors_wheelstorage_small_repeat_pair_vector,"\n");
}

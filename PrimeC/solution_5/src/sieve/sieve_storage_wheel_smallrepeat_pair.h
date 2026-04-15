static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    register uint8_t* restrict bitstorage_sized_uint8 = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
    const counter_t wheel_step = step >> shift_calc(step);
    const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) / wheelmask_stripe_bits * WHEEL_BASIC_SIZE * (wheel_step + 2), range_stop);
    const counter_t word_bytemask = sizeof(bitbucket_t) - 1;

    bitbucket_t current_mask = (bitbucket_t)0U;
    counter_t current_block = function(wheel_block_calc,variantsuffix)(range_start);

    bitbucket_t pending_mask = (bitbucket_t)0U;
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
            if (pending_mask) {
                if (current_mask && ((pending_block + 1) == current_block)) { //} && ((pending_block&1)==0)) {
                    function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask, current_mask);
                    current_mask = (bitbucket_t)0U; // will be copied to pending_mask
                }
                else {
                    function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
                }
            }

            pending_block = current_block;
            pending_mask = current_mask;
            current_block = wheel_block_word;
            current_mask = (bitbucket_t)0U;
        }

        const counter_t wheel_block_byte = wheel_block_calc_uint8(index);
        const bitbucket_t markmask = (bitbucket_t) wheelmask_compressed[index % WHEEL_SIZE];
        current_mask |= markmask << ((bitshift_t)((wheel_block_byte & word_bytemask) << SHIFT_BYTE));
    }

    // Choosing range_stop_unique avoids dealing with the last cases
    if (pending_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
    }
    // if (current_mask) {
    //     function(applyMask_index,suffix)(sieve->bitstorage, current_block, block_stop, wheel_step, current_mask);
    // }
    bitstorage_sized[current_block] |= current_mask;
}

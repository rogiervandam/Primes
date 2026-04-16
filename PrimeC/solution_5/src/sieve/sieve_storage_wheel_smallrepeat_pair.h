static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair,suffix)(sieve_t* sieve, counter_t range_start, const counter_t range_stop, const counter_t step)
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    register uint8_t* restrict bitstorage_sized_uint8 = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
    const counter_t wheel_step = reduce2power(step);
    const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) / wheelmask_stripe_bits * WHEEL_SIZE * (wheel_step + 2), range_stop);

    bitbucket_t current_mask = (bitbucket_t)0U;
    counter_t current_bucket = function(wheel_block_calc,variantsuffix)(range_start);

    bitbucket_t pending_mask = (bitbucket_t)0U;
    counter_t pending_block = 0;

    // go to first aligned block 
    if (current_bucket < 2) {
        for (; function(wheel_block_calc,variantsuffix)(range_start) < 2; range_start += step) {
            markFactor_wheelstorage_new(sieve, range_start);
        }
        current_bucket = function(wheel_block_calc,variantsuffix)(range_start);
    }

    for (counter_t index = range_start; index <= range_stop_unique; index += step) {
        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit <= 0) continue; // if the number is divisible by any of the wheel primes, skip it

        const counter_t new_bucket = index_type(wheel_bit, bitbucket_t);

        if (new_bucket != current_bucket) {
            if (pending_mask) {
                if (current_mask && ((pending_block + 1) == current_bucket)) { //} && ((pending_block&1)==0)) {
                    function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask, current_mask);
                    current_mask = (bitbucket_t)0U; // will be copied to pending_mask
                }
                else {
                    function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
                }
            }

            pending_block = current_bucket;
            pending_mask = current_mask;
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
        }

        current_mask |= markmask_type(wheel_bit, bitbucket_t);
    }

    // Choosing range_stop_unique avoids dealing with the last cases
    if (pending_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
    }
    bitstorage_sized[current_bucket] |= current_mask;
}

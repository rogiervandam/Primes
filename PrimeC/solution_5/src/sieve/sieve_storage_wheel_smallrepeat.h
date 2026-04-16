static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step)
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

    const counter_t stop_bucket = function(wheel_block_calc,variantsuffix)(range_stop + 1);
    const counter_t wheel_step = reduce2power(step); // step in terms of the number of bitbuckets
    const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) * WHEEL_BASIC_SIZE * (wheel_step + 1) / wheelmask_stripe_bits , range_stop); 

    bitbucket_t current_mask = 0ULL;
    counter_t current_bucket = 0;

    // go to first aligned block 
    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_bit = wheel_bit_calc(index);
        const counter_t new_bucket = function(wheel_block_calc,variantsuffix)(index);

        if (wheel_bit <= 0) continue;
        // const counter_t new_bucket = index_type(wheel_bit, bitbucket_t);

        if (current_bucket < new_bucket) { // when going to the next block
            if (current_mask) { // apply previous mask if it exists
                function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
            }
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
        }

        current_mask |= markmask_type(wheel_bit, bitbucket_t);
    } 

    // ignore the last mask because it should already be set
    // can be wrong if wheel is large and range is small.
    bitstorage_sized[current_bucket] |= current_mask;
}
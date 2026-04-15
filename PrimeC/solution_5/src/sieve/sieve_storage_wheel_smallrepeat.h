static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step)
{
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage,cache_line_bytes);

    // if (step >= bitcount_type(bitbucket_t)) {
    //     markFactors_wheelstorage_repeat(sieve, range_start, range_stop, step);
    //     return;
    // }
    const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
    // const counter_t wheel_step = step * wheelmask_stripe_bytes;
    // const counter_t range_stop_unique = min(range_start + WHEEL_BASIC_SIZE * step * wheelmask_stripe_bits + WHEEL_BASIC_SIZE * wheelmask_stripe_bits, range_stop); 

    const counter_t wheel_step = reduce2power(step); // step in terms of the number of bitbuckets
    const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) * WHEEL_BASIC_SIZE * (wheel_step + 1) / wheelmask_stripe_bits , range_stop); 

    bitbucket_t reuse_markmask = 0ULL;
    bitbucket_t reuse_markmask_new = 0ULL;
    counter_t reuse_block_start = 0;

    for (register counter_t index = range_start; index <= range_stop_unique; index += step) { 
        const counter_t wheel_block = function(wheel_block_calc,variantsuffix)(index);

        if (reuse_block_start < wheel_block) { // when going to the next block
            if (reuse_markmask) { // apply previous mask if it exists
                if (reuse_block_start) {  // don't repeat the first block, it may be misaligned
                    function(applyMask_index,suffix)(sieve->bitstorage, reuse_block_start, block_stop, wheel_step, reuse_markmask);
                }
                else bitstorage_sized[0] |= reuse_markmask; // if the previous block was the first block, we can apply the mask directly without going through the function
            }
            reuse_block_start = wheel_block;
            reuse_markmask = 0ULL;
            // reuse_markmask_new = 0ULL;
        }

        const counter_t wheel_index = index % WHEEL_SIZE;
        const bitbucket_t markmask = (bitbucket_t) wheelmask_compressed[wheel_index];
        // if (wheelmask_offset[wheel_index]) {
        //     reuse_markmask |= (1ULL << (((wheelmask_stripe_bytes * index / WHEEL_SIZE) & 7)*8+(wheelmask_offset[wheel_index]-1)));
        // }
        reuse_markmask |= markmask << ((wheel_block_calc_uint8(index) & 7) *8); // combine the markmask for the current block if it is the same as the previous one
        // reuse_markmask |= wheelmask_compressed[index % WHEEL_SIZE] << ((wheel_block_calc_uint8(index) & 7) << 3); // combine the markmask for the current block if it is the same as the previous one
    } 

    // we can ignore the last mask because it should already be set
    // can be wrong if wheel is large and range is small.
    bitstorage_sized[reuse_block_start] |= reuse_markmask;
}
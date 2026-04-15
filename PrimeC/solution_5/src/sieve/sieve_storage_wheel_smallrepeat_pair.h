    static inline void __attribute__((always_inline, hot, nonnull, aligned(cache_line_bytes))) 
    function(markFactors_wheelstorage_small_repeat_pair,suffix)(sieve_t* sieve, const counter_t range_start, const counter_t range_stop, const counter_t step)
    {
        register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

        const counter_t block_stop = function(wheel_block_calc,variantsuffix)(range_stop + 1);
        const counter_t wheel_step = step >> shift_calc(step);
        const counter_t range_stop_unique = min(range_start + bitcount_type(bitbucket_t) / wheelmask_stripe_bits * WHEEL_BASIC_SIZE * (wheel_step + 1), range_stop);
        const counter_t word_bytemask = sizeof(bitbucket_t) - 1;

        bitbucket_t current_mask = (bitbucket_t)0U;
        counter_t current_block = 0;
        uint8_t has_current = 0;

        bitbucket_t pending_mask = (bitbucket_t)0U;
        counter_t pending_block = 0;
        uint8_t has_pending = 0;

        for (register counter_t index = range_start; index <= range_stop_unique; index += step) {
            const counter_t wheel_block_word = function(wheel_block_calc,variantsuffix)(index);

            if (!has_current) {
                has_current = 1;
                current_block = wheel_block_word;
            }
            else if (wheel_block_word != current_block) {
                if (current_block == 0) {
                    bitstorage_sized[0] |= current_mask;
                }
                else if (has_pending) {
                    if ((pending_block + 1) == current_block) {
                        if (pending_mask || current_mask) {
                            function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask, current_mask);
                        }
                        has_pending = 0;
                    }
                    else {
                        if (pending_mask) {
                            function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
                        }
                        pending_block = current_block;
                        pending_mask = current_mask;
                    }
                }
                else {
                    has_pending = 1;
                    pending_block = current_block;
                    pending_mask = current_mask;
                }

                current_block = wheel_block_word;
                current_mask = (bitbucket_t)0U;
            }

            const counter_t wheel_block_byte = wheel_block_calc_uint8(index);
            const bitbucket_t markmask = (bitbucket_t) wheelmask_compressed[index % WHEEL_SIZE];
            current_mask |= markmask << ((bitshift_t)((wheel_block_byte & word_bytemask) << SHIFT_BYTE));
        }

        if (!has_current) return;

        if (has_pending && pending_mask) {
            function(applyMask_index,suffix)(sieve->bitstorage, pending_block, block_stop, wheel_step, pending_mask);
        }

        bitstorage_sized[current_block] |= current_mask;
    }

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair,suffix)(sieve_t* sieve, counter_t start_number, const counter_t stop_number, const counter_t step)
{
    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "Setting factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));   

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number);
    const counter_t wheel_step = reduce2power((step * wheelmask_stripe_bits)); // step in words, accounting for stripe alignment

    // align to first full bucket
    logStart8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "aligning to first full bucket starting from index %ju", (uintmax_t)start_number);
    const counter_t next_aligned = min(getFactor( bitbucket_end_type(wheel_bit_estimate(start_number), bitbucket_t))+1, stop_number); // the next factor that is aligned to the wheel, this is the first index we can start marking from
    for (; start_number <= next_aligned; start_number += step) {
        function(markFactor_wheelstorage,suffix)(sieve, start_number);
    }
    logStop8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "finished aligning to first full bucket at index %ju", (uintmax_t)start_number);

    const counter_t stop_number_unique = min(stop_number, start_number + (((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE) * wheel_step);
    const counter_t stop_number_unique2 = min(getFactor( bitbucket_end_type(wheel_bit_estimate(start_number) + wheel_step * wheelmask_stripe_bits * ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits), bitbucket_t)), stop_number);

    bitbucket_t current_mask = (bitbucket_t)0U, pending_mask = (bitbucket_t)0U;
    counter_t pending_bucket = 0, current_bucket = 0;

    logStart8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", 
        (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)) );
    
        log8("Number range unique (stop_number_unique: %ju), (stop_number_unique2: %ju)", (uintmax_t)stop_number_unique, (uintmax_t)stop_number_unique2);

    for (counter_t index = start_number; index <= stop_number_unique; index += step) {
        const counter_t wheel_bit = wheel_bit_calc(index);
        
        const counter_t new_bucket = function(wheel_bucket_calc,variant_suffix)(index);

        // log9("setmask index: %ju, wheel_bit: %jd, new_bucket: %ju mask: %s", (uintmax_t)index, (intmax_t)wheel_bit, (uintmax_t)new_bucket, stringBits_uint64(current_mask));

        if (wheel_bit < 0) continue; // if the number is divisible by any of the wheel primes, skip it

        if (new_bucket != current_bucket) {
            if (pending_mask) {
                if (current_mask && ((pending_bucket + 1) == current_bucket )) { 
                    function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask, current_mask);
                    current_mask = (bitbucket_t)0U; // will be copied to pending_mask
                }
                else {
                    function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
                }
            }

            pending_bucket = current_bucket;
            pending_mask = current_mask;
            current_bucket = new_bucket;
            current_mask = (bitbucket_t)0U;
            // log9("new_current_mask index: %ju, wheel_bit: %jd, new_bucket: %ju", (uintmax_t)index, (intmax_t)wheel_bit, (uintmax_t)new_bucket);
        }

        current_mask |= markmask_type(wheel_bit, bitbucket_t);
        // log9("updated mask: %s", stringBits_uint64(current_mask));
    }

    log9("finished main loop, pending_mask: %s, current_mask: %s current_bucket: %ju, pending bucket: %ju, stop_bucket: %ju", stringBits_uint64(pending_mask), stringBits_uint64(current_mask), (uintmax_t)current_bucket, (uintmax_t)pending_bucket, (uintmax_t)stop_bucket);

    if (pending_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
    }
    if (current_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }
    logStop8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "finished marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "finished setting factors\n");
}

static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair_v2,suffix)(sieve_t* sieve, counter_t start_number, const counter_t stop_number, const counter_t step)
{
    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "MarkFactorsWheelStorageSmallRepeatPair: setting factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));   
 
    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    register uint8_t* restrict bitstorage_sized_uint8 = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number + 1);
    const counter_t wheel_step = reduce2power(step) * reduce2power(wheelmask_stripe_bits); // step in words, accounting for stripe alignment
    const counter_t stop_number_unique = min(start_number + ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits) * WHEEL_SIZE * (wheel_step + 2), stop_number);

    counter_t current_bucket = 0;

    // align to first full bucket

    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "MarkFactorsWheelStorageSmallRepeatPair: aligning to first full bucket starting from index %ju", (uintmax_t)start_number);

    // TODO: calc start_number_aligned = (start_number + wheel_step * WHEEL_SIZE - 1) / (wheel_step * WHEEL_SIZE) * (wheel_step * WHEEL_SIZE); 
    // but this is more expensive than just iterating until we reach the first full bucket, because the step is large and we will likely already be close to 
    // a full bucket after a few iterations
    for (; start_number <= stop_number_unique && (current_bucket = function(wheel_bucket_calc,variant_suffix)(start_number)) < 2 ; start_number += step) {
        function(markFactor_wheelstorage,suffix)(sieve, start_number);
    }
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "finished aligning to first full bucket at index %ju", (uintmax_t)start_number);

    bitbucket_t current_mask = (bitbucket_t)0U, pending_mask = (bitbucket_t)0U;
    counter_t pending_bucket = 0;
   
    counter_t new_bucket = function(wheel_bucket_calc,variant_suffix)(start_number);
    counter_t wheel_index = start_number % WHEEL_SIZE; // the position in the wheel, which determines which bits to mark for each index. 
    counter_t wheel_base = wheelmask_stripe_bits * (start_number / WHEEL_SIZE); // the position where the wheel had a last reset
    counter_t next_bucket_index = wheel_bit_estimate(bitbucket_end_type(start_number, bitbucket_t)); // the index of the next bucket change
    
    // TODO: make a larger wheel and check if we stay within the wheel so we have to take lesser % and /
    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_copy, "marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));
    for (counter_t index = start_number; index <= stop_number_unique; index += step) {

        // wheel_index = (index) % WHEEL_SIZE;

        if (wheelmask_bitpoint[wheel_index] >= 0) 
        {
            if (index > next_bucket_index) {
                new_bucket = function(wheel_bucket_calc,variant_suffix)(index);
                next_bucket_index = wheel_bit_estimate(bitbucket_end_type(start_number, bitbucket_t)); // the index of the next bucket change
                wheel_base = wheelmask_stripe_bits * (index / WHEEL_SIZE);

                // if (wheel_bit <= 0) continue; // if the number is divisible by any of the wheel primes, skip it
                // // const counter_t new_bucket = index_type(wheel_bit, bitbucket_t);

                if (new_bucket != current_bucket) {
                    if (pending_mask) {
                        if (current_mask && ((pending_bucket + 1) == current_bucket )) { 
                            function(applyMask_index_pair,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask, current_mask);
                            current_mask = (bitbucket_t)0U; // will be copied to pending_mask
                        }
                        else {
                            function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
                        }
                    }

                    pending_bucket = current_bucket;
                    pending_mask = current_mask;
                    current_bucket = new_bucket;
                    current_mask = (bitbucket_t)0U;
                }
            }

            const counter_t wheel_bit = wheel_base + wheelmask_bitpoint[wheel_index];
            current_mask |= markmask_type(wheel_bit, bitbucket_t);
        }

        wheel_index += step;
        if (wheel_index >= WHEEL_SIZE) wheel_index %= WHEEL_SIZE;
    }

    if (pending_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, pending_bucket, stop_bucket, wheel_step, pending_mask);
    }
    if (current_mask) {
        function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
    }
    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_copy, "finished marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

    logStop6(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair, "finished setting factors\n");
}

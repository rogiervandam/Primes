static inline void __attribute__((always_inline, hot, nonnull,  aligned(cache_line_bytes))) 
function(markFactors_wheelstorage_small_repeat_pair_rotate,suffix)(sieve_t* sieve, counter_t start_number, const counter_t stop_number, const counter_t step)
{
    logStart7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_rotate, "Setting factors for prime %ju with step %ju using 'repeating pairs' of %s in %ju number range (%ju-%ju)", 
        (uintmax_t)step/2, (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number);   

    const counter_t stop_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number);
    const counter_t wheel_step = reduce2power(step) * wheel_multiplier(bitbucket_t); // step in words, accounting for stripe alignment

    // align to first full bucket
    const counter_t next_aligned = min(getFactor( bitbucket_end_type(wheel_bit_estimate_last(start_number)+1, bitbucket_t)), stop_number); // the next factor that is aligned to the wheel, this is the first index we can start marking from
    logStart8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Aligning to first full bitbucket starting at number %ju by marking in number range %ju-%ju (bits %ju-%ju)", 
        (uintmax_t)start_number, (uintmax_t)start_number, (uintmax_t)next_aligned, (uintmax_t)wheel_bit_estimate_last(start_number), (uintmax_t)wheel_bit_estimate_last(next_aligned));
    for (; start_number <= next_aligned; start_number += step) function(markFactor_wheelstorage,suffix)(sieve, start_number);
    logStop8(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_align, "Finished aligning to first full bitbucket at number %ju", (uintmax_t)start_number);

    const counter_t stop_number_unique = min(getFactor( bitbucket_start_type(wheel_bit_estimate_last(start_number), bitbucket_t) - 1 + wheel_step * wheelmask_stripe_bits * ((bitcount_type(bitbucket_t) + wheelmask_stripe_bits - 1) / wheelmask_stripe_bits)), stop_number);
    bitbucket_t current_mask = (bitbucket_t)0U, pending_mask = (bitbucket_t)0U;
    counter_t current_bucket = function(wheel_bucket_calc,variant_suffix)(start_number);
    counter_t new_bucket = current_bucket;

    log8(time_markFactors_wheelstorage_small_repeat_pair_rotate, "Marking numbers for prime %ju with step %ju using 'repeating pairs rotate' of %s in %ju number range (%ju-%ju) starting at number %ju", 
        (uintmax_t)step/2, (uintmax_t)step, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), 
        (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)) );

    bitshift_t bitshift = bitcount_type(bitbucket_t) - (wheelmask_stripe_bits * wheel_step);

    for (counter_t index = start_number; index <= stop_number_unique; index += step) {
        new_bucket = function(wheel_bucket_calc,variant_suffix)(index);
        if (new_bucket != current_bucket) break;

        const counter_t wheel_bit = wheel_bit_calc(index);
        if (wheel_bit < 0) continue; // if the number is divisible by any of the wheel primes, skip it

        current_mask |= markmask_type(wheel_bit, bitbucket_t);
    }

    const counter_t last_unique_bucket = function(wheel_bucket_calc,variant_suffix)(stop_number_unique);

    for (;current_bucket <= last_unique_bucket; current_bucket++) {
        log9("Current bucket: %ju, new bucket: %ju, last unique bucket: %ju, stop bucket: %ju, bitshift: %ju step %ju stripe %ju", (uintmax_t)current_bucket, (uintmax_t)new_bucket, (uintmax_t)last_unique_bucket, (uintmax_t)stop_bucket, (uintmax_t)bitshift, (uintmax_t)step, (uintmax_t)wheelmask_stripe_bits);
        function(applyMask_index,suffix)(sieve->bitstorage, current_bucket, stop_bucket, wheel_step, current_mask);
        current_mask = current_mask >> bitshift | current_mask << (bitcount_type(bitbucket_t) - 2*bitshift); // rotate the mask for the new bucket
    }

    logStop7(sieve->bitstorage, time_markFactors_wheelstorage_small_repeat_pair_rotate, "finished marking factors with step %3ju for prime %ju using markFactors_wheelstorage_small_repeat_pair_rotate_vector %s in %ju factor range (%ju-%ju) (%ju occurances; %ju repeats)", (uintmax_t)step, (uintmax_t)step/2, STR(suffix), (uintmax_t)safe_diff(stop_number,start_number),(uintmax_t)start_number,(uintmax_t)stop_number, (uintmax_t)((safe_diff(stop_number,start_number))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(stop_number,start_number))/(uintmax_t)(bitcount_type(bitbucket_t)*step)));

}

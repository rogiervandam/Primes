// Large ranges (> WORD_SIZE * step) mean the same mask can be reused
// This version uses vectorization for the larger ranges
// assumes the range is larger than VECTOR_SIZE_BITS
// This is the BASE ALGORITHM COMPLIANT version

// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
// doing this multiple times on the same word is likely to have the cache still ready

#define bitbucket_t uint64_t
static inline void __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
setBitsTrue_smallstep_repeat_base(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    const counter_t range_stop_unique = range_start + bitcount_type(bitbucket_t) * step;

    verbose6( printf("Setting bits step %3ju using smallstep%s in %ju bit range (%ju-%ju) (%ju repeating occurances)", (uintmax_t)step, STR(suffix), (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(step*bitcount_type(bitbucket_t)))); )
    timer_lapstart(time_setBitsTrue_smallstep_repeat);

    for (register counter_t index = range_start; index <= range_stop_unique;) {
        const counter_t index_bucket = index_type(index, bitbucket_t); // set index_word here because the for loop will change index
        register bitbucket_t mask = (bitbucket_t)0U;
        for(; index_type(index, bitbucket_t) == index_bucket; index += step) {
            mask |= markmask_type(index, bitbucket_t);
            applyMask_uint64(bitstorage, step, range_stop, mask, index_bucket);
        }
    }

    timer_laptime(time_setBitsTrue_smallstep_repeat); verbose6( printf("\n"); )
}

// Small steps (< WORD_SIZE) could be within the same word (e.g. less than 64 bits apart).
// if we know that the mask will not repeat, we can save some time by not checking
// this is a BASE ALGORITHM COMPLIANT: each bit is set individually
static inline void  __attribute__((always_inline, nonnull)) 
setBitsTrue_smallstep_norepeat(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6( printf("Setting bits step %3ju using smallstep%s in %ju bit range (%ju-%ju)  (%ju unique occurances)", (uintmax_t)step, STR(suffix),  (uintmax_t)range_stop-(uintmax_t)range_start,(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)step)); )
    timer_lapstart(time_setBitsTrue_smallstep_norepeat);

    register bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    for (register counter_t index = range_start; index < range_stop;) {
        register const counter_t index_bucket = index_type(index, bitbucket_t);  // set index_word here because the for loop will change index
        register bitbucket_t mask = (bitbucket_t)0U;
        for(; index_type(index, bitbucket_t) == index_bucket; index += step) mask |= markmask_type(index, bitbucket_t);
        bitstorage_sized[index_bucket] |= mask;
    }
    timer_laptime(time_setBitsTrue_smallstep_norepeat); verbose6( printf("\n"); )
}
#undef bitbucket_t

static inline void  __attribute__((always_inline, nonnull)) 
setBitsTrue_base(bitword_t* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{
    verbose6(  printf("Setting bits step %3ju using setBitsTrue_base in %ju bit range (%ju-%ju)  (%ju occurances; %ju stamps) \n", (uintmax_t)step, (uintmax_t)safe_diff(range_stop,range_start),(uintmax_t)range_start,(uintmax_t)range_stop, (uintmax_t)((safe_diff(range_stop,range_start))/(uintmax_t)step), (uintmax_t)(((uintmax_t)safe_diff(range_stop,range_start))/(uintmax_t)(VECTOR_SIZE_BITS*step))); )
    timer_lapstart(time_setBitsTrue);

    if (step < bitcount_type(uint64_t) /2) {
        const counter_t range_stop_unique_word = range_start + bitcount_type(uint64_t) * step; 
        if (range_stop_unique_word <= range_stop) { // the wordmask will be reused
            setBitsTrue_smallstep_repeat_base(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
        else {
            setBitsTrue_smallstep_norepeat(bitstorage, range_start, step, range_stop);
            timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
            return;
        }
    }

    if (range_start + step * 8 * 8 * 8 <= range_stop) { // // 8 bit 8 roll 8 tuned value
        setBitsTrue_largestep_repeat_uint8_unroll8(bitstorage, range_start, step, range_stop);
        return;
    } 

    if (range_start + step * 8 * 4  <= range_stop) {  // 8 bit 4 roll 8 tuned value
        setBitsTrue_largestep_repeat_uint8(bitstorage, range_start, step, range_stop);
        return;
    } 

    setBitsTrue_largestep_norepeat_uint8(bitstorage, range_start, step, range_stop);

    timer_laptime(time_setBitsTrue); verbose7( printf("\n"); )
}
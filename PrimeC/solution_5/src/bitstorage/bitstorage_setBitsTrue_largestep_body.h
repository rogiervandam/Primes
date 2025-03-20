

#ifndef unrolls
    #define unrolls 4
#endif

#define bitbucket_t   NAME(variant,_t)
#define unrollssuffix NAME(_unroll,unrolls)
#define variantsuffix NAME(_,variant)
#define suffix NAME(variantsuffix, unrollssuffix)

static inline void __attribute__((always_inline)) NAME(setBitsTrue_largestep_repeat,suffix)(void* restrict bitstorage, const counter_t range_start, const counter_t step, const counter_t range_stop) 
{ 
    const counter_t range_stop_unique = range_start + bitcount_type(bitbucket_t) * step; 
    verbose6(printf("Setting bits step %3ju using largestep-repeat" ##suffix " in %ju bit range (%ju-%ju) (%ju repeating occurrences)", (uintmax_t)step, (uintmax_t)range_stop-(uintmax_t)range_start, (uintmax_t)range_start, (uintmax_t)range_stop, (uintmax_t)(((uintmax_t)range_stop-(uintmax_t)range_start)/(uintmax_t)(bits_width*step)))); 
    timer_lapstart(time_setBitsTrue_largestep_repeat); 
    
    for (register counter_t index = range_start; index < range_stop_unique; index += step) { 
       NAME(applyMask,suffix)(bitstorage, step, range_stop, markmask_calc_type(index, bitbucket_t), index_type(index, bitbucket_t));
    } 
    timer_laptime(time_setBitsTrue_largestep_repeat); verbose6(printf("\n")); 
}

#undef unrolls
#undef variant
#undef unrollsuffix
#undef variantsuffix

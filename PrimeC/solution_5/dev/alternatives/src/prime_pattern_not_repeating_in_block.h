
static inline counter_t __attribute__((always_inline, const)) 
prime_pattern_not_repeating_in_block(const counter_t range_start, const counter_t range_stop, const counter_t blocksize) {
    // We need to solve: 2*prime² + 2*(blocksize+1)*prime + blocksize >= range_stop
    counter_t low = 1;
    counter_t high;

    // Find a reasonable upper bound
    if (range_stop > blocksize) {
        high = range_stop / (2 * blocksize); 
        if (high == 0) high = 1;
    } else {
        high = 1;
    }

    // Double until we find a valid upper bound
    for (;;) {
        counter_t step = high * 2 + 1;
        
#if COUNTER_T_SIZE_PP == 32
        // Use 64-bit arithmetic to avoid overflow on 32-bit types
        uint64_t high64 = (counter_t)high;
        uint64_t calculated = high64 * 2 * (high64 + 1);
        
        // Check if we'd exceed range_stop or if multiplication would overflow
        if (calculated > range_stop || 
            step > UINT32_MAX / blocksize ||     // Check for multiplication overflow
            high >= UINT32_MAX / 4) break;       // Prevent overflow in high*2*(high+1)
            
        // Check if the condition is satisfied
        counter_t block_step = (counter_t)blocksize * step;
        if (block_step >= (range_stop - (counter_t)calculated)) break;
#else
        // For 64-bit types, we can do direct calculations in most cases
        // Only check for extreme values
        counter_t calculated = high * 2 * (high + 1);
               
        // Only check for overflow in extreme cases
        if (high > (UINT64_MAX / 4) || calculated > range_stop) break;

        // Check if the condition is satisfied
        if (blocksize * step >= (range_stop - calculated)) break;
#endif
        
        high = high * 2;
    }
    
    // Binary search
    while (low < high) {
        counter_t mid = low + (high - low) / 2;
        counter_t step = mid * 2 + 1;
        
#if COUNTER_T_SIZE_PP == 32
        // Use 64-bit arithmetic for calculations
        uint64_t mid64 = (uint64_t)mid;
        uint64_t calculated = mid64 * 2 * (mid64 + 1);
        
        // Adjust calculation to account for range_start
        calculated = calculated < range_start ? range_start : calculated;
        
        if (calculated > range_stop) {
            high = mid;
        } else {
            uint64_t block_step = (uint64_t)blocksize * step;
            if (block_step >= (range_stop - (counter_t)calculated)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
#else
        // 64-bit direct calculation
        counter_t calculated = mid * 2 * (mid + 1);
        
        // Adjust calculation to account for range_start
        calculated = calculated < range_start ? range_start : calculated;
        
        if (calculated > range_stop) {
            high = mid;
        } else {
            if (blocksize * step >= (range_stop - calculated)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
#endif
    }
    
    return low;
}


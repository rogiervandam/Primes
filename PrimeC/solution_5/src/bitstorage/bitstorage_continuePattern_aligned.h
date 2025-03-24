static inline void  __attribute__((always_inline, hot, nonnull)) 
continuePattern_aligned(void* restrict bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose7( printf("Continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern_aligned (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern_aligned);

    bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);

    const counter_t destination_stop_word = index_type(destination_stop, bitbucket_t);
    const counter_t copy_start = source_start + size;
    register counter_t source_word = index_type(source_start, bitbucket_t);
    register counter_t copy_word = index_type(copy_start, bitbucket_t);
    
    bitstorage_sized[copy_word] = bitstorage_sized[source_word] & ~chopmask_type(copy_start, bitbucket_t);
    
    // TODO: check if destionation_stop_word - copy_word % step would help
    while (copy_word + size <= destination_stop_word) {
        memcpy(&bitstorage_sized[copy_word], &bitstorage_sized[source_word], (uintmax_t)size * sizeof(bitbucket_t) );
            copy_word += size;
        }

    while (copy_word < destination_stop_word) {
        bitstorage_sized[copy_word] = bitstorage_sized[source_word];
        source_word++;
        copy_word++;
    }

    timer_laptime(time_continuePattern_aligned); verbose7( printf("\n"); )
}

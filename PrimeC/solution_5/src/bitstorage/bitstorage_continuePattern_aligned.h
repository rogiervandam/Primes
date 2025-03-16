static inline void  __attribute__((always_inline)) continuePattern_aligned(bitword_t* bitstorage, const counter_t source_start, const counter_t size, const counter_t destination_stop)
{
    verbose7( printf("Continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern_aligned (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size)); )
    timer_lapstart(time_continuePattern_aligned);

    const counter_t destination_stop_word = wordindex(destination_stop);
    const counter_t copy_start = source_start + size;
    register counter_t source_word = wordindex(source_start);
    register counter_t copy_word = wordindex(copy_start);
    
    bitstorage[copy_word] = bitstorage[source_word] & ~chopmask(copy_start);

    // TODO: check if destionation_stop_word - copy_word % step would help
    while (copy_word + size <= destination_stop_word) {
        memcpy(&bitstorage[copy_word], &bitstorage[source_word], (uintmax_t)size*sizeof(bitword_t) );
        copy_word += size;
    }

    while (copy_word < destination_stop_word) {
        bitstorage[copy_word] = bitstorage[source_word];
        source_word++;
        copy_word++;
    }

    timer_laptime(time_continuePattern_aligned); verbose7( printf("\n"); )
}

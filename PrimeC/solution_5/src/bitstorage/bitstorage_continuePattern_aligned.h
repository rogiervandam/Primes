static inline void  __attribute__((always_inline, hot, nonnull)) 
function(continuePattern_aligned,suffix)(void* restrict bitstorage, const counter_t source_start, const counter_t destination_stop, const counter_t size)
{
    logStart7(bitstorage, time_continuePattern_aligned, "ContinuePatternAligned: continue pattern size %ju in %ju bit range (%ju-%ju) using continuePattern_aligned (%ju copies)", (uintmax_t)size, (uintmax_t)destination_stop-(uintmax_t)source_start,(uintmax_t)source_start,(uintmax_t)destination_stop, (uintmax_t)(((uintmax_t)destination_stop-(uintmax_t)source_start)/(uintmax_t)size));

    bitbucket_t* restrict bitstorage_sized = __builtin_assume_aligned(bitstorage, cache_line_bytes);
    const counter_t destination_stop_word = index_type(destination_stop, bitbucket_t);
    const counter_t copy_start = source_start + size;
    register counter_t source_word = index_type(source_start, bitbucket_t);
    register counter_t copy_word = index_type(copy_start, bitbucket_t);
   
    bitstorage_sized[copy_word] = bitstorage_sized[source_word] & ~chopmask_type(copy_start, bitbucket_t);
    log9(bitstorage, "ContinuePatternAligned: handled first word with copy source_word=%ju copy_word=%ju size=%ju", (uintmax_t)source_word, (uintmax_t)copy_word, (uintmax_t)size);
    
    for (; copy_word + size <= destination_stop_word; copy_word += size) {
        local_memcpy(&bitstorage_sized[copy_word], &bitstorage_sized[source_word], (uintmax_t)size * sizeof(bitbucket_t) );
        log9(bitstorage, "ContinuePatternAligned: copying pattern in loop with memcpy source_word=%ju copy_word=%ju size=%ju", (uintmax_t)source_word, (uintmax_t)copy_word, (uintmax_t)size);
    }

    for (; copy_word < destination_stop_word; ) {
        bitstorage_sized[copy_word++] = bitstorage_sized[source_word++];
        log9(bitstorage, "ContinuePatternAligned: copying pattern in loop source_word=%ju copy_word=%ju size=%ju", (uintmax_t)source_word, (uintmax_t)copy_word, (uintmax_t)size);
    }

    logStop7(bitstorage, time_continuePattern_aligned, "ContinuePatternAligned: finished continuing pattern\n");
}

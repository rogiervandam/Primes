// allocate memory for a sieve block
// NOTES:
// - use cache lines as much as possible - alignment might be key
// - moved clearing the sieve with 0 to the sieve_block_extend - it gave weird malloc problems at this point
// - switched to one malloc for the sieve, instead of one for the sieve and one for the storage
// - bitstorage will be aligned on the anticiped_cache_line_bytesize

// #include <sys/mman.h>

    // Allocate memory with read and write permissions, anonymously and privately.
// static inline void *allocate_via_mmap(size_t size) {
//     void *ptr = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_SHARED , -1, 0);
//         if (ptr == MAP_FAILED) {
//             perror("mmap failed");
//             exit(1);
//         }
//         return ptr;
//     }

// static inline void deallocate_via_mmap(void *ptr, size_t size) {
//     if (munmap(ptr, size) != 0) {
//         perror("munmap failed");
//     }
// }

static inline struct sieve_t * __attribute__((always_inline)) sieve_create(const counter_t size) 
{
    // struct sieve_t *sieve = allocate_via_mmap(((sizeof(struct sieve_t) + (size_t)(size>>1))|(anticiped_cache_line_bytesize-1))+1+anticiped_cache_line_bytesize);
    struct sieve_t *sieve = malloc(((sizeof(struct sieve_t) + (size_t)(size>>1))|(anticiped_cache_line_bytesize-1))+1+anticiped_cache_line_bytesize);
    sieve->bitstorage     = __builtin_assume_aligned((void *) (( (uintptr_t) (sieve + sizeof(struct sieve_t))|(anticiped_cache_line_bytesize-1))+1),anticiped_cache_line_bytesize);
    sieve->bits           = size >> 1;
    return sieve;
}

static inline void __attribute__((always_inline)) sieve_clear(struct sieve_t *sieve) 
{
    memset(sieve->bitstorage, SAFE_ZERO, sieve->bits / 8);
}

static inline void __attribute__((always_inline)) sieve_delete(struct sieve_t *sieve) 
{
    free(sieve);
    // deallocate_via_mmap(sieve, ((sizeof(struct sieve_t) + (size_t)(sieve->bits>>1))|(anticiped_cache_line_bytesize-1))+1+anticiped_cache_line_bytesize);
}


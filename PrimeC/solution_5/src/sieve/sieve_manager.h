// The sieve manager is responsible for creating, deleting and clearing the sieve

// The sieve is a data structure that is used to store the prime numbers.
// - bitstorage is the aligned bitstorage for the sieve
// - bits is the number of bits in the sieve. It is half the sive of the sieve, because we don't store bits for even numbers

#include <stdlib.h>  // for malloc, free, exit and getenv
typedef struct sieve_t 
{
    void*     bitstorage __attribute__((aligned(cache_line_bytes)));  // Align to cache line
    counter_t size       __attribute__((aligned(cache_line_bytes)));     
    counter_t bits       __attribute__((aligned(cache_line_bytes)));  // Number of bits (if compressed, lower than size)
} __attribute__((aligned(cache_line_bytes))) sieve_t;  // Align the whole structure

typedef struct  {
    counter_t storage_id;
    counter_t bitsize;
    counter_t factorsize;
    counter_t highest_prime_in_storage;
} storage_t;

// create a sieve with a given size including the bitstorage
static inline sieve_t*  __attribute__((always_inline, malloc, returns_nonnull, assume_aligned(cache_line_bytes), aligned(cache_line_bytes)))
sieve_create(const counter_t size, const counter_t bits) 
{
    // allocate memory for the sieve and include all the memory voor the bitstorage, so we have only one malloc
    // make sure there is enought room to align the bitstorage on the cache line
    const size_t bitstorage_bytesize = (64 + bits) >> 3; // shift >>3 for bit to bytesize
    const size_t alloc_size = sizeof(struct sieve_t) + bitstorage_bytesize + 2 * cache_line_bytes; // add 2 * cache_line_bytes to make sure we can align the bitstorage
    sieve_t* sieve = malloc(alloc_size);
    if (!sieve) { verbose1( perror("Allocation of sieve failed"); exit(EXIT_FAILURE); ) }

    // align bitstorage
    const uintptr_t raw_address = (uintptr_t)sieve + sizeof(struct sieve_t);
    const uintptr_t aligned_address = (raw_address + (cache_line_bytes - 1)) & ~(cache_line_bytes - 1);
    sieve->bitstorage = __builtin_assume_aligned((void *)aligned_address, cache_line_bytes);
    sieve->bits       = bits;
    sieve->size       = size;

    log5("Initial: Allocated sieve of %ju bytes, bitstorage with %ju bits (aligned range 0-%ju bits (%ju bytes), %ju bits alignment)\n", 
        (uintmax_t)alloc_size, (uintmax_t)bits, (uintmax_t)(alloc_size - sizeof(struct sieve_t))*8, (uintmax_t)bitstorage_bytesize, (uintmax_t)(aligned_address - raw_address)*8);

    return sieve;
}

// set the entire bitstorage in the sieve to zero
#undef bitbucket_t
#define bitbucket_t uint64v8_t
#define BITBUCKET_BASE(pattern) ((bitbucket_t){ pattern, pattern, pattern, pattern })
static inline void __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
sieve_clear(sieve_t* sieve) 
{
    counter_t vector_max = index_type(sieve->bits + 1, bitbucket_t);
    bitbucket_t* bitstorage  = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    bitbucket_t  vector_zero = BITBUCKET_BASE( (uint64_t) 0ULL );
    #pragma GCC ivdep
    #pragma GCC unroll 8
    for (counter_t i = 0; i <= vector_max; i++) {
        bitstorage[i] = vector_zero;
    }
}
#undef bitbucket_t
#undef BITBUCKET_BASE

// delete the sieve
static inline void __attribute__((always_inline, nonnull, aligned(cache_line_bytes))) 
sieve_delete(sieve_t* sieve) 
{
    free(sieve);
}
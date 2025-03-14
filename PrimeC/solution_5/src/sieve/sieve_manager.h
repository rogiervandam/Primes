// The sieve manager is responsible for creating, deleting and clearing the sieve

// The sieve is a data structure that is used to store the prime numbers.
// - bitstorage is the aligned bitstorage for the sieve
// - bits is the number of bits in the sieve. It is half the sive of the sieve, because we don't store bits for even numbers
struct sieve_t {
    bitword_t* bitstorage __attribute__((aligned(cache_line_bytes)));  // Align to cache line
    counter_t bits;
  } __attribute__((aligned(cache_line_bytes)));  // Align the whole structure


// create a sieve with a given size including the bitstorage
static inline struct sieve_t * __attribute__((always_inline)) sieve_create(const counter_t size) 
{
    // alocate memory for the sieve and include all the memory voor the bitstorage, so we have only one malloc
    // make sure there is enought room to align the bitstorage on the cache line
    size_t bitstorage_bytesize = size >> (SHIFT_SIZE + SHIFT_BYTE); // shift >> 1 for not storing even and shift >>3 for bit to bytesize
    size_t alloc_size = sizeof(struct sieve_t) + bitstorage_bytesize + cache_line_bytes;
    struct sieve_t *sieve = malloc(alloc_size);
    if (!sieve) {
        perror("malloc failed");
        exit(EXIT_FAILURE);
    }

    // align bitstorage
    uintptr_t raw_address = (uintptr_t)sieve + sizeof(struct sieve_t);
    uintptr_t aligned_address = (raw_address + (cache_line_bytes - 1)) & ~(cache_line_bytes - 1);
    sieve->bitstorage = __builtin_assume_aligned((void *)aligned_address, cache_line_bytes);

    sieve->bits           = size >> SHIFT_SIZE;
    return sieve;
}

// set the entire bitstorage in the sieve to zero
static inline void __attribute__((always_inline)) sieve_clear(struct sieve_t *sieve) 
{
    counter_t vector_max = vectorindex(sieve->bits) + 1;
    bitvector_t *bitstorage = __builtin_assume_aligned(sieve->bitstorage, cache_line_bytes);
    bitvector_t vector_zero = VECTOR_BASE( VECTOR_SAFE_ZERO );
    for (counter_t i = 0; i <= vector_max; i++) {
        bitstorage[i] = vector_zero;
    }

    // alternative, but dependent on <string.h>
    // memset(sieve->bitstorage, 0, (sieve->bits >> 3) + 1 ); // add one to make sure the 
}

// delete the sieve
static inline void __attribute__((always_inline)) sieve_delete(struct sieve_t *sieve) 
{
    free(sieve);
}

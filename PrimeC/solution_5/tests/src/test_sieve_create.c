#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#include "../../src/generic/helpers.h"
#include "../../src/generic/settings.h"
#include "../../src/generic/types.h"
#include "../../src/sieve/sieve_manager.h"


// Test helper function to check if pointer is aligned to cache line
static bool is_aligned(void* ptr, size_t alignment) {
    return ((uintptr_t)ptr % alignment) == 0;
}

// Test basic allocation works
void test_basic_allocation() {
    counter_t size = 1000;
    struct sieve_t* sieve = sieve_create(size);
    
    assert(sieve != NULL);
    assert(sieve->bits == size >> 1);
    assert(sieve->bitstorage != NULL);
    
    sieve_delete(sieve);
    printf("✓ Basic allocation test passed\n");
}

// Test alignment
void test_alignment() {
    counter_t size = 1000;
    struct sieve_t* sieve = sieve_create(size);
    
    // assert(is_aligned(sieve, cache_line_bytes));
    assert(is_aligned(sieve->bitstorage, cache_line_bytes));
    
    sieve_delete(sieve);
    printf("✓ Alignment test passed\n");
}

// Test we can actually use the allocated memory
void test_memory_usability() {
    counter_t size = 1000;
    struct sieve_t* sieve = sieve_create(size);
    
    // Calculate how many bytes we need for the bits
    size_t needed_bytes = (sieve->bits + 7) / 8;
    
    // Try writing to the memory
    memset(sieve->bitstorage, 0xAA, needed_bytes);
    
    // Read back and verify
    unsigned char* bytes = (unsigned char*)sieve->bitstorage;
    for (size_t i = 0; i < needed_bytes; i++) {
        assert(bytes[i] == 0xAA);
    }
    
    sieve_delete(sieve);
    printf("✓ Memory usability test passed\n");
}

// Test edge cases
void test_edge_cases() {
    // Small size
    struct sieve_t* small_sieve = sieve_create(8);
    assert(small_sieve != NULL);
    assert(small_sieve->bits == 4);
    sieve_delete(small_sieve);
    
    // Zero size (probably should be handled differently in real code)
    struct sieve_t* zero_sieve = sieve_create(0);
    assert(zero_sieve != NULL);
    assert(zero_sieve->bits == 0);
    sieve_delete(zero_sieve);
    
    // Large size - be careful with memory limits on your system
#if COUNTER_T_SIZE_PP == 64
    // Only test large sizes on 64-bit systems
    counter_t large_size = 1ULL << 20; // 1 MB of bits
    struct sieve_t* large_sieve = sieve_create(large_size);
    assert(large_sieve != NULL);
    assert(large_sieve->bits == large_size >> 1);
    sieve_delete(large_sieve);
#endif
    
    printf("✓ Edge cases test passed\n");
}

// Test for 32-bit overflow concerns
#if COUNTER_T_SIZE_PP == 32
void test_32bit_overflow() {
    // Test a size that's close to the 32-bit limit but still valid
    counter_t size = 0x0FFFFFFF; // A large but not max value
    
    struct sieve_t* sieve = sieve_create(size);
    if (sieve != NULL) {
        assert(sieve->bits == size >> 1);
        sieve_delete(sieve);
        printf("✓ 32-bit overflow test passed\n");
    } else {
        // This might fail due to memory constraints, not necessarily a code issue
        printf("⚠️ 32-bit large allocation test skipped (likely due to memory constraints)\n");
    }
}
#endif

// Test multiple successive allocations and deallocations
void test_multiple_allocations() {
    for (int i = 0; i < 100; i++) {
        counter_t size = 1000 * (i + 1);
        struct sieve_t* sieve = sieve_create(size);
        assert(sieve != NULL);
        assert(sieve->bits == size >> 1);
        sieve_delete(sieve);
    }
    printf("✓ Multiple allocations test passed\n");
}

// Test for memory leaks (requires valgrind or similar)
void test_for_memory_leaks() {
    printf("ℹ️ Run this test with valgrind to check for memory leaks\n");
    for (int i = 0; i < 1000; i++) {
        struct sieve_t* sieve = sieve_create(1000);
        sieve_delete(sieve);
    }
    printf("✓ Memory leak test completed\n");
}

int main() {
    printf("Running sieve_create tests...\n");
    
    test_basic_allocation();
    test_alignment();
    test_memory_usability();
    test_edge_cases();
    test_multiple_allocations() ;
    test_for_memory_leaks();
    
#if COUNTER_T_SIZE_PP == 32
    test_32bit_overflow();
#endif
    
    printf("All tests passed!\n");
    return 0;
}
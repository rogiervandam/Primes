// Structure to hold function information
typedef struct {
    int number;                     // Method number/index
    const char* name;               // Function name 
    setBitsTrueFunc func;           // Function pointer
    counter_t min_step;             // Minimum applicable step value
    counter_t max_step;             // Maximum applicable step value
    int enabled;                    // Whether this function is enabled in benchmarking
} SetBitsTrueMethod;


// Global array with all setBitsTrue functions
static SetBitsTrueMethod setBitsTrueMethods[] = {
    {0, "setBitsTrue", setBitsTrue, 0, INT32_MAX, 1},
    // {0, "setBitsTrue_range", setBitsTrue_range, 0, INT32_MAX, 1},
    // {2, "setBitsTrue_smallstep_rotate_uint64v8", setBitsTrue_smallstep_rotate_uint64v8, 1, 63, 1},
    // {2, "setBitsTrue_smallstep_rotate_uint64v4", setBitsTrue_smallstep_rotate_uint64v4, 1, 63, 1},
    // {2, "setBitsTrue_smallstep_rotate_uint64v2", setBitsTrue_smallstep_rotate_uint64v2, 1, 63, 1},
    // {2, "setBitsTrue_smallstep_rotate_uint32v8", setBitsTrue_smallstep_rotate_uint32v8, 1, 31, 1},
    // {2, "setBitsTrue_smallstep_rotate_uint32v4", setBitsTrue_smallstep_rotate_uint32v4, 1, 31, 1},
    // {2, "setBitsTrue_smallstep_rotate_uint32v2", setBitsTrue_smallstep_rotate_uint32v2, 1, 31, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint64v8_unroll8", setBitsTrue_smallstep_rotate_pair_uint64v8_unroll8, 0, 63, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint64v4_unroll8", setBitsTrue_smallstep_rotate_pair_uint64v4_unroll8, 0, 63, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint64v2_unroll8", setBitsTrue_smallstep_rotate_pair_uint64v2_unroll8, 0, 63, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint64v8", setBitsTrue_smallstep_rotate_pair_uint64v8, 0, 63, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint64v4", setBitsTrue_smallstep_rotate_pair_uint64v4, 0, 63, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint64v2", setBitsTrue_smallstep_rotate_pair_uint64v2, 0, 63, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint32v8", setBitsTrue_smallstep_rotate_pair_uint32v8, 0, 31, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint32v4", setBitsTrue_smallstep_rotate_pair_uint32v4, 0, 31, 1},
    // {1, "setBitsTrue_smallstep_rotate_pair_uint32v2", setBitsTrue_smallstep_rotate_pair_uint32v2, 0, 31, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint64_unroll8", setBitsTrue_smallstep_repeat_uint64_unroll8, 0, 63, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint32_unroll8", setBitsTrue_smallstep_repeat_uint32_unroll8, 0, 31, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint16_unroll8", setBitsTrue_smallstep_repeat_uint16_unroll8, 0, 15, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint8_unroll8", setBitsTrue_smallstep_repeat_uint8_unroll8, 0, 7, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint64", setBitsTrue_smallstep_repeat_uint64, 0, 63, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint32", setBitsTrue_smallstep_repeat_uint32, 0, 31, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint16", setBitsTrue_smallstep_repeat_uint16, 0, 15, 1},
    // {3, "setBitsTrue_smallstep_repeat_uint8", setBitsTrue_smallstep_repeat_uint8, 0, 7, 1},
    // {3, "setBitsTrue_smallstep_norepeat_uint64", setBitsTrue_smallstep_norepeat_uint64, 0, 63, 1},
    // {3, "setBitsTrue_smallstep_norepeat_uint32", setBitsTrue_smallstep_norepeat_uint32, 0, 31, 1},
    // {3, "setBitsTrue_smallstep_norepeat_uint16", setBitsTrue_smallstep_norepeat_uint16, 0, 15, 1},
    // {3, "setBitsTrue_smallstep_norepeat_uint8", setBitsTrue_smallstep_norepeat_uint8, 0, 7, 1},
    // {5, "setBitsTrue_largestep_vector_uint64v8", setBitsTrue_largestep_vector_uint64v8, 65, 511, 1},
    {6, "setBitsTrue_largestep_vector_uint64v4", setBitsTrue_largestep_vector_uint64v4, 65, 255, 1},
    // {7, "setBitsTrue_largestep_vector_uint64v2", setBitsTrue_largestep_vector_uint64v2, 65, 127, 1},
    // {8, "setBitsTrue_largestep_vector_uint32v8", setBitsTrue_largestep_vector_uint32v8, 33, 255, 0},
    // {8, "setBitsTrue_largestep_vector_uint32v4", setBitsTrue_largestep_vector_uint32v4, 33, 127, 0},
    // {8, "setBitsTrue_largestep_vector_uint32v2", setBitsTrue_largestep_vector_uint32v2, 33, 63, 0},
    // {5, "setBitsTrue_largestep_rotate_uint64v8", setBitsTrue_largestep_rotate_uint64v8, 65, 511, 1},
    {6, "setBitsTrue_largestep_rotate_uint64v4", setBitsTrue_largestep_rotate_uint64v4, 65, 255, 1},
    {6, "setBitsTrue_largestep_rotate_pair_uint64v4", setBitsTrue_largestep_rotate_pair_uint64v4, 65, 255, 1},
    // {7, "setBitsTrue_largestep_rotate_uint64v2", setBitsTrue_largestep_rotate_uint64v2, 65, 127, 1},
    // {8, "setBitsTrue_largestep_rotate_uint32v8", setBitsTrue_largestep_rotate_uint32v8, 33, 255, 0},
    // {8, "setBitsTrue_largestep_rotate_uint32v4", setBitsTrue_largestep_rotate_uint32v4, 33, 127, 0},
    // {8, "setBitsTrue_largestep_rotate_uint32v2", setBitsTrue_largestep_rotate_uint32v2, 33, 63, 0},
    // {9, "setBitsTrue_largestep_vector_uint16v8", setBitsTrue_largestep_vector_uint16v8, 17, 127, 0},
    // {9, "setBitsTrue_largestep_vector_uint16v4", setBitsTrue_largestep_vector_uint16v4, 17, 63, 0},
    // {9, "setBitsTrue_largestep_vector_uint16v2", setBitsTrue_largestep_vector_uint16v2, 17, 31, 0},
    // {19, "setBitsTrue_largestep_repeat_uint64_unroll8", setBitsTrue_largestep_repeat_uint64_unroll8, 0, INT32_MAX, 1},
    // {15, "setBitsTrue_largestep_repeat_uint64_unroll4", setBitsTrue_largestep_repeat_uint64, 0, INT32_MAX, 1},
    // {18, "setBitsTrue_largestep_repeat_uint32_unroll8", setBitsTrue_largestep_repeat_uint32_unroll8, 0, INT32_MAX, 1},
    // {18, "setBitsTrue_largestep_repeat_uint32_unroll4", setBitsTrue_largestep_repeat_uint32, 0, INT32_MAX, 1},
    // {17, "setBitsTrue_largestep_repeat_uint16_unroll8", setBitsTrue_largestep_repeat_uint16_unroll8, 0, INT32_MAX, 1},
    // {17, "setBitsTrue_largestep_repeat_uint16_unroll4", setBitsTrue_largestep_repeat_uint16, 0, INT32_MAX, 1},
    // {12, "setBitsTrue_largestep_repeat_uint8_unroll8", setBitsTrue_largestep_repeat_uint8_unroll8, 0, INT32_MAX, 1},
    {12, "setBitsTrue_largestep_repeat_uint8_unroll4", setBitsTrue_largestep_repeat_uint8, 0, INT32_MAX, 1},
    // {11, "setBitsTrue_largestep_norepeat_uint8_unroll8", setBitsTrue_largestep_norepeat_uint8_unroll8, 0, INT32_MAX, 1},
    // {11, "setBitsTrue_largestep_norepeat_uint8_unroll4", setBitsTrue_largestep_norepeat_uint8, 0, INT32_MAX, 1},
};
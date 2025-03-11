#if defined u32v2
#define bitword_t       uint32_t
#define BITWORD_T_SIZE_PP 32
#define VECTOR_ELEMENTS 2
// #define VECTOR_SETTING  u32_v2
#elif defined u64v2
#define bitword_t       uint64_t
#define BITWORD_T_SIZE_PP 64
#define VECTOR_ELEMENTS 2
// #define VECTOR_SETTING  u64_v2
#define WORD_SIZE_PP    64
#elif defined u32v4
#define bitword_t       uint32_t
#define BITWORD_T_SIZE_PP 32
#define VECTOR_ELEMENTS 4
// #define VECTOR_SETTING  u32_v4
#elif defined u64v4
#define bitword_t       uint64_t
#define BITWORD_T_SIZE_PP 64
#define VECTOR_ELEMENTS 4
// #define VECTOR_SETTING  u64_v4
// #define WORD_SIZE_PP    64
#elif defined u32v8
#define bitword_t       uint32_t
#define BITWORD_T_SIZE_PP 32
#define VECTOR_ELEMENTS 8
// #define VECTOR_SETTING  u32_v8
// #define SAFE_SHIFT 1 // - set to 1 for 32<= bit (needs mask on shift)
#elif defined u64v8
#define bitword_t       uint64_t
#define BITWORD_T_SIZE_PP 64
#define VECTOR_ELEMENTS 8
// #define VECTOR_SETTING  u64_v8
// #define WORD_SIZE_PP    64
#endif
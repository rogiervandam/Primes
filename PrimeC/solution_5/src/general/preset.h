
#if defined u64
#define bitword_t       uint64_t
#define BITWORD_T_SIZE_PP 64
#endif

#if defined u32
#define bitword_t       uint32_t
#define BITWORD_T_SIZE_PP 32
#endif

#if defined v8
#define VECTOR_ELEMENTS 8
#endif

#if defined v4
#define VECTOR_ELEMENTS 4
#endif

#if defined v2
#define VECTOR_ELEMENTS 2
#endif

#if defined ci64
#define counter_t       int64_t
#define COUNTER_T_SIZE_PP 64    
#endif

#if defined ci32
#define counter_t       int32_t
#define COUNTER_T_SIZE_PP 32
#endif

#if defined cu64
#define counter_t       uint64_t
#define COUNTER_T_SIZE_PP 64
#endif

#if defined cu32
#define counter_t       uint32_t
#define COUNTER_T_SIZE_PP 32
#endif


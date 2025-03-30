
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


// used only for debugging
static inline void __attribute__ ((cold))
printWord_uint64(uint64_t bitword)
{
    printf("\n");
    char row[64*2] = {};
    int col=0;
    for (int i=64-1; i>=0; i--) {
      row[col++] = (bitword & (1ULL<<i))?'1':'.';
      if (!(i%8)) row[col++] = ' ';
    }

    verbose1( printf("%s", row); )
}

static inline void __attribute__ ((cold))
printWord_uint32(uint64_t bitword)
{
    char row[32*2] = {};
    int col=0;
    for (int i=32-1; i>=0; i--) {
      row[col++] = (bitword & (1ULL<<i))?'1':'.';
      if (!(i%8)) row[col++] = ' ';
    }

    verbose1( printf("%s", row); )
}

static void __attribute__ ((cold)) 
printVector(bitvector_t bitvector)
{
    // Use a union to extract the scalar elements from the vector
    union {
        bitvector_t vec;
        bitword_vector_t arr[VECTOR_ELEMENTS];
    } u;
    u.vec = bitvector;

    char row[VECTOR_SIZE_BITS*2] = {0};
    int col = 0;
    // Each vector element is a bitword_t with WORD_SIZE bits
    for (int j = VECTOR_ELEMENTS - 1; j >= 0; j--) {
        for (int i = VECTORWORD_SIZE_BITS - 1; i >= 0; i--) {
            row[col++] = (u.arr[j] & (1U << i)) ? '1' : '.';
            if (i % 8 == 0)
                row[col++] = ' ';
        }
        row[col++] = 'x'; row[col++] = ' ';
      }
    row[col] = '\0';
    verbose1( printf("%s\n", row); )
}

static void __attribute__ ((cold)) printVectorNumeric(bitvector_t bitvector)
{
  for(counter_t i=0; i < VECTOR_ELEMENTS; i++) {
      verbose1( printf("%ju,", (uintmax_t) bitvector[i]); )
  }
  verbose1( printf("\n");	)
}


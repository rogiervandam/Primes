// used only for debugging
static inline void printWord(bitword_t bitword)
{
    char row[WORD_SIZE*2] = {};
    int col=0;
    for (int i=WORD_SIZE-1; i>=0; i--) {
      row[col++] = (bitword & (BITWORD_SHIFTBIT<<i))?'1':'.';
      if (!(i%8)) row[col++] = ' ';
    }

    verbose1( printf("%s", row); )
}

static void printVector(bitvector_t bitvector)
{
    // Use a union to extract the scalar elements from the vector
    union {
        bitvector_t vec;
        bitword_vector_t arr[VECTOR_ELEMENTS];
    } u;
    u.vec = bitvector;

    char row[VECTOR_SIZE*2] = {0};
    int col = 0;
    // Each vector element is a bitword_t with WORD_SIZE bits
    for (int j = VECTOR_ELEMENTS - 1; j >= 0; j--) {
        for (int i = VECTORWORD_SIZE - 1; i >= 0; i--) {
            row[col++] = (u.arr[j] & (BITVECTORWORD_SHIFTBIT << i)) ? '1' : '.';
            if (i % 8 == 0)
                row[col++] = ' ';
        }
        row[col++] = 'x'; row[col++] = ' ';
      }
    row[col] = '\0';
    verbose1( printf("%s\n", row); )
}

static void printVectorNumeric(bitvector_t bitvector)
{
  for(counter_t i=0; i < VECTOR_ELEMENTS; i++) {
      verbose1( printf("%ju,", (uintmax_t) bitvector[i]); )
  }
  verbose1( printf("\n");	)
}


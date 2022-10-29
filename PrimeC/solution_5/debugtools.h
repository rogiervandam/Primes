//#include "monotonic_xplatform.h"

static inline void printWord(bitword_t bitword)
{
    char row[WORD_SIZE*2] = {};
    int col=0;
    for (int i=WORD_SIZE-1; i>=0; i--) {
		row[col++] = (bitword & (SAFE_SHIFTBIT<<i))?'1':'.';
		if (!(i%8)) row[col++] = ' ';
    }

    printf("%s", row);
}

static inline void printBits(size_t const size, void const * const ptr)
{
    unsigned char *b = (unsigned char*) ptr;
    unsigned char byte;
    int i, j;

    for (i = size-1; i >= 0; i--) {
        for (j = 7; j >= 0; j--) {
            byte = (b[i] >> j) & 1;
            if (byte==0) printf(".");
            else printf("%u", byte);
        }
        printf(" ");
    }
}

static inline void dump_bitarray( bitword_t  *bitarray, counter_t words) {
    printf("Dumping sieve with %ju words\n",(uintmax_t)words);
    for (counter_t word=0; word <= words; word++) {
        printf("word %ju ",(uintmax_t)word);
        printWord(bitarray[word]);
        printf(" %ju\n", (uintmax_t)word*WORD_SIZE);

    }
    puts("");
}

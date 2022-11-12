#!/bin/bash
rm --force *.s
rm --force *.o
CC="-Ofast -march=native -funroll-all-loops -mtune=native -fno-asynchronous-unwind-tables -malign-data=cacheline -fno-exceptions -masm=intel -fverbose-asm -mavx -W -Wall -Wextra -Wunused -Imimalloc/include -pthread"
#CC="-Ofast -march=native -mtune=native -funroll-all-loops -malign-data=cacheline" 
PAR="-fopenmp"
PAREXT="_epar"
gcc -c -Wa,-asdlh  $CC $1.c > $1.s
gcc -c -Wa,-asdlh  $CC $PAR $1.c > $1$PAREXT.s
gcc $CC -o $1 $1.c -lm
gcc $CC $PAR -o $1$PAREXT $1.c -lm
for i in {1..10}; do 
./$1 $2 $3 $4 $5 $6 $7; 
done
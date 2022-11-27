#!/bin/sh
rm --force *.s
rm --force *.o
#CC="-Ofast -march=native -funroll-all-loops -mtune=native -fno-asynchronous-unwind-tables -malign-data=cacheline -fno-exceptions -masm=intel -fverbose-asm  -mavx -W -Wall -Wno-unused-function -Wvector-operation-performance -Wno-psabi"
CC="-Ofast -s -march=native -mtune=native -funroll-all-loops -fno-asynchronous-unwind-tables -fno-exceptions -masm=intel -fverbose-asm  -W -Wall -Wno-unused-function -Wvector-operation-performance -Wno-psabi"
PAR="-fopenmp"
PAREXT="_epar"
gcc -c -Wa,-asdlh -Du64_v4 $CC $1.c > $1.s 
gcc -c -Wa,-asdlh -Du64_v4 $CC $PAR $1.c > $1$PAREXT.s
gcc $CC -o $1 $1.c -Du64_v4
gcc $CC $PAR -o $1$PAREXT $1.c -Du64_v4
./$1 $2 $3 $4 $5 $6 $7

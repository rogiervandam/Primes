#!/bin/sh
# rm -f *.s
# rm -f *.o
# CC="-Ofast -march=native -funroll-all-loops -mtune=native -fno-asynchronous-unwind-tables -malign-data=cacheline -fno-exceptions -masm=intel -fverbose-asm  -mavx -W -Wall -Wno-unused-function -Wvector-operation-performance -Wno-psabi"
# PAR="-fopenmp"
# PAREXT="_epar"
# gcc -c -Wa,-asdlh  $CC $1.c > $1.s
# gcc -c -Wa,-asdlh  $CC $PAR $1.c > $1$PAREXT.s
# gcc $CC -o $1 $1.c -lm -Du64_v4
# gcc $CC $PAR -o $1$PAREXT $1.c -lm
# ./$1 $2 $3 $4 $5 $6 $7
CC="gcc -Ofast -march=native -mtune=native -funroll-all-loops -fno-asynchronous-unwind-tables -fno-exceptions -fomit-frame-pointer -Wno-psabi"  
PAR="-fopenmp"
PAREXT="_epar"
for x in sieve_extend; do
    for y in u32_v8 u64_v4 u64_v8; do
        $CC -o $x-$y $x.c -D$y -s
        $CC $PAR -o $x$PAREXT-$y $x.c -D$y -s
    done
done
./$1 $2 $3 $4 $5 $6 $7

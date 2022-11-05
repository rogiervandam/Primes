#!/bin/sh
rm --force *.s
rm --force *.o
CC="-Ofast -march=native -funroll-all-loops -mtune=native -fno-asynchronous-unwind-tables -malign-data=cacheline -fno-exceptions -masm=intel -fverbose-asm  -mavx -W -Wall -Wno-unused-function" #" -fomit-frame-pointer -flto" 
#CC="-Ofast -march=native -mtune=native -funroll-all-loops -malign-data=cacheline  " 
gcc -c -g -Wa,-asdlh  $CC $1.c > $1.s
gcc $CC -o $1 $1.c -lm
./$1 $2 $3 $4 $5 $6 $7

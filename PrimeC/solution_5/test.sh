#!/bin/sh
rm --force *.s
rm --force *.o
CC="-Ofast -march=native -funroll-all-loops -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -masm=intel -fverbose-asm" #" -fomit-frame-pointer -flto" 
gcc -c -g -Wa,-asdlh  $CC $1.c > $1.s
gcc $CC -o $1 $1.c -lm
./$1 $2 $3 $4 $5 $6 $7

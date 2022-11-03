#!/bin/sh
rm --force *.s
rm --force *.o
CC="-Ofast -march=native -funroll-all-loops -mtune=intel -fno-asynchronous-unwind-tables -fno-exceptions -masm=intel -fverbose-asm -malign-data=cacheline -mavx -W -Wall -Wno-unused-function" #" -fomit-frame-pointer -flto" 
gcc -c -g -Wa,-asdlh  $CC $1.c > $1.s
gcc $CC -o $1 $1.c -lm
./$1 $2 $3 $4 $5 $6 $7

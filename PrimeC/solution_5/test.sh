#!/bin/sh
CC="-Ofast -march=native -mtune=native -funroll-all-loops" 
gcc -c -g -Wa,-a,-ad $CC $1.c > $1.asm
gcc $CC -o $1 $1.c -lm
./$1 $2 $3 $4 $5 $6 $7
#!/bin/sh
CC="-Ofast -march=native -mtune=native -fbracket-depth=1024 -stdlib=libc++" 
clang-12 $CC -o $1 $1.c -lm
./$1 $2 $3 $4 $5 $6 $7

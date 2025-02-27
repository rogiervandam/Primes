#!/bin/sh
CC="gcc -Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -Wno-psabi"  
PAR="-fopenmp"
PAREXT="_epar"

# -o sieve_extend-u64_v4 sieve_extend.c -Du64_v4 -s
echo "Compiling..."
$CC -Q --help=target
for x in sieve_base sieve_extend; do
    for y in u32_v8 u64_v4 u64_v8 u64_v2; do
        $CC -o $x-$y $x.c -D$y -s
        $CC $PAR -o $x$PAREXT-$y $x.c -D$y -s
    done
done

#!/bin/sh
CC="gcc -O3 -ffast-math -march=native -mtune=native" # -funroll-all-loops" 
for x in primes_striped-block primes_normal-block; do
    $CC -o $x $x.c -lm
done

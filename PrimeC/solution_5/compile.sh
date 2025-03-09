#!/bin/sh

# Detect OS
OS="$(uname -s)"

CC="-Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -fomit-frame-pointer -flto"
if [ "$OS" = "Linux" ]; then
    CC="gcc $CC -Wno-psabi -fwhole-program -s"
    PAR="-fopenmp"
    STRIP="strip"
elif [ "$OS" = "Darwin" ]; then
    CC="gcc $CC -Wno-psabi"
    # Ensure Clang finds OpenMP headers and library
    PAR="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include -L$(brew --prefix libomp)/lib -lomp"
    STRIP="strip"
else
    echo "Unsupported OS: $OS"
    exit 1
fi

PAREXT="_epar"

echo "Compiling for ${OS} with $CC"
for x in sieve_base sieve_extend; do
    for y in u32_v8 u64_v4 u64_v8 u64_v2; do
        echo "Compiling $x-$y"
        $CC -o $x-$y $x.c -D$y
        $STRIP $x-$y

        echo "Compiling $x-$y$PAREXT"
        $CC $PAR -o $x$PAREXT-$y $x.c -D$y
        $STRIP $x$PAREXT-$y
    done
done

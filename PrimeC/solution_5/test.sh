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


# Detect OS
OS="$(uname -s)"

# TODO: Try to get -flto working with int32_t counter_t
# CC="-Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -std=c11"
CC="-Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -std=c11  "  #  -Wno-unused-function -fno-common -fdata-sections -ffunction-sections
if [ "$OS" = "Linux" ]; then
    CC="gcc-14  $CC -Wno-psabi -fwhole-program -flto -s -Wl,--gc-sections" # -static -Wvector-operation-performance " # for windows add this: -s -masm=intel -fverbose-asm -mavx -fopt-info-vec-all=vec_report.txt
    PAR="-fopenmp"
    STRIP="strip"
elif [ "$OS" = "Darwin" ]; then
    CC="clang $CC -Wno-psabi -flto -fvisibility=hidden -ffunction-sections -fdata-sections -Wl,-dead_strip"
    # Ensure Clang finds OpenMP headers and library
    PAR="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include -L$(brew --prefix libomp)/lib -lomp"
    STRIP="strip"
else
    echo "Unsupported OS: $OS"
    exit 1
fi
PAREXT="_epar"

# Check if first argument is --explain
DEFINE_FLAGS=""
PROG="sieve_extend-u64v4"  # default program

for arg in "$@"; do
    if [ "$arg" = "--explain" ]; then
        DEFINE_FLAGS="-DCOMPILE_EXPLAIN $DEFINE_FLAGS"
    fi
    if [ "$arg" = "--timers" ]; then
        DEFINE_FLAGS="-DCOMPILE_TIMERS $DEFINE_FLAGS"
    fi
done

# If first argument doesn't start with '-', use it as PROG and remove it
if [ -n "$1" ] && [ "$(printf '%c' "$1")" != "-" ]; then
    PROG="$1"
    shift
fi

echo "Compiling for ${OS} with $CC $DEFINE_FLAGS"
for s in $PROG; do
    x=$(echo "$s" | sed -E 's/-.*//')
    y=$(echo "$s" | grep -oE 'u[^-]*$')
    c=$(echo "$s" | grep -oE '(ci32|ci64|cu32|cu64)$')

    if [ -n "$y" ]; then
        PROGTOTAL="$x-$y-$c"
        DEFINE_FLAGS="-D$y $DEFINE_FLAGS"
    else
        PROGTOTAL="$PROGTOTAL$x"
    fi

    if [ -n "$c" ]; then
        DEFINE_FLAGS="-D$c $DEFINE_FLAGS"
    fi

    echo "Compiling $PROGTOTAL $DEFINE_FLAGS"
    echo "Issuing command: $CC -o ./src/$PROGTOTAL $x.c $DEFINE_FLAGS"

    $CC -o ./bin/$PROGTOTAL ./src/$x.c $DEFINE_FLAGS
    $STRIP ./bin/$PROGTOTAL

done
echo "Executing ./bin/$PROGTOTAL $@"
bin/$PROGTOTAL "$@"

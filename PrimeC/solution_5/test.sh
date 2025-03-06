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

# CC="-Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -std=c11"
CC="-Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -std=c11 "
if [ "$OS" = "Linux" ]; then
    CC="gcc $CC -Wno-psabi -s -funroll-all-loops"
    PAR="-fopenmp"
    STRIP="strip"
elif [ "$OS" = "Darwin" ]; then
    CC="clang $CC -Wno-psabi"
    # Ensure Clang finds OpenMP headers and library
    PAR="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include -L$(brew --prefix libomp)/lib -lomp"
    STRIP="strip"
else
    echo "Unsupported OS: $OS"
    exit 1
fi
PAREXT="_epar"

# Set default value for $1 if empty
# if [ -z "$1" ]; then
#     set -- "sieve_extend-u64_v4" "$2" "$3" "$4" "$5" "$6" "$7"
# fi

# set -- "sieve_extend-u64_v4"
# set -- "sieve_base-u64_v4"

# extra options for testing and debugging
# CC="$CC -malign-data=cacheline -fverbose-asm -mavx -W -Wall -Wno-unused-function -Wvector-operation-performance"

# Check if first argument is --explain
DEFINE_FLAGS=""
PROG="sieve_extend-u64_v4"  # default program

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
    x=$(echo "$s" | sed -E 's/-(u[^-]*)$//')
    y=$(echo "$s" | grep -oE 'u[^-]*$')

        echo "Compiling $x-$y $DEFINE_FLAGS"
        echo "Issuing command: $CC -o $x-$y $x.c -D$y $DEFINE_FLAGS"
        $CC -o $x-$y $x.c -D$y $DEFINE_FLAGS
        $STRIP $x-$y

        # echo "Compiling $x-$y$PAREXT $DEFINE_FLAGS"
        # $CC $PAR -o $x$PAREXT-$y $x.c -D$y $DEFINE_FLAGS
        # $STRIP $x$PAREXT-$y
done
# ./$1 $2 $3 $4 $5 $6 $7
# ./$1 --set s112-m004-l158-b0262144 --verbose 3
# ./$1 --set s016-m004-l160-b0262144
# taskset -c 0-$(nproc --all) nice -n -0 ./$1
# ./$1 --set s4520-m080-l048-b0262144-u64-v256
# ./$1 --set s001-m001-l256-b0262144-u64-v256
echo "Executing ./$PROG $@"
# ./$PROG --set s004-m048-l048-b1000000-u64-v256 "$@"
./$PROG "$@"

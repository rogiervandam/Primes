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
    CC="gcc-14  $CC -Wno-psabi -fwhole-program -flto -s -Wl,--gc-sections -s" # -static -Wvector-operation-performance " # for windows add this: -s -masm=intel -fverbose-asm -mavx -fopt-info-vec-all=vec_report.txt
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

# If the first argument does not start with '-', assign it as the base and discard it
if [ $# -gt 0 ] && [ "${1#-}" = "$1" ]; then
    base="$1"
    shift
fi

DEFINE_FLAGS=""

# Set default tokens
set_x="u64"
set_y="v4"
set_z="ci32"

# Loop through all arguments.
for arg in "$@"; do
    # Split each argument on dash and check every token.
    for token in $(echo "$arg" | tr '-' ' '); do
        case "$token" in
            u32|u64)
                set_x="$token"
                DEFINE_FLAGS="-D${set_x} $DEFINE_FLAGS"
                ;;
            v4|v8)
                set_y="$token"
                DEFINE_FLAGS="-D${set_y} $DEFINE_FLAGS"
                ;;
            ci32|ci64|cu32|cu64)
                set_z="$token"
                DEFINE_FLAGS="-D${set_z} $DEFINE_FLAGS"
                ;;
            explain|--explain)
                DEFINE_FLAGS="-DCOMPILE_EXPLAIN $DEFINE_FLAGS"
                ;;
            timers|--timers)
                DEFINE_FLAGS="-DCOMPILE_TIMERS $DEFINE_FLAGS"
                ;;
            # Ignore other tokens.
        esac
    done
done

# Compose a program name using a default base name.
PROGTOTAL="${base}-${set_x}${set_y}-${set_z}"

echo "Compiling for ${OS} with $CC $DEFINE_FLAGS"
echo "Issuing command: $CC -o ./bin/$PROGTOTAL ./src/${base}.c $DEFINE_FLAGS"
$CC -o ./bin/$PROGTOTAL ./src/${base}.c $DEFINE_FLAGS
$STRIP ./bin/$PROGTOTAL

echo "Running ./bin/$PROGTOTAL $@"
./bin/$PROGTOTAL $@


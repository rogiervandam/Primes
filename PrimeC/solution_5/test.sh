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

CC=""
CC="-Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -std=c11  -Wall -Wno-unused-function -Wno-unused-variable -Wno-unknown-pragmas"  #  -Wno-unused-function -fno-common -fdata-sections -ffunction-sections

if ! command -v gcc >/dev/null 2>&1 || [ "$(gcc --version 2>/dev/null | head -n 1 | grep -i clang)" ] || [ "$OS" = "Darwin" ]; then
    CC="clang $CC -Wno-psabi -flto -fvisibility=hidden -ffunction-sections -fdata-sections " # -Wl,-dead_strip
    # CC="clang -fsanitize=address " # use this for debugging
    # CC="clang"
    # Ensure Clang finds OpenMP headers and library
    PAR="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include -L$(brew --prefix libomp)/lib -lomp"
    STRIP="strip"
else
    CC="gcc $CC -Wno-psabi -fwhole-program -flto -s -Wl,--gc-sections -s" # -static -Wvector-operation-performance " # for windows add this: -s -masm=intel -fverbose-asm -mavx -fopt-info-vec-all=vec_report.txt
    # CC="clang $CC -Wno-psabi -flto -fvisibility=hidden -ffunction-sections -fdata-sections"
    PAR="-fopenmp"
    STRIP="strip"
fi
PAREXT="_epar"

base="sieve_extend" 
# If the first argument does not start with '-', assign it as the base and discard it
if [ $# -gt 0 ] && [ "${1#-}" = "$1" ]; then
    if echo "$1" | grep -qE '^[0-9]+$'; then
        # If it's a number, keep it as an argument
        :
    else
        base="$1"
        shift
    fi
fi

DEFINE_FLAGS=""

# Set default tokens
set_x="u64"
set_y="v4"
set_z="ci32"
verbose_level=10  
verbose_next=0
highest_number=0
threads=0

# Loop through all arguments.
for arg in "$@"; do
    # Split each argument on dash and check every token.

    # Check if previous arg was --verbose and this is the value
    if [ $verbose_next -eq 1 ]; then
        if echo "$arg" | grep -q '^[0-9]\+$'; then
            verbose_level="$arg"
        fi
        verbose_next=0
        continue
    fi

    # Check for standalone --verbose flag
    if [ "$arg" = "--verbose" ] || [ "$arg" = "verbose" ]; then
        verbose_next=1
        continue
    fi

    if [ "$arg" = "--threads" ] || [ "$arg" = "threads" ]; then
        threads=1
        continue
    fi

    # Check if the argument is a number and update the highest number
    if echo "$arg" | grep -qE '^[0-9]+$'; then
        if [ "$arg" -gt "$highest_number" ]; then
            highest_number="$arg"
        fi
        continue
    fi

    for token in $(echo "$arg" | tr '-' ' '); do
        case "$token" in
            u16|u32|u64)
                set_x="$token"
                DEFINE_FLAGS="-D${set_x} $DEFINE_FLAGS"
                ;;
            v4|v8|v4u32|v8u32|v4u64|v8u64|v16u16|v16u32|v8u16)
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

# Add default verbose arguments if not explicitly specified
run_args=""
if [ $verbose_level -eq 10 ]; then
    run_args="$run_args --verbose 2"
    verbose_level=2
fi

DEFINE_FLAGS="-DCOMPILE_VERBOSE_LEVEL=$verbose_level $DEFINE_FLAGS"

# Check if the highest number fits in 32 bits
if [ "$highest_number" -gt 999999999 ]; then
    echo "Number exceeds 32-bit range. Using 64-bit counter."
    DEFINE_FLAGS="$DEFINE_FLAGS -DUSE_64BIT_COUNTER"
fi

echo "Compiling for ${OS} "

# Compose a program name using a default base name.
PROGTOTAL="${base}-${set_x}-${set_y}-${set_z}"
# echo "Issuing command: $CC -o ./bin/$PROGTOTAL ./src/${base}.c $DEFINE_FLAGS"
$CC -o ./bin/$PROGTOTAL ./src/${base}.c $DEFINE_FLAGS
if [ $? -ne 0 ]; then
    echo "Error: Compilation failed for sequential version."
    exit 1
fi
$STRIP ./bin/$PROGTOTAL

PROGTOTALPAR="${base}$PAREXT-${set_x}-${set_y}-${set_z}"
# echo "Issuing command: $CC -o ./bin/$PROGTOTALPAR ./src/${base}.c $DEFINE_FLAGS"
$CC $PAR -o ./bin/$PROGTOTALPAR ./src/${base}.c $DEFINE_FLAGS
if [ $? -ne 0 ]; then
    echo "Error: Compilation failed for parallel version."
    exit 1
fi
$STRIP ./bin/$PROGTOTALPAR

# gcc-14 -Ofast -S -fno-asynchronous-unwind-tables -fno-exceptions -fverbose-asm -Wall -Wextra -Ofast -masm=intel -S -mavx -fopt-info-vec-all=vec_report.txt -o ./dev/$PROGTOTAL.s ./src/${base}.c $DEFINE_FLAGS

# while true; do
if [ $threads -gt 0 ]; then
    echo "Running parallel version: ./bin/$PROGTOTALPAR $run_args $@"
    ./bin/$PROGTOTALPAR $run_args $@
else
    echo "Running ./bin/$PROGTOTAL $run_args $@"
    ./bin/$PROGTOTAL $run_args $@
fi
# done

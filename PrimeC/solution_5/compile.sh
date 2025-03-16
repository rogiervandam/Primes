#!/bin/sh

# Detect OS
OS="$(uname -s)"

CC="-Ofast -march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -fomit-frame-pointer"
if [ "$OS" = "Linux" ]; then
    CC="gcc $CC -Wno-psabi -fwhole-program -s -flto -s -Wl,--gc-sections"
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

# echo "Compiling for ${OS} with $CC"
# for x in sieve_base sieve_extend; do
#     for y in u32v8 u64v4 u64v8 u64v2 u32v4; do
#         echo "Compiling $x-$y"
#         $CC -o ./bin/$x-$y ./src/$x.c -D$y
#         $STRIP ./bin/$x-$y

#         echo "Compiling $x-$y$PAREXT"
#         $CC $PAR -o ./bin/$x$PAREXT-$y ./src/$x.c -D$y
#         $STRIP ./bin/$x$PAREXT-$y
#     done
# done
for base in sieve_base sieve_extend; do
    for arg in u32-v8u32-ci32 u32-v4u32-ci32 u32-v8u64-ci32 u32-v4u64-ci32 ; do
        DEFINE_FLAGS=""
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
            esac
        done
        PROGTOTAL="${base}-${set_x}-${set_y}-${set_z}"
        echo "Compiling $PROGTOTAL"
        $CC -o ./bin/$PROGTOTAL ./src/$base.c $DEFINE_FLAGS
        $STRIP ./bin/$PROGTOTAL

        PROGTOTAL="${base}$PAREXT-${set_x}-${set_y}-${set_z}"
        echo "Compiling $PROGTOTAL$PAREXT"
        $CC $PAR -o ./bin/$PROGTOTAL ./src/$base.c $DEFINE_FLAGS
        $STRIP ./bin/$PROGTOTAL

    done
done
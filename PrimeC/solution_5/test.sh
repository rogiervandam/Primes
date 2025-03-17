#!/bin/sh
# rm -f *.s
# rm -f *.o



# Detect OS
OS="$(uname -s)"

CC=""
CC="-march=native -mtune=native -fno-asynchronous-unwind-tables -fno-exceptions -std=c11  -Wall -Wno-unused-function -Wno-unused-variable -Wno-unknown-pragmas"  #  -Wno-unused-function -fno-common -fdata-sections -ffunction-sections

if command -v clang >/dev/null 2>&1 || [ "$(gcc --version 2>/dev/null | head -n 1 | grep -i clang)" ] || [ "$OS" = "Darwin" ]; then
    CC="clang $CC -O3 -ffast-math -Wno-psabi -flto -fvisibility=hidden -ffunction-sections -fdata-sections " # -Wl,-dead_strip
    # CC="clang -fsanitize=address " # use this for debugging
    # CC="clang"
    # Ensure Clang finds OpenMP headers and library
    # PAR="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include -L$(brew --prefix libomp)/lib -lomp"
    if [ "$OS" = "Darwin" ]; then
        # macOS specific paths
        PAR="-Xpreprocessor -fopenmp -lomp -I$(brew --prefix libomp)/include -L$(brew --prefix libomp)/lib"
    else
        # Linux paths for Clang - find the actual omp.h location
        OMP_INCLUDE=$(find /usr/lib/llvm* -name "omp.h" -path "*/include*" | head -n 1)
        if [ -n "$OMP_INCLUDE" ]; then
            OMP_DIR=$(dirname "$OMP_INCLUDE")
            # Find the library directory by looking for libomp.so
            OMP_LIB_DIR=$(find /usr/lib/llvm* -name "libomp.so" | head -n 1)
            if [ -n "$OMP_LIB_DIR" ]; then
                OMP_LIB_PATH=$(dirname "$OMP_LIB_DIR")
                PAR="-fopenmp -I$OMP_DIR -L$OMP_LIB_PATH -lomp"
            else
                # Try guessing the lib directory structure
                OMP_LIB_PATH=$(echo "$OMP_DIR" | sed 's|/include.*$|/lib|')
                PAR="-fopenmp -I$OMP_DIR -L$OMP_LIB_PATH -lomp"
            fi
        else
            # Fallback to standard OpenMP paths when installed with libomp-dev
            PAR="-fopenmp -lomp"
        fi
    fi
    STRIP="strip"
else
    CC="gcc $CC -Ofast -Wno-psabi -fwhole-program -flto -s -Wl,--gc-sections -s" # -static -Wvector-operation-performance " # for windows add this: -s -masm=intel -fverbose-asm -mavx -fopt-info-vec-all=vec_report.txt
    # CC="clang $CC -Wno-psabi -flto -fvisibility=hidden -ffunction-sections -fdata-sections"
    PAR="-fopenmp"
    STRIP="strip"
fi
PAREXT="_epar"

base="sieve_extend" 

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


# Check for Docker argument first
if [ $# -gt 0 ] && [ "$1" = "docker" ]; then
    if [ $# -gt 1 ]; then
        DOCKER_TYPE="$2"
        if [ "$DOCKER_TYPE" = "all" ]; then
            # Loop through all Dockerfiles in ./dev/docker
            for DOCKERFILE in ./dev/docker/Dockerfile_*; do
                EXTENSION="${DOCKERFILE#*Dockerfile_}" # Extract the extension
                if [ $verbose_level -gt 1 ]; then
                    echo "Building and running Docker container for type: $EXTENSION"
                    echo "Running command: docker build --pull --rm -f $DOCKERFILE -t sieve-$EXTENSION ." 
                fi
                
                # Build the Docker image
                docker build --pull --rm -f "$DOCKERFILE" -t "sieve-$EXTENSION" . 2> ./dev/build.log
                if [ $? -ne 0 ]; then
                    echo "Error: Docker build failed for $EXTENSION."
                    exit 1
                fi
                
                # Run the Docker container with any remaining arguments
                if [ $verbose_level -gt 1 ]; then
                    echo "Running Docker container with arguments: $@"
                fi
                docker run --rm -e DOCKERFILE_TYPE="$EXTENSION" "sieve-$EXTENSION" "${@:3}"
                if [ $? -ne 0 ]; then
                    echo "Error: Docker run failed for $EXTENSION."
                    exit 1
                fi
            done
            exit 0
        fi

        DOCKERFILE="dev/docker/Dockerfile_$DOCKER_TYPE"
        if [ $verbose_level -gt 1 ]; then
            echo "Building and running Docker container for type: $DOCKER_TYPE"
            echo "Running command: docker build --pull --rm -f $DOCKERFILE -t sieve-$DOCKER_TYPE ." 
        fi
        
        if [ -f "$DOCKERFILE" ]; then
            # Build the Docker image
            docker build --pull --rm -f "$DOCKERFILE" -t "sieve-$DOCKER_TYPE" . 2> ./dev/build.log
            if [ $? -ne 0 ]; then
                echo "Error: Docker build failed."
                exit 1
            fi
            
            # Shift past the first two arguments (docker and type)
            shift 2
            
            # Run the Docker container with any remaining arguments
            if [ $verbose_level -gt 1 ]; then
                echo "Running Docker container with arguments: $@"
                echo "Run with: docker run --rm -e DOCKERFILE_TYPE=\"$DOCKER_TYPE\" \"sieve-$DOCKER_TYPE\" \"$@\""
                echo "Go in with: docker run --rm -e DOCKERFILE_TYPE=$DOCKER_TYPE -it --entrypoint /bin/bash sieve-$DOCKER_TYPE"  
            fi
            docker run --rm -e DOCKERFILE_TYPE="$DOCKER_TYPE" "sieve-$DOCKER_TYPE" "$@"
            exit $?
        else
            echo "Error: Dockerfile '$DOCKERFILE' not found."
            exit 1
        fi
    else
        echo "Error: Docker type not specified. Usage: $0 docker <type>"
        exit 1
    fi
fi

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

if [ $verbose_level -gt 1 ]; then
    echo "Compiling for ${OS} "
fi

# Compose a program name using a default base name.
PROGTOTAL="${base}-${set_x}-${set_y}-${set_z}"
if [ $verbose_level -gt 1 ]; then
  echo "Issuing command: $CC -o ./bin/$PROGTOTAL ./src/${base}.c $DEFINE_FLAGS"
fi
$CC -o ./bin/$PROGTOTAL ./src/${base}.c $DEFINE_FLAGS
if [ $? -ne 0 ]; then
    echo "Error: Compilation failed for sequential version."
    exit 1
fi
$STRIP ./bin/$PROGTOTAL

PROGTOTALPAR="${base}$PAREXT-${set_x}-${set_y}-${set_z}"
if [ $verbose_level -gt 1 ]; then
  echo "Issuing command: $CC  $PAR -o ./bin/$PROGTOTALPAR ./src/${base}.c $DEFINE_FLAGS"
fi
$CC $PAR -o ./bin/$PROGTOTALPAR ./src/${base}.c $DEFINE_FLAGS
if [ $? -ne 0 ]; then
    echo "Error: Compilation failed for parallel version."
    exit 1
fi
$STRIP ./bin/$PROGTOTALPAR

# gcc-14 -Ofast -S -fno-asynchronous-unwind-tables -fno-exceptions -fverbose-asm -Wall -Wextra -Ofast -masm=intel -S -mavx -fopt-info-vec-all=vec_report.txt -o ./dev/$PROGTOTAL.s ./src/${base}.c $DEFINE_FLAGS

# while true; do
if [ $threads -gt 0 ]; then
    if [ $verbose_level -gt 1 ]; then
        echo "Running parallel version: ./bin/$PROGTOTALPAR $run_args $@"
    fi
    ./bin/$PROGTOTALPAR $run_args $@
else
    if [ $verbose_level -gt 1 ]; then
        echo "Running ./bin/$PROGTOTAL $run_args $@"
    fi
    ./bin/$PROGTOTAL $run_args $@
fi
# done

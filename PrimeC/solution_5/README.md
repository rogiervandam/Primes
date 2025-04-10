# Implementation in C

![Algorithm](https://img.shields.io/badge/Algorithm-other-yellowgreen)
![Algorithm](https://img.shields.io/badge/Algorithm-base-yellowgreen)
![Faithfulness](https://img.shields.io/badge/Faithful-yes-green)
![Parallelism](https://img.shields.io/badge/Parallel-no-green)
![Parallelism](https://img.shields.io/badge/Parallel-yes-green)
![Bit count](https://img.shields.io/badge/Bits-1-green)

This is an implementation in C.
The algorithm is developed in NodeJS and C in parallel. 

## The extend algorithm
The extend algorithm marks all the multiples of a prime factor in the range of the product of the prime and all previous primes x2. E.g.: all multiples of 2,3 and 5 are marked until 2x (1x2x3x5) = 30. The range from 15-30 is a reoccuring pattern. So when we find 7, we can extend the pattern 15-30 until 7x15 = 105. Then we can mark all multiples of 7, and so on. So by gradually extending the seive by repeating the current pattern, we can have significant efficiency gains. 

For larger primes, the range will be so large that it can't be effiently handled by the L1/L2 cache. Therefore, the sieve is divided in blocks, so that the multiples are handler per group. The blocks can be entirely independent (start at prime x and then use the extend algortim again), but a hybrid approach is faster: keep extending till the range for the first product of primes extends the sieve. Then, stripe of per block. 

A number of techniques have been used to enable bit-level patterns to be extended fast. 
Also, all possible optimizations have been used to speed up the code in C.

Inspired by: 
- nodeJS/solution_1 - rogiervandam-memcopy. This is the implementation in C, to see how much speed can be gained by moving from nodeJS to C. 
- PrimeC/solution_3 - fvbakel C-words. The segmented algorithm has similar concepts. But the extended algorithm implementations takes it further, by speed gains with a sub-byte (bit) level algorithms (pair, pattern, small vs largestep optimizations).
- PrimeRust/solution_1 - Michael Barber. Inspired the manual loop unroll optimization

## Reference algorithms classic and base
For comparison, of the framework, a classic and base implementation are added:
- The classic function follows @davepl imeplementation, using the defines also present in the extend version. There is a 8bit version and 64 bit version. The 8 bit version is 4 times faster than the 64 bit version, which i didn't expect using modern processors. 
- The base version only uses functions that set multiples of primes individually and the block-approach described by Michael Barber in PrimeRust/solution_1.

## Lessons learned
- 8 bit handling with shift and mask is faster than 32 or 64 bit
- using 32bit integers for counters is faster than 64bit uint or int; especially on apple m1

- Use #pragma GCC ivdep to signal the compiler that it should not care about rereading memory in a loop.
- Use manual unroll for small sizes
- a large performance gain resulted from a manual unroll AND a unroll hint in applymask

- use cache lines as much as possible - alignment might be key
- Using vector can greatly speed thing up, because of the sse/avx extensions
- pairing vector manipulations together with the next one gains some performance

- Small changes in code can have huge impact due to -Ofast of -O3 optimizations
- using flto is also beneficial
- __attribute__((always_inline)) can force inlining a function. Using inline is not enough

- doing while (index<range_stop) and then if (index==range_stop) is faster than while (index<=range_stop)
- switched to one malloc for the sieve, instead of one for the sieve and one for the storage
- bitstorage will be aligned on the cache_line_bytes

- alpine docker images are slow because of the standard malloc. Integrating jemalloc or mimalloc helps
- clang is better for apple m1 compilations, gcc is better for intel

Sources:
- https://www.agner.org/optimize/ - excellent manuals on optimization
- https://stackoverflow.com/questions/21681300/diferences-between-pragmas-simd-and-ivdep-vector-always
- https://stackoverflow.com/questions/25248766/emulating-shifts-on-32-bytes-with-avx
- https://stackoverflow.com/questions/3005564/gcc-recommendations-and-options-for-fastest-code
- https://github.com/simd-everywhere/simde
- https://www.cprogramming.com/tips/tip/common-optimization-tips
- https://gcc.gnu.org/onlinedocs/gcc/Vector-Extensions.html
- https://gcc.gnu.org/onlinedocs/gcc/Common-Function-Attributes.html

## Source code organization
During development, a framework emerged for benchmarking sieve functions. This framework spans the folders:
```bash
src             Contains the basic high-levle algorithms fils. Each should include all the neccessary files 
                and contain a function with the name "shakeSieve(counter_t sieve_size)" 
src/benchmark   Contains all functions to benchmark an algorithm
src/bitstorage  Contains all functions that operate on a bitmap level and have no knowledge of "primes"
src/generic     Contains all types, helpers for making different functions versions, etc
src/sieve       Contains all functions around the creating, calculating, striping and extending the sieve

```

On initialization, a small benchmark searches for the right settings for the hardware and OS environment. 
This defaults to a really small and short tuning. Using the command line, this can be intensified.


## Build and run instructions

### Building & running with the sieve command gadget
The sieve command (./sieve) contains the bash script for build & run iterations. It read the arguments on the commandline and sets the needed defines accordingly to build the right version of the sieve app in the build folder. It runs it automatically after building. So the script can be used as if it is the final program. There are some extra command line options for the build process:

Special build commands of the ./sieve command script:

```bash
./sieve compileall                                - Compile all possible versions and put them in ./build/ folder.
./sieve runall                                    - Run all possible versions. If it runs in the Primeview docker 
                                                    container, verbosity is lowered.
./sieve docker <dockerfile extension> <arguments> - Run sieve in a docker container with the given arguments. 
                                                    Looks in ./dev/docker/ for a Dockerfile_<extension>. 
                                                    E.g. ubuntu_gcc.
./sieve docker all <arguments>                    - Run sieve in all the possible docker files
./sieve docker <dockerfile extension> set         - Sets the dockerfile as the default Dockerfile in ./
./sieve <arguments> gcc <arguments>               - Use gcc as compiler. Can be anywhere on the argument list.
./sieve <arguments> clang <arguments>             - Use clang as compiler. Can be anywhere on the argument list.
./sieve <arguments> icx <arguments>               - Use icx as compiler. Can be anywhere on the argument list.
./sieve sieve_base                                - Compile the base algorithm variant
./sieve sieve_classic                             - Compile the classic algorithm variant
./sieve sieve_extend                              - Compile the extend algorithm variant (default)

"make" is an alternative for building. 
```

### Command line options
```bash
Usage: ./sieve [options] [maximum]
[options] is optional one or more of the following:
  --check                   Check the correctness of the algorithm
                            0 - no check
                            1 - check prime count for the sieve size
                            2 - check prime count for every sieve size
                            3 - check prime count for every sieve size and blocksize
                            4 - check stripe algorithms for the sieve size
                            5 - check stripe algorithms for every sieve size
                            6 - check stripe algorithms for the sieve size and every blocksize
                            7 - check all and halt
  --nocheck                 Skip check of the correctness of the algorithm
  --explain                 Explain the steps of the algorithm - only when compiled for explain
  --help                    This help function
  --max <maximum>           Set the maximum prime to examine
  --set <string>            The string is can be one or multiple of the following, connected by hyphens, 
                            e.g. s063-l128-b0262144-v256-a1
        s<factor>           Set the cutoff prime for blockwise striping
        l<bits>             Set the cutoff number of bits for vectorwise striping
        b<bits>             Set the block size to a specific <size> in bits
        v<size>             Set the vector size to a specific <size> in bits
        a<algorithm>        Set the algorithm to a specific <algorithm>
  --show  <maximum>         Show the primes found up to the maximum
  --threads <maximum>       Set the maximum number of threads to be used (only when compiled for openmp)
                             Use 'all' to use all available threads or 'half' for /2 (e.g. for no hyperthreading)
  --time  <seconds>         The maximum time (in seconds) to run passes of the sieve algorithm
  --timers                  Give the timings for submodules - only when compiled for timers; much slower
  --tune  <level>           find the best settings for the current os and hardware
                            0 - no tuning
                            1 - fast tuning
                            2 - refined tuning
                            3 - benchmark invidual stripe functions
                            4 - benchmark iterative stripe functions
  --verbose <level>         Show more output to a certain level:
                            0 - only show result string
                            1 - show result string with additional setings information
                            2 - show general phase progress
                            3 - show general progress within the phase
                            4 - show actual work
                            5 - show high-level plan
                            6 - show detailed plan
                            7 - show more details
                            8 - show debug details
                            9 - show timing
[maximum] is the heighest prime to examine. Defaults to 1000000

More options are available in the ./src/benchmark/sieve_options.h file.
```

### Run with Docker

To run with Docker take the following steps: 

1. Install Docker: <https://docs.docker.com/get-docker/>
2. Build the image:

    ```bash
    docker build --pull --rm -f "Dockerfile" -t c:latest "."
    ```

3. Run with Docker:

    ```bash
    docker run --rm -it c:latest 
    ```

Or do it all in one go:

```bash
docker build --pull --rm -f "Dockerfile" -t c:latest .
docker run --rm --cpuset-cpus="0" --cpu-shares=1024 c:latest 
```

Remember you can go in to the container like this:

```bash
docker run -it --entrypoint /bin/bash c:latest
```

Command to create a dockerfile
```bash
sed -i 's/\r$//' sieve;./sieve docker alpine_gcc_mimalloc set
```

Command to run the formal benchmark for the primeview results:
```bash
cd ../..; make DIRECTORY=PrimeC/solution_5; cd PrimeC/solution_5
```

If something is wrong with running the "./sieve" file, it is probably due to CRLF/LF problems.
This might help:

```bash
sed -i 's/\r$//' sieve
```

## Output
The output at verbosity 1 and up has some extra settings information.
Before doing the benchmark, the program tunes some settings. Theses settings are in the output.
```bash
Example:
s063-l128-b0262144-v256-a1
s063-----------------------> Use striping the whole sieve up to this factor
     l128------------------> Use large vectorsteps until we reach this factor
          b0262144---------> Use this blocksize above the "s" factor
                   v256----> Whem using vectors, use one of these sizes: 128, 256 or 512
                        a1-> Algorithm 1 (extend and stripe the whole sieve and then blockwise)
                             or algorithm 2 (all blockwise; see src/sieve/sieve_extend.h for details)
```

Below is an example of the output on my machine, running with Docker.
```bash
rogiervandam_extend;83501;5.000029;1;algorithm=other,faithful=yes,bits=1;s063-l128-b0262144-v256-a1 total 83501
rogiervandam_base;20651;5.000002;1;algorithm=base,faithful=yes,bits=1;s122-l236-b0262144-v256-a1 total 20651
rogiervandam_classic;8571;5.000516;1;algorithm=base,faithful=yes,bits=1;s064-l128-b0262144-v256-a1 total 8571
rogiervandam_extend_epar;449870;5.000058;12;algorithm=other,faithful=yes,bits=1;s067-l134-b0131072-v256-a1 total 449870
rogiervandam_extend_epar;311811;5.000044;6;algorithm=other,faithful=yes,bits=1;s079-l128-b0262144-v256-a2 total 311811
rogiervandam_extend_epar;255389;5.000096;4;algorithm=other,faithful=yes,bits=1;s368-l124-b0262144-v256-a2 total 255389
rogiervandam_extend_epar;154190;5.000031;2;algorithm=other,faithful=yes,bits=1;s060-l130-b0262144-v256-a1 total 154190
```

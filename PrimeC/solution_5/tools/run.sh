#!/bin/sh
for program in sieve_base sieve_extend; do
    for arg in u32-v4u64-ci32 u32-v4u32-ci32 u32-v8u64-ci32 u32-v8u32-ci32; do
        ./bin/$program-$arg "$@"
    done
done
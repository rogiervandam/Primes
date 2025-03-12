#!/bin/sh
# for x in sieve_base sieve_extend sieve_base_epar sieve_extend_epar; do

for arg in u32-v4-ci64 u32-v4-ci32 u32-v8-ci64 u32-v8-ci32 u64-v4-ci64 u64-v4-ci32 u64-v8-ci64 u64-v8-ci32; do
    ./bin/sieve_base-$arg "$@"
    ./bin/sieve_extend-$arg "$@"
done
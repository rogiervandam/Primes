#!/bin/sh
//for x in sieve_base sieve_extend sieve_base_epar sieve_extend_epar; do
for x in sieve_extend sieve_base; do
    for y in u64_v4 u32_v8 u64_v8; do
        ./$x-$y $1 $2 $3 $4 $5 $6 $7 $8 $9
    done
done

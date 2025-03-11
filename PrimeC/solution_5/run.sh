#!/bin/sh
# for x in sieve_base sieve_extend sieve_base_epar sieve_extend_epar; do
for x in sieve_extend sieve_base; do
    for y in u64v4 u32v4 u32v8 u64v8; do
        bin/$x-$y $1 $2 $3 $4 $5 $6 $7 $8 $9
    done
done



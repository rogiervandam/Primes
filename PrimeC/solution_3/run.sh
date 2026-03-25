#!/bin/sh
for x in primes_striped-block primes_normal-block; do
    ./$x 10000000
done

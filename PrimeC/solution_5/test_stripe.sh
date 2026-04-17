#!/bin/bash
cd /mnt/d/Github/Primes/Primes/PrimeC/solution_5
for bytes in 1 2 3 4; do
    # Update WHEEL_STRIPE_BYTES
    sed -i "s/#define WHEEL_STRIPE_BYTES [0-9]*/#define WHEEL_STRIPE_BYTES $bytes/" src/sieve/sieve_storage_wheel.h
    # Compile
    ./sieve sieve_wheelstorage compile 2>&1 | tail -1
    # Run check+tune
    echo -n "WHEEL_STRIPE_BYTES=$bytes: "
    result=$(bin/sieve_wheelstorage --check 5 --tune 5 --verbose 3 2>&1)
    if echo "$result" | grep -q "NOT valid"; then
        echo "FAIL"
        echo "$result" | grep "NOT valid"
    else
        echo "OK"
    fi
done

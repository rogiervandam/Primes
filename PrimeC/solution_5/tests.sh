#!/bin/sh

# gcc -o tests/bin/test_sieve_create tests/src/test_sieve_create.c
# tests/bin/test_sieve_create

gcc -o tests/bin/test_sieve_continue_pattern tests/src/test_sieve_continue_pattern.c
tests/bin/test_sieve_continue_pattern

# valgrind --leak-check=full tests/bin/test_sieve_create
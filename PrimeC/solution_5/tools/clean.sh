find . -type f -name 'sieve_base*' ! -name 'sieve_base*.c' ! -name 'sieve_base*.h' -exec rm {} +
find . -type f -name 'sieve_extend*' ! -name 'sieve_extend*.c' ! -name 'sieve_extend*.h' -exec rm {} +
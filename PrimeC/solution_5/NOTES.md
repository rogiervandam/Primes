# TODO
- auto profile the best option
- detect if using blocksize for words different from vectors helps
- differentiate functions to type and then benchmark between them
- revisit continuepattern functions
- smallmasks in pairs

# Analysis
- When using -flto linker option, if the with counter_t is set to 32 bit, the sieve will not be valid.
- the options -fno-signed-zeros -frename-registers don't seem to help
- apple m1 really loves the int32t for counters


# lesoons
- use cache lines as much as possible - alignment might be key
- moved clearing the sieve with 0 to the sieve_block_extend - it gave weird malloc problems at this point
- switched to one malloc for the sieve, instead of one for the sieve and one for the storage
- bitstorage will be aligned on the cache_line_bytes


## Compiler flags



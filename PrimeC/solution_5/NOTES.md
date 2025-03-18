# TODO
- sieve not working for max > 1000000
- auto profile the best option
- detect if using blocksize for words different from vectors helps
- differentiate functions in type and then benchmark between them
- revisit continuepattern functions
- (done) smallmasks in pairs

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

Snelheid

Op i8700 voor het blok 250000 - 500000:
- setBitsTrue_largestep_repeat_uint8_unroll4 is het snelste, tot step 971, dan setBitsTrue_largestep_norepeat sneller
- largestep_vector is van step 67-107 interessanter
- smallstep_vector is tot step 67 veel interessanter
- smaalstep_repreat is tot step 31 sneller dan setBitsTrue_largestep_repeat


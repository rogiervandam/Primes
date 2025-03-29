# TODO
- sieve not working for max > 1000000
- auto profile the best option
- detect if using blocksize for words different from vectors helps
- differentiate functions in type and then benchmark between them
- revisit continuepattern functions
- (done) smallmasks in pairs
- look at continuepattern copy methods

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

On i8700 for block 250000 - 500000:
- setBitsTrue_largestep_repeat_uint8_unroll4 fastest, until step 971, then setBitsTrue_largestep_norepeat faster
- largestep_vector starting at step 67-107 interesting
- smallstep_vector starting at step 67 veemuch more interesting
- smaalstep_repreat starting at step 31 faster than setBitsTrue_largestep_repeat

On m1 mac for block 250000 - 500000:
- mixed view
- setBitsTrue_largestep_repeat_uint8_unroll8 fast in range step 277 - 937
- setBitsTrue_largestep_repeat_uint8_unroll4 mostly the fastest
- from step 967 setBitsTrue_largestep_norepeat fastest

-> uint8_unroll8 -> uint8_unroll4 when range/step/8 <= 43 -> /8 = 5
-> uint8_unroll4 -> nopeat when range/step/4 <= 64 -> /8 = 8

On m1 for blcok 0-500000:
-> uint8_unroll8 -> uint8_unroll4 when range/step/8 <= 80 -> 
-> uint8_unroll4 -> nopeat when range/step/4 <= 129

On m1 for block 0-250000:
-> uint8_unroll8 -> uint8_unroll4 when range/step/8 <= not really better
-> uint8_unroll4 -> nopeat when range/step/4 <= 92  (step 673)

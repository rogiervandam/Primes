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


Running sieve variant rogiervandam_extend u32-v4u64-ci32 with max 1000000
Validating variant u32v4... valid algorithm
Tuning done. Evaluated 374 options in 6 steps. Best result: average  18490.852366 with options s062-m008-l098-b0262144-u32-v4u64-ci32 was achieved with 459 passes in 0.024823 seconds
Verified that algortihm with settings s062-m008-l098-b0262144-u32-v4u64-ci32 and max 1000000 is valid.
Warming up the cache and processing units
Benchmarking with settings: s062-m008-l098-b0262144-u32-v4u64-ci32 (stripeprime, largestep, blocksize, wordsize, vectorsize) and 1 threads for 5.0 seconds
Results: (wait 5.0 seconds)...
Result: Passes 91928 (per 5.0 seconds) - average 18385.6 per second using 1 threads
Output message:
rogiervandam_extend-u32-v4u64-ci32;91928;5.000008;1;algorithm=other,faithful=yes,bits=1;s062-m008-l098-b0262144-u32-v4u64-ci32 total 91928

# TODO
- auto profile the best option

# Analysis
- When using -flto linker option, if the with counter_t is set to 32 bit, the sieve will not be valid.
- the options -fno-signed-zeros -frename-registers don't seem to help
- apple m1 really loves the int32t for counters

## Compiler flags





Old
----
Shaking sieve to find all primes up to 1000 by marking multiples of all primes up to 31
Using compressed primes up to 16 with sieve size 500 and blocksize 500
Extending sieve block to range 500
Setting bits step   3 using smallstep-norepeat in 2 bit range (4-6)  (0 unique occurances)
Setting bits step   5 using smallstep-norepeat in 18 bit range (12-30)  (3 unique occurances)
Setting bits step   7 using smallstep-norepeat in 186 bit range (24-210)  (26 unique occurances)

Block stripe for block 0 - 500
Setting bits step  11 using largestep-norepeat in 440 bit range (60-500)  (40 unique occurances)..
Setting bits step  13 using largestep-norepeat in 416 bit range (84-500)  (32 unique occurances)..
Setting bits step  17 using largestep-norepeat in 356 bit range (144-500)  (20 unique occurances)..
Setting bits step  19 using largestep-norepeat in 320 bit range (180-500)  (16 unique occurances)..
Setting bits step  23 using largestep-norepeat in 236 bit range (264-500)  (10 unique occurances)..
Setting bits step  29 using largestep-norepeat in 80 bit range (420-500)  (2 unique occurances)..

Block stripe for block 0 - 500
Setting bits step  31 using largestep-norepeat in 20 bit range (480-500)  (0 unique occurances)..
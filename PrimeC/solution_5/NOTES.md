# TODO
- auto profile the best option

# Analysis
- When using -flto linker option, if the with counter_t is set to 32 bit, the sieve will not be valid.
- the options -fno-signed-zeros -frename-registers don't seem to help
- apple m1 really loves the int32t for counters

## Compiler flags



New
----
Shaking sieve to find all primes up to 10000 by marking multiples of all primes up to 101
Using compressed primes up to 51 with sieve size 5000 and blocksize 5000
Extending sieve block to range 5000
Setting bits step   3 using smallstep-norepeat in 2 bit range (4-6)  (0 unique occurances)
Setting bits step   5 using setBitsTrue in 18 bit range (12-30)  (3 occurances; 0 stamps) 
Setting bits step   5 using smallstep-norepeat in 18 bit range (12-30)  (3 unique occurances)
Setting bits step   7 using setBitsTrue in 186 bit range (24-210)  (26 occurances; 0 stamps) 
Setting bits step   7 using smallstep-norepeat in 186 bit range (24-210)  (26 unique occurances)
Setting bits step  11 using setBitsTrue in 2250 bit range (60-2310)  (204 occurances; 1 stamps) 
Setting bits step  11 using smallstep-repeat in 2250 bit range (60-2310) (6 repeating occurances)

Block stripe for block 0 - 5000

Block stripe for block 0 - 5000
Setting bits step  13 using setBitsTrue in 4916 bit range (84-5000)  (378 occurances; 2 stamps) 
Setting bits step  13 using smallstep-repeat in 4916 bit range (84-5000) (11 repeating occurances)
Setting bits step  17 using setBitsTrue in 4856 bit range (144-5000)  (285 occurances; 2 stamps) 
Setting bits step  17 using smallstep-repeat in 4856 bit range (144-5000) (8 repeating occurances)
Setting bits step  19 using setBitsTrue in 4820 bit range (180-5000)  (253 occurances; 1 stamps) 
Setting bits step  19 using smallstep-repeat in 4820 bit range (180-5000) (7 repeating occurances)
Setting bits step  23 using setBitsTrue in 4736 bit range (264-5000)  (205 occurances; 1 stamps) 
Setting bits step  23 using smallstep-repeat in 4736 bit range (264-5000) (6 repeating occurances)
Setting bits step  29 using setBitsTrue in 4580 bit range (420-5000)  (157 occurances; 1 stamps) 
Setting bits step  29 using smallstep-repeat in 4580 bit range (420-5000) (4 repeating occurances)
Setting bits step  31 using setBitsTrue in 4520 bit range (480-5000)  (145 occurances; 1 stamps) 
Setting bits step  31 using smallstep-repeat in 4520 bit range (480-5000) (4 repeating occurances)
Setting bits step  37 using setBitsTrue in 4316 bit range (684-5000)  (116 occurances; 0 stamps) 
Setting bits step  37 using largestep-repeat in 4316 bit range (684-5000)  (3 repeating occurances)
Setting bits step  41 using setBitsTrue in 4160 bit range (840-5000)  (101 occurances; 0 stamps) 
Setting bits step  41 using largestep-repeat in 4160 bit range (840-5000)  (3 repeating occurances)
Setting bits step  43 using setBitsTrue in 4076 bit range (924-5000)  (94 occurances; 0 stamps) 
Setting bits step  43 using largestep-repeat in 4076 bit range (924-5000)  (2 repeating occurances)
Setting bits step  47 using setBitsTrue in 3896 bit range (1104-5000)  (82 occurances; 0 stamps) 
Setting bits step  47 using largestep-repeat in 3896 bit range (1104-5000)  (2 repeating occurances)
Setting bits step  53 using setBitsTrue in 3596 bit range (1404-5000)  (67 occurances; 0 stamps) 
Setting bits step  53 using largestep-repeat in 3596 bit range (1404-5000)  (2 repeating occurances)
Setting bits step  59 using setBitsTrue in 3260 bit range (1740-5000)  (55 occurances; 0 stamps) 
Setting bits step  59 using largestep-repeat in 3260 bit range (1740-5000)  (1 repeating occurances)
Setting bits step  61 using setBitsTrue in 3140 bit range (1860-5000)  (51 occurances; 0 stamps) 
Setting bits step  61 using largestep-repeat in 3140 bit range (1860-5000)  (1 repeating occurances)
Setting bits step  67 using setBitsTrue in 2756 bit range (2244-5000)  (41 occurances; 0 stamps) 
Setting bits step  67 using largestep-repeat in 2756 bit range (2244-5000)  (1 repeating occurances)
Setting bits step  71 using setBitsTrue in 2480 bit range (2520-5000)  (34 occurances; 0 stamps) 
Setting bits step  71 using largestep-repeat in 2480 bit range (2520-5000)  (1 repeating occurances)
Setting bits step  73 using setBitsTrue in 2336 bit range (2664-5000)  (32 occurances; 0 stamps) 
Setting bits step  73 using largestep-repeat in 2336 bit range (2664-5000)  (1 repeating occurances)
Setting bits step  79 using setBitsTrue in 1880 bit range (3120-5000)  (23 occurances; 0 stamps) 
Setting bits step  79 using largestep-norepeat in 1880 bit range (3120-5000)  (23 unique occurances)..
Setting bits step  83 using setBitsTrue in 1556 bit range (3444-5000)  (18 occurances; 0 stamps) 
Setting bits step  83 using largestep-norepeat in 1556 bit range (3444-5000)  (18 unique occurances)..
Setting bits step  89 using setBitsTrue in 1040 bit range (3960-5000)  (11 occurances; 0 stamps) 
Setting bits step  89 using largestep-norepeat in 1040 bit range (3960-5000)  (11 unique occurances)..
Setting bits step  97 using setBitsTrue in 296 bit range (4704-5000)  (3 occurances; 0 stamps) 
Setting bits step  97 using largestep-norepeat in 296 bit range (4704-5000)  (3 unique occurances)..

Result set:
The sieve is valid
Hits: 0

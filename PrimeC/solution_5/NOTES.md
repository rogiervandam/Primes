# TODO
- auto profile the best option

# Analysis
- When using -flto linker option, if the with counter_t is set to 32 bit, the sieve will not be valid.
- the options -fno-signed-zeros -frename-registers don't seem to help
- apple m1 really loves the int32t for counters

## Compiler flags


Plan windows s112-m062-l166-b0260096-u64-v256 old

Extend
3-13

Block stripe for block 0 - 500000
Setting bits step  17 using largerange vector_word in 499856 bit range (144-500000) (29403 occurances; 114 stamps) 
Setting bits step  61 using largerange vector_word in 498140 bit range (1860-500000) (8166 occurances; 31 stamps) 
Setting bits step  67 using largerange vector_vectorstep in 497756 bit range (2244-500000) (7429 occurances; 29 stamps) 
Setting bits step 163 using largerange vector_vectorstep in 486716 bit range (13284-500000) (2985 occurances; 11 stamps) 
Setting bits step 167 using largestep-repeat in 486056 bit range (13944-500000)  (45 repeating occurances)
Setting bits step 223 using largestep-repeat in 475136 bit range (24864-500000)  (33 repeating occurances)

Block stripe for block 0 - 260096
Setting bits step 227 using largestep-repeat in 234332 bit range (25764-260096)  (16 repeating occurances)
Setting bits step 659 using largestep-repeat in 42956 bit range (217140-260096)  (1 repeating occurances)
Setting bits step 661 using largestep-norepeat in 41636 bit range (218460-260096)  (62 unique occurances)..
Setting bits step 719 using largestep-norepeat in 1616 bit range (258480-260096)  (2 unique occurances)..

Block stripe for block 260096 - 500000
Setting bits step 227 using largestep-repeat in 239745 bit range (260255-500000)  (16 repeating occurances)
Setting bits step 937 using largestep-repeat in 61016 bit range (438984-500000)  (1 repeating occurances)
Setting bits step 941 using largestep-norepeat in 57260 bit range (442740-500000)  (60 unique occurances)..
Setting bits step 997 using largestep-norepeat in 2996 bit range (497004-500000)  (3 unique occurances)..



New

Block stripe (new) for block 0 - 500000
Plan start with prime 17 up to 225 using range 0 - 500000:
(1) Prime  17 -  61 : Use vectors with wordroll  for primes up to 30
(2) Prime  61 -  63 : Use repeating word masks   for primes up to 82
(3) Prime  63 - 165 : Use vectors sparse steps   for primes up to 112
(4) Prime 165 - 225 : Use repeating word masks   for primes up to 112
(5) Prime 225 - 225 : Use setting bit one by one for primes up to 112

Block stripe (new) for block 0 - 260096
Plan start with prime 227 up to 1003 using range 0 - 260096:
(1) Prime 227 -  61 : Use vectors with wordroll  for primes up to 30
(2) Prime  61 -  63 : Use repeating word masks   for primes up to 82
(3) Prime  63 - 165 : Use vectors sparse steps   for primes up to 330
(4) Prime 165 - 661 : Use repeating word masks   for primes up to 360
(5) Prime 661 - 721 : Use setting bit one by one for primes up to 360

Block stripe (new) for block 260096 - 500000
Plan start with prime 227 up to 1003 using range 260096 - 500000:
(1) Prime 227 -  61 : Use vectors with wordroll  for primes up to 30
(2) Prime  61 -  63 : Use repeating word masks   for primes up to 82
(3) Prime  63 - 165 : Use vectors sparse steps   for primes up to 469
(4) Prime 165 - 939 : Use repeating word masks   for primes up to 499
(5) Prime 939 - 999 : Use setting bit one by one for primes up to 499

Aandachtspunten: 
61 met smallstep repeat ipv vector_word









Shaking sieve to find all primes up to 1000000 by marking multiples of all primes up to 1000
Using compressed primes up to 501 with sieve size 500000 and blocksize 260096
Extending sieve block to range 500000
Setting bits step   3 using smallstep-norepeat in 2 bit range (4-6)  (0 unique occurances)
Setting bits step   5 using smallstep-norepeat in 18 bit range (12-30)  (3 unique occurances)
Setting bits step   7 using smallstep-norepeat in 186 bit range (24-210)  (26 unique occurances)
Setting bits step  11 using smallstep-repeat in 2250 bit range (60-2310) (3 repeating occurances)
Setting bits step  13 using smallstep-repeat in 29946 bit range (84-30030) (35 repeating occurances)

Block stripe (new) for block 0 - 500000
Plan start with prime 17 up to 225 using range 0 - 500000:
(1) Prime  17 -  63 : Use vectors with wordroll  for primes up to 31
(2) Prime  63 -  63 : Use repeating word masks   for primes up to 82
(3) Prime  63 - 165 : Use vectors sparse steps   for primes up to 112
(4) Prime 165 - 225 : Use repeating word masks   for primes up to 112
(5) Prime 225 - 225 : Use setting bit one by one for primes up to 112
Setting bits step  17 using largerange vector_word in 499856 bit range (144-500000) (29403 occurances; 114 stamps) 
Setting bits step  19 using largerange vector_word in 499820 bit range (180-500000) (26306 occurances; 102 stamps) 
Setting bits step  23 using largerange vector_word in 499736 bit range (264-500000) (21727 occurances; 84 stamps) 
Setting bits step  29 using largerange vector_word in 499580 bit range (420-500000) (17226 occurances; 67 stamps) 
Setting bits step  31 using largerange vector_word in 499520 bit range (480-500000) (16113 occurances; 62 stamps) 
Setting bits step  37 using largerange vector_word in 499316 bit range (684-500000) (13495 occurances; 52 stamps) 
Setting bits step  41 using largerange vector_word in 499160 bit range (840-500000) (12174 occurances; 47 stamps) 
Setting bits step  43 using largerange vector_word in 499076 bit range (924-500000) (11606 occurances; 45 stamps) 
Setting bits step  47 using largerange vector_word in 498896 bit range (1104-500000) (10614 occurances; 41 stamps) 
Setting bits step  53 using largerange vector_word in 498596 bit range (1404-500000) (9407 occurances; 36 stamps) 
Setting bits step  59 using largerange vector_word in 498260 bit range (1740-500000) (8445 occurances; 32 stamps) 
Setting bits step  61 using largerange vector_word in 498140 bit range (1860-500000) (8166 occurances; 31 stamps) 
Setting bits step  67 using largerange vector_vectorstep in 497756 bit range (2244-500000) (7429 occurances; 29 stamps) 
Setting bits step  71 using largerange vector_vectorstep in 497480 bit range (2520-500000) (7006 occurances; 27 stamps) 
Setting bits step  73 using largerange vector_vectorstep in 497336 bit range (2664-500000) (6812 occurances; 26 stamps) 
Setting bits step  79 using largerange vector_vectorstep in 496880 bit range (3120-500000) (6289 occurances; 24 stamps) 
Setting bits step  83 using largerange vector_vectorstep in 496556 bit range (3444-500000) (5982 occurances; 23 stamps) 
Setting bits step  89 using largerange vector_vectorstep in 496040 bit range (3960-500000) (5573 occurances; 21 stamps) 
Setting bits step  97 using largerange vector_vectorstep in 495296 bit range (4704-500000) (5106 occurances; 19 stamps) 
Setting bits step 101 using largerange vector_vectorstep in 494900 bit range (5100-500000) (4900 occurances; 19 stamps) 
Setting bits step 103 using largerange vector_vectorstep in 494696 bit range (5304-500000) (4802 occurances; 18 stamps) 
Setting bits step 107 using largerange vector_vectorstep in 494276 bit range (5724-500000) (4619 occurances; 18 stamps) 
Setting bits step 109 using largerange vector_vectorstep in 494060 bit range (5940-500000) (4532 occurances; 17 stamps) 
Setting bits step 113 using largerange vector_vectorstep in 493616 bit range (6384-500000) (4368 occurances; 17 stamps) 
Setting bits step 127 using largerange vector_vectorstep in 491936 bit range (8064-500000) (3873 occurances; 15 stamps) 
Setting bits step 131 using largerange vector_vectorstep in 491420 bit range (8580-500000) (3751 occurances; 14 stamps) 
Setting bits step 137 using largerange vector_vectorstep in 490616 bit range (9384-500000) (3581 occurances; 13 stamps) 
Setting bits step 139 using largerange vector_vectorstep in 490340 bit range (9660-500000) (3527 occurances; 13 stamps) 
Setting bits step 149 using largerange vector_vectorstep in 488900 bit range (11100-500000) (3281 occurances; 12 stamps) 
Setting bits step 151 using largerange vector_vectorstep in 488600 bit range (11400-500000) (3235 occurances; 12 stamps) 
Setting bits step 157 using largerange vector_vectorstep in 487676 bit range (12324-500000) (3106 occurances; 12 stamps) 
Setting bits step 163 using largerange vector_vectorstep in 486716 bit range (13284-500000) (2985 occurances; 11 stamps) 
Setting bits step 167 using largestep-repeat in 486056 bit range (13944-500000)  (45 repeating occurances)
Setting bits step 173 using largestep-repeat in 485036 bit range (14964-500000)  (43 repeating occurances)
Setting bits step 179 using largestep-repeat in 483980 bit range (16020-500000)  (42 repeating occurances)
Setting bits step 181 using largestep-repeat in 483620 bit range (16380-500000)  (41 repeating occurances)
Setting bits step 191 using largestep-repeat in 481760 bit range (18240-500000)  (39 repeating occurances)
Setting bits step 193 using largestep-repeat in 481376 bit range (18624-500000)  (38 repeating occurances)
Setting bits step 197 using largestep-repeat in 480596 bit range (19404-500000)  (38 repeating occurances)
Setting bits step 199 using largestep-repeat in 480200 bit range (19800-500000)  (37 repeating occurances)
Setting bits step 211 using largestep-repeat in 477740 bit range (22260-500000)  (35 repeating occurances)
Setting bits step 223 using largestep-repeat in 475136 bit range (24864-500000)  (33 repeating occurances)

Block stripe (new) for block 0 - 260096
Plan start with prime 227 up to 1003 using range 0 - 260096:
(1) Prime 227 -  63 : Use vectors with wordroll  for primes up to 31
(2) Prime  63 -  63 : Use repeating word masks   for primes up to 82
(3) Prime  63 - 165 : Use vectors sparse steps   for primes up to 330
(4) Prime 165 - 661 : Use repeating word masks   for primes up to 360
(5) Prime 661 - 721 : Use setting bit one by one for primes up to 360
Setting bits step 227 using largestep-repeat in 234332 bit range (25764-260096)  (16 repeating occurances)
Setting bits step 229 using largestep-repeat in 233876 bit range (26220-260096)  (15 repeating occurances)
Setting bits step 233 using largestep-repeat in 232952 bit range (27144-260096)  (15 repeating occurances)
Setting bits step 239 using largestep-repeat in 231536 bit range (28560-260096)  (15 repeating occurances)
Setting bits step 241 using largestep-repeat in 231056 bit range (29040-260096)  (14 repeating occurances)
Setting bits step 251 using largestep-repeat in 228596 bit range (31500-260096)  (14 repeating occurances)
Setting bits step 257 using largestep-repeat in 227072 bit range (33024-260096)  (13 repeating occurances)
Setting bits step 263 using largestep-repeat in 225512 bit range (34584-260096)  (13 repeating occurances)
Setting bits step 269 using largestep-repeat in 223916 bit range (36180-260096)  (13 repeating occurances)
Setting bits step 271 using largestep-repeat in 223376 bit range (36720-260096)  (12 repeating occurances)
Setting bits step 277 using largestep-repeat in 221732 bit range (38364-260096)  (12 repeating occurances)
Setting bits step 281 using largestep-repeat in 220616 bit range (39480-260096)  (12 repeating occurances)
Setting bits step 283 using largestep-repeat in 220052 bit range (40044-260096)  (12 repeating occurances)
Setting bits step 293 using largestep-repeat in 217172 bit range (42924-260096)  (11 repeating occurances)
Setting bits step 307 using largestep-repeat in 212972 bit range (47124-260096)  (10 repeating occurances)
Setting bits step 311 using largestep-repeat in 211736 bit range (48360-260096)  (10 repeating occurances)
Setting bits step 313 using largestep-repeat in 211112 bit range (48984-260096)  (10 repeating occurances)
Setting bits step 317 using largestep-repeat in 209852 bit range (50244-260096)  (10 repeating occurances)
Setting bits step 331 using largestep-repeat in 205316 bit range (54780-260096)  (9 repeating occurances)
Setting bits step 337 using largestep-repeat in 203312 bit range (56784-260096)  (9 repeating occurances)
Setting bits step 347 using largestep-repeat in 199892 bit range (60204-260096)  (9 repeating occurances)
Setting bits step 349 using largestep-repeat in 199196 bit range (60900-260096)  (8 repeating occurances)
Setting bits step 353 using largestep-repeat in 197792 bit range (62304-260096)  (8 repeating occurances)
Setting bits step 359 using largestep-repeat in 195656 bit range (64440-260096)  (8 repeating occurances)
Setting bits step 367 using largestep-repeat in 192752 bit range (67344-260096)  (8 repeating occurances)
Setting bits step 373 using largestep-repeat in 190532 bit range (69564-260096)  (7 repeating occurances)
Setting bits step 379 using largestep-repeat in 188276 bit range (71820-260096)  (7 repeating occurances)
Setting bits step 383 using largestep-repeat in 186752 bit range (73344-260096)  (7 repeating occurances)
Setting bits step 389 using largestep-repeat in 184436 bit range (75660-260096)  (7 repeating occurances)
Setting bits step 397 using largestep-repeat in 181292 bit range (78804-260096)  (7 repeating occurances)
Setting bits step 401 using largestep-repeat in 179696 bit range (80400-260096)  (7 repeating occurances)
Setting bits step 409 using largestep-repeat in 176456 bit range (83640-260096)  (6 repeating occurances)
Setting bits step 419 using largestep-repeat in 172316 bit range (87780-260096)  (6 repeating occurances)
Setting bits step 421 using largestep-repeat in 171476 bit range (88620-260096)  (6 repeating occurances)
Setting bits step 431 using largestep-repeat in 167216 bit range (92880-260096)  (6 repeating occurances)
Setting bits step 433 using largestep-repeat in 166352 bit range (93744-260096)  (6 repeating occurances)
Setting bits step 439 using largestep-repeat in 163736 bit range (96360-260096)  (5 repeating occurances)
Setting bits step 443 using largestep-repeat in 161972 bit range (98124-260096)  (5 repeating occurances)
Setting bits step 449 using largestep-repeat in 159296 bit range (100800-260096)  (5 repeating occurances)
Setting bits step 457 using largestep-repeat in 155672 bit range (104424-260096)  (5 repeating occurances)
Setting bits step 461 using largestep-repeat in 153836 bit range (106260-260096)  (5 repeating occurances)
Setting bits step 463 using largestep-repeat in 152912 bit range (107184-260096)  (5 repeating occurances)
Setting bits step 467 using largestep-repeat in 151052 bit range (109044-260096)  (5 repeating occurances)
Setting bits step 479 using largestep-repeat in 145376 bit range (114720-260096)  (4 repeating occurances)
Setting bits step 487 using largestep-repeat in 141512 bit range (118584-260096)  (4 repeating occurances)
Setting bits step 491 using largestep-repeat in 139556 bit range (120540-260096)  (4 repeating occurances)
Setting bits step 499 using largestep-repeat in 135596 bit range (124500-260096)  (4 repeating occurances)
Setting bits step 503 using largestep-repeat in 133592 bit range (126504-260096)  (4 repeating occurances)
Setting bits step 509 using largestep-repeat in 130556 bit range (129540-260096)  (4 repeating occurances)
Setting bits step 521 using largestep-repeat in 124376 bit range (135720-260096)  (3 repeating occurances)
Setting bits step 523 using largestep-repeat in 123332 bit range (136764-260096)  (3 repeating occurances)
Setting bits step 541 using largestep-repeat in 113756 bit range (146340-260096)  (3 repeating occurances)
Setting bits step 547 using largestep-repeat in 110492 bit range (149604-260096)  (3 repeating occurances)
Setting bits step 557 using largestep-repeat in 104972 bit range (155124-260096)  (2 repeating occurances)
Setting bits step 563 using largestep-repeat in 101612 bit range (158484-260096)  (2 repeating occurances)
Setting bits step 569 using largestep-repeat in 98216 bit range (161880-260096)  (2 repeating occurances)
Setting bits step 571 using largestep-repeat in 97076 bit range (163020-260096)  (2 repeating occurances)
Setting bits step 577 using largestep-repeat in 93632 bit range (166464-260096)  (2 repeating occurances)
Setting bits step 587 using largestep-repeat in 87812 bit range (172284-260096)  (2 repeating occurances)
Setting bits step 593 using largestep-repeat in 84272 bit range (175824-260096)  (2 repeating occurances)
Setting bits step 599 using largestep-repeat in 80696 bit range (179400-260096)  (2 repeating occurances)
Setting bits step 601 using largestep-repeat in 79496 bit range (180600-260096)  (2 repeating occurances)
Setting bits step 607 using largestep-repeat in 75872 bit range (184224-260096)  (1 repeating occurances)
Setting bits step 613 using largestep-repeat in 72212 bit range (187884-260096)  (1 repeating occurances)
Setting bits step 617 using largestep-repeat in 69752 bit range (190344-260096)  (1 repeating occurances)
Setting bits step 619 using largestep-repeat in 68516 bit range (191580-260096)  (1 repeating occurances)
Setting bits step 631 using largestep-repeat in 61016 bit range (199080-260096)  (1 repeating occurances)
Setting bits step 641 using largestep-repeat in 54656 bit range (205440-260096)  (1 repeating occurances)
Setting bits step 643 using largestep-repeat in 53372 bit range (206724-260096)  (1 repeating occurances)
Setting bits step 647 using largestep-repeat in 50792 bit range (209304-260096)  (1 repeating occurances)
Setting bits step 653 using largestep-repeat in 46892 bit range (213204-260096)  (1 repeating occurances)
Setting bits step 659 using largestep-repeat in 42956 bit range (217140-260096)  (1 repeating occurances)
Setting bits step 661 using largestep-norepeat in 41636 bit range (218460-260096)  (62 unique occurances)..
Setting bits step 673 using largestep-norepeat in 33632 bit range (226464-260096)  (49 unique occurances)..
Setting bits step 677 using largestep-norepeat in 30932 bit range (229164-260096)  (45 unique occurances)..
Setting bits step 683 using largestep-norepeat in 26852 bit range (233244-260096)  (39 unique occurances)..
Setting bits step 691 using largestep-norepeat in 21356 bit range (238740-260096)  (30 unique occurances)..
Setting bits step 701 using largestep-norepeat in 14396 bit range (245700-260096)  (20 unique occurances)..
Setting bits step 709 using largestep-norepeat in 8756 bit range (251340-260096)  (12 unique occurances)..
Setting bits step 719 using largestep-norepeat in 1616 bit range (258480-260096)  (2 unique occurances)..
Setting bits step 727 using largestep-norepeat in 0 bit range (264264-260096)  (0 unique occurances)..
Setting bits step 733 using largestep-norepeat in 0 bit range (268644-260096)  (0 unique occurances)..
Setting bits step 739 using largestep-norepeat in 0 bit range (273060-260096)  (0 unique occurances)..
Setting bits step 743 using largestep-norepeat in 0 bit range (276024-260096)  (0 unique occurances)..
Setting bits step 751 using largestep-norepeat in 0 bit range (282000-260096)  (0 unique occurances)..
Setting bits step 757 using largestep-norepeat in 0 bit range (286524-260096)  (0 unique occurances)..
Setting bits step 761 using largestep-norepeat in 0 bit range (289560-260096)  (0 unique occurances)..
Setting bits step 769 using largestep-norepeat in 0 bit range (295680-260096)  (0 unique occurances)..
Setting bits step 773 using largestep-norepeat in 0 bit range (298764-260096)  (0 unique occurances)..
Setting bits step 787 using largestep-norepeat in 0 bit range (309684-260096)  (0 unique occurances)..
Setting bits step 797 using largestep-norepeat in 0 bit range (317604-260096)  (0 unique occurances)..
Setting bits step 809 using largestep-norepeat in 0 bit range (327240-260096)  (0 unique occurances)..
Setting bits step 811 using largestep-norepeat in 0 bit range (328860-260096)  (0 unique occurances)..
Setting bits step 821 using largestep-norepeat in 0 bit range (337020-260096)  (0 unique occurances)..
Setting bits step 823 using largestep-norepeat in 0 bit range (338664-260096)  (0 unique occurances)..
Setting bits step 827 using largestep-norepeat in 0 bit range (341964-260096)  (0 unique occurances)..
Setting bits step 829 using largestep-norepeat in 0 bit range (343620-260096)  (0 unique occurances)..
Setting bits step 839 using largestep-norepeat in 0 bit range (351960-260096)  (0 unique occurances)..
Setting bits step 853 using largestep-norepeat in 0 bit range (363804-260096)  (0 unique occurances)..
Setting bits step 857 using largestep-norepeat in 0 bit range (367224-260096)  (0 unique occurances)..
Setting bits step 859 using largestep-norepeat in 0 bit range (368940-260096)  (0 unique occurances)..
Setting bits step 863 using largestep-norepeat in 0 bit range (372384-260096)  (0 unique occurances)..
Setting bits step 877 using largestep-norepeat in 0 bit range (384564-260096)  (0 unique occurances)..
Setting bits step 881 using largestep-norepeat in 0 bit range (388080-260096)  (0 unique occurances)..
Setting bits step 883 using largestep-norepeat in 0 bit range (389844-260096)  (0 unique occurances)..
Setting bits step 887 using largestep-norepeat in 0 bit range (393384-260096)  (0 unique occurances)..
Setting bits step 907 using largestep-norepeat in 0 bit range (411324-260096)  (0 unique occurances)..
Setting bits step 911 using largestep-norepeat in 0 bit range (414960-260096)  (0 unique occurances)..
Setting bits step 919 using largestep-norepeat in 0 bit range (422280-260096)  (0 unique occurances)..
Setting bits step 929 using largestep-norepeat in 0 bit range (431520-260096)  (0 unique occurances)..
Setting bits step 937 using largestep-norepeat in 0 bit range (438984-260096)  (0 unique occurances)..
Setting bits step 941 using largestep-norepeat in 0 bit range (442740-260096)  (0 unique occurances)..
Setting bits step 947 using largestep-norepeat in 0 bit range (448404-260096)  (0 unique occurances)..
Setting bits step 953 using largestep-norepeat in 0 bit range (454104-260096)  (0 unique occurances)..
Setting bits step 967 using largestep-norepeat in 0 bit range (467544-260096)  (0 unique occurances)..
Setting bits step 971 using largestep-norepeat in 0 bit range (471420-260096)  (0 unique occurances)..
Setting bits step 977 using largestep-norepeat in 0 bit range (477264-260096)  (0 unique occurances)..
Setting bits step 983 using largestep-norepeat in 0 bit range (483144-260096)  (0 unique occurances)..
Setting bits step 991 using largestep-norepeat in 0 bit range (491040-260096)  (0 unique occurances)..
Setting bits step 997 using largestep-norepeat in 0 bit range (497004-260096)  (0 unique occurances)..

Block stripe (new) for block 260096 - 500000
Plan start with prime 227 up to 1003 using range 260096 - 500000:
(1) Prime 227 -  63 : Use vectors with wordroll  for primes up to 31
(2) Prime  63 -  63 : Use repeating word masks   for primes up to 82
(3) Prime  63 - 165 : Use vectors sparse steps   for primes up to 469
(4) Prime 165 - 939 : Use repeating word masks   for primes up to 499
(5) Prime 939 - 999 : Use setting bit one by one for primes up to 499
Setting bits step 227 using largestep-repeat in 239745 bit range (260255-500000)  (16 repeating occurances)
Setting bits step 229 using largestep-repeat in 239742 bit range (260258-500000)  (16 repeating occurances)
Setting bits step 233 using largestep-repeat in 239856 bit range (260144-500000)  (16 repeating occurances)
Setting bits step 239 using largestep-repeat in 239849 bit range (260151-500000)  (15 repeating occurances)
Setting bits step 241 using largestep-repeat in 239841 bit range (260159-500000)  (15 repeating occurances)
Setting bits step 251 using largestep-repeat in 239839 bit range (260161-500000)  (14 repeating occurances)
Setting bits step 257 using largestep-repeat in 239788 bit range (260212-500000)  (14 repeating occurances)
Setting bits step 263 using largestep-repeat in 239762 bit range (260238-500000)  (14 repeating occurances)
Setting bits step 269 using largestep-repeat in 239743 bit range (260257-500000)  (13 repeating occurances)
Setting bits step 271 using largestep-repeat in 239705 bit range (260295-500000)  (13 repeating occurances)
Setting bits step 277 using largestep-repeat in 239759 bit range (260241-500000)  (13 repeating occurances)
Setting bits step 281 using largestep-repeat in 239654 bit range (260346-500000)  (13 repeating occurances)
Setting bits step 283 using largestep-repeat in 239782 bit range (260218-500000)  (13 repeating occurances)
Setting bits step 293 using largestep-repeat in 239670 bit range (260330-500000)  (12 repeating occurances)
Setting bits step 307 using largestep-repeat in 239818 bit range (260182-500000)  (12 repeating occurances)
Setting bits step 311 using largestep-repeat in 239849 bit range (260151-500000)  (12 repeating occurances)
Setting bits step 313 using largestep-repeat in 239741 bit range (260259-500000)  (11 repeating occurances)
Setting bits step 317 using largestep-repeat in 239902 bit range (260098-500000)  (11 repeating occurances)
Setting bits step 331 using largestep-repeat in 239669 bit range (260331-500000)  (11 repeating occurances)
Setting bits step 337 using largestep-repeat in 239668 bit range (260332-500000)  (11 repeating occurances)
Setting bits step 347 using largestep-repeat in 239577 bit range (260423-500000)  (10 repeating occurances)
Setting bits step 349 using largestep-repeat in 239821 bit range (260179-500000)  (10 repeating occurances)
Setting bits step 353 using largestep-repeat in 239663 bit range (260337-500000)  (10 repeating occurances)
Setting bits step 359 using largestep-repeat in 239546 bit range (260454-500000)  (10 repeating occurances)
Setting bits step 367 using largestep-repeat in 239614 bit range (260386-500000)  (10 repeating occurances)
Setting bits step 373 using largestep-repeat in 239833 bit range (260167-500000)  (10 repeating occurances)
Setting bits step 379 using largestep-repeat in 239817 bit range (260183-500000)  (9 repeating occurances)
Setting bits step 383 using largestep-repeat in 239752 bit range (260248-500000)  (9 repeating occurances)
Setting bits step 389 using largestep-repeat in 239565 bit range (260435-500000)  (9 repeating occurances)
Setting bits step 397 using largestep-repeat in 239767 bit range (260233-500000)  (9 repeating occurances)
Setting bits step 401 using largestep-repeat in 239551 bit range (260449-500000)  (9 repeating occurances)
Setting bits step 409 using largestep-repeat in 239672 bit range (260328-500000)  (9 repeating occurances)
Setting bits step 419 using largestep-repeat in 239592 bit range (260408-500000)  (8 repeating occurances)
Setting bits step 421 using largestep-repeat in 239612 bit range (260388-500000)  (8 repeating occurances)
Setting bits step 431 using largestep-repeat in 239892 bit range (260108-500000)  (8 repeating occurances)
Setting bits step 433 using largestep-repeat in 239551 bit range (260449-500000)  (8 repeating occurances)
Setting bits step 439 using largestep-repeat in 239893 bit range (260107-500000)  (8 repeating occurances)
Setting bits step 443 using largestep-repeat in 239738 bit range (260262-500000)  (8 repeating occurances)
Setting bits step 449 using largestep-repeat in 239805 bit range (260195-500000)  (8 repeating occurances)
Setting bits step 457 using largestep-repeat in 239739 bit range (260261-500000)  (8 repeating occurances)
Setting bits step 461 using largestep-repeat in 239766 bit range (260234-500000)  (8 repeating occurances)
Setting bits step 463 using largestep-repeat in 239563 bit range (260437-500000)  (8 repeating occurances)
Setting bits step 467 using largestep-repeat in 239648 bit range (260352-500000)  (8 repeating occurances)
Setting bits step 479 using largestep-repeat in 239664 bit range (260336-500000)  (7 repeating occurances)
Setting bits step 487 using largestep-repeat in 239699 bit range (260301-500000)  (7 repeating occurances)
Setting bits step 491 using largestep-repeat in 239525 bit range (260475-500000)  (7 repeating occurances)
Setting bits step 499 using largestep-repeat in 239772 bit range (260228-500000)  (7 repeating occurances)
Setting bits step 503 using largestep-repeat in 239698 bit range (260302-500000)  (7 repeating occurances)
Setting bits step 509 using largestep-repeat in 239647 bit range (260353-500000)  (7 repeating occurances)
Setting bits step 521 using largestep-repeat in 239761 bit range (260239-500000)  (7 repeating occurances)
Setting bits step 523 using largestep-repeat in 239808 bit range (260192-500000)  (7 repeating occurances)
Setting bits step 541 using largestep-repeat in 239509 bit range (260491-500000)  (6 repeating occurances)
Setting bits step 547 using largestep-repeat in 239902 bit range (260098-500000)  (6 repeating occurances)
Setting bits step 557 using largestep-repeat in 239603 bit range (260397-500000)  (6 repeating occurances)
Setting bits step 563 using largestep-repeat in 239613 bit range (260387-500000)  (6 repeating occurances)
Setting bits step 569 using largestep-repeat in 239683 bit range (260317-500000)  (6 repeating occurances)
Setting bits step 571 using largestep-repeat in 239339 bit range (260661-500000)  (6 repeating occurances)
Setting bits step 577 using largestep-repeat in 239485 bit range (260515-500000)  (6 repeating occurances)
Setting bits step 587 using largestep-repeat in 239666 bit range (260334-500000)  (6 repeating occurances)
Setting bits step 593 using largestep-repeat in 239377 bit range (260623-500000)  (6 repeating occurances)
Setting bits step 599 using largestep-repeat in 239735 bit range (260265-500000)  (6 repeating occurances)
Setting bits step 601 using largestep-repeat in 239467 bit range (260533-500000)  (6 repeating occurances)
Setting bits step 607 using largestep-repeat in 239901 bit range (260099-500000)  (6 repeating occurances)
Setting bits step 613 using largestep-repeat in 239782 bit range (260218-500000)  (6 repeating occurances)
Setting bits step 617 using largestep-repeat in 239318 bit range (260682-500000)  (6 repeating occurances)
Setting bits step 619 using largestep-repeat in 239711 bit range (260289-500000)  (6 repeating occurances)
Setting bits step 631 using largestep-repeat in 239713 bit range (260287-500000)  (5 repeating occurances)
Setting bits step 641 using largestep-repeat in 239434 bit range (260566-500000)  (5 repeating occurances)
Setting bits step 643 using largestep-repeat in 239264 bit range (260736-500000)  (5 repeating occurances)
Setting bits step 647 using largestep-repeat in 239583 bit range (260417-500000)  (5 repeating occurances)
Setting bits step 653 using largestep-repeat in 239780 bit range (260220-500000)  (5 repeating occurances)
Setting bits step 659 using largestep-repeat in 239366 bit range (260634-500000)  (5 repeating occurances)
Setting bits step 661 using largestep-repeat in 239897 bit range (260103-500000)  (5 repeating occurances)
Setting bits step 673 using largestep-repeat in 239886 bit range (260114-500000)  (5 repeating occurances)
Setting bits step 677 using largestep-repeat in 239694 bit range (260306-500000)  (5 repeating occurances)
Setting bits step 683 using largestep-repeat in 239436 bit range (260564-500000)  (5 repeating occurances)
Setting bits step 691 using largestep-repeat in 239839 bit range (260161-500000)  (5 repeating occurances)
Setting bits step 701 using largestep-repeat in 239579 bit range (260421-500000)  (5 repeating occurances)
Setting bits step 709 using largestep-repeat in 239443 bit range (260557-500000)  (5 repeating occurances)
Setting bits step 719 using largestep-repeat in 239363 bit range (260637-500000)  (5 repeating occurances)
Setting bits step 727 using largestep-repeat in 235736 bit range (264264-500000)  (5 repeating occurances)
Setting bits step 733 using largestep-repeat in 231356 bit range (268644-500000)  (4 repeating occurances)
Setting bits step 739 using largestep-repeat in 226940 bit range (273060-500000)  (4 repeating occurances)
Setting bits step 743 using largestep-repeat in 223976 bit range (276024-500000)  (4 repeating occurances)
Setting bits step 751 using largestep-repeat in 218000 bit range (282000-500000)  (4 repeating occurances)
Setting bits step 757 using largestep-repeat in 213476 bit range (286524-500000)  (4 repeating occurances)
Setting bits step 761 using largestep-repeat in 210440 bit range (289560-500000)  (4 repeating occurances)
Setting bits step 769 using largestep-repeat in 204320 bit range (295680-500000)  (4 repeating occurances)
Setting bits step 773 using largestep-repeat in 201236 bit range (298764-500000)  (4 repeating occurances)
Setting bits step 787 using largestep-repeat in 190316 bit range (309684-500000)  (3 repeating occurances)
Setting bits step 797 using largestep-repeat in 182396 bit range (317604-500000)  (3 repeating occurances)
Setting bits step 809 using largestep-repeat in 172760 bit range (327240-500000)  (3 repeating occurances)
Setting bits step 811 using largestep-repeat in 171140 bit range (328860-500000)  (3 repeating occurances)
Setting bits step 821 using largestep-repeat in 162980 bit range (337020-500000)  (3 repeating occurances)
Setting bits step 823 using largestep-repeat in 161336 bit range (338664-500000)  (3 repeating occurances)
Setting bits step 827 using largestep-repeat in 158036 bit range (341964-500000)  (2 repeating occurances)
Setting bits step 829 using largestep-repeat in 156380 bit range (343620-500000)  (2 repeating occurances)
Setting bits step 839 using largestep-repeat in 148040 bit range (351960-500000)  (2 repeating occurances)
Setting bits step 853 using largestep-repeat in 136196 bit range (363804-500000)  (2 repeating occurances)
Setting bits step 857 using largestep-repeat in 132776 bit range (367224-500000)  (2 repeating occurances)
Setting bits step 859 using largestep-repeat in 131060 bit range (368940-500000)  (2 repeating occurances)
Setting bits step 863 using largestep-repeat in 127616 bit range (372384-500000)  (2 repeating occurances)
Setting bits step 877 using largestep-repeat in 115436 bit range (384564-500000)  (2 repeating occurances)
Setting bits step 881 using largestep-repeat in 111920 bit range (388080-500000)  (1 repeating occurances)
Setting bits step 883 using largestep-repeat in 110156 bit range (389844-500000)  (1 repeating occurances)
Setting bits step 887 using largestep-repeat in 106616 bit range (393384-500000)  (1 repeating occurances)
Setting bits step 907 using largestep-repeat in 88676 bit range (411324-500000)  (1 repeating occurances)
Setting bits step 911 using largestep-repeat in 85040 bit range (414960-500000)  (1 repeating occurances)
Setting bits step 919 using largestep-repeat in 77720 bit range (422280-500000)  (1 repeating occurances)
Setting bits step 929 using largestep-repeat in 68480 bit range (431520-500000)  (1 repeating occurances)
Setting bits step 937 using largestep-repeat in 61016 bit range (438984-500000)  (1 repeating occurances)
Setting bits step 941 using largestep-norepeat in 57260 bit range (442740-500000)  (60 unique occurances)..
Setting bits step 947 using largestep-norepeat in 51596 bit range (448404-500000)  (54 unique occurances)..
Setting bits step 953 using largestep-norepeat in 45896 bit range (454104-500000)  (48 unique occurances)..
Setting bits step 967 using largestep-norepeat in 32456 bit range (467544-500000)  (33 unique occurances)..
Setting bits step 971 using largestep-norepeat in 28580 bit range (471420-500000)  (29 unique occurances)..
Setting bits step 977 using largestep-norepeat in 22736 bit range (477264-500000)  (23 unique occurances)..
Setting bits step 983 using largestep-norepeat in 16856 bit range (483144-500000)  (17 unique occurances)..
Setting bits step 991 using largestep-norepeat in 8960 bit range (491040-500000)  (9 unique occurances)..
Setting bits step 997 using largestep-norepeat in 2996 bit range (497004-500000)  (3 unique occurances)..
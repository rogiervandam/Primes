GAS LISTING /tmp/ccrNbbzt.s 			page 1


   1              		.file	"sieve_extend.c"
   2              		.intel_syntax noprefix
   3              	# GNU C17 (Ubuntu 9.4.0-1ubuntu1~20.04.1) version 9.4.0 (x86_64-linux-gnu)
   4              	#	compiled by GNU C version 9.4.0, GMP version 6.2.0, MPFR version 4.0.2, MPC version 1.1.0, isl ve
   5              	
   6              	# GGC heuristics: --param ggc-min-expand=100 --param ggc-min-heapsize=131072
   7              	# options passed:  -imultiarch x86_64-linux-gnu sieve_extend.c
   8              	# -march=skylake -mmmx -mno-3dnow -msse -msse2 -msse3 -mssse3 -mno-sse4a
   9              	# -mcx16 -msahf -mmovbe -maes -mno-sha -mpclmul -mpopcnt -mabm -mno-lwp
  10              	# -mfma -mno-fma4 -mno-xop -mbmi -mno-sgx -mbmi2 -mno-pconfig -mno-wbnoinvd
  11              	# -mno-tbm -mavx -mavx2 -msse4.2 -msse4.1 -mlzcnt -mrtm -mhle -mrdrnd
  12              	# -mf16c -mfsgsbase -mrdseed -mprfchw -madx -mfxsr -mxsave -mxsaveopt
  13              	# -mno-avx512f -mno-avx512er -mno-avx512cd -mno-avx512pf -mno-prefetchwt1
  14              	# -mclflushopt -mxsavec -mxsaves -mno-avx512dq -mno-avx512bw -mno-avx512vl
  15              	# -mno-avx512ifma -mno-avx512vbmi -mno-avx5124fmaps -mno-avx5124vnniw
  16              	# -mno-clwb -mno-mwaitx -mno-clzero -mno-pku -mno-rdpid -mno-gfni
  17              	# -mno-shstk -mno-avx512vbmi2 -mno-avx512vnni -mno-vaes -mno-vpclmulqdq
  18              	# -mno-avx512bitalg -mno-avx512vpopcntdq -mno-movdiri -mno-movdir64b
  19              	# -mno-waitpkg -mno-cldemote -mno-ptwrite --param l1-cache-size=32
  20              	# --param l1-cache-line-size=64 --param l2-cache-size=12288 -mtune=skylake
  21              	# -masm=intel -g -Ofast -fno-asynchronous-unwind-tables -fno-exceptions
  22              	# -fverbose-asm -fstack-protector-strong -Wformat -Wformat-security
  23              	# -fstack-clash-protection -fcf-protection
  24              	# options enabled:  -fPIC -fPIE -faggressive-loop-optimizations
  25              	# -falign-functions -falign-jumps -falign-labels -falign-loops
  26              	# -fassociative-math -fassume-phsa -fauto-inc-dec -fbranch-count-reg
  27              	# -fcaller-saves -fcode-hoisting -fcombine-stack-adjustments -fcommon
  28              	# -fcompare-elim -fcprop-registers -fcrossjumping -fcse-follow-jumps
  29              	# -fcx-limited-range -fdefer-pop -fdelete-null-pointer-checks
  30              	# -fdevirtualize -fdevirtualize-speculatively -fdwarf2-cfi-asm
  31              	# -fearly-inlining -feliminate-unused-debug-types -fexpensive-optimizations
  32              	# -ffinite-math-only -fforward-propagate -ffp-int-builtin-inexact
  33              	# -ffunction-cse -fgcse -fgcse-after-reload -fgcse-lm -fgnu-runtime
  34              	# -fgnu-unique -fguess-branch-probability -fhoist-adjacent-loads -fident
  35              	# -fif-conversion -fif-conversion2 -findirect-inlining -finline
  36              	# -finline-atomics -finline-functions -finline-functions-called-once
  37              	# -finline-small-functions -fipa-bit-cp -fipa-cp -fipa-cp-clone -fipa-icf
  38              	# -fipa-icf-functions -fipa-icf-variables -fipa-profile -fipa-pure-const
  39              	# -fipa-ra -fipa-reference -fipa-reference-addressable -fipa-sra
  40              	# -fipa-stack-alignment -fipa-vrp -fira-hoist-pressure
  41              	# -fira-share-save-slots -fira-share-spill-slots
  42              	# -fisolate-erroneous-paths-dereference -fivopts -fkeep-static-consts
  43              	# -fleading-underscore -flifetime-dse -floop-interchange
  44              	# -floop-unroll-and-jam -flra-remat -flto-odr-type-merging
  45              	# -fmerge-constants -fmerge-debug-strings -fmove-loop-invariants
  46              	# -fomit-frame-pointer -foptimize-sibling-calls -foptimize-strlen
  47              	# -fpartial-inlining -fpeel-loops -fpeephole -fpeephole2 -fplt
  48              	# -fpredictive-commoning -fprefetch-loop-arrays -freciprocal-math -free
  49              	# -freg-struct-return -freorder-blocks -freorder-blocks-and-partition
  50              	# -freorder-functions -frerun-cse-after-loop
  51              	# -fsched-critical-path-heuristic -fsched-dep-count-heuristic
  52              	# -fsched-group-heuristic -fsched-interblock -fsched-last-insn-heuristic
  53              	# -fsched-rank-heuristic -fsched-spec -fsched-spec-insn-heuristic
  54              	# -fsched-stalled-insns-dep -fschedule-fusion -fschedule-insns2
  55              	# -fsemantic-interposition -fshow-column -fshrink-wrap
  56              	# -fshrink-wrap-separate -fsplit-ivs-in-unroller -fsplit-loops
  57              	# -fsplit-paths -fsplit-wide-types -fssa-backprop -fssa-phiopt
GAS LISTING /tmp/ccrNbbzt.s 			page 2


  58              	# -fstack-clash-protection -fstack-protector-strong -fstdarg-opt
  59              	# -fstore-merging -fstrict-aliasing -fstrict-volatile-bitfields
  60              	# -fsync-libcalls -fthread-jumps -ftoplevel-reorder -ftree-bit-ccp
  61              	# -ftree-builtin-call-dce -ftree-ccp -ftree-ch -ftree-coalesce-vars
  62              	# -ftree-copy-prop -ftree-cselim -ftree-dce -ftree-dominator-opts
  63              	# -ftree-dse -ftree-forwprop -ftree-fre -ftree-loop-distribute-patterns
  64              	# -ftree-loop-distribution -ftree-loop-if-convert -ftree-loop-im
  65              	# -ftree-loop-ivcanon -ftree-loop-optimize -ftree-loop-vectorize
  66              	# -ftree-parallelize-loops= -ftree-partial-pre -ftree-phiprop -ftree-pre
  67              	# -ftree-pta -ftree-reassoc -ftree-scev-cprop -ftree-sink
  68              	# -ftree-slp-vectorize -ftree-slsr -ftree-sra -ftree-switch-conversion
  69              	# -ftree-tail-merge -ftree-ter -ftree-vrp -funit-at-a-time
  70              	# -funsafe-math-optimizations -funswitch-loops -fvar-tracking
  71              	# -fvar-tracking-assignments -fverbose-asm -fversion-loops-for-strides
  72              	# -fzero-initialized-in-bss -m128bit-long-double -m64 -m80387 -mabm -madx
  73              	# -maes -malign-stringops -mavx -mavx2 -mbmi -mbmi2 -mclflushopt -mcx16
  74              	# -mf16c -mfancy-math-387 -mfma -mfp-ret-in-387 -mfsgsbase -mfxsr -mglibc
  75              	# -mhle -mlong-double-80 -mlzcnt -mmmx -mmovbe -mpclmul -mpopcnt -mprfchw
  76              	# -mpush-args -mrdrnd -mrdseed -mred-zone -mrtm -msahf -msse -msse2 -msse3
  77              	# -msse4 -msse4.1 -msse4.2 -mssse3 -mstv -mtls-direct-seg-refs -mvzeroupper
  78              	# -mxsave -mxsavec -mxsaveopt -mxsaves
  79              	
  80              		.text
  81              	.Ltext0:
  82              		.cfi_sections	.debug_frame
  83              		.p2align 4
  85              	setBitsTrue_largeRange_vector:
  86              	.LVL0:
  87              	.LFB64:
  88              		.file 1 "sieve_extend.c"
   1:sieve_extend.c **** #include <stdio.h>
   2:sieve_extend.c **** #include <stdlib.h>
   3:sieve_extend.c **** #include <stdint.h>
   4:sieve_extend.c **** #include <time.h>
   5:sieve_extend.c **** #include <math.h>
   6:sieve_extend.c **** #include <string.h>
   7:sieve_extend.c **** 
   8:sieve_extend.c **** //add debug in front of a line to only compile it if the value below is set to 1 (or !=0)
   9:sieve_extend.c **** #define option_runonce 0
  10:sieve_extend.c **** #define debug if (option_runonce)
  11:sieve_extend.c **** 
  12:sieve_extend.c **** #define default_sieve_limit 1000000
  13:sieve_extend.c **** #define default_blocksize (32*1024*8-1024)
  14:sieve_extend.c **** #define default_sieve_duration 5
  15:sieve_extend.c **** #define default_sample_duration 0.1
  16:sieve_extend.c **** #define default_sample_max 5
  17:sieve_extend.c **** #define default_verbose_level 1
  18:sieve_extend.c **** #define default_tune_level 2
  19:sieve_extend.c **** #define default_check_level 1
  20:sieve_extend.c **** #define default_show_primes_on_error 100
  21:sieve_extend.c **** #define default_showMaxFactor (0 || option_runonce?100:0)
  22:sieve_extend.c **** #define anticiped_cache_line_bytesize 128
  23:sieve_extend.c **** 
  24:sieve_extend.c **** // 64 bit
  25:sieve_extend.c **** #define TYPE uint64_t
  26:sieve_extend.c **** 
  27:sieve_extend.c **** // calculate the rest dynamically
GAS LISTING /tmp/ccrNbbzt.s 			page 3


  28:sieve_extend.c **** #define counter_t TYPE
  29:sieve_extend.c **** #define bitshift_t TYPE
  30:sieve_extend.c **** #define bitword_t TYPE
  31:sieve_extend.c **** 
  32:sieve_extend.c **** #define WORD_SIZE (sizeof(bitword_t)*8)
  33:sieve_extend.c **** #define WORD_SIZE_counter ((counter_t)(sizeof(bitword_t)*8))
  34:sieve_extend.c **** #define WORD_SIZE_bitshift ((bitshift_t)(sizeof(bitword_t)*8))
  35:sieve_extend.c **** #define pow(base,pow) (pow*((base>>pow)&1U))
  36:sieve_extend.c **** #define SHIFT ((bitshift_t)(pow(WORD_SIZE,1)+pow(WORD_SIZE,2)+pow(WORD_SIZE,3)+pow(WORD_SIZE,4)+pow
  37:sieve_extend.c **** #define SHIFT_VECTOR (SHIFT+2)
  38:sieve_extend.c **** 
  39:sieve_extend.c **** typedef uint64_t bitvector_t __attribute__ ((vector_size(sizeof(bitword_t)*4)));
  40:sieve_extend.c **** 
  41:sieve_extend.c **** // globals for tuning
  42:sieve_extend.c **** counter_t global_SMALLSTEP_FASTER = 16;
  43:sieve_extend.c **** counter_t global_MEDIUMSTEP_FASTER = WORD_SIZE;
  44:sieve_extend.c **** 
  45:sieve_extend.c **** #define SAFE_SHIFTBIT (bitshift_t)1U
  46:sieve_extend.c **** #define SAFE_ZERO  (bitshift_t)0U
  47:sieve_extend.c **** #define BITWORD_SHIFTBIT (bitword_t)1U
  48:sieve_extend.c **** #define SMALLSTEP_FASTER ((counter_t)global_SMALLSTEP_FASTER)
  49:sieve_extend.c **** #define MEDIUMSTEP_FASTER ((counter_t)global_MEDIUMSTEP_FASTER)
  50:sieve_extend.c **** #define wordindex(index) (((counter_t)index) >> (bitshift_t)SHIFT)
  51:sieve_extend.c **** #define vectorindex(index) (((counter_t)index) >> (bitshift_t)SHIFT_VECTOR)
  52:sieve_extend.c **** // modern processors do a & over the shiftssize, so we only have to do that ourselve when using the
  53:sieve_extend.c **** #define bitindex(index) ((bitshift_t)(index))
  54:sieve_extend.c **** // #define bitindex(index) ((bitshift_t)(index)&((bitword_t)(WORD_SIZE-1)))
  55:sieve_extend.c **** //#define bitindex_calc(index) ((bitshift_t)(index)&((bitshift_t)(WORD_SIZE_bitshift-SAFE_SHIFTBIT)
  56:sieve_extend.c **** #define bitindex_calc(index) ((bitshift_t)(index)&((bitshift_t)((~SAFE_ZERO)>>(WORD_SIZE_bitshift-S
  57:sieve_extend.c **** #define  markmask(index) (BITWORD_SHIFTBIT << bitindex(index))
  58:sieve_extend.c **** #define  markmask_calc(index) (SAFE_SHIFTBIT << bitindex_calc(index))
  59:sieve_extend.c **** // #define chopmask(index) ((SAFE_SHIFTBIT << bitindex(index))-SAFE_SHIFTBIT)
  60:sieve_extend.c **** // #define chopmask2(index) (((bitword_t)2U << bitindex(index))-SAFE_SHIFTBIT)
  61:sieve_extend.c **** #define chopmask(index) (~SAFE_ZERO >> (WORD_SIZE-1-bitindex_calc(index)))
  62:sieve_extend.c **** #define keepmask(index) (~SAFE_ZERO << (bitindex_calc(index)))
  63:sieve_extend.c **** #define chopmask2(index) chopmask(index)
  64:sieve_extend.c **** #define real(bit) (bit*2+1)
  65:sieve_extend.c **** 
  66:sieve_extend.c **** #define min(a,b) ((a<b) ? a : b)
  67:sieve_extend.c **** #define uintsafeminus(a,b) ((a>b)?(a-b):0)
  68:sieve_extend.c **** 
  69:sieve_extend.c **** #define likely(x)       (__builtin_expect((x),1))
  70:sieve_extend.c **** #define unlikely(x)     (__builtin_expect((x),0))
  71:sieve_extend.c **** 
  72:sieve_extend.c **** counter_t debug_hitpoint[5] = { 0,0,0,0,0};
  73:sieve_extend.c **** 
  74:sieve_extend.c **** struct sieve_state {
  75:sieve_extend.c ****     bitword_t* bitarray;
  76:sieve_extend.c ****     counter_t  bits;
  77:sieve_extend.c ****     counter_t  size;
  78:sieve_extend.c **** };
  79:sieve_extend.c **** 
  80:sieve_extend.c **** #include "debugtools.h"
  81:sieve_extend.c **** 
  82:sieve_extend.c **** // use cache lines as much as possible - alignment might be key
  83:sieve_extend.c **** #define ceiling(x,y) (((x) + (y) - 1) / (y)) // Return the smallest multiple N of y such that:  x <
  84:sieve_extend.c **** static struct sieve_state *create_sieve(counter_t maxints) {
GAS LISTING /tmp/ccrNbbzt.s 			page 4


  85:sieve_extend.c ****     struct sieve_state *sieve = aligned_alloc(8, sizeof(struct sieve_state));
  86:sieve_extend.c ****     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytesize*8) * anticiped_ca
  87:sieve_extend.c **** 
  88:sieve_extend.c ****     sieve->bitarray = aligned_alloc((size_t)anticiped_cache_line_bytesize, (size_t)memSize );
  89:sieve_extend.c ****     sieve->bits     = maxints >> 1;
  90:sieve_extend.c ****     sieve->size     = maxints;
  91:sieve_extend.c **** 
  92:sieve_extend.c ****     // moved clearing the sieve with 0 to the sieve_block_extend
  93:sieve_extend.c ****     // it gave weird malloc problems at this point
  94:sieve_extend.c ****     return sieve;
  95:sieve_extend.c **** }
  96:sieve_extend.c **** 
  97:sieve_extend.c **** static void delete_sieve(struct sieve_state *sieve) {
  98:sieve_extend.c ****     free(sieve->bitarray);
  99:sieve_extend.c ****     free(sieve);
 100:sieve_extend.c **** }
 101:sieve_extend.c **** 
 102:sieve_extend.c **** // not much performance gain at smaller sieves, but its's nice to have an implementation
 103:sieve_extend.c **** static inline counter_t searchBitFalse_longRange(bitword_t* bitarray, register counter_t index) {
 104:sieve_extend.c ****    register counter_t index_word = wordindex(index);
 105:sieve_extend.c ****    bitshift_t index_bit  = bitindex_calc(index);
 106:sieve_extend.c ****    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bi
 107:sieve_extend.c ****    index += distance;
 108:sieve_extend.c ****    distance += index_bit;
 109:sieve_extend.c **** 
 110:sieve_extend.c ****    while (distance == WORD_SIZE_bitshift) { // to prevent a bug from optimzer
 111:sieve_extend.c ****        index_word++;
 112:sieve_extend.c ****        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
 113:sieve_extend.c ****        index += distance;
 114:sieve_extend.c ****    }
 115:sieve_extend.c **** 
 116:sieve_extend.c ****    return index;
 117:sieve_extend.c **** }
 118:sieve_extend.c **** 
 119:sieve_extend.c **** // not much performance gain at smaller sieves, but its's nice to have an implementation
 120:sieve_extend.c **** static inline counter_t searchBitFalse(bitword_t* bitarray, register counter_t index) {
 121:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 122:sieve_extend.c ****     return index;
 123:sieve_extend.c **** }
 124:sieve_extend.c **** 
 125:sieve_extend.c **** static void inline applyMask_fast(bitword_t* __restrict bitarray, const counter_t step, const count
 126:sieve_extend.c ****    const counter_t range_stop_word = wordindex(range_stop);
 127:sieve_extend.c ****    register bitword_t* __restrict index_ptr = &bitarray[index_word];
 128:sieve_extend.c ****    bitword_t* __restrict fast_loop_ptr = &bitarray[((range_stop_word>step*5) ? (range_stop_word - s
 129:sieve_extend.c ****    bitword_t* __restrict range_stop_ptr = &bitarray[(range_stop_word)];//>step_4) ? (range_stop_wor
 130:sieve_extend.c **** 
 131:sieve_extend.c ****     long size_word_ptr = fast_loop_ptr - index_ptr;
 132:sieve_extend.c ****     const long step_ptr = (long)step;
 133:sieve_extend.c **** //    #pragma ivdep
 134:sieve_extend.c ****    for (long i=0; i < size_word_ptr; i++) {
 135:sieve_extend.c ****        *(index_ptr+i*step_ptr) |= mask;
 136:sieve_extend.c ****    }
 137:sieve_extend.c ****    index_ptr += size_word_ptr * step_ptr;
 138:sieve_extend.c **** 
 139:sieve_extend.c ****    while ( index_ptr < range_stop_ptr) {
 140:sieve_extend.c ****        *index_ptr |= mask;
 141:sieve_extend.c ****        index_ptr+=step;
GAS LISTING /tmp/ccrNbbzt.s 			page 5


 142:sieve_extend.c ****    }
 143:sieve_extend.c **** 
 144:sieve_extend.c ****    if (index_ptr == range_stop_ptr) {
 145:sieve_extend.c ****       *range_stop_ptr |= (mask & chopmask2(range_stop));
 146:sieve_extend.c ****    }
 147:sieve_extend.c **** 
 148:sieve_extend.c **** // #endif
 149:sieve_extend.c **** }
 150:sieve_extend.c **** 
 151:sieve_extend.c **** static void inline applyMask(bitword_t* __restrict bitarray, const counter_t step, const counter_t 
 152:sieve_extend.c **** //#if __APPLE__
 153:sieve_extend.c **** //   register const counter_t step_2 = step * 2;
 154:sieve_extend.c **** //   register const counter_t step_3 = step * 3;
 155:sieve_extend.c **** //   register const counter_t step_4 = step * 4;
 156:sieve_extend.c **** //   register const counter_t range_stop_word = wordindex(range_stop);
 157:sieve_extend.c **** //   const counter_t loop_stop_word = (range_stop_word > step_3) ? (range_stop_word - step_3) : (co
 158:sieve_extend.c **** //
 159:sieve_extend.c **** //   #pragma ivdep
 160:sieve_extend.c **** //   for (;index_word < loop_stop_word;  index_word += step_4) {
 161:sieve_extend.c **** //       bitarray[index_word         ] |= mask;
 162:sieve_extend.c **** //       bitarray[index_word + step  ] |= mask;
 163:sieve_extend.c **** //       bitarray[index_word + step_2] |= mask;
 164:sieve_extend.c **** //       bitarray[index_word + step_3] |= mask;
 165:sieve_extend.c **** //   }
 166:sieve_extend.c **** //
 167:sieve_extend.c **** //   #pragma ivdep
 168:sieve_extend.c **** //   while (index_word < range_stop_word) {
 169:sieve_extend.c **** //       bitarray[index_word] |= mask;
 170:sieve_extend.c **** //       index_word += step;
 171:sieve_extend.c **** //   }
 172:sieve_extend.c **** //
 173:sieve_extend.c **** //   if (index_word == wordindex(range_stop)) {
 174:sieve_extend.c **** //       bitarray[wordindex(range_stop)] |= (mask & chopmask2(range_stop));
 175:sieve_extend.c **** //   }
 176:sieve_extend.c **** //#endif
 177:sieve_extend.c **** //    ALTERNATIVE using pointers is faster in gcc
 178:sieve_extend.c **** //#if __linux__
 179:sieve_extend.c **** //    const counter_t range_stop_word = wordindex(range_stop);
 180:sieve_extend.c **** //    register bitword_t* __restrict index_ptr      = &bitarray[index_word];
 181:sieve_extend.c **** //    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_
 182:sieve_extend.c **** 
 183:sieve_extend.c ****    const counter_t range_stop_word = wordindex(range_stop);
 184:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 185:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 186:sieve_extend.c **** 
 187:sieve_extend.c **** //   #pragma unroll
 188:sieve_extend.c ****    #pragma ivdep
 189:sieve_extend.c ****    while likely(index_ptr < fast_loop_ptr) {
 190:sieve_extend.c ****        *index_ptr |= mask;
 191:sieve_extend.c ****        index_ptr+=step;
 192:sieve_extend.c ****        *index_ptr |= mask;
 193:sieve_extend.c ****        index_ptr+=step;
 194:sieve_extend.c ****        *index_ptr |= mask;
 195:sieve_extend.c ****        index_ptr+=step;
 196:sieve_extend.c ****        *index_ptr |= mask;
 197:sieve_extend.c ****        index_ptr+=step;
 198:sieve_extend.c ****        *index_ptr |= mask;
GAS LISTING /tmp/ccrNbbzt.s 			page 6


 199:sieve_extend.c ****        index_ptr+=step;
 200:sieve_extend.c ****    }
 201:sieve_extend.c **** 
 202:sieve_extend.c ****    const register bitword_t* __restrict range_stop_ptr = &bitarray[(range_stop_word)];
 203:sieve_extend.c ****    while likely(index_ptr < range_stop_ptr) {
 204:sieve_extend.c ****        *index_ptr |= mask;
 205:sieve_extend.c ****        index_ptr+=step;
 206:sieve_extend.c ****    }
 207:sieve_extend.c **** 
 208:sieve_extend.c ****    if (index_ptr == range_stop_ptr) { // index_ptr could also end above range_stop_ptr, depending o
 209:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 210:sieve_extend.c ****    }
 211:sieve_extend.c **** 
 212:sieve_extend.c **** //    const counter_t range_stop_word = wordindex(range_stop);
 213:sieve_extend.c **** //    bitword_t* __restrict index_ptr = &bitarray[index_word];
 214:sieve_extend.c **** //    bitword_t* __restrict fast_loop_ptr = &bitarray[((range_stop_word>step*4) ? (range_stop_word 
 215:sieve_extend.c **** //    bitword_t* __restrict range_stop_ptr = &bitarray[(range_stop_word)];//>step_4) ? (range_stop_
 216:sieve_extend.c **** //    const int loop_iterations = ((range_stop_word - index_word) / (step*4));
 217:sieve_extend.c **** 
 218:sieve_extend.c **** //      debug printf("..%ju loop iterations for step %ju range in words (%ju - %ju)\n",(uintmax_t)l
 219:sieve_extend.c **** 
 220:sieve_extend.c **** //     #pragma unroll 1
 221:sieve_extend.c **** //    #pragma ivdep
 222:sieve_extend.c **** //    for ( int i=0; i < loop_iterations; i++) {
 223:sieve_extend.c **** //        *(index_ptr) |= mask;
 224:sieve_extend.c **** //        *(index_ptr+step) |= mask;
 225:sieve_extend.c **** //        *(index_ptr+2*step) |= mask;
 226:sieve_extend.c **** //        *(index_ptr+3*step) |= mask;
 227:sieve_extend.c **** //        index_ptr += 4*step;
 228:sieve_extend.c **** //    }
 229:sieve_extend.c **** 
 230:sieve_extend.c **** //    while ( index_ptr < range_stop_ptr) {
 231:sieve_extend.c **** //        *index_ptr |= mask;
 232:sieve_extend.c **** //        index_ptr+=step;
 233:sieve_extend.c **** //    }
 234:sieve_extend.c **** 
 235:sieve_extend.c **** //    if (index_ptr == range_stop_ptr) {
 236:sieve_extend.c **** //       *range_stop_ptr |= (mask & chopmask(range_stop));
 237:sieve_extend.c **** //    }
 238:sieve_extend.c **** //#endif
 239:sieve_extend.c **** }
 240:sieve_extend.c **** 
 241:sieve_extend.c **** // set bits by creating a pattern and then extending it to word and range size
 242:sieve_extend.c **** static void inline setBitsTrue_smallStep(bitword_t* bitarray, const counter_t range_start, const bi
 243:sieve_extend.c ****     debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using smallstep (%ju occurances)
 244:sieve_extend.c **** 
 245:sieve_extend.c ****     // build the pattern in a word
 246:sieve_extend.c **** 	register bitword_t pattern = SAFE_SHIFTBIT;
 247:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 248:sieve_extend.c **** 
 249:sieve_extend.c ****     // initialize loop variables and stop if this is it
 250:sieve_extend.c ****     const counter_t range_stop_word = wordindex(range_stop);
 251:sieve_extend.c ****     register counter_t copy_word = wordindex(range_start);
 252:sieve_extend.c ****      if (copy_word == range_stop_word) { // shortcut
 253:sieve_extend.c ****        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(range_stop));
 254:sieve_extend.c ****        return;
 255:sieve_extend.c ****     }
GAS LISTING /tmp/ccrNbbzt.s 			page 7


 256:sieve_extend.c ****     
 257:sieve_extend.c ****     bitarray[copy_word++] |= (pattern << bitindex(range_start));
 258:sieve_extend.c **** 
 259:sieve_extend.c ****     // from now on, we are before range_stop_word
 260:sieve_extend.c ****     // first word is special, because it should not set bits before the range_start_bit
 261:sieve_extend.c ****     pattern = (pattern << (bitindex_calc(range_start) % step)); // correct for inital offset  
 262:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 263:sieve_extend.c ****     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
 264:sieve_extend.c ****     // copy_word++;
 265:sieve_extend.c **** 
 266:sieve_extend.c ****     #pragma ivdep
 267:sieve_extend.c ****     for (;copy_word < range_stop_word; copy_word++) {
 268:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 269:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 270:sieve_extend.c ****     } 
 271:sieve_extend.c **** 
 272:sieve_extend.c ****     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 273:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 274:sieve_extend.c **** }
 275:sieve_extend.c **** 
 276:sieve_extend.c **** // Medium steps could be within the same word (e.g. less than 64 bits apart).
 277:sieve_extend.c **** // By joining the masks and then writing to memory, we might save some time.
 278:sieve_extend.c **** // This is especially true for small steps over long ranges
 279:sieve_extend.c **** // but it needs tuning, because there is some overhead of checking if the next step is in the same 
 280:sieve_extend.c **** static void inline setBitsTrue_mediumStep(bitword_t* bitarray, const counter_t range_start, const c
 281:sieve_extend.c ****     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
 282:sieve_extend.c **** 
 283:sieve_extend.c ****     if (range_stop_unique > range_stop) { // the range will not repeat itself; no need to try to re
 284:sieve_extend.c ****         debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-unique (%ju
 285:sieve_extend.c **** 
 286:sieve_extend.c ****         #pragma ivdep
 287:sieve_extend.c ****         for (register counter_t index = range_start; index <= range_stop;) {
 288:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 289:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 290:sieve_extend.c ****             #pragma ivdep
 291:sieve_extend.c ****             do {
 292:sieve_extend.c ****                 mask |= markmask(index);
 293:sieve_extend.c ****                 index += step;
 294:sieve_extend.c ****             } while (index_word == wordindex(index));
 295:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 296:sieve_extend.c ****             //     mask |= markmask(index);
 297:sieve_extend.c ****             bitarray[index_word] |= mask;
 298:sieve_extend.c ****         }
 299:sieve_extend.c ****     }
 300:sieve_extend.c ****     else { // this mask will reoccur at a interval of step words -> fill mask and reapply as a inte
 301:sieve_extend.c ****         debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-repeat (%ju
 302:sieve_extend.c ****         
 303:sieve_extend.c ****         #pragma ivdep
 304:sieve_extend.c ****         for (register counter_t index = range_start; index <= range_stop_unique;) {
 305:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 306:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 307:sieve_extend.c ****             #pragma ivdep
 308:sieve_extend.c ****             do {
 309:sieve_extend.c ****                 mask |= markmask(index);
 310:sieve_extend.c ****                 index += step;
 311:sieve_extend.c ****             } while (index_word == wordindex(index));
 312:sieve_extend.c ****             // #pragma ivdep
GAS LISTING /tmp/ccrNbbzt.s 			page 8


 313:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 314:sieve_extend.c ****             //     mask |= markmask(index);
 315:sieve_extend.c ****             applyMask(bitarray, step, range_stop, mask, index_word);
 316:sieve_extend.c ****         }
 317:sieve_extend.c ****     }
 318:sieve_extend.c **** }
 319:sieve_extend.c **** 
 320:sieve_extend.c **** // small ranges (< WORD_SIZE * step) mean the mask is unique
 321:sieve_extend.c **** static inline void setBitsTrue_smallRange(bitword_t* __restrict bitarray, const counter_t range_sta
 322:sieve_extend.c ****     debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using smallrange (%ju occurances
 323:sieve_extend.c ****     
 324:sieve_extend.c ****     #pragma unroll
 325:sieve_extend.c ****     #pragma ivdep
 326:sieve_extend.c ****     for (register counter_t index = range_start; index <= range_stop; index += step) {
 327:sieve_extend.c ****         bitarray[wordindex(index)] |= markmask(index);
 328:sieve_extend.c ****     }
 329:sieve_extend.c ****     counter_t loop_iterations = (range_stop - range_start) / step;
 330:sieve_extend.c **** 
 331:sieve_extend.c **** //    #pragma unroll
 332:sieve_extend.c ****     // #pragma ivdep
 333:sieve_extend.c ****     // for (register counter_t i = 0; i <= loop_iterations; i++) {
 334:sieve_extend.c ****     //     register counter_t index = range_start+i*step;
 335:sieve_extend.c ****     //     bitarray[wordindex(index)] |= markmask(index);
 336:sieve_extend.c ****     // }
 337:sieve_extend.c **** }
 338:sieve_extend.c **** 
 339:sieve_extend.c **** // small ranges (< WORD_SIZE * step) mean the mask is unique
 340:sieve_extend.c **** static void setBitsTrue_race(bitword_t* bitarray, counter_t index1, counter_t index2, const counter
 341:sieve_extend.c ****     debug printf("Setting bits step %ju and %ju in %ju bit range (%ju-%ju) using race (%ju occuranc
 342:sieve_extend.c **** 
 343:sieve_extend.c ****     counter_t index1_word = wordindex(index1);
 344:sieve_extend.c ****     counter_t index2_word = wordindex(index2);
 345:sieve_extend.c ****     
 346:sieve_extend.c ****     while (1) {
 347:sieve_extend.c ****         if (index1_word == index2_word) {
 348:sieve_extend.c ****             bitword_t mask = SAFE_ZERO;
 349:sieve_extend.c ****             counter_t index_word = index1_word;
 350:sieve_extend.c ****             do {
 351:sieve_extend.c ****                 mask |= markmask(index1);
 352:sieve_extend.c ****                 index1 += step1;
 353:sieve_extend.c ****                 index1_word = wordindex(index1);
 354:sieve_extend.c ****             } while (index1_word == index_word);
 355:sieve_extend.c ****             do {
 356:sieve_extend.c ****                 mask |= markmask(index2);
 357:sieve_extend.c ****                 index2 += step2;
 358:sieve_extend.c ****                 index2_word = wordindex(index2);
 359:sieve_extend.c ****             } while (index2_word == index_word);
 360:sieve_extend.c ****             bitarray[index_word] |= mask;
 361:sieve_extend.c ****         }
 362:sieve_extend.c **** 
 363:sieve_extend.c ****         // because step is larger, index2 is the most likely to get out of bounds first
 364:sieve_extend.c ****         if (index2 > range_stop) {
 365:sieve_extend.c ****             while (index1 <= range_stop) {
 366:sieve_extend.c ****                 bitarray[wordindex(index1)] |= markmask(index1);
 367:sieve_extend.c ****                 index1 += step1;
 368:sieve_extend.c ****             }
 369:sieve_extend.c ****             return;
GAS LISTING /tmp/ccrNbbzt.s 			page 9


 370:sieve_extend.c ****         }
 371:sieve_extend.c **** 
 372:sieve_extend.c ****         if (index1 > range_stop) {
 373:sieve_extend.c ****             while (index2 <= range_stop) {
 374:sieve_extend.c ****                 bitarray[wordindex(index2)] |= markmask(index2);
 375:sieve_extend.c ****                 index2 += step2;
 376:sieve_extend.c ****             }
 377:sieve_extend.c ****             return;
 378:sieve_extend.c ****         }
 379:sieve_extend.c **** 
 380:sieve_extend.c ****         while (index1_word < index2_word) {
 381:sieve_extend.c ****             bitarray[index1_word] |= markmask(index1);
 382:sieve_extend.c ****             index1 += step1;
 383:sieve_extend.c ****             index1_word = wordindex(index1);
 384:sieve_extend.c ****         }
 385:sieve_extend.c ****         
 386:sieve_extend.c ****         while (index2_word < index1_word){
 387:sieve_extend.c ****             bitarray[index2_word] |= markmask(index2);
 388:sieve_extend.c ****             index2 += step2;
 389:sieve_extend.c ****             index2_word = wordindex(index2);
 390:sieve_extend.c ****         }
 391:sieve_extend.c **** 
 392:sieve_extend.c ****     }
 393:sieve_extend.c **** }
 394:sieve_extend.c **** 
 395:sieve_extend.c **** // Large ranges (> WORD_SIZE * step) mean the same mask can be reused
 396:sieve_extend.c **** static void setBitsTrue_largeRange(bitword_t* __restrict bitarray, const counter_t range_start, con
 397:sieve_extend.c ****     debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange (%ju occurances
 398:sieve_extend.c ****     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
 399:sieve_extend.c **** 
 400:sieve_extend.c **** //    #pragma unroll
 401:sieve_extend.c ****     #pragma ivdep
 402:sieve_extend.c ****     for (register counter_t index = range_start; index <= range_stop_unique; index += step) {
 403:sieve_extend.c ****         register bitword_t mask = markmask(index);
 404:sieve_extend.c ****         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 405:sieve_extend.c ****     }
 406:sieve_extend.c **** }
 407:sieve_extend.c **** 
 408:sieve_extend.c **** static void setBitsTrue_largeRange_vector(bitword_t* bitarray_word, const counter_t range_start, co
  89              		.loc 1 408 148 view -0
  90              		.cfi_startproc
  91              		.loc 1 408 148 is_stmt 0 view .LVU1
  92 0000 55       		push	rbp	#
  93              		.cfi_def_cfa_offset 16
  94              		.cfi_offset 6, -16
  95 0001 4889E5   		mov	rbp, rsp	#,
  96              		.cfi_def_cfa_register 6
  97 0004 4883E4E0 		and	rsp, -32	#,
  98 0008 4883EC40 		sub	rsp, 64	#,
  99              	# sieve_extend.c:408: static void setBitsTrue_largeRange_vector(bitword_t* bitarray_word, const cou
 100              		.loc 1 408 148 view .LVU2
 101 000c 64488B04 		mov	rax, QWORD PTR fs:40	# tmp142, MEM[(<address-space-1> long unsigned int *)40B]
 101      25280000 
 101      00
 102 0015 48894424 		mov	QWORD PTR 56[rsp], rax	# D.6418, tmp142
 102      38
 103 001a 31C0     		xor	eax, eax	# tmp142
GAS LISTING /tmp/ccrNbbzt.s 			page 10


 409:sieve_extend.c ****     debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange vector (%ju occ
 104              		.loc 1 409 5 is_stmt 1 view .LVU3
 410:sieve_extend.c **** 
 411:sieve_extend.c ****     counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
 105              		.loc 1 411 5 view .LVU4
 106              	.LVL1:
 412:sieve_extend.c ****     
 413:sieve_extend.c ****     // for (counter_t index = range_start; index <= range_stop_unique; index += step) {
 414:sieve_extend.c ****     //     applyMask(bitarray_word, step, range_stop, markmask(index), wordindex(index));
 415:sieve_extend.c ****     // }
 416:sieve_extend.c ****     // return;
 417:sieve_extend.c ****     
 418:sieve_extend.c ****     bitvector_t* bitarray_vector = (bitvector_t*)bitarray_word;
 107              		.loc 1 418 5 view .LVU5
 419:sieve_extend.c **** 
 420:sieve_extend.c ****     register bitvector_t quadmask = { SAFE_ZERO,SAFE_ZERO,SAFE_ZERO,SAFE_ZERO };
 108              		.loc 1 420 5 view .LVU6
 421:sieve_extend.c ****     register counter_t index_vector = vectorindex(range_start);
 109              		.loc 1 421 5 view .LVU7
 422:sieve_extend.c ****     register counter_t word = 0;
 110              		.loc 1 422 5 view .LVU8
 423:sieve_extend.c ****     for (counter_t index = range_start; index <= range_stop;) {
 111              		.loc 1 423 5 view .LVU9
 112              	.LBB273:
 113              		.loc 1 423 10 view .LVU10
 114              		.loc 1 423 41 view .LVU11
 115              	# sieve_extend.c:423:     for (counter_t index = range_start; index <= range_stop;) {
 116              		.loc 1 423 5 is_stmt 0 view .LVU12
 117 001c 4839CE   		cmp	rsi, rcx	# range_start, range_stop
 118 001f 0F87A900 		ja	.L1	#,
 118      0000
 119              	.LBB274:
 120              	# sieve_extend.c:436:             quadmask[word] |= markmask(index);
 424:sieve_extend.c ****         register counter_t current_vector = vectorindex(index);
 425:sieve_extend.c ****         register counter_t current_word =  current_vector*4;
 426:sieve_extend.c ****         register counter_t index_word = wordindex(index);
 427:sieve_extend.c ****         quadmask[0] = SAFE_ZERO;
 428:sieve_extend.c ****         quadmask[1] = SAFE_ZERO;
 429:sieve_extend.c ****         quadmask[2] = SAFE_ZERO;
 430:sieve_extend.c ****         quadmask[3] = SAFE_ZERO;
 431:sieve_extend.c **** 
 432:sieve_extend.c ****         // printf("Vector %ju word %ju\n",current_vector,current_word);
 433:sieve_extend.c ****         word = index_word - current_word;
 434:sieve_extend.c **** 
 435:sieve_extend.c ****         do {
 436:sieve_extend.c ****             quadmask[word] |= markmask(index);
 121              		.loc 1 436 31 view .LVU13
 122 0025 41BA0100 		mov	r10d, 1	# tmp123,
 122      0000
 123              	.LVL2:
 124 002b 0F1F4400 		.p2align 4,,10
 124      00
 125              		.p2align 3
 126              	.L5:
 424:sieve_extend.c ****         register counter_t current_vector = vectorindex(index);
 127              		.loc 1 424 9 is_stmt 1 view .LVU14
 128              	# sieve_extend.c:424:         register counter_t current_vector = vectorindex(index);
GAS LISTING /tmp/ccrNbbzt.s 			page 11


 424:sieve_extend.c ****         register counter_t current_vector = vectorindex(index);
 129              		.loc 1 424 28 is_stmt 0 view .LVU15
 130 0030 4989F3   		mov	r11, rsi	# current_vector, range_start
 131 0033 49C1EB08 		shr	r11, 8	# current_vector,
 132              	.LVL3:
 425:sieve_extend.c ****         register counter_t index_word = wordindex(index);
 133              		.loc 1 425 9 is_stmt 1 view .LVU16
 134              	# sieve_extend.c:426:         register counter_t index_word = wordindex(index);
 426:sieve_extend.c ****         quadmask[0] = SAFE_ZERO;
 135              		.loc 1 426 28 is_stmt 0 view .LVU17
 136 0037 4889F0   		mov	rax, rsi	# index_word, range_start
 137              	# sieve_extend.c:427:         quadmask[0] = SAFE_ZERO;
 427:sieve_extend.c ****         quadmask[1] = SAFE_ZERO;
 138              		.loc 1 427 21 view .LVU18
 139 003a 48C70424 		mov	QWORD PTR [rsp], 0	# quadmask,
 139      00000000 
 140              	# sieve_extend.c:428:         quadmask[1] = SAFE_ZERO;
 428:sieve_extend.c ****         quadmask[2] = SAFE_ZERO;
 141              		.loc 1 428 21 view .LVU19
 142 0042 48C74424 		mov	QWORD PTR 8[rsp], 0	# quadmask,
 142      08000000 
 142      00
 143              	# sieve_extend.c:429:         quadmask[2] = SAFE_ZERO;
 429:sieve_extend.c ****         quadmask[3] = SAFE_ZERO;
 144              		.loc 1 429 21 view .LVU20
 145 004b 48C74424 		mov	QWORD PTR 16[rsp], 0	# quadmask,
 145      10000000 
 145      00
 146              	# sieve_extend.c:430:         quadmask[3] = SAFE_ZERO;
 430:sieve_extend.c **** 
 147              		.loc 1 430 21 view .LVU21
 148 0054 48C74424 		mov	QWORD PTR 24[rsp], 0	# quadmask,
 148      18000000 
 148      00
 149              	# sieve_extend.c:425:         register counter_t current_word =  current_vector*4;
 425:sieve_extend.c ****         register counter_t index_word = wordindex(index);
 150              		.loc 1 425 28 view .LVU22
 151 005d 4E8D0C9D 		lea	r9, 0[0+r11*4]	# current_word,
 151      00000000 
 152              	.LVL4:
 426:sieve_extend.c ****         quadmask[0] = SAFE_ZERO;
 153              		.loc 1 426 9 is_stmt 1 view .LVU23
 427:sieve_extend.c ****         quadmask[1] = SAFE_ZERO;
 154              		.loc 1 427 9 view .LVU24
 428:sieve_extend.c ****         quadmask[2] = SAFE_ZERO;
 155              		.loc 1 428 9 view .LVU25
 429:sieve_extend.c ****         quadmask[3] = SAFE_ZERO;
 156              		.loc 1 429 9 view .LVU26
 430:sieve_extend.c **** 
 157              		.loc 1 430 9 view .LVU27
 433:sieve_extend.c **** 
 158              		.loc 1 433 9 view .LVU28
 159              	# sieve_extend.c:426:         register counter_t index_word = wordindex(index);
 426:sieve_extend.c ****         quadmask[0] = SAFE_ZERO;
 160              		.loc 1 426 28 is_stmt 0 view .LVU29
 161 0065 48C1E806 		shr	rax, 6	# index_word,
 162              	.LVL5:
GAS LISTING /tmp/ccrNbbzt.s 			page 12


 163              	# sieve_extend.c:433:         word = index_word - current_word;
 433:sieve_extend.c **** 
 164              		.loc 1 433 14 view .LVU30
 165 0069 4C29C8   		sub	rax, r9	# word, current_word
 166              	.LVL6:
 167 006c 0F1F4000 		.p2align 4,,10
 168              		.p2align 3
 169              	.L3:
 435:sieve_extend.c ****             quadmask[word] |= markmask(index);
 170              		.loc 1 435 9 is_stmt 1 discriminator 1 view .LVU31
 171              		.loc 1 436 13 discriminator 1 view .LVU32
 172              	# sieve_extend.c:436:             quadmask[word] |= markmask(index);
 173              		.loc 1 436 31 is_stmt 0 discriminator 1 view .LVU33
 174 0070 C442C9F7 		shlx	r8, r10, rsi	# tmp122, tmp123, range_start
 174      C2
 175              	# sieve_extend.c:437:             index += step;
 437:sieve_extend.c ****             index += step;
 176              		.loc 1 437 19 discriminator 1 view .LVU34
 177 0075 4801D6   		add	rsi, rdx	# range_start, step
 178              	.LVL7:
 179              	# sieve_extend.c:436:             quadmask[word] |= markmask(index);
 436:sieve_extend.c ****             index += step;
 180              		.loc 1 436 28 discriminator 1 view .LVU35
 181 0078 4C0904C4 		or	QWORD PTR [rsp+rax*8], r8	# quadmask, tmp122
 182              		.loc 1 437 13 is_stmt 1 discriminator 1 view .LVU36
 183              	.LVL8:
 438:sieve_extend.c ****             index_vector = vectorindex(index);
 184              		.loc 1 438 13 discriminator 1 view .LVU37
 439:sieve_extend.c ****             index_word = wordindex(index);
 185              		.loc 1 439 13 discriminator 1 view .LVU38
 440:sieve_extend.c ****             word = index_word - current_word;
 186              		.loc 1 440 13 discriminator 1 view .LVU39
 187              	# sieve_extend.c:439:             index_word = wordindex(index);
 439:sieve_extend.c ****             index_word = wordindex(index);
 188              		.loc 1 439 24 is_stmt 0 discriminator 1 view .LVU40
 189 007c 4889F0   		mov	rax, rsi	# index_word, range_start
 190              	.LVL9:
 439:sieve_extend.c ****             index_word = wordindex(index);
 191              		.loc 1 439 24 discriminator 1 view .LVU41
 192 007f 48C1E806 		shr	rax, 6	# index_word,
 193              	.LVL10:
 194              	# sieve_extend.c:440:             word = index_word - current_word;
 195              		.loc 1 440 18 discriminator 1 view .LVU42
 196 0083 4C29C8   		sub	rax, r9	# word, current_word
 197              	.LVL11:
 441:sieve_extend.c ****         } while (word <= 3 && index <= range_stop);
 198              		.loc 1 441 17 is_stmt 1 discriminator 1 view .LVU43
 199              	# sieve_extend.c:441:         } while (word <= 3 && index <= range_stop);
 200              		.loc 1 441 9 is_stmt 0 discriminator 1 view .LVU44
 201 0086 4883F803 		cmp	rax, 3	# word,
 202 008a 7705     		ja	.L7	#,
 203 008c 4839F1   		cmp	rcx, rsi	# range_stop, range_start
 204 008f 73DF     		jnb	.L3	#,
 205              	.L7:
 442:sieve_extend.c **** 
 443:sieve_extend.c ****         bitarray_word[current_word  ] |= quadmask[0];
 206              		.loc 1 443 9 is_stmt 1 view .LVU45
GAS LISTING /tmp/ccrNbbzt.s 			page 13


 207              	# sieve_extend.c:443:         bitarray_word[current_word  ] |= quadmask[0];
 208              		.loc 1 443 39 is_stmt 0 view .LVU46
 209 0091 4C8B0424 		mov	r8, QWORD PTR [rsp]	# quadmask, quadmask
 210 0095 4C89D8   		mov	rax, r11	# current_vector, current_vector
 211              	.LVL12:
 212              		.loc 1 443 39 view .LVU47
 213 0098 48C1E005 		sal	rax, 5	# current_vector,
 214 009c 4C090407 		or	QWORD PTR [rdi+rax], r8	# *_12, quadmask
 444:sieve_extend.c ****         bitarray_word[current_word+1] |= quadmask[1];
 215              		.loc 1 444 9 is_stmt 1 view .LVU48
 216              	# sieve_extend.c:444:         bitarray_word[current_word+1] |= quadmask[1];
 217              		.loc 1 444 39 is_stmt 0 view .LVU49
 218 00a0 4C8B4424 		mov	r8, QWORD PTR 8[rsp]	# quadmask, quadmask
 218      08
 219 00a5 4A8D04CD 		lea	rax, 8[0+r9*8]	# _18,
 219      08000000 
 220 00ad 4C090407 		or	QWORD PTR [rdi+rax], r8	# *_19, quadmask
 445:sieve_extend.c ****         bitarray_word[current_word+2] |= quadmask[2];
 221              		.loc 1 445 9 is_stmt 1 view .LVU50
 222              	# sieve_extend.c:445:         bitarray_word[current_word+2] |= quadmask[2];
 223              		.loc 1 445 39 is_stmt 0 view .LVU51
 224 00b1 4C8B4424 		mov	r8, QWORD PTR 16[rsp]	# quadmask, quadmask
 224      10
 225 00b6 4C094407 		or	QWORD PTR 8[rdi+rax], r8	# *_25, quadmask
 225      08
 446:sieve_extend.c ****         bitarray_word[current_word+3] |= quadmask[3];
 226              		.loc 1 446 9 is_stmt 1 view .LVU52
 227              	# sieve_extend.c:446:         bitarray_word[current_word+3] |= quadmask[3];
 228              		.loc 1 446 39 is_stmt 0 view .LVU53
 229 00bb 4C8B4424 		mov	r8, QWORD PTR 24[rsp]	# quadmask, quadmask
 229      18
 230 00c0 4C094407 		or	QWORD PTR 16[rdi+rax], r8	# *_31, quadmask
 230      10
 231              		.loc 1 446 39 view .LVU54
 232              	.LBE274:
 423:sieve_extend.c ****         register counter_t current_vector = vectorindex(index);
 233              		.loc 1 423 41 is_stmt 1 view .LVU55
 234              	# sieve_extend.c:423:     for (counter_t index = range_start; index <= range_stop;) {
 423:sieve_extend.c ****         register counter_t current_vector = vectorindex(index);
 235              		.loc 1 423 5 is_stmt 0 view .LVU56
 236 00c5 4839F1   		cmp	rcx, rsi	# range_stop, range_start
 237 00c8 0F8362FF 		jnb	.L5	#,
 237      FFFF
 238              	.LVL13:
 239              	.L1:
 423:sieve_extend.c ****         register counter_t current_vector = vectorindex(index);
 240              		.loc 1 423 5 view .LVU57
 241              	.LBE273:
 242              	# sieve_extend.c:497: }
 447:sieve_extend.c **** 
 448:sieve_extend.c ****         // bitarray_vector[current_vector] |= quadmask[0];
 449:sieve_extend.c ****         // bitarray_vector[current_vector] |= quadmask[1];
 450:sieve_extend.c ****         // bitarray_vector[current_vector] |= quadmask[2];
 451:sieve_extend.c ****         // bitarray_vector[current_vector] |= quadmask[3];
 452:sieve_extend.c ****     }
 453:sieve_extend.c **** 
 454:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 14


 455:sieve_extend.c ****     // debug { counter_t repeats = (range_stop - range_start)/(WORD_SIZE_counter * step); if ( repe
 456:sieve_extend.c ****     // register bitvector_t quadmask = { SAFE_ZERO,SAFE_ZERO,SAFE_ZERO,SAFE_ZERO };
 457:sieve_extend.c ****     // bitword_t* bitarray = bitarray_word;
 458:sieve_extend.c ****     // bitvector_t* bitarray_vector = (bitvector_t*)bitarray_word;
 459:sieve_extend.c **** 
 460:sieve_extend.c ****     // if (step < WORD_SIZE_counter*4) {
 461:sieve_extend.c ****     //     for (counter_t index = range_start; index <= range_stop_unique; ) {
 462:sieve_extend.c ****     //         // debug printf("..Processing index %ju for step %ju (stop at %ju)\n",index, step, r
 463:sieve_extend.c ****     //         counter_t start_word = wordindex(index);
 464:sieve_extend.c **** 
 465:sieve_extend.c **** 
 466:sieve_extend.c ****     //         register counter_t index_word = start_word;
 467:sieve_extend.c ****     //         counter_t word = 0;
 468:sieve_extend.c ****     //         quadmask[0] = SAFE_ZERO;
 469:sieve_extend.c ****     //         quadmask[1] = SAFE_ZERO;
 470:sieve_extend.c ****     //         quadmask[2] = SAFE_ZERO;
 471:sieve_extend.c ****     //         quadmask[3] = SAFE_ZERO;
 472:sieve_extend.c ****     //         do {
 473:sieve_extend.c ****     //             quadmask[word] |= markmask(index);
 474:sieve_extend.c ****     //             index += step;
 475:sieve_extend.c ****     //             index_word = wordindex(index);
 476:sieve_extend.c ****     //             word = index_word - start_word;
 477:sieve_extend.c ****     //         } while (word < 4 );
 478:sieve_extend.c **** 
 479:sieve_extend.c ****     //         counter_t range_stop_word = wordindex(range_stop);
 480:sieve_extend.c ****     //         index_word = start_word;
 481:sieve_extend.c **** 
 482:sieve_extend.c ****     //         #pragma ivdep
 483:sieve_extend.c ****     //         while ((index_word)+4 < range_stop_word) {
 484:sieve_extend.c ****     //             // debug printf("..handling word %ju (range_stop %ju)\n",index_word,range_stop_w
 485:sieve_extend.c ****     //             bitarray_vector[index_word][0] |= quadmask[0];
 486:sieve_extend.c ****     //             bitarray_vector[index_word][1] |= quadmask[1];
 487:sieve_extend.c ****     //             bitarray_vector[index_word][2] |= quadmask[2];
 488:sieve_extend.c ****     //             bitarray_vector[index_word][3] |= quadmask[3];
 489:sieve_extend.c ****     //             index_word += step;
 490:sieve_extend.c ****     //         }
 491:sieve_extend.c ****     //         if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[0]; index_word
 492:sieve_extend.c ****     //         if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[1]; index_word
 493:sieve_extend.c ****     //         if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[2]; index_word
 494:sieve_extend.c ****     //         if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[3]; index_word
 495:sieve_extend.c ****     //     }
 496:sieve_extend.c ****     // }
 497:sieve_extend.c **** }
 243              		.loc 1 497 1 view .LVU58
 244 00ce 488B4424 		mov	rax, QWORD PTR 56[rsp]	# tmp143, D.6418
 244      38
 245 00d3 64483304 		xor	rax, QWORD PTR fs:40	# tmp143, MEM[(<address-space-1> long unsigned int *)40B]
 245      25280000 
 245      00
 246 00dc 7502     		jne	.L16	#,
 247 00de C9       		leave	
 248              		.cfi_remember_state
 249              		.cfi_def_cfa 7, 8
 250 00df C3       		ret	
 251              	.L16:
 252              		.cfi_restore_state
 253 00e0 E8000000 		call	__stack_chk_fail@PLT	#
GAS LISTING /tmp/ccrNbbzt.s 			page 15


 253      00
 254              	.LVL14:
 255              		.loc 1 497 1 view .LVU59
 256              		.cfi_endproc
 257              	.LFE64:
 259 00e5 66662E0F 		.p2align 4
 259      1F840000 
 259      000000
 261              	extendSieve_smallSize:
 262              	.LVL15:
 263              	.LFB65:
 498:sieve_extend.c **** /*
 499:sieve_extend.c **** static void setBitsTrue_largeRange_mmx(bitword_t* __restrict bitarray, const counter_t range_start,
 500:sieve_extend.c ****     debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange (%ju occurances
 501:sieve_extend.c **** 
 502:sieve_extend.c ****     counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
 503:sieve_extend.c **** 
 504:sieve_extend.c ****     debug { counter_t repeats = (range_stop - range_start)/(WORD_SIZE_counter * step); if ( repeats
 505:sieve_extend.c ****     bitword_t quadmask[4] = { SAFE_ZERO,SAFE_ZERO,SAFE_ZERO,SAFE_ZERO };
 506:sieve_extend.c **** 
 507:sieve_extend.c ****     if (step < WORD_SIZE_counter*4) {
 508:sieve_extend.c ****         for (counter_t index = range_start; index <= range_stop_unique; ) {
 509:sieve_extend.c ****             // debug printf("..Processing index %ju for step %ju (stop at %ju)\n",index, step, rang
 510:sieve_extend.c ****             counter_t start_word = wordindex(index);
 511:sieve_extend.c ****             register counter_t index_word = start_word;
 512:sieve_extend.c ****             counter_t word = 0;
 513:sieve_extend.c ****             quadmask[0] = SAFE_ZERO;
 514:sieve_extend.c ****             quadmask[1] = SAFE_ZERO;
 515:sieve_extend.c ****             quadmask[2] = SAFE_ZERO;
 516:sieve_extend.c ****             quadmask[3] = SAFE_ZERO;
 517:sieve_extend.c ****             do {
 518:sieve_extend.c ****                 quadmask[word] |= markmask(index);
 519:sieve_extend.c ****                 index += step;
 520:sieve_extend.c ****                 index_word = wordindex(index);
 521:sieve_extend.c ****                 word = index_word - start_word;
 522:sieve_extend.c ****             } while (word < 4 );
 523:sieve_extend.c **** 
 524:sieve_extend.c ****             counter_t range_stop_word = wordindex(range_stop);
 525:sieve_extend.c ****             index_word = start_word;
 526:sieve_extend.c **** 
 527:sieve_extend.c ****             #pragma ivdep
 528:sieve_extend.c ****             while ((index_word)+4 < range_stop_word) {
 529:sieve_extend.c ****                 // debug printf("..handling word %ju (range_stop %ju)\n",index_word,range_stop_word
 530:sieve_extend.c ****                 bitarray[index_word  ] |= quadmask[0];
 531:sieve_extend.c ****                 bitarray[index_word+1] |= quadmask[1];
 532:sieve_extend.c ****                 bitarray[index_word+2] |= quadmask[2];
 533:sieve_extend.c ****                 bitarray[index_word+3] |= quadmask[3];
 534:sieve_extend.c ****                 index_word += step;
 535:sieve_extend.c ****             }
 536:sieve_extend.c ****             if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[0]; index_word++;
 537:sieve_extend.c ****             if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[1]; index_word++;
 538:sieve_extend.c ****             if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[2]; index_word++;
 539:sieve_extend.c ****             if (index_word <= range_stop_word) { bitarray[index_word] |= quadmask[3]; index_word++;
 540:sieve_extend.c ****         }
 541:sieve_extend.c ****     }
 542:sieve_extend.c ****     else {
 543:sieve_extend.c ****         for (counter_t index = range_start; index <= range_stop_unique; index += step) {
GAS LISTING /tmp/ccrNbbzt.s 			page 16


 544:sieve_extend.c ****             bitword_t mask = markmask(index);
 545:sieve_extend.c ****             applyMask(bitarray, step, range_stop, mask, wordindex(index));
 546:sieve_extend.c ****         }
 547:sieve_extend.c ****     } 
 548:sieve_extend.c **** }
 549:sieve_extend.c **** */
 550:sieve_extend.c **** static void extendSieve_smallSize(bitword_t* bitarray, const counter_t source_start, const counter_
 264              		.loc 1 550 142 is_stmt 1 view -0
 265              		.cfi_startproc
 551:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)\
 266              		.loc 1 551 5 view .LVU61
 552:sieve_extend.c ****     // debug { printf("...At start. "); dump_bitarray(bitarray, 4); }
 553:sieve_extend.c **** 
 554:sieve_extend.c ****     counter_t source_word = wordindex(source_start);
 267              		.loc 1 554 5 view .LVU62
 555:sieve_extend.c ****     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | (bitarray[source_word+
 268              		.loc 1 555 5 view .LVU63
 269              	# sieve_extend.c:550: static void extendSieve_smallSize(bitword_t* bitarray, const counter_t source
 550:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)\
 270              		.loc 1 550 142 is_stmt 0 view .LVU64
 271 00f0 4155     		push	r13	#
 272              		.cfi_def_cfa_offset 16
 273              		.cfi_offset 13, -16
 274 00f2 4989D2   		mov	r10, rdx	# size, tmp176
 275              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 276              		.loc 1 555 125 view .LVU65
 277 00f5 89F2     		mov	edx, esi	# tmp142, source_start
 278              	.LVL16:
 279              	# sieve_extend.c:550: static void extendSieve_smallSize(bitword_t* bitarray, const counter_t source
 550:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)\
 280              		.loc 1 550 142 view .LVU66
 281 00f7 4154     		push	r12	#
 282              		.cfi_def_cfa_offset 24
 283              		.cfi_offset 12, -24
 284              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 285              		.loc 1 555 125 view .LVU67
 286 00f9 83E23F   		and	edx, 63	# tmp142,
 287              	# sieve_extend.c:554:     counter_t source_word = wordindex(source_start);
 554:sieve_extend.c ****     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | (bitarray[source_word+
 288              		.loc 1 554 15 view .LVU68
 289 00fc 4889F0   		mov	rax, rsi	# source_word, source_start
 290              	# sieve_extend.c:550: static void extendSieve_smallSize(bitword_t* bitarray, const counter_t source
 550:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)\
 291              		.loc 1 550 142 view .LVU69
 292 00ff 55       		push	rbp	#
 293              		.cfi_def_cfa_offset 32
 294              		.cfi_offset 6, -32
 295              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 296              		.loc 1 555 124 view .LVU70
 297 0100 41B84000 		mov	r8d, 64	# tmp144,
 297      0000
 298              	# sieve_extend.c:554:     counter_t source_word = wordindex(source_start);
 554:sieve_extend.c ****     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | (bitarray[source_word+
 299              		.loc 1 554 15 view .LVU71
 300 0106 48C1E806 		shr	rax, 6	# source_word,
 301              	.LVL17:
 302              	# sieve_extend.c:550: static void extendSieve_smallSize(bitword_t* bitarray, const counter_t source
GAS LISTING /tmp/ccrNbbzt.s 			page 17


 550:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)\
 303              		.loc 1 550 142 view .LVU72
 304 010a 53       		push	rbx	#
 305              		.cfi_def_cfa_offset 40
 306              		.cfi_offset 3, -40
 307              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 308              		.loc 1 555 124 view .LVU73
 309 010b 4129D0   		sub	r8d, edx	# tmp143, tmp142
 310              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 311              		.loc 1 555 158 view .LVU74
 312 010e 4489D2   		mov	edx, r10d	# tmp150, size
 313              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 314              		.loc 1 555 103 view .LVU75
 315 0111 C462B9F7 		shlx	r8, QWORD PTR 8[rdi+rax*8], r8	# tmp145, *_11, tmp143
 315      44C708
 316              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 317              		.loc 1 555 49 view .LVU76
 318 0118 488B04C7 		mov	rax, QWORD PTR [rdi+rax*8]	# *_5, *_5
 319              	.LVL18:
 320              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 321              		.loc 1 555 158 view .LVU77
 322 011c F7D2     		not	edx	# tmp150
 323              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 324              		.loc 1 555 49 view .LVU78
 325 011e C4E2CBF7 		shrx	rax, rax, rsi	# tmp147, *_5, source_start
 325      C0
 326              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 327              		.loc 1 555 76 view .LVU79
 328 0123 4909C0   		or	r8, rax	# tmp149, tmp147
 329              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 330              		.loc 1 555 158 view .LVU80
 331 0126 48C7C0FF 		mov	rax, -1	# tmp153,
 331      FFFFFF
 332 012d C4E2EBF7 		shrx	rax, rax, rdx	# tmp152, tmp153, tmp150
 332      C0
 333              	# sieve_extend.c:550: static void extendSieve_smallSize(bitword_t* bitarray, const counter_t source
 550:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using smallsize (%ju copies)\
 334              		.loc 1 550 142 view .LVU81
 335 0132 4889CB   		mov	rbx, rcx	# destination_stop, tmp177
 336              	# sieve_extend.c:555:     bitword_t pattern = ((bitarray[source_word] >> bitindex(source_start)) | 
 337              		.loc 1 555 15 view .LVU82
 338 0135 4921C0   		and	r8, rax	# pattern, tmp152
 339              	.LVL19:
 556:sieve_extend.c ****     for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZE_bitshift; pattern_si
 340              		.loc 1 556 5 is_stmt 1 view .LVU83
 341              	.LBB275:
 342              		.loc 1 556 10 view .LVU84
 343              		.loc 1 556 54 view .LVU85
 344              	# sieve_extend.c:556:     for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZ
 345              		.loc 1 556 5 is_stmt 0 view .LVU86
 346 0138 4983FA40 		cmp	r10, 64	# size,
 347 013c 771B     		ja	.L18	#,
 348 013e 4C89D0   		mov	rax, r10	# pattern_size, size
 349              	.LVL20:
 350              		.p2align 4,,10
 351 0141 0F1F8000 		.p2align 3
 351      000000
GAS LISTING /tmp/ccrNbbzt.s 			page 18


 352              	.L19:
 353              		.loc 1 556 120 is_stmt 1 discriminator 3 view .LVU87
 354              	# sieve_extend.c:556:     for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZ
 355              		.loc 1 556 140 is_stmt 0 discriminator 3 view .LVU88
 356 0148 C442F9F7 		shlx	r9, r8, rax	# _23, pattern, pattern_size
 356      C8
 357              	# sieve_extend.c:556:     for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZ
 358              		.loc 1 556 103 discriminator 3 view .LVU89
 359 014d 4801C0   		add	rax, rax	# pattern_size
 360              	.LVL21:
 361              	# sieve_extend.c:556:     for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZ
 362              		.loc 1 556 128 discriminator 3 view .LVU90
 363 0150 4D09C8   		or	r8, r9	# pattern, _23
 364              	.LVL22:
 365              		.loc 1 556 90 is_stmt 1 discriminator 3 view .LVU91
 366              		.loc 1 556 54 discriminator 3 view .LVU92
 367              	# sieve_extend.c:556:     for (bitshift_t pattern_size = (bitshift_t)size; pattern_size <= WORD_SIZ
 368              		.loc 1 556 5 is_stmt 0 discriminator 3 view .LVU93
 369 0153 4883F840 		cmp	rax, 64	# pattern_size,
 370 0157 76EF     		jbe	.L19	#,
 371              	.LVL23:
 372              	.L18:
 373              		.loc 1 556 5 discriminator 3 view .LVU94
 374              	.LBE275:
 557:sieve_extend.c **** 
 558:sieve_extend.c ****     counter_t copy_start = source_start + size;
 375              		.loc 1 558 5 is_stmt 1 view .LVU95
 376              	# sieve_extend.c:558:     counter_t copy_start = source_start + size;
 377              		.loc 1 558 15 is_stmt 0 view .LVU96
 378 0159 4E8D0C16 		lea	r9, [rsi+r10]	# copy_start,
 379              	.LVL24:
 559:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 380              		.loc 1 559 5 is_stmt 1 view .LVU97
 381              	# sieve_extend.c:559:     register counter_t copy_word = wordindex(copy_start);
 382              		.loc 1 559 24 is_stmt 0 view .LVU98
 383 015d 4D89CD   		mov	r13, r9	# copy_word, copy_start
 384 0160 49C1ED06 		shr	r13, 6	# copy_word,
 385              	.LVL25:
 560:sieve_extend.c ****     bitarray[copy_word] |= (pattern << bitindex(copy_start));
 386              		.loc 1 560 5 is_stmt 1 view .LVU99
 387              	# sieve_extend.c:560:     bitarray[copy_word] |= (pattern << bitindex(copy_start));
 388              		.loc 1 560 25 is_stmt 0 view .LVU100
 389 0164 4E8D24ED 		lea	r12, 0[0+r13*8]	# _24,
 389      00000000 
 390 016c 4E8D1C27 		lea	r11, [rdi+r12]	# prephitmp_124,
 391              	# sieve_extend.c:562:     counter_t destination_stop_word = wordindex(destination_stop);
 561:sieve_extend.c **** 
 562:sieve_extend.c ****     counter_t destination_stop_word = wordindex(destination_stop);
 392              		.loc 1 562 15 view .LVU101
 393 0170 4889DD   		mov	rbp, rbx	# destination_stop_word, destination_stop
 394 0173 48C7C0FF 		mov	rax, -1	# tmp159,
 394      FFFFFF
 395 017a F7D3     		not	ebx	# tmp157
 396              	# sieve_extend.c:560:     bitarray[copy_word] |= (pattern << bitindex(copy_start));
 560:sieve_extend.c ****     bitarray[copy_word] |= (pattern << bitindex(copy_start));
 397              		.loc 1 560 37 view .LVU102
 398 017c C4C2B1F7 		shlx	rsi, r8, r9	# tmp156, pattern, copy_start
GAS LISTING /tmp/ccrNbbzt.s 			page 19


 398      F0
 399              	.LVL26:
 400              	# sieve_extend.c:562:     counter_t destination_stop_word = wordindex(destination_stop);
 401              		.loc 1 562 15 view .LVU103
 402 0181 48C1ED06 		shr	rbp, 6	# destination_stop_word,
 403              	# sieve_extend.c:560:     bitarray[copy_word] |= (pattern << bitindex(copy_start));
 560:sieve_extend.c ****     bitarray[copy_word] |= (pattern << bitindex(copy_start));
 404              		.loc 1 560 25 view .LVU104
 405 0185 490B33   		or	rsi, QWORD PTR [r11]	# _44, *_25
 406 0188 498933   		mov	QWORD PTR [r11], rsi	# *_25, _44
 407              		.loc 1 562 5 is_stmt 1 view .LVU105
 408              	.LVL27:
 563:sieve_extend.c ****     // debug { printf("...After first word. "); dump_bitarray(bitarray, 4); }
 564:sieve_extend.c ****     if (copy_word == destination_stop_word) {
 409              		.loc 1 564 5 view .LVU106
 410 018b C4E2E3F7 		shrx	rbx, rax, rbx	# _115, tmp159, tmp157
 410      D8
 411              	# sieve_extend.c:564:     if (copy_word == destination_stop_word) {
 412              		.loc 1 564 8 is_stmt 0 view .LVU107
 413 0190 4939ED   		cmp	r13, rbp	# copy_word, destination_stop_word
 414 0193 7464     		je	.L22	#,
 565:sieve_extend.c ****         bitarray[copy_word] &= chopmask(destination_stop);
 566:sieve_extend.c ****         // debug { printf("...Returning after first word. "); dump_bitarray(bitarray, 4); }
 567:sieve_extend.c ****         return;
 568:sieve_extend.c ****     }
 569:sieve_extend.c **** 
 570:sieve_extend.c ****     register const bitshift_t pattern_shift = WORD_SIZE_counter % size;
 415              		.loc 1 570 5 is_stmt 1 view .LVU108
 416              	# sieve_extend.c:570:     register const bitshift_t pattern_shift = WORD_SIZE_counter % size;
 417              		.loc 1 570 31 is_stmt 0 view .LVU109
 418 0195 B9400000 		mov	ecx, 64	# tmp161,
 418      00
 419              	.LVL28:
 420              		.loc 1 570 31 view .LVU110
 421 019a 4889C8   		mov	rax, rcx	# tmp163, tmp161
 422 019d 31D2     		xor	edx, edx	# tmp162
 423 019f 49F7F2   		div	r10	# size
 424              	.LVL29:
 571:sieve_extend.c ****     register const bitshift_t pattern_size = WORD_SIZE_bitshift - pattern_shift;
 425              		.loc 1 571 5 is_stmt 1 view .LVU111
 426              	# sieve_extend.c:572:     register bitshift_t shift = WORD_SIZE_bitshift - bitindex_calc(copy_start
 572:sieve_extend.c ****     register bitshift_t shift = WORD_SIZE_bitshift - bitindex_calc(copy_start);
 427              		.loc 1 572 54 is_stmt 0 view .LVU112
 428 01a2 4183E13F 		and	r9d, 63	# tmp165,
 429              	.LVL30:
 430              	# sieve_extend.c:571:     register const bitshift_t pattern_size = WORD_SIZE_bitshift - pattern_shi
 571:sieve_extend.c ****     register const bitshift_t pattern_size = WORD_SIZE_bitshift - pattern_shift;
 431              		.loc 1 571 31 view .LVU113
 432 01a6 4989CA   		mov	r10, rcx	# pattern_size, tmp161
 433              	.LVL31:
 434              	# sieve_extend.c:572:     register bitshift_t shift = WORD_SIZE_bitshift - bitindex_calc(copy_start
 435              		.loc 1 572 25 view .LVU114
 436 01a9 4889C8   		mov	rax, rcx	# tmp161, tmp161
 437 01ac 4C29C8   		sub	rax, r9	# tmp161, tmp165
 438              	# sieve_extend.c:571:     register const bitshift_t pattern_size = WORD_SIZE_bitshift - pattern_shi
 571:sieve_extend.c ****     register const bitshift_t pattern_size = WORD_SIZE_bitshift - pattern_shift;
 439              		.loc 1 571 31 view .LVU115
GAS LISTING /tmp/ccrNbbzt.s 			page 20


 440 01af 4929D2   		sub	r10, rdx	# pattern_size, tmp162
 441              	.LVL32:
 442              		.loc 1 572 5 is_stmt 1 view .LVU116
 573:sieve_extend.c **** 
 574:sieve_extend.c ****     #pragma ivdep
 575:sieve_extend.c ****     while (copy_word < destination_stop_word) { // = will be handled as well because increment is a
 443              		.loc 1 575 5 view .LVU117
 444              		.loc 1 575 11 view .LVU118
 445 01b2 4939ED   		cmp	r13, rbp	# copy_word, destination_stop_word
 446 01b5 7342     		jnb	.L22	#,
 447 01b7 488D2CED 		lea	rbp, 8[0+rbp*8]	# _72,
 447      08000000 
 448              	.LVL33:
 449              		.loc 1 575 11 is_stmt 0 view .LVU119
 450 01bf 4A8D4C27 		lea	rcx, 8[rdi+r12]	# ivtmp.136,
 450      08
 451 01c4 4C8D1C2F 		lea	r11, [rdi+rbp]	# _105,
 452              	.LVL34:
 453 01c8 0F1F8400 		.p2align 4,,10
 453      00000000 
 454              		.p2align 3
 455              	.L23:
 576:sieve_extend.c ****         copy_word++;
 456              		.loc 1 576 9 is_stmt 1 view .LVU120
 577:sieve_extend.c ****         bitarray[copy_word] = (pattern << (pattern_size-shift)) | (pattern >> shift);
 457              		.loc 1 577 9 view .LVU121
 458              	# sieve_extend.c:577:         bitarray[copy_word] = (pattern << (pattern_size-shift)) | (pattern >>
 459              		.loc 1 577 56 is_stmt 0 view .LVU122
 460 01d0 4489D6   		mov	esi, r10d	# tmp169, _116
 461 01d3 29C6     		sub	esi, eax	# tmp169, shift
 462              	# sieve_extend.c:577:         bitarray[copy_word] = (pattern << (pattern_size-shift)) | (pattern >>
 463              		.loc 1 577 76 view .LVU123
 464 01d5 C442FBF7 		shrx	r9, r8, rax	# tmp171, pattern, shift
 464      C8
 465              	# sieve_extend.c:577:         bitarray[copy_word] = (pattern << (pattern_size-shift)) | (pattern >>
 466              		.loc 1 577 40 view .LVU124
 467 01da C4C2C9F7 		shlx	rsi, r8, rsi	# tmp170, pattern, tmp169
 467      F0
 468              	# sieve_extend.c:577:         bitarray[copy_word] = (pattern << (pattern_size-shift)) | (pattern >>
 469              		.loc 1 577 65 view .LVU125
 470 01df 4C09CE   		or	rsi, r9	# _44, tmp171
 471              	# sieve_extend.c:577:         bitarray[copy_word] = (pattern << (pattern_size-shift)) | (pattern >>
 472              		.loc 1 577 29 view .LVU126
 473 01e2 488931   		mov	QWORD PTR [rcx], rsi	# MEM[base: _109, offset: 0B], _44
 578:sieve_extend.c ****         shift = (shift + pattern_shift) & ((WORD_SIZE_bitshift-1));  // alternative, but faster
 474              		.loc 1 578 9 is_stmt 1 view .LVU127
 475              	# sieve_extend.c:578:         shift = (shift + pattern_shift) & ((WORD_SIZE_bitshift-1));  // alter
 476              		.loc 1 578 24 is_stmt 0 view .LVU128
 477 01e5 4801D0   		add	rax, rdx	# _45, tmp162
 478              	.LVL35:
 479              		.loc 1 578 24 view .LVU129
 480 01e8 4883C108 		add	rcx, 8	# ivtmp.136,
 481              	# sieve_extend.c:578:         shift = (shift + pattern_shift) & ((WORD_SIZE_bitshift-1));  // alter
 482              		.loc 1 578 15 view .LVU130
 483 01ec 83E03F   		and	eax, 63	# shift,
 484              	.LVL36:
 575:sieve_extend.c ****         copy_word++;
GAS LISTING /tmp/ccrNbbzt.s 			page 21


 485              		.loc 1 575 11 is_stmt 1 view .LVU131
 486 01ef 4939CB   		cmp	r11, rcx	# _105, ivtmp.136
 487 01f2 75DC     		jne	.L23	#,
 488 01f4 4C8D5C2F 		lea	r11, -8[rdi+rbp]	# prephitmp_124,
 488      F8
 489              	.LVL37:
 490              	.L22:
 579:sieve_extend.c ****     }
 580:sieve_extend.c ****     bitarray[copy_word] &= chopmask(destination_stop);
 491              		.loc 1 580 5 view .LVU132
 492              	# sieve_extend.c:580:     bitarray[copy_word] &= chopmask(destination_stop);
 493              		.loc 1 580 25 is_stmt 0 view .LVU133
 494 01f9 4821DE   		and	rsi, rbx	# tmp173, _115
 495 01fc 498933   		mov	QWORD PTR [r11], rsi	#* prephitmp_124, tmp173
 496              	# sieve_extend.c:582: }
 581:sieve_extend.c ****     // debug { printf("...After copies. "); dump_bitarray(bitarray, 4); }
 582:sieve_extend.c **** }
 497              		.loc 1 582 1 view .LVU134
 498 01ff 5B       		pop	rbx	#
 499              		.cfi_def_cfa_offset 32
 500 0200 5D       		pop	rbp	#
 501              		.cfi_def_cfa_offset 24
 502 0201 415C     		pop	r12	#
 503              		.cfi_def_cfa_offset 16
 504 0203 415D     		pop	r13	#
 505              		.cfi_def_cfa_offset 8
 506 0205 C3       		ret	
 507              		.cfi_endproc
 508              	.LFE65:
 510 0206 662E0F1F 		.p2align 4
 510      84000000 
 510      0000
 512              	extendSieve_shiftright_ivdep:
 513              	.LVL38:
 514              	.LFB70:
 583:sieve_extend.c **** 
 584:sieve_extend.c **** static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_start, const counter_t 
 585:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
 586:sieve_extend.c **** 
 587:sieve_extend.c ****     const counter_t destination_stop_word = wordindex(destination_stop);
 588:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 589:sieve_extend.c ****     counter_t source_word = wordindex(source_start);
 590:sieve_extend.c ****     counter_t copy_word = wordindex(copy_start);
 591:sieve_extend.c ****     
 592:sieve_extend.c ****     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
 593:sieve_extend.c **** 
 594:sieve_extend.c ****     while (copy_word + size <= destination_stop_word) {
 595:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
 596:sieve_extend.c ****         copy_word += size;
 597:sieve_extend.c ****     }
 598:sieve_extend.c **** 
 599:sieve_extend.c ****    while (copy_word < destination_stop_word) {
 600:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 601:sieve_extend.c ****         source_word++;
 602:sieve_extend.c ****         copy_word++;
 603:sieve_extend.c ****     }
 604:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 22


 605:sieve_extend.c **** }
 606:sieve_extend.c **** 
 607:sieve_extend.c **** //https://stackoverflow.com/questions/1898153/how-to-determine-if-memory-is-aligned
 608:sieve_extend.c **** #define is_unaligned(POINTER, BYTE_COUNT) (((uintptr_t)(const void *)(POINTER)) % (BYTE_COUNT))
 609:sieve_extend.c **** 
 610:sieve_extend.c **** void shiftvec(uint64_t* __restrict dst, const uint64_t* __restrict src, int size, int shift)
 611:sieve_extend.c **** {
 612:sieve_extend.c ****     int i = 0;
 613:sieve_extend.c ****     // MSVC: use steps of 2 for SSE, 4 for AVX2, 8 for AVX512
 614:sieve_extend.c ****     for (; i+4 < size; i+=4,dst+=4,src+=4)
 615:sieve_extend.c ****     {
 616:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 617:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 618:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 619:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 620:sieve_extend.c ****     }
 621:sieve_extend.c ****     for (; i < size; ++i,++src,++dst)
 622:sieve_extend.c ****     {
 623:sieve_extend.c ****         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 624:sieve_extend.c ****     }    
 625:sieve_extend.c **** }
 626:sieve_extend.c **** 
 627:sieve_extend.c **** #define forward_distance 3
 628:sieve_extend.c **** static void extendSieve_shiftright_ptr(bitword_t* bitarray, const counter_t source_start, const cou
 629:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
 630:sieve_extend.c ****    
 631:sieve_extend.c ****     const counter_t destination_stop_word = wordindex(destination_stop);
 632:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 633:sieve_extend.c ****     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
 634:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 635:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 636:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 637:sieve_extend.c **** 
 638:sieve_extend.c ****     if (copy_word >= destination_stop_word) { 
 639:sieve_extend.c ****         bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose da
 640:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 641:sieve_extend.c ****                                 & keepmask(copy_start) & chopmask(destination_stop);
 642:sieve_extend.c ****         return; // rapid exit for one word variant
 643:sieve_extend.c ****     }
 644:sieve_extend.c **** 
 645:sieve_extend.c ****     bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose data
 646:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 647:sieve_extend.c ****                                 & keepmask(copy_start);
 648:sieve_extend.c **** 
 649:sieve_extend.c ****     copy_word++;
 650:sieve_extend.c **** 
 651:sieve_extend.c ****     debug printf("..copy distance %ju\n",(uintmax_t) copy_word - (uintmax_t) source_word);
 652:sieve_extend.c ****     if (((copy_word - source_word) > forward_distance)) {
 653:sieve_extend.c ****         // shiftvec(&bitarray[copy_word], &bitarray[source_word],size_word,shift );
 654:sieve_extend.c ****         
 655:sieve_extend.c ****         bitword_t* __restrict copy_ptr   = &bitarray[copy_word];
 656:sieve_extend.c ****         bitword_t* __restrict source_ptr = &bitarray[source_word];
 657:sieve_extend.c ****         // bitword_t* copy_ptr   = &bitarray[copy_word];
 658:sieve_extend.c ****         // bitword_t* source_ptr = &bitarray[source_word];
 659:sieve_extend.c ****         bitword_t* __restrict dest_ptr   = &bitarray[destination_stop_word];
 660:sieve_extend.c ****         long size_word_ptr   = dest_ptr - copy_ptr;
 661:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 23


 662:sieve_extend.c ****         #pragma ivdep 
 663:sieve_extend.c ****         for (long i = 0; (i+forward_distance) < size_word_ptr; i+=forward_distance, copy_ptr+=forwa
 664:sieve_extend.c ****             #pragma ivdep
 665:sieve_extend.c ****             for (counter_t j = 0; j < forward_distance; ++j) 
 666:sieve_extend.c ****                 *(copy_ptr+j)  = (*(source_ptr+j  ) >> shift_flipped); 
 667:sieve_extend.c ****             #pragma ivdep
 668:sieve_extend.c ****             for (counter_t j = 0; j < forward_distance; ++j) 
 669:sieve_extend.c ****                 *(copy_ptr+j) |= (*(source_ptr+j+1) << shift);
 670:sieve_extend.c ****         }
 671:sieve_extend.c **** 
 672:sieve_extend.c ****         size_word_ptr = dest_ptr - copy_ptr;
 673:sieve_extend.c ****         #pragma ivdep 
 674:sieve_extend.c ****         for (counter_t i=0; i <= size_word_ptr; i++)
 675:sieve_extend.c ****             *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);
 676:sieve_extend.c **** 
 677:sieve_extend.c ****         // #pragma GCC ivdep
 678:sieve_extend.c ****         // for (; i <= size_word; i++) 
 679:sieve_extend.c ****         //     *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);
 680:sieve_extend.c ****     }
 681:sieve_extend.c ****     else {
 682:sieve_extend.c ****         register counter_t i = 0;
 683:sieve_extend.c ****         bitword_t* copy_ptr   = &bitarray[copy_word];
 684:sieve_extend.c ****         bitword_t* source_ptr = &bitarray[source_word];
 685:sieve_extend.c ****         bitword_t* dest_ptr   = &bitarray[destination_stop_word];
 686:sieve_extend.c ****         long size_word_ptr   = dest_ptr - copy_ptr;
 687:sieve_extend.c ****         for (; i <= size_word_ptr; i++)
 688:sieve_extend.c ****             *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);
 689:sieve_extend.c ****     }
 690:sieve_extend.c **** 
 691:sieve_extend.c ****     // for (; i <= size_word; i++) 
 692:sieve_extend.c ****     //     *(copy_ptr+i) = (*(source_ptr+i) >> shift_flipped) | (*(source_ptr+i+1) << shift);
 693:sieve_extend.c **** 
 694:sieve_extend.c ****     // for (; i <= size_word; i++) 
 695:sieve_extend.c ****     //     bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_wo
 696:sieve_extend.c **** 
 697:sieve_extend.c ****     // for (; copy_word <= destination_stop_word; copy_word++, source_word++ ) 
 698:sieve_extend.c ****     //     bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1
 699:sieve_extend.c **** }
 700:sieve_extend.c **** 
 701:sieve_extend.c **** static inline counter_t extendSieve_shiftleft_unrolled(bitword_t* bitarray, const counter_t aligned
 702:sieve_extend.c ****     const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_copy_word - 2) : 0; // s
 703:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 704:sieve_extend.c ****     counter_t distance = 0;
 705:sieve_extend.c ****     while (copy_word < fast_loop_stop_word) {
 706:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 707:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 708:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 709:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 710:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 711:sieve_extend.c ****         copy_word += 2;
 712:sieve_extend.c ****         source_word += 2;
 713:sieve_extend.c ****         distance += 2;
 714:sieve_extend.c ****     }
 715:sieve_extend.c ****     return distance;
 716:sieve_extend.c **** }
 717:sieve_extend.c **** 
 718:sieve_extend.c **** //static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source_start, const counte
GAS LISTING /tmp/ccrNbbzt.s 			page 24


 719:sieve_extend.c **** //    const bitword_t* destination_stop_ptr = &bitarray[wordindex(destination_stop)];
 720:sieve_extend.c **** //    const counter_t copy_start = source_start + size;
 721:sieve_extend.c **** //    register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
 722:sieve_extend.c **** //    register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 723:sieve_extend.c **** //    register bitword_t* source_ptr = &bitarray[wordindex(source_start)];
 724:sieve_extend.c **** //    register bitword_t* copy_ptr = &bitarray[wordindex(copy_start)];
 725:sieve_extend.c **** //    const bitword_t* aligned_copy_ptr = min(source_ptr + size, destination_stop_ptr); // after <<
 726:sieve_extend.c **** //
 727:sieve_extend.c **** //    *copy_ptr |= ((*source_ptr >> shift) | (*(source_ptr+1) << shift_flipped)) & ~chopmask2(copy_
 728:sieve_extend.c **** //    copy_ptr++;
 729:sieve_extend.c **** //    source_ptr++;
 730:sieve_extend.c **** //
 731:sieve_extend.c **** //    while (copy_ptr+3 <= aligned_copy_ptr) {
 732:sieve_extend.c **** //        bitword_t source0 = *source_ptr >> shift;
 733:sieve_extend.c **** //        bitword_t source1 = *(source_ptr+1);
 734:sieve_extend.c **** //        *copy_ptr = (source0) | (source1 << shift_flipped);
 735:sieve_extend.c **** //        bitword_t source2 = *(source_ptr+2);
 736:sieve_extend.c **** //        *(copy_ptr+1) = (source1 >> shift) | (source2 << shift_flipped);
 737:sieve_extend.c **** //        bitword_t source3 = *(source_ptr+3);
 738:sieve_extend.c **** //        *(copy_ptr+2) = (source2 >> shift) | (source3 << shift_flipped);
 739:sieve_extend.c **** //
 740:sieve_extend.c **** //        copy_ptr+=3;
 741:sieve_extend.c **** //        source_ptr+=3;
 742:sieve_extend.c **** //    }
 743:sieve_extend.c **** //
 744:sieve_extend.c **** //    while (copy_ptr <= aligned_copy_ptr) {
 745:sieve_extend.c **** //        register bitword_t source0 = *source_ptr >> shift;
 746:sieve_extend.c **** //        source_ptr++;
 747:sieve_extend.c **** //        register bitword_t source1 = *source_ptr << shift_flipped;
 748:sieve_extend.c **** //        *copy_ptr = source0 | source1;
 749:sieve_extend.c **** //        copy_ptr++;
 750:sieve_extend.c **** //    }
 751:sieve_extend.c **** //
 752:sieve_extend.c **** //    if (copy_ptr >= destination_stop_ptr) return;
 753:sieve_extend.c **** //
 754:sieve_extend.c **** //    source_ptr = copy_ptr - size; // recalibrate
 755:sieve_extend.c **** //    const size_t memsize = (size_t)size*sizeof(bitword_t);
 756:sieve_extend.c **** //     while (copy_ptr + size <= destination_stop_ptr) {
 757:sieve_extend.c **** //         memcpy(copy_ptr, source_ptr, memsize );
 758:sieve_extend.c **** //         copy_ptr += size;
 759:sieve_extend.c **** //     }
 760:sieve_extend.c **** //
 761:sieve_extend.c **** //    while (copy_ptr <= destination_stop_ptr) {
 762:sieve_extend.c **** //        // *copy_ptr++ = *source_ptr++;
 763:sieve_extend.c **** //        *copy_ptr = *source_ptr;
 764:sieve_extend.c **** //        copy_ptr++;
 765:sieve_extend.c **** //        source_ptr++;
 766:sieve_extend.c **** //    }
 767:sieve_extend.c **** //
 768:sieve_extend.c **** //}
 769:sieve_extend.c **** 
 770:sieve_extend.c **** 
 771:sieve_extend.c **** static void extendSieve_shiftright_ivdep(bitword_t* bitarray, const counter_t source_start, const c
 515              		.loc 1 771 149 is_stmt 1 view -0
 516              		.cfi_startproc
 772:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
 517              		.loc 1 772 5 view .LVU136
GAS LISTING /tmp/ccrNbbzt.s 			page 25


 773:sieve_extend.c ****    
 774:sieve_extend.c ****     const counter_t destination_stop_word = wordindex(destination_stop);
 518              		.loc 1 774 5 view .LVU137
 519              	# sieve_extend.c:771: static void extendSieve_shiftright_ivdep(bitword_t* bitarray, const counter_t
 771:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
 520              		.loc 1 771 149 is_stmt 0 view .LVU138
 521 0210 55       		push	rbp	#
 522              		.cfi_def_cfa_offset 16
 523              		.cfi_offset 6, -16
 524              	# sieve_extend.c:775:     const counter_t copy_start = source_start + size;
 775:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 525              		.loc 1 775 21 view .LVU139
 526 0211 4C8D0416 		lea	r8, [rsi+rdx]	# copy_start,
 527              	# sieve_extend.c:774:     const counter_t destination_stop_word = wordindex(destination_stop);
 774:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 528              		.loc 1 774 21 view .LVU140
 529 0215 4889C8   		mov	rax, rcx	# destination_stop_word, destination_stop
 530              	# sieve_extend.c:771: static void extendSieve_shiftright_ivdep(bitword_t* bitarray, const counter_t
 771:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
 531              		.loc 1 771 149 view .LVU141
 532 0218 4889E5   		mov	rbp, rsp	#,
 533              		.cfi_def_cfa_register 6
 534 021b 4157     		push	r15	#
 535              	# sieve_extend.c:774:     const counter_t destination_stop_word = wordindex(destination_stop);
 774:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 536              		.loc 1 774 21 view .LVU142
 537 021d 48C1E806 		shr	rax, 6	# destination_stop_word,
 538              	# sieve_extend.c:776:     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_ca
 776:sieve_extend.c ****     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
 539              		.loc 1 776 39 view .LVU143
 540 0221 4D89C1   		mov	r9, r8	# _4, copy_start
 541              	# sieve_extend.c:771: static void extendSieve_shiftright_ivdep(bitword_t* bitarray, const counter_t
 771:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
 542              		.loc 1 771 149 view .LVU144
 543 0224 4156     		push	r14	#
 544              	# sieve_extend.c:779:     register counter_t copy_word = wordindex(copy_start);
 777:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 778:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 779:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 545              		.loc 1 779 24 view .LVU145
 546 0226 49C1E806 		shr	r8, 6	# copy_word,
 547              	# sieve_extend.c:776:     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_ca
 776:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 548              		.loc 1 776 39 view .LVU146
 549 022a 4183E13F 		and	r9d, 63	# _4,
 550              	# sieve_extend.c:771: static void extendSieve_shiftright_ivdep(bitword_t* bitarray, const counter_t
 771:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
 551              		.loc 1 771 149 view .LVU147
 552 022e 4155     		push	r13	#
 553              	# sieve_extend.c:776:     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_ca
 776:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 554              		.loc 1 776 31 view .LVU148
 555 0230 4D89CB   		mov	r11, r9	# shift, _4
 556 0233 F7D1     		not	ecx	# tmp308
 557              	.LVL39:
 558              	# sieve_extend.c:771: static void extendSieve_shiftright_ivdep(bitword_t* bitarray, const counter_t
 771:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
GAS LISTING /tmp/ccrNbbzt.s 			page 26


 559              		.loc 1 771 149 view .LVU149
 560 0235 4154     		push	r12	#
 561 0237 53       		push	rbx	#
 562              		.cfi_offset 15, -24
 563              		.cfi_offset 14, -32
 564              		.cfi_offset 13, -40
 565              		.cfi_offset 12, -48
 566              		.cfi_offset 3, -56
 567 0238 4A8D1CC5 		lea	rbx, 0[0+r8*8]	# _176,
 567      00000000 
 568 0240 4C8D2C1F 		lea	r13, [rdi+rbx]	# _177,
 569 0244 4883E4E0 		and	rsp, -32	#,
 570              	.LVL40:
 775:sieve_extend.c ****     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
 571              		.loc 1 775 5 is_stmt 1 view .LVU150
 776:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 572              		.loc 1 776 5 view .LVU151
 573              	# sieve_extend.c:774:     const counter_t destination_stop_word = wordindex(destination_stop);
 774:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 574              		.loc 1 774 21 is_stmt 0 view .LVU152
 575 0248 48894424 		mov	QWORD PTR -8[rsp], rax	# %sfp, destination_stop_word
 575      F8
 576              	.LVL41:
 577              	# sieve_extend.c:776:     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_ca
 776:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 578              		.loc 1 776 67 view .LVU153
 579 024d 4889F0   		mov	rax, rsi	# _5, source_start
 580 0250 83E03F   		and	eax, 63	# _5,
 581              	.LVL42:
 777:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 582              		.loc 1 777 5 is_stmt 1 view .LVU154
 778:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 583              		.loc 1 778 5 view .LVU155
 584              	# sieve_extend.c:778:     register counter_t source_word = wordindex(source_start);
 778:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 585              		.loc 1 778 24 is_stmt 0 view .LVU156
 586 0253 48C1EE06 		shr	rsi, 6	# source_start,
 587              	.LVL43:
 588              	# sieve_extend.c:776:     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_ca
 776:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 589              		.loc 1 776 31 view .LVU157
 590 0257 4929C3   		sub	r11, rax	# shift, _5
 591              	.LVL44:
 776:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 592              		.loc 1 776 31 view .LVU158
 593 025a 4C8D24F5 		lea	r12, 0[0+rsi*8]	# _179,
 593      00000000 
 594 0262 4D8B7500 		mov	r14, QWORD PTR 0[r13]	# pretmp_178, *_177
 595              	# sieve_extend.c:777:     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 777:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 596              		.loc 1 777 31 view .LVU159
 597 0266 4883C040 		add	rax, 64	# tmp301,
 598              	.LVL45:
 777:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 599              		.loc 1 777 31 view .LVU160
 600 026a 4C29C8   		sub	rax, r9	# shift_flipped, _4
 601              	.LVL46:
GAS LISTING /tmp/ccrNbbzt.s 			page 27


 777:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 602              		.loc 1 777 31 view .LVU161
 603 026d 4E8D1427 		lea	r10, [rdi+r12]	# _180,
 604 0271 C442FBF7 		shrx	r15, r14, rax	# tmp305, pretmp_178, shift_flipped
 604      FE
 605              	# sieve_extend.c:778:     register counter_t source_word = wordindex(source_start);
 778:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 606              		.loc 1 778 24 view .LVU162
 607 0276 48897424 		mov	QWORD PTR -16[rsp], rsi	# %sfp, source_word
 607      F0
 608              	.LVL47:
 609              		.loc 1 779 5 is_stmt 1 view .LVU163
 780:sieve_extend.c **** 
 781:sieve_extend.c ****     if (copy_word >= destination_stop_word) { 
 610              		.loc 1 781 5 view .LVU164
 611 027b C4C2A1F7 		shlx	rsi, QWORD PTR [r10], r11	# tmp303, *_180, shift
 611      32
 612              	.LVL48:
 613              		.loc 1 781 5 is_stmt 0 view .LVU165
 614 0280 4C09FE   		or	rsi, r15	# _186, tmp305
 615 0283 49C7C7FF 		mov	r15, -1	# tmp307,
 615      FFFFFF
 616 028a C442B1F7 		shlx	r9, r15, r9	# _189, tmp307, _4
 616      CF
 617              	.LVL49:
 618              		.loc 1 781 5 view .LVU166
 619 028f 44895C24 		mov	DWORD PTR -20[rsp], r11d	# %sfp, shift
 619      EC
 620 0294 894424E8 		mov	DWORD PTR -24[rsp], eax	# %sfp, shift_flipped
 621 0298 C442F3F7 		shrx	r15, r15, rcx	# _193, tmp307, tmp308
 621      FF
 622              	# sieve_extend.c:781:     if (copy_word >= destination_stop_word) { 
 623              		.loc 1 781 8 view .LVU167
 624 029d 4C394424 		cmp	QWORD PTR -8[rsp], r8	# %sfp, copy_word
 624      F8
 625 02a2 0F862003 		jbe	.L75	#,
 625      0000
 782:sieve_extend.c ****         bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose da
 783:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 784:sieve_extend.c ****                                 & keepmask(copy_start) & chopmask(destination_stop);
 785:sieve_extend.c ****         return; // rapid exit for one word variant
 786:sieve_extend.c ****     }
 787:sieve_extend.c **** 
 788:sieve_extend.c ****     bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose data
 626              		.loc 1 788 5 is_stmt 1 view .LVU168
 627              	# sieve_extend.c:790:                                 & keepmask(copy_start);
 789:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 790:sieve_extend.c ****                                 & keepmask(copy_start);
 628              		.loc 1 790 33 is_stmt 0 view .LVU169
 629 02a8 4C21CE   		and	rsi, r9	# tmp314, _189
 630              	# sieve_extend.c:788:     bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start
 788:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 631              		.loc 1 788 25 view .LVU170
 632 02ab 4C09F6   		or	rsi, r14	# tmp315, pretmp_178
 633 02ae 49897500 		mov	QWORD PTR 0[r13], rsi	# *_177, tmp315
 791:sieve_extend.c **** 
 792:sieve_extend.c ****     copy_word++;
GAS LISTING /tmp/ccrNbbzt.s 			page 28


 634              		.loc 1 792 5 is_stmt 1 view .LVU171
 635              	# sieve_extend.c:792:     copy_word++;
 636              		.loc 1 792 14 is_stmt 0 view .LVU172
 637 02b2 498D4801 		lea	rcx, 1[r8]	# copy_word,
 638              	.LVL50:
 793:sieve_extend.c **** 
 794:sieve_extend.c ****     debug { printf("...start - %ju - %ju - end\n",(uintmax_t)wordindex(copy_start), (uintmax_t)dest
 639              		.loc 1 794 5 is_stmt 1 view .LVU173
 795:sieve_extend.c **** 
 796:sieve_extend.c ****     if (size >= WORD_SIZE_counter) {
 640              		.loc 1 796 5 view .LVU174
 641              	# sieve_extend.c:796:     if (size >= WORD_SIZE_counter) {
 642              		.loc 1 796 8 is_stmt 0 view .LVU175
 643 02b6 4883FA3F 		cmp	rdx, 63	# size,
 644 02ba 0F868801 		jbe	.L31	#,
 644      0000
 645              	.LBB276:
 797:sieve_extend.c ****         register const counter_t loop_distance = destination_stop_word - copy_word;
 646              		.loc 1 797 9 is_stmt 1 view .LVU176
 647              	.LVL51:
 798:sieve_extend.c **** 
 799:sieve_extend.c ****         #pragma unroll
 800:sieve_extend.c ****         #pragma ivdep
 801:sieve_extend.c ****         for (register counter_t i = 0; i <loop_distance; i++) {
 648              		.loc 1 801 9 view .LVU177
 649              	.LBB277:
 650              		.loc 1 801 14 view .LVU178
 651              		.loc 1 801 40 view .LVU179
 652              	# sieve_extend.c:801:         for (register counter_t i = 0; i <loop_distance; i++) {
 653              		.loc 1 801 9 is_stmt 0 view .LVU180
 654 02c0 488B5424 		mov	rdx, QWORD PTR -8[rsp]	# loop_distance, %sfp
 654      F8
 655              	.LVL52:
 656              		.loc 1 801 9 view .LVU181
 657 02c5 488B7424 		mov	rsi, QWORD PTR -16[rsp]	# source_word, %sfp
 657      F0
 658 02ca 4829CA   		sub	rdx, rcx	# loop_distance, copy_word
 659              	.LVL53:
 660              		.loc 1 801 9 view .LVU182
 661 02cd 0F842801 		je	.L37	#,
 661      0000
 662 02d3 4C8D6B08 		lea	r13, 8[rbx]	# tmp319,
 663 02d7 498D7424 		lea	rsi, 40[r12]	# tmp320,
 663      28
 664 02dc 4939F5   		cmp	r13, rsi	# tmp319, tmp320
 665 02df 410F9DC1 		setge	r9b	#, tmp322
 666 02e3 4D8D7424 		lea	r14, 8[r12]	# tmp324,
 666      08
 667 02e8 4883C328 		add	rbx, 40	# tmp323,
 668 02ec 4C39F3   		cmp	rbx, r14	# tmp323, tmp324
 669 02ef 400F9EC6 		setle	sil	#, tmp326
 670 02f3 4109F1   		or	r9d, esi	# tmp327, tmp326
 671 02f6 498D7424 		lea	rsi, 32[r12]	# tmp328,
 671      20
 672 02fb 4C39EE   		cmp	rsi, r13	# tmp328, tmp319
 673 02fe 400F9EC6 		setle	sil	#, tmp331
 674 0302 4C39E3   		cmp	rbx, r12	# tmp323, _179
GAS LISTING /tmp/ccrNbbzt.s 			page 29


 675 0305 0F9EC3   		setle	bl	#, tmp334
 676 0308 09DE     		or	esi, ebx	# tmp335, tmp334
 677 030a 4184F1   		test	r9b, sil	# tmp327, tmp335
 678 030d 0F84F202 		je	.L34	#,
 678      0000
 679 0313 488D72FF 		lea	rsi, -1[rdx]	# tmp337,
 680 0317 4883FE03 		cmp	rsi, 3	# tmp337,
 681 031b 0F86E402 		jbe	.L34	#,
 681      0000
 682 0321 4989D0   		mov	r8, rdx	# bnd.159, loop_distance
 683 0324 49C1E802 		shr	r8, 2	# bnd.159,
 684 0328 C5F96E5C 		vmovd	xmm3, DWORD PTR -24[rsp]	# _184, %sfp
 684      24E8
 685 032e C5F96E54 		vmovd	xmm2, DWORD PTR -20[rsp]	# _182, %sfp
 685      24EC
 686 0334 4901FE   		add	r14, rdi	# vectp.167, bitarray
 687 0337 4901FD   		add	r13, rdi	# vectp.172, bitarray
 688 033a 49C1E005 		sal	r8, 5	# _338,
 689 033e 31F6     		xor	esi, esi	# ivtmp.206
 690              	.LVL54:
 691              		.p2align 4,,10
 692              		.p2align 3
 693              	.L35:
 802:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 694              		.loc 1 802 13 is_stmt 1 discriminator 3 view .LVU183
 695              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 696              		.loc 1 802 62 is_stmt 0 discriminator 3 view .LVU184
 697 0340 C4C17E6F 		vmovdqu	ymm6, YMMWORD PTR [r10+rsi]	# tmp487, MEM[base: _180, index: ivtmp.206_336, offset: 0B]
 697      3432
 698              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 699              		.loc 1 802 109 discriminator 3 view .LVU185
 700 0346 C4C17E6F 		vmovdqu	ymm7, YMMWORD PTR [r14+rsi]	# tmp488, MEM[base: vectp.167_265, index: ivtmp.206_336, offse
 700      3C36
 701              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 702              		.loc 1 802 62 discriminator 3 view .LVU186
 703 034c C5CDD3C3 		vpsrlq	ymm0, ymm6, xmm3	# vect__49.165, tmp487, _184
 704              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 705              		.loc 1 802 109 discriminator 3 view .LVU187
 706 0350 C5C5F3CA 		vpsllq	ymm1, ymm7, xmm2	# vect__54.169, tmp488, _182
 707              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 708              		.loc 1 802 80 discriminator 3 view .LVU188
 709 0354 C5FDEBC1 		vpor	ymm0, ymm0, ymm1	# vect__58.170, vect__49.165, vect__54.169
 710              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 711              		.loc 1 802 35 discriminator 3 view .LVU189
 712 0358 C4C17E7F 		vmovdqu	YMMWORD PTR 0[r13+rsi], ymm0	# MEM[base: vectp.172_273, index: ivtmp.206_336, offset: 0B],
 712      443500
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 713              		.loc 1 801 58 is_stmt 1 discriminator 3 view .LVU190
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 714              		.loc 1 801 40 discriminator 3 view .LVU191
 715 035f 4883C620 		add	rsi, 32	# ivtmp.206,
 716 0363 4C39C6   		cmp	rsi, r8	# ivtmp.206, _338
 717 0366 75D8     		jne	.L35	#,
 718 0368 4C8B7424 		mov	r14, QWORD PTR -16[rsp]	# source_word, %sfp
 718      F0
 719 036d 4989D0   		mov	r8, rdx	# niters_vector_mult_vf.160, loop_distance
 720 0370 4983E0FC 		and	r8, -4	# niters_vector_mult_vf.160,
GAS LISTING /tmp/ccrNbbzt.s 			page 30


 721 0374 498D3416 		lea	rsi, [r14+rdx]	# source_word,
 722 0378 F6C203   		test	dl, 3	# loop_distance,
 723 037b 0F846F02 		je	.L69	#,
 723      0000
 724              	.LVL55:
 725              		.loc 1 802 13 view .LVU192
 726              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 727              		.loc 1 802 58 is_stmt 0 view .LVU193
 728 0381 4F8D1406 		lea	r10, [r14+r8]	# tmp350,
 729              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 730              		.loc 1 802 109 view .LVU194
 731 0385 C422A1F7 		shlx	r9, QWORD PTR 8[rdi+r10*8], r11	# tmp352, *_286, shift
 731      4CD708
 732              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 733              		.loc 1 802 62 view .LVU195
 734 038c 4E8B14D7 		mov	r10, QWORD PTR [rdi+r10*8]	# *_281, *_281
 735              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 736              		.loc 1 802 21 view .LVU196
 737 0390 4A8D1C01 		lea	rbx, [rcx+r8]	# tmp351,
 738              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 739              		.loc 1 802 62 view .LVU197
 740 0394 C442FBF7 		shrx	r10, r10, rax	# tmp354, *_281, shift_flipped
 740      D2
 741              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 742              		.loc 1 802 80 view .LVU198
 743 0399 4D09D1   		or	r9, r10	# tmp356, tmp354
 744 039c 4C890CDF 		mov	QWORD PTR [rdi+rbx*8], r9	# *_291, tmp356
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 745              		.loc 1 801 58 is_stmt 1 view .LVU199
 746              	# sieve_extend.c:801:         for (register counter_t i = 0; i <loop_distance; i++) {
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 747              		.loc 1 801 59 is_stmt 0 view .LVU200
 748 03a0 4D8D4801 		lea	r9, 1[r8]	# i,
 749              	.LVL56:
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 750              		.loc 1 801 40 is_stmt 1 view .LVU201
 751              	# sieve_extend.c:801:         for (register counter_t i = 0; i <loop_distance; i++) {
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 752              		.loc 1 801 9 is_stmt 0 view .LVU202
 753 03a4 4C39CA   		cmp	rdx, r9	# loop_distance, i
 754 03a7 0F864302 		jbe	.L69	#,
 754      0000
 755              		.loc 1 802 13 is_stmt 1 view .LVU203
 756              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 757              		.loc 1 802 58 is_stmt 0 view .LVU204
 758 03ad 4B8D1C0E 		lea	rbx, [r14+r9]	# tmp357,
 759              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 760              		.loc 1 802 109 view .LVU205
 761 03b1 C462A1F7 		shlx	r10, QWORD PTR 8[rdi+rbx*8], r11	# tmp359, *_304, shift
 761      54DF08
 762              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 763              		.loc 1 802 62 view .LVU206
 764 03b8 488B1CDF 		mov	rbx, QWORD PTR [rdi+rbx*8]	# *_299, *_299
 765              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 766              		.loc 1 802 21 view .LVU207
 767 03bc 4901C9   		add	r9, rcx	# tmp358, copy_word
 768              	.LVL57:
GAS LISTING /tmp/ccrNbbzt.s 			page 31


 769              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 770              		.loc 1 802 62 view .LVU208
 771 03bf C4E2FBF7 		shrx	rbx, rbx, rax	# tmp361, *_299, shift_flipped
 771      DB
 772              	# sieve_extend.c:801:         for (register counter_t i = 0; i <loop_distance; i++) {
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 773              		.loc 1 801 59 view .LVU209
 774 03c4 4983C002 		add	r8, 2	# i,
 775              	.LVL58:
 776              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 777              		.loc 1 802 80 view .LVU210
 778 03c8 4909DA   		or	r10, rbx	# tmp363, tmp361
 779 03cb 4E8914CF 		mov	QWORD PTR [rdi+r9*8], r10	# *_309, tmp363
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 780              		.loc 1 801 58 is_stmt 1 view .LVU211
 781              	.LVL59:
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 782              		.loc 1 801 40 view .LVU212
 783              	# sieve_extend.c:801:         for (register counter_t i = 0; i <loop_distance; i++) {
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 784              		.loc 1 801 9 is_stmt 0 view .LVU213
 785 03cf 4C39C2   		cmp	rdx, r8	# loop_distance, i
 786 03d2 0F861802 		jbe	.L69	#,
 786      0000
 787              		.loc 1 802 13 is_stmt 1 view .LVU214
 788              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 789              		.loc 1 802 58 is_stmt 0 view .LVU215
 790 03d8 4C89F2   		mov	rdx, r14	# source_word, source_word
 791              	.LVL60:
 792              		.loc 1 802 58 view .LVU216
 793 03db 4C01C2   		add	rdx, r8	# source_word, i
 794              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 795              		.loc 1 802 109 view .LVU217
 796 03de C462A1F7 		shlx	r11, QWORD PTR 8[rdi+rdx*8], r11	# tmp366, *_245, shift
 796      5CD708
 797              	.LVL61:
 798              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 799              		.loc 1 802 62 view .LVU218
 800 03e5 488B14D7 		mov	rdx, QWORD PTR [rdi+rdx*8]	# *_240, *_240
 801              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 802              		.loc 1 802 21 view .LVU219
 803 03e9 4901C8   		add	r8, rcx	# tmp365, copy_word
 804              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 805              		.loc 1 802 62 view .LVU220
 806 03ec C4E2FBF7 		shrx	rax, rdx, rax	# tmp368, *_240, shift_flipped
 806      C2
 807              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 808              		.loc 1 802 80 view .LVU221
 809 03f1 4C09D8   		or	rax, r11	# tmp370, tmp366
 810 03f4 4A8904C7 		mov	QWORD PTR [rdi+r8*8], rax	# *_250, tmp370
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 811              		.loc 1 801 58 is_stmt 1 view .LVU222
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 812              		.loc 1 801 40 view .LVU223
 813 03f8 C5F877   		vzeroupper
 814              	.LVL62:
 815              	.L37:
GAS LISTING /tmp/ccrNbbzt.s 			page 32


 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 816              		.loc 1 801 40 is_stmt 0 view .LVU224
 817              	.LBE277:
 803:sieve_extend.c ****         }
 804:sieve_extend.c ****         source_word += loop_distance; copy_word+= loop_distance;
 818              		.loc 1 804 9 is_stmt 1 view .LVU225
 819              		.loc 1 804 39 view .LVU226
 820              		.loc 1 804 39 is_stmt 0 view .LVU227
 821              	.LBE276:
 805:sieve_extend.c ****     }
 806:sieve_extend.c **** 
 807:sieve_extend.c ****     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 822              		.loc 1 807 12 is_stmt 1 view .LVU228
 823 03fb 488B4C24 		mov	rcx, QWORD PTR -8[rsp]	# destination_stop_word, %sfp
 823      F8
 824 0400 48C1E603 		sal	rsi, 3	# _225,
 825 0404 4C8D7101 		lea	r14, 1[rcx]	# _198,
 826 0408 4D89F4   		mov	r12, r14	# _175, _198
 827              	.LBB279:
 828              	# sieve_extend.c:804:         source_word += loop_distance; copy_word+= loop_distance;
 804:sieve_extend.c ****     }
 829              		.loc 1 804 21 is_stmt 0 view .LVU229
 830 040b 4531ED   		xor	r13d, r13d	# _173
 831              	.LVL63:
 832              	.L33:
 804:sieve_extend.c ****     }
 833              		.loc 1 804 21 view .LVU230
 834 040e 4C8B4424 		mov	r8, QWORD PTR -8[rsp]	# destination_stop_word, %sfp
 834      F8
 835 0413 448B4C24 		mov	r9d, DWORD PTR -20[rsp]	# _182, %sfp
 835      EC
 836 0418 448B5424 		mov	r10d, DWORD PTR -24[rsp]	# _184, %sfp
 836      E8
 837 041d 4801FE   		add	rsi, rdi	# ivtmp.179, bitarray
 838              		.p2align 4,,10
 839              		.p2align 3
 840              	.L45:
 804:sieve_extend.c ****     }
 841              		.loc 1 804 21 view .LVU231
 842              	.LBE279:
 808:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 843              		.loc 1 808 9 is_stmt 1 view .LVU232
 844              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 845              		.loc 1 808 99 is_stmt 0 view .LVU233
 846 0420 C4E2B1F7 		shlx	rax, QWORD PTR 8[rsi], r9	# tmp419, MEM[base: _318, offset: 8B], _182
 846      4608
 847              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 848              		.loc 1 808 54 view .LVU234
 849 0426 C4E2ABF7 		shrx	rdx, QWORD PTR [rsi], r10	# tmp421, MEM[base: _318, offset: 0B], _184
 849      16
 850              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 851              		.loc 1 808 72 view .LVU235
 852 042b 4809D0   		or	rax, rdx	# tmp423, tmp421
 853 042e 488904CF 		mov	QWORD PTR [rdi+rcx*8], rax	# MEM[base: bitarray_90(D), index: copy_word_155, step: 8, offset: 
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 854              		.loc 1 807 48 is_stmt 1 view .LVU236
 855              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
GAS LISTING /tmp/ccrNbbzt.s 			page 33


 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 856              		.loc 1 807 57 is_stmt 0 view .LVU237
 857 0432 48FFC1   		inc	rcx	# copy_word
 858              	.LVL64:
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 859              		.loc 1 807 12 is_stmt 1 view .LVU238
 860 0435 4883C608 		add	rsi, 8	# ivtmp.179,
 861              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 862              		.loc 1 807 5 is_stmt 0 view .LVU239
 863 0439 4939C8   		cmp	r8, rcx	# destination_stop_word, copy_word
 864 043c 73E2     		jnb	.L45	#,
 865 043e E95E0100 		jmp	.L46	#
 865      00
 866              	.LVL65:
 867              		.p2align 4,,10
 868 0443 0F1F4400 		.p2align 3
 868      00
 869              	.L31:
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 870              		.loc 1 807 12 is_stmt 1 discriminator 1 view .LVU240
 871              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 872              		.loc 1 807 5 is_stmt 0 discriminator 1 view .LVU241
 873 0448 488B5C24 		mov	rbx, QWORD PTR -8[rsp]	# destination_stop_word, %sfp
 873      F8
 874 044d 4839CB   		cmp	rbx, rcx	# destination_stop_word, copy_word
 875 0450 0F825A01 		jb	.L41	#,
 875      0000
 876 0456 488B7424 		mov	rsi, QWORD PTR -16[rsp]	# source_word, %sfp
 876      F0
 877 045b 4989DD   		mov	r13, rbx	# _173, destination_stop_word
 878 045e 488D14F5 		lea	rdx, 40[0+rsi*8]	# _168,
 878      28000000 
 879              	.LVL66:
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 880              		.loc 1 807 5 discriminator 1 view .LVU242
 881 0466 48895424 		mov	QWORD PTR -32[rsp], rdx	# %sfp, _168
 881      E0
 882 046b 488D14CD 		lea	rdx, 0[0+rcx*8]	# _166,
 882      00000000 
 883 0473 4C8D4A20 		lea	r9, 32[rdx]	# tmp380,
 884 0477 48C1E603 		sal	rsi, 3	# _225,
 885 047b 4929CD   		sub	r13, rcx	# _173, copy_word
 886 047e 4C39CE   		cmp	rsi, r9	# _225, tmp380
 887 0481 410F9DC2 		setge	r10b	#, tmp382
 888 0485 483B5424 		cmp	rdx, QWORD PTR -32[rsp]	# _166, %sfp
 888      E0
 889 048a 410F9DC1 		setge	r9b	#, tmp384
 890 048e 4508CA   		or	r10b, r9b	# tmp382, tmp384
 891 0491 4C8D7301 		lea	r14, 1[rbx]	# _198,
 892 0495 4D8D6002 		lea	r12, 2[r8]	# _175,
 893 0499 0F846FFF 		je	.L33	#,
 893      FFFF
 894 049f 4983FD03 		cmp	r13, 3	# _173,
 895 04a3 410F97C2 		seta	r10b	#, tmp387
 896 04a7 4D39F4   		cmp	r12, r14	# _175, _198
GAS LISTING /tmp/ccrNbbzt.s 			page 34


 897 04aa 410F96C1 		setbe	r9b	#, tmp389
 898 04ae 4584CA   		test	r10b, r9b	# tmp387, tmp389
 899 04b1 0F8457FF 		je	.L33	#,
 899      FFFF
 900 04b7 4C29C3   		sub	rbx, r8	# tmp391, copy_word
 901 04ba 4D39F4   		cmp	r12, r14	# _175, _198
 902 04bd 41B80100 		mov	r8d, 1	# tmp392,
 902      0000
 903 04c3 490F47D8 		cmova	rbx, r8	# tmp391,, niters.142, tmp392
 904 04c7 4C8B4C24 		mov	r9, QWORD PTR -32[rsp]	# _168, %sfp
 904      E0
 905 04cc C5F96E5C 		vmovd	xmm3, DWORD PTR -24[rsp]	# _184, %sfp
 905      24E8
 906 04d2 4E8D540F 		lea	r10, -32[rdi+r9]	# vectp.152,
 906      E0
 907 04d7 4989D9   		mov	r9, rbx	# bnd.143, niters.142
 908 04da 49C1E902 		shr	r9, 2	# bnd.143,
 909 04de C5F96E54 		vmovd	xmm2, DWORD PTR -20[rsp]	# _182, %sfp
 909      24EC
 910 04e4 4C8D0417 		lea	r8, [rdi+rdx]	# vectp.157,
 911 04e8 4801FE   		add	rsi, rdi	# vectp.148, bitarray
 912 04eb 49C1E105 		sal	r9, 5	# _322,
 913              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 914              		.loc 1 807 5 view .LVU243
 915 04ef 31D2     		xor	edx, edx	# ivtmp.187
 916              	.LVL67:
 917              		.p2align 4,,10
 918 04f1 0F1F8000 		.p2align 3
 918      000000
 919              	.L42:
 920              		.loc 1 808 9 is_stmt 1 discriminator 2 view .LVU244
 921              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 922              		.loc 1 808 99 is_stmt 0 discriminator 2 view .LVU245
 923 04f8 C4C17E6F 		vmovdqu	ymm4, YMMWORD PTR [r10+rdx]	# tmp507, MEM[base: vectp.152_194, index: ivtmp.187_320, offse
 923      2412
 924              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 925              		.loc 1 808 54 discriminator 2 view .LVU246
 926 04fe C5FE6F2C 		vmovdqu	ymm5, YMMWORD PTR [rsi+rdx]	# tmp508, MEM[base: vectp.148_2, index: ivtmp.187_320, offset:
 926      16
 927              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 928              		.loc 1 808 99 discriminator 2 view .LVU247
 929 0503 C5DDF3C2 		vpsllq	ymm0, ymm4, xmm2	# vect__67.154, tmp507, _182
 930              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 931              		.loc 1 808 54 discriminator 2 view .LVU248
 932 0507 C5D5D3CB 		vpsrlq	ymm1, ymm5, xmm3	# vect__62.150, tmp508, _184
 933              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 934              		.loc 1 808 72 discriminator 2 view .LVU249
 935 050b C5FDEBC1 		vpor	ymm0, ymm0, ymm1	# vect__70.155, vect__67.154, vect__62.150
 936              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 937              		.loc 1 808 29 discriminator 2 view .LVU250
 938 050f C4C17E7F 		vmovdqu	YMMWORD PTR [r8+rdx], ymm0	# MEM[base: vectp.157_31, index: ivtmp.187_320, offset: 0B], ve
 938      0410
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 939              		.loc 1 807 48 is_stmt 1 discriminator 2 view .LVU251
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 940              		.loc 1 807 12 discriminator 2 view .LVU252
GAS LISTING /tmp/ccrNbbzt.s 			page 35


 941 0515 4883C220 		add	rdx, 32	# ivtmp.187,
 942 0519 4C39CA   		cmp	rdx, r9	# ivtmp.187, _322
 943 051c 75DA     		jne	.L42	#,
 944 051e 488B7424 		mov	rsi, QWORD PTR -16[rsp]	# source_word, %sfp
 944      F0
 945 0523 4889DA   		mov	rdx, rbx	# niters_vector_mult_vf.144, niters.142
 946 0526 4883E2FC 		and	rdx, -4	# niters_vector_mult_vf.144,
 947 052a 4801D1   		add	rcx, rdx	# tmp.145, niters_vector_mult_vf.144
 948 052d 4801D6   		add	rsi, rdx	# source_word, niters_vector_mult_vf.144
 949 0530 4839DA   		cmp	rdx, rbx	# niters_vector_mult_vf.144, niters.142
 950 0533 0F84C700 		je	.L72	#,
 950      0000
 951              	.LVL68:
 952              		.loc 1 808 9 view .LVU253
 953              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 954              		.loc 1 807 5 is_stmt 0 view .LVU254
 955 0539 488B5C24 		mov	rbx, QWORD PTR -8[rsp]	# destination_stop_word, %sfp
 955      F8
 956              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 957              		.loc 1 808 54 view .LVU255
 958 053e C462FBF7 		shrx	r8, QWORD PTR [rdi+rsi*8], rax	# tmp406, *_61, shift_flipped
 958      04F7
 959              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 960              		.loc 1 808 99 view .LVU256
 961 0544 C4E2A1F7 		shlx	rdx, QWORD PTR 8[rdi+rsi*8], r11	# tmp404, *_66, shift
 961      54F708
 962              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 963              		.loc 1 808 72 view .LVU257
 964 054b 4C09C2   		or	rdx, r8	# tmp408, tmp406
 965              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 966              		.loc 1 807 57 view .LVU258
 967 054e 4C8D4101 		lea	r8, 1[rcx]	# copy_word,
 968              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 969              		.loc 1 808 72 view .LVU259
 970 0552 488914CF 		mov	QWORD PTR [rdi+rcx*8], rdx	# *_70, tmp408
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 971              		.loc 1 807 48 is_stmt 1 view .LVU260
 972              	.LVL69:
 973              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 974              		.loc 1 808 83 is_stmt 0 view .LVU261
 975 0556 4C8D4E01 		lea	r9, 1[rsi]	# _64,
 976              	.LVL70:
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 977              		.loc 1 807 12 is_stmt 1 view .LVU262
 978              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 979              		.loc 1 807 5 is_stmt 0 view .LVU263
 980 055a 4C39C3   		cmp	rbx, r8	# destination_stop_word, copy_word
 981 055d 0F829D00 		jb	.L72	#,
 981      0000
 982              		.loc 1 808 9 is_stmt 1 view .LVU264
 983              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 984              		.loc 1 808 99 is_stmt 0 view .LVU265
 985 0563 C4A2A1F7 		shlx	rdx, QWORD PTR 8[rdi+r9*8], r11	# tmp409, *_54, shift
 985      54CF08
GAS LISTING /tmp/ccrNbbzt.s 			page 36


 986              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 987              		.loc 1 808 54 view .LVU266
 988 056a 4E8B0CCF 		mov	r9, QWORD PTR [rdi+r9*8]	# *_49, *_49
 989              	.LVL71:
 990              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 991              		.loc 1 807 57 view .LVU267
 992 056e 4883C102 		add	rcx, 2	# copy_word,
 993              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 994              		.loc 1 808 54 view .LVU268
 995 0572 C442FBF7 		shrx	r9, r9, rax	# tmp411, *_49, shift_flipped
 995      C9
 996              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 997              		.loc 1 808 72 view .LVU269
 998 0577 4C09CA   		or	rdx, r9	# tmp413, tmp411
 999 057a 4A8914C7 		mov	QWORD PTR [rdi+r8*8], rdx	# *_58, tmp413
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 1000              		.loc 1 807 48 is_stmt 1 view .LVU270
 1001              	.LVL72:
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 1002              		.loc 1 807 12 view .LVU271
 1003              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 1004              		.loc 1 808 83 is_stmt 0 view .LVU272
 1005 057e 4883C602 		add	rsi, 2	# _52,
 1006              	.LVL73:
 1007              	# sieve_extend.c:807:     for (; copy_word <= destination_stop_word; copy_word++,source_word++ ) {
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 1008              		.loc 1 807 5 view .LVU273
 1009 0582 4839CB   		cmp	rbx, rcx	# destination_stop_word, copy_word
 1010 0585 7279     		jb	.L72	#,
 1011              		.loc 1 808 9 is_stmt 1 view .LVU274
 1012              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 1013              		.loc 1 808 54 is_stmt 0 view .LVU275
 1014 0587 488B14F7 		mov	rdx, QWORD PTR [rdi+rsi*8]	# *_127, *_127
 1015              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 1016              		.loc 1 808 99 view .LVU276
 1017 058b C462A1F7 		shlx	r11, QWORD PTR 8[rdi+rsi*8], r11	# tmp414, *_122, shift
 1017      5CF708
 1018              	.LVL74:
 1019              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 1020              		.loc 1 808 54 view .LVU277
 1021 0592 C4E2FBF7 		shrx	rax, rdx, rax	# tmp416, *_127, shift_flipped
 1021      C2
 1022              	# sieve_extend.c:808:         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bit
 1023              		.loc 1 808 72 view .LVU278
 1024 0597 4C09D8   		or	rax, r11	# tmp418, tmp414
 1025 059a 488904CF 		mov	QWORD PTR [rdi+rcx*8], rax	# *_118, tmp418
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 1026              		.loc 1 807 48 is_stmt 1 view .LVU279
 1027              	.LVL75:
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 1028              		.loc 1 807 12 view .LVU280
 1029 059e C5F877   		vzeroupper
 1030              	.LVL76:
 1031              	.L46:
 807:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 1032              		.loc 1 807 12 is_stmt 0 view .LVU281
GAS LISTING /tmp/ccrNbbzt.s 			page 37


 1033 05a1 4D39F4   		cmp	r12, r14	# _175, _198
 1034 05a4 B9000000 		mov	ecx, 0	# tmp403,
 1034      00
 1035 05a9 490F46CD 		cmovbe	rcx, r13	# _173,, tmp402
 1036 05ad 4C01E1   		add	rcx, r12	# copy_word, _175
 1037              	.L41:
 809:sieve_extend.c ****     }
 810:sieve_extend.c ****     bitarray[copy_word] &= chopmask(destination_stop);
 1038              		.loc 1 810 5 is_stmt 1 view .LVU282
 1039              	# sieve_extend.c:810:     bitarray[copy_word] &= chopmask(destination_stop);
 1040              		.loc 1 810 25 is_stmt 0 view .LVU283
 1041 05b0 4C213CCF 		and	QWORD PTR [rdi+rcx*8], r15	# *_72, _193
 1042              	# sieve_extend.c:812: }
 811:sieve_extend.c **** 
 812:sieve_extend.c **** }
 1043              		.loc 1 812 1 view .LVU284
 1044 05b4 488D65D8 		lea	rsp, -40[rbp]	#,
 1045 05b8 5B       		pop	rbx	#
 1046 05b9 415C     		pop	r12	#
 1047 05bb 415D     		pop	r13	#
 1048 05bd 415E     		pop	r14	#
 1049 05bf 415F     		pop	r15	#
 1050 05c1 5D       		pop	rbp	#
 1051              		.cfi_remember_state
 1052              		.cfi_def_cfa 7, 8
 1053 05c2 C3       		ret	
 1054              	.LVL77:
 1055              		.p2align 4,,10
 1056 05c3 0F1F4400 		.p2align 3
 1056      00
 1057              	.L75:
 1058              		.cfi_restore_state
 782:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 1059              		.loc 1 782 9 is_stmt 1 view .LVU285
 1060              	# sieve_extend.c:784:                                 & keepmask(copy_start) & chopmask(destination
 784:sieve_extend.c ****         return; // rapid exit for one word variant
 1061              		.loc 1 784 56 is_stmt 0 view .LVU286
 1062 05c8 4C89C9   		mov	rcx, r9	# _189, _189
 1063 05cb 4C21F9   		and	rcx, r15	# _189, _193
 1064 05ce 4821CE   		and	rsi, rcx	# tmp312, tmp311
 1065              	# sieve_extend.c:782:         bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the s
 782:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 1066              		.loc 1 782 29 view .LVU287
 1067 05d1 4909F6   		or	r14, rsi	# tmp313, tmp312
 1068 05d4 4D897500 		mov	QWORD PTR 0[r13], r14	# *_177, tmp313
 785:sieve_extend.c ****     }
 1069              		.loc 1 785 9 is_stmt 1 view .LVU288
 1070              	# sieve_extend.c:812: }
 1071              		.loc 1 812 1 is_stmt 0 view .LVU289
 1072 05d8 488D65D8 		lea	rsp, -40[rbp]	#,
 1073              	.LVL78:
 1074              		.loc 1 812 1 view .LVU290
 1075 05dc 5B       		pop	rbx	#
 1076 05dd 415C     		pop	r12	#
 1077 05df 415D     		pop	r13	#
 1078 05e1 415E     		pop	r14	#
 1079 05e3 415F     		pop	r15	#
GAS LISTING /tmp/ccrNbbzt.s 			page 38


 1080 05e5 5D       		pop	rbp	#
 1081              		.cfi_remember_state
 1082              		.cfi_def_cfa 7, 8
 1083              	.LVL79:
 1084              		.loc 1 812 1 view .LVU291
 1085 05e6 C3       		ret	
 1086              	.LVL80:
 1087 05e7 660F1F84 		.p2align 4,,10
 1087      00000000 
 1087      00
 1088              		.p2align 3
 1089              	.L69:
 1090              		.cfi_restore_state
 1091              		.loc 1 812 1 view .LVU292
 1092 05f0 C5F877   		vzeroupper
 1093 05f3 E903FEFF 		jmp	.L37	#
 1093      FF
 1094              	.LVL81:
 1095 05f8 0F1F8400 		.p2align 4,,10
 1095      00000000 
 1096              		.p2align 3
 1097              	.L72:
 1098              		.loc 1 812 1 view .LVU293
 1099 0600 C5F877   		vzeroupper
 1100 0603 EB9C     		jmp	.L46	#
 1101              	.LVL82:
 1102              	.L34:
 1103              		.loc 1 812 1 view .LVU294
 1104 0605 488B4424 		mov	rax, QWORD PTR -16[rsp]	# source_word, %sfp
 1104      F0
 1105              	.LBB280:
 1106              	.LBB278:
 1107              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 802:sieve_extend.c ****         }
 1108              		.loc 1 802 35 view .LVU295
 1109 060a 448B4C24 		mov	r9d, DWORD PTR -20[rsp]	# _182, %sfp
 1109      EC
 1110 060f 488D3410 		lea	rsi, [rax+rdx]	# source_word,
 1111 0613 448B5C24 		mov	r11d, DWORD PTR -24[rsp]	# _184, %sfp
 1111      E8
 1112              	.LVL83:
 802:sieve_extend.c ****         }
 1113              		.loc 1 802 35 view .LVU296
 1114 0618 488D0CF7 		lea	rcx, [rdi+rsi*8]	# _334,
 1115              	.LVL84:
 802:sieve_extend.c ****         }
 1116              		.loc 1 802 35 view .LVU297
 1117 061c 4929C0   		sub	r8, rax	# tmp373, source_word
 1118              	.LVL85:
 1119 061f 90       		.p2align 4,,10
 1120              		.p2align 3
 1121              	.L39:
 802:sieve_extend.c ****         }
 1122              		.loc 1 802 13 is_stmt 1 view .LVU298
 1123              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 802:sieve_extend.c ****         }
 1124              		.loc 1 802 62 is_stmt 0 view .LVU299
GAS LISTING /tmp/ccrNbbzt.s 			page 39


 1125 0620 C4C2A3F7 		shrx	rax, QWORD PTR [r10], r11	# tmp374, MEM[base: _328, offset: 0B], _184
 1125      02
 1126              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 802:sieve_extend.c ****         }
 1127              		.loc 1 802 109 view .LVU300
 1128 0625 C4C2B1F7 		shlx	rdx, QWORD PTR 8[r10], r9	# tmp376, MEM[base: _328, offset: 8B], _182
 1128      5208
 1129              	# sieve_extend.c:802:             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped
 802:sieve_extend.c ****         }
 1130              		.loc 1 802 80 view .LVU301
 1131 062b 4809D0   		or	rax, rdx	# tmp378, tmp376
 1132 062e 4B8944C2 		mov	QWORD PTR 8[r10+r8*8], rax	# MEM[base: _328, index: _330, step: 8, offset: 8B], tmp378
 1132      08
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 1133              		.loc 1 801 58 is_stmt 1 view .LVU302
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 1134              		.loc 1 801 40 view .LVU303
 1135 0633 4983C208 		add	r10, 8	# ivtmp.197,
 1136              	# sieve_extend.c:801:         for (register counter_t i = 0; i <loop_distance; i++) {
 801:sieve_extend.c ****             bitarray[copy_word+i] = (bitarray[source_word+i] >> shift_flipped) | (bitarray[source_w
 1137              		.loc 1 801 9 is_stmt 0 view .LVU304
 1138 0637 4939CA   		cmp	r10, rcx	# ivtmp.197, _334
 1139 063a 75E4     		jne	.L39	#,
 1140 063c E9BAFDFF 		jmp	.L37	#
 1140      FF
 1141              	.LBE278:
 1142              	.LBE280:
 1143              		.cfi_endproc
 1144              	.LFE70:
 1146 0641 66662E0F 		.p2align 4
 1146      1F840000 
 1146      0000000F 
 1146      1F4000
 1147              		.globl	compare_tuning_result
 1149              	compare_tuning_result:
 1150              	.LVL86:
 1151              	.LFB82:
 813:sieve_extend.c **** 
 814:sieve_extend.c **** static void extendSieve_shiftright_base(bitword_t* bitarray, const counter_t source_start, const co
 815:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftright (%ju copies)
 816:sieve_extend.c ****    
 817:sieve_extend.c ****     const counter_t destination_stop_word = wordindex(destination_stop);
 818:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 819:sieve_extend.c ****     register const bitshift_t shift = bitindex_calc(copy_start) - bitindex_calc(source_start);
 820:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 821:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 822:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 823:sieve_extend.c **** 
 824:sieve_extend.c ****     if (copy_word >= destination_stop_word) { 
 825:sieve_extend.c ****         bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose da
 826:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
 827:sieve_extend.c ****                                 & keepmask(copy_start) & chopmask(destination_stop);
 828:sieve_extend.c ****         return; // rapid exit for one word variant
 829:sieve_extend.c ****     }
 830:sieve_extend.c **** 
 831:sieve_extend.c ****     bitarray[copy_word] |= ((bitarray[source_word] << shift)  // or the start in to not lose data
 832:sieve_extend.c ****                                 | (bitarray[copy_word] >> shift_flipped))
GAS LISTING /tmp/ccrNbbzt.s 			page 40


 833:sieve_extend.c ****                                 & keepmask(copy_start);
 834:sieve_extend.c ****     
 835:sieve_extend.c ****     copy_word++;
 836:sieve_extend.c **** 
 837:sieve_extend.c ****     debug { printf("...start - %ju - %ju - end\n",(uintmax_t)wordindex(copy_start), (uintmax_t)dest
 838:sieve_extend.c **** 
 839:sieve_extend.c ****     for (; copy_word <= destination_stop_word; copy_word++, source_word++ ) 
 840:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word] >> shift_flipped) | (bitarray[source_word+1] <
 841:sieve_extend.c ****     // bitarray[copy_word] &= chopmask(destination_stop);
 842:sieve_extend.c **** 
 843:sieve_extend.c **** }
 844:sieve_extend.c **** 
 845:sieve_extend.c **** static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source_start, const counter_
 846:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 847:sieve_extend.c **** 
 848:sieve_extend.c ****     const counter_t destination_stop_word = wordindex(destination_stop);
 849:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 850:sieve_extend.c ****     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
 851:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 852:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 853:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 854:sieve_extend.c ****     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 855:sieve_extend.c ****                              | (bitarray[source_word+1] << shift_flipped))
 856:sieve_extend.c ****                              & ~chopmask(copy_start); // because this is the first word, dont copy 
 857:sieve_extend.c **** 
 858:sieve_extend.c ****     copy_word++;
 859:sieve_extend.c ****     source_word++;
 860:sieve_extend.c **** 
 861:sieve_extend.c ****     const counter_t aligned_copy_word = min(source_word + size, destination_stop_word); // after <<
 862:sieve_extend.c ****     const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, 
 863:sieve_extend.c ****     source_word += distance;
 864:sieve_extend.c ****     copy_word += distance;
 865:sieve_extend.c **** 
 866:sieve_extend.c ****      debug { counter_t fast_loop_stop_word = uintsafeminus(aligned_copy_word,2); printf("...start -
 867:sieve_extend.c **** 
 868:sieve_extend.c ****     #pragma ivdep
 869:sieve_extend.c ****     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 870:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 871:sieve_extend.c ****     }
 872:sieve_extend.c **** 
 873:sieve_extend.c ****     if (copy_word >= destination_stop_word) return;
 874:sieve_extend.c **** 
 875:sieve_extend.c ****     source_word = copy_word - size; // recalibrate
 876:sieve_extend.c ****     const size_t memsize = (size_t)size*sizeof(bitword_t);
 877:sieve_extend.c **** 
 878:sieve_extend.c ****     #pragma ivdep
 879:sieve_extend.c ****     for (;copy_word + size <= destination_stop_word; copy_word += size) 
 880:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 881:sieve_extend.c **** 
 882:sieve_extend.c ****     #pragma ivdep
 883:sieve_extend.c ****     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 884:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 885:sieve_extend.c **** 
 886:sieve_extend.c **** 
 887:sieve_extend.c ****  }
 888:sieve_extend.c **** 
 889:sieve_extend.c **** static inline void extendSieve(bitword_t* bitarray, const counter_t source_start, const counter_t s
GAS LISTING /tmp/ccrNbbzt.s 			page 41


 890:sieve_extend.c ****     if (size < WORD_SIZE_counter)   {
 891:sieve_extend.c ****         extendSieve_smallSize (bitarray, source_start, size, destination_stop);
 892:sieve_extend.c ****         return; // rapid exit for small sizes
 893:sieve_extend.c ****     }
 894:sieve_extend.c **** 
 895:sieve_extend.c ****     const counter_t copy_start  = source_start + size;
 896:sieve_extend.c ****     const bitshift_t copy_bit   = bitindex_calc(copy_start);
 897:sieve_extend.c ****     const bitshift_t source_bit = bitindex_calc(source_start);
 898:sieve_extend.c **** 
 899:sieve_extend.c ****     if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_start, size, destinatio
 900:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 901:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 902:sieve_extend.c **** }
 903:sieve_extend.c **** 
 904:sieve_extend.c **** static void sieve_block_stripe(struct sieve_state *sieve, const counter_t block_start, const counte
 905:sieve_extend.c ****     counter_t prime = prime_start;
 906:sieve_extend.c ****     counter_t start = prime * prime * 2 + prime * 2;
 907:sieve_extend.c ****     counter_t step  = prime * 2 + 1;
 908:sieve_extend.c ****     bitword_t* bitarray = sieve->bitarray;
 909:sieve_extend.c **** 
 910:sieve_extend.c ****     debug printf("Block strip for block %ju - %ju\n",(uintmax_t)block_start,(uintmax_t)block_stop);
 911:sieve_extend.c ****     
 912:sieve_extend.c ****     while (start <= block_stop) {
 913:sieve_extend.c ****         step  = prime * 2 + 1;
 914:sieve_extend.c ****         if (step > SMALLSTEP_FASTER) break;
 915:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 916:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 917:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 918:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 919:sieve_extend.c ****     }
 920:sieve_extend.c ****     
 921:sieve_extend.c ****     while (start <= block_stop) {
 922:sieve_extend.c ****         step  = prime * 2 + 1;
 923:sieve_extend.c ****         if (step > MEDIUMSTEP_FASTER) break;
 924:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 925:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 926:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 927:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 928:sieve_extend.c ****     }
 929:sieve_extend.c **** 
 930:sieve_extend.c ****     counter_t start1 = 0; // save value
 931:sieve_extend.c ****     counter_t step1 = 0; // save value
 932:sieve_extend.c ****     while (start <= block_stop) {
 933:sieve_extend.c ****         step  = prime * 2 + 1;
 934:sieve_extend.c ****         if (step > 64) break;
 935:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 936:sieve_extend.c ****         start1 = start; // save value
 937:sieve_extend.c ****         step1 = step; // save value
 938:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 939:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 940:sieve_extend.c ****         step  = prime * 2 + 1;
 941:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 942:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 943:sieve_extend.c **** //        else                     setBitsTrue_smallRange(bitarray, start1, step1, block_stop);
 944:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 945:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 946:sieve_extend.c ****     }
GAS LISTING /tmp/ccrNbbzt.s 			page 42


 947:sieve_extend.c **** 
 948:sieve_extend.c ****     while (start <= block_stop) {
 949:sieve_extend.c ****         step  = prime * 2 + 1;
 950:sieve_extend.c ****         if (step > WORD_SIZE_counter * 4) break;
 951:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 952:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 953:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 954:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 955:sieve_extend.c ****     }
 956:sieve_extend.c **** 
 957:sieve_extend.c ****     while (start <= block_stop) {
 958:sieve_extend.c ****         step  = prime * 2 + 1;
 959:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 960:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 961:sieve_extend.c ****         setBitsTrue_largeRange(bitarray, start, step, block_stop);
 962:sieve_extend.c ****         prime = searchBitFalse_longRange(bitarray, prime+1 );
 963:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 964:sieve_extend.c ****     }
 965:sieve_extend.c **** 
 966:sieve_extend.c ****     while (start <= block_stop) {
 967:sieve_extend.c ****         step  = prime * 2 + 1;
 968:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 969:sieve_extend.c ****         if likely(start <= block_stop)
 970:sieve_extend.c ****             setBitsTrue_smallRange(bitarray, start, step, block_stop);
 971:sieve_extend.c ****         prime = searchBitFalse_longRange(bitarray, prime+1 );
 972:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 973:sieve_extend.c ****     }
 974:sieve_extend.c **** }
 975:sieve_extend.c **** 
 976:sieve_extend.c **** struct block {
 977:sieve_extend.c ****     counter_t pattern_size; // size of pattern applied 
 978:sieve_extend.c ****     counter_t pattern_start; // start of pattern
 979:sieve_extend.c ****     counter_t prime; // next prime to be striped
 980:sieve_extend.c **** };
 981:sieve_extend.c **** 
 982:sieve_extend.c **** // returns prime that could not be handled:
 983:sieve_extend.c **** // start is too large
 984:sieve_extend.c **** // range is too big
 985:sieve_extend.c **** static struct block sieve_block_extend(struct sieve_state *sieve, const counter_t block_start, cons
 986:sieve_extend.c ****     register counter_t prime   = 0;
 987:sieve_extend.c ****     counter_t patternsize_bits = 1;
 988:sieve_extend.c ****     counter_t pattern_start    = 0;
 989:sieve_extend.c ****     counter_t range_stop       = block_start;
 990:sieve_extend.c ****     bitword_t* bitarray        = sieve->bitarray;
 991:sieve_extend.c ****     struct block block = { .prime = 0, .pattern_start = 0, .pattern_size = 0 };
 992:sieve_extend.c **** 
 993:sieve_extend.c ****     sieve->bitarray[0] = SAFE_ZERO; // only the first word has to be cleared; the rest is populated
 994:sieve_extend.c ****     
 995:sieve_extend.c ****     for (;range_stop < block_stop;) {
 996:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 997:sieve_extend.c ****         counter_t start = prime * prime * 2 + prime * 2;
 998:sieve_extend.c ****         if (start > block_stop) break;
 999:sieve_extend.c **** 
1000:sieve_extend.c ****         const counter_t step  = prime * 2 + 1;
1001:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
1002:sieve_extend.c **** 
1003:sieve_extend.c ****         range_stop = block_start + patternsize_bits * step * 2;  // range is x2 so the second block
GAS LISTING /tmp/ccrNbbzt.s 			page 43


1004:sieve_extend.c ****         block.pattern_size = patternsize_bits;
1005:sieve_extend.c ****         block.pattern_start = pattern_start;
1006:sieve_extend.c ****         if (range_stop > block_stop) return block; //range_stop = block_stop;
1007:sieve_extend.c **** 
1008:sieve_extend.c ****         if (patternsize_bits>1) {
1009:sieve_extend.c ****             pattern_start = block_start | patternsize_bits;
1010:sieve_extend.c ****             extendSieve(bitarray, pattern_start, patternsize_bits, range_stop);
1011:sieve_extend.c ****         }
1012:sieve_extend.c ****         patternsize_bits *= step;
1013:sieve_extend.c **** 
1014:sieve_extend.c ****         if      (step < SMALLSTEP_FASTER)      setBitsTrue_smallStep (bitarray, start, (bitshift_t)
1015:sieve_extend.c ****         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_
1016:sieve_extend.c ****         else if (step < WORD_SIZE_counter * 4) setBitsTrue_largeRange_vector(bitarray, start, step,
1017:sieve_extend.c ****         else                                   setBitsTrue_largeRange(bitarray, start, step, range_
1018:sieve_extend.c ****         block.prime = prime;
1019:sieve_extend.c ****     } 
1020:sieve_extend.c **** 
1021:sieve_extend.c ****     return block;
1022:sieve_extend.c **** }
1023:sieve_extend.c **** 
1024:sieve_extend.c **** static struct sieve_state *sieve(const counter_t maxints, const counter_t blocksize) {
1025:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
1026:sieve_extend.c ****     counter_t prime         = 0;
1027:sieve_extend.c ****     bitword_t* bitarray        = sieve->bitarray;
1028:sieve_extend.c **** 
1029:sieve_extend.c ****     debug printf("Running sieve to find all primes up to %ju with blocksize %ju\n",(uintmax_t)maxin
1030:sieve_extend.c **** 
1031:sieve_extend.c ****     // fill the whole sieve bij adding en copying incrementally
1032:sieve_extend.c ****     struct block block = sieve_block_extend(sieve, 0, sieve->bits);
1033:sieve_extend.c ****     extendSieve(bitarray, block.pattern_start, block.pattern_size, sieve->bits);
1034:sieve_extend.c ****     prime = block.prime;
1035:sieve_extend.c **** 
1036:sieve_extend.c ****     // #pragma unroll 8
1037:sieve_extend.c ****     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <= sieve->bits; block_sta
1038:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
1039:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime);
1040:sieve_extend.c ****         sieve_block_stripe(sieve, block_start, block_stop, prime);
1041:sieve_extend.c ****     } 
1042:sieve_extend.c **** 
1043:sieve_extend.c ****     return sieve;
1044:sieve_extend.c **** }
1045:sieve_extend.c **** 
1046:sieve_extend.c **** static void show_primes(struct sieve_state *sieve, counter_t maxFactor) {
1047:sieve_extend.c ****     counter_t primeCount = 1;    // We already have 2
1048:sieve_extend.c ****     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitarray, factor+
1049:sieve_extend.c ****         primeCount++;
1050:sieve_extend.c ****         if (factor < maxFactor/2) {
1051:sieve_extend.c ****             printf("%3ju ",(uintmax_t)factor*2+1);
1052:sieve_extend.c ****             if (primeCount % 10 == 0) printf("\n");
1053:sieve_extend.c ****         }
1054:sieve_extend.c ****     }
1055:sieve_extend.c ****     printf("\nFound %ju primes until %ju\n",(uintmax_t)primeCount, (uintmax_t)sieve->bits*2+1);
1056:sieve_extend.c **** }
1057:sieve_extend.c **** 
1058:sieve_extend.c **** static counter_t count_primes(struct sieve_state *sieve) {
1059:sieve_extend.c ****     counter_t primeCount = 1;
1060:sieve_extend.c ****     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitarray, factor+
GAS LISTING /tmp/ccrNbbzt.s 			page 44


1061:sieve_extend.c ****     return primeCount;
1062:sieve_extend.c **** }
1063:sieve_extend.c **** 
1064:sieve_extend.c **** static void deepAnalyzePrimes(struct sieve_state *sieve) {
1065:sieve_extend.c ****     printf("DeepAnalyzing\n");
1066:sieve_extend.c ****     counter_t warn_prime = 0;
1067:sieve_extend.c ****     counter_t warn_nonprime = 0;
1068:sieve_extend.c ****     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
1069:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
1070:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1071:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
1072:sieve_extend.c ****                     if (warn_prime++ < 30) printf("Number %ju (%ju) was marked prime, but %ju * %ju
1073:sieve_extend.c ****                 }
1074:sieve_extend.c ****             }
1075:sieve_extend.c ****         }
1076:sieve_extend.c ****         else {
1077:sieve_extend.c ****             counter_t c_prime = 0;
1078:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1079:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
1080:sieve_extend.c ****             }
1081:sieve_extend.c ****             if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju) was marked non-prime, 
1082:sieve_extend.c ****         }
1083:sieve_extend.c ****     }
1084:sieve_extend.c **** }
1085:sieve_extend.c **** 
1086:sieve_extend.c **** 
1087:sieve_extend.c **** int validatePrimeCount(struct sieve_state *sieve, int option_verboselevel) {
1088:sieve_extend.c **** 
1089:sieve_extend.c ****     counter_t primecount = count_primes(sieve);
1090:sieve_extend.c ****     counter_t valid_primes = 0;
1091:sieve_extend.c ****     switch(sieve->size) {
1092:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
1093:sieve_extend.c ****         case 100:           valid_primes = 25;       break;
1094:sieve_extend.c ****         case 1000:          valid_primes = 168;      break;
1095:sieve_extend.c ****         case 10000:         valid_primes = 1229;     break;
1096:sieve_extend.c ****         case 100000:        valid_primes = 9592;     break;
1097:sieve_extend.c ****         case 1000000:       valid_primes = 78498;    break;
1098:sieve_extend.c ****         case 10000000:      valid_primes = 664579;   break;
1099:sieve_extend.c ****         case 100000000:     valid_primes = 5761455;  break;
1100:sieve_extend.c ****         case 1000000000:    valid_primes = 50847534; break;
1101:sieve_extend.c ****         default:            valid_primes= 0;
1102:sieve_extend.c ****     }
1103:sieve_extend.c **** 
1104:sieve_extend.c ****     int valid = (valid_primes == primecount);
1105:sieve_extend.c ****     if (valid  && option_verboselevel >= 4) printf("Result: Sievesize %ju is expected to have %ju p
1106:sieve_extend.c ****     if (!valid && option_verboselevel >= 1) {
1107:sieve_extend.c ****         printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produ
1108:sieve_extend.c ****         if (!valid && option_verboselevel >= 2) show_primes(sieve, default_show_primes_on_error);
1109:sieve_extend.c ****     }
1110:sieve_extend.c ****     if (!valid && option_verboselevel >= 3) deepAnalyzePrimes(sieve);
1111:sieve_extend.c ****     return (valid);
1112:sieve_extend.c **** }
1113:sieve_extend.c **** 
1114:sieve_extend.c **** void usage(char *name) {
1115:sieve_extend.c ****     fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
1116:sieve_extend.c ****     fprintf(stderr, "Options:\n");
1117:sieve_extend.c ****     fprintf(stderr, "  --verbose <level>  Show more output to a certain level:\n");
GAS LISTING /tmp/ccrNbbzt.s 			page 45


1118:sieve_extend.c ****     fprintf(stderr, "                     1 - show phase progress\n");
1119:sieve_extend.c ****     fprintf(stderr, "                     2 - show general progress within the phase\n");
1120:sieve_extend.c ****     fprintf(stderr, "                     3 - show actual work\n");
1121:sieve_extend.c ****     fprintf(stderr, "  --check            check the correctness of the algorithm\n");
1122:sieve_extend.c ****     fprintf(stderr, "  --show <maximum>   Show the primes found up to the maximum\n");
1123:sieve_extend.c ****     fprintf(stderr, "  --tune  <level>    find the best settings for the current os and hardware\n"
1124:sieve_extend.c ****     fprintf(stderr, "                     1 - fast tuning\n");
1125:sieve_extend.c ****     fprintf(stderr, "                     2 - refined tuning\n");
1126:sieve_extend.c ****     fprintf(stderr, "                     3 - maximum tuning (takes long)\n");
1127:sieve_extend.c ****     exit(1);
1128:sieve_extend.c **** }
1129:sieve_extend.c **** 
1130:sieve_extend.c **** typedef struct  {
1131:sieve_extend.c ****     counter_t maxints;
1132:sieve_extend.c ****     counter_t blocksize_bits;
1133:sieve_extend.c ****     counter_t blocksize_kb;
1134:sieve_extend.c ****     counter_t free_bits;
1135:sieve_extend.c ****     counter_t smallstep_faster;
1136:sieve_extend.c ****     counter_t mediumstep_faster;
1137:sieve_extend.c ****     counter_t sample_max;
1138:sieve_extend.c ****     double    sample_duration;
1139:sieve_extend.c ****     counter_t passes;
1140:sieve_extend.c ****     double    elapsed_time;
1141:sieve_extend.c ****     double    avg;
1142:sieve_extend.c **** } tuning_result_type;
1143:sieve_extend.c **** 
1144:sieve_extend.c **** int compare_tuning_result(const void *a, const void *b) {
 1152              		.loc 1 1144 57 is_stmt 1 view -0
 1153              		.cfi_startproc
 1154              		.loc 1 1144 57 is_stmt 0 view .LVU306
 1155 0650 F30F1EFA 		endbr64	
1145:sieve_extend.c ****     tuning_result_type *resultA = (tuning_result_type *)a;
 1156              		.loc 1 1145 5 is_stmt 1 view .LVU307
 1157              	.LVL87:
1146:sieve_extend.c ****     tuning_result_type *resultB = (tuning_result_type *)b;
 1158              		.loc 1 1146 5 view .LVU308
1147:sieve_extend.c ****     return (resultB->avg > resultA->avg ? 1 : -1);
 1159              		.loc 1 1147 5 view .LVU309
 1160              	# sieve_extend.c:1147:     return (resultB->avg > resultA->avg ? 1 : -1);
 1161              		.loc 1 1147 45 is_stmt 0 view .LVU310
 1162 0654 C5FB1046 		vmovsd	xmm0, QWORD PTR 80[rsi]	# MEM[(struct tuning_result_type *)b_5(D)].avg, MEM[(struct tuning_
 1162      50
 1163 0659 31C0     		xor	eax, eax	# <retval>
 1164 065b C5F92F47 		vcomisd	xmm0, QWORD PTR 80[rdi]	# MEM[(struct tuning_result_type *)b_5(D)].avg, MEM[(struct tuning
 1164      50
 1165 0660 0F97C0   		seta	al	#, <retval>
 1166 0663 8D4400FF 		lea	eax, -1[rax+rax]	# <retval>,
 1167              	# sieve_extend.c:1148: }
1148:sieve_extend.c **** }
 1168              		.loc 1 1148 1 view .LVU311
 1169 0667 C3       		ret	
 1170              		.cfi_endproc
 1171              	.LFE82:
 1173 0668 0F1F8400 		.p2align 4
 1173      00000000 
 1175              	extendSieve_aligned:
 1176              	.LVL88:
GAS LISTING /tmp/ccrNbbzt.s 			page 46


 1177              	.LFB66:
 584:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
 1178              		.loc 1 584 140 is_stmt 1 view -0
 1179              		.cfi_startproc
 585:sieve_extend.c **** 
 1180              		.loc 1 585 5 view .LVU313
 587:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 1181              		.loc 1 587 5 view .LVU314
 1182              	# sieve_extend.c:584: static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_s
 584:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
 1183              		.loc 1 584 140 is_stmt 0 view .LVU315
 1184 0670 55       		push	rbp	#
 1185              		.cfi_def_cfa_offset 16
 1186              		.cfi_offset 6, -16
 1187              	# sieve_extend.c:588:     const counter_t copy_start = source_start + size;
 588:sieve_extend.c ****     counter_t source_word = wordindex(source_start);
 1188              		.loc 1 588 21 view .LVU316
 1189 0671 488D0416 		lea	rax, [rsi+rdx]	# copy_start,
 1190              	# sieve_extend.c:589:     counter_t source_word = wordindex(source_start);
 589:sieve_extend.c ****     counter_t copy_word = wordindex(copy_start);
 1191              		.loc 1 589 15 view .LVU317
 1192 0675 48C1EE06 		shr	rsi, 6	# source_start,
 1193              	.LVL89:
 1194              	# sieve_extend.c:584: static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_s
 584:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
 1195              		.loc 1 584 140 view .LVU318
 1196 0679 4889E5   		mov	rbp, rsp	#,
 1197              		.cfi_def_cfa_register 6
 1198 067c 4157     		push	r15	#
 1199 067e 4989D1   		mov	r9, rdx	# size, tmp192
 1200 0681 4156     		push	r14	#
 1201              		.cfi_offset 15, -24
 1202              		.cfi_offset 14, -32
 1203              	# sieve_extend.c:592:     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
 592:sieve_extend.c **** 
 1204              		.loc 1 592 35 view .LVU319
 1205 0683 4989FE   		mov	r14, rdi	# _5, bitarray
 1206              	# sieve_extend.c:584: static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_s
 584:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
 1207              		.loc 1 584 140 view .LVU320
 1208 0686 4155     		push	r13	#
 1209 0688 4154     		push	r12	#
 1210 068a 53       		push	rbx	#
 1211              		.cfi_offset 13, -40
 1212              		.cfi_offset 12, -48
 1213              		.cfi_offset 3, -56
 1214              	# sieve_extend.c:587:     const counter_t destination_stop_word = wordindex(destination_stop);
 587:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 1215              		.loc 1 587 21 view .LVU321
 1216 068b 4889CB   		mov	rbx, rcx	# tmp193, tmp193
 1217              	# sieve_extend.c:589:     counter_t source_word = wordindex(source_start);
 589:sieve_extend.c ****     counter_t copy_word = wordindex(copy_start);
 1218              		.loc 1 589 15 view .LVU322
 1219 068e 4889F1   		mov	rcx, rsi	# source_word, source_start
 1220              	.LVL90:
 1221              	# sieve_extend.c:584: static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_s
 584:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
GAS LISTING /tmp/ccrNbbzt.s 			page 47


 1222              		.loc 1 584 140 view .LVU323
 1223 0691 4883E4E0 		and	rsp, -32	#,
 1224 0695 4883EC20 		sub	rsp, 32	#,
 1225              	# sieve_extend.c:592:     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
 592:sieve_extend.c **** 
 1226              		.loc 1 592 35 view .LVU324
 1227 0699 48C1E103 		sal	rcx, 3	# _4,
 1228              	# sieve_extend.c:584: static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_s
 584:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
 1229              		.loc 1 584 140 view .LVU325
 1230 069d 48895424 		mov	QWORD PTR 24[rsp], rdx	# %sfp, size
 1230      18
 1231              	# sieve_extend.c:590:     counter_t copy_word = wordindex(copy_start);
 590:sieve_extend.c ****     
 1232              		.loc 1 590 15 view .LVU326
 1233 06a2 4889C2   		mov	rdx, rax	# ivtmp.250, copy_start
 1234              	.LVL91:
 590:sieve_extend.c ****     
 1235              		.loc 1 590 15 view .LVU327
 1236 06a5 48C1EA06 		shr	rdx, 6	# ivtmp.250,
 1237              	# sieve_extend.c:592:     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
 592:sieve_extend.c **** 
 1238              		.loc 1 592 35 view .LVU328
 1239 06a9 4901CE   		add	r14, rcx	# _5, _4
 1240 06ac 48894C24 		mov	QWORD PTR 8[rsp], rcx	# %sfp, _4
 1240      08
 1241              	# sieve_extend.c:592:     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
 592:sieve_extend.c **** 
 1242              		.loc 1 592 52 view .LVU329
 1243 06b1 89C1     		mov	ecx, eax	# tmp159, copy_start
 1244 06b3 F7D1     		not	ecx	# tmp159
 1245 06b5 48C7C0FF 		mov	rax, -1	# tmp162,
 1245      FFFFFF
 1246              	# sieve_extend.c:587:     const counter_t destination_stop_word = wordindex(destination_stop);
 587:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 1247              		.loc 1 587 21 view .LVU330
 1248 06bc 48C1EB06 		shr	rbx, 6	# tmp193,
 1249              	.LVL92:
 588:sieve_extend.c ****     counter_t source_word = wordindex(source_start);
 1250              		.loc 1 588 5 is_stmt 1 view .LVU331
 589:sieve_extend.c ****     counter_t copy_word = wordindex(copy_start);
 1251              		.loc 1 589 5 view .LVU332
 1252              	# sieve_extend.c:594:     while (copy_word + size <= destination_stop_word) {
 594:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
 1253              		.loc 1 594 22 is_stmt 0 view .LVU333
 1254 06c0 4D8D2411 		lea	r12, [r9+rdx]	# ivtmp.250,
 1255              	# sieve_extend.c:592:     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
 592:sieve_extend.c **** 
 1256              		.loc 1 592 52 view .LVU334
 1257 06c4 C4E2F3F7 		shrx	rax, rax, rcx	# tmp161, tmp162, tmp159
 1257      C0
 1258              	# sieve_extend.c:584: static void extendSieve_aligned(bitword_t* bitarray, const counter_t source_s
 584:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using aligned (%ju copies)\n"
 1259              		.loc 1 584 140 view .LVU335
 1260 06c9 48897C24 		mov	QWORD PTR 16[rsp], rdi	# %sfp, bitarray
 1260      10
 1261              	# sieve_extend.c:592:     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
GAS LISTING /tmp/ccrNbbzt.s 			page 48


 592:sieve_extend.c **** 
 1262              		.loc 1 592 49 view .LVU336
 1263 06ce C4C2F8F2 		andn	rax, rax, QWORD PTR [r14]	# tmp165, tmp161, *_5
 1263      06
 1264              	# sieve_extend.c:589:     counter_t source_word = wordindex(source_start);
 589:sieve_extend.c ****     counter_t copy_word = wordindex(copy_start);
 1265              		.loc 1 589 15 view .LVU337
 1266 06d3 48893424 		mov	QWORD PTR [rsp], rsi	# %sfp, source_word
 590:sieve_extend.c ****     
 1267              		.loc 1 590 5 is_stmt 1 view .LVU338
 1268              	.LVL93:
 592:sieve_extend.c **** 
 1269              		.loc 1 592 5 view .LVU339
 1270              	# sieve_extend.c:592:     bitarray[copy_word] = bitarray[source_word] & ~chopmask(copy_start);
 592:sieve_extend.c **** 
 1271              		.loc 1 592 25 is_stmt 0 view .LVU340
 1272 06d7 488904D7 		mov	QWORD PTR [rdi+rdx*8], rax	# *_13, tmp165
 594:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
 1273              		.loc 1 594 5 is_stmt 1 view .LVU341
 594:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
 1274              		.loc 1 594 11 view .LVU342
 1275 06db 4C39E3   		cmp	rbx, r12	# destination_stop_word, ivtmp.250
 1276 06de 723D     		jb	.L80	#,
 1277 06e0 4C8D2CD5 		lea	r13, 0[0+rdx*8]	# _12,
 1277      00000000 
 1278 06e8 4901FD   		add	r13, rdi	# tmp166, bitarray
 1279 06eb 4A8D04E5 		lea	rax, 0[0+r12*8]	# tmp167,
 1279      00000000 
 1280              	# sieve_extend.c:595:         memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*
 595:sieve_extend.c ****         copy_word += size;
 1281              		.loc 1 595 9 is_stmt 0 view .LVU343
 1282 06f3 4E8D3CCD 		lea	r15, 0[0+r9*8]	# _15,
 1282      00000000 
 1283 06fb 4929C5   		sub	r13, rax	# _135, tmp167
 1284              	.LVL94:
 1285 06fe 6690     		.p2align 4,,10
 1286              		.p2align 3
 1287              	.L81:
 595:sieve_extend.c ****         copy_word += size;
 1288              		.loc 1 595 9 is_stmt 1 view .LVU344
 1289              	.LBB281:
 1290              	.LBI281:
 1291              		.file 2 "/usr/include/x86_64-linux-gnu/bits/string_fortified.h"
   1:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** /* Copyright (C) 2004-2020 Free Software Foundation, Inc.
   2:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    This file is part of the GNU C Library.
   3:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 
   4:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    The GNU C Library is free software; you can redistribute it and/or
   5:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    modify it under the terms of the GNU Lesser General Public
   6:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    License as published by the Free Software Foundation; either
   7:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    version 2.1 of the License, or (at your option) any later version.
   8:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 
   9:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    The GNU C Library is distributed in the hope that it will be useful,
  10:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    but WITHOUT ANY WARRANTY; without even the implied warranty of
  11:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  12:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    Lesser General Public License for more details.
  13:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 
  14:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    You should have received a copy of the GNU Lesser General Public
GAS LISTING /tmp/ccrNbbzt.s 			page 49


  15:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    License along with the GNU C Library; if not, see
  16:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****    <https://www.gnu.org/licenses/>.  */
  17:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 
  18:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** #ifndef _BITS_STRING_FORTIFIED_H
  19:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** #define _BITS_STRING_FORTIFIED_H 1
  20:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 
  21:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** #ifndef _STRING_H
  22:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** # error "Never use <bits/string_fortified.h> directly; include <string.h> instead."
  23:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** #endif
  24:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 
  25:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** #if !__GNUC_PREREQ (5,0)
  26:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** __warndecl (__warn_memset_zero_len,
  27:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 	    "memset used with constant zero length parameter; this could be due to transposed parameters")
  28:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** #endif
  29:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 
  30:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** __fortify_function void *
  31:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** __NTH (memcpy (void *__restrict __dest, const void *__restrict __src,
 1292              		.loc 2 31 1 view .LVU345
 1293              	.LBB282:
  32:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 	       size_t __len))
  33:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** {
  34:/usr/include/x86_64-linux-gnu/bits/string_fortified.h ****   return __builtin___memcpy_chk (__dest, __src, __len, __bos0 (__dest));
 1294              		.loc 2 34 3 view .LVU346
 1295              	# /usr/include/x86_64-linux-gnu/bits/string_fortified.h:34:   return __builtin___memcpy_chk (__dest
 1296              		.loc 2 34 10 is_stmt 0 view .LVU347
 1297 0700 4B8D7CE5 		lea	rdi, 0[r13+r12*8]	# tmp169,
 1297      00
 1298              	.LVL95:
 1299              		.loc 2 34 10 view .LVU348
 1300 0705 4C89FA   		mov	rdx, r15	#, _15
 1301 0708 4C89F6   		mov	rsi, r14	#, _5
 1302 070b E8000000 		call	memcpy@PLT	#
 1302      00
 1303              	.LVL96:
 1304              		.loc 2 34 10 view .LVU349
 1305              	.LBE282:
 1306              	.LBE281:
 596:sieve_extend.c ****     }
 1307              		.loc 1 596 9 is_stmt 1 view .LVU350
 594:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
 1308              		.loc 1 594 11 view .LVU351
 1309 0710 4C89E2   		mov	rdx, r12	# ivtmp.250, ivtmp.250
 1310 0713 4C036424 		add	r12, QWORD PTR 24[rsp]	# ivtmp.250, %sfp
 1310      18
 1311              	.LVL97:
 594:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word], (uintmax_t)size*sizeof(bitword_t) );
 1312              		.loc 1 594 11 is_stmt 0 view .LVU352
 1313 0718 4C39E3   		cmp	rbx, r12	# destination_stop_word, ivtmp.250
 1314 071b 73E3     		jnb	.L81	#,
 1315              	.LVL98:
 1316              	.L80:
 599:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 1317              		.loc 1 599 10 is_stmt 1 view .LVU353
 1318 071d 4839D3   		cmp	rbx, rdx	# destination_stop_word, ivtmp.250
 1319 0720 0F86C200 		jbe	.L100	#,
 1319      0000
 1320 0726 488B7424 		mov	rsi, QWORD PTR 8[rsp]	# _4, %sfp
GAS LISTING /tmp/ccrNbbzt.s 			page 50


 1320      08
 1321 072b 488D0CD5 		lea	rcx, 0[0+rdx*8]	# _41,
 1321      00000000 
 1322 0733 488D4120 		lea	rax, 32[rcx]	# tmp175,
 1323 0737 4839C6   		cmp	rsi, rax	# _4, tmp175
 1324 073a 488D4620 		lea	rax, 32[rsi]	# tmp178,
 1325 073e 400F9DC7 		setge	dil	#, tmp177
 1326 0742 4839C1   		cmp	rcx, rax	# _41, tmp178
 1327 0745 0F9DC0   		setge	al	#, tmp180
 1328 0748 4008C7   		or	dil, al	# tmp177, tmp180
 1329 074b 0F84C700 		je	.L83	#,
 1329      0000
 1330 0751 488D43FF 		lea	rax, -1[rbx]	# tmp182,
 1331 0755 4829D0   		sub	rax, rdx	# tmp183, ivtmp.250
 1332 0758 4883F808 		cmp	rax, 8	# tmp183,
 1333 075c 0F86B600 		jbe	.L83	#,
 1333      0000
 1334 0762 4989D8   		mov	r8, rbx	# niters.219, destination_stop_word
 1335 0765 4929D0   		sub	r8, rdx	# niters.219, ivtmp.250
 1336 0768 4C89C7   		mov	rdi, r8	# bnd.220, niters.219
 1337 076b 48C1EF02 		shr	rdi, 2	# bnd.220,
 1338 076f 48034C24 		add	rcx, QWORD PTR 16[rsp]	# vectp.228, %sfp
 1338      10
 1339 0774 48C1E705 		sal	rdi, 5	# _128,
 1340 0778 31C0     		xor	eax, eax	# ivtmp.241
 1341              	.LVL99:
 1342 077a 660F1F44 		.p2align 4,,10
 1342      0000
 1343              		.p2align 3
 1344              	.L84:
 600:sieve_extend.c ****         source_word++;
 1345              		.loc 1 600 9 view .LVU354
 1346              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1347              		.loc 1 600 29 is_stmt 0 view .LVU355
 1348 0780 C4C17E6F 		vmovdqu	ymm0, YMMWORD PTR [r14+rax]	# tmp215, MEM[base: _5, index: ivtmp.241_126, offset: 0B]
 1348      0406
 1349 0786 C5FE7F04 		vmovdqu	YMMWORD PTR [rcx+rax], ymm0	# MEM[base: vectp.228_98, index: ivtmp.241_126, offset: 0B], t
 1349      01
 601:sieve_extend.c ****         copy_word++;
 1350              		.loc 1 601 9 is_stmt 1 view .LVU356
 602:sieve_extend.c ****     }
 1351              		.loc 1 602 9 view .LVU357
 599:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 1352              		.loc 1 599 10 view .LVU358
 1353 078b 4883C020 		add	rax, 32	# ivtmp.241,
 1354 078f 4839F8   		cmp	rax, rdi	# ivtmp.241, _128
 1355 0792 75EC     		jne	.L84	#,
 1356 0794 488B3424 		mov	rsi, QWORD PTR [rsp]	# source_word, %sfp
 1357 0798 4C89C0   		mov	rax, r8	# niters_vector_mult_vf.221, niters.219
 1358 079b 4883E0FC 		and	rax, -4	# niters_vector_mult_vf.221,
 1359 079f 4801C6   		add	rsi, rax	# source_word, niters_vector_mult_vf.221
 1360 07a2 4801C2   		add	rdx, rax	# tmp.223, niters_vector_mult_vf.221
 1361 07a5 4939C0   		cmp	r8, rax	# niters.219, niters_vector_mult_vf.221
 1362 07a8 7456     		je	.L99	#,
 1363              	.LVL100:
 600:sieve_extend.c ****         source_word++;
GAS LISTING /tmp/ccrNbbzt.s 			page 51


 1364              		.loc 1 600 9 view .LVU359
 1365              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1366              		.loc 1 600 39 is_stmt 0 view .LVU360
 1367 07aa 4C8B5424 		mov	r10, QWORD PTR 16[rsp]	# bitarray, %sfp
 1367      10
 1368 07af 498B04F2 		mov	rax, QWORD PTR [r10+rsi*8]	# _37, *_21
 1369              	# sieve_extend.c:601:         source_word++;
 601:sieve_extend.c ****         copy_word++;
 1370              		.loc 1 601 20 view .LVU361
 1371 07b3 48FFC6   		inc	rsi	# source_word
 1372              	.LVL101:
 1373              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1374              		.loc 1 600 29 view .LVU362
 1375 07b6 498904D2 		mov	QWORD PTR [r10+rdx*8], rax	# *_23, _37
 601:sieve_extend.c ****         copy_word++;
 1376              		.loc 1 601 9 is_stmt 1 view .LVU363
 1377              	.LVL102:
 602:sieve_extend.c ****     }
 1378              		.loc 1 602 9 view .LVU364
 1379              	# sieve_extend.c:602:         copy_word++;
 602:sieve_extend.c ****     }
 1380              		.loc 1 602 18 is_stmt 0 view .LVU365
 1381 07ba 488D4201 		lea	rax, 1[rdx]	# copy_word,
 1382              	.LVL103:
 599:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 1383              		.loc 1 599 10 is_stmt 1 view .LVU366
 1384 07be 4839C3   		cmp	rbx, rax	# destination_stop_word, copy_word
 1385 07c1 763D     		jbe	.L99	#,
 600:sieve_extend.c ****         source_word++;
 1386              		.loc 1 600 9 view .LVU367
 1387              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1388              		.loc 1 600 39 is_stmt 0 view .LVU368
 1389 07c3 498B0CF2 		mov	rcx, QWORD PTR [r10+rsi*8]	# _111, *_108
 1390              	# sieve_extend.c:602:         copy_word++;
 602:sieve_extend.c ****     }
 1391              		.loc 1 602 18 view .LVU369
 1392 07c7 4883C202 		add	rdx, 2	# copy_word,
 1393              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1394              		.loc 1 600 29 view .LVU370
 1395 07cb 49890CC2 		mov	QWORD PTR [r10+rax*8], rcx	# *_110, _111
 601:sieve_extend.c ****         copy_word++;
 1396              		.loc 1 601 9 is_stmt 1 view .LVU371
 602:sieve_extend.c ****     }
 1397              		.loc 1 602 9 view .LVU372
 1398              	.LVL104:
 599:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 1399              		.loc 1 599 10 view .LVU373
 1400              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1401              		.loc 1 600 39 is_stmt 0 view .LVU374
 1402 07cf 488D3CF5 		lea	rdi, 0[0+rsi*8]	# _107,
 1402      00000000 
 1403              	# sieve_extend.c:599:    while (copy_word < destination_stop_word) {
GAS LISTING /tmp/ccrNbbzt.s 			page 52


 599:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 1404              		.loc 1 599 10 view .LVU375
 1405 07d7 4839D3   		cmp	rbx, rdx	# destination_stop_word, copy_word
 1406 07da 7624     		jbe	.L99	#,
 600:sieve_extend.c ****         source_word++;
 1407              		.loc 1 600 9 is_stmt 1 view .LVU376
 1408              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1409              		.loc 1 600 39 is_stmt 0 view .LVU377
 1410 07dc 498B443A 		mov	rax, QWORD PTR 8[r10+rdi]	# _83, *_80
 1410      08
 1411              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1412              		.loc 1 600 29 view .LVU378
 1413 07e1 498904D2 		mov	QWORD PTR [r10+rdx*8], rax	# *_82, _83
 601:sieve_extend.c ****         copy_word++;
 1414              		.loc 1 601 9 is_stmt 1 view .LVU379
 602:sieve_extend.c ****     }
 1415              		.loc 1 602 9 view .LVU380
 599:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 1416              		.loc 1 599 10 view .LVU381
 1417 07e5 C5F877   		vzeroupper
 1418              	.L100:
 1419              	# sieve_extend.c:605: }
 605:sieve_extend.c **** 
 1420              		.loc 1 605 1 is_stmt 0 view .LVU382
 1421 07e8 488D65D8 		lea	rsp, -40[rbp]	#,
 1422              	.LVL105:
 605:sieve_extend.c **** 
 1423              		.loc 1 605 1 view .LVU383
 1424 07ec 5B       		pop	rbx	#
 1425              	.LVL106:
 605:sieve_extend.c **** 
 1426              		.loc 1 605 1 view .LVU384
 1427 07ed 415C     		pop	r12	#
 1428 07ef 415D     		pop	r13	#
 1429 07f1 415E     		pop	r14	#
 1430 07f3 415F     		pop	r15	#
 1431 07f5 5D       		pop	rbp	#
 1432              		.cfi_remember_state
 1433              		.cfi_def_cfa 7, 8
 1434              	.LVL107:
 605:sieve_extend.c **** 
 1435              		.loc 1 605 1 view .LVU385
 1436 07f6 C3       		ret	
 1437              	.LVL108:
 1438 07f7 660F1F84 		.p2align 4,,10
 1438      00000000 
 1438      00
 1439              		.p2align 3
 1440              	.L99:
 1441              		.cfi_restore_state
 605:sieve_extend.c **** 
 1442              		.loc 1 605 1 view .LVU386
 1443 0800 C5F877   		vzeroupper
 1444 0803 488D65D8 		lea	rsp, -40[rbp]	#,
 1445              	.LVL109:
GAS LISTING /tmp/ccrNbbzt.s 			page 53


 605:sieve_extend.c **** 
 1446              		.loc 1 605 1 view .LVU387
 1447 0807 5B       		pop	rbx	#
 1448              	.LVL110:
 605:sieve_extend.c **** 
 1449              		.loc 1 605 1 view .LVU388
 1450 0808 415C     		pop	r12	#
 1451 080a 415D     		pop	r13	#
 1452 080c 415E     		pop	r14	#
 1453 080e 415F     		pop	r15	#
 1454 0810 5D       		pop	rbp	#
 1455              		.cfi_remember_state
 1456              		.cfi_def_cfa 7, 8
 1457              	.LVL111:
 605:sieve_extend.c **** 
 1458              		.loc 1 605 1 view .LVU389
 1459 0811 C3       		ret	
 1460              	.LVL112:
 1461              		.p2align 4,,10
 1462 0812 660F1F44 		.p2align 3
 1462      0000
 1463              	.L83:
 1464              		.cfi_restore_state
 605:sieve_extend.c **** 
 1465              		.loc 1 605 1 view .LVU390
 1466 0818 488B7424 		mov	rsi, QWORD PTR 16[rsp]	# bitarray, %sfp
 1466      10
 1467 081d 488D040E 		lea	rax, [rsi+rcx]	# ivtmp.236,
 1468 0821 488D0CDE 		lea	rcx, [rsi+rbx*8]	# _125,
 1469              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1470              		.loc 1 600 39 view .LVU391
 1471 0825 488B3424 		mov	rsi, QWORD PTR [rsp]	# source_word, %sfp
 1472 0829 4829D6   		sub	rsi, rdx	# source_word, ivtmp.250
 1473              	.LVL113:
 1474 082c 0F1F4000 		.p2align 4,,10
 1475              		.p2align 3
 1476              	.L86:
 600:sieve_extend.c ****         source_word++;
 1477              		.loc 1 600 9 is_stmt 1 view .LVU392
 1478              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1479              		.loc 1 600 39 is_stmt 0 view .LVU393
 1480 0830 488B14F0 		mov	rdx, QWORD PTR [rax+rsi*8]	# _70, MEM[base: _120, index: _121, step: 8, offset: 0B]
 1481 0834 4883C008 		add	rax, 8	# ivtmp.236,
 1482              	# sieve_extend.c:600:         bitarray[copy_word] = bitarray[source_word];
 600:sieve_extend.c ****         source_word++;
 1483              		.loc 1 600 29 view .LVU394
 1484 0838 488950F8 		mov	QWORD PTR -8[rax], rdx	# MEM[base: _120, offset: 0B], _70
 601:sieve_extend.c ****         copy_word++;
 1485              		.loc 1 601 9 is_stmt 1 view .LVU395
 602:sieve_extend.c ****     }
 1486              		.loc 1 602 9 view .LVU396
 599:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 1487              		.loc 1 599 10 view .LVU397
 1488 083c 4839C8   		cmp	rax, rcx	# ivtmp.236, _125
 1489 083f 75EF     		jne	.L86	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 54


 1490              	# sieve_extend.c:605: }
 605:sieve_extend.c **** 
 1491              		.loc 1 605 1 is_stmt 0 view .LVU398
 1492 0841 488D65D8 		lea	rsp, -40[rbp]	#,
 1493              	.LVL114:
 605:sieve_extend.c **** 
 1494              		.loc 1 605 1 view .LVU399
 1495 0845 5B       		pop	rbx	#
 1496              	.LVL115:
 605:sieve_extend.c **** 
 1497              		.loc 1 605 1 view .LVU400
 1498 0846 415C     		pop	r12	#
 1499 0848 415D     		pop	r13	#
 1500 084a 415E     		pop	r14	#
 1501 084c 415F     		pop	r15	#
 1502 084e 5D       		pop	rbp	#
 1503              		.cfi_def_cfa 7, 8
 1504              	.LVL116:
 605:sieve_extend.c **** 
 1505              		.loc 1 605 1 view .LVU401
 1506 084f C3       		ret	
 1507              		.cfi_endproc
 1508              	.LFE66:
 1510              		.p2align 4
 1512              	extendSieve_shiftleft:
 1513              	.LVL117:
 1514              	.LFB72:
 845:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 1515              		.loc 1 845 142 is_stmt 1 view -0
 1516              		.cfi_startproc
 846:sieve_extend.c **** 
 1517              		.loc 1 846 5 view .LVU403
 848:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 1518              		.loc 1 848 5 view .LVU404
 1519              	# sieve_extend.c:845: static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source
 845:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 1520              		.loc 1 845 142 is_stmt 0 view .LVU405
 1521 0850 55       		push	rbp	#
 1522              		.cfi_def_cfa_offset 16
 1523              		.cfi_offset 6, -16
 1524              	# sieve_extend.c:848:     const counter_t destination_stop_word = wordindex(destination_stop);
 848:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 1525              		.loc 1 848 21 view .LVU406
 1526 0851 48C1E906 		shr	rcx, 6	# tmp698,
 1527              	.LVL118:
 1528              	# sieve_extend.c:850:     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_
 850:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1529              		.loc 1 850 39 view .LVU407
 1530 0855 4889F0   		mov	rax, rsi	# _4, source_start
 1531              	# sieve_extend.c:845: static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source
 845:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 1532              		.loc 1 845 142 view .LVU408
 1533 0858 4889E5   		mov	rbp, rsp	#,
 1534              		.cfi_def_cfa_register 6
 1535 085b 4157     		push	r15	#
 1536              	# sieve_extend.c:850:     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_
 850:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
GAS LISTING /tmp/ccrNbbzt.s 			page 55


 1537              		.loc 1 850 39 view .LVU409
 1538 085d 83E03F   		and	eax, 63	# _4,
 1539              		.cfi_offset 15, -24
 1540              	# sieve_extend.c:848:     const counter_t destination_stop_word = wordindex(destination_stop);
 848:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 1541              		.loc 1 848 21 view .LVU410
 1542 0860 4989CF   		mov	r15, rcx	# destination_stop_word, tmp698
 1543              	# sieve_extend.c:845: static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source
 845:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 1544              		.loc 1 845 142 view .LVU411
 1545 0863 4156     		push	r14	#
 1546              		.cfi_offset 14, -32
 1547 0865 4989D6   		mov	r14, rdx	# size, tmp697
 1548 0868 4155     		push	r13	#
 1549 086a 4154     		push	r12	#
 1550              		.cfi_offset 13, -40
 1551              		.cfi_offset 12, -48
 1552              	# sieve_extend.c:849:     const counter_t copy_start = source_start + size;
 849:sieve_extend.c ****     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
 1553              		.loc 1 849 21 view .LVU412
 1554 086c 4C8D2416 		lea	r12, [rsi+rdx]	# copy_start,
 1555              	# sieve_extend.c:852:     register counter_t source_word = wordindex(source_start);
 852:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 1556              		.loc 1 852 24 view .LVU413
 1557 0870 48C1EE06 		shr	rsi, 6	# source_start,
 1558              	.LVL119:
 1559              	# sieve_extend.c:845: static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source
 845:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 1560              		.loc 1 845 142 view .LVU414
 1561 0874 53       		push	rbx	#
 1562              	# sieve_extend.c:852:     register counter_t source_word = wordindex(source_start);
 852:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 1563              		.loc 1 852 24 view .LVU415
 1564 0875 4989F5   		mov	r13, rsi	# source_word, source_start
 1565              		.cfi_offset 3, -56
 1566              	# sieve_extend.c:845: static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source
 845:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 1567              		.loc 1 845 142 view .LVU416
 1568 0878 4889FB   		mov	rbx, rdi	# bitarray, tmp695
 1569 087b 4883E4E0 		and	rsp, -32	#,
 1570 087f 4883EC60 		sub	rsp, 96	#,
 1571              	# sieve_extend.c:848:     const counter_t destination_stop_word = wordindex(destination_stop);
 848:sieve_extend.c ****     const counter_t copy_start = source_start + size;
 1572              		.loc 1 848 21 view .LVU417
 1573 0883 48894C24 		mov	QWORD PTR 88[rsp], rcx	# %sfp, destination_stop_word
 1573      58
 1574              	.LVL120:
 849:sieve_extend.c ****     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_calc(copy_start);
 1575              		.loc 1 849 5 is_stmt 1 view .LVU418
 850:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1576              		.loc 1 850 5 view .LVU419
 1577              	# sieve_extend.c:850:     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_
 850:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1578              		.loc 1 850 69 is_stmt 0 view .LVU420
 1579 0888 4C89E1   		mov	rcx, r12	# _5, copy_start
 1580              	.LVL121:
 850:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
GAS LISTING /tmp/ccrNbbzt.s 			page 56


 1581              		.loc 1 850 69 view .LVU421
 1582 088b 83E13F   		and	ecx, 63	# _5,
 1583              	.LVL122:
 851:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 1584              		.loc 1 851 5 is_stmt 1 view .LVU422
 852:sieve_extend.c ****     register counter_t copy_word = wordindex(copy_start);
 1585              		.loc 1 852 5 view .LVU423
 853:sieve_extend.c ****     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 1586              		.loc 1 853 5 view .LVU424
 1587              	# sieve_extend.c:850:     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_
 850:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1588              		.loc 1 850 31 is_stmt 0 view .LVU425
 1589 088e 4889C7   		mov	rdi, rax	# shift, _4
 1590              	.LVL123:
 1591              	# sieve_extend.c:855:                              | (bitarray[source_word+1] << shift_flipped))
 855:sieve_extend.c ****                              & ~chopmask(copy_start); // because this is the first word, dont copy 
 1592              		.loc 1 855 41 view .LVU426
 1593 0891 4D8D5501 		lea	r10, 1[r13]	# _183,
 1594              	# sieve_extend.c:850:     register const bitshift_t shift = bitindex_calc(source_start) - bitindex_
 850:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1595              		.loc 1 850 31 view .LVU427
 1596 0895 4829CF   		sub	rdi, rcx	# shift, _5
 1597              	.LVL124:
 1598              	# sieve_extend.c:855:                              | (bitarray[source_word+1] << shift_flipped))
 855:sieve_extend.c ****                              & ~chopmask(copy_start); // because this is the first word, dont copy 
 1599              		.loc 1 855 41 view .LVU428
 1600 0898 4C895424 		mov	QWORD PTR 80[rsp], r10	# %sfp, _183
 1600      50
 1601              	# sieve_extend.c:851:     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 851:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 1602              		.loc 1 851 31 view .LVU429
 1603 089d 4829C1   		sub	rcx, rax	# tmp470, _4
 1604              	.LVL125:
 1605              	# sieve_extend.c:854:     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 854:sieve_extend.c ****                              | (bitarray[source_word+1] << shift_flipped))
 1606              		.loc 1 854 52 view .LVU430
 1607 08a0 4E8B14EB 		mov	r10, QWORD PTR [rbx+r13*8]	# *_10, *_10
 1608              	# sieve_extend.c:851:     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 851:sieve_extend.c ****     register counter_t source_word = wordindex(source_start);
 1609              		.loc 1 851 31 view .LVU431
 1610 08a4 4883C140 		add	rcx, 64	# shift_flipped,
 1611              	.LVL126:
 1612              	# sieve_extend.c:845: static void extendSieve_shiftleft(bitword_t* bitarray, const counter_t source
 845:sieve_extend.c ****     debug printf("Extending sieve size %ju in %ju bit range (%ju-%ju) using shiftleft (%ju copies)\
 1613              		.loc 1 845 142 view .LVU432
 1614 08a8 48895424 		mov	QWORD PTR 24[rsp], rdx	# %sfp, size
 1614      18
 1615              	# sieve_extend.c:854:     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 854:sieve_extend.c ****                              | (bitarray[source_word+1] << shift_flipped))
 1616              		.loc 1 854 38 view .LVU433
 1617 08ad 4A8D14ED 		lea	rdx, 0[0+r13*8]	# _9,
 1617      00000000 
 1618              	.LVL127:
 1619              	# sieve_extend.c:855:                              | (bitarray[source_word+1] << shift_flipped))
 855:sieve_extend.c ****                              & ~chopmask(copy_start); // because this is the first word, dont copy 
 1620              		.loc 1 855 57 view .LVU434
 1621 08b5 C4E2F1F7 		shlx	rax, QWORD PTR 8[rbx+rdx], rcx	# tmp472, *_16, shift_flipped
GAS LISTING /tmp/ccrNbbzt.s 			page 57


 1621      441308
 1622              	# sieve_extend.c:853:     register counter_t copy_word = wordindex(copy_start);
 853:sieve_extend.c ****     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 1623              		.loc 1 853 24 view .LVU435
 1624 08bc 4D89E3   		mov	r11, r12	# copy_word, copy_start
 1625              	# sieve_extend.c:854:     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 854:sieve_extend.c ****                              | (bitarray[source_word+1] << shift_flipped))
 1626              		.loc 1 854 52 view .LVU436
 1627 08bf C442C3F7 		shrx	r10, r10, rdi	# tmp474, *_10, shift
 1627      D2
 1628              	# sieve_extend.c:856:                              & ~chopmask(copy_start); // because this is the 
 856:sieve_extend.c **** 
 1629              		.loc 1 856 33 view .LVU437
 1630 08c4 41F7D4   		not	r12d	# tmp477
 1631              	.LVL128:
 1632              	# sieve_extend.c:855:                              | (bitarray[source_word+1] << shift_flipped))
 855:sieve_extend.c ****                              & ~chopmask(copy_start); // because this is the first word, dont copy 
 1633              		.loc 1 855 30 view .LVU438
 1634 08c7 4909C2   		or	r10, rax	# tmp476, tmp472
 1635              	# sieve_extend.c:856:                              & ~chopmask(copy_start); // because this is the 
 856:sieve_extend.c **** 
 1636              		.loc 1 856 33 view .LVU439
 1637 08ca 48C7C0FF 		mov	rax, -1	# tmp480,
 1637      FFFFFF
 1638 08d1 C4E29BF7 		shrx	rax, rax, r12	# tmp479, tmp480, tmp477
 1638      C0
 1639              	# sieve_extend.c:856:                              & ~chopmask(copy_start); // because this is the 
 856:sieve_extend.c **** 
 1640              		.loc 1 856 30 view .LVU440
 1641 08d6 C4C2F8F2 		andn	rax, rax, r10	# tmp482, tmp479, tmp476
 1641      C2
 1642              	# sieve_extend.c:861:     const counter_t aligned_copy_word = min(source_word + size, destination_s
 861:sieve_extend.c ****     const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, 
 1643              		.loc 1 861 41 view .LVU441
 1644 08db 4C8B5424 		mov	r10, QWORD PTR 80[rsp]	# tmp483, %sfp
 1644      50
 1645              	# sieve_extend.c:853:     register counter_t copy_word = wordindex(copy_start);
 853:sieve_extend.c ****     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 1646              		.loc 1 853 24 view .LVU442
 1647 08e0 49C1EB06 		shr	r11, 6	# copy_word,
 1648              	.LVL129:
 854:sieve_extend.c ****                              | (bitarray[source_word+1] << shift_flipped))
 1649              		.loc 1 854 5 is_stmt 1 view .LVU443
 1650              	# sieve_extend.c:861:     const counter_t aligned_copy_word = min(source_word + size, destination_s
 861:sieve_extend.c ****     const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, 
 1651              		.loc 1 861 41 is_stmt 0 view .LVU444
 1652 08e4 4D01F2   		add	r10, r14	# tmp483, size
 1653              	# sieve_extend.c:854:     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 854:sieve_extend.c ****                              | (bitarray[source_word+1] << shift_flipped))
 1654              		.loc 1 854 25 view .LVU445
 1655 08e7 4A8D34DD 		lea	rsi, 0[0+r11*8]	# _6,
 1655      00000000 
 1656 08ef 48090433 		or	QWORD PTR [rbx+rsi], rax	# *_7, tmp482
 858:sieve_extend.c ****     source_word++;
 1657              		.loc 1 858 5 is_stmt 1 view .LVU446
 1658              	# sieve_extend.c:861:     const counter_t aligned_copy_word = min(source_word + size, destination_s
 861:sieve_extend.c ****     const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, 
GAS LISTING /tmp/ccrNbbzt.s 			page 58


 1659              		.loc 1 861 21 is_stmt 0 view .LVU447
 1660 08f3 4D39FA   		cmp	r10, r15	# tmp483, destination_stop_word
 1661 08f6 4D0F47D7 		cmova	r10, r15	# tmp483,, tmp483, destination_stop_word
 1662              	# sieve_extend.c:858:     copy_word++;
 858:sieve_extend.c ****     source_word++;
 1663              		.loc 1 858 14 view .LVU448
 1664 08fa 498D4301 		lea	rax, 1[r11]	# ivtmp.328,
 1665              	.LVL130:
 859:sieve_extend.c **** 
 1666              		.loc 1 859 5 is_stmt 1 view .LVU449
 861:sieve_extend.c ****     const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, 
 1667              		.loc 1 861 5 view .LVU450
 1668              	# sieve_extend.c:861:     const counter_t aligned_copy_word = min(source_word + size, destination_s
 861:sieve_extend.c ****     const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, 
 1669              		.loc 1 861 21 is_stmt 0 view .LVU451
 1670 08fe 4D89D7   		mov	r15, r10	# aligned_copy_word, tmp483
 1671              	.LVL131:
 1672              	.LBB288:
 1673              	.LBB289:
 1674              	# sieve_extend.c:702:     const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_co
 702:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1675              		.loc 1 702 91 view .LVU452
 1676 0901 4983FA02 		cmp	r10, 2	# aligned_copy_word,
 1677              	.LBE289:
 1678              	.LBE288:
 1679              	# sieve_extend.c:861:     const counter_t aligned_copy_word = min(source_word + size, destination_s
 861:sieve_extend.c ****     const counter_t distance  = extendSieve_shiftleft_unrolled(bitarray, aligned_copy_word, shift, 
 1680              		.loc 1 861 21 view .LVU453
 1681 0905 4C895424 		mov	QWORD PTR 64[rsp], r10	# %sfp, aligned_copy_word
 1681      40
 1682              	.LVL132:
 862:sieve_extend.c ****     source_word += distance;
 1683              		.loc 1 862 5 is_stmt 1 view .LVU454
 1684              	.LBB300:
 1685              	.LBI288:
 701:sieve_extend.c ****     const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_copy_word - 2) : 0; // s
 1686              		.loc 1 701 25 view .LVU455
 1687              	.LBB296:
 702:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1688              		.loc 1 702 5 view .LVU456
 1689              	# sieve_extend.c:702:     const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_co
 702:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1690              		.loc 1 702 91 is_stmt 0 view .LVU457
 1691 090a 41BA0200 		mov	r10d, 2	# tmp484,
 1691      0000
 1692 0910 4D0F43D7 		cmovnb	r10, r15	# aligned_copy_word,, _86
 1693              	.LBE296:
 1694              	.LBE300:
 1695              	# sieve_extend.c:854:     bitarray[copy_word] |= ((bitarray[source_word] >> shift)
 854:sieve_extend.c ****                              | (bitarray[source_word+1] << shift_flipped))
 1696              		.loc 1 854 52 view .LVU458
 1697 0914 4189F8   		mov	r8d, edi	# _12, shift
 1698              	.LBB301:
 1699              	.LBB297:
 1700              	# sieve_extend.c:702:     const counter_t fast_loop_stop_word = (aligned_copy_word>2) ? (aligned_co
 702:sieve_extend.c ****     register const bitshift_t shift_flipped = WORD_SIZE_bitshift-shift;
 1701              		.loc 1 702 21 view .LVU459
GAS LISTING /tmp/ccrNbbzt.s 			page 59


 1702 0917 4D8D7AFE 		lea	r15, -2[r10]	# fast_loop_stop_word,
 1703 091b 4C897C24 		mov	QWORD PTR 72[rsp], r15	# %sfp, fast_loop_stop_word
 1703      48
 1704              	.LVL133:
 703:sieve_extend.c ****     counter_t distance = 0;
 1705              		.loc 1 703 5 is_stmt 1 view .LVU460
 704:sieve_extend.c ****     while (copy_word < fast_loop_stop_word) {
 1706              		.loc 1 704 5 view .LVU461
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1707              		.loc 1 705 5 view .LVU462
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1708              		.loc 1 705 11 view .LVU463
 1709              	.LBE297:
 1710              	.LBE301:
 1711              	# sieve_extend.c:855:                              | (bitarray[source_word+1] << shift_flipped))
 855:sieve_extend.c ****                              & ~chopmask(copy_start); // because this is the first word, dont copy 
 1712              		.loc 1 855 57 is_stmt 0 view .LVU464
 1713 0920 4189C9   		mov	r9d, ecx	# _18, shift_flipped
 1714              	.LBB302:
 1715              	.LBB298:
 1716              	# sieve_extend.c:705:     while (copy_word < fast_loop_stop_word) {
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1717              		.loc 1 705 11 view .LVU465
 1718 0923 4C39F8   		cmp	rax, r15	# ivtmp.328, fast_loop_stop_word
 1719 0926 0F83D002 		jnb	.L103	#,
 1719      0000
 1720 092c 4D29DA   		sub	r10, r11	# tmp485, copy_word
 1721 092f 4D8D7AFC 		lea	r15, -4[r10]	# _269,
 1722              	.LVL134:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1723              		.loc 1 705 11 view .LVU466
 1724 0933 4C8D7240 		lea	r14, 64[rdx]	# tmp487,
 1725              	.LVL135:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1726              		.loc 1 705 11 view .LVU467
 1727 0937 4C897C24 		mov	QWORD PTR 40[rsp], r15	# %sfp, _269
 1727      28
 1728 093c 4C8D7E10 		lea	r15, 16[rsi]	# tmp488,
 1729 0940 4C8D5648 		lea	r10, 72[rsi]	# tmp491,
 1730 0944 4D39FE   		cmp	r14, r15	# tmp487, tmp488
 1731 0947 4C8D6208 		lea	r12, 8[rdx]	# tmp690,
 1732 094b 4C897C24 		mov	QWORD PTR 56[rsp], r15	# %sfp, tmp488
 1732      38
 1733 0950 410F9EC7 		setle	r15b	#, tmp490
 1734 0954 4D39E2   		cmp	r10, r12	# tmp491, tmp690
 1735 0957 4C8D6A50 		lea	r13, 80[rdx]	# tmp496,
 1736 095b 4C895424 		mov	QWORD PTR 48[rsp], r10	# %sfp, tmp491
 1736      30
 1737 0960 410F9EC2 		setle	r10b	#, tmp494
 1738 0964 4509FA   		or	r10d, r15d	# tmp495, tmp490
 1739 0967 4C3B6C24 		cmp	r13, QWORD PTR 56[rsp]	# tmp496, %sfp
 1739      38
 1740 096c 410F9EC7 		setle	r15b	#, tmp499
 1741 0970 4883C210 		add	rdx, 16	# tmp501,
 1742 0974 48395424 		cmp	QWORD PTR 48[rsp], rdx	# %sfp, tmp501
 1742      30
 1743 0979 48895424 		mov	QWORD PTR 32[rsp], rdx	# %sfp, tmp501
GAS LISTING /tmp/ccrNbbzt.s 			page 60


 1743      20
 1744 097e 0F9EC2   		setle	dl	#, tmp503
 1745 0981 4109D7   		or	r15d, edx	# tmp504, tmp503
 1746 0984 4521FA   		and	r10d, r15d	# tmp505, tmp504
 1747 0987 48837C24 		cmp	QWORD PTR 40[rsp], 11	# %sfp,
 1747      280B
 1748 098d 0F97C2   		seta	dl	#, tmp507
 1749 0990 4121D2   		and	r10d, edx	# tmp508, tmp507
 1750 0993 488D5608 		lea	rdx, 8[rsi]	# tmp510,
 1751 0997 4939D6   		cmp	r14, rdx	# tmp487, tmp510
 1752 099a 410F9EC6 		setle	r14b	#, tmp512
 1753 099e 4883C640 		add	rsi, 64	# tmp513,
 1754 09a2 4C39E6   		cmp	rsi, r12	# tmp513, tmp690
 1755 09a5 410F9EC7 		setle	r15b	#, tmp516
 1756 09a9 4509FE   		or	r14d, r15d	# tmp517, tmp516
 1757 09ac 4521F2   		and	r10d, r14d	# tmp518, tmp517
 1758 09af 4939D5   		cmp	r13, rdx	# tmp496, tmp510
 1759 09b2 410F9EC5 		setle	r13b	#, tmp522
 1760 09b6 483B7424 		cmp	rsi, QWORD PTR 32[rsp]	# tmp513, %sfp
 1760      20
 1761 09bb 410F9EC6 		setle	r14b	#, tmp526
 1762 09bf 4509F5   		or	r13d, r14d	# tmp527, tmp526
 1763 09c2 4584EA   		test	r10b, r13b	# tmp518, tmp527
 1764 09c5 0F840D05 		je	.L104	#,
 1764      0000
 1765 09cb 4C8B7C24 		mov	r15, QWORD PTR 56[rsp]	# tmp488, %sfp
 1765      38
 1766 09d0 48395424 		cmp	QWORD PTR 48[rsp], rdx	# %sfp, tmp510
 1766      30
 1767 09d5 410F9EC2 		setle	r10b	#, tmp532
 1768 09d9 4C39FE   		cmp	rsi, r15	# tmp513, tmp488
 1769 09dc 400F9EC6 		setle	sil	#, tmp536
 1770 09e0 4108F2   		or	r10b, sil	# tmp532, tmp536
 1771 09e3 0F84EF04 		je	.L104	#,
 1771      0000
 1772 09e9 4C8B5C24 		mov	r11, QWORD PTR 40[rsp]	# _269, %sfp
 1772      28
 1773              	.LVL136:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1774              		.loc 1 705 11 view .LVU468
 1775 09ee 4C8B6C24 		mov	r13, QWORD PTR 32[rsp]	# tmp501, %sfp
 1775      20
 1776 09f3 4901DF   		add	r15, rbx	# tmp488, bitarray
 1777 09f6 49C1EB03 		shr	r11, 3	# _269,
 1778 09fa 4901DC   		add	r12, rbx	# vectp.293, bitarray
 1779 09fd 4901DD   		add	r13, rbx	# tmp501, bitarray
 1780 0a00 4801DA   		add	rdx, rbx	# _450, bitarray
 1781 0a03 4D89FA   		mov	r10, r15	# _470, tmp488
 1782 0a06 31F6     		xor	esi, esi	# ivtmp.368
 1783 0a08 4531F6   		xor	r14d, r14d	# ivtmp.366
 1784 0a0b C5F96EEF 		vmovd	xmm5, edi	# _12, _12
 1785 0a0f C5F96EE1 		vmovd	xmm4, ecx	# _18, _18
 1786              	.LVL137:
 1787              		.p2align 4,,10
 1788 0a13 0F1F4400 		.p2align 3
 1788      00
 1789              	.L105:
GAS LISTING /tmp/ccrNbbzt.s 			page 61


 1790              	.LBB290:
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1791              		.loc 1 706 9 is_stmt 1 view .LVU469
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1792              		.loc 1 707 9 view .LVU470
 1793              	# sieve_extend.c:706:         bitword_t source0 = bitarray[source_word  ];
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1794              		.loc 1 706 19 is_stmt 0 view .LVU471
 1795 0a18 C4C17E6F 		vmovdqu	ymm7, YMMWORD PTR [r12+rsi]	# tmp795, MEM[base: vectp.293_427, index: ivtmp.368_621, offse
 1795      3C34
 1796              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1797              		.loc 1 707 19 view .LVU472
 1798 0a1e C4C17E6F 		vmovdqu	ymm1, YMMWORD PTR 0[r13+rsi]	# MEM[base: vectp.297_436, index: ivtmp.368_621, offset: 0B],
 1798      4C3500
 1799 0a25 C4C17E6F 		vmovdqu	ymm0, YMMWORD PTR 32[r13+rsi]	# MEM[base: vectp.297_436, index: ivtmp.368_621, offset: 32B
 1799      443520
 1800              	# sieve_extend.c:706:         bitword_t source0 = bitarray[source_word  ];
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1801              		.loc 1 706 19 view .LVU473
 1802 0a2c C4C1456C 		vpunpcklqdq	ymm2, ymm7, YMMWORD PTR 32[r12+rsi]	# tmp548, tmp795, MEM[base: vectp.293_427, index: 
 1802      543420
 1803              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1804              		.loc 1 707 19 view .LVU474
 1805 0a33 C5F56CD8 		vpunpcklqdq	ymm3, ymm1, ymm0	# tmp544, MEM[base: vectp.297_436, index: ivtmp.368_621, offset: 0B],
 1806 0a37 C4E3FD00 		vpermq	ymm3, ymm3, 216	# vect_perm_even_444, tmp544,
 1806      DBD8
 1807              	.LVL138:
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1808              		.loc 1 708 9 is_stmt 1 view .LVU475
 1809              	# sieve_extend.c:706:         bitword_t source0 = bitarray[source_word  ];
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1810              		.loc 1 706 19 is_stmt 0 view .LVU476
 1811 0a3d C4E3FD00 		vpermq	ymm2, ymm2, 216	# tmp547, tmp548,
 1811      D2D8
 1812              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1813              		.loc 1 707 19 view .LVU477
 1814 0a43 C5F56DC0 		vpunpckhqdq	ymm0, ymm1, ymm0	# tmp562, MEM[base: vectp.297_436, index: ivtmp.368_621, offset: 0B],
 1815              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1816              		.loc 1 708 63 view .LVU478
 1817 0a47 C5E5F3F4 		vpsllq	ymm6, ymm3, xmm4	# vect__100.301, vect_perm_even_444, _18
 1818              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1819              		.loc 1 708 42 view .LVU479
 1820 0a4b C5EDD3D5 		vpsrlq	ymm2, ymm2, xmm5	# vect__98.300, tmp547, _12
 1821              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1822              		.loc 1 707 19 view .LVU480
 1823 0a4f C4E3FD00 		vpermq	ymm0, ymm0, 216	# tmp561, tmp562,
 1823      C0D8
 1824              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1825              		.loc 1 710 63 view .LVU481
 1826 0a55 C5FDF3C4 		vpsllq	ymm0, ymm0, xmm4	# vect__110.304, tmp561, _18
GAS LISTING /tmp/ccrNbbzt.s 			page 62


 1827              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1828              		.loc 1 710 42 view .LVU482
 1829 0a59 C5E5D3DD 		vpsrlq	ymm3, ymm3, xmm5	# vect__109.303, vect_perm_even_444, _12
 1830              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1831              		.loc 1 708 52 view .LVU483
 1832 0a5d C5EDEBD6 		vpor	ymm2, ymm2, ymm6	# vect__104.302, vect__98.300, vect__100.301
 1833              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1834              		.loc 1 708 31 view .LVU484
 1835 0a61 C5F9D614 		vmovq	QWORD PTR [rdx+rsi], xmm2	# MEM[base: _450, index: ivtmp.368_621, offset: 0B], tmp554
 1835      32
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1836              		.loc 1 708 31 view .LVU485
 1837 0a66 C4E3F916 		vpextrq	QWORD PTR 16[rdx+rsi], xmm2, 1	# MEM[base: _450, index: ivtmp.368_621, offset: 16B], tmp55
 1837      54321001 
 1838              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1839              		.loc 1 710 52 view .LVU486
 1840 0a6e C5FDEBC3 		vpor	ymm0, ymm0, ymm3	# vect__114.305, vect__110.304, vect__109.303
 1841              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1842              		.loc 1 708 31 view .LVU487
 1843 0a72 C4E37D39 		vextracti128	xmm2, ymm2, 0x1	# tmp558, vect__104.302
 1843      D201
 1844 0a78 C5F9D654 		vmovq	QWORD PTR 32[rdx+rsi], xmm2	# MEM[base: _450, index: ivtmp.368_621, offset: 32B], tmp558
 1844      3220
 1845 0a7e C4E3F916 		vpextrq	QWORD PTR 48[rdx+rsi], xmm2, 1	# MEM[base: _450, index: ivtmp.368_621, offset: 48B], tmp55
 1845      54323001 
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 1846              		.loc 1 709 9 is_stmt 1 view .LVU488
 1847              	.LVL139:
 710:sieve_extend.c ****         copy_word += 2;
 1848              		.loc 1 710 9 view .LVU489
 1849 0a86 49FFC6   		inc	r14	# ivtmp.366
 1850              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1851              		.loc 1 710 31 is_stmt 0 view .LVU490
 1852 0a89 C4C179D6 		vmovq	QWORD PTR [r10+rsi], xmm0	# MEM[base: _470, index: ivtmp.368_621, offset: 0B], tmp568
 1852      0432
 710:sieve_extend.c ****         copy_word += 2;
 1853              		.loc 1 710 31 view .LVU491
 1854 0a8f C4C3F916 		vpextrq	QWORD PTR 16[r10+rsi], xmm0, 1	# MEM[base: _470, index: ivtmp.368_621, offset: 16B], tmp56
 1854      44321001 
 1855 0a97 C4E37D39 		vextracti128	xmm0, ymm0, 0x1	# tmp572, vect__114.305
 1855      C001
 1856 0a9d C4C179D6 		vmovq	QWORD PTR 32[r10+rsi], xmm0	# MEM[base: _470, index: ivtmp.368_621, offset: 32B], tmp572
 1856      443220
 1857 0aa4 C4C3F916 		vpextrq	QWORD PTR 48[r10+rsi], xmm0, 1	# MEM[base: _470, index: ivtmp.368_621, offset: 48B], tmp57
 1857      44323001 
 711:sieve_extend.c ****         source_word += 2;
 1858              		.loc 1 711 9 is_stmt 1 view .LVU492
 712:sieve_extend.c ****         distance += 2;
 1859              		.loc 1 712 9 view .LVU493
 713:sieve_extend.c ****     }
 1860              		.loc 1 713 9 view .LVU494
GAS LISTING /tmp/ccrNbbzt.s 			page 63


 713:sieve_extend.c ****     }
 1861              		.loc 1 713 9 is_stmt 0 view .LVU495
 1862              	.LBE290:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1863              		.loc 1 705 11 is_stmt 1 view .LVU496
 1864 0aac 4883C640 		add	rsi, 64	# ivtmp.368,
 1865 0ab0 4D39F3   		cmp	r11, r14	# bnd.286, ivtmp.366
 1866 0ab3 0F875FFF 		ja	.L105	#,
 1866      FFFF
 1867 0ab9 488B7424 		mov	rsi, QWORD PTR 80[rsp]	# _183, %sfp
 1867      50
 1868 0abe 4A8D14DD 		lea	rdx, 0[0+r11*8]	# _420,
 1868      00000000 
 1869 0ac6 4C8D1C16 		lea	r11, [rsi+rdx]	# tmp.288,
 1870              	.LBB291:
 1871              	# sieve_extend.c:706:         bitword_t source0 = bitarray[source_word  ];
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1872              		.loc 1 706 37 is_stmt 0 view .LVU497
 1873 0aca 4E8D2CDD 		lea	r13, 0[0+r11*8]	# _55,
 1873      00000000 
 1874              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1875              		.loc 1 707 19 view .LVU498
 1876 0ad2 4E8B642B 		mov	r12, QWORD PTR 8[rbx+r13]	# source1, *_223
 1876      08
 1877 0ad7 488D3410 		lea	rsi, [rax+rdx]	# tmp.289,
 1878              	.LVL140:
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1879              		.loc 1 706 9 is_stmt 1 view .LVU499
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1880              		.loc 1 707 9 view .LVU500
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1881              		.loc 1 708 9 view .LVU501
 1882              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1883              		.loc 1 708 42 is_stmt 0 view .LVU502
 1884 0adb C422C3F7 		shrx	r10, QWORD PTR [rbx+r11*8], rdi	# tmp576, *_56, shift
 1884      14DB
 1885              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1886              		.loc 1 708 63 view .LVU503
 1887 0ae1 C442F1F7 		shlx	r14, r12, rcx	# tmp578, source1, shift_flipped
 1887      F4
 1888              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1889              		.loc 1 708 52 view .LVU504
 1890 0ae6 4D09F2   		or	r10, r14	# tmp579, tmp578
 1891 0ae9 4C8914F3 		mov	QWORD PTR [rbx+rsi*8], r10	# *_78, tmp579
 1892              	.LVL141:
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 1893              		.loc 1 709 9 is_stmt 1 view .LVU505
 1894              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1895              		.loc 1 710 42 is_stmt 0 view .LVU506
 1896 0aed C442C3F7 		shrx	r12, r12, rdi	# tmp582, source1, shift
 1896      E4
 1897              	.LVL142:
GAS LISTING /tmp/ccrNbbzt.s 			page 64


 1898              	# sieve_extend.c:709:         bitword_t source2 = bitarray[source_word+2];
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 1899              		.loc 1 709 37 view .LVU507
 1900 0af2 4D8D7302 		lea	r14, 2[r11]	# _493,
 1901              	.LVL143:
 710:sieve_extend.c ****         copy_word += 2;
 1902              		.loc 1 710 9 is_stmt 1 view .LVU508
 1903              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1904              		.loc 1 710 63 is_stmt 0 view .LVU509
 1905 0af6 4E8B542B 		mov	r10, QWORD PTR 16[rbx+r13]	# *_495, *_495
 1905      10
 1906              	# sieve_extend.c:711:         copy_word += 2;
 711:sieve_extend.c ****         source_word += 2;
 1907              		.loc 1 711 19 view .LVU510
 1908 0afb 4C8D6E02 		lea	r13, 2[rsi]	# copy_word,
 1909              	.LVL144:
 1910              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1911              		.loc 1 710 63 view .LVU511
 1912 0aff C442F1F7 		shlx	r10, r10, rcx	# tmp580, *_495, shift_flipped
 1912      D2
 1913              	.LVL145:
 1914              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1915              		.loc 1 710 52 view .LVU512
 1916 0b04 4D09D4   		or	r12, r10	# tmp583, tmp580
 1917 0b07 4C8964F3 		mov	QWORD PTR 8[rbx+rsi*8], r12	# *_501, tmp583
 1917      08
 1918              	.LVL146:
 711:sieve_extend.c ****         source_word += 2;
 1919              		.loc 1 711 9 is_stmt 1 view .LVU513
 712:sieve_extend.c ****         distance += 2;
 1920              		.loc 1 712 9 view .LVU514
 713:sieve_extend.c ****     }
 1921              		.loc 1 713 9 view .LVU515
 1922              	# sieve_extend.c:713:         distance += 2;
 713:sieve_extend.c ****     }
 1923              		.loc 1 713 18 is_stmt 0 view .LVU516
 1924 0b0c 4C8D5202 		lea	r10, 2[rdx]	# distance,
 1925              	.LVL147:
 713:sieve_extend.c ****     }
 1926              		.loc 1 713 18 view .LVU517
 1927              	.LBE291:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1928              		.loc 1 705 11 is_stmt 1 view .LVU518
 1929 0b10 4C396C24 		cmp	QWORD PTR 72[rsp], r13	# %sfp, copy_word
 1929      48
 1930 0b15 0F86D900 		jbe	.L108	#,
 1930      0000
 1931              	.LBB292:
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1932              		.loc 1 706 9 view .LVU519
 1933              	# sieve_extend.c:706:         bitword_t source0 = bitarray[source_word  ];
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1934              		.loc 1 706 37 is_stmt 0 view .LVU520
 1935 0b1b 4E8D3CF5 		lea	r15, 0[0+r14*8]	# _510,
GAS LISTING /tmp/ccrNbbzt.s 			page 65


 1935      00000000 
 1936              	.LVL148:
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1937              		.loc 1 707 9 is_stmt 1 view .LVU521
 1938              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 1939              		.loc 1 707 19 is_stmt 0 view .LVU522
 1940 0b23 4E8B643B 		mov	r12, QWORD PTR 8[rbx+r15]	# source1, *_515
 1940      08
 1941              	.LVL149:
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1942              		.loc 1 708 9 is_stmt 1 view .LVU523
 1943              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1944              		.loc 1 708 42 is_stmt 0 view .LVU524
 1945 0b28 4E8B14F3 		mov	r10, QWORD PTR [rbx+r14*8]	# *_511, *_511
 1946              	.LVL150:
 1947              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1948              		.loc 1 708 63 view .LVU525
 1949 0b2c C442F1F7 		shlx	r14, r12, rcx	# tmp586, source1, shift_flipped
 1949      F4
 1950              	.LVL151:
 1951              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1952              		.loc 1 708 42 view .LVU526
 1953 0b31 C442C3F7 		shrx	r10, r10, rdi	# tmp584, *_511, shift
 1953      D2
 1954              	.LVL152:
 1955              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 1956              		.loc 1 708 52 view .LVU527
 1957 0b36 4D09F2   		or	r10, r14	# tmp587, tmp586
 1958 0b39 4E8914EB 		mov	QWORD PTR [rbx+r13*8], r10	# *_520, tmp587
 1959              	.LVL153:
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 1960              		.loc 1 709 9 is_stmt 1 view .LVU528
 1961              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1962              		.loc 1 710 42 is_stmt 0 view .LVU529
 1963 0b3d C442C3F7 		shrx	r12, r12, rdi	# tmp590, source1, shift
 1963      E4
 1964              	.LVL154:
 1965              	# sieve_extend.c:709:         bitword_t source2 = bitarray[source_word+2];
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 1966              		.loc 1 709 37 view .LVU530
 1967 0b42 4D8D7304 		lea	r14, 4[r11]	# _523,
 1968              	.LVL155:
 710:sieve_extend.c ****         copy_word += 2;
 1969              		.loc 1 710 9 is_stmt 1 view .LVU531
 1970              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1971              		.loc 1 710 63 is_stmt 0 view .LVU532
 1972 0b46 4E8B543B 		mov	r10, QWORD PTR 16[rbx+r15]	# *_525, *_525
 1972      10
 1973 0b4b C442F1F7 		shlx	r10, r10, rcx	# tmp588, *_525, shift_flipped
 1973      D2
GAS LISTING /tmp/ccrNbbzt.s 			page 66


 1974              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 1975              		.loc 1 710 52 view .LVU533
 1976 0b50 4D09D4   		or	r12, r10	# tmp591, tmp588
 1977 0b53 4E8964EB 		mov	QWORD PTR 8[rbx+r13*8], r12	# *_531, tmp591
 1977      08
 1978              	.LVL156:
 711:sieve_extend.c ****         source_word += 2;
 1979              		.loc 1 711 9 is_stmt 1 view .LVU534
 1980              	# sieve_extend.c:711:         copy_word += 2;
 711:sieve_extend.c ****         source_word += 2;
 1981              		.loc 1 711 19 is_stmt 0 view .LVU535
 1982 0b58 4C8D6E04 		lea	r13, 4[rsi]	# copy_word,
 1983              	.LVL157:
 712:sieve_extend.c ****         distance += 2;
 1984              		.loc 1 712 9 is_stmt 1 view .LVU536
 713:sieve_extend.c ****     }
 1985              		.loc 1 713 9 view .LVU537
 1986              	# sieve_extend.c:713:         distance += 2;
 713:sieve_extend.c ****     }
 1987              		.loc 1 713 18 is_stmt 0 view .LVU538
 1988 0b5c 4C8D5204 		lea	r10, 4[rdx]	# distance,
 1989              	.LVL158:
 713:sieve_extend.c ****     }
 1990              		.loc 1 713 18 view .LVU539
 1991              	.LBE292:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 1992              		.loc 1 705 11 is_stmt 1 view .LVU540
 1993 0b60 4C396C24 		cmp	QWORD PTR 72[rsp], r13	# %sfp, copy_word
 1993      48
 1994 0b65 0F868900 		jbe	.L108	#,
 1994      0000
 1995              	.LBB293:
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1996              		.loc 1 706 9 view .LVU541
 1997              	# sieve_extend.c:706:         bitword_t source0 = bitarray[source_word  ];
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 1998              		.loc 1 706 37 is_stmt 0 view .LVU542
 1999 0b6b 4E8D3CF5 		lea	r15, 0[0+r14*8]	# _540,
 1999      00000000 
 2000              	.LVL159:
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 2001              		.loc 1 707 9 is_stmt 1 view .LVU543
 2002              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 2003              		.loc 1 707 19 is_stmt 0 view .LVU544
 2004 0b73 4E8B643B 		mov	r12, QWORD PTR 8[rbx+r15]	# source1, *_545
 2004      08
 2005              	.LVL160:
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2006              		.loc 1 708 9 is_stmt 1 view .LVU545
 2007              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2008              		.loc 1 708 42 is_stmt 0 view .LVU546
 2009 0b78 4E8B14F3 		mov	r10, QWORD PTR [rbx+r14*8]	# *_541, *_541
 2010              	.LVL161:
 2011              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
GAS LISTING /tmp/ccrNbbzt.s 			page 67


 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2012              		.loc 1 708 63 view .LVU547
 2013 0b7c C442F1F7 		shlx	r14, r12, rcx	# tmp594, source1, shift_flipped
 2013      F4
 2014              	.LVL162:
 2015              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2016              		.loc 1 708 42 view .LVU548
 2017 0b81 C442C3F7 		shrx	r10, r10, rdi	# tmp592, *_541, shift
 2017      D2
 2018              	.LVL163:
 2019              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2020              		.loc 1 708 52 view .LVU549
 2021 0b86 4D09F2   		or	r10, r14	# tmp595, tmp594
 2022 0b89 4E8914EB 		mov	QWORD PTR [rbx+r13*8], r10	# *_550, tmp595
 2023              	.LVL164:
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 2024              		.loc 1 709 9 is_stmt 1 view .LVU550
 2025              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2026              		.loc 1 710 42 is_stmt 0 view .LVU551
 2027 0b8d C442C3F7 		shrx	r12, r12, rdi	# tmp598, source1, shift
 2027      E4
 2028              	.LVL165:
 2029              	# sieve_extend.c:711:         copy_word += 2;
 711:sieve_extend.c ****         source_word += 2;
 2030              		.loc 1 711 19 view .LVU552
 2031 0b92 4883C606 		add	rsi, 6	# copy_word,
 2032              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2033              		.loc 1 710 63 view .LVU553
 2034 0b96 4E8B543B 		mov	r10, QWORD PTR 16[rbx+r15]	# *_555, *_555
 2034      10
 2035              	# sieve_extend.c:709:         bitword_t source2 = bitarray[source_word+2];
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 2036              		.loc 1 709 37 view .LVU554
 2037 0b9b 4983C306 		add	r11, 6	# _553,
 2038              	.LVL166:
 710:sieve_extend.c ****         copy_word += 2;
 2039              		.loc 1 710 9 is_stmt 1 view .LVU555
 2040              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2041              		.loc 1 710 63 is_stmt 0 view .LVU556
 2042 0b9f C442F1F7 		shlx	r10, r10, rcx	# tmp596, *_555, shift_flipped
 2042      D2
 2043              	.LVL167:
 2044              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2045              		.loc 1 710 52 view .LVU557
 2046 0ba4 4D09D4   		or	r12, r10	# tmp599, tmp596
 2047 0ba7 4E8964EB 		mov	QWORD PTR 8[rbx+r13*8], r12	# *_561, tmp599
 2047      08
 2048              	.LVL168:
 711:sieve_extend.c ****         source_word += 2;
 2049              		.loc 1 711 9 is_stmt 1 view .LVU558
 712:sieve_extend.c ****         distance += 2;
GAS LISTING /tmp/ccrNbbzt.s 			page 68


 2050              		.loc 1 712 9 view .LVU559
 713:sieve_extend.c ****     }
 2051              		.loc 1 713 9 view .LVU560
 2052              	# sieve_extend.c:713:         distance += 2;
 713:sieve_extend.c ****     }
 2053              		.loc 1 713 18 is_stmt 0 view .LVU561
 2054 0bac 4C8D5206 		lea	r10, 6[rdx]	# distance,
 2055              	.LVL169:
 713:sieve_extend.c ****     }
 2056              		.loc 1 713 18 view .LVU562
 2057              	.LBE293:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2058              		.loc 1 705 11 is_stmt 1 view .LVU563
 2059 0bb0 48397424 		cmp	QWORD PTR 72[rsp], rsi	# %sfp, copy_word
 2059      48
 2060 0bb5 763D     		jbe	.L108	#,
 2061              	.LBB294:
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 2062              		.loc 1 706 9 view .LVU564
 2063              	# sieve_extend.c:706:         bitword_t source0 = bitarray[source_word  ];
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 2064              		.loc 1 706 37 is_stmt 0 view .LVU565
 2065 0bb7 4E8D2CDD 		lea	r13, 0[0+r11*8]	# _389,
 2065      00000000 
 2066              	.LVL170:
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 2067              		.loc 1 707 9 is_stmt 1 view .LVU566
 2068              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 2069              		.loc 1 707 19 is_stmt 0 view .LVU567
 2070 0bbf 4E8B642B 		mov	r12, QWORD PTR 8[rbx+r13]	# source1, *_394
 2070      08
 2071              	.LVL171:
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2072              		.loc 1 708 9 is_stmt 1 view .LVU568
 2073              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2074              		.loc 1 708 42 is_stmt 0 view .LVU569
 2075 0bc4 4E8B14DB 		mov	r10, QWORD PTR [rbx+r11*8]	# *_390, *_390
 2076              	.LVL172:
 2077              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2078              		.loc 1 708 63 view .LVU570
 2079 0bc8 C442F1F7 		shlx	r11, r12, rcx	# tmp602, source1, shift_flipped
 2079      DC
 2080              	.LVL173:
 2081              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2082              		.loc 1 708 42 view .LVU571
 2083 0bcd C442C3F7 		shrx	r10, r10, rdi	# tmp600, *_390, shift
 2083      D2
 2084              	.LVL174:
 2085              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2086              		.loc 1 708 52 view .LVU572
 2087 0bd2 4D09DA   		or	r10, r11	# tmp603, tmp602
 2088 0bd5 4C8914F3 		mov	QWORD PTR [rbx+rsi*8], r10	# *_399, tmp603
GAS LISTING /tmp/ccrNbbzt.s 			page 69


 2089              	.LVL175:
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 2090              		.loc 1 709 9 is_stmt 1 view .LVU573
 710:sieve_extend.c ****         copy_word += 2;
 2091              		.loc 1 710 9 view .LVU574
 2092              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2093              		.loc 1 710 42 is_stmt 0 view .LVU575
 2094 0bd9 C442C3F7 		shrx	r12, r12, rdi	# tmp606, source1, shift
 2094      E4
 2095              	.LVL176:
 2096              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2097              		.loc 1 710 63 view .LVU576
 2098 0bde 4E8B542B 		mov	r10, QWORD PTR 16[rbx+r13]	# *_404, *_404
 2098      10
 2099 0be3 C442F1F7 		shlx	r10, r10, rcx	# tmp604, *_404, shift_flipped
 2099      D2
 2100              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2101              		.loc 1 710 52 view .LVU577
 2102 0be8 4D09D4   		or	r12, r10	# tmp607, tmp604
 2103 0beb 4C8964F3 		mov	QWORD PTR 8[rbx+rsi*8], r12	# *_410, tmp607
 2103      08
 2104              	.LVL177:
 711:sieve_extend.c ****         source_word += 2;
 2105              		.loc 1 711 9 is_stmt 1 view .LVU578
 712:sieve_extend.c ****         distance += 2;
 2106              		.loc 1 712 9 view .LVU579
 713:sieve_extend.c ****     }
 2107              		.loc 1 713 9 view .LVU580
 2108              	# sieve_extend.c:713:         distance += 2;
 713:sieve_extend.c ****     }
 2109              		.loc 1 713 18 is_stmt 0 view .LVU581
 2110 0bf0 4C8D5208 		lea	r10, 8[rdx]	# distance,
 2111              	.LVL178:
 713:sieve_extend.c ****     }
 2112              		.loc 1 713 18 view .LVU582
 2113              	.LBE294:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2114              		.loc 1 705 11 is_stmt 1 view .LVU583
 2115              	.L108:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2116              		.loc 1 705 11 is_stmt 0 view .LVU584
 2117 0bf4 4C015424 		add	QWORD PTR 80[rsp], r10	# %sfp, distance
 2117      50
 2118              	.LVL179:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2119              		.loc 1 705 11 view .LVU585
 2120 0bf9 4C01D0   		add	rax, r10	# ivtmp.328, distance
 2121              	.LVL180:
 2122              	.L103:
 715:sieve_extend.c **** }
 2123              		.loc 1 715 5 is_stmt 1 view .LVU586
 715:sieve_extend.c **** }
 2124              		.loc 1 715 5 is_stmt 0 view .LVU587
 2125              	.LBE298:
GAS LISTING /tmp/ccrNbbzt.s 			page 70


 2126              	.LBE302:
 863:sieve_extend.c ****     copy_word += distance;
 2127              		.loc 1 863 5 is_stmt 1 view .LVU588
 864:sieve_extend.c **** 
 2128              		.loc 1 864 5 view .LVU589
 866:sieve_extend.c **** 
 2129              		.loc 1 866 6 view .LVU590
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2130              		.loc 1 869 11 view .LVU591
 2131              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2132              		.loc 1 869 5 is_stmt 0 view .LVU592
 2133 0bfc 4C8B7424 		mov	r14, QWORD PTR 64[rsp]	# aligned_copy_word, %sfp
 2133      40
 2134 0c01 4939C6   		cmp	r14, rax	# aligned_copy_word, ivtmp.328
 2135 0c04 0F821701 		jb	.L109	#,
 2135      0000
 2136 0c0a 488B7424 		mov	rsi, QWORD PTR 80[rsp]	# _183, %sfp
 2136      50
 2137 0c0f 4C8D14C5 		lea	r10, 0[0+rax*8]	# _33,
 2137      00000000 
 2138 0c17 488D14F5 		lea	rdx, 40[0+rsi*8]	# _72,
 2138      28000000 
 2139 0c1f 4D8D5A20 		lea	r11, 32[r10]	# tmp619,
 2140 0c23 48C1E603 		sal	rsi, 3	# _2,
 2141 0c27 4C39DE   		cmp	rsi, r11	# _2, tmp619
 2142 0c2a 410F9DC4 		setge	r12b	#, tmp621
 2143 0c2e 4939D2   		cmp	r10, rdx	# _33, _72
 2144 0c31 410F9DC3 		setge	r11b	#, tmp623
 2145 0c35 4508DC   		or	r12b, r11b	# tmp621, tmp623
 2146 0c38 0F84F202 		je	.L110	#,
 2146      0000
 2147 0c3e 4D89F3   		mov	r11, r14	# tmp625, aligned_copy_word
 2148 0c41 4929C3   		sub	r11, rax	# tmp625, ivtmp.328
 2149 0c44 4983FB03 		cmp	r11, 3	# tmp625,
 2150 0c48 0F86E202 		jbe	.L110	#,
 2150      0000
 2151 0c4e 49FFC6   		inc	r14	# ivtmp.328
 2152 0c51 4D89F5   		mov	r13, r14	# niters.268, ivtmp.328
 2153 0c54 4929C5   		sub	r13, rax	# niters.268, ivtmp.328
 2154 0c57 4D89EB   		mov	r11, r13	# bnd.269, niters.268
 2155 0c5a 49C1EB02 		shr	r11, 2	# bnd.269,
 2156 0c5e 4C8D6413 		lea	r12, -32[rbx+rdx]	# vectp.278,
 2156      E0
 2157 0c63 4801DE   		add	rsi, rbx	# vectp.274, bitarray
 2158 0c66 4901DA   		add	r10, rbx	# vectp.283, bitarray
 2159 0c69 49C1E305 		sal	r11, 5	# _606,
 2160 0c6d 31D2     		xor	edx, edx	# ivtmp.344
 2161 0c6f C4C1796E 		vmovd	xmm5, r8d	# _12, _12
 2161      E8
 2162 0c74 C4C1796E 		vmovd	xmm4, r9d	# _18, _18
 2162      E1
 2163 0c79 0F1F8000 		.p2align 4,,10
 2163      000000
 2164              		.p2align 3
 2165              	.L111:
 870:sieve_extend.c ****     }
GAS LISTING /tmp/ccrNbbzt.s 			page 71


 2166              		.loc 1 870 9 is_stmt 1 discriminator 2 view .LVU593
 2167              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2168              		.loc 1 870 56 is_stmt 0 discriminator 2 view .LVU594
 2169 0c80 C5FE6F3C 		vmovdqu	ymm7, YMMWORD PTR [rsi+rdx]	# tmp809, MEM[base: vectp.274_247, index: ivtmp.344_604, offse
 2169      16
 2170 0c85 C5C5D3C5 		vpsrlq	ymm0, ymm7, xmm5	# vect__38.276, tmp809, _12
 2171              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2172              		.loc 1 870 94 discriminator 2 view .LVU595
 2173 0c89 C4C17E6F 		vmovdqu	ymm7, YMMWORD PTR [r12+rdx]	# tmp810, MEM[base: vectp.278_253, index: ivtmp.344_604, offse
 2173      3C14
 2174 0c8f C5C5F3CC 		vpsllq	ymm1, ymm7, xmm4	# vect__43.280, tmp810, _18
 2175              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2176              		.loc 1 870 66 discriminator 2 view .LVU596
 2177 0c93 C5FDEBC1 		vpor	ymm0, ymm0, ymm1	# vect__46.281, vect__38.276, vect__43.280
 2178              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2179              		.loc 1 870 29 discriminator 2 view .LVU597
 2180 0c97 C4C17E7F 		vmovdqu	YMMWORD PTR [r10+rdx], ymm0	# MEM[base: vectp.283_261, index: ivtmp.344_604, offset: 0B], 
 2180      0412
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2181              		.loc 1 869 43 is_stmt 1 discriminator 2 view .LVU598
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2182              		.loc 1 869 11 discriminator 2 view .LVU599
 2183 0c9d 4883C220 		add	rdx, 32	# ivtmp.344,
 2184 0ca1 4C39DA   		cmp	rdx, r11	# ivtmp.344, _606
 2185 0ca4 75DA     		jne	.L111	#,
 2186 0ca6 488B5424 		mov	rdx, QWORD PTR 80[rsp]	# _183, %sfp
 2186      50
 2187 0cab 4C89EE   		mov	rsi, r13	# niters_vector_mult_vf.270, niters.268
 2188 0cae 4883E6FC 		and	rsi, -4	# niters_vector_mult_vf.270,
 2189 0cb2 4801F2   		add	rdx, rsi	# _183, niters_vector_mult_vf.270
 2190 0cb5 4801F0   		add	rax, rsi	# tmp.272, niters_vector_mult_vf.270
 2191 0cb8 4939F5   		cmp	r13, rsi	# niters.268, niters_vector_mult_vf.270
 2192 0cbb 7461     		je	.L114	#,
 2193              	.LVL181:
 870:sieve_extend.c ****     }
 2194              		.loc 1 870 9 view .LVU600
 2195              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2196              		.loc 1 869 5 is_stmt 0 view .LVU601
 2197 0cbd 4C8B4424 		mov	r8, QWORD PTR 64[rsp]	# aligned_copy_word, %sfp
 2197      40
 2198              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2199              		.loc 1 870 56 view .LVU602
 2200 0cc2 C462C3F7 		shrx	r9, QWORD PTR [rbx+rdx*8], rdi	# tmp640, *_110, shift
 2200      0CD3
 2201              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2202              		.loc 1 870 94 view .LVU603
 2203 0cc8 C4E2F1F7 		shlx	rsi, QWORD PTR 8[rbx+rdx*8], rcx	# tmp638, *_484, shift_flipped
 2203      74D308
 2204              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
GAS LISTING /tmp/ccrNbbzt.s 			page 72


 2205              		.loc 1 870 66 view .LVU604
 2206 0ccf 4C09CE   		or	rsi, r9	# tmp642, tmp640
 2207              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2208              		.loc 1 869 52 view .LVU605
 2209 0cd2 4C8D4801 		lea	r9, 1[rax]	# copy_word,
 2210              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2211              		.loc 1 870 66 view .LVU606
 2212 0cd6 488934C3 		mov	QWORD PTR [rbx+rax*8], rsi	# *_487, tmp642
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2213              		.loc 1 869 43 is_stmt 1 view .LVU607
 2214              	.LVL182:
 2215              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2216              		.loc 1 870 77 is_stmt 0 view .LVU608
 2217 0cda 4C8D5201 		lea	r10, 1[rdx]	# _113,
 2218              	.LVL183:
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2219              		.loc 1 869 11 is_stmt 1 view .LVU609
 2220              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2221              		.loc 1 869 5 is_stmt 0 view .LVU610
 2222 0cde 4D39C8   		cmp	r8, r9	# aligned_copy_word, copy_word
 2223 0ce1 723B     		jb	.L114	#,
 870:sieve_extend.c ****     }
 2224              		.loc 1 870 9 is_stmt 1 view .LVU611
 2225              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2226              		.loc 1 870 94 is_stmt 0 view .LVU612
 2227 0ce3 C4A2F1F7 		shlx	rsi, QWORD PTR 8[rbx+r10*8], rcx	# tmp643, *_43, shift_flipped
 2227      74D308
 2228              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2229              		.loc 1 870 56 view .LVU613
 2230 0cea 4E8B14D3 		mov	r10, QWORD PTR [rbx+r10*8]	# *_38, *_38
 2231              	.LVL184:
 2232              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2233              		.loc 1 869 52 view .LVU614
 2234 0cee 4883C002 		add	rax, 2	# copy_word,
 2235              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2236              		.loc 1 870 56 view .LVU615
 2237 0cf2 C442C3F7 		shrx	r10, r10, rdi	# tmp645, *_38, shift
 2237      D2
 2238              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2239              		.loc 1 870 66 view .LVU616
 2240 0cf7 4C09D6   		or	rsi, r10	# tmp647, tmp645
 2241 0cfa 4A8934CB 		mov	QWORD PTR [rbx+r9*8], rsi	# *_82, tmp647
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2242              		.loc 1 869 43 is_stmt 1 view .LVU617
 2243              	.LVL185:
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2244              		.loc 1 869 11 view .LVU618
 2245              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
GAS LISTING /tmp/ccrNbbzt.s 			page 73


 870:sieve_extend.c ****     }
 2246              		.loc 1 870 77 is_stmt 0 view .LVU619
 2247 0cfe 4883C202 		add	rdx, 2	# _41,
 2248              	.LVL186:
 2249              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2250              		.loc 1 869 5 view .LVU620
 2251 0d02 4939C0   		cmp	r8, rax	# aligned_copy_word, copy_word
 2252 0d05 7217     		jb	.L114	#,
 870:sieve_extend.c ****     }
 2253              		.loc 1 870 9 is_stmt 1 view .LVU621
 2254              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2255              		.loc 1 870 94 is_stmt 0 view .LVU622
 2256 0d07 C4E2F1F7 		shlx	rcx, QWORD PTR 8[rbx+rdx*8], rcx	# tmp648, *_233, shift_flipped
 2256      4CD308
 2257              	.LVL187:
 2258              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2259              		.loc 1 870 56 view .LVU623
 2260 0d0e 488B14D3 		mov	rdx, QWORD PTR [rbx+rdx*8]	# *_228, *_228
 2261              	.LVL188:
 870:sieve_extend.c ****     }
 2262              		.loc 1 870 56 view .LVU624
 2263 0d12 C4E2C3F7 		shrx	rdi, rdx, rdi	# tmp650, *_228, shift
 2263      FA
 2264              	.LVL189:
 2265              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2266              		.loc 1 870 66 view .LVU625
 2267 0d17 4809F9   		or	rcx, rdi	# tmp652, tmp650
 2268 0d1a 48890CC3 		mov	QWORD PTR [rbx+rax*8], rcx	# *_237, tmp652
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2269              		.loc 1 869 43 is_stmt 1 view .LVU626
 2270              	.LVL190:
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2271              		.loc 1 869 11 view .LVU627
 2272              	.L114:
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2273              		.loc 1 869 11 is_stmt 0 view .LVU628
 2274 0d1e 4C89F0   		mov	rax, r14	# ivtmp.328, ivtmp.328
 2275              	.L109:
 873:sieve_extend.c **** 
 2276              		.loc 1 873 5 is_stmt 1 view .LVU629
 2277              	# sieve_extend.c:873:     if (copy_word >= destination_stop_word) return;
 873:sieve_extend.c **** 
 2278              		.loc 1 873 8 is_stmt 0 view .LVU630
 2279 0d21 488B4C24 		mov	rcx, QWORD PTR 88[rsp]	# destination_stop_word, %sfp
 2279      58
 2280 0d26 4839C1   		cmp	rcx, rax	# destination_stop_word, ivtmp.328
 2281 0d29 0F869201 		jbe	.L153	#,
 2281      0000
 875:sieve_extend.c ****     const size_t memsize = (size_t)size*sizeof(bitword_t);
 2282              		.loc 1 875 5 is_stmt 1 view .LVU631
 2283              	# sieve_extend.c:875:     source_word = copy_word - size; // recalibrate
 875:sieve_extend.c ****     const size_t memsize = (size_t)size*sizeof(bitword_t);
 2284              		.loc 1 875 17 is_stmt 0 view .LVU632
GAS LISTING /tmp/ccrNbbzt.s 			page 74


 2285 0d2f 488B7C24 		mov	rdi, QWORD PTR 24[rsp]	# size, %sfp
 2285      18
 2286 0d34 4889C2   		mov	rdx, rax	# source_word, ivtmp.328
 2287 0d37 4829FA   		sub	rdx, rdi	# source_word, size
 2288              	# sieve_extend.c:879:     for (;copy_word + size <= destination_stop_word; copy_word += size) 
 879:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 2289              		.loc 1 879 21 view .LVU633
 2290 0d3a 4C8D2C07 		lea	r13, [rdi+rax]	# ivtmp.328,
 2291              	# sieve_extend.c:875:     source_word = copy_word - size; // recalibrate
 875:sieve_extend.c ****     const size_t memsize = (size_t)size*sizeof(bitword_t);
 2292              		.loc 1 875 17 view .LVU634
 2293 0d3e 48895424 		mov	QWORD PTR 80[rsp], rdx	# %sfp, source_word
 2293      50
 2294              	.LVL191:
 876:sieve_extend.c **** 
 2295              		.loc 1 876 5 is_stmt 1 view .LVU635
 2296              	# sieve_extend.c:876:     const size_t memsize = (size_t)size*sizeof(bitword_t);
 876:sieve_extend.c **** 
 2297              		.loc 1 876 18 is_stmt 0 view .LVU636
 2298 0d43 4C8D34FD 		lea	r14, 0[0+rdi*8]	# memsize,
 2298      00000000 
 2299              	.LVL192:
 879:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 2300              		.loc 1 879 5 is_stmt 1 view .LVU637
 879:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 2301              		.loc 1 879 11 view .LVU638
 2302              	# sieve_extend.c:879:     for (;copy_word + size <= destination_stop_word; copy_word += size) 
 879:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 2303              		.loc 1 879 5 is_stmt 0 view .LVU639
 2304 0d4b 4C39E9   		cmp	rcx, r13	# destination_stop_word, ivtmp.328
 2305 0d4e 7255     		jb	.L116	#,
 2306 0d50 4C8D24C3 		lea	r12, [rbx+rax*8]	# tmp665,
 2307 0d54 4A8D04ED 		lea	rax, 0[0+r13*8]	# tmp666,
 2307      00000000 
 2308 0d5c 48895C24 		mov	QWORD PTR 72[rsp], rbx	# %sfp, bitarray
 2308      48
 2309              	# sieve_extend.c:880:         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 880:sieve_extend.c **** 
 2310              		.loc 1 880 38 view .LVU640
 2311 0d61 4C8D3CD3 		lea	r15, [rbx+rdx*8]	# _48,
 2312 0d65 4929C4   		sub	r12, rax	# _584, tmp666
 2313 0d68 4C89EB   		mov	rbx, r13	# ivtmp.328, ivtmp.328
 2314              	.LVL193:
 880:sieve_extend.c **** 
 2315              		.loc 1 880 38 view .LVU641
 2316 0d6b 4989FD   		mov	r13, rdi	# size, size
 2317 0d6e C5F877   		vzeroupper
 2318              	.LVL194:
 2319              		.p2align 4,,10
 2320 0d71 0F1F8000 		.p2align 3
 2320      000000
 2321              	.L117:
 880:sieve_extend.c **** 
 2322              		.loc 1 880 9 is_stmt 1 discriminator 2 view .LVU642
 2323              	.LBB303:
 2324              	.LBI303:
  31:/usr/include/x86_64-linux-gnu/bits/string_fortified.h **** 	       size_t __len))
GAS LISTING /tmp/ccrNbbzt.s 			page 75


 2325              		.loc 2 31 1 discriminator 2 view .LVU643
 2326              	.LBB304:
 2327              		.loc 2 34 3 discriminator 2 view .LVU644
 2328              	# /usr/include/x86_64-linux-gnu/bits/string_fortified.h:34:   return __builtin___memcpy_chk (__dest
 2329              		.loc 2 34 10 is_stmt 0 discriminator 2 view .LVU645
 2330 0d78 498D3CDC 		lea	rdi, [r12+rbx*8]	# tmp668,
 2331              	.LVL195:
 2332              		.loc 2 34 10 discriminator 2 view .LVU646
 2333 0d7c 4C89F2   		mov	rdx, r14	#, memsize
 2334 0d7f 4C89FE   		mov	rsi, r15	#, _48
 2335 0d82 E8000000 		call	memcpy@PLT	#
 2335      00
 2336              	.LVL196:
 2337              		.loc 2 34 10 discriminator 2 view .LVU647
 2338              	.LBE304:
 2339              	.LBE303:
 879:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 2340              		.loc 1 879 54 is_stmt 1 discriminator 2 view .LVU648
 879:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 2341              		.loc 1 879 11 discriminator 2 view .LVU649
 2342 0d87 4889D8   		mov	rax, rbx	# ivtmp.328, ivtmp.328
 2343 0d8a 4A8D1C2B 		lea	rbx, [rbx+r13]	# ivtmp.328,
 2344              	.LVL197:
 2345              	# sieve_extend.c:879:     for (;copy_word + size <= destination_stop_word; copy_word += size) 
 879:sieve_extend.c ****         memcpy(&bitarray[copy_word], &bitarray[source_word],memsize );
 2346              		.loc 1 879 5 is_stmt 0 discriminator 2 view .LVU650
 2347 0d8e 48395C24 		cmp	QWORD PTR 88[rsp], rbx	# %sfp, ivtmp.328
 2347      58
 2348 0d93 73E3     		jnb	.L117	#,
 2349 0d95 488B5C24 		mov	rbx, QWORD PTR 72[rsp]	# bitarray, %sfp
 2349      48
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2350              		.loc 1 883 11 is_stmt 1 view .LVU651
 2351              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2352              		.loc 1 883 5 is_stmt 0 view .LVU652
 2353 0d9a 48394424 		cmp	QWORD PTR 88[rsp], rax	# %sfp, ivtmp.328
 2353      58
 2354 0d9f 0F82D700 		jb	.L154	#,
 2354      0000
 2355              	.LVL198:
 2356              	.L116:
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2357              		.loc 1 883 5 view .LVU653
 2358 0da5 488B4C24 		mov	rcx, QWORD PTR 80[rsp]	# source_word, %sfp
 2358      50
 2359 0daa 488D3CC5 		lea	rdi, 0[0+rax*8]	# _195,
 2359      00000000 
 2360 0db2 488D14CD 		lea	rdx, 32[0+rcx*8]	# _197,
 2360      20000000 
 2361 0dba 488D7720 		lea	rsi, 32[rdi]	# tmp675,
 2362 0dbe 48C1E103 		sal	rcx, 3	# _187,
 2363 0dc2 4839F1   		cmp	rcx, rsi	# _187, tmp675
 2364 0dc5 400F9DC6 		setge	sil	#, tmp677
 2365 0dc9 4839D7   		cmp	rdi, rdx	# _195, _197
 2366 0dcc 0F9DC2   		setge	dl	#, tmp679
 2367 0dcf 4008D6   		or	sil, dl	# tmp677, tmp679
GAS LISTING /tmp/ccrNbbzt.s 			page 76


 2368 0dd2 0F84B800 		je	.L119	#,
 2368      0000
 2369 0dd8 488B7424 		mov	rsi, QWORD PTR 88[rsp]	# destination_stop_word, %sfp
 2369      58
 2370 0ddd 4889F2   		mov	rdx, rsi	# tmp681, destination_stop_word
 2371 0de0 4829C2   		sub	rdx, rax	# tmp681, ivtmp.328
 2372 0de3 4883FA08 		cmp	rdx, 8	# tmp681,
 2373 0de7 0F86A300 		jbe	.L119	#,
 2373      0000
 2374 0ded 4C8D4601 		lea	r8, 1[rsi]	# tmp684,
 2375 0df1 4929C0   		sub	r8, rax	# niters.258, ivtmp.328
 2376 0df4 4C89C6   		mov	rsi, r8	# bnd.259, niters.258
 2377 0df7 48C1EE02 		shr	rsi, 2	# bnd.259,
 2378 0dfb 4801D9   		add	rcx, rbx	# vectp.264, bitarray
 2379 0dfe 4801DF   		add	rdi, rbx	# vectp.267, bitarray
 2380 0e01 48C1E605 		sal	rsi, 5	# _577,
 2381              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2382              		.loc 1 869 5 view .LVU654
 2383 0e05 31D2     		xor	edx, edx	# ivtmp.320
 2384              	.LVL199:
 2385 0e07 660F1F84 		.p2align 4,,10
 2385      00000000 
 2385      00
 2386              		.p2align 3
 2387              	.L120:
 884:sieve_extend.c **** 
 2388              		.loc 1 884 9 is_stmt 1 discriminator 2 view .LVU655
 2389              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2390              		.loc 1 884 29 is_stmt 0 discriminator 2 view .LVU656
 2391 0e10 C5FE6F24 		vmovdqu	ymm4, YMMWORD PTR [rcx+rdx]	# tmp834, MEM[base: vectp.264_146, index: ivtmp.320_575, offse
 2391      11
 2392 0e15 C5FE7F24 		vmovdqu	YMMWORD PTR [rdi+rdx], ymm4	# MEM[base: vectp.267_119, index: ivtmp.320_575, offset: 0B], 
 2392      17
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2393              		.loc 1 883 48 is_stmt 1 discriminator 2 view .LVU657
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2394              		.loc 1 883 11 discriminator 2 view .LVU658
 2395 0e1a 4883C220 		add	rdx, 32	# ivtmp.320,
 2396 0e1e 4839F2   		cmp	rdx, rsi	# ivtmp.320, _577
 2397 0e21 75ED     		jne	.L120	#,
 2398 0e23 4C8B6C24 		mov	r13, QWORD PTR 80[rsp]	# source_word, %sfp
 2398      50
 2399 0e28 4C89C2   		mov	rdx, r8	# niters_vector_mult_vf.260, niters.258
 2400 0e2b 4883E2FC 		and	rdx, -4	# niters_vector_mult_vf.260,
 2401 0e2f 4901D5   		add	r13, rdx	# source_word, niters_vector_mult_vf.260
 2402 0e32 4801D0   		add	rax, rdx	# tmp.262, niters_vector_mult_vf.260
 2403 0e35 4C39C2   		cmp	rdx, r8	# niters_vector_mult_vf.260, niters.258
 2404 0e38 0F848300 		je	.L153	#,
 2404      0000
 2405              	.LVL200:
 884:sieve_extend.c **** 
 2406              		.loc 1 884 9 view .LVU659
 2407              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2408              		.loc 1 884 39 is_stmt 0 view .LVU660
GAS LISTING /tmp/ccrNbbzt.s 			page 77


 2409 0e3e 4A8B14EB 		mov	rdx, QWORD PTR [rbx+r13*8]	# _90, *_141
 2410              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2411              		.loc 1 883 5 view .LVU661
 2412 0e42 488B7C24 		mov	rdi, QWORD PTR 88[rsp]	# destination_stop_word, %sfp
 2412      58
 2413              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2414              		.loc 1 884 29 view .LVU662
 2415 0e47 488914C3 		mov	QWORD PTR [rbx+rax*8], rdx	# *_426, _90
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2416              		.loc 1 883 48 is_stmt 1 view .LVU663
 2417              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2418              		.loc 1 883 57 is_stmt 0 view .LVU664
 2419 0e4b 488D5001 		lea	rdx, 1[rax]	# copy_word,
 2420              	.LVL201:
 2421              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2422              		.loc 1 883 71 view .LVU665
 2423 0e4f 49FFC5   		inc	r13	# source_word
 2424              	.LVL202:
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2425              		.loc 1 883 11 is_stmt 1 view .LVU666
 2426              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2427              		.loc 1 883 5 is_stmt 0 view .LVU667
 2428 0e52 4839D7   		cmp	rdi, rdx	# destination_stop_word, copy_word
 2429 0e55 726A     		jb	.L153	#,
 884:sieve_extend.c **** 
 2430              		.loc 1 884 9 is_stmt 1 view .LVU668
 2431              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2432              		.loc 1 884 39 is_stmt 0 view .LVU669
 2433 0e57 4A8B0CEB 		mov	rcx, QWORD PTR [rbx+r13*8]	# _103, *_98
 2434              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2435              		.loc 1 883 57 view .LVU670
 2436 0e5b 4883C002 		add	rax, 2	# copy_word,
 2437              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2438              		.loc 1 884 29 view .LVU671
 2439 0e5f 48890CD3 		mov	QWORD PTR [rbx+rdx*8], rcx	# *_102, _103
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2440              		.loc 1 883 48 is_stmt 1 view .LVU672
 2441              	.LVL203:
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2442              		.loc 1 883 11 view .LVU673
 2443              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2444              		.loc 1 884 39 is_stmt 0 view .LVU674
 2445 0e63 4A8D34ED 		lea	rsi, 0[0+r13*8]	# _96,
 2445      00000000 
 2446              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2447              		.loc 1 883 5 view .LVU675
 2448 0e6b 4839C7   		cmp	rdi, rax	# destination_stop_word, copy_word
GAS LISTING /tmp/ccrNbbzt.s 			page 78


 2449 0e6e 7251     		jb	.L153	#,
 884:sieve_extend.c **** 
 2450              		.loc 1 884 9 is_stmt 1 view .LVU676
 2451              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2452              		.loc 1 884 39 is_stmt 0 view .LVU677
 2453 0e70 488B5433 		mov	rdx, QWORD PTR 8[rbx+rsi]	# _156, *_159
 2453      08
 2454              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2455              		.loc 1 884 29 view .LVU678
 2456 0e75 488914C3 		mov	QWORD PTR [rbx+rax*8], rdx	# *_157, _156
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2457              		.loc 1 883 48 is_stmt 1 view .LVU679
 2458              	.LVL204:
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2459              		.loc 1 883 11 view .LVU680
 2460 0e79 C5F877   		vzeroupper
 2461              	.LVL205:
 2462              	.L154:
 2463              	# sieve_extend.c:887:  }
 887:sieve_extend.c **** 
 2464              		.loc 1 887 2 is_stmt 0 view .LVU681
 2465 0e7c 488D65D8 		lea	rsp, -40[rbp]	#,
 2466              	.LVL206:
 887:sieve_extend.c **** 
 2467              		.loc 1 887 2 view .LVU682
 2468 0e80 5B       		pop	rbx	#
 2469 0e81 415C     		pop	r12	#
 2470 0e83 415D     		pop	r13	#
 2471 0e85 415E     		pop	r14	#
 2472              	.LVL207:
 887:sieve_extend.c **** 
 2473              		.loc 1 887 2 view .LVU683
 2474 0e87 415F     		pop	r15	#
 2475 0e89 5D       		pop	rbp	#
 2476              		.cfi_remember_state
 2477              		.cfi_def_cfa 7, 8
 2478              	.LVL208:
 887:sieve_extend.c **** 
 2479              		.loc 1 887 2 view .LVU684
 2480 0e8a C3       		ret	
 2481              	.LVL209:
 2482 0e8b 0F1F4400 		.p2align 4,,10
 2482      00
 2483              		.p2align 3
 2484              	.L119:
 2485              		.cfi_restore_state
 2486              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2487              		.loc 1 884 39 view .LVU685
 2488 0e90 4C8B6C24 		mov	r13, QWORD PTR 80[rsp]	# source_word, %sfp
 2488      50
 2489 0e95 488D143B 		lea	rdx, [rbx+rdi]	# ivtmp.314,
 2490 0e99 488B7C24 		mov	rdi, QWORD PTR 88[rsp]	# destination_stop_word, %sfp
 2490      58
 2491 0e9e 4929C5   		sub	r13, rax	# source_word, ivtmp.328
GAS LISTING /tmp/ccrNbbzt.s 			page 79


 2492 0ea1 488D4CFB 		lea	rcx, 8[rbx+rdi*8]	# _574,
 2492      08
 2493              	.LVL210:
 2494 0ea6 662E0F1F 		.p2align 4,,10
 2494      84000000 
 2494      0000
 2495              		.p2align 3
 2496              	.L123:
 884:sieve_extend.c **** 
 2497              		.loc 1 884 9 is_stmt 1 view .LVU686
 2498              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2499              		.loc 1 884 39 is_stmt 0 view .LVU687
 2500 0eb0 4A8B04EA 		mov	rax, QWORD PTR [rdx+r13*8]	# _170, MEM[base: _54, index: _569, step: 8, offset: 0B]
 2501 0eb4 4883C208 		add	rdx, 8	# ivtmp.314,
 2502              	# sieve_extend.c:884:         bitarray[copy_word] = bitarray[source_word];
 884:sieve_extend.c **** 
 2503              		.loc 1 884 29 view .LVU688
 2504 0eb8 488942F8 		mov	QWORD PTR -8[rdx], rax	# MEM[base: _54, offset: 0B], _170
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2505              		.loc 1 883 48 is_stmt 1 view .LVU689
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2506              		.loc 1 883 11 view .LVU690
 2507              	# sieve_extend.c:883:     for (;copy_word <= destination_stop_word;  copy_word++,source_word++)
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2508              		.loc 1 883 5 is_stmt 0 view .LVU691
 2509 0ebc 4839CA   		cmp	rdx, rcx	# ivtmp.314, _574
 2510 0ebf 75EF     		jne	.L123	#,
 2511              	.LVL211:
 2512              	.L153:
 883:sieve_extend.c ****         bitarray[copy_word] = bitarray[source_word];
 2513              		.loc 1 883 5 view .LVU692
 2514 0ec1 C5F877   		vzeroupper
 2515              	# sieve_extend.c:887:  }
 887:sieve_extend.c **** 
 2516              		.loc 1 887 2 view .LVU693
 2517 0ec4 488D65D8 		lea	rsp, -40[rbp]	#,
 2518              	.LVL212:
 887:sieve_extend.c **** 
 2519              		.loc 1 887 2 view .LVU694
 2520 0ec8 5B       		pop	rbx	#
 2521 0ec9 415C     		pop	r12	#
 2522 0ecb 415D     		pop	r13	#
 2523 0ecd 415E     		pop	r14	#
 2524 0ecf 415F     		pop	r15	#
 2525 0ed1 5D       		pop	rbp	#
 2526              		.cfi_remember_state
 2527              		.cfi_def_cfa 7, 8
 2528              	.LVL213:
 887:sieve_extend.c **** 
 2529              		.loc 1 887 2 view .LVU695
 2530 0ed2 C3       		ret	
 2531              	.LVL214:
 2532              		.p2align 4,,10
 2533 0ed3 0F1F4400 		.p2align 3
 2533      00
 2534              	.L104:
GAS LISTING /tmp/ccrNbbzt.s 			page 80


 2535              		.cfi_restore_state
 887:sieve_extend.c **** 
 2536              		.loc 1 887 2 view .LVU696
 2537 0ed8 4C8B6C24 		mov	r13, QWORD PTR 72[rsp]	# fast_loop_stop_word, %sfp
 2537      48
 2538 0edd 4901DC   		add	r12, rbx	# ivtmp.359, bitarray
 2539              	.LBB305:
 2540              	.LBB299:
 2541              	# sieve_extend.c:705:     while (copy_word < fast_loop_stop_word) {
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2542              		.loc 1 705 11 view .LVU697
 2543 0ee0 4889C2   		mov	rdx, rax	# copy_word, ivtmp.328
 2544 0ee3 49F7D3   		not	r11	# tmp694
 2545              	.LVL215:
 2546 0ee6 662E0F1F 		.p2align 4,,10
 2546      84000000 
 2546      0000
 2547              		.p2align 3
 2548              	.L107:
 2549              	.LBB295:
 706:sieve_extend.c ****         bitword_t source1 = bitarray[source_word+1];
 2550              		.loc 1 706 9 is_stmt 1 view .LVU698
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 2551              		.loc 1 707 9 view .LVU699
 2552              	# sieve_extend.c:707:         bitword_t source1 = bitarray[source_word+1];
 707:sieve_extend.c ****         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flipped);
 2553              		.loc 1 707 19 is_stmt 0 view .LVU700
 2554 0ef0 4D8B7424 		mov	r14, QWORD PTR 8[r12]	# source1, MEM[base: _616, offset: 8B]
 2554      08
 2555              	.LVL216:
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2556              		.loc 1 708 9 is_stmt 1 view .LVU701
 2557              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2558              		.loc 1 708 42 is_stmt 0 view .LVU702
 2559 0ef5 C442BBF7 		shrx	r10, QWORD PTR [r12], r8	# tmp609, MEM[base: _616, offset: 0B], _12
 2559      1424
 2560              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2561              		.loc 1 708 63 view .LVU703
 2562 0efb C4C2B1F7 		shlx	rsi, r14, r9	# tmp611, source1, _18
 2562      F6
 2563              	# sieve_extend.c:708:         bitarray[copy_word  ] = (source0 >> shift) | (source1 << shift_flippe
 708:sieve_extend.c ****         bitword_t source2 = bitarray[source_word+2];
 2564              		.loc 1 708 52 view .LVU704
 2565 0f00 4909F2   		or	r10, rsi	# tmp612, tmp611
 2566 0f03 4C8914D3 		mov	QWORD PTR [rbx+rdx*8], r10	# MEM[base: bitarray_67(D), index: copy_word_349, step: 8, offset: 
 2567              	.LVL217:
 709:sieve_extend.c ****         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flipped);
 2568              		.loc 1 709 9 is_stmt 1 view .LVU705
 710:sieve_extend.c ****         copy_word += 2;
 2569              		.loc 1 710 9 view .LVU706
 2570              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2571              		.loc 1 710 42 is_stmt 0 view .LVU707
 2572 0f07 C442BBF7 		shrx	r14, r14, r8	# tmp615, source1, _12
 2572      F6
GAS LISTING /tmp/ccrNbbzt.s 			page 81


 2573              	.LVL218:
 710:sieve_extend.c ****         copy_word += 2;
 2574              		.loc 1 710 42 view .LVU708
 2575 0f0c 4983C410 		add	r12, 16	# ivtmp.359,
 2576              	.LVL219:
 2577              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2578              		.loc 1 710 63 view .LVU709
 2579 0f10 C4C2B1F7 		shlx	rsi, QWORD PTR [r12], r9	# tmp613, MEM[base: _616, offset: 16B], _18
 2579      3424
 2580              	# sieve_extend.c:710:         bitarray[copy_word+1] = (source1 >> shift) | (source2 << shift_flippe
 710:sieve_extend.c ****         copy_word += 2;
 2581              		.loc 1 710 52 view .LVU710
 2582 0f16 4C09F6   		or	rsi, r14	# tmp616, tmp615
 2583 0f19 488974D3 		mov	QWORD PTR 8[rbx+rdx*8], rsi	# MEM[base: bitarray_67(D), index: copy_word_349, step: 8, offset:
 2583      08
 2584              	.LVL220:
 711:sieve_extend.c ****         source_word += 2;
 2585              		.loc 1 711 9 is_stmt 1 view .LVU711
 2586              	# sieve_extend.c:711:         copy_word += 2;
 711:sieve_extend.c ****         source_word += 2;
 2587              		.loc 1 711 19 is_stmt 0 view .LVU712
 2588 0f1e 4883C202 		add	rdx, 2	# copy_word,
 2589              	.LVL221:
 712:sieve_extend.c ****         distance += 2;
 2590              		.loc 1 712 9 is_stmt 1 view .LVU713
 713:sieve_extend.c ****     }
 2591              		.loc 1 713 9 view .LVU714
 2592 0f22 4D8D1413 		lea	r10, [r11+rdx]	# distance,
 2593              	.LVL222:
 713:sieve_extend.c ****     }
 2594              		.loc 1 713 9 is_stmt 0 view .LVU715
 2595              	.LBE295:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2596              		.loc 1 705 11 is_stmt 1 view .LVU716
 2597 0f26 4939D5   		cmp	r13, rdx	# fast_loop_stop_word, copy_word
 2598 0f29 77C5     		ja	.L107	#,
 2599 0f2b E9C4FCFF 		jmp	.L108	#
 2599      FF
 2600              	.LVL223:
 2601              		.p2align 4,,10
 2602              		.p2align 3
 2603              	.L110:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2604              		.loc 1 705 11 is_stmt 0 view .LVU717
 2605 0f30 488B4C24 		mov	rcx, QWORD PTR 80[rsp]	# _183, %sfp
 2605      50
 2606              	.LVL224:
 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2607              		.loc 1 705 11 view .LVU718
 2608 0f35 488B5424 		mov	rdx, QWORD PTR 64[rsp]	# tmp653, %sfp
 2608      40
 2609 0f3a 4801DE   		add	rsi, rbx	# ivtmp.336, bitarray
 2610 0f3d 4801CA   		add	rdx, rcx	# tmp653, _183
 2611 0f40 488D7CD3 		lea	rdi, 8[rbx+rdx*8]	# tmp656,
 2611      08
 2612              	.LVL225:
GAS LISTING /tmp/ccrNbbzt.s 			page 82


 705:sieve_extend.c ****         bitword_t source0 = bitarray[source_word  ];
 2613              		.loc 1 705 11 view .LVU719
 2614 0f45 4C29D7   		sub	rdi, r10	# _602, _33
 2615              	.LBE299:
 2616              	.LBE305:
 2617              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2618              		.loc 1 870 29 view .LVU720
 2619 0f48 4829C8   		sub	rax, rcx	# tmp657, _183
 2620 0f4b 0F1F4400 		.p2align 4,,10
 2620      00
 2621              		.p2align 3
 2622              	.L113:
 870:sieve_extend.c ****     }
 2623              		.loc 1 870 9 is_stmt 1 view .LVU721
 2624              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2625              		.loc 1 870 56 is_stmt 0 view .LVU722
 2626 0f50 C4E2BBF7 		shrx	rdx, QWORD PTR [rsi], r8	# tmp658, MEM[base: _593, offset: 0B], _12
 2626      16
 2627              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2628              		.loc 1 870 94 view .LVU723
 2629 0f55 C4E2B1F7 		shlx	rcx, QWORD PTR 8[rsi], r9	# tmp660, MEM[base: _593, offset: 8B], _18
 2629      4E08
 2630              	# sieve_extend.c:870:         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[
 870:sieve_extend.c ****     }
 2631              		.loc 1 870 66 view .LVU724
 2632 0f5b 4809CA   		or	rdx, rcx	# tmp662, tmp660
 2633 0f5e 488914C6 		mov	QWORD PTR [rsi+rax*8], rdx	# MEM[base: _593, index: _595, step: 8, offset: 0B], tmp662
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2634              		.loc 1 869 43 is_stmt 1 view .LVU725
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2635              		.loc 1 869 11 view .LVU726
 2636 0f62 4883C608 		add	rsi, 8	# ivtmp.336,
 2637              	# sieve_extend.c:869:     for (;copy_word <= aligned_copy_word; copy_word++,source_word++) {
 869:sieve_extend.c ****         bitarray[copy_word] = (bitarray[source_word  ] >> shift) | (bitarray[source_word+1 ] << shi
 2638              		.loc 1 869 5 is_stmt 0 view .LVU727
 2639 0f66 4839FE   		cmp	rsi, rdi	# ivtmp.336, _602
 2640 0f69 75E5     		jne	.L113	#,
 2641 0f6b 488B4424 		mov	rax, QWORD PTR 64[rsp]	# aligned_copy_word, %sfp
 2641      40
 2642 0f70 4C8D7001 		lea	r14, 1[rax]	# ivtmp.328,
 2643 0f74 E9A5FDFF 		jmp	.L114	#
 2643      FF
 2644              		.cfi_endproc
 2645              	.LFE72:
 2647              		.section	.rodata.str1.1,"aMS",@progbits,1
 2648              	.LC0:
 2649 0000 25336A75 		.string	"%3ju "
 2649      2000
 2650              	.LC1:
 2651 0006 0A466F75 		.string	"\nFound %ju primes until %ju\n"
 2651      6E642025 
 2651      6A752070 
 2651      72696D65 
 2651      7320756E 
GAS LISTING /tmp/ccrNbbzt.s 			page 83


 2652              		.text
 2653 0f79 0F1F8000 		.p2align 4
 2653      000000
 2655              	show_primes.isra.0:
 2656              	.LVL226:
 2657              	.LFB86:
1046:sieve_extend.c ****     counter_t primeCount = 1;    // We already have 2
 2658              		.loc 1 1046 13 is_stmt 1 view -0
 2659              		.cfi_startproc
 2660              	.LBB306:
1048:sieve_extend.c ****         primeCount++;
 2661              		.loc 1 1048 30 view .LVU729
 2662              	.LBE306:
 2663              	# sieve_extend.c:1046: static void show_primes(struct sieve_state *sieve, counter_t maxFactor) {
1046:sieve_extend.c ****     counter_t primeCount = 1;    // We already have 2
 2664              		.loc 1 1046 13 is_stmt 0 view .LVU730
 2665 0f80 4157     		push	r15	#
 2666              		.cfi_def_cfa_offset 16
 2667              		.cfi_offset 15, -16
 2668 0f82 4156     		push	r14	#
 2669              		.cfi_def_cfa_offset 24
 2670              		.cfi_offset 14, -24
 2671 0f84 4155     		push	r13	#
 2672              		.cfi_def_cfa_offset 32
 2673              		.cfi_offset 13, -32
 2674 0f86 4154     		push	r12	#
 2675              		.cfi_def_cfa_offset 40
 2676              		.cfi_offset 12, -40
 2677 0f88 55       		push	rbp	#
 2678              		.cfi_def_cfa_offset 48
 2679              		.cfi_offset 6, -48
 2680 0f89 4889F5   		mov	rbp, rsi	# ISRA.76, tmp139
 2681 0f8c 53       		push	rbx	#
 2682              		.cfi_def_cfa_offset 56
 2683              		.cfi_offset 3, -56
 2684 0f8d 4883EC08 		sub	rsp, 8	#,
 2685              		.cfi_def_cfa_offset 64
 2686              	.LBB324:
 2687              	# sieve_extend.c:1048:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1048:sieve_extend.c ****         primeCount++;
 2688              		.loc 1 1048 44 view .LVU731
 2689 0f91 488B36   		mov	rsi, QWORD PTR [rsi]	# prephitmp_86, *ISRA.76_32(D)
 2690              	# sieve_extend.c:1048:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1048:sieve_extend.c ****         primeCount++;
 2691              		.loc 1 1048 5 view .LVU732
 2692 0f94 4883FE01 		cmp	rsi, 1	# prephitmp_86,
 2693 0f98 0F86CE00 		jbe	.L163	#,
 2693      0000
 2694              	# sieve_extend.c:1050:         if (factor < maxFactor/2) {
1050:sieve_extend.c ****             printf("%3ju ",(uintmax_t)factor*2+1);
 2695              		.loc 1 1050 31 view .LVU733
 2696 0f9e 48D1EA   		shr	rdx	# maxFactor
 2697              	.LVL227:
1050:sieve_extend.c ****             printf("%3ju ",(uintmax_t)factor*2+1);
 2698              		.loc 1 1050 31 view .LVU734
 2699 0fa1 4989FC   		mov	r12, rdi	# ISRA.75, tmp138
 2700 0fa4 4989D7   		mov	r15, rdx	# _4, maxFactor
GAS LISTING /tmp/ccrNbbzt.s 			page 84


 2701              	# sieve_extend.c:1048:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1048:sieve_extend.c ****         primeCount++;
 2702              		.loc 1 1048 20 view .LVU735
 2703 0fa7 BB010000 		mov	ebx, 1	# factor,
 2703      00
 2704              	.LBE324:
 2705              	# sieve_extend.c:1047:     counter_t primeCount = 1;    // We already have 2
1047:sieve_extend.c ****     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitarray, factor+
 2706              		.loc 1 1047 15 view .LVU736
 2707 0fac 41BE0100 		mov	r14d, 1	# primeCount,
 2707      0000
 2708              	.LBB325:
 2709              	.LBB307:
 2710              	.LBB308:
 2711              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2712              		.file 3 "/usr/include/x86_64-linux-gnu/bits/stdio2.h"
   1:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** /* Checking macros for stdio functions.
   2:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    Copyright (C) 2004-2020 Free Software Foundation, Inc.
   3:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    This file is part of the GNU C Library.
   4:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
   5:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    The GNU C Library is free software; you can redistribute it and/or
   6:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    modify it under the terms of the GNU Lesser General Public
   7:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    License as published by the Free Software Foundation; either
   8:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    version 2.1 of the License, or (at your option) any later version.
   9:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  10:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    The GNU C Library is distributed in the hope that it will be useful,
  11:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    but WITHOUT ANY WARRANTY; without even the implied warranty of
  12:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  13:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    Lesser General Public License for more details.
  14:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  15:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    You should have received a copy of the GNU Lesser General Public
  16:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    License along with the GNU C Library; if not, see
  17:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****    <https://www.gnu.org/licenses/>.  */
  18:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  19:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #ifndef _BITS_STDIO2_H
  20:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #define _BITS_STDIO2_H 1
  21:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  22:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #ifndef _STDIO_H
  23:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** # error "Never include <bits/stdio2.h> directly; use <stdio.h> instead."
  24:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #endif
  25:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  26:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __sprintf_chk (char *__restrict __s, int __flag, size_t __slen,
  27:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			  const char *__restrict __format, ...) __THROW;
  28:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __vsprintf_chk (char *__restrict __s, int __flag, size_t __slen,
  29:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			   const char *__restrict __format,
  30:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			   __gnuc_va_list __ap) __THROW;
  31:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  32:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #ifdef __va_arg_pack
  33:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __fortify_function int
  34:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __NTH (sprintf (char *__restrict __s, const char *__restrict __fmt, ...))
  35:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
  36:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   return __builtin___sprintf_chk (__s, __USE_FORTIFY_LEVEL - 1,
  37:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 				  __bos (__s), __fmt, __va_arg_pack ());
  38:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** }
  39:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #elif !defined __cplusplus
  40:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** # define sprintf(str, ...) \
  41:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   __builtin___sprintf_chk (str, __USE_FORTIFY_LEVEL - 1, __bos (str), \
GAS LISTING /tmp/ccrNbbzt.s 			page 85


  42:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			   __VA_ARGS__)
  43:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #endif
  44:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  45:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __fortify_function int
  46:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __NTH (vsprintf (char *__restrict __s, const char *__restrict __fmt,
  47:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 		 __gnuc_va_list __ap))
  48:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
  49:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   return __builtin___vsprintf_chk (__s, __USE_FORTIFY_LEVEL - 1,
  50:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 				   __bos (__s), __fmt, __ap);
  51:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** }
  52:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  53:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #if defined __USE_ISOC99 || defined __USE_UNIX98
  54:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  55:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __snprintf_chk (char *__restrict __s, size_t __n, int __flag,
  56:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			   size_t __slen, const char *__restrict __format,
  57:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			   ...) __THROW;
  58:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __vsnprintf_chk (char *__restrict __s, size_t __n, int __flag,
  59:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			    size_t __slen, const char *__restrict __format,
  60:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			    __gnuc_va_list __ap) __THROW;
  61:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  62:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** # ifdef __va_arg_pack
  63:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __fortify_function int
  64:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __NTH (snprintf (char *__restrict __s, size_t __n,
  65:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 		 const char *__restrict __fmt, ...))
  66:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
  67:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   return __builtin___snprintf_chk (__s, __n, __USE_FORTIFY_LEVEL - 1,
  68:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 				   __bos (__s), __fmt, __va_arg_pack ());
  69:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** }
  70:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** # elif !defined __cplusplus
  71:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #  define snprintf(str, len, ...) \
  72:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   __builtin___snprintf_chk (str, len, __USE_FORTIFY_LEVEL - 1, __bos (str), \
  73:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			    __VA_ARGS__)
  74:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** # endif
  75:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  76:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __fortify_function int
  77:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __NTH (vsnprintf (char *__restrict __s, size_t __n,
  78:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 		  const char *__restrict __fmt, __gnuc_va_list __ap))
  79:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
  80:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   return __builtin___vsnprintf_chk (__s, __n, __USE_FORTIFY_LEVEL - 1,
  81:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 				    __bos (__s), __fmt, __ap);
  82:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** }
  83:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  84:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #endif
  85:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  86:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** #if __USE_FORTIFY_LEVEL > 1
  87:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  88:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __fprintf_chk (FILE *__restrict __stream, int __flag,
  89:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			  const char *__restrict __format, ...);
  90:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __printf_chk (int __flag, const char *__restrict __format, ...);
  91:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __vfprintf_chk (FILE *__restrict __stream, int __flag,
  92:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			   const char *__restrict __format, __gnuc_va_list __ap);
  93:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** extern int __vprintf_chk (int __flag, const char *__restrict __format,
  94:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			  __gnuc_va_list __ap);
  95:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
  96:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** # ifdef __va_arg_pack
  97:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __fortify_function int
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** fprintf (FILE *__restrict __stream, const char *__restrict __fmt, ...)
GAS LISTING /tmp/ccrNbbzt.s 			page 86


  99:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   return __fprintf_chk (__stream, __USE_FORTIFY_LEVEL - 1, __fmt,
 101:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 102:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** }
 103:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 
 104:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** __fortify_function int
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** printf (const char *__restrict __fmt, ...)
 106:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 107:/usr/include/x86_64-linux-gnu/bits/stdio2.h ****   return __printf_chk (__USE_FORTIFY_LEVEL - 1, __fmt, __va_arg_pack ());
 2713              		.loc 3 107 10 view .LVU737
 2714 0fb2 49BDCDCC 		movabs	r13, -3689348814741910323	# tmp136,
 2714      CCCCCCCC 
 2714      CCCC
 2715              	.LVL228:
 2716 0fbc 0F1F4000 		.p2align 4,,10
 2717              		.p2align 3
 2718              	.L162:
 2719              		.loc 3 107 10 view .LVU738
 2720              	.LBE308:
 2721              	.LBE307:
1049:sieve_extend.c ****         if (factor < maxFactor/2) {
 2722              		.loc 1 1049 9 is_stmt 1 view .LVU739
 2723              	# sieve_extend.c:1049:         primeCount++;
1049:sieve_extend.c ****         if (factor < maxFactor/2) {
 2724              		.loc 1 1049 19 is_stmt 0 view .LVU740
 2725 0fc0 49FFC6   		inc	r14	# primeCount
 2726              	.LVL229:
1050:sieve_extend.c ****             printf("%3ju ",(uintmax_t)factor*2+1);
 2727              		.loc 1 1050 9 is_stmt 1 view .LVU741
 2728              	# sieve_extend.c:1050:         if (factor < maxFactor/2) {
1050:sieve_extend.c ****             printf("%3ju ",(uintmax_t)factor*2+1);
 2729              		.loc 1 1050 12 is_stmt 0 view .LVU742
 2730 0fc3 4939DF   		cmp	r15, rbx	# _4, factor
 2731 0fc6 7758     		ja	.L172	#,
 2732              	.L158:
1048:sieve_extend.c ****         primeCount++;
 2733              		.loc 1 1048 52 is_stmt 1 view .LVU743
 2734              	# sieve_extend.c:1048:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1048:sieve_extend.c ****         primeCount++;
 2735              		.loc 1 1048 61 is_stmt 0 view .LVU744
 2736 0fc8 498B1424 		mov	rdx, QWORD PTR [r12]	# _11, *ISRA.75_33(D)
 2737 0fcc 48FFC3   		inc	rbx	# factor
 2738              	.LVL230:
1048:sieve_extend.c ****         primeCount++;
 2739              		.loc 1 1048 61 view .LVU745
 2740 0fcf EB0A     		jmp	.L171	#
 2741              	.LVL231:
 2742              		.p2align 4,,10
 2743 0fd1 0F1F8000 		.p2align 3
 2743      000000
 2744              	.L173:
 2745              	.LBB313:
 2746              	.LBB314:
 121:sieve_extend.c ****     return index;
 2747              		.loc 1 121 58 is_stmt 1 view .LVU746
 2748              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
GAS LISTING /tmp/ccrNbbzt.s 			page 87


 2749              		.loc 1 121 63 is_stmt 0 view .LVU747
 2750 0fd8 48FFC3   		inc	rbx	# factor
 2751              	.LVL232:
 121:sieve_extend.c ****     return index;
 2752              		.loc 1 121 11 is_stmt 1 view .LVU748
 2753              	.L171:
 121:sieve_extend.c ****     return index;
 2754              		.loc 1 121 11 is_stmt 0 view .LVU749
 2755              	.LBE314:
 2756              	.LBI313:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 2757              		.loc 1 120 25 is_stmt 1 view .LVU750
 2758              	.LBB315:
 121:sieve_extend.c ****     return index;
 2759              		.loc 1 121 5 view .LVU751
 121:sieve_extend.c ****     return index;
 2760              		.loc 1 121 11 view .LVU752
 2761              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 2762              		.loc 1 121 21 is_stmt 0 view .LVU753
 2763 0fdb 4889D8   		mov	rax, rbx	# tmp124, factor
 2764 0fde 48C1E806 		shr	rax, 6	# tmp124,
 2765              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 2766              		.loc 1 121 12 view .LVU754
 2767 0fe2 488B04C2 		mov	rax, QWORD PTR [rdx+rax*8]	# *_39,* _11
 2768              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 2769              		.loc 1 121 11 view .LVU755
 2770 0fe6 480FA3D8 		bt	rax, rbx	# *_39, factor
 2771 0fea 72EC     		jc	.L173	#,
 2772              	.LVL233:
 121:sieve_extend.c ****     return index;
 2773              		.loc 1 121 11 view .LVU756
 2774              	.LBE315:
 2775              	.LBE313:
1048:sieve_extend.c ****         primeCount++;
 2776              		.loc 1 1048 30 is_stmt 1 view .LVU757
 2777              	# sieve_extend.c:1048:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1048:sieve_extend.c ****         primeCount++;
 2778              		.loc 1 1048 5 is_stmt 0 view .LVU758
 2779 0fec 4839F3   		cmp	rbx, rsi	# factor, prephitmp_86
 2780 0fef 72CF     		jb	.L162	#,
 2781              	.LVL234:
 2782              	.L157:
1048:sieve_extend.c ****         primeCount++;
 2783              		.loc 1 1048 5 view .LVU759
 2784              	.LBE325:
1055:sieve_extend.c **** }
 2785              		.loc 1 1055 5 is_stmt 1 view .LVU760
 2786              	.LBB326:
 2787              	.LBI326:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 2788              		.loc 3 105 1 view .LVU761
 2789              	.LBB327:
 2790              		.loc 3 107 3 view .LVU762
 2791              	.LBE327:
GAS LISTING /tmp/ccrNbbzt.s 			page 88


 2792              	.LBE326:
 2793              	# sieve_extend.c:1056: }
1056:sieve_extend.c **** 
 2794              		.loc 1 1056 1 is_stmt 0 view .LVU763
 2795 0ff1 4883C408 		add	rsp, 8	#,
 2796              		.cfi_remember_state
 2797              		.cfi_def_cfa_offset 56
 2798 0ff5 5B       		pop	rbx	#
 2799              		.cfi_def_cfa_offset 48
 2800 0ff6 5D       		pop	rbp	#
 2801              		.cfi_def_cfa_offset 40
 2802 0ff7 415C     		pop	r12	#
 2803              		.cfi_def_cfa_offset 32
 2804 0ff9 415D     		pop	r13	#
 2805              		.cfi_def_cfa_offset 24
 2806              	.LBB331:
 2807              	.LBB328:
 2808              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2809              		.loc 3 107 10 view .LVU764
 2810 0ffb 4C89F2   		mov	rdx, r14	#, primeCount
 2811              	.LBE328:
 2812              	.LBE331:
 2813              	# sieve_extend.c:1056: }
1056:sieve_extend.c **** 
 2814              		.loc 1 1056 1 view .LVU765
 2815 0ffe 415E     		pop	r14	#
 2816              		.cfi_def_cfa_offset 16
 2817              	# sieve_extend.c:1055:     printf("\nFound %ju primes until %ju\n",(uintmax_t)primeCount, (uintmax_
1055:sieve_extend.c **** }
 2818              		.loc 1 1055 5 view .LVU766
 2819 1000 488D4C36 		lea	rcx, 1[rsi+rsi]	# tmp135,
 2819      01
 2820              	.LBB332:
 2821              	.LBB329:
 2822              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2823              		.loc 3 107 10 view .LVU767
 2824 1005 BF010000 		mov	edi, 1	#,
 2824      00
 2825 100a 488D3500 		lea	rsi, .LC1[rip]	#,
 2825      000000
 2826 1011 31C0     		xor	eax, eax	#
 2827              	.LBE329:
 2828              	.LBE332:
 2829              	# sieve_extend.c:1056: }
1056:sieve_extend.c **** 
 2830              		.loc 1 1056 1 view .LVU768
 2831 1013 415F     		pop	r15	#
 2832              		.cfi_def_cfa_offset 8
 2833              	.LBB333:
 2834              	.LBB330:
 2835              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2836              		.loc 3 107 10 view .LVU769
 2837 1015 E9000000 		jmp	__printf_chk@PLT	#
 2837      00
 2838              	.LVL235:
 2839 101a 660F1F44 		.p2align 4,,10
 2839      0000
GAS LISTING /tmp/ccrNbbzt.s 			page 89


 2840              		.p2align 3
 2841              	.L172:
 2842              		.cfi_restore_state
 2843              		.loc 3 107 10 view .LVU770
 2844              	.LBE330:
 2845              	.LBE333:
 2846              	.LBB334:
1051:sieve_extend.c ****             if (primeCount % 10 == 0) printf("\n");
 2847              		.loc 1 1051 13 is_stmt 1 view .LVU771
 2848              	.LBB316:
 2849              	.LBI307:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 2850              		.loc 3 105 1 view .LVU772
 2851              	.LBB309:
 2852              		.loc 3 107 3 view .LVU773
 2853              	.LBE309:
 2854              	.LBE316:
 2855              	# sieve_extend.c:1051:             printf("%3ju ",(uintmax_t)factor*2+1);
1051:sieve_extend.c ****             if (primeCount % 10 == 0) printf("\n");
 2856              		.loc 1 1051 13 is_stmt 0 view .LVU774
 2857 1020 488D541B 		lea	rdx, 1[rbx+rbx]	# tmp111,
 2857      01
 2858              	.LBB317:
 2859              	.LBB310:
 2860              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2861              		.loc 3 107 10 view .LVU775
 2862 1025 488D3500 		lea	rsi, .LC0[rip]	#,
 2862      000000
 2863 102c BF010000 		mov	edi, 1	#,
 2863      00
 2864 1031 31C0     		xor	eax, eax	#
 2865 1033 E8000000 		call	__printf_chk@PLT	#
 2865      00
 2866              	.LVL236:
 2867              		.loc 3 107 10 view .LVU776
 2868              	.LBE310:
 2869              	.LBE317:
1052:sieve_extend.c ****         }
 2870              		.loc 1 1052 13 is_stmt 1 view .LVU777
 2871              	.LBB318:
 2872              	.LBB311:
 2873              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2874              		.loc 3 107 10 is_stmt 0 view .LVU778
 2875 1038 4C89F0   		mov	rax, r14	# tmp120, primeCount
 2876 103b 490FAFC5 		imul	rax, r13	# tmp120, tmp136
 2877              	.LBE311:
 2878              	.LBE318:
 2879              	# sieve_extend.c:1052:             if (primeCount % 10 == 0) printf("\n");
1052:sieve_extend.c ****         }
 2880              		.loc 1 1052 16 view .LVU779
 2881 103f 48B99999 		movabs	rcx, 1844674407370955161	# tmp143,
 2881      99999999 
 2881      9919
 2882              	.LBB319:
 2883              	.LBB312:
 2884              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2885              		.loc 3 107 10 view .LVU780
GAS LISTING /tmp/ccrNbbzt.s 			page 90


 2886 1049 C4E3FBF0 		rorx	rax, rax, 1	# tmp122, tmp120,
 2886      C001
 2887              	.LBE312:
 2888              	.LBE319:
 2889              	# sieve_extend.c:1052:             if (primeCount % 10 == 0) printf("\n");
1052:sieve_extend.c ****         }
 2890              		.loc 1 1052 16 view .LVU781
 2891 104f 4839C8   		cmp	rax, rcx	# tmp122, tmp143
 2892 1052 760C     		jbe	.L159	#,
 2893              	.L170:
 2894 1054 488B7500 		mov	rsi, QWORD PTR 0[rbp]	# prephitmp_86, *ISRA.76_32(D)
 2895              	.LBB320:
 2896              	.LBB321:
 2897              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2898              		.loc 3 107 10 view .LVU782
 2899 1058 E96BFFFF 		jmp	.L158	#
 2899      FF
 2900 105d 0F1F00   		.p2align 4,,10
 2901              		.p2align 3
 2902              	.L159:
 2903              	.LBE321:
 2904              	.LBE320:
1052:sieve_extend.c ****         }
 2905              		.loc 1 1052 39 is_stmt 1 view .LVU783
 2906              	.LVL237:
 2907              	.LBB323:
 2908              	.LBI320:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 2909              		.loc 3 105 1 view .LVU784
 2910              	.LBB322:
 2911              		.loc 3 107 3 view .LVU785
 2912              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 2913              		.loc 3 107 10 is_stmt 0 view .LVU786
 2914 1060 BF0A0000 		mov	edi, 10	#,
 2914      00
 2915 1065 E8000000 		call	putchar@PLT	#
 2915      00
 2916              	.LVL238:
 2917 106a EBE8     		jmp	.L170	#
 2918              	.LVL239:
 2919              	.L163:
 2920              		.loc 3 107 10 view .LVU787
 2921              	.LBE322:
 2922              	.LBE323:
 2923              	.LBE334:
 2924              	# sieve_extend.c:1047:     counter_t primeCount = 1;    // We already have 2
1047:sieve_extend.c ****     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitarray, factor+
 2925              		.loc 1 1047 15 view .LVU788
 2926 106c 41BE0100 		mov	r14d, 1	# primeCount,
 2926      0000
 2927 1072 E97AFFFF 		jmp	.L157	#
 2927      FF
 2928              		.cfi_endproc
 2929              	.LFE86:
 2931 1077 660F1F84 		.p2align 4
 2931      00000000 
 2931      00
GAS LISTING /tmp/ccrNbbzt.s 			page 91


 2933              	sieve:
 2934              	.LVL240:
 2935              	.LFB76:
1024:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
 2936              		.loc 1 1024 86 is_stmt 1 view -0
 2937              		.cfi_startproc
1025:sieve_extend.c ****     counter_t prime         = 0;
 2938              		.loc 1 1025 5 view .LVU790
 2939              	# sieve_extend.c:1024: static struct sieve_state *sieve(const counter_t maxints, const counter_t bl
1024:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
 2940              		.loc 1 1024 86 is_stmt 0 view .LVU791
 2941 1080 4157     		push	r15	#
 2942              		.cfi_def_cfa_offset 16
 2943              		.cfi_offset 15, -16
 2944 1082 4156     		push	r14	#
 2945              		.cfi_def_cfa_offset 24
 2946              		.cfi_offset 14, -24
 2947 1084 4155     		push	r13	#
 2948              		.cfi_def_cfa_offset 32
 2949              		.cfi_offset 13, -32
 2950 1086 4154     		push	r12	#
 2951              		.cfi_def_cfa_offset 40
 2952              		.cfi_offset 12, -40
 2953 1088 55       		push	rbp	#
 2954              		.cfi_def_cfa_offset 48
 2955              		.cfi_offset 6, -48
 2956 1089 53       		push	rbx	#
 2957              		.cfi_def_cfa_offset 56
 2958              		.cfi_offset 3, -56
 2959 108a 4889FB   		mov	rbx, rdi	# maxints, tmp987
 2960              	.LVL241:
 2961              	.LBB415:
 2962              	.LBI415:
  84:sieve_extend.c ****     struct sieve_state *sieve = aligned_alloc(8, sizeof(struct sieve_state));
 2963              		.loc 1 84 28 is_stmt 1 view .LVU792
 2964              	.LBB416:
  85:sieve_extend.c ****     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytesize*8) * anticiped_ca
 2965              		.loc 1 85 5 view .LVU793
 2966              	# sieve_extend.c:86:     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytes
  86:sieve_extend.c **** 
 2967              		.loc 1 86 22 is_stmt 0 view .LVU794
 2968 108d 4989DF   		mov	r15, rbx	# prephitmp_1822, maxints
 2969              	.LBE416:
 2970              	.LBE415:
 2971              	# sieve_extend.c:1024: static struct sieve_state *sieve(const counter_t maxints, const counter_t bl
1024:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
 2972              		.loc 1 1024 86 view .LVU795
 2973 1090 4883EC58 		sub	rsp, 88	#,
 2974              		.cfi_def_cfa_offset 144
 2975              	.LBB419:
 2976              	.LBB417:
 2977              	# sieve_extend.c:86:     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytes
  86:sieve_extend.c **** 
 2978              		.loc 1 86 22 view .LVU796
 2979 1094 49D1EF   		shr	r15	# prephitmp_1822
 2980              	.LBE417:
 2981              	.LBE419:
GAS LISTING /tmp/ccrNbbzt.s 			page 92


 2982              	# sieve_extend.c:1024: static struct sieve_state *sieve(const counter_t maxints, const counter_t bl
1024:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
 2983              		.loc 1 1024 86 view .LVU797
 2984 1097 48897424 		mov	QWORD PTR 56[rsp], rsi	# %sfp, tmp988
 2984      38
 2985              	.LBB420:
 2986              	.LBB418:
 2987              	# sieve_extend.c:85:     struct sieve_state *sieve = aligned_alloc(8, sizeof(struct sieve_state));
  85:sieve_extend.c ****     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytesize*8) * anticiped_ca
 2988              		.loc 1 85 33 view .LVU798
 2989 109c BF080000 		mov	edi, 8	#,
 2989      00
 2990              	.LVL242:
  85:sieve_extend.c ****     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytesize*8) * anticiped_ca
 2991              		.loc 1 85 33 view .LVU799
 2992 10a1 BE180000 		mov	esi, 24	#,
 2992      00
 2993              	.LVL243:
  85:sieve_extend.c ****     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytesize*8) * anticiped_ca
 2994              		.loc 1 85 33 view .LVU800
 2995 10a6 E8000000 		call	aligned_alloc@PLT	#
 2995      00
 2996              	.LVL244:
 2997              	# sieve_extend.c:86:     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytes
  86:sieve_extend.c **** 
 2998              		.loc 1 86 22 view .LVU801
 2999 10ab 498DB700 		lea	rsi, 1024[r15]	# tmp642,
 2999      040000
 3000 10b2 48C1EE0A 		shr	rsi, 10	# tmp643,
 3001              	# sieve_extend.c:86:     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytes
  86:sieve_extend.c **** 
 3002              		.loc 1 86 12 view .LVU802
 3003 10b6 48C1E607 		sal	rsi, 7	# memSize,
 3004              	# sieve_extend.c:88:     sieve->bitarray = aligned_alloc((size_t)anticiped_cache_line_bytesize, (si
  88:sieve_extend.c ****     sieve->bits     = maxints >> 1;
 3005              		.loc 1 88 23 view .LVU803
 3006 10ba BF800000 		mov	edi, 128	#,
 3006      00
 3007              	# sieve_extend.c:85:     struct sieve_state *sieve = aligned_alloc(8, sizeof(struct sieve_state));
  85:sieve_extend.c ****     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytesize*8) * anticiped_ca
 3008              		.loc 1 85 33 view .LVU804
 3009 10bf 4989C6   		mov	r14, rax	# <retval>, tmp989
 3010 10c2 48894424 		mov	QWORD PTR 32[rsp], rax	# %sfp, <retval>
 3010      20
 3011              	.LVL245:
  86:sieve_extend.c **** 
 3012              		.loc 1 86 5 is_stmt 1 view .LVU805
 3013              	# sieve_extend.c:86:     size_t memSize = ceiling(1+((size_t)maxints/2), anticiped_cache_line_bytes
  86:sieve_extend.c **** 
 3014              		.loc 1 86 22 is_stmt 0 view .LVU806
 3015 10c7 4C893C24 		mov	QWORD PTR [rsp], r15	# %sfp, prephitmp_1822
 3016              	.LVL246:
  88:sieve_extend.c ****     sieve->bits     = maxints >> 1;
 3017              		.loc 1 88 5 is_stmt 1 view .LVU807
 3018              	# sieve_extend.c:88:     sieve->bitarray = aligned_alloc((size_t)anticiped_cache_line_bytesize, (si
  88:sieve_extend.c ****     sieve->bits     = maxints >> 1;
 3019              		.loc 1 88 23 is_stmt 0 view .LVU808
GAS LISTING /tmp/ccrNbbzt.s 			page 93


 3020 10cb E8000000 		call	aligned_alloc@PLT	#
 3020      00
 3021              	.LVL247:
  88:sieve_extend.c ****     sieve->bits     = maxints >> 1;
 3022              		.loc 1 88 23 view .LVU809
 3023 10d0 48894424 		mov	QWORD PTR 64[rsp], rax	# %sfp, _94
 3023      40
 3024              	# sieve_extend.c:88:     sieve->bitarray = aligned_alloc((size_t)anticiped_cache_line_bytesize, (si
  88:sieve_extend.c ****     sieve->bits     = maxints >> 1;
 3025              		.loc 1 88 21 view .LVU810
 3026 10d5 498906   		mov	QWORD PTR [r14], rax	# sieve_89->bitarray, _94
  89:sieve_extend.c ****     sieve->size     = maxints;
 3027              		.loc 1 89 5 is_stmt 1 view .LVU811
 3028              	# sieve_extend.c:89:     sieve->bits     = maxints >> 1;
  89:sieve_extend.c ****     sieve->size     = maxints;
 3029              		.loc 1 89 21 is_stmt 0 view .LVU812
 3030 10d8 4D897E08 		mov	QWORD PTR 8[r14], r15	# sieve_89->bits, prephitmp_1822
  90:sieve_extend.c **** 
 3031              		.loc 1 90 5 is_stmt 1 view .LVU813
 3032              	# sieve_extend.c:90:     sieve->size     = maxints;
  90:sieve_extend.c **** 
 3033              		.loc 1 90 21 is_stmt 0 view .LVU814
 3034 10dc 49895E10 		mov	QWORD PTR 16[r14], rbx	# sieve_89->size, maxints
  94:sieve_extend.c **** }
 3035              		.loc 1 94 5 is_stmt 1 view .LVU815
 3036              	.LVL248:
  94:sieve_extend.c **** }
 3037              		.loc 1 94 5 is_stmt 0 view .LVU816
 3038              	.LBE418:
 3039              	.LBE420:
1026:sieve_extend.c ****     bitword_t* bitarray        = sieve->bitarray;
 3040              		.loc 1 1026 5 is_stmt 1 view .LVU817
1027:sieve_extend.c **** 
 3041              		.loc 1 1027 5 view .LVU818
1029:sieve_extend.c **** 
 3042              		.loc 1 1029 5 view .LVU819
1032:sieve_extend.c ****     extendSieve(bitarray, block.pattern_start, block.pattern_size, sieve->bits);
 3043              		.loc 1 1032 5 view .LVU820
 3044              	.LBB421:
 3045              	.LBI421:
 985:sieve_extend.c ****     register counter_t prime   = 0;
 3046              		.loc 1 985 21 view .LVU821
 3047              	.LBB422:
 986:sieve_extend.c ****     counter_t patternsize_bits = 1;
 3048              		.loc 1 986 5 view .LVU822
 987:sieve_extend.c ****     counter_t pattern_start    = 0;
 3049              		.loc 1 987 5 view .LVU823
 988:sieve_extend.c ****     counter_t range_stop       = block_start;
 3050              		.loc 1 988 5 view .LVU824
 989:sieve_extend.c ****     bitword_t* bitarray        = sieve->bitarray;
 3051              		.loc 1 989 5 view .LVU825
 990:sieve_extend.c ****     struct block block = { .prime = 0, .pattern_start = 0, .pattern_size = 0 };
 3052              		.loc 1 990 5 view .LVU826
 991:sieve_extend.c **** 
 3053              		.loc 1 991 5 view .LVU827
 993:sieve_extend.c ****     
 3054              		.loc 1 993 5 view .LVU828
GAS LISTING /tmp/ccrNbbzt.s 			page 94


 3055              	# sieve_extend.c:993:     sieve->bitarray[0] = SAFE_ZERO; // only the first word has to be cleared;
 993:sieve_extend.c ****     
 3056              		.loc 1 993 24 is_stmt 0 view .LVU829
 3057 10e0 48C70000 		mov	QWORD PTR [rax], 0	# MEM[(uint64_t *)_94],
 3057      000000
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3058              		.loc 1 995 5 is_stmt 1 view .LVU830
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3059              		.loc 1 995 11 view .LVU831
 3060              	# sieve_extend.c:995:     for (;range_stop < block_stop;) {
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3061              		.loc 1 995 5 is_stmt 0 view .LVU832
 3062 10e7 4D85FF   		test	r15, r15	# prephitmp_1822
 3063 10ea 0F84990E 		je	.L404	#,
 3063      0000
 3064              	.LBB423:
 3065              	# sieve_extend.c:996:         prime = searchBitFalse(bitarray, prime+1);
 996:sieve_extend.c ****         counter_t start = prime * prime * 2 + prime * 2;
 3066              		.loc 1 996 17 view .LVU833
 3067 10f0 41BD0100 		mov	r13d, 1	# index,
 3067      0000
 3068              	# sieve_extend.c:1001:         if (block_start >= (prime + 1)) start = block_start + prime + prime 
1001:sieve_extend.c **** 
 3069              		.loc 1 1001 102 view .LVU834
 3070 10f6 4C896C24 		mov	QWORD PTR 8[rsp], r13	# %sfp, index
 3070      08
 3071              	.LBE423:
 3072              	# sieve_extend.c:988:     counter_t pattern_start    = 0;
 988:sieve_extend.c ****     counter_t range_stop       = block_start;
 3073              		.loc 1 988 15 view .LVU835
 3074 10fb 48C74424 		mov	QWORD PTR 16[rsp], 0	# %sfp,
 3074      10000000 
 3074      00
 3075              	.LBB474:
 3076              	# sieve_extend.c:1001:         if (block_start >= (prime + 1)) start = block_start + prime + prime 
1001:sieve_extend.c **** 
 3077              		.loc 1 1001 102 view .LVU836
 3078 1104 4C8B6C24 		mov	r13, QWORD PTR 64[rsp]	# _94, %sfp
 3078      40
 3079 1109 488B4424 		mov	rax, QWORD PTR 8[rsp]	# index, %sfp
 3079      08
 3080              	.LVL249:
1001:sieve_extend.c **** 
 3081              		.loc 1 1001 102 view .LVU837
 3082              	.LBE474:
 3083              	# sieve_extend.c:986:     register counter_t prime   = 0;
 986:sieve_extend.c ****     counter_t patternsize_bits = 1;
 3084              		.loc 1 986 24 view .LVU838
 3085 110e 31C9     		xor	ecx, ecx	# prime
 3086              	# sieve_extend.c:987:     counter_t patternsize_bits = 1;
 987:sieve_extend.c ****     counter_t pattern_start    = 0;
 3087              		.loc 1 987 15 view .LVU839
 3088 1110 41BE0100 		mov	r14d, 1	# patternsize_bits,
 3088      0000
 3089              	# sieve_extend.c:991:     struct block block = { .prime = 0, .pattern_start = 0, .pattern_size = 0 
 991:sieve_extend.c **** 
 3090              		.loc 1 991 18 view .LVU840
GAS LISTING /tmp/ccrNbbzt.s 			page 95


 3091 1116 31D2     		xor	edx, edx	# block$pattern_size
 3092 1118 31F6     		xor	esi, esi	# block$pattern_start
 3093              	.LVL250:
 3094 111a 660F1F44 		.p2align 4,,10
 3094      0000
 3095              		.p2align 3
 3096              	.L175:
 3097              	.LBB475:
 3098              	.LBB424:
 3099              	.LBB425:
 122:sieve_extend.c **** }
 3100              		.loc 1 122 5 is_stmt 1 view .LVU841
 122:sieve_extend.c **** }
 3101              		.loc 1 122 5 is_stmt 0 view .LVU842
 3102              	.LBE425:
 3103              	.LBE424:
 997:sieve_extend.c ****         if (start > block_stop) break;
 3104              		.loc 1 997 9 is_stmt 1 view .LVU843
 3105              	# sieve_extend.c:997:         counter_t start = prime * prime * 2 + prime * 2;
 997:sieve_extend.c ****         if (start > block_stop) break;
 3106              		.loc 1 997 45 is_stmt 0 view .LVU844
 3107 1120 488D5801 		lea	rbx, 1[rax]	# index,
 3108 1124 4C8D2400 		lea	r12, [rax+rax]	# _228,
 3109              	# sieve_extend.c:997:         counter_t start = prime * prime * 2 + prime * 2;
 997:sieve_extend.c ****         if (start > block_stop) break;
 3110              		.loc 1 997 19 view .LVU845
 3111 1128 4889DD   		mov	rbp, rbx	# index, index
 3112 112b 490FAFEC 		imul	rbp, r12	# index, _228
 3113              	.LVL251:
 998:sieve_extend.c **** 
 3114              		.loc 1 998 9 is_stmt 1 view .LVU846
 3115              	# sieve_extend.c:998:         if (start > block_stop) break;
 998:sieve_extend.c **** 
 3116              		.loc 1 998 12 is_stmt 0 view .LVU847
 3117 112f 483B2C24 		cmp	rbp, QWORD PTR [rsp]	# index, %sfp
 3118 1133 0F872605 		ja	.L405	#,
 3118      0000
1000:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 3119              		.loc 1 1000 9 is_stmt 1 view .LVU848
 3120              	# sieve_extend.c:1000:         const counter_t step  = prime * 2 + 1;
1000:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 3121              		.loc 1 1000 25 is_stmt 0 view .LVU849
 3122 1139 49FFC4   		inc	r12	# step
 3123              	.LVL252:
1001:sieve_extend.c **** 
 3124              		.loc 1 1001 9 is_stmt 1 view .LVU850
 3125              	# sieve_extend.c:1001:         if (block_start >= (prime + 1)) start = block_start + prime + prime 
1001:sieve_extend.c **** 
 3126              		.loc 1 1001 12 is_stmt 0 view .LVU851
 3127 113c 4885DB   		test	rbx, rbx	# index
 3128 113f 7516     		jne	.L181	#,
1001:sieve_extend.c **** 
 3129              		.loc 1 1001 41 is_stmt 1 view .LVU852
 3130              	# sieve_extend.c:1001:         if (block_start >= (prime + 1)) start = block_start + prime + prime 
1001:sieve_extend.c **** 
 3131              		.loc 1 1001 102 is_stmt 0 view .LVU853
 3132 1141 48C7C0FF 		mov	rax, -1	# tmp659,
GAS LISTING /tmp/ccrNbbzt.s 			page 96


 3132      FFFFFF
 3133 1148 31D2     		xor	edx, edx	# tmp658
 3134 114a 49F7F4   		div	r12	# step
 3135              	# sieve_extend.c:1001:         if (block_start >= (prime + 1)) start = block_start + prime + prime 
1001:sieve_extend.c **** 
 3136              		.loc 1 1001 47 view .LVU854
 3137 114d 48C7C5FE 		mov	rbp, -2	# tmp660,
 3137      FFFFFF
 3138              	.LVL253:
1001:sieve_extend.c **** 
 3139              		.loc 1 1001 47 view .LVU855
 3140 1154 4829D5   		sub	rbp, rdx	# index, tmp658
 3141              	.LVL254:
 3142              	.L181:
1003:sieve_extend.c ****         block.pattern_size = patternsize_bits;
 3143              		.loc 1 1003 9 is_stmt 1 view .LVU856
 3144              	# sieve_extend.c:1003:         range_stop = block_start + patternsize_bits * step * 2;  // range is
1003:sieve_extend.c ****         block.pattern_size = patternsize_bits;
 3145              		.loc 1 1003 53 is_stmt 0 view .LVU857
 3146 1157 4C89E0   		mov	rax, r12	# _65, step
 3147 115a 490FAFC6 		imul	rax, r14	# _65, patternsize_bits
 3148              	# sieve_extend.c:1003:         range_stop = block_start + patternsize_bits * step * 2;  // range is
1003:sieve_extend.c ****         block.pattern_size = patternsize_bits;
 3149              		.loc 1 1003 60 view .LVU858
 3150 115e 4C8D1C00 		lea	r11, [rax+rax]	# _66,
 3151              	.LVL255:
1004:sieve_extend.c ****         block.pattern_start = pattern_start;
 3152              		.loc 1 1004 9 is_stmt 1 view .LVU859
1005:sieve_extend.c ****         if (range_stop > block_stop) return block; //range_stop = block_stop;
 3153              		.loc 1 1005 9 view .LVU860
1006:sieve_extend.c **** 
 3154              		.loc 1 1006 9 view .LVU861
 3155              	# sieve_extend.c:1003:         range_stop = block_start + patternsize_bits * step * 2;  // range is
1003:sieve_extend.c ****         block.pattern_size = patternsize_bits;
 3156              		.loc 1 1003 53 is_stmt 0 view .LVU862
 3157 1162 48894424 		mov	QWORD PTR 40[rsp], rax	# %sfp, _65
 3157      28
 3158              	# sieve_extend.c:1006:         if (range_stop > block_stop) return block; //range_stop = block_stop
1006:sieve_extend.c **** 
 3159              		.loc 1 1006 12 view .LVU863
 3160 1167 4C3B1C24 		cmp	r11, QWORD PTR [rsp]	# _66, %sfp
 3161 116b 0F87DB0D 		ja	.L406	#,
 3161      0000
1008:sieve_extend.c ****             pattern_start = block_start | patternsize_bits;
 3162              		.loc 1 1008 9 is_stmt 1 view .LVU864
 3163 1171 488B4424 		mov	rax, QWORD PTR 16[rsp]	# pattern_start, %sfp
 3163      10
 3164 1176 48894424 		mov	QWORD PTR 24[rsp], rax	# %sfp, pattern_start
 3164      18
 3165              	# sieve_extend.c:1008:         if (patternsize_bits>1) {
1008:sieve_extend.c ****             pattern_start = block_start | patternsize_bits;
 3166              		.loc 1 1008 12 is_stmt 0 view .LVU865
 3167 117b 4983FE01 		cmp	r14, 1	# patternsize_bits,
 3168 117f 0F879B00 		ja	.L407	#,
 3168      0000
 3169              	.LVL256:
 3170              	.L184:
GAS LISTING /tmp/ccrNbbzt.s 			page 97


1012:sieve_extend.c **** 
 3171              		.loc 1 1012 9 is_stmt 1 view .LVU866
1014:sieve_extend.c ****         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_
 3172              		.loc 1 1014 9 view .LVU867
 3173              	# sieve_extend.c:1014:         if      (step < SMALLSTEP_FASTER)      setBitsTrue_smallStep (bitarr
1014:sieve_extend.c ****         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_
 3174              		.loc 1 1014 17 is_stmt 0 view .LVU868
 3175 1185 4C3B2500 		cmp	r12, QWORD PTR global_SMALLSTEP_FASTER[rip]	# step, global_SMALLSTEP_FASTER
 3175      000000
 3176 118c 0F82E600 		jb	.L408	#,
 3176      0000
 3177              	.L188:
1015:sieve_extend.c ****         else if (step < WORD_SIZE_counter * 4) setBitsTrue_largeRange_vector(bitarray, start, step,
 3178              		.loc 1 1015 14 is_stmt 1 view .LVU869
 3179              	# sieve_extend.c:1015:         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarr
1015:sieve_extend.c ****         else if (step < WORD_SIZE_counter * 4) setBitsTrue_largeRange_vector(bitarray, start, step,
 3180              		.loc 1 1015 17 is_stmt 0 view .LVU870
 3181 1192 4C3B2500 		cmp	r12, QWORD PTR global_MEDIUMSTEP_FASTER[rip]	# step, global_MEDIUMSTEP_FASTER
 3181      000000
 3182 1199 0F82F902 		jb	.L409	#,
 3182      0000
1016:sieve_extend.c ****         else                                   setBitsTrue_largeRange(bitarray, start, step, range_
 3183              		.loc 1 1016 14 is_stmt 1 view .LVU871
 3184              	# sieve_extend.c:1016:         else if (step < WORD_SIZE_counter * 4) setBitsTrue_largeRange_vector
1016:sieve_extend.c ****         else                                   setBitsTrue_largeRange(bitarray, start, step, range_
 3185              		.loc 1 1016 17 is_stmt 0 view .LVU872
 3186 119f 4981FCFF 		cmp	r12, 255	# step,
 3186      000000
 3187 11a6 0F870C02 		ja	.L210	#,
 3187      0000
1016:sieve_extend.c ****         else                                   setBitsTrue_largeRange(bitarray, start, step, range_
 3188              		.loc 1 1016 48 is_stmt 1 view .LVU873
 3189 11ac 4C89D9   		mov	rcx, r11	#, _66
 3190 11af 4C89E2   		mov	rdx, r12	#, step
 3191 11b2 4889EE   		mov	rsi, rbp	#, index
 3192 11b5 4C89EF   		mov	rdi, r13	#, _94
 3193 11b8 4C895C24 		mov	QWORD PTR 48[rsp], r11	# %sfp, _66
 3193      30
 3194 11bd E83EEEFF 		call	setBitsTrue_largeRange_vector	#
 3194      FF
 3195              	.LVL257:
 3196 11c2 4C8B5C24 		mov	r11, QWORD PTR 48[rsp]	# _66, %sfp
 3196      30
 3197              	.LVL258:
 3198              	.L192:
1016:sieve_extend.c ****         else                                   setBitsTrue_largeRange(bitarray, start, step, range_
 3199              		.loc 1 1016 48 is_stmt 0 view .LVU874
 3200              	.LBE475:
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3201              		.loc 1 995 11 is_stmt 1 view .LVU875
 3202              	# sieve_extend.c:995:     for (;range_stop < block_stop;) {
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3203              		.loc 1 995 5 is_stmt 0 view .LVU876
 3204 11c7 4C3B1C24 		cmp	r11, QWORD PTR [rsp]	# _66, %sfp
 3205 11cb 720E     		jb	.L219	#,
 3206 11cd E9A30100 		jmp	.L410	#
 3206      00
GAS LISTING /tmp/ccrNbbzt.s 			page 98


 3207              	.LVL259:
 3208              		.p2align 4,,10
 3209 11d2 660F1F44 		.p2align 3
 3209      0000
 3210              	.L411:
 3211              	.LBB476:
 3212              	.LBB428:
 3213              	.LBB426:
 121:sieve_extend.c ****     return index;
 3214              		.loc 1 121 58 is_stmt 1 view .LVU877
 3215              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 3216              		.loc 1 121 63 is_stmt 0 view .LVU878
 3217 11d8 48FFC3   		inc	rbx	# index
 3218              	.LVL260:
 121:sieve_extend.c ****     return index;
 3219              		.loc 1 121 11 is_stmt 1 view .LVU879
 3220              	.L219:
 121:sieve_extend.c ****     return index;
 3221              		.loc 1 121 11 is_stmt 0 view .LVU880
 3222              	.LBE426:
 3223              	.LBE428:
 996:sieve_extend.c ****         counter_t start = prime * prime * 2 + prime * 2;
 3224              		.loc 1 996 9 is_stmt 1 view .LVU881
 3225              	.LBB429:
 3226              	.LBI424:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 3227              		.loc 1 120 25 view .LVU882
 3228              	.LBB427:
 121:sieve_extend.c ****     return index;
 3229              		.loc 1 121 5 view .LVU883
 121:sieve_extend.c ****     return index;
 3230              		.loc 1 121 11 view .LVU884
 3231              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 3232              		.loc 1 121 21 is_stmt 0 view .LVU885
 3233 11db 4889D8   		mov	rax, rbx	# tmp646, index
 3234 11de 48C1E806 		shr	rax, 6	# tmp646,
 3235              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 3236              		.loc 1 121 12 view .LVU886
 3237 11e2 498B44C5 		mov	rax, QWORD PTR 0[r13+rax*8]	# *_1009,* _94
 3237      00
 3238              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 3239              		.loc 1 121 11 view .LVU887
 3240 11e7 480FA3D8 		bt	rax, rbx	# *_1009, index
 3241 11eb 72EB     		jc	.L411	#,
 3242              	.LBE427:
 3243              	.LBE429:
 3244              	.LBE476:
 3245              	.LBE422:
 3246              	.LBE421:
 3247              	# sieve_extend.c:1024: static struct sieve_state *sieve(const counter_t maxints, const counter_t bl
1024:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
 3248              		.loc 1 1024 86 view .LVU888
 3249 11ed 488B4424 		mov	rax, QWORD PTR 24[rsp]	# pattern_start, %sfp
GAS LISTING /tmp/ccrNbbzt.s 			page 99


 3249      18
 3250 11f2 488B4C24 		mov	rcx, QWORD PTR 8[rsp]	# prime, %sfp
 3250      08
 3251 11f7 488B7424 		mov	rsi, QWORD PTR 16[rsp]	# block$pattern_start, %sfp
 3251      10
 3252 11fc 4C89F2   		mov	rdx, r14	# block$pattern_size, patternsize_bits
 3253              	.LVL261:
1024:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
 3254              		.loc 1 1024 86 view .LVU889
 3255 11ff 48894424 		mov	QWORD PTR 16[rsp], rax	# %sfp, pattern_start
 3255      10
 3256              	.LVL262:
1024:sieve_extend.c ****     struct sieve_state *sieve = create_sieve(maxints);
 3257              		.loc 1 1024 86 view .LVU890
 3258 1204 48895C24 		mov	QWORD PTR 8[rsp], rbx	# %sfp, index
 3258      08
 3259 1209 4C8B7424 		mov	r14, QWORD PTR 40[rsp]	# patternsize_bits, %sfp
 3259      28
 3260 120e 4889D8   		mov	rax, rbx	# index, index
 3261 1211 E90AFFFF 		jmp	.L175	#
 3261      FF
 3262              	.LVL263:
 3263 1216 662E0F1F 		.p2align 4,,10
 3263      84000000 
 3263      0000
 3264              		.p2align 3
 3265              	.L407:
 3266              	.LBB484:
 3267              	.LBB480:
 3268              	.LBB477:
1009:sieve_extend.c ****             extendSieve(bitarray, pattern_start, patternsize_bits, range_stop);
 3269              		.loc 1 1009 13 is_stmt 1 view .LVU891
1010:sieve_extend.c ****         }
 3270              		.loc 1 1010 13 view .LVU892
 3271              	.LBB430:
 3272              	.LBI430:
 889:sieve_extend.c ****     if (size < WORD_SIZE_counter)   {
 3273              		.loc 1 889 20 view .LVU893
 3274              	.LBB431:
 890:sieve_extend.c ****         extendSieve_smallSize (bitarray, source_start, size, destination_stop);
 3275              		.loc 1 890 5 view .LVU894
 3276              	# sieve_extend.c:890:     if (size < WORD_SIZE_counter)   {
 890:sieve_extend.c ****         extendSieve_smallSize (bitarray, source_start, size, destination_stop);
 3277              		.loc 1 890 8 is_stmt 0 view .LVU895
 3278 1220 4983FE3F 		cmp	r14, 63	# patternsize_bits,
 3279 1224 0F860204 		jbe	.L412	#,
 3279      0000
 895:sieve_extend.c ****     const bitshift_t copy_bit   = bitindex_calc(copy_start);
 3280              		.loc 1 895 5 is_stmt 1 view .LVU896
 3281              	.LVL264:
 896:sieve_extend.c ****     const bitshift_t source_bit = bitindex_calc(source_start);
 3282              		.loc 1 896 5 view .LVU897
 3283              	# sieve_extend.c:895:     const counter_t copy_start  = source_start + size;
 895:sieve_extend.c ****     const bitshift_t copy_bit   = bitindex_calc(copy_start);
 3284              		.loc 1 895 21 is_stmt 0 view .LVU898
 3285 122a 4B8D0436 		lea	rax, [r14+r14]	# copy_start,
 3286              	# sieve_extend.c:897:     const bitshift_t source_bit = bitindex_calc(source_start);
GAS LISTING /tmp/ccrNbbzt.s 			page 100


 897:sieve_extend.c **** 
 3287              		.loc 1 897 22 view .LVU899
 3288 122e 4C89F2   		mov	rdx, r14	# source_bit, patternsize_bits
 3289 1231 83E23F   		and	edx, 63	# source_bit,
 3290              	# sieve_extend.c:896:     const bitshift_t copy_bit   = bitindex_calc(copy_start);
 896:sieve_extend.c ****     const bitshift_t source_bit = bitindex_calc(source_start);
 3291              		.loc 1 896 22 view .LVU900
 3292 1234 83E03F   		and	eax, 63	# copy_bit,
 3293              	.LVL265:
 897:sieve_extend.c **** 
 3294              		.loc 1 897 5 is_stmt 1 view .LVU901
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 3295              		.loc 1 899 5 view .LVU902
 3296              	# sieve_extend.c:899:     if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_s
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 3297              		.loc 1 899 13 is_stmt 0 view .LVU903
 3298 1237 4839D0   		cmp	rax, rdx	# copy_bit, source_bit
 3299              	# sieve_extend.c:899:     if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_s
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 3300              		.loc 1 899 37 view .LVU904
 3301 123a 4C895C24 		mov	QWORD PTR 48[rsp], r11	# %sfp, _66
 3301      30
 3302 123f 4C89D9   		mov	rcx, r11	#, _66
 3303 1242 4C89F2   		mov	rdx, r14	#, patternsize_bits
 3304              	.LVL266:
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 3305              		.loc 1 899 37 view .LVU905
 3306 1245 4C89F6   		mov	rsi, r14	#, patternsize_bits
 3307 1248 4C89EF   		mov	rdi, r13	#, _94
 3308              	# sieve_extend.c:899:     if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_s
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 3309              		.loc 1 899 13 view .LVU906
 3310 124b 0F82C703 		jb	.L413	#,
 3310      0000
 3311              	.LVL267:
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 3312              		.loc 1 900 10 is_stmt 1 view .LVU907
 3313              	# sieve_extend.c:900:     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, so
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 3314              		.loc 1 900 13 is_stmt 0 view .LVU908
 3315 1251 0F86A903 		jbe	.L187	#,
 3315      0000
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 3316              		.loc 1 900 37 is_stmt 1 view .LVU909
 3317 1257 E8B4EFFF 		call	extendSieve_shiftright_ivdep	#
 3317      FF
 3318              	.LVL268:
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 3319              		.loc 1 900 37 is_stmt 0 view .LVU910
 3320              	.LBE431:
 3321              	.LBE430:
 3322              	# sieve_extend.c:1014:         if      (step < SMALLSTEP_FASTER)      setBitsTrue_smallStep (bitarr
1014:sieve_extend.c ****         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_
 3323              		.loc 1 1014 17 view .LVU911
 3324 125c 4C3B2500 		cmp	r12, QWORD PTR global_SMALLSTEP_FASTER[rip]	# step, global_SMALLSTEP_FASTER
 3324      000000
 3325              	.LBB434:
GAS LISTING /tmp/ccrNbbzt.s 			page 101


 3326              	.LBB432:
 3327 1263 4C897424 		mov	QWORD PTR 24[rsp], r14	# %sfp, patternsize_bits
 3327      18
 3328 1268 4C8B5C24 		mov	r11, QWORD PTR 48[rsp]	# _66, %sfp
 3328      30
 3329              	.LVL269:
1014:sieve_extend.c ****         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_
 3330              		.loc 1 1014 17 view .LVU912
 3331              	.LBE432:
 3332              	.LBE434:
1012:sieve_extend.c **** 
 3333              		.loc 1 1012 9 is_stmt 1 view .LVU913
1014:sieve_extend.c ****         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_
 3334              		.loc 1 1014 9 view .LVU914
 3335              	# sieve_extend.c:1014:         if      (step < SMALLSTEP_FASTER)      setBitsTrue_smallStep (bitarr
1014:sieve_extend.c ****         else if (step < MEDIUMSTEP_FASTER)     setBitsTrue_mediumStep(bitarray, start, step, range_
 3336              		.loc 1 1014 17 is_stmt 0 view .LVU915
 3337 126d 0F831FFF 		jnb	.L188	#,
 3337      FFFF
 3338              	.LVL270:
 3339              		.p2align 4,,10
 3340 1273 0F1F4400 		.p2align 3
 3340      00
 3341              	.L408:
 3342              	.LBB435:
 3343              	.LBB436:
 3344              	.LBB437:
 247:sieve_extend.c **** 
 3345              		.loc 1 247 41 is_stmt 1 view .LVU916
 3346              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 3347              		.loc 1 247 5 is_stmt 0 view .LVU917
 3348 1278 4983FC40 		cmp	r12, 64	# step,
 3349 127c 0F87E90C 		ja	.L315	#,
 3349      0000
 3350 1282 4C89E0   		mov	rax, r12	# patternsize, step
 3351              	.LBE437:
 3352              	# sieve_extend.c:246: 	register bitword_t pattern = SAFE_SHIFTBIT;
 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 3353              		.loc 1 246 21 view .LVU918
 3354 1285 B9010000 		mov	ecx, 1	# pattern,
 3354      00
 3355              	.LVL271:
 3356 128a 660F1F44 		.p2align 4,,10
 3356      0000
 3357              		.p2align 3
 3358              	.L190:
 3359              	.LBB438:
 247:sieve_extend.c **** 
 3360              		.loc 1 247 95 is_stmt 1 view .LVU919
 3361              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 3362              		.loc 1 247 115 is_stmt 0 view .LVU920
 3363 1290 C4E2F9F7 		shlx	rdx, rcx, rax	# _102, pattern, patternsize
 3363      D1
 3364              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 102


 3365              		.loc 1 247 79 view .LVU921
 3366 1295 4801C0   		add	rax, rax	# patternsize
 3367              	.LVL272:
 3368              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 3369              		.loc 1 247 103 view .LVU922
 3370 1298 4809D1   		or	rcx, rdx	# pattern, _102
 3371              	.LVL273:
 247:sieve_extend.c **** 
 3372              		.loc 1 247 67 is_stmt 1 view .LVU923
 247:sieve_extend.c **** 
 3373              		.loc 1 247 41 view .LVU924
 3374              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 3375              		.loc 1 247 5 is_stmt 0 view .LVU925
 3376 129b 4883F840 		cmp	rax, 64	# patternsize,
 3377 129f 76EF     		jbe	.L190	#,
 3378              	.LVL274:
 3379              	.L189:
 247:sieve_extend.c **** 
 3380              		.loc 1 247 5 view .LVU926
 3381              	.LBE438:
 250:sieve_extend.c ****     register counter_t copy_word = wordindex(range_start);
 3382              		.loc 1 250 5 is_stmt 1 view .LVU927
 3383              	# sieve_extend.c:251:     register counter_t copy_word = wordindex(range_start);
 251:sieve_extend.c ****      if (copy_word == range_stop_word) { // shortcut
 3384              		.loc 1 251 24 is_stmt 0 view .LVU928
 3385 12a1 4989EA   		mov	r10, rbp	# copy_word, index
 3386 12a4 49C1EA06 		shr	r10, 6	# copy_word,
 3387              	# sieve_extend.c:250:     const counter_t range_stop_word = wordindex(range_stop);
 250:sieve_extend.c ****     register counter_t copy_word = wordindex(range_start);
 3388              		.loc 1 250 21 view .LVU929
 3389 12a8 4D89D8   		mov	r8, r11	# range_stop_word, _66
 3390 12ab 4A8D34D5 		lea	rsi, 0[0+r10*8]	# _1545,
 3390      00000000 
 3391 12b3 4589D9   		mov	r9d, r11d	# tmp664, _66
 3392 12b6 498D5435 		lea	rdx, 0[r13+rsi]	# _1546,
 3392      00
 3393 12bb 41F7D1   		not	r9d	# tmp664
 3394 12be 49C7C7FF 		mov	r15, -1	# tmp1443,
 3394      FFFFFF
 3395 12c5 49C1E806 		shr	r8, 6	# range_stop_word,
 3396              	.LVL275:
 251:sieve_extend.c ****      if (copy_word == range_stop_word) { // shortcut
 3397              		.loc 1 251 5 is_stmt 1 view .LVU930
 252:sieve_extend.c ****        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(range_stop));
 3398              		.loc 1 252 6 view .LVU931
 3399 12c9 C442B3F7 		shrx	r15, r15, r9	# _1553, tmp1443, tmp664
 3399      FF
 3400 12ce 488B02   		mov	rax, QWORD PTR [rdx]	# pretmp_1547, MEM[(uint64_t *)_1546]
 3401 12d1 4C897C24 		mov	QWORD PTR 48[rsp], r15	# %sfp, _1553
 3401      30
 3402 12d6 C4E2D1F7 		shlx	rdi, rcx, rbp	# _1549, pattern, index
 3402      F9
 3403              	# sieve_extend.c:252:      if (copy_word == range_stop_word) { // shortcut
 252:sieve_extend.c ****        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(range_stop));
 3404              		.loc 1 252 9 is_stmt 0 view .LVU932
GAS LISTING /tmp/ccrNbbzt.s 			page 103


 3405 12db 4D39D0   		cmp	r8, r10	# range_stop_word, copy_word
 3406 12de 0F846D03 		je	.L414	#,
 3406      0000
 257:sieve_extend.c **** 
 3407              		.loc 1 257 5 is_stmt 1 view .LVU933
 3408              	# sieve_extend.c:257:     bitarray[copy_word++] |= (pattern << bitindex(range_start));
 257:sieve_extend.c **** 
 3409              		.loc 1 257 27 is_stmt 0 view .LVU934
 3410 12e4 4809F8   		or	rax, rdi	# tmp669, _1549
 3411 12e7 488902   		mov	QWORD PTR [rdx], rax	# MEM[(uint64_t *)_1546], tmp669
 3412              	# sieve_extend.c:261:     pattern = (pattern << (bitindex_calc(range_start) % step)); // correct fo
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 3413              		.loc 1 261 28 view .LVU935
 3414 12ea 4889E8   		mov	rax, rbp	# index, index
 3415 12ed 83E03F   		and	eax, 63	# index,
 3416              	# sieve_extend.c:261:     pattern = (pattern << (bitindex_calc(range_start) % step)); // correct fo
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 3417              		.loc 1 261 55 view .LVU936
 3418 12f0 31D2     		xor	edx, edx	# tmp672
 3419 12f2 49F7F4   		div	r12	# step
 3420              	# sieve_extend.c:262:     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 262:sieve_extend.c ****     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
 3421              		.loc 1 262 25 view .LVU937
 3422 12f5 B8400000 		mov	eax, 64	# tmp675,
 3422      00
 3423              	# sieve_extend.c:257:     bitarray[copy_word++] |= (pattern << bitindex(range_start));
 257:sieve_extend.c **** 
 3424              		.loc 1 257 23 view .LVU938
 3425 12fa 4D8D4A01 		lea	r9, 1[r10]	# copy_word,
 3426              	.LVL276:
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 3427              		.loc 1 261 5 is_stmt 1 view .LVU939
 3428              	# sieve_extend.c:261:     pattern = (pattern << (bitindex_calc(range_start) % step)); // correct fo
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 3429              		.loc 1 261 13 is_stmt 0 view .LVU940
 3430 12fe C4E2E9F7 		shlx	rcx, rcx, rdx	# pattern, pattern, tmp672
 3430      C9
 3431              	.LVL277:
 262:sieve_extend.c ****     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
 3432              		.loc 1 262 5 is_stmt 1 view .LVU941
 3433              	# sieve_extend.c:262:     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 262:sieve_extend.c ****     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
 3434              		.loc 1 262 25 is_stmt 0 view .LVU942
 3435 1303 31D2     		xor	edx, edx	# tmp676
 3436 1305 49F7F4   		div	r12	# step
 3437              	.LVL278:
 263:sieve_extend.c ****     // copy_word++;
 3438              		.loc 1 263 5 is_stmt 1 view .LVU943
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 3439              		.loc 1 267 5 view .LVU944
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 3440              		.loc 1 267 11 view .LVU945
 3441              	# sieve_extend.c:263:     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_
 263:sieve_extend.c ****     // copy_word++;
 3442              		.loc 1 263 84 is_stmt 0 view .LVU946
 3443 1308 41BC2000 		mov	r12d, 32	# tmp679,
 3443      0000
GAS LISTING /tmp/ccrNbbzt.s 			page 104


 3444              	.LVL279:
 263:sieve_extend.c ****     // copy_word++;
 3445              		.loc 1 263 84 view .LVU947
 3446 130e 4929D4   		sub	r12, rdx	# tmp678, tmp676
 3447              	# sieve_extend.c:263:     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_
 263:sieve_extend.c ****     // copy_word++;
 3448              		.loc 1 263 25 view .LVU948
 3449 1311 4D01E4   		add	r12, r12	# pattern_shift_flipped
 3450              	.LVL280:
 263:sieve_extend.c ****     // copy_word++;
 3451              		.loc 1 263 25 view .LVU949
 3452 1314 89D0     		mov	eax, edx	# _1837, tmp676
 3453 1316 4489E5   		mov	ebp, r12d	# _1838, pattern_shift_flipped
 3454              	.LVL281:
 3455              	# sieve_extend.c:267:     for (;copy_word < range_stop_word; copy_word++) {
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 3456              		.loc 1 267 5 view .LVU950
 3457 1319 4D39C8   		cmp	r8, r9	# range_stop_word, copy_word
 3458 131c 7633     		jbe	.L193	#,
 3459 131e 498D7435 		lea	rsi, 8[r13+rsi]	# ivtmp.584,
 3459      08
 3460 1323 4F8D7CC5 		lea	r15, 0[r13+r8*8]	# _1712,
 3460      00
 3461              	.LVL282:
 3462 1328 0F1F8400 		.p2align 4,,10
 3462      00000000 
 3463              		.p2align 3
 3464              	.L194:
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 3465              		.loc 1 268 9 is_stmt 1 view .LVU951
 3466              	# sieve_extend.c:268:         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flip
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 3467              		.loc 1 268 28 is_stmt 0 view .LVU952
 3468 1330 C4E2FBF7 		shrx	rdi, rcx, rax	# _135, pattern, _1837
 3468      F9
 3469              	# sieve_extend.c:268:         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flip
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 3470              		.loc 1 268 57 view .LVU953
 3471 1335 C4E2D1F7 		shlx	rcx, rcx, rbp	# _137, pattern, _1838
 3471      C9
 3472              	.LVL283:
 3473              	# sieve_extend.c:268:         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flip
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 3474              		.loc 1 268 17 view .LVU954
 3475 133a 4809F9   		or	rcx, rdi	# pattern, _135
 3476              	.LVL284:
 269:sieve_extend.c ****     } 
 3477              		.loc 1 269 9 is_stmt 1 view .LVU955
 3478              	# sieve_extend.c:269:         bitarray[copy_word] |= pattern;
 269:sieve_extend.c ****     } 
 3479              		.loc 1 269 29 is_stmt 0 view .LVU956
 3480 133d 48090E   		or	QWORD PTR [rsi], rcx	# MEM[base: _1716, offset: 0B], pattern
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 3481              		.loc 1 267 40 is_stmt 1 view .LVU957
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 3482              		.loc 1 267 11 view .LVU958
 3483 1340 4883C608 		add	rsi, 8	# ivtmp.584,
GAS LISTING /tmp/ccrNbbzt.s 			page 105


 3484              	# sieve_extend.c:267:     for (;copy_word < range_stop_word; copy_word++) {
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 3485              		.loc 1 267 5 is_stmt 0 view .LVU959
 3486 1344 4939F7   		cmp	r15, rsi	# _1712, ivtmp.584
 3487 1347 75E7     		jne	.L194	#,
 3488 1349 4F8D4C08 		lea	r9, -1[r8+r9]	# _1678,
 3488      FF
 3489 134e 4D29D1   		sub	r9, r10	# copy_word, copy_word
 3490              	.L193:
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 3491              		.loc 1 272 5 is_stmt 1 view .LVU960
 3492              	# sieve_extend.c:272:     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped)
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 3493              		.loc 1 272 24 is_stmt 0 view .LVU961
 3494 1351 C462EBF7 		shrx	r8, rcx, rdx	# _147, pattern, tmp676
 3494      C1
 3495              	.LVL285:
 3496              	# sieve_extend.c:272:     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped)
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 3497              		.loc 1 272 53 view .LVU962
 3498 1356 C4E299F7 		shlx	rcx, rcx, r12	# _149, pattern, pattern_shift_flipped
 3498      C9
 3499              	.LVL286:
 273:sieve_extend.c **** }
 3500              		.loc 1 273 5 is_stmt 1 view .LVU963
 3501              	# sieve_extend.c:272:     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped)
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 3502              		.loc 1 272 13 is_stmt 0 view .LVU964
 3503 135b 4C09C1   		or	rcx, r8	# pattern, _147
 3504              	.LVL287:
 3505              	# sieve_extend.c:273:     bitarray[copy_word] |= pattern & chopmask(range_stop);
 273:sieve_extend.c **** }
 3506              		.loc 1 273 36 view .LVU965
 3507 135e 4C8B4424 		mov	r8, QWORD PTR 48[rsp]	# _1553, %sfp
 3507      30
 3508 1363 4921C8   		and	r8, rcx	# _1553, pattern
 3509              	# sieve_extend.c:273:     bitarray[copy_word] |= pattern & chopmask(range_stop);
 273:sieve_extend.c **** }
 3510              		.loc 1 273 25 view .LVU966
 3511 1366 4F0944CD 		or	QWORD PTR 0[r13+r9*8], r8	# *_153, tmp686
 3511      00
 3512              	.LVL288:
 273:sieve_extend.c **** }
 3513              		.loc 1 273 25 view .LVU967
 3514              	.LBE436:
 3515              	.LBE435:
 3516              	.LBE477:
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3517              		.loc 1 995 11 is_stmt 1 view .LVU968
 3518              	# sieve_extend.c:995:     for (;range_stop < block_stop;) {
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3519              		.loc 1 995 5 is_stmt 0 view .LVU969
 3520 136b 4C3B1C24 		cmp	r11, QWORD PTR [rsp]	# _66, %sfp
 3521 136f 0F8266FE 		jb	.L219	#,
 3521      FFFF
 3522              	.LVL289:
 3523              	.L410:
GAS LISTING /tmp/ccrNbbzt.s 			page 106


 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3524              		.loc 1 995 5 view .LVU970
 3525 1375 488B4424 		mov	rax, QWORD PTR 32[rsp]	# <retval>, %sfp
 3525      20
 3526 137a 4C8B6C24 		mov	r13, QWORD PTR 8[rsp]	# index, %sfp
 3526      08
 3527              	.LVL290:
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3528              		.loc 1 995 5 view .LVU971
 3529 137f 488B4008 		mov	rax, QWORD PTR 8[rax]	# prephitmp_1822, sieve_89->bits
 3530 1383 4C89F2   		mov	rdx, r14	# block$pattern_size, patternsize_bits
 3531 1386 48890424 		mov	QWORD PTR [rsp], rax	# %sfp, prephitmp_1822
 3532              	.LVL291:
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3533              		.loc 1 995 5 view .LVU972
 3534 138a 4C896C24 		mov	QWORD PTR 40[rsp], r13	# %sfp, index
 3534      28
 3535              	.LVL292:
1021:sieve_extend.c **** }
 3536              		.loc 1 1021 5 is_stmt 1 view .LVU973
 3537              	# sieve_extend.c:995:     for (;range_stop < block_stop;) {
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3538              		.loc 1 995 5 is_stmt 0 view .LVU974
 3539 138f 488B7424 		mov	rsi, QWORD PTR 16[rsp]	# block$pattern_start, %sfp
 3539      10
 3540              	.LVL293:
 995:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1);
 3541              		.loc 1 995 5 view .LVU975
 3542              	.LBE480:
 3543              	.LBE484:
1033:sieve_extend.c ****     prime = block.prime;
 3544              		.loc 1 1033 5 is_stmt 1 view .LVU976
 3545              	.LBB485:
 3546              	.LBI485:
 889:sieve_extend.c ****     if (size < WORD_SIZE_counter)   {
 3547              		.loc 1 889 20 view .LVU977
 3548              	.LBB486:
 890:sieve_extend.c ****         extendSieve_smallSize (bitarray, source_start, size, destination_stop);
 3549              		.loc 1 890 5 view .LVU978
 3550              	# sieve_extend.c:890:     if (size < WORD_SIZE_counter)   {
 890:sieve_extend.c ****         extendSieve_smallSize (bitarray, source_start, size, destination_stop);
 3551              		.loc 1 890 8 is_stmt 0 view .LVU979
 3552 1394 4883FA3F 		cmp	rdx, 63	# block$pattern_size,
 3553 1398 0F87DD02 		ja	.L220	#,
 3553      0000
 3554              	.LVL294:
 3555              	.L176:
 891:sieve_extend.c ****         return; // rapid exit for small sizes
 3556              		.loc 1 891 9 is_stmt 1 view .LVU980
 3557 139e 488B0C24 		mov	rcx, QWORD PTR [rsp]	#, %sfp
 3558 13a2 488B7C24 		mov	rdi, QWORD PTR 64[rsp]	#, %sfp
 3558      40
 3559 13a7 E844EDFF 		call	extendSieve_smallSize	#
 3559      FF
 3560              	.LVL295:
 892:sieve_extend.c ****     }
 3561              		.loc 1 892 9 view .LVU981
GAS LISTING /tmp/ccrNbbzt.s 			page 107


 3562 13ac E9F40200 		jmp	.L221	#
 3562      00
 3563              	.LVL296:
 3564              		.p2align 4,,10
 3565 13b1 0F1F8000 		.p2align 3
 3565      000000
 3566              	.L210:
 892:sieve_extend.c ****     }
 3567              		.loc 1 892 9 is_stmt 0 view .LVU982
 3568              	.LBE486:
 3569              	.LBE485:
 3570              	.LBB489:
 3571              	.LBB481:
 3572              	.LBB478:
1017:sieve_extend.c ****         block.prime = prime;
 3573              		.loc 1 1017 48 is_stmt 1 view .LVU983
 3574              	.LBB441:
 3575              	.LBI441:
 396:sieve_extend.c ****     debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using largerange (%ju occurances
 3576              		.loc 1 396 13 view .LVU984
 3577              	.LBB442:
 397:sieve_extend.c ****     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
 3578              		.loc 1 397 5 view .LVU985
 398:sieve_extend.c **** 
 3579              		.loc 1 398 5 view .LVU986
 3580              	# sieve_extend.c:398:     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * st
 398:sieve_extend.c **** 
 3581              		.loc 1 398 74 is_stmt 0 view .LVU987
 3582 13b8 4D89E2   		mov	r10, r12	# tmp715, step
 3583 13bb 49C1E206 		sal	r10, 6	# tmp715,
 3584 13bf 4901EA   		add	r10, rbp	# tmp716, index
 3585 13c2 0F82FFFD 		jc	.L192	#,
 3585      FFFF
 3586              	.LBB443:
 3587              	.LBB444:
 3588              	.LBB445:
 3589              	.LBB446:
 3590              	# sieve_extend.c:183:    const counter_t range_stop_word = wordindex(range_stop);
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 3591              		.loc 1 183 20 view .LVU988
 3592 13c8 4C89DA   		mov	rdx, r11	# range_stop_word, _66
 3593              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3594              		.loc 1 209 29 view .LVU989
 3595 13cb 4489D9   		mov	ecx, r11d	# tmp721, _66
 3596              	# sieve_extend.c:183:    const counter_t range_stop_word = wordindex(range_stop);
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 3597              		.loc 1 183 20 view .LVU990
 3598 13ce 48C1EA06 		shr	rdx, 6	# range_stop_word,
 3599              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3600              		.loc 1 209 29 view .LVU991
 3601 13d2 F7D1     		not	ecx	# tmp721
 3602 13d4 48C7C6FF 		mov	rsi, -1	# tmp1463,
 3602      FFFFFF
 3603              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 108


 3604              		.loc 1 185 84 view .LVU992
 3605 13db 4B8D3CA4 		lea	rdi, [r12+r12*4]	# tmp719,
 3606              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3607              		.loc 1 209 29 view .LVU993
 3608 13df C4E2F3F7 		shrx	rsi, rsi, rcx	# _289, tmp1463, tmp721
 3608      F6
 3609              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 3610              		.loc 1 185 107 view .LVU994
 3611 13e4 4889D1   		mov	rcx, rdx	# tmp725, range_stop_word
 3612 13e7 4829F9   		sub	rcx, rdi	# tmp725, tmp719
 3613              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3614              		.loc 1 209 29 view .LVU995
 3615 13ea 48897424 		mov	QWORD PTR 48[rsp], rsi	# %sfp, _289
 3615      30
 3616 13ef 4839FA   		cmp	rdx, rdi	# range_stop_word, tmp719
 3617 13f2 4D8D4CCD 		lea	r9, 0[r13+rcx*8]	# tmp727,
 3617      00
 3618 13f7 4D89E7   		mov	r15, r12	# _1691, step
 3619 13fa 4D0F46CD 		cmovbe	r9, r13	# _94,, prephitmp_1509
 3620              	# sieve_extend.c:191:        index_ptr+=step;
 191:sieve_extend.c ****        *index_ptr |= mask;
 3621              		.loc 1 191 17 view .LVU996
 3622 13fe 4A8D04E5 		lea	rax, 0[0+r12*8]	# _257,
 3622      00000000 
 3623              	# sieve_extend.c:202:    const register bitword_t* __restrict range_stop_ptr = &bitarray[(range_sto
 202:sieve_extend.c ****    while likely(index_ptr < range_stop_ptr) {
 3624              		.loc 1 202 41 view .LVU997
 3625 1406 4D8D44D5 		lea	r8, 0[r13+rdx*8]	# range_stop_ptr,
 3625      00
 3626 140b 48C1E703 		sal	rdi, 3	# tmp731,
 3627 140f 49C1E704 		sal	r15, 4	# _1691,
 3628              	.LVL297:
 3629              		.p2align 4,,10
 3630 1413 0F1F4400 		.p2align 3
 3630      00
 3631              	.L218:
 202:sieve_extend.c ****    while likely(index_ptr < range_stop_ptr) {
 3632              		.loc 1 202 41 view .LVU998
 3633              	.LBE446:
 3634              	.LBE445:
 403:sieve_extend.c ****         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 3635              		.loc 1 403 9 is_stmt 1 view .LVU999
 3636              	# sieve_extend.c:404:         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 404:sieve_extend.c ****     }
 3637              		.loc 1 404 9 is_stmt 0 view .LVU1000
 3638 1418 4889EA   		mov	rdx, rbp	# tmp734, index
 3639 141b 48C1EA06 		shr	rdx, 6	# tmp734,
 3640              	# sieve_extend.c:403:         register bitword_t mask = markmask(index);
 403:sieve_extend.c ****         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 3641              		.loc 1 403 28 view .LVU1001
 3642 141f BE010000 		mov	esi, 1	# tmp1466,
 3642      00
 3643              	.LBB450:
 3644              	.LBB447:
GAS LISTING /tmp/ccrNbbzt.s 			page 109


 3645              	# sieve_extend.c:184:    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(
 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 3646              		.loc 1 184 78 view .LVU1002
 3647 1424 498D54D5 		lea	rdx, 0[r13+rdx*8]	# index_ptr,
 3647      00
 3648              	.LBE447:
 3649              	.LBE450:
 3650              	# sieve_extend.c:403:         register bitword_t mask = markmask(index);
 403:sieve_extend.c ****         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 3651              		.loc 1 403 28 view .LVU1003
 3652 1429 C4E2D1F7 		shlx	rcx, rsi, rbp	# mask, tmp1466, index
 3652      CE
 3653              	.LVL298:
 404:sieve_extend.c ****     }
 3654              		.loc 1 404 9 is_stmt 1 view .LVU1004
 3655              	.LBB451:
 3656              	.LBI445:
 151:sieve_extend.c **** //#if __APPLE__
 3657              		.loc 1 151 20 view .LVU1005
 3658              	.LBB448:
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 3659              		.loc 1 183 4 view .LVU1006
 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 3660              		.loc 1 184 4 view .LVU1007
 185:sieve_extend.c **** 
 3661              		.loc 1 185 4 view .LVU1008
 189:sieve_extend.c ****        *index_ptr |= mask;
 3662              		.loc 1 189 4 view .LVU1009
 189:sieve_extend.c ****        *index_ptr |= mask;
 3663              		.loc 1 189 10 view .LVU1010
 3664 142e 4C39CA   		cmp	rdx, r9	# index_ptr, prephitmp_1509
 3665 1431 733B     		jnb	.L394	#,
 3666 1433 4A8D343A 		lea	rsi, [rdx+r15]	# ivtmp.627,
 3667 1437 660F1F84 		.p2align 4,,10
 3667      00000000 
 3667      00
 3668              		.p2align 3
 3669              	.L214:
 190:sieve_extend.c ****        index_ptr+=step;
 3670              		.loc 1 190 8 view .LVU1011
 3671              	# sieve_extend.c:190:        *index_ptr |= mask;
 190:sieve_extend.c ****        index_ptr+=step;
 3672              		.loc 1 190 19 is_stmt 0 view .LVU1012
 3673 1440 48090A   		or	QWORD PTR [rdx], rcx	# MEM[base: index_ptr_19, offset: 0B], mask
 191:sieve_extend.c ****        *index_ptr |= mask;
 3674              		.loc 1 191 8 is_stmt 1 view .LVU1013
 3675              	.LVL299:
 192:sieve_extend.c ****        index_ptr+=step;
 3676              		.loc 1 192 8 view .LVU1014
 3677              	# sieve_extend.c:192:        *index_ptr |= mask;
 192:sieve_extend.c ****        index_ptr+=step;
 3678              		.loc 1 192 19 is_stmt 0 view .LVU1015
 3679 1443 48090C02 		or	QWORD PTR [rdx+rax], rcx	# MEM[base: index_ptr_19, index: _257, offset: 0B], mask
 193:sieve_extend.c ****        *index_ptr |= mask;
 3680              		.loc 1 193 8 is_stmt 1 view .LVU1016
 3681              	.LVL300:
 194:sieve_extend.c ****        index_ptr+=step;
GAS LISTING /tmp/ccrNbbzt.s 			page 110


 3682              		.loc 1 194 8 view .LVU1017
 3683              	# sieve_extend.c:194:        *index_ptr |= mask;
 194:sieve_extend.c ****        index_ptr+=step;
 3684              		.loc 1 194 19 is_stmt 0 view .LVU1018
 3685 1447 48090E   		or	QWORD PTR [rsi], rcx	# MEM[base: _1685, offset: 0B], mask
 195:sieve_extend.c ****        *index_ptr |= mask;
 3686              		.loc 1 195 8 is_stmt 1 view .LVU1019
 3687              	.LVL301:
 196:sieve_extend.c ****        index_ptr+=step;
 3688              		.loc 1 196 8 view .LVU1020
 3689              	# sieve_extend.c:196:        *index_ptr |= mask;
 196:sieve_extend.c ****        index_ptr+=step;
 3690              		.loc 1 196 19 is_stmt 0 view .LVU1021
 3691 144a 48090C06 		or	QWORD PTR [rsi+rax], rcx	# MEM[base: _1685, index: _257, offset: 0B], mask
 197:sieve_extend.c ****        *index_ptr |= mask;
 3692              		.loc 1 197 8 is_stmt 1 view .LVU1022
 3693              	.LVL302:
 198:sieve_extend.c ****        index_ptr+=step;
 3694              		.loc 1 198 8 view .LVU1023
 3695 144e 4801FE   		add	rsi, rdi	# ivtmp.627, tmp731
 3696              	# sieve_extend.c:198:        *index_ptr |= mask;
 198:sieve_extend.c ****        index_ptr+=step;
 3697              		.loc 1 198 19 is_stmt 0 view .LVU1024
 3698 1451 48090C82 		or	QWORD PTR [rdx+rax*4], rcx	# MEM[base: index_ptr_19, index: _257, step: 4, offset: 0B], mask
 199:sieve_extend.c ****    }
 3699              		.loc 1 199 8 is_stmt 1 view .LVU1025
 3700 1455 4801FA   		add	rdx, rdi	# index_ptr, tmp731
 3701              	.LVL303:
 189:sieve_extend.c ****        *index_ptr |= mask;
 3702              		.loc 1 189 10 view .LVU1026
 3703 1458 4939D1   		cmp	r9, rdx	# prephitmp_1509, index_ptr
 3704 145b 77E3     		ja	.L214	#,
 203:sieve_extend.c ****        *index_ptr |= mask;
 3705              		.loc 1 203 10 view .LVU1027
 3706 145d 4939D0   		cmp	r8, rdx	# range_stop_ptr, index_ptr
 3707 1460 7611     		jbe	.L415	#,
 3708              		.p2align 4,,10
 3709 1462 660F1F44 		.p2align 3
 3709      0000
 3710              	.L216:
 204:sieve_extend.c ****        index_ptr+=step;
 3711              		.loc 1 204 8 view .LVU1028
 3712              	# sieve_extend.c:204:        *index_ptr |= mask;
 204:sieve_extend.c ****        index_ptr+=step;
 3713              		.loc 1 204 19 is_stmt 0 view .LVU1029
 3714 1468 48090A   		or	QWORD PTR [rdx], rcx	# MEM[base: index_ptr_1016, offset: 0B], mask
 205:sieve_extend.c ****    }
 3715              		.loc 1 205 8 is_stmt 1 view .LVU1030
 3716              	# sieve_extend.c:205:        index_ptr+=step;
 205:sieve_extend.c ****    }
 3717              		.loc 1 205 17 is_stmt 0 view .LVU1031
 3718 146b 4801C2   		add	rdx, rax	# index_ptr, _257
 3719              	.LVL304:
 3720              	.L394:
 203:sieve_extend.c ****        *index_ptr |= mask;
 3721              		.loc 1 203 10 is_stmt 1 view .LVU1032
 3722 146e 4939D0   		cmp	r8, rdx	# range_stop_ptr, index_ptr
GAS LISTING /tmp/ccrNbbzt.s 			page 111


 3723 1471 77F5     		ja	.L216	#,
 3724              	.L415:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 3725              		.loc 1 208 4 view .LVU1033
 3726              	# sieve_extend.c:208:    if (index_ptr == range_stop_ptr) { // index_ptr could also end above range
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 3727              		.loc 1 208 7 is_stmt 0 view .LVU1034
 3728 1473 4939D0   		cmp	r8, rdx	# range_stop_ptr, index_ptr
 3729 1476 7410     		je	.L416	#,
 3730              	.LVL305:
 3731              	.L217:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 3732              		.loc 1 208 7 view .LVU1035
 3733              	.LBE448:
 3734              	.LBE451:
 3735              	.LBE444:
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 3736              		.loc 1 402 78 is_stmt 1 view .LVU1036
 3737              	# sieve_extend.c:402:     for (register counter_t index = range_start; index <= range_stop_unique; 
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 3738              		.loc 1 402 84 is_stmt 0 view .LVU1037
 3739 1478 4C01E5   		add	rbp, r12	# index, step
 3740              	.LVL306:
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 3741              		.loc 1 402 50 is_stmt 1 view .LVU1038
 3742              	# sieve_extend.c:402:     for (register counter_t index = range_start; index <= range_stop_unique; 
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 3743              		.loc 1 402 5 is_stmt 0 view .LVU1039
 3744 147b 4939EA   		cmp	r10, rbp	# tmp716, index
 3745 147e 7398     		jnb	.L218	#,
 3746 1480 E942FDFF 		jmp	.L192	#
 3746      FF
 3747              	.LVL307:
 3748              		.p2align 4,,10
 3749 1485 0F1F00   		.p2align 3
 3750              	.L416:
 3751              	.LBB453:
 3752              	.LBB452:
 3753              	.LBB449:
 209:sieve_extend.c ****    }
 3754              		.loc 1 209 7 is_stmt 1 view .LVU1040
 3755              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3756              		.loc 1 209 27 is_stmt 0 view .LVU1041
 3757 1488 48234C24 		and	rcx, QWORD PTR 48[rsp]	# tmp736, %sfp
 3757      30
 3758              	.LVL308:
 3759              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3760              		.loc 1 209 18 view .LVU1042
 3761 148d 490908   		or	QWORD PTR [r8], rcx	# *index_ptr_1070, tmp736
 3762 1490 EBE6     		jmp	.L217	#
 3763              	.LVL309:
 3764              		.p2align 4,,10
 3765 1492 660F1F44 		.p2align 3
 3765      0000
 3766              	.L409:
GAS LISTING /tmp/ccrNbbzt.s 			page 112


 209:sieve_extend.c ****    }
 3767              		.loc 1 209 18 view .LVU1043
 3768              	.LBE449:
 3769              	.LBE452:
 3770              	.LBE453:
 3771              	.LBE443:
 3772              	.LBE442:
 3773              	.LBE441:
1015:sieve_extend.c ****         else if (step < WORD_SIZE_counter * 4) setBitsTrue_largeRange_vector(bitarray, start, step,
 3774              		.loc 1 1015 48 is_stmt 1 view .LVU1044
 3775              	.LBB454:
 3776              	.LBI454:
 280:sieve_extend.c ****     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
 3777              		.loc 1 280 20 view .LVU1045
 3778              	.LBB455:
 281:sieve_extend.c **** 
 3779              		.loc 1 281 5 view .LVU1046
 3780              	# sieve_extend.c:281:     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * st
 281:sieve_extend.c **** 
 3781              		.loc 1 281 74 is_stmt 0 view .LVU1047
 3782 1498 4D89E7   		mov	r15, r12	# tmp687, step
 3783 149b 49C1E706 		sal	r15, 6	# tmp687,
 3784 149f 31C0     		xor	eax, eax	# _261
 3785 14a1 4901EF   		add	r15, rbp	# tmp688, index
 3786 14a4 0F92C0   		setc	al	#, _261
 3787              	.LVL310:
 283:sieve_extend.c ****         debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-unique (%ju
 3788              		.loc 1 283 5 is_stmt 1 view .LVU1048
 3789              	# sieve_extend.c:283:     if (range_stop_unique > range_stop) { // the range will not repeat itself
 283:sieve_extend.c ****         debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-unique (%ju
 3790              		.loc 1 283 8 is_stmt 0 view .LVU1049
 3791 14a7 4D39FB   		cmp	r11, r15	# _66, tmp688
 3792 14aa 0F820001 		jb	.L198	#,
 3792      0000
 3793              	.LVL311:
 3794              	.LBB456:
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 3795              		.loc 1 304 54 is_stmt 1 view .LVU1050
 3796              	# sieve_extend.c:304:         for (register counter_t index = range_start; index <= range_stop_uniq
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 3797              		.loc 1 304 9 is_stmt 0 view .LVU1051
 3798 14b0 4885C0   		test	rax, rax	# _261
 3799 14b3 0F850EFD 		jne	.L192	#,
 3799      FFFF
 3800              	.LBB457:
 3801              	.LBB458:
 3802              	.LBB459:
 3803              	# sieve_extend.c:183:    const counter_t range_stop_word = wordindex(range_stop);
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 3804              		.loc 1 183 20 view .LVU1052
 3805 14b9 4C89D8   		mov	rax, r11	# range_stop_word, _66
 3806              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3807              		.loc 1 209 29 view .LVU1053
 3808 14bc 4489DA   		mov	edx, r11d	# tmp698, _66
 3809              	# sieve_extend.c:183:    const counter_t range_stop_word = wordindex(range_stop);
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
GAS LISTING /tmp/ccrNbbzt.s 			page 113


 3810              		.loc 1 183 20 view .LVU1054
 3811 14bf 48C1E806 		shr	rax, 6	# range_stop_word,
 3812              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3813              		.loc 1 209 29 view .LVU1055
 3814 14c3 F7D2     		not	edx	# tmp698
 3815 14c5 48C7C6FF 		mov	rsi, -1	# tmp1453,
 3815      FFFFFF
 3816              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 3817              		.loc 1 185 84 view .LVU1056
 3818 14cc 4B8D3CA4 		lea	rdi, [r12+r12*4]	# tmp696,
 3819              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3820              		.loc 1 209 29 view .LVU1057
 3821 14d0 C4E2EBF7 		shrx	rsi, rsi, rdx	# _234, tmp1453, tmp698
 3821      F6
 3822              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 3823              		.loc 1 185 107 view .LVU1058
 3824 14d5 4889C2   		mov	rdx, rax	# tmp702, range_stop_word
 3825 14d8 4829FA   		sub	rdx, rdi	# tmp702, tmp696
 3826              	# sieve_extend.c:202:    const register bitword_t* __restrict range_stop_ptr = &bitarray[(range_sto
 202:sieve_extend.c ****    while likely(index_ptr < range_stop_ptr) {
 3827              		.loc 1 202 41 view .LVU1059
 3828 14db 4D8D44C5 		lea	r8, 0[r13+rax*8]	# range_stop_ptr,
 3828      00
 3829 14e0 4839F8   		cmp	rax, rdi	# range_stop_word, tmp696
 3830 14e3 4D8D4CD5 		lea	r9, 0[r13+rdx*8]	# tmp704,
 3830      00
 3831 14e8 4C89E0   		mov	rax, r12	# _1706, step
 3832              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3833              		.loc 1 209 29 view .LVU1060
 3834 14eb 48897424 		mov	QWORD PTR 48[rsp], rsi	# %sfp, _234
 3834      30
 3835 14f0 4D0F46CD 		cmovbe	r9, r13	# _94,, prephitmp_1527
 3836 14f4 48C1E004 		sal	rax, 4	# _1706,
 3837              	.LBE459:
 3838              	.LBE458:
 3839              	# sieve_extend.c:309:                 mask |= markmask(index);
 309:sieve_extend.c ****                 index += step;
 3840              		.loc 1 309 25 view .LVU1061
 3841 14f8 48895C24 		mov	QWORD PTR 72[rsp], rbx	# %sfp, index
 3841      48
 3842              	.LBB463:
 3843              	.LBB460:
 3844              	# sieve_extend.c:191:        index_ptr+=step;
 191:sieve_extend.c ****        *index_ptr |= mask;
 3845              		.loc 1 191 17 view .LVU1062
 3846 14fd 4A8D0CE5 		lea	rcx, 0[0+r12*8]	# _202,
 3846      00000000 
 3847 1505 48C1E703 		sal	rdi, 3	# tmp708,
 3848              	.LBE460:
 3849              	.LBE463:
 3850              	# sieve_extend.c:309:                 mask |= markmask(index);
 309:sieve_extend.c ****                 index += step;
GAS LISTING /tmp/ccrNbbzt.s 			page 114


 3851              		.loc 1 309 25 view .LVU1063
 3852 1509 41BA0100 		mov	r10d, 1	# tmp711,
 3852      0000
 3853 150f 4889C3   		mov	rbx, rax	# _1706, _1706
 3854              	.LVL312:
 3855              		.p2align 4,,10
 3856 1512 660F1F44 		.p2align 3
 3856      0000
 3857              	.L209:
 305:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 3858              		.loc 1 305 13 is_stmt 1 view .LVU1064
 3859              	# sieve_extend.c:305:             register counter_t index_word = wordindex(index);
 305:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 3860              		.loc 1 305 32 is_stmt 0 view .LVU1065
 3861 1518 4889EE   		mov	rsi, rbp	# index_word, index
 3862 151b 48C1EE06 		shr	rsi, 6	# index_word,
 3863              	.LVL313:
 306:sieve_extend.c ****             #pragma ivdep
 3864              		.loc 1 306 13 is_stmt 1 view .LVU1066
 3865              	# sieve_extend.c:306:             register bitword_t mask = SAFE_ZERO;
 306:sieve_extend.c ****             #pragma ivdep
 3866              		.loc 1 306 32 is_stmt 0 view .LVU1067
 3867 151f 31D2     		xor	edx, edx	# mask
 3868              	.LVL314:
 3869              		.p2align 4,,10
 3870 1521 0F1F8000 		.p2align 3
 3870      000000
 3871              	.L203:
 308:sieve_extend.c ****                 mask |= markmask(index);
 3872              		.loc 1 308 13 is_stmt 1 view .LVU1068
 309:sieve_extend.c ****                 index += step;
 3873              		.loc 1 309 17 view .LVU1069
 3874              	# sieve_extend.c:309:                 mask |= markmask(index);
 309:sieve_extend.c ****                 index += step;
 3875              		.loc 1 309 25 is_stmt 0 view .LVU1070
 3876 1528 C4C2D1F7 		shlx	rax, r10, rbp	# tmp710, tmp711, index
 3876      C2
 3877              	# sieve_extend.c:310:                 index += step;
 310:sieve_extend.c ****             } while (index_word == wordindex(index));
 3878              		.loc 1 310 23 view .LVU1071
 3879 152d 4C01E5   		add	rbp, r12	# index, step
 3880              	.LVL315:
 3881              	# sieve_extend.c:309:                 mask |= markmask(index);
 309:sieve_extend.c ****                 index += step;
 3882              		.loc 1 309 22 view .LVU1072
 3883 1530 4809C2   		or	rdx, rax	# mask, tmp710
 3884              	.LVL316:
 310:sieve_extend.c ****             } while (index_word == wordindex(index));
 3885              		.loc 1 310 17 is_stmt 1 view .LVU1073
 311:sieve_extend.c ****             // #pragma ivdep
 3886              		.loc 1 311 21 view .LVU1074
 3887              	# sieve_extend.c:311:             } while (index_word == wordindex(index));
 311:sieve_extend.c ****             // #pragma ivdep
 3888              		.loc 1 311 36 is_stmt 0 view .LVU1075
 3889 1533 4889E8   		mov	rax, rbp	# tmp712, index
 3890 1536 48C1E806 		shr	rax, 6	# tmp712,
 3891              	# sieve_extend.c:311:             } while (index_word == wordindex(index));
GAS LISTING /tmp/ccrNbbzt.s 			page 115


 311:sieve_extend.c ****             // #pragma ivdep
 3892              		.loc 1 311 13 view .LVU1076
 3893 153a 4839C6   		cmp	rsi, rax	# index_word, tmp712
 3894 153d 74E9     		je	.L203	#,
 315:sieve_extend.c ****         }
 3895              		.loc 1 315 13 is_stmt 1 view .LVU1077
 3896              	.LVL317:
 3897              	.LBB464:
 3898              	.LBI458:
 151:sieve_extend.c **** //#if __APPLE__
 3899              		.loc 1 151 20 view .LVU1078
 3900              	.LBB461:
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 3901              		.loc 1 183 4 view .LVU1079
 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 3902              		.loc 1 184 4 view .LVU1080
 3903              	# sieve_extend.c:184:    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(
 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 3904              		.loc 1 184 78 is_stmt 0 view .LVU1081
 3905 153f 498D44F5 		lea	rax, 0[r13+rsi*8]	# index_ptr,
 3905      00
 3906              	.LVL318:
 185:sieve_extend.c **** 
 3907              		.loc 1 185 4 is_stmt 1 view .LVU1082
 189:sieve_extend.c ****        *index_ptr |= mask;
 3908              		.loc 1 189 4 view .LVU1083
 189:sieve_extend.c ****        *index_ptr |= mask;
 3909              		.loc 1 189 10 view .LVU1084
 3910 1544 4C39C8   		cmp	rax, r9	# index_ptr, prephitmp_1527
 3911 1547 7335     		jnb	.L393	#,
 3912 1549 488D3418 		lea	rsi, [rax+rbx]	# ivtmp.605,
 3913              	.LVL319:
 3914 154d 0F1F00   		.p2align 4,,10
 3915              		.p2align 3
 3916              	.L205:
 190:sieve_extend.c ****        index_ptr+=step;
 3917              		.loc 1 190 8 view .LVU1085
 3918              	# sieve_extend.c:190:        *index_ptr |= mask;
 190:sieve_extend.c ****        index_ptr+=step;
 3919              		.loc 1 190 19 is_stmt 0 view .LVU1086
 3920 1550 480910   		or	QWORD PTR [rax], rdx	# MEM[base: index_ptr_1000, offset: 0B], mask
 191:sieve_extend.c ****        *index_ptr |= mask;
 3921              		.loc 1 191 8 is_stmt 1 view .LVU1087
 3922              	.LVL320:
 192:sieve_extend.c ****        index_ptr+=step;
 3923              		.loc 1 192 8 view .LVU1088
 3924              	# sieve_extend.c:192:        *index_ptr |= mask;
 192:sieve_extend.c ****        index_ptr+=step;
 3925              		.loc 1 192 19 is_stmt 0 view .LVU1089
 3926 1553 48091408 		or	QWORD PTR [rax+rcx], rdx	# MEM[base: index_ptr_1000, index: _202, offset: 0B], mask
 193:sieve_extend.c ****        *index_ptr |= mask;
 3927              		.loc 1 193 8 is_stmt 1 view .LVU1090
 3928              	.LVL321:
 194:sieve_extend.c ****        index_ptr+=step;
 3929              		.loc 1 194 8 view .LVU1091
 3930              	# sieve_extend.c:194:        *index_ptr |= mask;
 194:sieve_extend.c ****        index_ptr+=step;
GAS LISTING /tmp/ccrNbbzt.s 			page 116


 3931              		.loc 1 194 19 is_stmt 0 view .LVU1092
 3932 1557 480916   		or	QWORD PTR [rsi], rdx	# MEM[base: _1700, offset: 0B], mask
 195:sieve_extend.c ****        *index_ptr |= mask;
 3933              		.loc 1 195 8 is_stmt 1 view .LVU1093
 3934              	.LVL322:
 196:sieve_extend.c ****        index_ptr+=step;
 3935              		.loc 1 196 8 view .LVU1094
 3936              	# sieve_extend.c:196:        *index_ptr |= mask;
 196:sieve_extend.c ****        index_ptr+=step;
 3937              		.loc 1 196 19 is_stmt 0 view .LVU1095
 3938 155a 4809140E 		or	QWORD PTR [rsi+rcx], rdx	# MEM[base: _1700, index: _202, offset: 0B], mask
 197:sieve_extend.c ****        *index_ptr |= mask;
 3939              		.loc 1 197 8 is_stmt 1 view .LVU1096
 3940              	.LVL323:
 198:sieve_extend.c ****        index_ptr+=step;
 3941              		.loc 1 198 8 view .LVU1097
 3942 155e 4801FE   		add	rsi, rdi	# ivtmp.605, tmp708
 3943              	# sieve_extend.c:198:        *index_ptr |= mask;
 198:sieve_extend.c ****        index_ptr+=step;
 3944              		.loc 1 198 19 is_stmt 0 view .LVU1098
 3945 1561 48091488 		or	QWORD PTR [rax+rcx*4], rdx	# MEM[base: index_ptr_1000, index: _202, step: 4, offset: 0B], mask
 199:sieve_extend.c ****    }
 3946              		.loc 1 199 8 is_stmt 1 view .LVU1099
 3947 1565 4801F8   		add	rax, rdi	# index_ptr, tmp708
 3948              	.LVL324:
 189:sieve_extend.c ****        *index_ptr |= mask;
 3949              		.loc 1 189 10 view .LVU1100
 3950 1568 4939C1   		cmp	r9, rax	# prephitmp_1527, index_ptr
 3951 156b 77E3     		ja	.L205	#,
 203:sieve_extend.c ****        *index_ptr |= mask;
 3952              		.loc 1 203 10 view .LVU1101
 3953 156d 4939C0   		cmp	r8, rax	# range_stop_ptr, index_ptr
 3954 1570 7611     		jbe	.L417	#,
 3955              		.p2align 4,,10
 3956 1572 660F1F44 		.p2align 3
 3956      0000
 3957              	.L207:
 204:sieve_extend.c ****        index_ptr+=step;
 3958              		.loc 1 204 8 view .LVU1102
 3959              	# sieve_extend.c:204:        *index_ptr |= mask;
 204:sieve_extend.c ****        index_ptr+=step;
 3960              		.loc 1 204 19 is_stmt 0 view .LVU1103
 3961 1578 480910   		or	QWORD PTR [rax], rdx	# MEM[base: index_ptr_1001, offset: 0B], mask
 205:sieve_extend.c ****    }
 3962              		.loc 1 205 8 is_stmt 1 view .LVU1104
 3963              	# sieve_extend.c:205:        index_ptr+=step;
 205:sieve_extend.c ****    }
 3964              		.loc 1 205 17 is_stmt 0 view .LVU1105
 3965 157b 4801C8   		add	rax, rcx	# index_ptr, _202
 3966              	.LVL325:
 3967              	.L393:
 203:sieve_extend.c ****        *index_ptr |= mask;
 3968              		.loc 1 203 10 is_stmt 1 view .LVU1106
 3969 157e 4939C0   		cmp	r8, rax	# range_stop_ptr, index_ptr
 3970 1581 77F5     		ja	.L207	#,
 3971              	.L417:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
GAS LISTING /tmp/ccrNbbzt.s 			page 117


 3972              		.loc 1 208 4 view .LVU1107
 3973              	# sieve_extend.c:208:    if (index_ptr == range_stop_ptr) { // index_ptr could also end above range
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 3974              		.loc 1 208 7 is_stmt 0 view .LVU1108
 3975 1583 4C39C0   		cmp	rax, r8	# index_ptr, range_stop_ptr
 3976 1586 7418     		je	.L418	#,
 3977              	.LVL326:
 3978              	.L208:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 3979              		.loc 1 208 7 view .LVU1109
 3980              	.LBE461:
 3981              	.LBE464:
 3982              	.LBE457:
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 3983              		.loc 1 304 54 is_stmt 1 view .LVU1110
 3984              	# sieve_extend.c:304:         for (register counter_t index = range_start; index <= range_stop_uniq
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 3985              		.loc 1 304 9 is_stmt 0 view .LVU1111
 3986 1588 4939EF   		cmp	r15, rbp	# tmp688, index
 3987 158b 738B     		jnb	.L209	#,
 3988 158d 488B5C24 		mov	rbx, QWORD PTR 72[rsp]	# index, %sfp
 3988      48
 3989 1592 E930FCFF 		jmp	.L192	#
 3989      FF
 3990              	.LVL327:
 3991 1597 660F1F84 		.p2align 4,,10
 3991      00000000 
 3991      00
 3992              		.p2align 3
 3993              	.L418:
 3994              	.LBB466:
 3995              	.LBB465:
 3996              	.LBB462:
 209:sieve_extend.c ****    }
 3997              		.loc 1 209 7 is_stmt 1 view .LVU1112
 3998              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 3999              		.loc 1 209 27 is_stmt 0 view .LVU1113
 4000 15a0 48235424 		and	rdx, QWORD PTR 48[rsp]	# tmp714, %sfp
 4000      30
 4001              	.LVL328:
 4002              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 4003              		.loc 1 209 18 view .LVU1114
 4004 15a5 490910   		or	QWORD PTR [r8], rdx	# MEM[(uint64_t *)range_stop_ptr_220], tmp714
 4005 15a8 EBDE     		jmp	.L208	#
 4006              	.LVL329:
 4007 15aa 660F1F44 		.p2align 4,,10
 4007      0000
 4008              		.p2align 3
 4009              	.L198:
 209:sieve_extend.c ****    }
 4010              		.loc 1 209 18 view .LVU1115
 4011              	.LBE462:
 4012              	.LBE465:
 4013              	.LBE466:
 4014              	.LBE456:
GAS LISTING /tmp/ccrNbbzt.s 			page 118


 4015              	.LBB467:
 4016              	.LBB468:
 4017              	.LBB469:
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4018              		.loc 1 287 54 is_stmt 1 view .LVU1116
 4019              	# sieve_extend.c:287:         for (register counter_t index = range_start; index <= range_stop;) {
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4020              		.loc 1 287 9 is_stmt 0 view .LVU1117
 4021 15b0 4939EB   		cmp	r11, rbp	# _66, index
 4022 15b3 0F820EFC 		jb	.L192	#,
 4022      FFFF
 4023              	.LBB470:
 4024              	# sieve_extend.c:292:                 mask |= markmask(index);
 292:sieve_extend.c ****                 index += step;
 4025              		.loc 1 292 25 view .LVU1118
 4026 15b9 BE010000 		mov	esi, 1	# tmp691,
 4026      00
 4027              	.LVL330:
 4028 15be 6690     		.p2align 4,,10
 4029              		.p2align 3
 4030              	.L202:
 288:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 4031              		.loc 1 288 13 is_stmt 1 view .LVU1119
 4032              	# sieve_extend.c:288:             register counter_t index_word = wordindex(index);
 288:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 4033              		.loc 1 288 32 is_stmt 0 view .LVU1120
 4034 15c0 4889E9   		mov	rcx, rbp	# index_word, index
 4035 15c3 48C1E906 		shr	rcx, 6	# index_word,
 4036              	.LVL331:
 289:sieve_extend.c ****             #pragma ivdep
 4037              		.loc 1 289 13 is_stmt 1 view .LVU1121
 4038              	# sieve_extend.c:289:             register bitword_t mask = SAFE_ZERO;
 289:sieve_extend.c ****             #pragma ivdep
 4039              		.loc 1 289 32 is_stmt 0 view .LVU1122
 4040 15c7 31C0     		xor	eax, eax	# mask
 4041              	.LVL332:
 4042 15c9 0F1F8000 		.p2align 4,,10
 4042      000000
 4043              		.p2align 3
 4044              	.L201:
 291:sieve_extend.c ****                 mask |= markmask(index);
 4045              		.loc 1 291 13 is_stmt 1 view .LVU1123
 292:sieve_extend.c ****                 index += step;
 4046              		.loc 1 292 17 view .LVU1124
 4047              	# sieve_extend.c:292:                 mask |= markmask(index);
 292:sieve_extend.c ****                 index += step;
 4048              		.loc 1 292 25 is_stmt 0 view .LVU1125
 4049 15d0 C4E2D1F7 		shlx	rdx, rsi, rbp	# tmp690, tmp691, index
 4049      D6
 4050              	# sieve_extend.c:293:                 index += step;
 293:sieve_extend.c ****             } while (index_word == wordindex(index));
 4051              		.loc 1 293 23 view .LVU1126
 4052 15d5 4C01E5   		add	rbp, r12	# index, step
 4053              	.LVL333:
 4054              	# sieve_extend.c:292:                 mask |= markmask(index);
 292:sieve_extend.c ****                 index += step;
 4055              		.loc 1 292 22 view .LVU1127
GAS LISTING /tmp/ccrNbbzt.s 			page 119


 4056 15d8 4809D0   		or	rax, rdx	# mask, tmp690
 4057              	.LVL334:
 293:sieve_extend.c ****             } while (index_word == wordindex(index));
 4058              		.loc 1 293 17 is_stmt 1 view .LVU1128
 294:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 4059              		.loc 1 294 21 view .LVU1129
 4060              	# sieve_extend.c:294:             } while (index_word == wordindex(index));
 294:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 4061              		.loc 1 294 36 is_stmt 0 view .LVU1130
 4062 15db 4889EA   		mov	rdx, rbp	# tmp692, index
 4063 15de 48C1EA06 		shr	rdx, 6	# tmp692,
 4064              	# sieve_extend.c:294:             } while (index_word == wordindex(index));
 294:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 4065              		.loc 1 294 13 view .LVU1131
 4066 15e2 4839D1   		cmp	rcx, rdx	# index_word, tmp692
 4067 15e5 74E9     		je	.L201	#,
 297:sieve_extend.c ****         }
 4068              		.loc 1 297 13 is_stmt 1 view .LVU1132
 4069              	# sieve_extend.c:297:             bitarray[index_word] |= mask;
 297:sieve_extend.c ****         }
 4070              		.loc 1 297 34 is_stmt 0 view .LVU1133
 4071 15e7 490944CD 		or	QWORD PTR 0[r13+rcx*8], rax	# *_185, mask
 4071      00
 297:sieve_extend.c ****         }
 4072              		.loc 1 297 34 view .LVU1134
 4073              	.LBE470:
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4074              		.loc 1 287 54 is_stmt 1 view .LVU1135
 4075              	# sieve_extend.c:287:         for (register counter_t index = range_start; index <= range_stop;) {
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4076              		.loc 1 287 9 is_stmt 0 view .LVU1136
 4077 15ec 4939EB   		cmp	r11, rbp	# _66, index
 4078 15ef 73CF     		jnb	.L202	#,
 4079 15f1 E9D1FBFF 		jmp	.L192	#
 4079      FF
 4080              	.LVL335:
 4081 15f6 662E0F1F 		.p2align 4,,10
 4081      84000000 
 4081      0000
 4082              		.p2align 3
 4083              	.L187:
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4084              		.loc 1 287 9 view .LVU1137
 4085              	.LBE469:
 4086              	.LBE468:
 4087              	.LBE467:
 4088              	.LBE455:
 4089              	.LBE454:
 4090              	.LBB471:
 4091              	.LBB433:
 901:sieve_extend.c **** }
 4092              		.loc 1 901 37 is_stmt 1 view .LVU1138
 4093 1600 E86BF0FF 		call	extendSieve_aligned	#
 4093      FF
 4094              	.LVL336:
 901:sieve_extend.c **** }
 4095              		.loc 1 901 37 is_stmt 0 view .LVU1139
GAS LISTING /tmp/ccrNbbzt.s 			page 120


 4096 1605 4C897424 		mov	QWORD PTR 24[rsp], r14	# %sfp, patternsize_bits
 4096      18
 4097 160a 4C8B5C24 		mov	r11, QWORD PTR 48[rsp]	# _66, %sfp
 4097      30
 4098 160f E971FBFF 		jmp	.L184	#
 4098      FF
 4099              	.LVL337:
 4100              		.p2align 4,,10
 4101 1614 0F1F4000 		.p2align 3
 4102              	.L413:
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 4103              		.loc 1 899 37 is_stmt 1 view .LVU1140
 4104 1618 E833F2FF 		call	extendSieve_shiftleft	#
 4104      FF
 4105              	.LVL338:
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 4106              		.loc 1 899 37 is_stmt 0 view .LVU1141
 4107 161d 4C897424 		mov	QWORD PTR 24[rsp], r14	# %sfp, patternsize_bits
 4107      18
 4108 1622 4C8B5C24 		mov	r11, QWORD PTR 48[rsp]	# _66, %sfp
 4108      30
 4109 1627 E959FBFF 		jmp	.L184	#
 4109      FF
 4110              	.LVL339:
 4111              	.L412:
 891:sieve_extend.c ****         return; // rapid exit for small sizes
 4112              		.loc 1 891 9 is_stmt 1 view .LVU1142
 4113 162c 4C89D9   		mov	rcx, r11	#, _66
 4114 162f 4C89F2   		mov	rdx, r14	#, patternsize_bits
 4115 1632 4C89F6   		mov	rsi, r14	#, patternsize_bits
 4116 1635 4C89EF   		mov	rdi, r13	#, _94
 4117 1638 4C895C24 		mov	QWORD PTR 48[rsp], r11	# %sfp, _66
 4117      30
 4118 163d E8AEEAFF 		call	extendSieve_smallSize	#
 4118      FF
 4119              	.LVL340:
 892:sieve_extend.c ****     }
 4120              		.loc 1 892 9 view .LVU1143
 4121 1642 4C897424 		mov	QWORD PTR 24[rsp], r14	# %sfp, patternsize_bits
 4121      18
 4122 1647 4C8B5C24 		mov	r11, QWORD PTR 48[rsp]	# _66, %sfp
 4122      30
 4123 164c E934FBFF 		jmp	.L184	#
 4123      FF
 4124              	.LVL341:
 4125              	.L414:
 892:sieve_extend.c ****     }
 4126              		.loc 1 892 9 is_stmt 0 view .LVU1144
 4127              	.LBE433:
 4128              	.LBE471:
 4129              	.LBB472:
 4130              	.LBB439:
 253:sieve_extend.c ****        return;
 4131              		.loc 1 253 8 is_stmt 1 view .LVU1145
 4132              	# sieve_extend.c:253:        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(
 253:sieve_extend.c ****        return;
 4133              		.loc 1 253 67 is_stmt 0 view .LVU1146
GAS LISTING /tmp/ccrNbbzt.s 			page 121


 4134 1651 4C21FF   		and	rdi, r15	# tmp667,
 4135              	# sieve_extend.c:253:        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(
 253:sieve_extend.c ****        return;
 4136              		.loc 1 253 28 view .LVU1147
 4137 1654 4809F8   		or	rax, rdi	# tmp668, tmp667
 4138 1657 488902   		mov	QWORD PTR [rdx], rax	# MEM[(uint64_t *)_1546], tmp668
 254:sieve_extend.c ****     }
 4139              		.loc 1 254 8 is_stmt 1 view .LVU1148
 4140 165a E968FBFF 		jmp	.L192	#
 4140      FF
 4141              	.LVL342:
 4142              	.L405:
 254:sieve_extend.c ****     }
 4143              		.loc 1 254 8 is_stmt 0 view .LVU1149
 4144 165f 488B4424 		mov	rax, QWORD PTR 32[rsp]	# <retval>, %sfp
 4144      20
 4145 1664 48894C24 		mov	QWORD PTR 40[rsp], rcx	# %sfp, prime
 4145      28
 4146 1669 488B4008 		mov	rax, QWORD PTR 8[rax]	# prephitmp_1822, sieve_89->bits
 4147 166d 48890424 		mov	QWORD PTR [rsp], rax	# %sfp, prephitmp_1822
 4148              	.LVL343:
 4149              	.L183:
 254:sieve_extend.c ****     }
 4150              		.loc 1 254 8 view .LVU1150
 4151              	.LBE439:
 4152              	.LBE472:
 4153              	.LBE478:
 4154              	.LBE481:
 4155              	.LBE489:
1033:sieve_extend.c ****     prime = block.prime;
 4156              		.loc 1 1033 5 is_stmt 1 view .LVU1151
 4157              	.LBB490:
 889:sieve_extend.c ****     if (size < WORD_SIZE_counter)   {
 4158              		.loc 1 889 20 view .LVU1152
 4159              	.LBB487:
 890:sieve_extend.c ****         extendSieve_smallSize (bitarray, source_start, size, destination_stop);
 4160              		.loc 1 890 5 view .LVU1153
 4161              	# sieve_extend.c:890:     if (size < WORD_SIZE_counter)   {
 890:sieve_extend.c ****         extendSieve_smallSize (bitarray, source_start, size, destination_stop);
 4162              		.loc 1 890 8 is_stmt 0 view .LVU1154
 4163 1671 4883FA3F 		cmp	rdx, 63	# block$pattern_size,
 4164 1675 0F8623FD 		jbe	.L176	#,
 4164      FFFF
 4165              	.LVL344:
 4166              	.L220:
 895:sieve_extend.c ****     const bitshift_t copy_bit   = bitindex_calc(copy_start);
 4167              		.loc 1 895 5 is_stmt 1 view .LVU1155
 896:sieve_extend.c ****     const bitshift_t source_bit = bitindex_calc(source_start);
 4168              		.loc 1 896 5 view .LVU1156
 4169              	# sieve_extend.c:895:     const counter_t copy_start  = source_start + size;
 895:sieve_extend.c ****     const bitshift_t copy_bit   = bitindex_calc(copy_start);
 4170              		.loc 1 895 21 is_stmt 0 view .LVU1157
 4171 167b 488D0416 		lea	rax, [rsi+rdx]	# copy_start,
 4172              	.LVL345:
 4173              	# sieve_extend.c:897:     const bitshift_t source_bit = bitindex_calc(source_start);
 897:sieve_extend.c **** 
 4174              		.loc 1 897 22 view .LVU1158
GAS LISTING /tmp/ccrNbbzt.s 			page 122


 4175 167f 4889F1   		mov	rcx, rsi	# source_bit, block$pattern_start
 4176 1682 83E13F   		and	ecx, 63	# source_bit,
 4177              	# sieve_extend.c:896:     const bitshift_t copy_bit   = bitindex_calc(copy_start);
 896:sieve_extend.c ****     const bitshift_t source_bit = bitindex_calc(source_start);
 4178              		.loc 1 896 22 view .LVU1159
 4179 1685 83E03F   		and	eax, 63	# copy_bit,
 4180              	.LVL346:
 897:sieve_extend.c **** 
 4181              		.loc 1 897 5 is_stmt 1 view .LVU1160
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 4182              		.loc 1 899 5 view .LVU1161
 4183              	# sieve_extend.c:899:     if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_s
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 4184              		.loc 1 899 13 is_stmt 0 view .LVU1162
 4185 1688 4839C8   		cmp	rax, rcx	# copy_bit, source_bit
 4186              	# sieve_extend.c:899:     if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_s
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 4187              		.loc 1 899 37 view .LVU1163
 4188 168b 488B7C24 		mov	rdi, QWORD PTR 64[rsp]	#, %sfp
 4188      40
 4189 1690 488B0C24 		mov	rcx, QWORD PTR [rsp]	#, %sfp
 4190              	.LVL347:
 4191              	# sieve_extend.c:899:     if      (source_bit > copy_bit) extendSieve_shiftleft (bitarray, source_s
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 4192              		.loc 1 899 13 view .LVU1164
 4193 1694 0F82E508 		jb	.L419	#,
 4193      0000
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 4194              		.loc 1 900 10 is_stmt 1 view .LVU1165
 4195              	# sieve_extend.c:900:     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, so
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 4196              		.loc 1 900 13 is_stmt 0 view .LVU1166
 4197 169a 0F86D508 		jbe	.L223	#,
 4197      0000
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 4198              		.loc 1 900 37 is_stmt 1 view .LVU1167
 4199 16a0 E86BEBFF 		call	extendSieve_shiftright_ivdep	#
 4199      FF
 4200              	.LVL348:
 4201              	.L221:
 900:sieve_extend.c ****     else                            extendSieve_aligned   (bitarray, source_start, size, destinatio
 4202              		.loc 1 900 37 is_stmt 0 view .LVU1168
 4203              	.LBE487:
 4204              	.LBE490:
1034:sieve_extend.c **** 
 4205              		.loc 1 1034 5 is_stmt 1 view .LVU1169
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4206              		.loc 1 1037 5 view .LVU1170
 4207              	.LBB491:
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4208              		.loc 1 1037 10 view .LVU1171
 4209              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4210              		.loc 1 1037 38 is_stmt 0 view .LVU1172
 4211 16a5 488B4424 		mov	rax, QWORD PTR 56[rsp]	# blocksize, %sfp
 4211      38
 4212              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
GAS LISTING /tmp/ccrNbbzt.s 			page 123


1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4213              		.loc 1 1037 20 view .LVU1173
 4214 16aa 4531F6   		xor	r14d, r14d	# block_start
 4215              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4216              		.loc 1 1037 38 view .LVU1174
 4217 16ad 4C8D60FF 		lea	r12, -1[rax]	# block_stop,
 4218              	.LVL349:
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4219              		.loc 1 1037 63 is_stmt 1 view .LVU1175
 4220              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4221              		.loc 1 1037 83 is_stmt 0 view .LVU1176
 4222 16b1 488B4424 		mov	rax, QWORD PTR 32[rsp]	# <retval>, %sfp
 4222      20
 4223              	.LBB492:
 4224              	.LBB493:
 4225              	.LBB494:
 4226              	.LBB495:
 4227              	.LBB496:
 4228              	.LBB497:
 4229              	.LBB498:
 4230              	.LBB499:
 4231              	# sieve_extend.c:292:                 mask |= markmask(index);
 292:sieve_extend.c ****                 index += step;
 4232              		.loc 1 292 25 view .LVU1177
 4233 16b6 41BF0100 		mov	r15d, 1	# tmp983,
 4233      0000
 4234              	.LBE499:
 4235              	.LBE498:
 4236              	.LBE497:
 4237              	.LBE496:
 4238              	.LBE495:
 4239              	.LBE494:
 4240              	.LBE493:
 4241              	.LBE492:
 4242              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4243              		.loc 1 1037 83 view .LVU1178
 4244 16bc 488B5008 		mov	rdx, QWORD PTR 8[rax]	# _8, sieve_89->bits
 4245 16c0 488B4424 		mov	rax, QWORD PTR 40[rsp]	# prime, %sfp
 4245      28
 4246 16c5 48FFC0   		inc	rax	# tmp970
 4247 16c8 48894424 		mov	QWORD PTR 48[rsp], rax	# %sfp, tmp970
 4247      30
 4248              	.LVL350:
 4249 16cd 0F1F00   		.p2align 4,,10
 4250              		.p2align 3
 4251              	.L227:
1038:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime);
 4252              		.loc 1 1038 9 is_stmt 1 view .LVU1179
 4253              	.LBB579:
 4254              	.LBB580:
 4255              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4256              		.loc 1 121 21 is_stmt 0 view .LVU1180
 4257 16d0 488B7C24 		mov	rdi, QWORD PTR 40[rsp]	# prime, %sfp
GAS LISTING /tmp/ccrNbbzt.s 			page 124


 4257      28
 4258 16d5 4939D4   		cmp	r12, rdx	# block_stop, _8
 4259              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4260              		.loc 1 121 12 view .LVU1181
 4261 16d8 488B7424 		mov	rsi, QWORD PTR 64[rsp]	# _94, %sfp
 4261      40
 4262              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4263              		.loc 1 121 21 view .LVU1182
 4264 16dd 4889F8   		mov	rax, rdi	# tmp738, prime
 4265 16e0 4C0F47E2 		cmova	r12, rdx	# block_stop,, block_stop, _8
 4266              	.LVL351:
 121:sieve_extend.c ****     return index;
 4267              		.loc 1 121 21 view .LVU1183
 4268              	.LBE580:
 4269              	.LBE579:
1039:sieve_extend.c ****         sieve_block_stripe(sieve, block_start, block_stop, prime);
 4270              		.loc 1 1039 9 is_stmt 1 view .LVU1184
 4271              	.LBB582:
 4272              	.LBI579:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 4273              		.loc 1 120 25 view .LVU1185
 4274              	.LBB581:
 121:sieve_extend.c ****     return index;
 4275              		.loc 1 121 5 view .LVU1186
 121:sieve_extend.c ****     return index;
 4276              		.loc 1 121 11 view .LVU1187
 4277              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4278              		.loc 1 121 21 is_stmt 0 view .LVU1188
 4279 16e4 48C1E806 		shr	rax, 6	# tmp738,
 4280              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4281              		.loc 1 121 12 view .LVU1189
 4282 16e8 488B04C6 		mov	rax, QWORD PTR [rsi+rax*8]	# *_1098, *_1098
 4283              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4284              		.loc 1 121 11 view .LVU1190
 4285 16ec 480FA3F8 		bt	rax, rdi	# *_1098, tmp1479
 4286 16f0 732F     		jnc	.L224	#,
 4287 16f2 488B4424 		mov	rax, QWORD PTR 48[rsp]	# tmp970, %sfp
 4287      30
 4288 16f7 EB0A     		jmp	.L225	#
 4289              	.LVL352:
 4290 16f9 0F1F8000 		.p2align 4,,10
 4290      000000
 4291              		.p2align 3
 4292              	.L324:
 121:sieve_extend.c ****     return index;
 4293              		.loc 1 121 11 view .LVU1191
 4294 1700 48FFC0   		inc	rax	# tmp970
 4295              	.LVL353:
 4296              	.L225:
 121:sieve_extend.c ****     return index;
 4297              		.loc 1 121 58 is_stmt 1 view .LVU1192
 121:sieve_extend.c ****     return index;
GAS LISTING /tmp/ccrNbbzt.s 			page 125


 4298              		.loc 1 121 11 view .LVU1193
 4299              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4300              		.loc 1 121 21 is_stmt 0 view .LVU1194
 4301 1703 4889C1   		mov	rcx, rax	# tmp743, tmp970
 4302 1706 48C1E906 		shr	rcx, 6	# tmp743,
 4303              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4304              		.loc 1 121 12 view .LVU1195
 4305 170a 488B0CCE 		mov	rcx, QWORD PTR [rsi+rcx*8]	# *_34, *_34
 4306              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4307              		.loc 1 121 11 view .LVU1196
 4308 170e 480FA3C1 		bt	rcx, rax	# *_34, tmp970
 4309 1712 72EC     		jc	.L324	#,
 4310 1714 48894424 		mov	QWORD PTR 40[rsp], rax	# %sfp, prime
 4310      28
 4311 1719 48FFC0   		inc	rax	# tmp970
 4312              	.LVL354:
 121:sieve_extend.c ****     return index;
 4313              		.loc 1 121 11 view .LVU1197
 4314 171c 48894424 		mov	QWORD PTR 48[rsp], rax	# %sfp, tmp970
 4314      30
 4315              	.LVL355:
 4316              	.L224:
 122:sieve_extend.c **** }
 4317              		.loc 1 122 5 is_stmt 1 view .LVU1198
 122:sieve_extend.c **** }
 4318              		.loc 1 122 5 is_stmt 0 view .LVU1199
 4319              	.LBE581:
 4320              	.LBE582:
1040:sieve_extend.c ****     } 
 4321              		.loc 1 1040 9 is_stmt 1 view .LVU1200
 4322              	.LBB583:
 4323              	.LBB574:
 4324              	# sieve_extend.c:906:     counter_t start = prime * prime * 2 + prime * 2;
 906:sieve_extend.c ****     counter_t step  = prime * 2 + 1;
 4325              		.loc 1 906 15 is_stmt 0 view .LVU1201
 4326 1721 488B7424 		mov	rsi, QWORD PTR 48[rsp]	# tmp749, %sfp
 4326      30
 4327              	.LBE574:
 4328              	.LBE583:
 4329              	# sieve_extend.c:1040:         sieve_block_stripe(sieve, block_start, block_stop, prime);
1040:sieve_extend.c ****     } 
 4330              		.loc 1 1040 9 view .LVU1202
 4331 1726 488B4424 		mov	rax, QWORD PTR 32[rsp]	# <retval>, %sfp
 4331      20
 4332              	.LBB584:
 4333              	.LBB575:
 4334              	# sieve_extend.c:906:     counter_t start = prime * prime * 2 + prime * 2;
 906:sieve_extend.c ****     counter_t step  = prime * 2 + 1;
 4335              		.loc 1 906 15 view .LVU1203
 4336 172b 480FAF74 		imul	rsi, QWORD PTR 40[rsp]	# tmp749, %sfp
 4336      2428
 4337              	.LBE575:
 4338              	.LBE584:
 4339              	# sieve_extend.c:1040:         sieve_block_stripe(sieve, block_start, block_stop, prime);
GAS LISTING /tmp/ccrNbbzt.s 			page 126


1040:sieve_extend.c ****     } 
 4340              		.loc 1 1040 9 view .LVU1204
 4341 1731 488B18   		mov	rbx, QWORD PTR [rax]	# _30, MEM[(uint64_t * *)sieve_89]
 4342              	.LVL356:
 4343              	.LBB585:
 4344              	.LBI492:
 904:sieve_extend.c ****     counter_t prime = prime_start;
 4345              		.loc 1 904 13 is_stmt 1 view .LVU1205
 4346              	.LBB576:
 905:sieve_extend.c ****     counter_t start = prime * prime * 2 + prime * 2;
 4347              		.loc 1 905 5 view .LVU1206
 906:sieve_extend.c ****     counter_t step  = prime * 2 + 1;
 4348              		.loc 1 906 5 view .LVU1207
 4349              	# sieve_extend.c:906:     counter_t start = prime * prime * 2 + prime * 2;
 906:sieve_extend.c ****     counter_t step  = prime * 2 + 1;
 4350              		.loc 1 906 15 is_stmt 0 view .LVU1208
 4351 1734 4801F6   		add	rsi, rsi	# index
 4352              	.LVL357:
 907:sieve_extend.c ****     bitword_t* bitarray = sieve->bitarray;
 4353              		.loc 1 907 5 is_stmt 1 view .LVU1209
 908:sieve_extend.c **** 
 4354              		.loc 1 908 5 view .LVU1210
 910:sieve_extend.c ****     
 4355              		.loc 1 910 5 view .LVU1211
 912:sieve_extend.c ****         step  = prime * 2 + 1;
 4356              		.loc 1 912 5 view .LVU1212
 912:sieve_extend.c ****         step  = prime * 2 + 1;
 4357              		.loc 1 912 11 view .LVU1213
 4358 1737 4939F4   		cmp	r12, rsi	# block_stop, index
 4359 173a 0F827901 		jb	.L231	#,
 4359      0000
 4360              	.LBB516:
 4361              	.LBB517:
 4362              	# sieve_extend.c:250:     const counter_t range_stop_word = wordindex(range_stop);
 250:sieve_extend.c ****     register counter_t copy_word = wordindex(range_start);
 4363              		.loc 1 250 21 is_stmt 0 view .LVU1214
 4364 1740 4C89E7   		mov	rdi, r12	# range_stop_word, block_stop
 4365 1743 48C1EF06 		shr	rdi, 6	# range_stop_word,
 4366              	# sieve_extend.c:273:     bitarray[copy_word] |= pattern & chopmask(range_stop);
 273:sieve_extend.c **** }
 4367              		.loc 1 273 38 view .LVU1215
 4368 1747 4489E0   		mov	eax, r12d	# tmp750, block_stop
 4369              	.LVL358:
 273:sieve_extend.c **** }
 4370              		.loc 1 273 38 view .LVU1216
 4371 174a F7D0     		not	eax	# tmp750
 4372 174c 48C7C2FF 		mov	rdx, -1	# tmp1491,
 4372      FFFFFF
 4373              	# sieve_extend.c:250:     const counter_t range_stop_word = wordindex(range_stop);
 250:sieve_extend.c ****     register counter_t copy_word = wordindex(range_start);
 4374              		.loc 1 250 21 view .LVU1217
 4375 1753 48897C24 		mov	QWORD PTR 16[rsp], rdi	# %sfp, range_stop_word
 4375      10
 4376 1758 4C8D2CFB 		lea	r13, [rbx+rdi*8]	# range_stop_ptr,
 4377              	# sieve_extend.c:273:     bitarray[copy_word] |= pattern & chopmask(range_stop);
 273:sieve_extend.c **** }
 4378              		.loc 1 273 38 view .LVU1218
GAS LISTING /tmp/ccrNbbzt.s 			page 127


 4379 175c C4E2FBF7 		shrx	rax, rdx, rax	# _525, tmp1491, tmp750
 4379      C2
 4380 1761 488B4C24 		mov	rcx, QWORD PTR 40[rsp]	# index, %sfp
 4380      28
 4381 1766 48890424 		mov	QWORD PTR [rsp], rax	# %sfp, _525
 4382 176a 488D47FF 		lea	rax, -1[rdi]	# tmp981,
 4383 176e 48894424 		mov	QWORD PTR 24[rsp], rax	# %sfp, tmp981
 4383      18
 4384 1773 4C896C24 		mov	QWORD PTR 8[rsp], r13	# %sfp, range_stop_ptr
 4384      08
 4385 1778 4889F0   		mov	rax, rsi	# index, index
 4386 177b 4989FD   		mov	r13, rdi	# range_stop_word, range_stop_word
 4387              	.LVL359:
 4388 177e 6690     		.p2align 4,,10
 4389              		.p2align 3
 4390              	.L241:
 273:sieve_extend.c **** }
 4391              		.loc 1 273 38 view .LVU1219
 4392              	.LBE517:
 4393              	.LBE516:
 913:sieve_extend.c ****         if (step > SMALLSTEP_FASTER) break;
 4394              		.loc 1 913 9 is_stmt 1 view .LVU1220
 4395              	# sieve_extend.c:913:         step  = prime * 2 + 1;
 913:sieve_extend.c ****         if (step > SMALLSTEP_FASTER) break;
 4396              		.loc 1 913 15 is_stmt 0 view .LVU1221
 4397 1780 488D7409 		lea	rsi, 1[rcx+rcx]	# step,
 4397      01
 4398              	.LVL360:
 914:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 4399              		.loc 1 914 9 is_stmt 1 view .LVU1222
 4400              	# sieve_extend.c:914:         if (step > SMALLSTEP_FASTER) break;
 914:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 4401              		.loc 1 914 12 is_stmt 0 view .LVU1223
 4402 1785 483B3500 		cmp	rsi, QWORD PTR global_SMALLSTEP_FASTER[rip]	# step, global_SMALLSTEP_FASTER
 4402      000000
 4403 178c 0F877E01 		ja	.L420	#,
 4403      0000
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4404              		.loc 1 915 9 is_stmt 1 view .LVU1224
 4405              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4406              		.loc 1 915 35 is_stmt 0 view .LVU1225
 4407 1792 4C8D4101 		lea	r8, 1[rcx]	# _301,
 4408              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4409              		.loc 1 915 12 view .LVU1226
 4410 1796 4D39F0   		cmp	r8, r14	# _301, block_start
 4411 1799 7712     		ja	.L232	#,
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4412              		.loc 1 915 41 is_stmt 1 view .LVU1227
 4413              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4414              		.loc 1 915 61 is_stmt 0 view .LVU1228
 4415 179b 4A8D0431 		lea	rax, [rcx+r14]	# _302,
 4416              	.LVL361:
 4417              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
GAS LISTING /tmp/ccrNbbzt.s 			page 128


 4418              		.loc 1 915 102 view .LVU1229
 4419 179f 31D2     		xor	edx, edx	# tmp756
 4420              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4421              		.loc 1 915 69 view .LVU1230
 4422 17a1 4801C1   		add	rcx, rax	# tmp754, _302
 4423              	.LVL362:
 4424              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4425              		.loc 1 915 102 view .LVU1231
 4426 17a4 48F7F6   		div	rsi	# step
 4427              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4428              		.loc 1 915 47 view .LVU1232
 4429 17a7 4889C8   		mov	rax, rcx	# tmp754, tmp754
 4430 17aa 4829D0   		sub	rax, rdx	# tmp754, tmp756
 4431              	.LVL363:
 4432              	.L232:
 916:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 4433              		.loc 1 916 9 is_stmt 1 view .LVU1233
 4434              	.LBB522:
 4435              	.LBI516:
 242:sieve_extend.c ****     debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using smallstep (%ju occurances)
 4436              		.loc 1 242 20 view .LVU1234
 4437              	.LBB520:
 243:sieve_extend.c **** 
 4438              		.loc 1 243 5 view .LVU1235
 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 4439              		.loc 1 246 2 view .LVU1236
 247:sieve_extend.c **** 
 4440              		.loc 1 247 5 view .LVU1237
 4441              	.LBB518:
 247:sieve_extend.c **** 
 4442              		.loc 1 247 10 view .LVU1238
 247:sieve_extend.c **** 
 4443              		.loc 1 247 41 view .LVU1239
 4444              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 4445              		.loc 1 247 5 is_stmt 0 view .LVU1240
 4446 17ad 4883FE40 		cmp	rsi, 64	# step,
 4447 17b1 0F874901 		ja	.L316	#,
 4447      0000
 247:sieve_extend.c **** 
 4448              		.loc 1 247 5 view .LVU1241
 4449 17b7 4889F2   		mov	rdx, rsi	# patternsize, step
 4450              	.LBE518:
 4451              	# sieve_extend.c:246: 	register bitword_t pattern = SAFE_SHIFTBIT;
 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 4452              		.loc 1 246 21 view .LVU1242
 4453 17ba 41BB0100 		mov	r11d, 1	# pattern,
 4453      0000
 4454              	.LVL364:
 4455              		.p2align 4,,10
 4456              		.p2align 3
 4457              	.L234:
 4458              	.LBB519:
 247:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 129


 4459              		.loc 1 247 95 is_stmt 1 view .LVU1243
 4460              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 4461              		.loc 1 247 115 is_stmt 0 view .LVU1244
 4462 17c0 C4C2E9F7 		shlx	rcx, r11, rdx	# _469, pattern, patternsize
 4462      CB
 4463              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 4464              		.loc 1 247 79 view .LVU1245
 4465 17c5 4801D2   		add	rdx, rdx	# patternsize
 4466              	.LVL365:
 4467              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 4468              		.loc 1 247 103 view .LVU1246
 4469 17c8 4909CB   		or	r11, rcx	# pattern, _469
 4470              	.LVL366:
 247:sieve_extend.c **** 
 4471              		.loc 1 247 67 is_stmt 1 view .LVU1247
 247:sieve_extend.c **** 
 4472              		.loc 1 247 41 view .LVU1248
 4473              	# sieve_extend.c:247:     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize
 247:sieve_extend.c **** 
 4474              		.loc 1 247 5 is_stmt 0 view .LVU1249
 4475 17cb 4883FA40 		cmp	rdx, 64	# patternsize,
 4476 17cf 76EF     		jbe	.L234	#,
 4477              	.LVL367:
 4478              	.L233:
 247:sieve_extend.c **** 
 4479              		.loc 1 247 5 view .LVU1250
 4480              	.LBE519:
 250:sieve_extend.c ****     register counter_t copy_word = wordindex(range_start);
 4481              		.loc 1 250 5 is_stmt 1 view .LVU1251
 251:sieve_extend.c ****      if (copy_word == range_stop_word) { // shortcut
 4482              		.loc 1 251 5 view .LVU1252
 4483              	# sieve_extend.c:251:     register counter_t copy_word = wordindex(range_start);
 251:sieve_extend.c ****      if (copy_word == range_stop_word) { // shortcut
 4484              		.loc 1 251 24 is_stmt 0 view .LVU1253
 4485 17d1 4989C1   		mov	r9, rax	# copy_word, index
 4486 17d4 49C1E906 		shr	r9, 6	# copy_word,
 4487              	.LVL368:
 252:sieve_extend.c ****        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(range_stop));
 4488              		.loc 1 252 6 is_stmt 1 view .LVU1254
 4489 17d8 4E8D14CD 		lea	r10, 0[0+r9*8]	# _1606,
 4489      00000000 
 4490 17e0 4A8D0C13 		lea	rcx, [rbx+r10]	# _1607,
 4491 17e4 488B11   		mov	rdx, QWORD PTR [rcx]	# pretmp_1608, *_1607
 4492 17e7 C4C2F9F7 		shlx	rbp, r11, rax	# _1610, pattern, index
 4492      EB
 4493              	# sieve_extend.c:252:      if (copy_word == range_stop_word) { // shortcut
 252:sieve_extend.c ****        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(range_stop));
 4494              		.loc 1 252 9 is_stmt 0 view .LVU1255
 4495 17ec 4D39CD   		cmp	r13, r9	# range_stop_word, copy_word
 4496 17ef 0F84F300 		je	.L421	#,
 4496      0000
 257:sieve_extend.c **** 
 4497              		.loc 1 257 5 is_stmt 1 view .LVU1256
 4498              	# sieve_extend.c:257:     bitarray[copy_word++] |= (pattern << bitindex(range_start));
GAS LISTING /tmp/ccrNbbzt.s 			page 130


 257:sieve_extend.c **** 
 4499              		.loc 1 257 27 is_stmt 0 view .LVU1257
 4500 17f5 4809EA   		or	rdx, rbp	# tmp762, _1610
 4501 17f8 488911   		mov	QWORD PTR [rcx], rdx	# *_1607, tmp762
 4502              	# sieve_extend.c:261:     pattern = (pattern << (bitindex_calc(range_start) % step)); // correct fo
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 4503              		.loc 1 261 28 view .LVU1258
 4504 17fb 83E03F   		and	eax, 63	# tmp763,
 4505              	.LVL369:
 4506              	# sieve_extend.c:261:     pattern = (pattern << (bitindex_calc(range_start) % step)); // correct fo
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 4507              		.loc 1 261 55 view .LVU1259
 4508 17fe 31D2     		xor	edx, edx	# tmp765
 4509 1800 48F7F6   		div	rsi	# step
 4510              	# sieve_extend.c:262:     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 262:sieve_extend.c ****     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
 4511              		.loc 1 262 25 view .LVU1260
 4512 1803 B8400000 		mov	eax, 64	# tmp770,
 4512      00
 4513              	# sieve_extend.c:257:     bitarray[copy_word++] |= (pattern << bitindex(range_start));
 257:sieve_extend.c **** 
 4514              		.loc 1 257 23 view .LVU1261
 4515 1808 498D7901 		lea	rdi, 1[r9]	# copy_word,
 4516              	.LVL370:
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 4517              		.loc 1 261 5 is_stmt 1 view .LVU1262
 4518              	# sieve_extend.c:261:     pattern = (pattern << (bitindex_calc(range_start) % step)); // correct fo
 261:sieve_extend.c ****     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 4519              		.loc 1 261 13 is_stmt 0 view .LVU1263
 4520 180c C4C2E9F7 		shlx	rcx, r11, rdx	# pattern, pattern, tmp765
 4520      CB
 4521              	.LVL371:
 262:sieve_extend.c ****     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
 4522              		.loc 1 262 5 is_stmt 1 view .LVU1264
 4523              	# sieve_extend.c:262:     register bitshift_t pattern_shift = WORD_SIZE_bitshift % step;
 262:sieve_extend.c ****     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_shift - pattern_shift;
 4524              		.loc 1 262 25 is_stmt 0 view .LVU1265
 4525 1811 31D2     		xor	edx, edx	# tmp769
 4526 1813 48F7F6   		div	rsi	# step
 4527              	.LVL372:
 263:sieve_extend.c ****     // copy_word++;
 4528              		.loc 1 263 5 is_stmt 1 view .LVU1266
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 4529              		.loc 1 267 5 view .LVU1267
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 4530              		.loc 1 267 11 view .LVU1268
 4531              	# sieve_extend.c:263:     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_
 263:sieve_extend.c ****     // copy_word++;
 4532              		.loc 1 263 84 is_stmt 0 view .LVU1269
 4533 1816 41BB2000 		mov	r11d, 32	# tmp771,
 4533      0000
 4534 181c 4929D3   		sub	r11, rdx	# tmp771, tmp769
 4535              	# sieve_extend.c:263:     register bitshift_t pattern_shift_flipped = WORD_SIZE_bitshift - pattern_
 263:sieve_extend.c ****     // copy_word++;
 4536              		.loc 1 263 25 view .LVU1270
 4537 181f 4D01DB   		add	r11, r11	# pattern_shift_flipped
 4538              	.LVL373:
GAS LISTING /tmp/ccrNbbzt.s 			page 131


 263:sieve_extend.c ****     // copy_word++;
 4539              		.loc 1 263 25 view .LVU1271
 4540 1822 89D5     		mov	ebp, edx	# _1851, tmp769
 4541 1824 4489D8   		mov	eax, r11d	# _1852, pattern_shift_flipped
 4542              	# sieve_extend.c:267:     for (;copy_word < range_stop_word; copy_word++) {
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 4543              		.loc 1 267 5 view .LVU1272
 4544 1827 4939FD   		cmp	r13, rdi	# range_stop_word, copy_word
 4545 182a 762F     		jbe	.L237	#,
 4546 182c 4A8D7413 		lea	rsi, 8[rbx+r10]	# ivtmp.562,
 4546      08
 4547              	.LVL374:
 4548              		.p2align 4,,10
 4549 1831 0F1F8000 		.p2align 3
 4549      000000
 4550              	.L238:
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 4551              		.loc 1 268 9 is_stmt 1 view .LVU1273
 4552              	# sieve_extend.c:268:         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flip
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 4553              		.loc 1 268 28 is_stmt 0 view .LVU1274
 4554 1838 C462D3F7 		shrx	r10, rcx, rbp	# _502, pattern, _1851
 4554      D1
 4555              	# sieve_extend.c:268:         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flip
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 4556              		.loc 1 268 57 view .LVU1275
 4557 183d C4E2F9F7 		shlx	rcx, rcx, rax	# _504, pattern, _1852
 4557      C9
 4558              	.LVL375:
 4559              	# sieve_extend.c:268:         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flip
 268:sieve_extend.c ****         bitarray[copy_word] |= pattern;
 4560              		.loc 1 268 17 view .LVU1276
 4561 1842 4C09D1   		or	rcx, r10	# pattern, _502
 4562              	.LVL376:
 269:sieve_extend.c ****     } 
 4563              		.loc 1 269 9 is_stmt 1 view .LVU1277
 4564              	# sieve_extend.c:269:         bitarray[copy_word] |= pattern;
 269:sieve_extend.c ****     } 
 4565              		.loc 1 269 29 is_stmt 0 view .LVU1278
 4566 1845 48090E   		or	QWORD PTR [rsi], rcx	# MEM[base: _1734, offset: 0B], pattern
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 4567              		.loc 1 267 40 is_stmt 1 view .LVU1279
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 4568              		.loc 1 267 11 view .LVU1280
 4569 1848 4883C608 		add	rsi, 8	# ivtmp.562,
 4570              	# sieve_extend.c:267:     for (;copy_word < range_stop_word; copy_word++) {
 267:sieve_extend.c ****         pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped);
 4571              		.loc 1 267 5 is_stmt 0 view .LVU1281
 4572 184c 48397424 		cmp	QWORD PTR 8[rsp], rsi	# %sfp, ivtmp.562
 4572      08
 4573 1851 75E5     		jne	.L238	#,
 4574 1853 48037C24 		add	rdi, QWORD PTR 24[rsp]	# _732, %sfp
 4574      18
 4575 1858 4C29CF   		sub	rdi, r9	# copy_word, copy_word
 4576              	.L237:
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 4577              		.loc 1 272 5 is_stmt 1 view .LVU1282
GAS LISTING /tmp/ccrNbbzt.s 			page 132


 4578              	# sieve_extend.c:272:     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped)
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 4579              		.loc 1 272 24 is_stmt 0 view .LVU1283
 4580 185b C4E2EBF7 		shrx	rdx, rcx, rdx	# _514, pattern, tmp769
 4580      D1
 4581              	.LVL377:
 4582              	# sieve_extend.c:272:     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped)
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 4583              		.loc 1 272 53 view .LVU1284
 4584 1860 C4E2A1F7 		shlx	rcx, rcx, r11	# _516, pattern, pattern_shift_flipped
 4584      C9
 4585              	.LVL378:
 273:sieve_extend.c **** }
 4586              		.loc 1 273 5 is_stmt 1 view .LVU1285
 4587              	# sieve_extend.c:272:     pattern = (pattern >> pattern_shift) | (pattern << pattern_shift_flipped)
 272:sieve_extend.c ****     bitarray[copy_word] |= pattern & chopmask(range_stop);
 4588              		.loc 1 272 13 is_stmt 0 view .LVU1286
 4589 1865 4809D1   		or	rcx, rdx	# pattern, _514
 4590              	.LVL379:
 4591              	# sieve_extend.c:273:     bitarray[copy_word] |= pattern & chopmask(range_stop);
 273:sieve_extend.c **** }
 4592              		.loc 1 273 36 view .LVU1287
 4593 1868 48230C24 		and	rcx, QWORD PTR [rsp]	# tmp778, %sfp
 4594              	.LVL380:
 4595              	# sieve_extend.c:273:     bitarray[copy_word] |= pattern & chopmask(range_stop);
 273:sieve_extend.c **** }
 4596              		.loc 1 273 25 view .LVU1288
 4597 186c 48090CFB 		or	QWORD PTR [rbx+rdi*8], rcx	# *_520, tmp778
 4598              	.LVL381:
 4599              	.L236:
 273:sieve_extend.c **** }
 4600              		.loc 1 273 25 view .LVU1289
 4601              	.LBE520:
 4602              	.LBE522:
 917:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 4603              		.loc 1 917 9 is_stmt 1 view .LVU1290
 4604              	.LBB523:
 4605              	.LBI523:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 4606              		.loc 1 120 25 view .LVU1291
 4607              	.LBB524:
 121:sieve_extend.c ****     return index;
 4608              		.loc 1 121 5 view .LVU1292
 121:sieve_extend.c ****     return index;
 4609              		.loc 1 121 11 view .LVU1293
 4610              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4611              		.loc 1 121 21 is_stmt 0 view .LVU1294
 4612 1870 4C89C0   		mov	rax, r8	# tmp779, _301
 4613 1873 48C1E806 		shr	rax, 6	# tmp779,
 4614              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4615              		.loc 1 121 12 view .LVU1295
 4616 1877 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_54, *_54
 4617              	.LBE524:
 4618              	.LBE523:
 4619              	# sieve_extend.c:915:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
GAS LISTING /tmp/ccrNbbzt.s 			page 133


 915:sieve_extend.c ****         setBitsTrue_smallStep(bitarray, start, (bitshift_t)step, block_stop);
 4620              		.loc 1 915 35 view .LVU1296
 4621 187b 4C89C1   		mov	rcx, r8	# index, _301
 4622              	.LBB526:
 4623              	.LBB525:
 4624              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4625              		.loc 1 121 11 view .LVU1297
 4626 187e 4C0FA3C0 		bt	rax, r8	# *_54, _301
 4627 1882 7318     		jnc	.L239	#,
 4628              	.LVL382:
 4629              		.p2align 4,,10
 4630 1884 0F1F4000 		.p2align 3
 4631              	.L240:
 121:sieve_extend.c ****     return index;
 4632              		.loc 1 121 58 is_stmt 1 view .LVU1298
 4633              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4634              		.loc 1 121 63 is_stmt 0 view .LVU1299
 4635 1888 48FFC1   		inc	rcx	# index
 4636              	.LVL383:
 121:sieve_extend.c ****     return index;
 4637              		.loc 1 121 11 is_stmt 1 view .LVU1300
 4638              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4639              		.loc 1 121 21 is_stmt 0 view .LVU1301
 4640 188b 4889C8   		mov	rax, rcx	# tmp784, index
 4641 188e 48C1E806 		shr	rax, 6	# tmp784,
 4642              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4643              		.loc 1 121 12 view .LVU1302
 4644 1892 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_311, *_311
 4645              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 4646              		.loc 1 121 11 view .LVU1303
 4647 1896 480FA3C8 		bt	rax, rcx	# *_311, index
 4648 189a 72EC     		jc	.L240	#,
 4649              	.L239:
 122:sieve_extend.c **** }
 4650              		.loc 1 122 5 is_stmt 1 view .LVU1304
 4651              	.LVL384:
 122:sieve_extend.c **** }
 4652              		.loc 1 122 5 is_stmt 0 view .LVU1305
 4653              	.LBE525:
 4654              	.LBE526:
 918:sieve_extend.c ****     }
 4655              		.loc 1 918 9 is_stmt 1 view .LVU1306
 4656              	# sieve_extend.c:918:         start = prime * prime * 2 + prime * 2;
 918:sieve_extend.c ****     }
 4657              		.loc 1 918 35 is_stmt 0 view .LVU1307
 4658 189c 488D4101 		lea	rax, 1[rcx]	# _433,
 4659              	# sieve_extend.c:918:         start = prime * prime * 2 + prime * 2;
 918:sieve_extend.c ****     }
 4660              		.loc 1 918 15 view .LVU1308
 4661 18a0 480FAFC1 		imul	rax, rcx	# tmp790, index
 4662 18a4 4801C0   		add	rax, rax	# index
 4663              	.LVL385:
GAS LISTING /tmp/ccrNbbzt.s 			page 134


 912:sieve_extend.c ****         step  = prime * 2 + 1;
 4664              		.loc 1 912 11 is_stmt 1 view .LVU1309
 4665 18a7 4939C4   		cmp	r12, rax	# block_stop, index
 4666 18aa 0F83D0FE 		jnb	.L241	#,
 4666      FFFF
 4667              	.LVL386:
 4668              		.p2align 4,,10
 4669              		.p2align 3
 4670              	.L396:
 912:sieve_extend.c ****         step  = prime * 2 + 1;
 4671              		.loc 1 912 11 is_stmt 0 view .LVU1310
 4672 18b0 488B4424 		mov	rax, QWORD PTR 32[rsp]	# <retval>, %sfp
 4672      20
 4673 18b5 488B5008 		mov	rdx, QWORD PTR 8[rax]	# _8, sieve_89->bits
 4674              	.LVL387:
 4675              	.L231:
 912:sieve_extend.c ****         step  = prime * 2 + 1;
 4676              		.loc 1 912 11 view .LVU1311
 4677              	.LBE576:
 4678              	.LBE585:
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4679              		.loc 1 1037 91 is_stmt 1 view .LVU1312
 4680              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4681              		.loc 1 1037 103 is_stmt 0 view .LVU1313
 4682 18b9 488B4424 		mov	rax, QWORD PTR 56[rsp]	# blocksize, %sfp
 4682      38
 4683 18be 4901C6   		add	r14, rax	# block_start, blocksize
 4684              	.LVL388:
 4685              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4686              		.loc 1 1037 128 view .LVU1314
 4687 18c1 4901C4   		add	r12, rax	# block_stop, blocksize
 4688              	.LVL389:
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4689              		.loc 1 1037 63 is_stmt 1 view .LVU1315
 4690              	# sieve_extend.c:1037:     for (counter_t block_start = 0,  block_stop = blocksize-1;block_start <=
1037:sieve_extend.c ****         if unlikely(block_stop > sieve->bits) block_stop = sieve->bits;
 4691              		.loc 1 1037 5 is_stmt 0 view .LVU1316
 4692 18c4 4C39F2   		cmp	rdx, r14	# _8, block_start
 4693 18c7 0F8303FE 		jnb	.L227	#,
 4693      FFFF
 4694              	.LBE491:
 4695              	# sieve_extend.c:1044: }
1044:sieve_extend.c **** 
 4696              		.loc 1 1044 1 view .LVU1317
 4697 18cd 488B4424 		mov	rax, QWORD PTR 32[rsp]	#, %sfp
 4697      20
 4698 18d2 4883C458 		add	rsp, 88	#,
 4699              		.cfi_remember_state
 4700              		.cfi_def_cfa_offset 56
 4701 18d6 5B       		pop	rbx	#
 4702              		.cfi_def_cfa_offset 48
 4703 18d7 5D       		pop	rbp	#
 4704              		.cfi_def_cfa_offset 40
 4705 18d8 415C     		pop	r12	#
 4706              		.cfi_def_cfa_offset 32
GAS LISTING /tmp/ccrNbbzt.s 			page 135


 4707              	.LVL390:
1044:sieve_extend.c **** 
 4708              		.loc 1 1044 1 view .LVU1318
 4709 18da 415D     		pop	r13	#
 4710              		.cfi_def_cfa_offset 24
 4711 18dc 415E     		pop	r14	#
 4712              		.cfi_def_cfa_offset 16
 4713              	.LVL391:
1044:sieve_extend.c **** 
 4714              		.loc 1 1044 1 view .LVU1319
 4715 18de 415F     		pop	r15	#
 4716              		.cfi_def_cfa_offset 8
 4717 18e0 C3       		ret	
 4718              	.LVL392:
 4719              		.p2align 4,,10
 4720 18e1 0F1F8000 		.p2align 3
 4720      000000
 4721              	.L421:
 4722              		.cfi_restore_state
 4723              	.LBB588:
 4724              	.LBB586:
 4725              	.LBB577:
 4726              	.LBB527:
 4727              	.LBB521:
 253:sieve_extend.c ****        return;
 4728              		.loc 1 253 8 is_stmt 1 view .LVU1320
 4729              	# sieve_extend.c:253:        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(
 253:sieve_extend.c ****        return;
 4730              		.loc 1 253 67 is_stmt 0 view .LVU1321
 4731 18e8 48232C24 		and	rbp, QWORD PTR [rsp]	# tmp760, %sfp
 4732              	# sieve_extend.c:253:        bitarray[copy_word] |= ((pattern << bitindex(range_start)) & chopmask(
 253:sieve_extend.c ****        return;
 4733              		.loc 1 253 28 view .LVU1322
 4734 18ec 4809EA   		or	rdx, rbp	# tmp761, tmp760
 4735 18ef 488911   		mov	QWORD PTR [rcx], rdx	# *_1607, tmp761
 254:sieve_extend.c ****     }
 4736              		.loc 1 254 8 is_stmt 1 view .LVU1323
 4737 18f2 E979FFFF 		jmp	.L236	#
 4737      FF
 4738              	.LVL393:
 4739 18f7 660F1F84 		.p2align 4,,10
 4739      00000000 
 4739      00
 4740              		.p2align 3
 4741              	.L316:
 4742              	# sieve_extend.c:246: 	register bitword_t pattern = SAFE_SHIFTBIT;
 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 4743              		.loc 1 246 21 is_stmt 0 view .LVU1324
 4744 1900 41BB0100 		mov	r11d, 1	# pattern,
 4744      0000
 4745 1906 E9C6FEFF 		jmp	.L233	#
 4745      FF
 4746              	.LVL394:
 4747 190b 0F1F4400 		.p2align 4,,10
 4747      00
 4748              		.p2align 3
 4749              	.L420:
GAS LISTING /tmp/ccrNbbzt.s 			page 136


 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 4750              		.loc 1 246 21 view .LVU1325
 4751 1910 4C8B6C24 		mov	r13, QWORD PTR 8[rsp]	# range_stop_ptr, %sfp
 4751      08
 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 4752              		.loc 1 246 21 view .LVU1326
 4753              	.LBE521:
 4754              	.LBE527:
 921:sieve_extend.c ****         step  = prime * 2 + 1;
 4755              		.loc 1 921 11 is_stmt 1 view .LVU1327
 4756 1915 4889C6   		mov	rsi, rax	# index, index
 4757              	.LVL395:
 921:sieve_extend.c ****         step  = prime * 2 + 1;
 4758              		.loc 1 921 11 is_stmt 0 view .LVU1328
 4759 1918 4939C4   		cmp	r12, rax	# block_stop, index
 4760 191b 7293     		jb	.L396	#,
 922:sieve_extend.c ****         if (step > MEDIUMSTEP_FASTER) break;
 4761              		.loc 1 922 9 is_stmt 1 view .LVU1329
 4762              	# sieve_extend.c:922:         step  = prime * 2 + 1;
 922:sieve_extend.c ****         if (step > MEDIUMSTEP_FASTER) break;
 4763              		.loc 1 922 15 is_stmt 0 view .LVU1330
 4764 191d 4C8D4409 		lea	r8, 1[rcx+rcx]	# step,
 4764      01
 4765              	.LVL396:
 923:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 4766              		.loc 1 923 9 is_stmt 1 view .LVU1331
 4767              	# sieve_extend.c:923:         if (step > MEDIUMSTEP_FASTER) break;
 923:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 4768              		.loc 1 923 12 is_stmt 0 view .LVU1332
 4769 1922 4C3B0500 		cmp	r8, QWORD PTR global_MEDIUMSTEP_FASTER[rip]	# step, global_MEDIUMSTEP_FASTER
 4769      000000
 4770 1929 0F874B01 		ja	.L422	#,
 4770      0000
 4771              	.LVL397:
 4772 192f 90       		.p2align 4,,10
 4773              		.p2align 3
 4774              	.L242:
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4775              		.loc 1 924 9 is_stmt 1 view .LVU1333
 4776              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4777              		.loc 1 924 35 is_stmt 0 view .LVU1334
 4778 1930 4C8D5901 		lea	r11, 1[rcx]	# _325,
 4779              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4780              		.loc 1 924 12 view .LVU1335
 4781 1934 4D39F3   		cmp	r11, r14	# _325, block_start
 4782 1937 7710     		ja	.L245	#,
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4783              		.loc 1 924 41 is_stmt 1 view .LVU1336
 4784              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4785              		.loc 1 924 61 is_stmt 0 view .LVU1337
 4786 1939 4A8D0431 		lea	rax, [rcx+r14]	# _326,
 4787              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4788              		.loc 1 924 102 view .LVU1338
GAS LISTING /tmp/ccrNbbzt.s 			page 137


 4789 193d 31D2     		xor	edx, edx	# tmp794
 4790              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4791              		.loc 1 924 69 view .LVU1339
 4792 193f 488D3408 		lea	rsi, [rax+rcx]	# tmp792,
 4793              	.LVL398:
 4794              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4795              		.loc 1 924 102 view .LVU1340
 4796 1943 49F7F0   		div	r8	# step
 4797              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 4798              		.loc 1 924 47 view .LVU1341
 4799 1946 4829D6   		sub	rsi, rdx	# index, tmp794
 4800              	.LVL399:
 4801              	.L245:
 925:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 4802              		.loc 1 925 9 is_stmt 1 view .LVU1342
 4803              	.LBB528:
 4804              	.LBI494:
 280:sieve_extend.c ****     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * step;
 4805              		.loc 1 280 20 view .LVU1343
 4806              	.LBB514:
 281:sieve_extend.c **** 
 4807              		.loc 1 281 5 view .LVU1344
 4808              	# sieve_extend.c:281:     const counter_t range_stop_unique =  range_start + WORD_SIZE_counter * st
 281:sieve_extend.c **** 
 4809              		.loc 1 281 74 is_stmt 0 view .LVU1345
 4810 1949 4D89C1   		mov	r9, r8	# tmp796, step
 4811 194c 49C1E106 		sal	r9, 6	# tmp796,
 4812 1950 31C0     		xor	eax, eax	# _508
 4813 1952 4901F1   		add	r9, rsi	# tmp797, index
 4814 1955 0F92C0   		setc	al	#, _508
 4815              	.LVL400:
 283:sieve_extend.c ****         debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-unique (%ju
 4816              		.loc 1 283 5 is_stmt 1 view .LVU1346
 4817              	# sieve_extend.c:283:     if (range_stop_unique > range_stop) { // the range will not repeat itself
 283:sieve_extend.c ****         debug printf("Setting bits step %ju in %ju bit range (%ju-%ju) using mediumstep-unique (%ju
 4818              		.loc 1 283 8 is_stmt 0 view .LVU1347
 4819 1958 4D39CC   		cmp	r12, r9	# block_stop, tmp797
 4820 195b 0F82AF03 		jb	.L248	#,
 4820      0000
 4821              	.LVL401:
 4822              	.LBB503:
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4823              		.loc 1 304 54 is_stmt 1 view .LVU1348
 4824              	# sieve_extend.c:304:         for (register counter_t index = range_start; index <= range_stop_uniq
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4825              		.loc 1 304 9 is_stmt 0 view .LVU1349
 4826 1961 4885C0   		test	rax, rax	# _508
 4827 1964 0F85BB00 		jne	.L252	#,
 4827      0000
 4828              	.LBB504:
 4829              	.LBB505:
 4830              	.LBB506:
 4831              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 138


 4832              		.loc 1 185 107 view .LVU1350
 4833 196a 488B7C24 		mov	rdi, QWORD PTR 16[rsp]	# range_stop_word, %sfp
 4833      10
 4834              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 4835              		.loc 1 185 84 view .LVU1351
 4836 196f 4F8D1480 		lea	r10, [r8+r8*4]	# tmp810,
 4837              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 4838              		.loc 1 185 107 view .LVU1352
 4839 1973 4889F8   		mov	rax, rdi	# tmp812, range_stop_word
 4840 1976 4C29D0   		sub	rax, r10	# tmp812, tmp810
 4841 1979 488D2CC3 		lea	rbp, [rbx+rax*8]	# tmp814,
 4842 197d 4C39D7   		cmp	rdi, r10	# range_stop_word, tmp810
 4843 1980 4C89C0   		mov	rax, r8	# _1756, step
 4844 1983 480F46EB 		cmovbe	rbp, rbx	# _30,, prephitmp_1664
 4845 1987 48C1E004 		sal	rax, 4	# _1756,
 4846 198b 48894424 		mov	QWORD PTR 8[rsp], rax	# %sfp, _1756
 4846      08
 4847              	# sieve_extend.c:191:        index_ptr+=step;
 191:sieve_extend.c ****        *index_ptr |= mask;
 4848              		.loc 1 191 17 view .LVU1353
 4849 1990 4A8D0CC5 		lea	rcx, 0[0+r8*8]	# _569,
 4849      00000000 
 4850              	.LVL402:
 191:sieve_extend.c ****        *index_ptr |= mask;
 4851              		.loc 1 191 17 view .LVU1354
 4852 1998 49C1E203 		sal	r10, 3	# tmp818,
 4853              	.LVL403:
 4854 199c 0F1F4000 		.p2align 4,,10
 4855              		.p2align 3
 4856              	.L261:
 191:sieve_extend.c ****        *index_ptr |= mask;
 4857              		.loc 1 191 17 view .LVU1355
 4858              	.LBE506:
 4859              	.LBE505:
 305:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 4860              		.loc 1 305 13 is_stmt 1 view .LVU1356
 4861              	# sieve_extend.c:305:             register counter_t index_word = wordindex(index);
 305:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 4862              		.loc 1 305 32 is_stmt 0 view .LVU1357
 4863 19a0 4889F0   		mov	rax, rsi	# index_word, index
 4864 19a3 48C1E806 		shr	rax, 6	# index_word,
 4865              	.LVL404:
 306:sieve_extend.c ****             #pragma ivdep
 4866              		.loc 1 306 13 is_stmt 1 view .LVU1358
 4867              	# sieve_extend.c:306:             register bitword_t mask = SAFE_ZERO;
 306:sieve_extend.c ****             #pragma ivdep
 4868              		.loc 1 306 32 is_stmt 0 view .LVU1359
 4869 19a7 31D2     		xor	edx, edx	# mask
 4870              	.LVL405:
 4871 19a9 0F1F8000 		.p2align 4,,10
 4871      000000
 4872              		.p2align 3
 4873              	.L255:
 308:sieve_extend.c ****                 mask |= markmask(index);
 4874              		.loc 1 308 13 is_stmt 1 view .LVU1360
GAS LISTING /tmp/ccrNbbzt.s 			page 139


 309:sieve_extend.c ****                 index += step;
 4875              		.loc 1 309 17 view .LVU1361
 4876              	# sieve_extend.c:309:                 mask |= markmask(index);
 309:sieve_extend.c ****                 index += step;
 4877              		.loc 1 309 25 is_stmt 0 view .LVU1362
 4878 19b0 C4C2C9F7 		shlx	rdi, r15, rsi	# tmp820, tmp983, index
 4878      FF
 4879              	# sieve_extend.c:310:                 index += step;
 310:sieve_extend.c ****             } while (index_word == wordindex(index));
 4880              		.loc 1 310 23 view .LVU1363
 4881 19b5 4C01C6   		add	rsi, r8	# index, step
 4882              	.LVL406:
 4883              	# sieve_extend.c:309:                 mask |= markmask(index);
 309:sieve_extend.c ****                 index += step;
 4884              		.loc 1 309 22 view .LVU1364
 4885 19b8 4809FA   		or	rdx, rdi	# mask, tmp820
 4886              	.LVL407:
 310:sieve_extend.c ****             } while (index_word == wordindex(index));
 4887              		.loc 1 310 17 is_stmt 1 view .LVU1365
 311:sieve_extend.c ****             // #pragma ivdep
 4888              		.loc 1 311 21 view .LVU1366
 4889              	# sieve_extend.c:311:             } while (index_word == wordindex(index));
 311:sieve_extend.c ****             // #pragma ivdep
 4890              		.loc 1 311 36 is_stmt 0 view .LVU1367
 4891 19bb 4889F7   		mov	rdi, rsi	# tmp822, index
 4892 19be 48C1EF06 		shr	rdi, 6	# tmp822,
 4893              	# sieve_extend.c:311:             } while (index_word == wordindex(index));
 311:sieve_extend.c ****             // #pragma ivdep
 4894              		.loc 1 311 13 view .LVU1368
 4895 19c2 4839F8   		cmp	rax, rdi	# index_word, tmp822
 4896 19c5 74E9     		je	.L255	#,
 315:sieve_extend.c ****         }
 4897              		.loc 1 315 13 is_stmt 1 view .LVU1369
 4898              	.LVL408:
 4899              	.LBB509:
 4900              	.LBI505:
 151:sieve_extend.c **** //#if __APPLE__
 4901              		.loc 1 151 20 view .LVU1370
 4902              	.LBB507:
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 4903              		.loc 1 183 4 view .LVU1371
 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 4904              		.loc 1 184 4 view .LVU1372
 4905              	# sieve_extend.c:184:    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(
 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 4906              		.loc 1 184 78 is_stmt 0 view .LVU1373
 4907 19c7 488D04C3 		lea	rax, [rbx+rax*8]	# index_ptr,
 4908              	.LVL409:
 185:sieve_extend.c **** 
 4909              		.loc 1 185 4 is_stmt 1 view .LVU1374
 189:sieve_extend.c ****        *index_ptr |= mask;
 4910              		.loc 1 189 4 view .LVU1375
 189:sieve_extend.c ****        *index_ptr |= mask;
 4911              		.loc 1 189 10 view .LVU1376
 4912 19cb 4839E8   		cmp	rax, rbp	# index_ptr, prephitmp_1664
 4913 19ce 733E     		jnb	.L397	#,
 4914 19d0 488B7C24 		mov	rdi, QWORD PTR 8[rsp]	# _1756, %sfp
GAS LISTING /tmp/ccrNbbzt.s 			page 140


 4914      08
 4915 19d5 4801C7   		add	rdi, rax	# ivtmp.542, index_ptr
 4916 19d8 0F1F8400 		.p2align 4,,10
 4916      00000000 
 4917              		.p2align 3
 4918              	.L257:
 190:sieve_extend.c ****        index_ptr+=step;
 4919              		.loc 1 190 8 view .LVU1377
 4920              	# sieve_extend.c:190:        *index_ptr |= mask;
 190:sieve_extend.c ****        index_ptr+=step;
 4921              		.loc 1 190 19 is_stmt 0 view .LVU1378
 4922 19e0 480910   		or	QWORD PTR [rax], rdx	# MEM[base: index_ptr_1071, offset: 0B], mask
 191:sieve_extend.c ****        *index_ptr |= mask;
 4923              		.loc 1 191 8 is_stmt 1 view .LVU1379
 4924              	.LVL410:
 192:sieve_extend.c ****        index_ptr+=step;
 4925              		.loc 1 192 8 view .LVU1380
 4926              	# sieve_extend.c:192:        *index_ptr |= mask;
 192:sieve_extend.c ****        index_ptr+=step;
 4927              		.loc 1 192 19 is_stmt 0 view .LVU1381
 4928 19e3 48091408 		or	QWORD PTR [rax+rcx], rdx	# MEM[base: index_ptr_1071, index: _569, offset: 0B], mask
 193:sieve_extend.c ****        *index_ptr |= mask;
 4929              		.loc 1 193 8 is_stmt 1 view .LVU1382
 4930              	.LVL411:
 194:sieve_extend.c ****        index_ptr+=step;
 4931              		.loc 1 194 8 view .LVU1383
 4932              	# sieve_extend.c:194:        *index_ptr |= mask;
 194:sieve_extend.c ****        index_ptr+=step;
 4933              		.loc 1 194 19 is_stmt 0 view .LVU1384
 4934 19e7 480917   		or	QWORD PTR [rdi], rdx	# MEM[base: _1750, offset: 0B], mask
 195:sieve_extend.c ****        *index_ptr |= mask;
 4935              		.loc 1 195 8 is_stmt 1 view .LVU1385
 4936              	.LVL412:
 196:sieve_extend.c ****        index_ptr+=step;
 4937              		.loc 1 196 8 view .LVU1386
 4938              	# sieve_extend.c:196:        *index_ptr |= mask;
 196:sieve_extend.c ****        index_ptr+=step;
 4939              		.loc 1 196 19 is_stmt 0 view .LVU1387
 4940 19ea 4809140F 		or	QWORD PTR [rdi+rcx], rdx	# MEM[base: _1750, index: _569, offset: 0B], mask
 197:sieve_extend.c ****        *index_ptr |= mask;
 4941              		.loc 1 197 8 is_stmt 1 view .LVU1388
 4942              	.LVL413:
 198:sieve_extend.c ****        index_ptr+=step;
 4943              		.loc 1 198 8 view .LVU1389
 4944 19ee 4C01D7   		add	rdi, r10	# ivtmp.542, tmp818
 4945              	# sieve_extend.c:198:        *index_ptr |= mask;
 198:sieve_extend.c ****        index_ptr+=step;
 4946              		.loc 1 198 19 is_stmt 0 view .LVU1390
 4947 19f1 48091488 		or	QWORD PTR [rax+rcx*4], rdx	# MEM[base: index_ptr_1071, index: _569, step: 4, offset: 0B], mask
 199:sieve_extend.c ****    }
 4948              		.loc 1 199 8 is_stmt 1 view .LVU1391
 4949 19f5 4C01D0   		add	rax, r10	# index_ptr, tmp818
 4950              	.LVL414:
 189:sieve_extend.c ****        *index_ptr |= mask;
 4951              		.loc 1 189 10 view .LVU1392
 4952 19f8 4839C5   		cmp	rbp, rax	# prephitmp_1664, index_ptr
 4953 19fb 77E3     		ja	.L257	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 141


 203:sieve_extend.c ****        *index_ptr |= mask;
 4954              		.loc 1 203 10 view .LVU1393
 4955 19fd 4939C5   		cmp	r13, rax	# range_stop_ptr, index_ptr
 4956 1a00 7611     		jbe	.L423	#,
 4957              		.p2align 4,,10
 4958 1a02 660F1F44 		.p2align 3
 4958      0000
 4959              	.L259:
 204:sieve_extend.c ****        index_ptr+=step;
 4960              		.loc 1 204 8 view .LVU1394
 4961              	# sieve_extend.c:204:        *index_ptr |= mask;
 204:sieve_extend.c ****        index_ptr+=step;
 4962              		.loc 1 204 19 is_stmt 0 view .LVU1395
 4963 1a08 480910   		or	QWORD PTR [rax], rdx	# MEM[base: index_ptr_1045, offset: 0B], mask
 205:sieve_extend.c ****    }
 4964              		.loc 1 205 8 is_stmt 1 view .LVU1396
 4965              	# sieve_extend.c:205:        index_ptr+=step;
 205:sieve_extend.c ****    }
 4966              		.loc 1 205 17 is_stmt 0 view .LVU1397
 4967 1a0b 4801C8   		add	rax, rcx	# index_ptr, _569
 4968              	.LVL415:
 4969              	.L397:
 203:sieve_extend.c ****        *index_ptr |= mask;
 4970              		.loc 1 203 10 is_stmt 1 view .LVU1398
 4971 1a0e 4939C5   		cmp	r13, rax	# range_stop_ptr, index_ptr
 4972 1a11 77F5     		ja	.L259	#,
 4973              	.L423:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 4974              		.loc 1 208 4 view .LVU1399
 4975              	# sieve_extend.c:208:    if (index_ptr == range_stop_ptr) { // index_ptr could also end above range
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 4976              		.loc 1 208 7 is_stmt 0 view .LVU1400
 4977 1a13 4939C5   		cmp	r13, rax	# range_stop_ptr, index_ptr
 4978 1a16 0F84E402 		je	.L424	#,
 4978      0000
 4979              	.LVL416:
 4980              	.L260:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 4981              		.loc 1 208 7 view .LVU1401
 4982              	.LBE507:
 4983              	.LBE509:
 4984              	.LBE504:
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4985              		.loc 1 304 54 is_stmt 1 view .LVU1402
 4986              	# sieve_extend.c:304:         for (register counter_t index = range_start; index <= range_stop_uniq
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4987              		.loc 1 304 9 is_stmt 0 view .LVU1403
 4988 1a1c 4939F1   		cmp	r9, rsi	# tmp797, index
 4989 1a1f 0F837BFF 		jnb	.L261	#,
 4989      FFFF
 4990              	.LVL417:
 4991              	.L252:
 304:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 4992              		.loc 1 304 9 view .LVU1404
 4993              	.LBE503:
 4994              	.LBE514:
 4995              	.LBE528:
GAS LISTING /tmp/ccrNbbzt.s 			page 142


 926:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 4996              		.loc 1 926 9 is_stmt 1 view .LVU1405
 4997              	.LBB529:
 4998              	.LBI529:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 4999              		.loc 1 120 25 view .LVU1406
 5000              	.LBB530:
 121:sieve_extend.c ****     return index;
 5001              		.loc 1 121 5 view .LVU1407
 121:sieve_extend.c ****     return index;
 5002              		.loc 1 121 11 view .LVU1408
 5003              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5004              		.loc 1 121 21 is_stmt 0 view .LVU1409
 5005 1a25 4C89D8   		mov	rax, r11	# tmp798, _325
 5006 1a28 48C1E806 		shr	rax, 6	# tmp798,
 5007              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5008              		.loc 1 121 12 view .LVU1410
 5009 1a2c 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_1121, *_1121
 5010              	.LBE530:
 5011              	.LBE529:
 5012              	# sieve_extend.c:924:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 924:sieve_extend.c ****         setBitsTrue_mediumStep(bitarray, start, step, block_stop);
 5013              		.loc 1 924 35 view .LVU1411
 5014 1a30 4C89D9   		mov	rcx, r11	# index, _325
 5015              	.LBB532:
 5016              	.LBB531:
 5017              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5018              		.loc 1 121 11 view .LVU1412
 5019 1a33 4C0FA3D8 		bt	rax, r11	# *_1121, _325
 5020 1a37 731B     		jnc	.L251	#,
 5021              	.LVL418:
 5022 1a39 0F1F8000 		.p2align 4,,10
 5022      000000
 5023              		.p2align 3
 5024              	.L250:
 121:sieve_extend.c ****     return index;
 5025              		.loc 1 121 58 is_stmt 1 view .LVU1413
 5026              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5027              		.loc 1 121 63 is_stmt 0 view .LVU1414
 5028 1a40 48FFC1   		inc	rcx	# index
 5029              	.LVL419:
 121:sieve_extend.c ****     return index;
 5030              		.loc 1 121 11 is_stmt 1 view .LVU1415
 5031              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5032              		.loc 1 121 21 is_stmt 0 view .LVU1416
 5033 1a43 4889C8   		mov	rax, rcx	# tmp825, index
 5034 1a46 48C1E806 		shr	rax, 6	# tmp825,
 5035              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5036              		.loc 1 121 12 view .LVU1417
 5037 1a4a 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_335, *_335
 5038              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
GAS LISTING /tmp/ccrNbbzt.s 			page 143


 121:sieve_extend.c ****     return index;
 5039              		.loc 1 121 11 view .LVU1418
 5040 1a4e 480FA3C8 		bt	rax, rcx	# *_335, index
 5041 1a52 72EC     		jc	.L250	#,
 5042              	.L251:
 122:sieve_extend.c **** }
 5043              		.loc 1 122 5 is_stmt 1 view .LVU1419
 5044              	.LVL420:
 122:sieve_extend.c **** }
 5045              		.loc 1 122 5 is_stmt 0 view .LVU1420
 5046              	.LBE531:
 5047              	.LBE532:
 927:sieve_extend.c ****     }
 5048              		.loc 1 927 9 is_stmt 1 view .LVU1421
 5049              	# sieve_extend.c:927:         start = prime * prime * 2 + prime * 2;
 927:sieve_extend.c ****     }
 5050              		.loc 1 927 35 is_stmt 0 view .LVU1422
 5051 1a54 488D7101 		lea	rsi, 1[rcx]	# _433,
 5052              	# sieve_extend.c:927:         start = prime * prime * 2 + prime * 2;
 927:sieve_extend.c ****     }
 5053              		.loc 1 927 15 view .LVU1423
 5054 1a58 480FAFF1 		imul	rsi, rcx	# tmp831, index
 5055 1a5c 4801F6   		add	rsi, rsi	# index
 5056              	.LVL421:
 921:sieve_extend.c ****         step  = prime * 2 + 1;
 5057              		.loc 1 921 11 is_stmt 1 view .LVU1424
 5058 1a5f 4939F4   		cmp	r12, rsi	# block_stop, index
 5059 1a62 0F8248FE 		jb	.L396	#,
 5059      FFFF
 922:sieve_extend.c ****         if (step > MEDIUMSTEP_FASTER) break;
 5060              		.loc 1 922 9 view .LVU1425
 5061              	# sieve_extend.c:922:         step  = prime * 2 + 1;
 922:sieve_extend.c ****         if (step > MEDIUMSTEP_FASTER) break;
 5062              		.loc 1 922 15 is_stmt 0 view .LVU1426
 5063 1a68 4C8D4409 		lea	r8, 1[rcx+rcx]	# step,
 5063      01
 5064              	.LVL422:
 923:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5065              		.loc 1 923 9 is_stmt 1 view .LVU1427
 5066              	# sieve_extend.c:923:         if (step > MEDIUMSTEP_FASTER) break;
 923:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5067              		.loc 1 923 12 is_stmt 0 view .LVU1428
 5068 1a6d 4C3B0500 		cmp	r8, QWORD PTR global_MEDIUMSTEP_FASTER[rip]	# step, global_MEDIUMSTEP_FASTER
 5068      000000
 5069 1a74 0F86B6FE 		jbe	.L242	#,
 5069      FFFF
 5070              	.L422:
 932:sieve_extend.c ****         step  = prime * 2 + 1;
 5071              		.loc 1 932 11 is_stmt 1 view .LVU1429
 5072 1a7a 4939F4   		cmp	r12, rsi	# block_stop, index
 5073 1a7d 0F822DFE 		jb	.L396	#,
 5073      FFFF
 933:sieve_extend.c ****         if (step > 64) break;
 5074              		.loc 1 933 9 view .LVU1430
 934:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5075              		.loc 1 934 9 view .LVU1431
 5076 1a83 488D6901 		lea	rbp, 1[rcx]	# _433,
GAS LISTING /tmp/ccrNbbzt.s 			page 144


 5077              	# sieve_extend.c:934:         if (step > 64) break;
 934:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5078              		.loc 1 934 12 is_stmt 0 view .LVU1432
 5079 1a87 4983F840 		cmp	r8, 64	# step,
 5080 1a8b 0F87A800 		ja	.L398	#,
 5080      0000
 5081              		.p2align 4,,10
 5082 1a91 0F1F8000 		.p2align 3
 5082      000000
 5083              	.L244:
 935:sieve_extend.c ****         start1 = start; // save value
 5084              		.loc 1 935 9 is_stmt 1 view .LVU1433
 5085              	# sieve_extend.c:935:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 935:sieve_extend.c ****         start1 = start; // save value
 5086              		.loc 1 935 35 is_stmt 0 view .LVU1434
 5087 1a98 4889EF   		mov	rdi, rbp	# index, _433
 5088              	# sieve_extend.c:935:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 935:sieve_extend.c ****         start1 = start; // save value
 5089              		.loc 1 935 12 view .LVU1435
 5090 1a9b 4C39F5   		cmp	rbp, r14	# _433, block_start
 5091 1a9e 7710     		ja	.L263	#,
 935:sieve_extend.c ****         start1 = start; // save value
 5092              		.loc 1 935 41 is_stmt 1 view .LVU1436
 5093              	# sieve_extend.c:935:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 935:sieve_extend.c ****         start1 = start; // save value
 5094              		.loc 1 935 61 is_stmt 0 view .LVU1437
 5095 1aa0 4A8D0431 		lea	rax, [rcx+r14]	# _349,
 5096              	# sieve_extend.c:935:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 935:sieve_extend.c ****         start1 = start; // save value
 5097              		.loc 1 935 102 view .LVU1438
 5098 1aa4 31D2     		xor	edx, edx	# tmp834
 5099              	# sieve_extend.c:935:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 935:sieve_extend.c ****         start1 = start; // save value
 5100              		.loc 1 935 69 view .LVU1439
 5101 1aa6 488D3408 		lea	rsi, [rax+rcx]	# tmp832,
 5102              	.LVL423:
 5103              	# sieve_extend.c:935:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 935:sieve_extend.c ****         start1 = start; // save value
 5104              		.loc 1 935 102 view .LVU1440
 5105 1aaa 49F7F0   		div	r8	# step
 5106              	# sieve_extend.c:935:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 935:sieve_extend.c ****         start1 = start; // save value
 5107              		.loc 1 935 47 view .LVU1441
 5108 1aad 4829D6   		sub	rsi, rdx	# index, tmp834
 5109              	.LVL424:
 5110              	.L263:
 936:sieve_extend.c ****         step1 = step; // save value
 5111              		.loc 1 936 9 is_stmt 1 view .LVU1442
 937:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 5112              		.loc 1 937 9 view .LVU1443
 938:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 5113              		.loc 1 938 9 view .LVU1444
 5114              	.LBB533:
 5115              	.LBI533:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 5116              		.loc 1 120 25 view .LVU1445
 5117              	.LBB534:
GAS LISTING /tmp/ccrNbbzt.s 			page 145


 121:sieve_extend.c ****     return index;
 5118              		.loc 1 121 5 view .LVU1446
 121:sieve_extend.c ****     return index;
 5119              		.loc 1 121 11 view .LVU1447
 5120              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5121              		.loc 1 121 21 is_stmt 0 view .LVU1448
 5122 1ab0 4889E8   		mov	rax, rbp	# tmp836, _433
 5123 1ab3 48C1E806 		shr	rax, 6	# tmp836,
 5124              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5125              		.loc 1 121 12 view .LVU1449
 5126 1ab7 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_6, *_6
 5127              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5128              		.loc 1 121 11 view .LVU1450
 5129 1abb 480FA3E8 		bt	rax, rbp	# *_6, _433
 5130 1abf 731B     		jnc	.L264	#,
 5131              		.p2align 4,,10
 5132 1ac1 0F1F8000 		.p2align 3
 5132      000000
 5133              	.L265:
 121:sieve_extend.c ****     return index;
 5134              		.loc 1 121 58 is_stmt 1 view .LVU1451
 5135              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5136              		.loc 1 121 63 is_stmt 0 view .LVU1452
 5137 1ac8 48FFC7   		inc	rdi	# index
 5138              	.LVL425:
 121:sieve_extend.c ****     return index;
 5139              		.loc 1 121 11 is_stmt 1 view .LVU1453
 5140              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5141              		.loc 1 121 21 is_stmt 0 view .LVU1454
 5142 1acb 4889F8   		mov	rax, rdi	# tmp841, index
 5143 1ace 48C1E806 		shr	rax, 6	# tmp841,
 5144              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5145              		.loc 1 121 12 view .LVU1455
 5146 1ad2 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_357, *_357
 5147              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5148              		.loc 1 121 11 view .LVU1456
 5149 1ad6 480FA3F8 		bt	rax, rdi	# *_357, index
 5150 1ada 72EC     		jc	.L265	#,
 5151              	.L264:
 122:sieve_extend.c **** }
 5152              		.loc 1 122 5 is_stmt 1 view .LVU1457
 5153              	.LVL426:
 122:sieve_extend.c **** }
 5154              		.loc 1 122 5 is_stmt 0 view .LVU1458
 5155              	.LBE534:
 5156              	.LBE533:
 939:sieve_extend.c ****         step  = prime * 2 + 1;
 5157              		.loc 1 939 9 is_stmt 1 view .LVU1459
 5158 1adc 488D043F 		lea	rax, [rdi+rdi]	# _1073,
 5159              	# sieve_extend.c:939:         start = prime * prime * 2 + prime * 2;
GAS LISTING /tmp/ccrNbbzt.s 			page 146


 939:sieve_extend.c ****         step  = prime * 2 + 1;
 5160              		.loc 1 939 35 is_stmt 0 view .LVU1460
 5161 1ae0 488D4F01 		lea	rcx, 1[rdi]	# index,
 5162              	.LVL427:
 940:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5163              		.loc 1 940 9 is_stmt 1 view .LVU1461
 5164              	# sieve_extend.c:940:         step  = prime * 2 + 1;
 940:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5165              		.loc 1 940 15 is_stmt 0 view .LVU1462
 5166 1ae4 4C8D4801 		lea	r9, 1[rax]	# step,
 5167              	.LVL428:
 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5168              		.loc 1 941 9 is_stmt 1 view .LVU1463
 5169              	# sieve_extend.c:941:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5170              		.loc 1 941 12 is_stmt 0 view .LVU1464
 5171 1ae8 4C39F1   		cmp	rcx, r14	# index, block_start
 5172 1aeb 0F867702 		jbe	.L266	#,
 5172      0000
 5173              	# sieve_extend.c:939:         start = prime * prime * 2 + prime * 2;
 939:sieve_extend.c ****         step  = prime * 2 + 1;
 5174              		.loc 1 939 15 view .LVU1465
 5175 1af1 480FAFC1 		imul	rax, rcx	# index2, index
 5176              	.LVL429:
 942:sieve_extend.c **** //        else                     setBitsTrue_smallRange(bitarray, start1, step1, block_stop);
 5177              		.loc 1 942 9 is_stmt 1 view .LVU1466
 5178              	# sieve_extend.c:942:         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, st
 942:sieve_extend.c **** //        else                     setBitsTrue_smallRange(bitarray, start1, step1, block_stop);
 5179              		.loc 1 942 12 is_stmt 0 view .LVU1467
 5180 1af5 4939C4   		cmp	r12, rax	# block_stop, index2
 5181 1af8 7209     		jb	.L268	#,
 5182 1afa E9840200 		jmp	.L425	#
 5182      00
 5183              	.LVL430:
 5184 1aff 90       		.p2align 4,,10
 5185              		.p2align 3
 5186              	.L426:
 5187              	.LBB535:
 5188              	.LBB536:
 121:sieve_extend.c ****     return index;
 5189              		.loc 1 121 58 is_stmt 1 view .LVU1468
 5190              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5191              		.loc 1 121 63 is_stmt 0 view .LVU1469
 5192 1b00 48FFC1   		inc	rcx	# index
 5193              	.LVL431:
 121:sieve_extend.c ****     return index;
 5194              		.loc 1 121 11 is_stmt 1 view .LVU1470
 5195              	.L268:
 121:sieve_extend.c ****     return index;
 5196              		.loc 1 121 11 is_stmt 0 view .LVU1471
 5197              	.LBE536:
 5198              	.LBE535:
 944:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 5199              		.loc 1 944 9 is_stmt 1 view .LVU1472
 5200              	.LBB538:
 5201              	.LBI535:
GAS LISTING /tmp/ccrNbbzt.s 			page 147


 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 5202              		.loc 1 120 25 view .LVU1473
 5203              	.LBB537:
 121:sieve_extend.c ****     return index;
 5204              		.loc 1 121 5 view .LVU1474
 121:sieve_extend.c ****     return index;
 5205              		.loc 1 121 11 view .LVU1475
 5206              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5207              		.loc 1 121 21 is_stmt 0 view .LVU1476
 5208 1b03 4889C8   		mov	rax, rcx	# tmp875, index
 5209 1b06 48C1E806 		shr	rax, 6	# tmp875,
 5210              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5211              		.loc 1 121 12 view .LVU1477
 5212 1b0a 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_703,* _30
 5213              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5214              		.loc 1 121 11 view .LVU1478
 5215 1b0e 480FA3C8 		bt	rax, rcx	# *_703, index
 5216 1b12 72EC     		jc	.L426	#,
 122:sieve_extend.c **** }
 5217              		.loc 1 122 5 is_stmt 1 view .LVU1479
 5218              	.LVL432:
 122:sieve_extend.c **** }
 5219              		.loc 1 122 5 is_stmt 0 view .LVU1480
 5220              	.LBE537:
 5221              	.LBE538:
 945:sieve_extend.c ****     }
 5222              		.loc 1 945 9 is_stmt 1 view .LVU1481
 5223              	# sieve_extend.c:945:         start = prime * prime * 2 + prime * 2;
 945:sieve_extend.c ****     }
 5224              		.loc 1 945 35 is_stmt 0 view .LVU1482
 5225 1b14 488D6901 		lea	rbp, 1[rcx]	# _433,
 5226 1b18 4C8D0409 		lea	r8, [rcx+rcx]	# _1075,
 5227              	.LVL433:
 5228              	# sieve_extend.c:945:         start = prime * prime * 2 + prime * 2;
 945:sieve_extend.c ****     }
 5229              		.loc 1 945 15 view .LVU1483
 5230 1b1c 4889EE   		mov	rsi, rbp	# index, _433
 5231 1b1f 490FAFF0 		imul	rsi, r8	# index, _1075
 5232              	.LVL434:
 932:sieve_extend.c ****         step  = prime * 2 + 1;
 5233              		.loc 1 932 11 is_stmt 1 view .LVU1484
 5234 1b23 4939F4   		cmp	r12, rsi	# block_stop, index
 5235 1b26 0F8284FD 		jb	.L396	#,
 5235      FFFF
 933:sieve_extend.c ****         if (step > 64) break;
 5236              		.loc 1 933 9 view .LVU1485
 5237              	# sieve_extend.c:933:         step  = prime * 2 + 1;
 933:sieve_extend.c ****         if (step > 64) break;
 5238              		.loc 1 933 15 is_stmt 0 view .LVU1486
 5239 1b2c 49FFC0   		inc	r8	# step
 5240              	.LVL435:
 934:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5241              		.loc 1 934 9 is_stmt 1 view .LVU1487
 5242              	# sieve_extend.c:934:         if (step > 64) break;
GAS LISTING /tmp/ccrNbbzt.s 			page 148


 934:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5243              		.loc 1 934 12 is_stmt 0 view .LVU1488
 5244 1b2f 4983F840 		cmp	r8, 64	# step,
 5245 1b33 0F865FFF 		jbe	.L244	#,
 5245      FFFF
 5246              	.L398:
 950:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5247              		.loc 1 950 9 is_stmt 1 view .LVU1489
 5248              	# sieve_extend.c:950:         if (step > WORD_SIZE_counter * 4) break;
 950:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5249              		.loc 1 950 12 is_stmt 0 view .LVU1490
 5250 1b39 4981F800 		cmp	r8, 256	# step,
 5250      010000
 5251 1b40 777E     		ja	.L311	#,
 5252              		.p2align 4,,10
 5253 1b42 660F1F44 		.p2align 3
 5253      0000
 5254              	.L427:
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5255              		.loc 1 951 9 is_stmt 1 view .LVU1491
 5256              	# sieve_extend.c:951:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5257              		.loc 1 951 12 is_stmt 0 view .LVU1492
 5258 1b48 4C39F5   		cmp	rbp, r14	# _433, block_start
 5259 1b4b 7710     		ja	.L284	#,
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5260              		.loc 1 951 41 is_stmt 1 view .LVU1493
 5261              	# sieve_extend.c:951:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5262              		.loc 1 951 61 is_stmt 0 view .LVU1494
 5263 1b4d 4A8D0431 		lea	rax, [rcx+r14]	# _392,
 5264              	# sieve_extend.c:951:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5265              		.loc 1 951 102 view .LVU1495
 5266 1b51 31D2     		xor	edx, edx	# tmp888
 5267              	# sieve_extend.c:951:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5268              		.loc 1 951 69 view .LVU1496
 5269 1b53 488D3408 		lea	rsi, [rax+rcx]	# tmp886,
 5270              	.LVL436:
 5271              	# sieve_extend.c:951:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5272              		.loc 1 951 102 view .LVU1497
 5273 1b57 49F7F0   		div	r8	# step
 5274              	# sieve_extend.c:951:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5275              		.loc 1 951 47 view .LVU1498
 5276 1b5a 4829D6   		sub	rsi, rdx	# index, tmp888
 5277              	.LVL437:
 5278              	.L284:
 952:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 5279              		.loc 1 952 9 is_stmt 1 view .LVU1499
 5280 1b5d 4C89E1   		mov	rcx, r12	#, block_stop
 5281              	.LVL438:
 952:sieve_extend.c ****         prime = searchBitFalse(bitarray, prime+1 );
 5282              		.loc 1 952 9 is_stmt 0 view .LVU1500
 5283 1b60 4C89C2   		mov	rdx, r8	#, step
GAS LISTING /tmp/ccrNbbzt.s 			page 149


 5284 1b63 4889DF   		mov	rdi, rbx	#, _30
 5285 1b66 E895E4FF 		call	setBitsTrue_largeRange_vector	#
 5285      FF
 5286              	.LVL439:
 953:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 5287              		.loc 1 953 9 is_stmt 1 view .LVU1501
 5288              	.LBB539:
 5289              	.LBI539:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 5290              		.loc 1 120 25 view .LVU1502
 5291              	.LBB540:
 121:sieve_extend.c ****     return index;
 5292              		.loc 1 121 5 view .LVU1503
 121:sieve_extend.c ****     return index;
 5293              		.loc 1 121 11 view .LVU1504
 5294              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5295              		.loc 1 121 21 is_stmt 0 view .LVU1505
 5296 1b6b 4889E8   		mov	rax, rbp	# tmp890, _433
 5297 1b6e 48C1E806 		shr	rax, 6	# tmp890,
 5298              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5299              		.loc 1 121 12 view .LVU1506
 5300 1b72 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_459, *_459
 5301              	.LBE540:
 5302              	.LBE539:
 5303              	# sieve_extend.c:951:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 951:sieve_extend.c ****         setBitsTrue_largeRange_vector(bitarray, start, step, block_stop);
 5304              		.loc 1 951 35 view .LVU1507
 5305 1b76 4889E9   		mov	rcx, rbp	# index, _433
 5306              	.LBB542:
 5307              	.LBB541:
 5308              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5309              		.loc 1 121 11 view .LVU1508
 5310 1b79 480FA3E8 		bt	rax, rbp	# *_459, _433
 5311 1b7d 7315     		jnc	.L285	#,
 5312              	.LVL440:
 5313 1b7f 90       		.p2align 4,,10
 5314              		.p2align 3
 5315              	.L286:
 121:sieve_extend.c ****     return index;
 5316              		.loc 1 121 58 is_stmt 1 view .LVU1509
 5317              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5318              		.loc 1 121 63 is_stmt 0 view .LVU1510
 5319 1b80 48FFC1   		inc	rcx	# index
 5320              	.LVL441:
 121:sieve_extend.c ****     return index;
 5321              		.loc 1 121 11 is_stmt 1 view .LVU1511
 5322              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5323              		.loc 1 121 21 is_stmt 0 view .LVU1512
 5324 1b83 4889C8   		mov	rax, rcx	# tmp895, index
 5325 1b86 48C1E806 		shr	rax, 6	# tmp895,
 5326              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
GAS LISTING /tmp/ccrNbbzt.s 			page 150


 5327              		.loc 1 121 12 view .LVU1513
 5328 1b8a 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_401, *_401
 5329              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 5330              		.loc 1 121 11 view .LVU1514
 5331 1b8e 480FA3C8 		bt	rax, rcx	# *_401, index
 5332 1b92 72EC     		jc	.L286	#,
 5333              	.L285:
 122:sieve_extend.c **** }
 5334              		.loc 1 122 5 is_stmt 1 view .LVU1515
 5335              	.LVL442:
 122:sieve_extend.c **** }
 5336              		.loc 1 122 5 is_stmt 0 view .LVU1516
 5337              	.LBE541:
 5338              	.LBE542:
 954:sieve_extend.c ****     }
 5339              		.loc 1 954 9 is_stmt 1 view .LVU1517
 5340              	# sieve_extend.c:954:         start = prime * prime * 2 + prime * 2;
 954:sieve_extend.c ****     }
 5341              		.loc 1 954 35 is_stmt 0 view .LVU1518
 5342 1b94 488D6901 		lea	rbp, 1[rcx]	# _433,
 5343 1b98 4C8D0409 		lea	r8, [rcx+rcx]	# _1079,
 5344              	# sieve_extend.c:954:         start = prime * prime * 2 + prime * 2;
 954:sieve_extend.c ****     }
 5345              		.loc 1 954 15 view .LVU1519
 5346 1b9c 4889EE   		mov	rsi, rbp	# index, _433
 5347 1b9f 490FAFF0 		imul	rsi, r8	# index, _1079
 5348              	.LVL443:
 948:sieve_extend.c ****         step  = prime * 2 + 1;
 5349              		.loc 1 948 11 is_stmt 1 view .LVU1520
 5350 1ba3 4939F4   		cmp	r12, rsi	# block_stop, index
 5351 1ba6 0F8204FD 		jb	.L396	#,
 5351      FFFF
 949:sieve_extend.c ****         if (step > WORD_SIZE_counter * 4) break;
 5352              		.loc 1 949 9 view .LVU1521
 5353              	# sieve_extend.c:949:         step  = prime * 2 + 1;
 949:sieve_extend.c ****         if (step > WORD_SIZE_counter * 4) break;
 5354              		.loc 1 949 15 is_stmt 0 view .LVU1522
 5355 1bac 49FFC0   		inc	r8	# step
 5356              	.LVL444:
 950:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5357              		.loc 1 950 9 is_stmt 1 view .LVU1523
 5358              	# sieve_extend.c:950:         if (step > WORD_SIZE_counter * 4) break;
 950:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5359              		.loc 1 950 12 is_stmt 0 view .LVU1524
 5360 1baf 4981F800 		cmp	r8, 256	# step,
 5360      010000
 5361 1bb6 7690     		jbe	.L427	#,
 5362              	.LVL445:
 5363 1bb8 0F1F8400 		.p2align 4,,10
 5363      00000000 
 5364              		.p2align 3
 5365              	.L311:
 958:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 5366              		.loc 1 958 9 is_stmt 1 view .LVU1525
 5367              	# sieve_extend.c:958:         step  = prime * 2 + 1;
 958:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
GAS LISTING /tmp/ccrNbbzt.s 			page 151


 5368              		.loc 1 958 15 is_stmt 0 view .LVU1526
 5369 1bc0 4C8D4C09 		lea	r9, 1[rcx+rcx]	# step,
 5369      01
 5370              	.LVL446:
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5371              		.loc 1 959 9 is_stmt 1 view .LVU1527
 5372              	# sieve_extend.c:959:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5373              		.loc 1 959 12 is_stmt 0 view .LVU1528
 5374 1bc5 4C39F5   		cmp	rbp, r14	# _433, block_start
 5375 1bc8 7710     		ja	.L288	#,
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5376              		.loc 1 959 41 is_stmt 1 view .LVU1529
 5377              	# sieve_extend.c:959:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5378              		.loc 1 959 61 is_stmt 0 view .LVU1530
 5379 1bca 4A8D0431 		lea	rax, [rcx+r14]	# _415,
 5380              	# sieve_extend.c:959:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5381              		.loc 1 959 102 view .LVU1531
 5382 1bce 31D2     		xor	edx, edx	# tmp904
 5383              	# sieve_extend.c:959:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5384              		.loc 1 959 69 view .LVU1532
 5385 1bd0 488D3408 		lea	rsi, [rax+rcx]	# tmp902,
 5386              	.LVL447:
 5387              	# sieve_extend.c:959:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5388              		.loc 1 959 102 view .LVU1533
 5389 1bd4 49F7F1   		div	r9	# step
 5390              	# sieve_extend.c:959:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 959:sieve_extend.c ****         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 5391              		.loc 1 959 47 view .LVU1534
 5392 1bd7 4829D6   		sub	rsi, rdx	# index, tmp904
 5393              	.LVL448:
 5394              	.L288:
 960:sieve_extend.c ****         setBitsTrue_largeRange(bitarray, start, step, block_stop);
 5395              		.loc 1 960 9 is_stmt 1 view .LVU1535
 5396              	# sieve_extend.c:960:         if unlikely(start + step * WORD_SIZE_counter > block_stop) break;
 960:sieve_extend.c ****         setBitsTrue_largeRange(bitarray, start, step, block_stop);
 5397              		.loc 1 960 12 is_stmt 0 view .LVU1536
 5398 1bda 4C89C8   		mov	rax, r9	# tmp906, step
 5399 1bdd 48C1E006 		sal	rax, 6	# tmp906,
 5400 1be1 4801F0   		add	rax, rsi	# tmp906, index
 5401 1be4 4989C3   		mov	r11, rax	# tmp907, tmp906
 5402 1be7 0F92C0   		setc	al	#, _507
 5403 1bea 0FB6C0   		movzx	eax, al	# _507, _507
 5404 1bed 4D39DC   		cmp	r12, r11	# block_stop, tmp907
 5405 1bf0 0F82AA02 		jb	.L400	#,
 5405      0000
 5406              	.LVL449:
 5407              	.LBB543:
 5408              	.LBB544:
 5409              	.LBB545:
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 5410              		.loc 1 402 50 is_stmt 1 view .LVU1537
 5411              	# sieve_extend.c:402:     for (register counter_t index = range_start; index <= range_stop_unique; 
GAS LISTING /tmp/ccrNbbzt.s 			page 152


 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 5412              		.loc 1 402 5 is_stmt 0 view .LVU1538
 5413 1bf6 4885C0   		test	rax, rax	# _507
 5414 1bf9 0F859D00 		jne	.L302	#,
 5414      0000
 5415              	.LBB546:
 5416              	.LBB547:
 5417              	.LBB548:
 5418              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 5419              		.loc 1 185 107 view .LVU1539
 5420 1bff 488B7C24 		mov	rdi, QWORD PTR 16[rsp]	# range_stop_word, %sfp
 5420      10
 5421              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 5422              		.loc 1 185 84 view .LVU1540
 5423 1c04 4F8D0489 		lea	r8, [r9+r9*4]	# tmp917,
 5424              	# sieve_extend.c:185:    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_wor
 185:sieve_extend.c **** 
 5425              		.loc 1 185 107 view .LVU1541
 5426 1c08 4889F8   		mov	rax, rdi	# tmp919, range_stop_word
 5427 1c0b 4C29C0   		sub	rax, r8	# tmp919, tmp917
 5428 1c0e 4C8D14C3 		lea	r10, [rbx+rax*8]	# tmp921,
 5429 1c12 4C39C7   		cmp	rdi, r8	# range_stop_word, tmp917
 5430 1c15 4C89C8   		mov	rax, r9	# _1783, step
 5431 1c18 4C0F46D3 		cmovbe	r10, rbx	# _30,, prephitmp_1794
 5432 1c1c 48C1E004 		sal	rax, 4	# _1783,
 5433 1c20 48894424 		mov	QWORD PTR 8[rsp], rax	# %sfp, _1783
 5433      08
 5434              	# sieve_extend.c:191:        index_ptr+=step;
 191:sieve_extend.c ****        *index_ptr |= mask;
 5435              		.loc 1 191 17 view .LVU1542
 5436 1c25 4A8D0CCD 		lea	rcx, 0[0+r9*8]	# _722,
 5436      00000000 
 5437              	.LVL450:
 191:sieve_extend.c ****        *index_ptr |= mask;
 5438              		.loc 1 191 17 view .LVU1543
 5439 1c2d 49C1E003 		sal	r8, 3	# tmp925,
 5440              	.LVL451:
 5441              		.p2align 4,,10
 5442 1c31 0F1F8000 		.p2align 3
 5442      000000
 5443              	.L301:
 191:sieve_extend.c ****        *index_ptr |= mask;
 5444              		.loc 1 191 17 view .LVU1544
 5445              	.LBE548:
 5446              	.LBE547:
 403:sieve_extend.c ****         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 5447              		.loc 1 403 9 is_stmt 1 view .LVU1545
 5448              	# sieve_extend.c:404:         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 404:sieve_extend.c ****     }
 5449              		.loc 1 404 9 is_stmt 0 view .LVU1546
 5450 1c38 4889F0   		mov	rax, rsi	# tmp928, index
 5451 1c3b 48C1E806 		shr	rax, 6	# tmp928,
 5452              	.LBB552:
 5453              	.LBB549:
 5454              	# sieve_extend.c:184:    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(
GAS LISTING /tmp/ccrNbbzt.s 			page 153


 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 5455              		.loc 1 184 78 view .LVU1547
 5456 1c3f 488D04C3 		lea	rax, [rbx+rax*8]	# index_ptr,
 5457              	.LBE549:
 5458              	.LBE552:
 5459              	# sieve_extend.c:403:         register bitword_t mask = markmask(index);
 403:sieve_extend.c ****         applyMask(bitarray, step, range_stop, mask, wordindex(index));
 5460              		.loc 1 403 28 view .LVU1548
 5461 1c43 C4C2C9F7 		shlx	rdx, r15, rsi	# mask, tmp983, index
 5461      D7
 5462              	.LVL452:
 404:sieve_extend.c ****     }
 5463              		.loc 1 404 9 is_stmt 1 view .LVU1549
 5464              	.LBB553:
 5465              	.LBI547:
 151:sieve_extend.c **** //#if __APPLE__
 5466              		.loc 1 151 20 view .LVU1550
 5467              	.LBB550:
 183:sieve_extend.c ****    register bitword_t* __restrict index_ptr      =  __builtin_assume_aligned(&bitarray[index_word],
 5468              		.loc 1 183 4 view .LVU1551
 184:sieve_extend.c ****    register bitword_t* __restrict fast_loop_ptr  = &bitarray[((range_stop_word>step*5) ? (range_sto
 5469              		.loc 1 184 4 view .LVU1552
 185:sieve_extend.c **** 
 5470              		.loc 1 185 4 view .LVU1553
 189:sieve_extend.c ****        *index_ptr |= mask;
 5471              		.loc 1 189 4 view .LVU1554
 189:sieve_extend.c ****        *index_ptr |= mask;
 5472              		.loc 1 189 10 view .LVU1555
 5473 1c48 4C39D0   		cmp	rax, r10	# index_ptr, prephitmp_1794
 5474 1c4b 7339     		jnb	.L399	#,
 189:sieve_extend.c ****        *index_ptr |= mask;
 5475              		.loc 1 189 10 is_stmt 0 view .LVU1556
 5476 1c4d 488B7C24 		mov	rdi, QWORD PTR 8[rsp]	# _1783, %sfp
 5476      08
 5477 1c52 4801C7   		add	rdi, rax	# ivtmp.454, index_ptr
 5478              		.p2align 4,,10
 5479 1c55 0F1F00   		.p2align 3
 5480              	.L297:
 190:sieve_extend.c ****        index_ptr+=step;
 5481              		.loc 1 190 8 is_stmt 1 view .LVU1557
 5482              	# sieve_extend.c:190:        *index_ptr |= mask;
 190:sieve_extend.c ****        index_ptr+=step;
 5483              		.loc 1 190 19 is_stmt 0 view .LVU1558
 5484 1c58 480910   		or	QWORD PTR [rax], rdx	# MEM[base: index_ptr_1033, offset: 0B], mask
 191:sieve_extend.c ****        *index_ptr |= mask;
 5485              		.loc 1 191 8 is_stmt 1 view .LVU1559
 5486              	.LVL453:
 192:sieve_extend.c ****        index_ptr+=step;
 5487              		.loc 1 192 8 view .LVU1560
 5488              	# sieve_extend.c:192:        *index_ptr |= mask;
 192:sieve_extend.c ****        index_ptr+=step;
 5489              		.loc 1 192 19 is_stmt 0 view .LVU1561
 5490 1c5b 48091408 		or	QWORD PTR [rax+rcx], rdx	# MEM[base: index_ptr_1033, index: _722, offset: 0B], mask
 193:sieve_extend.c ****        *index_ptr |= mask;
 5491              		.loc 1 193 8 is_stmt 1 view .LVU1562
 5492              	.LVL454:
 194:sieve_extend.c ****        index_ptr+=step;
GAS LISTING /tmp/ccrNbbzt.s 			page 154


 5493              		.loc 1 194 8 view .LVU1563
 5494              	# sieve_extend.c:194:        *index_ptr |= mask;
 194:sieve_extend.c ****        index_ptr+=step;
 5495              		.loc 1 194 19 is_stmt 0 view .LVU1564
 5496 1c5f 480917   		or	QWORD PTR [rdi], rdx	# MEM[base: _1777, offset: 0B], mask
 195:sieve_extend.c ****        *index_ptr |= mask;
 5497              		.loc 1 195 8 is_stmt 1 view .LVU1565
 5498              	.LVL455:
 196:sieve_extend.c ****        index_ptr+=step;
 5499              		.loc 1 196 8 view .LVU1566
 5500              	# sieve_extend.c:196:        *index_ptr |= mask;
 196:sieve_extend.c ****        index_ptr+=step;
 5501              		.loc 1 196 19 is_stmt 0 view .LVU1567
 5502 1c62 4809140F 		or	QWORD PTR [rdi+rcx], rdx	# MEM[base: _1777, index: _722, offset: 0B], mask
 197:sieve_extend.c ****        *index_ptr |= mask;
 5503              		.loc 1 197 8 is_stmt 1 view .LVU1568
 5504              	.LVL456:
 198:sieve_extend.c ****        index_ptr+=step;
 5505              		.loc 1 198 8 view .LVU1569
 5506 1c66 4C01C7   		add	rdi, r8	# ivtmp.454, tmp925
 5507              	# sieve_extend.c:198:        *index_ptr |= mask;
 198:sieve_extend.c ****        index_ptr+=step;
 5508              		.loc 1 198 19 is_stmt 0 view .LVU1570
 5509 1c69 48091488 		or	QWORD PTR [rax+rcx*4], rdx	# MEM[base: index_ptr_1033, index: _722, step: 4, offset: 0B], mask
 199:sieve_extend.c ****    }
 5510              		.loc 1 199 8 is_stmt 1 view .LVU1571
 5511 1c6d 4C01C0   		add	rax, r8	# index_ptr, tmp925
 5512              	.LVL457:
 189:sieve_extend.c ****        *index_ptr |= mask;
 5513              		.loc 1 189 10 view .LVU1572
 5514 1c70 4C39D0   		cmp	rax, r10	# index_ptr, prephitmp_1794
 5515 1c73 72E3     		jb	.L297	#,
 203:sieve_extend.c ****        *index_ptr |= mask;
 5516              		.loc 1 203 10 view .LVU1573
 5517 1c75 4939C5   		cmp	r13, rax	# range_stop_ptr, index_ptr
 5518 1c78 7611     		jbe	.L428	#,
 5519 1c7a 660F1F44 		.p2align 4,,10
 5519      0000
 5520              		.p2align 3
 5521              	.L299:
 204:sieve_extend.c ****        index_ptr+=step;
 5522              		.loc 1 204 8 view .LVU1574
 5523              	# sieve_extend.c:204:        *index_ptr |= mask;
 204:sieve_extend.c ****        index_ptr+=step;
 5524              		.loc 1 204 19 is_stmt 0 view .LVU1575
 5525 1c80 480910   		or	QWORD PTR [rax], rdx	# MEM[base: index_ptr_906, offset: 0B], mask
 205:sieve_extend.c ****    }
 5526              		.loc 1 205 8 is_stmt 1 view .LVU1576
 5527              	# sieve_extend.c:205:        index_ptr+=step;
 205:sieve_extend.c ****    }
 5528              		.loc 1 205 17 is_stmt 0 view .LVU1577
 5529 1c83 4801C8   		add	rax, rcx	# index_ptr, _722
 5530              	.LVL458:
 5531              	.L399:
 203:sieve_extend.c ****        *index_ptr |= mask;
 5532              		.loc 1 203 10 is_stmt 1 view .LVU1578
 5533 1c86 4939C5   		cmp	r13, rax	# range_stop_ptr, index_ptr
GAS LISTING /tmp/ccrNbbzt.s 			page 155


 5534 1c89 77F5     		ja	.L299	#,
 5535              	.L428:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 5536              		.loc 1 208 4 view .LVU1579
 5537              	# sieve_extend.c:208:    if (index_ptr == range_stop_ptr) { // index_ptr could also end above range
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 5538              		.loc 1 208 7 is_stmt 0 view .LVU1580
 5539 1c8b 4939C5   		cmp	r13, rax	# range_stop_ptr, index_ptr
 5540 1c8e 0F84C400 		je	.L429	#,
 5540      0000
 5541              	.LVL459:
 5542              	.L300:
 208:sieve_extend.c ****       *index_ptr |= (mask & chopmask(range_stop));
 5543              		.loc 1 208 7 view .LVU1581
 5544              	.LBE550:
 5545              	.LBE553:
 5546              	.LBE546:
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 5547              		.loc 1 402 78 is_stmt 1 view .LVU1582
 5548              	# sieve_extend.c:402:     for (register counter_t index = range_start; index <= range_stop_unique; 
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 5549              		.loc 1 402 84 is_stmt 0 view .LVU1583
 5550 1c94 4C01CE   		add	rsi, r9	# index, step
 5551              	.LVL460:
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 5552              		.loc 1 402 50 is_stmt 1 view .LVU1584
 5553              	# sieve_extend.c:402:     for (register counter_t index = range_start; index <= range_stop_unique; 
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 5554              		.loc 1 402 5 is_stmt 0 view .LVU1585
 5555 1c97 4939F3   		cmp	r11, rsi	# tmp907, index
 5556 1c9a 739C     		jnb	.L301	#,
 5557              	.L302:
 5558              	.LVL461:
 402:sieve_extend.c ****         register bitword_t mask = markmask(index);
 5559              		.loc 1 402 5 view .LVU1586
 5560              	.LBE545:
 5561              	.LBE544:
 5562              	.LBE543:
 962:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 5563              		.loc 1 962 9 is_stmt 1 view .LVU1587
 5564              	.LBB558:
 5565              	.LBI558:
 103:sieve_extend.c ****    register counter_t index_word = wordindex(index);
 5566              		.loc 1 103 25 view .LVU1588
 5567              	.LBB559:
 104:sieve_extend.c ****    bitshift_t index_bit  = bitindex_calc(index);
 5568              		.loc 1 104 4 view .LVU1589
 105:sieve_extend.c ****    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bi
 5569              		.loc 1 105 4 view .LVU1590
 5570              	# sieve_extend.c:104:    register counter_t index_word = wordindex(index);
 104:sieve_extend.c ****    bitshift_t index_bit  = bitindex_calc(index);
 5571              		.loc 1 104 23 is_stmt 0 view .LVU1591
 5572 1c9c 4889E8   		mov	rax, rbp	# index_word, _433
 5573 1c9f 48C1E806 		shr	rax, 6	# index_word,
 5574              	.LVL462:
 5575              	# sieve_extend.c:105:    bitshift_t index_bit  = bitindex_calc(index);
 105:sieve_extend.c ****    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bi
GAS LISTING /tmp/ccrNbbzt.s 			page 156


 5576              		.loc 1 105 15 view .LVU1592
 5577 1ca3 4889EA   		mov	rdx, rbp	# index_bit, _433
 5578              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 5579              		.loc 1 106 76 view .LVU1593
 5580 1ca6 488D34C5 		lea	rsi, 0[0+rax*8]	# _681,
 5580      00000000 
 5581              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 5582              		.loc 1 106 89 view .LVU1594
 5583 1cae 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_682, *_682
 5584              	.LVL463:
 5585              	# sieve_extend.c:105:    bitshift_t index_bit  = bitindex_calc(index);
 105:sieve_extend.c ****    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bi
 5586              		.loc 1 105 15 view .LVU1595
 5587 1cb2 83E23F   		and	edx, 63	# index_bit,
 5588              	.LVL464:
 106:sieve_extend.c ****    index += distance;
 5589              		.loc 1 106 4 is_stmt 1 view .LVU1596
 5590              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 5591              		.loc 1 106 89 is_stmt 0 view .LVU1597
 5592 1cb5 C4E2EBF7 		shrx	rax, rax, rdx	# tmp910, *_682, index_bit
 5592      C0
 5593              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 5594              		.loc 1 106 66 view .LVU1598
 5595 1cba 48F7D0   		not	rax	# tmp912
 5596              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 5597              		.loc 1 106 25 view .LVU1599
 5598 1cbd F3480FBC 		tzcnt	rax, rax	# distance, tmp912
 5598      C0
 5599              	.LVL465:
 107:sieve_extend.c ****    distance += index_bit;
 5600              		.loc 1 107 4 is_stmt 1 view .LVU1600
 5601              	# sieve_extend.c:107:    index += distance;
 107:sieve_extend.c ****    distance += index_bit;
 5602              		.loc 1 107 10 is_stmt 0 view .LVU1601
 5603 1cc2 488D4C05 		lea	rcx, 0[rbp+rax]	# index,
 5603      00
 5604              	.LVL466:
 108:sieve_extend.c **** 
 5605              		.loc 1 108 4 is_stmt 1 view .LVU1602
 110:sieve_extend.c ****        index_word++;
 5606              		.loc 1 110 4 view .LVU1603
 110:sieve_extend.c ****        index_word++;
 5607              		.loc 1 110 10 view .LVU1604
 5608              	# sieve_extend.c:108:    distance += index_bit;
 108:sieve_extend.c **** 
 5609              		.loc 1 108 13 is_stmt 0 view .LVU1605
 5610 1cc7 4801D0   		add	rax, rdx	# distance, index_bit
 5611              	.LVL467:
 5612              	# sieve_extend.c:110:    while (distance == WORD_SIZE_bitshift) { // to prevent a bug from optimzer
 110:sieve_extend.c ****        index_word++;
 5613              		.loc 1 110 10 view .LVU1606
 5614 1cca 4883F840 		cmp	rax, 64	# distance,
GAS LISTING /tmp/ccrNbbzt.s 			page 157


 5615 1cce 0F85C702 		jne	.L430	#,
 5615      0000
 5616              	.LVL468:
 111:sieve_extend.c ****        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
 5617              		.loc 1 111 8 is_stmt 1 view .LVU1607
 112:sieve_extend.c ****        index += distance;
 5618              		.loc 1 112 8 view .LVU1608
 5619              	# sieve_extend.c:112:        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
 112:sieve_extend.c ****        index += distance;
 5620              		.loc 1 112 48 is_stmt 0 view .LVU1609
 5621 1cd4 488B4433 		mov	rax, QWORD PTR 8[rbx+rsi]	# *_694, *_694
 5621      08
 5622 1cd9 48F7D0   		not	rax	# tmp931
 5623              	.LVL469:
 113:sieve_extend.c ****    }
 5624              		.loc 1 113 8 is_stmt 1 view .LVU1610
 5625              	# sieve_extend.c:112:        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
 112:sieve_extend.c ****        index += distance;
 5626              		.loc 1 112 17 is_stmt 0 view .LVU1611
 5627 1cdc F3480FBC 		tzcnt	rax, rax	# distance, tmp931
 5627      C0
 5628              	.LVL470:
 5629              	# sieve_extend.c:113:        index += distance;
 113:sieve_extend.c ****    }
 5630              		.loc 1 113 14 view .LVU1612
 5631 1ce1 4801C1   		add	rcx, rax	# index, distance
 5632              	.LVL471:
 110:sieve_extend.c ****        index_word++;
 5633              		.loc 1 110 10 is_stmt 1 view .LVU1613
 116:sieve_extend.c **** }
 5634              		.loc 1 116 4 view .LVU1614
 116:sieve_extend.c **** }
 5635              		.loc 1 116 4 is_stmt 0 view .LVU1615
 5636              	.LBE559:
 5637              	.LBE558:
 963:sieve_extend.c ****     }
 5638              		.loc 1 963 9 is_stmt 1 view .LVU1616
 5639              	# sieve_extend.c:963:         start = prime * prime * 2 + prime * 2;
 963:sieve_extend.c ****     }
 5640              		.loc 1 963 35 is_stmt 0 view .LVU1617
 5641 1ce4 488D6901 		lea	rbp, 1[rcx]	# _433,
 5642              	# sieve_extend.c:963:         start = prime * prime * 2 + prime * 2;
 963:sieve_extend.c ****     }
 5643              		.loc 1 963 15 view .LVU1618
 5644 1ce8 4889EE   		mov	rsi, rbp	# tmp936, _433
 5645 1ceb 480FAFF1 		imul	rsi, rcx	# tmp936, index
 5646 1cef 4801F6   		add	rsi, rsi	# index
 5647              	.LVL472:
 957:sieve_extend.c ****         step  = prime * 2 + 1;
 5648              		.loc 1 957 11 is_stmt 1 view .LVU1619
 5649 1cf2 4939F4   		cmp	r12, rsi	# block_stop, index
 5650 1cf5 0F83C5FE 		jnb	.L311	#,
 5650      FFFF
 5651 1cfb E9B0FBFF 		jmp	.L396	#
 5651      FF
 5652              	.LVL473:
 5653              		.p2align 4,,10
GAS LISTING /tmp/ccrNbbzt.s 			page 158


 5654              		.p2align 3
 5655              	.L424:
 5656              	.LBB561:
 5657              	.LBB515:
 5658              	.LBB512:
 5659              	.LBB511:
 5660              	.LBB510:
 5661              	.LBB508:
 209:sieve_extend.c ****    }
 5662              		.loc 1 209 7 view .LVU1620
 5663              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 5664              		.loc 1 209 27 is_stmt 0 view .LVU1621
 5665 1d00 48231424 		and	rdx, QWORD PTR [rsp]	# tmp824, %sfp
 5666              	.LVL474:
 5667              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 5668              		.loc 1 209 18 view .LVU1622
 5669 1d04 49095500 		or	QWORD PTR 0[r13], rdx	# *index_ptr_1048, tmp824
 5670 1d08 E90FFDFF 		jmp	.L260	#
 5670      FF
 5671              	.LVL475:
 5672 1d0d 0F1F00   		.p2align 4,,10
 5673              		.p2align 3
 5674              	.L248:
 209:sieve_extend.c ****    }
 5675              		.loc 1 209 18 view .LVU1623
 5676              	.LBE508:
 5677              	.LBE510:
 5678              	.LBE511:
 5679              	.LBE512:
 5680              	.LBB513:
 5681              	.LBB502:
 5682              	.LBB501:
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 5683              		.loc 1 287 54 is_stmt 1 view .LVU1624
 5684              	# sieve_extend.c:287:         for (register counter_t index = range_start; index <= range_stop;) {
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 5685              		.loc 1 287 9 is_stmt 0 view .LVU1625
 5686 1d10 4939F4   		cmp	r12, rsi	# block_stop, index
 5687 1d13 0F820CFD 		jb	.L252	#,
 5687      FFFF
 5688              	.LVL476:
 5689 1d19 0F1F8000 		.p2align 4,,10
 5689      000000
 5690              		.p2align 3
 5691              	.L254:
 5692              	.LBB500:
 288:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 5693              		.loc 1 288 13 is_stmt 1 view .LVU1626
 5694              	# sieve_extend.c:288:             register counter_t index_word = wordindex(index);
 288:sieve_extend.c ****             register bitword_t mask = SAFE_ZERO;
 5695              		.loc 1 288 32 is_stmt 0 view .LVU1627
 5696 1d20 4889F0   		mov	rax, rsi	# index_word, index
 5697 1d23 48C1E806 		shr	rax, 6	# index_word,
 5698              	.LVL477:
 289:sieve_extend.c ****             #pragma ivdep
GAS LISTING /tmp/ccrNbbzt.s 			page 159


 5699              		.loc 1 289 13 is_stmt 1 view .LVU1628
 5700              	# sieve_extend.c:289:             register bitword_t mask = SAFE_ZERO;
 289:sieve_extend.c ****             #pragma ivdep
 5701              		.loc 1 289 32 is_stmt 0 view .LVU1629
 5702 1d27 31D2     		xor	edx, edx	# mask
 5703              	.LVL478:
 5704 1d29 0F1F8000 		.p2align 4,,10
 5704      000000
 5705              		.p2align 3
 5706              	.L253:
 291:sieve_extend.c ****                 mask |= markmask(index);
 5707              		.loc 1 291 13 is_stmt 1 view .LVU1630
 292:sieve_extend.c ****                 index += step;
 5708              		.loc 1 292 17 view .LVU1631
 5709              	# sieve_extend.c:292:                 mask |= markmask(index);
 292:sieve_extend.c ****                 index += step;
 5710              		.loc 1 292 25 is_stmt 0 view .LVU1632
 5711 1d30 C4C2C9F7 		shlx	rcx, r15, rsi	# tmp804, tmp983, index
 5711      CF
 5712              	# sieve_extend.c:293:                 index += step;
 293:sieve_extend.c ****             } while (index_word == wordindex(index));
 5713              		.loc 1 293 23 view .LVU1633
 5714 1d35 4C01C6   		add	rsi, r8	# index, step
 5715              	.LVL479:
 5716              	# sieve_extend.c:292:                 mask |= markmask(index);
 292:sieve_extend.c ****                 index += step;
 5717              		.loc 1 292 22 view .LVU1634
 5718 1d38 4809CA   		or	rdx, rcx	# mask, tmp804
 5719              	.LVL480:
 293:sieve_extend.c ****             } while (index_word == wordindex(index));
 5720              		.loc 1 293 17 is_stmt 1 view .LVU1635
 294:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 5721              		.loc 1 294 21 view .LVU1636
 5722              	# sieve_extend.c:294:             } while (index_word == wordindex(index));
 294:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 5723              		.loc 1 294 36 is_stmt 0 view .LVU1637
 5724 1d3b 4889F1   		mov	rcx, rsi	# tmp806, index
 5725 1d3e 48C1E906 		shr	rcx, 6	# tmp806,
 5726              	# sieve_extend.c:294:             } while (index_word == wordindex(index));
 294:sieve_extend.c ****             // for (; index_word == wordindex(index);  index += step) 
 5727              		.loc 1 294 13 view .LVU1638
 5728 1d42 4839C8   		cmp	rax, rcx	# index_word, tmp806
 5729 1d45 74E9     		je	.L253	#,
 297:sieve_extend.c ****         }
 5730              		.loc 1 297 13 is_stmt 1 view .LVU1639
 5731              	# sieve_extend.c:297:             bitarray[index_word] |= mask;
 297:sieve_extend.c ****         }
 5732              		.loc 1 297 34 is_stmt 0 view .LVU1640
 5733 1d47 480914C3 		or	QWORD PTR [rbx+rax*8], rdx	# *_552, mask
 297:sieve_extend.c ****         }
 5734              		.loc 1 297 34 view .LVU1641
 5735              	.LBE500:
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 5736              		.loc 1 287 54 is_stmt 1 view .LVU1642
 5737              	# sieve_extend.c:287:         for (register counter_t index = range_start; index <= range_stop;) {
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 5738              		.loc 1 287 9 is_stmt 0 view .LVU1643
GAS LISTING /tmp/ccrNbbzt.s 			page 160


 5739 1d4b 4939F4   		cmp	r12, rsi	# block_stop, index
 5740 1d4e 73D0     		jnb	.L254	#,
 5741 1d50 E9D0FCFF 		jmp	.L252	#
 5741      FF
 5742              	.LVL481:
 5743              		.p2align 4,,10
 5744 1d55 0F1F00   		.p2align 3
 5745              	.L429:
 287:sieve_extend.c ****             register counter_t index_word = wordindex(index);
 5746              		.loc 1 287 9 view .LVU1644
 5747              	.LBE501:
 5748              	.LBE502:
 5749              	.LBE513:
 5750              	.LBE515:
 5751              	.LBE561:
 5752              	.LBB562:
 5753              	.LBB557:
 5754              	.LBB556:
 5755              	.LBB555:
 5756              	.LBB554:
 5757              	.LBB551:
 209:sieve_extend.c ****    }
 5758              		.loc 1 209 7 is_stmt 1 view .LVU1645
 5759              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 5760              		.loc 1 209 27 is_stmt 0 view .LVU1646
 5761 1d58 48231424 		and	rdx, QWORD PTR [rsp]	# tmp930, %sfp
 5762              	.LVL482:
 5763              	# sieve_extend.c:209:       *index_ptr |= (mask & chopmask(range_stop));
 209:sieve_extend.c ****    }
 5764              		.loc 1 209 18 view .LVU1647
 5765 1d5c 49095500 		or	QWORD PTR 0[r13], rdx	# *index_ptr_1029, tmp930
 5766 1d60 E92FFFFF 		jmp	.L300	#
 5766      FF
 5767              	.LVL483:
 5768              		.p2align 4,,10
 5769 1d65 0F1F00   		.p2align 3
 5770              	.L266:
 209:sieve_extend.c ****    }
 5771              		.loc 1 209 18 view .LVU1648
 5772              	.LBE551:
 5773              	.LBE554:
 5774              	.LBE555:
 5775              	.LBE556:
 5776              	.LBE557:
 5777              	.LBE562:
 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5778              		.loc 1 941 41 is_stmt 1 view .LVU1649
 5779              	# sieve_extend.c:941:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5780              		.loc 1 941 61 is_stmt 0 view .LVU1650
 5781 1d68 4A8D0437 		lea	rax, [rdi+r14]	# _368,
 5782              	# sieve_extend.c:941:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5783              		.loc 1 941 102 view .LVU1651
 5784 1d6c 31D2     		xor	edx, edx	# tmp848
 5785              	# sieve_extend.c:941:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
GAS LISTING /tmp/ccrNbbzt.s 			page 161


 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5786              		.loc 1 941 69 view .LVU1652
 5787 1d6e 4801C7   		add	rdi, rax	# tmp846, _368
 5788              	.LVL484:
 5789              	# sieve_extend.c:941:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5790              		.loc 1 941 102 view .LVU1653
 5791 1d71 49F7F1   		div	r9	# step
 5792              	# sieve_extend.c:941:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 941:sieve_extend.c ****         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, step1, step, block_stop)
 5793              		.loc 1 941 47 view .LVU1654
 5794 1d74 4889F8   		mov	rax, rdi	# tmp846, tmp846
 5795 1d77 4829D0   		sub	rax, rdx	# tmp846, tmp848
 5796              	.LVL485:
 942:sieve_extend.c **** //        else                     setBitsTrue_smallRange(bitarray, start1, step1, block_stop);
 5797              		.loc 1 942 9 is_stmt 1 view .LVU1655
 5798              	# sieve_extend.c:942:         if (start <= block_stop) setBitsTrue_race(bitarray, start1, start, st
 942:sieve_extend.c **** //        else                     setBitsTrue_smallRange(bitarray, start1, step1, block_stop);
 5799              		.loc 1 942 12 is_stmt 0 view .LVU1656
 5800 1d7a 4939C4   		cmp	r12, rax	# block_stop, index2
 5801 1d7d 0F8280FD 		jb	.L268	#,
 5801      FFFF
 5802              	.L425:
 942:sieve_extend.c **** //        else                     setBitsTrue_smallRange(bitarray, start1, step1, block_stop);
 5803              		.loc 1 942 34 is_stmt 1 view .LVU1657
 5804              	.LVL486:
 5805              	.LBB563:
 5806              	.LBI563:
 340:sieve_extend.c ****     debug printf("Setting bits step %ju and %ju in %ju bit range (%ju-%ju) using race (%ju occuranc
 5807              		.loc 1 340 13 view .LVU1658
 5808              	.LBB564:
 341:sieve_extend.c **** 
 5809              		.loc 1 341 5 view .LVU1659
 343:sieve_extend.c ****     counter_t index2_word = wordindex(index2);
 5810              		.loc 1 343 5 view .LVU1660
 5811              	# sieve_extend.c:343:     counter_t index1_word = wordindex(index1);
 343:sieve_extend.c ****     counter_t index2_word = wordindex(index2);
 5812              		.loc 1 343 15 is_stmt 0 view .LVU1661
 5813 1d83 4889F2   		mov	rdx, rsi	# index1_word, index
 5814              	# sieve_extend.c:344:     counter_t index2_word = wordindex(index2);
 344:sieve_extend.c ****     
 5815              		.loc 1 344 15 view .LVU1662
 5816 1d86 4889C7   		mov	rdi, rax	# index2_word, index2
 5817              	# sieve_extend.c:343:     counter_t index1_word = wordindex(index1);
 343:sieve_extend.c ****     counter_t index2_word = wordindex(index2);
 5818              		.loc 1 343 15 view .LVU1663
 5819 1d89 48C1EA06 		shr	rdx, 6	# index1_word,
 5820              	.LVL487:
 344:sieve_extend.c ****     
 5821              		.loc 1 344 5 is_stmt 1 view .LVU1664
 5822              	# sieve_extend.c:344:     counter_t index2_word = wordindex(index2);
 344:sieve_extend.c ****     
 5823              		.loc 1 344 15 is_stmt 0 view .LVU1665
 5824 1d8d 48C1EF06 		shr	rdi, 6	# index2_word,
 5825              	.LVL488:
 5826              	.L279:
 346:sieve_extend.c ****         if (index1_word == index2_word) {
GAS LISTING /tmp/ccrNbbzt.s 			page 162


 5827              		.loc 1 346 5 is_stmt 1 view .LVU1666
 347:sieve_extend.c ****             bitword_t mask = SAFE_ZERO;
 5828              		.loc 1 347 9 view .LVU1667
 5829              	# sieve_extend.c:347:         if (index1_word == index2_word) {
 347:sieve_extend.c ****             bitword_t mask = SAFE_ZERO;
 5830              		.loc 1 347 12 is_stmt 0 view .LVU1668
 5831 1d91 4839FA   		cmp	rdx, rdi	# index1_word, index2_word
 5832 1d94 7457     		je	.L431	#,
 5833              	.L269:
 364:sieve_extend.c ****             while (index1 <= range_stop) {
 5834              		.loc 1 364 9 is_stmt 1 view .LVU1669
 5835              	# sieve_extend.c:364:         if (index2 > range_stop) {
 364:sieve_extend.c ****             while (index1 <= range_stop) {
 5836              		.loc 1 364 12 is_stmt 0 view .LVU1670
 5837 1d96 4939C4   		cmp	r12, rax	# block_stop, index2
 5838 1d99 0F82A100 		jb	.L432	#,
 5838      0000
 5839              	.L272:
 372:sieve_extend.c ****             while (index2 <= range_stop) {
 5840              		.loc 1 372 9 is_stmt 1 view .LVU1671
 5841              	# sieve_extend.c:372:         if (index1 > range_stop) {
 372:sieve_extend.c ****             while (index2 <= range_stop) {
 5842              		.loc 1 372 12 is_stmt 0 view .LVU1672
 5843 1d9f 4939F4   		cmp	r12, rsi	# block_stop, index
 5844 1da2 0F82C800 		jb	.L274	#,
 5844      0000
 380:sieve_extend.c ****             bitarray[index1_word] |= markmask(index1);
 5845              		.loc 1 380 15 is_stmt 1 view .LVU1673
 5846 1da8 4839D7   		cmp	rdi, rdx	# index2_word, index1_word
 5847 1dab 761B     		jbe	.L276	#,
 5848 1dad 0F1F00   		.p2align 4,,10
 5849              		.p2align 3
 5850              	.L275:
 381:sieve_extend.c ****             index1 += step1;
 5851              		.loc 1 381 13 view .LVU1674
 5852              	# sieve_extend.c:381:             bitarray[index1_word] |= markmask(index1);
 381:sieve_extend.c ****             index1 += step1;
 5853              		.loc 1 381 38 is_stmt 0 view .LVU1675
 5854 1db0 C442C9F7 		shlx	r10, r15, rsi	# tmp869, tmp983, index
 5854      D7
 5855              	# sieve_extend.c:382:             index1 += step1;
 382:sieve_extend.c ****             index1_word = wordindex(index1);
 5856              		.loc 1 382 20 view .LVU1676
 5857 1db5 4C01C6   		add	rsi, r8	# index, step
 5858              	.LVL489:
 5859              	# sieve_extend.c:381:             bitarray[index1_word] |= markmask(index1);
 381:sieve_extend.c ****             index1 += step1;
 5860              		.loc 1 381 35 view .LVU1677
 5861 1db8 4C0914D3 		or	QWORD PTR [rbx+rdx*8], r10	# *_650, tmp869
 382:sieve_extend.c ****             index1_word = wordindex(index1);
 5862              		.loc 1 382 13 is_stmt 1 view .LVU1678
 5863              	.LVL490:
 383:sieve_extend.c ****         }
 5864              		.loc 1 383 13 view .LVU1679
 5865              	# sieve_extend.c:383:             index1_word = wordindex(index1);
 383:sieve_extend.c ****         }
 5866              		.loc 1 383 25 is_stmt 0 view .LVU1680
GAS LISTING /tmp/ccrNbbzt.s 			page 163


 5867 1dbc 4889F2   		mov	rdx, rsi	# index1_word, index
 5868              	.LVL491:
 383:sieve_extend.c ****         }
 5869              		.loc 1 383 25 view .LVU1681
 5870 1dbf 48C1EA06 		shr	rdx, 6	# index1_word,
 5871              	.LVL492:
 380:sieve_extend.c ****             bitarray[index1_word] |= markmask(index1);
 5872              		.loc 1 380 15 is_stmt 1 view .LVU1682
 5873 1dc3 4839FA   		cmp	rdx, rdi	# index1_word, index2_word
 5874 1dc6 72E8     		jb	.L275	#,
 5875              	.L276:
 386:sieve_extend.c ****             bitarray[index2_word] |= markmask(index2);
 5876              		.loc 1 386 15 view .LVU1683
 5877 1dc8 4839D7   		cmp	rdi, rdx	# index2_word, index1_word
 5878 1dcb 73C4     		jnb	.L279	#,
 5879 1dcd 0F1F00   		.p2align 4,,10
 5880              		.p2align 3
 5881              	.L278:
 387:sieve_extend.c ****             index2 += step2;
 5882              		.loc 1 387 13 view .LVU1684
 5883              	# sieve_extend.c:387:             bitarray[index2_word] |= markmask(index2);
 387:sieve_extend.c ****             index2 += step2;
 5884              		.loc 1 387 38 is_stmt 0 view .LVU1685
 5885 1dd0 C442F9F7 		shlx	r10, r15, rax	# tmp873, tmp983, index2
 5885      D7
 5886              	# sieve_extend.c:388:             index2 += step2;
 388:sieve_extend.c ****             index2_word = wordindex(index2);
 5887              		.loc 1 388 20 view .LVU1686
 5888 1dd5 4C01C8   		add	rax, r9	# index2, step
 5889              	.LVL493:
 5890              	# sieve_extend.c:387:             bitarray[index2_word] |= markmask(index2);
 387:sieve_extend.c ****             index2 += step2;
 5891              		.loc 1 387 35 view .LVU1687
 5892 1dd8 4C0914FB 		or	QWORD PTR [rbx+rdi*8], r10	# *_661, tmp873
 388:sieve_extend.c ****             index2_word = wordindex(index2);
 5893              		.loc 1 388 13 is_stmt 1 view .LVU1688
 5894              	.LVL494:
 389:sieve_extend.c ****         }
 5895              		.loc 1 389 13 view .LVU1689
 5896              	# sieve_extend.c:389:             index2_word = wordindex(index2);
 389:sieve_extend.c ****         }
 5897              		.loc 1 389 25 is_stmt 0 view .LVU1690
 5898 1ddc 4889C7   		mov	rdi, rax	# index2_word, index2
 5899              	.LVL495:
 389:sieve_extend.c ****         }
 5900              		.loc 1 389 25 view .LVU1691
 5901 1ddf 48C1EF06 		shr	rdi, 6	# index2_word,
 5902              	.LVL496:
 386:sieve_extend.c ****             bitarray[index2_word] |= markmask(index2);
 5903              		.loc 1 386 15 is_stmt 1 view .LVU1692
 5904 1de3 4839D7   		cmp	rdi, rdx	# index2_word, index1_word
 5905 1de6 72E8     		jb	.L278	#,
 346:sieve_extend.c ****         if (index1_word == index2_word) {
 5906              		.loc 1 346 5 view .LVU1693
 347:sieve_extend.c ****             bitword_t mask = SAFE_ZERO;
 5907              		.loc 1 347 9 view .LVU1694
 5908              	# sieve_extend.c:347:         if (index1_word == index2_word) {
GAS LISTING /tmp/ccrNbbzt.s 			page 164


 347:sieve_extend.c ****             bitword_t mask = SAFE_ZERO;
 5909              		.loc 1 347 12 is_stmt 0 view .LVU1695
 5910 1de8 4839FA   		cmp	rdx, rdi	# index1_word, index2_word
 5911 1deb 75A9     		jne	.L269	#,
 5912              	.L431:
 5913              	.LBB565:
 5914              	# sieve_extend.c:348:             bitword_t mask = SAFE_ZERO;
 348:sieve_extend.c ****             counter_t index_word = index1_word;
 5915              		.loc 1 348 23 view .LVU1696
 5916 1ded 4531D2   		xor	r10d, r10d	# mask
 5917              	.LVL497:
 5918              		.p2align 4,,10
 5919              		.p2align 3
 5920              	.L270:
 350:sieve_extend.c ****                 mask |= markmask(index1);
 5921              		.loc 1 350 13 is_stmt 1 view .LVU1697
 351:sieve_extend.c ****                 index1 += step1;
 5922              		.loc 1 351 17 view .LVU1698
 5923              	# sieve_extend.c:351:                 mask |= markmask(index1);
 351:sieve_extend.c ****                 index1 += step1;
 5924              		.loc 1 351 25 is_stmt 0 view .LVU1699
 5925 1df0 C4C2C9F7 		shlx	rdi, r15, rsi	# tmp851, tmp983, index
 5925      FF
 5926              	# sieve_extend.c:352:                 index1 += step1;
 352:sieve_extend.c ****                 index1_word = wordindex(index1);
 5927              		.loc 1 352 24 view .LVU1700
 5928 1df5 4C01C6   		add	rsi, r8	# index, step
 5929              	.LVL498:
 5930              	# sieve_extend.c:353:                 index1_word = wordindex(index1);
 353:sieve_extend.c ****             } while (index1_word == index_word);
 5931              		.loc 1 353 29 view .LVU1701
 5932 1df8 4989F3   		mov	r11, rsi	# index1_word, index
 5933 1dfb 49C1EB06 		shr	r11, 6	# index1_word,
 5934              	# sieve_extend.c:351:                 mask |= markmask(index1);
 351:sieve_extend.c ****                 index1 += step1;
 5935              		.loc 1 351 22 view .LVU1702
 5936 1dff 4909FA   		or	r10, rdi	# mask, tmp851
 5937              	.LVL499:
 352:sieve_extend.c ****                 index1_word = wordindex(index1);
 5938              		.loc 1 352 17 is_stmt 1 view .LVU1703
 353:sieve_extend.c ****             } while (index1_word == index_word);
 5939              		.loc 1 353 17 view .LVU1704
 354:sieve_extend.c ****             do {
 5940              		.loc 1 354 21 view .LVU1705
 5941              	# sieve_extend.c:354:             } while (index1_word == index_word);
 354:sieve_extend.c ****             do {
 5942              		.loc 1 354 13 is_stmt 0 view .LVU1706
 5943 1e02 4C39DA   		cmp	rdx, r11	# index1_word, index1_word
 5944 1e05 74E9     		je	.L270	#,
 5945 1e07 660F1F84 		.p2align 4,,10
 5945      00000000 
 5945      00
 5946              		.p2align 3
 5947              	.L271:
 355:sieve_extend.c ****                 mask |= markmask(index2);
 5948              		.loc 1 355 13 is_stmt 1 view .LVU1707
 356:sieve_extend.c ****                 index2 += step2;
GAS LISTING /tmp/ccrNbbzt.s 			page 165


 5949              		.loc 1 356 17 view .LVU1708
 5950              	# sieve_extend.c:356:                 mask |= markmask(index2);
 356:sieve_extend.c ****                 index2 += step2;
 5951              		.loc 1 356 25 is_stmt 0 view .LVU1709
 5952 1e10 C4C2F9F7 		shlx	rdi, r15, rax	# tmp854, tmp983, index2
 5952      FF
 5953              	# sieve_extend.c:357:                 index2 += step2;
 357:sieve_extend.c ****                 index2_word = wordindex(index2);
 5954              		.loc 1 357 24 view .LVU1710
 5955 1e15 4C01C8   		add	rax, r9	# index2, step
 5956              	.LVL500:
 5957              	# sieve_extend.c:356:                 mask |= markmask(index2);
 356:sieve_extend.c ****                 index2 += step2;
 5958              		.loc 1 356 22 view .LVU1711
 5959 1e18 4909FA   		or	r10, rdi	# mask, tmp854
 5960              	.LVL501:
 357:sieve_extend.c ****                 index2_word = wordindex(index2);
 5961              		.loc 1 357 17 is_stmt 1 view .LVU1712
 358:sieve_extend.c ****             } while (index2_word == index_word);
 5962              		.loc 1 358 17 view .LVU1713
 5963              	# sieve_extend.c:358:                 index2_word = wordindex(index2);
 358:sieve_extend.c ****             } while (index2_word == index_word);
 5964              		.loc 1 358 29 is_stmt 0 view .LVU1714
 5965 1e1b 4889C7   		mov	rdi, rax	# index2_word, index2
 5966 1e1e 48C1EF06 		shr	rdi, 6	# index2_word,
 5967              	.LVL502:
 359:sieve_extend.c ****             bitarray[index_word] |= mask;
 5968              		.loc 1 359 21 is_stmt 1 view .LVU1715
 5969              	# sieve_extend.c:359:             } while (index2_word == index_word);
 359:sieve_extend.c ****             bitarray[index_word] |= mask;
 5970              		.loc 1 359 13 is_stmt 0 view .LVU1716
 5971 1e22 4839FA   		cmp	rdx, rdi	# index1_word, index2_word
 5972 1e25 74E9     		je	.L271	#,
 360:sieve_extend.c ****         }
 5973              		.loc 1 360 13 is_stmt 1 view .LVU1717
 5974              	# sieve_extend.c:360:             bitarray[index_word] |= mask;
 360:sieve_extend.c ****         }
 5975              		.loc 1 360 34 is_stmt 0 view .LVU1718
 5976 1e27 4C0914D3 		or	QWORD PTR [rbx+rdx*8], r10	# *_624, mask
 5977              	# sieve_extend.c:353:                 index1_word = wordindex(index1);
 353:sieve_extend.c ****             } while (index1_word == index_word);
 5978              		.loc 1 353 29 view .LVU1719
 5979 1e2b 4C89DA   		mov	rdx, r11	# index1_word, index1_word
 5980              	.LVL503:
 353:sieve_extend.c ****             } while (index1_word == index_word);
 5981              		.loc 1 353 29 view .LVU1720
 5982              	.LBE565:
 364:sieve_extend.c ****             while (index1 <= range_stop) {
 5983              		.loc 1 364 9 is_stmt 1 view .LVU1721
 5984              	# sieve_extend.c:364:         if (index2 > range_stop) {
 364:sieve_extend.c ****             while (index1 <= range_stop) {
 5985              		.loc 1 364 12 is_stmt 0 view .LVU1722
 5986 1e2e 4939C4   		cmp	r12, rax	# block_stop, index2
 5987 1e31 0F8368FF 		jnb	.L272	#,
 5987      FFFF
 5988              	.LVL504:
 5989 1e37 660F1F84 		.p2align 4,,10
GAS LISTING /tmp/ccrNbbzt.s 			page 166


 5989      00000000 
 5989      00
 5990              		.p2align 3
 5991              	.L432:
 365:sieve_extend.c ****                 bitarray[wordindex(index1)] |= markmask(index1);
 5992              		.loc 1 365 19 is_stmt 1 view .LVU1723
 5993 1e40 4939F4   		cmp	r12, rsi	# block_stop, index
 5994 1e43 0F82BAFC 		jb	.L268	#,
 5994      FFFF
 5995              	.LVL505:
 5996 1e49 0F1F8000 		.p2align 4,,10
 5996      000000
 5997              		.p2align 3
 5998              	.L273:
 366:sieve_extend.c ****                 index1 += step1;
 5999              		.loc 1 366 17 view .LVU1724
 6000              	# sieve_extend.c:366:                 bitarray[wordindex(index1)] |= markmask(index1);
 366:sieve_extend.c ****                 index1 += step1;
 6001              		.loc 1 366 45 is_stmt 0 view .LVU1725
 6002 1e50 4889F0   		mov	rax, rsi	# tmp857, index
 6003              	# sieve_extend.c:366:                 bitarray[wordindex(index1)] |= markmask(index1);
 366:sieve_extend.c ****                 index1 += step1;
 6004              		.loc 1 366 48 view .LVU1726
 6005 1e53 C4C2C9F7 		shlx	rdx, r15, rsi	# tmp860, tmp983, index
 6005      D7
 6006              	# sieve_extend.c:366:                 bitarray[wordindex(index1)] |= markmask(index1);
 366:sieve_extend.c ****                 index1 += step1;
 6007              		.loc 1 366 45 view .LVU1727
 6008 1e58 48C1E806 		shr	rax, 6	# tmp857,
 6009              	# sieve_extend.c:367:                 index1 += step1;
 367:sieve_extend.c ****             }
 6010              		.loc 1 367 24 view .LVU1728
 6011 1e5c 4C01C6   		add	rsi, r8	# index, step
 6012              	.LVL506:
 6013              	# sieve_extend.c:366:                 bitarray[wordindex(index1)] |= markmask(index1);
 366:sieve_extend.c ****                 index1 += step1;
 6014              		.loc 1 366 45 view .LVU1729
 6015 1e5f 480914C3 		or	QWORD PTR [rbx+rax*8], rdx	# *_632, tmp860
 367:sieve_extend.c ****             }
 6016              		.loc 1 367 17 is_stmt 1 view .LVU1730
 6017              	.LVL507:
 365:sieve_extend.c ****                 bitarray[wordindex(index1)] |= markmask(index1);
 6018              		.loc 1 365 19 view .LVU1731
 6019 1e63 4939F4   		cmp	r12, rsi	# block_stop, index
 6020 1e66 73E8     		jnb	.L273	#,
 6021 1e68 E996FCFF 		jmp	.L268	#
 6021      FF
 6022              	.LVL508:
 6023 1e6d 0F1F00   		.p2align 4,,10
 6024              		.p2align 3
 6025              	.L274:
 374:sieve_extend.c ****                 index2 += step2;
 6026              		.loc 1 374 17 view .LVU1732
 6027              	# sieve_extend.c:374:                 bitarray[wordindex(index2)] |= markmask(index2);
 374:sieve_extend.c ****                 index2 += step2;
 6028              		.loc 1 374 45 is_stmt 0 view .LVU1733
 6029 1e70 4889C2   		mov	rdx, rax	# tmp862, index2
GAS LISTING /tmp/ccrNbbzt.s 			page 167


 6030              	# sieve_extend.c:374:                 bitarray[wordindex(index2)] |= markmask(index2);
 374:sieve_extend.c ****                 index2 += step2;
 6031              		.loc 1 374 48 view .LVU1734
 6032 1e73 C4C2F9F7 		shlx	rsi, r15, rax	# tmp865, tmp983, index2
 6032      F7
 6033              	# sieve_extend.c:374:                 bitarray[wordindex(index2)] |= markmask(index2);
 374:sieve_extend.c ****                 index2 += step2;
 6034              		.loc 1 374 45 view .LVU1735
 6035 1e78 48C1EA06 		shr	rdx, 6	# tmp862,
 6036              	# sieve_extend.c:375:                 index2 += step2;
 375:sieve_extend.c ****             }
 6037              		.loc 1 375 24 view .LVU1736
 6038 1e7c 4C01C8   		add	rax, r9	# index2, step
 6039              	.LVL509:
 6040              	# sieve_extend.c:374:                 bitarray[wordindex(index2)] |= markmask(index2);
 374:sieve_extend.c ****                 index2 += step2;
 6041              		.loc 1 374 45 view .LVU1737
 6042 1e7f 480934D3 		or	QWORD PTR [rbx+rdx*8], rsi	# *_642, tmp865
 375:sieve_extend.c ****             }
 6043              		.loc 1 375 17 is_stmt 1 view .LVU1738
 6044              	.LVL510:
 373:sieve_extend.c ****                 bitarray[wordindex(index2)] |= markmask(index2);
 6045              		.loc 1 373 19 view .LVU1739
 6046 1e83 4939C4   		cmp	r12, rax	# block_stop, index2
 6047 1e86 73E8     		jnb	.L274	#,
 6048 1e88 E976FCFF 		jmp	.L268	#
 6048      FF
 6049              	.LVL511:
 6050              	.L433:
 373:sieve_extend.c ****                 bitarray[wordindex(index2)] |= markmask(index2);
 6051              		.loc 1 373 19 is_stmt 0 view .LVU1740
 6052              	.LBE564:
 6053              	.LBE563:
 6054              	.LBB566:
 6055              	.LBB567:
 116:sieve_extend.c **** }
 6056              		.loc 1 116 4 is_stmt 1 view .LVU1741
 116:sieve_extend.c **** }
 6057              		.loc 1 116 4 is_stmt 0 view .LVU1742
 6058              	.LBE567:
 6059              	.LBE566:
 972:sieve_extend.c ****     }
 6060              		.loc 1 972 9 is_stmt 1 view .LVU1743
 6061              	# sieve_extend.c:972:         start = prime * prime * 2 + prime * 2;
 972:sieve_extend.c ****     }
 6062              		.loc 1 972 35 is_stmt 0 view .LVU1744
 6063 1e8d 488D6901 		lea	rbp, 1[rcx]	# _433,
 6064              	# sieve_extend.c:972:         start = prime * prime * 2 + prime * 2;
 972:sieve_extend.c ****     }
 6065              		.loc 1 972 15 view .LVU1745
 6066 1e91 4889E8   		mov	rax, rbp	# tmp964, _433
 6067 1e94 480FAFC1 		imul	rax, rcx	# tmp964, index
 6068 1e98 4801C0   		add	rax, rax	# tmp965, tmp964
 6069 1e9b 4889C6   		mov	rsi, rax	# index, tmp965
 6070              	.LVL512:
 6071 1e9e 6690     		.p2align 4,,10
 6072              		.p2align 3
GAS LISTING /tmp/ccrNbbzt.s 			page 168


 6073              	.L400:
 966:sieve_extend.c ****         step  = prime * 2 + 1;
 6074              		.loc 1 966 11 is_stmt 1 view .LVU1746
 6075 1ea0 4939F4   		cmp	r12, rsi	# block_stop, index
 6076 1ea3 0F8207FA 		jb	.L396	#,
 6076      FFFF
 6077 1ea9 0F1F8000 		.p2align 4,,10
 6077      000000
 6078              		.p2align 3
 6079              	.L295:
 967:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 6080              		.loc 1 967 9 view .LVU1747
 6081              	# sieve_extend.c:967:         step  = prime * 2 + 1;
 967:sieve_extend.c ****         if (block_start >= (prime + 1)) start = block_start + prime + prime - ((block_start + prime
 6082              		.loc 1 967 15 is_stmt 0 view .LVU1748
 6083 1eb0 488D7C09 		lea	rdi, 1[rcx+rcx]	# step,
 6083      01
 6084              	.LVL513:
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6085              		.loc 1 968 9 is_stmt 1 view .LVU1749
 6086              	# sieve_extend.c:968:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6087              		.loc 1 968 12 is_stmt 0 view .LVU1750
 6088 1eb5 4C39F5   		cmp	rbp, r14	# _433, block_start
 6089 1eb8 7710     		ja	.L402	#,
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6090              		.loc 1 968 41 is_stmt 1 view .LVU1751
 6091              	# sieve_extend.c:968:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6092              		.loc 1 968 61 is_stmt 0 view .LVU1752
 6093 1eba 4A8D0431 		lea	rax, [rcx+r14]	# _434,
 6094              	# sieve_extend.c:968:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6095              		.loc 1 968 102 view .LVU1753
 6096 1ebe 31D2     		xor	edx, edx	# tmp943
 6097              	# sieve_extend.c:968:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6098              		.loc 1 968 69 view .LVU1754
 6099 1ec0 488D3401 		lea	rsi, [rcx+rax]	# tmp941,
 6100              	.LVL514:
 6101              	# sieve_extend.c:968:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6102              		.loc 1 968 102 view .LVU1755
 6103 1ec4 48F7F7   		div	rdi	# step
 6104              	# sieve_extend.c:968:         if (block_start >= (prime + 1)) start = block_start + prime + prime -
 968:sieve_extend.c ****         if likely(start <= block_stop)
 6105              		.loc 1 968 47 view .LVU1756
 6106 1ec7 4829D6   		sub	rsi, rdx	# index, tmp943
 6107              	.L402:
 6108              	.LVL515:
 969:sieve_extend.c ****             setBitsTrue_smallRange(bitarray, start, step, block_stop);
 6109              		.loc 1 969 9 is_stmt 1 view .LVU1757
 6110              	# sieve_extend.c:969:         if likely(start <= block_stop)
 969:sieve_extend.c ****             setBitsTrue_smallRange(bitarray, start, step, block_stop);
 6111              		.loc 1 969 12 is_stmt 0 view .LVU1758
 6112 1eca 4939F4   		cmp	r12, rsi	# block_stop, index
 6113 1ecd 7219     		jb	.L309	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 169


 6114              	.LVL516:
 6115 1ecf 90       		.p2align 4,,10
 6116              		.p2align 3
 6117              	.L308:
 6118              	.LBB569:
 6119              	.LBB570:
 6120              	.LBB571:
 327:sieve_extend.c ****     }
 6121              		.loc 1 327 9 is_stmt 1 view .LVU1759
 6122              	# sieve_extend.c:327:         bitarray[wordindex(index)] |= markmask(index);
 327:sieve_extend.c ****     }
 6123              		.loc 1 327 36 is_stmt 0 view .LVU1760
 6124 1ed0 4889F0   		mov	rax, rsi	# tmp952, index
 6125              	# sieve_extend.c:327:         bitarray[wordindex(index)] |= markmask(index);
 327:sieve_extend.c ****     }
 6126              		.loc 1 327 39 view .LVU1761
 6127 1ed3 C4C2C9F7 		shlx	rdx, r15, rsi	# tmp955, tmp983, index
 6127      D7
 6128              	# sieve_extend.c:327:         bitarray[wordindex(index)] |= markmask(index);
 327:sieve_extend.c ****     }
 6129              		.loc 1 327 36 view .LVU1762
 6130 1ed8 48C1E806 		shr	rax, 6	# tmp952,
 6131              	# sieve_extend.c:326:     for (register counter_t index = range_start; index <= range_stop; index +
 326:sieve_extend.c ****         bitarray[wordindex(index)] |= markmask(index);
 6132              		.loc 1 326 77 view .LVU1763
 6133 1edc 4801FE   		add	rsi, rdi	# index, step
 6134              	.LVL517:
 6135              	# sieve_extend.c:327:         bitarray[wordindex(index)] |= markmask(index);
 327:sieve_extend.c ****     }
 6136              		.loc 1 327 36 view .LVU1764
 6137 1edf 480914C3 		or	QWORD PTR [rbx+rax*8], rdx	# *_445, tmp955
 326:sieve_extend.c ****         bitarray[wordindex(index)] |= markmask(index);
 6138              		.loc 1 326 71 is_stmt 1 view .LVU1765
 6139              	.LVL518:
 326:sieve_extend.c ****         bitarray[wordindex(index)] |= markmask(index);
 6140              		.loc 1 326 50 view .LVU1766
 6141              	# sieve_extend.c:326:     for (register counter_t index = range_start; index <= range_stop; index +
 326:sieve_extend.c ****         bitarray[wordindex(index)] |= markmask(index);
 6142              		.loc 1 326 5 is_stmt 0 view .LVU1767
 6143 1ee3 4939F4   		cmp	r12, rsi	# block_stop, index
 6144 1ee6 73E8     		jnb	.L308	#,
 6145              	.LVL519:
 6146              	.L309:
 326:sieve_extend.c ****         bitarray[wordindex(index)] |= markmask(index);
 6147              		.loc 1 326 5 view .LVU1768
 6148              	.LBE571:
 6149              	.LBE570:
 6150              	.LBE569:
 971:sieve_extend.c ****         start = prime * prime * 2 + prime * 2;
 6151              		.loc 1 971 9 is_stmt 1 view .LVU1769
 6152              	.LBB572:
 6153              	.LBI566:
 103:sieve_extend.c ****    register counter_t index_word = wordindex(index);
 6154              		.loc 1 103 25 view .LVU1770
 6155              	.LBB568:
 104:sieve_extend.c ****    bitshift_t index_bit  = bitindex_calc(index);
 6156              		.loc 1 104 4 view .LVU1771
GAS LISTING /tmp/ccrNbbzt.s 			page 170


 105:sieve_extend.c ****    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bi
 6157              		.loc 1 105 4 view .LVU1772
 6158              	# sieve_extend.c:104:    register counter_t index_word = wordindex(index);
 104:sieve_extend.c ****    bitshift_t index_bit  = bitindex_calc(index);
 6159              		.loc 1 104 23 is_stmt 0 view .LVU1773
 6160 1ee8 4889E8   		mov	rax, rbp	# index_word, _433
 6161 1eeb 48C1E806 		shr	rax, 6	# index_word,
 6162              	.LVL520:
 6163              	# sieve_extend.c:105:    bitshift_t index_bit  = bitindex_calc(index);
 105:sieve_extend.c ****    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bi
 6164              		.loc 1 105 15 view .LVU1774
 6165 1eef 4889EA   		mov	rdx, rbp	# index_bit, _433
 6166              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 6167              		.loc 1 106 76 view .LVU1775
 6168 1ef2 488D34C5 		lea	rsi, 0[0+rax*8]	# _760,
 6168      00000000 
 6169              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 6170              		.loc 1 106 89 view .LVU1776
 6171 1efa 488B04C3 		mov	rax, QWORD PTR [rbx+rax*8]	# *_761, *_761
 6172              	.LVL521:
 6173              	# sieve_extend.c:105:    bitshift_t index_bit  = bitindex_calc(index);
 105:sieve_extend.c ****    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[index_word] >> index_bi
 6174              		.loc 1 105 15 view .LVU1777
 6175 1efe 83E23F   		and	edx, 63	# index_bit,
 6176              	.LVL522:
 106:sieve_extend.c ****    index += distance;
 6177              		.loc 1 106 4 is_stmt 1 view .LVU1778
 6178              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 6179              		.loc 1 106 89 is_stmt 0 view .LVU1779
 6180 1f01 C4E2EBF7 		shrx	rax, rax, rdx	# tmp947, *_761, index_bit
 6180      C0
 6181              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 6182              		.loc 1 106 66 view .LVU1780
 6183 1f06 48F7D0   		not	rax	# tmp949
 6184              	# sieve_extend.c:106:    register  bitshift_t distance = (bitshift_t) __builtin_ctzll( ~(bitarray[i
 106:sieve_extend.c ****    index += distance;
 6185              		.loc 1 106 25 view .LVU1781
 6186 1f09 F3480FBC 		tzcnt	rax, rax	# distance, tmp949
 6186      C0
 6187              	.LVL523:
 107:sieve_extend.c ****    distance += index_bit;
 6188              		.loc 1 107 4 is_stmt 1 view .LVU1782
 6189              	# sieve_extend.c:107:    index += distance;
 107:sieve_extend.c ****    distance += index_bit;
 6190              		.loc 1 107 10 is_stmt 0 view .LVU1783
 6191 1f0e 488D4C05 		lea	rcx, 0[rbp+rax]	# index,
 6191      00
 6192              	.LVL524:
 108:sieve_extend.c **** 
 6193              		.loc 1 108 4 is_stmt 1 view .LVU1784
 110:sieve_extend.c ****        index_word++;
 6194              		.loc 1 110 4 view .LVU1785
 110:sieve_extend.c ****        index_word++;
GAS LISTING /tmp/ccrNbbzt.s 			page 171


 6195              		.loc 1 110 10 view .LVU1786
 6196              	# sieve_extend.c:108:    distance += index_bit;
 108:sieve_extend.c **** 
 6197              		.loc 1 108 13 is_stmt 0 view .LVU1787
 6198 1f13 4801D0   		add	rax, rdx	# distance, index_bit
 6199              	.LVL525:
 6200              	# sieve_extend.c:110:    while (distance == WORD_SIZE_bitshift) { // to prevent a bug from optimzer
 110:sieve_extend.c ****        index_word++;
 6201              		.loc 1 110 10 view .LVU1788
 6202 1f16 4883F840 		cmp	rax, 64	# distance,
 6203 1f1a 0F856DFF 		jne	.L433	#,
 6203      FFFF
 6204              	.LVL526:
 111:sieve_extend.c ****        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
 6205              		.loc 1 111 8 is_stmt 1 view .LVU1789
 112:sieve_extend.c ****        index += distance;
 6206              		.loc 1 112 8 view .LVU1790
 6207              	# sieve_extend.c:112:        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
 112:sieve_extend.c ****        index += distance;
 6208              		.loc 1 112 48 is_stmt 0 view .LVU1791
 6209 1f20 488B4433 		mov	rax, QWORD PTR 8[rbx+rsi]	# *_773, *_773
 6209      08
 6210 1f25 48F7D0   		not	rax	# tmp957
 6211              	.LVL527:
 113:sieve_extend.c ****    }
 6212              		.loc 1 113 8 is_stmt 1 view .LVU1792
 6213              	# sieve_extend.c:112:        distance = (bitshift_t) __builtin_ctzll(~(bitarray[index_word]));
 112:sieve_extend.c ****        index += distance;
 6214              		.loc 1 112 17 is_stmt 0 view .LVU1793
 6215 1f28 F3480FBC 		tzcnt	rax, rax	# distance, tmp957
 6215      C0
 6216              	.LVL528:
 6217              	# sieve_extend.c:113:        index += distance;
 113:sieve_extend.c ****    }
 6218              		.loc 1 113 14 view .LVU1794
 6219 1f2d 4801C1   		add	rcx, rax	# index, distance
 6220              	.LVL529:
 110:sieve_extend.c ****        index_word++;
 6221              		.loc 1 110 10 is_stmt 1 view .LVU1795
 116:sieve_extend.c **** }
 6222              		.loc 1 116 4 view .LVU1796
 116:sieve_extend.c **** }
 6223              		.loc 1 116 4 is_stmt 0 view .LVU1797
 6224              	.LBE568:
 6225              	.LBE572:
 972:sieve_extend.c ****     }
 6226              		.loc 1 972 9 is_stmt 1 view .LVU1798
 6227              	# sieve_extend.c:972:         start = prime * prime * 2 + prime * 2;
 972:sieve_extend.c ****     }
 6228              		.loc 1 972 35 is_stmt 0 view .LVU1799
 6229 1f30 488D6901 		lea	rbp, 1[rcx]	# _433,
 6230              	# sieve_extend.c:972:         start = prime * prime * 2 + prime * 2;
 972:sieve_extend.c ****     }
 6231              		.loc 1 972 15 view .LVU1800
 6232 1f34 4889EE   		mov	rsi, rbp	# tmp962, _433
 6233 1f37 480FAFF1 		imul	rsi, rcx	# tmp962, index
 6234 1f3b 4801F6   		add	rsi, rsi	# index
GAS LISTING /tmp/ccrNbbzt.s 			page 172


 6235              	.LVL530:
 966:sieve_extend.c ****         step  = prime * 2 + 1;
 6236              		.loc 1 966 11 is_stmt 1 view .LVU1801
 6237 1f3e 4939F4   		cmp	r12, rsi	# block_stop, index
 6238 1f41 0F8369FF 		jnb	.L295	#,
 6238      FFFF
 6239 1f47 E964F9FF 		jmp	.L396	#
 6239      FF
 6240              	.LVL531:
 6241              	.L406:
 966:sieve_extend.c ****         step  = prime * 2 + 1;
 6242              		.loc 1 966 11 is_stmt 0 view .LVU1802
 6243 1f4c 488B4424 		mov	rax, QWORD PTR 32[rsp]	# <retval>, %sfp
 6243      20
 6244 1f51 48894C24 		mov	QWORD PTR 40[rsp], rcx	# %sfp, prime
 6244      28
 6245 1f56 488B4008 		mov	rax, QWORD PTR 8[rax]	# prephitmp_1822, sieve_89->bits
 6246              	.LBE577:
 6247              	.LBE586:
 6248              	.LBE588:
 6249              	.LBB589:
 6250              	.LBB482:
 6251              	.LBB479:
 6252              	# sieve_extend.c:1006:         if (range_stop > block_stop) return block; //range_stop = block_stop
1006:sieve_extend.c **** 
 6253              		.loc 1 1006 12 view .LVU1803
 6254 1f5a 488B7424 		mov	rsi, QWORD PTR 16[rsp]	# block$pattern_start, %sfp
 6254      10
 6255 1f5f 48890424 		mov	QWORD PTR [rsp], rax	# %sfp, prephitmp_1822
 6256              	.LVL532:
1006:sieve_extend.c **** 
 6257              		.loc 1 1006 12 view .LVU1804
 6258 1f63 4C89F2   		mov	rdx, r14	# block$pattern_size, patternsize_bits
 6259 1f66 E906F7FF 		jmp	.L183	#
 6259      FF
 6260              	.LVL533:
 6261              	.L315:
 6262              	.LBB473:
 6263              	.LBB440:
 6264              	# sieve_extend.c:246: 	register bitword_t pattern = SAFE_SHIFTBIT;
 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 6265              		.loc 1 246 21 view .LVU1805
 6266 1f6b B9010000 		mov	ecx, 1	# pattern,
 6266      00
 6267 1f70 E92CF3FF 		jmp	.L189	#
 6267      FF
 6268              	.LVL534:
 6269              	.L223:
 246:sieve_extend.c ****     for (bitshift_t patternsize = step; patternsize <= WORD_SIZE; patternsize += patternsize) patte
 6270              		.loc 1 246 21 view .LVU1806
 6271              	.LBE440:
 6272              	.LBE473:
 6273              	.LBE479:
 6274              	.LBE482:
 6275              	.LBE589:
 6276              	.LBB590:
 6277              	.LBB488:
GAS LISTING /tmp/ccrNbbzt.s 			page 173


 901:sieve_extend.c **** }
 6278              		.loc 1 901 37 is_stmt 1 view .LVU1807
 6279 1f75 E8F6E6FF 		call	extendSieve_aligned	#
 6279      FF
 6280              	.LVL535:
 901:sieve_extend.c **** }
 6281              		.loc 1 901 37 is_stmt 0 view .LVU1808
 6282 1f7a E926F7FF 		jmp	.L221	#
 6282      FF
 6283              	.LVL536:
 6284              	.L419:
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 6285              		.loc 1 899 37 is_stmt 1 view .LVU1809
 6286 1f7f E8CCE8FF 		call	extendSieve_shiftleft	#
 6286      FF
 6287              	.LVL537:
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 6288              		.loc 1 899 37 is_stmt 0 view .LVU1810
 6289 1f84 E91CF7FF 		jmp	.L221	#
 6289      FF
 6290              	.LVL538:
 6291              	.L404:
 899:sieve_extend.c ****     else if (source_bit < copy_bit) extendSieve_shiftright_ivdep(bitarray, source_start, size, dest
 6292              		.loc 1 899 37 view .LVU1811
 6293              	.LBE488:
 6294              	.LBE590:
 6295              	.LBB591:
 6296              	.LBB483:
 6297              	# sieve_extend.c:986:     register counter_t prime   = 0;
 986:sieve_extend.c ****     counter_t patternsize_bits = 1;
 6298              		.loc 1 986 24 view .LVU1812
 6299 1f89 48C74424 		mov	QWORD PTR 40[rsp], 0	# %sfp,
 6299      28000000 
 6299      00
 6300              	# sieve_extend.c:991:     struct block block = { .prime = 0, .pattern_start = 0, .pattern_size = 0 
 991:sieve_extend.c **** 
 6301              		.loc 1 991 18 view .LVU1813
 6302 1f92 31D2     		xor	edx, edx	# block$pattern_size
 6303 1f94 31F6     		xor	esi, esi	# block$pattern_start
 6304 1f96 E903F4FF 		jmp	.L176	#
 6304      FF
 6305              	.LVL539:
 6306              	.L430:
 991:sieve_extend.c **** 
 6307              		.loc 1 991 18 view .LVU1814
 6308              	.LBE483:
 6309              	.LBE591:
 6310              	.LBB592:
 6311              	.LBB587:
 6312              	.LBB578:
 6313              	.LBB573:
 6314              	.LBB560:
 116:sieve_extend.c **** }
 6315              		.loc 1 116 4 is_stmt 1 view .LVU1815
 116:sieve_extend.c **** }
 6316              		.loc 1 116 4 is_stmt 0 view .LVU1816
 6317              	.LBE560:
GAS LISTING /tmp/ccrNbbzt.s 			page 174


 6318              	.LBE573:
 963:sieve_extend.c ****     }
 6319              		.loc 1 963 9 is_stmt 1 view .LVU1817
 6320              	# sieve_extend.c:963:         start = prime * prime * 2 + prime * 2;
 963:sieve_extend.c ****     }
 6321              		.loc 1 963 35 is_stmt 0 view .LVU1818
 6322 1f9b 488D6901 		lea	rbp, 1[rcx]	# _433,
 6323              	# sieve_extend.c:963:         start = prime * prime * 2 + prime * 2;
 963:sieve_extend.c ****     }
 6324              		.loc 1 963 15 view .LVU1819
 6325 1f9f 4889EE   		mov	rsi, rbp	# tmp938, _433
 6326 1fa2 480FAFF1 		imul	rsi, rcx	# tmp938, index
 6327 1fa6 4801F6   		add	rsi, rsi	# tmp939, tmp938
 6328              	.LVL540:
 957:sieve_extend.c ****         step  = prime * 2 + 1;
 6329              		.loc 1 957 11 is_stmt 1 view .LVU1820
 6330 1fa9 4939F4   		cmp	r12, rsi	# block_stop, index
 6331 1fac 0F830EFC 		jnb	.L311	#,
 6331      FFFF
 6332 1fb2 E9F9F8FF 		jmp	.L396	#
 6332      FF
 6333              	.LBE578:
 6334              	.LBE587:
 6335              	.LBE592:
 6336              		.cfi_endproc
 6337              	.LFE76:
 6339 1fb7 660F1F84 		.p2align 4
 6339      00000000 
 6339      00
 6341              	tune_benchmark:
 6342              	.LVL541:
 6343              	.LFB83:
1149:sieve_extend.c **** 
1150:sieve_extend.c **** static void tune_benchmark(tuning_result_type* tuning_result, counter_t tuning_result_index) {
 6344              		.loc 1 1150 94 view -0
 6345              		.cfi_startproc
 6346              		.loc 1 1150 94 is_stmt 0 view .LVU1822
 6347 1fc0 4154     		push	r12	#
 6348              		.cfi_def_cfa_offset 16
 6349              		.cfi_offset 12, -16
 6350              	# sieve_extend.c:1156:     global_SMALLSTEP_FASTER = tuning_result[tuning_result_index].smallstep_f
1151:sieve_extend.c ****     counter_t passes = 0;
1152:sieve_extend.c ****     double elapsed_time = 0;
1153:sieve_extend.c ****     struct timespec start_time,end_time;
1154:sieve_extend.c ****     struct sieve_state *sieve_instance;
1155:sieve_extend.c **** 
1156:sieve_extend.c ****     global_SMALLSTEP_FASTER = tuning_result[tuning_result_index].smallstep_faster;
 6351              		.loc 1 1156 44 view .LVU1823
 6352 1fc2 486BF658 		imul	rsi, rsi, 88	# tmp112, tmp145,
 6353              	.LVL542:
 6354              	# sieve_extend.c:1151:     counter_t passes = 0;
1151:sieve_extend.c ****     counter_t passes = 0;
 6355              		.loc 1 1151 15 view .LVU1824
 6356 1fc6 4531E4   		xor	r12d, r12d	# passes
 6357              	# sieve_extend.c:1150: static void tune_benchmark(tuning_result_type* tuning_result, counter_t tuni
1150:sieve_extend.c ****     counter_t passes = 0;
 6358              		.loc 1 1150 94 view .LVU1825
GAS LISTING /tmp/ccrNbbzt.s 			page 175


 6359 1fc9 55       		push	rbp	#
 6360              		.cfi_def_cfa_offset 24
 6361              		.cfi_offset 6, -24
 6362 1fca 53       		push	rbx	#
 6363              		.cfi_def_cfa_offset 32
 6364              		.cfi_offset 3, -32
 6365              	# sieve_extend.c:1156:     global_SMALLSTEP_FASTER = tuning_result[tuning_result_index].smallstep_f
 6366              		.loc 1 1156 44 view .LVU1826
 6367 1fcb 488D1C37 		lea	rbx, [rdi+rsi]	# _2,
 6368              	# sieve_extend.c:1159:     clock_gettime(CLOCK_MONOTONIC,&start_time);
1157:sieve_extend.c ****     global_MEDIUMSTEP_FASTER = tuning_result[tuning_result_index].mediumstep_faster;
1158:sieve_extend.c **** 
1159:sieve_extend.c ****     clock_gettime(CLOCK_MONOTONIC,&start_time);
 6369              		.loc 1 1159 5 view .LVU1827
 6370 1fcf BF010000 		mov	edi, 1	#,
 6370      00
 6371              	.LVL543:
 6372              	# sieve_extend.c:1150: static void tune_benchmark(tuning_result_type* tuning_result, counter_t tuni
1150:sieve_extend.c ****     counter_t passes = 0;
 6373              		.loc 1 1150 94 view .LVU1828
 6374 1fd4 4883EC30 		sub	rsp, 48	#,
 6375              		.cfi_def_cfa_offset 80
 6376              	# sieve_extend.c:1150: static void tune_benchmark(tuning_result_type* tuning_result, counter_t tuni
1150:sieve_extend.c ****     counter_t passes = 0;
 6377              		.loc 1 1150 94 view .LVU1829
 6378 1fd8 64488B04 		mov	rax, QWORD PTR fs:40	# tmp160, MEM[(<address-space-1> long unsigned int *)40B]
 6378      25280000 
 6378      00
 6379 1fe1 48894424 		mov	QWORD PTR 40[rsp], rax	# D.7160, tmp160
 6379      28
 6380 1fe6 31C0     		xor	eax, eax	# tmp160
1151:sieve_extend.c ****     double elapsed_time = 0;
 6381              		.loc 1 1151 5 is_stmt 1 view .LVU1830
 6382              	.LVL544:
1152:sieve_extend.c ****     struct timespec start_time,end_time;
 6383              		.loc 1 1152 5 view .LVU1831
1153:sieve_extend.c ****     struct sieve_state *sieve_instance;
 6384              		.loc 1 1153 5 view .LVU1832
1154:sieve_extend.c **** 
 6385              		.loc 1 1154 5 view .LVU1833
1156:sieve_extend.c ****     global_MEDIUMSTEP_FASTER = tuning_result[tuning_result_index].mediumstep_faster;
 6386              		.loc 1 1156 5 view .LVU1834
 6387              	# sieve_extend.c:1156:     global_SMALLSTEP_FASTER = tuning_result[tuning_result_index].smallstep_f
1156:sieve_extend.c ****     global_MEDIUMSTEP_FASTER = tuning_result[tuning_result_index].mediumstep_faster;
 6388              		.loc 1 1156 29 is_stmt 0 view .LVU1835
 6389 1fe8 488B4320 		mov	rax, QWORD PTR 32[rbx]	# _2->smallstep_faster, _2->smallstep_faster
 6390              	# sieve_extend.c:1159:     clock_gettime(CLOCK_MONOTONIC,&start_time);
 6391              		.loc 1 1159 5 view .LVU1836
 6392 1fec 4889E6   		mov	rsi, rsp	# tmp115,
 6393              	# sieve_extend.c:1156:     global_SMALLSTEP_FASTER = tuning_result[tuning_result_index].smallstep_f
1156:sieve_extend.c ****     global_MEDIUMSTEP_FASTER = tuning_result[tuning_result_index].mediumstep_faster;
 6394              		.loc 1 1156 29 view .LVU1837
 6395 1fef 48890500 		mov	QWORD PTR global_SMALLSTEP_FASTER[rip], rax	# global_SMALLSTEP_FASTER, _2->smallstep_faster
 6395      000000
1157:sieve_extend.c **** 
 6396              		.loc 1 1157 5 is_stmt 1 view .LVU1838
 6397              	# sieve_extend.c:1157:     global_MEDIUMSTEP_FASTER = tuning_result[tuning_result_index].mediumstep
GAS LISTING /tmp/ccrNbbzt.s 			page 176


1157:sieve_extend.c **** 
 6398              		.loc 1 1157 30 is_stmt 0 view .LVU1839
 6399 1ff6 488B4328 		mov	rax, QWORD PTR 40[rbx]	# _2->mediumstep_faster, _2->mediumstep_faster
 6400 1ffa 48890500 		mov	QWORD PTR global_MEDIUMSTEP_FASTER[rip], rax	# global_MEDIUMSTEP_FASTER, _2->mediumstep_faster
 6400      000000
 6401              		.loc 1 1159 5 is_stmt 1 view .LVU1840
 6402 2001 E8000000 		call	clock_gettime@PLT	#
 6402      00
 6403              	.LVL545:
1160:sieve_extend.c ****     while (elapsed_time <= tuning_result[tuning_result_index].sample_duration && passes < tuning_re
 6404              		.loc 1 1160 5 view .LVU1841
 6405              		.loc 1 1160 11 view .LVU1842
 6406 2006 C5F957C0 		vxorpd	xmm0, xmm0, xmm0	# elapsed_time
 6407 200a C5F92F43 		vcomisd	xmm0, QWORD PTR 56[rbx]	# elapsed_time, _2->sample_duration
 6407      38
 6408 200f C5FB100D 		vmovsd	xmm1, QWORD PTR .LC3[rip]	# _56,
 6408      00000000 
 6409 2017 0F879800 		ja	.L436	#,
 6409      0000
 6410 201d C5E057DB 		vxorps	xmm3, xmm3, xmm3	# tmp147
 6411 2021 EB7E     		jmp	.L435	#
 6412              	.LVL546:
 6413              		.p2align 4,,10
 6414 2023 0F1F4400 		.p2align 3
 6414      00
 6415              	.L439:
1161:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6416              		.loc 1 1161 9 view .LVU1843
 6417              	# sieve_extend.c:1161:         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, t
 6418              		.loc 1 1161 26 is_stmt 0 view .LVU1844
 6419 2028 488B7308 		mov	rsi, QWORD PTR 8[rbx]	# _2->blocksize_bits, _2->blocksize_bits
 6420 202c 488B3B   		mov	rdi, QWORD PTR [rbx]	#, _2->maxints
 6421              	# sieve_extend.c:1163:         passes++;
1162:sieve_extend.c ****         delete_sieve(sieve_instance);
1163:sieve_extend.c ****         passes++;
 6422              		.loc 1 1163 15 view .LVU1845
 6423 202f 49FFC4   		inc	r12	# passes
 6424              	.LVL547:
 6425              	# sieve_extend.c:1161:         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, t
1161:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6426              		.loc 1 1161 26 view .LVU1846
 6427 2032 E849F0FF 		call	sieve	#
 6427      FF
 6428              	.LVL548:
 6429              	.LBB593:
 6430              	.LBB594:
 6431              	# sieve_extend.c:98:     free(sieve->bitarray);
  98:sieve_extend.c ****     free(sieve);
 6432              		.loc 1 98 5 view .LVU1847
 6433 2037 488B38   		mov	rdi, QWORD PTR [rax]	#, sieve_instance_35->bitarray
 6434              	.LBE594:
 6435              	.LBE593:
 6436              	# sieve_extend.c:1161:         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, t
1161:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6437              		.loc 1 1161 26 view .LVU1848
 6438 203a 4889C5   		mov	rbp, rax	# sieve_instance, tmp146
 6439              	.LVL549:
GAS LISTING /tmp/ccrNbbzt.s 			page 177


1162:sieve_extend.c ****         delete_sieve(sieve_instance);
 6440              		.loc 1 1162 9 is_stmt 1 view .LVU1849
 6441              	.LBB596:
 6442              	.LBI593:
  97:sieve_extend.c ****     free(sieve->bitarray);
 6443              		.loc 1 97 13 view .LVU1850
 6444              	.LBB595:
  98:sieve_extend.c ****     free(sieve);
 6445              		.loc 1 98 5 view .LVU1851
 6446 203d E8000000 		call	free@PLT	#
 6446      00
 6447              	.LVL550:
  99:sieve_extend.c **** }
 6448              		.loc 1 99 5 view .LVU1852
 6449 2042 4889EF   		mov	rdi, rbp	#, sieve_instance
 6450 2045 E8000000 		call	free@PLT	#
 6450      00
 6451              	.LVL551:
  99:sieve_extend.c **** }
 6452              		.loc 1 99 5 is_stmt 0 view .LVU1853
 6453              	.LBE595:
 6454              	.LBE596:
 6455              		.loc 1 1163 9 is_stmt 1 view .LVU1854
1164:sieve_extend.c ****         clock_gettime(CLOCK_MONOTONIC,&end_time);
 6456              		.loc 1 1164 9 view .LVU1855
 6457 204a 488D7424 		lea	rsi, 16[rsp]	# tmp118,
 6457      10
 6458 204f BF010000 		mov	edi, 1	#,
 6458      00
 6459 2054 E8000000 		call	clock_gettime@PLT	#
 6459      00
 6460              	.LVL552:
1165:sieve_extend.c ****         elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time.tv_
 6461              		.loc 1 1165 9 view .LVU1856
 6462              	# sieve_extend.c:1165:         elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.
 6463              		.loc 1 1165 58 is_stmt 0 view .LVU1857
 6464 2059 C5E057DB 		vxorps	xmm3, xmm3, xmm3	# tmp147
 6465 205d C4E1E32A 		vcvtsi2sd	xmm1, xmm3, QWORD PTR 24[rsp]	# tmp148, tmp147, end_time.tv_nsec
 6465      4C2418
 6466              	# sieve_extend.c:1165:         elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.
 6467              		.loc 1 1165 64 view .LVU1858
 6468 2064 C4E1E32A 		vcvtsi2sd	xmm0, xmm3, QWORD PTR [rsp]	# tmp149, tmp147, start_time.tv_sec
 6468      0424
 6469              	# sieve_extend.c:1165:         elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.
 6470              		.loc 1 1165 58 view .LVU1859
 6471 206a C5F928D1 		vmovapd	xmm2, xmm1	# tmp119, tmp148
 6472 206e C4E2F99B 		vfmsub132sd	xmm2, xmm0, QWORD PTR .LC4[rip]	# tmp119, tmp120,
 6472      15000000 
 6472      00
 6473              	# sieve_extend.c:1165:         elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.
 6474              		.loc 1 1165 104 view .LVU1860
 6475 2077 C4E1E32A 		vcvtsi2sd	xmm0, xmm3, QWORD PTR 8[rsp]	# tmp150, tmp147, start_time.tv_nsec
 6475      442408
 6476 207e C5F928CA 		vmovapd	xmm1, xmm2	# _60, tmp119
 6477 2082 C5F928D0 		vmovapd	xmm2, xmm0	# tmp122, tmp150
 6478              	# sieve_extend.c:1165:         elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.
 6479              		.loc 1 1165 40 view .LVU1861
GAS LISTING /tmp/ccrNbbzt.s 			page 178


 6480 2086 C4E1E32A 		vcvtsi2sd	xmm0, xmm3, QWORD PTR 16[rsp]	# tmp151, tmp147, end_time.tv_sec
 6480      442410
 6481 208d C4E2E9BD 		vfnmadd231sd	xmm0, xmm2, QWORD PTR .LC4[rip]	# _61, tmp122,
 6481      05000000 
 6481      00
 6482              	# sieve_extend.c:1165:         elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.
 6483              		.loc 1 1165 22 view .LVU1862
 6484 2096 C5F358C0 		vaddsd	xmm0, xmm1, xmm0	# elapsed_time, _60, _61
 6485              	.LVL553:
1160:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6486              		.loc 1 1160 11 is_stmt 1 view .LVU1863
 6487 209a C5F92F43 		vcomisd	xmm0, QWORD PTR 56[rbx]	# elapsed_time, _2->sample_duration
 6487      38
 6488 209f 7706     		ja	.L451	#,
 6489              	.LVL554:
 6490              	.L435:
 6491              	# sieve_extend.c:1160:     while (elapsed_time <= tuning_result[tuning_result_index].sample_duratio
1160:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6492              		.loc 1 1160 79 is_stmt 0 discriminator 1 view .LVU1864
 6493 20a1 4C396330 		cmp	QWORD PTR 48[rbx], r12	# _2->sample_max, passes
 6494 20a5 7781     		ja	.L439	#,
 6495              	.L451:
1160:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6496              		.loc 1 1160 79 discriminator 1 view .LVU1865
 6497 20a7 4D85E4   		test	r12, r12	# passes
 6498 20aa 7834     		js	.L440	#,
1160:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6499              		.loc 1 1160 79 discriminator 1 view .LVU1866
 6500 20ac C4C1E32A 		vcvtsi2sd	xmm3, xmm3, r12	# tmp154, tmp147, passes
 6500      DC
 6501              	.L441:
1160:sieve_extend.c ****         sieve_instance = sieve(tuning_result[tuning_result_index].maxints, tuning_result[tuning_res
 6502              		.loc 1 1160 79 discriminator 1 view .LVU1867
 6503 20b1 C5E35EC8 		vdivsd	xmm1, xmm3, xmm0	# _56, tmp129, elapsed_time
 6504              	.LVL555:
 6505              	.L436:
1166:sieve_extend.c ****     }
1167:sieve_extend.c ****     tuning_result[tuning_result_index].passes = passes;
 6506              		.loc 1 1167 5 is_stmt 1 view .LVU1868
 6507              	# sieve_extend.c:1167:     tuning_result[tuning_result_index].passes = passes;
 6508              		.loc 1 1167 47 is_stmt 0 view .LVU1869
 6509 20b5 4C896340 		mov	QWORD PTR 64[rbx], r12	# _2->passes, passes
1168:sieve_extend.c ****     tuning_result[tuning_result_index].elapsed_time = elapsed_time;
 6510              		.loc 1 1168 5 is_stmt 1 view .LVU1870
1169:sieve_extend.c ****     tuning_result[tuning_result_index].avg = passes/elapsed_time;
 6511              		.loc 1 1169 5 view .LVU1871
 6512              	# sieve_extend.c:1168:     tuning_result[tuning_result_index].elapsed_time = elapsed_time;
1168:sieve_extend.c ****     tuning_result[tuning_result_index].elapsed_time = elapsed_time;
 6513              		.loc 1 1168 53 is_stmt 0 view .LVU1872
 6514 20b9 C5F914C1 		vunpcklpd	xmm0, xmm0, xmm1	# tmp133, elapsed_time, _56
 6515 20bd C5F81143 		vmovups	XMMWORD PTR 72[rbx], xmm0	# MEM[(double *)_2 + 72B], tmp133
 6515      48
 6516              	# sieve_extend.c:1170: }
1170:sieve_extend.c **** }
 6517              		.loc 1 1170 1 view .LVU1873
 6518 20c2 488B4424 		mov	rax, QWORD PTR 40[rsp]	# tmp161, D.7160
 6518      28
GAS LISTING /tmp/ccrNbbzt.s 			page 179


 6519 20c7 64483304 		xor	rax, QWORD PTR fs:40	# tmp161, MEM[(<address-space-1> long unsigned int *)40B]
 6519      25280000 
 6519      00
 6520 20d0 7528     		jne	.L452	#,
 6521 20d2 4883C430 		add	rsp, 48	#,
 6522              		.cfi_remember_state
 6523              		.cfi_def_cfa_offset 32
 6524 20d6 5B       		pop	rbx	#
 6525              		.cfi_def_cfa_offset 24
 6526 20d7 5D       		pop	rbp	#
 6527              		.cfi_def_cfa_offset 16
 6528 20d8 415C     		pop	r12	#
 6529              		.cfi_def_cfa_offset 8
 6530 20da C3       		ret	
 6531              	.LVL556:
 6532 20db 0F1F4400 		.p2align 4,,10
 6532      00
 6533              		.p2align 3
 6534              	.L440:
 6535              		.cfi_restore_state
 6536              		.loc 1 1170 1 view .LVU1874
 6537 20e0 4C89E0   		mov	rax, r12	# tmp131, passes
 6538 20e3 4C89E2   		mov	rdx, r12	# tmp132, passes
 6539 20e6 48D1E8   		shr	rax	# tmp131
 6540 20e9 83E201   		and	edx, 1	# tmp132,
 6541 20ec 4809D0   		or	rax, rdx	# tmp131, tmp132
 6542 20ef C4E1E32A 		vcvtsi2sd	xmm3, xmm3, rax	# tmp155, tmp147, tmp131
 6542      D8
 6543 20f4 C5E358DB 		vaddsd	xmm3, xmm3, xmm3	# tmp129, tmp130, tmp130
 6544 20f8 EBB7     		jmp	.L441	#
 6545              	.LVL557:
 6546              	.L452:
 6547              		.loc 1 1170 1 view .LVU1875
 6548 20fa E8000000 		call	__stack_chk_fail@PLT	#
 6548      00
 6549              	.LVL558:
 6550              		.cfi_endproc
 6551              	.LFE83:
 6553 20ff 90       		.p2align 4
 6554              		.globl	shiftvec
 6556              	shiftvec:
 6557              	.LVL559:
 6558              	.LFB67:
 611:sieve_extend.c ****     int i = 0;
 6559              		.loc 1 611 1 is_stmt 1 view -0
 6560              		.cfi_startproc
 611:sieve_extend.c ****     int i = 0;
 6561              		.loc 1 611 1 is_stmt 0 view .LVU1877
 6562 2100 F30F1EFA 		endbr64	
 612:sieve_extend.c ****     // MSVC: use steps of 2 for SSE, 4 for AVX2, 8 for AVX512
 6563              		.loc 1 612 5 is_stmt 1 view .LVU1878
 6564              	.LVL560:
 614:sieve_extend.c ****     {
 6565              		.loc 1 614 5 view .LVU1879
 614:sieve_extend.c ****     {
 6566              		.loc 1 614 12 view .LVU1880
 6567              	# sieve_extend.c:611: {
GAS LISTING /tmp/ccrNbbzt.s 			page 180


 611:sieve_extend.c ****     int i = 0;
 6568              		.loc 1 611 1 is_stmt 0 view .LVU1881
 6569 2104 55       		push	rbp	#
 6570              		.cfi_def_cfa_offset 16
 6571              		.cfi_offset 6, -16
 6572 2105 4889E5   		mov	rbp, rsp	#,
 6573              		.cfi_def_cfa_register 6
 6574 2108 53       		push	rbx	#
 6575              		.cfi_offset 3, -24
 6576              	# sieve_extend.c:614:     for (; i+4 < size; i+=4,dst+=4,src+=4)
 614:sieve_extend.c ****     {
 6577              		.loc 1 614 5 view .LVU1882
 6578 2109 83FA04   		cmp	edx, 4	# size,
 6579 210c 0F8E2101 		jle	.L464	#,
 6579      0000
 6580 2112 41B94000 		mov	r9d, 64	# tmp134,
 6580      0000
 6581 2118 448D52FB 		lea	r10d, -5[rdx]	# tmp135,
 6582 211c 4489CB   		mov	ebx, r9d	# _4, tmp134
 6583 211f 41C1EA02 		shr	r10d, 2	# _80,
 6584 2123 29CB     		sub	ebx, ecx	# _4, shift
 6585 2125 458D5A01 		lea	r11d, 1[r10]	# tmp172,
 6586 2129 31C0     		xor	eax, eax	# ivtmp.685
 6587 212b 4531C0   		xor	r8d, r8d	# ivtmp.682
 6588 212e C4E1F96E 		vmovq	xmm2, rbx	# _4, _4
 6588      D3
 6589 2133 C5F96ED9 		vmovd	xmm3, ecx	# shift, shift
 6590              	.LVL561:
 6591 2137 660F1F84 		.p2align 4,,10
 6591      00000000 
 6591      00
 6592              		.p2align 3
 6593              	.L456:
 6594              	.LBB597:
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6595              		.loc 1 616 25 is_stmt 1 view .LVU1883
 617:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 6596              		.loc 1 617 13 view .LVU1884
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6597              		.loc 1 616 32 view .LVU1885
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6598              		.loc 1 616 25 view .LVU1886
 617:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 6599              		.loc 1 617 13 view .LVU1887
 6600              	# sieve_extend.c:617:             *(dst+j) = (*(src+j))<<shift;
 617:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 6601              		.loc 1 617 25 is_stmt 0 view .LVU1888
 6602 2140 C5FE6F0C 		vmovdqu	ymm1, YMMWORD PTR [rsi+rax]	# MEM[base: src_35(D), index: ivtmp.685_114, offset: 0B], MEM[
 6602      06
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6603              		.loc 1 616 32 is_stmt 1 view .LVU1889
 6604              	.LVL562:
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6605              		.loc 1 616 25 view .LVU1890
 617:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 6606              		.loc 1 617 13 view .LVU1891
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
GAS LISTING /tmp/ccrNbbzt.s 			page 181


 6607              		.loc 1 616 32 view .LVU1892
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6608              		.loc 1 616 25 view .LVU1893
 617:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 6609              		.loc 1 617 13 view .LVU1894
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6610              		.loc 1 616 32 view .LVU1895
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6611              		.loc 1 616 25 view .LVU1896
 616:sieve_extend.c ****             *(dst+j) = (*(src+j))<<shift;
 6612              		.loc 1 616 25 is_stmt 0 view .LVU1897
 6613              	.LBE597:
 6614              	.LBB598:
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6615              		.loc 1 618 25 is_stmt 1 view .LVU1898
 619:sieve_extend.c ****     }
 6616              		.loc 1 619 13 view .LVU1899
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6617              		.loc 1 618 32 view .LVU1900
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6618              		.loc 1 618 25 view .LVU1901
 619:sieve_extend.c ****     }
 6619              		.loc 1 619 13 view .LVU1902
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6620              		.loc 1 618 32 view .LVU1903
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6621              		.loc 1 618 25 view .LVU1904
 619:sieve_extend.c ****     }
 6622              		.loc 1 619 13 view .LVU1905
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6623              		.loc 1 618 32 view .LVU1906
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6624              		.loc 1 618 25 view .LVU1907
 619:sieve_extend.c ****     }
 6625              		.loc 1 619 13 view .LVU1908
 6626 2145 41FFC0   		inc	r8d	# ivtmp.682
 6627              	.LBE598:
 6628              	.LBB599:
 6629              	# sieve_extend.c:617:             *(dst+j) = (*(src+j))<<shift;
 617:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 6630              		.loc 1 617 25 is_stmt 0 view .LVU1909
 6631 2148 C4E3FD00 		vpermq	ymm0, ymm1, 85	# vect__102.671, MEM[base: src_35(D), index: ivtmp.685_114, offset: 0B],
 6631      C155
 6632              	.LBE599:
 6633              	.LBB600:
 6634              	# sieve_extend.c:619:             *(dst+j) |= (*(src+1)>>(64-shift));
 619:sieve_extend.c ****     }
 6635              		.loc 1 619 34 view .LVU1910
 6636 214e C5FDD3C2 		vpsrlq	ymm0, ymm0, xmm2	# vect__57.672, vect__102.671, _4
 6637              	.LBE600:
 6638              	.LBB601:
 6639              	# sieve_extend.c:617:             *(dst+j) = (*(src+j))<<shift;
 617:sieve_extend.c ****         for (int j = 0; j < 4; ++j)
 6640              		.loc 1 617 34 view .LVU1911
 6641 2152 C5F5F3CB 		vpsllq	ymm1, ymm1, xmm3	# vect__104.676, MEM[base: src_35(D), index: ivtmp.685_114, offset: 0B], s
 6642              	.LBE601:
 6643              	.LBB602:
GAS LISTING /tmp/ccrNbbzt.s 			page 182


 6644              	# sieve_extend.c:619:             *(dst+j) |= (*(src+1)>>(64-shift));
 619:sieve_extend.c ****     }
 6645              		.loc 1 619 22 view .LVU1912
 6646 2156 C5FDEBC1 		vpor	ymm0, ymm0, ymm1	# vect__58.677, vect__57.672, vect__104.676
 6647 215a C5FE7F04 		vmovdqu	YMMWORD PTR [rdi+rax], ymm0	# MEM[base: dst_34(D), index: ivtmp.685_114, offset: 0B], vect
 6647      07
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6648              		.loc 1 618 32 is_stmt 1 view .LVU1913
 6649              	.LVL563:
 618:sieve_extend.c ****             *(dst+j) |= (*(src+1)>>(64-shift));
 6650              		.loc 1 618 25 view .LVU1914
 6651              	.LBE602:
 614:sieve_extend.c ****     {
 6652              		.loc 1 614 24 view .LVU1915
 614:sieve_extend.c ****     {
 6653              		.loc 1 614 12 view .LVU1916
 6654 215f 4883C020 		add	rax, 32	# ivtmp.685,
 6655 2163 4539C3   		cmp	r11d, r8d	# tmp172, ivtmp.682
 6656 2166 77D8     		ja	.L456	#,
 6657 2168 4489D0   		mov	eax, r10d	# _80, _80
 6658 216b 48FFC0   		inc	rax	# tmp144
 6659 216e 48C1E005 		sal	rax, 5	# _105,
 6660 2172 4801C7   		add	rdi, rax	# dst, _105
 6661 2175 4801C6   		add	rsi, rax	# src, _105
 6662 2178 41C1E302 		sal	r11d, 2	# tmp.655,
 6663              	.LVL564:
 6664              	.L457:
 621:sieve_extend.c ****     {
 6665              		.loc 1 621 12 view .LVU1917
 6666              	# sieve_extend.c:621:     for (; i < size; ++i,++src,++dst)
 621:sieve_extend.c ****     {
 6667              		.loc 1 621 5 is_stmt 0 view .LVU1918
 6668 217c 4439DA   		cmp	edx, r11d	# size, tmp.655
 6669 217f 0F8EA800 		jle	.L462	#,
 6669      0000
 6670 2185 8D42FF   		lea	eax, -1[rdx]	# tmp147,
 6671 2188 41B94000 		mov	r9d, 64	# tmp146,
 6671      0000
 6672 218e 4189D2   		mov	r10d, edx	# niters.650, size
 6673 2191 4429D8   		sub	eax, r11d	# tmp148, tmp.655
 6674 2194 4129C9   		sub	r9d, ecx	# _97, shift
 6675 2197 4529DA   		sub	r10d, r11d	# niters.650, tmp.655
 6676 219a 83F802   		cmp	eax, 2	# tmp148,
 6677 219d 763E     		jbe	.L458	#,
 6678              	.LVL565:
 623:sieve_extend.c ****     }    
 6679              		.loc 1 623 9 is_stmt 1 view .LVU1919
 6680              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6681              		.loc 1 623 23 is_stmt 0 view .LVU1920
 6682 219f C5FE6F26 		vmovdqu	ymm4, YMMWORD PTR [rsi]	# tmp179, MEM[(const uint64_t *)src_30]
 6683              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6684              		.loc 1 623 43 view .LVU1921
 6685 21a3 C5FE6F6E 		vmovdqu	ymm5, YMMWORD PTR 8[rsi]	# tmp180, MEM[(const uint64_t *)src_30 + 8B]
 6685      08
 6686              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
GAS LISTING /tmp/ccrNbbzt.s 			page 183


 623:sieve_extend.c ****     }    
 6687              		.loc 1 623 23 view .LVU1922
 6688 21a8 C5F96EC1 		vmovd	xmm0, ecx	# shift, shift
 6689              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6690              		.loc 1 623 43 view .LVU1923
 6691 21ac C4C1796E 		vmovd	xmm1, r9d	# _97, _97
 6691      C9
 6692 21b1 4589D0   		mov	r8d, r10d	# niters_vector_mult_vf.652, niters.650
 6693 21b4 4183E0FC 		and	r8d, -4	# niters_vector_mult_vf.652,
 6694              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6695              		.loc 1 623 23 view .LVU1924
 6696 21b8 C5DDD3C0 		vpsrlq	ymm0, ymm4, xmm0	# vect__17.659, tmp179, shift
 6697              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6698              		.loc 1 623 43 view .LVU1925
 6699 21bc C5D5F3C9 		vpsllq	ymm1, ymm5, xmm1	# vect__20.663, tmp180, _97
 6700 21c0 4489C0   		mov	eax, r8d	# niters_vector_mult_vf.652, niters_vector_mult_vf.652
 6701 21c3 48C1E003 		sal	rax, 3	# _129,
 6702              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6703              		.loc 1 623 32 view .LVU1926
 6704 21c7 C5FDEBC1 		vpor	ymm0, ymm0, ymm1	# vect__21.664, vect__17.659, vect__20.663
 6705              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6706              		.loc 1 623 14 view .LVU1927
 6707 21cb C5FE7F07 		vmovdqu	YMMWORD PTR [rdi], ymm0	# MEM[(uint64_t *)dst_86], vect__21.664
 621:sieve_extend.c ****     {
 6708              		.loc 1 621 22 is_stmt 1 view .LVU1928
 621:sieve_extend.c ****     {
 6709              		.loc 1 621 12 view .LVU1929
 6710 21cf 4801C6   		add	rsi, rax	# src, _129
 6711 21d2 4801C7   		add	rdi, rax	# dst, _129
 6712 21d5 4501C3   		add	r11d, r8d	# tmp.655, niters_vector_mult_vf.652
 6713 21d8 4539C2   		cmp	r10d, r8d	# niters.650, niters_vector_mult_vf.652
 6714 21db 7450     		je	.L462	#,
 6715              	.L458:
 6716              	.LVL566:
 623:sieve_extend.c ****     }    
 6717              		.loc 1 623 9 view .LVU1930
 6718              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6719              		.loc 1 623 35 is_stmt 0 view .LVU1931
 6720 21dd 488B4608 		mov	rax, QWORD PTR 8[rsi]	# _57, MEM[(const uint64_t *)src_110 + 8B]
 6721              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6722              		.loc 1 623 23 view .LVU1932
 6723 21e1 C462F3F7 		shrx	r8, QWORD PTR [rsi], rcx	# tmp157, *src_110, shift
 6723      06
 6724              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6725              		.loc 1 623 43 view .LVU1933
 6726 21e6 C462B1F7 		shlx	r10, rax, r9	# tmp159, _57, _97
 6726      D0
 6727              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
GAS LISTING /tmp/ccrNbbzt.s 			page 184


 6728              		.loc 1 623 32 view .LVU1934
 6729 21eb 4D09D0   		or	r8, r10	# tmp160, tmp159
 6730 21ee 4C8907   		mov	QWORD PTR [rdi], r8	# *dst_109, tmp160
 621:sieve_extend.c ****     {
 6731              		.loc 1 621 22 is_stmt 1 view .LVU1935
 6732              	.LVL567:
 621:sieve_extend.c ****     {
 6733              		.loc 1 621 12 view .LVU1936
 6734              	# sieve_extend.c:621:     for (; i < size; ++i,++src,++dst)
 621:sieve_extend.c ****     {
 6735              		.loc 1 621 22 is_stmt 0 view .LVU1937
 6736 21f1 458D4301 		lea	r8d, 1[r11]	# i,
 6737              	.LVL568:
 6738              	# sieve_extend.c:621:     for (; i < size; ++i,++src,++dst)
 621:sieve_extend.c ****     {
 6739              		.loc 1 621 5 view .LVU1938
 6740 21f5 4439C2   		cmp	edx, r8d	# size, i
 6741 21f8 7E33     		jle	.L462	#,
 623:sieve_extend.c ****     }    
 6742              		.loc 1 623 9 is_stmt 1 view .LVU1939
 6743              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6744              		.loc 1 623 35 is_stmt 0 view .LVU1940
 6745 21fa 4C8B4610 		mov	r8, QWORD PTR 16[rsi]	# _21, MEM[(const uint64_t *)src_110 + 16B]
 6746              	.LVL569:
 6747              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6748              		.loc 1 623 23 view .LVU1941
 6749 21fe C4E2F3F7 		shrx	rax, rax, rcx	# tmp162, _57, shift
 6749      C0
 6750              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6751              		.loc 1 623 43 view .LVU1942
 6752 2203 C442B1F7 		shlx	r10, r8, r9	# tmp163, _21, _97
 6752      D0
 6753              	# sieve_extend.c:621:     for (; i < size; ++i,++src,++dst)
 621:sieve_extend.c ****     {
 6754              		.loc 1 621 22 view .LVU1943
 6755 2208 4183C302 		add	r11d, 2	# i,
 6756              	.LVL570:
 6757              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6758              		.loc 1 623 32 view .LVU1944
 6759 220c 4C09D0   		or	rax, r10	# tmp164, tmp163
 6760 220f 48894708 		mov	QWORD PTR 8[rdi], rax	# MEM[(uint64_t *)dst_109 + 8B], tmp164
 621:sieve_extend.c ****     {
 6761              		.loc 1 621 22 is_stmt 1 view .LVU1945
 6762              	.LVL571:
 621:sieve_extend.c ****     {
 6763              		.loc 1 621 12 view .LVU1946
 6764              	# sieve_extend.c:621:     for (; i < size; ++i,++src,++dst)
 621:sieve_extend.c ****     {
 6765              		.loc 1 621 5 is_stmt 0 view .LVU1947
 6766 2213 4139D3   		cmp	r11d, edx	# i, size
 6767 2216 7D15     		jge	.L462	#,
 623:sieve_extend.c ****     }    
 6768              		.loc 1 623 9 is_stmt 1 view .LVU1948
GAS LISTING /tmp/ccrNbbzt.s 			page 185


 6769              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6770              		.loc 1 623 43 is_stmt 0 view .LVU1949
 6771 2218 488B4618 		mov	rax, QWORD PTR 24[rsi]	# MEM[(const uint64_t *)src_110 + 24B], MEM[(const uint64_t *)src_110 +
 6772              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6773              		.loc 1 623 23 view .LVU1950
 6774 221c C4C2F3F7 		shrx	rcx, r8, rcx	# tmp168, _21, shift
 6774      C8
 6775              	.LVL572:
 6776              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6777              		.loc 1 623 43 view .LVU1951
 6778 2221 C462B1F7 		shlx	r9, rax, r9	# tmp166, MEM[(const uint64_t *)src_110 + 24B], _97
 6778      C8
 6779              	# sieve_extend.c:623:         *dst = ((*src)>>shift) | (*(src+1)<<(64-shift));
 623:sieve_extend.c ****     }    
 6780              		.loc 1 623 32 view .LVU1952
 6781 2226 4C09C9   		or	rcx, r9	# tmp169, tmp166
 6782 2229 48894F10 		mov	QWORD PTR 16[rdi], rcx	# MEM[(uint64_t *)dst_109 + 16B], tmp169
 621:sieve_extend.c ****     {
 6783              		.loc 1 621 22 is_stmt 1 view .LVU1953
 6784              	.LVL573:
 621:sieve_extend.c ****     {
 6785              		.loc 1 621 12 view .LVU1954
 6786              	.L462:
 621:sieve_extend.c ****     {
 6787              		.loc 1 621 12 is_stmt 0 view .LVU1955
 6788 222d C5F877   		vzeroupper
 6789              	# sieve_extend.c:625: }
 625:sieve_extend.c **** 
 6790              		.loc 1 625 1 view .LVU1956
 6791 2230 5B       		pop	rbx	#
 6792 2231 5D       		pop	rbp	#
 6793              		.cfi_remember_state
 6794              		.cfi_def_cfa 7, 8
 6795 2232 C3       		ret	
 6796              	.LVL574:
 6797              	.L464:
 6798              		.cfi_restore_state
 6799              	# sieve_extend.c:612:     int i = 0;
 612:sieve_extend.c ****     // MSVC: use steps of 2 for SSE, 4 for AVX2, 8 for AVX512
 6800              		.loc 1 612 9 view .LVU1957
 6801 2233 4531DB   		xor	r11d, r11d	# tmp.655
 6802 2236 E941FFFF 		jmp	.L457	#
 6802      FF
 6803              		.cfi_endproc
 6804              	.LFE67:
 6806              		.section	.rodata.str1.8,"aMS",@progbits,1
 6807              		.align 8
 6808              	.LC5:
 6809 0000 52657375 		.string	"Result: Sievesize %ju is expected to have %ju primes. algorithm produced %ju primes\n"
 6809      6C743A20 
 6809      53696576 
 6809      6573697A 
 6809      6520256A 
 6810 0055 000000   		.align 8
GAS LISTING /tmp/ccrNbbzt.s 			page 186


 6811              	.LC6:
 6812 0058 4E6F2076 		.string	"No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produced %j
 6812      616C6964 
 6812      20726573 
 6812      756C742E 
 6812      20536965 
 6813              		.section	.rodata.str1.1
 6814              	.LC7:
 6815 0023 44656570 		.string	"DeepAnalyzing"
 6815      416E616C 
 6815      797A696E 
 6815      6700
 6816              		.section	.rodata.str1.8
 6817 00bb 00000000 		.align 8
 6817      00
 6818              	.LC8:
 6819 00c0 4E756D62 		.string	"Number %ju (%ju) was marked prime, but %ju * %ju = %ju\n"
 6819      65722025 
 6819      6A752028 
 6819      256A7529 
 6819      20776173 
 6820              		.align 8
 6821              	.LC9:
 6822 00f8 4E756D62 		.string	"Number %ju (%ju) was marked non-prime, but no factors found. So it is prime\n"
 6822      65722025 
 6822      6A752028 
 6822      256A7529 
 6822      20776173 
 6823              		.text
 6824 223b 0F1F4400 		.p2align 4
 6824      00
 6825              		.globl	validatePrimeCount
 6827              	validatePrimeCount:
 6828              	.LVL575:
 6829              	.LFB80:
1087:sieve_extend.c **** 
 6830              		.loc 1 1087 76 is_stmt 1 view -0
 6831              		.cfi_startproc
1087:sieve_extend.c **** 
 6832              		.loc 1 1087 76 is_stmt 0 view .LVU1959
 6833 2240 F30F1EFA 		endbr64	
1089:sieve_extend.c ****     counter_t valid_primes = 0;
 6834              		.loc 1 1089 5 is_stmt 1 view .LVU1960
 6835              	# sieve_extend.c:1087: int validatePrimeCount(struct sieve_state *sieve, int option_verboselevel) {
1087:sieve_extend.c **** 
 6836              		.loc 1 1087 76 is_stmt 0 view .LVU1961
 6837 2244 4157     		push	r15	#
 6838              		.cfi_def_cfa_offset 16
 6839              		.cfi_offset 15, -16
 6840 2246 4156     		push	r14	#
 6841              		.cfi_def_cfa_offset 24
 6842              		.cfi_offset 14, -24
 6843 2248 4155     		push	r13	#
 6844              		.cfi_def_cfa_offset 32
 6845              		.cfi_offset 13, -32
 6846 224a 4154     		push	r12	#
 6847              		.cfi_def_cfa_offset 40
GAS LISTING /tmp/ccrNbbzt.s 			page 187


 6848              		.cfi_offset 12, -40
 6849 224c 55       		push	rbp	#
 6850              		.cfi_def_cfa_offset 48
 6851              		.cfi_offset 6, -48
 6852 224d 4889FD   		mov	rbp, rdi	# sieve, tmp231
 6853 2250 53       		push	rbx	#
 6854              		.cfi_def_cfa_offset 56
 6855              		.cfi_offset 3, -56
 6856 2251 89F3     		mov	ebx, esi	# option_verboselevel, tmp232
 6857 2253 4883EC28 		sub	rsp, 40	#,
 6858              		.cfi_def_cfa_offset 96
 6859              	# sieve_extend.c:1089:     counter_t primecount = count_primes(sieve);
1089:sieve_extend.c ****     counter_t valid_primes = 0;
 6860              		.loc 1 1089 28 view .LVU1962
 6861 2257 488B7708 		mov	rsi, QWORD PTR 8[rdi]	# _25, MEM[(long unsigned int *)sieve_18(D) + 8B]
 6862              	.LVL576:
1089:sieve_extend.c ****     counter_t valid_primes = 0;
 6863              		.loc 1 1089 28 view .LVU1963
 6864 225b 488B0F   		mov	rcx, QWORD PTR [rdi]	# _24, MEM[(uint64_t * *)sieve_18(D)]
 6865              	.LBB624:
 6866              	.LBI624:
1058:sieve_extend.c ****     counter_t primeCount = 1;
 6867              		.loc 1 1058 18 is_stmt 1 view .LVU1964
 6868              	.LVL577:
 6869              	.LBB625:
 6870              	.LBB626:
1060:sieve_extend.c ****     return primeCount;
 6871              		.loc 1 1060 30 view .LVU1965
 6872 225e 4C8B4F10 		mov	r9, QWORD PTR 16[rdi]	# pretmp_199, sieve_18(D)->size
 6873              	# sieve_extend.c:1060:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1060:sieve_extend.c ****     return primeCount;
 6874              		.loc 1 1060 5 is_stmt 0 view .LVU1966
 6875 2262 4883FE01 		cmp	rsi, 1	# _25,
 6876 2266 0F86F702 		jbe	.L466	#,
 6876      0000
 6877              	# sieve_extend.c:1060:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1060:sieve_extend.c ****     return primeCount;
 6878              		.loc 1 1060 20 view .LVU1967
 6879 226c B8010000 		mov	eax, 1	# factor,
 6879      00
 6880              	.LBE626:
 6881              	# sieve_extend.c:1059:     counter_t primeCount = 1;
1059:sieve_extend.c ****     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(sieve->bitarray, factor+
 6882              		.loc 1 1059 15 view .LVU1968
 6883 2271 41B80100 		mov	r8d, 1	# primeCount,
 6883      0000
 6884              	.LVL578:
 6885 2277 660F1F84 		.p2align 4,,10
 6885      00000000 
 6885      00
 6886              		.p2align 3
 6887              	.L469:
 6888              	.LBB629:
1060:sieve_extend.c ****     return primeCount;
 6889              		.loc 1 1060 104 is_stmt 1 view .LVU1969
 6890              	# sieve_extend.c:1060:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1060:sieve_extend.c ****     return primeCount;
GAS LISTING /tmp/ccrNbbzt.s 			page 188


 6891              		.loc 1 1060 114 is_stmt 0 view .LVU1970
 6892 2280 49FFC0   		inc	r8	# primeCount
 6893              	.LVL579:
 6894              		.p2align 4,,10
 6895 2283 0F1F4400 		.p2align 3
 6895      00
 6896              	.L555:
1060:sieve_extend.c ****     return primeCount;
 6897              		.loc 1 1060 52 is_stmt 1 view .LVU1971
 6898              	# sieve_extend.c:1060:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1060:sieve_extend.c ****     return primeCount;
 6899              		.loc 1 1060 61 is_stmt 0 view .LVU1972
 6900 2288 48FFC0   		inc	rax	# factor
 6901              	.LVL580:
 6902              	.LBB627:
 6903              	.LBI627:
 120:sieve_extend.c ****     while (bitarray[wordindex(index)] & markmask(index)) index++;
 6904              		.loc 1 120 25 is_stmt 1 view .LVU1973
 6905              	.LBB628:
 121:sieve_extend.c ****     return index;
 6906              		.loc 1 121 5 view .LVU1974
 121:sieve_extend.c ****     return index;
 6907              		.loc 1 121 11 view .LVU1975
 6908              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 6909              		.loc 1 121 21 is_stmt 0 view .LVU1976
 6910 228b 4889C2   		mov	rdx, rax	# tmp162, factor
 6911 228e 48C1EA06 		shr	rdx, 6	# tmp162,
 6912              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 6913              		.loc 1 121 12 view .LVU1977
 6914 2292 488B14D1 		mov	rdx, QWORD PTR [rcx+rdx*8]	# *_106,* _24
 6915              	# sieve_extend.c:121:     while (bitarray[wordindex(index)] & markmask(index)) index++;
 121:sieve_extend.c ****     return index;
 6916              		.loc 1 121 11 view .LVU1978
 6917 2296 480FA3C2 		bt	rdx, rax	# *_106, factor
 6918 229a 72EC     		jc	.L555	#,
 6919              	.LVL581:
 121:sieve_extend.c ****     return index;
 6920              		.loc 1 121 11 view .LVU1979
 6921              	.LBE628:
 6922              	.LBE627:
1060:sieve_extend.c ****     return primeCount;
 6923              		.loc 1 1060 30 is_stmt 1 view .LVU1980
 6924              	# sieve_extend.c:1060:     for (counter_t factor=1; factor < sieve->bits; factor = searchBitFalse(s
1060:sieve_extend.c ****     return primeCount;
 6925              		.loc 1 1060 5 is_stmt 0 view .LVU1981
 6926 229c 4839C6   		cmp	rsi, rax	# _25, factor
 6927 229f 77DF     		ja	.L469	#,
 6928              	.LBE629:
1061:sieve_extend.c **** }
 6929              		.loc 1 1061 5 is_stmt 1 view .LVU1982
 6930              	.LVL582:
1061:sieve_extend.c **** }
 6931              		.loc 1 1061 5 is_stmt 0 view .LVU1983
 6932              	.LBE625:
 6933              	.LBE624:
GAS LISTING /tmp/ccrNbbzt.s 			page 189


1090:sieve_extend.c ****     switch(sieve->size) {
 6934              		.loc 1 1090 5 is_stmt 1 view .LVU1984
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 6935              		.loc 1 1091 5 view .LVU1985
 6936 22a1 83FB03   		cmp	ebx, 3	# option_verboselevel,
 6937 22a4 0F9FC0   		setg	al	#, tmp172
 6938 22a7 4981F9A0 		cmp	r9, 100000	# pretmp_199,
 6938      860100
 6939 22ae 0F84A204 		je	.L470	#,
 6939      0000
 6940 22b4 0F865F01 		jbe	.L556	#,
 6940      0000
 6941 22ba 4981F900 		cmp	r9, 100000000	# pretmp_199,
 6941      E1F505
 6942 22c1 0F844C04 		je	.L478	#,
 6942      0000
 6943 22c7 0F86CB01 		jbe	.L557	#,
 6943      0000
 6944 22cd 4981F900 		cmp	r9, 1000000000	# pretmp_199,
 6944      CA9A3B
 6945 22d4 0F856004 		jne	.L476	#,
 6945      0000
 6946 22da 4981F82E 		cmp	r8, 50847534	# primeCount,
 6946      DF0703
 6947 22e1 410F94C5 		sete	r13b	#, tmp189
 6948 22e5 4421E8   		and	eax, r13d	# _251, tmp189
 6949 22e8 4981F82E 		cmp	r8, 50847534	# primeCount,
 6949      DF0703
 6950 22ef 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp189
 6951 22f3 410F95C6 		setne	r14b	#, _135
1100:sieve_extend.c ****         default:            valid_primes= 0;
 6952              		.loc 1 1100 29 view .LVU1986
 6953              	.LVL583:
1100:sieve_extend.c ****         default:            valid_primes= 0;
 6954              		.loc 1 1100 54 view .LVU1987
 6955              	# sieve_extend.c:1100:         case 1000000000:    valid_primes = 50847534; break;
1100:sieve_extend.c ****         default:            valid_primes= 0;
 6956              		.loc 1 1100 42 is_stmt 0 view .LVU1988
 6957 22f7 B92EDF07 		mov	ecx, 50847534	# valid_primes,
 6957      03
 6958              	.LVL584:
 6959 22fc 0F1F4000 		.p2align 4,,10
 6960              		.p2align 3
 6961              	.L483:
1104:sieve_extend.c ****     if (valid  && option_verboselevel >= 4) printf("Result: Sievesize %ju is expected to have %ju p
 6962              		.loc 1 1104 5 is_stmt 1 view .LVU1989
1105:sieve_extend.c ****     if (!valid && option_verboselevel >= 1) {
 6963              		.loc 1 1105 5 view .LVU1990
 6964              	# sieve_extend.c:1105:     if (valid  && option_verboselevel >= 4) printf("Result: Sievesize %ju is
1105:sieve_extend.c ****     if (!valid && option_verboselevel >= 1) {
 6965              		.loc 1 1105 8 is_stmt 0 view .LVU1991
 6966 2300 84C0     		test	al, al	# _251
 6967 2302 0F84B102 		je	.L484	#,
 6967      0000
1105:sieve_extend.c ****     if (!valid && option_verboselevel >= 1) {
 6968              		.loc 1 1105 45 is_stmt 1 discriminator 1 view .LVU1992
 6969              	.LVL585:
GAS LISTING /tmp/ccrNbbzt.s 			page 190


 6970              	.LBB631:
 6971              	.LBI631:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 6972              		.loc 3 105 1 discriminator 1 view .LVU1993
 6973              	.LBB632:
 6974              		.loc 3 107 3 discriminator 1 view .LVU1994
 6975              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 6976              		.loc 3 107 10 is_stmt 0 discriminator 1 view .LVU1995
 6977 2308 4C89CA   		mov	rdx, r9	#, pretmp_199
 6978 230b 488D3500 		lea	rsi, .LC5[rip]	#,
 6978      000000
 6979 2312 BF010000 		mov	edi, 1	#,
 6979      00
 6980              	.LVL586:
 6981              		.loc 3 107 10 discriminator 1 view .LVU1996
 6982 2317 31C0     		xor	eax, eax	#
 6983 2319 E8000000 		call	__printf_chk@PLT	#
 6983      00
 6984              	.LVL587:
 6985              		.loc 3 107 10 discriminator 1 view .LVU1997
 6986              	.LBE632:
 6987              	.LBE631:
1106:sieve_extend.c ****         printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produ
 6988              		.loc 1 1106 5 is_stmt 1 discriminator 1 view .LVU1998
 6989              	.L485:
1110:sieve_extend.c ****     return (valid);
 6990              		.loc 1 1110 5 view .LVU1999
 6991              	# sieve_extend.c:1110:     if (!valid && option_verboselevel >= 3) deepAnalyzePrimes(sieve);
1110:sieve_extend.c ****     return (valid);
 6992              		.loc 1 1110 8 is_stmt 0 view .LVU2000
 6993 231e 83FB02   		cmp	ebx, 2	# option_verboselevel,
 6994 2321 0F8EE000 		jle	.L465	#,
 6994      0000
 6995 2327 4584F6   		test	r14b, r14b	# _135
 6996 232a 0F84D700 		je	.L465	#,
 6996      0000
1110:sieve_extend.c ****     return (valid);
 6997              		.loc 1 1110 45 is_stmt 1 discriminator 1 view .LVU2001
 6998              	.LBB633:
 6999              	.LBI633:
1064:sieve_extend.c ****     printf("DeepAnalyzing\n");
 7000              		.loc 1 1064 13 discriminator 1 view .LVU2002
 7001              	.LVL588:
 7002              	.LBB634:
1065:sieve_extend.c ****     counter_t warn_prime = 0;
 7003              		.loc 1 1065 5 discriminator 1 view .LVU2003
 7004              	.LBB635:
 7005              	.LBI635:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7006              		.loc 3 105 1 discriminator 1 view .LVU2004
 7007              	.LBB636:
 7008              		.loc 3 107 3 discriminator 1 view .LVU2005
 7009              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7010              		.loc 3 107 10 is_stmt 0 discriminator 1 view .LVU2006
 7011 2330 488D3D00 		lea	rdi, .LC7[rip]	#,
 7011      000000
 7012 2337 E8000000 		call	puts@PLT	#
GAS LISTING /tmp/ccrNbbzt.s 			page 191


 7012      00
 7013              	.LVL589:
 7014              		.loc 3 107 10 discriminator 1 view .LVU2007
 7015              	.LBE636:
 7016              	.LBE635:
1066:sieve_extend.c ****     counter_t warn_nonprime = 0;
 7017              		.loc 1 1066 5 is_stmt 1 discriminator 1 view .LVU2008
1067:sieve_extend.c ****     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
 7018              		.loc 1 1067 5 discriminator 1 view .LVU2009
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7019              		.loc 1 1068 5 discriminator 1 view .LVU2010
 7020              	.LBB637:
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7021              		.loc 1 1068 10 discriminator 1 view .LVU2011
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7022              		.loc 1 1068 31 discriminator 1 view .LVU2012
 7023              	# sieve_extend.c:1068:     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7024              		.loc 1 1068 44 is_stmt 0 discriminator 1 view .LVU2013
 7025 233c 4C8B4D08 		mov	r9, QWORD PTR 8[rbp]	# _137, MEM[(uint64_t *)sieve_18(D) + 8B]
 7026              	# sieve_extend.c:1068:     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7027              		.loc 1 1068 5 discriminator 1 view .LVU2014
 7028 2340 4983F901 		cmp	r9, 1	# _137,
 7029 2344 0F86BD00 		jbe	.L465	#,
 7029      0000
 7030              	.LBE637:
 7031              	# sieve_extend.c:1067:     counter_t warn_nonprime = 0;
1067:sieve_extend.c ****     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
 7032              		.loc 1 1067 15 view .LVU2015
 7033 234a 48C74424 		mov	QWORD PTR 8[rsp], 0	# %sfp,
 7033      08000000 
 7033      00
 7034              	.LBB659:
 7035              	.LBB638:
 7036              	.LBB639:
 7037              	.LBB640:
 7038              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7039              		.loc 3 107 10 view .LVU2016
 7040 2353 44896C24 		mov	DWORD PTR 20[rsp], r13d	# %sfp, <retval>
 7040      14
 7041              	.LBE640:
 7042              	.LBE639:
 7043              	.LBE638:
 7044              	# sieve_extend.c:1068:     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7045              		.loc 1 1068 5 view .LVU2017
 7046 2358 41BF0200 		mov	r15d, 2	# ivtmp.718,
 7046      0000
 7047 235e 41BC0300 		mov	r12d, 3	# ivtmp.716,
 7047      0000
 7048              	.LBE659:
 7049              	# sieve_extend.c:1066:     counter_t warn_prime = 0;
1066:sieve_extend.c ****     counter_t warn_nonprime = 0;
 7050              		.loc 1 1066 15 view .LVU2018
 7051 2364 4531C0   		xor	r8d, r8d	# warn_prime
 7052              	.LBB660:
GAS LISTING /tmp/ccrNbbzt.s 			page 192


 7053              	# sieve_extend.c:1068:     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7054              		.loc 1 1068 20 view .LVU2019
 7055 2367 41BE0100 		mov	r14d, 1	# prime,
 7055      0000
 7056              	.LBB647:
 7057              	.LBB644:
 7058              	.LBB641:
 7059              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7060              		.loc 3 107 10 view .LVU2020
 7061 236d 4C89CF   		mov	rdi, r9	# _137, _137
 7062 2370 4989ED   		mov	r13, rbp	# sieve, sieve
 7063              	.LVL590:
 7064              		.p2align 4,,10
 7065 2373 0F1F4400 		.p2align 3
 7065      00
 7066              	.L495:
 7067              		.loc 3 107 10 view .LVU2021
 7068              	.LBE641:
 7069              	.LBE644:
 7070              	.LBE647:
1069:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
 7071              		.loc 1 1069 9 is_stmt 1 view .LVU2022
 7072              	# sieve_extend.c:1069:         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) {
1069:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
 7073              		.loc 1 1069 29 is_stmt 0 view .LVU2023
 7074 2378 498B4500 		mov	rax, QWORD PTR 0[r13]	# MEM[(uint64_t * *)sieve_18(D)], MEM[(uint64_t * *)sieve_18(D)]
 7075              	# sieve_extend.c:1069:         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) {
1069:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
 7076              		.loc 1 1069 30 view .LVU2024
 7077 237c 4C89F2   		mov	rdx, r14	# tmp198, prime
 7078 237f 48C1EA06 		shr	rdx, 6	# tmp198,
 7079              	# sieve_extend.c:1069:         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) {
1069:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
 7080              		.loc 1 1069 71 view .LVU2025
 7081 2383 488B0CD0 		mov	rcx, QWORD PTR [rax+rdx*8]	# *_47, *_47
 7082 2387 C4E28BF7 		shrx	rcx, rcx, r14	# tmp201, *_47, prime
 7082      C9
 7083              	# sieve_extend.c:1069:         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) {
1069:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
 7084              		.loc 1 1069 12 view .LVU2026
 7085 238c 83E101   		and	ecx, 1	# c,
 7086 238f 0F844B01 		je	.L487	#,
 7086      0000
 7087              	.LVL591:
 7088              	.LBB648:
 7089              	.LBB649:
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7090              		.loc 1 1078 32 is_stmt 1 view .LVU2027
 7091              	# sieve_extend.c:1078:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7092              		.loc 1 1078 13 is_stmt 0 view .LVU2028
 7093 2395 BE030000 		mov	esi, 3	# ivtmp.708,
 7093      00
 7094              	.LBE649:
 7095              	# sieve_extend.c:1077:             counter_t c_prime = 0;
1077:sieve_extend.c ****             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
GAS LISTING /tmp/ccrNbbzt.s 			page 193


 7096              		.loc 1 1077 23 view .LVU2029
 7097 239a 4531C9   		xor	r9d, r9d	# c_prime
 7098              	.LBB650:
 7099              	# sieve_extend.c:1078:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7100              		.loc 1 1078 13 view .LVU2030
 7101 239d 4885FF   		test	rdi, rdi	# _137
 7102 23a0 751E     		jne	.L488	#,
 7103 23a2 E9720200 		jmp	.L558	#
 7103      00
 7104              	.LVL592:
 7105 23a7 660F1F84 		.p2align 4,,10
 7105      00000000 
 7105      00
 7106              		.p2align 3
 7107              	.L559:
 7108              	# sieve_extend.c:1078:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7109              		.loc 1 1078 51 view .LVU2031
 7110 23b0 4889C8   		mov	rax, rcx	# tmp218, c
 7111 23b3 480FAFC1 		imul	rax, rcx	# tmp218, c
 7112 23b7 4883C602 		add	rsi, 2	# ivtmp.708,
 7113              	# sieve_extend.c:1078:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7114              		.loc 1 1078 47 view .LVU2032
 7115 23bb 4C39E0   		cmp	rax, r12	# tmp218, ivtmp.716
 7116 23be 7725     		ja	.L494	#,
 7117              	.LVL593:
 7118              	.L488:
1079:sieve_extend.c ****             }
 7119              		.loc 1 1079 17 is_stmt 1 view .LVU2033
 7120              	# sieve_extend.c:1079:                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_
1079:sieve_extend.c ****             }
 7121              		.loc 1 1079 48 is_stmt 0 view .LVU2034
 7122 23c0 488D0409 		lea	rax, [rcx+rcx]	# tmp210,
 7123 23c4 4C39F8   		cmp	rax, r15	# tmp210, ivtmp.718
 7124 23c7 7414     		je	.L493	#,
 7125              	# sieve_extend.c:1079:                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_
1079:sieve_extend.c ****             }
 7126              		.loc 1 1079 33 view .LVU2035
 7127 23c9 31D2     		xor	edx, edx	# tmp214
 7128 23cb 4C89E0   		mov	rax, r12	# tmp215, ivtmp.716
 7129 23ce 48F7F6   		div	rsi	# ivtmp.708
 7130              	# sieve_extend.c:1079:                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_
1079:sieve_extend.c ****             }
 7131              		.loc 1 1079 20 view .LVU2036
 7132 23d1 4885D2   		test	rdx, rdx	# tmp214
 7133 23d4 0F94C0   		sete	al	#, tmp217
 7134              	# sieve_extend.c:1079:                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_
1079:sieve_extend.c ****             }
 7135              		.loc 1 1079 82 view .LVU2037
 7136 23d7 3C01     		cmp	al, 1	# tmp217,
 7137 23d9 4983D9FF 		sbb	r9, -1	# c_prime,
 7138              	.LVL594:
 7139              	.L493:
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7140              		.loc 1 1078 68 is_stmt 1 view .LVU2038
GAS LISTING /tmp/ccrNbbzt.s 			page 194


 7141              	# sieve_extend.c:1078:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7142              		.loc 1 1078 69 is_stmt 0 view .LVU2039
 7143 23dd 48FFC1   		inc	rcx	# c
 7144              	.LVL595:
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7145              		.loc 1 1078 32 is_stmt 1 view .LVU2040
 7146              	# sieve_extend.c:1078:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1078:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) c_prime++;
 7147              		.loc 1 1078 13 is_stmt 0 view .LVU2041
 7148 23e0 4839F9   		cmp	rcx, rdi	# c, _137
 7149 23e3 76CB     		jbe	.L559	#,
 7150              	.L494:
 7151              	.LBE650:
1081:sieve_extend.c ****         }
 7152              		.loc 1 1081 13 is_stmt 1 view .LVU2042
 7153              	# sieve_extend.c:1081:             if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju)
1081:sieve_extend.c ****         }
 7154              		.loc 1 1081 16 is_stmt 0 view .LVU2043
 7155 23e5 4D85C9   		test	r9, r9	# c_prime
 7156 23e8 0F841202 		je	.L560	#,
 7156      0000
 7157              	.LVL596:
 7158              	.L491:
1081:sieve_extend.c ****         }
 7159              		.loc 1 1081 16 view .LVU2044
 7160              	.LBE648:
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7161              		.loc 1 1068 52 is_stmt 1 view .LVU2045
 7162              	# sieve_extend.c:1068:     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7163              		.loc 1 1068 57 is_stmt 0 view .LVU2046
 7164 23ee 49FFC6   		inc	r14	# prime
 7165              	.LVL597:
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7166              		.loc 1 1068 31 is_stmt 1 view .LVU2047
 7167 23f1 4983C402 		add	r12, 2	# ivtmp.716,
 7168 23f5 4983C702 		add	r15, 2	# ivtmp.718,
 7169              	# sieve_extend.c:1068:     for (counter_t prime = 1; prime < sieve->bits; prime++ ) {
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7170              		.loc 1 1068 5 is_stmt 0 view .LVU2048
 7171 23f9 4939FE   		cmp	r14, rdi	# prime, _137
 7172 23fc 0F8276FF 		jb	.L495	#,
 7172      FFFF
 7173              	.LVL598:
 7174              	.L552:
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7175              		.loc 1 1068 5 view .LVU2049
 7176 2402 448B6C24 		mov	r13d, DWORD PTR 20[rsp]	# <retval>, %sfp
 7176      14
 7177              	.LVL599:
 7178              	.L465:
1068:sieve_extend.c ****         if ((sieve->bitarray[wordindex(prime)] & markmask_calc(prime))==0) { // is this a prime?
 7179              		.loc 1 1068 5 view .LVU2050
 7180              	.LBE660:
 7181              	.LBE634:
 7182              	.LBE633:
GAS LISTING /tmp/ccrNbbzt.s 			page 195


 7183              	# sieve_extend.c:1112: }
1112:sieve_extend.c **** 
 7184              		.loc 1 1112 1 view .LVU2051
 7185 2407 4883C428 		add	rsp, 40	#,
 7186              		.cfi_remember_state
 7187              		.cfi_def_cfa_offset 56
 7188 240b 5B       		pop	rbx	#
 7189              		.cfi_def_cfa_offset 48
 7190 240c 5D       		pop	rbp	#
 7191              		.cfi_def_cfa_offset 40
 7192 240d 415C     		pop	r12	#
 7193              		.cfi_def_cfa_offset 32
 7194 240f 4489E8   		mov	eax, r13d	#, <retval>
 7195 2412 415D     		pop	r13	#
 7196              		.cfi_def_cfa_offset 24
 7197 2414 415E     		pop	r14	#
 7198              		.cfi_def_cfa_offset 16
 7199 2416 415F     		pop	r15	#
 7200              		.cfi_def_cfa_offset 8
 7201 2418 C3       		ret	
 7202              	.LVL600:
 7203              	.L556:
 7204              		.cfi_restore_state
 7205              	# sieve_extend.c:1091:     switch(sieve->size) {
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7206              		.loc 1 1091 5 view .LVU2052
 7207 2419 4981F9E8 		cmp	r9, 1000	# pretmp_199,
 7207      030000
 7208 2420 0F845703 		je	.L472	#,
 7208      0000
 7209 2426 7634     		jbe	.L561	#,
 7210 2428 4981F910 		cmp	r9, 10000	# pretmp_199,
 7210      270000
 7211 242f 0F850503 		jne	.L476	#,
 7211      0000
 7212 2435 4981F8CD 		cmp	r8, 1229	# primeCount,
 7212      040000
 7213 243c 410F94C5 		sete	r13b	#, tmp179
 7214 2440 4421E8   		and	eax, r13d	# _251, tmp179
 7215 2443 4981F8CD 		cmp	r8, 1229	# primeCount,
 7215      040000
 7216 244a 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp179
 7217 244e 410F95C6 		setne	r14b	#, _135
1095:sieve_extend.c ****         case 100000:        valid_primes = 9592;     break;
 7218              		.loc 1 1095 29 is_stmt 1 view .LVU2053
 7219              	.LVL601:
1095:sieve_extend.c ****         case 100000:        valid_primes = 9592;     break;
 7220              		.loc 1 1095 54 view .LVU2054
 7221              	# sieve_extend.c:1095:         case 10000:         valid_primes = 1229;     break;
1095:sieve_extend.c ****         case 100000:        valid_primes = 9592;     break;
 7222              		.loc 1 1095 42 is_stmt 0 view .LVU2055
 7223 2452 B9CD0400 		mov	ecx, 1229	# valid_primes,
 7223      00
 7224              	# sieve_extend.c:1095:         case 10000:         valid_primes = 1229;     break;
1095:sieve_extend.c ****         case 100000:        valid_primes = 9592;     break;
 7225              		.loc 1 1095 9 view .LVU2056
 7226 2457 E9A4FEFF 		jmp	.L483	#
GAS LISTING /tmp/ccrNbbzt.s 			page 196


 7226      FF
 7227              	.LVL602:
 7228              	.L561:
 7229              	# sieve_extend.c:1091:     switch(sieve->size) {
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7230              		.loc 1 1091 5 view .LVU2057
 7231 245c 4983F90A 		cmp	r9, 10	# pretmp_199,
 7232 2460 0F842002 		je	.L474	#,
 7232      0000
 7233 2466 4983F964 		cmp	r9, 100	# pretmp_199,
 7234 246a 0F85CA02 		jne	.L476	#,
 7234      0000
 7235 2470 4983F819 		cmp	r8, 25	# primeCount,
 7236 2474 410F94C5 		sete	r13b	#, tmp173
 7237 2478 4421E8   		and	eax, r13d	# _251, tmp173
 7238 247b 4983F819 		cmp	r8, 25	# primeCount,
 7239 247f 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp173
 7240 2483 410F95C6 		setne	r14b	#, _135
 7241              	# sieve_extend.c:1093:         case 100:           valid_primes = 25;       break;
1093:sieve_extend.c ****         case 1000:          valid_primes = 168;      break;
 7242              		.loc 1 1093 42 view .LVU2058
 7243 2487 B9190000 		mov	ecx, 25	# valid_primes,
 7243      00
 7244 248c E96FFEFF 		jmp	.L483	#
 7244      FF
 7245              		.p2align 4,,10
 7246 2491 0F1F8000 		.p2align 3
 7246      000000
 7247              	.L557:
 7248              	# sieve_extend.c:1091:     switch(sieve->size) {
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7249              		.loc 1 1091 5 view .LVU2059
 7250 2498 4981F940 		cmp	r9, 1000000	# pretmp_199,
 7250      420F00
 7251 249f 0F84BA01 		je	.L480	#,
 7251      0000
 7252 24a5 4981F980 		cmp	r9, 10000000	# pretmp_199,
 7252      969800
 7253 24ac 0F858802 		jne	.L476	#,
 7253      0000
 7254 24b2 4981F803 		cmp	r8, 664579	# primeCount,
 7254      240A00
 7255 24b9 410F94C5 		sete	r13b	#, tmp185
 7256 24bd 4421E8   		and	eax, r13d	# _251, tmp185
 7257 24c0 4981F803 		cmp	r8, 664579	# primeCount,
 7257      240A00
 7258 24c7 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp185
 7259 24cb 410F95C6 		setne	r14b	#, _135
1098:sieve_extend.c ****         case 100000000:     valid_primes = 5761455;  break;
 7260              		.loc 1 1098 29 is_stmt 1 view .LVU2060
 7261              	.LVL603:
1098:sieve_extend.c ****         case 100000000:     valid_primes = 5761455;  break;
 7262              		.loc 1 1098 54 view .LVU2061
 7263              	# sieve_extend.c:1098:         case 10000000:      valid_primes = 664579;   break;
1098:sieve_extend.c ****         case 100000000:     valid_primes = 5761455;  break;
 7264              		.loc 1 1098 42 is_stmt 0 view .LVU2062
 7265 24cf B903240A 		mov	ecx, 664579	# valid_primes,
GAS LISTING /tmp/ccrNbbzt.s 			page 197


 7265      00
 7266              	# sieve_extend.c:1098:         case 10000000:      valid_primes = 664579;   break;
1098:sieve_extend.c ****         case 100000000:     valid_primes = 5761455;  break;
 7267              		.loc 1 1098 9 view .LVU2063
 7268 24d4 E927FEFF 		jmp	.L483	#
 7268      FF
 7269              	.LVL604:
 7270 24d9 0F1F8000 		.p2align 4,,10
 7270      000000
 7271              		.p2align 3
 7272              	.L487:
 7273              	.LBB665:
 7274              	.LBB663:
 7275              	.LBB661:
 7276              	.LBB657:
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7277              		.loc 1 1070 32 is_stmt 1 view .LVU2064
 7278              	# sieve_extend.c:1070:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7279              		.loc 1 1070 13 is_stmt 0 view .LVU2065
 7280 24e0 4885FF   		test	rdi, rdi	# _137
 7281 24e3 0F8419FF 		je	.L552	#,
 7281      FFFF
 7282              	# sieve_extend.c:1070:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7283              		.loc 1 1070 27 view .LVU2066
 7284 24e9 BB010000 		mov	ebx, 1	# c,
 7284      00
 7285 24ee EB1F     		jmp	.L492	#
 7286              	.LVL605:
 7287              		.p2align 4,,10
 7288              		.p2align 3
 7289              	.L501:
 7290              	# sieve_extend.c:1072:                     if (warn_prime++ < 30) printf("Number %ju (%ju) was mark
1072:sieve_extend.c ****                 }
 7291              		.loc 1 1072 35 view .LVU2067
 7292 24f0 4989E8   		mov	r8, rbp	# warn_prime, warn_prime
 7293              	.LVL606:
 7294              	.L490:
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7295              		.loc 1 1070 68 is_stmt 1 view .LVU2068
 7296              	# sieve_extend.c:1070:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7297              		.loc 1 1070 69 is_stmt 0 view .LVU2069
 7298 24f3 48FFC3   		inc	rbx	# c
 7299              	.LVL607:
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7300              		.loc 1 1070 32 is_stmt 1 view .LVU2070
 7301              	# sieve_extend.c:1070:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7302              		.loc 1 1070 13 is_stmt 0 view .LVU2071
 7303 24f6 4839FB   		cmp	rbx, rdi	# c, _137
 7304 24f9 0F87EFFE 		ja	.L491	#,
 7304      FFFF
 7305              	# sieve_extend.c:1070:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7306              		.loc 1 1070 51 view .LVU2072
GAS LISTING /tmp/ccrNbbzt.s 			page 198


 7307 24ff 4889D8   		mov	rax, rbx	# tmp209, c
 7308 2502 480FAFC3 		imul	rax, rbx	# tmp209, c
 7309              	# sieve_extend.c:1070:             for(counter_t c=1; c<=sieve->bits && c*c <= prime*2+1; c++) {
1070:sieve_extend.c ****                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
 7310              		.loc 1 1070 47 view .LVU2073
 7311 2506 4C39E0   		cmp	rax, r12	# tmp209, ivtmp.716
 7312 2509 0F87DFFE 		ja	.L491	#,
 7312      FFFF
 7313              	.LVL608:
 7314              	.L492:
1071:sieve_extend.c ****                     if (warn_prime++ < 30) printf("Number %ju (%ju) was marked prime, but %ju * %ju
 7315              		.loc 1 1071 17 is_stmt 1 view .LVU2074
 7316 250f 488D341B 		lea	rsi, [rbx+rbx]	# _216,
 7317              	# sieve_extend.c:1071:                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
1071:sieve_extend.c ****                     if (warn_prime++ < 30) printf("Number %ju (%ju) was marked prime, but %ju * %ju
 7318              		.loc 1 1071 39 is_stmt 0 view .LVU2075
 7319 2513 488D4E01 		lea	rcx, 1[rsi]	# _55,
 7320 2517 4C89E0   		mov	rax, r12	# tmp203, ivtmp.716
 7321 251a 31D2     		xor	edx, edx	# tmp204
 7322 251c 48F7F1   		div	rcx	# _55
 7323              	# sieve_extend.c:1071:                 if ((prime*2+1) % (c*2+1) == 0 && (c*2+1) != (prime*2+1)) {
1071:sieve_extend.c ****                     if (warn_prime++ < 30) printf("Number %ju (%ju) was marked prime, but %ju * %ju
 7324              		.loc 1 1071 48 view .LVU2076
 7325 251f 4885D2   		test	rdx, rdx	# tmp204
 7326 2522 75CF     		jne	.L490	#,
1071:sieve_extend.c ****                     if (warn_prime++ < 30) printf("Number %ju (%ju) was marked prime, but %ju * %ju
 7327              		.loc 1 1071 48 view .LVU2077
 7328 2524 4939F7   		cmp	r15, rsi	# ivtmp.718, _216
 7329 2527 74CA     		je	.L490	#,
1072:sieve_extend.c ****                 }
 7330              		.loc 1 1072 21 is_stmt 1 view .LVU2078
 7331              	# sieve_extend.c:1072:                     if (warn_prime++ < 30) printf("Number %ju (%ju) was mark
1072:sieve_extend.c ****                 }
 7332              		.loc 1 1072 35 is_stmt 0 view .LVU2079
 7333 2529 498D6801 		lea	rbp, 1[r8]	# warn_prime,
 7334              	.LVL609:
 7335              	# sieve_extend.c:1072:                     if (warn_prime++ < 30) printf("Number %ju (%ju) was mark
1072:sieve_extend.c ****                 }
 7336              		.loc 1 1072 24 view .LVU2080
 7337 252d 4983F81D 		cmp	r8, 29	# warn_prime,
 7338 2531 77BD     		ja	.L501	#,
1072:sieve_extend.c ****                 }
 7339              		.loc 1 1072 44 is_stmt 1 view .LVU2081
 7340              	.LVL610:
 7341              	.LBB645:
 7342              	.LBI639:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7343              		.loc 3 105 1 view .LVU2082
 7344              	.LBB642:
 7345              		.loc 3 107 3 view .LVU2083
 7346              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7347              		.loc 3 107 10 is_stmt 0 view .LVU2084
 7348 2533 4883EC08 		sub	rsp, 8	#,
 7349              		.cfi_def_cfa_offset 104
 7350 2537 4154     		push	r12	# ivtmp.716
 7351              		.cfi_def_cfa_offset 112
 7352 2539 4989C8   		mov	r8, rcx	#, _55
GAS LISTING /tmp/ccrNbbzt.s 			page 199


 7353 253c 4989C1   		mov	r9, rax	#, tmp203
 7354 253f 4C89E2   		mov	rdx, r12	#, ivtmp.716
 7355 2542 BF010000 		mov	edi, 1	#,
 7355      00
 7356 2547 4C89F1   		mov	rcx, r14	#, prime
 7357 254a 488D3500 		lea	rsi, .LC8[rip]	#,
 7357      000000
 7358 2551 31C0     		xor	eax, eax	#
 7359 2553 E8000000 		call	__printf_chk@PLT	#
 7359      00
 7360              	.LVL611:
 7361 2558 58       		pop	rax	#
 7362              		.cfi_def_cfa_offset 104
 7363 2559 498B7D08 		mov	rdi, QWORD PTR 8[r13]	# _137, MEM[(uint64_t *)sieve_18(D) + 8B]
 7364 255d 5A       		pop	rdx	#
 7365              		.cfi_def_cfa_offset 96
 7366              	.LBE642:
 7367              	.LBE645:
 7368              	# sieve_extend.c:1072:                     if (warn_prime++ < 30) printf("Number %ju (%ju) was mark
1072:sieve_extend.c ****                 }
 7369              		.loc 1 1072 35 view .LVU2085
 7370 255e 4989E8   		mov	r8, rbp	# warn_prime, warn_prime
 7371              	.LBB646:
 7372              	.LBB643:
 7373              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7374              		.loc 3 107 10 view .LVU2086
 7375 2561 EB90     		jmp	.L490	#
 7376              	.LVL612:
 7377              	.L466:
 7378              		.loc 3 107 10 view .LVU2087
 7379              	.LBE643:
 7380              	.LBE646:
 7381              	.LBE657:
 7382              	.LBE661:
 7383              	.LBE663:
 7384              	.LBE665:
 7385              	.LBB666:
 7386              	.LBB630:
1061:sieve_extend.c **** }
 7387              		.loc 1 1061 5 is_stmt 1 view .LVU2088
1061:sieve_extend.c **** }
 7388              		.loc 1 1061 5 is_stmt 0 view .LVU2089
 7389              	.LBE630:
 7390              	.LBE666:
1090:sieve_extend.c ****     switch(sieve->size) {
 7391              		.loc 1 1090 5 is_stmt 1 view .LVU2090
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7392              		.loc 1 1091 5 view .LVU2091
 7393 2563 41BE0100 		mov	r14d, 1	# _135,
 7393      0000
 7394 2569 41B80100 		mov	r8d, 1	# primeCount,
 7394      0000
 7395 256f 4531ED   		xor	r13d, r13d	# <retval>
 7396 2572 4981F9A0 		cmp	r9, 100000	# pretmp_199,
 7396      860100
 7397 2579 0F842502 		je	.L504	#,
 7397      0000
GAS LISTING /tmp/ccrNbbzt.s 			page 200


 7398 257f 0F872201 		ja	.L496	#,
 7398      0000
 7399 2585 B9190000 		mov	ecx, 25	# valid_primes,
 7399      00
 7400 258a 4983F964 		cmp	r9, 100	# pretmp_199,
 7401 258e 7429     		je	.L484	#,
 7402 2590 0F863F01 		jbe	.L562	#,
 7402      0000
 7403              	# sieve_extend.c:1094:         case 1000:          valid_primes = 168;      break;
1094:sieve_extend.c ****         case 10000:         valid_primes = 1229;     break;
 7404              		.loc 1 1094 42 is_stmt 0 view .LVU2092
 7405 2596 B9A80000 		mov	ecx, 168	# valid_primes,
 7405      00
 7406              	# sieve_extend.c:1091:     switch(sieve->size) {
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7407              		.loc 1 1091 5 view .LVU2093
 7408 259b 4981F9E8 		cmp	r9, 1000	# pretmp_199,
 7408      030000
 7409 25a2 7415     		je	.L484	#,
 7410 25a4 4981F910 		cmp	r9, 10000	# pretmp_199,
 7410      270000
 7411 25ab B9CD0400 		mov	ecx, 1229	# tmp223,
 7411      00
 7412 25b0 B8000000 		mov	eax, 0	# tmp224,
 7412      00
 7413 25b5 480F45C8 		cmovne	rcx, rax	# tmp223,, valid_primes, tmp224
 7414              	.LVL613:
 7415              	.L484:
1106:sieve_extend.c ****         printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produ
 7416              		.loc 1 1106 5 is_stmt 1 view .LVU2094
 7417              	# sieve_extend.c:1106:     if (!valid && option_verboselevel >= 1) {
1106:sieve_extend.c ****         printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produ
 7418              		.loc 1 1106 39 is_stmt 0 view .LVU2095
 7419 25b9 85DB     		test	ebx, ebx	# option_verboselevel
 7420 25bb 410F9FC4 		setg	r12b	#, tmp194
 7421              	# sieve_extend.c:1106:     if (!valid && option_verboselevel >= 1) {
1106:sieve_extend.c ****         printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produ
 7422              		.loc 1 1106 8 view .LVU2096
 7423 25bf 4520F4   		and	r12b, r14b	# _7, _135
 7424 25c2 0F8456FD 		je	.L485	#,
 7424      FFFF
1107:sieve_extend.c ****         if (!valid && option_verboselevel >= 2) show_primes(sieve, default_show_primes_on_error);
 7425              		.loc 1 1107 9 is_stmt 1 view .LVU2097
 7426              	.LVL614:
 7427              	.LBB667:
 7428              	.LBI667:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7429              		.loc 3 105 1 view .LVU2098
 7430              	.LBB668:
 7431              		.loc 3 107 3 view .LVU2099
 7432              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7433              		.loc 3 107 10 is_stmt 0 view .LVU2100
 7434 25c8 31C0     		xor	eax, eax	#
 7435 25ca 4C89CA   		mov	rdx, r9	#, pretmp_199
 7436 25cd 488D3500 		lea	rsi, .LC6[rip]	#,
 7436      000000
 7437 25d4 BF010000 		mov	edi, 1	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 201


 7437      00
 7438              	.LVL615:
 7439              		.loc 3 107 10 view .LVU2101
 7440 25d9 E8000000 		call	__printf_chk@PLT	#
 7440      00
 7441              	.LVL616:
 7442              		.loc 3 107 10 view .LVU2102
 7443              	.LBE668:
 7444              	.LBE667:
1108:sieve_extend.c ****     }
 7445              		.loc 1 1108 9 is_stmt 1 view .LVU2103
 7446              	# sieve_extend.c:1108:         if (!valid && option_verboselevel >= 2) show_primes(sieve, default_s
1108:sieve_extend.c ****     }
 7447              		.loc 1 1108 12 is_stmt 0 view .LVU2104
 7448 25de 83FB01   		cmp	ebx, 1	# option_verboselevel,
 7449 25e1 0F8420FE 		je	.L465	#,
 7449      FFFF
1108:sieve_extend.c ****     }
 7450              		.loc 1 1108 49 is_stmt 1 discriminator 1 view .LVU2105
 7451 25e7 488D7508 		lea	rsi, 8[rbp]	# tmp195,
 7452 25eb BA640000 		mov	edx, 100	#,
 7452      00
 7453 25f0 4889EF   		mov	rdi, rbp	#, sieve
 7454 25f3 E888E9FF 		call	show_primes.isra.0	#
 7454      FF
 7455              	.LVL617:
 7456              	# sieve_extend.c:1106:     if (!valid && option_verboselevel >= 1) {
1106:sieve_extend.c ****         printf("No valid result. Sievesize %ju was expected to have %ju primes, but algorithm produ
 7457              		.loc 1 1106 9 is_stmt 0 discriminator 1 view .LVU2106
 7458 25f8 4589E6   		mov	r14d, r12d	# _135, _7
 7459 25fb E91EFDFF 		jmp	.L485	#
 7459      FF
 7460              	.LVL618:
 7461              	.L560:
 7462              	.LBB669:
 7463              	.LBB664:
 7464              	.LBB662:
 7465              	.LBB658:
 7466              	# sieve_extend.c:1081:             if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju)
1081:sieve_extend.c ****         }
 7467              		.loc 1 1081 44 view .LVU2107
 7468 2600 488B4424 		mov	rax, QWORD PTR 8[rsp]	# warn_nonprime, %sfp
 7468      08
 7469 2605 488D5801 		lea	rbx, 1[rax]	# warn_nonprime,
 7470              	.LVL619:
 7471              	# sieve_extend.c:1081:             if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju)
1081:sieve_extend.c ****         }
 7472              		.loc 1 1081 28 view .LVU2108
 7473 2609 4883F81D 		cmp	rax, 29	# warn_nonprime,
 7474 260d 761D     		jbe	.L499	#,
 7475              	# sieve_extend.c:1081:             if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju)
1081:sieve_extend.c ****         }
 7476              		.loc 1 1081 44 view .LVU2109
 7477 260f 48895C24 		mov	QWORD PTR 8[rsp], rbx	# %sfp, warn_nonprime
 7477      08
 7478 2614 E9D5FDFF 		jmp	.L491	#
 7478      FF
GAS LISTING /tmp/ccrNbbzt.s 			page 202


 7479              	.LVL620:
 7480              	.L558:
1081:sieve_extend.c ****         }
 7481              		.loc 1 1081 44 view .LVU2110
 7482 2619 488B4424 		mov	rax, QWORD PTR 8[rsp]	# warn_nonprime, %sfp
 7482      08
 7483 261e 488D5801 		lea	rbx, 1[rax]	# warn_nonprime,
 7484              	.LVL621:
 7485              	# sieve_extend.c:1081:             if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju)
1081:sieve_extend.c ****         }
 7486              		.loc 1 1081 28 view .LVU2111
 7487 2622 4883F81D 		cmp	rax, 29	# warn_nonprime,
 7488 2626 0F87D6FD 		ja	.L552	#,
 7488      FFFF
 7489              	.LVL622:
 7490              	.L499:
 7491              	.LBB651:
 7492              	.LBB652:
 7493              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7494              		.loc 3 107 10 view .LVU2112
 7495 262c BF010000 		mov	edi, 1	#,
 7495      00
 7496              	.LBE652:
 7497              	.LBE651:
 7498              	# sieve_extend.c:1081:             if (c_prime==0 && warn_nonprime++ < 30) printf("Number %ju (%ju)
1081:sieve_extend.c ****         }
 7499              		.loc 1 1081 53 view .LVU2113
 7500 2631 4B8D5436 		lea	rdx, 1[r14+r14]	# tmp220,
 7500      01
 7501              	.LBB655:
 7502              	.LBB653:
 7503              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7504              		.loc 3 107 10 view .LVU2114
 7505 2636 4C89F1   		mov	rcx, r14	#, prime
 7506 2639 488D3500 		lea	rsi, .LC9[rip]	#,
 7506      000000
 7507 2640 31C0     		xor	eax, eax	#
 7508 2642 4C894424 		mov	QWORD PTR 24[rsp], r8	# %sfp, warn_prime
 7508      18
 7509              	.LBE653:
 7510              	.LBE655:
1081:sieve_extend.c ****         }
 7511              		.loc 1 1081 53 is_stmt 1 view .LVU2115
 7512              	.LVL623:
 7513              	.LBB656:
 7514              	.LBI651:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7515              		.loc 3 105 1 view .LVU2116
 7516              	.LBB654:
 7517              		.loc 3 107 3 view .LVU2117
 7518              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 7519              		.loc 3 107 10 is_stmt 0 view .LVU2118
 7520 2647 E8000000 		call	__printf_chk@PLT	#
 7520      00
 7521              	.LVL624:
 7522              		.loc 3 107 10 view .LVU2119
 7523 264c 48895C24 		mov	QWORD PTR 8[rsp], rbx	# %sfp, warn_nonprime
GAS LISTING /tmp/ccrNbbzt.s 			page 203


 7523      08
 7524 2651 498B7D08 		mov	rdi, QWORD PTR 8[r13]	# _137, MEM[(uint64_t *)sieve_18(D) + 8B]
 7525 2655 4C8B4424 		mov	r8, QWORD PTR 24[rsp]	# warn_prime, %sfp
 7525      18
 7526 265a E98FFDFF 		jmp	.L491	#
 7526      FF
 7527              	.LVL625:
 7528              	.L480:
 7529              		.loc 3 107 10 view .LVU2120
 7530 265f 4981F8A2 		cmp	r8, 78498	# primeCount,
 7530      320100
 7531 2666 410F94C5 		sete	r13b	#, tmp183
 7532 266a 4421E8   		and	eax, r13d	# _251, tmp183
 7533 266d 4981F8A2 		cmp	r8, 78498	# primeCount,
 7533      320100
 7534 2674 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp183
 7535 2678 410F95C6 		setne	r14b	#, _135
 7536              	.LBE654:
 7537              	.LBE656:
 7538              	.LBE658:
 7539              	.LBE662:
 7540              	.LBE664:
 7541              	.LBE669:
1097:sieve_extend.c ****         case 10000000:      valid_primes = 664579;   break;
 7542              		.loc 1 1097 29 is_stmt 1 view .LVU2121
 7543              	.LVL626:
1097:sieve_extend.c ****         case 10000000:      valid_primes = 664579;   break;
 7544              		.loc 1 1097 54 view .LVU2122
 7545              	# sieve_extend.c:1097:         case 1000000:       valid_primes = 78498;    break;
1097:sieve_extend.c ****         case 10000000:      valid_primes = 664579;   break;
 7546              		.loc 1 1097 42 is_stmt 0 view .LVU2123
 7547 267c B9A23201 		mov	ecx, 78498	# valid_primes,
 7547      00
 7548              	# sieve_extend.c:1097:         case 1000000:       valid_primes = 78498;    break;
1097:sieve_extend.c ****         case 10000000:      valid_primes = 664579;   break;
 7549              		.loc 1 1097 9 view .LVU2124
 7550 2681 E97AFCFF 		jmp	.L483	#
 7550      FF
 7551              	.LVL627:
 7552              	.L474:
1097:sieve_extend.c ****         case 10000000:      valid_primes = 664579;   break;
 7553              		.loc 1 1097 9 view .LVU2125
 7554 2686 4983F804 		cmp	r8, 4	# primeCount,
 7555 268a 410F94C5 		sete	r13b	#, tmp175
 7556 268e 4421E8   		and	eax, r13d	# _251, tmp175
 7557 2691 4983F804 		cmp	r8, 4	# primeCount,
 7558 2695 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp175
 7559 2699 410F95C6 		setne	r14b	#, _135
 7560              	# sieve_extend.c:1092:         case 10:            valid_primes = 4;        break;
1092:sieve_extend.c ****         case 100:           valid_primes = 25;       break;
 7561              		.loc 1 1092 42 view .LVU2126
 7562 269d B9040000 		mov	ecx, 4	# valid_primes,
 7562      00
 7563 26a2 E959FCFF 		jmp	.L483	#
 7563      FF
 7564              	.LVL628:
 7565              	.L496:
GAS LISTING /tmp/ccrNbbzt.s 			page 204


 7566              	# sieve_extend.c:1099:         case 100000000:     valid_primes = 5761455;  break;
1099:sieve_extend.c ****         case 1000000000:    valid_primes = 50847534; break;
 7567              		.loc 1 1099 42 view .LVU2127
 7568 26a7 B9AFE957 		mov	ecx, 5761455	# valid_primes,
 7568      00
 7569              	# sieve_extend.c:1091:     switch(sieve->size) {
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7570              		.loc 1 1091 5 view .LVU2128
 7571 26ac 4981F900 		cmp	r9, 100000000	# pretmp_199,
 7571      E1F505
 7572 26b3 0F8400FF 		je	.L484	#,
 7572      FFFF
 7573 26b9 762C     		jbe	.L563	#,
 7574 26bb 4981F900 		cmp	r9, 1000000000	# pretmp_199,
 7574      CA9A3B
 7575 26c2 B92EDF07 		mov	ecx, 50847534	# tmp227,
 7575      03
 7576 26c7 B8000000 		mov	eax, 0	# tmp228,
 7576      00
 7577 26cc 480F45C8 		cmovne	rcx, rax	# tmp227,, valid_primes, tmp228
 7578 26d0 E9E4FEFF 		jmp	.L484	#
 7578      FF
 7579              	.L562:
 7580 26d5 31C9     		xor	ecx, ecx	# valid_primes
 7581 26d7 4983F90A 		cmp	r9, 10	# pretmp_199,
 7582 26db 0F94C1   		sete	cl	#, valid_primes
 7583 26de 48C1E102 		sal	rcx, 2	# valid_primes,
 7584 26e2 E9D2FEFF 		jmp	.L484	#
 7584      FF
 7585              	.L563:
 7586              	# sieve_extend.c:1097:         case 1000000:       valid_primes = 78498;    break;
1097:sieve_extend.c ****         case 10000000:      valid_primes = 664579;   break;
 7587              		.loc 1 1097 42 view .LVU2129
 7588 26e7 B9A23201 		mov	ecx, 78498	# valid_primes,
 7588      00
 7589              	# sieve_extend.c:1091:     switch(sieve->size) {
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7590              		.loc 1 1091 5 view .LVU2130
 7591 26ec 4981F940 		cmp	r9, 1000000	# pretmp_199,
 7591      420F00
 7592 26f3 0F84C0FE 		je	.L484	#,
 7592      FFFF
 7593 26f9 4981F980 		cmp	r9, 10000000	# pretmp_199,
 7593      969800
 7594 2700 B903240A 		mov	ecx, 664579	# tmp225,
 7594      00
 7595 2705 B8000000 		mov	eax, 0	# tmp226,
 7595      00
 7596 270a 480F45C8 		cmovne	rcx, rax	# tmp225,, valid_primes, tmp226
 7597 270e E9A6FEFF 		jmp	.L484	#
 7597      FF
 7598              	.LVL629:
 7599              	.L478:
1091:sieve_extend.c ****         case 10:            valid_primes = 4;        break;
 7600              		.loc 1 1091 5 view .LVU2131
 7601 2713 4981F8AF 		cmp	r8, 5761455	# primeCount,
 7601      E95700
GAS LISTING /tmp/ccrNbbzt.s 			page 205


 7602 271a 410F94C5 		sete	r13b	#, tmp187
 7603 271e 4421E8   		and	eax, r13d	# _251, tmp187
 7604 2721 4981F8AF 		cmp	r8, 5761455	# primeCount,
 7604      E95700
 7605 2728 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp187
 7606 272c 410F95C6 		setne	r14b	#, _135
1099:sieve_extend.c ****         case 1000000000:    valid_primes = 50847534; break;
 7607              		.loc 1 1099 29 is_stmt 1 view .LVU2132
 7608              	.LVL630:
1099:sieve_extend.c ****         case 1000000000:    valid_primes = 50847534; break;
 7609              		.loc 1 1099 54 view .LVU2133
 7610              	# sieve_extend.c:1099:         case 100000000:     valid_primes = 5761455;  break;
1099:sieve_extend.c ****         case 1000000000:    valid_primes = 50847534; break;
 7611              		.loc 1 1099 42 is_stmt 0 view .LVU2134
 7612 2730 B9AFE957 		mov	ecx, 5761455	# valid_primes,
 7612      00
 7613              	# sieve_extend.c:1099:         case 100000000:     valid_primes = 5761455;  break;
1099:sieve_extend.c ****         case 1000000000:    valid_primes = 50847534; break;
 7614              		.loc 1 1099 9 view .LVU2135
 7615 2735 E9C6FBFF 		jmp	.L483	#
 7615      FF
 7616              	.LVL631:
 7617              	.L476:
1099:sieve_extend.c ****         case 1000000000:    valid_primes = 50847534; break;
 7618              		.loc 1 1099 9 view .LVU2136
 7619 273a 4D85C0   		test	r8, r8	# primeCount
 7620 273d 410F94C5 		sete	r13b	#, tmp191
 7621 2741 4421E8   		and	eax, r13d	# _251, tmp191
 7622 2744 4D85C0   		test	r8, r8	# primeCount
 7623 2747 410F95C6 		setne	r14b	#, _135
1101:sieve_extend.c ****     }
 7624              		.loc 1 1101 29 is_stmt 1 view .LVU2137
1101:sieve_extend.c ****     }
 7625              		.loc 1 1101 29 is_stmt 0 view .LVU2138
 7626 274b 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp191
 7627              	# sieve_extend.c:1101:         default:            valid_primes= 0;
1101:sieve_extend.c ****     }
 7628              		.loc 1 1101 41 view .LVU2139
 7629 274f 31C9     		xor	ecx, ecx	# valid_primes
 7630 2751 E9AAFBFF 		jmp	.L483	#
 7630      FF
 7631              	.L470:
1101:sieve_extend.c ****     }
 7632              		.loc 1 1101 41 view .LVU2140
 7633 2756 4981F878 		cmp	r8, 9592	# primeCount,
 7633      250000
 7634 275d 410F94C5 		sete	r13b	#, tmp181
 7635 2761 4421E8   		and	eax, r13d	# _251, tmp181
 7636 2764 4981F878 		cmp	r8, 9592	# primeCount,
 7636      250000
 7637 276b 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp181
 7638 276f 410F95C6 		setne	r14b	#, _135
1096:sieve_extend.c ****         case 1000000:       valid_primes = 78498;    break;
 7639              		.loc 1 1096 29 is_stmt 1 view .LVU2141
 7640              	.LVL632:
1096:sieve_extend.c ****         case 1000000:       valid_primes = 78498;    break;
 7641              		.loc 1 1096 54 view .LVU2142
GAS LISTING /tmp/ccrNbbzt.s 			page 206


 7642              	# sieve_extend.c:1096:         case 100000:        valid_primes = 9592;     break;
1096:sieve_extend.c ****         case 1000000:       valid_primes = 78498;    break;
 7643              		.loc 1 1096 42 is_stmt 0 view .LVU2143
 7644 2773 B9782500 		mov	ecx, 9592	# valid_primes,
 7644      00
 7645              	# sieve_extend.c:1096:         case 100000:        valid_primes = 9592;     break;
1096:sieve_extend.c ****         case 1000000:       valid_primes = 78498;    break;
 7646              		.loc 1 1096 9 view .LVU2144
 7647 2778 E983FBFF 		jmp	.L483	#
 7647      FF
 7648              	.LVL633:
 7649              	.L472:
1096:sieve_extend.c ****         case 1000000:       valid_primes = 78498;    break;
 7650              		.loc 1 1096 9 view .LVU2145
 7651 277d 4981F8A8 		cmp	r8, 168	# primeCount,
 7651      000000
 7652 2784 410F94C5 		sete	r13b	#, tmp177
 7653 2788 4421E8   		and	eax, r13d	# _251, tmp177
 7654 278b 4981F8A8 		cmp	r8, 168	# primeCount,
 7654      000000
 7655 2792 450FB6ED 		movzx	r13d, r13b	# <retval>, tmp177
 7656 2796 410F95C6 		setne	r14b	#, _135
1094:sieve_extend.c ****         case 10000:         valid_primes = 1229;     break;
 7657              		.loc 1 1094 29 is_stmt 1 view .LVU2146
 7658              	.LVL634:
1094:sieve_extend.c ****         case 10000:         valid_primes = 1229;     break;
 7659              		.loc 1 1094 54 view .LVU2147
 7660              	# sieve_extend.c:1094:         case 1000:          valid_primes = 168;      break;
1094:sieve_extend.c ****         case 10000:         valid_primes = 1229;     break;
 7661              		.loc 1 1094 42 is_stmt 0 view .LVU2148
 7662 279a B9A80000 		mov	ecx, 168	# valid_primes,
 7662      00
 7663              	# sieve_extend.c:1094:         case 1000:          valid_primes = 168;      break;
1094:sieve_extend.c ****         case 10000:         valid_primes = 1229;     break;
 7664              		.loc 1 1094 9 view .LVU2149
 7665 279f E95CFBFF 		jmp	.L483	#
 7665      FF
 7666              	.LVL635:
 7667              	.L504:
 7668              	# sieve_extend.c:1096:         case 100000:        valid_primes = 9592;     break;
1096:sieve_extend.c ****         case 1000000:       valid_primes = 78498;    break;
 7669              		.loc 1 1096 42 view .LVU2150
 7670 27a4 B9782500 		mov	ecx, 9592	# valid_primes,
 7670      00
 7671 27a9 E90BFEFF 		jmp	.L484	#
 7671      FF
 7672              		.cfi_endproc
 7673              	.LFE80:
 7675              		.section	.rodata.str1.8
 7676 0145 000000   		.align 8
 7677              	.LC10:
 7678 0148 55736167 		.string	"Usage: %s [options] [maximum]\n"
 7678      653A2025 
 7678      73205B6F 
 7678      7074696F 
 7678      6E735D20 
 7679              		.section	.rodata.str1.1
GAS LISTING /tmp/ccrNbbzt.s 			page 207


 7680              	.LC11:
 7681 0031 4F707469 		.string	"Options:\n"
 7681      6F6E733A 
 7681      0A00
 7682              		.section	.rodata.str1.8
 7683 0167 00       		.align 8
 7684              	.LC12:
 7685 0168 20202D2D 		.string	"  --verbose <level>  Show more output to a certain level:\n"
 7685      76657262 
 7685      6F736520 
 7685      3C6C6576 
 7685      656C3E20 
 7686 01a3 00000000 		.align 8
 7686      00
 7687              	.LC13:
 7688 01a8 20202020 		.string	"                     1 - show phase progress\n"
 7688      20202020 
 7688      20202020 
 7688      20202020 
 7688      20202020 
 7689 01d6 0000     		.align 8
 7690              	.LC14:
 7691 01d8 20202020 		.string	"                     2 - show general progress within the phase\n"
 7691      20202020 
 7691      20202020 
 7691      20202020 
 7691      20202020 
 7692 0219 00000000 		.align 8
 7692      000000
 7693              	.LC15:
 7694 0220 20202020 		.string	"                     3 - show actual work\n"
 7694      20202020 
 7694      20202020 
 7694      20202020 
 7694      20202020 
 7695 024b 00000000 		.align 8
 7695      00
 7696              	.LC16:
 7697 0250 20202D2D 		.string	"  --check            check the correctness of the algorithm\n"
 7697      63686563 
 7697      6B202020 
 7697      20202020 
 7697      20202020 
 7698 028d 000000   		.align 8
 7699              	.LC17:
 7700 0290 20202D2D 		.string	"  --show <maximum>   Show the primes found up to the maximum\n"
 7700      73686F77 
 7700      203C6D61 
 7700      78696D75 
 7700      6D3E2020 
 7701 02ce 0000     		.align 8
 7702              	.LC18:
 7703 02d0 20202D2D 		.string	"  --tune  <level>    find the best settings for the current os and hardware\n"
 7703      74756E65 
 7703      20203C6C 
 7703      6576656C 
 7703      3E202020 
GAS LISTING /tmp/ccrNbbzt.s 			page 208


 7704 031d 000000   		.align 8
 7705              	.LC19:
 7706 0320 20202020 		.string	"                     1 - fast tuning\n"
 7706      20202020 
 7706      20202020 
 7706      20202020 
 7706      20202020 
 7707 0346 0000     		.align 8
 7708              	.LC20:
 7709 0348 20202020 		.string	"                     2 - refined tuning\n"
 7709      20202020 
 7709      20202020 
 7709      20202020 
 7709      20202020 
 7710 0371 00000000 		.align 8
 7710      000000
 7711              	.LC21:
 7712 0378 20202020 		.string	"                     3 - maximum tuning (takes long)\n"
 7712      20202020 
 7712      20202020 
 7712      20202020 
 7712      20202020 
 7713              		.text
 7714 27ae 6690     		.p2align 4
 7715              		.globl	usage
 7717              	usage:
 7718              	.LVL636:
 7719              	.LFB81:
1114:sieve_extend.c ****     fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
 7720              		.loc 1 1114 24 is_stmt 1 view -0
 7721              		.cfi_startproc
1114:sieve_extend.c ****     fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
 7722              		.loc 1 1114 24 is_stmt 0 view .LVU2152
 7723 27b0 F30F1EFA 		endbr64	
 7724 27b4 50       		push	rax	#
 7725              		.cfi_def_cfa_offset 16
 7726 27b5 58       		pop	rax	#
 7727              		.cfi_def_cfa_offset 8
1115:sieve_extend.c ****     fprintf(stderr, "Options:\n");
 7728              		.loc 1 1115 5 is_stmt 1 view .LVU2153
 7729              	.LVL637:
 7730              	.LBB670:
 7731              	.LBI670:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7732              		.loc 3 98 1 view .LVU2154
 7733              	.LBB671:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7734              		.loc 3 100 3 view .LVU2155
 7735              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7736              		.loc 3 100 10 is_stmt 0 view .LVU2156
 7737 27b6 488D1500 		lea	rdx, .LC10[rip]	#,
 7737      000000
 7738 27bd BE010000 		mov	esi, 1	#,
 7738      00
 7739 27c2 31C0     		xor	eax, eax	#
 7740              	.LBE671:
GAS LISTING /tmp/ccrNbbzt.s 			page 209


 7741              	.LBE670:
 7742              	# sieve_extend.c:1114: void usage(char *name) {
1114:sieve_extend.c ****     fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
 7743              		.loc 1 1114 24 view .LVU2157
 7744 27c4 4883EC08 		sub	rsp, 8	#,
 7745              		.cfi_def_cfa_offset 16
 7746              	# sieve_extend.c:1114: void usage(char *name) {
1114:sieve_extend.c ****     fprintf(stderr, "Usage: %s [options] [maximum]\n", name);
 7747              		.loc 1 1114 24 view .LVU2158
 7748 27c8 4889F9   		mov	rcx, rdi	# name, tmp107
 7749              	.LBB673:
 7750              	.LBB672:
 7751              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7752              		.loc 3 100 10 view .LVU2159
 7753 27cb 488B3D00 		mov	rdi, QWORD PTR stderr[rip]	#, stderr
 7753      000000
 7754              	.LVL638:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7755              		.loc 3 100 10 view .LVU2160
 7756 27d2 E8000000 		call	__fprintf_chk@PLT	#
 7756      00
 7757              	.LVL639:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7758              		.loc 3 100 10 view .LVU2161
 7759              	.LBE672:
 7760              	.LBE673:
1116:sieve_extend.c ****     fprintf(stderr, "  --verbose <level>  Show more output to a certain level:\n");
 7761              		.loc 1 1116 5 is_stmt 1 view .LVU2162
 7762              	.LBB674:
 7763              	.LBI674:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7764              		.loc 3 98 1 view .LVU2163
 7765              	.LBB675:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7766              		.loc 3 100 3 view .LVU2164
 7767              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7768              		.loc 3 100 10 is_stmt 0 view .LVU2165
 7769 27d7 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7769      000000
 7770 27de BA090000 		mov	edx, 9	#,
 7770      00
 7771 27e3 BE010000 		mov	esi, 1	#,
 7771      00
 7772 27e8 488D3D00 		lea	rdi, .LC11[rip]	#,
 7772      000000
 7773 27ef E8000000 		call	fwrite@PLT	#
 7773      00
 7774              	.LVL640:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7775              		.loc 3 100 10 view .LVU2166
 7776              	.LBE675:
 7777              	.LBE674:
1117:sieve_extend.c ****     fprintf(stderr, "                     1 - show phase progress\n");
 7778              		.loc 1 1117 5 is_stmt 1 view .LVU2167
 7779              	.LBB676:
GAS LISTING /tmp/ccrNbbzt.s 			page 210


 7780              	.LBI676:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7781              		.loc 3 98 1 view .LVU2168
 7782              	.LBB677:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7783              		.loc 3 100 3 view .LVU2169
 7784              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7785              		.loc 3 100 10 is_stmt 0 view .LVU2170
 7786 27f4 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7786      000000
 7787 27fb BA3A0000 		mov	edx, 58	#,
 7787      00
 7788 2800 BE010000 		mov	esi, 1	#,
 7788      00
 7789 2805 488D3D00 		lea	rdi, .LC12[rip]	#,
 7789      000000
 7790 280c E8000000 		call	fwrite@PLT	#
 7790      00
 7791              	.LVL641:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7792              		.loc 3 100 10 view .LVU2171
 7793              	.LBE677:
 7794              	.LBE676:
1118:sieve_extend.c ****     fprintf(stderr, "                     2 - show general progress within the phase\n");
 7795              		.loc 1 1118 5 is_stmt 1 view .LVU2172
 7796              	.LBB678:
 7797              	.LBI678:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7798              		.loc 3 98 1 view .LVU2173
 7799              	.LBB679:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7800              		.loc 3 100 3 view .LVU2174
 7801              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7802              		.loc 3 100 10 is_stmt 0 view .LVU2175
 7803 2811 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7803      000000
 7804 2818 BA2D0000 		mov	edx, 45	#,
 7804      00
 7805 281d BE010000 		mov	esi, 1	#,
 7805      00
 7806 2822 488D3D00 		lea	rdi, .LC13[rip]	#,
 7806      000000
 7807 2829 E8000000 		call	fwrite@PLT	#
 7807      00
 7808              	.LVL642:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7809              		.loc 3 100 10 view .LVU2176
 7810              	.LBE679:
 7811              	.LBE678:
1119:sieve_extend.c ****     fprintf(stderr, "                     3 - show actual work\n");
 7812              		.loc 1 1119 5 is_stmt 1 view .LVU2177
 7813              	.LBB680:
 7814              	.LBI680:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7815              		.loc 3 98 1 view .LVU2178
GAS LISTING /tmp/ccrNbbzt.s 			page 211


 7816              	.LBB681:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7817              		.loc 3 100 3 view .LVU2179
 7818              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7819              		.loc 3 100 10 is_stmt 0 view .LVU2180
 7820 282e 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7820      000000
 7821 2835 BA400000 		mov	edx, 64	#,
 7821      00
 7822 283a BE010000 		mov	esi, 1	#,
 7822      00
 7823 283f 488D3D00 		lea	rdi, .LC14[rip]	#,
 7823      000000
 7824 2846 E8000000 		call	fwrite@PLT	#
 7824      00
 7825              	.LVL643:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7826              		.loc 3 100 10 view .LVU2181
 7827              	.LBE681:
 7828              	.LBE680:
1120:sieve_extend.c ****     fprintf(stderr, "  --check            check the correctness of the algorithm\n");
 7829              		.loc 1 1120 5 is_stmt 1 view .LVU2182
 7830              	.LBB682:
 7831              	.LBI682:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7832              		.loc 3 98 1 view .LVU2183
 7833              	.LBB683:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7834              		.loc 3 100 3 view .LVU2184
 7835              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7836              		.loc 3 100 10 is_stmt 0 view .LVU2185
 7837 284b 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7837      000000
 7838 2852 BA2A0000 		mov	edx, 42	#,
 7838      00
 7839 2857 BE010000 		mov	esi, 1	#,
 7839      00
 7840 285c 488D3D00 		lea	rdi, .LC15[rip]	#,
 7840      000000
 7841 2863 E8000000 		call	fwrite@PLT	#
 7841      00
 7842              	.LVL644:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7843              		.loc 3 100 10 view .LVU2186
 7844              	.LBE683:
 7845              	.LBE682:
1121:sieve_extend.c ****     fprintf(stderr, "  --show <maximum>   Show the primes found up to the maximum\n");
 7846              		.loc 1 1121 5 is_stmt 1 view .LVU2187
 7847              	.LBB684:
 7848              	.LBI684:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7849              		.loc 3 98 1 view .LVU2188
 7850              	.LBB685:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7851              		.loc 3 100 3 view .LVU2189
GAS LISTING /tmp/ccrNbbzt.s 			page 212


 7852              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7853              		.loc 3 100 10 is_stmt 0 view .LVU2190
 7854 2868 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7854      000000
 7855 286f BA3C0000 		mov	edx, 60	#,
 7855      00
 7856 2874 BE010000 		mov	esi, 1	#,
 7856      00
 7857 2879 488D3D00 		lea	rdi, .LC16[rip]	#,
 7857      000000
 7858 2880 E8000000 		call	fwrite@PLT	#
 7858      00
 7859              	.LVL645:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7860              		.loc 3 100 10 view .LVU2191
 7861              	.LBE685:
 7862              	.LBE684:
1122:sieve_extend.c ****     fprintf(stderr, "  --tune  <level>    find the best settings for the current os and hardware\n"
 7863              		.loc 1 1122 5 is_stmt 1 view .LVU2192
 7864              	.LBB686:
 7865              	.LBI686:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7866              		.loc 3 98 1 view .LVU2193
 7867              	.LBB687:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7868              		.loc 3 100 3 view .LVU2194
 7869              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7870              		.loc 3 100 10 is_stmt 0 view .LVU2195
 7871 2885 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7871      000000
 7872 288c BA3D0000 		mov	edx, 61	#,
 7872      00
 7873 2891 BE010000 		mov	esi, 1	#,
 7873      00
 7874 2896 488D3D00 		lea	rdi, .LC17[rip]	#,
 7874      000000
 7875 289d E8000000 		call	fwrite@PLT	#
 7875      00
 7876              	.LVL646:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7877              		.loc 3 100 10 view .LVU2196
 7878              	.LBE687:
 7879              	.LBE686:
1123:sieve_extend.c ****     fprintf(stderr, "                     1 - fast tuning\n");
 7880              		.loc 1 1123 5 is_stmt 1 view .LVU2197
 7881              	.LBB688:
 7882              	.LBI688:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7883              		.loc 3 98 1 view .LVU2198
 7884              	.LBB689:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7885              		.loc 3 100 3 view .LVU2199
 7886              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7887              		.loc 3 100 10 is_stmt 0 view .LVU2200
GAS LISTING /tmp/ccrNbbzt.s 			page 213


 7888 28a2 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7888      000000
 7889 28a9 BA4C0000 		mov	edx, 76	#,
 7889      00
 7890 28ae BE010000 		mov	esi, 1	#,
 7890      00
 7891 28b3 488D3D00 		lea	rdi, .LC18[rip]	#,
 7891      000000
 7892 28ba E8000000 		call	fwrite@PLT	#
 7892      00
 7893              	.LVL647:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7894              		.loc 3 100 10 view .LVU2201
 7895              	.LBE689:
 7896              	.LBE688:
1124:sieve_extend.c ****     fprintf(stderr, "                     2 - refined tuning\n");
 7897              		.loc 1 1124 5 is_stmt 1 view .LVU2202
 7898              	.LBB690:
 7899              	.LBI690:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7900              		.loc 3 98 1 view .LVU2203
 7901              	.LBB691:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7902              		.loc 3 100 3 view .LVU2204
 7903              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7904              		.loc 3 100 10 is_stmt 0 view .LVU2205
 7905 28bf 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7905      000000
 7906 28c6 BA250000 		mov	edx, 37	#,
 7906      00
 7907 28cb BE010000 		mov	esi, 1	#,
 7907      00
 7908 28d0 488D3D00 		lea	rdi, .LC19[rip]	#,
 7908      000000
 7909 28d7 E8000000 		call	fwrite@PLT	#
 7909      00
 7910              	.LVL648:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7911              		.loc 3 100 10 view .LVU2206
 7912              	.LBE691:
 7913              	.LBE690:
1125:sieve_extend.c ****     fprintf(stderr, "                     3 - maximum tuning (takes long)\n");
 7914              		.loc 1 1125 5 is_stmt 1 view .LVU2207
 7915              	.LBB692:
 7916              	.LBI692:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7917              		.loc 3 98 1 view .LVU2208
 7918              	.LBB693:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7919              		.loc 3 100 3 view .LVU2209
 7920              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7921              		.loc 3 100 10 is_stmt 0 view .LVU2210
 7922 28dc 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7922      000000
 7923 28e3 BA280000 		mov	edx, 40	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 214


 7923      00
 7924 28e8 BE010000 		mov	esi, 1	#,
 7924      00
 7925 28ed 488D3D00 		lea	rdi, .LC20[rip]	#,
 7925      000000
 7926 28f4 E8000000 		call	fwrite@PLT	#
 7926      00
 7927              	.LVL649:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7928              		.loc 3 100 10 view .LVU2211
 7929              	.LBE693:
 7930              	.LBE692:
1126:sieve_extend.c ****     exit(1);
 7931              		.loc 1 1126 5 is_stmt 1 view .LVU2212
 7932              	.LBB694:
 7933              	.LBI694:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 7934              		.loc 3 98 1 view .LVU2213
 7935              	.LBB695:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7936              		.loc 3 100 3 view .LVU2214
 7937              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7938              		.loc 3 100 10 is_stmt 0 view .LVU2215
 7939 28f9 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 7939      000000
 7940 2900 488D3D00 		lea	rdi, .LC21[rip]	#,
 7940      000000
 7941 2907 BA350000 		mov	edx, 53	#,
 7941      00
 7942 290c BE010000 		mov	esi, 1	#,
 7942      00
 7943 2911 E8000000 		call	fwrite@PLT	#
 7943      00
 7944              	.LVL650:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 7945              		.loc 3 100 10 view .LVU2216
 7946              	.LBE695:
 7947              	.LBE694:
1127:sieve_extend.c **** }
 7948              		.loc 1 1127 5 is_stmt 1 view .LVU2217
 7949 2916 BF010000 		mov	edi, 1	#,
 7949      00
 7950 291b E8000000 		call	exit@PLT	#
 7950      00
 7951              	.LVL651:
 7952              		.cfi_endproc
 7953              	.LFE81:
 7955              		.section	.rodata.str1.1
 7956              	.LC23:
 7957 003b 56616C69 		.string	"Validating... "
 7957      64617469 
 7957      6E672E2E 
 7957      2E2000
 7958              	.LC24:
 7959 004a 2D2D6865 		.string	"--help"
 7959      6C7000
GAS LISTING /tmp/ccrNbbzt.s 			page 215


 7960              	.LC25:
 7961 0051 2D2D7665 		.string	"--verbose"
 7961      72626F73 
 7961      6500
 7962              	.LC26:
 7963 005b 4E6F2076 		.string	"No verbose level specified\n"
 7963      6572626F 
 7963      7365206C 
 7963      6576656C 
 7963      20737065 
 7964              	.LC27:
 7965 0077 256400   		.string	"%d"
 7966              		.section	.rodata.str1.8
 7967 03ae 0000     		.align 8
 7968              	.LC28:
 7969 03b0 4572726F 		.string	"Error: Invalid measurement time: %s\n"
 7969      723A2049 
 7969      6E76616C 
 7969      6964206D 
 7969      65617375 
 7970              		.section	.rodata.str1.1
 7971              	.LC29:
 7972 007a 56657262 		.string	"Verbose level set to %d\n"
 7972      6F736520 
 7972      6C657665 
 7972      6C207365 
 7972      7420746F 
 7973              	.LC30:
 7974 0093 2D2D6368 		.string	"--check"
 7974      65636B00 
 7975              	.LC31:
 7976 009b 2D2D7475 		.string	"--tune"
 7976      6E6500
 7977              	.LC32:
 7978 00a2 4E6F2074 		.string	"No tune level specified\n"
 7978      756E6520 
 7978      6C657665 
 7978      6C207370 
 7978      65636966 
 7979              		.section	.rodata.str1.8
 7980 03d5 000000   		.align 8
 7981              	.LC33:
 7982 03d8 4572726F 		.string	"Error: Invalid tune level: %s\n"
 7982      723A2049 
 7982      6E76616C 
 7982      69642074 
 7982      756E6520 
 7983              		.section	.rodata.str1.1
 7984              	.LC34:
 7985 00bb 54756E65 		.string	"Tune level set to %d\n"
 7985      206C6576 
 7985      656C2073 
 7985      65742074 
 7985      6F202564 
 7986              	.LC35:
 7987 00d1 2D2D7368 		.string	"--show"
 7987      6F7700
GAS LISTING /tmp/ccrNbbzt.s 			page 216


 7988              	.LC36:
 7989 00d8 4E6F2073 		.string	"No show maximum specified\n"
 7989      686F7720 
 7989      6D617869 
 7989      6D756D20 
 7989      73706563 
 7990              	.LC37:
 7991 00f3 256A7500 		.string	"%ju"
 7992              		.section	.rodata.str1.8
 7993 03f7 00       		.align 8
 7994              	.LC38:
 7995 03f8 4572726F 		.string	"Error: Invalid show maximum: %s\n"
 7995      723A2049 
 7995      6E76616C 
 7995      69642073 
 7995      686F7720 
 7996              		.section	.rodata.str1.1
 7997              	.LC39:
 7998 00f7 53686F77 		.string	"Show maximum set to %ju\n"
 7998      206D6178 
 7998      696D756D 
 7998      20736574 
 7998      20746F20 
 7999              	.LC40:
 8000 0110 496E7661 		.string	"Invalid size %s\n"
 8000      6C696420 
 8000      73697A65 
 8000      2025730A 
 8000      00
 8001              	.LC41:
 8002 0121 2E2E2E43 		.string	"...Checking size %ju ..."
 8002      6865636B 
 8002      696E6720 
 8002      73697A65 
 8002      20256A75 
 8003              	.LC42:
 8004 013a 2E626C6F 		.string	".blocksize %ju-"
 8004      636B7369 
 8004      7A652025 
 8004      6A752D00 
 8005              	.LC43:
 8006 014a 76616C69 		.string	"valid;"
 8006      643B00
 8007              	.LC44:
 8008 0151 2E2E2E56 		.string	"...Valid algorithm"
 8008      616C6964 
 8008      20616C67 
 8008      6F726974 
 8008      686D00
 8009              	.LC45:
 8010 0164 54756E69 		.string	"Tuning..."
 8010      6E672E2E 
 8010      2E00
 8011              		.section	.rodata.str1.8
 8012 0419 00000000 		.align 8
 8012      000000
 8013              	.LC46:
GAS LISTING /tmp/ccrNbbzt.s 			page 217


 8014 0420 2E283E29 		.string	".(>)blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; mediumstep %
 8014      626C6F63 
 8014      6B73697A 
 8014      655F6269 
 8014      74732025 
 8015 04a7 00       		.align 8
 8016              	.LC47:
 8017 04a8 2E2E2E62 		.string	"...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; mediumstep %2
 8017      6C6F636B 
 8017      73697A65 
 8017      5F626974 
 8017      73202531 
 8018 052e 0000     		.align 8
 8019              	.LC48:
 8020 0530 256A7520 		.string	"%ju results. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju\n"
 8020      72657375 
 8020      6C74732E 
 8020      20496E69 
 8020      74616C20 
 8021              		.section	.rodata.str1.1
 8022              	.LC49:
 8023 016e 42657374 		.string	"Best options"
 8023      206F7074 
 8023      696F6E73 
 8023      00
 8024              		.section	.rodata.str1.8
 8025 0582 00000000 		.align 8
 8025      0000
 8026              	.LC50:
 8027 0588 28256A75 		.string	"(%ju) blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; mediumstep
 8027      2920626C 
 8027      6F636B73 
 8027      697A655F 
 8027      62697473 
 8028 0611 00000000 		.align 8
 8028      000000
 8029              	.LC51:
 8030 0618 2E426573 		.string	".Best result: blocksize %4jukb; free_bits %ju; smallstep: %ju; mediumstep %ju; passes %3j
 8030      74207265 
 8030      73756C74 
 8030      3A20626C 
 8030      6F636B73 
 8031              		.align 8
 8032              	.LC52:
 8033 0690 42656E63 		.string	"Benchmarking... with blocksize %ju steps: %ju/%ju\n"
 8033      686D6172 
 8033      6B696E67 
 8033      2E2E2E20 
 8033      77697468 
 8034 06c3 00000000 		.align 8
 8034      00
 8035              	.LC54:
 8036 06c8 726F6769 		.string	"rogiervandam_extend;%ju;%f;1;algorithm=other,faithful=yes,bits=1\n"
 8036      65727661 
 8036      6E64616D 
 8036      5F657874 
 8036      656E643B 
GAS LISTING /tmp/ccrNbbzt.s 			page 218


 8037 070a 00000000 		.align 8
 8037      0000
 8038              	.LC55:
 8039 0710 50617373 		.string	"Passes - per 5 seconds: %f - per second %f\n"
 8039      6573202D 
 8039      20706572 
 8039      20352073 
 8039      65636F6E 
 8040              		.section	.rodata.str1.1
 8041              	.LC56:
 8042 017b 53686F77 		.string	"Show result set:"
 8042      20726573 
 8042      756C7420 
 8042      7365743A 
 8042      00
 8043              		.section	.text.startup,"ax",@progbits
 8044              		.p2align 4
 8045              		.globl	main
 8047              	main:
 8048              	.LVL652:
 8049              	.LFB85:
1171:sieve_extend.c **** 
1172:sieve_extend.c **** static tuning_result_type tune(int tune_level, counter_t maxints, int option_verboselevel) {
1173:sieve_extend.c ****     counter_t best_blocksize_bits = default_blocksize;
1174:sieve_extend.c **** 
1175:sieve_extend.c ****     double best_avg = 0;
1176:sieve_extend.c ****     best_blocksize_bits = 0;
1177:sieve_extend.c ****     counter_t best_smallstep_faster = 0;
1178:sieve_extend.c ****     counter_t best_mediumstep_faster = 0;
1179:sieve_extend.c ****     counter_t smallstep_faster_steps = 4;
1180:sieve_extend.c ****     counter_t mediumstep_faster_steps = 4;
1181:sieve_extend.c ****     counter_t freebits_steps = anticiped_cache_line_bytesize;
1182:sieve_extend.c ****     counter_t sample_max = default_sample_max;
1183:sieve_extend.c ****     double sample_duration = default_sample_duration;
1184:sieve_extend.c **** 
1185:sieve_extend.c ****     // determines the size of the resultset
1186:sieve_extend.c ****     switch (tune_level) {
1187:sieve_extend.c ****         case 1:
1188:sieve_extend.c ****             smallstep_faster_steps  = WORD_SIZE/4;
1189:sieve_extend.c ****             mediumstep_faster_steps = WORD_SIZE/4;
1190:sieve_extend.c ****             freebits_steps = anticiped_cache_line_bytesize*8*2;
1191:sieve_extend.c ****             sample_max = 4;
1192:sieve_extend.c ****             sample_duration = 0.1;
1193:sieve_extend.c ****             break;
1194:sieve_extend.c ****         case 2:
1195:sieve_extend.c ****             smallstep_faster_steps  = WORD_SIZE/8;
1196:sieve_extend.c ****             mediumstep_faster_steps = WORD_SIZE/8;
1197:sieve_extend.c ****             freebits_steps = anticiped_cache_line_bytesize*8;
1198:sieve_extend.c ****             sample_max = 4;
1199:sieve_extend.c ****             sample_duration = 0.2;
1200:sieve_extend.c ****             break;
1201:sieve_extend.c ****         case 3:
1202:sieve_extend.c ****             smallstep_faster_steps  = WORD_SIZE/16;
1203:sieve_extend.c ****             mediumstep_faster_steps = WORD_SIZE/16;
1204:sieve_extend.c ****             freebits_steps = anticiped_cache_line_bytesize/2;
1205:sieve_extend.c ****             sample_max = 4;
1206:sieve_extend.c ****             sample_duration = 0.4;
GAS LISTING /tmp/ccrNbbzt.s 			page 219


1207:sieve_extend.c ****             break;
1208:sieve_extend.c ****     }
1209:sieve_extend.c ****     
1210:sieve_extend.c ****     if (option_verboselevel >= 1) printf("Tuning..."); if (option_verboselevel >= 2) printf("\n");
1211:sieve_extend.c ****     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(W
1212:sieve_extend.c ****     tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
1213:sieve_extend.c ****     counter_t tuning_results=0;
1214:sieve_extend.c ****     counter_t tuning_result_index=0;
1215:sieve_extend.c ****     
1216:sieve_extend.c ****     for (counter_t smallstep_faster = 0; smallstep_faster <= WORD_SIZE/2; smallstep_faster += small
1217:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
1218:sieve_extend.c ****             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /= 2) {
1219:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
1220:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
1221:sieve_extend.c **** 
1222:sieve_extend.c ****                     // set variables
1223:sieve_extend.c ****                     tuning_results++;
1224:sieve_extend.c ****                     tuning_result[tuning_result_index].maxints = maxints;
1225:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_duration = sample_duration;
1226:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_max = sample_max;
1227:sieve_extend.c ****                     tuning_result[tuning_result_index].blocksize_kb = blocksize_kb;
1228:sieve_extend.c ****                     tuning_result[tuning_result_index].free_bits = free_bits;
1229:sieve_extend.c ****                     tuning_result[tuning_result_index].blocksize_bits = blocksize_bits;
1230:sieve_extend.c ****                     tuning_result[tuning_result_index].smallstep_faster = smallstep_faster;
1231:sieve_extend.c ****                     tuning_result[tuning_result_index].mediumstep_faster = mediumstep_faster;
1232:sieve_extend.c ****                     tune_benchmark(tuning_result, tuning_result_index);
1233:sieve_extend.c **** 
1234:sieve_extend.c ****                     if ( tuning_result[tuning_result_index].avg > best_avg) {
1235:sieve_extend.c ****                         best_avg = tuning_result[tuning_result_index].avg;
1236:sieve_extend.c ****                         best_blocksize_bits = blocksize_bits;
1237:sieve_extend.c ****                         best_smallstep_faster = smallstep_faster;
1238:sieve_extend.c ****                         best_mediumstep_faster = mediumstep_faster;
1239:sieve_extend.c ****                         if (option_verboselevel >=2) printf(".(>)blocksize_bits %10ju; blocksize %4
1240:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
1241:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)t
1242:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_re
1243:sieve_extend.c ****                         tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_resul
1244:sieve_extend.c ****                     }
1245:sieve_extend.c ****                     if (option_verboselevel >= 3) printf("...blocksize_bits %10ju; blocksize %4jukb
1246:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
1247:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)t
1248:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_re
1249:sieve_extend.c ****                         tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_resul
1250:sieve_extend.c ****                     tuning_result_index++;
1251:sieve_extend.c ****                 }
1252:sieve_extend.c ****             }
1253:sieve_extend.c ****         }
1254:sieve_extend.c ****     }
1255:sieve_extend.c ****     if (option_verboselevel >= 2) {
1256:sieve_extend.c ****         printf("%ju results. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju\n"
1257:sieve_extend.c ****         printf("Best options\n");
1258:sieve_extend.c ****     }
1259:sieve_extend.c ****     counter_t step=0;
1260:sieve_extend.c ****     while (tuning_results>4) {
1261:sieve_extend.c ****         qsort(tuning_result, (size_t)tuning_results, sizeof(tuning_result_type), compare_tuning_res
1262:sieve_extend.c ****         step++;
1263:sieve_extend.c ****         if (option_verboselevel >= 2) {
GAS LISTING /tmp/ccrNbbzt.s 			page 220


1264:sieve_extend.c ****             tuning_result_index = 0;
1265:sieve_extend.c ****             printf("(%ju) blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; 
1266:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_
1267:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax
1268:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tunin
1269:sieve_extend.c ****                             tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_r
1270:sieve_extend.c ****             if (option_verboselevel >= 3) {
1271:sieve_extend.c ****                 for (counter_t tuning_result_index=0; tuning_result_index<min(10,tuning_results); t
1272:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
1273:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_
1274:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax
1275:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tunin
1276:sieve_extend.c ****                             tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_r
1277:sieve_extend.c ****                 }
1278:sieve_extend.c ****             }
1279:sieve_extend.c ****         }
1280:sieve_extend.c **** 
1281:sieve_extend.c ****         tuning_results = tuning_results / 2;
1282:sieve_extend.c **** 
1283:sieve_extend.c ****         for (counter_t i=0; i<tuning_results; i++) {
1284:sieve_extend.c ****             tune_benchmark(tuning_result, i);
1285:sieve_extend.c ****             tuning_result[i].sample_max += sample_max;
1286:sieve_extend.c ****         }
1287:sieve_extend.c ****         
1288:sieve_extend.c ****     }
1289:sieve_extend.c ****     tuning_result_type best_result = tuning_result[0];
1290:sieve_extend.c ****     if (option_verboselevel >= 1) {
1291:sieve_extend.c ****         tuning_result_index = 0;
1292:sieve_extend.c ****         printf(".Best result: blocksize %4jukb; free_bits %ju; smallstep: %ju; mediumstep %ju; pass
1293:sieve_extend.c ****                  (uintmax_t)tuning_result[tuning_result_index].blocksize_kb,(uintmax_t)tuning_resul
1294:sieve_extend.c ****                 (uintmax_t)tuning_result[tuning_result_index].smallstep_faster,(uintmax_t)tuning_re
1295:sieve_extend.c ****                 (uintmax_t)tuning_result[tuning_result_index].passes, (uintmax_t) tuning_result[tun
1296:sieve_extend.c ****                 tuning_result[tuning_result_index].elapsed_time, tuning_result[tuning_result_index]
1297:sieve_extend.c ****     }
1298:sieve_extend.c **** 
1299:sieve_extend.c ****     free(tuning_result);
1300:sieve_extend.c ****     return best_result;
1301:sieve_extend.c **** }
1302:sieve_extend.c **** 
1303:sieve_extend.c **** int main(int argc, char *argv[]) {
 8050              		.loc 1 1303 34 view -0
 8051              		.cfi_startproc
 8052              		.loc 1 1303 34 is_stmt 0 view .LVU2219
 8053 0000 F30F1EFA 		endbr64	
 8054 0004 4157     		push	r15	#
 8055              		.cfi_def_cfa_offset 16
 8056              		.cfi_offset 15, -16
 8057 0006 4156     		push	r14	#
 8058              		.cfi_def_cfa_offset 24
 8059              		.cfi_offset 14, -24
 8060 0008 4155     		push	r13	#
 8061              		.cfi_def_cfa_offset 32
 8062              		.cfi_offset 13, -32
 8063 000a 4154     		push	r12	#
 8064              		.cfi_def_cfa_offset 40
 8065              		.cfi_offset 12, -40
 8066 000c 55       		push	rbp	#
GAS LISTING /tmp/ccrNbbzt.s 			page 221


 8067              		.cfi_def_cfa_offset 48
 8068              		.cfi_offset 6, -48
 8069 000d 53       		push	rbx	#
 8070              		.cfi_def_cfa_offset 56
 8071              		.cfi_offset 3, -56
 8072 000e 4881ECB8 		sub	rsp, 184	#,
 8072      000000
 8073              		.cfi_def_cfa_offset 240
 8074              	# sieve_extend.c:1303: int main(int argc, char *argv[]) {
 8075              		.loc 1 1303 34 view .LVU2220
 8076 0015 64488B04 		mov	rax, QWORD PTR fs:40	# tmp479, MEM[(<address-space-1> long unsigned int *)40B]
 8076      25280000 
 8076      00
 8077 001e 48898424 		mov	QWORD PTR 168[rsp], rax	# D.7429, tmp479
 8077      A8000000 
 8078 0026 31C0     		xor	eax, eax	# tmp479
1304:sieve_extend.c **** 
1305:sieve_extend.c ****     
1306:sieve_extend.c ****     counter_t option_maxFactor  = default_sieve_limit;
 8079              		.loc 1 1306 5 is_stmt 1 view .LVU2221
 8080              	# sieve_extend.c:1306:     counter_t option_maxFactor  = default_sieve_limit;
 8081              		.loc 1 1306 15 is_stmt 0 view .LVU2222
 8082 0028 48C74424 		mov	QWORD PTR 112[rsp], 1000000	# option_maxFactor,
 8082      7040420F 
 8082      00
1307:sieve_extend.c ****     counter_t option_showMaxFactor = default_showMaxFactor;
 8083              		.loc 1 1307 5 is_stmt 1 view .LVU2223
 8084              	# sieve_extend.c:1307:     counter_t option_showMaxFactor = default_showMaxFactor;
 8085              		.loc 1 1307 15 is_stmt 0 view .LVU2224
 8086 0031 48C74424 		mov	QWORD PTR 120[rsp], 0	# option_showMaxFactor,
 8086      78000000 
 8086      00
1308:sieve_extend.c ****     int option_verboselevel = default_verbose_level;
 8087              		.loc 1 1308 5 is_stmt 1 view .LVU2225
 8088              	# sieve_extend.c:1308:     int option_verboselevel = default_verbose_level;
 8089              		.loc 1 1308 9 is_stmt 0 view .LVU2226
 8090 003a C7442468 		mov	DWORD PTR 104[rsp], 1	# option_verboselevel,
 8090      01000000 
1309:sieve_extend.c ****     int option_check = default_check_level;
 8091              		.loc 1 1309 5 is_stmt 1 view .LVU2227
 8092              	.LVL653:
1310:sieve_extend.c ****     int option_tunelevel = default_tune_level;
 8093              		.loc 1 1310 5 view .LVU2228
 8094              	# sieve_extend.c:1310:     int option_tunelevel = default_tune_level;
 8095              		.loc 1 1310 9 is_stmt 0 view .LVU2229
 8096 0042 C744246C 		mov	DWORD PTR 108[rsp], 2	# option_tunelevel,
 8096      02000000 
1311:sieve_extend.c **** 
1312:sieve_extend.c ****     for (int arg=1; arg < argc; arg++) {
 8097              		.loc 1 1312 5 is_stmt 1 view .LVU2230
 8098              	.LBB781:
 8099              		.loc 1 1312 10 view .LVU2231
 8100              	.LVL654:
 8101              		.loc 1 1312 21 view .LVU2232
 8102              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
 8103              		.loc 1 1312 5 is_stmt 0 view .LVU2233
 8104 004a 83FF01   		cmp	edi, 1	# argc,
GAS LISTING /tmp/ccrNbbzt.s 			page 222


 8105 004d 0F8E4804 		jle	.L583	#,
 8105      0000
 8106 0053 89FB     		mov	ebx, edi	# argc, tmp427
 8107 0055 4889F5   		mov	rbp, rsi	# argv, tmp428
 8108              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
 8109              		.loc 1 1312 14 view .LVU2234
 8110 0058 41BE0100 		mov	r14d, 1	# arg,
 8110      0000
 8111 005e 4C8D2500 		lea	r12, .LC24[rip]	# tmp407,
 8111      000000
 8112              	# sieve_extend.c:1314:         else if (strcmp(argv[arg], "--verbose")==0) {
1313:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
1314:sieve_extend.c ****         else if (strcmp(argv[arg], "--verbose")==0) {
 8113              		.loc 1 1314 18 view .LVU2235
 8114 0065 4C8D2D00 		lea	r13, .LC25[rip]	# tmp423,
 8114      000000
 8115 006c EB5E     		jmp	.L567	#
 8116              	.LVL655:
 8117 006e 6690     		.p2align 4,,10
 8118              		.p2align 3
 8119              	.L661:
1315:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No verbose level specified\n"); usage(argv[0]); }
 8120              		.loc 1 1315 13 is_stmt 1 view .LVU2236
 8121              	# sieve_extend.c:1315:             if (++arg >= argc) { fprintf(stderr, "No verbose level specified
 8122              		.loc 1 1315 16 is_stmt 0 view .LVU2237
 8123 0070 41FFC6   		inc	r14d	# arg
 8124              	.LVL656:
 8125              		.loc 1 1315 16 view .LVU2238
 8126 0073 4439F3   		cmp	ebx, r14d	# argc, arg
 8127 0076 0F8E850A 		jle	.L659	#,
 8127      0000
1316:sieve_extend.c ****             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option_verboselevel > 4) {
 8128              		.loc 1 1316 13 is_stmt 1 view .LVU2239
 8129              	# sieve_extend.c:1316:             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option
 8130              		.loc 1 1316 28 is_stmt 0 view .LVU2240
 8131 007c 4C8D7C05 		lea	r15, 8[rbp+rax]	# _16,
 8131      08
 8132              	# sieve_extend.c:1316:             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option
 8133              		.loc 1 1316 17 view .LVU2241
 8134 0081 498B3F   		mov	rdi, QWORD PTR [r15]	#, *_16
 8135 0084 31C0     		xor	eax, eax	#
 8136 0086 488D5424 		lea	rdx, 104[rsp]	# tmp285,
 8136      68
 8137 008b 488D3500 		lea	rsi, .LC27[rip]	#,
 8137      000000
 8138 0092 E8000000 		call	__isoc99_sscanf@PLT	#
 8138      00
 8139              	.LVL657:
 8140              	# sieve_extend.c:1316:             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option
 8141              		.loc 1 1316 16 view .LVU2242
 8142 0097 83F801   		cmp	eax, 1	# tmp429,
 8143 009a 0F851304 		jne	.L572	#,
 8143      0000
 8144              	# sieve_extend.c:1316:             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option
 8145              		.loc 1 1316 91 discriminator 1 view .LVU2243
 8146 00a0 8B542468 		mov	edx, DWORD PTR 104[rsp]	# option_verboselevel.16_19, option_verboselevel
 8147              	# sieve_extend.c:1316:             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option
GAS LISTING /tmp/ccrNbbzt.s 			page 223


 8148              		.loc 1 1316 68 discriminator 1 view .LVU2244
 8149 00a4 83FA04   		cmp	edx, 4	# option_verboselevel.16_19,
 8150 00a7 0F8F0604 		jg	.L572	#,
 8150      0000
1317:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid measurement time: %s\n", argv[arg]); usage(argv[0])
1318:sieve_extend.c ****             }
1319:sieve_extend.c ****             printf("Verbose level set to %d\n",option_verboselevel);
 8151              		.loc 1 1319 13 is_stmt 1 view .LVU2245
 8152              	.LVL658:
 8153              	.LBB782:
 8154              	.LBI782:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8155              		.loc 3 105 1 view .LVU2246
 8156              	.LBB783:
 8157              		.loc 3 107 3 view .LVU2247
 8158              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8159              		.loc 3 107 10 is_stmt 0 view .LVU2248
 8160 00ad 488D3500 		lea	rsi, .LC29[rip]	#,
 8160      000000
 8161 00b4 BF010000 		mov	edi, 1	#,
 8161      00
 8162 00b9 31C0     		xor	eax, eax	#
 8163 00bb E8000000 		call	__printf_chk@PLT	#
 8163      00
 8164              	.LVL659:
 8165              	.L574:
 8166              		.loc 3 107 10 view .LVU2249
 8167              	.LBE783:
 8168              	.LBE782:
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8169              		.loc 1 1312 33 is_stmt 1 discriminator 2 view .LVU2250
 8170              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8171              		.loc 1 1312 36 is_stmt 0 discriminator 2 view .LVU2251
 8172 00c0 41FFC6   		inc	r14d	# arg
 8173              	.LVL660:
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8174              		.loc 1 1312 21 is_stmt 1 discriminator 2 view .LVU2252
 8175              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8176              		.loc 1 1312 5 is_stmt 0 discriminator 2 view .LVU2253
 8177 00c3 4439F3   		cmp	ebx, r14d	# argc, arg
 8178 00c6 0F8EE400 		jle	.L660	#,
 8178      0000
 8179              	.LVL661:
 8180              	.L567:
1313:sieve_extend.c ****         else if (strcmp(argv[arg], "--verbose")==0) {
 8181              		.loc 1 1313 9 is_stmt 1 view .LVU2254
 8182              	# sieve_extend.c:1313:         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
1313:sieve_extend.c ****         else if (strcmp(argv[arg], "--verbose")==0) {
 8183              		.loc 1 1313 24 is_stmt 0 view .LVU2255
 8184 00cc 4963C6   		movsx	rax, r14d	# arg, arg
 8185 00cf 48C1E003 		sal	rax, 3	# _2,
 8186 00d3 4C8D7C05 		lea	r15, 0[rbp+rax]	# _3,
 8186      00
 8187              	# sieve_extend.c:1313:         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
1313:sieve_extend.c ****         else if (strcmp(argv[arg], "--verbose")==0) {
GAS LISTING /tmp/ccrNbbzt.s 			page 224


 8188              		.loc 1 1313 13 view .LVU2256
 8189 00d8 4D8B07   		mov	r8, QWORD PTR [r15]	# _4, *_3
 8190 00db B9070000 		mov	ecx, 7	# tmp274,
 8190      00
 8191 00e0 4C89C6   		mov	rsi, r8	# _4, _4
 8192 00e3 4C89E7   		mov	rdi, r12	# tmp273, tmp407
 8193 00e6 F3A6     		repz cmpsb
 8194 00e8 0F97C2   		seta	dl	#, tmp275
 8195 00eb 80DA00   		sbb	dl, 0	# _5
 8196              	# sieve_extend.c:1313:         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
1313:sieve_extend.c ****         else if (strcmp(argv[arg], "--verbose")==0) {
 8197              		.loc 1 1313 12 view .LVU2257
 8198 00ee 84D2     		test	dl, dl	# _5
 8199 00f0 0F84DA03 		je	.L657	#,
 8199      0000
1314:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No verbose level specified\n"); usage(argv[0]); }
 8200              		.loc 1 1314 14 is_stmt 1 view .LVU2258
 8201              	# sieve_extend.c:1314:         else if (strcmp(argv[arg], "--verbose")==0) {
1314:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No verbose level specified\n"); usage(argv[0]); }
 8202              		.loc 1 1314 18 is_stmt 0 view .LVU2259
 8203 00f6 B90A0000 		mov	ecx, 10	# tmp280,
 8203      00
 8204 00fb 4C89C6   		mov	rsi, r8	# _4, _4
 8205 00fe 4C89EF   		mov	rdi, r13	# tmp279, tmp423
 8206 0101 F3A6     		repz cmpsb
 8207 0103 0F97C2   		seta	dl	#, tmp281
 8208 0106 80DA00   		sbb	dl, 0	# _11
 8209              	# sieve_extend.c:1314:         else if (strcmp(argv[arg], "--verbose")==0) {
1314:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No verbose level specified\n"); usage(argv[0]); }
 8210              		.loc 1 1314 17 view .LVU2260
 8211 0109 84D2     		test	dl, dl	# _11
 8212 010b 0F845FFF 		je	.L661	#,
 8212      FFFF
1320:sieve_extend.c ****         } 
1321:sieve_extend.c ****         else if (strcmp(argv[arg], "--check")==0) { option_check=1; }
 8213              		.loc 1 1321 14 is_stmt 1 view .LVU2261
 8214              	# sieve_extend.c:1321:         else if (strcmp(argv[arg], "--check")==0) { option_check=1; }
 8215              		.loc 1 1321 18 is_stmt 0 view .LVU2262
 8216 0111 B9080000 		mov	ecx, 8	# tmp290,
 8216      00
 8217 0116 4C89C6   		mov	rsi, r8	# _4, _4
 8218 0119 488D3D00 		lea	rdi, .LC30[rip]	# tmp289,
 8218      000000
 8219 0120 F3A6     		repz cmpsb
 8220 0122 0F97C2   		seta	dl	#, tmp291
 8221 0125 80DA00   		sbb	dl, 0	# _23
 8222              	# sieve_extend.c:1321:         else if (strcmp(argv[arg], "--check")==0) { option_check=1; }
 8223              		.loc 1 1321 17 view .LVU2263
 8224 0128 84D2     		test	dl, dl	# _23
 8225 012a 7494     		je	.L574	#,
1322:sieve_extend.c ****         else if (strcmp(argv[arg], "--tune")==0) { option_tunelevel=0;
 8226              		.loc 1 1322 14 is_stmt 1 view .LVU2264
 8227              	# sieve_extend.c:1322:         else if (strcmp(argv[arg], "--tune")==0) { option_tunelevel=0;
 8228              		.loc 1 1322 18 is_stmt 0 view .LVU2265
 8229 012c B9070000 		mov	ecx, 7	# tmp296,
 8229      00
 8230 0131 4C89C6   		mov	rsi, r8	# _4, _4
GAS LISTING /tmp/ccrNbbzt.s 			page 225


 8231 0134 488D3D00 		lea	rdi, .LC31[rip]	# tmp295,
 8231      000000
 8232 013b F3A6     		repz cmpsb
 8233 013d 0F97C2   		seta	dl	#, tmp297
 8234 0140 80DA00   		sbb	dl, 0	# _24
 8235              	# sieve_extend.c:1322:         else if (strcmp(argv[arg], "--tune")==0) { option_tunelevel=0;
 8236              		.loc 1 1322 17 view .LVU2266
 8237 0143 84D2     		test	dl, dl	# _24
 8238 0145 0F853501 		jne	.L575	#,
 8238      0000
 8239              		.loc 1 1322 52 is_stmt 1 discriminator 1 view .LVU2267
 8240              	# sieve_extend.c:1323:             if (++arg >= argc) { fprintf(stderr, "No tune level specified\n"
1323:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No tune level specified\n"); usage(argv[0]); }
 8241              		.loc 1 1323 16 is_stmt 0 discriminator 1 view .LVU2268
 8242 014b 41FFC6   		inc	r14d	# arg
 8243              	.LVL662:
 8244              	# sieve_extend.c:1322:         else if (strcmp(argv[arg], "--tune")==0) { option_tunelevel=0;
1322:sieve_extend.c ****         else if (strcmp(argv[arg], "--tune")==0) { option_tunelevel=0;
 8245              		.loc 1 1322 68 discriminator 1 view .LVU2269
 8246 014e C744246C 		mov	DWORD PTR 108[rsp], 0	# option_tunelevel,
 8246      00000000 
 8247              		.loc 1 1323 13 is_stmt 1 discriminator 1 view .LVU2270
 8248              	.LVL663:
 8249              	# sieve_extend.c:1323:             if (++arg >= argc) { fprintf(stderr, "No tune level specified\n"
 8250              		.loc 1 1323 16 is_stmt 0 discriminator 1 view .LVU2271
 8251 0156 4439F3   		cmp	ebx, r14d	# argc, arg
 8252 0159 0F8EE209 		jle	.L662	#,
 8252      0000
1324:sieve_extend.c ****             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tunelevel > 4) {
 8253              		.loc 1 1324 13 is_stmt 1 view .LVU2272
 8254              	# sieve_extend.c:1324:             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tu
 8255              		.loc 1 1324 28 is_stmt 0 view .LVU2273
 8256 015f 4C8D7C05 		lea	r15, 8[rbp+rax]	# _29,
 8256      08
 8257              	# sieve_extend.c:1324:             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tu
 8258              		.loc 1 1324 17 view .LVU2274
 8259 0164 498B3F   		mov	rdi, QWORD PTR [r15]	#, *_29
 8260 0167 31C0     		xor	eax, eax	#
 8261 0169 488D5424 		lea	rdx, 108[rsp]	# tmp301,
 8261      6C
 8262 016e 488D3500 		lea	rsi, .LC27[rip]	#,
 8262      000000
 8263 0175 E8000000 		call	__isoc99_sscanf@PLT	#
 8263      00
 8264              	.LVL664:
 8265              	# sieve_extend.c:1324:             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tu
 8266              		.loc 1 1324 16 view .LVU2275
 8267 017a 83F801   		cmp	eax, 1	# tmp430,
 8268 017d 0F85A009 		jne	.L577	#,
 8268      0000
 8269              	# sieve_extend.c:1324:             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tu
 8270              		.loc 1 1324 85 discriminator 1 view .LVU2276
 8271 0183 8B54246C 		mov	edx, DWORD PTR 108[rsp]	# option_tunelevel.20_32, option_tunelevel
 8272              	# sieve_extend.c:1324:             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tu
 8273              		.loc 1 1324 65 discriminator 1 view .LVU2277
 8274 0187 83FA04   		cmp	edx, 4	# option_tunelevel.20_32,
 8275 018a 0F8F9309 		jg	.L577	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 226


 8275      0000
1325:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid tune level: %s\n", argv[arg]); usage(argv[0]);
1326:sieve_extend.c ****             }
1327:sieve_extend.c ****             printf("Tune level set to %d\n",option_tunelevel);
 8276              		.loc 1 1327 13 is_stmt 1 view .LVU2278
 8277              	.LVL665:
 8278              	.LBB784:
 8279              	.LBI784:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8280              		.loc 3 105 1 view .LVU2279
 8281              	.LBB785:
 8282              		.loc 3 107 3 view .LVU2280
 8283              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8284              		.loc 3 107 10 is_stmt 0 view .LVU2281
 8285 0190 488D3500 		lea	rsi, .LC34[rip]	#,
 8285      000000
 8286 0197 BF010000 		mov	edi, 1	#,
 8286      00
 8287 019c 31C0     		xor	eax, eax	#
 8288              	.LBE785:
 8289              	.LBE784:
 8290              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8291              		.loc 1 1312 36 view .LVU2282
 8292 019e 41FFC6   		inc	r14d	# arg
 8293              	.LVL666:
 8294              	.LBB787:
 8295              	.LBB786:
 8296              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8297              		.loc 3 107 10 view .LVU2283
 8298 01a1 E8000000 		call	__printf_chk@PLT	#
 8298      00
 8299              	.LVL667:
 8300              		.loc 3 107 10 view .LVU2284
 8301              	.LBE786:
 8302              	.LBE787:
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8303              		.loc 1 1312 33 is_stmt 1 view .LVU2285
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8304              		.loc 1 1312 21 view .LVU2286
 8305              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8306              		.loc 1 1312 5 is_stmt 0 view .LVU2287
 8307 01a6 4439F3   		cmp	ebx, r14d	# argc, arg
 8308 01a9 0F8F1DFF 		jg	.L567	#,
 8308      FFFF
 8309 01af 90       		.p2align 4,,10
 8310              		.p2align 3
 8311              	.L660:
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8312              		.loc 1 1312 5 view .LVU2288
 8313              	.LBE781:
1328:sieve_extend.c ****         }
1329:sieve_extend.c ****         else if (strcmp(argv[arg], "--show")==0) { option_showMaxFactor=0;
1330:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
1331:sieve_extend.c ****             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) != 1 || option_showMaxF
1332:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
GAS LISTING /tmp/ccrNbbzt.s 			page 227


1333:sieve_extend.c ****             }
1334:sieve_extend.c ****             printf("Show maximum set to %ju\n",(uintmax_t)option_showMaxFactor);
1335:sieve_extend.c ****         }
1336:sieve_extend.c ****         else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_maxFactor) != 1) {
1337:sieve_extend.c ****             fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(argv[0]); 
1338:sieve_extend.c ****             printf("Maximum set to %ju\n",(uintmax_t)option_maxFactor);
1339:sieve_extend.c ****         }
1340:sieve_extend.c ****     }
1341:sieve_extend.c **** 
1342:sieve_extend.c ****     if (option_runonce) { // used for stats and debugging
 8314              		.loc 1 1342 5 is_stmt 1 view .LVU2289
1343:sieve_extend.c ****         struct sieve_state* sieve_instance = sieve(option_maxFactor, default_blocksize);
1344:sieve_extend.c ****         printf("\nResult set:\n");
1345:sieve_extend.c ****         show_primes(sieve_instance, option_showMaxFactor);
1346:sieve_extend.c ****         int valid = validatePrimeCount(sieve_instance,1);
1347:sieve_extend.c ****         if (!valid) printf("The sieve is NOT valid\n");
1348:sieve_extend.c ****         else printf("The sieve is VALID\n");
1349:sieve_extend.c ****         delete_sieve(sieve_instance);
1350:sieve_extend.c ****         exit(0);
1351:sieve_extend.c ****     }
1352:sieve_extend.c **** 
1353:sieve_extend.c ****     struct timespec start_time,end_time;
 8315              		.loc 1 1353 5 view .LVU2290
1354:sieve_extend.c **** 
1355:sieve_extend.c ****     if (option_check) {
 8316              		.loc 1 1355 5 view .LVU2291
1356:sieve_extend.c ****         // Count the number of primes and validate the result
1357:sieve_extend.c ****         if (option_verboselevel >= 1) printf("Validating... ");
 8317              		.loc 1 1357 9 view .LVU2292
 8318              	# sieve_extend.c:1357:         if (option_verboselevel >= 1) printf("Validating... ");
 8319              		.loc 1 1357 12 is_stmt 0 view .LVU2293
 8320 01b0 8B7C2468 		mov	edi, DWORD PTR 104[rsp]	#, option_verboselevel
 8321 01b4 85FF     		test	edi, edi	#
 8322 01b6 0F8FDF02 		jg	.L583	#,
 8322      0000
 8323              	.LVL668:
 8324              	.L568:
1358:sieve_extend.c ****         if (option_verboselevel >= 2) printf("\n");
 8325              		.loc 1 1358 9 is_stmt 1 view .LVU2294
 8326              	# sieve_extend.c:1358:         if (option_verboselevel >= 2) printf("\n");
 8327              		.loc 1 1358 12 is_stmt 0 view .LVU2295
 8328 01bc 837C2468 		cmp	DWORD PTR 104[rsp], 1	# option_verboselevel,
 8328      01
 8329 01c1 7E0A     		jle	.L584	#,
 8330              		.loc 1 1358 39 is_stmt 1 view .LVU2296
 8331              	.LVL669:
 8332              	.LBB806:
 8333              	.LBI806:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8334              		.loc 3 105 1 view .LVU2297
 8335              	.LBB807:
 8336              		.loc 3 107 3 view .LVU2298
 8337              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8338              		.loc 3 107 10 is_stmt 0 view .LVU2299
 8339 01c3 BF0A0000 		mov	edi, 10	#,
 8339      00
 8340 01c8 E8000000 		call	putchar@PLT	#
GAS LISTING /tmp/ccrNbbzt.s 			page 228


 8340      00
 8341              	.LVL670:
 8342              	.L584:
 8343              		.loc 3 107 10 view .LVU2300
 8344              	.LBE807:
 8345              	.LBE806:
 8346              	.LBB808:
 8347              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8348              		.loc 1 1312 14 view .LVU2301
 8349 01cd C7042407 		mov	DWORD PTR [rsp], 7	# %sfp,
 8349      000000
 8350 01d4 41BC6400 		mov	r12d, 100	# sieveSize_check,
 8350      0000
 8351              	.LBE808:
 8352              	.LBB809:
 8353              	.LBB810:
 8354              	.LBB811:
 8355              	.LBB812:
 8356              	.LBB813:
 8357              	.LBB814:
 8358              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8359              		.loc 3 107 10 view .LVU2302
 8360 01da 4C8D2D00 		lea	r13, .LC42[rip]	# tmp422,
 8360      000000
 8361              	.L591:
 8362              	.LVL671:
 8363              		.loc 3 107 10 view .LVU2303
 8364              	.LBE814:
 8365              	.LBE813:
 8366              	.LBE812:
 8367              	.LBE811:
1359:sieve_extend.c **** 
1360:sieve_extend.c ****         // validate algorithm - run one time for all sizes
1361:sieve_extend.c ****         for (counter_t sieveSize_check = 100; sieveSize_check <= 100000000; sieveSize_check *=10) {
1362:sieve_extend.c ****             if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_ch
 8368              		.loc 1 1362 13 is_stmt 1 view .LVU2304
 8369              	# sieve_extend.c:1362:             if (option_verboselevel >= 2) printf("...Checking size %ju ...",
 8370              		.loc 1 1362 37 is_stmt 0 view .LVU2305
 8371 01e1 8B442468 		mov	eax, DWORD PTR 104[rsp]	# prephitmp_382, option_verboselevel
 8372              	# sieve_extend.c:1362:             if (option_verboselevel >= 2) printf("...Checking size %ju ...",
 8373              		.loc 1 1362 16 view .LVU2306
 8374 01e5 83F801   		cmp	eax, 1	# prephitmp_382,
 8375 01e8 7E1A     		jle	.L585	#,
 8376              		.loc 1 1362 43 is_stmt 1 view .LVU2307
 8377              	.LVL672:
 8378              	.LBB827:
 8379              	.LBI827:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8380              		.loc 3 105 1 view .LVU2308
 8381              	.LBB828:
 8382              		.loc 3 107 3 view .LVU2309
 8383              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8384              		.loc 3 107 10 is_stmt 0 view .LVU2310
 8385 01ea 4C89E2   		mov	rdx, r12	#, sieveSize_check
 8386 01ed 488D3500 		lea	rsi, .LC41[rip]	#,
 8386      000000
GAS LISTING /tmp/ccrNbbzt.s 			page 229


 8387 01f4 BF010000 		mov	edi, 1	#,
 8387      00
 8388 01f9 31C0     		xor	eax, eax	#
 8389 01fb E8000000 		call	__printf_chk@PLT	#
 8389      00
 8390              	.LVL673:
 8391 0200 8B442468 		mov	eax, DWORD PTR 104[rsp]	# prephitmp_382, option_verboselevel
 8392              	.LVL674:
 8393              	.L585:
 8394              		.loc 3 107 10 view .LVU2311
 8395              	.LBE828:
 8396              	.LBE827:
 8397              	.LBE810:
 8398              	.LBE809:
 8399              	.LBB837:
 8400              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8401              		.loc 1 1312 14 view .LVU2312
 8402 0204 BB050000 		mov	ebx, 5	# ivtmp_213,
 8402      00
 8403 0209 41BE0004 		mov	r14d, 1024	# blocksize_bits,
 8403      0000
 8404 020f EB56     		jmp	.L589	#
 8405              	.LVL675:
 8406              		.p2align 4,,10
 8407 0211 0F1F8000 		.p2align 3
 8407      000000
 8408              	.L586:
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 8409              		.loc 1 1312 14 view .LVU2313
 8410              	.LBE837:
 8411              	.LBB838:
 8412              	.LBB834:
 8413              	.LBB829:
 8414              	.LBB823:
1363:sieve_extend.c ****             struct sieve_state *sieve_instance_check;
1364:sieve_extend.c ****             for (counter_t blocksize_bits=1024; blocksize_bits<=2*1024*8; blocksize_bits *= 2) {
1365:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
1366:sieve_extend.c ****                 sieve_instance_check = sieve(sieveSize_check, blocksize_bits);
 8415              		.loc 1 1366 17 is_stmt 1 view .LVU2314
 8416              	# sieve_extend.c:1366:                 sieve_instance_check = sieve(sieveSize_check, blocksize_bits
 8417              		.loc 1 1366 40 is_stmt 0 view .LVU2315
 8418 0218 4C89F6   		mov	rsi, r14	#, blocksize_bits
 8419 021b 4C89E7   		mov	rdi, r12	#, sieveSize_check
 8420 021e E8000000 		call	sieve	#
 8420      00
 8421              	.LVL676:
 8422              	# sieve_extend.c:1367:                 int valid = validatePrimeCount(sieve_instance_check,option_v
1367:sieve_extend.c ****                 int valid = validatePrimeCount(sieve_instance_check,option_verboselevel);
 8423              		.loc 1 1367 29 view .LVU2316
 8424 0223 8B742468 		mov	esi, DWORD PTR 104[rsp]	#, option_verboselevel
 8425              	# sieve_extend.c:1366:                 sieve_instance_check = sieve(sieveSize_check, blocksize_bits
1366:sieve_extend.c ****                 int valid = validatePrimeCount(sieve_instance_check,option_verboselevel);
 8426              		.loc 1 1366 40 view .LVU2317
 8427 0227 4889C5   		mov	rbp, rax	# sieve_instance_check, tmp433
 8428              	.LVL677:
 8429              		.loc 1 1367 17 is_stmt 1 view .LVU2318
GAS LISTING /tmp/ccrNbbzt.s 			page 230


 8430              	# sieve_extend.c:1367:                 int valid = validatePrimeCount(sieve_instance_check,option_v
 8431              		.loc 1 1367 29 is_stmt 0 view .LVU2319
 8432 022a 4889C7   		mov	rdi, rax	#, sieve_instance_check
 8433 022d E8000000 		call	validatePrimeCount	#
 8433      00
 8434              	.LVL678:
 8435              	.LBB816:
 8436              	.LBB817:
 8437              	# sieve_extend.c:98:     free(sieve->bitarray);
  98:sieve_extend.c ****     free(sieve);
 8438              		.loc 1 98 5 view .LVU2320
 8439 0232 488B7D00 		mov	rdi, QWORD PTR 0[rbp]	#, sieve_instance_check_126->bitarray
 8440              	.LBE817:
 8441              	.LBE816:
 8442              	# sieve_extend.c:1367:                 int valid = validatePrimeCount(sieve_instance_check,option_v
 8443              		.loc 1 1367 29 view .LVU2321
 8444 0236 4189C7   		mov	r15d, eax	# valid, tmp434
 8445              	.LVL679:
1368:sieve_extend.c ****                 delete_sieve(sieve_instance_check);
 8446              		.loc 1 1368 17 is_stmt 1 view .LVU2322
 8447              	.LBB819:
 8448              	.LBI816:
  97:sieve_extend.c ****     free(sieve->bitarray);
 8449              		.loc 1 97 13 view .LVU2323
 8450              	.LBB818:
  98:sieve_extend.c ****     free(sieve);
 8451              		.loc 1 98 5 view .LVU2324
 8452 0239 E8000000 		call	free@PLT	#
 8452      00
 8453              	.LVL680:
  99:sieve_extend.c **** }
 8454              		.loc 1 99 5 view .LVU2325
 8455 023e 4889EF   		mov	rdi, rbp	#, sieve_instance_check
 8456 0241 E8000000 		call	free@PLT	#
 8456      00
 8457              	.LVL681:
  99:sieve_extend.c **** }
 8458              		.loc 1 99 5 is_stmt 0 view .LVU2326
 8459              	.LBE818:
 8460              	.LBE819:
1369:sieve_extend.c ****                 if (!valid) return 0; else if (option_verboselevel >= 3) printf("valid;");
 8461              		.loc 1 1369 17 is_stmt 1 view .LVU2327
 8462              	# sieve_extend.c:1369:                 if (!valid) return 0; else if (option_verboselevel >= 3) pri
 8463              		.loc 1 1369 20 is_stmt 0 view .LVU2328
 8464 0246 4585FF   		test	r15d, r15d	# valid
 8465 0249 0F842102 		je	.L625	#,
 8465      0000
 8466              		.loc 1 1369 44 is_stmt 1 discriminator 2 view .LVU2329
 8467              	# sieve_extend.c:1369:                 if (!valid) return 0; else if (option_verboselevel >= 3) pri
 8468              		.loc 1 1369 68 is_stmt 0 discriminator 2 view .LVU2330
 8469 024f 8B442468 		mov	eax, DWORD PTR 104[rsp]	# prephitmp_382, option_verboselevel
 8470              	# sieve_extend.c:1369:                 if (!valid) return 0; else if (option_verboselevel >= 3) pri
 8471              		.loc 1 1369 47 discriminator 2 view .LVU2331
 8472 0253 83F802   		cmp	eax, 2	# prephitmp_382,
 8473 0256 0F8FD400 		jg	.L663	#,
 8473      0000
 8474              	.LBE823:
GAS LISTING /tmp/ccrNbbzt.s 			page 231


1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8475              		.loc 1 1364 75 is_stmt 1 discriminator 2 view .LVU2332
 8476              	# sieve_extend.c:1364:             for (counter_t blocksize_bits=1024; blocksize_bits<=2*1024*8; bl
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8477              		.loc 1 1364 90 is_stmt 0 discriminator 2 view .LVU2333
 8478 025c 4D01F6   		add	r14, r14	# blocksize_bits
 8479              	.LVL682:
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8480              		.loc 1 1364 49 is_stmt 1 discriminator 2 view .LVU2334
 8481              	# sieve_extend.c:1364:             for (counter_t blocksize_bits=1024; blocksize_bits<=2*1024*8; bl
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8482              		.loc 1 1364 13 is_stmt 0 discriminator 2 view .LVU2335
 8483 025f FFCB     		dec	ebx	# ivtmp_213
 8484 0261 0F84EB00 		je	.L664	#,
 8484      0000
 8485              	.LVL683:
 8486              	.L589:
 8487              	.LBB824:
1365:sieve_extend.c ****                 sieve_instance_check = sieve(sieveSize_check, blocksize_bits);
 8488              		.loc 1 1365 17 is_stmt 1 view .LVU2336
 8489              	# sieve_extend.c:1365:                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uint
1365:sieve_extend.c ****                 sieve_instance_check = sieve(sieveSize_check, blocksize_bits);
 8490              		.loc 1 1365 20 is_stmt 0 view .LVU2337
 8491 0267 83F802   		cmp	eax, 2	# prephitmp_382,
 8492 026a 7EAC     		jle	.L586	#,
1365:sieve_extend.c ****                 sieve_instance_check = sieve(sieveSize_check, blocksize_bits);
 8493              		.loc 1 1365 47 is_stmt 1 view .LVU2338
 8494              	.LVL684:
 8495              	.LBB820:
 8496              	.LBI813:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8497              		.loc 3 105 1 view .LVU2339
 8498              	.LBB815:
 8499              		.loc 3 107 3 view .LVU2340
 8500              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8501              		.loc 3 107 10 is_stmt 0 view .LVU2341
 8502 026c 4C89F2   		mov	rdx, r14	#, blocksize_bits
 8503 026f 4C89EE   		mov	rsi, r13	#, tmp422
 8504 0272 BF010000 		mov	edi, 1	#,
 8504      00
 8505 0277 31C0     		xor	eax, eax	#
 8506 0279 E8000000 		call	__printf_chk@PLT	#
 8506      00
 8507              	.LVL685:
 8508 027e EB98     		jmp	.L586	#
 8509              	.LVL686:
 8510              		.p2align 4,,10
 8511              		.p2align 3
 8512              	.L575:
 8513              		.loc 3 107 10 view .LVU2342
 8514              	.LBE815:
 8515              	.LBE820:
 8516              	.LBE824:
 8517              	.LBE829:
 8518              	.LBE834:
 8519              	.LBE838:
 8520              	.LBB839:
GAS LISTING /tmp/ccrNbbzt.s 			page 232


1329:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
 8521              		.loc 1 1329 14 is_stmt 1 view .LVU2343
 8522              	# sieve_extend.c:1329:         else if (strcmp(argv[arg], "--show")==0) { option_showMaxFactor=0;
1329:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
 8523              		.loc 1 1329 18 is_stmt 0 view .LVU2344
 8524 0280 B9070000 		mov	ecx, 7	# tmp306,
 8524      00
 8525 0285 4C89C6   		mov	rsi, r8	# _4, _4
 8526 0288 488D3D00 		lea	rdi, .LC35[rip]	# tmp305,
 8526      000000
 8527 028f F3A6     		repz cmpsb
 8528 0291 0F97C2   		seta	dl	#, tmp307
 8529 0294 80DA00   		sbb	dl, 0	# _36
 8530              	# sieve_extend.c:1329:         else if (strcmp(argv[arg], "--show")==0) { option_showMaxFactor=0;
1329:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
 8531              		.loc 1 1329 17 view .LVU2345
 8532 0297 84D2     		test	dl, dl	# _36
 8533 0299 7565     		jne	.L579	#,
1329:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
 8534              		.loc 1 1329 52 is_stmt 1 discriminator 1 view .LVU2346
 8535              	# sieve_extend.c:1330:             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\
1330:sieve_extend.c ****             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) != 1 || option_showMaxF
 8536              		.loc 1 1330 16 is_stmt 0 discriminator 1 view .LVU2347
 8537 029b 41FFC6   		inc	r14d	# arg
 8538              	.LVL687:
 8539              	# sieve_extend.c:1329:         else if (strcmp(argv[arg], "--show")==0) { option_showMaxFactor=0;
1329:sieve_extend.c ****             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\n"); usage(argv[0]); }
 8540              		.loc 1 1329 72 discriminator 1 view .LVU2348
 8541 029e 48C74424 		mov	QWORD PTR 120[rsp], 0	# option_showMaxFactor,
 8541      78000000 
 8541      00
1330:sieve_extend.c ****             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) != 1 || option_showMaxF
 8542              		.loc 1 1330 13 is_stmt 1 discriminator 1 view .LVU2349
 8543              	.LVL688:
 8544              	# sieve_extend.c:1330:             if (++arg >= argc) { fprintf(stderr, "No show maximum specified\
1330:sieve_extend.c ****             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) != 1 || option_showMaxF
 8545              		.loc 1 1330 16 is_stmt 0 discriminator 1 view .LVU2350
 8546 02a7 4439F3   		cmp	ebx, r14d	# argc, arg
 8547 02aa 0F8EBC08 		jle	.L665	#,
 8547      0000
1331:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
 8548              		.loc 1 1331 13 is_stmt 1 view .LVU2351
 8549              	# sieve_extend.c:1331:             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) 
1331:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
 8550              		.loc 1 1331 28 is_stmt 0 view .LVU2352
 8551 02b0 4C8D7C05 		lea	r15, 8[rbp+rax]	# _41,
 8551      08
 8552              	# sieve_extend.c:1331:             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) 
1331:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
 8553              		.loc 1 1331 17 view .LVU2353
 8554 02b5 498B3F   		mov	rdi, QWORD PTR [r15]	#, *_41
 8555 02b8 31C0     		xor	eax, eax	#
 8556 02ba 488D5424 		lea	rdx, 120[rsp]	# tmp311,
 8556      78
 8557 02bf 488D3500 		lea	rsi, .LC37[rip]	#,
 8557      000000
 8558 02c6 E8000000 		call	__isoc99_sscanf@PLT	#
GAS LISTING /tmp/ccrNbbzt.s 			page 233


 8558      00
 8559              	.LVL689:
 8560              	# sieve_extend.c:1331:             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) 
1331:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
 8561              		.loc 1 1331 16 view .LVU2354
 8562 02cb 83F801   		cmp	eax, 1	# tmp431,
 8563 02ce 0F855E08 		jne	.L581	#,
 8563      0000
 8564              	# sieve_extend.c:1331:             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) 
1331:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
 8565              		.loc 1 1331 106 discriminator 1 view .LVU2355
 8566 02d4 488B5424 		mov	rdx, QWORD PTR 120[rsp]	# option_showMaxFactor.24_44, option_showMaxFactor
 8566      78
 8567              	# sieve_extend.c:1331:             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) 
1331:sieve_extend.c ****                 fprintf(stderr, "Error: Invalid show maximum: %s\n", argv[arg]); usage(argv[0]);
 8568              		.loc 1 1331 82 discriminator 1 view .LVU2356
 8569 02d9 483B5424 		cmp	rdx, QWORD PTR 112[rsp]	# option_showMaxFactor.24_44, option_maxFactor
 8569      70
 8570 02de 0F874E08 		ja	.L581	#,
 8570      0000
1334:sieve_extend.c ****         }
 8571              		.loc 1 1334 13 is_stmt 1 view .LVU2357
 8572              	.LVL690:
 8573              	.LBB788:
 8574              	.LBI788:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8575              		.loc 3 105 1 view .LVU2358
 8576              	.LBB789:
 8577              		.loc 3 107 3 view .LVU2359
 8578              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8579              		.loc 3 107 10 is_stmt 0 view .LVU2360
 8580 02e4 488D3500 		lea	rsi, .LC39[rip]	#,
 8580      000000
 8581 02eb BF010000 		mov	edi, 1	#,
 8581      00
 8582 02f0 31C0     		xor	eax, eax	#
 8583 02f2 E8000000 		call	__printf_chk@PLT	#
 8583      00
 8584              	.LVL691:
 8585 02f7 E9C4FDFF 		jmp	.L574	#
 8585      FF
 8586              	.LVL692:
 8587 02fc 0F1F4000 		.p2align 4,,10
 8588              		.p2align 3
 8589              	.L579:
 8590              		.loc 3 107 10 view .LVU2361
 8591              	.LBE789:
 8592              	.LBE788:
1336:sieve_extend.c ****             fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(argv[0]); 
 8593              		.loc 1 1336 14 is_stmt 1 view .LVU2362
 8594              	# sieve_extend.c:1336:         else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_maxFactor) != 
1336:sieve_extend.c ****             fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(argv[0]); 
 8595              		.loc 1 1336 18 is_stmt 0 view .LVU2363
 8596 0300 31C0     		xor	eax, eax	#
 8597 0302 488D5424 		lea	rdx, 112[rsp]	# tmp313,
 8597      70
 8598 0307 488D3500 		lea	rsi, .LC37[rip]	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 234


 8598      000000
 8599 030e 4C89C7   		mov	rdi, r8	#, _4
 8600 0311 E8000000 		call	__isoc99_sscanf@PLT	#
 8600      00
 8601              	.LVL693:
 8602              	# sieve_extend.c:1336:         else if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_maxFactor) != 
1336:sieve_extend.c ****             fprintf(stderr, "Invalid size %s\n",argv[arg]); usage(argv[0]); 
 8603              		.loc 1 1336 17 view .LVU2364
 8604 0316 83F801   		cmp	eax, 1	# tmp432,
 8605 0319 0F84A1FD 		je	.L574	#,
 8605      FFFF
1337:sieve_extend.c ****             printf("Maximum set to %ju\n",(uintmax_t)option_maxFactor);
 8606              		.loc 1 1337 13 is_stmt 1 view .LVU2365
 8607              	.LVL694:
 8608              	.LBB790:
 8609              	.LBI790:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8610              		.loc 3 98 1 view .LVU2366
 8611              	.LBB791:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 8612              		.loc 3 100 3 view .LVU2367
 8613              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 8614              		.loc 3 100 10 is_stmt 0 view .LVU2368
 8615 031f 498B0F   		mov	rcx, QWORD PTR [r15]	#, *_3
 8616 0322 488D1500 		lea	rdx, .LC40[rip]	#,
 8616      000000
 8617 0329 E98F0100 		jmp	.L656	#
 8617      00
 8618              	.LVL695:
 8619 032e 6690     		.p2align 4,,10
 8620              		.p2align 3
 8621              	.L663:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 8622              		.loc 3 100 10 view .LVU2369
 8623              	.LBE791:
 8624              	.LBE790:
 8625              	.LBE839:
 8626              	.LBB840:
 8627              	.LBB835:
 8628              	.LBB830:
 8629              	.LBB825:
 8630              		.loc 1 1369 74 is_stmt 1 view .LVU2370
 8631              	.LBB821:
 8632              	.LBI821:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8633              		.loc 3 105 1 view .LVU2371
 8634              	.LBB822:
 8635              		.loc 3 107 3 view .LVU2372
 8636              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8637              		.loc 3 107 10 is_stmt 0 view .LVU2373
 8638 0330 488D3500 		lea	rsi, .LC43[rip]	#,
 8638      000000
 8639 0337 BF010000 		mov	edi, 1	#,
 8639      00
 8640 033c 31C0     		xor	eax, eax	#
 8641 033e E8000000 		call	__printf_chk@PLT	#
GAS LISTING /tmp/ccrNbbzt.s 			page 235


 8641      00
 8642              	.LVL696:
 8643              	.LBE822:
 8644              	.LBE821:
 8645              	.LBE825:
 8646              	# sieve_extend.c:1364:             for (counter_t blocksize_bits=1024; blocksize_bits<=2*1024*8; bl
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8647              		.loc 1 1364 90 view .LVU2374
 8648 0343 4D01F6   		add	r14, r14	# blocksize_bits
 8649              	.LVL697:
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8650              		.loc 1 1364 90 view .LVU2375
 8651 0346 8B442468 		mov	eax, DWORD PTR 104[rsp]	# prephitmp_382, option_verboselevel
 8652              	.LVL698:
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8653              		.loc 1 1364 75 is_stmt 1 view .LVU2376
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8654              		.loc 1 1364 49 view .LVU2377
 8655              	# sieve_extend.c:1364:             for (counter_t blocksize_bits=1024; blocksize_bits<=2*1024*8; bl
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8656              		.loc 1 1364 13 is_stmt 0 view .LVU2378
 8657 034a FFCB     		dec	ebx	# ivtmp_213
 8658 034c 0F8515FF 		jne	.L589	#,
 8658      FFFF
 8659              	.L664:
1364:sieve_extend.c ****                 if (option_verboselevel >= 3) printf(".blocksize %ju-",(uintmax_t)blocksize_bits);
 8660              		.loc 1 1364 13 view .LVU2379
 8661              	.LBE830:
1370:sieve_extend.c ****             }
1371:sieve_extend.c ****             if (option_verboselevel >= 2) printf("\n");
 8662              		.loc 1 1371 13 is_stmt 1 view .LVU2380
 8663              	# sieve_extend.c:1371:             if (option_verboselevel >= 2) printf("\n");
 8664              		.loc 1 1371 16 is_stmt 0 view .LVU2381
 8665 0352 83F801   		cmp	eax, 1	# prephitmp_382,
 8666 0355 7E0A     		jle	.L590	#,
 8667              		.loc 1 1371 43 is_stmt 1 view .LVU2382
 8668              	.LVL699:
 8669              	.LBB831:
 8670              	.LBI831:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8671              		.loc 3 105 1 view .LVU2383
 8672              	.LBB832:
 8673              		.loc 3 107 3 view .LVU2384
 8674              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8675              		.loc 3 107 10 is_stmt 0 view .LVU2385
 8676 0357 BF0A0000 		mov	edi, 10	#,
 8676      00
 8677 035c E8000000 		call	putchar@PLT	#
 8677      00
 8678              	.LVL700:
 8679              	.L590:
 8680              		.loc 3 107 10 view .LVU2386
 8681              	.LBE832:
 8682              	.LBE831:
 8683              	.LBE835:
1361:sieve_extend.c ****             if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_ch
 8684              		.loc 1 1361 77 is_stmt 1 discriminator 2 view .LVU2387
GAS LISTING /tmp/ccrNbbzt.s 			page 236


 8685              	# sieve_extend.c:1361:         for (counter_t sieveSize_check = 100; sieveSize_check <= 100000000; 
1361:sieve_extend.c ****             if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_ch
 8686              		.loc 1 1361 93 is_stmt 0 discriminator 2 view .LVU2388
 8687 0361 4F8D24A4 		lea	r12, [r12+r12*4]	# tmp319,
 8688              	.LVL701:
1361:sieve_extend.c ****             if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_ch
 8689              		.loc 1 1361 93 discriminator 2 view .LVU2389
 8690 0365 4D01E4   		add	r12, r12	# sieveSize_check
 8691              	.LVL702:
1361:sieve_extend.c ****             if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_ch
 8692              		.loc 1 1361 47 is_stmt 1 discriminator 2 view .LVU2390
 8693              	# sieve_extend.c:1361:         for (counter_t sieveSize_check = 100; sieveSize_check <= 100000000; 
1361:sieve_extend.c ****             if (option_verboselevel >= 2) printf("...Checking size %ju ...",(uintmax_t)sieveSize_ch
 8694              		.loc 1 1361 9 is_stmt 0 discriminator 2 view .LVU2391
 8695 0368 FF0C24   		dec	DWORD PTR [rsp]	# %sfp
 8696 036b 0F8570FE 		jne	.L591	#,
 8696      FFFF
 8697              	.LBE840:
1372:sieve_extend.c ****         }
1373:sieve_extend.c ****         if (option_verboselevel >= 1) printf("...Valid algorithm\n");
 8698              		.loc 1 1373 9 is_stmt 1 view .LVU2392
 8699              	# sieve_extend.c:1373:         if (option_verboselevel >= 1) printf("...Valid algorithm\n");
 8700              		.loc 1 1373 12 is_stmt 0 view .LVU2393
 8701 0371 837C2468 		cmp	DWORD PTR 104[rsp], 0	# option_verboselevel,
 8701      00
 8702 0376 0F8FE105 		jg	.L666	#,
 8702      0000
1374:sieve_extend.c ****     }
1375:sieve_extend.c ****     
1376:sieve_extend.c ****     counter_t best_blocksize_bits = default_blocksize;
 8703              		.loc 1 1376 5 is_stmt 1 view .LVU2394
 8704              	.LVL703:
1377:sieve_extend.c ****     if (option_tunelevel) {
 8705              		.loc 1 1377 5 view .LVU2395
 8706              	# sieve_extend.c:1377:     if (option_tunelevel) {
 8707              		.loc 1 1377 9 is_stmt 0 view .LVU2396
 8708 037c 8B44246C 		mov	eax, DWORD PTR 108[rsp]	# option_tunelevel.40_342, option_tunelevel
 8709              	# sieve_extend.c:1376:     counter_t best_blocksize_bits = default_blocksize;
1376:sieve_extend.c ****     if (option_tunelevel) {
 8710              		.loc 1 1376 15 view .LVU2397
 8711 0380 41BC00FC 		mov	r12d, 261120	# best_result$blocksize_bits,
 8711      0300
 8712              	.LVL704:
 8713              	# sieve_extend.c:1377:     if (option_tunelevel) {
 8714              		.loc 1 1377 8 view .LVU2398
 8715 0386 85C0     		test	eax, eax	# option_tunelevel.40_342
 8716 0388 0F85F501 		jne	.L667	#,
 8716      0000
 8717              	.LVL705:
 8718              	.L618:
 8719              	.LBB841:
1378:sieve_extend.c ****         tuning_result_type tuning_result = tune(option_tunelevel, option_maxFactor, option_verbosel
1379:sieve_extend.c ****         global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
1380:sieve_extend.c ****         global_MEDIUMSTEP_FASTER = tuning_result.mediumstep_faster;
1381:sieve_extend.c ****         best_blocksize_bits = tuning_result.blocksize_bits;
1382:sieve_extend.c ****     }
1383:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 237


1384:sieve_extend.c ****     double max_time = default_sieve_duration;
1385:sieve_extend.c ****     if (best_blocksize_bits > 0) {
1386:sieve_extend.c ****         if (option_verboselevel >= 1) printf("Benchmarking... with blocksize %ju steps: %ju/%ju\n",
1387:sieve_extend.c ****         counter_t passes = 0;
 8720              		.loc 1 1387 9 is_stmt 1 view .LVU2399
1388:sieve_extend.c ****         counter_t blocksize_bits = best_blocksize_bits;
 8721              		.loc 1 1388 9 view .LVU2400
1389:sieve_extend.c ****         double elapsed_time = 0;
 8722              		.loc 1 1389 9 view .LVU2401
1390:sieve_extend.c ****         struct sieve_state *sieve_instance;
 8723              		.loc 1 1390 9 view .LVU2402
1391:sieve_extend.c ****         clock_gettime(CLOCK_MONOTONIC,&start_time);
 8724              		.loc 1 1391 9 view .LVU2403
 8725 038e 488DB424 		lea	rsi, 128[rsp]	# tmp382,
 8725      80000000 
 8726 0396 BF010000 		mov	edi, 1	#,
 8726      00
 8727 039b E8000000 		call	clock_gettime@PLT	#
 8727      00
 8728              	.LVL706:
1392:sieve_extend.c ****         while (elapsed_time <= max_time) {
 8729              		.loc 1 1392 9 view .LVU2404
 8730              		.loc 1 1392 15 view .LVU2405
 8731              	# sieve_extend.c:1387:         counter_t passes = 0;
1387:sieve_extend.c ****         counter_t blocksize_bits = best_blocksize_bits;
 8732              		.loc 1 1387 19 is_stmt 0 view .LVU2406
 8733 03a0 31DB     		xor	ebx, ebx	# passes
 8734 03a2 4C8DAC24 		lea	r13, 144[rsp]	# tmp409,
 8734      90000000 
 8735              	.LVL707:
 8736 03aa 660F1F44 		.p2align 4,,10
 8736      0000
 8737              		.p2align 3
 8738              	.L619:
1393:sieve_extend.c ****             sieve_instance = sieve(option_maxFactor, blocksize_bits);//blocksize_bits);
 8739              		.loc 1 1393 13 is_stmt 1 view .LVU2407
 8740              	# sieve_extend.c:1393:             sieve_instance = sieve(option_maxFactor, blocksize_bits);//block
 8741              		.loc 1 1393 30 is_stmt 0 view .LVU2408
 8742 03b0 488B7C24 		mov	rdi, QWORD PTR 112[rsp]	#, option_maxFactor
 8742      70
 8743 03b5 4C89E6   		mov	rsi, r12	#, best_result$blocksize_bits
 8744 03b8 E8000000 		call	sieve	#
 8744      00
 8745              	.LVL708:
 8746              	.LBB842:
 8747              	.LBB843:
 8748              	# sieve_extend.c:98:     free(sieve->bitarray);
  98:sieve_extend.c ****     free(sieve);
 8749              		.loc 1 98 5 view .LVU2409
 8750 03bd 488B38   		mov	rdi, QWORD PTR [rax]	#, sieve_instance_143->bitarray
 8751              	.LBE843:
 8752              	.LBE842:
 8753              	# sieve_extend.c:1393:             sieve_instance = sieve(option_maxFactor, blocksize_bits);//block
 8754              		.loc 1 1393 30 view .LVU2410
 8755 03c0 4889C5   		mov	rbp, rax	# sieve_instance, tmp436
 8756              	.LVL709:
1394:sieve_extend.c ****             delete_sieve(sieve_instance);
GAS LISTING /tmp/ccrNbbzt.s 			page 238


 8757              		.loc 1 1394 13 is_stmt 1 view .LVU2411
 8758              	.LBB845:
 8759              	.LBI842:
  97:sieve_extend.c ****     free(sieve->bitarray);
 8760              		.loc 1 97 13 view .LVU2412
 8761              	.LBB844:
  98:sieve_extend.c ****     free(sieve);
 8762              		.loc 1 98 5 view .LVU2413
 8763 03c3 E8000000 		call	free@PLT	#
 8763      00
 8764              	.LVL710:
  99:sieve_extend.c **** }
 8765              		.loc 1 99 5 view .LVU2414
 8766 03c8 4889EF   		mov	rdi, rbp	#, sieve_instance
 8767 03cb E8000000 		call	free@PLT	#
 8767      00
 8768              	.LVL711:
  99:sieve_extend.c **** }
 8769              		.loc 1 99 5 is_stmt 0 view .LVU2415
 8770              	.LBE844:
 8771              	.LBE845:
1395:sieve_extend.c ****             passes++;
 8772              		.loc 1 1395 13 is_stmt 1 view .LVU2416
 8773              	# sieve_extend.c:1396:             clock_gettime(CLOCK_MONOTONIC,&end_time);
1396:sieve_extend.c ****             clock_gettime(CLOCK_MONOTONIC,&end_time);
 8774              		.loc 1 1396 13 is_stmt 0 view .LVU2417
 8775 03d0 4C89EE   		mov	rsi, r13	#, tmp409
 8776 03d3 BF010000 		mov	edi, 1	#,
 8776      00
 8777 03d8 E8000000 		call	clock_gettime@PLT	#
 8777      00
 8778              	.LVL712:
 8779              	# sieve_extend.c:1397:             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_t
1397:sieve_extend.c ****             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time
 8780              		.loc 1 1397 62 view .LVU2418
 8781 03dd C5E057DB 		vxorps	xmm3, xmm3, xmm3	# tmp438
 8782 03e1 C4E1E32A 		vcvtsi2sd	xmm0, xmm3, QWORD PTR 152[rsp]	# tmp439, tmp438, end_time.tv_nsec
 8782      84249800 
 8782      0000
 8783              	# sieve_extend.c:1392:         while (elapsed_time <= max_time) {
1392:sieve_extend.c ****             sieve_instance = sieve(option_maxFactor, blocksize_bits);//blocksize_bits);
 8784              		.loc 1 1392 15 view .LVU2419
 8785 03eb C5FB1035 		vmovsd	xmm6, QWORD PTR .LC53[rip]	# tmp524,
 8785      00000000 
 8786              	# sieve_extend.c:1395:             passes++;
1395:sieve_extend.c ****             clock_gettime(CLOCK_MONOTONIC,&end_time);
 8787              		.loc 1 1395 19 view .LVU2420
 8788 03f3 48FFC3   		inc	rbx	# passes
 8789              	.LVL713:
1396:sieve_extend.c ****             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_time.tv_sec - start_time
 8790              		.loc 1 1396 13 is_stmt 1 view .LVU2421
 8791              		.loc 1 1397 13 view .LVU2422
 8792              	# sieve_extend.c:1397:             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_t
 8793              		.loc 1 1397 62 is_stmt 0 view .LVU2423
 8794 03f6 C5F928C8 		vmovapd	xmm1, xmm0	# tmp385, tmp439
 8795              	# sieve_extend.c:1397:             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_t
 8796              		.loc 1 1397 68 view .LVU2424
GAS LISTING /tmp/ccrNbbzt.s 			page 239


 8797 03fa C4E1E32A 		vcvtsi2sd	xmm0, xmm3, QWORD PTR 128[rsp]	# tmp440, tmp438, start_time.tv_sec
 8797      84248000 
 8797      0000
 8798 0404 C4E2F1BB 		vfmsub231sd	xmm0, xmm1, QWORD PTR .LC4[rip]	# _285, tmp385,
 8798      05000000 
 8798      00
 8799              	# sieve_extend.c:1397:             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_t
 8800              		.loc 1 1397 108 view .LVU2425
 8801 040d C4E1E32A 		vcvtsi2sd	xmm1, xmm3, QWORD PTR 136[rsp]	# tmp441, tmp438, start_time.tv_nsec
 8801      8C248800 
 8801      0000
 8802 0417 C5F928D1 		vmovapd	xmm2, xmm1	# tmp388, tmp441
 8803              	# sieve_extend.c:1397:             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_t
 8804              		.loc 1 1397 44 view .LVU2426
 8805 041b C4E1E32A 		vcvtsi2sd	xmm1, xmm3, QWORD PTR 144[rsp]	# tmp442, tmp438, end_time.tv_sec
 8805      8C249000 
 8805      0000
 8806 0425 C4E2E9BD 		vfnmadd231sd	xmm1, xmm2, QWORD PTR .LC4[rip]	# _286, tmp388,
 8806      0D000000 
 8806      00
 8807              	# sieve_extend.c:1397:             elapsed_time = end_time.tv_sec + end_time.tv_nsec*1e-9 - start_t
 8808              		.loc 1 1397 26 view .LVU2427
 8809 042e C5FB58C1 		vaddsd	xmm0, xmm0, xmm1	# elapsed_time, _285, _286
 8810              	.LVL714:
1392:sieve_extend.c ****             sieve_instance = sieve(option_maxFactor, blocksize_bits);//blocksize_bits);
 8811              		.loc 1 1392 15 is_stmt 1 view .LVU2428
 8812 0432 C5F92FF0 		vcomisd	xmm6, xmm0	# tmp524, elapsed_time
 8813 0436 0F8374FF 		jnb	.L619	#,
 8813      FFFF
1398:sieve_extend.c ****         }
1399:sieve_extend.c ****         printf("rogiervandam_extend;%ju;%f;1;algorithm=other,faithful=yes,bits=1\n", (uintmax_t)pas
 8814              		.loc 1 1399 9 view .LVU2429
 8815              	.LVL715:
 8816              	.LBB846:
 8817              	.LBI846:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8818              		.loc 3 105 1 view .LVU2430
 8819              	.LBB847:
 8820              		.loc 3 107 3 view .LVU2431
 8821              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8822              		.loc 3 107 10 is_stmt 0 view .LVU2432
 8823 043c 4889DA   		mov	rdx, rbx	#, passes
 8824 043f 488D3500 		lea	rsi, .LC54[rip]	#,
 8824      000000
 8825 0446 BF010000 		mov	edi, 1	#,
 8825      00
 8826 044b B8010000 		mov	eax, 1	#,
 8826      00
 8827 0450 C5FB1104 		vmovsd	QWORD PTR [rsp], xmm0	# %sfp, elapsed_time
 8827      24
 8828 0455 E8000000 		call	__printf_chk@PLT	#
 8828      00
 8829              	.LVL716:
 8830              		.loc 3 107 10 view .LVU2433
 8831              	.LBE847:
 8832              	.LBE846:
1400:sieve_extend.c ****         if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - per second %f\n", 5*pass
GAS LISTING /tmp/ccrNbbzt.s 			page 240


 8833              		.loc 1 1400 9 is_stmt 1 view .LVU2434
 8834              	# sieve_extend.c:1400:         if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - p
 8835              		.loc 1 1400 12 is_stmt 0 view .LVU2435
 8836 045a 837C2468 		cmp	DWORD PTR 104[rsp], 0	# option_verboselevel,
 8836      00
 8837 045f 0F8FC100 		jg	.L668	#,
 8837      0000
 8838              	.LVL717:
 8839              	.L617:
 8840              		.loc 1 1400 12 view .LVU2436
 8841              	.LBE841:
1401:sieve_extend.c ****     }
1402:sieve_extend.c ****     
1403:sieve_extend.c ****     if (option_showMaxFactor > 0) {
 8842              		.loc 1 1403 5 is_stmt 1 view .LVU2437
 8843              	# sieve_extend.c:1403:     if (option_showMaxFactor > 0) {
 8844              		.loc 1 1403 8 is_stmt 0 view .LVU2438
 8845 0465 48837C24 		cmp	QWORD PTR 120[rsp], 0	# option_showMaxFactor,
 8845      7800
 8846 046b 756C     		jne	.L669	#,
 8847 046d 0F1F00   		.p2align 4,,10
 8848              		.p2align 3
 8849              	.L625:
 8850              	.LBB856:
 8851              	.LBB836:
 8852              	.LBB833:
 8853              	.LBB826:
1369:sieve_extend.c ****             }
 8854              		.loc 1 1369 29 is_stmt 1 discriminator 1 view .LVU2439
 8855              	.LBE826:
 8856              	.LBE833:
 8857              	.LBE836:
 8858              	.LBE856:
 8859              	# sieve_extend.c:1410: }
1404:sieve_extend.c ****         printf("Show result set:\n");
1405:sieve_extend.c ****         struct sieve_state* sieve_instance = sieve(option_maxFactor, option_maxFactor);
1406:sieve_extend.c ****         show_primes(sieve_instance, option_showMaxFactor);
1407:sieve_extend.c ****         delete_sieve(sieve_instance);
1408:sieve_extend.c ****         printf("\n");
1409:sieve_extend.c ****     }
1410:sieve_extend.c **** }
 8860              		.loc 1 1410 1 is_stmt 0 discriminator 1 view .LVU2440
 8861 0470 488B8424 		mov	rax, QWORD PTR 168[rsp]	# tmp480, D.7429
 8861      A8000000 
 8862 0478 64483304 		xor	rax, QWORD PTR fs:40	# tmp480, MEM[(<address-space-1> long unsigned int *)40B]
 8862      25280000 
 8862      00
 8863 0481 0F85E006 		jne	.L670	#,
 8863      0000
 8864              	# sieve_extend.c:1410: }
 8865              		.loc 1 1410 1 view .LVU2441
 8866 0487 4881C4B8 		add	rsp, 184	#,
 8866      000000
 8867              		.cfi_remember_state
 8868              		.cfi_def_cfa_offset 56
 8869 048e 5B       		pop	rbx	#
 8870              		.cfi_def_cfa_offset 48
GAS LISTING /tmp/ccrNbbzt.s 			page 241


 8871 048f 5D       		pop	rbp	#
 8872              		.cfi_def_cfa_offset 40
 8873 0490 415C     		pop	r12	#
 8874              		.cfi_def_cfa_offset 32
 8875 0492 415D     		pop	r13	#
 8876              		.cfi_def_cfa_offset 24
 8877 0494 415E     		pop	r14	#
 8878              		.cfi_def_cfa_offset 16
 8879 0496 31C0     		xor	eax, eax	#
 8880 0498 415F     		pop	r15	#
 8881              		.cfi_def_cfa_offset 8
 8882 049a C3       		ret	
 8883              	.L583:
 8884              		.cfi_restore_state
1357:sieve_extend.c ****         if (option_verboselevel >= 2) printf("\n");
 8885              		.loc 1 1357 39 is_stmt 1 view .LVU2442
 8886              	.LVL718:
 8887              	.LBB857:
 8888              	.LBI857:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8889              		.loc 3 105 1 view .LVU2443
 8890              	.LBB858:
 8891              		.loc 3 107 3 view .LVU2444
 8892              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8893              		.loc 3 107 10 is_stmt 0 view .LVU2445
 8894 049b 488D3500 		lea	rsi, .LC23[rip]	#,
 8894      000000
 8895 04a2 BF010000 		mov	edi, 1	#,
 8895      00
 8896 04a7 31C0     		xor	eax, eax	#
 8897 04a9 E8000000 		call	__printf_chk@PLT	#
 8897      00
 8898              	.LVL719:
 8899 04ae E909FDFF 		jmp	.L568	#
 8899      FF
 8900              	.LVL720:
 8901              	.L572:
 8902              		.loc 3 107 10 view .LVU2446
 8903              	.LBE858:
 8904              	.LBE857:
 8905              	.LBB859:
1317:sieve_extend.c ****             }
 8906              		.loc 1 1317 17 is_stmt 1 view .LVU2447
 8907              	.LBB792:
 8908              	.LBI792:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8909              		.loc 3 98 1 view .LVU2448
 8910              	.LBB793:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 8911              		.loc 3 100 3 view .LVU2449
 8912              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 8913              		.loc 3 100 10 is_stmt 0 view .LVU2450
 8914 04b3 498B0F   		mov	rcx, QWORD PTR [r15]	#, *_16
 8915 04b6 488D1500 		lea	rdx, .LC28[rip]	#,
 8915      000000
 8916              	.LVL721:
GAS LISTING /tmp/ccrNbbzt.s 			page 242


 8917              	.L656:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 8918              		.loc 3 100 10 view .LVU2451
 8919              	.LBE793:
 8920              	.LBE792:
 8921              	.LBB794:
 8922              	.LBB795:
 8923 04bd 488B3D00 		mov	rdi, QWORD PTR stderr[rip]	#, stderr
 8923      000000
 8924 04c4 BE010000 		mov	esi, 1	#,
 8924      00
 8925 04c9 31C0     		xor	eax, eax	#
 8926 04cb E8000000 		call	__fprintf_chk@PLT	#
 8926      00
 8927              	.LVL722:
 8928              	.L657:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 8929              		.loc 3 100 10 view .LVU2452
 8930              	.LBE795:
 8931              	.LBE794:
1325:sieve_extend.c ****             }
 8932              		.loc 1 1325 80 is_stmt 1 view .LVU2453
 8933 04d0 488B7D00 		mov	rdi, QWORD PTR 0[rbp]	#, *argv_156(D)
 8934 04d4 E8000000 		call	usage	#
 8934      00
 8935              	.LVL723:
 8936              	.L669:
1325:sieve_extend.c ****             }
 8937              		.loc 1 1325 80 is_stmt 0 view .LVU2454
 8938              	.LBE859:
 8939              	.LBB860:
1404:sieve_extend.c ****         struct sieve_state* sieve_instance = sieve(option_maxFactor, option_maxFactor);
 8940              		.loc 1 1404 9 is_stmt 1 view .LVU2455
 8941              	.LBB861:
 8942              	.LBI861:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8943              		.loc 3 105 1 view .LVU2456
 8944              	.LBB862:
 8945              		.loc 3 107 3 view .LVU2457
 8946              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8947              		.loc 3 107 10 is_stmt 0 view .LVU2458
 8948 04d9 488D3D00 		lea	rdi, .LC56[rip]	#,
 8948      000000
 8949 04e0 E8000000 		call	puts@PLT	#
 8949      00
 8950              	.LVL724:
 8951              		.loc 3 107 10 view .LVU2459
 8952              	.LBE862:
 8953              	.LBE861:
1405:sieve_extend.c ****         show_primes(sieve_instance, option_showMaxFactor);
 8954              		.loc 1 1405 9 is_stmt 1 view .LVU2460
 8955              	# sieve_extend.c:1405:         struct sieve_state* sieve_instance = sieve(option_maxFactor, option_
1405:sieve_extend.c ****         show_primes(sieve_instance, option_showMaxFactor);
 8956              		.loc 1 1405 46 is_stmt 0 view .LVU2461
 8957 04e5 488B7C24 		mov	rdi, QWORD PTR 112[rsp]	# option_maxFactor.50_91, option_maxFactor
 8957      70
 8958 04ea 4889FE   		mov	rsi, rdi	#, option_maxFactor.50_91
GAS LISTING /tmp/ccrNbbzt.s 			page 243


 8959 04ed E8000000 		call	sieve	#
 8959      00
 8960              	.LVL725:
 8961              	# sieve_extend.c:1406:         show_primes(sieve_instance, option_showMaxFactor);
1406:sieve_extend.c ****         delete_sieve(sieve_instance);
 8962              		.loc 1 1406 9 view .LVU2462
 8963 04f2 488B5424 		mov	rdx, QWORD PTR 120[rsp]	#, option_showMaxFactor
 8963      78
 8964              	# sieve_extend.c:1405:         struct sieve_state* sieve_instance = sieve(option_maxFactor, option_
1405:sieve_extend.c ****         show_primes(sieve_instance, option_showMaxFactor);
 8965              		.loc 1 1405 46 view .LVU2463
 8966 04f7 4889C5   		mov	rbp, rax	# sieve_instance, tmp437
 8967              	.LVL726:
1406:sieve_extend.c ****         delete_sieve(sieve_instance);
 8968              		.loc 1 1406 9 is_stmt 1 view .LVU2464
 8969 04fa 488D7008 		lea	rsi, 8[rax]	# tmp404,
 8970 04fe 4889C7   		mov	rdi, rax	#, sieve_instance
 8971 0501 E8000000 		call	show_primes.isra.0	#
 8971      00
 8972              	.LVL727:
1407:sieve_extend.c ****         printf("\n");
 8973              		.loc 1 1407 9 view .LVU2465
 8974              	.LBB863:
 8975              	.LBI863:
  97:sieve_extend.c ****     free(sieve->bitarray);
 8976              		.loc 1 97 13 view .LVU2466
 8977              	.LBB864:
  98:sieve_extend.c ****     free(sieve);
 8978              		.loc 1 98 5 view .LVU2467
 8979 0506 488B7D00 		mov	rdi, QWORD PTR 0[rbp]	#, sieve_instance_148->bitarray
 8980 050a E8000000 		call	free@PLT	#
 8980      00
 8981              	.LVL728:
  99:sieve_extend.c **** }
 8982              		.loc 1 99 5 view .LVU2468
 8983 050f 4889EF   		mov	rdi, rbp	#, sieve_instance
 8984 0512 E8000000 		call	free@PLT	#
 8984      00
 8985              	.LVL729:
  99:sieve_extend.c **** }
 8986              		.loc 1 99 5 is_stmt 0 view .LVU2469
 8987              	.LBE864:
 8988              	.LBE863:
1408:sieve_extend.c ****     }
 8989              		.loc 1 1408 9 is_stmt 1 view .LVU2470
 8990              	.LBB865:
 8991              	.LBI865:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 8992              		.loc 3 105 1 view .LVU2471
 8993              	.LBB866:
 8994              		.loc 3 107 3 view .LVU2472
 8995              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 8996              		.loc 3 107 10 is_stmt 0 view .LVU2473
 8997 0517 BF0A0000 		mov	edi, 10	#,
 8997      00
 8998 051c E8000000 		call	putchar@PLT	#
 8998      00
GAS LISTING /tmp/ccrNbbzt.s 			page 244


 8999              	.LVL730:
 9000 0521 E94AFFFF 		jmp	.L625	#
 9000      FF
 9001              	.LVL731:
 9002              	.L668:
 9003              		.loc 3 107 10 view .LVU2474
 9004              	.LBE866:
 9005              	.LBE865:
 9006              	.LBE860:
 9007              	.LBB867:
1400:sieve_extend.c ****     }
 9008              		.loc 1 1400 39 is_stmt 1 discriminator 1 view .LVU2475
 9009              	.LBB848:
 9010              	.LBI848:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9011              		.loc 3 105 1 discriminator 1 view .LVU2476
 9012              	.LBB849:
 9013              		.loc 3 107 3 discriminator 1 view .LVU2477
 9014              	.LBE849:
 9015              	.LBE848:
 9016              	# sieve_extend.c:1400:         if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - p
1400:sieve_extend.c ****     }
 9017              		.loc 1 1400 39 is_stmt 0 discriminator 1 view .LVU2478
 9018 0526 4885DB   		test	rbx, rbx	# passes
 9019 0529 C5FB1004 		vmovsd	xmm0, QWORD PTR [rsp]	# elapsed_time, %sfp
 9019      24
 9020 052e C5E057DB 		vxorps	xmm3, xmm3, xmm3	# tmp438
 9021 0532 0F886105 		js	.L621	#,
 9021      0000
 9022 0538 C4E1E32A 		vcvtsi2sd	xmm1, xmm3, rbx	# tmp443, tmp438, passes
 9022      CB
 9023              	.L622:
 9024              	# sieve_extend.c:1400:         if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - p
1400:sieve_extend.c ****     }
 9025              		.loc 1 1400 95 discriminator 1 view .LVU2479
 9026 053d 488D1C9B 		lea	rbx, [rbx+rbx*4]	# tmp397,
 9027              	.LVL732:
 9028              	# sieve_extend.c:1400:         if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - p
1400:sieve_extend.c ****     }
 9029              		.loc 1 1400 39 discriminator 1 view .LVU2480
 9030 0541 C5F35EC8 		vdivsd	xmm1, xmm1, xmm0	# tmp396, tmp392, elapsed_time
 9031 0545 C4E1E32A 		vcvtsi2sd	xmm2, xmm3, rbx	# tmp445, tmp438, tmp397
 9031      D3
 9032 054a 4885DB   		test	rbx, rbx	# tmp397
 9033 054d 7915     		jns	.L624	#,
 9034 054f 4889D8   		mov	rax, rbx	# tmp400, tmp397
 9035 0552 48D1E8   		shr	rax	# tmp400
 9036 0555 83E301   		and	ebx, 1	# tmp401,
 9037 0558 4809D8   		or	rax, rbx	# tmp400, tmp401
 9038 055b C4E1E32A 		vcvtsi2sd	xmm2, xmm3, rax	# tmp446, tmp438, tmp400
 9038      D0
 9039 0560 C5EB58D2 		vaddsd	xmm2, xmm2, xmm2	# tmp398, tmp399, tmp399
 9040              	.L624:
 9041              	.LBB852:
 9042              	.LBB850:
 9043              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9044              		.loc 3 107 10 discriminator 1 view .LVU2481
GAS LISTING /tmp/ccrNbbzt.s 			page 245


 9045 0564 488D3500 		lea	rsi, .LC55[rip]	#,
 9045      000000
 9046 056b BF010000 		mov	edi, 1	#,
 9046      00
 9047 0570 B8020000 		mov	eax, 2	#,
 9047      00
 9048              	.LBE850:
 9049              	.LBE852:
 9050              	# sieve_extend.c:1400:         if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - p
1400:sieve_extend.c ****     }
 9051              		.loc 1 1400 39 discriminator 1 view .LVU2482
 9052 0575 C5EB5EC0 		vdivsd	xmm0, xmm2, xmm0	# tmp402, tmp398, elapsed_time
 9053              	.LBB853:
 9054              	.LBB851:
 9055              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9056              		.loc 3 107 10 discriminator 1 view .LVU2483
 9057 0579 E8000000 		call	__printf_chk@PLT	#
 9057      00
 9058              	.LVL733:
 9059 057e E9E2FEFF 		jmp	.L617	#
 9059      FF
 9060              	.LVL734:
 9061              	.L667:
 9062              		.loc 3 107 10 discriminator 1 view .LVU2484
 9063              	.LBE851:
 9064              	.LBE853:
 9065              	.LBE867:
 9066              	.LBB868:
1378:sieve_extend.c ****         global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
 9067              		.loc 1 1378 9 is_stmt 1 view .LVU2485
 9068              	# sieve_extend.c:1378:         tuning_result_type tuning_result = tune(option_tunelevel, option_max
1378:sieve_extend.c ****         global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
 9069              		.loc 1 1378 44 is_stmt 0 view .LVU2486
 9070 0583 8B5C2468 		mov	ebx, DWORD PTR 104[rsp]	# option_verboselevel.41_63, option_verboselevel
 9071 0587 FFC8     		dec	eax	#
 9072 0589 895C2450 		mov	DWORD PTR 80[rsp], ebx	# %sfp, option_verboselevel.41_63
 9073 058d 488B5C24 		mov	rbx, QWORD PTR 112[rsp]	# option_maxFactor.42_64, option_maxFactor
 9073      70
 9074 0592 48895C24 		mov	QWORD PTR 72[rsp], rbx	# %sfp, option_maxFactor.42_64
 9074      48
 9075              	.LVL735:
 9076              	.LBB869:
 9077              	.LBI869:
1172:sieve_extend.c ****     counter_t best_blocksize_bits = default_blocksize;
 9078              		.loc 1 1172 27 is_stmt 1 view .LVU2487
 9079              	.LBB870:
1173:sieve_extend.c **** 
 9080              		.loc 1 1173 5 view .LVU2488
1175:sieve_extend.c ****     best_blocksize_bits = 0;
 9081              		.loc 1 1175 5 view .LVU2489
1176:sieve_extend.c ****     counter_t best_smallstep_faster = 0;
 9082              		.loc 1 1176 5 view .LVU2490
1177:sieve_extend.c ****     counter_t best_mediumstep_faster = 0;
 9083              		.loc 1 1177 5 view .LVU2491
1178:sieve_extend.c ****     counter_t smallstep_faster_steps = 4;
 9084              		.loc 1 1178 5 view .LVU2492
1179:sieve_extend.c ****     counter_t mediumstep_faster_steps = 4;
GAS LISTING /tmp/ccrNbbzt.s 			page 246


 9085              		.loc 1 1179 5 view .LVU2493
1180:sieve_extend.c ****     counter_t freebits_steps = anticiped_cache_line_bytesize;
 9086              		.loc 1 1180 5 view .LVU2494
1181:sieve_extend.c ****     counter_t sample_max = default_sample_max;
 9087              		.loc 1 1181 5 view .LVU2495
1182:sieve_extend.c ****     double sample_duration = default_sample_duration;
 9088              		.loc 1 1182 5 view .LVU2496
1183:sieve_extend.c **** 
 9089              		.loc 1 1183 5 view .LVU2497
1186:sieve_extend.c ****         case 1:
 9090              		.loc 1 1186 5 view .LVU2498
 9091 0597 83F802   		cmp	eax, 2	# _209,
 9092 059a 0F868604 		jbe	.L626	#,
 9092      0000
 9093 05a0 C5FB103D 		vmovsd	xmm7, QWORD PTR .LC22[rip]	# sample_duration,
 9093      00000000 
 9094 05a8 48C74424 		mov	QWORD PTR 48[rsp], 5	# %sfp,
 9094      30050000 
 9094      00
 9095 05b1 48C74424 		mov	QWORD PTR 56[rsp], 128	# %sfp,
 9095      38800000 
 9095      00
 9096 05ba 48C74424 		mov	QWORD PTR 88[rsp], 4	# %sfp,
 9096      58040000 
 9096      00
 9097 05c3 C5FB117C 		vmovsd	QWORD PTR 64[rsp], xmm7	# %sfp, sample_duration
 9097      2440
 9098              	.LVL736:
 9099              	.L596:
1211:sieve_extend.c ****     tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
 9100              		.loc 1 1211 5 view .LVU2499
 9101              	# sieve_extend.c:1211:     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_
1211:sieve_extend.c ****     tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
 9102              		.loc 1 1211 33 is_stmt 0 view .LVU2500
 9103 05c9 B8400000 		mov	eax, 64	# tmp330,
 9103      00
 9104 05ce 31D2     		xor	edx, edx	# tmp329
 9105 05d0 48F77424 		div	QWORD PTR 88[rsp]	# %sfp
 9105      58
 9106              	# sieve_extend.c:1211:     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_
1211:sieve_extend.c ****     tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
 9107              		.loc 1 1211 194 view .LVU2501
 9108 05d5 31D2     		xor	edx, edx	# tmp337
 9109              	# sieve_extend.c:1213:     counter_t tuning_results=0;
1213:sieve_extend.c ****     counter_t tuning_result_index=0;
 9110              		.loc 1 1213 15 view .LVU2502
 9111 05d7 4531FF   		xor	r15d, r15d	# tuning_results
 9112              	.LVL737:
 9113              	.LBB871:
 9114              	# sieve_extend.c:1216:     for (counter_t smallstep_faster = 0; smallstep_faster <= WORD_SIZE/2; sm
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9115              		.loc 1 1216 20 view .LVU2503
 9116 05da 4531ED   		xor	r13d, r13d	# smallstep_faster
 9117 05dd 4D89FE   		mov	r14, r15	# tuning_results, tuning_results
 9118              	.LVL738:
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9119              		.loc 1 1216 20 view .LVU2504
GAS LISTING /tmp/ccrNbbzt.s 			page 247


 9120              	.LBE871:
 9121              	# sieve_extend.c:1211:     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_
1211:sieve_extend.c ****     tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
 9122              		.loc 1 1211 83 view .LVU2505
 9123 05e0 488D7801 		lea	rdi, 1[rax]	# _223,
 9124              	.LVL739:
1212:sieve_extend.c ****     counter_t tuning_results=0;
 9125              		.loc 1 1212 5 is_stmt 1 view .LVU2506
 9126              	# sieve_extend.c:1211:     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_
1211:sieve_extend.c ****     tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_result));
 9127              		.loc 1 1211 194 is_stmt 0 view .LVU2507
 9128 05e4 B8001000 		mov	eax, 4096	# tmp338,
 9128      00
 9129 05e9 48F77424 		div	QWORD PTR 56[rsp]	# %sfp
 9129      38
 9130              	# sieve_extend.c:1212:     tuning_result_type* tuning_result = malloc(max_results * sizeof(tuning_r
1212:sieve_extend.c ****     counter_t tuning_results=0;
 9131              		.loc 1 1212 41 view .LVU2508
 9132 05ee 480FAFC7 		imul	rax, rdi	# tmp343, _223
 9133 05f2 480FAFF8 		imul	rdi, rax	# tmp344, tmp343
 9134              	.LVL740:
1212:sieve_extend.c ****     counter_t tuning_results=0;
 9135              		.loc 1 1212 41 view .LVU2509
 9136 05f6 48C1E708 		sal	rdi, 8	# tmp345,
 9137 05fa E8000000 		call	malloc@PLT	#
 9137      00
 9138              	.LVL741:
1213:sieve_extend.c ****     counter_t tuning_result_index=0;
 9139              		.loc 1 1213 5 is_stmt 1 view .LVU2510
1214:sieve_extend.c ****     
 9140              		.loc 1 1214 5 view .LVU2511
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9141              		.loc 1 1216 5 view .LVU2512
 9142              	.LBB884:
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9143              		.loc 1 1216 10 view .LVU2513
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9144              		.loc 1 1216 42 view .LVU2514
 9145 05ff 48894424 		mov	QWORD PTR 16[rsp], rax	# %sfp, tuning_result
 9145      10
 9146              	.LBE884:
 9147              	# sieve_extend.c:1178:     counter_t best_mediumstep_faster = 0;
1178:sieve_extend.c ****     counter_t smallstep_faster_steps = 4;
 9148              		.loc 1 1178 15 is_stmt 0 view .LVU2515
 9149 0604 48C74424 		mov	QWORD PTR 40[rsp], 0	# %sfp,
 9149      28000000 
 9149      00
 9150              	# sieve_extend.c:1177:     counter_t best_smallstep_faster = 0;
1177:sieve_extend.c ****     counter_t best_mediumstep_faster = 0;
 9151              		.loc 1 1177 15 view .LVU2516
 9152 060d 48C74424 		mov	QWORD PTR 32[rsp], 0	# %sfp,
 9152      20000000 
 9152      00
 9153              	# sieve_extend.c:1176:     best_blocksize_bits = 0;
1176:sieve_extend.c ****     counter_t best_smallstep_faster = 0;
 9154              		.loc 1 1176 25 view .LVU2517
 9155 0616 48C74424 		mov	QWORD PTR 24[rsp], 0	# %sfp,
GAS LISTING /tmp/ccrNbbzt.s 			page 248


 9155      18000000 
 9155      00
 9156              	# sieve_extend.c:1175:     double best_avg = 0;
1175:sieve_extend.c ****     best_blocksize_bits = 0;
 9157              		.loc 1 1175 12 view .LVU2518
 9158 061f C5C157FF 		vxorpd	xmm7, xmm7, xmm7	# best_avg
 9159 0623 C5FB113C 		vmovsd	QWORD PTR [rsp], xmm7	# %sfp, best_avg
 9159      24
 9160              	.LVL742:
 9161              	.L598:
 9162              	.LBB885:
 9163              	.LBB872:
1217:sieve_extend.c ****             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /= 2) {
 9164              		.loc 1 1217 62 is_stmt 1 view .LVU2519
 9165              	.LBB873:
 9166              	# sieve_extend.c:1218:             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /
1218:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
 9167              		.loc 1 1218 28 is_stmt 0 view .LVU2520
 9168 0628 4D89EC   		mov	r12, r13	# mediumstep_faster, smallstep_faster
 9169              	.LVL743:
 9170 062b 0F1F4400 		.p2align 4,,10
 9170      00
 9171              		.p2align 3
 9172              	.L608:
1218:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
 9173              		.loc 1 1218 46 is_stmt 1 view .LVU2521
 9174              	.LBB874:
 9175              	# sieve_extend.c:1219:                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_li
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9176              		.loc 1 1219 32 is_stmt 0 view .LVU2522
 9177 0630 C7442454 		mov	DWORD PTR 84[rsp], 6	# %sfp,
 9177      06000000 
 9178              	.LBE874:
 9179              	# sieve_extend.c:1218:             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /
1218:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
 9180              		.loc 1 1218 28 view .LVU2523
 9181 0638 48C74424 		mov	QWORD PTR 8[rsp], 256	# %sfp,
 9181      08000100 
 9181      00
 9182              	.LVL744:
 9183              		.p2align 4,,10
 9184 0641 0F1F8000 		.p2align 3
 9184      000000
 9185              	.L606:
 9186              	.LBB883:
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9187              		.loc 1 1219 45 is_stmt 1 view .LVU2524
 9188 0648 4D6BD658 		imul	r10, r14, 88	# tmp360, tuning_results,
 9189              	# sieve_extend.c:1219:                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_li
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9190              		.loc 1 1219 130 is_stmt 0 view .LVU2525
 9191 064c 488B5C24 		mov	rbx, QWORD PTR 8[rsp]	# ivtmp.759, %sfp
 9191      08
 9192 0651 488B4424 		mov	rax, QWORD PTR 16[rsp]	# tuning_result, %sfp
 9192      10
 9193 0656 48C1E30D 		sal	rbx, 13	# ivtmp.759,
 9194 065a 4E8D3C10 		lea	r15, [rax+r10]	# ivtmp.758,
GAS LISTING /tmp/ccrNbbzt.s 			page 249


 9195              	# sieve_extend.c:1219:                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_li
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9196              		.loc 1 1219 32 view .LVU2526
 9197 065e 31ED     		xor	ebp, ebp	# free_bits
 9198 0660 EB41     		jmp	.L604	#
 9199              	.LVL745:
 9200              		.p2align 4,,10
 9201 0662 660F1F44 		.p2align 3
 9201      0000
 9202              	.L601:
 9203              	.LBB875:
1235:sieve_extend.c ****                         best_blocksize_bits = blocksize_bits;
 9204              		.loc 1 1235 25 is_stmt 1 view .LVU2527
1236:sieve_extend.c ****                         best_smallstep_faster = smallstep_faster;
 9205              		.loc 1 1236 25 view .LVU2528
1237:sieve_extend.c ****                         best_mediumstep_faster = mediumstep_faster;
 9206              		.loc 1 1237 25 view .LVU2529
1238:sieve_extend.c ****                         if (option_verboselevel >=2) printf(".(>)blocksize_bits %10ju; blocksize %4
 9207              		.loc 1 1238 25 view .LVU2530
1239:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
 9208              		.loc 1 1239 25 view .LVU2531
 9209              	# sieve_extend.c:1239:                         if (option_verboselevel >=2) printf(".(>)blocksize_b
1239:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
 9210              		.loc 1 1239 28 is_stmt 0 view .LVU2532
 9211 0668 837C2450 		cmp	DWORD PTR 80[rsp], 1	# %sfp,
 9211      01
 9212 066d 0F8FE500 		jg	.L671	#,
 9212      0000
1239:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
 9213              		.loc 1 1239 28 view .LVU2533
 9214 0673 4C896424 		mov	QWORD PTR 40[rsp], r12	# %sfp, mediumstep_faster
 9214      28
 9215 0678 4C896C24 		mov	QWORD PTR 32[rsp], r13	# %sfp, smallstep_faster
 9215      20
 9216              	# sieve_extend.c:1236:                         best_blocksize_bits = blocksize_bits;
1236:sieve_extend.c ****                         best_smallstep_faster = smallstep_faster;
 9217              		.loc 1 1236 45 view .LVU2534
 9218 067d 48895C24 		mov	QWORD PTR 24[rsp], rbx	# %sfp, ivtmp.759
 9218      18
 9219              	# sieve_extend.c:1235:                         best_avg = tuning_result[tuning_result_index].avg;
1235:sieve_extend.c ****                         best_blocksize_bits = blocksize_bits;
 9220              		.loc 1 1235 34 view .LVU2535
 9221 0682 C5FB1114 		vmovsd	QWORD PTR [rsp], xmm2	# %sfp, _242
 9221      24
 9222              	.LVL746:
 9223              	.L599:
1250:sieve_extend.c ****                 }
 9224              		.loc 1 1250 21 is_stmt 1 view .LVU2536
1250:sieve_extend.c ****                 }
 9225              		.loc 1 1250 21 is_stmt 0 view .LVU2537
 9226              	.LBE875:
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9227              		.loc 1 1219 137 is_stmt 1 view .LVU2538
 9228              	# sieve_extend.c:1219:                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_li
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9229              		.loc 1 1219 147 is_stmt 0 view .LVU2539
 9230 0687 488B4424 		mov	rax, QWORD PTR 56[rsp]	# freebits_steps, %sfp
GAS LISTING /tmp/ccrNbbzt.s 			page 250


 9230      38
 9231 068c 4983C758 		add	r15, 88	# ivtmp.758,
 9232 0690 4801C5   		add	rbp, rax	# free_bits, freebits_steps
 9233              	.LVL747:
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9234              		.loc 1 1219 45 is_stmt 1 view .LVU2540
 9235 0693 4829C3   		sub	rbx, rax	# ivtmp.759, freebits_steps
 9236              	.LVL748:
 9237              	# sieve_extend.c:1219:                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_li
1219:sieve_extend.c ****                     counter_t blocksize_bits = (blocksize_kb * 1024 * 8) - free_bits;
 9238              		.loc 1 1219 17 is_stmt 0 view .LVU2541
 9239 0696 4881FDFF 		cmp	rbp, 4095	# free_bits,
 9239      0F0000
 9240 069d 0F871D01 		ja	.L600	#,
 9240      0000
 9241              	.LVL749:
 9242              	.L604:
 9243              	.LBB882:
1220:sieve_extend.c **** 
 9244              		.loc 1 1220 21 is_stmt 1 view .LVU2542
1223:sieve_extend.c ****                     tuning_result[tuning_result_index].maxints = maxints;
 9245              		.loc 1 1223 21 view .LVU2543
 9246              	# sieve_extend.c:1224:                     tuning_result[tuning_result_index].maxints = maxints;
1224:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_duration = sample_duration;
 9247              		.loc 1 1224 64 is_stmt 0 view .LVU2544
 9248 06a3 488B4424 		mov	rax, QWORD PTR 72[rsp]	# option_maxFactor.42_64, %sfp
 9248      48
 9249              	# sieve_extend.c:1225:                     tuning_result[tuning_result_index].sample_duration = sam
1225:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_max = sample_max;
 9250              		.loc 1 1225 72 view .LVU2545
 9251 06a8 C5FB1064 		vmovsd	xmm4, QWORD PTR 64[rsp]	# sample_duration, %sfp
 9251      2440
 9252              	# sieve_extend.c:1224:                     tuning_result[tuning_result_index].maxints = maxints;
1224:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_duration = sample_duration;
 9253              		.loc 1 1224 64 view .LVU2546
 9254 06ae 498907   		mov	QWORD PTR [r15], rax	# MEM[base: _300, offset: 0B], option_maxFactor.42_64
 9255              	# sieve_extend.c:1226:                     tuning_result[tuning_result_index].sample_max = sample_m
1226:sieve_extend.c ****                     tuning_result[tuning_result_index].blocksize_kb = blocksize_kb;
 9256              		.loc 1 1226 67 view .LVU2547
 9257 06b1 488B4424 		mov	rax, QWORD PTR 48[rsp]	# sample_max, %sfp
 9257      30
 9258              	# sieve_extend.c:1228:                     tuning_result[tuning_result_index].free_bits = free_bits
1228:sieve_extend.c ****                     tuning_result[tuning_result_index].blocksize_bits = blocksize_bits;
 9259              		.loc 1 1228 66 view .LVU2548
 9260 06b6 49896F18 		mov	QWORD PTR 24[r15], rbp	# MEM[base: _300, offset: 24B], free_bits
 9261              	# sieve_extend.c:1226:                     tuning_result[tuning_result_index].sample_max = sample_m
1226:sieve_extend.c ****                     tuning_result[tuning_result_index].blocksize_kb = blocksize_kb;
 9262              		.loc 1 1226 67 view .LVU2549
 9263 06ba 49894730 		mov	QWORD PTR 48[r15], rax	# MEM[base: _300, offset: 48B], sample_max
 9264              	# sieve_extend.c:1227:                     tuning_result[tuning_result_index].blocksize_kb = blocks
1227:sieve_extend.c ****                     tuning_result[tuning_result_index].free_bits = free_bits;
 9265              		.loc 1 1227 69 view .LVU2550
 9266 06be 488B4424 		mov	rax, QWORD PTR 8[rsp]	# blocksize_kb, %sfp
 9266      08
 9267              	# sieve_extend.c:1229:                     tuning_result[tuning_result_index].blocksize_bits = bloc
1229:sieve_extend.c ****                     tuning_result[tuning_result_index].smallstep_faster = smallstep_faster;
 9268              		.loc 1 1229 71 view .LVU2551
GAS LISTING /tmp/ccrNbbzt.s 			page 251


 9269 06c3 49895F08 		mov	QWORD PTR 8[r15], rbx	# MEM[base: _300, offset: 8B], ivtmp.759
 9270              	# sieve_extend.c:1227:                     tuning_result[tuning_result_index].blocksize_kb = blocks
1227:sieve_extend.c ****                     tuning_result[tuning_result_index].free_bits = free_bits;
 9271              		.loc 1 1227 69 view .LVU2552
 9272 06c7 49894710 		mov	QWORD PTR 16[r15], rax	# MEM[base: _300, offset: 16B], blocksize_kb
 9273              	# sieve_extend.c:1230:                     tuning_result[tuning_result_index].smallstep_faster = sm
1230:sieve_extend.c ****                     tuning_result[tuning_result_index].mediumstep_faster = mediumstep_faster;
 9274              		.loc 1 1230 73 view .LVU2553
 9275 06cb 4D896F20 		mov	QWORD PTR 32[r15], r13	# MEM[base: _300, offset: 32B], smallstep_faster
 9276              	# sieve_extend.c:1231:                     tuning_result[tuning_result_index].mediumstep_faster = m
1231:sieve_extend.c ****                     tune_benchmark(tuning_result, tuning_result_index);
 9277              		.loc 1 1231 74 view .LVU2554
 9278 06cf 4D896728 		mov	QWORD PTR 40[r15], r12	# MEM[base: _300, offset: 40B], mediumstep_faster
 9279              	# sieve_extend.c:1232:                     tune_benchmark(tuning_result, tuning_result_index);
1232:sieve_extend.c **** 
 9280              		.loc 1 1232 21 view .LVU2555
 9281 06d3 488B7C24 		mov	rdi, QWORD PTR 16[rsp]	#, %sfp
 9281      10
 9282 06d8 4C89F6   		mov	rsi, r14	# tuning_results, tuning_results
 9283              	# sieve_extend.c:1225:                     tuning_result[tuning_result_index].sample_duration = sam
1225:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_max = sample_max;
 9284              		.loc 1 1225 72 view .LVU2556
 9285 06db C4C17B11 		vmovsd	QWORD PTR 56[r15], xmm4	# MEM[base: _300, offset: 56B], sample_duration
 9285      6738
 9286              	# sieve_extend.c:1232:                     tune_benchmark(tuning_result, tuning_result_index);
1232:sieve_extend.c **** 
 9287              		.loc 1 1232 21 view .LVU2557
 9288 06e1 E8000000 		call	tune_benchmark	#
 9288      00
 9289              	.LVL750:
 9290              	# sieve_extend.c:1234:                     if ( tuning_result[tuning_result_index].avg > best_avg) 
1234:sieve_extend.c ****                         best_avg = tuning_result[tuning_result_index].avg;
 9291              		.loc 1 1234 60 view .LVU2558
 9292 06e6 C4C17B10 		vmovsd	xmm2, QWORD PTR 80[r15]	# _242, MEM[base: _300, offset: 80B]
 9292      5750
 9293              	# sieve_extend.c:1223:                     tuning_results++;
1223:sieve_extend.c ****                     tuning_result[tuning_result_index].maxints = maxints;
 9294              		.loc 1 1223 35 view .LVU2559
 9295 06ec 49FFC6   		inc	r14	# tuning_results
 9296              	.LVL751:
1224:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_duration = sample_duration;
 9297              		.loc 1 1224 21 is_stmt 1 view .LVU2560
1225:sieve_extend.c ****                     tuning_result[tuning_result_index].sample_max = sample_max;
 9298              		.loc 1 1225 21 view .LVU2561
1226:sieve_extend.c ****                     tuning_result[tuning_result_index].blocksize_kb = blocksize_kb;
 9299              		.loc 1 1226 21 view .LVU2562
1227:sieve_extend.c ****                     tuning_result[tuning_result_index].free_bits = free_bits;
 9300              		.loc 1 1227 21 view .LVU2563
1228:sieve_extend.c ****                     tuning_result[tuning_result_index].blocksize_bits = blocksize_bits;
 9301              		.loc 1 1228 21 view .LVU2564
1229:sieve_extend.c ****                     tuning_result[tuning_result_index].smallstep_faster = smallstep_faster;
 9302              		.loc 1 1229 21 view .LVU2565
1230:sieve_extend.c ****                     tuning_result[tuning_result_index].mediumstep_faster = mediumstep_faster;
 9303              		.loc 1 1230 21 view .LVU2566
1231:sieve_extend.c ****                     tune_benchmark(tuning_result, tuning_result_index);
 9304              		.loc 1 1231 21 view .LVU2567
1232:sieve_extend.c **** 
GAS LISTING /tmp/ccrNbbzt.s 			page 252


 9305              		.loc 1 1232 21 view .LVU2568
1234:sieve_extend.c ****                         best_avg = tuning_result[tuning_result_index].avg;
 9306              		.loc 1 1234 21 view .LVU2569
 9307              	# sieve_extend.c:1234:                     if ( tuning_result[tuning_result_index].avg > best_avg) 
1234:sieve_extend.c ****                         best_avg = tuning_result[tuning_result_index].avg;
 9308              		.loc 1 1234 24 is_stmt 0 view .LVU2570
 9309 06ef C5F92F14 		vcomisd	xmm2, QWORD PTR [rsp]	# _242, %sfp
 9309      24
 9310 06f4 0F876EFF 		ja	.L601	#,
 9310      FFFF
 9311              	.L602:
1245:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
 9312              		.loc 1 1245 21 is_stmt 1 view .LVU2571
 9313              	# sieve_extend.c:1245:                     if (option_verboselevel >= 3) printf("...blocksize_bits 
1245:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
 9314              		.loc 1 1245 24 is_stmt 0 view .LVU2572
 9315 06fa 837C2450 		cmp	DWORD PTR 80[rsp], 2	# %sfp,
 9315      02
 9316 06ff 7E86     		jle	.L599	#,
1245:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
 9317              		.loc 1 1245 51 is_stmt 1 view .LVU2573
 9318              	.LVL752:
 9319              	.LBB876:
 9320              	.LBI876:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9321              		.loc 3 105 1 view .LVU2574
 9322              	.LBB877:
 9323              		.loc 3 107 3 view .LVU2575
 9324              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9325              		.loc 3 107 10 is_stmt 0 view .LVU2576
 9326 0701 4883EC08 		sub	rsp, 8	#,
 9327              		.cfi_def_cfa_offset 248
 9328              	.LVL753:
 9329              		.loc 3 107 10 view .LVU2577
 9330 0705 C4C17B10 		vmovsd	xmm0, QWORD PTR 72[r15]	# MEM[base: _300, offset: 72B], MEM[base: _300, offset: 72B]
 9330      4748
 9331 070b 498B4F10 		mov	rcx, QWORD PTR 16[r15]	# MEM[base: _300, offset: 16B], MEM[base: _300, offset: 16B]
 9332 070f 498B5708 		mov	rdx, QWORD PTR 8[r15]	# MEM[base: _300, offset: 8B], MEM[base: _300, offset: 8B]
 9333 0713 41FF7730 		push	QWORD PTR 48[r15]	# MEM[base: _300, offset: 48B]
 9334              		.cfi_def_cfa_offset 256
 9335 0717 C4C17B10 		vmovsd	xmm2, QWORD PTR 80[r15]	#, MEM[base: _300, offset: 80B]
 9335      5750
 9336 071d C4C17B10 		vmovsd	xmm1, QWORD PTR 56[r15]	#, MEM[base: _300, offset: 56B]
 9336      4F38
 9337 0723 41FF7740 		push	QWORD PTR 64[r15]	# MEM[base: _300, offset: 64B]
 9338              		.cfi_def_cfa_offset 264
 9339 0727 488D3500 		lea	rsi, .LC47[rip]	#,
 9339      000000
 9340 072e BF010000 		mov	edi, 1	#,
 9340      00
 9341 0733 41FF7728 		push	QWORD PTR 40[r15]	# MEM[base: _300, offset: 40B]
 9342              		.cfi_def_cfa_offset 272
 9343 0737 B8030000 		mov	eax, 3	#,
 9343      00
 9344 073c 4D8B4F20 		mov	r9, QWORD PTR 32[r15]	#, MEM[base: _300, offset: 32B]
 9345 0740 4D8B4718 		mov	r8, QWORD PTR 24[r15]	#, MEM[base: _300, offset: 24B]
 9346 0744 E8000000 		call	__printf_chk@PLT	#
GAS LISTING /tmp/ccrNbbzt.s 			page 253


 9346      00
 9347              	.LVL754:
 9348 0749 4883C420 		add	rsp, 32	#,
 9349              		.cfi_def_cfa_offset 240
 9350              	.LVL755:
 9351              		.loc 3 107 10 view .LVU2578
 9352 074d E935FFFF 		jmp	.L599	#
 9352      FF
 9353              	.LVL756:
 9354              		.p2align 4,,10
 9355 0752 660F1F44 		.p2align 3
 9355      0000
 9356              	.L671:
 9357              		.loc 3 107 10 view .LVU2579
 9358              	.LBE877:
 9359              	.LBE876:
1239:sieve_extend.c ****                         (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_t)tu
 9360              		.loc 1 1239 54 is_stmt 1 view .LVU2580
 9361              	.LBB878:
 9362              	.LBI878:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9363              		.loc 3 105 1 view .LVU2581
 9364              	.LBB879:
 9365              		.loc 3 107 3 view .LVU2582
 9366              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9367              		.loc 3 107 10 is_stmt 0 view .LVU2583
 9368 0758 4883EC08 		sub	rsp, 8	#,
 9369              		.cfi_def_cfa_offset 248
 9370 075c C4C17B10 		vmovsd	xmm0, QWORD PTR 72[r15]	# MEM[base: _300, offset: 72B], MEM[base: _300, offset: 72B]
 9370      4748
 9371 0762 498B4F10 		mov	rcx, QWORD PTR 16[r15]	# MEM[base: _300, offset: 16B], MEM[base: _300, offset: 16B]
 9372 0766 498B5708 		mov	rdx, QWORD PTR 8[r15]	# MEM[base: _300, offset: 8B], MEM[base: _300, offset: 8B]
 9373 076a 41FF7730 		push	QWORD PTR 48[r15]	# MEM[base: _300, offset: 48B]
 9374              		.cfi_def_cfa_offset 256
 9375 076e C4C17B10 		vmovsd	xmm1, QWORD PTR 56[r15]	#, MEM[base: _300, offset: 56B]
 9375      4F38
 9376 0774 488D3500 		lea	rsi, .LC46[rip]	#,
 9376      000000
 9377 077b 41FF7740 		push	QWORD PTR 64[r15]	# MEM[base: _300, offset: 64B]
 9378              		.cfi_def_cfa_offset 264
 9379 077f BF010000 		mov	edi, 1	#,
 9379      00
 9380 0784 B8030000 		mov	eax, 3	#,
 9380      00
 9381 0789 41FF7728 		push	QWORD PTR 40[r15]	# MEM[base: _300, offset: 40B]
 9382              		.cfi_def_cfa_offset 272
 9383 078d 4D8B4F20 		mov	r9, QWORD PTR 32[r15]	#, MEM[base: _300, offset: 32B]
 9384 0791 4D8B4718 		mov	r8, QWORD PTR 24[r15]	#, MEM[base: _300, offset: 24B]
 9385 0795 C5FB1154 		vmovsd	QWORD PTR 32[rsp], xmm2	# %sfp, _242
 9385      2420
 9386 079b E8000000 		call	__printf_chk@PLT	#
 9386      00
 9387              	.LVL757:
 9388              		.loc 3 107 10 view .LVU2584
 9389 07a0 4C896424 		mov	QWORD PTR 72[rsp], r12	# %sfp, mediumstep_faster
 9389      48
 9390 07a5 4883C420 		add	rsp, 32	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 254


 9391              		.cfi_def_cfa_offset 240
 9392              	.LVL758:
 9393              		.loc 3 107 10 view .LVU2585
 9394 07a9 4C896C24 		mov	QWORD PTR 32[rsp], r13	# %sfp, smallstep_faster
 9394      20
 9395              	.LBE879:
 9396              	.LBE878:
 9397              	# sieve_extend.c:1236:                         best_blocksize_bits = blocksize_bits;
1236:sieve_extend.c ****                         best_smallstep_faster = smallstep_faster;
 9398              		.loc 1 1236 45 view .LVU2586
 9399 07ae 48895C24 		mov	QWORD PTR 24[rsp], rbx	# %sfp, ivtmp.759
 9399      18
 9400              	.LBB881:
 9401              	.LBB880:
 9402              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9403              		.loc 3 107 10 view .LVU2587
 9404 07b3 E942FFFF 		jmp	.L602	#
 9404      FF
 9405              	.LVL759:
 9406 07b8 0F1F8400 		.p2align 4,,10
 9406      00000000 
 9407              		.p2align 3
 9408              	.L600:
 9409              		.loc 3 107 10 view .LVU2588
 9410              	.LBE880:
 9411              	.LBE881:
 9412              	.LBE882:
 9413              	.LBE883:
1218:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
 9414              		.loc 1 1218 63 is_stmt 1 view .LVU2589
1218:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
 9415              		.loc 1 1218 46 view .LVU2590
 9416              	# sieve_extend.c:1218:             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /
1218:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
 9417              		.loc 1 1218 76 is_stmt 0 view .LVU2591
 9418 07c0 48D16C24 		shr	QWORD PTR 8[rsp]	# %sfp
 9418      08
 9419              	.LVL760:
 9420              	# sieve_extend.c:1218:             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /
1218:sieve_extend.c ****                 for (counter_t free_bits=0; (free_bits < (anticiped_cache_line_bytesize*8*4) && (fr
 9421              		.loc 1 1218 13 view .LVU2592
 9422 07c5 FF4C2454 		dec	DWORD PTR 84[rsp]	# %sfp
 9423 07c9 0F8579FE 		jne	.L606	#,
 9423      FFFF
 9424              	.LBE873:
1217:sieve_extend.c ****             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /= 2) {
 9425              		.loc 1 1217 94 is_stmt 1 view .LVU2593
 9426              	# sieve_extend.c:1217:         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_fast
1217:sieve_extend.c ****             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /= 2) {
 9427              		.loc 1 1217 112 is_stmt 0 view .LVU2594
 9428 07cf 4C036424 		add	r12, QWORD PTR 88[rsp]	# mediumstep_faster, %sfp
 9428      58
 9429              	.LVL761:
1217:sieve_extend.c ****             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /= 2) {
 9430              		.loc 1 1217 62 is_stmt 1 view .LVU2595
 9431              	# sieve_extend.c:1217:         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_fast
1217:sieve_extend.c ****             for (counter_t blocksize_kb=256; blocksize_kb>=8; blocksize_kb /= 2) {
GAS LISTING /tmp/ccrNbbzt.s 			page 255


 9432              		.loc 1 1217 9 is_stmt 0 view .LVU2596
 9433 07d4 4983FC40 		cmp	r12, 64	# mediumstep_faster,
 9434 07d8 0F8652FE 		jbe	.L608	#,
 9434      FFFF
 9435              	.LBE872:
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9436              		.loc 1 1216 75 is_stmt 1 view .LVU2597
 9437              	# sieve_extend.c:1216:     for (counter_t smallstep_faster = 0; smallstep_faster <= WORD_SIZE/2; sm
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9438              		.loc 1 1216 92 is_stmt 0 view .LVU2598
 9439 07de 4C036C24 		add	r13, QWORD PTR 88[rsp]	# smallstep_faster, %sfp
 9439      58
 9440              	.LVL762:
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9441              		.loc 1 1216 42 is_stmt 1 view .LVU2599
 9442              	# sieve_extend.c:1216:     for (counter_t smallstep_faster = 0; smallstep_faster <= WORD_SIZE/2; sm
1216:sieve_extend.c ****         for (counter_t mediumstep_faster = smallstep_faster; mediumstep_faster <= WORD_SIZE; medium
 9443              		.loc 1 1216 5 is_stmt 0 view .LVU2600
 9444 07e3 4983FD20 		cmp	r13, 32	# smallstep_faster,
 9445 07e7 0F863BFE 		jbe	.L598	#,
 9445      FFFF
 9446              	.LBE885:
 9447              	# sieve_extend.c:1255:     if (option_verboselevel >= 2) {
1255:sieve_extend.c ****         printf("%ju results. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju\n"
 9448              		.loc 1 1255 8 view .LVU2601
 9449 07ed 837C2450 		cmp	DWORD PTR 80[rsp], 1	# %sfp,
 9449      01
 9450 07f2 4D89F7   		mov	r15, r14	# tuning_results, tuning_results
 9451 07f5 4C8B7424 		mov	r14, QWORD PTR 16[rsp]	# tuning_result, %sfp
 9451      10
 9452              	.LVL763:
1255:sieve_extend.c ****         printf("%ju results. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju\n"
 9453              		.loc 1 1255 5 is_stmt 1 view .LVU2602
 9454              	# sieve_extend.c:1255:     if (option_verboselevel >= 2) {
1255:sieve_extend.c ****         printf("%ju results. Inital best blocksize: %ju; best smallstep %ju; best mediumstep %ju\n"
 9455              		.loc 1 1255 8 is_stmt 0 view .LVU2603
 9456 07fa 7E31     		jle	.L609	#,
1256:sieve_extend.c ****         printf("Best options\n");
 9457              		.loc 1 1256 9 is_stmt 1 view .LVU2604
 9458              	.LVL764:
 9459              	.LBB886:
 9460              	.LBI886:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9461              		.loc 3 105 1 view .LVU2605
 9462              	.LBB887:
 9463              		.loc 3 107 3 view .LVU2606
 9464              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9465              		.loc 3 107 10 is_stmt 0 view .LVU2607
 9466 07fc 4C8B4C24 		mov	r9, QWORD PTR 40[rsp]	#, %sfp
 9466      28
 9467 0801 4C8B4424 		mov	r8, QWORD PTR 32[rsp]	#, %sfp
 9467      20
 9468 0806 488B4C24 		mov	rcx, QWORD PTR 24[rsp]	#, %sfp
 9468      18
 9469 080b BF010000 		mov	edi, 1	#,
 9469      00
 9470 0810 4C89FA   		mov	rdx, r15	#, tuning_results
GAS LISTING /tmp/ccrNbbzt.s 			page 256


 9471 0813 488D3500 		lea	rsi, .LC48[rip]	#,
 9471      000000
 9472 081a 31C0     		xor	eax, eax	#
 9473 081c E8000000 		call	__printf_chk@PLT	#
 9473      00
 9474              	.LVL765:
 9475              		.loc 3 107 10 view .LVU2608
 9476              	.LBE887:
 9477              	.LBE886:
1257:sieve_extend.c ****     }
 9478              		.loc 1 1257 9 is_stmt 1 view .LVU2609
 9479              	.LBB888:
 9480              	.LBI888:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9481              		.loc 3 105 1 view .LVU2610
 9482              	.LBB889:
 9483              		.loc 3 107 3 view .LVU2611
 9484              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9485              		.loc 3 107 10 is_stmt 0 view .LVU2612
 9486 0821 488D3D00 		lea	rdi, .LC49[rip]	#,
 9486      000000
 9487 0828 E8000000 		call	puts@PLT	#
 9487      00
 9488              	.LVL766:
 9489              	.L609:
 9490              		.loc 3 107 10 view .LVU2613
 9491              	.LBE889:
 9492              	.LBE888:
 9493              	.LBB890:
 9494              	# sieve_extend.c:1283:         for (counter_t i=0; i<tuning_results; i++) {
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9495              		.loc 1 1283 24 view .LVU2614
 9496 082d 31DB     		xor	ebx, ebx	# step
 9497              	.LBE890:
 9498              	.LBB891:
 9499              	# sieve_extend.c:1271:                 for (counter_t tuning_result_index=0; tuning_result_index<mi
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9500              		.loc 1 1271 75 view .LVU2615
 9501 082f 48891C24 		mov	QWORD PTR [rsp], rbx	# %sfp, step
 9502              	.LVL767:
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9503              		.loc 1 1271 75 view .LVU2616
 9504 0833 4C8B6C24 		mov	r13, QWORD PTR 48[rsp]	# sample_max, %sfp
 9504      30
 9505              	.LVL768:
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9506              		.loc 1 1271 75 view .LVU2617
 9507 0838 BD0A0000 		mov	ebp, 10	# tmp418,
 9507      00
 9508              	.LVL769:
 9509              	.L614:
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9510              		.loc 1 1271 75 view .LVU2618
 9511              	.LBE891:
1260:sieve_extend.c ****         qsort(tuning_result, (size_t)tuning_results, sizeof(tuning_result_type), compare_tuning_res
 9512              		.loc 1 1260 11 is_stmt 1 view .LVU2619
 9513 083d 4983FF04 		cmp	r15, 4	# tuning_results,
GAS LISTING /tmp/ccrNbbzt.s 			page 257


 9514 0841 0F866801 		jbe	.L672	#,
 9514      0000
1261:sieve_extend.c ****         step++;
 9515              		.loc 1 1261 9 view .LVU2620
 9516 0847 488D0D00 		lea	rcx, compare_tuning_result[rip]	#,
 9516      000000
 9517 084e BA580000 		mov	edx, 88	#,
 9517      00
 9518 0853 4C89FE   		mov	rsi, r15	#, tuning_results
 9519 0856 4C89F7   		mov	rdi, r14	#, tuning_result
 9520 0859 E8000000 		call	qsort@PLT	#
 9520      00
 9521              	.LVL770:
1262:sieve_extend.c ****         if (option_verboselevel >= 2) {
 9522              		.loc 1 1262 9 view .LVU2621
1263:sieve_extend.c ****             tuning_result_index = 0;
 9523              		.loc 1 1263 9 view .LVU2622
 9524              	# sieve_extend.c:1262:         step++;
1262:sieve_extend.c ****         if (option_verboselevel >= 2) {
 9525              		.loc 1 1262 13 is_stmt 0 view .LVU2623
 9526 085e 48FF0424 		inc	QWORD PTR [rsp]	# %sfp
 9527              	.LVL771:
 9528              	# sieve_extend.c:1263:         if (option_verboselevel >= 2) {
1263:sieve_extend.c ****             tuning_result_index = 0;
 9529              		.loc 1 1263 12 view .LVU2624
 9530 0862 837C2450 		cmp	DWORD PTR 80[rsp], 1	# %sfp,
 9530      01
 9531 0867 7F2B     		jg	.L610	#,
 9532              	.L612:
1281:sieve_extend.c **** 
 9533              		.loc 1 1281 9 is_stmt 1 view .LVU2625
 9534              	# sieve_extend.c:1281:         tuning_results = tuning_results / 2;
1281:sieve_extend.c **** 
 9535              		.loc 1 1281 24 is_stmt 0 view .LVU2626
 9536 0869 49D1EF   		shr	r15	# tuning_results
 9537              	.LVL772:
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9538              		.loc 1 1283 9 is_stmt 1 view .LVU2627
 9539              	.LBB896:
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9540              		.loc 1 1283 14 view .LVU2628
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9541              		.loc 1 1283 29 view .LVU2629
 9542 086c 498D5E30 		lea	rbx, 48[r14]	# ivtmp.740,
 9543              	# sieve_extend.c:1283:         for (counter_t i=0; i<tuning_results; i++) {
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9544              		.loc 1 1283 24 is_stmt 0 view .LVU2630
 9545 0870 4531E4   		xor	r12d, r12d	# i
 9546              	.LVL773:
 9547              		.p2align 4,,10
 9548 0873 0F1F4400 		.p2align 3
 9548      00
 9549              	.L611:
1284:sieve_extend.c ****             tuning_result[i].sample_max += sample_max;
 9550              		.loc 1 1284 13 is_stmt 1 view .LVU2631
 9551 0878 4C89E6   		mov	rsi, r12	#, i
 9552 087b 4C89F7   		mov	rdi, r14	#, tuning_result
GAS LISTING /tmp/ccrNbbzt.s 			page 258


 9553              	# sieve_extend.c:1283:         for (counter_t i=0; i<tuning_results; i++) {
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9554              		.loc 1 1283 48 is_stmt 0 view .LVU2632
 9555 087e 49FFC4   		inc	r12	# i
 9556              	.LVL774:
 9557              	# sieve_extend.c:1284:             tune_benchmark(tuning_result, i);
1284:sieve_extend.c ****             tuning_result[i].sample_max += sample_max;
 9558              		.loc 1 1284 13 view .LVU2633
 9559 0881 E8000000 		call	tune_benchmark	#
 9559      00
 9560              	.LVL775:
1285:sieve_extend.c ****         }
 9561              		.loc 1 1285 13 is_stmt 1 view .LVU2634
 9562              	# sieve_extend.c:1285:             tuning_result[i].sample_max += sample_max;
1285:sieve_extend.c ****         }
 9563              		.loc 1 1285 41 is_stmt 0 view .LVU2635
 9564 0886 4C012B   		add	QWORD PTR [rbx], r13	# MEM[base: _77, offset: 0B], sample_max
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9565              		.loc 1 1283 47 is_stmt 1 view .LVU2636
 9566              	.LVL776:
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9567              		.loc 1 1283 29 view .LVU2637
 9568 0889 4883C358 		add	rbx, 88	# ivtmp.740,
 9569              	# sieve_extend.c:1283:         for (counter_t i=0; i<tuning_results; i++) {
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9570              		.loc 1 1283 9 is_stmt 0 view .LVU2638
 9571 088d 4D39E7   		cmp	r15, r12	# tuning_results, i
 9572 0890 75E6     		jne	.L611	#,
 9573 0892 EBA9     		jmp	.L614	#
 9574              	.LVL777:
 9575              	.L610:
1283:sieve_extend.c ****             tune_benchmark(tuning_result, i);
 9576              		.loc 1 1283 9 view .LVU2639
 9577              	.LBE896:
1264:sieve_extend.c ****             printf("(%ju) blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %2ju; 
 9578              		.loc 1 1264 13 is_stmt 1 view .LVU2640
1265:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_
 9579              		.loc 1 1265 13 view .LVU2641
 9580              	.LBB897:
 9581              	.LBI897:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9582              		.loc 3 105 1 view .LVU2642
 9583              	.LBB898:
 9584              		.loc 3 107 3 view .LVU2643
 9585              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9586              		.loc 3 107 10 is_stmt 0 view .LVU2644
 9587 0894 C4C17B10 		vmovsd	xmm0, QWORD PTR 72[r14]	# tuning_result_229->elapsed_time, tuning_result_229->elapsed_time
 9587      4648
 9588 089a 498B4E08 		mov	rcx, QWORD PTR 8[r14]	# tuning_result_229->blocksize_bits, tuning_result_229->blocksize_bits
 9589 089e 41FF7630 		push	QWORD PTR 48[r14]	# tuning_result_229->sample_max
 9590              		.cfi_def_cfa_offset 248
 9591 08a2 C4C17B10 		vmovsd	xmm2, QWORD PTR 80[r14]	#, tuning_result_229->avg
 9591      5650
 9592 08a8 C4C17B10 		vmovsd	xmm1, QWORD PTR 56[r14]	#, tuning_result_229->sample_duration
 9592      4E38
 9593 08ae 41FF7640 		push	QWORD PTR 64[r14]	# tuning_result_229->passes
 9594              		.cfi_def_cfa_offset 256
GAS LISTING /tmp/ccrNbbzt.s 			page 259


 9595 08b2 488D3500 		lea	rsi, .LC50[rip]	#,
 9595      000000
 9596 08b9 BF010000 		mov	edi, 1	#,
 9596      00
 9597 08be 41FF7628 		push	QWORD PTR 40[r14]	# tuning_result_229->mediumstep_faster
 9598              		.cfi_def_cfa_offset 264
 9599 08c2 B8030000 		mov	eax, 3	#,
 9599      00
 9600 08c7 41FF7620 		push	QWORD PTR 32[r14]	# tuning_result_229->smallstep_faster
 9601              		.cfi_def_cfa_offset 272
 9602 08cb 488B5424 		mov	rdx, QWORD PTR 32[rsp]	#, %sfp
 9602      20
 9603 08d0 4D8B4E18 		mov	r9, QWORD PTR 24[r14]	#, tuning_result_229->free_bits
 9604 08d4 4D8B4610 		mov	r8, QWORD PTR 16[r14]	#, tuning_result_229->blocksize_kb
 9605 08d8 E8000000 		call	__printf_chk@PLT	#
 9605      00
 9606              	.LVL778:
 9607              		.loc 3 107 10 view .LVU2645
 9608              	.LBE898:
 9609              	.LBE897:
1270:sieve_extend.c ****                 for (counter_t tuning_result_index=0; tuning_result_index<min(10,tuning_results); t
 9610              		.loc 1 1270 13 is_stmt 1 view .LVU2646
 9611              	# sieve_extend.c:1270:             if (option_verboselevel >= 3) {
1270:sieve_extend.c ****                 for (counter_t tuning_result_index=0; tuning_result_index<min(10,tuning_results); t
 9612              		.loc 1 1270 16 is_stmt 0 view .LVU2647
 9613 08dd 4883C420 		add	rsp, 32	#,
 9614              		.cfi_def_cfa_offset 240
 9615 08e1 837C2450 		cmp	DWORD PTR 80[rsp], 2	# %sfp,
 9615      02
 9616 08e6 7481     		je	.L612	#,
 9617 08e8 4D8D6608 		lea	r12, 8[r14]	# ivtmp.746,
 9618              	.LBB899:
 9619              	# sieve_extend.c:1271:                 for (counter_t tuning_result_index=0; tuning_result_index<mi
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9620              		.loc 1 1271 32 view .LVU2648
 9621 08ec 31DB     		xor	ebx, ebx	# tuning_result_index
 9622              	.L613:
 9623              	.LVL779:
1272:sieve_extend.c ****                             (uintmax_t)tuning_result[tuning_result_index].blocksize_bits, (uintmax_
 9624              		.loc 1 1272 21 is_stmt 1 view .LVU2649
 9625              	.LBB892:
 9626              	.LBI892:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9627              		.loc 3 105 1 view .LVU2650
 9628              	.LBB893:
 9629              		.loc 3 107 3 view .LVU2651
 9630              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9631              		.loc 3 107 10 is_stmt 0 view .LVU2652
 9632 08ee C4C17B10 		vmovsd	xmm0, QWORD PTR 64[r12]	# MEM[base: _60, offset: 64B], MEM[base: _60, offset: 64B]
 9632      442440
 9633 08f5 498B4C24 		mov	rcx, QWORD PTR 8[r12]	# MEM[base: _60, offset: 8B], MEM[base: _60, offset: 8B]
 9633      08
 9634 08fa 56       		push	rsi	#
 9635              		.cfi_def_cfa_offset 248
 9636 08fb BF010000 		mov	edi, 1	#,
 9636      00
 9637 0900 488D3500 		lea	rsi, .LC47[rip]	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 260


 9637      000000
 9638 0907 41FF7424 		push	QWORD PTR 40[r12]	# MEM[base: _60, offset: 40B]
 9638      28
 9639              		.cfi_def_cfa_offset 256
 9640 090c C4C17B10 		vmovsd	xmm2, QWORD PTR 72[r12]	#, MEM[base: _60, offset: 72B]
 9640      542448
 9641 0913 C4C17B10 		vmovsd	xmm1, QWORD PTR 48[r12]	#, MEM[base: _60, offset: 48B]
 9641      4C2430
 9642 091a 41FF7424 		push	QWORD PTR 56[r12]	# MEM[base: _60, offset: 56B]
 9642      38
 9643              		.cfi_def_cfa_offset 264
 9644 091f B8030000 		mov	eax, 3	#,
 9644      00
 9645              	.LBE893:
 9646              	.LBE892:
 9647              	# sieve_extend.c:1271:                 for (counter_t tuning_result_index=0; tuning_result_index<mi
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9648              		.loc 1 1271 118 view .LVU2653
 9649 0924 48FFC3   		inc	rbx	# tuning_result_index
 9650              	.LVL780:
 9651              	.LBB895:
 9652              	.LBB894:
 9653              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9654              		.loc 3 107 10 view .LVU2654
 9655 0927 41FF7424 		push	QWORD PTR 32[r12]	# MEM[base: _60, offset: 32B]
 9655      20
 9656              		.cfi_def_cfa_offset 272
 9657 092c 4983C458 		add	r12, 88	# ivtmp.746,
 9658 0930 4D8B4C24 		mov	r9, QWORD PTR -64[r12]	#, MEM[base: _60, offset: 24B]
 9658      C0
 9659 0935 4D8B4424 		mov	r8, QWORD PTR -72[r12]	#, MEM[base: _60, offset: 16B]
 9659      B8
 9660 093a 498B5424 		mov	rdx, QWORD PTR -88[r12]	#, MEM[base: _60, offset: 0B]
 9660      A8
 9661 093f E8000000 		call	__printf_chk@PLT	#
 9661      00
 9662              	.LVL781:
 9663              		.loc 3 107 10 view .LVU2655
 9664              	.LBE894:
 9665              	.LBE895:
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9666              		.loc 1 1271 99 is_stmt 1 view .LVU2656
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9667              		.loc 1 1271 55 view .LVU2657
 9668              	# sieve_extend.c:1271:                 for (counter_t tuning_result_index=0; tuning_result_index<mi
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9669              		.loc 1 1271 75 is_stmt 0 view .LVU2658
 9670 0944 4883C420 		add	rsp, 32	#,
 9671              		.cfi_def_cfa_offset 240
 9672 0948 4889E8   		mov	rax, rbp	# tmp373, tmp418
 9673 094b 4983FF0A 		cmp	r15, 10	# tuning_results,
 9674 094f 490F46C7 		cmovbe	rax, r15	# tuning_results,, tmp373
 9675              	# sieve_extend.c:1271:                 for (counter_t tuning_result_index=0; tuning_result_index<mi
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9676              		.loc 1 1271 17 view .LVU2659
 9677 0953 4839C3   		cmp	rbx, rax	# tuning_result_index, tmp373
 9678 0956 7296     		jb	.L613	#,
GAS LISTING /tmp/ccrNbbzt.s 			page 261


 9679 0958 E90CFFFF 		jmp	.L612	#
 9679      FF
 9680              	.LVL782:
 9681              	.L666:
1271:sieve_extend.c ****                     printf("...blocksize_bits %10ju; blocksize %4jukb; free_bits %5ju; smallstep: %
 9682              		.loc 1 1271 17 view .LVU2660
 9683              	.LBE899:
 9684              	.LBE870:
 9685              	.LBE869:
 9686              	.LBE868:
1373:sieve_extend.c ****     }
 9687              		.loc 1 1373 39 is_stmt 1 view .LVU2661
 9688              	.LBB912:
 9689              	.LBI912:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9690              		.loc 3 105 1 view .LVU2662
 9691              	.LBB913:
 9692              		.loc 3 107 3 view .LVU2663
 9693              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9694              		.loc 3 107 10 is_stmt 0 view .LVU2664
 9695 095d 488D3D00 		lea	rdi, .LC44[rip]	#,
 9695      000000
 9696 0964 E8000000 		call	puts@PLT	#
 9696      00
 9697              	.LVL783:
 9698              		.loc 3 107 10 view .LVU2665
 9699              	.LBE913:
 9700              	.LBE912:
1376:sieve_extend.c ****     if (option_tunelevel) {
 9701              		.loc 1 1376 5 is_stmt 1 view .LVU2666
1377:sieve_extend.c ****         tuning_result_type tuning_result = tune(option_tunelevel, option_maxFactor, option_verbosel
 9702              		.loc 1 1377 5 view .LVU2667
 9703              	# sieve_extend.c:1377:     if (option_tunelevel) {
1377:sieve_extend.c ****         tuning_result_type tuning_result = tune(option_tunelevel, option_maxFactor, option_verbosel
 9704              		.loc 1 1377 9 is_stmt 0 view .LVU2668
 9705 0969 8B44246C 		mov	eax, DWORD PTR 108[rsp]	# option_tunelevel.40_62, option_tunelevel
 9706              	# sieve_extend.c:1376:     counter_t best_blocksize_bits = default_blocksize;
1376:sieve_extend.c ****     if (option_tunelevel) {
 9707              		.loc 1 1376 15 view .LVU2669
 9708 096d 41BC00FC 		mov	r12d, 261120	# best_result$blocksize_bits,
 9708      0300
 9709              	.LVL784:
 9710              	# sieve_extend.c:1377:     if (option_tunelevel) {
1377:sieve_extend.c ****         tuning_result_type tuning_result = tune(option_tunelevel, option_maxFactor, option_verbosel
 9711              		.loc 1 1377 8 view .LVU2670
 9712 0973 85C0     		test	eax, eax	# option_tunelevel.40_62
 9713 0975 0F853B01 		jne	.L673	#,
 9713      0000
 9714              	.LVL785:
 9715              	.L593:
 9716              	.LBB914:
1386:sieve_extend.c ****         counter_t passes = 0;
 9717              		.loc 1 1386 9 is_stmt 1 view .LVU2671
 9718              	# sieve_extend.c:1386:         if (option_verboselevel >= 1) printf("Benchmarking... with blocksize
1386:sieve_extend.c ****         counter_t passes = 0;
 9719              		.loc 1 1386 12 is_stmt 0 view .LVU2672
 9720 097b 837C2468 		cmp	DWORD PTR 104[rsp], 0	# option_verboselevel,
GAS LISTING /tmp/ccrNbbzt.s 			page 262


 9720      00
 9721 0980 0F8E08FA 		jle	.L618	#,
 9721      FFFF
1386:sieve_extend.c ****         counter_t passes = 0;
 9722              		.loc 1 1386 39 is_stmt 1 discriminator 1 view .LVU2673
 9723              	.LVL786:
 9724              	.LBB854:
 9725              	.LBI854:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9726              		.loc 3 105 1 discriminator 1 view .LVU2674
 9727              	.LBB855:
 9728              		.loc 3 107 3 discriminator 1 view .LVU2675
 9729              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9730              		.loc 3 107 10 is_stmt 0 discriminator 1 view .LVU2676
 9731 0986 4C8B0500 		mov	r8, QWORD PTR global_MEDIUMSTEP_FASTER[rip]	#, global_MEDIUMSTEP_FASTER
 9731      000000
 9732 098d 488B0D00 		mov	rcx, QWORD PTR global_SMALLSTEP_FASTER[rip]	#, global_SMALLSTEP_FASTER
 9732      000000
 9733 0994 4C89E2   		mov	rdx, r12	#, best_result$blocksize_bits
 9734 0997 488D3500 		lea	rsi, .LC52[rip]	#,
 9734      000000
 9735 099e BF010000 		mov	edi, 1	#,
 9735      00
 9736 09a3 31C0     		xor	eax, eax	#
 9737 09a5 E8000000 		call	__printf_chk@PLT	#
 9737      00
 9738              	.LVL787:
 9739 09aa E9DFF9FF 		jmp	.L618	#
 9739      FF
 9740              	.LVL788:
 9741              	.L672:
 9742              		.loc 3 107 10 discriminator 1 view .LVU2677
 9743              	.LBE855:
 9744              	.LBE854:
 9745              	.LBE914:
 9746              	.LBB915:
 9747              	.LBB909:
 9748              	.LBB906:
1289:sieve_extend.c ****     if (option_verboselevel >= 1) {
 9749              		.loc 1 1289 5 is_stmt 1 view .LVU2678
 9750              	# sieve_extend.c:1290:     if (option_verboselevel >= 1) {
1290:sieve_extend.c ****         tuning_result_index = 0;
 9751              		.loc 1 1290 8 is_stmt 0 view .LVU2679
 9752 09af 837C2450 		cmp	DWORD PTR 80[rsp], 0	# %sfp,
 9752      00
 9753              	# sieve_extend.c:1289:     tuning_result_type best_result = tuning_result[0];
1289:sieve_extend.c ****     if (option_verboselevel >= 1) {
 9754              		.loc 1 1289 24 view .LVU2680
 9755 09b4 4D8B6608 		mov	r12, QWORD PTR 8[r14]	# best_result$blocksize_bits, MEM[(struct tuning_result_type *)tuning_re
 9756              	.LVL789:
1289:sieve_extend.c ****     if (option_verboselevel >= 1) {
 9757              		.loc 1 1289 24 view .LVU2681
 9758 09b8 498B6E20 		mov	rbp, QWORD PTR 32[r14]	# best_result$smallstep_faster, MEM[(struct tuning_result_type *)tuning
 9759 09bc 498B5E28 		mov	rbx, QWORD PTR 40[r14]	# best_result$mediumstep_faster, MEM[(struct tuning_result_type *)tunin
1290:sieve_extend.c ****         tuning_result_index = 0;
 9760              		.loc 1 1290 5 is_stmt 1 view .LVU2682
 9761              	# sieve_extend.c:1290:     if (option_verboselevel >= 1) {
GAS LISTING /tmp/ccrNbbzt.s 			page 263


1290:sieve_extend.c ****         tuning_result_index = 0;
 9762              		.loc 1 1290 8 is_stmt 0 view .LVU2683
 9763 09c0 7E40     		jle	.L616	#,
1291:sieve_extend.c ****         printf(".Best result: blocksize %4jukb; free_bits %ju; smallstep: %ju; mediumstep %ju; pass
 9764              		.loc 1 1291 9 is_stmt 1 view .LVU2684
 9765              	.LVL790:
1292:sieve_extend.c ****                  (uintmax_t)tuning_result[tuning_result_index].blocksize_kb,(uintmax_t)tuning_resul
 9766              		.loc 1 1292 9 view .LVU2685
 9767              	.LBB900:
 9768              	.LBI900:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9769              		.loc 3 105 1 view .LVU2686
 9770              	.LBB901:
 9771              		.loc 3 107 3 view .LVU2687
 9772              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9773              		.loc 3 107 10 is_stmt 0 view .LVU2688
 9774 09c2 498B5610 		mov	rdx, QWORD PTR 16[r14]	# MEM[(struct tuning_result_type *)tuning_result_229 + 16B], MEM[(struc
 9775 09c6 C4C17B10 		vmovsd	xmm0, QWORD PTR 72[r14]	# MEM[(struct tuning_result_type *)tuning_result_229 + 72B], MEM[(s
 9775      4648
 9776 09cc 498B4E18 		mov	rcx, QWORD PTR 24[r14]	# MEM[(struct tuning_result_type *)tuning_result_229 + 24B], MEM[(struc
 9777 09d0 41FF7630 		push	QWORD PTR 48[r14]	# MEM[(struct tuning_result_type *)tuning_result_229 + 48B]
 9778              		.cfi_def_cfa_offset 248
 9779              	.LVL791:
 9780              		.loc 3 107 10 view .LVU2689
 9781 09d4 4989D9   		mov	r9, rbx	#, best_result$mediumstep_faster
 9782 09d7 4989E8   		mov	r8, rbp	#, best_result$smallstep_faster
 9783 09da 41FF7640 		push	QWORD PTR 64[r14]	# MEM[(struct tuning_result_type *)tuning_result_229 + 64B]
 9784              		.cfi_def_cfa_offset 256
 9785 09de 488D3500 		lea	rsi, .LC51[rip]	#,
 9785      000000
 9786 09e5 BF010000 		mov	edi, 1	#,
 9786      00
 9787 09ea C4C17B10 		vmovsd	xmm2, QWORD PTR 80[r14]	#, MEM[(struct tuning_result_type *)tuning_result_229 + 80B]
 9787      5650
 9788 09f0 C4C17B10 		vmovsd	xmm1, QWORD PTR 56[r14]	#, MEM[(struct tuning_result_type *)tuning_result_229 + 56B]
 9788      4E38
 9789 09f6 B8030000 		mov	eax, 3	#,
 9789      00
 9790 09fb E8000000 		call	__printf_chk@PLT	#
 9790      00
 9791              	.LVL792:
 9792              		.loc 3 107 10 view .LVU2690
 9793 0a00 58       		pop	rax	#
 9794              		.cfi_def_cfa_offset 248
 9795 0a01 5A       		pop	rdx	#
 9796              		.cfi_def_cfa_offset 240
 9797              	.LVL793:
 9798              	.L616:
 9799              		.loc 3 107 10 view .LVU2691
 9800              	.LBE901:
 9801              	.LBE900:
1299:sieve_extend.c ****     return best_result;
 9802              		.loc 1 1299 5 is_stmt 1 view .LVU2692
 9803 0a02 4C89F7   		mov	rdi, r14	#, tuning_result
 9804 0a05 E8000000 		call	free@PLT	#
 9804      00
 9805              	.LVL794:
GAS LISTING /tmp/ccrNbbzt.s 			page 264


1300:sieve_extend.c **** }
 9806              		.loc 1 1300 5 view .LVU2693
1300:sieve_extend.c **** }
 9807              		.loc 1 1300 5 is_stmt 0 view .LVU2694
 9808              	.LBE906:
 9809              	.LBE909:
1379:sieve_extend.c ****         global_MEDIUMSTEP_FASTER = tuning_result.mediumstep_faster;
 9810              		.loc 1 1379 9 is_stmt 1 view .LVU2695
 9811              	# sieve_extend.c:1379:         global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
1379:sieve_extend.c ****         global_MEDIUMSTEP_FASTER = tuning_result.mediumstep_faster;
 9812              		.loc 1 1379 33 is_stmt 0 view .LVU2696
 9813 0a0a 48892D00 		mov	QWORD PTR global_SMALLSTEP_FASTER[rip], rbp	# global_SMALLSTEP_FASTER, best_result$smallstep_f
 9813      000000
1380:sieve_extend.c ****         best_blocksize_bits = tuning_result.blocksize_bits;
 9814              		.loc 1 1380 9 is_stmt 1 view .LVU2697
 9815              	# sieve_extend.c:1380:         global_MEDIUMSTEP_FASTER = tuning_result.mediumstep_faster;
1380:sieve_extend.c ****         best_blocksize_bits = tuning_result.blocksize_bits;
 9816              		.loc 1 1380 34 is_stmt 0 view .LVU2698
 9817 0a11 48891D00 		mov	QWORD PTR global_MEDIUMSTEP_FASTER[rip], rbx	# global_MEDIUMSTEP_FASTER, best_result$mediumste
 9817      000000
1381:sieve_extend.c ****     }
 9818              		.loc 1 1381 9 is_stmt 1 view .LVU2699
 9819              	.LVL795:
1381:sieve_extend.c ****     }
 9820              		.loc 1 1381 9 is_stmt 0 view .LVU2700
 9821              	.LBE915:
1384:sieve_extend.c ****     if (best_blocksize_bits > 0) {
 9822              		.loc 1 1384 5 is_stmt 1 view .LVU2701
1385:sieve_extend.c ****         if (option_verboselevel >= 1) printf("Benchmarking... with blocksize %ju steps: %ju/%ju\n",
 9823              		.loc 1 1385 5 view .LVU2702
 9824              	# sieve_extend.c:1385:     if (best_blocksize_bits > 0) {
1385:sieve_extend.c ****         if (option_verboselevel >= 1) printf("Benchmarking... with blocksize %ju steps: %ju/%ju\n",
 9825              		.loc 1 1385 8 is_stmt 0 view .LVU2703
 9826 0a18 4D85E4   		test	r12, r12	# best_result$blocksize_bits
 9827 0a1b 0F8444FA 		je	.L617	#,
 9827      FFFF
 9828 0a21 E955FFFF 		jmp	.L593	#
 9828      FF
 9829              	.LVL796:
 9830              	.L626:
1385:sieve_extend.c ****         if (option_verboselevel >= 1) printf("Benchmarking... with blocksize %ju steps: %ju/%ju\n",
 9831              		.loc 1 1385 8 view .LVU2704
 9832 0a26 488D1500 		lea	rdx, CSWTCH.111[rip]	# tmp321,
 9832      000000
 9833 0a2d 488B1CC2 		mov	rbx, QWORD PTR [rdx+rax*8]	# smallstep_faster_steps, CSWTCH.111
 9834              	.LVL797:
1385:sieve_extend.c ****         if (option_verboselevel >= 1) printf("Benchmarking... with blocksize %ju steps: %ju/%ju\n",
 9835              		.loc 1 1385 8 view .LVU2705
 9836 0a31 488D1500 		lea	rdx, CSWTCH.112[rip]	# tmp323,
 9836      000000
 9837 0a38 48895C24 		mov	QWORD PTR 88[rsp], rbx	# %sfp, smallstep_faster_steps
 9837      58
 9838 0a3d 488B1CC2 		mov	rbx, QWORD PTR [rdx+rax*8]	# freebits_steps, CSWTCH.112
 9839 0a41 488D1500 		lea	rdx, CSWTCH.113[rip]	# tmp325,
 9839      000000
 9840 0a48 C5FB103C 		vmovsd	xmm7, QWORD PTR [rdx+rax*8]	# sample_duration, CSWTCH.113
 9840      C2
GAS LISTING /tmp/ccrNbbzt.s 			page 265


 9841 0a4d 48895C24 		mov	QWORD PTR 56[rsp], rbx	# %sfp, freebits_steps
 9841      38
 9842              	.LBB916:
 9843              	# sieve_extend.c:1312:     for (int arg=1; arg < argc; arg++) {
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 9844              		.loc 1 1312 14 view .LVU2706
 9845 0a52 48C74424 		mov	QWORD PTR 48[rsp], 4	# %sfp,
 9845      30040000 
 9845      00
 9846 0a5b C5FB117C 		vmovsd	QWORD PTR 64[rsp], xmm7	# %sfp, sample_duration
 9846      2440
 9847              	.L594:
 9848              	.LVL798:
1312:sieve_extend.c ****         if (strcmp(argv[arg], "--help")==0) { usage(argv[0]); }
 9849              		.loc 1 1312 14 view .LVU2707
 9850              	.LBE916:
 9851              	.LBB917:
 9852              	.LBB910:
 9853              	.LBB907:
1210:sieve_extend.c ****     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(W
 9854              		.loc 1 1210 5 is_stmt 1 view .LVU2708
 9855              	# sieve_extend.c:1210:     if (option_verboselevel >= 1) printf("Tuning..."); if (option_verboselev
1210:sieve_extend.c ****     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(W
 9856              		.loc 1 1210 8 is_stmt 0 view .LVU2709
 9857 0a61 8B5C2450 		mov	ebx, DWORD PTR 80[rsp]	# option_verboselevel.41_63, %sfp
 9858 0a65 85DB     		test	ebx, ebx	# option_verboselevel.41_63
 9859 0a67 0F8E5CFB 		jle	.L596	#,
 9859      FFFF
1210:sieve_extend.c ****     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(W
 9860              		.loc 1 1210 35 is_stmt 1 view .LVU2710
 9861              	.LVL799:
 9862              	.LBB902:
 9863              	.LBI902:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9864              		.loc 3 105 1 view .LVU2711
 9865              	.LBB903:
 9866              		.loc 3 107 3 view .LVU2712
 9867              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9868              		.loc 3 107 10 is_stmt 0 view .LVU2713
 9869 0a6d 31C0     		xor	eax, eax	#
 9870 0a6f 488D3500 		lea	rsi, .LC45[rip]	#,
 9870      000000
 9871 0a76 BF010000 		mov	edi, 1	#,
 9871      00
 9872 0a7b E8000000 		call	__printf_chk@PLT	#
 9872      00
 9873              	.LVL800:
 9874              		.loc 3 107 10 view .LVU2714
 9875              	.LBE903:
 9876              	.LBE902:
1210:sieve_extend.c ****     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(W
 9877              		.loc 1 1210 56 is_stmt 1 view .LVU2715
 9878              	# sieve_extend.c:1210:     if (option_verboselevel >= 1) printf("Tuning..."); if (option_verboselev
1210:sieve_extend.c ****     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(W
 9879              		.loc 1 1210 59 is_stmt 0 view .LVU2716
 9880 0a80 89D8     		mov	eax, ebx	# option_verboselevel.41_63, option_verboselevel.41_63
 9881 0a82 FFC8     		dec	eax	# option_verboselevel.41_63
GAS LISTING /tmp/ccrNbbzt.s 			page 266


 9882 0a84 0F843FFB 		je	.L596	#,
 9882      FFFF
1210:sieve_extend.c ****     const size_t max_results = ((size_t)(WORD_SIZE_counter/smallstep_faster_steps)+1) * ((size_t)(W
 9883              		.loc 1 1210 86 is_stmt 1 view .LVU2717
 9884              	.LVL801:
 9885              	.LBB904:
 9886              	.LBI904:
 105:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9887              		.loc 3 105 1 view .LVU2718
 9888              	.LBB905:
 9889              		.loc 3 107 3 view .LVU2719
 9890              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:107:   return __printf_chk (__USE_FORTIFY_LEVEL - 1, 
 9891              		.loc 3 107 10 is_stmt 0 view .LVU2720
 9892 0a8a BF0A0000 		mov	edi, 10	#,
 9892      00
 9893 0a8f E8000000 		call	putchar@PLT	#
 9893      00
 9894              	.LVL802:
 9895 0a94 E930FBFF 		jmp	.L596	#
 9895      FF
 9896              	.LVL803:
 9897              	.L621:
 9898              		.loc 3 107 10 view .LVU2721
 9899              	.LBE905:
 9900              	.LBE904:
 9901              	.LBE907:
 9902              	.LBE910:
 9903              	.LBE917:
 9904              	.LBB918:
 9905              	# sieve_extend.c:1400:         if (option_verboselevel >= 1) printf("Passes - per 5 seconds: %f - p
1400:sieve_extend.c ****     }
 9906              		.loc 1 1400 39 discriminator 1 view .LVU2722
 9907 0a99 4889D8   		mov	rax, rbx	# tmp394, passes
 9908 0a9c 4889DA   		mov	rdx, rbx	# tmp395, passes
 9909 0a9f 48D1E8   		shr	rax	# tmp394
 9910 0aa2 83E201   		and	edx, 1	# tmp395,
 9911 0aa5 4809D0   		or	rax, rdx	# tmp394, tmp395
 9912 0aa8 C4E1E32A 		vcvtsi2sd	xmm1, xmm3, rax	# tmp444, tmp438, tmp394
 9912      C8
 9913 0aad C5F358C9 		vaddsd	xmm1, xmm1, xmm1	# tmp392, tmp393, tmp393
 9914 0ab1 E987FAFF 		jmp	.L622	#
 9914      FF
 9915              	.LVL804:
 9916              	.L673:
1400:sieve_extend.c ****     }
 9917              		.loc 1 1400 39 discriminator 1 view .LVU2723
 9918              	.LBE918:
 9919              	.LBB919:
1378:sieve_extend.c ****         global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
 9920              		.loc 1 1378 9 is_stmt 1 view .LVU2724
 9921              	# sieve_extend.c:1378:         tuning_result_type tuning_result = tune(option_tunelevel, option_max
1378:sieve_extend.c ****         global_SMALLSTEP_FASTER = tuning_result.smallstep_faster;
 9922              		.loc 1 1378 44 is_stmt 0 view .LVU2725
 9923 0ab6 8B5C2468 		mov	ebx, DWORD PTR 104[rsp]	# option_verboselevel.41_63, option_verboselevel
 9924 0aba FFC8     		dec	eax	#
 9925 0abc 895C2450 		mov	DWORD PTR 80[rsp], ebx	# %sfp, option_verboselevel.41_63
 9926 0ac0 488B5C24 		mov	rbx, QWORD PTR 112[rsp]	# option_maxFactor.42_64, option_maxFactor
GAS LISTING /tmp/ccrNbbzt.s 			page 267


 9926      70
 9927 0ac5 48895C24 		mov	QWORD PTR 72[rsp], rbx	# %sfp, option_maxFactor.42_64
 9927      48
 9928              	.LVL805:
 9929              	.LBB911:
1172:sieve_extend.c ****     counter_t best_blocksize_bits = default_blocksize;
 9930              		.loc 1 1172 27 is_stmt 1 view .LVU2726
 9931              	.LBB908:
1173:sieve_extend.c **** 
 9932              		.loc 1 1173 5 view .LVU2727
1175:sieve_extend.c ****     best_blocksize_bits = 0;
 9933              		.loc 1 1175 5 view .LVU2728
1176:sieve_extend.c ****     counter_t best_smallstep_faster = 0;
 9934              		.loc 1 1176 5 view .LVU2729
1177:sieve_extend.c ****     counter_t best_mediumstep_faster = 0;
 9935              		.loc 1 1177 5 view .LVU2730
1178:sieve_extend.c ****     counter_t smallstep_faster_steps = 4;
 9936              		.loc 1 1178 5 view .LVU2731
1179:sieve_extend.c ****     counter_t mediumstep_faster_steps = 4;
 9937              		.loc 1 1179 5 view .LVU2732
1180:sieve_extend.c ****     counter_t freebits_steps = anticiped_cache_line_bytesize;
 9938              		.loc 1 1180 5 view .LVU2733
1181:sieve_extend.c ****     counter_t sample_max = default_sample_max;
 9939              		.loc 1 1181 5 view .LVU2734
1182:sieve_extend.c ****     double sample_duration = default_sample_duration;
 9940              		.loc 1 1182 5 view .LVU2735
1183:sieve_extend.c **** 
 9941              		.loc 1 1183 5 view .LVU2736
1186:sieve_extend.c ****         case 1:
 9942              		.loc 1 1186 5 view .LVU2737
 9943 0aca 83F802   		cmp	eax, 2	# _209,
 9944 0acd 0F8653FF 		jbe	.L626	#,
 9944      FFFF
 9945 0ad3 C5FB103D 		vmovsd	xmm7, QWORD PTR .LC22[rip]	# sample_duration,
 9945      00000000 
 9946 0adb 48C74424 		mov	QWORD PTR 48[rsp], 5	# %sfp,
 9946      30050000 
 9946      00
 9947 0ae4 48C74424 		mov	QWORD PTR 56[rsp], 128	# %sfp,
 9947      38800000 
 9947      00
 9948 0aed 48C74424 		mov	QWORD PTR 88[rsp], 4	# %sfp,
 9948      58040000 
 9948      00
 9949 0af6 C5FB117C 		vmovsd	QWORD PTR 64[rsp], xmm7	# %sfp, sample_duration
 9949      2440
 9950 0afc E960FFFF 		jmp	.L594	#
 9950      FF
 9951              	.LVL806:
 9952              	.L659:
1186:sieve_extend.c ****         case 1:
 9953              		.loc 1 1186 5 is_stmt 0 view .LVU2738
 9954              	.LBE908:
 9955              	.LBE911:
 9956              	.LBE919:
 9957              	.LBB920:
1315:sieve_extend.c ****             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option_verboselevel > 4) {
GAS LISTING /tmp/ccrNbbzt.s 			page 268


 9958              		.loc 1 1315 34 is_stmt 1 discriminator 1 view .LVU2739
 9959              	.LBB797:
 9960              	.LBI797:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9961              		.loc 3 98 1 discriminator 1 view .LVU2740
 9962              	.LBB798:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 9963              		.loc 3 100 3 discriminator 1 view .LVU2741
 9964              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 9965              		.loc 3 100 10 is_stmt 0 discriminator 1 view .LVU2742
 9966 0b01 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 9966      000000
 9967 0b08 BA1B0000 		mov	edx, 27	#,
 9967      00
 9968 0b0d BE010000 		mov	esi, 1	#,
 9968      00
 9969 0b12 488D3D00 		lea	rdi, .LC26[rip]	#,
 9969      000000
 9970 0b19 E8000000 		call	fwrite@PLT	#
 9970      00
 9971              	.LVL807:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 9972              		.loc 3 100 10 discriminator 1 view .LVU2743
 9973              	.LBE798:
 9974              	.LBE797:
1315:sieve_extend.c ****             if (sscanf(argv[arg], "%d", &option_verboselevel) != 1 || option_verboselevel > 4) {
 9975              		.loc 1 1315 83 is_stmt 1 discriminator 1 view .LVU2744
 9976 0b1e E9ADF9FF 		jmp	.L657	#
 9976      FF
 9977              	.L577:
1325:sieve_extend.c ****             }
 9978              		.loc 1 1325 17 view .LVU2745
 9979              	.LVL808:
 9980              	.LBB799:
 9981              	.LBI794:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9982              		.loc 3 98 1 view .LVU2746
 9983              	.LBB796:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 9984              		.loc 3 100 3 view .LVU2747
 9985              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 9986              		.loc 3 100 10 is_stmt 0 view .LVU2748
 9987 0b23 498B0F   		mov	rcx, QWORD PTR [r15]	#, *_29
 9988 0b26 488D1500 		lea	rdx, .LC33[rip]	#,
 9988      000000
 9989 0b2d E98BF9FF 		jmp	.L656	#
 9989      FF
 9990              	.LVL809:
 9991              	.L581:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 9992              		.loc 3 100 10 view .LVU2749
 9993              	.LBE796:
 9994              	.LBE799:
1332:sieve_extend.c ****             }
 9995              		.loc 1 1332 17 is_stmt 1 view .LVU2750
GAS LISTING /tmp/ccrNbbzt.s 			page 269


 9996              	.LBB800:
 9997              	.LBI800:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 9998              		.loc 3 98 1 view .LVU2751
 9999              	.LBB801:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10000              		.loc 3 100 3 view .LVU2752
 10001              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10002              		.loc 3 100 10 is_stmt 0 view .LVU2753
 10003 0b32 498B0F   		mov	rcx, QWORD PTR [r15]	#, *_41
 10004 0b35 488D1500 		lea	rdx, .LC38[rip]	#,
 10004      000000
 10005 0b3c E97CF9FF 		jmp	.L656	#
 10005      FF
 10006              	.LVL810:
 10007              	.L662:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10008              		.loc 3 100 10 view .LVU2754
 10009              	.LBE801:
 10010              	.LBE800:
1323:sieve_extend.c ****             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tunelevel > 4) {
 10011              		.loc 1 1323 34 is_stmt 1 discriminator 1 view .LVU2755
 10012              	.LBB802:
 10013              	.LBI802:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 10014              		.loc 3 98 1 discriminator 1 view .LVU2756
 10015              	.LBB803:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10016              		.loc 3 100 3 discriminator 1 view .LVU2757
 10017              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10018              		.loc 3 100 10 is_stmt 0 discriminator 1 view .LVU2758
 10019 0b41 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 10019      000000
 10020 0b48 488D3D00 		lea	rdi, .LC32[rip]	#,
 10020      000000
 10021 0b4f BA180000 		mov	edx, 24	#,
 10021      00
 10022 0b54 BE010000 		mov	esi, 1	#,
 10022      00
 10023 0b59 E8000000 		call	fwrite@PLT	#
 10023      00
 10024              	.LVL811:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10025              		.loc 3 100 10 discriminator 1 view .LVU2759
 10026              	.LBE803:
 10027              	.LBE802:
1323:sieve_extend.c ****             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tunelevel > 4) {
 10028              		.loc 1 1323 80 is_stmt 1 discriminator 1 view .LVU2760
 10029 0b5e 488B7D00 		mov	rdi, QWORD PTR 0[rbp]	#, *argv_156(D)
 10030 0b62 E8000000 		call	usage	#
 10030      00
 10031              	.LVL812:
 10032              	.L670:
1323:sieve_extend.c ****             if (sscanf(argv[arg], "%d", &option_tunelevel) != 1 || option_tunelevel > 4) {
 10033              		.loc 1 1323 80 is_stmt 0 discriminator 1 view .LVU2761
GAS LISTING /tmp/ccrNbbzt.s 			page 270


 10034              	.LBE920:
 10035              	# sieve_extend.c:1410: }
 10036              		.loc 1 1410 1 view .LVU2762
 10037 0b67 E8000000 		call	__stack_chk_fail@PLT	#
 10037      00
 10038              	.LVL813:
 10039              	.L665:
 10040              	.LBB921:
1330:sieve_extend.c ****             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) != 1 || option_showMaxF
 10041              		.loc 1 1330 34 is_stmt 1 discriminator 1 view .LVU2763
 10042              	.LBB804:
 10043              	.LBI804:
  98:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** {
 10044              		.loc 3 98 1 discriminator 1 view .LVU2764
 10045              	.LBB805:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10046              		.loc 3 100 3 discriminator 1 view .LVU2765
 10047              	# /usr/include/x86_64-linux-gnu/bits/stdio2.h:100:   return __fprintf_chk (__stream, __USE_FORTIFY_
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10048              		.loc 3 100 10 is_stmt 0 discriminator 1 view .LVU2766
 10049 0b6c 488B0D00 		mov	rcx, QWORD PTR stderr[rip]	#, stderr
 10049      000000
 10050 0b73 488D3D00 		lea	rdi, .LC36[rip]	#,
 10050      000000
 10051 0b7a BA1A0000 		mov	edx, 26	#,
 10051      00
 10052 0b7f BE010000 		mov	esi, 1	#,
 10052      00
 10053 0b84 E8000000 		call	fwrite@PLT	#
 10053      00
 10054              	.LVL814:
 100:/usr/include/x86_64-linux-gnu/bits/stdio2.h **** 			__va_arg_pack ());
 10055              		.loc 3 100 10 discriminator 1 view .LVU2767
 10056              	.LBE805:
 10057              	.LBE804:
1330:sieve_extend.c ****             if (sscanf(argv[arg], "%ju", (uintmax_t*)&option_showMaxFactor) != 1 || option_showMaxF
 10058              		.loc 1 1330 82 is_stmt 1 discriminator 1 view .LVU2768
 10059 0b89 488B7D00 		mov	rdi, QWORD PTR 0[rbp]	#, *argv_156(D)
 10060 0b8d E8000000 		call	usage	#
 10060      00
 10061              	.LVL815:
 10062              	.LBE921:
 10063              		.cfi_endproc
 10064              	.LFE85:
 10066              		.section	.rodata
 10067              		.align 16
 10070              	CSWTCH.113:
 10071 0000 9A999999 		.long	2576980378
 10072 0004 9999B93F 		.long	1069128089
 10073 0008 9A999999 		.long	2576980378
 10074 000c 9999C93F 		.long	1070176665
 10075 0010 9A999999 		.long	2576980378
 10076 0014 9999D93F 		.long	1071225241
 10077 0018 00000000 		.align 16
 10077      00000000 
 10080              	CSWTCH.112:
 10081 0020 00080000 		.quad	2048
GAS LISTING /tmp/ccrNbbzt.s 			page 271


 10081      00000000 
 10082 0028 00040000 		.quad	1024
 10082      00000000 
 10083 0030 40000000 		.quad	64
 10083      00000000 
 10084 0038 00000000 		.align 16
 10084      00000000 
 10087              	CSWTCH.111:
 10088 0040 10000000 		.quad	16
 10088      00000000 
 10089 0048 08000000 		.quad	8
 10089      00000000 
 10090 0050 04000000 		.quad	4
 10090      00000000 
 10091              		.globl	debug_hitpoint
 10092              		.bss
 10093              		.align 32
 10096              	debug_hitpoint:
 10097 0000 00000000 		.zero	40
 10097      00000000 
 10097      00000000 
 10097      00000000 
 10097      00000000 
 10098              		.globl	global_MEDIUMSTEP_FASTER
 10099              		.data
 10100              		.align 8
 10103              	global_MEDIUMSTEP_FASTER:
 10104 0000 40000000 		.quad	64
 10104      00000000 
 10105              		.globl	global_SMALLSTEP_FASTER
 10106              		.align 8
 10109              	global_SMALLSTEP_FASTER:
 10110 0008 10000000 		.quad	16
 10110      00000000 
 10111              		.section	.rodata.cst8,"aM",@progbits,8
 10112              		.align 8
 10113              	.LC3:
 10114 0000 00000000 		.long	0
 10115 0004 0000F87F 		.long	2146959360
 10116              		.align 8
 10117              	.LC4:
 10118 0008 95D626E8 		.long	3894859413
 10119 000c 0B2E113E 		.long	1041313291
 10120              		.align 8
 10121              	.LC22:
 10122 0010 9A999999 		.long	2576980378
 10123 0014 9999B93F 		.long	1069128089
 10124              		.align 8
 10125              	.LC53:
 10126 0018 00000000 		.long	0
 10127 001c 00001440 		.long	1075052544
 10128              		.text
 10129              	.Letext0:
 10130              		.file 4 "/usr/lib/gcc/x86_64-linux-gnu/9/include/stddef.h"
 10131              		.file 5 "/usr/include/x86_64-linux-gnu/bits/types.h"
 10132              		.file 6 "/usr/include/x86_64-linux-gnu/bits/types/struct_FILE.h"
 10133              		.file 7 "/usr/include/x86_64-linux-gnu/bits/types/FILE.h"
GAS LISTING /tmp/ccrNbbzt.s 			page 272


 10134              		.file 8 "/usr/include/stdio.h"
 10135              		.file 9 "/usr/include/x86_64-linux-gnu/bits/sys_errlist.h"
 10136              		.file 10 "/usr/include/x86_64-linux-gnu/bits/types/struct_timespec.h"
 10137              		.file 11 "/usr/include/x86_64-linux-gnu/bits/stdint-uintn.h"
 10138              		.file 12 "/usr/include/stdint.h"
 10139              		.file 13 "/usr/include/time.h"
 10140              		.file 14 "/usr/include/math.h"
 10141              		.file 15 "/usr/include/stdlib.h"
 10142              		.file 16 "<built-in>"
 31028              		.section	.note.gnu.property,"a"
 31029              		.align 8
 31030 0000 04000000 		.long	 1f - 0f
 31031 0004 10000000 		.long	 4f - 1f
 31032 0008 05000000 		.long	 5
 31033              	0:
 31034 000c 474E5500 		.string	 "GNU"
 31035              	1:
 31036              		.align 8
 31037 0010 020000C0 		.long	 0xc0000002
 31038 0014 04000000 		.long	 3f - 2f
 31039              	2:
 31040 0018 03000000 		.long	 0x3
 31041              	3:
 31042 001c 00000000 		.align 8
 31043              	4:
GAS LISTING /tmp/ccrNbbzt.s 			page 273


DEFINED SYMBOLS
                            *ABS*:0000000000000000 sieve_extend.c
     /tmp/ccrNbbzt.s:85     .text:0000000000000000 setBitsTrue_largeRange_vector
     /tmp/ccrNbbzt.s:261    .text:00000000000000f0 extendSieve_smallSize
     /tmp/ccrNbbzt.s:512    .text:0000000000000210 extendSieve_shiftright_ivdep
     /tmp/ccrNbbzt.s:1149   .text:0000000000000650 compare_tuning_result
     /tmp/ccrNbbzt.s:1175   .text:0000000000000670 extendSieve_aligned
     /tmp/ccrNbbzt.s:1512   .text:0000000000000850 extendSieve_shiftleft
     /tmp/ccrNbbzt.s:2655   .text:0000000000000f80 show_primes.isra.0
     /tmp/ccrNbbzt.s:2650   .rodata.str1.1:0000000000000006 .LC1
     /tmp/ccrNbbzt.s:2648   .rodata.str1.1:0000000000000000 .LC0
     /tmp/ccrNbbzt.s:2933   .text:0000000000001080 sieve
     /tmp/ccrNbbzt.s:10109  .data:0000000000000008 global_SMALLSTEP_FASTER
     /tmp/ccrNbbzt.s:10103  .data:0000000000000000 global_MEDIUMSTEP_FASTER
     /tmp/ccrNbbzt.s:6341   .text:0000000000001fc0 tune_benchmark
     /tmp/ccrNbbzt.s:10113  .rodata.cst8:0000000000000000 .LC3
     /tmp/ccrNbbzt.s:10117  .rodata.cst8:0000000000000008 .LC4
     /tmp/ccrNbbzt.s:6556   .text:0000000000002100 shiftvec
     /tmp/ccrNbbzt.s:6827   .text:0000000000002240 validatePrimeCount
     /tmp/ccrNbbzt.s:6808   .rodata.str1.8:0000000000000000 .LC5
     /tmp/ccrNbbzt.s:6814   .rodata.str1.1:0000000000000023 .LC7
     /tmp/ccrNbbzt.s:6818   .rodata.str1.8:00000000000000c0 .LC8
     /tmp/ccrNbbzt.s:6811   .rodata.str1.8:0000000000000058 .LC6
     /tmp/ccrNbbzt.s:6821   .rodata.str1.8:00000000000000f8 .LC9
     /tmp/ccrNbbzt.s:7717   .text:00000000000027b0 usage
     /tmp/ccrNbbzt.s:7677   .rodata.str1.8:0000000000000148 .LC10
     /tmp/ccrNbbzt.s:7680   .rodata.str1.1:0000000000000031 .LC11
     /tmp/ccrNbbzt.s:7684   .rodata.str1.8:0000000000000168 .LC12
     /tmp/ccrNbbzt.s:7687   .rodata.str1.8:00000000000001a8 .LC13
     /tmp/ccrNbbzt.s:7690   .rodata.str1.8:00000000000001d8 .LC14
     /tmp/ccrNbbzt.s:7693   .rodata.str1.8:0000000000000220 .LC15
     /tmp/ccrNbbzt.s:7696   .rodata.str1.8:0000000000000250 .LC16
     /tmp/ccrNbbzt.s:7699   .rodata.str1.8:0000000000000290 .LC17
     /tmp/ccrNbbzt.s:7702   .rodata.str1.8:00000000000002d0 .LC18
     /tmp/ccrNbbzt.s:7705   .rodata.str1.8:0000000000000320 .LC19
     /tmp/ccrNbbzt.s:7708   .rodata.str1.8:0000000000000348 .LC20
     /tmp/ccrNbbzt.s:7711   .rodata.str1.8:0000000000000378 .LC21
     /tmp/ccrNbbzt.s:8047   .text.startup:0000000000000000 main
     /tmp/ccrNbbzt.s:7958   .rodata.str1.1:000000000000004a .LC24
     /tmp/ccrNbbzt.s:7960   .rodata.str1.1:0000000000000051 .LC25
     /tmp/ccrNbbzt.s:7964   .rodata.str1.1:0000000000000077 .LC27
     /tmp/ccrNbbzt.s:7971   .rodata.str1.1:000000000000007a .LC29
     /tmp/ccrNbbzt.s:7973   .rodata.str1.1:0000000000000093 .LC30
     /tmp/ccrNbbzt.s:7975   .rodata.str1.1:000000000000009b .LC31
     /tmp/ccrNbbzt.s:7984   .rodata.str1.1:00000000000000bb .LC34
     /tmp/ccrNbbzt.s:8003   .rodata.str1.1:000000000000013a .LC42
     /tmp/ccrNbbzt.s:8001   .rodata.str1.1:0000000000000121 .LC41
     /tmp/ccrNbbzt.s:7986   .rodata.str1.1:00000000000000d1 .LC35
     /tmp/ccrNbbzt.s:7990   .rodata.str1.1:00000000000000f3 .LC37
     /tmp/ccrNbbzt.s:7997   .rodata.str1.1:00000000000000f7 .LC39
     /tmp/ccrNbbzt.s:7999   .rodata.str1.1:0000000000000110 .LC40
     /tmp/ccrNbbzt.s:8005   .rodata.str1.1:000000000000014a .LC43
     /tmp/ccrNbbzt.s:10125  .rodata.cst8:0000000000000018 .LC53
     /tmp/ccrNbbzt.s:8035   .rodata.str1.8:00000000000006c8 .LC54
     /tmp/ccrNbbzt.s:7956   .rodata.str1.1:000000000000003b .LC23
     /tmp/ccrNbbzt.s:7968   .rodata.str1.8:00000000000003b0 .LC28
     /tmp/ccrNbbzt.s:8041   .rodata.str1.1:000000000000017b .LC56
GAS LISTING /tmp/ccrNbbzt.s 			page 274


     /tmp/ccrNbbzt.s:8038   .rodata.str1.8:0000000000000710 .LC55
     /tmp/ccrNbbzt.s:10121  .rodata.cst8:0000000000000010 .LC22
     /tmp/ccrNbbzt.s:8016   .rodata.str1.8:00000000000004a8 .LC47
     /tmp/ccrNbbzt.s:8013   .rodata.str1.8:0000000000000420 .LC46
     /tmp/ccrNbbzt.s:8019   .rodata.str1.8:0000000000000530 .LC48
     /tmp/ccrNbbzt.s:8022   .rodata.str1.1:000000000000016e .LC49
     /tmp/ccrNbbzt.s:8026   .rodata.str1.8:0000000000000588 .LC50
     /tmp/ccrNbbzt.s:8007   .rodata.str1.1:0000000000000151 .LC44
     /tmp/ccrNbbzt.s:8032   .rodata.str1.8:0000000000000690 .LC52
     /tmp/ccrNbbzt.s:8029   .rodata.str1.8:0000000000000618 .LC51
     /tmp/ccrNbbzt.s:10087  .rodata:0000000000000040 CSWTCH.111
     /tmp/ccrNbbzt.s:10080  .rodata:0000000000000020 CSWTCH.112
     /tmp/ccrNbbzt.s:10070  .rodata:0000000000000000 CSWTCH.113
     /tmp/ccrNbbzt.s:8009   .rodata.str1.1:0000000000000164 .LC45
     /tmp/ccrNbbzt.s:7962   .rodata.str1.1:000000000000005b .LC26
     /tmp/ccrNbbzt.s:7981   .rodata.str1.8:00000000000003d8 .LC33
     /tmp/ccrNbbzt.s:7994   .rodata.str1.8:00000000000003f8 .LC38
     /tmp/ccrNbbzt.s:7977   .rodata.str1.1:00000000000000a2 .LC32
     /tmp/ccrNbbzt.s:7988   .rodata.str1.1:00000000000000d8 .LC36
     /tmp/ccrNbbzt.s:10096  .bss:0000000000000000 debug_hitpoint

UNDEFINED SYMBOLS
__stack_chk_fail
_GLOBAL_OFFSET_TABLE_
memcpy
__printf_chk
putchar
aligned_alloc
clock_gettime
free
puts
stderr
__fprintf_chk
fwrite
exit
__isoc99_sscanf
malloc
qsort

/*
JavaScript implementation of Prime Sieve. This solution was formerly known
as PrimeNodeJS, however has been renamed because Node is the runtime, not
the language. Additional changes have been made to allow for running this
benchmark on other runtimes (currently Node, Bun, and Deno).

https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
start with
node --trace-opt --trace-deopt --trace-ic PrimeNode_memcopy.js

Based on:
- contributions including using Deno by Dief Bell
- previous implementation of NodeJS/solution_1 by Frank van Bakel
- Python/solution_2 by ssovest
- MyFirstPython Program (tm) Dave Plummer 8/9/2018

*/

"use strict";

const { assert } = require('console');
const { builtinModules } = require('module');
const config_verbose = false;
const config_strict_checks = false;

let config = {
	sieveSize: 1000000,
	timeLimitSeconds: 5,
	verbose: false,
	runtime: '',
    workers: 1
};
const NOW_UNITS_PER_SECOND =  1000;
const WORD_SIZE = 32;
const monitor_value = -1;
const monitor_value_set = -1;
const monitor_stop = false;
let testing = false;

try
{
	!!Deno;
	config.runtime = "deno";
	config.verbose = Deno.args.includes("verbose");
}
catch
{
	const { performance } = require('perf_hooks');
	const runtimeParts = process.argv[0].split("/");
	config.runtime = runtimeParts[runtimeParts.length - 1];
	config.verbose = process.argv.includes("verbose");
}

function pos_calc(word,index) {
	return (word << 5) + index;
}
function index_calc(value) {
	return value & 31;
}
function detect(pos, word, value) {
	return (pos_calc(word, index_calc(value))  == pos);
}

function inrange(pos,start,end) {
	if (!end) end = start;
	return (pos>=start && pos <= end);
}

function printword(word, description) {
	let row='';
	for(let i=0; i<32; i++) {
		row += (i%8) ? '':' ';
		row += (word & (1<<i))?'1':'.';
	}
	if (description) row += ' - ' + description;
	console.log(row);
}

function testBitArray() {
	let totalresult = true;
	testing = true;

	// for (let destination_stop=0; destination_stop<64; destination_stop++) {
	// 	let mask =  (2 << ((destination_stop&31))) - 1;
	// 	printword(mask,`applying mask for ${destination_stop & 31} at destination_stop ${destination_stop} word ${destination_stop>>>5}`);
	// }
	// return false;

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(1,3,6);
		return array.testBitsTrue(1,3,6);
	}('Testing basic functions')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(1);
		array.copyPattern(1,2,3);
		if (!array.testBitsTrue(1,2,3)) { dump_bitarray(array,0,16); return false }
		console.log(msg,'ok'); return true;
	}('Testing Small pattern0')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(15,16,20,25,29);
		array.copyPattern(15,30,31);
		if (!array.testBitsTrue(15,16,20,25,29,30,31)) { dump_bitarray(array,0,63); return false }
		console.log(msg,'ok'); return true;
	}('Testing destination smaller than source in first word')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(1);
		array.copyPattern(1,3,10);
		if (!array.testBitsTrue(1,3,5,7,9)) { dump_bitarray(array,0,16); return false }
		console.log(msg,'ok'); return true;
	}('Testing Small pattern1')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(1,3);
		array.copyPattern(1,4,20);
		if (!array.testBitsTrue(1,3,4,6,7,9,10,12,13,15,16,18,19)) { dump_bitarray(array,0,32); return false }
		console.log(msg,'ok'); return true;
	}('Testing Small pattern2')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(4,7,10,12,13,16,17,19,22,25,27,28);
		array.copyPattern(15,30,100);
		if (!array.testBitsTrue(4,7,10,12,13,16,17,19,22,25,27,28,
			31,32,34,37,40,42,43,46,47,49,52,55,57,58,61,62,64,
			67,70,72,73,76,77,79,82,85,87,88,91,92,94,97,100
			)) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing Small pattern3')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(5);
		array.copyPattern(1,6,95);
		if (!array.testBitsTrue(5,10,15,20,25,30,  35,40,45,50,55,60,65,70,75,80,85,90,95
		)) { dump_bitarray(array,0,16); return false }
		console.log(msg,'ok'); return true;
	}('Testing Small pattern4')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(1,2,3,4,5,7,8,10);
		array.copyPattern(8,11,38);
		if (!array.testBitsTrue(1,2,3,4,5,7,8,10,11,13,14,16,17,19,20,22,23,25,26,28,29,31,
			32,34,35,37,38
			)) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing Small pattern4')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(4,7,10,12,13,16);
		array.copyPattern(16,17,22);
		if (!array.testBitsTrue(4,7,10,12,13,16,17,18,19,20,21,22)) { dump_bitarray(array,0,16); return false }
		console.log(msg,'ok'); return true;
	}('Testing Small pattern5')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(30);
		array.copyPattern(30,32,110);
		if (!array.testBitsTrue(30,32,34,36,38,40,42,44,46,48,
								50,52,54,56,58,60,62,64,66,68,
								70,72,74,76,78,80,82,84,86,88,
								90,92,94,96,98,100,102,104,106,108,110
								)) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern at end of word with large destination')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(30,32);
		array.copyPattern(30,33,40);
		if (!array.testBitsTrue(30,32,33,35,36,38,39)) { dump_bitarray(array,0,64); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern small overflow to word 2')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(30,65);
		array.copyPattern(30,66,200);
		if (!array.testBitsTrue(30,65,
				30+1*36,65+1*36,
				30+2*36,65+2*36,
				30+3*36,65+3*36,
				30+4*36
		)) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern large overflow to word 2')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(30,32,35,63,65);
		array.copyPattern(30,66,200);
		if (!array.testBitsTrue(30,32,35,63,65,
								30+1*36,32+1*36,35+1*36,63+1*36,65+1*36,
								30+2*36,32+2*36,35+2*36,63+2*36,65+2*36,
								30+3*36,32+3*36,35+3*36,63+3*36,65+3*36,
								30+4*36,32+4*36,35+4*36
								   )) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern overflowing to word 2')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(0,2,5,33,35);
		array.copyPattern(0,36,200);
		if (!array.testBitsTrue(0,2,5,33,35,
								0+1*36,2+1*36,5+1*36,33+1*36,35+1*36,
								0+2*36,2+2*36,5+2*36,33+2*36,35+2*36,
								0+3*36,2+3*36,5+3*36,33+3*36,35+3*36,
								0+4*36,2+4*36,5+4*36,33+4*36,35+4*36,
								0+5*36,2+5*36,5+5*36
								)) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern from start word 1')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29, 30,32,35,63,65);
		array.copyPattern(30,66,200);
		if (!array.testBitsTrue(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,
								30,32,35,63,65,
								30+1*36,32+1*36,35+1*36,63+1*36,65+1*36,
								30+2*36,32+2*36,35+2*36,63+2*36,65+2*36,
								30+3*36,32+3*36,35+3*36,63+3*36,65+3*36,
								30+4*36,32+4*36,35+4*36
								   )) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern overflowing to word 2 with first word prefilled and pattern starting at word 0 - shift > 0')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue      (0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,24,25,31);
		array.copyPattern(22,62,200);
		if (!array.testBitsTrue(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,24,25,31,
								22+1*40,24+1*40,25+1*40,31+1*40,
								22+2*40,24+2*40,25+2*40,31+2*40,
								22+3*40,24+3*40,25+3*40,31+3*40,
								22+4*40,24+4*40,25+4*40,31+4*40
								   )) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern overflowing to word 2 with first word prefilled and pattern starting at word 0 - shift < 0')
	console.log('-----------------------------------------------------------------------------');

	totalresult = totalresult && function(msg) {
		let array = new bitArray(256);	
		console.log(msg);
		array.setRangeFalse(0,256);
		array.setBitsTrue(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,35);
		array.copyPattern(32,36,50);
		if (!array.testBitsTrue(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,
								32,35,36,39,40,43,44,47,48
								   )) { dump_bitarray(array,0,256); return false }
		console.log(msg,'ok'); return true;
	}('Testing pattern overflowing to word 2 with first word prefilled and pattern starting at word 1')

	console.log();
	console.log();
	console.log('-----------------------------------------------------------------------------');
	console.log('Testing done... Next stage')
	console.log('-----------------------------------------------------------------------------');
	console.log();
	
	testing = false;
//	totalresult = false;
	return totalresult;
}

function dump_bitarray(array, start, end, msg, columns) {
	let startmark = start;
	start-=32;
	while (start%10>0 || start%32>0) start--;
	if (start<0) start =0;
	if (!columns) columns = 32;
	if (!end || end==startmark) end = start + 128;
	if (!msg) msg='';
	while (startmark > start + columns) startmark -= columns;


	let header1='',header2='',header3='';
	for (let col=0; col < columns; col++) {
		let colstr = col.toString();
		header1 += col%8 ? '':' ';
		header2 += col%8 ? '':' ';
		header3 += col%8 ? '':' ';
		header1 += (col%10==0 && col>0) ? colstr.substring(colstr.length-2,colstr.length-1):' ';
		header2 += colstr.substring(colstr.length-1,colstr.length);
		header3 += (start+col == startmark) ? 'x':'-';
	}
	console.log('\n',msg);
	console.log(header1);
	console.log(header2);
	console.log(header3);

	let row='',col=0,rowstart=start;
	for (let index=start;index<=end;index++) {
		row += col%8 ? '':' ';
		row += array.testBitTrue(index) ? '1' : '.';
		col++;

		if (col == columns || index==end) {
			if (index==end) {
				while (col < columns) { row += col%8 ? ' ':'  '; col++; }
			}
			row += ` ${rowstart} - ${index} (${rowstart>>>5} - ${index>>>5})`;
			console.log(row);
			row='';
			col=0;
			rowstart=index+1;
		}
	}
	console.log();
}

function deepAnalyzePrimes(sieve) {
    // console.log("DeepAnalyzing");

    const range_to = sieve.sieveSizeInBits;

    for (let factor = 1, warn_prime = 0, warn_nonprime = 0; factor < range_to; factor++) {
        if (!sieve.bitArray.testBitTrue(factor)) { // is this a prime?
            const q = (Math.sqrt(factor * 2 + 1) | 1) * 2 + 1;

            for (let c = 1; c <= q; c++) {
                if ((factor * 2 + 1) % (c * 2 + 1) == 0 && (c * 2 + 1) != (factor * 2 + 1)) {
                    if (warn_prime++ < 30) {
                        console.log("Number %d (%d) was marked prime, but %d * %d = %d", factor * 2 + 1, factor, c * 2 + 1, (factor * 2 + 1) / (c * 2 + 1), factor * 2 + 1);
                    }
                }
            }
        }
        else {
            const q = (Math.sqrt(factor * 2 + 1) | 1) * 2 + 1;
            let c_factor = 0;

            for (let c = 1; c <= q; c++) {
                if ((factor * 2 + 1) % (c * 2 + 1) == 0 && (c * 2 + 1) != (factor * 2 + 1)) {
                    c_factor++;
                    break;
                }
            }

            if (c_factor == 0) {
                if (warn_nonprime++ < 30) {
                    console.log("Number %d (%d) was marked non-prime, but no factors found. So it is prime", factor * 2 + 1, factor);
                }
            }
        }
    }
}



// 32-bit bitArray for javascript, with only needed functions
// int32, not uint and not 64bit because: javascript uses 32-bit int with bitwise operations
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND
// bigint wont work because irt uses signed
// shifting not with >> but with >>> is for zero fill right shift
class bitArray {
	constructor(size) {
		this.wordArray = new Int32Array(1 + (size >>> 5));
		this.size = size;
	}

	setBitTrue(index) {
		const wordOffset = index >>> 5;  // 1 word = 2ˆ5 = 32 bit, so shift 5, much faster than /32
		const bitOffset = index & 31;  // use & (and) for remainder, faster than modulus of /32
		this.wordArray[wordOffset] |= (1 << bitOffset);
	}

	setBitFalse(index) {
		const wordOffset = index >>> 5;  // 1 word = 2ˆ5 = 32 bit, so shift 5, much faster than /32
		const bitOffset = index & 31;  // use & (and) for remainder, faster than modulus of /32
		this.wordArray[wordOffset] &= ~(1 << bitOffset);
	}

	testBitTrue(index) {
		const wordOffset = index >>> 5;
		const bitOffset = index & 31;
		return this.wordArray[wordOffset] & (1 << bitOffset);  // returning result not as bool for performance
	}

	setBitsTrue(...array) {
		array.forEach(index => this.setBitTrue(index));		
	}

	testBitsTrue(...array) {
		let result = true;
		let counttarget = array.length;
		let count = this.countBitsTrue(0,this.size);

		if (count != counttarget) {
			console.log(`...Should contain ${counttarget} bits, but contains ${count} bits` );
			result = false;
		}
		for (let index=0; index<this.size; index++) {
			let state = this.testBitTrue(index) != 0;
			if (state && !array.includes(index)) {
				console.log(`...Should have bit ${index} not set, but state is ${state}`);
				result = false;
			}
			if (!state && array.includes(index)) {
				console.log(`...Should have bit ${index} set, but state is ${state}`);
				result = false;
			}
		}
		return result;
	}

	setRangeFalse(start,stop) {
		for (let index=start; index<=stop; index++) {
			this.setBitFalse(index);
		}
	}

	countBitsTrue(start, stop) {
		let count = 0;
		for (let index=start; index<=stop; index++) {
			if (this.testBitTrue(index)) {
				count++;
			}
		}
		return count;
	}


	testRangeFalse(start, stop) {
		let result = true, msg='',low=stop,high=0,count=0, bits='';
		for (let index=start; index<=stop; index++) {
			if (this.testBitTrue(index)) {
				bits += ` ${index}`;
				result = false;
				if (index > high) high = index;
				if (index < low) low = index;
				count++;
			}
		}
		if (!result) {
			console.log(`range ${start}-${stop} is not clear in ${count} bit(s) - low: ${low} high: ${high}`,bits.substring(0,100));
		}
		return result;
	}

	setBitRangeTrue(range_start, step, range_stop) {

		if (config_verbose) console.log(`\nSetting bits true for range ${range_start}-${range_stop} (${range_start*2+1}-${range_stop*2+1}) with step ${step}`);
		if (inrange(monitor_value_set, range_start, range_stop)) {
			console.log(`\nSetting bits true for range ${range_start}-${range_stop} (${range_start*2+1}-${range_stop*2+1}) with step ${step}`);
		}

		if (config_strict_checks) {
			if (!this.testRangeFalse(range_stop+1,this.size)) {
				console.log(`alredy written beyond ${range_start}-${range_stop} - don't blame setbits`);
				return false;
			}
			else { console.log(`range ${range_stop+1}-${this.size} looks good before setbits ${range_start}-${range_stop}`); }
		}

		if (step > WORD_SIZE/2) { 
			// steps are large: check if the range is large enough to reuse the same mask
			let range_stop_unique = range_start + 32 * step;
			if (range_stop_unique > range_stop) {
				// range is not large enough for repetition (32 * step)
				if (inrange(monitor_value_set, range_start, range_stop)) {
					console.log(`Setting individual bits with step ${step} in ${range_start}-${range_stop}`);
				}
				for (let index = range_start; index <= range_stop; index += step) {
					this.setBitTrue(index);

					if (inrange(monitor_value_set, range_start, range_stop)) {
						console.log(`Setting ${index} with ${range_start} ${range_stop}`);
					}
				}
				return;
			}
			// range is large enough to reuse the mask
			let range_stop_word = range_stop >>> 5;
			let range_stop_bit = range_stop & 31;
			if (inrange(monitor_value_set, range_start, range_stop)) {
				dump_bitarray(this,monitor_value_set,monitor_value_set, `Before Setting points in ${range_start}-${range_stop} with reused mask for step ${step}`);
			}
	
			for (let index = range_start; index <= range_stop; index += step) {
				let wordOffset = index >>> 5;
				const bitOffset = index & 31;
				const mask = (1 << bitOffset);

				if (inrange(monitor_value_set, range_start, range_stop)) {
					console.log(`processing ${index}`);
				}
	
				let loop_stop_word = range_stop_word + (bitOffset < range_stop_bit) ? 1 : 0; // alloow range_stop_word to be set if bitoffset is small enough
				do {
					this.wordArray[wordOffset] |= mask;
					wordOffset += step; // pattern repeats on word level after {step} words
				} while (wordOffset < loop_stop_word);
			}

			if (inrange(monitor_value_set, range_start, range_stop)) {
				dump_bitarray(this,monitor_value_set,monitor_value_set, `After Setting points in ${range_start}-${range_stop} with reused mask for step ${step}`);
			}

			if (config_strict_checks) {
				if (!this.testRangeFalse(range_stop+1,this.size)) {
					console.log(`written beyond ${range_start}-${range_stop} with huge step ${step}`);
					return false;
				}
				else { console.log(`range ${range_start}-${range_stop} with step ${step} looks good`); }
			}
	
			return;
		}

		// optimized for small sizes: set wordvalue multiple times before committing to memory
		let index = range_start;
		let wordOffset = index >>> 5;  // 1 word = 2ˆ5 = 32 bit, so shift 5, much faster than /32
		let newwordOffset = wordOffset;
		let wordValue = this.wordArray[wordOffset];

		if (inrange(monitor_value_set, range_start, range_stop)) {
			console.log(`Setting bits in groups with step ${step} in ${range_start}-${range_stop}`);
		}

		while (index <= range_stop) { // TODO: check if this should be <=
			const bitOffset = index & 31;  // use & (and) for remainder, faster than modulus of /32
			wordValue |= (1 << bitOffset);

			if (inrange(wordOffset,monitor_value_set>>>5)) {
				printword(wordValue,`added ${bitOffset} to word value`);
			}
	
			index += step;
			newwordOffset = index >>> 5;  // 1 word = 2ˆ5 = 32 bit, so shift 5, much faster than /32
			if (newwordOffset != wordOffset) { // moving to new word: store value and get new value
				this.wordArray[wordOffset] = wordValue;

				if (inrange(wordOffset,monitor_value_set>>>5)) {
					printword(wordValue,`written to ${wordOffset} and moving to next word`);
				}
	
				wordOffset = newwordOffset;
				wordValue = this.wordArray[wordOffset];
			}
		}

		if (newwordOffset == wordOffset) {
			this.wordArray[wordOffset] = wordValue; // make sure last value is stored
			if (inrange(wordOffset,monitor_value_set>>>5)) {
				printword(wordValue,`written to ${wordOffset} when finishing`);
			}

		}

		if (inrange(wordOffset,monitor_value_set>>>5)) {
//			dump_bitarray(this, monitor_value_set,monitor_value_set,`Following finish of SetBitRangeTrue ${range_start}-${range_stop} step ${step} word ${wordOffset} (bitstart: ${wordOffset*32}) `);
		}

		if (config_strict_checks) {
			if (!this.testRangeFalse(range_stop+1,this.size)) {
				console.log(`written beyond ${range_start}-${range_stop} with step ${step}`);
				return false;
			}
			else { console.log(`range ${range_start}-${range_stop} with step ${step} looks good`); }
		}

	}

	searchBitFalse(index) {
	    while (this.testBitTrue(index)) { index++ };  // will stop automatically because bits were 0 filled
		return index;
	}

	// default size in bit
	// assumptions:
	// everything between source_start and destination start should be copied to destination_start and repeated until destination_shop

	copyPattern(source_start_org, destination_start, destination_stop)	{
		let source_start = source_start_org;
		let source_word = source_start >>> 5;
		let source_bit = source_start &31;
		let destination_stop_word = destination_stop >>> 5;

		const size = destination_start - source_start;
		let copy_start = destination_start;

		if (config_verbose) console.log(`CopyPatterns ${source_start_org}-${destination_start}-${destination_stop}`);
		// dump_bitarray(this,0,200);

		if (config_strict_checks) {
			if (destination_start <= source_start) {
				console.log('source start',source_start,'after destination start',destination_start);
				return false;
			}
			if (destination_stop < destination_start) {
				console.log('destination start',destination_start,'after destination stop',destination_stop);
				return false;
			}
			if (source_start > this.sieveSizeInBits) {
				console.log('source start',source_start,'beyond sieve limit',sieveSizeInBits);
				return false;
			}
			if (destination_start > this.sieveSizeInBits) {
				console.log('destination_start',destination_start,'beyond sieve limit',sieveSizeInBits);
				return false;
			}
			if (destination_stop > this.sieveSizeInBits) {
				console.log('destination_stop',destination_start,'beyond sieve limit',sieveSizeInBits);
				return false;
			}
			// if ((destination_stop - destination_start) < size) {
			// 	console.log(`destination range ${destination_start}-${destination_stop} smaller than size ${source_start_org} - ${destination_start}`);
			// 	return false;
			// }
		}

		if (config_strict_checks) {
			if (!this.testRangeFalse(destination_stop+1,this.size)) {
				console.log(`beyond destination is not clear ${destination_stop+1} ${this.size}`);
				return false;
			}
		}

		if (monitor_value != -1) {
			if (inrange(source_start_org>>>5,monitor_value>>>5)) {
				console.log(`CopyPatterns ${source_start_org}-${destination_start}-${destination_stop}`);
				dump_bitarray(this, monitor_value,monitor_value+128,`Following range CopyPatterns ${source_start_org}-${destination_start}-${destination_stop} for monnitor_value ${monitor_value} at first word`);
			}
		}

		// there should be 32/WORD_SIZE bits from the source_start before whole WORDs can be copied
		let copy_start_min = source_start + WORD_SIZE; 

		if (size < WORD_SIZE) {
			let copy_bit = copy_start &31;
			let copy_word = copy_start >>>5;

			let pattern = this.wordArray[source_word] >>> source_bit;
			pattern |= this.wordArray[source_word+1] << (WORD_SIZE-source_bit);
			pattern &= ((2 << size) -1);

			// build the pattern for 1 WORD
			let patternsize = size;
			while (patternsize < WORD_SIZE) {
				pattern |= (pattern << patternsize);
				patternsize += size;
				copy_start += size;
			}
			patternsize -= size; // pattern repeats after [patternsize] bits
			let pattern_shift = WORD_SIZE - patternsize; // the amount a pattern drifts (>>) at each word increment

			if (inrange(copy_word,monitor_value>>>5)) {
				dump_bitarray(this, monitor_value,monitor_value+128,`Following first copyword ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) - at first word for monitor_value ${monitor_value} `);
				printword(this.wordArray[copy_word],`Copyword original value${copy_word} (${copy_word*32})`);
				printword(pattern,`pattern with size ${patternsize} normal shifting ${pattern_shift}`);
				printword(pattern << (copy_bit),`pattern shifted -> ${copy_bit}`);
				printword(this.wordArray[copy_word] | (pattern << copy_bit),`written at word ${copy_word} (bitstart: ${copy_word*32})`);
			}

			this.wordArray[copy_word] |= (pattern << copy_bit); // apply pattern to first word

			// printword(pattern,'pattern');
			// printword(pattern << copy_bit,`pattern shifted -> ${copy_bit}`);
			// printword(this.wordArray[copy_word],'word');
			// printword(this.wordArray[copy_word],`pattern written word 1`);

			let shift = WORD_SIZE - copy_bit; // these bytes were already written in first word

			if (copy_word < destination_stop_word) { // = will be handled as well because increment is after this 
				copy_word++;

				if (inrange(copy_word,monitor_value>>>5)) {
					dump_bitarray(this, monitor_value,monitor_value+128,`Following first copyword ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) - at first word shift ${shift} for monitor_value ${monitor_value} `);
					printword(this.wordArray[copy_word],`Copyword original value${copy_word} (${copy_word*32})`);
					printword(pattern,`pattern with size ${patternsize} normal shifting ${pattern_shift}`);
					printword(pattern >>> shift,`pattern shifted <- ${shift}`);
					printword(pattern << (patternsize-shift),`pattern shifted -> ${patternsize-shift}`);
					printword((pattern << (patternsize-shift)) | (pattern >>> shift),`written at word ${copy_word} (bitstart: ${copy_word*32})`);
				}

				this.wordArray[copy_word] = (pattern << (patternsize-shift)) | (pattern >>> shift);
				shift += pattern_shift; 
				if (shift > WORD_SIZE) shift -= WORD_SIZE; // TODO: check if needed
			}

			// dump_bitarray(this,0,100);
		}

		if (copy_start > destination_stop) {
			let mask =  (2 << ((destination_stop&31))) - 1;
			// printword(mask,`applying mask for ${destination_stop & 31} at destination_stop ${destination_stop} word ${destination_stop>>>5}`);
			this.wordArray[destination_stop>>>5] &= mask; // do not exceed block_range
			if (config_verbose) {
				console.log(`Returning because patterns applied for size ${size} and copy_start ${copy_start} after destination stop ${destination_stop}`);
				dump_bitarray(this,0,100);
			}
			return;
		}

		// if (!this.testRangeFalse(destination_stop+1,this.size)) {
		// 	console.log(`written beyond size at first WORDs`);
		// 	return false;
		// }

		let copy_word = copy_start >>> 5;
		let copy_bit = copy_start &31;
		let shift = source_bit - copy_bit;
		let dest_wordValue = 0;

		if (source_word == copy_word) {
			console.log(`Source word ${source_word} == ${copy_word} for ${source_start} and ${copy_start} shift ${shift}`);
			console.log(`CopyPatterns ${source_start_org}-${destination_start}-${destination_stop}`);

			dump_bitarray(this,source_word*32-WORD_SIZE,source_word*32+WORD_SIZE);
			
			return false;
		}


//		console.log('start',source_start,'dest_start',destination_start,'dest_stop',destination_stop,'size',size, 'size32',size*32);
//		console.log('copy_word',copy_word,'source_word',source_word,'delta',copy_word-source_word,'shift',shift);

		if (config_verbose) console.log(`Copying words from ${source_word} (${source_word*32}) to ${copy_word}-${destination_stop_word} (${copy_word*32}-${destination_stop_word*32+31}) with shift ${shift} (${source_bit}-${copy_bit})`);
		// dump_bitarray(this,0,200);

		if (shift > 0) {
            let shift_flipped = WORD_SIZE-shift;
            dest_wordValue = this.wordArray[source_word] >>> shift;
            dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;
			dest_wordValue &= ~((1<<copy_bit)-1); // because this is the first word, dont copy the extra bits in front of the source

			if (inrange(copy_word,monitor_value>>>5)) {
				dump_bitarray(this, monitor_value,monitor_value+128,`Following first copyword ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) - at first word shift ${shift} for monitor_value ${monitor_value} `);
				printword(this.wordArray[copy_word],`Copyword original value${copy_word} (${copy_word*32})`);
				printword(this.wordArray[source_word],`Copy original value from word ${source_word} (${source_word*32})`);
				printword(this.wordArray[source_word]>>>shift,`shifted value <- ${shift}`);
				printword(this.wordArray[source_word+1],`Copy original value from word ${source_word+1} (${(source_word+1)*32})`);
				printword(this.wordArray[source_word+1]<<shift_flipped,`shifted value -> ${shift_flipped}`);
				printword(~((1<<copy_bit)-1),`pattern to apply ${shift_flipped}`);
				printword(dest_wordValue,`written at word ${copy_word} (bitstart: ${copy_word*32}`);
			}

            this.wordArray[copy_word] |= dest_wordValue; // or the start in to not lose data
			if (this.testBitTrue(monitor_value)) {
				console.log(`Detected ${monitor_value} with shift in o`,shift,destination_stop);
			}

            while (copy_word < destination_stop_word) {
				copy_word++;
                source_word++;
                dest_wordValue = this.wordArray[source_word] >>> shift;
                dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;

				if (inrange(copy_word,monitor_value>>>5)) {
					dump_bitarray(this, monitor_value-64,monitor_value+128,`Following next copyword ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) - at first word shift ${shift} for monitor_value ${monitor_value} `);
					printword(this.wordArray[copy_word],`Copyword original value word ${copy_word} (${copy_word*32})`);
					printword(this.wordArray[source_word],`Copy original value from word ${source_word} (${source_word*32})`);
					printword(this.wordArray[source_word]>>>shift,`shifted value <- ${shift}`);
					printword(this.wordArray[source_word+1],`Copy original value from word ${source_word+1} (${(source_word+1)*32})`);
					printword(this.wordArray[source_word+1]<<shift_flipped,`shifted value -> ${shift_flipped}`);
					printword(dest_wordValue,`written at ${copy_word} (bitstart: ${copy_word*32}`);
				}
	
				this.wordArray[copy_word] = dest_wordValue; 

				if (config_verbose) {
					if (detect(monitor_value, copy_word, dest_wordValue)) {
						console.log(`Detected ${monitor_value} with shift`,shift,destination_stop);
					}
				}
			}

			this.wordArray[copy_word] &= (2 << ((destination_stop&31))) - 1; // do not exceed block_range

			if (config_strict_checks) {
				if (!this.testRangeFalse(destination_stop+1,this.size)) {
					console.log(`written beyond size with shift ${shift}`);
					return false;
				}
				else { console.log(`range ${destination_stop+1} - ${this.size} looks good`); }
			}

        }
		if (shift < 0) {
            shift = -shift;
            let shift_flipped = WORD_SIZE-shift;

			if (config_verbose) {
				if (source_word * WORD_SIZE < source_start) {
					console.log(`WARNING: Source word ${source_word} (${source_word*WORD_SIZE}) before ${source_start}`);
				}
			}

			dest_wordValue = this.wordArray[source_word] << shift;
			// the first source_word is tricky...
//			let source_lastword = source_word-1;
			let source_lastword = (source_word + size) >>> 5;
            dest_wordValue |= this.wordArray[source_lastword] >>> shift_flipped;
			dest_wordValue &= ~((1<<copy_bit)-1); // because this is the first word, dont copy the extra bits in front of the source

			if (inrange(copy_word,monitor_value>>>5)) {
				dump_bitarray(this, monitor_value-64,monitor_value+128,`Following first copy word ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) - at first word shift ${-shift} for monitor_value ${monitor_value} `);
				printword(this.wordArray[source_word],`Source word ${source_word} (${source_word*32})`);
				printword(this.wordArray[source_word]<<shift,`shifted value -> ${shift}`);
				printword(this.wordArray[source_lastword],`Source value from word ${source_lastword} (${source_lastword*32})`);
				printword(this.wordArray[source_lastword]>>>shift_flipped,`shifted value <- ${shift_flipped}`);
				printword(~((1<<copy_bit)-1),`pattern to apply ${shift_flipped}`);
				printword(this.wordArray[copy_word],`Copyword original value of word${copy_word} (${copy_word*32})`);
				printword(dest_wordValue ,`or at word ${copy_word} (bitstart: ${copy_word*32}`);
				printword(this.wordArray[copy_word] | dest_wordValue ,`result at word ${copy_word} (bitstart: ${copy_word*32}`);
			}
	
            this.wordArray[copy_word] |= dest_wordValue; // or the start in to not lose data

			if (this.testBitTrue(monitor_value)) {
				console.log(`Detected ${monitor_value} with shift in or`,-shift,'source_start',source_start,'destination_start',destination_start,'destination_stop',destination_stop,'copy_word',copy_word,`copy_start ${copy_start} for monitor_value ${monitor_value} `);
				dump_bitarray(this, monitor_value-64,monitor_value+128,`Detected ${monitor_value} when copying source word ${source_word} to copy word ${copy_word} with shift ${-shift} `);
				printword(dest_wordValue,'dest_wordvalue');
				if (monitor_stop && !testing) return;
			}
			
			while (copy_word < destination_stop_word) {
				copy_word++;
                source_word++;

				if (config_verbose) console.log(`copying from ${source_word} to word ${copy_word} with shift ${-shift}`);

                dest_wordValue = this.wordArray[source_word-1] >>> shift_flipped;
				dest_wordValue |= this.wordArray[source_word] << shift;
                
				if (inrange(copy_word,monitor_value>>>5)) {
					dump_bitarray(this, monitor_value-64,monitor_value+128,`Following next copyword ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) shift ${-shift}`);
					printword(this.wordArray[source_word-1],`Source value from word ${source_word-1} (${(source_word-1)*32})`);
					printword(this.wordArray[source_word-1]>>> shift_flipped,`source value-1 - shifted <- ${shift_flipped}`);
					printword(this.wordArray[source_word],`Source value from word ${source_word} (${source_word*32})`);
					printword(this.wordArray[source_word]<< shift,`source value - shifted -> ${shift}`);
					printword(this.wordArray[copy_word],'Copyword original value');
					printword(dest_wordValue,`shifted value (shift < 0) to word ${copy_word}`);
				}
	
				this.wordArray[copy_word] = dest_wordValue; 


				

				// if (detect(monitor_value, copy_word, dest_wordValue)) {
				// 	console.log(`Detected ${monitor_value} with shift in or`,-shift,'source_start',source_start,'destination_start',destination_start,'destination_stop',destination_stop,'copy_word',copy_word,`copy_start ${copy_start}`);
				// 	dump_bitarray(this, monitor_value,monitor_value+128,`Detected ${monitor_value} when copying source word ${source_word} to copy word ${copy_word} with shift ${-shift} `);
				// 	printword(dest_wordValue,'dest_wordvalue');
				// 	return;
				// }

				// if (!this.testRangeFalse(destination_stop+1,this.size)) {
				// 	console.log(`written beyond size with shift ${shift} copy_word ${copy_word} (${copy_word*32}) - stop word ${destination_stop_word}`);
				// }

            }

			// if (!this.testRangeFalse(destination_stop+1,this.size)) {
			// 	console.log(`before last correction`);
			// }

			this.wordArray[copy_word] &= (2 << ((destination_stop&31))) - 1; // do not exceed block_range

			// if (!this.testRangeFalse(destination_stop+1,this.size)) {
			// 	console.log(`after correction - written beyond size with shift ${shift}`);
			// 	return false;
			// }
			// else { console.log(`range ${destination_stop+1} - ${this.size} looks good`); }
        }

        if (shift == 0) {
			// console.log('shift 0 detected');
			// first word can be spread over 2 words
			let shift_flipped = WORD_SIZE-shift;
			dest_wordValue = this.wordArray[source_word] >>> shift;
            dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;
			this.wordArray[copy_word] = dest_wordValue; 

			if (inrange(copy_word,monitor_value>>>5)) {
				dump_bitarray(this, monitor_value-64,monitor_value+128,`Following copyword ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) - at first word`);
				printword(this.wordArray[copy_word],`Copyword original value${copy_word} (${copy_word*32})`);
				printword(this.wordArray[source_word],`Copy original value from word ${source_word} (${source_word*32})`);
				printword(this.wordArray[source_word],`written at ${copy_word} (bitstart: ${copy_word*32}`);
			}

            while (copy_word < destination_stop_word) {
				copy_word++;
                source_word++;

				if (inrange(copy_word,monitor_value>>>5)) {
					dump_bitarray(this, monitor_value-64,monitor_value+128,`Following copyword ${copy_word} (bitstart: ${copy_word*32}) using source ${source_word} (bitstart: ${source_word*32}) - at first word`);
					printword(this.wordArray[copy_word],`Copyword original value${copy_word} (${copy_word*32})`);
					printword(this.wordArray[source_word],`Copy original value from word ${source_word} (${source_word*32})`);
					printword(this.wordArray[source_word],`written at ${copy_word} (bitstart: ${copy_word*32}`);
				}
	
                this.wordArray[copy_word]=this.wordArray[source_word];
				// if (this.testBitTrue(monitor_value)) {
				// 	console.log(`Detected ${monitor_value} with shift`,-shift,destination_stop);
				// }
            }
			this.wordArray[copy_word] &= (2 << ((destination_stop&31))) - 1; // do not exceed block_range

        }

		// console.log(`destination_stop ${destination_stop} masked ${destination_stop&31}`);

		if (inrange(copy_word,monitor_value>>>5)) {
			dump_bitarray(this, monitor_value-64,monitor_value+128,`Following range after copypattern`);
		}

		if (this.testBitTrue(monitor_value)) {
			dump_bitarray(this,monitor_value,monitor_value+128,`WARNING: monitor value ${monitor_value} is set`);
			if (monitor_stop && !testing) return false;
		}

	}
}

/*
Main class for the prime calulation.
The bitArray stores only odd numbers, with formula number(index) = 2*index+1, e.g.
index = 0 -> number = 1
index = 1 -> number = 3
*/
class PrimeSieve {
	constructor(sieveSize) {
		this.sieveSize = sieveSize;
		this.sieveSizeInBits = sieveSize >>> 1;
		this.bitArray = new bitArray(1 + this.sieveSizeInBits);
	}

	runSieve(blocksize) {
		const q = Math.ceil(Math.sqrt(this.sieveSizeInBits*2))>>1;
		if (blocksize > this.sieveSizeInBits) blocksize = this.sieveSizeInBits;
		let block_start = 0;
		let block_stop  = blocksize-1;//this.sieveSizeInBits;
		if (block_stop > this.sieveSizeInBits) block_stop = this.sieveSizeInBits;
		let block_range = block_stop - block_start;

		// if (!this.bitArray.testRangeFalse(0,this.sieveSizeInBits)) {
		// 	console.log(`sieve is not clear at start`);
		// 	return false;
		// }


		while (block_stop <= this.sieveSizeInBits) {

			let factor = 1;
			let range = 3;  // range is the maximum to project the product of the prime
//			range = block_stop - block_start;
			let patternsize_bits = 1; // a block is a repeating pattern of prime multiples, e.g. 3*5*7*32
			let block_q = Math.ceil(Math.sqrt(block_stop*2))>>1;

			// TODO; check why this is necessary
			// for(let index = block_start; index < block_stop; index++) {
			// 	if (this.bitArray.testBitTrue(index)) {
			// 		console.log(`cleared bit ${index} blockrage ${block_start} - ${block_stop}`);
			// 		this.bitArray.setBitFalse(index);
			// 	}
			// }

			if (config_verbose) console.log(`processing block ${block_start}-${block_stop} - max ${block_q}`);

			while (factor <= block_q) {
//				console.log('looking at factor',factor*2+1);
				let step = factor * 2 + 1;
				let start = factor * step + factor;
				if (block_start > 0) {
					let rest = (block_start*2+1) % (factor*4+2);
					if (rest==block_start*2+1) {
						start = 3 * factor + 1;
					}
					else {
						start = ((block_start*2+1 + step - rest)>>1);
					}
					if (start < block_start) start += step;
//					if (block_start==262144) console.log(`factor ${factor}(${factor}) start ${start}(${start*2+1}) block_start ${block_start}(${block_start*2+1}) `,'step',step,'rest',rest);
				}

				// console.log(`calculated for factor ${factor} original start ${factor*step+factor} corrected start ${start} step ${step}  `);
				
				if (this.bitArray.testBitTrue(monitor_value)) {
					console.log('Before copypattern',monitor_value,' is true for factor',factor,'blockstart',block_start);
					return false;
				}

//				if (block_start==262144) dump_bitarray(this.bitArray,start,start+128, `before block_start - factor ${factor} (${factor*2+1})`);

				// console.log(`range ${range} patternsize_bits ${patternsize_bits} block_range ${block_range} step ${step}`);

				if (range < block_range) { // check if we should copy previous results

					range = patternsize_bits * step * 2;  // range is x2 so the second block cointains all multiples of primes
					if (range > block_range) range = block_range;

					// console.log(`calc new range ${range} patternsize_bits ${patternsize_bits} block_range ${block_range} step ${step}`);
					if (patternsize_bits>1) {

						if (block_start + patternsize_bits < this.sieveSizeInBits) {

							if (block_start==0) {
								// if (!this.bitArray.testRangeFalse(block_start+range+1,this.sieveSizeInBits)) {
								// 	console.log(`written beyond size before copypatterns blockstart0 ${block_start+patternsize_bits} ${block_start+(patternsize_bits*2)} ${block_start+range} ${block_stop+1}`);
								// 	return false;
								// }
								
								let result = this.bitArray.copyPattern(block_start+patternsize_bits, block_start+(patternsize_bits*2), block_start+range);
 								// dump_bitarray(this.bitArray,0,100,`after CopyPattern block_start ${block_start} patternsize ${patternsize_bits}`);
								if (result === false) {
									return false;
								}

								if (this.bitArray.testBitTrue(monitor_value)) {
									console.log(`After copyPattern blockstart0 ${monitor_value} is true for CopyPattern ${block_start+patternsize_bits}, ${block_start+patternsize_bits*2}, ${block_start+range}`);
									dump_bitarray(this.bitArray,monitor_value-64,monitor_value+128);
									return;
								}
				
								// if (!this.bitArray.testRangeFalse(block_stop+1,this.sieveSizeInBits)) {
								// 	console.log(`written beyond size after copypatterns blockstart0 ${block_start+patternsize_bits} ${block_start+(patternsize_bits*2)} ${block_start+range} - block stop ${block_stop}`);
								// 	return false;
								// }
				
							}
							else {
								let result = this.bitArray.copyPattern(block_start, block_start+patternsize_bits, block_start+range);
 								if (result === false) {
									return false;
								}

								if (this.bitArray.testBitTrue(monitor_value)) {
									console.log(`After copyPattern ${monitor_value} is true for CopyPattern ${start}, ${start+patternsize_bits}, ${block_start+range}`);
									dump_bitarray(this.bitArray,monitor_value,monitor_value);
									return;
								}

								// if (!this.bitArray.testRangeFalse(block_stop+1,this.sieveSizeInBits)) {
								// 	console.log(`written beyond size after copypatterns ${start} ${start+(patternsize_bits)} ${block_start+range}`);
								// 	return false;
								// }
							}
						}
			//				console.log('copypattern',patternsize_bits, patternsize_bits*2, range);
					}
					patternsize_bits = patternsize_bits * step;
				}

//				console.log('setBitRangeTrue',start*2+1,step,range*2+1);
				// if (!this.bitArray.testRangeFalse(block_start+range,this.sieveSizeInBits)) {
				// 	console.log(`written beyond range ${start} - ${block_start+range} before setbits ${start} ${step} ${block_stop}`);
				// 	return false;
				// }

				if (config_verbose)  console.log(`setbits ${start} - ${block_start+range} with step ${step} for factor ${factor}`);

				if (this.bitArray.testBitTrue(monitor_value)) {
					console.log('Before setbit',monitor_value,' is true for factor',factor,'blockstart',block_start,'start',start,'step',step,'block_stop',block_stop);
					return;
				}

				this.bitArray.setBitRangeTrue(start, step, block_start+range);

				if (config_verbose) {
					dump_bitarray(this.bitArray,0,100,`after setbits ${start} - ${block_start+range} with step ${step} for factor ${factor}`);
				}

				if (this.bitArray.testBitTrue(monitor_value)) {
					console.log('After setbit',monitor_value,' is true for factor',factor,'blockstart',block_start,'start',start,'step',step,'block_stop',block_stop);
					return;
				}

				// for(let index=start; index<block_start+range; index+=step) { // range keeps index in block
				// 	this.bitArray.setBitTrue(index);
				// }

				// if (!this.bitArray.testRangeFalse(block_start+range,this.sieveSizeInBits)) {
				// 	console.log(`written beyond range ${start} - ${block_start+range} after setbits ${start} ${step} ${block_stop}`);
				// 	return false;
				// }

				// if (!this.bitArray.testRangeFalse(block_stop+1,this.sieveSizeInBits)) {
				// 	console.log(`written beyond block after setbits ${start} ${step} ${block_stop}`);
				// 	return false;
				// }
	

				factor = this.bitArray.searchBitFalse(factor + 1);
			}
			if (block_stop == this.sieveSizeInBits) break;

			block_stop += blocksize;
			block_start += blocksize;
			if (block_stop > this.sieveSizeInBits) block_stop = this.sieveSizeInBits;
		}

		return this;
	}

	countPrimes() {
		let primeCount = 1;  // account for prime 2

		for (let index = 1; index < this.sieveSizeInBits; index++) {
			if (!this.bitArray.testBitTrue(index)) { // if bit is false, it's a prime, because non-primes are marked true
				primeCount++;
			}
		}

		return primeCount;
	}

	getPrimes(maxNr = 100) {
		const primeArray = [2];  // 2 is a special prime

		if (this.sieveSize > 1) {
			for (let factor = 1, count = 1; factor < this.sieveSizeInBits; factor++) {
				if (count >= maxNr) break;
				if (!this.bitArray.testBitTrue(factor)) {
					count = primeArray.push(factor * 2 + 1);
				}
			}
		}
		return primeArray;
	}

	validatePrimeCount(verbose) {
		// Historical data for validating our results - the number of primes
		// to be found under some limit, such as 168 primes under 1000
		const maxShowPrimes = 100;
		const knownPrimeCounts = {
			10: 4,
			100: 25,
			1000: 168,
			10000: 1229,
			100000: 9592,
			1000000: 78498,
			10000000: 664579,
			100000000: 5761455
		};
		const countedPrimes = this.countPrimes();
		const primeArray = this.getPrimes(maxShowPrimes);

		let validResult = false;
		if (this.sieveSize in knownPrimeCounts) {
			const knownPrimeCount = knownPrimeCounts[this.sieveSize];
			validResult = (knownPrimeCount == countedPrimes);
			if (!validResult)
				console.log(
					"\nError: invalid result.",
					`Limit for ${this.sieveSize} should be ${knownPrimeCount} `,
					`but result contains ${countedPrimes} primes`
				);
		}
		else console.log(
			`Warning: cannot validate result of ${countedPrimes} primes:`,
			`limit ${this.sieveSize} is not in the known list of number of primes!`
		);

		if (verbose)
			console.log(`\nThe first ${maxShowPrimes} found primes are:`, primeArray);
	
		return validResult;
	}
}

// run the sieve for timeLimitSeconds
function runSieveBatch(sieveSize, blocksize, timeLimitSeconds=5, callback) {
    let nrOfPasses = 0;                                                 // Counter for the number of passes in a from timestart to timefinish

    const timeStart = performance.now();                                // Record starting time
    const timeFinish = timeStart + timeLimitSeconds * 1000;             // Calculate finish time before, so we don't repeat

    let sieve;                                                          // outside do loop to reference the last instance in verbose output
    do {
        sieve = new PrimeSieve(sieveSize);
        sieve.runSieve(blocksize);
        nrOfPasses++;
    } while (performance.now() < timeFinish);                           // keep going for timeLimitSeconds

    callback(nrOfPasses);
}

// main procedure
const main = ({ sieveSize, timeLimitSeconds, verbose, runtime }) => {

	if (!testBitArray()) {
		console.log('Wont start until problems are fixed');
		return;
	}

	for (let blocksize_bits=1024; blocksize_bits<=64*1024*8; blocksize_bits *= 2) {
		console.log(`blocksize ${blocksize_bits}`);


		// validate algorithm - run one time
		let sieve = new PrimeSieve(sieveSize).runSieve(blocksize_bits);
		const validResult = sieve.validatePrimeCount(verbose);
		if (!validResult) {
			let primes = sieve.getPrimes(100);
			console.log(primes);
			deepAnalyzePrimes(sieve);
			return false;
		}
	}

	for (let blocksize_kb=1; blocksize_kb<=64; blocksize_kb *= 2) {
		//measure time running the batch
		const timeStart = performance.now();
		let blocksize_bits = blocksize_kb * 1024 * 8;
		runSieveBatch(sieveSize, blocksize_bits, timeLimitSeconds, (nrOfPasses) => { // show off typical nodejs style
			const timeEnd = performance.now();
			const durationInSec = (timeEnd - timeStart) / NOW_UNITS_PER_SECOND;
			const totalPasses = nrOfPasses;
			console.log(`rogiervandam-memcopy-${runtime}-${blocksize_kb}kb;${totalPasses};${durationInSec};1;algorithm=other,faithful=yes,bits=1`); 
		});
	}
}

main(config);

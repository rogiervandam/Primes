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
const NOW_UNITS_PER_SECOND =  1000;
const WORD_SIZE = 32;
const monitor_value = 0;

function pos_calc(word,index) {
	return (word << 5) + index;
}
function index_calc(value) {
	return value & 31;
}
function detect(pos, word, value) {
	return (pos_calc(word, index_calc(value))  == pos);
}

function printword(word, description) {
	let row='';
	for(let i=0; i<32; i++) {
		row += (i%8) ? '':' ';
		row += (word & (1<<i))?'1':'.';
	}
	if (description) row += ' - ' + description;
	console.log('word:',row);
}

function dump_bitarray(array, start, end, msg, columns) {
	let startmark = start;
	while (start%10>0 || start%8>0) start--;
	if (!columns) columns = 32;
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
		header3 += (start+col ==  startmark) ? 'x':'-';
	}
	console.log('\n',msg);
	console.log(header1);
	console.log(header2);
	console.log(header3);

	let row='',col=0,rowstart=start;
	for (let index=start;index<=end;index++) {
		row += col%8 ? '':' ';
		row += array.testBitTrue(index) ? '1' : '.';

		if (col++ == columns) {
			row += ` ${rowstart} - ${rowstart+columns-1}`;
			console.log(row);
			row='';
			col=0;
			rowstart=index;
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


let config = {
	sieveSize: 1000000,
	timeLimitSeconds: 5,
	verbose: false,
	runtime: '',
    workers: 1
};

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
// 32-bit bitArray for javascript, with only needed functions
// int32, not uint and not 64bit because: javascript uses 32-bit int with bitwise operations
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND
// bigint wont work because irt uses signed
// shifting not with >> but with >>> is for zero fill right shift
class bitArray {
	constructor(size) {
		this.wordArray = new Int32Array(1 + (size >>> 5));
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

	setBitsTrue(range_start, step, range_stop) {
		if (step > WORD_SIZE/2) { 
			// steps are large: check if the range is large enough to reuse the same mask
			let range_stop_unique =  range_start + 32 * step;
			if (range_stop_unique > range_stop) {
				// range is not large enough for repetition (32 * step)
				for (let index = range_start; index < range_stop; index += step) {
					this.setBitTrue(index);
				}
				return;
			}
			// range is large enough to reuse the mask
			const range_stop_word = range_stop >>> 5;
			for (let index = range_start; index < range_stop_unique; index += step) {
				let wordOffset = index >>> 5;
				const bitOffset = index & 31;
				const mask = (1 << bitOffset);
				do {
					this.wordArray[wordOffset] |= mask;
					wordOffset += step; // pattern repeats on word level after {step} words
				} while (wordOffset <= range_stop_word);
			}
			return;
		}

		// optimized for small sizes: set wordvalue multiple times before committing to memory
		let index = range_start;
		let wordOffset = index >>> 5;  // 1 word = 2ˆ5 = 32 bit, so shift 5, much faster than /32
		let wordValue = this.wordArray[wordOffset];

		while (index < range_stop) {
			const bitOffset = index & 31;  // use & (and) for remainder, faster than modulus of /32
			wordValue |= (1 << bitOffset);

			index += step;
			const newwordOffset = index >>> 5;  // 1 word = 2ˆ5 = 32 bit, so shift 5, much faster than /32
			if (newwordOffset != wordOffset) { // moving to new word: store value and get new value
				this.wordArray[wordOffset] = wordValue;
				wordOffset = newwordOffset;
				wordValue = this.wordArray[wordOffset];
			}
		}
		this.wordArray[wordOffset] = wordValue; // make sure last value is stored
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
		const size = destination_start - source_start;
		let copy_start = destination_start;

		// if (destination_start <= source_start) {
		// 	console.log('source start',source_start,'after destination start',destination_start);
		// 	return false;
		// }
		// if (destination_stop <= destination_start) {
		// 	console.log('destination start',destination_start,'after destination stop',destination_stop);
		// 	return false;
		// }
		// if (source_start > this.sieveSizeInBits) {
		// 	console.log('source start',source_start,'beyond sieve limit',sieveSizeInBits);
		// 	return false;
		// }
		// if (destination_start > this.sieveSizeInBits) {
		// 	console.log('destination_start',destination_start,'beyond sieve limit',sieveSizeInBits);
		// 	return false;
		// }
		// if (destination_stop > this.sieveSizeInBits) {
		// 	console.log('destination_stop',destination_start,'beyond sieve limit',sieveSizeInBits);
		// 	return false;
		// }

		if (size < WORD_SIZE*2) { // handle small sizes: fill the second word
			let copy_max = WORD_SIZE*2 + source_start;
			if (copy_max > destination_stop) copy_max = destination_stop;
			for (let index=0; index<size; index++) {
				if (this.testBitTrue(source_start+index)) {
					let copy_index = destination_start+index;
					while (copy_index < copy_max) {
						this.setBitTrue(copy_index);
						// if (this.testBitTrue(monitor_value)) {
						// 	console.log('when setting first word',monitor_value,'is true',source_start,destination_start,destination_stop,size,copy_index,index);
						// 	return;
						// }
	
						copy_index += size;
					}
				}
			}

			// increase copy_start to avoid copying before the source_start
			while (copy_start < source_start_org + WORD_SIZE*2) {
				source_start += size;
				copy_start += size;
			}
			if ((destination_stop-destination_start) <= WORD_SIZE*2) {
				// console.log('(destination_stop-destination_start)',(destination_stop-destination_start),'<=',WORD_SIZE*2,'size',size,'source_start',source_start,'destination_start',destination_start);
				return;
			}
		}

		let source_word = source_start >>> 5;
		let copy_word = copy_start >>> 5;
		let destination_stop_word = destination_stop >>> 5;
		let shift = (source_start & 31) - (copy_start & 31);
		let dest_wordValue = 0;

//		console.log('start',source_start,'dest_start',destination_start,'dest_stop',destination_stop,'size',size, 'size32',size*32);
//		console.log('copy_word',copy_word,'source_word',source_word,'delta',copy_word-source_word,'shift',shift);

		if (shift > 0) {
            let shift_flipped = WORD_SIZE-shift;
            dest_wordValue = this.wordArray[source_word] >>> shift;
            dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;
            this.wordArray[copy_word] |= dest_wordValue; // or the start in to not lose data
			// if (this.testBitTrue(monitor_value)) {
			// 	console.log(`Detected ${monitor_value} with shift in o`,shift,destination_stop);
			// }

            while (copy_word++ <= destination_stop_word) {
                source_word++;
                dest_wordValue = this.wordArray[source_word] >>> shift;
                dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;
                this.wordArray[copy_word] = dest_wordValue; 
//				if (detect(monitor_value, copy_word, dest_wordValue)) {
				// if (this.testBitTrue(monitor_value)) {
				// 	console.log(`Detected ${monitor_value} with shift`,shift,destination_stop);
				// }
			}
			return;
        }
		if (shift < 0) {
            shift = -shift;
            let shift_flipped = WORD_SIZE-shift;

			// if (source_word * WORD_SIZE < source_start) {
			// 	console.log(`WARNING: Source word ${source_word} (${source_word*WORD_SIZE}) before ${source_start}`);
			// }

			// if (copy_word==8192) {
			// 	dump_bitarray(this, 8192*32,8192*32+128,`Following copyword ${copy_word} (bitstart: ${copy_word*32})`);
			// }
			dest_wordValue = this.wordArray[source_word] << shift;
			// the first source_word is tricky...
//			let source_lastword = source_word + size % 32;
//            dest_wordValue |= this.wordArray[source_lastword] >>> shift_flipped;
//            this.wordArray[copy_word] |= dest_wordValue; // or the start in to not lose data
			// if (this.testBitTrue(monitor_value)) {
			// 	console.log(`Detected ${monitor_value} with shift in or`,-shift,'source_start',source_start,'destination_start',destination_start,'destination_stop',destination_stop,'copy_word',copy_word,`copy_start ${copy_start}`);
			// 	dump_bitarray(this, monitor_value,monitor_value+128,`Detected ${monitor_value} when copying source word ${source_word} to copy word ${copy_word} with shift ${-shift} `);
			// 	printword(dest_wordValue,'dest_wordvalue');
			// 	return;
			// }
			while (copy_word++ <= destination_stop_word) {
                source_word++;
                dest_wordValue = this.wordArray[source_word] << shift;
                dest_wordValue |= this.wordArray[source_word-1] >>> shift_flipped;
                this.wordArray[copy_word] = dest_wordValue; 
//				if (detect(monitor_value, copy_word, dest_wordValue)) {
				// if (this.testBitTrue(monitor_value)) {
				// 	console.log(`Detected ${monitor_value} with shift in or`,-shift,'source_start',source_start,'destination_start',destination_start,'destination_stop',destination_stop,'copy_word',copy_word,`copy_start ${copy_start}`);
				// 	dump_bitarray(this, monitor_value,monitor_value+128,`Detected ${monitor_value} when copying source word ${source_word} to copy word ${copy_word} with shift ${-shift} `);
				// 	printword(dest_wordValue,'dest_wordvalue');
				// 	return;
				// }
            }
			return;
        }

        if (shift == 0) {
            while (copy_word++ <= destination_stop_word) {
                this.wordArray[copy_word]=this.wordArray[source_word];
				// if (this.testBitTrue(monitor_value)) {
				// 	console.log(`Detected ${monitor_value} with shift`,-shift,destination_stop);
				// }
                source_word++;
            }
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
		const q = Math.ceil(Math.sqrt(this.sieveSizeInBits));
		if (blocksize > this.sieveSizeInBits) blocksize = this.sieveSizeInBits;
		let block_start = 0;
		let block_stop  = blocksize;//this.sieveSizeInBits;
		if (block_stop > this.sieveSizeInBits) block_stop = this.sieveSizeInBits;
		let block_range = block_stop - block_start;


		while (block_stop <= this.sieveSizeInBits) {
//			console.log('starting block at',block_start);
			let factor = 1;
			let range = 3;  // range is the maximum to project the product of the prime
//			range = block_stop - block_start;
			let patternsize_bits = 1; // a block is a repeating pattern of prime multiples, e.g. 3*5*7*32
			let block_q = Math.min(q, block_stop);	

			// TODO; check why this is necessary
			for(let index = block_start; index < block_stop; index++) {
				this.bitArray.setBitFalse(index);
			}

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
				// if (this.bitArray.testBitTrue(monitor_value)) {
				// 	console.log('Before copypattern',monitor_value,' is true for factor',factor,'blockstart',block_start);
				// 	return;
				// }

//				if (block_start==262144) dump_bitarray(this.bitArray,start,start+128, `before block_start - factor ${factor} (${factor*2+1})`);

				if (range < block_range) { // check if we should copy previous results
					if (patternsize_bits>1) {

						range = patternsize_bits * step * 2;  // range is x2 so the second block cointains all multiples of primes
						if (range > block_range) range = block_range;
						if (block_start + patternsize_bits < this.sieveSizeInBits) {

							if (block_start==0) {
								this.bitArray.copyPattern(block_start+patternsize_bits, block_start+(patternsize_bits*2), block_start+range);
							}
							else {
								this.bitArray.copyPattern(start, start+(patternsize_bits), block_start+range);
							}
						}
						// if (this.bitArray.testBitTrue(monitor_value)) {
						// 	console.log('After range',monitor_value,' is true for factor',factor,'patternsize_bits',patternsize_bits,'block_start',block_start,'start',start,'range',range);
						// 	dump_bitarray(this.bitArray,start,start+128);
						// 	return;
						// }
			//				console.log('copypattern',patternsize_bits, patternsize_bits*2, range);
					}
					patternsize_bits = patternsize_bits * step;
				}

//				console.log('setbitstrue',start*2+1,step,range*2+1);
				this.bitArray.setBitsTrue(start, step, block_stop);
				// if (this.bitArray.testBitTrue(monitor_value)) {
				// 	console.log('After setbit',monitor_value,' is true for factor',factor,'blockstart',block_start,'start',start,'step',step,'block_stop',block_stop);
				// 	return;
				// }

				// for(let index=start; index<block_start+range; index+=step) { // range keeps index in block
				// 	this.bitArray.setBitTrue(index);
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

	for (let blocksize_hb=1; blocksize_hb<=64; blocksize_hb *= 2) {
		let blocksize_bits = blocksize_hb*1024*8;

		// validate algorithm - run one time
		const validResult = new PrimeSieve(sieveSize).runSieve(blocksize_bits).validatePrimeCount(verbose);
		if (!validResult) {
			let sieve = new PrimeSieve(sieveSize).runSieve(blocksize_bits);
			let primes = sieve.getPrimes(100);
			console.log(primes);
			deepAnalyzePrimes(sieve);
			return false;
		}

		//measure time running the batch
		const timeStart = performance.now();
		runSieveBatch(sieveSize, blocksize_bits, timeLimitSeconds, (nrOfPasses) => { // show off typical nodejs style
			const timeEnd = performance.now();
			const durationInSec = (timeEnd - timeStart) / NOW_UNITS_PER_SECOND;
			const totalPasses = nrOfPasses;
			console.log(`rogiervandam-memcopy-${runtime}-${blocksize_hb}kb;${totalPasses};${durationInSec};1;algorithm=other,faithful=yes,bits=1`); 
		});

	}
}

main(config);

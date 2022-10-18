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

let config = {
	sieveSize: 1000000,
	timeLimitSeconds: 5,
	verbose: false,
	runtime: '',
    workers: 1
};
const NOW_UNITS_PER_SECOND =  1000;
const WORD_SIZE = 32;

let memcalls = {
	setbit: 0,
	testbit: 0,
	SetBitRange_LargeStep_SmallRange: 0,
	SetBitRange_LangeStep_LargeRange: 0,
	SetBitRange_SmallStep_FirstWord: 0,
	SetBitRange_SmallStep_MiddleWord: 0,
	SetBitRange_SmallStep_LastWord: 0,
}

let timespent = {

}

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

function deepAnalyzePrimes(sieve) {
    // console.log("DeepAnalyzing");

    const range_to = sieve.sieveSizeInBits;

    for (let prime = 1, warn_prime = 0, warn_nonprime = 0; prime < range_to; prime++) {
        if (!sieve.bitArray.testBitTrue(prime)) { // is this a prime?
            const q = (Math.sqrt(prime * 2 + 1) | 1) * 2 + 1;

            for (let c = 1; c <= q; c++) {
                if ((prime * 2 + 1) % (c * 2 + 1) == 0 && (c * 2 + 1) != (prime * 2 + 1)) {
                    if (warn_prime++ < 30) {
                        console.log("Number %d (%d) was marked prime, but %d * %d = %d", prime * 2 + 1, prime, c * 2 + 1, (prime * 2 + 1) / (c * 2 + 1), prime * 2 + 1);
                    }
                }
            }
        }
        else {
            const q = (Math.sqrt(prime * 2 + 1) | 1) * 2 + 1;
            let c_prime = 0;

            for (let c = 1; c <= q; c++) {
                if ((prime * 2 + 1) % (c * 2 + 1) == 0 && (c * 2 + 1) != (prime * 2 + 1)) {
                    c_prime++;
                    break;
                }
            }

            if (c_prime == 0) {
                if (warn_nonprime++ < 30) {
                    console.log("Number %d (%d) was marked non-prime, but no primes found. So it is prime", prime * 2 + 1, prime);
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
		// memcalls.setbit++;
	}

	testBitTrue(index) {
		const wordOffset = index >>> 5;
		const bitOffset = index & 31;
		// memcalls.testbit++;		
		return this.wordArray[wordOffset] & (1 << bitOffset);  // returning result not as bool for performance
	}

	setBitRangeTrue(range_start, step, range_stop) {
		if (step > WORD_SIZE) { 
			// steps are large: check if the range is large enough to reuse the same mask
			let range_stop_unique = range_start + 32 * step;
			if (range_stop_unique > range_stop) {
				// range is not large enough for repetition (32 * step)
				for (let index = range_start; index <= range_stop; index += step) {
					this.setBitTrue(index);
//					memcalls.SetBitRange_LargeStep_SmallRange++;
				}
				return;
			}

			// range is large enough to reuse the mask
			let range_stop_word = range_stop >>> 5;
			let range_stop_bit = range_stop & 31;

			for (let index = range_start; index <= range_stop_unique; index += step) {
				const bitOffset = index & 31;
				const mask = (1 << bitOffset);

				let loop_stop_word = range_stop_word + ((bitOffset <= range_stop_bit) ? 1 : 0); // allow range_stop_word to be set if bitoffset is small enough

				let wordOffset = index >>> 5;
				do {
					this.wordArray[wordOffset] |= mask;
//					memcalls.SetBitRange_LangeStep_LargeRange++;
					wordOffset += step; // pattern repeats on word level after {step} words
				} while (wordOffset < loop_stop_word);

			}
			return;
		}

		let pattern = 1;
		let patternsize = step;
		for (let index = step; index < WORD_SIZE; index += step) {
			pattern |= (1 << index);
			patternsize += step;
		}
		patternsize -= step;
		let pattern_shift = WORD_SIZE - patternsize; // the amount a pattern drifts (>>) at each word increment

		let shift = range_start & 31;
		let range_stop_word = range_stop >>> 5;
		let range_stop_bit = range_stop & 31;
		let wordOffset = range_start >>> 5;

		if (wordOffset == range_stop_word) { // shortcut
			this.wordArray[wordOffset] |= ((pattern << shift) & (2 << ((range_stop_bit&31))) - 1 );
//			memcalls.SetBitRange_SmallStep_FirstWord++;
			return;
		}

		// from now on, we are before range_stop_word
		// first word is special, because it should not set bits before the range_start_bit
		this.wordArray[wordOffset] |= pattern << shift;
		shift = shift % step;
        wordOffset++;

		while (wordOffset < range_stop_word) {
			if (shift < pattern_shift) shift += step; // prevent shift going negative
			shift -= pattern_shift; 
			this.wordArray[wordOffset] |= pattern << shift;
//			memcalls.SetBitRange_SmallStep_MiddleWord++;
            wordOffset++;
		} 

		if (shift < pattern_shift) shift += step;
		shift -= pattern_shift; 
		this.wordArray[wordOffset] |= ((pattern << shift) & (2 << ((range_stop_bit&31))) - 1 );
//		memcalls.SetBitRange_SmallStep_LastWord++;
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
			this.wordArray[copy_word] |= (pattern << copy_bit); // apply pattern to first word
			

			let shift = WORD_SIZE - copy_bit; // these bytes were already written in first word
			while (copy_word < destination_stop_word) { // = will be handled as well because increment is after this 
				copy_word++;
				this.wordArray[copy_word] = (pattern << (patternsize-shift)) | (pattern >>> shift);
				
				shift += pattern_shift; 
				if (shift > WORD_SIZE) shift -= WORD_SIZE; // TODO: check if needed
			}
			return;
			// TODO: keep loop here
		}

		if (copy_start > destination_stop) {
//			this.wordArray[destination_stop>>>5] &= ((2 << ((destination_stop&31))) - 1); // do not exceed block_range
			
			return;
		}

		let copy_word = copy_start >>> 5;
		let copy_bit = copy_start &31;
		let shift = source_bit - copy_bit;
		let dest_wordValue = 0;

		if (shift > 0) {
            let shift_flipped = WORD_SIZE-shift;
            dest_wordValue = this.wordArray[source_word] >>> shift;
            dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;
			dest_wordValue &= ~((1<<copy_bit)-1); // because this is the first word, dont copy the extra bits in front of the source
            this.wordArray[copy_word] |= dest_wordValue; // or the start in to not lose data
            while (copy_word < destination_stop_word) {
				copy_word++;
                source_word++;
                dest_wordValue = this.wordArray[source_word] >>> shift;
                dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;
				this.wordArray[copy_word] = dest_wordValue; 
			}
//			this.wordArray[copy_word] &= (2 << ((destination_stop&31))) - 1; // do not exceed block_range
			
			return;
        }
		if (shift < 0) {
            shift = -shift;
            let shift_flipped = WORD_SIZE-shift;
			dest_wordValue = this.wordArray[source_word] << shift;
			// the first source_word is tricky...
			let source_lastword = (source_word + size) >>> 5;
            dest_wordValue |= this.wordArray[source_lastword] >>> shift_flipped;
			dest_wordValue &= ~((1<<copy_bit)-1); // because this is the first word, dont copy the extra bits in front of the source
            this.wordArray[copy_word] |= dest_wordValue; // or the start in to not lose data
		
			while (copy_word < destination_stop_word) {
				copy_word++;
                source_word++;
                dest_wordValue = this.wordArray[source_word-1] >>> shift_flipped;
				dest_wordValue |= this.wordArray[source_word] << shift;
				this.wordArray[copy_word] = dest_wordValue; 
            }
//			this.wordArray[copy_word] &= (2 << ((destination_stop&31))) - 1; // do not exceed block_range
			
			return;
        }

        if (shift == 0) {
			// first word can be spread over 2 words
			let shift_flipped = WORD_SIZE-shift;
			dest_wordValue = this.wordArray[source_word] >>> shift;
            dest_wordValue |= this.wordArray[source_word+1] << shift_flipped;
			this.wordArray[copy_word] = dest_wordValue; 

            while (copy_word < destination_stop_word) {
				copy_word++;
                source_word++;
                this.wordArray[copy_word]=this.wordArray[source_word];
            }
//			this.wordArray[copy_word] &= (2 << ((destination_stop&31))) - 1; // do not exceed block_range
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

	runBlock(block_start, block_range, prime_start) {
		let prime_end = Math.ceil(Math.sqrt((block_start+block_range)*2))>>1;
		let prime = prime_start;
		let patternsize_bits = 1; // a block is a repeating pattern of prime multiples, e.g. 3*5*7*32
		let block_range_start = (prime_start *2 +1);
		let range = block_range_start;  // range is the maximum to project the product of the prime
		let	block_start_prime = prime_start; // max prime where copypattern is possible

		while (prime <= prime_end) {
			let step = prime * 2 + 1;

			if (range < block_range) { // check if we should copy previous results
				range = patternsize_bits * step * 2;  // range is x2 so the second block cointains all multiples of primes
				if (range > block_range) { // at the maximum of the pattern that can fill the block
					range = block_range;
				}
				if (patternsize_bits>1) {
					if (block_start + patternsize_bits < this.sieveSizeInBits) {
						if (block_start==0) {
							this.bitArray.copyPattern(block_start+patternsize_bits, block_start+(patternsize_bits*2), block_start+range);
						}
						else {
							this.bitArray.copyPattern(block_start, block_start+patternsize_bits, block_start+range);
						}
					}
				}
				patternsize_bits = patternsize_bits * step;
			}

			let start = prime * prime * 2 + prime * 2;
			if (block_start > 0) {
				let rest = (block_start*2+1) % (prime*4+2);
				
				if (rest==block_start*2+1) { // is this causing problems?
					start = 3 * prime + 1;
				}
				else {
					start = ((block_start*2+1 + step - rest)>>1);
					if (start < block_start) start += step;
				}

				let start2 = start;
				let rest2 = (block_start*2+1) % (prime*4+2);
				rest2 = (prime * 2 + 2 - rest2)>>1;
				if (rest2>0) start2 = block_start + rest2;
				
				// let start2 = start;
				// let rest2 = (block_start*2+1) % (prime*4+2);
				// rest2 = (prime * 2 + 2 - rest2)>>1;
				// if (rest2>0) start2 = block_start + rest2;
				
				// let rest2 = (block_start*2+1) % (prime*4+2);
				// let start2 = start;
				// if (rest2<step) { // is this causing problems?
				// 	start2 = ((block_start*2+1 + step - rest2)>>1);
				// }

				if (start2 != start) {
					console.log(`Error: start: ${start} start2: ${start2} at prime ${prime} step ${step} block_start ${block_start} rest2 ${rest2}`);
					return;
				}
			}
			this.bitArray.setBitRangeTrue(start, step, block_start+range);
			prime = this.bitArray.searchBitFalse(prime + 1);
		}
		return block_start_prime;
	}

	runSieve(blocksize) {
		const q = Math.ceil(Math.sqrt(this.sieveSizeInBits*2))>>1;
		if (blocksize > this.sieveSizeInBits) blocksize = this.sieveSizeInBits;
		let block_start = 0;
		let block_stop  = blocksize-1;//this.sieveSizeInBits;
		if (block_stop > this.sieveSizeInBits) block_stop = this.sieveSizeInBits;
		let block_range = block_stop - block_start; // will be smaller at the end
		let block_start_prime = 1;

		do {
			this.runBlock(block_start, block_range, 1)
			block_start += blocksize;
			block_stop += blocksize;
			if (block_stop > this.sieveSizeInBits) {
				block_stop = this.sieveSizeInBits;
				block_range = block_stop - block_start;
			}
		} while (block_start < this.sieveSizeInBits)
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
			for (let prime = 1, count = 1; prime < this.sieveSizeInBits; prime++) {
				if (count >= maxNr) break;
				if (!this.bitArray.testBitTrue(prime)) {
					count = primeArray.push(prime * 2 + 1);
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
    const timeFinish = timeStart + timeLimitSeconds * NOW_UNITS_PER_SECOND; // Calculate finish time before, so we don't repeat

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

	// test memcalls
	console.log('Analyzing memcalls');
	let countsieve = new PrimeSieve(1000000).runSieve(64*1024*8);
	console.log(memcalls);

	process.stdout.write("Validating... ");

	for (let blocksize_bits=1024; blocksize_bits<=64*1024*8; blocksize_bits *= 2) {
		for (let sieveSize_check = 100; sieveSize_check <= 100000000; sieveSize_check *=10) {
			// validate algorithm - run one time
			let sieve = new PrimeSieve(sieveSize_check).runSieve(blocksize_bits);
			const validResult = sieve.validatePrimeCount(verbose);
			if (!validResult) {
				console.log(`blocksize ${blocksize_bits} - sievesize ${sieveSize_check} invalid`);
				let primes = sieve.getPrimes(100);
				console.log(primes);
				deepAnalyzePrimes(sieve);
				return false;
			}
//			console.log(`blocksize ${blocksize_bits} - sievesize ${sieveSize} - valid`);
		}
	}

	console.log('ok\nBenchmarking...');

	for (let blocksize_kb=128; blocksize_kb>=1; blocksize_kb /= 2) {
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

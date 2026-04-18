#ifndef SIEVE_TRACE_FORMAT_H
#define SIEVE_TRACE_FORMAT_H

/*
 * JSON trace file format (.sievetrace)
 *
 * {
 *   "version": 3,
 *   "sieve_size": <uint64>,
 *   "bit_count": <uint64>,
 *   "steps": [
 *     {
 *       "step": <int>,
 *       "annotation": "<string>",
 *       "operation": "<string>",       // e.g. "markFactors", "extend", "continuePattern"
 *       "prime": <int | null>,         // the prime being processed (number, not index)
 *       "block_start": <int | null>,   // block range start
 *       "block_stop": <int | null>,    // block range stop
 *       "factor_step": <int | null>,   // step size for marking
 *       "changed_bits": [<int>, ...]
 *     },
 *     ...
 *   ]
 * }
 *
 * Changed bits are indices into the bitstorage (half-storage: bit i = number 2*i+1).
 * Only bits that changed (0->1) between this step and the previous step are recorded.
 */

#define TRACE_FORMAT_VERSION 3

#endif /* SIEVE_TRACE_FORMAT_H */

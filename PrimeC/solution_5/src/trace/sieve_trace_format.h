#ifndef SIEVE_TRACE_FORMAT_H
#define SIEVE_TRACE_FORMAT_H

/*
 * JSON trace file format (.sievetrace)
 *
 * {
 *   "version": 2,
 *   "sieve_size": <uint64>,
 *   "bit_count": <uint64>,
 *   "steps": [
 *     {
 *       "step": <int>,
 *       "annotation": "<string>",
 *       "changed_bits": [<int>, ...]
 *     },
 *     ...
 *   ]
 * }
 *
 * Changed bits are indices into the bitstorage (half-storage: bit i = number 2*i+1).
 * Only bits that changed (0->1) between this step and the previous step are recorded.
 */

#define TRACE_FORMAT_VERSION 2

#endif /* SIEVE_TRACE_FORMAT_H */

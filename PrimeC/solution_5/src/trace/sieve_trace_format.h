#ifndef SIEVE_TRACE_FORMAT_H
#define SIEVE_TRACE_FORMAT_H

/*
 * Primary trace format (.sievetrace): human-readable line format.
 *
 * Header:
 * TRACE version=<int> format=text sieve_size=<u64> bit_count=<u64> max_number=<u64>
 *
 * Step line:
 * STEP step=<u32> op="<name>" prime=<i64|null> start=<i64|null> stop=<i64|null>
 *      factor_step=<i64|null> depth=<int> changed_count=<u32>
 *      changed_bits=[1,2,3] annotation="<text>"
 *
 * Optional secondary JSON companion output can be enabled with:
 * TRACE_JSON_SECONDARY=1 (written to <tracefilename>.json)
 *
 * JSON compatibility format fields use canonical keys:
 * start, stop, factor_step (legacy block_start/block_stop accepted by parser).
 *
 * Memory dump supports both hex and binary payloads.
 */

#define TRACE_FORMAT_VERSION 4

#endif /* SIEVE_TRACE_FORMAT_H */

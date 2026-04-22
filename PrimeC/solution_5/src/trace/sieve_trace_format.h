#ifndef SIEVE_TRACE_FORMAT_H
#define SIEVE_TRACE_FORMAT_H

/*
 * Primary trace format (.sievetrace): human-readable line format.
 *
 * Header:
 * TRACE version=<int> format=text sieve_size=<u64> bit_count=<u64> max_number=<u64> [benchmark_settings=<token>]
 *
 * Step line:
 * STEP step=<u32> op="<name>" depth=<int> changed_count=<u32>
 *      changed_bits=[1,2,3] annotation="<text>"
 *
 * Optional secondary JSON companion output can be enabled with:
 * TRACE_JSON_SECONDARY=1 (written to <tracefilename>.json)
 *
 * The visualizer infers start, stop, factor_step, and prime from annotation text.
 *
 * Memory dump supports both hex and binary payloads.
 */

#define TRACE_FORMAT_VERSION 6

#endif /* SIEVE_TRACE_FORMAT_H */

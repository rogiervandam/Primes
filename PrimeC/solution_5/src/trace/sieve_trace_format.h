#ifndef SIEVE_TRACE_FORMAT_H
#define SIEVE_TRACE_FORMAT_H

/*
 * Primary trace format (.sievetrace): human-readable line format.
 *
 * Optional header line:
 * TRACE { "version": <int>, "format": "text", "sieve_size": <u64>, "bit_count": <u64>,
 *         "max_number": <u64>, "storage_model": "<name>", "trace_level": <int>
 *         [, "benchmark_settings": "<token>"] }
 *
 * Optional title line:
 * TITLE { "title": "<text>" [, "info": "<text>"] }
 *
 * Optional wheel definition line:
 * WHEEL { "wheel_size": <u64>, "bits_per_wheel": <u64>, "base_size": <u64>,
 *         "repeats": <u64>, "wheel_max": <u64>, "map_count": <u32>,
 *         "map_numbers": [<u64>, ...], "map_bits": [<u64>, ...] }
 *
 * Step line (new inline-JSON format):
 * <annotation text> { "traceline": <u32>, "depth": <int>, "level": <int>,
 *     "operation": "<name>", "changed_bits": [<u32>, ...] }
 *
 * Mask step line (includes range and mask metadata in JSON):
 * <annotation text> { "traceline": <u32>, "depth": <int>, "level": <int>,
 *     "operation": "<name>", "start": <u64>, "stop": <u64>, "step": <u64>,
 *     "word_bits": <u64>, "word_start": <u64>, "word_stop": <u64>, "step_words": <u64>,
 *     "mask_bits": [<u32>, ...], "pattern_kind": "<name>", "pattern_slot_count": <u32>,
 *     "pattern_slot0_bits": [...], "mask_target_words": [...], "mask_target_slots": [...],
 *     "target_bits": [<u32>, ...], "changed_bits": [<u32>, ...] }
 *
 * Note: "target_bits" lists absolute bit indices that the mask operation
 *     intended to set (including bits already set before the operation).
 *     "changed_bits" lists only the bits that were actually newly set.
 *     The parser also accepts the legacy "function" key as an alias for "operation".
 *
 * Text step line (no changed bits):
 * <annotation text> { "traceline": <u32>, "depth": <int>, "level": <int>,
 *     "operation": "<name>" }
 *
 * All JSON fields are optional except "traceline".
 * The annotation text prefix is the human-readable description;
 * the parser uses it as the step annotation and infers missing fields from it.
 *
 * The visualizer infers start, stop, factor_step, and prime from annotation text
 * when not present in the JSON object.
 *
 * Memory dump supports both hex and binary payloads.
 */

#define TRACE_FORMAT_VERSION 7

#endif /* SIEVE_TRACE_FORMAT_H */

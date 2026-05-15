import { describe, it, expect } from 'vitest';
import { parseTrace } from '../traceParser.js';
import { inferMetaFromAnnotation } from '../maskMetadata.js';

// ---------------------------------------------------------------------------
// Minimal fixtures
// ---------------------------------------------------------------------------

/** Smallest valid JSON v7 trace: one event, no bits changed. */
const JSON_V7_MINIMAL = JSON.stringify({
  version: 7,
  sieve_size: 100,
  bit_count: 50,
  storage_model: 'half',
  events: [
    {
      operation: 'init',
      changed_bits: [],
    },
  ],
});

/** Minimal text-format trace (JSON TRACE header + one inline-JSON step line). */
const TEXT_TRACE_MINIMAL = [
  'TRACE { "version": 7, "format": "text", "sieve_size": 100, "bit_count": 100, "storage_model": "half" }',
  'Init step { "traceline": 1, "function": "Init", "changed_bits": [] }',
].join('\n');

/** Minimal text-format trace with no TRACE prefix on the header line. */
const TEXT_TRACE_MINIMAL_NO_PREFIX = [
  '{ "version": 7, "format": "text", "sieve_size": 100, "bit_count": 100, "storage_model": "half" }',
  'Init step { "traceline": 1, "function": "Init", "changed_bits": [] }',
].join('\n');

/** Text trace with a few changed bits. */
const TEXT_TRACE_WITH_BITS = [
  'TRACE { "version": 7, "format": "text", "sieve_size": 30, "bit_count": 15, "storage_model": "half" }',
  'Mark step { "traceline": 1, "function": "Mark", "changed_bits": [1,3,5] }',
].join('\n');

/** Text trace with a custom repeated wheel definition. */
const TEXT_TRACE_WITH_WHEEL = [
  'TRACE { "version": 7, "format": "text", "sieve_size": 240, "bit_count": 64, "storage_model": "wheeltesting" }',
  'WHEEL { "wheel_size": 240, "bits_per_wheel": 64, "base_size": 30, "repeats": 8, "wheel_max": 5, "map_count": 4, "map_numbers": [1,7,31,37], "map_bits": [0,1,8,9] }',
  'Mark wheel bits { "traceline": 1, "function": "Mark", "changed_bits": [0,8] }',
].join('\n');

/** Text trace with JSON-style TRACE/TITLE/WHEEL headers. */
const TEXT_TRACE_WITH_JSON_HEADERS = [
  'TRACE { "version": 7, "format": "text", "sieve_size": 240, "bit_count": 64, "storage_model": "wheeltesting", "trace_level": 9 }',
  'TITLE { "title": "JSON Header Trace", "info": "wheel json header" }',
  'WHEEL { "wheel_size": 240, "bits_per_wheel": 64, "base_size": 30, "repeats": 8, "wheel_max": 5, "map_count": 4, "map_numbers": [1,7,31,37], "map_bits": [0,1,8,9] }',
  'Mark step { "traceline": 1, "function": "Mark", "changed_bits": [0,8] }',
].join('\n');

/** Rust trace-mode fixture: one file per variant, with explicit target bits and zero-change attempts. */
const TEXT_TRACE_RUST_VARIANT = [
  'TRACE { "version": 7, "format": "text", "sieve_size": 50, "bit_count": 25, "max_number": 50, "storage_model": "half", "trace_level": 9, "benchmark_settings": "variant=bit-rotate" }',
  'TITLE { "title": "prime-sieve-rust - bit-rotate trace", "info": "variant=bit-rotate | max=50 | trace_level=9" }',
  'StorageModel: half',
  'SetBitsRange: variant bit-rotate prime 3 setting bits with step 3 in range 4-24 { "traceline": 1, "depth": 5, "level": 5, "function": "SetBitsRange", "prime": 3, "start": 4, "stop": 24, "factor_step": 3, "target_bits": [], "changed_bits": [] }',
  'SetBitTrue: variant bit-rotate prime 3 setting bit at index 4 number 9 with step 3 { "traceline": 2, "depth": 9, "level": 9, "function": "SetBitTrue", "prime": 3, "start": 4, "stop": 4, "factor_step": 3, "target_bits": [4], "changed_bits": [4] }',
  'SetBitTrue: variant bit-rotate prime 5 setting bit at index 22 number 45 with step 5 { "traceline": 3, "depth": 9, "level": 9, "function": "SetBitTrue", "prime": 5, "start": 22, "stop": 22, "factor_step": 5, "target_bits": [22], "changed_bits": [] }',
].join('\n');

// ---------------------------------------------------------------------------
// Type validation helpers
// ---------------------------------------------------------------------------

/**
 * Checks the normalized trace shape that parseTrace() must always return.
 * The output is `{ header, steps }` where:
 *   header.bitCount, header.storageModel, header.version — trace metadata
 *   steps — array of parsed event objects
 */
function assertTraceShape(trace) {
  expect(trace).toHaveProperty('header');
  expect(trace).toHaveProperty('steps');
  expect(Array.isArray(trace.steps)).toBe(true);
  expect(trace.header).toHaveProperty('bitCount');
  expect(typeof trace.header.bitCount).toBe('number');
  expect(trace.header).toHaveProperty('storageModel');
}

// ---------------------------------------------------------------------------
// JSON traces
// ---------------------------------------------------------------------------

describe('parseTrace — JSON v7', () => {
  it('parses a minimal v7 trace without throwing', () => {
    expect(() => parseTrace(JSON_V7_MINIMAL)).not.toThrow();
  });

  it('returns the normalised trace shape', () => {
    assertTraceShape(parseTrace(JSON_V7_MINIMAL));
  });

  it('accepts an ArrayBuffer input', () => {
    const buf = new TextEncoder().encode(JSON_V7_MINIMAL).buffer;
    expect(() => parseTrace(buf)).not.toThrow();
    assertTraceShape(parseTrace(buf));
  });

  it('returns the correct bitCount', () => {
    const trace = parseTrace(JSON_V7_MINIMAL);
    // storage_model=half: bitCount = sieve_size / 2 = 50
    expect(trace.header.bitCount).toBe(50);
  });

  it('steps array has at least one entry', () => {
    const trace = parseTrace(JSON_V7_MINIMAL);
    expect(trace.steps.length).toBeGreaterThanOrEqual(1);
  });
});


describe('parseTrace — JSON version validation', () => {
  it('throws for version < 7', () => {
    const bad = JSON.stringify({ version: 6, events: [] });
    expect(() => parseTrace(bad)).toThrow(/version/i);
  });

  it('throws for missing version field', () => {
    const bad = JSON.stringify({ events: [] });
    expect(() => parseTrace(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Text-format traces
// ---------------------------------------------------------------------------

describe('parseTrace — text format', () => {
  it('parses a minimal text trace without throwing', () => {
    expect(() => parseTrace(TEXT_TRACE_MINIMAL)).not.toThrow();
  });

  it('parses a minimal text trace whose first line has no TRACE prefix', () => {
    expect(() => parseTrace(TEXT_TRACE_MINIMAL_NO_PREFIX)).not.toThrow();
    const trace = parseTrace(TEXT_TRACE_MINIMAL_NO_PREFIX);
    expect(trace.header.storageModel).toBe('half');
    expect(trace.steps).toHaveLength(1);
  });

  it('returns the normalised trace shape', () => {
    assertTraceShape(parseTrace(TEXT_TRACE_MINIMAL));
  });

  it('parses changed_bits correctly', () => {
    const trace = parseTrace(TEXT_TRACE_WITH_BITS);
    const step = trace.steps[0];
    expect(step).toBeDefined();
    // changedBits is a Uint32Array
    expect(Array.from(step.changedBits)).toEqual(expect.arrayContaining([1, 3, 5]));
    expect(step.changedBits).toHaveLength(3);
  });

  it('sets storageModel from the TRACE header', () => {
    const trace = parseTrace(TEXT_TRACE_MINIMAL);
    expect(trace.header.storageModel).toBe('half');
  });

  it('parses wheel metadata and normalises wheel storage names', () => {
    const trace = parseTrace(TEXT_TRACE_WITH_WHEEL);
    expect(trace.header.storageModel).toBe('wheel');
    expect(trace.header.rawStorageModel).toBe('wheeltesting');
    expect(trace.header.wheel).toMatchObject({
      wheelSize: 240,
      bitsPerWheel: 64,
      baseSize: 30,
      repeats: 8,
      wheelMax: 5,
      mapCount: 4,
      mapNumbers: [1, 7, 31, 37],
      mapBits: [0, 1, 8, 9],
    });
  });

  it('parses JSON TRACE/TITLE/WHEEL headers', () => {
    const trace = parseTrace(TEXT_TRACE_WITH_JSON_HEADERS);
    expect(trace.header.storageModel).toBe('wheel');
    expect(trace.header.rawStorageModel).toBe('wheeltesting');
    expect(trace.header.traceLevel).toBe(9);
    expect(trace.header.title).toBe('JSON Header Trace');
    expect(trace.header.wheel).toMatchObject({
      wheelSize: 240,
      bitsPerWheel: 64,
      baseSize: 30,
      repeats: 8,
      wheelMax: 5,
      mapCount: 4,
      mapNumbers: [1, 7, 31, 37],
      mapBits: [0, 1, 8, 9],
    });
  });

  it('parses Rust variant trace metadata, target bits, and zero-change attempts', () => {
    const trace = parseTrace(TEXT_TRACE_RUST_VARIANT);
    expect(trace.header.traceLevel).toBe(9);
    expect(trace.header.storageModel).toBe('half');
    expect(trace.header.benchmarkSettings).toBe('variant=bit-rotate');

    const firstBit = trace.steps[1];
    expect(firstBit.operation).toBe('SetBitTrue');
    expect(firstBit.prime).toBe(3);
    expect(firstBit.start).toBe(4);
    expect(firstBit.stop).toBe(4);
    expect(firstBit.factorStep).toBe(3);
    expect(Array.from(firstBit.targetBits)).toEqual([4]);
    expect(Array.from(firstBit.changedBits)).toEqual([4]);

    const repeatedAttempt = trace.steps[2];
    expect(repeatedAttempt.prime).toBe(5);
    expect(repeatedAttempt.factorStep).toBe(5);
    expect(Array.from(repeatedAttempt.targetBits)).toEqual([22]);
    expect(Array.from(repeatedAttempt.changedBits)).toEqual([]);
    expect(repeatedAttempt.numChanged).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('parseTrace — error cases', () => {
  it('throws on empty input', () => {
    expect(() => parseTrace('')).toThrow(/empty/i);
  });

  it('throws on whitespace-only input', () => {
    expect(() => parseTrace('   \n  ')).toThrow(/empty/i);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseTrace('{bad json')).toThrow();
  });

  it('throws when the dev server app shell is returned instead of a trace', () => {
    expect(() => parseTrace('<!DOCTYPE html><html><body><div id="root"></div></body></html>')).toThrow(/HTML instead of a trace log/i);
  });

  it('throws for legacy text key-value traces', () => {
    const oldText = [
      'TRACE version=7 format=text sieve_size=100 bit_count=100 storage_model=half',
      'EVENT function="Init" changed_count=0 changed_bits=[]',
    ].join('\n');
    expect(() => parseTrace(oldText)).toThrow(/TRACE header must be JSON format/i);
  });
});

// ---------------------------------------------------------------------------
// inferMetaFromAnnotation — rangeKind detection
// ---------------------------------------------------------------------------

describe('inferMetaFromAnnotation — rangeKind', () => {
  it('returns rangeKind="bit" for annotations with "bitrange"', () => {
    expect(inferMetaFromAnnotation('applyMask bitrange 64-2687').rangeKind).toBe('bit');
  });

  it('returns rangeKind="bit" for annotations with "bit range"', () => {
    expect(inferMetaFromAnnotation('writing bit range 0-127').rangeKind).toBe('bit');
  });

  it('returns rangeKind="number" for "factor range" annotations', () => {
    expect(inferMetaFromAnnotation('setting factors step 14 in 9951 factor range (49-10000) for prime 7').rangeKind).toBe('number');
  });

  it('returns rangeKind="number" for "number range" annotations', () => {
    expect(inferMetaFromAnnotation('sieve numbers 2 to 100 number range 2-100').rangeKind).toBe('number');
  });

  it('returns rangeKind="byte" for "byte" annotations', () => {
    expect(inferMetaFromAnnotation('read 4 bytes 0-3').rangeKind).toBe('byte');
  });

  it('returns rangeKind="uint64" for uint64 annotations', () => {
    expect(inferMetaFromAnnotation('load uint64 words 0-3').rangeKind).toBe('uint64');
  });

  it('returns rangeKind="uint32" for uint32 annotations', () => {
    expect(inferMetaFromAnnotation('process uint32 chunk 8-15').rangeKind).toBe('uint32');
  });

  it('returns rangeKind="uint16" for uint16 annotations', () => {
    expect(inferMetaFromAnnotation('process uint16 range 0-7').rangeKind).toBe('uint16');
  });

  it('returns rangeKind="uint64v8" for uint64v8 vector annotations', () => {
    expect(inferMetaFromAnnotation('mask uint64v8 0-3').rangeKind).toBe('uint64v8');
  });

  it('returns rangeKind="uint32v4" for uint32v4 vector annotations', () => {
    expect(inferMetaFromAnnotation('mask uint32v4 0-3').rangeKind).toBe('uint32v4');
  });

  it('returns rangeKind="bit" (default) for unrecognised annotations', () => {
    expect(inferMetaFromAnnotation('init sieve 0-1000').rangeKind).toBe('bit');
    expect(inferMetaFromAnnotation('').rangeKind).toBe('bit');
    expect(inferMetaFromAnnotation(null).rangeKind).toBe('bit');
  });
});

// ---------------------------------------------------------------------------
// rangeKind on parsed steps
// ---------------------------------------------------------------------------

describe('parseTrace — rangeKind on steps', () => {
  it('sets rangeKind="bit" when JSON provides explicit start/stop (overrides annotation keyword)', () => {
    const trace = parseTrace([
      'TRACE { "version": 7, "format": "text", "sieve_size": 100, "bit_count": 50, "storage_model": "half" }',
      'setting factor range 49-100 { "traceline": 1, "function": "Mark", "start": 49, "stop": 99, "changed_bits": [] }',
    ].join('\n'));
    expect(trace.steps[0].rangeKind).toBe('bit');
  });

  it('sets rangeKind="number" when annotation says "factor range" and JSON has no start/stop', () => {
    const trace = parseTrace([
      'TRACE { "version": 7, "format": "text", "sieve_size": 100, "bit_count": 50, "storage_model": "half" }',
      'setting factor range 49-100 { "traceline": 1, "function": "Mark", "changed_bits": [] }',
    ].join('\n'));
    expect(trace.steps[0].rangeKind).toBe('number');
  });

  it('sets rangeKind="bit" for default annotation with no unit keyword', () => {
    const trace = parseTrace([
      'TRACE { "version": 7, "format": "text", "sieve_size": 100, "bit_count": 50, "storage_model": "half" }',
      'Init step { "traceline": 1, "function": "Init", "changed_bits": [] }',
    ].join('\n'));
    expect(trace.steps[0].rangeKind).toBe('bit');
  });

  it('focusStart is null for a number-range step with no explicit focus_start in JSON', () => {
    const trace = parseTrace([
      'TRACE { "version": 7, "format": "text", "sieve_size": 100, "bit_count": 50, "storage_model": "half" }',
      'setting factor range 49-100 { "traceline": 1, "function": "Mark", "changed_bits": [] }',
    ].join('\n'));
    // start=49 is a number, not a bit index — focusStart should be null
    expect(trace.steps[0].focusStart).toBeNull();
  });

  it('focusStart equals start for a bit-range step with no explicit focus_start', () => {
    const trace = parseTrace([
      'TRACE { "version": 7, "format": "text", "sieve_size": 100, "bit_count": 50, "storage_model": "half" }',
      'applyMask bitrange 4-24 { "traceline": 1, "function": "Mark", "changed_bits": [] }',
    ].join('\n'));
    expect(trace.steps[0].focusStart).toBe(4);
    expect(trace.steps[0].focusStop).toBe(24);
  });
});

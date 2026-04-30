import { describe, it, expect } from 'vitest';
import { parseTrace } from '../../traceParser.js';

// ---------------------------------------------------------------------------
// Minimal fixtures
// ---------------------------------------------------------------------------

/** Smallest valid JSON v3 trace: one event, no bits changed. */
const JSON_V3_MINIMAL = JSON.stringify({
  version: 3,
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

/** Tiny JSON v2 trace (legacy field names). */
const JSON_V2_MINIMAL = JSON.stringify({
  version: 2,
  sieve_size: 50,
  bit_count: 50,
  storage_model: 'default',
  steps: [
    {
      operation: 'init',
      changed_bits: [],
    },
  ],
});

/** Minimal text-format trace (version 7 header + one EVENT line). */
const TEXT_TRACE_MINIMAL = [
  'TRACE version=7 format=text sieve_size=100 bit_count=100 storage_model=half',
  'EVENT function="Init" changed_count=0 changed_bits=[]',
].join('\n');

/** Text trace with a few changed bits. */
const TEXT_TRACE_WITH_BITS = [
  'TRACE version=7 format=text sieve_size=30 bit_count=15 storage_model=half',
  'EVENT function="Mark" changed_count=3 changed_bits=[1,3,5]',
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

describe('parseTrace — JSON v3', () => {
  it('parses a minimal v3 trace without throwing', () => {
    expect(() => parseTrace(JSON_V3_MINIMAL)).not.toThrow();
  });

  it('returns the normalised trace shape', () => {
    assertTraceShape(parseTrace(JSON_V3_MINIMAL));
  });

  it('accepts an ArrayBuffer input', () => {
    const buf = new TextEncoder().encode(JSON_V3_MINIMAL).buffer;
    expect(() => parseTrace(buf)).not.toThrow();
    assertTraceShape(parseTrace(buf));
  });

  it('returns the correct bitCount', () => {
    const trace = parseTrace(JSON_V3_MINIMAL);
    // storage_model=half: bitCount = sieve_size / 2 = 50
    expect(trace.header.bitCount).toBe(50);
  });

  it('steps array has at least one entry', () => {
    const trace = parseTrace(JSON_V3_MINIMAL);
    expect(trace.steps.length).toBeGreaterThanOrEqual(1);
  });
});

describe('parseTrace — JSON v2', () => {
  it('parses a minimal v2 trace without throwing', () => {
    expect(() => parseTrace(JSON_V2_MINIMAL)).not.toThrow();
  });

  it('returns the normalised trace shape', () => {
    assertTraceShape(parseTrace(JSON_V2_MINIMAL));
  });
});

describe('parseTrace — JSON version validation', () => {
  it('throws for version < 2', () => {
    const bad = JSON.stringify({ version: 1, events: [] });
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
});

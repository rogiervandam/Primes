import { describe, it, expect } from 'vitest';
import {
  extractTitleMetadata,
  extractBenchmarkMetadata,
  parseBenchmarkOutputLine,
} from '../headerParser.js';

// ─── parseBenchmarkOutputLine ─────────────────────────────────────────────

describe('parseBenchmarkOutputLine', () => {
  it('parses a valid 4-field benchmark line', () => {
    const result = parseBenchmarkOutputLine('rogier-van-dam;40;5.002;1');
    expect(result).not.toBeNull();
    expect(result.label).toBe('rogier-van-dam');
    expect(result.iterations).toBe(40);
    expect(result.totalTime).toBeCloseTo(5.002);
    expect(result.threads).toBe(1);
    expect(result.tags).toEqual({});
    expect(result.summary).toContain('rogier-van-dam');
    expect(result.summary).toContain('40 passes');
  });

  it('parses a 5-field line with tags', () => {
    const result = parseBenchmarkOutputLine('label;10;1.5;2;algo=base,bits=8');
    expect(result).not.toBeNull();
    expect(result.tags).toEqual({ algo: 'base', bits: '8' });
  });

  it('returns null for null/empty input', () => {
    expect(parseBenchmarkOutputLine(null)).toBeNull();
    expect(parseBenchmarkOutputLine('')).toBeNull();
  });

  it('returns null when field count is wrong', () => {
    expect(parseBenchmarkOutputLine('a;b;c')).toBeNull();          // 3 fields
    expect(parseBenchmarkOutputLine('a;b;c;d;e;f')).toBeNull();    // 6 fields
  });

  it('returns null when numbers are not finite', () => {
    expect(parseBenchmarkOutputLine('label;NaN;1.0;1')).toBeNull();
    expect(parseBenchmarkOutputLine('label;10;Infinity;1')).toBeNull();
  });

  it('returns null when label is empty', () => {
    expect(parseBenchmarkOutputLine(';10;1.0;1')).toBeNull();
  });

  it('formats summary line correctly for plural threads', () => {
    const result = parseBenchmarkOutputLine('test;5;3.000;4');
    expect(result.summary).toContain('4 threads');
  });

  it('formats summary line correctly for singular thread', () => {
    const result = parseBenchmarkOutputLine('test;5;3.000;1');
    expect(result.summary).toContain('1 thread');
    expect(result.summary).not.toContain('1 threads');
  });
});

// ─── extractBenchmarkMetadata ─────────────────────────────────────────────

describe('extractBenchmarkMetadata', () => {
  it('finds a benchmark line at the end of an array', () => {
    const lines = [
      'TRACE version=3',
      'some-label;100;5.0;1',
    ];
    const result = extractBenchmarkMetadata(lines);
    expect(result).not.toBeNull();
    expect(result.label).toBe('some-label');
  });

  it('ignores TRACE/EVENT/STEP/TITLE/DUMP lines', () => {
    const lines = [
      'TRACE version=3',
      'TITLE foo',
      'EVENT op=sieve',
    ];
    expect(extractBenchmarkMetadata(lines)).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(extractBenchmarkMetadata([])).toBeNull();
  });

  it('picks the last valid benchmark line', () => {
    const lines = [
      'first-label;10;1.0;1',
      'second-label;20;2.0;2',
    ];
    const result = extractBenchmarkMetadata(lines);
    expect(result.label).toBe('second-label');
  });
});

// ─── extractTitleMetadata ─────────────────────────────────────────────────

describe('extractTitleMetadata', () => {
  it('extracts title from JSON TITLE line', () => {
    const lines = ['TITLE { "title": "My Sieve" }'];
    const result = extractTitleMetadata(lines);
    expect(result.title).toBe('My Sieve');
  });

  it('falls back to headerKv.title when no TITLE line', () => {
    const result = extractTitleMetadata([], { title: 'Header Title' });
    expect(result.title).toBe('Header Title');
  });

  it('extracts subtitle from JSON TITLE line', () => {
    const lines = ['TITLE { "subtitle": "Fast Variant" }'];
    const result = extractTitleMetadata(lines);
    expect(result.subtitle).toBe('Fast Variant');
  });

  it('extracts title and info from JSON TITLE line', () => {
    const lines = ['TITLE { "title": "JSON Title", "info": "JSON Info" }'];
    const result = extractTitleMetadata(lines);
    expect(result.title).toBe('JSON Title');
    expect(result.info).toEqual(expect.arrayContaining(['JSON Info']));
  });

  it('ignores legacy non-JSON TITLE lines', () => {
    const lines = [
      'TITLE title="Old Style"',
      'TITLE info="Legacy Info"',
    ];
    const result = extractTitleMetadata(lines);
    expect(result.title).toBeNull();
    expect(result.info).toEqual([]);
  });

  it('returns null title/subtitle when nothing is provided', () => {
    const result = extractTitleMetadata([]);
    expect(result.title).toBeNull();
    expect(result.subtitle).toBeNull();
    expect(result.info).toEqual([]);
  });
});

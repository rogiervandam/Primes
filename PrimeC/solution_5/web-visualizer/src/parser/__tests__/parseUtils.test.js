import { describe, it, expect } from 'vitest';
import {
  firstDefined,
  toNumberOr,
  toNullableNumber,
  parseKvLine,
  firstExactAliasValue,
  firstAliasValue,
  parseChangedBits,
  parseIntegerList,
  sanitizeOperationToken,
  dedupeStrings,
  collectTitleInfo,
  normalizeBitCountForStorage,
  isAnalysisEndLine,
} from '../parseUtils';

// ─── firstDefined ────────────────────────────────────────────────────────────

describe('firstDefined', () => {
  it('returns the first non-null, non-undefined value', () => {
    expect(firstDefined(null, undefined, 0)).toBe(0);
    expect(firstDefined(undefined, null, 'a', 'b')).toBe('a');
  });
  it('returns null when all are null/undefined', () => {
    expect(firstDefined(null, undefined)).toBe(null);
    expect(firstDefined()).toBe(null);
  });
  it('treats 0 and false as valid values', () => {
    expect(firstDefined(null, 0)).toBe(0);
    expect(firstDefined(null, false)).toBe(false);
  });
});

// ─── toNumberOr ──────────────────────────────────────────────────────────────

describe('toNumberOr', () => {
  it('converts numeric strings', () => {
    expect(toNumberOr('42', -1)).toBe(42);
    expect(toNumberOr('3.14', 0)).toBeCloseTo(3.14);
  });
  it('returns fallback for non-numeric input', () => {
    expect(toNumberOr('abc', -1)).toBe(-1);
    // Note: Number(null) === 0 (finite), so toNumberOr(null, 5) returns 0, not 5.
    // Use NaN or an actual non-numeric string to trigger the fallback path.
    expect(toNumberOr(NaN, 5)).toBe(5);
    expect(toNumberOr(undefined, 7)).toBe(7);
  });
  it('returns fallback for Infinity', () => {
    expect(toNumberOr(Infinity, -1)).toBe(-1);
  });
  it('converts numeric values directly', () => {
    expect(toNumberOr(100, 0)).toBe(100);
  });
});

// ─── toNullableNumber ────────────────────────────────────────────────────────

describe('toNullableNumber', () => {
  it('returns null for null/undefined', () => {
    expect(toNullableNumber(null)).toBeNull();
    expect(toNullableNumber(undefined)).toBeNull();
  });
  it('returns null for the literal string "null"', () => {
    expect(toNullableNumber('null')).toBeNull();
    expect(toNullableNumber('NULL')).toBeNull();
  });
  it('converts valid numbers', () => {
    expect(toNullableNumber('42')).toBe(42);
    expect(toNullableNumber(3.14)).toBeCloseTo(3.14);
  });
  it('returns null for non-numeric strings', () => {
    expect(toNullableNumber('abc')).toBeNull();
  });
});

// ─── parseKvLine ─────────────────────────────────────────────────────────────

describe('parseKvLine', () => {
  it('parses simple key=value pairs', () => {
    expect(parseKvLine('start=0 stop=100')).toEqual({ start: '0', stop: '100' });
  });
  it('parses quoted values with spaces', () => {
    expect(parseKvLine('label="hello world"')).toEqual({ label: 'hello world' });
  });
  it('handles escape sequences inside quotes', () => {
    const result = parseKvLine('msg="line1\\nline2"');
    expect(result.msg).toBe('line1\nline2');
  });
  it('handles \\t and \\\\ escapes', () => {
    expect(parseKvLine('v="a\\tb"').v).toBe('a\tb');
    expect(parseKvLine('v="a\\\\b"').v).toBe('a\\b');
  });
  it('parses bracket-wrapped lists', () => {
    const result = parseKvLine('bits=[1,2,3]');
    expect(result.bits).toBe('[1,2,3]');
  });
  it('returns empty object for empty string', () => {
    expect(parseKvLine('')).toEqual({});
  });
  it('parses multiple pairs in one call', () => {
    const result = parseKvLine('a=1 b=2 c=3');
    expect(result).toEqual({ a: '1', b: '2', c: '3' });
  });
});

// ─── firstExactAliasValue ────────────────────────────────────────────────────

describe('firstExactAliasValue', () => {
  it('returns the value of the first alias found (own property)', () => {
    const obj = { stop: 99 };
    expect(firstExactAliasValue(obj, ['start', 'stop'], null)).toBe(99);
  });
  it('returns fallback when no alias found', () => {
    expect(firstExactAliasValue({}, ['start', 'stop'], 'fallback')).toBe('fallback');
  });
  it('does not walk the prototype chain', () => {
    const obj = Object.create({ start: 1 });
    expect(firstExactAliasValue(obj, ['start'], null)).toBe(null);
  });
});

// ─── firstAliasValue ─────────────────────────────────────────────────────────

describe('firstAliasValue', () => {
  it('returns value for direct key match', () => {
    expect(firstAliasValue({ start: 5 }, ['start', 'init'], null)).toBe(5);
  });
  it('falls back to case-insensitive substring match', () => {
    const obj = { block_start_x: 10 };
    expect(firstAliasValue(obj, ['start'], null)).toBe(10);
  });
  it('returns fallback for null object', () => {
    expect(firstAliasValue(null, ['start'], 'fb')).toBe('fb');
  });
  it('returns fallback when nothing matches', () => {
    expect(firstAliasValue({ foo: 1 }, ['start'], -1)).toBe(-1);
  });
});

// ─── parseChangedBits ────────────────────────────────────────────────────────

describe('parseChangedBits', () => {
  it('parses a bracketed list', () => {
    expect(parseChangedBits('[0,1,2]')).toEqual([0, 1, 2]);
  });
  it('parses without brackets', () => {
    expect(parseChangedBits('3,5,7')).toEqual([3, 5, 7]);
  });
  it('returns empty array for null / empty string', () => {
    expect(parseChangedBits(null)).toEqual([]);
    expect(parseChangedBits('')).toEqual([]);
    expect(parseChangedBits('[]')).toEqual([]);
  });
  it('filters out non-finite or negative values', () => {
    expect(parseChangedBits('[1,-1,abc,3]')).toEqual([1, 3]);
  });
  it('handles spaces around commas', () => {
    expect(parseChangedBits('[1, 2 ,3]')).toEqual([1, 2, 3]);
  });
});

// ─── parseIntegerList ────────────────────────────────────────────────────────

describe('parseIntegerList', () => {
  it('parses a bracketed comma list', () => {
    expect(parseIntegerList('[1,2,3]')).toEqual([1, 2, 3]);
  });
  it('parses a plain whitespace-separated string', () => {
    expect(parseIntegerList('4 5 6')).toEqual([4, 5, 6]);
  });
  it('parses a semicolon-separated string', () => {
    expect(parseIntegerList('1;2;3')).toEqual([1, 2, 3]);
  });
  it('parses a real array of numbers', () => {
    expect(parseIntegerList([10, 20])).toEqual([10, 20]);
  });
  it('parses an array of numeric strings', () => {
    expect(parseIntegerList(['1', '2'])).toEqual([1, 2]);
  });
  it('returns empty array for null', () => {
    expect(parseIntegerList(null)).toEqual([]);
  });
  it('filters out non-finite values', () => {
    expect(parseIntegerList('1 abc 3')).toEqual([1, 3]);
  });
});

// ─── sanitizeOperationToken ──────────────────────────────────────────────────

describe('sanitizeOperationToken', () => {
  it('trims whitespace', () => {
    expect(sanitizeOperationToken('  hello  ')).toBe('hello');
  });
  it('strips surrounding double quotes', () => {
    expect(sanitizeOperationToken('"hello"')).toBe('hello');
    expect(sanitizeOperationToken('""hello""')).toBe('hello');
  });
  it('collapses internal whitespace', () => {
    expect(sanitizeOperationToken('a  b  c')).toBe('a b c');
  });
  it('returns null for empty / whitespace-only input', () => {
    expect(sanitizeOperationToken('')).toBeNull();
    expect(sanitizeOperationToken('   ')).toBeNull();
    expect(sanitizeOperationToken(null)).toBeNull();
  });
});

// ─── dedupeStrings ───────────────────────────────────────────────────────────

describe('dedupeStrings', () => {
  it('removes duplicates while preserving order', () => {
    expect(dedupeStrings(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
  it('trims each entry', () => {
    expect(dedupeStrings([' a ', 'b'])).toEqual(['a', 'b']);
  });
  it('skips empty strings', () => {
    expect(dedupeStrings(['', 'a', ''])).toEqual(['a']);
  });
  it('returns empty array for empty input', () => {
    expect(dedupeStrings([])).toEqual([]);
  });
});

// ─── collectTitleInfo ────────────────────────────────────────────────────────

describe('collectTitleInfo', () => {
  it('splits on |', () => {
    expect(collectTitleInfo('a | b | c')).toEqual(['a', 'b', 'c']);
  });
  it('splits on ;', () => {
    expect(collectTitleInfo('x ; y')).toEqual(['x', 'y']);
  });
  it('handles nested arrays recursively', () => {
    expect(collectTitleInfo(['a', 'b|c'])).toEqual(['a', 'b', 'c']);
  });
  it('returns empty array for null/empty', () => {
    expect(collectTitleInfo(null)).toEqual([]);
    expect(collectTitleInfo('')).toEqual([]);
  });
  it('filters blank segments', () => {
    expect(collectTitleInfo('a | | b')).toEqual(['a', 'b']);
  });
});

// ─── normalizeBitCountForStorage ─────────────────────────────────────────────

describe('normalizeBitCountForStorage', () => {
  it('returns bitCount directly for non-half models', () => {
    expect(normalizeBitCountForStorage('full', 100, 200, 300)).toBe(100);
    expect(normalizeBitCountForStorage('wheel', 80, 200, 300)).toBe(80);
  });
  it('uses ceil(maxNumber/2) for half storage', () => {
    expect(normalizeBitCountForStorage('half', 0, 100, 200)).toBe(50);
  });
  it('falls back to sieveSize when maxNumber is missing', () => {
    expect(normalizeBitCountForStorage('half', 0, 0, 200)).toBe(100);
  });
  it('returns bitCount for half when no size reference', () => {
    expect(normalizeBitCountForStorage('half', 50, 0, 0)).toBe(50);
  });
  it('treats missing storageModel as half', () => {
    expect(normalizeBitCountForStorage(null, 0, 100, 200)).toBe(50);
    expect(normalizeBitCountForStorage(undefined, 0, 100, 0)).toBe(50);
  });
});

// ─── isAnalysisEndLine ───────────────────────────────────────────────────────

describe('isAnalysisEndLine', () => {
  it('matches endanalysis', () => {
    expect(isAnalysisEndLine('endanalysis')).toBe(true);
  });
  it('matches analysis_end', () => {
    expect(isAnalysisEndLine('analysis_end')).toBe(true);
  });
  it('matches trace_analysis_end', () => {
    expect(isAnalysisEndLine('trace_analysis_end')).toBe(true);
  });
  it('is case-insensitive', () => {
    expect(isAnalysisEndLine('EndAnalysis')).toBe(true);
    expect(isAnalysisEndLine('ANALYSIS_END')).toBe(true);
  });
  it('returns false for unrelated strings', () => {
    expect(isAnalysisEndLine('start')).toBe(false);
    expect(isAnalysisEndLine('')).toBe(false);
    expect(isAnalysisEndLine(null)).toBe(false);
  });
});

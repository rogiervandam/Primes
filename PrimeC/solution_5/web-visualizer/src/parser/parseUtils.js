/**
 * Pure utility helpers used throughout the trace parser.
 *
 * These are dependency-free string/number normalisers and key/value
 * extractors. Splitting them out keeps `traceParser.js` focused on the
 * actual trace dialect parsing logic.
 */

/** Trace format version assumed for free-form fallbacks. */
export const TRACE_FALLBACK_VERSION = 4;

// Aliases used when reading key/value lines. Different writers use slightly
// different field names; the parser accepts any of the listed names.
export const START_ALIASES = [
  'start', 'init', 'block_start', 'range_start', 'start_block', 'begin',
];
export const STOP_ALIASES = [
  'stop', 'block_stop', 'stop_block', 'end', 'range_stop', 'finish',
];
export const EVENT_INDEX_ALIASES = [
  'event_id', 'event', 'index', 'ordinal', 'sequence',
];
export const FACTOR_STEP_ALIASES = [
  'factor_step', 'step_size', 'stride', 'inc', 'increment', 'stap',
];

/** Return the first non-null/undefined value, or `null`. */
export function firstDefined(...vals) {
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] !== undefined && vals[i] !== null) return vals[i];
  }
  return null;
}

/** Coerce to a finite number, falling back to `fallback` when invalid. */
export function toNumberOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to a finite number or `null`. Treats the literal string `'null'` as null. */
export function toNullableNumber(v) {
  if (v == null) return null;
  if (typeof v === 'string' && v.toLowerCase() === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a single `key=value [key=value ...]` line into an object.
 * Quoted values support `\n`, `\r`, `\t`, `\"`, and `\\` escapes.
 */
export function parseKvLine(text) {
  const kv = {};
  const re = /(\w+)=("(?:\\.|[^"])*"|\[[^\]]*\]|[^\s]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1];
    let raw = m[2];
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    kv[key] = raw;
  }
  return kv;
}

/** Look up the first alias key present (using `hasOwnProperty`) on `obj`. */
export function firstExactAliasValue(obj, aliases, fallback) {
  for (let i = 0; i < aliases.length; i++) {
    const key = aliases[i];
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  }
  return fallback;
}

/** Look up the first alias key present in `obj`, treating `null`/`undefined` as missing.
 *  Falls back to a case-insensitive substring match against the alias names. */
export function firstAliasValue(obj, aliases, fallback) {
  if (!obj) return fallback;
  for (let i = 0; i < aliases.length; i++) {
    const key = aliases[i];
    if (obj[key] !== undefined) return obj[key];
  }

  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i].toLowerCase();
    if (aliases.some((a) => k.includes(a))) return obj[keys[i]];
  }

  return fallback;
}

/** Parse a comma-separated `[1,2,3]` style list into a finite-number array. */
export function parseChangedBits(raw) {
  if (!raw || raw === '[]') return [];
  const cleaned = raw.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!cleaned) return [];
  return cleaned
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

/**
 * Parse a list of integers from either an array or a separator-delimited
 * string (whitespace, comma, or semicolon).
 */
export function parseIntegerList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const cleaned = String(raw)
    .replace(/^\[/, '')
    .replace(/\]$/, '');
  return cleaned
    .split(/[\s,;]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

/** Trim/collapse whitespace and strip surrounding double quotes from `token`. */
export function sanitizeOperationToken(token) {
  const cleaned = String(token || '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/\s+/g, ' ');
  if (!cleaned) return null;
  return cleaned;
}

/** Deduplicate a list of strings while preserving order; trims each entry. */
export function dedupeStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = String(value || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Split a free-form title/info field on `|` or `;` into a deduped, trimmed
 * list of segments. Recursively handles arrays of values.
 */
export function collectTitleInfo(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.flatMap((value) => collectTitleInfo(value));
  const text = String(raw).trim();
  if (!text) return [];
  return text.split(/\s*\|\s*|\s*;\s*/).map((value) => value.trim()).filter(Boolean);
}

/** Convert trace storage model names to renderer-supported keys. */
export function normalizeStorageModelName(storageModel) {
  const mode = String(storageModel || 'half').trim().toLowerCase();
  if (!mode || mode === 'default') return 'half';
  if (mode.startsWith('wheel')) return 'wheel';
  return mode;
}

/**
 * Adjust the reported bit count to match the storage model. For half
 * storage we use ceil(maxNumber/2) when the recorded count is missing.
 */
export function normalizeBitCountForStorage(storageModel, bitCount, maxNumber, sieveSize) {
  const mode = String(storageModel || 'half').toLowerCase();
  const parsedBitCount = toNumberOr(bitCount, 0);
  if (mode !== 'half') return parsedBitCount;

  const parsedMaxNumber = toNumberOr(maxNumber, 0);
  const parsedSieveSize = toNumberOr(sieveSize, 0);
  const sourceMax = parsedMaxNumber > 0 ? parsedMaxNumber : parsedSieveSize;
  if (sourceMax <= 0) return parsedBitCount;

  // Half storage keeps odd numbers only, so capacity follows half of max range.
  return Math.max(1, Math.ceil(sourceMax / 2));
}

/** True if `line` looks like a trace-analysis end marker. */
export function isAnalysisEndLine(line) {
  return /endanalysis|analysis_end|trace_analysis_end/i.test(String(line || ''));
}

/**
 * Trace header → display sections.
 *
 * The trace header is a heterogeneous bag of values (some structured,
 * some free-text "info lines"). This module folds it into a small set
 * of canonical sections (`File`, `Run`, `Settings`, `Notes`) that the
 * trace-info popover renders verbatim.
 */

// Recognized canonical keys for each section.
const RUN_KEYS = new Set([
  'max', 'max_number', 'maxnumber', 'factor_max',
  'bits', 'bit_count', 'bitcount',
  'events', 'step_count', 'stepcount',
  'storage', 'storage_model', 'storagemodel',
  'trace_level', 'tracelevel',
  'threads', 'duration', 'elapsed',
  'version', 'v',
]);

const SETTINGS_KEYS = new Set(['settings', 'benchmark_settings', 'benchmarksettings']);

const PRETTY_LABELS = {
  max: 'Max', max_number: 'Max', maxnumber: 'Max', factor_max: 'Max',
  bits: 'Bits', bit_count: 'Bits', bitcount: 'Bits',
  events: 'Events', step_count: 'Events', stepcount: 'Events',
  storage: 'Storage', storage_model: 'Storage', storagemodel: 'Storage',
  trace_level: 'Trace level', tracelevel: 'Trace level',
  threads: 'Threads', duration: 'Duration', elapsed: 'Elapsed',
  version: 'Version', v: 'Version',
  settings: 'Settings', benchmark_settings: 'Settings', benchmarksettings: 'Settings',
};

/** Parse a single info line into `{label, value}`, or null. */
function parseKeyValue(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const colonEq = text.match(/^\s*([^:=]+?)\s*[:=]\s*(.+?)\s*$/);
  if (colonEq) return { label: colonEq[1].trim(), value: colonEq[2].trim() };
  // "Storage half", "Max 1000", "v5"
  const labelSpace = text.match(/^\s*(Storage|Max|Bits|Events|Settings|Trace level|Version)\s+(.+)\s*$/i);
  if (labelSpace) return { label: labelSpace[1], value: labelSpace[2] };
  if (/^v\d/i.test(text)) return { label: 'Version', value: text.replace(/^v/i, '') };
  return null;
}

const canonicalize = (label) => String(label || '').trim().toLowerCase().replace(/\s+/g, '_');

/** Canonical value used for dedup: strip grouping separators on numerics. */
const canonicalValue = (value) => {
  const text = String(value || '').trim();
  if (/^-?\d[\d,._\s]*$/.test(text)) return text.replace(/[,_\s]/g, '');
  return text.toLowerCase();
};

const prettyLabel = (canon, fallback) => PRETTY_LABELS[canon] || fallback;

/**
 * Compute the "trace info" popover sections from the parsed header.
 * Returns an array of `{title, rows: [{label, value}]}` with empty
 * sections filtered out.
 */
export function buildTraceInfoSections(header, fileName) {
  const items = [];
  if (fileName) items.push({ label: 'File', value: fileName });
  if (header?.subtitle) items.push({ label: 'Subtitle', value: header.subtitle });
  if (Array.isArray(header?.infoLines)) {
    for (const line of header.infoLines) {
      const kv = parseKeyValue(line);
      if (kv) items.push(kv);
      else items.push({ label: 'Info', value: String(line) });
    }
  }
  if (header?.maxNumber != null) items.push({ label: 'Max', value: String(header.maxNumber) });
  if (header?.storageModel) items.push({ label: 'Storage', value: header.storageModel });
  if (header?.traceLevel != null) items.push({ label: 'Trace level', value: String(header.traceLevel) });
  if (header?.bitCount != null) items.push({ label: 'Bits', value: String(header.bitCount) });
  if (header?.stepCount != null) items.push({ label: 'Events', value: String(header.stepCount) });
  if (header?.version != null) items.push({ label: 'Version', value: String(header.version) });

  // Dedupe by canonical (label, value), preserving insertion order.
  const seen = new Set();
  const deduped = [];
  for (const kv of items) {
    const canonLabel = canonicalize(kv.label);
    const canonVal = canonicalValue(kv.value);
    const key = `${canonLabel}=${canonVal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = prettyLabel(canonLabel, kv.label);
    // Format numerics with commas when display label is friendly.
    let displayValue = kv.value;
    if (/^-?\d+$/.test(String(kv.value))) {
      const n = Number(kv.value);
      if (Number.isFinite(n) && Math.abs(n) >= 1000) displayValue = n.toLocaleString();
    }
    deduped.push({ label, canonLabel, value: displayValue });
  }

  const file = [];
  const run = [];
  const settings = [];
  const extra = [];
  for (const kv of deduped) {
    if (kv.canonLabel === 'file' || kv.canonLabel === 'subtitle') { file.push(kv); continue; }
    if (SETTINGS_KEYS.has(kv.canonLabel)) { settings.push(kv); continue; }
    if (RUN_KEYS.has(kv.canonLabel)) { run.push(kv); continue; }
    extra.push(kv);
  }

  return [
    { title: 'File', rows: file },
    { title: 'Run', rows: run },
    { title: 'Settings', rows: settings },
    { title: 'Notes', rows: extra },
  ].filter((section) => section.rows.length > 0);
}

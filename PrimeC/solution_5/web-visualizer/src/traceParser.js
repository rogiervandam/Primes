/**
 * Sieve Trace File Parser
 *
 * Parses .sievetrace JSON files produced by PrimeC solution_5 trace system.
 * Supports format versions 2 (legacy) and 3 (with rich metadata).
 * Also supports "dump" type: a single memory snapshot in hex or binary format.
 */

export function parseTrace(buffer) {
  let text;
  if (typeof buffer === 'string') {
    text = buffer;
  } else if (buffer instanceof ArrayBuffer) {
    text = new TextDecoder('utf-8').decode(buffer);
  } else if (buffer.buffer instanceof ArrayBuffer) {
    text = new TextDecoder('utf-8').decode(buffer);
  } else {
    throw new Error('Invalid buffer type');
  }

  const trimmed = text.trim();
  if (!trimmed) throw new Error('Invalid trace file: empty input');

  if (trimmed[0] === '{' || trimmed[0] === '[') {
    return parseJsonTrace(trimmed);
  }

  return parseTextTrace(trimmed);
}

function parseJsonTrace(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid trace file: not valid JSON — ' + e.message);
  }

  if (!json.version || json.version < 2) {
    throw new Error(
      `Unsupported trace version: ${json.version}. Expected version >= 2.`
    );
  }

  // Handle memory dump format
  if (json.type === 'dump') {
    return parseDump(json);
  }

  const rawSteps = json.steps || [];

  const header = {
    version: json.version,
    sieveSize: json.sieve_size,
    bitCount: json.bit_count,
    maxNumber: json.max_number ?? json.sieve_size,
    stepCount: rawSteps.length,
    storageModel: json.storage_model || 'half',
  };

  const steps = rawSteps.map((s) => {
    const inferred = inferMetaFromAnnotation(s.annotation || '');
    const start = toNullableNumber(
      firstDefined(s.start, s.block_start, s.init, inferred.start)
    );
    const stop = toNullableNumber(
      firstDefined(s.stop, s.block_stop, s.end, s.stop_block, inferred.stop)
    );
    const factorStep = toNullableNumber(
      firstDefined(s.factor_step, s.step, s.stride, s.inc, inferred.factorStep)
    );

    return {
    stepId: s.step,
    annotation: s.annotation || '',
    operation: s.operation || null,
    prime: s.prime ?? null,
    start,
    stop,
    factorStep,
    changedBits: new Uint32Array(s.changed_bits || []),
    numChanged: (s.changed_bits || []).length,
    // Hierarchy / nesting support (dynamic depth levels)
    depth: Math.max(0, s.depth ?? s.call_depth ?? 0),
    operationPath: Array.isArray(s.operation_path)
      ? s.operation_path.filter(Boolean)
      : (s.operation ? [s.operation] : []),
    parentId: s.parent_id ?? s.parentId ?? null,
  }});

  return { header, steps };
}

function parseTextTrace(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error('Invalid trace file: empty text log');

  const headerLine = lines.find((l) => l.startsWith('TRACE '));
  const headerKv = headerLine ? parseKvLine(headerLine.slice('TRACE '.length)) : {};

  if (lines.some((l) => l.startsWith('DUMP '))) {
    const dumpLine = lines.find((l) => l.startsWith('DUMP '));
    const kv = parseKvLine(dumpLine.slice('DUMP '.length));
    const dumpJson = {
      version: toNumberOr(kv.version, TRACE_FALLBACK_VERSION),
      type: 'dump',
      sieve_size: toNumberOr(kv.sieve_size, 0),
      bit_count: toNumberOr(kv.bit_count, 0),
      max_number: toNumberOr(firstDefined(kv.max_number, kv.sieve_size), 0),
      format: (kv.format || 'hex').toLowerCase(),
      data: kv.data || '',
    };
    return parseDump(dumpJson);
  }

  const stepLines = lines.filter((l) => l.startsWith('STEP '));
  const steps = stepLines.map((line, idx) => {
    const kv = parseKvLine(line.slice('STEP '.length));
    const inferred = inferMetaFromAnnotation(kv.annotation || '');

    const start = toNullableNumber(
      firstAliasValue(kv, START_ALIASES, inferred.start)
    );
    const stop = toNullableNumber(
      firstAliasValue(kv, STOP_ALIASES, inferred.stop)
    );
    const factorStep = toNullableNumber(
      firstAliasValue(kv, STEP_ALIASES, inferred.factorStep)
    );

    const changedBits = parseChangedBits(kv.changed_bits || '');
    const operation = kv.op || kv.operation || 'Initialization';
    const operationPath = Array.isArray(kv.operation_path)
      ? kv.operation_path
      : (kv.operation_path ? String(kv.operation_path).split('/').map((s) => s.trim()).filter(Boolean) : [operation]);

    return {
      stepId: toNumberOr(kv.step, idx),
      annotation: kv.annotation || '',
      operation,
      prime: toNullableNumber(kv.prime),
      start,
      stop,
      factorStep,
      changedBits: new Uint32Array(changedBits),
      numChanged: changedBits.length,
      depth: Math.max(0, toNumberOr(firstDefined(kv.depth, kv.call_depth), 0)),
      operationPath,
      parentId: toNullableNumber(firstDefined(kv.parent_id, kv.parentId)),
    };
  });

  const header = {
    version: toNumberOr(headerKv.version, TRACE_FALLBACK_VERSION),
    sieveSize: toNumberOr(headerKv.sieve_size, 0),
    bitCount: toNumberOr(headerKv.bit_count, 0),
    maxNumber: toNumberOr(firstDefined(headerKv.max_number, headerKv.sieve_size), 0),
    stepCount: steps.length,
    storageModel: headerKv.storage_model || 'half',
  };

  return { header, steps };
}

const TRACE_FALLBACK_VERSION = 4;

const START_ALIASES = [
  'start', 'init', 'block_start', 'range_start', 'start_block', 'begin',
];
const STOP_ALIASES = [
  'stop', 'block_stop', 'stop_block', 'end', 'range_stop', 'finish',
];
const STEP_ALIASES = [
  'factor_step', 'step', 'stride', 'inc', 'increment', 'stap',
];

function firstDefined(...vals) {
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] !== undefined && vals[i] !== null) return vals[i];
  }
  return null;
}

function toNumberOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(v) {
  if (v == null) return null;
  if (typeof v === 'string' && v.toLowerCase() === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseKvLine(text) {
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

function parseChangedBits(raw) {
  if (!raw || raw === '[]') return [];
  const cleaned = raw.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!cleaned) return [];
  return cleaned
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function firstAliasValue(obj, aliases, fallback) {
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

function inferMetaFromAnnotation(annotation) {
  const text = String(annotation || '');
  const lower = text.toLowerCase();
  const out = { start: null, stop: null, factorStep: null };

  const range = lower.match(/(\d+)\s*(?:-|\.\.|to)\s*(\d+)/);
  if (range) {
    out.start = Number(range[1]);
    out.stop = Number(range[2]);
  }

  out.start = firstAliasNumberInText(text, START_ALIASES, out.start);
  out.stop = firstAliasNumberInText(text, STOP_ALIASES, out.stop);
  out.factorStep = firstAliasNumberInText(text, STEP_ALIASES, out.factorStep);

  return out;
}

function firstAliasNumberInText(text, aliases, fallback) {
  for (let i = 0; i < aliases.length; i++) {
    const a = aliases[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:\\b${a}\\b|${a}\\s*[:=])\\s*[:=]?\\s*(-?\\d+)`, 'i');
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return fallback;
}

/**
 * Parse a memory dump format trace file.
 * Converts hex/binary data into a single step with all set bits.
 */
function parseDump(json) {
  const bitCount = json.bit_count;
  const data = json.data || '';
  const format = json.format || 'hex';

  // Decode data into bytes
  let bytes;
  if (format === 'hex') {
    const len = Math.floor(data.length / 2);
    bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = parseInt(data.substr(i * 2, 2), 16);
    }
  } else if (format === 'binary') {
    const len = Math.ceil(data.length / 8);
    bytes = new Uint8Array(len);
    for (let i = 0; i < data.length; i++) {
      if (data[i] === '1') {
        bytes[Math.floor(i / 8)] |= (1 << (i % 8));
      }
    }
  } else {
    throw new Error(`Unsupported dump format: ${format}`);
  }

  // Extract all set bit indices
  const setBits = [];
  for (let byteIdx = 0; byteIdx < bytes.length; byteIdx++) {
    let b = bytes[byteIdx];
    for (let bit = 0; b; bit++, b >>= 1) {
      if (b & 1) {
        const idx = byteIdx * 8 + bit;
        if (idx < bitCount) setBits.push(idx);
      }
    }
  }

  const header = {
    version: json.version,
    sieveSize: json.sieve_size,
    bitCount: bitCount,
    maxNumber: json.max_number ?? json.sieve_size,
    stepCount: 1,
    type: 'dump',
  };

  const steps = [{
    stepId: 0,
    annotation: 'Memory dump',
    operation: 'dump',
    prime: null,
    start: null,
    stop: null,
    factorStep: null,
    changedBits: new Uint32Array(setBits),
    numChanged: setBits.length,
  }];

  return { header, steps };
}

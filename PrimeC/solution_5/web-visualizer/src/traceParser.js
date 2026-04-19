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

    const inferredOp = inferOperationFromAnnotation(s.annotation || '');

    return {
    stepId: s.step,
    annotation: s.annotation || '',
    operation: (s.operation && s.operation !== 'Initialization') ? s.operation : inferredOp,
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

  inferMissingPrimes(steps, header.storageModel);
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
  if (stepLines.length === 0) {
    return parseFreeformTextTrace(lines, headerKv);
  }

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
    const operation = kv.op || kv.operation || inferOperationFromAnnotation(kv.annotation || '');
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

  inferMissingPrimes(steps, header.storageModel);
  return { header, steps };
}

function parseFreeformTextTrace(lines, headerKv = {}) {
  const header = {
    version: toNumberOr(headerKv.version, TRACE_FALLBACK_VERSION),
    sieveSize: toNumberOr(headerKv.sieve_size, 0),
    bitCount: toNumberOr(headerKv.bit_count, 0),
    maxNumber: toNumberOr(firstDefined(headerKv.max_number, headerKv.sieve_size), 0),
    stepCount: 0,
    storageModel: headerKv.storage_model || 'half',
  };

  const steps = [];
  const opStack = [];
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('TRACE ') || line.startsWith('DUMP ')) continue;

    const startEvent = parseAnalysisStartLine(line);
    if (startEvent) {
      const opName = startEvent.operation || 'analysis';
      const inferred = inferMetaFromAnnotation(line);
      steps.push(createParsedStep({
        rawStepId: steps.length,
        annotation: line,
        operation: opName,
        prime: startEvent.prime,
        start: inferred.start,
        stop: inferred.stop,
        factorStep: inferred.factorStep,
        changedBits: [],
        depth,
        operationPath: [...opStack, opName],
      }));

      opStack.push(opName);
      depth += 1;
      continue;
    }

    if (isAnalysisEndLine(line)) {
      if (depth > 0) depth -= 1;
      if (opStack.length > 0) opStack.pop();
      continue;
    }

    const event = parseFreeformStepEvent(line, header.bitCount);
    if (!event) continue;

    steps.push(createParsedStep({
      rawStepId: steps.length,
      annotation: line,
      operation: event.operation,
      prime: event.prime,
      start: event.start,
      stop: event.stop,
      factorStep: event.factorStep,
      changedBits: event.changedBits,
      depth,
      operationPath: [...opStack, event.operation],
    }));
  }

  header.stepCount = steps.length;

  // Ensure we have useful defaults even for plain logs without TRACE header.
  if (!header.bitCount) {
    let maxBit = -1;
    for (let i = 0; i < steps.length; i++) {
      const cb = steps[i].changedBits;
      for (let j = 0; j < cb.length; j++) maxBit = Math.max(maxBit, cb[j]);
    }
    header.bitCount = maxBit >= 0 ? maxBit + 1 : 0;
    header.sieveSize = header.sieveSize || header.maxNumber || header.bitCount * 2;
    header.maxNumber = header.maxNumber || header.sieveSize;
  }

  inferMissingPrimes(steps, header.storageModel);
  return { header, steps };
}

function createParsedStep({
  rawStepId,
  annotation,
  operation,
  prime,
  start,
  stop,
  factorStep,
  changedBits,
  depth,
  operationPath,
}) {
  return {
    stepId: rawStepId,
    annotation: annotation || '',
    operation: operation || 'step',
    prime: toNullableNumber(prime),
    start: toNullableNumber(start),
    stop: toNullableNumber(stop),
    factorStep: toNullableNumber(factorStep),
    changedBits: new Uint32Array(changedBits || []),
    numChanged: (changedBits || []).length,
    depth: Math.max(0, toNumberOr(depth, 0)),
    operationPath: Array.isArray(operationPath) && operationPath.length > 0
      ? operationPath
      : [operation || 'step'],
    parentId: null,
  };
}

function parseFreeformStepEvent(line, bitCountHint = 0) {
  const text = String(line || '');

  // Example: "Setting bits with step 47 in range 123-456"
  const rangeMatch = text.match(/setting\s+bits?.*?(?:step|stride|inc|increment|stap)\s*(-?\d+).*?(?:range|from)\s*(-?\d+)\s*(?:-|\.\.|to)\s*(-?\d+)/i);
  if (rangeMatch) {
    const factorStep = Number(rangeMatch[1]);
    const start = Number(rangeMatch[2]);
    const stop = Number(rangeMatch[3]);
    return {
      operation: 'setBitsRange',
      prime: parsePrimeFromText(text),
      start,
      stop,
      factorStep,
      changedBits: expandChangedBitsFromRange(start, stop, factorStep, bitCountHint),
    };
  }

  // Example: "Setting bit 123"
  const singleBitMatch = text.match(/setting\s+bit\s*(-?\d+)/i);
  if (singleBitMatch) {
    const idx = Number(singleBitMatch[1]);
    return {
      operation: 'setBit',
      prime: parsePrimeFromText(text),
      start: idx,
      stop: idx,
      factorStep: null,
      changedBits: Number.isFinite(idx) && idx >= 0 ? [idx] : [],
    };
  }

  // Generic fallback: infer aliases (start/stop/step) from sentence.
  const inferred = inferMetaFromAnnotation(text);
  if (inferred.start != null || inferred.stop != null || inferred.factorStep != null) {
    const start = inferred.start;
    const stop = inferred.stop;
    const factorStep = inferred.factorStep;
    const canExpand = start != null && stop != null && factorStep != null;

    return {
      operation: 'setBits',
      prime: parsePrimeFromText(text),
      start,
      stop,
      factorStep,
      changedBits: canExpand
        ? expandChangedBitsFromRange(start, stop, factorStep, bitCountHint)
        : [],
    };
  }

  return null;
}

function expandChangedBitsFromRange(start, stop, step, bitCountHint = 0) {
  const s = Number(start);
  const e = Number(stop);
  let inc = Number(step);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return [];

  // Keep logs permissive: absent/invalid step means "set every bit in range".
  if (!Number.isFinite(inc) || inc === 0) inc = 1;
  const dir = s <= e ? 1 : -1;
  if (inc < 0) inc = Math.abs(inc);
  inc *= dir;

  const out = [];
  const maxBits = 2_000_000;
  const bound = Number.isFinite(bitCountHint) && bitCountHint > 0 ? bitCountHint : Number.MAX_SAFE_INTEGER;

  if (dir > 0) {
    for (let i = s; i < e; i += inc) {
      if (i >= 0 && i < bound) out.push(i);
      if (out.length >= maxBits) break;
    }
  } else {
    for (let i = s; i > e; i += inc) {
      if (i >= 0 && i < bound) out.push(i);
      if (out.length >= maxBits) break;
    }
  }

  return out;
}

function parsePrimeFromText(text) {
  const m = String(text || '').match(/\bprime\s+(-?\d+)\b/i);
  return m ? Number(m[1]) : null;
}

function parseAnalysisStartLine(line) {
  const text = String(line || '');
  if (!/startanalysis|analysis_start|trace_analysis_start/i.test(text)) return null;

  // Prefer explicit operation/function name if present.
  const fnMatch = text.match(/(?:op|operation|function|func)\s*[:=]\s*([A-Za-z0-9_./-]+)/i)
    || text.match(/\bstartanalysis\s*\(?\s*([A-Za-z0-9_./-]+)/i);

  return {
    operation: fnMatch ? fnMatch[1] : 'analysis',
    prime: parsePrimeFromText(text),
  };
}

function isAnalysisEndLine(line) {
  return /endanalysis|analysis_end|trace_analysis_end/i.test(String(line || ''));
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

function inferOperationFromAnnotation(annotation) {
  const text = String(annotation || '').trim();
  if (!text) return 'step';

  // Preferred: explicit operation prefix before ';'
  const semicolonIdx = text.indexOf(';');
  if (semicolonIdx > 0) {
    const candidate = sanitizeOperationToken(text.slice(0, semicolonIdx));
    if (candidate) return candidate;
  }

  // Common log style in this codebase: "function_name: message"
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0) {
    const candidate = sanitizeOperationToken(text.slice(0, colonIdx));
    if (candidate) return candidate;
  }

  // C-style function call snippets in logs: "foo_bar(...)"
  const callMatch = text.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
  if (callMatch) return callMatch[1];

  return 'step';
}

function sanitizeOperationToken(token) {
  const cleaned = String(token || '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/\s+/g, ' ');
  if (!cleaned) return null;
  return cleaned;
}

function inferMissingPrimes(steps, storageModel) {
  const mode = String(storageModel || '').toLowerCase();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.prime != null) continue;

    const prime = inferPrimeFromFactorStep(step.factorStep, mode);
    if (prime != null) step.prime = prime;
  }
}

function inferPrimeFromFactorStep(factorStep, storageModel) {
  const fs = toNullableNumber(factorStep);
  if (fs == null) return null;

  // User rule:
  // - half storage: prime = stepSize
  // - full storage: prime = stepSize / 2
  if (storageModel.includes('full')) return fs / 2;
  return fs;
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

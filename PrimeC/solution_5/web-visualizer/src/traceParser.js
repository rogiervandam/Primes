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

  const rawSteps = json.events || json.steps || [];

  const header = {
    version: json.version,
    sieveSize: json.sieve_size,
    bitCount: json.bit_count,
    maxNumber: json.max_number ?? json.sieve_size,
    stepCount: rawSteps.length,
    storageModel: json.storage_model || 'half',
    benchmarkSettings: firstDefined(json.benchmark_settings, json.settings, null),
  };

  Object.assign(header, buildTracePresentation(header, {
    title: firstDefined(json.title, json.trace_title, null),
    subtitle: firstDefined(json.subtitle, json.trace_subtitle, null),
    info: collectTitleInfo(firstDefined(json.title_info, json.info, json.details, null)),
    benchmark: parseBenchmarkOutputLine(firstDefined(json.benchmark_output, json.benchmark, null)),
  }));

  const steps = rawSteps.map((s, idx) => {
    const inferred = inferMetaFromAnnotation(s.annotation || '');
    const maskMeta = deriveMaskMeta(s, header.bitCount);
    const start = toNullableNumber(
      firstDefined(s.start, s.block_start, s.init, inferred.start)
    );
    const stop = toNullableNumber(
      firstDefined(s.stop, s.block_stop, s.end, s.stop_block, inferred.stop)
    );
    const factorStep = toNullableNumber(
      firstDefined(s.factor_step, s.step_size, s.step, s.stride, s.inc, s.increment, s.stap, inferred.factorStep)
    );

    const inferredOp = inferOperationFromAnnotation(s.annotation || '');

    return {
      stepId: toNumberOr(firstDefined(s.event_id, s.event, s.index, s.ordinal, s.sequence), idx),
      annotation: s.annotation || '',
      operation: (s.operation && s.operation !== 'Initialization') ? s.operation : inferredOp,
      prime: s.prime ?? null,
      start,
      stop,
      factorStep,
      changedBits: new Uint32Array(s.changed_bits || []),
      numChanged: (s.changed_bits || []).length,
      targetBits: new Uint32Array(maskMeta.targetBits),
      targetHitCounts: new Uint16Array(maskMeta.targetHitCounts),
      focusStart: maskMeta.focusStart,
      focusStop: maskMeta.focusStop,
      maskWordBits: maskMeta.wordBits,
      maskWriteOrderWords: new Uint32Array(maskMeta.targetWords),
      maskWriteOrderSlots: new Uint8Array(maskMeta.targetSlots),
      maskSlotBits: maskMeta.maskSlotBits.map((bits) => new Uint32Array(bits)),
      // Hierarchy / nesting support (dynamic depth levels)
      depth: Math.max(0, s.depth ?? s.call_depth ?? 0),
      operationPath: Array.isArray(s.operation_path)
        ? s.operation_path.filter(Boolean)
        : (s.operation ? [s.operation] : []),
      parentId: s.parent_id ?? s.parentId ?? null,
    };
  });

  inferMissingPrimes(steps, header.storageModel);
  return { header, steps };
}

function parseTextTrace(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error('Invalid trace file: empty text log');

  const headerLine = lines.find((l) => l.startsWith('TRACE '));
  const headerKv = headerLine ? parseKvLine(headerLine.slice('TRACE '.length)) : {};
  const titleMeta = extractTitleMetadata(lines, headerKv);
  const benchmarkMeta = extractBenchmarkMetadata(lines);

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

  const hasStructuredSteps = lines.some((l) => /^STEP\s|^EVENT\s|^TEXT\s/i.test(l));
  if (!hasStructuredSteps) {
    return parseFreeformTextTrace(lines, headerKv);
  }

  const steps = [];
  const opStack = [];
  let depth = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line || line.startsWith('TRACE ') || line.startsWith('DUMP ')) continue;

    if (/^STEP\s|^EVENT\s|^TEXT\s/i.test(line)) {
      const upper = line.toUpperCase();
      const prefixLen = upper.startsWith('EVENT ')
        ? 'EVENT '.length
        : (upper.startsWith('TEXT ') ? 'TEXT '.length : 'STEP '.length);
      const kv = parseKvLine(line.slice(prefixLen));
      const inferred = inferMetaFromAnnotation(kv.annotation || '');

      const start = toNullableNumber(
        firstAliasValue(kv, START_ALIASES, inferred.start)
      );
      const stop = toNullableNumber(
        firstAliasValue(kv, STOP_ALIASES, inferred.stop)
      );
      const factorStep = toNullableNumber(
        firstExactAliasValue(kv, FACTOR_STEP_ALIASES, inferred.factorStep)
      );

      const changedBits = upper.startsWith('TEXT ') ? [] : parseChangedBits(kv.changed_bits || '');
      const maskMeta = deriveMaskMeta(kv, headerKv.bit_count ? toNumberOr(headerKv.bit_count, 0) : 0);
      const operation = kv.function || kv.op || kv.operation || inferOperationFromAnnotation(kv.annotation || '');
      const operationPath = Array.isArray(kv.operation_path)
        ? kv.operation_path
        : (kv.operation_path ? String(kv.operation_path).split('/').map((s) => s.trim()).filter(Boolean) : [operation]);

      steps.push({
        stepId: steps.length,
        annotation: kv.annotation || '',
        operation,
        prime: toNullableNumber(kv.prime),
        start,
        stop,
        factorStep,
        changedBits: new Uint32Array(changedBits),
        numChanged: changedBits.length,
        targetBits: new Uint32Array(maskMeta.targetBits),
        targetHitCounts: new Uint16Array(maskMeta.targetHitCounts),
        focusStart: maskMeta.focusStart,
        focusStop: maskMeta.focusStop,
        maskWordBits: maskMeta.wordBits,
        maskWriteOrderWords: new Uint32Array(maskMeta.targetWords),
        maskWriteOrderSlots: new Uint8Array(maskMeta.targetSlots),
        maskSlotBits: maskMeta.maskSlotBits.map((bits) => new Uint32Array(bits)),
        depth: Math.max(0, toNumberOr(firstDefined(kv.depth, kv.call_depth), 0)),
        operationPath,
        parentId: toNullableNumber(firstDefined(kv.parent_id, kv.parentId)),
      });
      continue;
    }

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

    const event = parseFreeformStepEvent(line, headerKv.bit_count ? toNumberOr(headerKv.bit_count, 0) : 0);
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
      targetBits: event.targetBits,
      targetHitCounts: event.targetHitCounts,
      focusStart: event.focusStart,
      focusStop: event.focusStop,
      depth,
      operationPath: [...opStack, event.operation],
    }));
  }

  const header = {
    version: toNumberOr(headerKv.version, TRACE_FALLBACK_VERSION),
    sieveSize: toNumberOr(headerKv.sieve_size, 0),
    bitCount: toNumberOr(headerKv.bit_count, 0),
    maxNumber: toNumberOr(firstDefined(headerKv.max_number, headerKv.sieve_size), 0),
    stepCount: steps.length,
    storageModel: headerKv.storage_model || 'half',
    benchmarkSettings: firstDefined(headerKv.benchmark_settings, headerKv.settings, null),
  };

  Object.assign(header, buildTracePresentation(header, {
    title: titleMeta.title,
    subtitle: titleMeta.subtitle,
    info: titleMeta.info,
    benchmark: benchmarkMeta,
  }));

  inferMissingPrimes(steps, header.storageModel);
  return { header, steps };
}

function parseFreeformTextTrace(lines, headerKv = {}) {
  const titleMeta = extractTitleMetadata(lines, headerKv);
  const benchmarkMeta = extractBenchmarkMetadata(lines);
  const header = {
    version: toNumberOr(headerKv.version, TRACE_FALLBACK_VERSION),
    sieveSize: toNumberOr(headerKv.sieve_size, 0),
    bitCount: toNumberOr(headerKv.bit_count, 0),
    maxNumber: toNumberOr(firstDefined(headerKv.max_number, headerKv.sieve_size), 0),
    stepCount: 0,
    storageModel: headerKv.storage_model || 'half',
    benchmarkSettings: firstDefined(headerKv.benchmark_settings, headerKv.settings, null),
  };

  const steps = [];
  const opStack = [];
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('TRACE ') || line.startsWith('DUMP ')) continue;

    if (/^TEXT\s/i.test(line)) {
      const kv = parseKvLine(line.slice('TEXT '.length));
      const inferred = inferMetaFromAnnotation(kv.annotation || '');
      const operation = kv.function || inferOperationFromAnnotation(kv.annotation || '') || 'text';
      steps.push(createParsedStep({
        rawStepId: steps.length,
        annotation: kv.annotation || '',
        operation,
        prime: parsePrimeFromText(kv.annotation || ''),
        start: inferred.start,
        stop: inferred.stop,
        factorStep: inferred.factorStep,
        changedBits: [],
        depth: Math.max(0, toNumberOr(firstDefined(kv.depth, kv.call_depth), 0)),
        operationPath: [operation],
      }));
      continue;
    }

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
      targetBits: event.targetBits,
      targetHitCounts: event.targetHitCounts,
      focusStart: event.focusStart,
      focusStop: event.focusStop,
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

  Object.assign(header, buildTracePresentation(header, {
    title: titleMeta.title,
    subtitle: titleMeta.subtitle,
    info: titleMeta.info,
    benchmark: benchmarkMeta,
  }));

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
  targetBits,
  targetHitCounts,
  focusStart,
  focusStop,
  maskWordBits,
  maskWriteOrderWords,
  maskWriteOrderSlots,
  maskSlotBits,
  depth,
  operationPath,
}) {
  return {
    stepId: rawStepId,
    annotation: annotation || '',
    operation: operation || 'event',
    prime: toNullableNumber(prime),
    start: toNullableNumber(start),
    stop: toNullableNumber(stop),
    factorStep: toNullableNumber(factorStep),
    changedBits: new Uint32Array(changedBits || []),
    numChanged: (changedBits || []).length,
    targetBits: new Uint32Array(targetBits || []),
    targetHitCounts: new Uint16Array(targetHitCounts || []),
    focusStart: toNullableNumber(focusStart),
    focusStop: toNullableNumber(focusStop),
    maskWordBits: toNullableNumber(maskWordBits),
    maskWriteOrderWords: new Uint32Array(maskWriteOrderWords || []),
    maskWriteOrderSlots: new Uint8Array(maskWriteOrderSlots || []),
    maskSlotBits: Array.isArray(maskSlotBits) ? maskSlotBits.map((bits) => new Uint32Array(bits || [])) : [],
    depth: Math.max(0, toNumberOr(depth, 0)),
    operationPath: Array.isArray(operationPath) && operationPath.length > 0
      ? operationPath
      : [operation || 'event'],
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
    const changedBits = expandChangedBitsFromRange(start, stop, factorStep, bitCountHint);
    return {
      operation: 'setBitsRange',
      prime: parsePrimeFromText(text),
      start,
      stop,
      factorStep,
      changedBits,
      targetBits: changedBits,
      targetHitCounts: changedBits.map(() => 1),
      focusStart: start,
      focusStop: stop,
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
      targetBits: Number.isFinite(idx) && idx >= 0 ? [idx] : [],
      targetHitCounts: Number.isFinite(idx) && idx >= 0 ? [1] : [],
      focusStart: idx,
      focusStop: idx,
    };
  }

  // Generic fallback: infer aliases (start/stop/step) from sentence.
  const inferred = inferMetaFromAnnotation(text);
  const maskMeta = deriveMaskMeta(text, bitCountHint);
  if (maskMeta.targetBits.length > 0 || maskMeta.focusStart != null || maskMeta.focusStop != null) {
    return {
      operation: inferOperationFromAnnotation(text),
      prime: parsePrimeFromText(text),
      start: inferred.start,
      stop: inferred.stop,
      factorStep: inferred.factorStep,
      changedBits: maskMeta.targetBits,
      targetBits: maskMeta.targetBits,
      targetHitCounts: maskMeta.targetHitCounts,
      focusStart: maskMeta.focusStart,
      focusStop: maskMeta.focusStop,
      maskWordBits: maskMeta.wordBits,
      maskWriteOrderWords: maskMeta.targetWords,
      maskWriteOrderSlots: maskMeta.targetSlots,
      maskSlotBits: maskMeta.maskSlotBits,
    };
  }
  if (inferred.start != null || inferred.stop != null || inferred.factorStep != null) {
    const start = inferred.start;
    const stop = inferred.stop;
    const factorStep = inferred.factorStep;
    const canExpand = start != null && stop != null && factorStep != null;
    const changedBits = canExpand
      ? expandChangedBitsFromRange(start, stop, factorStep, bitCountHint)
      : [];

    return {
      operation: 'setBits',
      prime: parsePrimeFromText(text),
      start,
      stop,
      factorStep,
      changedBits,
      targetBits: changedBits,
      targetHitCounts: changedBits.map(() => 1),
      focusStart: start,
      focusStop: stop,
    };
  }

  return null;
}

function expandChangedBitsFromRange(start, stop, step, bitCountHint = 0) {
  const s = Number(start);
  const e = Number(stop);
  let inc = Number(step);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return [];

  // Keep logs permissive: absent/invalid step size means "set every bit in range".
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

function extractTitleMetadata(lines, headerKv = {}) {
  const titleLines = lines.filter((line) => /^TITLE\s/i.test(line));
  const kvs = titleLines.map((line) => parseKvLine(line.replace(/^TITLE\s+/i, '')));
  const title = firstDefined(
    ...kvs.map((kv) => firstDefined(kv.title, kv.label, null)),
    headerKv.title,
    headerKv.trace_title,
    null,
  );
  const subtitle = firstDefined(
    ...kvs.map((kv) => firstDefined(kv.subtitle, kv.subheading, null)),
    headerKv.subtitle,
    headerKv.trace_subtitle,
    null,
  );
  const info = [
    ...collectTitleInfo(firstDefined(headerKv.title_info, headerKv.info, headerKv.details, null)),
    ...kvs.flatMap((kv) => collectTitleInfo(firstDefined(kv.info, kv.details, kv.extra, null))),
  ];
  return { title, subtitle, info: dedupeStrings(info) };
}

function extractBenchmarkMetadata(lines) {
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index];
    if (!line || /^(TRACE|TEXT|EVENT|STEP|TITLE|DUMP)\s/i.test(line)) continue;
    const parsed = parseBenchmarkOutputLine(line);
    if (parsed) return parsed;
  }
  return null;
}

function parseBenchmarkOutputLine(line) {
  if (!line || typeof line !== 'string') return null;
  const parts = line.trim().split(';');
  if (parts.length < 4 || parts.length > 5) return null;
  const iterations = Number(parts[1]);
  const totalTime = Number(parts[2]);
  const threads = Number(parts[3]);
  if (!parts[0] || !Number.isFinite(iterations) || !Number.isFinite(totalTime) || !Number.isFinite(threads)) return null;
  const tags = {};
  if (parts[4]) {
    for (const entry of parts[4].split(',')) {
      const [key, value] = entry.split('=');
      if (key && value) tags[key] = value;
    }
  }
  return {
    label: parts[0],
    iterations,
    totalTime,
    threads,
    tags,
    summary: `${parts[0]} | ${iterations} passes | ${totalTime.toFixed(3)}s | ${threads} thread${threads === 1 ? '' : 's'}`,
  };
}

function collectTitleInfo(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.flatMap((value) => collectTitleInfo(value));
  const text = String(raw).trim();
  if (!text) return [];
  return text.split(/\s*\|\s*|\s*;\s*/).map((value) => value.trim()).filter(Boolean);
}

function dedupeStrings(values) {
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

function buildTracePresentation(header, meta = {}) {
  const info = [...(meta.info || [])];
  if (header.benchmarkSettings) info.push(`Settings ${header.benchmarkSettings}`);
  if (header.maxNumber) info.push(`Max ${header.maxNumber}`);
  if (header.storageModel) info.push(`Storage ${header.storageModel}`);
  if (meta.benchmark?.summary) info.push(meta.benchmark.summary);

  return {
    title: meta.title || null,
    subtitle: meta.subtitle || null,
    infoLines: dedupeStrings(info),
    benchmark: meta.benchmark || null,
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
const EVENT_INDEX_ALIASES = [
  'event_id', 'event', 'index', 'ordinal', 'sequence',
];
const FACTOR_STEP_ALIASES = [
  'factor_step', 'step_size', 'stride', 'inc', 'increment', 'stap',
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

function firstExactAliasValue(obj, aliases, fallback) {
  for (let i = 0; i < aliases.length; i++) {
    const key = aliases[i];
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  }
  return fallback;
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

function parseIntegerList(raw) {
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

function buildMaskTargets(wordStart, wordStop, stepWords, wordBits, maskDescriptors, bitCountHint = 0) {
  const hitMap = new Map();
  const bound = Number.isFinite(bitCountHint) && bitCountHint > 0 ? bitCountHint : Number.MAX_SAFE_INTEGER;
  if (!Number.isFinite(stepWords) || stepWords <= 0) {
    return { targetBits: [], targetHitCounts: [] };
  }

  for (let wordIndex = wordStart; wordIndex <= wordStop; wordIndex += stepWords) {
    for (const descriptor of maskDescriptors) {
      const targetWord = wordIndex + descriptor.wordOffset;
      if (targetWord < wordStart || targetWord > wordStop) continue;
      const baseBit = targetWord * wordBits;
      for (const relativeBit of descriptor.bits) {
        const absoluteBit = baseBit + relativeBit;
        if (absoluteBit < 0 || absoluteBit >= bound) continue;
        hitMap.set(absoluteBit, (hitMap.get(absoluteBit) || 0) + 1);
      }
    }
  }

  return {
    targetBits: Array.from(hitMap.keys()),
    targetHitCounts: Array.from(hitMap.values()),
  };
}

function buildOrderedMaskTargets(targetWords, targetSlots, wordBits, maskSlotBits, bitCountHint = 0) {
  const hitMap = new Map();
  const bound = Number.isFinite(bitCountHint) && bitCountHint > 0 ? bitCountHint : Number.MAX_SAFE_INTEGER;

  for (let index = 0; index < targetWords.length; index++) {
    const wordIndex = Number(targetWords[index]);
    const slotIndex = Number.isFinite(targetSlots[index]) ? Number(targetSlots[index]) : 0;
    const slotBits = maskSlotBits[slotIndex] || [];
    if (!Number.isFinite(wordIndex) || wordIndex < 0) continue;

    const baseBit = wordIndex * wordBits;
    for (let bitIndex = 0; bitIndex < slotBits.length; bitIndex++) {
      const absoluteBit = baseBit + slotBits[bitIndex];
      if (absoluteBit < 0 || absoluteBit >= bound) continue;
      hitMap.set(absoluteBit, (hitMap.get(absoluteBit) || 0) + 1);
    }
  }

  return {
    targetBits: Array.from(hitMap.keys()),
    targetHitCounts: Array.from(hitMap.values()),
  };
}

function buildMaskWriteOrder(wordStart, wordStop, stepWords, maskSlotBits) {
  const targetWords = [];
  const targetSlots = [];

  if (!Number.isFinite(wordStart) || !Number.isFinite(wordStop) || !Number.isFinite(stepWords) || stepWords <= 0) {
    return { targetWords, targetSlots };
  }

  const hasPrimaryMask = (maskSlotBits[0] || []).length > 0;
  const hasSecondaryMask = (maskSlotBits[1] || []).length > 0;

  for (let wordIndex = wordStart; wordIndex <= wordStop; wordIndex += stepWords) {
    if (hasPrimaryMask) {
      targetWords.push(wordIndex);
      targetSlots.push(0);
    }

    if (hasSecondaryMask) {
      const secondaryWord = wordIndex + 1;
      if (secondaryWord <= wordStop) {
        targetWords.push(secondaryWord);
        targetSlots.push(1);
      }
    }
  }

  return { targetWords, targetSlots };
}

function deriveMaskMeta(source, bitCountHint = 0) {
  const sourceObj = typeof source === 'string' ? parseKvLine(source) : (source || {});
  const annotation = typeof source === 'string' ? source : String(firstDefined(sourceObj.annotation, '') || '');
  const inferred = inferMetaFromAnnotation(annotation);

  const focusStart = toNullableNumber(firstDefined(sourceObj.focus_start, sourceObj.focusStart, inferred.start));
  const focusStop = toNullableNumber(firstDefined(sourceObj.focus_stop, sourceObj.focusStop, inferred.stop));

  const explicitTargetBits = parseIntegerList(firstDefined(sourceObj.target_bits, sourceObj.targetBits));
  const explicitTargetCounts = parseIntegerList(firstDefined(sourceObj.target_hit_counts, sourceObj.targetHitCounts));
  const wordBits = toNullableNumber(firstDefined(sourceObj.word_bits, sourceObj.wordBits));
  const wordStart = toNullableNumber(firstDefined(sourceObj.word_start, sourceObj.wordStart));
  const wordStop = toNullableNumber(firstDefined(sourceObj.word_stop, sourceObj.wordStop));
  const stepWords = toNullableNumber(firstDefined(sourceObj.step_words, sourceObj.stepWords));
  const maskBits = parseIntegerList(firstDefined(sourceObj.mask_bits, sourceObj.maskBits));
  const mask1Bits = parseIntegerList(firstDefined(sourceObj.mask1_bits, sourceObj.mask1Bits));
  const mask2Bits = parseIntegerList(firstDefined(sourceObj.mask2_bits, sourceObj.mask2Bits));

  const maskSlotBits = [];
  if (mask1Bits.length > 0 || mask2Bits.length > 0) {
    maskSlotBits[0] = mask1Bits;
    maskSlotBits[1] = mask2Bits;
  } else if (maskBits.length > 0) {
    maskSlotBits[0] = maskBits;
  }

  if (explicitTargetBits.length > 0) {
    return {
      targetBits: explicitTargetBits,
      targetHitCounts: explicitTargetBits.map((_, index) => Math.max(1, explicitTargetCounts[index] || 1)),
      focusStart,
      focusStop,
      wordBits,
      targetWords: [],
      targetSlots: [],
      maskSlotBits,
    };
  }

  const explicitTargetWords = parseIntegerList(firstDefined(sourceObj.mask_target_words, sourceObj.maskTargetWords));
  const explicitTargetSlots = parseIntegerList(firstDefined(sourceObj.mask_target_slots, sourceObj.maskTargetSlots));

  if (wordBits != null && explicitTargetWords.length > 0 && maskSlotBits.some((bits) => bits && bits.length > 0)) {
    const targetSlots = explicitTargetWords.map((_, index) => Math.max(0, explicitTargetSlots[index] || 0));
    const built = buildOrderedMaskTargets(explicitTargetWords, targetSlots, wordBits, maskSlotBits, bitCountHint);
    return {
      targetBits: built.targetBits,
      targetHitCounts: built.targetHitCounts,
      focusStart,
      focusStop,
      wordBits,
      targetWords: explicitTargetWords,
      targetSlots,
      maskSlotBits,
    };
  }

  if (wordBits != null && wordStart != null && wordStop != null && stepWords != null) {
    const maskDescriptors = [];
    if (maskBits.length > 0) maskDescriptors.push({ wordOffset: 0, bits: maskBits });
    if (mask1Bits.length > 0) maskDescriptors.push({ wordOffset: 0, bits: mask1Bits });
    if (mask2Bits.length > 0) maskDescriptors.push({ wordOffset: 1, bits: mask2Bits });
    if (maskDescriptors.length > 0) {
      const built = buildMaskTargets(wordStart, wordStop, stepWords, wordBits, maskDescriptors, bitCountHint);
      const writeOrder = buildMaskWriteOrder(wordStart, wordStop, stepWords, maskSlotBits);
      return {
        targetBits: built.targetBits,
        targetHitCounts: built.targetHitCounts,
        focusStart,
        focusStop,
        wordBits,
        targetWords: writeOrder.targetWords,
        targetSlots: writeOrder.targetSlots,
        maskSlotBits,
      };
    }
  }

  return {
    targetBits: [],
    targetHitCounts: [],
    focusStart,
    focusStop,
    wordBits,
    targetWords: [],
    targetSlots: [],
    maskSlotBits,
  };
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
  out.factorStep = firstFactorStepNumberInText(text, out.factorStep);

  return out;
}

function inferOperationFromAnnotation(annotation) {
  const text = String(annotation || '').trim();
  if (!text) return 'event';

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

  return 'event';
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
  let lastPrime = null;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.prime != null) {
      lastPrime = step.prime;
      continue;
    }

    const inferredFromText = inferPrimeFromAnnotation(step.annotation, step.factorStep, mode);
    if (inferredFromText != null) {
      step.prime = inferredFromText;
      lastPrime = inferredFromText;
      continue;
    }

    const prime = inferPrimeFromFactorStep(step.factorStep, mode);
    if (prime != null) {
      step.prime = prime;
      lastPrime = prime;
      continue;
    }

    if (lastPrime != null && step.operation === 'setBit') {
      step.prime = lastPrime;
    }
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

function inferPrimeFromAnnotation(annotation, factorStep, storageModel) {
  const explicitPrime = parsePrimeFromText(annotation);
  if (explicitPrime != null) return explicitPrime;

  const text = String(annotation || '');
  const classicRangeMatch = text.match(/setting\s+bits?.*?(?:with\s+)?step\s*(-?\d+)\s+in\s+range\s*(-?\d+)\s*(?:-|\.\.|to)\s*(-?\d+)/i);
  if (classicRangeMatch) {
    return inferPrimeFromFactorStep(Number(classicRangeMatch[1]), storageModel);
  }

  return inferPrimeFromFactorStep(factorStep, storageModel);
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

function firstFactorStepNumberInText(text, fallback) {
  const explicitAliases = ['factor_step', 'step_size', 'stride', 'inc', 'increment', 'stap'];
  const aliased = firstAliasNumberInText(text, explicitAliases, null);
  if (aliased != null) return aliased;

  const naturalLanguage = String(text || '').match(/(?:with\s+)?step\s*(-?\d+)\b/i);
  if (naturalLanguage) return Number(naturalLanguage[1]);

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
    benchmarkSettings: firstDefined(json.benchmark_settings, json.settings, null),
  };

  Object.assign(header, buildTracePresentation(header, {
    title: firstDefined(json.title, json.trace_title, null),
    subtitle: firstDefined(json.subtitle, json.trace_subtitle, null),
    info: collectTitleInfo(firstDefined(json.title_info, json.info, json.details, null)),
    benchmark: parseBenchmarkOutputLine(firstDefined(json.benchmark_output, json.benchmark, null)),
  }));

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

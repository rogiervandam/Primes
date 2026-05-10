/**
 * Sieve Trace File Parser
 *
 * Parses current .sievetrace formats produced by PrimeC solution_5:
 * - text traces with JSON TRACE/TITLE/WHEEL headers and inline step JSON metadata
 * - JSON traces version >= 7
 * - dump type: a single memory snapshot in hex or binary format
 */

import {
  firstDefined,
  toNumberOr,
  toNullableNumber,
  parseIntegerList,
  collectTitleInfo,
  normalizeStorageModelName,
  normalizeBitCountForStorage,
} from './parser/parseUtils';
import {
  parsePrimeFromText,
  inferMissingPrimes,
} from './parser/primeInference';
import {
  deriveMaskMeta,
  derivePatternMeta,
  inferMetaFromAnnotation,
  inferOperationFromAnnotation,
} from './parser/maskMetadata';
import {
  extractTitleMetadata,
  extractBenchmarkMetadata,
  parseBenchmarkOutputLine,
  buildTracePresentation,
} from './parser/headerParser';
import { parseDump } from './parser/dumpParser';

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
  if (/^<!doctype\s+html\b|^<html\b/i.test(trimmed)) {
    throw new Error('Invalid trace file: received the visualizer HTML instead of a trace log. Check that the dev server log API is enabled.');
  }

  if (trimmed[0] === '{' || trimmed[0] === '[') {
    // Some text traces now start directly with a JSON header object, without
    // a TRACE prefix. Try full JSON first, then fall back to text mode.
    try {
      return parseJsonTrace(trimmed);
    } catch (e) {
      if (!(e instanceof Error) || !/^Invalid trace file: not valid JSON\b/.test(e.message)) {
        throw e;
      }
      return parseTextTrace(trimmed);
    }
  }

  return parseTextTrace(trimmed);
}

function parseWheelDefinition(raw) {
  if (!raw) return null;
  let kv;
  if (typeof raw === 'string') {
    const payload = raw.trim();
    if (!payload.startsWith('{')) return null;
    try {
      kv = JSON.parse(payload);
    } catch (_e) {
      return null;
    }
  } else {
    kv = raw;
  }
  const mapNumbersRaw = firstDefined(kv.map_numbers, kv.mapNumbers, kv.numbers, kv.residues);
  const mapBitsRaw = firstDefined(kv.map_bits, kv.mapBits, kv.bits);
  const mapNumbers = parseIntegerList(mapNumbersRaw);
  const mapBits = parseIntegerList(mapBitsRaw);
  const pairCount = Math.min(mapNumbers.length, mapBits.length);
  if (pairCount <= 0) return null;

  const wheelSize = toNumberOr(firstDefined(kv.wheel_size, kv.wheelSize, kv.size, kv.period), 0);
  const bitsPerWheel = toNumberOr(firstDefined(kv.bits_per_wheel, kv.bitsPerWheel, kv.stripe_bits, kv.stripeBits), 0);
  if (wheelSize <= 0 || bitsPerWheel <= 0) return null;

  const cleanNumbers = [];
  const cleanBits = [];
  for (let i = 0; i < pairCount; i++) {
    const number = mapNumbers[i];
    const bit = mapBits[i];
    if (!Number.isFinite(number) || !Number.isFinite(bit) || number < 0 || bit < 0) continue;
    cleanNumbers.push(number);
    cleanBits.push(bit);
  }
  if (cleanNumbers.length === 0) return null;

  return {
    wheelSize,
    bitsPerWheel,
    baseSize: toNumberOr(firstDefined(kv.base_size, kv.baseSize), wheelSize),
    repeats: toNumberOr(firstDefined(kv.repeats, kv.repeat_count, kv.repeatCount), 1),
    wheelMax: toNullableNumber(firstDefined(kv.wheel_max, kv.wheelMax)),
    mapNumbers: cleanNumbers,
    mapBits: cleanBits,
    mapCount: cleanNumbers.length,
  };
}

function parseWheelDefinitionFromLines(lines) {
  for (const line of lines) {
    const kv = parseLineJson(line);
    if (kv && (kv.wheel_size != null || kv.wheelSize != null) &&
        (kv.bits_per_wheel != null || kv.bitsPerWheel != null || kv.stripe_bits != null)) {
      return parseWheelDefinition(kv);
    }
  }
  return null;
}

function parseJsonTrace(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid trace file: not valid JSON — ' + e.message);
  }

  if (!json.version || json.version < 7) {
    throw new Error(
      `Unsupported trace version: ${json.version}. Expected version >= 7.`
    );
  }

  // Handle memory dump format
  if (json.type === 'dump') {
    return parseDump(json);
  }

  const rawSteps = json.events || json.steps || [];

  const jsonRawStorageModel = String(json.storage_model || 'half');
  const jsonStorageModel = normalizeStorageModelName(jsonRawStorageModel);
  const jsonWheel = parseWheelDefinition(json.wheel);
  const jsonMaxNumber = toNumberOr(firstDefined(json.max_number, json.sieve_size), 0);
  const jsonSieveSize = toNumberOr(json.sieve_size, 0);
  const jsonBitCount = normalizeBitCountForStorage(
    jsonStorageModel,
    toNumberOr(json.bit_count, 0),
    jsonMaxNumber,
    jsonSieveSize,
  );

  const header = {
    version: json.version,
    sieveSize: jsonSieveSize,
    bitCount: jsonBitCount,
    maxNumber: jsonMaxNumber,
    stepCount: rawSteps.length,
    storageModel: jsonStorageModel,
    rawStorageModel: jsonRawStorageModel,
    wheel: jsonWheel,
    traceLevel: toNullableNumber(firstDefined(json.trace_level, json.log_level)),
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
    const patternMeta = derivePatternMeta(s, maskMeta);
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
      numTargeted: maskMeta.targetBits.length,
      targetBits: new Uint32Array(maskMeta.targetBits),
      targetHitCounts: new Uint16Array(maskMeta.targetHitCounts),
      focusStart: maskMeta.focusStart,
      focusStop: maskMeta.focusStop,
      patternKind: patternMeta.kind,
      patternSlotCount: patternMeta.slotCount,
      patternSlotBits: patternMeta.slotBits.map((bits) => new Uint32Array(bits)),
      patternDescription: patternMeta.description,
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
      level: toNullableNumber(firstDefined(s.level, s.log_level)),
      // Timing: elapsed nanoseconds (from logStop; logStart records 0 which we store as null)
      elapsedNs: (() => { const t = toNullableNumber(s.time); return t != null && t > 0 ? t : null; })(),
    };
  });

  inferMissingPrimes(steps, header.storageModel);
  return { header, steps };
}

/** Parse the JSON object from a line, ignoring any leading annotation text before `{`. */
function parseLineJson(line) {
  const braceIdx = line.indexOf('{');
  if (braceIdx === -1) return null;
  try {
    return JSON.parse(line.slice(braceIdx));
  } catch (_e) {
    return null;
  }
}

function parseTextTrace(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error('Invalid trace file: empty text log');

  const headerLine = lines.find((l) => {
    const kv = parseLineJson(l);
    return kv && kv.version != null && kv.sieve_size != null;
  });
  const headerKv = headerLine ? parseLineJson(headerLine) : null;
  if (!headerKv) {
    throw new Error('Invalid trace file: TRACE header must be JSON format.');
  }

  const rawStorageModel = String(headerKv.storage_model || 'half');
  const parsedStorageModel = normalizeStorageModelName(rawStorageModel);
  const parsedWheel = parseWheelDefinitionFromLines(lines);
  const parsedSieveSize = toNumberOr(headerKv.sieve_size, 0);
  const parsedMaxNumber = toNumberOr(firstDefined(headerKv.max_number, headerKv.sieve_size), 0);
  const parsedBitCount = normalizeBitCountForStorage(
    parsedStorageModel,
    toNumberOr(headerKv.bit_count, 0),
    parsedMaxNumber,
    parsedSieveSize,
  );
  const titleMeta = extractTitleMetadata(lines, headerKv);
  const benchmarkMeta = extractBenchmarkMetadata(lines);

  const steps = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line || line.startsWith('DUMP ')) continue;

    const newStyleLine = parseInlineJsonMeta(line);
    if (!newStyleLine) continue;

    const d = extractNewStyleStepData(newStyleLine.annotation, newStyleLine.meta, 0);
    steps.push(createParsedStep({
      rawStepId: steps.length,
      ...d,
      operationPath: [d.operation],
    }));
  }

  const header = {
    version: toNumberOr(headerKv.version, 7),
    sieveSize: parsedSieveSize,
    bitCount: parsedBitCount,
    maxNumber: parsedMaxNumber,
    stepCount: steps.length,
    storageModel: parsedStorageModel,
    rawStorageModel,
    wheel: parsedWheel,
    traceLevel: toNullableNumber(firstDefined(headerKv.trace_level, headerKv.log_level)),
    benchmarkSettings: firstDefined(headerKv.benchmark_settings, headerKv.settings, null),
  };

  Object.assign(header, buildTracePresentation(header, {
    title: titleMeta.title,
    subtitle: titleMeta.subtitle,
    info: titleMeta.info,
    benchmark: benchmarkMeta,
  }));

  inferMissingPrimes(steps, header.storageModel);
  if (steps.length === 0) {
    throw new Error('Invalid trace file: no inline JSON step records found.');
  }
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
  numTargeted,
  targetBits,
  targetHitCounts,
  focusStart,
  focusStop,
  patternKind,
  patternSlotCount,
  patternSlotBits,
  patternDescription,
  maskWordBits,
  maskWriteOrderWords,
  maskWriteOrderSlots,
  maskSlotBits,
  level,
  depth,
  operationPath,
  elapsedNs,
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
    numTargeted: numTargeted ?? 0,
    targetBits: new Uint32Array(targetBits || []),
    targetHitCounts: new Uint16Array(targetHitCounts || []),
    focusStart: toNullableNumber(focusStart),
    focusStop: toNullableNumber(focusStop),
    patternKind: patternKind || null,
    patternSlotCount: toNullableNumber(patternSlotCount),
    patternSlotBits: Array.isArray(patternSlotBits) ? patternSlotBits.map((bits) => new Uint32Array(bits || [])) : [],
    patternDescription: patternDescription || null,
    maskWordBits: toNullableNumber(maskWordBits),
    maskWriteOrderWords: new Uint32Array(maskWriteOrderWords || []),
    maskWriteOrderSlots: new Uint8Array(maskWriteOrderSlots || []),
    maskSlotBits: Array.isArray(maskSlotBits) ? maskSlotBits.map((bits) => new Uint32Array(bits || [])) : [],
    level: toNullableNumber(level),
    depth: Math.max(0, toNumberOr(depth, 0)),
    operationPath: Array.isArray(operationPath) && operationPath.length > 0
      ? operationPath
      : [operation || 'event'],
    parentId: null,
    elapsedNs: (elapsedNs != null && Number.isFinite(elapsedNs) && elapsedNs > 0) ? elapsedNs : null,
  };
}

/**
 * Detect and parse a new-format log line: optional text prefix followed by
 * a strict JSON object that contains a `traceline` property.
 */
function parseInlineJsonMeta(line) {
  const braceIdx = line.indexOf('{');
  if (braceIdx === -1) return null;

  const annotation = line.slice(0, braceIdx).trim();
  const jsonStr = line.slice(braceIdx);

  let meta;
  try {
    meta = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  if (meta == null || typeof meta !== 'object' || !Object.prototype.hasOwnProperty.call(meta, 'traceline')) {
    return null;
  }
  return { annotation, meta };
}
/**
 * Extract a step-data object from the inline JSON meta object.
 */
function extractNewStyleStepData(annotation, meta, inferredDepth) {
  const inferred = inferMetaFromAnnotation(annotation);
  const operation = meta.operation || meta.function || meta.op
    || inferOperationFromAnnotation(annotation) || 'event';
  const prime = toNullableNumber(meta.prime) ?? parsePrimeFromText(annotation);
  const start = toNullableNumber(firstDefined(meta.start, meta.begin, inferred.start));
  const stop = toNullableNumber(firstDefined(meta.stop, meta.end, inferred.stop));
  const factorStep = toNullableNumber(
    firstDefined(meta.step, meta.factor_step, meta.factorStep, inferred.factorStep)
  );
  const metaDepth = toNullableNumber(firstDefined(meta.depth, meta.call_depth));
  const depth = Math.max(0, metaDepth != null ? metaDepth : inferredDepth);

  // Extract changed_bits from JSON array (new format emits this directly)
  const changedBits = Array.isArray(meta.changed_bits)
    ? meta.changed_bits.filter((v) => Number.isFinite(v) && v >= 0)
    : [];

  // Extract mask metadata — keys match what deriveMaskMeta expects
  const maskMeta = deriveMaskMeta(meta, 0);
  const patternMeta = derivePatternMeta(meta, maskMeta);

  const hasExplicitTargetBits = maskMeta.targetBits.length > 0;
  return {
    annotation,
    operation,
    prime,
    start,
    stop,
    factorStep,
    changedBits,
    targetBits: hasExplicitTargetBits ? maskMeta.targetBits : changedBits,
    targetHitCounts: maskMeta.targetHitCounts.length > 0
      ? maskMeta.targetHitCounts
      : changedBits.map(() => 1),
    numTargeted: hasExplicitTargetBits ? maskMeta.targetBits.length : 0,
    focusStart: maskMeta.focusStart ?? start,
    focusStop: maskMeta.focusStop ?? stop,
    patternKind: patternMeta.kind,
    patternSlotCount: patternMeta.slotCount,
    patternSlotBits: patternMeta.slotBits,
    patternDescription: patternMeta.description,
    maskWordBits: maskMeta.wordBits,
    maskWriteOrderWords: maskMeta.targetWords,
    maskWriteOrderSlots: maskMeta.targetSlots,
    maskSlotBits: maskMeta.maskSlotBits,
    level: toNullableNumber(firstDefined(meta.level, meta.log_level)),
    depth,
  };
}

// Pure utilities (number/string normalisation and list parsing) live in
// `./parser/parseUtils` so this file stays focused on trace dialect parsing.

// ---------------------------------------------------------------------------
// Streaming / worker helpers — used by traceParserWorker.js
// ---------------------------------------------------------------------------

/**
 * Parse just the trace header from pre-split, trimmed, non-empty lines.
 * Used by the streaming worker so it can broadcast the header immediately,
 * before all step lines have been processed.
 *
 * Returns `{ header }` (stepCount is set to 0; the caller fills it in later).
 * Throws if the header line is missing or malformed.
 */
export function extractTextTraceHeader(lines) {
  const headerLine = lines.find((l) => {
    const kv = parseLineJson(l);
    return kv && kv.version != null && kv.sieve_size != null;
  });
  const headerKv = headerLine ? parseLineJson(headerLine) : null;
  if (!headerKv) {
    throw new Error('Invalid trace file: TRACE header must be JSON format.');
  }

  const rawStorageModel = String(headerKv.storage_model || 'half');
  const parsedStorageModel = normalizeStorageModelName(rawStorageModel);
  const parsedWheel = parseWheelDefinitionFromLines(lines);
  const parsedSieveSize = toNumberOr(headerKv.sieve_size, 0);
  const parsedMaxNumber = toNumberOr(firstDefined(headerKv.max_number, headerKv.sieve_size), 0);
  const parsedBitCount = normalizeBitCountForStorage(
    parsedStorageModel,
    toNumberOr(headerKv.bit_count, 0),
    parsedMaxNumber,
    parsedSieveSize,
  );
  const titleMeta = extractTitleMetadata(lines, headerKv);
  const benchmarkMeta = extractBenchmarkMetadata(lines);

  const header = {
    version: toNumberOr(headerKv.version, 7),
    sieveSize: parsedSieveSize,
    bitCount: parsedBitCount,
    maxNumber: parsedMaxNumber,
    stepCount: 0, // finalized after all steps are parsed
    storageModel: parsedStorageModel,
    rawStorageModel,
    wheel: parsedWheel,
    traceLevel: toNullableNumber(firstDefined(headerKv.trace_level, headerKv.log_level)),
    benchmarkSettings: firstDefined(headerKv.benchmark_settings, headerKv.settings, null),
  };

  Object.assign(header, buildTracePresentation(header, {
    title: titleMeta.title,
    subtitle: titleMeta.subtitle,
    info: titleMeta.info,
    benchmark: benchmarkMeta,
  }));

  return { header };
}

/**
 * Parse a single text-trace line into a step object.
 * Returns `null` if the line is not a valid step record.
 * `stepIndex` is the 0-based index of this step in the output array.
 * Used by the streaming worker to process lines one at a time.
 */
export function parseTextTraceLine(line, stepIndex) {
  if (!line || line.startsWith('DUMP ')) return null;
  const newStyleLine = parseInlineJsonMeta(line);
  if (!newStyleLine) return null;
  const d = extractNewStyleStepData(newStyleLine.annotation, newStyleLine.meta, 0);
  return createParsedStep({
    rawStepId: stepIndex,
    ...d,
    operationPath: [d.operation],
  });
}


/**
 * Sieve Trace File Parser
 *
 * Parses .sievetrace JSON files produced by PrimeC solution_5 trace system.
 * Supports format versions 2 (legacy) and 3 (with rich metadata).
 * Also supports "dump" type: a single memory snapshot in hex or binary format.
 */

import {
  TRACE_FALLBACK_VERSION,
  START_ALIASES,
  STOP_ALIASES,
  EVENT_INDEX_ALIASES,
  FACTOR_STEP_ALIASES,
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
  normalizeStorageModelName,
  normalizeBitCountForStorage,
  isAnalysisEndLine,
} from './parser/parseUtils';
import {
  parsePrimeFromText,
  inferMissingPrimes,
  firstAliasNumberInText,
  firstFactorStepNumberInText,
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

  if (trimmed[0] === '{' || trimmed[0] === '[') {
    return parseJsonTrace(trimmed);
  }

  return parseTextTrace(trimmed);
}

function parseWheelDefinition(raw) {
  if (!raw) return null;
  const kv = typeof raw === 'string' ? parseKvLine(raw) : raw;
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
  const wheelLine = lines.find((line) => /^WHEEL\s/i.test(line));
  if (!wheelLine) return null;
  return parseWheelDefinition(wheelLine.replace(/^WHEEL\s+/i, ''));
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

function parseTextTrace(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error('Invalid trace file: empty text log');

  const headerLine = lines.find((l) => l.startsWith('TRACE '));
  const headerKv = headerLine ? parseKvLine(headerLine.slice('TRACE '.length)) : {};
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
    if (/^WHEEL\s/i.test(line)) continue;
    // Dedicated storage-model line ("StorageModel: half") is a metadata convenience
    // already carried inside the TRACE header; skip here to avoid free-form parsing.
    if (/^StorageModel:\s*\S+\s*$/i.test(line)) continue;

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
      const maskMeta = deriveMaskMeta(kv, parsedBitCount);
      const patternMeta = derivePatternMeta(kv, maskMeta);
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
        patternKind: patternMeta.kind,
        patternSlotCount: patternMeta.slotCount,
        patternSlotBits: patternMeta.slotBits.map((bits) => new Uint32Array(bits)),
        patternDescription: patternMeta.description,
        maskWordBits: maskMeta.wordBits,
        maskWriteOrderWords: new Uint32Array(maskMeta.targetWords),
        maskWriteOrderSlots: new Uint8Array(maskMeta.targetSlots),
        maskSlotBits: maskMeta.maskSlotBits.map((bits) => new Uint32Array(bits)),
        depth: Math.max(0, toNumberOr(firstDefined(kv.depth, kv.call_depth), 0)),
        operationPath,
        parentId: toNullableNumber(firstDefined(kv.parent_id, kv.parentId)),
        level: toNullableNumber(firstDefined(kv.level, kv.log_level)),
        elapsedNs: (() => { const t = toNullableNumber(kv.time); return t != null && t > 0 ? t : null; })(),
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
        level: toNullableNumber(firstDefined(startEvent.level, startEvent.log_level)),
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

    const event = parseFreeformStepEvent(line, parsedBitCount);
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
      patternKind: event.patternKind,
      patternSlotCount: event.patternSlotCount,
      patternSlotBits: event.patternSlotBits,
      patternDescription: event.patternDescription,
      level: toNullableNumber(firstDefined(event.level, event.log_level)),
      depth,
      operationPath: [...opStack, event.operation],
    }));
  }

  const header = {
    version: toNumberOr(headerKv.version, TRACE_FALLBACK_VERSION),
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
  return { header, steps };
}

function parseFreeformTextTrace(lines, headerKv = {}) {
  const titleMeta = extractTitleMetadata(lines, headerKv);
  const benchmarkMeta = extractBenchmarkMetadata(lines);
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
  const header = {
    version: toNumberOr(headerKv.version, TRACE_FALLBACK_VERSION),
    sieveSize: parsedSieveSize,
    bitCount: parsedBitCount,
    maxNumber: parsedMaxNumber,
    stepCount: 0,
    storageModel: parsedStorageModel,
    rawStorageModel,
    wheel: parsedWheel,
    traceLevel: toNullableNumber(firstDefined(headerKv.trace_level, headerKv.log_level)),
    benchmarkSettings: firstDefined(headerKv.benchmark_settings, headerKv.settings, null),
  };

  const steps = [];
  const opStack = [];
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('TRACE ') || line.startsWith('DUMP ')) continue;
    if (/^WHEEL\s/i.test(line)) continue;

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
        level: toNullableNumber(firstDefined(kv.level, kv.log_level)),
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
        level: toNullableNumber(firstDefined(startEvent.level, startEvent.log_level)),
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
      patternKind: event.patternKind,
      patternSlotCount: event.patternSlotCount,
      patternSlotBits: event.patternSlotBits,
      patternDescription: event.patternDescription,
      level: toNullableNumber(firstDefined(event.level, event.log_level)),
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
  const patternMeta = derivePatternMeta(text, maskMeta);
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
      patternKind: patternMeta.kind,
      patternSlotCount: patternMeta.slotCount,
      patternSlotBits: patternMeta.slotBits,
      patternDescription: patternMeta.description,
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

// Pure utilities (number/string normalisation, alias lookups, list parsing,
// alias arrays, fallback constants) live in `./parser/parseUtils` so this
// file stays focused on dialect-specific parsing.


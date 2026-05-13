/**
 * Mask / pattern metadata derivation helpers.
 *
 * These take a parsed trace step (either a string or a key/value object)
 * and reconstruct the per-step mask/pattern descriptors that the renderer
 * uses to highlight the bits a vectorised step is about to write.
 */

import {
  toNullableNumber,
  parseKvLine,
  firstDefined,
  parseIntegerList,
  sanitizeOperationToken,
  START_ALIASES,
  STOP_ALIASES,
} from './parseUtils';
import {
  firstAliasNumberInText,
  firstFactorStepNumberInText,
} from './primeInference';

/** Resolve which absolute bits a stride+mask combination will touch. */
export function buildMaskTargets(wordStart, wordStop, stepWords, wordBits, maskDescriptors, bitCountHint = 0) {
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

/** Resolve target bits when the trace records explicit (word, slot) writes. */
export function buildOrderedMaskTargets(targetWords, targetSlots, wordBits, maskSlotBits, bitCountHint = 0) {
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

/** Generate the (word, slot) write order that a stride+mask schedule visits. */
export function buildMaskWriteOrder(wordStart, wordStop, stepWords, maskSlotBits) {
  const targetWords = [];
  const targetSlots = [];

  if (!Number.isFinite(wordStart) || !Number.isFinite(wordStop) || !Number.isFinite(stepWords) || stepWords <= 0) {
    return { targetWords, targetSlots };
  }

  const slotCount = maskSlotBits.length;
  const activeSlots = maskSlotBits.map((bits) => (bits || []).length > 0);

  for (let wordIndex = wordStart; wordIndex <= wordStop; wordIndex += stepWords) {
    for (let s = 0; s < slotCount; s++) {
      if (!activeSlots[s]) continue;
      const targetWord = wordIndex + s;
      if (targetWord > wordStop) break;
      targetWords.push(targetWord);
      targetSlots.push(s);
    }
  }

  return { targetWords, targetSlots };
}

/**
 * Pull start/stop range and factor-step hints out of an annotation string,
 * preferring explicitly aliased values over loose `N-M` numeric ranges.
 */
export function inferMetaFromAnnotation(annotation) {
  const text = String(annotation || '');
  const lower = text.toLowerCase();
  const out = { start: null, stop: null, factorStep: null, rangeKind: 'bit' };

  const range = lower.match(/(\d+)\s*(?:-|\.\.|to)\s*(\d+)/);
  if (range) {
    out.start = Number(range[1]);
    out.stop = Number(range[2]);
  }

  // Detect the unit/kind of the range from annotation keywords.
  // Priority: explicit bit keywords > typed keywords (uint*) > byte > number keywords > default bit.
  const bitRangeKw = /\bbit\s*range\b|\bbitrange\b|\brange.*bit\b|\bbit.*range\b/;
  const uint64vKw = /\buint64v(\d+)\b/;
  const uint32vKw = /\buint32v(\d+)\b/;
  const uint16vKw = /\buint16v(\d+)\b/;
  const uint64Kw = /\buint64\b/;
  const uint32Kw = /\buint32\b/;
  const uint16Kw = /\buint16\b/;
  const byteKw = /\bbytes?\b/;
  const numberKw = /\b(?:factor\s+range|number\s+range|numbers?\s+\d|factors?\s+\d)\b/;

  if (bitRangeKw.test(lower)) {
    out.rangeKind = 'bit';
  } else {
    const m64v = lower.match(uint64vKw);
    const m32v = lower.match(uint32vKw);
    const m16v = lower.match(uint16vKw);
    if (m64v) {
      out.rangeKind = `uint64v${m64v[1]}`;
    } else if (m32v) {
      out.rangeKind = `uint32v${m32v[1]}`;
    } else if (m16v) {
      out.rangeKind = `uint16v${m16v[1]}`;
    } else if (uint64Kw.test(lower)) {
      out.rangeKind = 'uint64';
    } else if (uint32Kw.test(lower)) {
      out.rangeKind = 'uint32';
    } else if (uint16Kw.test(lower)) {
      out.rangeKind = 'uint16';
    } else if (byteKw.test(lower)) {
      out.rangeKind = 'byte';
    } else if (numberKw.test(lower)) {
      out.rangeKind = 'number';
    }
    // else: keep default 'bit'
  }

  out.start = firstAliasNumberInText(text, START_ALIASES, out.start);
  out.stop = firstAliasNumberInText(text, STOP_ALIASES, out.stop);
  out.factorStep = firstFactorStepNumberInText(text, out.factorStep);

  return out;
}

/**
 * Best-effort guess at the operation name implied by an annotation:
 * `op; rest` → `op`; `op: rest` → `op`; `foo(...)` → `foo`; else `event`.
 */
export function inferOperationFromAnnotation(annotation) {
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

/**
 * Build the unified mask metadata block for a step. Accepts either a raw
 * key/value line or an already-parsed object. Returns the bits the step
 * targets along with focus-range and per-slot mask descriptions.
 */
export function deriveMaskMeta(source, bitCountHint = 0) {
  const sourceObj = typeof source === 'string' ? parseKvLine(source) : (source || {});
  const annotation = typeof source === 'string' ? source : String(firstDefined(sourceObj.annotation, '') || '');
  const inferred = inferMetaFromAnnotation(annotation);

  // Prefer the first candidate that resolves to a non-empty integer list.
  // This prevents empty canonical fields (pattern_slotN_bits: []) from
  // shadowing populated legacy aliases (maskN_bits).
  const firstNonEmptyIntegerList = (...candidates) => {
    for (let i = 0; i < candidates.length; i++) {
      const parsed = parseIntegerList(candidates[i]);
      if (parsed.length > 0) return parsed;
    }
    return [];
  };

  const focusStart = toNullableNumber(firstDefined(sourceObj.focus_start, sourceObj.focusStart, inferred.start));
  const focusStop = toNullableNumber(firstDefined(sourceObj.focus_stop, sourceObj.focusStop, inferred.stop));

  const explicitTargetBits = parseIntegerList(firstDefined(sourceObj.target_bits, sourceObj.targetBits));
  const explicitTargetCounts = parseIntegerList(firstDefined(sourceObj.target_hit_counts, sourceObj.targetHitCounts));
  const wordBits = toNullableNumber(firstDefined(sourceObj.word_bits, sourceObj.wordBits));
  const wordStart = toNullableNumber(firstDefined(sourceObj.word_start, sourceObj.wordStart));
  const wordStop = toNullableNumber(firstDefined(sourceObj.word_stop, sourceObj.wordStop));
  const stepWords = toNullableNumber(firstDefined(sourceObj.step_words, sourceObj.stepWords));
  const maskBits = parseIntegerList(firstDefined(sourceObj.mask_bits, sourceObj.maskBits));
  // item 269: prefer the canonical "pattern_slotN_bits" (0-indexed) naming; fall back
  // to the legacy "maskN_bits" (1-indexed) for backward compatibility with old traces.
  const mask1Bits = firstNonEmptyIntegerList(sourceObj.pattern_slot0_bits, sourceObj.patternSlot0Bits, sourceObj.mask1_bits, sourceObj.mask1Bits);
  const mask2Bits = firstNonEmptyIntegerList(sourceObj.pattern_slot1_bits, sourceObj.patternSlot1Bits, sourceObj.mask2_bits, sourceObj.mask2Bits);
  const mask3Bits = firstNonEmptyIntegerList(sourceObj.pattern_slot2_bits, sourceObj.patternSlot2Bits, sourceObj.mask3_bits, sourceObj.mask3Bits);
  const mask4Bits = firstNonEmptyIntegerList(sourceObj.pattern_slot3_bits, sourceObj.patternSlot3Bits, sourceObj.mask4_bits, sourceObj.mask4Bits);

  const maskSlotBits = [];
  if (mask1Bits.length > 0 || mask2Bits.length > 0 || mask3Bits.length > 0 || mask4Bits.length > 0) {
    maskSlotBits[0] = mask1Bits;
    maskSlotBits[1] = mask2Bits;
    if (mask3Bits.length > 0) maskSlotBits[2] = mask3Bits;
    if (mask4Bits.length > 0) maskSlotBits[3] = mask4Bits;
  } else if (maskBits.length > 0) {
    maskSlotBits[0] = maskBits;
  }

  const explicitTargetWords = parseIntegerList(firstDefined(sourceObj.mask_target_words, sourceObj.maskTargetWords));
  const explicitTargetSlots = parseIntegerList(firstDefined(sourceObj.mask_target_slots, sourceObj.maskTargetSlots));

  if (explicitTargetBits.length > 0) {
    // Preserve write-order words/slots even when explicit target_bits are present
    // so the mask stamp animation can run for individual operations.
    const targetSlots = explicitTargetWords.map((_, index) => Math.max(0, explicitTargetSlots[index] || 0));
    return {
      targetBits: explicitTargetBits,
      targetHitCounts: explicitTargetBits.map((_, index) => Math.max(1, explicitTargetCounts[index] || 1)),
      focusStart,
      focusStop,
      wordBits,
      targetWords: explicitTargetWords,
      targetSlots,
      maskSlotBits,
    };
  }

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
    for (let s = 0; s < maskSlotBits.length; s++) {
      const slotBits = maskSlotBits[s] || [];
      if (slotBits.length > 0) maskDescriptors.push({ wordOffset: s, bits: slotBits });
    }
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

/**
 * Produce a (kind, slotCount, slotBits, description) summary of the mask
 * pattern. Falls back to whatever `maskMeta.maskSlotBits` provides.
 */
export function derivePatternMeta(source, maskMeta = null) {
  const sourceObj = typeof source === 'string' ? parseKvLine(source) : (source || {});
  const explicitSlot0 = parseIntegerList(firstDefined(sourceObj.pattern_slot0_bits, sourceObj.patternSlot0Bits));
  const explicitSlot1 = parseIntegerList(firstDefined(sourceObj.pattern_slot1_bits, sourceObj.patternSlot1Bits));
  const explicitSlotCount = toNullableNumber(firstDefined(sourceObj.pattern_slot_count, sourceObj.patternSlotCount));
  const explicitKind = firstDefined(sourceObj.pattern_kind, sourceObj.patternKind, null);

  const fallbackSlotBits = Array.isArray(maskMeta?.maskSlotBits)
    ? maskMeta.maskSlotBits.map((bits) => Array.from(bits || []).map((value) => Number(value)).filter((value) => Number.isFinite(value)))
    : [];

  let slotBits = [];
  if (explicitSlot0.length > 0 || explicitSlot1.length > 0) {
    slotBits[0] = explicitSlot0;
    if (explicitSlot1.length > 0) slotBits[1] = explicitSlot1;
  } else if (fallbackSlotBits.length > 0) {
    slotBits = fallbackSlotBits;
  }

  slotBits = slotBits.filter((bits) => Array.isArray(bits) && bits.length > 0);
  const slotCount = Math.max(0, Math.floor(explicitSlotCount || slotBits.length || 0));
  const normalizedCount = slotCount > 0 ? slotCount : slotBits.length;

  const inferredKind = explicitKind || (normalizedCount > 1 ? 'pair' : (normalizedCount > 0 ? 'single' : null));
  const slotDescriptions = slotBits.map((bits, index) => `mask ${index + 1}: ${bits.join(', ')}`);

  return {
    kind: inferredKind,
    slotCount: normalizedCount,
    slotBits,
    description: slotDescriptions.length > 0 ? slotDescriptions.join(' | ') : null,
  };
}

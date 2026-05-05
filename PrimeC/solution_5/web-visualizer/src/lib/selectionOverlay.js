export function buildCombinedSelectionOverlay(selection, steps) {
  const indices = Array.from(selection)
    .filter((idx) => idx >= 0 && idx < steps.length)
    .sort((a, b) => a - b);
  const mergedBits = new Set();
  const targetHitCounts = new Map();
  const orderedWords = [];
  const orderedSlots = [];
  const orderedEventIds = [];
  let maskWordBits = null;
  let maskSlotBits = [];

  const appendFallbackWords = (bits, wordBits, eventId) => {
    if (!wordBits || !bits || bits.length === 0) return;
    const seen = new Set();
    const sortedBits = Array.from(bits).sort((a, b) => a - b);
    for (let i = 0; i < sortedBits.length; i++) {
      const wordIndex = Math.floor(sortedBits[i] / wordBits);
      if (seen.has(wordIndex)) continue;
      seen.add(wordIndex);
      orderedWords.push(wordIndex);
      orderedSlots.push(0);
      orderedEventIds.push(eventId);
    }
  };

  for (let i = 0; i < indices.length; i++) {
    const step = steps[indices[i]];
    if (!step) continue;
    const targetBits = step.targetBits && step.targetBits.length > 0 ? step.targetBits : step.changedBits;

    for (let j = 0; j < step.changedBits.length; j++) mergedBits.add(step.changedBits[j]);
    for (let j = 0; j < targetBits.length; j++) {
      const bit = targetBits[j];
      targetHitCounts.set(bit, (targetHitCounts.get(bit) || 0) + (step.targetHitCounts?.[j] || 1));
    }

    if (step.maskWordBits != null && step.maskWordBits > 0 && maskWordBits == null) {
      maskWordBits = step.maskWordBits;
    }
    if (maskSlotBits.length === 0 && Array.isArray(step.maskSlotBits) && step.maskSlotBits.length > 0) {
      maskSlotBits = Array.from(step.maskSlotBits);
    }

    if (maskWordBits != null && step.maskWordBits === maskWordBits && step.maskWriteOrderWords?.length > 0) {
      for (let j = 0; j < step.maskWriteOrderWords.length; j++) {
        orderedWords.push(step.maskWriteOrderWords[j]);
        orderedSlots.push(step.maskWriteOrderSlots?.[j] ?? 0);
        orderedEventIds.push(step.stepId ?? indices[i]);
      }
    } else if (maskWordBits != null) {
      appendFallbackWords(targetBits, maskWordBits, step.stepId ?? indices[i]);
    }
  }

  return {
    changedBits: mergedBits,
    targetBits: mergedBits,
    targetHitCounts,
    annotation: indices.length > 1 ? '' : (steps[indices[0]]?.annotation || ''),
    maskMetadata: maskWordBits != null ? {
      wordBits: maskWordBits,
      targetWords: Uint32Array.from(orderedWords),
      targetSlots: Uint8Array.from(orderedSlots),
      targetEventIds: Int32Array.from(orderedEventIds),
      slotBits: maskSlotBits,
    } : null,
  };
}
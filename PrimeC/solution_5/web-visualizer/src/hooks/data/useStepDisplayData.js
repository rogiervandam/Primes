import { useMemo } from 'react';

/**
 * Derives the display-data values used by the surrounding-events context,
 * and detail panel from the current step state.
 *
 * @param {object} params
 * @param {Array}    params.steps
 * @param {number}   params.currentStep
 * @param {Set}      params.selectedSteps
 * @param {function} params.buildCombinedSelectionOverlay
 * @returns {{ currentStepData, surroundingEvents }}
 */
export function useStepDisplayData({ steps, currentStep, selectedSteps, buildCombinedSelectionOverlay }) {
  const currentStepData = useMemo(() => {
    if (selectedSteps.size <= 1) return steps[currentStep] || null;

    const indices = Array.from(selectedSteps)
      .filter((idx) => idx >= 0 && idx < steps.length)
      .sort((a, b) => a - b);
    if (indices.length === 0) return steps[currentStep] || null;

    const union = new Set();
    let prime = null;
    let operation = null;
    let minStart = null;
    let maxStop = null;
    let factorStep = null;
    let annotation = '';
    const overlay = buildCombinedSelectionOverlay(selectedSteps);

    for (let i = 0; i < indices.length; i++) {
      const s = steps[indices[i]];
      if (!s) continue;
      if (prime == null && s.prime != null) prime = s.prime;
      if (!operation && s.operation) operation = s.operation;
      if (factorStep == null && s.factorStep != null) factorStep = s.factorStep;
      if (s.start != null) minStart = minStart == null ? s.start : Math.min(minStart, s.start);
      if (s.stop != null) maxStop = maxStop == null ? s.stop : Math.max(maxStop, s.stop);
      for (let j = 0; j < s.changedBits.length; j++) union.add(s.changedBits[j]);
    }

    const firstAnnotation = steps[indices[0]]?.annotation;
    annotation = `Aggregated ${indices.length} selected events (${indices[0]}-${indices[indices.length - 1]})${firstAnnotation ? `: ${firstAnnotation}` : ''}`;

    const changed = new Uint32Array(Array.from(union).sort((a, b) => a - b));
    const aggMaskSteps = indices
      .map((i) => steps[i])
      .filter((s) => s && Array.isArray(s.maskSlotBits) && s.maskSlotBits.length > 0 && s.maskWriteOrderWords?.length > 0);
    return {
      stepId: currentStep,
      annotation,
      operation: operation ? `${operation} (aggregate)` : 'Aggregate',
      prime,
      start: minStart,
      stop: maxStop,
      factorStep,
      changedBits: changed,
      numChanged: changed.length,
      maskWordBits: overlay.maskMetadata?.wordBits ?? null,
      maskWriteOrderWords: overlay.maskMetadata?.targetWords ?? new Uint32Array(0),
      maskWriteOrderSlots: overlay.maskMetadata?.targetSlots ?? new Uint8Array(0),
      maskSlotBits: overlay.maskMetadata?.slotBits ?? [],
      aggMaskSteps: aggMaskSteps.length > 0 ? aggMaskSteps : null,
    };
  }, [steps, currentStep, selectedSteps, buildCombinedSelectionOverlay]);

  // Compact summary list for the surrounding events (-2, -1, +1, +2) shown in
  // the event-title widget so the user can see the local context of the
  // current event without having to open the full events panel.
  const surroundingEvents = useMemo(() => {
    const out = { prev: [], next: [] };
    if (!Array.isArray(steps) || steps.length === 0) return out;
    const summarize = (idx) => {
      const s = steps[idx];
      if (!s) return null;
      const eventId = s.stepId ?? idx;
      const op = s.operation || 'Unknown';
      const bits = Number(s.numChanged) || 0;
      const parts = [];
      if (s.prime != null) parts.push(`p${s.prime}`);
      if (s.factorStep != null) parts.push(`s${s.factorStep}`);
      if (s.start != null && s.stop != null) parts.push(`${s.start}-${s.stop}`);
      const meta = parts.join(' ');
      const elapsedNs = Number(s.elapsedNs) || 0;
      const elapsedLabel = elapsedNs > 0
        ? (elapsedNs >= 1e6 ? `${(elapsedNs / 1e6).toFixed(2)}ms`
          : elapsedNs >= 1e3 ? `${(elapsedNs / 1e3).toFixed(1)}µs`
          : `${elapsedNs}ns`)
        : '';
      return { idx, eventId, op, meta, bits, elapsedLabel };
    };
    for (let off = -3; off <= -1; off++) {   // item 309: 3 previous events
      const e = summarize(currentStep + off);
      if (e) out.prev.push(e);
    }
    for (let off = 1; off <= 4; off++) {    // item 309: 4 next events → 3+1+4 = 8 lines total
      const e = summarize(currentStep + off);
      if (e) out.next.push(e);
    }
    return out;
  }, [steps, currentStep]);

  return { currentStepData, surroundingEvents };
}

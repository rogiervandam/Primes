import { useCallback } from 'react';

export function useMaskStampAnimation({
  rendererRef,
  rippleRef,
  seekGenRef,
  globalPausedRef,
  currentMaskAnimIntervalRef,
  stepScrubProgressRef,
  getAnimationTimingPlan,
  getMinimapDetailH,
  clampMs,
  aggMaskStepSetterRef,
}) {
  const runMaskStampAnimation = useCallback((bitIntervalMs = null, options = {}) => {
    const r = rendererRef.current;
    const maskWriteCount = r?.maskWriteOrderWords?.length || 0;
    const animationBits = r?.changedBits?.size ? r.changedBits : (r?.targetBits?.size ? r.targetBits : null);
    if (!r || (maskWriteCount === 0 && (!animationBits || animationBits.size === 0))) return Promise.resolve();
    const previousShowMaskOverlay = r.showMaskWriteOverlay !== false;
    r.showMaskWriteOverlay = false;

    const bits = animationBits ? Array.from(animationBits) : [];
    const groupBits = r.customGroupingBits > 0 ? r.customGroupingBits : Math.max(1, r.vectorGroup * 64);
    const groupCount = new Set(bits.map((b) => Math.floor(b / groupBits))).size;
    const orderedWrites = (() => {
      if (!r?.maskWriteOrderSlots || r.maskWriteOrderSlots.length === 0) return maskWriteCount;
      const perSlot = new Map();
      for (let index = 0; index < r.maskWriteOrderSlots.length; index++) {
        const slot = Number(r.maskWriteOrderSlots[index] ?? 0);
        perSlot.set(slot, (perSlot.get(slot) || 0) + 1);
      }
      let maxWrites = 0;
      for (const value of perSlot.values()) maxWrites = Math.max(maxWrites, value);
      return Math.max(maskWriteCount > 0 ? 1 : 0, maxWrites);
    })();
    const plan = options.adaptivePlan || getAnimationTimingPlan(Math.max(orderedWrites, groupCount, 1), options);
    const maskInterval = Math.max(5, Number(bitIntervalMs ?? currentMaskAnimIntervalRef.current ?? 20) || 20);
    const explicitDurationMs = Number.isFinite(options.durationMs)
      ? Math.max(120, options.durationMs)
      : null;
    const durationFromInterval = orderedWrites > 0
      ? Math.round(orderedWrites * maskInterval * 2.35)
      : Math.round(420 + groupCount * maskInterval * 1.2);
    const duration = explicitDurationMs != null
      ? clampMs(explicitDurationMs, 120, 120000)
      : clampMs(
        Math.max(durationFromInterval, plan ? plan.totalDuration * 0.55 : 0),
        420,
        60000,
      );
    const startedAt = performance.now();
    const slotGroups = orderedWrites > 0 ? r._maskEntriesBySlot() : [];
    let virtualMs = 0;
    let prevTickAt = startedAt;
    const initialMaskInterval = maskInterval;

    const entryBitsCache = new Map();
    // Build ordered list of distinct event IDs (preserving first-occurrence order from entries)
    // so the detail panel can display the correct per-event mask during animation.
    const aggEventIdOrder = [];
    if (slotGroups.length > 0) {
      for (let gi = 0; gi < slotGroups.length; gi++) {
        const entries = slotGroups[gi];
        for (let ei = 0; ei < entries.length; ei++) {
          entryBitsCache.set(entries[ei], r._maskEntryBits(entries[ei]));
          const eid = entries[ei].eventId;
          if (eid >= 0 && !aggEventIdOrder.includes(eid)) aggEventIdOrder.push(eid);
        }
      }
    }

    if (rippleRef.current) {
      cancelAnimationFrame(rippleRef.current);
      rippleRef.current = null;
    }

    const requestedStartProgress = Math.max(0, Math.min(1,
      Number(options.startProgress) || 0
    ));
    virtualMs = requestedStartProgress * duration;
    // item 441: cap animation at endProgress to support repeat end handle
    const effectiveEndProgress = Number.isFinite(options.endProgress)
      ? Math.max(0.01, Math.min(1, options.endProgress))
      : 1;

    const combinedBits = options.combinedBits || null;
    let combinedRevealedUpTo = combinedBits
      ? Math.floor(requestedStartProgress * combinedBits.sortedBits.length)
      : 0;
    if (combinedBits && combinedRevealedUpTo > 0) {
      for (let i = 0; i < combinedRevealedUpTo; i++) {
        const bit = combinedBits.sortedBits[i];
        if (bit < combinedBits.bs.length) combinedBits.bs[bit] = 1;
      }
    }

    return new Promise((resolve) => {
      const startSeekGen = seekGenRef.current;
      const tick = (now) => {
        if (seekGenRef.current !== startSeekGen) {
          rippleRef.current = null;
          resolve();
          return;
        }
        const dt = Math.max(0, now - prevTickAt);
        prevTickAt = now;
        if (globalPausedRef.current) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }
        const liveInterval = Math.max(5, Number(currentMaskAnimIntervalRef.current) || initialMaskInterval);
        virtualMs += dt * (initialMaskInterval / liveInterval);
        const t = Math.min(effectiveEndProgress, virtualMs / duration);
        if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(t * 100));
        // Update detail panel's current agg mask step when the active entry's event changes.
        if (aggMaskStepSetterRef?.current && aggEventIdOrder.length > 1 && slotGroups.length > 0) {
          const firstGroupEntries = slotGroups[0];
          const currentEntryIndex = Math.min(firstGroupEntries.length - 1, Math.floor(t * firstGroupEntries.length));
          const currentEventId = firstGroupEntries[currentEntryIndex]?.eventId ?? -1;
          const stepIdx = aggEventIdOrder.indexOf(currentEventId);
          if (stepIdx >= 0) aggMaskStepSetterRef.current(stepIdx);
        }
        if (combinedBits) {
          const targetCount = Math.floor(t * combinedBits.sortedBits.length);
          while (combinedRevealedUpTo < targetCount) {
            const bit = combinedBits.sortedBits[combinedRevealedUpTo];
            if (bit < combinedBits.bs.length) combinedBits.bs[bit] = 1;
            combinedRevealedUpTo++;
          }
        }
        const ghostBits = new Set();
        if (slotGroups.length > 0) {
          for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
            const entries = slotGroups[groupIndex];
            const segmentCount = Math.max(1, entries.length);
            const unit = t * segmentCount;
            const index = Math.min(entries.length - 1, Math.floor(unit));
            const local = Math.max(0, Math.min(1, unit - index));
            for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
              const isStamped = entryIndex < index || entryIndex === index || (entryIndex === index + 1 && local > 0.78);
              if (isStamped) continue;
              const bitsForEntry = entryBitsCache.get(entries[entryIndex]) || [];
              for (let bitIndex = 0; bitIndex < bitsForEntry.length; bitIndex++) ghostBits.add(bitsForEntry[bitIndex]);
            }
          }
        } else if (r.targetBits?.size) {
          for (const bit of r.targetBits) ghostBits.add(bit);
        }
        r.setMaskGhostBits(ghostBits);
        r.render();
        if (orderedWrites > 0) r.renderMaskHover(t, null);
        else r.renderMaskStamp(t);
        // item 486: when animStyle is set (combined bit+mask mode), apply per-group style effect
        // on the bits in the currently-active slot entry so bits light up as each group is stamped
        if (options.animStyle && options.animStyle !== 'none' && combinedBits && slotGroups.length > 0) {
          const activeBits = new Set();
          for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
            const entries = slotGroups[groupIndex];
            const segmentCount = Math.max(1, entries.length);
            const unit = t * segmentCount;
            const index = Math.min(entries.length - 1, Math.floor(unit));
            const bitsForCurrentEntry = entryBitsCache.get(entries[index]) || [];
            for (let bi = 0; bi < bitsForCurrentEntry.length; bi++) activeBits.add(bitsForCurrentEntry[bi]);
          }
          if (activeBits.size > 0) {
            r.animationFocusBits = activeBits;
            const style = options.animStyle;
            if (style === 'ripple') r.renderRipple(0.18, activeBits, { intensity: 1.05 });
            else if (style === 'pulse') r.renderPulse(0.28, activeBits, { intensity: 1.15 });
            else if (style === 'fade') r.renderFade(0.35);
            else if (style === 'spark') r.renderSpark(0.18);
            else if (style === 'sweep') r.renderSweep(0.22);
            else if (style === 'glow') r.renderGlow(0.25);
          }
        }
        if (t < effectiveEndProgress) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }
        r.setMaskGhostBits(new Set());
        r.showMaskWriteOverlay = previousShowMaskOverlay;
        // item 486: clear animationFocusBits set during combined per-group effects
        if (options.animStyle && r.animationFocusBits) r.animationFocusBits = new Set();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(effectiveEndProgress * 100));
        rippleRef.current = null;
        resolve();
      };

      rippleRef.current = requestAnimationFrame(tick);
    });
  }, [
    rendererRef,
    rippleRef,
    seekGenRef,
    globalPausedRef,
    currentMaskAnimIntervalRef,
    stepScrubProgressRef,
    getAnimationTimingPlan,
    getMinimapDetailH,
    clampMs,
    aggMaskStepSetterRef,
  ]);

  return { runMaskStampAnimation };
}
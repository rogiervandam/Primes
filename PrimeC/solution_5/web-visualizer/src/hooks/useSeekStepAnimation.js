import { useCallback } from 'react';

export function useSeekStepAnimation({
  seekGenRef,
  stopPlayback,
  stopSeqAnim,
  pausedStepAnimLoopRef,
  selectedAnimLoopRef,
  setIsSingleEventLoopActive,
  setIsAnimationReplayPaused,
  setDelayPhaseMsRef,
  rendererRef,
  currentStep,
  stepsRef,
  bitStateRef,
  selectedStepsRef,
  bitAnimationModeRef,
  animMode,
  animStyle,
  bitStateDirtyRef,
  bitsAtTimeRatioRef,
  getMinimapDetailH,
  aggMaskStepSetterRef,
}) {
  const seekStepAnimation = useCallback((progress) => {
    seekGenRef.current += 1;
    stopPlayback();
    stopSeqAnim();
    if (pausedStepAnimLoopRef.current) {
      clearTimeout(pausedStepAnimLoopRef.current);
      pausedStepAnimLoopRef.current = null;
    }
    if (selectedAnimLoopRef.current) {
      clearTimeout(selectedAnimLoopRef.current);
      selectedAnimLoopRef.current = null;
    }
    setIsSingleEventLoopActive(false);
    setIsAnimationReplayPaused(true);
    setDelayPhaseMsRef.current(null);
    const r = rendererRef.current;
    const stepIdx = currentStep;
    const allSteps = stepsRef.current;
    const step = allSteps[stepIdx];
    const bs = bitStateRef.current;
    if (!r || !step || !bs) return;
    const clamped = Math.max(0, Math.min(1, progress));

    const selSteps = selectedStepsRef.current;
    if (selSteps.size > 1) {
      const mode = bitAnimationModeRef.current;
      const aggHasMask = !!(r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0
        && Number.isFinite(r.maskWordBits) && r.maskWordBits > 0);
      const inMaskOrCombinedAgg = (mode === 'mask' || mode === 'combined') && aggHasMask;

      if (inMaskOrCombinedAgg) {
        const t = clamped;
        if (mode === 'combined') {
          const mergedBits = new Set();
          let minIdx = Infinity;
          for (const idx of selSteps) {
            if (idx < minIdx) minIdx = idx;
            const s = allSteps[idx];
            if (s && s.changedBits) for (let j = 0; j < s.changedBits.length; j++) mergedBits.add(s.changedBits[j]);
          }
          const sorted = Array.from(mergedBits).sort((a, b) => a - b);
          bs.fill(0);
          for (let i = 0; i < minIdx; i++) {
            const s = allSteps[i];
            for (let j = 0; j < s.changedBits.length; j++) {
              const bit = s.changedBits[j];
              if (bit < bs.length) bs[bit] = 1;
            }
          }
          const revealCount = Math.floor(t * sorted.length);
          for (let i = 0; i < revealCount; i++) {
            const bit = sorted[i];
            if (bit < bs.length) bs[bit] = 1;
          }
          r.bitState = bs;
          bitStateDirtyRef.current = revealCount < sorted.length;
        }
        const targetBits = (r.targetBits && r.targetBits.size > 0) ? r.targetBits : new Set(r.changedBits || []);
        r.changedBits = new Set(targetBits);
        const slotGroups = r._maskEntriesBySlot ? r._maskEntriesBySlot() : [];
        // Update detail panel's current agg mask step when scrubbing.
        if (aggMaskStepSetterRef?.current && slotGroups.length > 0) {
          const firstGroupEntries = slotGroups[0];
          const currentEntryIndex = Math.min(firstGroupEntries.length - 1, Math.floor(t * firstGroupEntries.length));
          const currentEventId = firstGroupEntries[currentEntryIndex]?.eventId ?? -1;
          if (currentEventId >= 0) {
            // Build ordered event-ID list from entries to find this event's index
            const seenEventIds = [];
            for (let gi = 0; gi < slotGroups.length; gi++) {
              for (let ei = 0; ei < slotGroups[gi].length; ei++) {
                const eid = slotGroups[gi][ei].eventId;
                if (eid >= 0 && !seenEventIds.includes(eid)) seenEventIds.push(eid);
              }
            }
            const stepIdx = seenEventIds.indexOf(currentEventId);
            if (stepIdx >= 0) aggMaskStepSetterRef.current(stepIdx);
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
              const bitsForEntry = r._maskEntryBits ? r._maskEntryBits(entries[entryIndex]) : [];
              for (let bi = 0; bi < bitsForEntry.length; bi++) ghostBits.add(bitsForEntry[bi]);
            }
          }
        } else if (r.targetBits?.size) {
          for (const bit of r.targetBits) ghostBits.add(bit);
        }
        r.showMaskWriteOverlay = false;
        r.setMaskGhostBits(ghostBits);
        r.render();
        const orderedWrites = r.maskWriteOrderWords?.length || 0;
        if (orderedWrites > 0) r.renderMaskHover(t);
        else r.renderMaskStamp(t);
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        r.showMaskWriteOverlay = true;
        if (mode === 'mask') bitStateDirtyRef.current = clamped < 0.999;
        return;
      }

      const mergedSet = new Set();
      let minStepIdx = Infinity;
      for (const idx of selSteps) {
        if (idx < minStepIdx) minStepIdx = idx;
        const s = allSteps[idx];
        if (s && s.changedBits) {
          for (let j = 0; j < s.changedBits.length; j++) mergedSet.add(s.changedBits[j]);
        }
      }
      const aggBits = Array.from(mergedSet).sort((a, b) => a - b);
      if (aggBits.length > 0) {
        const isAllMode = (animMode !== 'sequential' && animMode !== 'bounce');
        bs.fill(0);
        for (let i = 0; i < minStepIdx; i++) {
          const s = allSteps[i];
          for (let j = 0; j < s.changedBits.length; j++) {
            const bit = s.changedBits[j];
            if (bit < bs.length) bs[bit] = 1;
          }
        }
        if (isAllMode) {
          for (let i = 0; i < aggBits.length; i++) {
            const bit = aggBits[i];
            if (bit < bs.length) bs[bit] = 1;
          }
          bitStateDirtyRef.current = false;
          const changedFull = new Set(aggBits);
          r.bitState = bs;
          r.changedBits = changedFull;
          r.animationFocusBits = changedFull;
          r.render();
          if (animStyle === 'ripple') r.renderRipple(clamped);
          else if (animStyle === 'fade') r.renderFade(clamped);
          else if (animStyle === 'pulse') r.renderPulse(clamped);
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        } else {
          const revealCount = bitsAtTimeRatioRef.current
            ? bitsAtTimeRatioRef.current(clamped, aggBits.length)
            : Math.round(clamped * aggBits.length);
          const targetIdx = Math.max(0, Math.min(aggBits.length - 1, revealCount - 1));
          const revealed = new Set();
          for (let i = 0; i <= targetIdx; i++) {
            const bit = aggBits[i];
            if (bit < bs.length) bs[bit] = 1;
            revealed.add(bit);
          }
          bitStateDirtyRef.current = targetIdx < aggBits.length - 1;
          const focusBits = new Set([aggBits[targetIdx]]);
          r.bitState = bs;
          r.changedBits = revealed;
          r.animationFocusBits = focusBits;
          r.render();
          // item 234: show motion trail while scrubbing aggregate sequential animation
          if (targetIdx > 0 && r.clearBitMotionTrails) {
            r.clearBitMotionTrails();
            r.addBitMotionTrail(aggBits[targetIdx - 1], aggBits[targetIdx]);
            r.renderBitMotionTrails();
          }
          if (animStyle === 'ripple') r.renderRipple(0.18, focusBits, { intensity: 1.1, showBeacon: true });
          else if (animStyle === 'pulse') r.renderPulse(0.28, focusBits, { intensity: 1.2, showHalo: true });
          else if (animStyle === 'fade') r.renderFade(0.35);
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        }
      }
      return;
    }

    const mode = bitAnimationModeRef.current;
    const stepHasMask = !!(step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0
      && Number.isFinite(step.maskWordBits) && step.maskWordBits > 0);
    const inMaskOrCombined = (mode === 'mask' || mode === 'combined') && stepHasMask;
    if (inMaskOrCombined) {
      const t = clamped;

      if (mode === 'combined' && step.changedBits && step.changedBits.length > 0) {
        const sorted = Array.from(step.changedBits).sort((a, b) => a - b);
        bs.fill(0);
        for (let i = 0; i < stepIdx; i++) {
          const s = allSteps[i];
          for (let j = 0; j < s.changedBits.length; j++) {
            const bit = s.changedBits[j];
            if (bit < bs.length) bs[bit] = 1;
          }
        }
        const revealCount = Math.floor(t * sorted.length);
        for (let i = 0; i < revealCount; i++) {
          const bit = sorted[i];
          if (bit < bs.length) bs[bit] = 1;
        }
        r.bitState = bs;
        bitStateDirtyRef.current = revealCount < sorted.length;
      }

      const targetBits = (r.targetBits && r.targetBits.size > 0) ? r.targetBits : new Set(step.changedBits || []);
      r.changedBits = new Set(targetBits);
      const slotGroups = r._maskEntriesBySlot ? r._maskEntriesBySlot() : [];
      const ghostBits = new Set();
      if (slotGroups.length > 0) {
        for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
          const entries = slotGroups[groupIndex];
          if (!entries || entries.length === 0) continue;
          const segmentCount = Math.max(1, entries.length);
          const unit = t * segmentCount;
          const index = Math.min(entries.length - 1, Math.floor(unit));
          const local = Math.max(0, Math.min(1, unit - index));
          for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
            const isStamped = entryIndex < index || entryIndex === index || (entryIndex === index + 1 && local > 0.78);
            if (isStamped) continue;
            const bitsForEntry = r._maskEntryBits ? r._maskEntryBits(entries[entryIndex]) : [];
            for (let bi = 0; bi < bitsForEntry.length; bi++) ghostBits.add(bitsForEntry[bi]);
          }
        }
      } else if (r.targetBits?.size) {
        for (const bit of r.targetBits) ghostBits.add(bit);
      }
      r.showMaskWriteOverlay = false;
      r.setMaskGhostBits(ghostBits);
      r.render();
      const orderedWrites = r.maskWriteOrderWords?.length || 0;
      if (orderedWrites > 0) r.renderMaskHover(t);
      else r.renderMaskStamp(t);
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      r.showMaskWriteOverlay = true;
      if (mode === 'mask') bitStateDirtyRef.current = clamped < 0.999;
      return;
    }

    const isAllMode = (animMode !== 'sequential' && animMode !== 'bounce');
    if (!inMaskOrCombined && isAllMode) {
      bs.fill(0);
      for (let i = 0; i <= stepIdx; i++) {
        const s = allSteps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const b = s.changedBits[j];
          if (b < bs.length) bs[b] = 1;
        }
      }
      bitStateDirtyRef.current = false;
      r.bitState = bs;
      const changedFull = new Set(step.changedBits);
      r.changedBits = changedFull;
      r.animationFocusBits = changedFull;
      r.render();
      if (animStyle === 'ripple') r.renderRipple(clamped);
      else if (animStyle === 'fade') r.renderFade(clamped);
      else if (animStyle === 'pulse') r.renderPulse(clamped);
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      return;
    }

    if (!step.changedBits || step.changedBits.length === 0) return;
    const bits = Array.from(step.changedBits).sort((a, b) => a - b);
    const revealCount = bitsAtTimeRatioRef.current
      ? bitsAtTimeRatioRef.current(clamped, bits.length)
      : Math.round(clamped * bits.length);
    const targetIdx = Math.max(0, Math.min(bits.length - 1, revealCount - 1));

    bs.fill(0);
    for (let i = 0; i < stepIdx; i++) {
      const s = allSteps[i];
      for (let j = 0; j < s.changedBits.length; j++) {
        const bit = s.changedBits[j];
        if (bit < bs.length) bs[bit] = 1;
      }
    }
    const revealed = new Set();
    for (let i = 0; i <= targetIdx; i++) {
      const bit = bits[i];
      if (bit < bs.length) bs[bit] = 1;
      revealed.add(bit);
    }
    bitStateDirtyRef.current = targetIdx < bits.length - 1;

    const focusBits = new Set([bits[targetIdx]]);
    r.bitState = bs;
    r.changedBits = revealed;
    r.animationFocusBits = focusBits;
    r.render();
    // item 234: show motion trail while scrubbing the per-step animation timeline
    if (targetIdx > 0 && r.clearBitMotionTrails) {
      r.clearBitMotionTrails();
      r.addBitMotionTrail(bits[targetIdx - 1], bits[targetIdx]);
      r.renderBitMotionTrails();
    }
    if (animStyle === 'ripple') r.renderRipple(0.18, focusBits, { intensity: 1.1, showBeacon: true });
    else if (animStyle === 'pulse') r.renderPulse(0.28, focusBits, { intensity: 1.2, showHalo: true });
    else if (animStyle === 'fade') r.renderFade(0.35);
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
  }, [
    seekGenRef,
    stopPlayback,
    stopSeqAnim,
    pausedStepAnimLoopRef,
    selectedAnimLoopRef,
    setIsSingleEventLoopActive,
    setIsAnimationReplayPaused,
    setDelayPhaseMsRef,
    rendererRef,
    currentStep,
    stepsRef,
    bitStateRef,
    selectedStepsRef,
    bitAnimationModeRef,
    animMode,
    animStyle,
    bitStateDirtyRef,
    bitsAtTimeRatioRef,
    getMinimapDetailH,
    aggMaskStepSetterRef,
  ]);

  return { seekStepAnimation };
}
import { useCallback } from 'react';

export function useTriggerAnimation({ ...flatArgs }) {
  const animRefs = flatArgs.animRefs || flatArgs;
  const animConfig = flatArgs.animConfig || flatArgs;
  const animState = flatArgs.animState || flatArgs;
  const animHandlers = flatArgs.animHandlers || flatArgs;

  const {
    seekGenRef,
    stopSeqAnimRef,
    stepScrubProgressRef,
    rendererRef,
    bitAnimationModeRef,
    computeEventDurationRef,
    animBusyUntilRef,
    currentMaskAnimIntervalRef,
    currentAnimIntervalRef,
    bitStateRef,
    stepsRef,
    bitStateDirtyRef,
    setDelayPhaseMsRef,
    setIsStepAnimRunningRef,
    seqTimerRef,
    timeRatioAtBitIndexRef,
    bitsAtTimeRatioRef,
    globalPausedRef,
  } = animRefs;

  const {
    pinnedBitIndices,
    effectiveGroupBits,
    maskAnimInterval,
    animMode,
    animStyle,
  } = animConfig;

  const {
    currentStep,
  } = animState;

  const {
    getAnimationTimingPlan,
    getAnimationBitInterval,
    estimateAnimDuration,
    fadeOutCurrentHighlights,
    runMaskStampAnimation,
    waitForDelay,
    getMinimapDetailH,
    runEffect,
  } = animHandlers;

  const triggerAnimation = useCallback(async (changedSet, options = {}) => {
    const mySeekGen = seekGenRef.current;
    const isStillLive = () => seekGenRef.current === mySeekGen;
    const resuming = (!!options.startIndex && options.startIndex > 0) ||
      (Number.isFinite(options.startProgress) && options.startProgress > 0);
    // item 441: cap animation at endProgress (0-1) to support repeat end handle
    const effectiveEndProgress = Number.isFinite(options.endProgress)
      ? Math.max(0.01, Math.min(1, options.endProgress))
      : 1;
    if (!options.keepProgress) {
      stopSeqAnimRef.current?.();
      if (!resuming && stepScrubProgressRef.current) stepScrubProgressRef.current(0);
    }
    const r = rendererRef.current;
    const mode = bitAnimationModeRef.current;
    const maskModeActive = mode === 'mask' || mode === 'combined';
    const combinedMode = mode === 'combined';
    const hasMaskAnimation = !!(maskModeActive && r && r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0 && Number.isFinite(r.maskWordBits) && r.maskWordBits > 0);
    if (!r || !changedSet || (!hasMaskAnimation && changedSet.size === 0) || (!hasMaskAnimation && changedSet.size >= 100000)) return;

    const animatedBitCount = changedSet.size > 0 ? changedSet.size : Math.max(1, r.targetBits?.size || r.maskWriteOrderWords?.length || 1);
    const timingBaseOptions = {
      ...options,
      pinnedBitIndices: options.pinnedBitIndices ?? pinnedBitIndices,
      groupBits: options.groupBits ?? effectiveGroupBits,
    };
    const delayMs = Math.max(0, timingBaseOptions.delayMs ?? 0);
    const eventNormalMs = computeEventDurationRef.current
      ? computeEventDurationRef.current(animatedBitCount)
      : null;
    const requestedCycleDuration = Number.isFinite(timingBaseOptions.playbackDurationMs)
      ? Math.max(0, timingBaseOptions.playbackDurationMs)
      : null;
    const explicitDuration = Number.isFinite(timingBaseOptions.durationMs)
      ? Math.max(80, timingBaseOptions.durationMs)
      : null;
    const requestedAnimationDuration = explicitDuration != null
      ? explicitDuration
      : (requestedCycleDuration != null
        ? Math.max(120, requestedCycleDuration - delayMs)
        : eventNormalMs);
    const durationOptions = requestedAnimationDuration != null
      ? { ...timingBaseOptions, adaptiveDuration: true, durationMs: requestedAnimationDuration }
      : timingBaseOptions;
    const adaptivePlan = getAnimationTimingPlan(animatedBitCount, durationOptions);
    const timingOptions = adaptivePlan ? { ...durationOptions, adaptivePlan } : durationOptions;
    const effectiveBitInterval = getAnimationBitInterval(animatedBitCount, timingOptions);
    const est = estimateAnimDuration(animatedBitCount, timingOptions);
    const totalCycleDuration = requestedCycleDuration != null ? Math.max(requestedCycleDuration, est + delayMs) : est + delayMs;
    animBusyUntilRef.current = performance.now() + totalCycleDuration;

    if (!options.keepProgress && !resuming) {
      await fadeOutCurrentHighlights(options);
      if (!isStillLive()) return;
    }

    if (hasMaskAnimation) {
      if (combinedMode) {
        r.changedBits = new Set();
      } else if (!r.changedBits || r.changedBits.size === 0) {
        r.changedBits = new Set(changedSet.size > 0 ? changedSet : (r.targetBits || []));
      }
      const { durationMs: _ignoredDurationMs, ...maskTimingBaseOptions } = timingOptions;
      void _ignoredDurationMs;
      const maskTotalDurationMs = requestedAnimationDuration != null
        ? requestedAnimationDuration
        : (computeEventDurationRef.current ? computeEventDurationRef.current(animatedBitCount) : null);
      const resumeStartProgress = resuming
        ? Math.max(0, Math.min(0.999, (Number(options.startProgress) ?? (stepScrubProgressRef.current ? 0 : 0)) || 0))
        : 0;
      let combinedBitsConfig = null;
      if (combinedMode) {
        const stepIdx = currentStep;
        const bs = bitStateRef.current;
        const allSteps = stepsRef.current;
        const step = allSteps[stepIdx];
        if (bs && step && step.changedBits && step.changedBits.length > 0) {
          const sorted = Array.from(step.changedBits).sort((a, b) => a - b);
          bs.fill(0);
          for (let i = 0; i < stepIdx; i++) {
            const s = allSteps[i];
            for (let j = 0; j < s.changedBits.length; j++) {
              const bit = s.changedBits[j];
              if (bit < bs.length) bs[bit] = 1;
            }
          }
          if (resumeStartProgress > 0) {
            const seedTo = Math.floor(resumeStartProgress * sorted.length);
            for (let i = 0; i < seedTo; i++) {
              const bit = sorted[i];
              if (bit < bs.length) bs[bit] = 1;
            }
          }
          r.bitState = bs;
          bitStateDirtyRef.current = true;
          combinedBitsConfig = { sortedBits: sorted, bs };
        }
      }
      const maskTimingOptions = {
        ...maskTimingBaseOptions,
        preferredIntervalMs: Math.max(0, currentMaskAnimIntervalRef.current || maskAnimInterval || 20),
        startProgress: resumeStartProgress,
        endProgress: effectiveEndProgress < 1 ? effectiveEndProgress : undefined,
        combinedBits: combinedBitsConfig,
        durationMs: maskTotalDurationMs,
      };
      const effectiveMaskBitInterval = Math.max(5, maskTimingOptions.preferredIntervalMs || 20);
      r.setMaskGhostBits(new Set(changedSet.size > 0 ? changedSet : (r.targetBits || [])));
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(true);
      if (!resuming && stepScrubProgressRef.current) stepScrubProgressRef.current(0);
      await runMaskStampAnimation(effectiveMaskBitInterval, maskTimingOptions);
      if (!isStillLive()) return;
      if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(effectiveEndProgress * 100));
      if (combinedMode && combinedBitsConfig) {
        const { sortedBits, bs } = combinedBitsConfig;
        for (let i = 0; i < sortedBits.length; i++) {
          const bit = sortedBits[i];
          if (bit < bs.length) bs[bit] = 1;
        }
        bitStateDirtyRef.current = false;
      }
      if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      if (!isStillLive()) return;
      if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(false);
      return;
    }

    if ((animMode === 'sequential' || animMode === 'bounce') && effectiveBitInterval > 0) {
      const bits = Array.from(changedSet).sort((a, b) => a - b);
      const fullChanged = new Set(changedSet);
      const requestedStart = Math.max(0, Math.min(
        bits.length - 1,
        parseInt(options.startIndex || 0, 10) || 0
      ));
      let idx = requestedStart;
      if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(true);
      let previousFocusBit = null;
      const trailSize = animMode === 'bounce' ? Math.min(8, Math.max(3, Math.round(bits.length / 18))) : 0;

      const buildBounceTrail = () => {
        const trail = [];
        const direction = 1;
        for (let offset = 0; offset < trailSize; offset++) {
          const trailIdx = idx - direction * offset;
          if (trailIdx < 0 || trailIdx >= bits.length) continue;
          trail.push(bits[trailIdx]);
        }
        return trail;
      };

      await new Promise((resolve) => {
        const totalDuration = Math.max(120, computeEventDurationRef.current
          ? computeEventDurationRef.current(bits.length)
          : bits.length * 50);
        const isBounce = animMode === 'bounce';
        let virtualElapsed = requestedStart > 0 && !isBounce && timeRatioAtBitIndexRef.current
          ? Math.min(totalDuration - 1, timeRatioAtBitIndexRef.current(requestedStart, bits.length) * totalDuration)
          : 0;
        let lastTickAt = performance.now();
        let lastRevealedCount = -1;

        const renderFrame = (revealedCount, focusBit, t) => {
          const partial = isBounce
            ? new Set(buildBounceTrail())
            : (() => {
                const value = new Set();
                const cap = Math.min(bits.length, revealedCount);
                for (let i = 0; i < cap; i++) value.add(bits[i]);
                return value;
              })();
          const focusBits = isBounce
            ? new Set(buildBounceTrail().slice(0, Math.max(1, Math.min(3, trailSize))))
            : new Set([focusBit]);
          r.changedBits = partial;
          r.animationFocusBits = focusBits;
          if (!isBounce && previousFocusBit != null && previousFocusBit !== focusBit) {
            r.addBitMotionTrail(previousFocusBit, focusBit, {
              duration: Math.max(220, Math.min(900, effectiveBitInterval * 10)),
              intensity: 1,
            });
          }
          r.render();
          r.renderBitMotionTrails();
          if (animStyle === 'ripple' && focusBits.size > 0) {
            r.renderRipple(0.18, focusBits, { intensity: isBounce ? 1.25 : 1.05, showBeacon: true });
          } else if (animStyle === 'pulse' && focusBits.size > 0) {
            r.renderPulse(0.28, focusBits, { intensity: isBounce ? 1.35 : 1.15, showHalo: true });
          } else if (animStyle === 'fade' && partial.size > 0) {
            r.renderFade(isBounce ? 0.22 : 0.35);
          }
          if (isBounce && partial.size > 0) {
            r.renderFade(0.25);
          }
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
          previousFocusBit = focusBit;
          if (stepScrubProgressRef.current) {
            stepScrubProgressRef.current(Math.round(Math.max(0, Math.min(1, t)) * 100));
          }
        };

        const tick = () => {
          if (!rendererRef.current) {
            resolve();
            return;
          }
          if (!isStillLive()) {
            resolve();
            return;
          }
          if (globalPausedRef.current) {
            lastTickAt = performance.now();
            seqTimerRef.current = requestAnimationFrame(tick);
            return;
          }
          const now = performance.now();
          // item 257: scale dt by live/initial interval ratio so speed changes apply immediately
          const initialSeqInterval = Math.max(1, effectiveBitInterval || 20);
          const liveSeqInterval = Math.max(1, currentAnimIntervalRef?.current || initialSeqInterval);
          const speedMultiplier = initialSeqInterval / liveSeqInterval;
          virtualElapsed += Math.max(0, now - lastTickAt) * speedMultiplier;
          lastTickAt = now;
          const t = Math.min(effectiveEndProgress, virtualElapsed / totalDuration);

          let revealedCount;
          let focusBit;
          if (isBounce) {
            const phase = t * 2;
            const len = Math.max(1, bits.length - 1);
            idx = phase <= 1
              ? Math.round(phase * len)
              : Math.round((2 - phase) * len);
            idx = Math.max(0, Math.min(bits.length - 1, idx));
            revealedCount = idx + 1;
            focusBit = bits[idx];
          } else {
            revealedCount = Math.max(0, Math.min(bits.length, bitsAtTimeRatioRef.current
              ? bitsAtTimeRatioRef.current(t, bits.length)
              : Math.round(t * bits.length)));
            const fIdx = Math.max(0, Math.min(bits.length - 1, revealedCount - 1));
            focusBit = bits[fIdx];
            idx = fIdx;
          }

          if (revealedCount !== lastRevealedCount || isBounce) {
            renderFrame(revealedCount, focusBit, t);
            lastRevealedCount = revealedCount;
          } else {
            if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(t * 100));
            if (!isBounce && r.bitMotionTrails && r.bitMotionTrails.length > 0) {
              r.render();
              r.renderBitMotionTrails();
              if (animStyle === 'ripple' && r.animationFocusBits && r.animationFocusBits.size > 0) {
                r.renderRipple(0.18, r.animationFocusBits, { intensity: 1.05, showBeacon: true });
              } else if (animStyle === 'pulse' && r.animationFocusBits && r.animationFocusBits.size > 0) {
                r.renderPulse(0.28, r.animationFocusBits, { intensity: 1.15, showHalo: true });
              } else if (animStyle === 'fade' && r.changedBits && r.changedBits.size > 0) {
                r.renderFade(0.35);
              }
            }
          }

          if (t >= effectiveEndProgress) {
            // When stopping early (endProgress < 1), show bits up to that fraction
            const finalChanged = effectiveEndProgress < 1
              ? (() => { const s = new Set(); const cap = Math.round(effectiveEndProgress * bits.length); for (let i = 0; i < cap; i++) s.add(bits[i]); return s; })()
              : fullChanged;
            r.changedBits = finalChanged;
            r.animationFocusBits = new Set();
            r.render();
            r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
            if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(effectiveEndProgress * 100));
            resolve();
            return;
          }
          seqTimerRef.current = requestAnimationFrame(tick);
        };

        const seededChangedBits = new Set();
        if (requestedStart > 0 && !isBounce) {
          for (let i = 0; i < requestedStart; i++) seededChangedBits.add(bits[i]);
        }
        r.changedBits = seededChangedBits;
        r.animationFocusBits = new Set();
        r.clearBitMotionTrails();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        seqTimerRef.current = requestAnimationFrame(tick);
      });

      r.animationFocusBits = new Set();
      if (!isStillLive()) return;
      if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      if (!isStillLive()) return;
      if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(false);
      return;
    }

    if (animStyle === 'none') {
      r.changedBits = new Set(changedSet);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(effectiveEndProgress * 100));
      if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      return;
    }

    r.changedBits = new Set(changedSet);
    r.animationFocusBits = new Set(changedSet);
    if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(true);
    if (!options.keepProgress && !resuming && stepScrubProgressRef.current) stepScrubProgressRef.current(0);
    await runEffect(
      animStyle,
      timingOptions.adaptivePlan ? Math.min(3200, timingOptions.adaptivePlan.totalDuration) : undefined,
      (p) => { if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(p * 100)); },
    );
    if (!isStillLive()) return;
    r.animationFocusBits = new Set();
    if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(effectiveEndProgress * 100));
    if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
    await waitForDelay(delayMs);
    setDelayPhaseMsRef.current(null);
    if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(false);
  }, [
    seekGenRef,
    stopSeqAnimRef,
    stepScrubProgressRef,
    rendererRef,
    bitAnimationModeRef,
    pinnedBitIndices,
    effectiveGroupBits,
    computeEventDurationRef,
    getAnimationTimingPlan,
    getAnimationBitInterval,
    estimateAnimDuration,
    animBusyUntilRef,
    fadeOutCurrentHighlights,
    currentMaskAnimIntervalRef,
    currentAnimIntervalRef,
    maskAnimInterval,
    currentStep,
    bitStateRef,
    stepsRef,
    bitStateDirtyRef,
    setDelayPhaseMsRef,
    setIsStepAnimRunningRef,
    runMaskStampAnimation,
    waitForDelay,
    animMode,
    seqTimerRef,
    timeRatioAtBitIndexRef,
    bitsAtTimeRatioRef,
    globalPausedRef,
    getMinimapDetailH,
    animStyle,
    runEffect,
  ]);

  return { triggerAnimation };
}
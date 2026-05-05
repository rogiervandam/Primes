import { useCallback, useEffect } from 'react';
import {
  clampMs as clampMsPure,
  bitsAtTimeRatio as bitsAtTimeRatioPure,
  timeRatioAtBitIndex as timeRatioAtBitIndexPure,
  computeEventNormalDuration as computeEventNormalDurationPure,
  computeEventDuration as computeEventDurationPure,
  getFadeOutDuration as getFadeOutDurationPure,
} from '../lib/animationTiming';
import { DEFAULT_EVENT_TIME_TARGETS } from '../lib/viewPrefs';

export function useAnimationTimingRuntime({
  bitAnimInterval,
  maskAnimInterval,
  currentAnimIntervalRef,
  currentMaskAnimIntervalRef,
  eventTimeTargetsRef,
  eventDurationModeRef,
  playSpeedPercentRef,
  computeEventDurationRef,
  bitsAtTimeRatioRef,
  timeRatioAtBitIndexRef,
  animMode,
  animStyle,
  rendererRef,
  rippleRef,
  getMinimapDetailH,
}) {
  const clampMs = useCallback(clampMsPure, []);

  const getAnimationTimingPlan = useCallback((bitCount, options = {}) => {
    if (!options.adaptiveDuration) return null;
    const count = Math.max(1, bitCount || 0);
    const requestedDuration = Number.isFinite(options.durationMs) ? clampMs(options.durationMs, 120, 30000) : null;
    const preferredInterval = Math.max(
      18,
      Number.isFinite(options.preferredIntervalMs)
        ? options.preferredIntervalMs
        : (currentAnimIntervalRef.current || bitAnimInterval || 20)
    );
    const preferredTotal = count * preferredInterval;
    const maxTotal = 10000;
    const minTotal = 2800;

    if (requestedDuration != null) {
      const interval = Math.max(5, requestedDuration / count);
      return { startInterval: interval, endInterval: interval, accelerateAfter: 1, totalDuration: requestedDuration };
    }

    if (preferredTotal <= minTotal) {
      const interval = minTotal / count;
      return { startInterval: interval, endInterval: interval, accelerateAfter: 1, totalDuration: minTotal };
    }

    if (preferredTotal <= maxTotal) {
      return { startInterval: preferredInterval, endInterval: preferredInterval, accelerateAfter: 1, totalDuration: preferredTotal };
    }

    const accelerateAfter = 0.68;
    const frontCount = Math.max(1, Math.floor(count * accelerateAfter));
    const tailCount = Math.max(1, count - frontCount);
    let startInterval = preferredInterval;
    let endInterval = Math.max(3, startInterval * 0.18);

    let tailBudget = maxTotal - frontCount * startInterval;
    if (tailBudget < tailCount * 3.5) {
      startInterval = Math.max(8, maxTotal / Math.max(1, frontCount + tailCount * 0.35));
      tailBudget = maxTotal - frontCount * startInterval;
    }
    if (tailBudget > 0) {
      const solvedEnd = ((tailBudget * 2) / tailCount) - startInterval;
      endInterval = Math.max(2, Math.min(startInterval * 0.4, solvedEnd));
    }

    let estimated = frontCount * startInterval + tailCount * ((startInterval + endInterval) / 2);
    if (estimated > maxTotal) {
      const scale = maxTotal / estimated;
      startInterval = Math.max(12, startInterval * scale);
      endInterval = Math.max(2, endInterval * scale);
      estimated = frontCount * startInterval + tailCount * ((startInterval + endInterval) / 2);
    }

    return {
      startInterval,
      endInterval,
      accelerateAfter,
      totalDuration: Math.max(minTotal, Math.min(maxTotal, estimated)),
      exponential: true,
    };
  }, [bitAnimInterval, clampMs, currentAnimIntervalRef]);

  const getAnimationBitInterval = useCallback((bitCount, options = {}) => {
    const plan = options.adaptivePlan || getAnimationTimingPlan(bitCount, options);
    if (plan) return Math.max(0, plan.startInterval || 0);
    if (Number.isFinite(options.preferredIntervalMs)) {
      return Math.max(0, options.preferredIntervalMs);
    }
    return Math.max(0, currentAnimIntervalRef.current || bitAnimInterval || 20);
  }, [bitAnimInterval, currentAnimIntervalRef, getAnimationTimingPlan]);

  const getCurrentLoopInterval = useCallback((fallback, options = {}, progress = 0, focusBit = null) => {
    const plan = options.adaptivePlan || null;
    const baseInterval = (() => {
      if (!plan) return Math.max(0, currentAnimIntervalRef.current || fallback || 20);
      const clampedProgress = Math.max(0, Math.min(1, progress));
      if (clampedProgress <= plan.accelerateAfter) return Math.max(0, plan.startInterval || fallback || 20);
      const local = (clampedProgress - plan.accelerateAfter) / Math.max(0.0001, 1 - plan.accelerateAfter);
      if (plan.exponential && plan.startInterval > 0 && plan.endInterval > 0) {
        const ratio = plan.endInterval / Math.max(0.0001, plan.startInterval);
        return Math.max(0, plan.startInterval * Math.pow(ratio, local));
      }
      return Math.max(0, plan.startInterval + (plan.endInterval - plan.startInterval) * local);
    })();

    if (!Number.isFinite(focusBit) || !Array.isArray(options.pinnedBitIndices) || options.pinnedBitIndices.length === 0) {
      return baseInterval;
    }

    const groupBits = Math.max(1, Number(options.groupBits) || 64);
    const focusGroup = Math.floor(Number(focusBit) / groupBits);
    let slowFactor = 1;
    for (let index = 0; index < options.pinnedBitIndices.length; index++) {
      const pinnedBit = Number(options.pinnedBitIndices[index]);
      if (!Number.isFinite(pinnedBit) || pinnedBit < 0) continue;
      const pinnedGroup = Math.floor(pinnedBit / groupBits);
      const dist = Math.abs(pinnedGroup - focusGroup);
      if (dist === 0) {
        slowFactor = Math.max(slowFactor, 1.7);
      } else if (dist === 1) {
        slowFactor = Math.max(slowFactor, 1.35);
      } else if (dist === 2) {
        slowFactor = Math.max(slowFactor, 1.18);
      }
    }

    return baseInterval * slowFactor;
  }, [currentAnimIntervalRef]);

  useEffect(() => {
    currentAnimIntervalRef.current = Math.max(0, bitAnimInterval || 20);
  }, [bitAnimInterval, currentAnimIntervalRef]);

  useEffect(() => {
    currentMaskAnimIntervalRef.current = Math.max(0, maskAnimInterval || 20);
  }, [maskAnimInterval, currentMaskAnimIntervalRef]);

  const getFadeOutDuration = useCallback((bitCount, options = {}) => (
    getFadeOutDurationPure(bitCount, options)
  ), []);

  const computeEventNormalDuration = useCallback((bitCount) => (
    computeEventNormalDurationPure(bitCount, eventTimeTargetsRef.current || DEFAULT_EVENT_TIME_TARGETS)
  ), [eventTimeTargetsRef]);

  const computeEventDuration = useCallback((bitCount, modeOverride = null) => {
    void modeOverride;
    return computeEventDurationPure(
      bitCount,
      eventTimeTargetsRef.current || DEFAULT_EVENT_TIME_TARGETS,
      playSpeedPercentRef.current,
    );
  }, [eventTimeTargetsRef, playSpeedPercentRef]);

  const bitsAtTimeRatio = useCallback((timeRatio, bitCount, modeOverride = null) => (
    bitsAtTimeRatioPure(timeRatio, bitCount, modeOverride || eventDurationModeRef.current || 'progressive')
  ), [eventDurationModeRef]);

  const timeRatioAtBitIndex = useCallback((bitIdx, bitCount, modeOverride = null) => (
    timeRatioAtBitIndexPure(bitIdx, bitCount, modeOverride || eventDurationModeRef.current || 'progressive')
  ), [eventDurationModeRef]);

  computeEventDurationRef.current = computeEventDuration;
  bitsAtTimeRatioRef.current = bitsAtTimeRatio;
  timeRatioAtBitIndexRef.current = timeRatioAtBitIndex;

  const estimateAnimDuration = useCallback((bitCount, options = {}) => {
    const plan = options.adaptivePlan || getAnimationTimingPlan(bitCount, options);
    const effectiveBitInterval = getAnimationBitInterval(bitCount, { ...options, adaptivePlan: plan });
    const currentHighlighted = rendererRef.current?.changedBits?.size || 0;
    const fadeOutMs = currentHighlighted > 0 ? getFadeOutDuration(currentHighlighted, options) : 0;

    if (bitCount <= 0 || animStyle === 'none') {
      return fadeOutMs + (plan ? Math.min(3200, plan.totalDuration) : 0);
    }

    if (animMode === 'all' || effectiveBitInterval <= 0) {
      return fadeOutMs + (plan ? Math.min(3200, plan.totalDuration) : 620);
    }

    let revealMs = plan ? plan.totalDuration : bitCount * Math.max(10, effectiveBitInterval);
    if (animMode === 'bounce') {
      revealMs = plan ? Math.min(10000, revealMs * 1.35) : revealMs * 2;
    }

    return fadeOutMs + revealMs;
  }, [animMode, animStyle, getAnimationBitInterval, getAnimationTimingPlan, getFadeOutDuration, rendererRef]);

  const fadeOutCurrentHighlights = useCallback((options = {}) => {
    const r = rendererRef.current;
    const currentBits = options.fadeOutBits != null
      ? Array.from(options.fadeOutBits)
      : (r?.changedBits ? Array.from(r.changedBits) : []);
    if (!r || currentBits.length === 0 || options.skipFadeOut) return Promise.resolve();

    if (rippleRef.current) {
      cancelAnimationFrame(rippleRef.current);
      rippleRef.current = null;
    }

    const duration = getFadeOutDuration(currentBits.length, options);
    const fadingBits = new Set(currentBits);
    r.changedBits = fadingBits;
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / Math.max(1, duration));
        r.changedBits = fadingBits;
        r.render();
        r.renderFade(progress);
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        if (progress < 1) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }

        rippleRef.current = null;
        r.changedBits = new Set();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        resolve();
      };

      rippleRef.current = requestAnimationFrame(tick);
    });
  }, [getFadeOutDuration, getMinimapDetailH, rendererRef, rippleRef]);

  return {
    clampMs,
    getAnimationTimingPlan,
    getAnimationBitInterval,
    getCurrentLoopInterval,
    getFadeOutDuration,
    computeEventNormalDuration,
    computeEventDuration,
    bitsAtTimeRatio,
    timeRatioAtBitIndex,
    estimateAnimDuration,
    fadeOutCurrentHighlights,
  };
}
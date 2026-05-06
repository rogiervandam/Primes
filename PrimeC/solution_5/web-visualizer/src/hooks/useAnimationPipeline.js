import { useEffect } from 'react';
import { usePausableDelay } from './usePausableDelay';
import { useRunEffect } from './useRunEffect';
import { useAnimationTimingRuntime } from './useAnimationTimingRuntime';
import { useMaskStampAnimation } from './useMaskStampAnimation';
import { useTriggerAnimation } from './useTriggerAnimation';

/**
 * Bundles the entire animation engine: usePausableDelay → useRunEffect →
 * useAnimationTimingRuntime → useMaskStampAnimation → useTriggerAnimation,
 * plus:
 *   - triggerAnimationRef sync effect
 *   - animMode/animStyle replay effect (fires when anim mode/style changes)
 *   - bitAnimInterval live-update effect
 *
 * Returns nothing — `triggerAnimationRef.current` is kept in sync internally.
 */
export function useAnimationPipeline({
  // usePausableDelay
  globalPausedRef,
  seqTimerRef,
  // useRunEffect
  rendererRef,
  runEffectCancelRef,
  rippleRef,
  seekGenRef,
  getMinimapDetailH,
  // useAnimationTimingRuntime
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
  // useMaskStampAnimation
  stepScrubProgressRef,
  // useTriggerAnimation
  bitAnimationModeRef,
  pinnedBitIndices,
  effectiveGroupBits,
  animBusyUntilRef,
  currentStep,
  bitStateRef,
  stepsRef,
  bitStateDirtyRef,
  setDelayPhaseMsRef,
  setIsStepAnimRunningRef,
  stopSeqAnimRef,
  // triggerAnimationRef sync + animMode/animStyle replay effect
  triggerAnimationRef,
  isSingleEventLoopActiveRef,
  selectedAnimLoopRef,
  stepScrubProgressValueRef,
  stepResumeStartIndexRef,
  stepResumeMaskProgressRef,
  currentStepRef,
  initialHighlightHoldRef,
  steps,
  playing,
}) {
  const { waitForDelay } = usePausableDelay({ globalPausedRef, seqTimerRef });

  const { runEffect } = useRunEffect({
    rendererRef,
    runEffectCancelRef,
    rippleRef,
    seekGenRef,
    getMinimapDetailH,
  });

  const {
    clampMs,
    getAnimationTimingPlan,
    getAnimationBitInterval,
    estimateAnimDuration,
    fadeOutCurrentHighlights,
    timeRatioAtBitIndexRef: _tRatioRef,
    bitsAtTimeRatioRef: _bRatioRef,
  } = useAnimationTimingRuntime({
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
  });

  const { runMaskStampAnimation } = useMaskStampAnimation({
    rendererRef,
    rippleRef,
    seekGenRef,
    globalPausedRef,
    currentMaskAnimIntervalRef,
    stepScrubProgressRef,
    getAnimationTimingPlan,
    getMinimapDetailH,
    clampMs,
  });

  const { triggerAnimation } = useTriggerAnimation({
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
  });

  // Keep triggerAnimationRef in sync so other hooks can call via ref.
  useEffect(() => {
    triggerAnimationRef.current = triggerAnimation;
  }, [triggerAnimation, triggerAnimationRef]);

  // Replay current step when animation mode or style changes.
  // See Visualizer.jsx for the full design rationale.
  useEffect(() => {
    if (initialHighlightHoldRef.current) return;

    const rawProgress = stepScrubProgressValueRef.current; // 0-100
    const startFraction = (rawProgress > 2 && rawProgress < 98) ? rawProgress / 100 : 0;

    if (isSingleEventLoopActiveRef.current || selectedAnimLoopRef.current) {
      if (startFraction > 0) {
        const step_data = stepsRef.current[currentStepRef.current];
        if (step_data && step_data.changedBits && step_data.changedBits.length > 0) {
          stepResumeStartIndexRef.current = Math.round(startFraction * (step_data.changedBits.length - 1));
        }
        stepResumeMaskProgressRef.current = startFraction;
      }
      seekGenRef.current += 1;
      if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(false);
      return;
    }
    stopSeqAnimRef.current?.();
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;
    const currentChanged = new Set(step.changedBits);
    const triggerOpts = { adaptiveDuration: !playing };
    if (startFraction > 0) {
      triggerOpts.startProgress = startFraction;
      triggerOpts.startIndex = Math.round(startFraction * (step.changedBits.length - 1));
    }
    triggerAnimation(currentChanged, triggerOpts);
  }, [animMode, animStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep live bitAnimInterval in sync with the running animation.
  useEffect(() => {
    if (!seqTimerRef.current) return;
    currentAnimIntervalRef.current = Math.max(0, bitAnimInterval || 20);
  }, [bitAnimInterval, seqTimerRef, currentAnimIntervalRef]);
}

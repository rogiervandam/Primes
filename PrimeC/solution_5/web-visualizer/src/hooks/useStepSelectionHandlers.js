import { useCallback } from 'react';

export function useStepSelectionHandlers({
  stopPlayback,
  goToStep,
  globalPausedRef,
  playingRef,
  setIsAnimationReplayPaused,
  setSelectedSteps,
  isRepeatModeRef,
  setIsRepeatSplit,
  setRepeatStartPct,
  stepScrubProgressRef,
  repeatDelayTimeoutRef,
  setDelayPhaseMsRef,
}) {
  const handleStepSelection = useCallback((stepIndex) => {
    // item 460: when switching events in repeat mode, reset to single handle at 100%
    if (isRepeatModeRef?.current) {
      setIsRepeatSplit?.(false);
      setRepeatStartPct?.(100);
    }
    // item 443: preserve play mode — if playing, keep playing at new step;
    // if paused, stay paused.
    if (playingRef?.current) {
      // item 460: when in repeat mode and playing, cancel any pending repeat-delay
      // timeout so it cannot navigate back to the old step after the user has
      // clicked a different event.  Also clear the delay-phase indicator.
      if (isRepeatModeRef?.current) {
        if (repeatDelayTimeoutRef?.current) {
          clearTimeout(repeatDelayTimeoutRef.current);
          repeatDelayTimeoutRef.current = null;
        }
        setDelayPhaseMsRef?.current?.(null);
      }
      // In repeat mode, suppress the between-events delay (delayMs:0) so the cycle
      // plays and hands off directly to the repeat delay — without this, the default
      // delayBetweenEvents tacked onto the end of the first play would show a delay
      // indicator + fade-out that makes it appear as if the animation ends twice.
      goToStep(stepIndex, { keepPlaying: true, ...(isRepeatModeRef?.current ? { delayMs: 0 } : {}) });
    } else {
      stopPlayback();
      goToStep(stepIndex, { skipAnimation: true });  // item 450: don't auto-play animation when not playing
      // Reset stale scrub-progress from a prior step so handlePlayPause does not
      // mistake it for a mid-animation resume position on the newly selected step.
      stepScrubProgressRef?.current?.(0);
    }
  }, [stopPlayback, goToStep, playingRef, isRepeatModeRef, setIsRepeatSplit, setRepeatStartPct, stepScrubProgressRef, repeatDelayTimeoutRef, setDelayPhaseMsRef]);

  const handleMultiStepSelect = useCallback((nextSelection) => {
    // item 460: when the plain-click path clears selection (empty Set) while playing,
    // do NOT stop playback — that plain click already called handleStepSelection which
    // keeps the scheduler alive via keepPlaying:true.  Only stop for actual multi-selects
    // (non-empty set or updater function) or when not already playing.
    const isClear = typeof nextSelection !== 'function' && nextSelection.size === 0;
    if (!isClear || !playingRef?.current) {
      stopPlayback();
    }
    // item 450: preserve pause state — only clear isAnimationReplayPaused if the
    // user was not explicitly paused via the pause button (globalPausedRef = true).
    // Unconditionally clearing it was causing the animation loop to restart when
    // the user clicked an event while paused.
    if (!globalPausedRef.current) {
      setIsAnimationReplayPaused(false);
    }
    setSelectedSteps(nextSelection);
  }, [stopPlayback, globalPausedRef, playingRef, setIsAnimationReplayPaused, setSelectedSteps]);

  return { handleStepSelection, handleMultiStepSelect };
}
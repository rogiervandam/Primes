import { useCallback } from 'react';

export function useStepSelectionHandlers({
  stopPlayback,
  goToStep,
  globalPausedRef,
  playingRef,
  setIsAnimationReplayPaused,
  setSelectedSteps,
}) {
  const handleStepSelection = useCallback((stepIndex) => {
    // item 443: preserve play mode — if playing, keep playing at new step;
    // if paused, stay paused.
    if (playingRef?.current) {
      goToStep(stepIndex, { keepPlaying: true });
    } else {
      stopPlayback();
      goToStep(stepIndex, { skipAnimation: true });  // item 450: don't auto-play animation when not playing
    }
  }, [stopPlayback, goToStep, playingRef]);

  const handleMultiStepSelect = useCallback((nextSelection) => {
    stopPlayback();
    // item 450: preserve pause state — only clear isAnimationReplayPaused if the
    // user was not explicitly paused via the pause button (globalPausedRef = true).
    // Unconditionally clearing it was causing the animation loop to restart when
    // the user clicked an event while paused.
    if (!globalPausedRef.current) {
      setIsAnimationReplayPaused(false);
    }
    setSelectedSteps(nextSelection);
  }, [stopPlayback, globalPausedRef, setIsAnimationReplayPaused, setSelectedSteps]);

  return { handleStepSelection, handleMultiStepSelect };
}
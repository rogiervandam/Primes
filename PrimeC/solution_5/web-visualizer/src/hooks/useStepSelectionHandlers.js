import { useCallback } from 'react';

export function useStepSelectionHandlers({
  stopPlayback,
  setIsSingleEventWidgetRevealed,
  goToStep,
  globalPausedRef,
  setIsAnimationReplayPaused,
  setSelectedSteps,
}) {
  const handleStepSelection = useCallback((stepIndex) => {
    stopPlayback();
    setIsSingleEventWidgetRevealed(true);
    goToStep(stepIndex);
  }, [stopPlayback, goToStep, setIsSingleEventWidgetRevealed]);

  const handleMultiStepSelect = useCallback((nextSelection) => {
    stopPlayback();
    // Clear any leftover pause state so the aggregate animation loop starts immediately
    // rather than being held off by a previous Pause or single-event pause-in-flight.
    globalPausedRef.current = false;
    setIsAnimationReplayPaused(false);
    setSelectedSteps(nextSelection);
  }, [stopPlayback, globalPausedRef, setIsAnimationReplayPaused, setSelectedSteps]);

  return { handleStepSelection, handleMultiStepSelect };
}
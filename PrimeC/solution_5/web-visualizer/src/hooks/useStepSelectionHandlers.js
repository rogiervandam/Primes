import { useCallback } from 'react';

export function useStepSelectionHandlers({
  stopPlayback,
  setSingleEventWidgetRevealed,
  goToStep,
  globalPausedRef,
  setAnimationReplayPaused,
  setSelectedSteps,
}) {
  const handleStepSelection = useCallback((stepIndex) => {
    stopPlayback();
    setSingleEventWidgetRevealed(true);
    goToStep(stepIndex);
  }, [stopPlayback, goToStep, setSingleEventWidgetRevealed]);

  const handleMultiStepSelect = useCallback((nextSelection) => {
    stopPlayback();
    // Clear any leftover pause state so the aggregate animation loop starts immediately
    // rather than being held off by a previous Pause or single-event pause-in-flight.
    globalPausedRef.current = false;
    setAnimationReplayPaused(false);
    setSelectedSteps(nextSelection);
  }, [stopPlayback, globalPausedRef, setAnimationReplayPaused, setSelectedSteps]);

  return { handleStepSelection, handleMultiStepSelect };
}
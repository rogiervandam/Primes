import { useCallback } from 'react';

export function usePlaybackControls({
  setSingleEventWidgetRevealed,
  globalPausedRef,
  setAnimationReplayPaused,
  setSingleEventLoopActive,
  currentStep,
  stepsLength,
  stepAnimRunning,
  setPlaying,
  playing,
  goToStep,
  singleEventLoopActiveRef,
  stepsRef,
  rendererRef,
  selectedStepsRef,
  bitAnimationModeRef,
  stepScrubProgress,
  stepResumeMaskProgressRef,
  stepResumeStartIndexRef,
}) {
  const handlePlayPause = useCallback(() => {
    setSingleEventWidgetRevealed(true);
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setAnimationReplayPaused(false);
      setSingleEventLoopActive(false);
      if (currentStep < Math.max(0, stepsLength - 1) || stepAnimRunning) {
        setPlaying(true);
      }
      return;
    }
    if (playing) {
      globalPausedRef.current = true;
      setAnimationReplayPaused(true);
      setSingleEventLoopActive(false);
      setPlaying(false);
      return;
    }
    if (currentStep >= Math.max(0, stepsLength - 1)) {
      globalPausedRef.current = false;
      setAnimationReplayPaused(false);
      setSingleEventLoopActive(false);
      goToStep(0, { keepPlaying: true });
      setPlaying(true);
      return;
    }
    globalPausedRef.current = false;
    setAnimationReplayPaused(false);
    setSingleEventLoopActive(false);
    setPlaying(true);
  }, [
    setSingleEventWidgetRevealed,
    globalPausedRef,
    setAnimationReplayPaused,
    setSingleEventLoopActive,
    currentStep,
    stepsLength,
    stepAnimRunning,
    setPlaying,
    playing,
    goToStep,
  ]);

  const handleStepAnimToggle = useCallback(() => {
    if ((stepAnimRunning || singleEventLoopActiveRef.current) && !globalPausedRef.current) {
      globalPausedRef.current = true;
      setAnimationReplayPaused(true);
      setSingleEventLoopActive(false);
      setPlaying(false);
      return;
    }
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setAnimationReplayPaused(false);
      setSingleEventLoopActive(true);
      return;
    }
    const step = stepsRef.current[currentStep];
    if (!step) return;
    const r = rendererRef.current;
    const isAggregate = selectedStepsRef.current.size > 1;
    const hasMaskData = isAggregate
      ? !!(r && r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0)
      : !!(step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0);
    const inMaskOrCombined = (bitAnimationModeRef.current === 'mask' || bitAnimationModeRef.current === 'combined')
      && hasMaskData;
    if (inMaskOrCombined) {
      const finished = stepScrubProgress >= 99;
      stepResumeMaskProgressRef.current = finished ? 0 : stepScrubProgress / 100;
      stepResumeStartIndexRef.current = 0;
      setAnimationReplayPaused(false);
      setSingleEventLoopActive(true);
      return;
    }
    if (!step.changedBits || step.changedBits.length === 0) return;
    const totalBits = step.changedBits.length;
    const finished = stepScrubProgress >= 99;
    const startIndex = finished
      ? 0
      : Math.max(0, Math.min(totalBits - 1, Math.round((stepScrubProgress / 100) * (totalBits - 1))));
    stepResumeStartIndexRef.current = startIndex;
    stepResumeMaskProgressRef.current = 0;
    setAnimationReplayPaused(false);
    setSingleEventLoopActive(true);
  }, [
    stepAnimRunning,
    singleEventLoopActiveRef,
    globalPausedRef,
    setAnimationReplayPaused,
    setSingleEventLoopActive,
    setPlaying,
    stepsRef,
    currentStep,
    rendererRef,
    selectedStepsRef,
    bitAnimationModeRef,
    stepScrubProgress,
    stepResumeMaskProgressRef,
    stepResumeStartIndexRef,
  ]);

  return { handlePlayPause, handleStepAnimToggle };
}
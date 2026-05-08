import { useCallback } from 'react';

export function usePlaybackControls({
  setIsSingleEventWidgetRevealed,
  globalPausedRef,
  setIsAnimationReplayPaused,
  setIsSingleEventLoopActive,
  currentStep,
  stepsLength,
  isStepAnimRunning,
  setPlaying,
  playing,
  goToStep,
  isSingleEventLoopActiveRef,
  stepsRef,
  rendererRef,
  selectedStepsRef,
  bitAnimationModeRef,
  stepScrubProgress,
  stepResumeMaskProgressRef,
  stepResumeStartIndexRef,
}) {
  const handlePlayPause = useCallback(() => {
    setIsSingleEventWidgetRevealed(true);
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setIsAnimationReplayPaused(false);
      setIsSingleEventLoopActive(false);
      if (currentStep < Math.max(0, stepsLength - 1) || isStepAnimRunning) {
        setPlaying(true);
      }
      return;
    }
    if (playing) {
      globalPausedRef.current = true;
      setIsAnimationReplayPaused(true);
      setIsSingleEventLoopActive(false);
      setPlaying(false);
      return;
    }
    if (currentStep >= Math.max(0, stepsLength - 1)) {
      globalPausedRef.current = false;
      setIsAnimationReplayPaused(false);
      setIsSingleEventLoopActive(false);
      goToStep(0, { keepPlaying: true });
      setPlaying(true);
      return;
    }
    globalPausedRef.current = false;
    setIsAnimationReplayPaused(false);
    setIsSingleEventLoopActive(false);
    setPlaying(true);
  }, [
    setIsSingleEventWidgetRevealed,
    globalPausedRef,
    setIsAnimationReplayPaused,
    setIsSingleEventLoopActive,
    currentStep,
    stepsLength,
    isStepAnimRunning,
    setPlaying,
    playing,
    goToStep,
  ]);

  const handleStepAnimToggle = useCallback(() => {
    if ((isStepAnimRunning || isSingleEventLoopActiveRef.current) && !globalPausedRef.current) {
      globalPausedRef.current = true;
      setIsAnimationReplayPaused(true);
      setIsSingleEventLoopActive(false);
      setPlaying(false);
      return;
    }
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setIsAnimationReplayPaused(false);
      setIsSingleEventLoopActive(true);
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
      setIsAnimationReplayPaused(false);
      setIsSingleEventLoopActive(true);
      return;
    }
    // Item 111: if no changed bits but there IS mask data, still run the mask animation
    if (!step.changedBits || step.changedBits.length === 0) {
      if (hasMaskData) {
        const finished = stepScrubProgress >= 99;
        stepResumeMaskProgressRef.current = finished ? 0 : stepScrubProgress / 100;
        stepResumeStartIndexRef.current = 0;
        setIsAnimationReplayPaused(false);
        setIsSingleEventLoopActive(true);
      }
      return;
    }
    const totalBits = step.changedBits.length;
    const finished = stepScrubProgress >= 99;
    const startIndex = finished
      ? 0
      : Math.max(0, Math.min(totalBits - 1, Math.round((stepScrubProgress / 100) * (totalBits - 1))));
    stepResumeStartIndexRef.current = startIndex;
    stepResumeMaskProgressRef.current = 0;
    setIsAnimationReplayPaused(false);
    setIsSingleEventLoopActive(true);
  }, [
    isStepAnimRunning,
    isSingleEventLoopActiveRef,
    globalPausedRef,
    setIsAnimationReplayPaused,
    setIsSingleEventLoopActive,
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
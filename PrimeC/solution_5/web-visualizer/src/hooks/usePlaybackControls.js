import { useCallback } from 'react';

export function usePlaybackControls({
  globalPausedRef,
  setIsAnimationReplayPaused,
  currentStep,
  stepsLength,
  isStepAnimRunning,
  setPlaying,
  playing,
  goToStep,
  stepsRef,
  rendererRef,
  selectedStepsRef,
  bitAnimationModeRef,
  stepScrubProgress,
  stepResumeMaskProgressRef,
  stepResumeStartIndexRef,
}) {
  const handlePlayPause = useCallback(() => {
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setIsAnimationReplayPaused(false);
      if (currentStep < Math.max(0, stepsLength - 1) || isStepAnimRunning) {
        setPlaying(true);
      }
      return;
    }
    if (playing) {
      globalPausedRef.current = true;
      setIsAnimationReplayPaused(true);
      setPlaying(false);
      return;
    }
    if (currentStep >= Math.max(0, stepsLength - 1)) {
      globalPausedRef.current = false;
      setIsAnimationReplayPaused(false);
      goToStep(0, { keepPlaying: true });
      setPlaying(true);
      return;
    }
    globalPausedRef.current = false;
    setIsAnimationReplayPaused(false);
    setPlaying(true);
  }, [
    globalPausedRef,
    setIsAnimationReplayPaused,
    currentStep,
    stepsLength,
    isStepAnimRunning,
    setPlaying,
    playing,
    goToStep,
  ]);

  const handleStepAnimToggle = useCallback(() => {
    if (isStepAnimRunning && !globalPausedRef.current) {
      globalPausedRef.current = true;
      setIsAnimationReplayPaused(true);
      setPlaying(false);
      return;
    }
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setIsAnimationReplayPaused(false);
      // item 258: update resume position from the current scrub progress before restarting,
      // so the animation continues from where the user scrubbed rather than from 0.
      {
        const finished = stepScrubProgress >= 99;
        const curStep = stepsRef.current[currentStep];
        const r = rendererRef.current;
        const isAggregate = selectedStepsRef.current.size > 1;
        const hasMaskData = isAggregate
          ? !!(r && r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0)
          : !!(curStep && curStep.maskWriteOrderWords && curStep.maskWriteOrderWords.length > 0);
        const inMaskOrCombined = (bitAnimationModeRef.current === 'mask' || bitAnimationModeRef.current === 'combined')
          && hasMaskData;
        if (inMaskOrCombined) {
          stepResumeMaskProgressRef.current = finished ? 0 : stepScrubProgress / 100;
          stepResumeStartIndexRef.current = 0;
        } else if (curStep && curStep.changedBits && curStep.changedBits.length > 0) {
          const totalBits = curStep.changedBits.length;
          stepResumeStartIndexRef.current = finished
            ? 0
            : Math.max(0, Math.min(totalBits - 1, Math.round((stepScrubProgress / 100) * (totalBits - 1))));
          stepResumeMaskProgressRef.current = 0;
        }
      }
      // Re-trigger the animation from the resume position via goToStep.
      goToStep?.(currentStep, { keepPlaying: false });
      return;
    }
    // Not running and not paused — trigger a fresh one-shot animation.
    goToStep?.(currentStep, { keepPlaying: false });
  }, [
    isStepAnimRunning,
    globalPausedRef,
    setIsAnimationReplayPaused,
    setPlaying,
    stepsRef,
    currentStep,
    rendererRef,
    selectedStepsRef,
    bitAnimationModeRef,
    stepScrubProgress,
    stepResumeMaskProgressRef,
    stepResumeStartIndexRef,
    goToStep,
  ]);

  return { handlePlayPause, handleStepAnimToggle };
}
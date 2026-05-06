import { useEffect } from 'react';

/**
 * Groups several small side-effect `useEffect`s from Visualizer.jsx that
 * don't belong in any other focused hook:
 *
 *  - Balloon mode cleanup: clear pins / hover when balloons are disabled.
 *  - Trace-info popup: close when clicking outside.
 *  - Apply theme to `<html data-theme>`.
 *  - Auto-render (puppeteer/CLI): kick off video export when ready.
 *  - Document title sync.
 *  - Step scrub-progress reset on step change.
 *  - BitAnimationMode auto-pick (mask vs bit) on step change.
 */
export function useVisualizerEffects({
  // balloon cleanup
  areBalloonsEnabled,
  isBalloonHoverEnabled,
  setPinnedBitIndices,
  setHoveredBitInfo,
  lastHoveredIdxRef,
  // trace-info popup close
  isTraceInfoVisible,
  setIsTraceInfoVisible,
  traceInfoPopoverRef,
  traceInfoToggleRef,
  // theme
  theme,
  // auto-render
  autoRender,
  steps,
  exporting,
  exportVideo,
  // document title
  effectiveTitle,
  // scrub reset
  currentStep,
  setStepScrubProgress,
  // bitAnimMode auto-pick
  selectedSteps,
  stepsRef,
  setBitAnimationMode,
}) {
  // Keep rendered balloons consistent with the current interaction mode.
  useEffect(() => {
    if (!areBalloonsEnabled) {
      setPinnedBitIndices([]);
    }
    if (!isBalloonHoverEnabled) {
      setHoveredBitInfo(null);
      lastHoveredIdxRef.current = -1;
    }
  }, [areBalloonsEnabled, isBalloonHoverEnabled, setPinnedBitIndices, setHoveredBitInfo, lastHoveredIdxRef]);

  // Close trace info popup when clicking outside.
  useEffect(() => {
    if (!isTraceInfoVisible) return;
    const handleClickOutside = (e) => {
      const clickedInside = traceInfoPopoverRef.current && traceInfoPopoverRef.current.contains(e.target);
      const clickedTitle = traceInfoToggleRef.current && traceInfoToggleRef.current.contains(e.target);
      const clickedDetailPanel = e.target && typeof e.target.closest === 'function' && e.target.closest('.detail-panel');
      if (!clickedInside && !clickedTitle && !clickedDetailPanel) setIsTraceInfoVisible(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isTraceInfoVisible, setIsTraceInfoVisible, traceInfoPopoverRef, traceInfoToggleRef]);

  // Apply theme to document.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-render mode (for CLI video export via puppeteer).
  useEffect(() => {
    if (autoRender && steps.length > 0 && !exporting) {
      const timer = setTimeout(() => exportVideo(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoRender, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Document title sync.
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = effectiveTitle;
  }, [effectiveTitle]);

  // Reset the step-scrub slider whenever the user moves to a different event.
  useEffect(() => { setStepScrubProgress(0); }, [currentStep, setStepScrubProgress]);

  // Auto-pick the animation mode for the current event.
  // Prefer 'mask' when the event has mask write-order metadata, else 'bit'.
  // Skip when an aggregate (multi-step) selection is active.
  useEffect(() => {
    if (selectedSteps.size > 1) return;
    const step = stepsRef.current[currentStep];
    const hasMask = !!(step && step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0
      && Number.isFinite(step.maskWordBits) && step.maskWordBits > 0);
    setBitAnimationMode(hasMask ? 'mask' : 'bit');
  }, [currentStep, selectedSteps, stepsRef, setBitAnimationMode]);
}

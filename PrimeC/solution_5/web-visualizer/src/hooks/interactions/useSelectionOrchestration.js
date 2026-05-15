import { useEffect, useRef } from 'react';

export function useSelectionOrchestration({
  steps,
  initialHighlightHoldRef,
  goToStep,
  selectedSteps,
  rendererRef,
  buildCombinedSelectionOverlay,
  getMinimapDetailH,
  updateMinimapAvailability,
  triggerAnimationRef,
  isAutoAnimateOnSelectRef,  // item 440: skip animation when "Animate: off"
}) {
  const goToStepRef = useRef(goToStep);

  useEffect(() => {
    goToStepRef.current = goToStep;
  }, [goToStep]);

  useEffect(() => {
    if (steps.length > 0) {
      initialHighlightHoldRef.current = true;
      const raf = requestAnimationFrame(() => {
        goToStepRef.current?.(0, { suppressHighlight: true });
      });
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
    // Intentionally keyed only to loaded steps; goToStep identity changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, initialHighlightHoldRef]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || selectedSteps.size === 0) return;
    const overlay = buildCombinedSelectionOverlay(selectedSteps);
    const repeatedBits = new Set();
    for (const [bit, count] of overlay.targetHitCounts.entries()) {
      if (count > 1) repeatedBits.add(bit);
    }
    r.currentOperation = 'aggregate-selection';
    r.currentAnnotation = overlay.annotation || '';
    r.setState(r.bitState, overlay.changedBits, overlay.targetBits, overlay.targetHitCounts, {
      focusStart: null,
      focusStop: null,
    }, overlay.maskMetadata, {
      repeatedBits,
    });
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
    updateMinimapAvailability();
    // item 440: skip animation when "Animate: off" is set
    if (overlay.changedBits.size > 0 && isAutoAnimateOnSelectRef?.current !== false) {
      triggerAnimationRef.current?.(overlay.changedBits, { adaptiveDuration: true });
    }
  }, [
    selectedSteps,
    rendererRef,
    buildCombinedSelectionOverlay,
    getMinimapDetailH,
    updateMinimapAvailability,
    triggerAnimationRef,
  ]);
}
import { useEffect } from 'react';

export function useSelectionOrchestration({
  steps,
  initialHighlightHoldRef,
  setSingleEventWidgetRevealed,
  goToStep,
  selectedSteps,
  rendererRef,
  buildCombinedSelectionOverlay,
  getMinimapDetailH,
  updateMinimapAvailability,
  triggerAnimationRef,
}) {
  useEffect(() => {
    if (steps.length > 0) {
      initialHighlightHoldRef.current = true;
      setSingleEventWidgetRevealed(false);
      const raf = requestAnimationFrame(() => goToStep(0, { suppressHighlight: true }));
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [steps, initialHighlightHoldRef, setSingleEventWidgetRevealed, goToStep]);

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
    if (overlay.changedBits.size > 0) {
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
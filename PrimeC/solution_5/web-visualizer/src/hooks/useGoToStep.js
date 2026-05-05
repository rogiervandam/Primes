import { useCallback, useRef } from 'react';

export function useGoToStep({
  rendererRef,
  steps,
  currentStep,
  playing,
  stopPlayback,
  singleEventLoopActiveRef,
  setSingleEventLoopActive,
  isScrubbingTopRef,
  selectedStepsRef,
  initialHighlightHoldRef,
  bitStateRef,
  bitStateDirtyRef,
  bitStateCheckpointsRef,
  setStepStats,
  containerRef,
  getCanvasTargetSize,
  glRendererRef,
  initialFitDoneRef,
  applyViewportFit,
  setZoom,
  setAutoFitColumnCount,
  updateMinimapAvailability,
  getMinimapDetailH,
  setCurrentStep,
  triggerAnimationRef,
  delayBetweenEvents,
  pinnedBitIndices,
  effectiveGroupBits,
}) {
  const goToStep = useCallback((target, options = {}) => {
    const r = rendererRef.current;
    if (!r || steps.length === 0) return;
    target = Math.max(0, Math.min(target, steps.length - 1));
    const suppressHighlight = options.suppressHighlight === true;
    if (!options.keepPlaying && playing) stopPlayback();
    if (!options.keepPlaying && !options.keepLoop && singleEventLoopActiveRef.current) {
      setSingleEventLoopActive(false);
    }
    const aggregateScrub = isScrubbingTopRef.current && selectedStepsRef.current.size > 0;
    if (!suppressHighlight) initialHighlightHoldRef.current = false;

    const bs = bitStateRef.current;
    if (!bs) return;

    // Build state up to the step just before target.
    if (target <= currentStep || bitStateDirtyRef.current) {
      const checkpoints = bitStateCheckpointsRef.current;
      let replayFrom = 0;
      for (let k = checkpoints.length - 1; k >= 0; k--) {
        if (checkpoints[k].stepIndex < target) {
          bs.set(checkpoints[k].bitState);
          replayFrom = checkpoints[k].stepIndex + 1;
          break;
        }
      }
      if (replayFrom === 0) bs.fill(0);
      for (let i = replayFrom; i < target; i++) {
        const s = steps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const idx = s.changedBits[j];
          if (idx < bs.length) bs[idx] = 1;
        }
      }
      bitStateDirtyRef.current = false;
    } else {
      for (let i = currentStep + 1; i < target; i++) {
        const s = steps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const idx = s.changedBits[j];
          if (idx < bs.length) bs[idx] = 1;
        }
      }
    }

    const step = steps[target];
    let newlySet = 0;
    let reSet = 0;
    const repeatedBits = new Set();
    for (let j = 0; j < step.changedBits.length; j++) {
      const idx = step.changedBits[j];
      if (idx < bs.length && bs[idx]) {
        reSet++;
        repeatedBits.add(idx);
      } else {
        newlySet++;
      }
    }

    for (let j = 0; j < step.changedBits.length; j++) {
      const idx = step.changedBits[j];
      if (idx < bs.length) bs[idx] = 1;
    }

    let totalSet = 0;
    for (let i = 0; i < bs.length; i++) {
      if (bs[i]) totalSet++;
    }
    let duplicateTargets = 0;
    if (step.targetHitCounts && step.targetHitCounts.length > 0) {
      for (let index = 0; index < step.targetHitCounts.length; index++) {
        if ((step.targetHitCounts[index] || 0) > 1) duplicateTargets++;
      }
    }
    setStepStats({ totalSet, newlySet, reSet, duplicateTargets });

    const changedSet = suppressHighlight ? new Set() : new Set(step.changedBits);
    const targetBits = step.targetBits && step.targetBits.length > 0 ? step.targetBits : step.changedBits;
    const targetSet = suppressHighlight ? new Set() : new Set(targetBits);
    const targetHitCounts = new Map();
    if (!suppressHighlight) {
      if (step.targetHitCounts && step.targetHitCounts.length === targetBits.length) {
        for (let index = 0; index < targetBits.length; index++) {
          targetHitCounts.set(targetBits[index], step.targetHitCounts[index]);
        }
      } else {
        for (let index = 0; index < targetBits.length; index++) {
          targetHitCounts.set(targetBits[index], 1);
        }
      }
    }

    const previousHighlights = new Set(r.changedBits || []);

    if (!aggregateScrub) {
      r.currentOperation = step.operation;
      r.currentAnnotation = step.annotation || '';
      r.setState(bs, changedSet, targetSet, targetHitCounts, {
        focusStart: suppressHighlight ? null : step.focusStart,
        focusStop: suppressHighlight ? null : step.focusStop,
      }, suppressHighlight ? null : {
        wordBits: step.maskWordBits,
        targetWords: step.maskWriteOrderWords,
        targetSlots: step.maskWriteOrderSlots,
        targetEventIds: step.maskWriteOrderWords?.length > 0
          ? Int32Array.from(Array(step.maskWriteOrderWords.length).fill(step.stepId ?? target))
          : new Int32Array(0),
        slotBits: step.maskSlotBits,
      }, {
        repeatedBits: suppressHighlight ? new Set() : repeatedBits,
      });
    }

    if (r.heatMapEnabled || (r.cachelineAnnotation && r.cachelineAnnotation !== 'none')) {
      r.rebuildHeatMap(steps, target);
    }

    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const { canvasW, canvasH } = getCanvasTargetSize(rect.width, rect.height);
      if (!initialFitDoneRef.current && (r.canvasWidth !== canvasW || r.canvasHeight !== canvasH)) {
        const g = glRendererRef.current;
        const directMode = !!(g && typeof g.isDirectMode === 'function' && g.isDirectMode());
        let overlayDpr = null;
        if (g) {
          g.resize(canvasW, canvasH);
          if (directMode && typeof g.getEffectiveDpr === 'function') {
            overlayDpr = g.getEffectiveDpr();
          }
        }
        r.resize(canvasW, canvasH, overlayDpr);
      }
      const lvW = (typeof window !== 'undefined' ? window.innerWidth : rect.width) || rect.width;
      const lvH = (typeof window !== 'undefined' ? window.innerHeight : rect.height) || rect.height;
      r.layoutAvailWidth = lvW;
      r.layoutAvailHeight = lvH;
      if (!initialFitDoneRef.current) {
        applyViewportFit(r, rect.width, rect.height);
        const fitsViewport = r.isContentFullyVisible(rect.width, rect.height);
        if (!fitsViewport) {
          const firstRow = r.getElementBounds('cacheline', 0);
          if (firstRow) {
            const canvasHeight = r.canvasHeight || rect.height;
            const planeOffsetY = Math.max(0, (canvasHeight - rect.height) / 2);
            const targetY = planeOffsetY + rect.height / 3;
            r.panY += targetY - firstRow.cy;
          }
        }
        setZoom(r.zoom);
        r.freezeLayout();
        if (r.horizontalGroups === 0 && typeof r._cacheLinesPerVisualRow === 'function') {
          const nextAutoCols = Math.max(1, r._cacheLinesPerVisualRow());
          setAutoFitColumnCount((prev) => (prev === nextAutoCols ? prev : nextAutoCols));
        }
        initialFitDoneRef.current = true;
      }
    }

    r.render();
    updateMinimapAvailability();
    r.renderMinimap(r.canvasWidth, r.canvasHeight, getMinimapDetailH());
    setCurrentStep(target);

    const hasPlayContext = playing
      || singleEventLoopActiveRef.current
      || isScrubbingTopRef.current
      || options.keepPlaying === true
      || options.forceAnimate === true;
    if (!aggregateScrub && !suppressHighlight && hasPlayContext && triggerAnimationRef.current) {
      const delayMs = playing ? delayBetweenEvents : 0;
      triggerAnimationRef.current(changedSet, {
        adaptiveDuration: true,
        fadeOutBits: previousHighlights,
        delayMs,
        pinnedBitIndices,
        groupBits: effectiveGroupBits,
      });
    }
  }, [
    rendererRef,
    steps,
    currentStep,
    playing,
    stopPlayback,
    singleEventLoopActiveRef,
    setSingleEventLoopActive,
    isScrubbingTopRef,
    selectedStepsRef,
    initialHighlightHoldRef,
    bitStateRef,
    bitStateDirtyRef,
    bitStateCheckpointsRef,
    setStepStats,
    containerRef,
    getCanvasTargetSize,
    glRendererRef,
    initialFitDoneRef,
    applyViewportFit,
    setZoom,
    setAutoFitColumnCount,
    updateMinimapAvailability,
    getMinimapDetailH,
    setCurrentStep,
    triggerAnimationRef,
    delayBetweenEvents,
    pinnedBitIndices,
    effectiveGroupBits,
  ]);

  const goToStepRef = useRef(null);
  goToStepRef.current = goToStep;

  return { goToStep, goToStepRef };
}
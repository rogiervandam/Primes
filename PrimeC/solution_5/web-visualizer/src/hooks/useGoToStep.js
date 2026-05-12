import { useCallback, useRef } from 'react';

export function useGoToStep({
  rendererRef,
  steps,
  currentStep,
  playing,
  stopPlayback,
  isSingleEventLoopActiveRef,
  setIsSingleEventLoopActive,
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
  animateBitsModeRef,  // item 244: 'changed' | 'targeted'
    isSingleEventRepeatEnabledRef,  // item 281: when true, use delayBetweenRepeats
    delayBetweenRepeats,            // item 281: delay used when repeating a single event
}) {
  // item 270: track the mask signature of the most recently displayed step so
  // we can set r.maskIsNew when the mask pattern changes.
  const prevMaskSigRef = useRef('');
  const maskNewTimerRef = useRef(null);

  // Scrub-mode React-update throttle: canvas renders every RAF frame but
  // setCurrentStep/setStepStats are capped at ~10 fps to avoid flooding the
  // React tree (title bar, annotation, events-panel highlight) with re-renders.
  const scrubReactThrottleRef = useRef(0);     // last time setCurrentStep was called (ms)
  const scrubReactTimerRef   = useRef(null);   // pending flush timeout
  const scrubLatestTargetRef = useRef(null);   // latest step index queued during throttle

  const goToStep = useCallback((target, options = {}) => {
    const r = rendererRef.current;
    if (!r || steps.length === 0) return;
    target = Math.max(0, Math.min(target, steps.length - 1));
    const suppressHighlight = options.suppressHighlight === true;
    // scrub:true → canvas updates every call but React state (title/annotation)
    // is throttled to ≤10 fps to avoid flooding the component tree.
    const isScrub = options.scrub === true;
    if (!options.keepPlaying && playing) stopPlayback();
    if (!options.keepPlaying && !options.keepLoop && isSingleEventLoopActiveRef.current) {
      setIsSingleEventLoopActive(false);
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

    // item 244: in 'targeted' mode, pass targetSet as the "changed" set for
    // setState so the renderer highlights all targeted bits; bits that were
    // already set (not in changedSet) are passed as repeatedBits → amber colour.
    const animBitsMode = animateBitsModeRef?.current || 'changed';
    const useTargetedMode = animBitsMode === 'targeted' && !suppressHighlight && targetSet.size > 0;
    const changedSetForRender = useTargetedMode ? targetSet : changedSet;
    const repeatedBitsForRender = useTargetedMode
      ? new Set([...targetSet].filter(b => !changedSet.has(b)))
      : suppressHighlight ? new Set() : repeatedBits;

    if (!aggregateScrub) {
      r.currentOperation = step.operation;
      r.currentAnnotation = step.annotation || '';
      r.setState(bs, changedSetForRender, targetSet, targetHitCounts, {
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
        repeatedBits: repeatedBitsForRender,
      });

      // item 270: detect mask change and set r.maskIsNew for overlay flash.
      if (!suppressHighlight && step.maskWordBits) {
        const slotSig = step.maskSlotBits && step.maskSlotBits.length > 0
          ? step.maskSlotBits.map((s) => Array.from(s).join(',')).join('|')
          : '';
        const sig = `${step.maskWordBits}:${slotSig}`;
        if (sig !== prevMaskSigRef.current) {
          prevMaskSigRef.current = sig;
          r.maskIsNew = true;
          r.maskIsNewTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (maskNewTimerRef.current != null) clearTimeout(maskNewTimerRef.current);
          maskNewTimerRef.current = setTimeout(() => {
            if (rendererRef.current) rendererRef.current.maskIsNew = false;
            maskNewTimerRef.current = null;
          }, 800);
        }
      }
    }

    if (r.isHeatMapEnabled || (r.cachelineAnnotation && r.cachelineAnnotation !== 'none')) {
      r.rebuildHeatMap(steps, target);
    }

    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const { canvasW, canvasH } = getCanvasTargetSize(rect.width, rect.height);
      if (!initialFitDoneRef.current && (r.canvasWidth !== canvasW || r.canvasHeight !== canvasH)) {
        const g = glRendererRef.current;
        // Preserve the current effective DPR (including SSAA) and snapDpr
        // so this initial-fit resize doesn't discard the SSAA scaling that
        // useCanvasLayout already set up.
        const currentDpr = (g && typeof g.getEffectiveDpr === 'function') ? g.getEffectiveDpr() : undefined;
        const currentSnapDpr = r.canvasSnapDpr || undefined;
        let overlayDpr = null;
        if (g) {
          g.resize(canvasW, canvasH, currentDpr, currentSnapDpr);
          if (typeof g.getEffectiveDpr === 'function') {
            overlayDpr = g.getEffectiveDpr();
          }
        }
        r.resize(canvasW, canvasH, overlayDpr, currentSnapDpr);
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

    // Throttle React state updates (title bar, annotation, events-panel) to
    // ≤10 fps during wave scrubbing so the component tree isn't flooded.
    if (isScrub) {
      scrubLatestTargetRef.current = target;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - scrubReactThrottleRef.current >= 100) {
        // Enough time has elapsed — update immediately.
        scrubReactThrottleRef.current = now;
        if (scrubReactTimerRef.current !== null) {
          clearTimeout(scrubReactTimerRef.current);
          scrubReactTimerRef.current = null;
        }
        setCurrentStep(target);
      } else {
        // Too soon — schedule a flush for the end of the 100 ms window.
        if (scrubReactTimerRef.current === null) {
          const remaining = 100 - (now - scrubReactThrottleRef.current);
          scrubReactTimerRef.current = setTimeout(() => {
            scrubReactTimerRef.current = null;
            scrubReactThrottleRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (scrubLatestTargetRef.current !== null) setCurrentStep(scrubLatestTargetRef.current);
          }, remaining);
        }
      }
    } else {
      // Non-scrub path: update React state immediately as before.
      if (scrubReactTimerRef.current !== null) {
        clearTimeout(scrubReactTimerRef.current);
        scrubReactTimerRef.current = null;
      }
      setCurrentStep(target);
    }

    // Always animate when navigating (direct mode, item 95). Previously only
    // animated when playing/looping/scrubbing. Now always trigger animation
    // unless explicitly suppressed. Item 232: also animate during aggregate
    // scrubs so the motion trail is visible even when selecting across steps.
    // item 244: in 'targeted' mode, animate all bits in targetSet (even if
    // already set), showing already-set ones as amber (repeatedBits path).
    if (!suppressHighlight && triggerAnimationRef.current) {
      // item 281: when single-event repeat is active, use the dedicated
      // "delay between repeats" setting rather than the inter-event delay.
      const delayMs = playing
        ? (isSingleEventRepeatEnabledRef?.current ? (delayBetweenRepeats ?? delayBetweenEvents) : delayBetweenEvents)
        : 0;
      const animBitsMode = animateBitsModeRef?.current || 'changed';
      const useTargetedMode = animBitsMode === 'targeted' && targetSet.size > 0;
      // In targeted mode: use full targetSet as changedSet for animation;
      // bits in targetSet that weren't newly changed are the "amber" group.
      const changedSetForAnim = useTargetedMode ? targetSet : changedSet;
      triggerAnimationRef.current(changedSetForAnim, {
        adaptiveDuration: true,
        fadeOutBits: previousHighlights,
        delayMs,
        pinnedBitIndices,
        groupBits: effectiveGroupBits,
        // item 290: allow caller to specify an animation start fraction (e.g. repeat from point)
        ...(Number.isFinite(options.startProgress) && options.startProgress > 0
          ? { startProgress: options.startProgress }
          : {}),
      });
    }
  }, [
    rendererRef,
    steps,
    currentStep,
    playing,
    stopPlayback,
    isSingleEventLoopActiveRef,
    setIsSingleEventLoopActive,
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
      delayBetweenRepeats,
      // isSingleEventRepeatEnabledRef is a ref — deliberately not in deps
    // animateBitsModeRef is a ref — deliberately not in deps (stable ref object)
  ]);

  const goToStepRef = useRef(null);
  goToStepRef.current = goToStep;

  return { goToStep, goToStepRef };
}
import { useEffect } from 'react';

export function useRendererLayoutSync({ ...flatArgs }) {
  const layoutRefs = flatArgs.layoutRefs || flatArgs;
  const layoutConfig = flatArgs.layoutConfig || flatArgs;
  const layoutState = flatArgs.layoutState || flatArgs;
  const layoutHandlers = flatArgs.layoutHandlers || flatArgs;

  const {
    rendererRef,
    prevLayoutRef,
    containerRef,
    stepsRef,
    currentStepRef,
  } = layoutRefs;

  const {
    theme,
    layoutSettings,
    colorPreset,
    customColors,
    canvasColors,
    storageModel,
    wheelDefinition,
    cachelineSize,
    isHeatMapEnabled,
    cachelineAnnotation,
    isPrimeOverlayEnabled,
    isRangeOverlayEnabled,
    rangeOverlayStart,
    rangeOverlayEnd,
    isMultiplesOverlayEnabled,
    multiplesOverlayPrime,
    gridOpacity,
    isDebugCalibrationMode,
    mode3D,
  } = layoutConfig;

  const {
    isMinimapVisible,
  } = layoutState;

  const {
    updateMinimapAvailability,
    setZoom,
    getMinimapDetailH,
  } = layoutHandlers;

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r._stateDirty = true;

    const prev = prevLayoutRef.current;
    const isCustomVectorModeNext = layoutSettings.vectorMode === 'custom';
    const nextCustomGroupBitsCheck = isCustomVectorModeNext
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1) : 0;
    const isSpacingOnlyChange = (
      prev.bitSpacingH !== layoutSettings.bitSpacingH ||
      prev.bitSpacingV !== layoutSettings.bitSpacingV ||
      prev.byteSpacingH !== layoutSettings.byteSpacingH ||
      prev.byteSpacingV !== layoutSettings.byteSpacingV ||
      prev.u64SpacingH !== layoutSettings.u64SpacingH ||
      prev.u64SpacingV !== layoutSettings.u64SpacingV
    ) && (
      prev.bitLayout === layoutSettings.bitLayout &&
      prev.byteLayout === layoutSettings.byteLayout &&
      prev.vectorMode === layoutSettings.vectorMode &&
      prev.vectorGroup === layoutSettings.vectorGroup &&
      prev.vectorBaseBits === layoutSettings.vectorBaseBits &&
      prev.vectorLanes === layoutSettings.vectorLanes &&
      prev.customGroupBits === nextCustomGroupBitsCheck &&
      prev.cachelineSize === cachelineSize &&
      prev.horizontalGroups === (Math.max(0, parseInt(layoutSettings.horizontalGroups || 0, 10) || 0))
    );
    let preCenterBit = -1;
    let preDesiredX = null;
    let preDesiredY = null;
    if (isSpacingOnlyChange) {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const canvasCssHeight = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
        const planeOffsetX = Math.max(0, (r.canvasWidth - rect.width) / 2);
        const planeOffsetY = Math.max(0, (canvasCssHeight - rect.height) / 2);
        preDesiredX = planeOffsetX + rect.width / 2;
        preDesiredY = planeOffsetY + rect.height / 2;
        preCenterBit = r.canvasToBitIndex(preDesiredX, preDesiredY);
      }
    }

    r.theme = theme;
    r.bitLayout = layoutSettings.bitLayout;
    r.byteLayout = layoutSettings.byteLayout;
    r.bitSpacingH = layoutSettings.bitSpacingH;
    r.bitSpacingV = layoutSettings.bitSpacingV;
    r.byteSpacingH = layoutSettings.byteSpacingH;
    r.byteSpacingV = layoutSettings.byteSpacingV;
    r.u64SpacingH = layoutSettings.u64SpacingH;
    r.u64SpacingV = layoutSettings.u64SpacingV;
    const isCustomVectorMode = layoutSettings.vectorMode === 'custom';
    r.vectorGroup = layoutSettings.vectorGroup;
    r.vectorBaseBits = layoutSettings.vectorBaseBits;
    r.vectorLanes = layoutSettings.vectorLanes;
    r.vectorLabel = layoutSettings.vectorLabel || `uint64v${layoutSettings.vectorGroup || 1}`;
    r.customGroupingBits = isCustomVectorMode ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1) : 0;
    r.showBitLabels = layoutSettings.showBitLabels;
    r.showNumberLabels = layoutSettings.showNumberLabels === true;
    r.showByteLabels = layoutSettings.showByteLabels;
    r.showVectorLabels = layoutSettings.showVectorLabels !== false;
    r.showVectorTouchOrder = layoutSettings.showVectorTouchOrder === true;
    r.webglText = true;
    r.bitLabelMode = layoutSettings.bitLabelMode || 'global';
    r.byteLabelMode = layoutSettings.byteLabelMode || 'group';
    r.horizontalGroups = Math.max(0, parseInt(layoutSettings.horizontalGroups || 0, 10) || 0);
    const outlineTargets = new Set(layoutSettings.outlines?.targets || []);
    r.outlineEnabled = outlineTargets.size > 0;
    r.outlineTargets = outlineTargets;
    r.outlineStyle = 'dashed';
    r.outlineColor = '#3b82f6';
    r.outlineRounded = true;
    r.debugAllCellOutlines = isDebugCalibrationMode;
    r.debugAllCellOutlineColor = theme === 'light' ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255,255,255,0.82)';
    r.colorPreset = colorPreset;
    r.storageModel = storageModel;
    r.wheelDefinition = wheelDefinition;
    r.prefetchPrimeOverlay(() => {
      const rr = rendererRef.current;
      if (rr && rr.primeOverlay) rr.render();
    });
    r.cachelineSize = cachelineSize;
    r.isHeatMapEnabled = isHeatMapEnabled;
    r.cachelineAnnotation = cachelineAnnotation;
    r.primeOverlay = isPrimeOverlayEnabled;
    if (isPrimeOverlayEnabled) r.buildPrimeOverlay();
    r.rangeOverlay = isRangeOverlayEnabled;
    r.rangeOverlayStart = rangeOverlayStart;
    r.rangeOverlayEnd = rangeOverlayEnd;
    r.multiplesOverlay = isMultiplesOverlayEnabled;
    r.multiplesOverlayPrime = Math.max(2, multiplesOverlayPrime || 2);
    r.transparentBackground = mode3D;
    r.gridOpacity = Math.max(0.12, Math.min(1, gridOpacity));
    r.canvasBackground = canvasColors ? (canvasColors[theme] || null) : null;
    r.customSetBit = customColors.setBit;
    r.customClearedBit = customColors.clearedBit;
    r.customUnchangedBit = customColors.unchangedBit;

    const nextCustomGroupBits = isCustomVectorMode ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1) : 0;
    const structureChanged = (
      prev.bitLayout !== layoutSettings.bitLayout ||
      prev.byteLayout !== layoutSettings.byteLayout ||
      prev.bitSpacingH !== layoutSettings.bitSpacingH ||
      prev.bitSpacingV !== layoutSettings.bitSpacingV ||
      prev.byteSpacingH !== layoutSettings.byteSpacingH ||
      prev.byteSpacingV !== layoutSettings.byteSpacingV ||
      prev.u64SpacingH !== layoutSettings.u64SpacingH ||
      prev.u64SpacingV !== layoutSettings.u64SpacingV ||
      prev.cachelineSize !== cachelineSize ||
      prev.customGroupBits !== nextCustomGroupBits ||
      prev.vectorMode !== layoutSettings.vectorMode ||
      prev.vectorGroup !== layoutSettings.vectorGroup ||
      prev.vectorBaseBits !== layoutSettings.vectorBaseBits ||
      prev.vectorLanes !== layoutSettings.vectorLanes ||
      prev.horizontalGroups !== (Math.max(0, parseInt(layoutSettings.horizontalGroups || 0, 10) || 0)) ||
      prev.showByteLabels !== layoutSettings.showByteLabels ||
      prev.showVectorLabels !== layoutSettings.showVectorLabels ||
      prev.showVectorTouchOrder !== layoutSettings.showVectorTouchOrder
    );

    let centerAnchorBit = -1;
    let desiredX = null;
    let desiredY = null;
    if (structureChanged && !isSpacingOnlyChange) {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const canvasCssHeight = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
        const planeOffsetX = Math.max(0, (r.canvasWidth - rect.width) / 2);
        const planeOffsetY = Math.max(0, (canvasCssHeight - rect.height) / 2);
        desiredX = planeOffsetX + rect.width / 2;
        desiredY = planeOffsetY + rect.height / 2;
        centerAnchorBit = r.canvasToBitIndex(desiredX, desiredY);
      }
    }

    if (structureChanged) {
      r.unfreezeLayout();
      if (isSpacingOnlyChange && preCenterBit >= 0 && preDesiredX != null) {
        const nextPos = r.bitIndexToCanvas(preCenterBit);
        if (nextPos) {
          r.panX += preDesiredX - nextPos.x;
          r.panY += preDesiredY - nextPos.y;
        }
      } else if (centerAnchorBit >= 0 && desiredX != null && desiredY != null) {
        const nextPos = r.bitIndexToCanvas(centerAnchorBit);
        if (nextPos) {
          r.panX += desiredX - nextPos.x;
          r.panY += desiredY - nextPos.y;
        }
      }
      setZoom(r.zoom);
      r.freezeLayout();
      prev.bitLayout = layoutSettings.bitLayout;
      prev.byteLayout = layoutSettings.byteLayout;
      prev.bitSpacingH = layoutSettings.bitSpacingH;
      prev.bitSpacingV = layoutSettings.bitSpacingV;
      prev.byteSpacingH = layoutSettings.byteSpacingH;
      prev.byteSpacingV = layoutSettings.byteSpacingV;
      prev.u64SpacingH = layoutSettings.u64SpacingH;
      prev.u64SpacingV = layoutSettings.u64SpacingV;
      prev.cachelineSize = cachelineSize;
      prev.customGroupBits = nextCustomGroupBits;
      prev.vectorMode = layoutSettings.vectorMode;
      prev.vectorGroup = layoutSettings.vectorGroup;
      prev.vectorBaseBits = layoutSettings.vectorBaseBits;
      prev.vectorLanes = layoutSettings.vectorLanes;
      prev.horizontalGroups = Math.max(0, parseInt(layoutSettings.horizontalGroups || 0, 10) || 0);
      prev.showByteLabels = layoutSettings.showByteLabels;
      prev.showVectorLabels = layoutSettings.showVectorLabels;
      prev.showVectorTouchOrder = layoutSettings.showVectorTouchOrder;
    }
    if (r.isHeatMapEnabled || (r.cachelineAnnotation && r.cachelineAnnotation !== 'none')) {
      r.rebuildHeatMap(stepsRef.current, currentStepRef.current);
    }
    r.render();
    updateMinimapAvailability();
    if (isMinimapVisible) r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
  }, [
    rendererRef,
    theme,
    layoutSettings,
    isMinimapVisible,
    colorPreset,
    customColors,
    canvasColors,
    storageModel,
    wheelDefinition,
    cachelineSize,
    isHeatMapEnabled,
    cachelineAnnotation,
    isPrimeOverlayEnabled,
    isRangeOverlayEnabled,
    rangeOverlayStart,
    rangeOverlayEnd,
    isMultiplesOverlayEnabled,
    multiplesOverlayPrime,
    gridOpacity,
    updateMinimapAvailability,
    isDebugCalibrationMode,
    prevLayoutRef,
    containerRef,
    mode3D,
    stepsRef,
    currentStepRef,
    setZoom,
    getMinimapDetailH,
  ]);
}
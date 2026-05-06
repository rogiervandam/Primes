import { useEffect, useRef } from 'react';
import { useRendererBootstrap } from './useRendererBootstrap';
import { useLoadingOverlayLifecycle } from './useLoadingOverlayLifecycle';
import { useRendererLayoutSync } from './useRendererLayoutSync';
import { usePanelResizeRefresh } from './usePanelResizeRefresh';
import { useWindowResize } from './useWindowResize';
import {
  DEFAULT_LAYOUT_SETTINGS as DEFAULT_SETTINGS,
} from '../lib/viewPrefs';

/**
 * Bundles all renderer bootstrap / sync hooks and associated inline effects.
 * Returns nothing — all side effects are fire-and-forget.
 *
 * Internally owns `spacingPanAnimRef` (spacing-pan animation cleanup) and
 * `prevLayoutRef` (layout diffing for useRendererLayoutSync).
 */
export function useRendererPipeline({ ...flatArgs }) {
  const rendererRefs = flatArgs.rendererRefs || flatArgs;
  const rendererConfig = flatArgs.rendererConfig || flatArgs;
  const rendererState = flatArgs.rendererState || flatArgs;
  const rendererHandlers = flatArgs.rendererHandlers || flatArgs;

  const {
    rendererRef,
    minimapCanvasRef,
    glyphCanvasRef,
    glyphRendererRef,
    glCanvasRef,
    glRendererRef,
    bitStateRef,
    pendingRenderRafRef,
    introTiltStartedRef,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
    loadCompleteRef,
    loadProgressRef,
    containerRef,
    stepsRef,
    currentStepRef,
    pendingResizeAnchorRef,
  } = rendererRefs;

  const {
    header,
    wheelDefinition,
    isSettingsCollapsed,
    isMacPlatform,
    isMinimapVisible,
    theme,
    layoutSettings,
    colorPreset,
    customColors,
    canvasColors,
    storageModel,
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
  } = rendererConfig;

  const {
    loadingOverlayPhase,
    panelWidth,
    isDetailOpen,
    detailHeight,
  } = rendererState;

  const {
    setIsGlUnavailable,
    updateGlDebugInfo,
    createCamera,
    disposeCamera,
    setZoom,
    getMinimapDetailH,
    setIntroPhase,
    setLoadingOverlayPhase,
    setIsUiChromeVisible,
    setOverlayBarPct,
    updateMinimapAvailability,
    setAutoFitColumnCount,
    refreshCanvasLayout,
    clearScheduledLayoutRefresh,
    captureViewportAnchor,
  } = rendererHandlers;

  useRendererBootstrap({
    header,
    wheelDefinition,
    rendererRef,
    minimapCanvasRef,
    glyphCanvasRef,
    glyphRendererRef,
    glCanvasRef,
    glRendererRef,
    bitStateRef,
    setIsGlUnavailable,
    updateGlDebugInfo,
    pendingRenderRafRef,
    createCamera,
    disposeCamera,
    setZoom,
    getMinimapDetailH,
  });

  useLoadingOverlayLifecycle({
    rendererRef,
    header,
    introTiltStartedRef,
    setIntroPhase,
    setLoadingOverlayPhase,
    setIsUiChromeVisible,
    setOverlayBarPct,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
    loadingOverlayPhase,
    loadCompleteRef,
    loadProgressRef,
  });

  // GL worker is intentionally kept alive as long as the component lives.
  // `OffscreenCanvas.transferControlToOffscreen()` is a one-shot, irreversible
  // operation — calling `dispose()` in a cleanup effect breaks React StrictMode
  // and trace reload. The worker becomes GC-eligible if the component unmounts.
  const spacingPanAnimRef = useRef(null);
  useEffect(() => {
    return () => {
      if (spacingPanAnimRef.current != null) {
        cancelAnimationFrame(spacingPanAnimRef.current);
        spacingPanAnimRef.current = null;
      }
    };
  }, []);

  // Keep r.minimapRightInset in sync with the settings panel state.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.minimapRightInset = isSettingsCollapsed ? 0 : (isMacPlatform ? 388 : 328);
    updateMinimapAvailability();
    if (isMinimapVisible) r.renderMinimap(r.canvasWidth, r.canvas?.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [isSettingsCollapsed, isMacPlatform, isMinimapVisible, getMinimapDetailH, updateMinimapAvailability, rendererRef]);

  // Keep GL diagnostics live while resizing/moving the window.
  useWindowResize(() => updateGlDebugInfo(true), [updateGlDebugInfo]);

  const prevLayoutRef = useRef({
    bitLayout: DEFAULT_SETTINGS.bitLayout,
    byteLayout: DEFAULT_SETTINGS.byteLayout,
    bitSpacingH: DEFAULT_SETTINGS.bitSpacingH,
    bitSpacingV: DEFAULT_SETTINGS.bitSpacingV,
    byteSpacingH: DEFAULT_SETTINGS.byteSpacingH,
    byteSpacingV: DEFAULT_SETTINGS.byteSpacingV,
    u64SpacingH: DEFAULT_SETTINGS.u64SpacingH,
    u64SpacingV: DEFAULT_SETTINGS.u64SpacingV,
    cachelineSize: 64,
    customGroupBits: 0,
    vectorMode: DEFAULT_SETTINGS.vectorMode,
    vectorGroup: DEFAULT_SETTINGS.vectorGroup,
    vectorBaseBits: DEFAULT_SETTINGS.vectorBaseBits,
    vectorLanes: DEFAULT_SETTINGS.vectorLanes,
    horizontalGroups: DEFAULT_SETTINGS.horizontalGroups,
    showByteLabels: DEFAULT_SETTINGS.showByteLabels,
    showVectorLabels: DEFAULT_SETTINGS.showVectorLabels,
    showVectorTouchOrder: DEFAULT_SETTINGS.showVectorTouchOrder,
  });

  useRendererLayoutSync({
    layoutRefs: {
      rendererRef,
      prevLayoutRef,
      containerRef,
      stepsRef,
      currentStepRef,
    },
    layoutConfig: {
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
    },
    layoutState: {
      isMinimapVisible,
    },
    layoutHandlers: {
      updateMinimapAvailability,
      setZoom,
      getMinimapDetailH,
    },
  });

  usePanelResizeRefresh({
    panelWidth,
    isMinimapVisible,
    isDetailOpen,
    detailHeight,
    refreshCanvasLayout,
    clearScheduledLayoutRefresh,
    captureViewportAnchor,
    pendingResizeAnchorRef,
  });
}

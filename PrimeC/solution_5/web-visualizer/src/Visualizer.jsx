import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SieveRenderer, bitToNumber, describeWheelBit, CACHE_PRESETS } from './SieveRenderer';
import { BitGridGLWorker, isWorkerGLSupported } from './renderer/gl/BitGridGLWorker';
import { GlyphTextGLCore } from './renderer/gl/GlyphTextGLCore';
import EventsPanel from './EventsPanel';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import TimingPanel from './TimingPanel';
import Toolbar from './visualizer/Toolbar';
import ExportProgress from './visualizer/ExportProgress';
import CanvasStage from './visualizer/CanvasStage';
import EventTitleBanner from './visualizer/EventTitleBanner';
import JoinedEventsWidget from './visualizer/JoinedEventsWidget';
import DetailInspectorOverlay from './visualizer/DetailInspectorOverlay';
import StepAnimSliders from './visualizer/StepAnimSliders';
import AllEventsTransport from './visualizer/AllEventsTransport';
import BitHistoryBalloons from './visualizer/BitHistoryBalloons';
import KeyboardShortcutsOverlay from './visualizer/KeyboardShortcutsOverlay';
import DebugToolsPanel from './visualizer/DebugToolsPanel';
import { useTraceExport } from './hooks/useTraceExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { use3DCamera } from './hooks/use3DCamera';
import { usePlaybackClock } from './hooks/usePlaybackClock';
import { usePlaybackLoop } from './hooks/usePlaybackLoop';
import { useSearchState } from './hooks/useSearchState';
import { usePanelChoreography } from './hooks/usePanelChoreography';
import { useRawSource } from './hooks/useRawSource';
import { useCanvasRefs } from './hooks/useCanvasRefs';
import { useDebugTools } from './hooks/useDebugTools';
import { useThemeAndColors } from './hooks/useThemeAndColors';
import { useAnimationConfig } from './hooks/useAnimationConfig';
import { useStepAnimation } from './hooks/useStepAnimation';
import { useOverlays } from './hooks/useOverlays';
import { useIntroSequence } from './hooks/useIntroSequence';
import { usePanelState } from './hooks/usePanelState';
import { useWidgetState } from './hooks/useWidgetState';
import { useBalloonLayout } from './hooks/useBalloonLayout';
import { useBitState } from './hooks/useBitState';
import { useBitInfo } from './hooks/useBitInfo';
import { useSelectionOverlay } from './hooks/useSelectionOverlay';
import { useStepSelectionHandlers } from './hooks/useStepSelectionHandlers';
import { usePlaybackControls } from './hooks/usePlaybackControls';
import { useZoomControls } from './hooks/useZoomControls';
import { useTiltControls } from './hooks/useTiltControls';
import { useDetailInspectorActions } from './hooks/useDetailInspectorActions';
import { useDetailPanelStateSync } from './hooks/useDetailPanelStateSync';
import { useRawLogNavigation } from './hooks/useRawLogNavigation';
import { useViewportFit } from './hooks/useViewportFit';
import { useLayoutRefreshScheduler } from './hooks/useLayoutRefreshScheduler';
import { useMinimapDetailHeight } from './hooks/useMinimapDetailHeight';
import { useMinimapAvailability } from './hooks/useMinimapAvailability';
import { useCaptureResizeAnchor } from './hooks/useCaptureResizeAnchor';
import { useStopPlayback } from './hooks/useStopPlayback';
import { useViewportAnimationCancel } from './hooks/useViewportAnimationCancel';
import { useGoToStep } from './hooks/useGoToStep';
import { useCameraStartupRefit } from './hooks/useCameraStartupRefit';
import { useBitStateCheckpoints } from './hooks/useBitStateCheckpoints';
import { useSelectionOrchestration } from './hooks/useSelectionOrchestration';
import { useRendererBootstrap } from './hooks/useRendererBootstrap';
import { useAnimationTimingRuntime } from './hooks/useAnimationTimingRuntime';
import { useBalloonGeometry } from './hooks/useBalloonGeometry';
import { useRunEffect } from './hooks/useRunEffect';
import { usePausableDelay } from './hooks/usePausableDelay';
import { useMaskStampAnimation } from './hooks/useMaskStampAnimation';
import { useSeekStepAnimation } from './hooks/useSeekStepAnimation';
import { useTriggerAnimation } from './hooks/useTriggerAnimation';
import { useViewportNavigation } from './hooks/useViewportNavigation';
import { useViewportAnchoring } from './hooks/useViewportAnchoring';
import { useWindowResize } from './hooks/useWindowResize';
import CanvasLoadingOverlay from './visualizer/CanvasLoadingOverlay';
import StatusBanners from './visualizer/StatusBanners';
import { applyPan } from './visualizer/gestures/pan';
import { applyRotate } from './visualizer/gestures/rotate';
import { applyWheel } from './visualizer/gestures/wheel';
import {
  DEFAULT_LAYOUT_SETTINGS as DEFAULT_SETTINGS,
  DEFAULT_EVENT_TITLE_SETTINGS,
  writeViewPrefs,
  getInitialViewState,
} from './lib/viewPrefs';
import { buildTraceInfoSections } from './lib/traceHeader';
import { detectIsMac, detectIsWindows, detectIsElectron } from './lib/platform';
import {
  getProjectedCanvasMapper,
  parseAppliedRotateAngles,
  computeSafeTiltDegrees,
  computeAutoGlYOffset,
} from './lib/canvasProjection';

/**
 * Top-level visualizer component. Owns all playback, rendering, and UI state.
 *
 * @param {object}   props
 * @param {object}   props.header               - Parsed trace header (arrives early from streaming worker)
 * @param {Array}    props.steps                - Parsed trace steps (grows as the worker streams them)
 * @param {boolean}  props.loadComplete         - True once all steps have been parsed
 * @param {number}   props.loadProgress         - Count of steps parsed so far
 * @param {object}   [props.sourceRef]          - { type:'file', file } | { type:'api', name } for raw-log re-fetch
 * @param {string}   [props.fileName]           - Display name for the loaded file
 * @param {object}   [props.benchmarkTimingData]       - Optional benchmark CSV data for TimingPanel
 * @param {string}   [props.benchmarkTimingFileName]   - Display name for the benchmark file
 * @param {function} [props.onImportBenchmarkTiming]  - Callback to load a benchmark timing file
 * @param {function} [props.onClose]            - Callback to close the visualizer (return to picker)
 * @param {boolean}  [props.autoRender]         - When true, auto-exports video (puppeteer/CLI mode)
 */
export default function Visualizer({
  header,
  steps,
  loadComplete,
  loadProgress,
  sourceRef,
  fileName,
  benchmarkTimingData,
  benchmarkTimingFileName,
  onImportBenchmarkTiming,
  onClose,
  autoRender,
}) {
  const wheelDefinition = header.wheel || null;
  const traceTitle = useMemo(() => header.title || fileName || 'Sieve Visualizer', [header.title, fileName]);
  const traceInfoSections = useMemo(
    () => buildTraceInfoSections(header, fileName),
    [header, fileName],
  );

  const { rawSourceForLog, lineToStep, stepToLine, fetchRawSource } = useRawSource({ sourceRef, steps });

  const {
    minimapCanvasRef, containerRef, rendererRef,
    glCanvasRef, glRendererRef, glyphCanvasRef, glyphRendererRef, wrapperCanvasRef,
    glCssUnlockTokenRef, glCssUnlockRafRef, glCssUnlockTimeoutRef, glCssLockStateRef,
    pendingRenderRafRef,
  } = useCanvasRefs();

  const {
    glUnavailable, setGlUnavailable,
    glDebugInfo, setGlDebugInfo,
    debugToolsOpen, setDebugToolsOpen,
    debugLayerMode, setDebugLayerMode,
    debugGlOffsetX, setDebugGlOffsetX,
    debugGlOffsetY, setDebugGlOffsetY,
    debugGlAutoOffsetY, setDebugGlAutoOffsetY,
    debugCalibrationMode, setDebugCalibrationMode,
    debugGlOffsetXRef, debugGlOffsetYRef, debugGlAutoOffsetYRef,
    glDebugLastUpdateRef, updateGlDebugInfo,
  } = useDebugTools({ glRendererRef });
  const isMacPlatform = useMemo(() => detectIsMac(), []);
  const isWindowsPlatform = useMemo(() => detectIsWindows(), []);
  // Electron (native app) inserts "Electron" into the UA and exposes process.versions.electron.
  // In browser mode we don't reserve space for traffic-light window controls.
  const isElectron = useMemo(() => detectIsElectron(), []);

  // All localStorage-backed UI state is resolved (read + clamp + migrate) in
  // a single pass by `getInitialViewState()` — see `src/lib/viewPrefs.js`.
  // The bundle is captured once via `useMemo` and then fed straight into
  // each `useState` seed. Persistence on change still happens in the
  // `writeViewPrefs(...)` effect further down.
  const initialPrefs = useMemo(() => getInitialViewState(), []);

  const {
    theme, setTheme,
    gridOpacity, setGridOpacity,
    canvasColors, setCanvasColors,
    colorPreset, setColorPreset,
    customColors, setCustomColors,
  } = useThemeAndColors({ initialPrefs });

  const {
    animMode, setAnimMode,
    animStyle, setAnimStyle,
    delayBetweenEvents, setDelayBetweenEvents,
    delayBetweenRepeats, setDelayBetweenRepeats, delayBetweenRepeatsRef,
    eventTimeTargets, setEventTimeTargets, eventTimeTargetsRef,
    eventDurationMode, setEventDurationMode, eventDurationModeRef,
    bitAnimInterval, setBitAnimInterval,
    maskAnimInterval, setMaskAnimInterval,
    bitsAtTimeRatioRef, timeRatioAtBitIndexRef, computeEventDurationRef,
    stepSpeedValue, maskSpeedValue, setStepSpeedValue, setMaskSpeedValue,
    cycleAnimStyle, cycleAnimMode, animStyleInfo, animModeInfo,
  } = useAnimationConfig({ initialPrefs });

  const {
    bitAnimationMode, setBitAnimationMode, bitAnimationModeRef,
    singleEventLoopActive, setSingleEventLoopActive, singleEventLoopActiveRef,
    autoAnimateOnSelect, setAutoAnimateOnSelect, autoAnimateOnSelectRef,
    animationReplayPaused, setAnimationReplayPaused,
    isScrubbingTopRef,
    stepScrubProgress, setStepScrubProgress, stepScrubProgressRef, stepScrubProgressValueRef,
    delayPhaseMs, setDelayPhaseMsRef,
    stepAnimRunning, setStepAnimRunningRef, stepAnimRunningRefForScheduler,
    stepResumeStartIndexRef, stepResumeMaskProgressRef,
    currentAnimIntervalRef, currentMaskAnimIntervalRef,
    pausedStepAnimLoopRef, selectedAnimLoopRef,
    handleBitAnimationModeChange,
  } = useStepAnimation({ initialPrefs });

  const { globalPausedRef, seekGenRef, animBusyUntilRef } = usePlaybackClock();

  const {
    heatMapEnabled, setHeatMapEnabled,
    cachelineAnnotation, setCachelineAnnotation,
    primeOverlayEnabled, setPrimeOverlayEnabled,
    rangeOverlayEnabled, setRangeOverlayEnabled,
    rangeOverlayStart, setRangeOverlayStart,
    rangeOverlayEnd, setRangeOverlayEnd,
    multiplesOverlayEnabled, setMultiplesOverlayEnabled,
    multiplesOverlayPrime, setMultiplesOverlayPrime,
    cachelineSize, setCachelineSize,
    cachePreset, setCachePreset,
  } = useOverlays();

  const {
    introPhase, setIntroPhase,
    introTiltStartedRef,
    topbarPlaybackReady,
    loadingOverlayPhase, setLoadingOverlayPhase,
    uiChromeVisible, setUiChromeVisible,
    overlayBarPct, setOverlayBarPct,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
    loadCompleteRef,
    loadProgressRef,
  } = useIntroSequence({ loadComplete, loadProgress });

  const {
    allEventsWidgetHidden, setAllEventsWidgetHidden,
    singleEventWidgetRevealed, setSingleEventWidgetRevealed,
    allEventsInDetailPanel, setAllEventsInDetailPanel,
    widgetsJoined, setWidgetsJoined,
    joinBannerRect, setJoinBannerRect,
    pendingBannerDragStart, setPendingBannerDragStart,
    revealStepRequest, setRevealStepRequest,
    timingPanelOpen, setTimingPanelOpen,
    timingFocusOp, setTimingFocusOp,
    detailInspectorOpen, setDetailInspectorOpen,
    detailInspectorMode, setDetailInspectorMode,
    detailInspectorQuery, setDetailInspectorQuery,
  } = useWidgetState({ initialPrefs });

  const {
    eventsPanelCollapsed, setEventsPanelCollapsed,
    settingsCollapsed, setSettingsCollapsed,
    detailOpen, setDetailOpen, detailOpenRef,
    showMinimap, setShowMinimap,
    minimapAvailable, setMinimapAvailable,
    panelWidth, setPanelWidth,
    detailHeight, setDetailHeight, detailHeightRef,
    detailWidth, setDetailWidth,
    stepStats, setStepStats,
    settingsActiveTab, setSettingsActiveTab,
    settingsTabRequest, setSettingsTabRequest,
    deferredPanelStateRef,
  } = usePanelState({ initialPrefs, introPhase, singleEventWidgetRevealed });

  const {
    pinnedBitIndices, setPinnedBitIndices,
    hoveredBitInfo, setHoveredBitInfo,
    balloonLiveLayout, setBalloonLiveLayout,
    balloonLayoutRafRef, balloonLiveLayoutTimerRef, lastHoveredIdxRef,
    scheduleBalloonRelayout,
  } = useBalloonLayout();

  const {
    bitStateRef, bitStateCheckpointsRef, bitStateDirtyRef,
    selectedSteps, setSelectedSteps, selectedStepsRef,
  } = useBitState();

  const {
    canvasAnchorPx, setCanvasAnchorPx,
    pendingResizeAnchorRef,
    layoutRefreshTimeoutRef, layoutRefreshRaf1Ref, layoutRefreshRaf2Ref,
    viewportAnimRef,
  } = useViewportAnchoring();

  const { cancelViewportAnimation } = useViewportAnimationCancel({ viewportAnimRef });

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playSpeedPercent, setPlaySpeedPercent] = useState(initialPrefs.playSpeedPercent);
  const playSpeedPercentRef = useRef(playSpeedPercent);
  playSpeedPercentRef.current = playSpeedPercent;
  const [zoom, setZoom] = useState(1);
  const [showTraceInfo, setShowTraceInfo] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState(initialPrefs.layoutSettings);
  const [autoFitColumnCount, setAutoFitColumnCount] = useState(0);
  const [eventTitleSettings, setEventTitleSettings] = useState(initialPrefs.eventTitleSettings);
  const [storageModel, setStorageModel] = useState(header.storageModel || 'half');
  useEffect(() => {
    setStorageModel(header.storageModel || 'half');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header]);

  // Derived values
  const controlsHidden = eventsPanelCollapsed && !allEventsWidgetHidden;
  const balloonMode = layoutSettings.balloonMode || 'click-hover';
  const balloonsEnabled = balloonMode !== 'off';
  const balloonClickEnabled = balloonMode === 'bit-clock' || balloonMode === 'click-hover';
  const balloonHoverEnabled = balloonMode === 'click-hover';

  // 3D camera — always enabled; tilt angle controlled by the tilt button.
  const mode3D = true;
  const {
    camera3DRef,
    camera3DTransform,
    camera3DContainerStyle,
    cameraKey,
    setCamera3DTransform,
    setCamera3DContainerStyle,
    createCamera,
    disposeCamera,
    ensureTiltCamera,
  } = use3DCamera();

  const camera3DTransformRef = useRef(camera3DTransform);
  camera3DTransformRef.current = camera3DTransform;

  const stepsRef = useRef([]);
  const currentStepRef = useRef(0);
  const playTimerRef = useRef(null);
  const rippleRef = useRef(null);
  const runEffectCancelRef = useRef(null);
  const seqTimerRef = useRef(null);
  const triggerAnimationRef = useRef(null);
  const stopSeqAnimRef = useRef(null);
  const playTimeoutRef = useRef(null);
  const initialFitDoneRef = useRef(false);
  const initialHighlightHoldRef = useRef(true);
  const traceInfoPopoverRef = useRef(null);
  const traceInfoToggleRef = useRef(null);

  stepsRef.current = steps;
  currentStepRef.current = currentStep;

  const { getMinimapDetailH } = useMinimapDetailHeight({ detailOpenRef, detailHeightRef });

  const applyDebugSnapshot = useCallback((snapshot) => {
    const rr = rendererRef.current;
    if (!rr) return { ok: false, message: 'Renderer not ready' };

    if (typeof snapshot?.panX === 'number') rr.panX = snapshot.panX;
    if (typeof snapshot?.panY === 'number') rr.panY = snapshot.panY;
    if (typeof snapshot?.zoom === 'number' && Number.isFinite(snapshot.zoom) && snapshot.zoom > 0) {
      rr.zoom = snapshot.zoom;
      setZoom(snapshot.zoom);
    }

    if (typeof snapshot?.manualOffsetY === 'number' && Number.isFinite(snapshot.manualOffsetY)) {
      setDebugGlOffsetY(snapshot.manualOffsetY);
    }
    if (typeof snapshot?.manualOffsetX === 'number' && Number.isFinite(snapshot.manualOffsetX)) {
      setDebugGlOffsetX(snapshot.manualOffsetX);
    }

    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      let changed = false;
      if (typeof snapshot?.rotateX === 'number' && Number.isFinite(snapshot.rotateX)) {
        const lim = Number.isFinite(cam.maxTilt) ? Math.abs(cam.maxTilt) : 89;
        cam.rotateX = Math.max(-lim, Math.min(lim, snapshot.rotateX));
        changed = true;
      }
      if (typeof snapshot?.rotateY === 'number' && Number.isFinite(snapshot.rotateY)) {
        const lim = Number.isFinite(cam.maxTilt) ? Math.abs(cam.maxTilt) : 89;
        cam.rotateY = Math.max(-lim, Math.min(lim, snapshot.rotateY));
        changed = true;
      }
      if (changed) {
        setCamera3DTransform(cam.getCanvasTransform());
        setCamera3DContainerStyle(cam.getContainerStyle());
      }
    }

    rr.render();
    rr.renderMinimap(rr.canvasWidth, rr.canvasHeight, getMinimapDetailH());
    return { ok: true, message: 'Snapshot applied' };
  }, [setCamera3DTransform, setCamera3DContainerStyle, getMinimapDetailH]);

  // Forcibly cancel any pending GL CSS unlock, clear the resize-lock, apply
  // the correct CSS size to the GL canvas, and trigger a full redraw.
  // Useful when Chrome/Edge gets stuck showing a stale or invisible GL layer
  // after a resize (e.g. the backing-store poll never matched, or the unlock
  // rAF was dropped).
  const forceGlRedraw = useCallback(() => {
    // Invalidate any in-flight unlock token so pending rAFs/timeouts are no-ops.
    ++glCssUnlockTokenRef.current;
    if (glCssUnlockRafRef.current != null) {
      cancelAnimationFrame(glCssUnlockRafRef.current);
      glCssUnlockRafRef.current = null;
    }
    if (glCssUnlockTimeoutRef.current != null) {
      clearTimeout(glCssUnlockTimeoutRef.current);
      glCssUnlockTimeoutRef.current = null;
    }
    glCssLockStateRef.current = null;
    // Re-apply the correct CSS size and rotation to the GL canvas.
    const glEl = glCanvasRef.current;
    const r = rendererRef.current;
    if (glEl && r) {
      const w = r.canvasWidth || 0;
      const h = r.canvasHeight || 0;
      if (w > 0 && h > 0) {
        glEl.style.width = `${w}px`;
        glEl.style.height = `${h}px`;
      }
      const rot = camera3DTransformRef.current !== 'none' ? camera3DTransformRef.current : '';
      glEl.style.transform = rot;
    }
    // Force a full redraw (Canvas2D + GL worker).
    if (r) r.render();
  }, []);

  const { computeBitInfo } = useBitInfo({ rendererRef, stepsRef, wheelDefinition });

  const { updateDetailOpen, updateDetailHeight } = useDetailPanelStateSync({
    detailOpenRef,
    setDetailOpen,
    detailHeightRef,
    setDetailHeight,
  });

  const { updateMinimapAvailability } = useMinimapAvailability({
    rendererRef,
    containerRef,
    showMinimap,
    setMinimapAvailable,
  });

  const { stopPlayback } = useStopPlayback({ setPlaying, playTimeoutRef, playTimerRef });

  const stopSeqAnim = useCallback(() => {
    if (seqTimerRef.current) {
      cancelAnimationFrame(seqTimerRef.current);
      seqTimerRef.current = null;
    }
    if (runEffectCancelRef.current) {
      runEffectCancelRef.current();
      runEffectCancelRef.current = null;
    }
    if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
  }, [seqTimerRef, runEffectCancelRef, setStepAnimRunningRef]);

  useEffect(() => {
    stopSeqAnimRef.current = stopSeqAnim;
  }, [stopSeqAnim]);

  const getCanvasTargetSize = useCallback((width, height) => {
    // Unified geometry: the canvas is ALWAYS the oversized 3D plane,
    // regardless of whether the camera is currently tilted. 2D mode
    // is just "3D with rotateX = rotateY = 0". This means panel
    // toggles never change the canvas size (no grid reflow / drift)
    // and the 2D and 3D placements are identical.
    //
    // We use the largest of (current container, viewport) as the
    // baseline so collapsing/expanding side panels can't shrink
    // the canvas — those toggles must be visually free.
    const cam = camera3DRef.current;
    // Read angles directly from the camera ref rather than from the
    // camera3DTransform React state. camera3DTransform changes on every tilt
    // animation frame, which would make this callback unstable → cause
    // refreshCanvasLayout to be re-created → the resize useEffect re-fires
    // every pointer-move during a tilt gesture (calling the heavy
    // refreshCanvasLayout 60fps). camera3DRef is a stable ref so this
    // callback stays memoised for the lifetime of the camera instance.
    // canvas layout is explicitly re-triggered at gesture end (schedulePostLayoutRefresh).
    const baseW = Math.max(width || 0, (typeof window !== 'undefined' ? window.innerWidth : width) || 0);
    const baseH = Math.max(height || 0, (typeof window !== 'undefined' ? window.innerHeight : height) || 0);
    let scaleH = 1;
    let scaleW = 1;
    let diagonalOverscan = 1;
    if (cam && cam.enabled) {
      const rotateX = cam.rotateX || 0;
      const rotateY = cam.rotateY || 0;
      const ax = Math.abs(rotateX) * Math.PI / 180;
      const ay = Math.abs(rotateY) * Math.PI / 180;
      scaleH = 1 / Math.max(0.3, Math.cos(ax));
      scaleW = 1 / Math.max(0.3, Math.cos(ay));
      diagonalOverscan = 1 + Math.hypot(Math.sin(ax), Math.sin(ay)) * 0.55;
    }
    const dragOverscan = 3.1;
    const canvasWRaw = Math.max(baseW * 3.2, baseW * scaleW * diagonalOverscan * dragOverscan);
    const canvasHRaw = Math.max(baseH * 3.2, baseH * scaleH * diagonalOverscan * dragOverscan);
    // Keep CSS and backing geometry on integer CSS pixels to avoid
    // fractional-size drift between GL and Canvas2D at large canvas sizes.
    const canvasW = Math.max(1, Math.round(canvasWRaw));
    const canvasH = Math.max(1, Math.round(canvasHRaw));
    return { canvasW, canvasH };
  }, []);

  const getCanvasPlaneMetrics = useCallback(() => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const canvasEl = r.canvas || glCanvasRef.current;
    const planeW = r.canvasWidth || canvasEl?.offsetWidth || rect.width;
    const planeH = r.canvasHeight || canvasEl?.offsetHeight || rect.height;
    const mapper = getProjectedCanvasMapper(canvasEl);
    // Only read style.left/top from the glyph canvas (r.canvas). In worker
    // mode r.canvas is null and the GL canvas fallback has style.left='0px'
    // (set imperatively by refreshCanvasLayout) — reading it gives anchor=0
    // instead of canvasAnchorPx, which makes zoom pivot at the canvas-plane
    // origin (upper-left) instead of the viewport centre.
    const glyphEl = r.canvas;
    const cssLeft = glyphEl ? parseFloat(glyphEl.style.left || '') : Number.NaN;
    const cssTop  = glyphEl ? parseFloat(glyphEl.style.top  || '') : Number.NaN;
    const anchorLeft = Number.isFinite(cssLeft) ? cssLeft : (canvasAnchorPx?.left ?? rect.width / 2);
    const anchorTop  = Number.isFinite(cssTop)  ? cssTop  : (canvasAnchorPx?.top  ?? rect.height / 2);
    return {
      rect,
      planeW,
      planeH,
      planeOffsetX: planeW / 2 - anchorLeft,
      planeOffsetY: planeH / 2 - anchorTop,
      canvasToViewport: mapper?.toViewport || null,
      viewportToCanvas: mapper?.toCanvas || null,
    };
  }, [canvasAnchorPx]);

  const captureViewportAnchor = useCallback((xRatio = 0.5, yRatio = 0.5) => {
    const r = rendererRef.current;
    const metrics = getCanvasPlaneMetrics();
    if (!r || !metrics) return null;
    const { rect, planeW, planeH, planeOffsetX, planeOffsetY } = metrics;
    const clientX = rect.left + rect.width * xRatio;
    const clientY = rect.top + rect.height * yRatio;
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const cam = camera3DRef.current;
    const canvasPoint = cam && cam.enabled
      ? cam.screenToCanvas(localX, localY, planeW, planeH, planeOffsetX, planeOffsetY)
      : { x: planeOffsetX + localX, y: planeOffsetY + localY };
    return {
      clientX,
      clientY,
      contentX: (canvasPoint.x - r.panX) / Math.max(0.0001, r.zoom || 1),
      contentY: (canvasPoint.y - r.panY) / Math.max(0.0001, r.zoom || 1),
    };
  }, [getCanvasPlaneMetrics]);

  const refreshCanvasLayout = useCallback((anchor = null) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const { canvasW, canvasH } = getCanvasTargetSize(rect.width, rect.height);

    // Perspective safety: as canvas plane height grows, large rotateX values
    // can produce extreme perspective amplification near the top edge. Cap
    // tilt dynamically so rendered geometry remains stable at high zoom.
    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      const safeTilt = computeSafeTiltDegrees(canvasH, cam.perspective || 1500);
      cam.maxTilt = safeTilt * 10; // alow some user experimentation
      let clamped = false;
      if (Math.abs(cam.rotateX) > safeTilt) {
        cam.rotateX = Math.sign(cam.rotateX || 1) * safeTilt;
        clamped = true;
      }
      if (Math.abs(cam.rotateY) > safeTilt) {
        cam.rotateY = Math.sign(cam.rotateY || 1) * safeTilt;
        clamped = true;
      }
      if (clamped) {
        setCamera3DTransform(cam.getCanvasTransform());
        setCamera3DContainerStyle(cam.getContainerStyle());
      }
    }

    const oldCanvasW = r.canvasWidth || 0;
    const oldCanvasH = r.canvasHeight || 0;
    const glRenderer = glRendererRef.current;
    const glDirectMode = !!(glRenderer && typeof glRenderer.isDirectMode === 'function' && glRenderer.isDirectMode());
    let overlayDpr = null;
    if (glRenderer) {
      glRenderer.resize(canvasW, canvasH);
      if (glDirectMode && typeof glRenderer.getEffectiveDpr === 'function') {
        overlayDpr = glRenderer.getEffectiveDpr();
      }
    }
    r.resize(canvasW, canvasH, overlayDpr);
    // Sync wrapper div and GL canvas dimensions so translate(-50%,-50%) in
    // renderCanvasStyle computes the correct pixel shift (50% of the wrapper's
    // own size) and the GL canvas CSS display always matches Canvas2D.
    // Must happen imperatively here (before the next paint) rather than
    // waiting for a React re-render, so that the centering is correct on the
    // very first frame after a resize.
    //
    // GL canvas sizing: the wrapper is updated to the new size immediately
    // (for correct centering via translate(-50%,-50%)). The GL canvas CSS is
    // locked to the OLD size until the worker has drawn at the new size. This
    // prevents the browser from CSS-scaling the old drawing buffer to the new
    // CSS dimensions, which caused the grid and annotations to move in opposite
    // directions during window resize (and zoom appearing to affect only
    // annotations). A requestAnimationFrame deferred step below updates the GL
    // canvas CSS to the new size after the worker messages have been processed.
    //
    // On Safari (direct mode), resize is synchronous so the deferred update is
    // harmless (just re-sets the same value one frame later).

    const wrapperEl = wrapperCanvasRef.current;
    if (wrapperEl) {
      wrapperEl.style.width = `${canvasW}px`;
      wrapperEl.style.height = `${canvasH}px`;
    }
    const glEl = glCanvasRef.current;
    const glSizeChanging = glEl && (canvasW !== oldCanvasW || canvasH !== oldCanvasH);
    // Read angles directly from the camera ref — avoids a stale closure on
    // camera3DTransform (which is not in this callback's dep array).
    const appliedAngles = cam && cam.enabled
      ? { rotateX: cam.rotateX || 0, rotateY: cam.rotateY || 0 }
      : { rotateX: 0, rotateY: 0 };
    let autoGlOffsetY = 0;
    if (glDirectMode && glRenderer && typeof glRenderer.getEffectiveDpr === 'function') {
      autoGlOffsetY = computeAutoGlYOffset(
        canvasH,
        glRenderer.getEffectiveDpr(),
        appliedAngles.rotateX,
        appliedAngles.rotateY,
        canvasW,
      );
    }
    debugGlAutoOffsetYRef.current = autoGlOffsetY;
    setDebugGlAutoOffsetY((prev) => (prev === autoGlOffsetY ? prev : autoGlOffsetY));
    const totalGlOffsetX = debugGlOffsetXRef.current || 0;
    const totalGlOffsetY = autoGlOffsetY + (debugGlOffsetYRef.current || 0);
    // Rotation string shared by both the GL canvas and the glyph overlay canvas.
    // Defined outside if(glEl) so the glyph canvas update below can use it.
    const rotStr = camera3DTransformRef.current !== 'none' ? camera3DTransformRef.current : '';
    const makeGlTransform = (translateStr) => [rotStr, translateStr].filter(Boolean).join(' ');

    if (glEl) {
      // Always keep GL anchored from top-left with explicit size. Chromium can
      // behave inconsistently when right/bottom constraints remain active while
      // width/height are also assigned dynamically.
      glEl.style.left = `${totalGlOffsetX}px`;
      glEl.style.top = `${totalGlOffsetY}px`;
      glEl.style.right = 'auto';
      glEl.style.bottom = 'auto';

      if (glDirectMode) {
        // Direct mode renders synchronously on the main thread, so we do not
        // need the worker catch-up CSS lock. Applying it in Chromium can
        // itself introduce drift during horizontal window growth.
        glCssLockStateRef.current = null;
        glEl.style.width = `${canvasW}px`;
        glEl.style.height = `${canvasH}px`;
        glEl.style.transform = makeGlTransform('');
      } else {
        const activeGlCssLock = glCssLockStateRef.current;
        if (!glSizeChanging) {
          if (activeGlCssLock
            && activeGlCssLock.targetW === canvasW
            && activeGlCssLock.targetH === canvasH) {
            glEl.style.width = `${activeGlCssLock.lockW}px`;
            glEl.style.height = `${activeGlCssLock.lockH}px`;
            glEl.style.transform = makeGlTransform(activeGlCssLock.translateTransform);
          } else {
            // Size unchanged: set immediately (no CSS-scale risk).
            glEl.style.width = `${canvasW}px`;
            glEl.style.height = `${canvasH}px`;
            glEl.style.transform = makeGlTransform('');
          }
        } else {
          // Size IS changing: lock GL canvas CSS to the OLD size (overriding
          // the CSS `inset: 0` rule, which would otherwise auto-expand the GL
          // canvas to fill the newly-resized wrapper). This prevents the browser
          // from CSS-scaling the old drawing buffer to the new wrapper dimensions.
          // A rAF deferred step after r.render() updates to the new size.
          const lockW = oldCanvasW > 0 ? oldCanvasW : canvasW;
          const lockH = oldCanvasH > 0 ? oldCanvasH : canvasH;
          glEl.style.width = `${lockW}px`;
          glEl.style.height = `${lockH}px`;
          // The wrapper is resized immediately to the new dimensions. Because
          // the GL canvas is position:absolute at (0,0) inside the wrapper, the
          // wrapper growing/shrinking shifts the GL canvas in screen space by
          // ±deltaW/2 (half the width change). Meanwhile Canvas2D re-renders
          // with an updated panX (= old panX + deltaW/2), which shifts the
          // rendered content by +deltaW/2 in the SAME direction. The combined
          // effect means we need to shift the locked GL frame by a full deltaW
          // (= canvasW - oldCanvasW) to make the old GL cells appear at the same
          // screen positions as the new Canvas2D annotations.
          //   GL visual left  = wrapperLeft + deltaW
          //                   = (center − newW/2) + (newW − oldW)
          //                   = center + newW/2 − oldW
          //   C2D content at W = (center − newW/2) + (newW/2 + panX_new)
          //                    = center + panX_new  (same world → same screen ✓)
          const glDx = canvasW - lockW;
          const glDy = canvasH - lockH;
          // Store only the translate part so it can be re-composed with the
          // (possibly changing) rotation when the lock is later restored.
          const lockTranslate = (glDx !== 0 || glDy !== 0) ? `translate(${glDx}px, ${glDy}px)` : '';
          glEl.style.transform = makeGlTransform(lockTranslate);
          glCssLockStateRef.current = {
            targetW: canvasW,
            targetH: canvasH,
            lockW,
            lockH,
            translateTransform: lockTranslate,
          };
        }
      }
    }
    // Apply the same rotation to the glyph overlay canvas. It fills the wrapper
    // via CSS (inset: 0) so only the rotation is needed — no position offset.
    const glyphOverlayEl = glyphCanvasRef.current;
    if (glyphOverlayEl) {
      glyphOverlayEl.style.transform = rotStr;
    }
    // Keep grid content stable when the window (and therefore the canvas)
    // resizes. The canvas is centered at the viewport center, so when the
    // canvas grows by dCanvasW its left edge moves left by dCanvasW/2.
    // Compensating panX by dCanvasW/2 keeps every canvas-coord the same
    // distance from the canvas center, which means the 3D perspective
    // projection is unchanged (no lean/tilt artefact). In 2D the content
    // drifts by dWindowW/2 — the natural "window-center moved" effect —
    // which is far less disruptive than the original 1.1×dWindowW drift.
    if (oldCanvasW > 0) {
      r.panX += (canvasW - oldCanvasW) / 2;
      r.panY += (canvasH - oldCanvasH) / 2;
    }
    // Tell the renderer the layout-available area so the grid
    // wrapping math (`_computeClPerVRow`) targets a STABLE size,
    // not the live container rect. Using `window.innerWidth/Height`
    // means panel toggles don't change the chosen column count and
    // therefore don't reflow / drift the grid; the user just sees
    // more or less of the same plane through the resized container.
    const lvW = (typeof window !== 'undefined' ? window.innerWidth : rect.width) || rect.width;
    const lvH = (typeof window !== 'undefined' ? window.innerHeight : rect.height) || rect.height;
    r.layoutAvailWidth = lvW;
    r.layoutAvailHeight = lvH;
    r.unfreezeLayout();
    r.freezeLayout();
    if (r.horizontalGroups === 0 && typeof r._cacheLinesPerVisualRow === 'function') {
      const nextAutoCols = Math.max(1, r._cacheLinesPerVisualRow());
      setAutoFitColumnCount((prev) => (prev === nextAutoCols ? prev : nextAutoCols));
    }

    // Store the actual visible container dimensions on the renderer so that
    // renderMinimap and updateMinimapAvailability use the real viewport size
    // rather than the oversized (3×) drag-headroom canvas dimensions.
    r.viewportW = rect.width;
    r.viewportH = rect.height;

    // NOTE: anchor-based panX/panY compensation removed for panel toggles.
    // With the canvas pinned to the VIEWPORT center (see canvasAnchorPx and
    // renderCanvasStyle), the canvas no longer moves when the container
    // reshapes on a panel toggle (canvasW/H are based on windowW/H, not
    // containerW/H, so they don't change on panel toggles), so there is
    // nothing to compensate for. Window-resize is handled above via the
    // dCanvasW/2 adjustment which preserves canvas-center-relative content
    // positions and keeps the 3D perspective projection stable.
    void anchor;

    const glRenderSeq = r.render();
    // After r.render() the patched render has posted resize+positions+render
    // messages to the GL worker. For width-growth resizes, wait for an
    // explicit worker render-ack before unlocking GL canvas CSS to the new
    // dimensions so the browser never stretches an old drawing buffer.
    // Keep a short timeout fallback to avoid stalls if the worker is busy.
    if (glSizeChanging && !glDirectMode) {
      const targetW = canvasW;
      const targetH = canvasH;
      const targetEl = glEl;
      const g = glRendererRef.current;
      const targetDpr = g && typeof g.getEffectiveDpr === 'function'
        ? g.getEffectiveDpr()
        : ((window.devicePixelRatio || 1));
      // Use Math.round to match bitGridGLCore.js which also uses Math.round
      // when setting canvas.width/height. Using Math.floor here caused a
      // rounding mismatch (e.g. 801 × 1.5 → floor=1201, round=1202) that
      // prevented waitForGlBackingStore from ever finding a match, forcing
      // every horizontal-growth resize to wait for the full 80 ms timeout.
      const targetPxW = Math.max(1, Math.round(targetW * targetDpr));
      const targetPxH = Math.max(1, Math.round(targetH * targetDpr));
      const token = ++glCssUnlockTokenRef.current;
      if (glCssUnlockRafRef.current != null) {
        cancelAnimationFrame(glCssUnlockRafRef.current);
        glCssUnlockRafRef.current = null;
      }
      if (glCssUnlockTimeoutRef.current != null) {
        clearTimeout(glCssUnlockTimeoutRef.current);
        glCssUnlockTimeoutRef.current = null;
      }
      const applyUnlockedSize = () => {
        if (token !== glCssUnlockTokenRef.current) return;
        glCssUnlockRafRef.current = requestAnimationFrame(() => {
          glCssUnlockRafRef.current = null;
          if (token !== glCssUnlockTokenRef.current) return;
          if (targetEl) {
            glCssLockStateRef.current = null;
            targetEl.style.width = `${targetW}px`;
            targetEl.style.height = `${targetH}px`;
            // Restore just the rotation — no resize-lock translate remains.
            const rot = camera3DTransformRef.current !== 'none' ? camera3DTransformRef.current : '';
            targetEl.style.transform = rot;
            // Keep glyph overlay in sync.
            const glyphUnlockEl = glyphCanvasRef.current;
            if (glyphUnlockEl) glyphUnlockEl.style.transform = rot;
          }
        });
      };
      const waitForGlBackingStore = () => {
        if (token !== glCssUnlockTokenRef.current) return;
        if (!targetEl) {
          applyUnlockedSize();
          return;
        }
        if (targetEl.width === targetPxW && targetEl.height === targetPxH) {
          applyUnlockedSize();
          return;
        }
        glCssUnlockRafRef.current = requestAnimationFrame(() => {
          waitForGlBackingStore();
        });
      };
      const grewHorizontally = oldCanvasW > 0 && canvasW > oldCanvasW;
      if (grewHorizontally) {
        glCssUnlockTimeoutRef.current = setTimeout(() => {
          glCssUnlockTimeoutRef.current = null;
          applyUnlockedSize();
        }, 80);
        waitForGlBackingStore();
      } else {
        applyUnlockedSize();
      }
    }
    updateMinimapAvailability();
    if (showMinimap) r.renderMinimap(rect.width, rect.height, getMinimapDetailH());
  }, [getCanvasTargetSize, showMinimap, getMinimapDetailH, updateMinimapAvailability, setCamera3DTransform, setCamera3DContainerStyle, debugGlOffsetX, debugGlOffsetY]);

  // Keep manual debug offsets responsive even when no resize/layout event is
  // in flight. This updates both direct GL canvas placement and the Canvas2D
  // composited fallback path immediately when X/Y sliders or nudges change.
  useEffect(() => {
    const glEl = glCanvasRef.current;
    const rr = rendererRef.current;
    const totalGlOffsetY = (debugGlAutoOffsetY || 0) + (debugGlOffsetY || 0);
    if (glEl) {
      glEl.style.left = `${debugGlOffsetX || 0}px`;
      glEl.style.top = `${totalGlOffsetY}px`;
      glEl.style.right = 'auto';
      glEl.style.bottom = 'auto';
    }
    if (rr) {
      rr.render();
    }
  }, [debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY]);

  // Keep the GL canvas rotation up-to-date whenever the camera changes.
  // Previously the rotation lived in renderCanvasStyle (React state on the
  // wrapper div), so React re-renders kept it current. Now it is applied
  // imperatively to the canvas element, so we need an explicit effect.
  // The resize-lock translate (if any) is preserved by reading the current
  // transform and extracting the rotation part from camera3DTransformRef.
  useEffect(() => {
    const rotStr = camera3DTransform !== 'none' ? camera3DTransform : '';
    const lockTranslate = glCssLockStateRef.current?.translateTransform || '';
    const glEl = glCanvasRef.current;
    if (glEl) {
      glEl.style.transform = [rotStr, lockTranslate].filter(Boolean).join(' ');
    }
    // Keep glyph overlay in sync — same rotation, no translate offset.
    const glyphEl = glyphCanvasRef.current;
    if (glyphEl) {
      glyphEl.style.transform = rotStr;
    }
  }, [camera3DTransform]);

  // Keep the canvas pinned to the VIEWPORT center (not the container
  // center) so panel collapse/expand transitions don't slide the
  // (stable) canvas content across the screen. We update DOM styles
  // imperatively (NOT through React state) so the position tracks the
  // container's CSS transition frame-by-frame -- React state batching
  // adds a render-cycle lag that was visible as a large displacement
  // when the events panel collapsed. A rAF self-priming loop runs for
  // ~420ms after each detected container reshape (or transition start)
  // to cover the entire CSS transition.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return undefined;
    let lastL = Number.NaN;
    let lastT = Number.NaN;
    let rafId = 0;
    let rafUntil = 0;
    const apply = (left, top) => {
      const leftStr = `${left}px`;
      const topStr = `${top}px`;
      // Update only the wrapper div — the 3D transform lives on the
      // wrapper, not on individual canvas elements (prevents per-canvas
      // Safari GPU compositing layers that cause black flicker).
      const wrapperEl = wrapperCanvasRef.current;
      if (wrapperEl) {
        if (wrapperEl.style.left !== leftStr) wrapperEl.style.left = leftStr;
        if (wrapperEl.style.top !== topStr) wrapperEl.style.top = topStr;
      }
      // Pin perspective-origin to the same anchor so the 3D vanishing
      // point doesn't slide when the container reshapes.
      el.style.perspectiveOrigin = `${left}px ${top}px`;
    };
    const sample = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const left = Math.round((window.innerWidth / 2 - rect.left) * 100) / 100;
      const top = Math.round((window.innerHeight / 2 - rect.top) * 100) / 100;
      if (left === lastL && top === lastT) return false;
      lastL = left;
      lastT = top;
      apply(left, top);
      setCanvasAnchorPx({ left, top });
      return true;
    };
    const tick = () => {
      sample();
      if (performance.now() < rafUntil) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };
    const kick = (durationMs = 420) => {
      rafUntil = Math.max(rafUntil, performance.now() + durationMs);
      if (!rafId) rafId = requestAnimationFrame(tick);
    };
    sample();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => kick());
      ro.observe(el);
      if (document.body) ro.observe(document.body);
    }
    const onResize = () => kick();
    const onScroll = () => kick(60);
    const onTransitionStart = (ev) => {
      const p = ev.propertyName;
      if (p === 'width' || p === 'flex-basis' || p === 'transform' || p === 'margin' || p === 'padding') {
        kick();
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('transitionstart', onTransitionStart, true);
    // Watch for device-pixel-ratio changes (user moves window between
    // displays with different DPRs, or zooms the browser page). Chrome/Edge
    // don't always fire a 'resize' event in that case, but the media-query
    // change fires reliably. Each handler recreates the watcher at the new
    // DPR so the query stays fresh without leaking listeners.
    let _dprMq = null;
    const _watchDpr = () => {
      if (typeof window === 'undefined') return;
      const _mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const _onDpr = () => { sample(); kick(); _dprMq = null; _watchDpr(); };
      _mq.addEventListener('change', _onDpr);
      _dprMq = { mq: _mq, cb: _onDpr };
    };
    _watchDpr();
    document.addEventListener('transitionrun', onTransitionStart, true);
    return () => {
      if (ro) ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('transitionstart', onTransitionStart, true);
      document.removeEventListener('transitionrun', onTransitionStart, true);
      if (_dprMq) _dprMq.mq.removeEventListener('change', _dprMq.cb);
    };
  }, []);

  const { clearScheduledLayoutRefresh, schedulePostLayoutRefresh } = useLayoutRefreshScheduler({
    layoutRefreshTimeoutRef,
    layoutRefreshRaf1Ref,
    layoutRefreshRaf2Ref,
  });

  const { applyViewportFit } = useViewportFit();

  /**
   * Stash a viewport anchor for the panel-toggle resize useEffect.
   * Must be called BEFORE the state update that triggers the layout change
   * (see §5 minefield: pendingResizeAnchorRef). Each panel toggle handler
   * calls this once immediately before its setState call.
   */
  const { captureResizeAnchor } = useCaptureResizeAnchor({
    pendingResizeAnchorRef,
    captureViewportAnchor,
  });

  const {
    dockEventsWidgetToDetailPanel,
    dockEventsWidgetToTopBar,
    expandEventsPanelFromWidget,
    hideJoinedWidget,
    joinWidgets,
    openAnimationSettings,
    pushJoinedWidgetToDetailPanel,
    pushJoinedWidgetToEventsPanel,
    revealCurrentStepInPanel,
    showAllEventsWidget,
    showEventTitleAboveClosedDetail,
    showEventTitleAboveCurrentDetail,
    splitWidgets,
    toggleDetailPanel,
    toggleEventsPanel,
    toggleSettingsPanel,
  } = usePanelChoreography({
    captureResizeAnchor,
    detailHeight,
    detailOpen,
    settingsActiveTab,
    settingsCollapsed,
    setAllEventsInDetailPanel,
    setAllEventsWidgetHidden,
    setEventTitleSettings,
    setEventsPanelCollapsed,
    setJoinBannerRect,
    setRevealStepRequest,
    setSettingsCollapsed,
    setSettingsTabRequest,
    setWidgetsJoined,
    updateDetailOpen,
  });

  // Keep rendered balloons consistent with the current interaction mode.
  useEffect(() => {
    if (!balloonsEnabled) {
      setPinnedBitIndices([]);
    }
    if (!balloonHoverEnabled) {
      setHoveredBitInfo(null);
      lastHoveredIdxRef.current = -1;
    }
  }, [balloonsEnabled, balloonHoverEnabled]);

  // Close trace info popup when clicking outside
  useEffect(() => {
    if (!showTraceInfo) return;
    const handleClickOutside = (e) => {
      const clickedInside = traceInfoPopoverRef.current && traceInfoPopoverRef.current.contains(e.target);
      const clickedTitle = traceInfoToggleRef.current && traceInfoToggleRef.current.contains(e.target);
      // Clicks within the detail panel may legitimately open the raw log — don't close.
      const clickedDetailPanel = e.target && typeof e.target.closest === 'function' && e.target.closest('.detail-panel');
      if (!clickedInside && !clickedTitle && !clickedDetailPanel) setShowTraceInfo(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showTraceInfo]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Don't persist panel states that were forced closed during loading; only
  // save what the user intentionally chose after the intro animation finishes.
  const introCompleteRef = useRef(false);
  introCompleteRef.current = introPhase === 'visible';

  useEffect(() => {
    if (!introCompleteRef.current) return;
    writeViewPrefs({
      theme,
      layoutSettings,
      eventTitleSettings,
      gridOpacity,
      canvasColors,
      colorPreset,
      customColors,
      eventDurationMode,
      playSpeedPercent,
      delayBetweenEvents,
      delayBetweenRepeats,
      eventTimeTargets,
      allEventsWidgetHidden,
      widgetsJoined,
      allEventsInDetailPanel,
      autoAnimateOnSelect,
      eventsPanelCollapsed,
      settingsCollapsed,
      detailOpen,
    });
  }, [theme, layoutSettings, eventTitleSettings, gridOpacity, canvasColors, colorPreset, customColors, eventDurationMode, playSpeedPercent, delayBetweenEvents, delayBetweenRepeats, eventTimeTargets, allEventsWidgetHidden, widgetsJoined, allEventsInDetailPanel, autoAnimateOnSelect, eventsPanelCollapsed, settingsCollapsed, detailOpen]);

  const effectiveGroupBits = useMemo(() => (
    layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64)
  ), [layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup]);

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
    setGlUnavailable,
    updateGlDebugInfo,
    pendingRenderRafRef,
    createCamera,
    disposeCamera,
    setZoom,
    getMinimapDetailH,
    setIntroPhase,
    introTiltStartedRef,
    setLoadingOverlayPhase,
    setUiChromeVisible,
    setOverlayBarPct,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
    loadingOverlayPhase,
    loadCompleteRef,
    loadProgressRef,
  });

  // GL worker is intentionally kept alive as long as the component lives.
  // `OffscreenCanvas.transferControlToOffscreen()` is a one-shot, irreversible
  // operation on the HTMLCanvasElement — there is no way to attach a second
  // worker to the same canvas element.  Calling `dispose()` in a cleanup
  // effect is therefore harmful in two situations:
  //   1. React StrictMode (development): fires cleanup+setup twice on every
  //      mount.  If we dispose here the worker is killed before the second
  //      setup run, and that run can neither call transferControlToOffscreen()
  //      again nor reuse the dead worker — so GL rendering silently breaks.
  //   2. Trace reload: the init effect re-runs with new header props and must
  //      reuse the existing live worker rather than re-attaching.
  //
  // In normal use the Visualizer is mounted once for the entire session.
  // When the page is closed the browser terminates all workers automatically.
  // If the component ever truly unmounts (rare, e.g. Suspense boundary),
  // the worker becomes unreachable and is GC-eligible; the small leak is
  // acceptable given that scenario never occurs in practice.
  useEffect(() => {
    return () => {
      if (spacingPanAnimRef.current != null) {
        cancelAnimationFrame(spacingPanAnimRef.current);
        spacingPanAnimRef.current = null;
      }
    };
  }, []);

  // Keep r.minimapRightInset in sync with the settings panel state so the
  // minimap (now a position:fixed overlay) stays clear of the expanded panel.
  // Only offset when the full panel is visible (toolbar gear icon toggles it).
  // CSS: platform-mac=388px, default=328px (responsive 280px at ≤768px is
  // ignored here — minimap hides itself when zoomed out).
  // Also repaint the minimap immediately so the position updates without
  // waiting for the next user interaction or animation tick.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.minimapRightInset = settingsCollapsed ? 0 : (isMacPlatform ? 388 : 328);
    updateMinimapAvailability();
    if (showMinimap) r.renderMinimap(r.canvasWidth, r.canvas?.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [settingsCollapsed, isMacPlatform, showMinimap, getMinimapDetailH, updateMinimapAvailability]);

  // Keep GL diagnostics live while resizing/moving the window.
  useWindowResize(() => updateGlDebugInfo(true), [updateGlDebugInfo]);

  const spacingPanAnimRef = useRef(null);

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

  // Apply layout settings + theme to renderer
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    // Settings that affect the packed GL state texture (overlay flags, focus
    // range, etc.) are set below — mark dirty so the next render re-uploads.
    r._stateDirty = true;

    // ── Pre-capture the viewport-centre bit BEFORE applying new settings ──
    // The renderer still holds the OLD geometry here, so canvasToBitIndex gives
    // the bit that is actually visible at centre right now.
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
    r.debugAllCellOutlines = debugCalibrationMode;
    r.debugAllCellOutlineColor = theme === 'light' ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255,255,255,0.82)';
    r.colorPreset = colorPreset;
    r.storageModel = storageModel;
    r.wheelDefinition = wheelDefinition;
    // Storage model affects bit→number mapping; warm the prime cache for
    // the new model in the background.
    r.prefetchPrimeOverlay(() => {
      const rr = rendererRef.current;
      if (rr && rr.primeOverlay) rr.render();
    });
    r.cachelineSize = cachelineSize;
    r.heatMapEnabled = heatMapEnabled;
    r.cachelineAnnotation = cachelineAnnotation;
    r.primeOverlay = primeOverlayEnabled;
    if (primeOverlayEnabled) r.buildPrimeOverlay();
    r.rangeOverlay = rangeOverlayEnabled;
    r.rangeOverlayStart = rangeOverlayStart;
    r.rangeOverlayEnd = rangeOverlayEnd;
    r.multiplesOverlay = multiplesOverlayEnabled;
    r.multiplesOverlayPrime = Math.max(2, multiplesOverlayPrime || 2);
    r.transparentBackground = mode3D;
    r.gridOpacity = Math.max(0.12, Math.min(1, gridOpacity));
    r.canvasBackground = canvasColors ? (canvasColors[theme] || null) : null;
    r.customSetBit = customColors.setBit;
    r.customClearedBit = customColors.clearedBit;
    r.customUnchangedBit = customColors.unchangedBit;
    // Preserve centered bit while layout geometry changes.
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
        // The centre bit was captured before new spacings were applied.
        // Find where it now sits in the new geometry and snap the pan instantly.
        const nextPos = r.bitIndexToCanvas(preCenterBit);
        if (nextPos) {
          r.panX += preDesiredX - nextPos.x;
          r.panY += preDesiredY - nextPos.y;
        }
      } else if (centerAnchorBit >= 0 && desiredX != null && desiredY != null) {
        // Non-spacing structural change: instant snap (e.g. bit/byte layout mode switch).
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
    if (r.heatMapEnabled || (r.cachelineAnnotation && r.cachelineAnnotation !== 'none')) {
      r.rebuildHeatMap(stepsRef.current, currentStepRef.current);
    }
    r.render();
    updateMinimapAvailability();
    if (showMinimap) r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
  }, [theme, layoutSettings, showMinimap, colorPreset, customColors, canvasColors, storageModel, wheelDefinition, cachelineSize, heatMapEnabled, cachelineAnnotation, primeOverlayEnabled, rangeOverlayEnabled, rangeOverlayStart, rangeOverlayEnd, multiplesOverlayEnabled, multiplesOverlayPrime, gridOpacity, updateMinimapAvailability, debugCalibrationMode]);

  // Resize handler
  useEffect(() => {
    // Each panel toggle re-runs this effect and triggers up to three
    // refreshes (immediate, double-rAF, post-transition). The stashed
    // anchor must be applied exactly once — applying it on every
    // refresh re-shifts panX by the same delta and the grid drifts.
    const onResize = (consumeAnchor) => {
      let anchor = null;
      if (consumeAnchor && pendingResizeAnchorRef.current) {
        anchor = pendingResizeAnchorRef.current;
        pendingResizeAnchorRef.current = null;
      } else if (consumeAnchor) {
        // No pending toggle anchor → this is a window-resize path;
        // capture fresh so the centre stays pinned.
        anchor = captureViewportAnchor(0.5, 0.5);
      }
      refreshCanvasLayout(anchor);
    };

    clearScheduledLayoutRefresh();

    onResize(true);
    // In 3D mode the canvas is oversized (~3.1× — see `getCanvasTargetSize`)
    // and `refreshCanvasLayout` re-derives the frozen column count from
    // `canvasWidth` on every call. A 1-px difference between the immediate
    // and the double-rAF call (mid-CSS-transition) re-flows the grid, which
    // the user perceives as a canvas drift / tilt-jump on panel toggles. Skip
    // the mid-transition rAF refresh and rely on the post-transition timer
    // alone — it's well after the CSS transition has settled.
    const transitionRefreshTimer = setTimeout(() => onResize(false), 190);

    const winResize = () => onResize(true);
    window.addEventListener('resize', winResize);

    // Also refresh when devicePixelRatio changes (window moved between
    // displays with different DPRs, or browser zoom changed). Chrome/Edge
    // don't always fire 'resize' in this case, but the OffscreenCanvas DPR
    // must be updated so the worker re-renders at the correct resolution.
    let _dprMqResize = null;
    const _watchDprResize = () => {
      if (typeof window === 'undefined') return;
      const _mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const _onDpr = () => { onResize(true); _dprMqResize = null; _watchDprResize(); };
      _mq.addEventListener('change', _onDpr);
      _dprMqResize = { mq: _mq, cb: _onDpr };
    };
    _watchDprResize();

    return () => {
      window.removeEventListener('resize', winResize);
      clearTimeout(transitionRefreshTimer);
      clearScheduledLayoutRefresh();
      if (_dprMqResize) _dprMqResize.mq.removeEventListener('change', _dprMqResize.cb);
    };
  }, [panelWidth, showMinimap, detailOpen, detailHeight, refreshCanvasLayout, clearScheduledLayoutRefresh, captureViewportAnchor]);

  const { seekStepAnimation } = useSeekStepAnimation({
    seekGenRef,
    stopPlayback,
    stopSeqAnim,
    pausedStepAnimLoopRef,
    selectedAnimLoopRef,
    setSingleEventLoopActive,
    setAnimationReplayPaused,
    setDelayPhaseMsRef,
    rendererRef,
    currentStep,
    stepsRef,
    bitStateRef,
    selectedStepsRef,
    bitAnimationModeRef,
    animMode,
    animStyle,
    bitStateDirtyRef,
    bitsAtTimeRatioRef,
    getMinimapDetailH,
  });

  useBitStateCheckpoints({
    loadComplete,
    header,
    steps,
    bitStateCheckpointsRef,
  });

  const { goToStep, goToStepRef } = useGoToStep({
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
  });

  const {
    rawScrollToLine,
    onJumpToStep,
    onClearRawScrollToLine,
    onOpenRawLog,
  } = useRawLogNavigation({
    setShowTraceInfo,
    goToStep,
    revealCurrentStepInPanel,
    fetchRawSource,
    steps,
    currentStep,
  });

  const { waitForDelay } = usePausableDelay({ globalPausedRef, seqTimerRef });

  const {
    animateViewportTo,
    refitViewportToContent,
    navigateToBit,
  } = useViewportNavigation({
    rendererRef,
    containerRef,
    camera3DRef,
    viewportAnimRef,
    cancelViewportAnimation,
    applyViewportFit,
    setZoom,
    getMinimapDetailH,
  });

  useCameraStartupRefit({
    camera3DRef,
    cameraKey,
    setCamera3DContainerStyle,
    setCamera3DTransform,
    schedulePostLayoutRefresh,
    refitViewportToContent,
  });

  // Search state + handler — extracted to src/hooks/useSearchState.js (Pattern A).
  // Placed here so navigateToBit is in scope for the hook's dep arrays.
  const {
    searchQuery, setSearchQuery,
    searchResult,
    searchOpen, setSearchOpen,
    handleSearch,
  } = useSearchState({ rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH });

  const { runEffect } = useRunEffect({
    rendererRef,
    runEffectCancelRef,
    rippleRef,
    seekGenRef,
    getMinimapDetailH,
  });
  const {
    clampMs,
    getAnimationTimingPlan,
    getAnimationBitInterval,
    getCurrentLoopInterval,
    getFadeOutDuration,
    computeEventNormalDuration,
    computeEventDuration,
    bitsAtTimeRatio,
    timeRatioAtBitIndex,
    estimateAnimDuration,
    fadeOutCurrentHighlights,
  } = useAnimationTimingRuntime({
    bitAnimInterval,
    maskAnimInterval,
    currentAnimIntervalRef,
    currentMaskAnimIntervalRef,
    eventTimeTargetsRef,
    eventDurationModeRef,
    playSpeedPercentRef,
    computeEventDurationRef,
    bitsAtTimeRatioRef,
    timeRatioAtBitIndexRef,
    animMode,
    animStyle,
    rendererRef,
    rippleRef,
    getMinimapDetailH,
  });

  const { runMaskStampAnimation } = useMaskStampAnimation({
    rendererRef,
    rippleRef,
    seekGenRef,
    globalPausedRef,
    currentMaskAnimIntervalRef,
    stepScrubProgressRef,
    getAnimationTimingPlan,
    getMinimapDetailH,
    clampMs,
  });

  const { triggerAnimation } = useTriggerAnimation({
    seekGenRef,
    stopSeqAnimRef,
    stepScrubProgressRef,
    rendererRef,
    bitAnimationModeRef,
    pinnedBitIndices,
    effectiveGroupBits,
    computeEventDurationRef,
    getAnimationTimingPlan,
    getAnimationBitInterval,
    estimateAnimDuration,
    animBusyUntilRef,
    fadeOutCurrentHighlights,
    currentMaskAnimIntervalRef,
    maskAnimInterval,
    currentStep,
    bitStateRef,
    stepsRef,
    bitStateDirtyRef,
    setDelayPhaseMsRef,
    setStepAnimRunningRef,
    runMaskStampAnimation,
    waitForDelay,
    animMode,
    seqTimerRef,
    timeRatioAtBitIndexRef,
    bitsAtTimeRatioRef,
    globalPausedRef,
    getMinimapDetailH,
    animStyle,
    runEffect,
  });

  useEffect(() => {
    triggerAnimationRef.current = triggerAnimation;
  }, [triggerAnimation]);

  const { buildCombinedSelectionOverlay } = useSelectionOverlay({ steps });

  const { handleStepSelection, handleMultiStepSelect } = useStepSelectionHandlers({
    stopPlayback,
    setSingleEventWidgetRevealed,
    goToStep,
    globalPausedRef,
    setAnimationReplayPaused,
    setSelectedSteps,
  });

  useSelectionOrchestration({
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
  });

  // Three playback-loop effects delegated to usePlaybackLoop (Pattern A hook extraction).
  // The hook borrows all refs from this component so stopPlayback / seekStepAnimation
  // can keep clearing them directly without going through the hook.
  usePlaybackLoop({
    seekGenRef, globalPausedRef, animBusyUntilRef,
    triggerAnimationRef, goToStepRef,
    rendererRef,
    selectedAnimLoopRef, pausedStepAnimLoopRef,
    playTimeoutRef, playTimerRef,
    singleEventLoopActiveRef, isScrubbingTopRef, initialHighlightHoldRef,
    delayBetweenRepeatsRef, stepResumeStartIndexRef, stepResumeMaskProgressRef,
    setStepAnimRunningRef, stepAnimRunningRefForScheduler,
    playing, steps, currentStep, selectedSteps, animationReplayPaused, singleEventLoopActive,
    autoAnimateOnSelect, autoAnimateOnSelectRef,
    setPlaying, setCurrentStep,
  });

  // Auto-render mode (for CLI video export via puppeteer)
  useEffect(() => {
    if (autoRender && steps.length > 0 && !exporting) {
      const timer = setTimeout(() => exportVideo(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoRender, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Replay current step when animation mode or style changes so the active animation stops immediately.
  // Skip when the single-event replay loop OR the aggregate selected-steps loop is running: both hold
  // an `await triggerFn(...)` promise that resolves only when the animation finishes naturally.
  // Calling stopSeqAnim() here would cancel the RAF without resolving that promise, permanently
  // freezing the loop. Both loops naturally pick up the new animMode/animStyle on their next
  // iteration via triggerAnimationRef.current.
  //
  // Progress continuity: when a style/mode change fires, capture the current scrub progress so
  // the new animation starts from the same position rather than rewinding to 0.
  useEffect(() => {
    if (initialHighlightHoldRef.current) return;

    // Snapshot progress before doing anything so the refs we read below are
    // consistent whether we take the loop path or the direct-trigger path.
    const rawProgress = stepScrubProgressValueRef.current; // 0-100
    const startFraction = (rawProgress > 2 && rawProgress < 98) ? rawProgress / 100 : 0;

    if (singleEventLoopActiveRef.current || selectedAnimLoopRef.current) {
      // A replay loop is running. Seed the resume refs so the loop's very
      // next iteration (triggered by the seekGen bump below) picks up at
      // the same progress position instead of restarting from 0.
      if (startFraction > 0) {
        const step_data = stepsRef.current[currentStepRef.current];
        if (step_data && step_data.changedBits && step_data.changedBits.length > 0) {
          stepResumeStartIndexRef.current = Math.round(startFraction * (step_data.changedBits.length - 1));
        }
        stepResumeMaskProgressRef.current = startFraction;
      }
      // Bump seekGenRef so isStillLive() fails on the very next RAF tick,
      // resolving the Promise cleanly. The loop then restarts on its next
      // iteration and picks up the new animMode/animStyle from
      // triggerAnimationRef.current using the resume hints above.
      seekGenRef.current += 1;
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
      return;
    }
    stopSeqAnimRef.current?.();
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;
    const currentChanged = new Set(step.changedBits);
    const triggerOpts = { adaptiveDuration: !playing };
    if (startFraction > 0) {
      triggerOpts.startProgress = startFraction;
      triggerOpts.startIndex = Math.round(startFraction * (step.changedBits.length - 1));
    }
    triggerAnimation(currentChanged, triggerOpts);
  }, [animMode, animStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seqTimerRef.current) return;
    currentAnimIntervalRef.current = Math.max(0, bitAnimInterval || 20);
  }, [bitAnimInterval]);

  // Top-toolbar Play/Pause. Drives trace-wide playback (event-by-event with
  // no inter-event wait) and supports pause-in-flight + precise resume:
  //  - At end of trace: rewind and start playing.
  //  - Not playing, not paused: start playing.
  //  - Paused mid-flight: clear pause flag so animation resumes exactly where
  //    it stopped (mask virtualMs, sequential reveal idx, or waitForDelay).
  //  - Playing: set pause flag (in-flight loops freeze in place) and stop the
  //    scheduler. Refs are NOT torn down so resume can pick up.
  const { handlePlayPause, handleStepAnimToggle } = usePlaybackControls({
    setSingleEventWidgetRevealed,
    globalPausedRef,
    setAnimationReplayPaused,
    setSingleEventLoopActive,
    currentStep,
    stepsLength: steps.length,
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
  });

  // Banner play/pause: toggles the per-event sequential reveal.
  //  - Pause: halts the timeline AND pauses the trace-level autoplay so the
  //    top-bar Play/Pause button mirrors the paused state. Sets
  //    animationReplayPaused so the auto-replay loop stays parked.
  //  - Play: clears animationReplayPaused (which lets the existing replay
  //    loop run); the loop's first iteration uses stepResumeStartIndexRef so
  //    the reveal picks up at the user's slider position. If the slider is
  //    already at 100%, the play button restarts from the beginning instead.
  //    The loop itself handles the post-animation delay and auto-restart.
  const { doZoom, resetZoom } = useZoomControls({
    rendererRef,
    containerRef,
    setZoom,
    getMinimapDetailH,
    updateMinimapAvailability,
    applyViewportFit,
  });

  // Tracks whether the tilt button is in the "tilted" state (30°) or flat (0°).
  // Starts inactive until the intro reaches the 2D→3D transition completion.
  const [tiltActive, setTiltActive] = useState(false);
  const tiltButtonEnabled = introPhase === 'tilting' || introPhase === 'visible';

  useEffect(() => {
    if (introPhase === 'tilting' || introPhase === 'visible') {
      setTiltActive(true);
    } else {
      setTiltActive(false);
    }
  }, [introPhase]);

  // Tilt toggle: animates between 0° (flat) and 30° (tilted) in 3D mode.
  const { handleIntroTransitionEnd, toggleTilt, enableTiltAndResize } = useTiltControls({
    introTiltStartedRef,
    setIntroPhase,
    camera3DRef,
    schedulePostLayoutRefresh,
    tiltActive,
    setTiltActive,
    setCamera3DContainerStyle,
    refitViewportToContent,
  });

  // Cinematic fly-to on element click (in 3D mode)
  const flyToElement = useCallback((bitIdx) => {
    const cam = camera3DRef.current;
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!cam || !cam.enabled || !r || !el) return;

    const pos = r.bitIndexToCanvas(bitIdx);
    if (!pos) return;

    const metrics = getCanvasPlaneMetrics();
    if (!metrics) return;
    const { rect, planeW, planeH, planeOffsetX, planeOffsetY } = metrics;
    const elem = r.identifyElement(bitIdx);
    if (!elem) return;

    // Determine the best zoom level and element bounds for focus
    let targetZoom = r.zoom;
    let targetType = 'bit';

    // Choose focus level based on current zoom
    if (r.zoom < 2) {
      targetType = 'vector';
      targetZoom = Math.min(8, r.zoom * 4);
    } else if (r.zoom < 6) {
      targetType = 'byte';
      targetZoom = Math.min(12, r.zoom * 2);
    } else {
      targetType = 'bit';
      targetZoom = Math.min(20, r.zoom * 1.5);
    }

    const bounds = r.getElementBounds(targetType, targetType === 'bit' ? bitIdx :
      targetType === 'byte' ? elem.byteIdx :
      targetType === 'vector' ? elem.vectorIdx : elem.clIdx);

    const target = bounds ? { canvasX: bounds.cx, canvasY: bounds.cy } : { canvasX: pos.x, canvasY: pos.y };

    cam.flyTo(
      target,
      {
        containerW: planeW,
        containerH: planeH,
        centerX: planeOffsetX + rect.width / 2,
        centerY: planeOffsetY + rect.height / 2,
      },
      { panX: r.panX, panY: r.panY, zoom: r.zoom },
      targetZoom,
      1200
    );
  }, [getCanvasPlaneMetrics]);

  // ensureTiltCamera() is provided by use3DCamera; see src/hooks/use3DCamera.js.

  // Mouse pan & zoom on canvas (with 3D rotation support)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let gestureMode = 'none';
    let activePointerId = null;
    let startX = 0, startY = 0, panSX = 0, panSY = 0;
    let didDrag = false;
    let mouseRotateActive = false;
    let pointerDownCanvasCoords = null;

    const eventToCanvasCoords = (event, fallbackClientX = event.clientX, fallbackClientY = event.clientY) => {
      const metrics = getCanvasPlaneMetrics();
      if (!metrics) return { x: 0, y: 0 };
      if (metrics.viewportToCanvas) {
        const point = metrics.viewportToCanvas(fallbackClientX, fallbackClientY);
        if (point) return point;
      }
      const { rect, planeW, planeH, planeOffsetX, planeOffsetY } = metrics;
      const x = fallbackClientX - rect.left;
      const y = fallbackClientY - rect.top;
      const cam = camera3DRef.current;
      if (cam && cam.enabled) {
        return cam.screenToCanvas(x, y, planeW, planeH, planeOffsetX, planeOffsetY);
      }
      return { x: x + planeOffsetX, y: y + planeOffsetY };
    };

    const onContextMenu = (e) => {
      // Right-click / ctrl-click is reserved for tilt gestures on the canvas.
      if (e.button === 2 || e.ctrlKey || e.metaKey) e.preventDefault();
    };

    const onAuxClick = (e) => {
      const cam = camera3DRef.current;
      if (cam && cam.enabled && (e.button === 1 || e.button === 2)) e.preventDefault();
    };

    const isSecondaryRotateGesture = (event, cam) => {
      if (!cam) return false;
      if (event.button === 1 || event.button === 2 || event.which === 3) return true;
      if (event.button === 0 && (event.ctrlKey || event.metaKey)) return true;
      return (event.buttons & 2) === 2;
    };

    const isPointWithinRect = (clientX, clientY, rect) => (
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    );

    const hideHoverBalloon = () => {
      lastHoveredIdxRef.current = -1;
      setHoveredBitInfo(null);
    };

    const clearInteraction = () => {
      gestureMode = 'none';
      activePointerId = null;
      mouseRotateActive = false;
      pointerDownCanvasCoords = null;
      el.classList.remove('dragging');
    };

    const onPointerDown = (e) => {
      if (mouseRotateActive) return;
      const r = rendererRef.current;
      if (!r) return;
      // Don't capture pointer for interactive overlays inside the canvas area.
      // Without this, setPointerCapture() swallows the pointerup so buttons
      // in .step-focus-banner and .bit-history-panel never fire click events.
      if (e.target.closest('.step-focus-banner, .bit-history-panel, .detail-inspector-overlay')) return;
      const rect = el.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const canvasW = rect.width;
      const canvasH = rect.height;

      const cam = camera3DRef.current;
      if (isSecondaryRotateGesture(e, cam)) {
        enableTiltAndResize();
        // Cancel any in-flight camera animation (e.g. the startup intro tilt)
        // so the drag starts from whatever angle the camera is at right now.
        const liveCam = camera3DRef.current;
        if (liveCam) liveCam.cancelAllAnimations();
        e.preventDefault();
        e.stopPropagation();
        hideHoverBalloon();
        gestureMode = 'rotate';
        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        didDrag = false;
        if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        return;
      }

      // Check minimap hit first.  The minimap is drawn on a position:fixed
      // canvas covering the full viewport, so _minimapRect.mx/my are in
      // viewport (clientX/Y) coordinates — not container-relative coords.
      const hit = r.minimapHitTest(e.clientX, e.clientY);
      if (hit) {
        hideHoverBalloon();
        gestureMode = 'minimap';
        activePointerId = e.pointerId;
        didDrag = true;
        if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        r.panX = hit.panX;
        r.panY = hit.panY;
        r.render();
        updateMinimapAvailability();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        el.classList.add('dragging');
        return;
      }

      hideHoverBalloon();
      gestureMode = 'pan';
      activePointerId = e.pointerId;
      didDrag = false;
      pointerDownCanvasCoords = eventToCanvasCoords(e);
      startX = e.clientX; startY = e.clientY;
      if (r) { panSX = r.panX; panSY = r.panY; }
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
    };

    const onPointerMove = (e) => {
      if (mouseRotateActive) return;
      const r = rendererRef.current;
      if (!r) return;
      const cam = camera3DRef.current;

      if (gestureMode === 'none' && cam) {
        const secondaryPressed = ((e.buttons & 2) === 2) || (((e.buttons & 1) === 1) && (e.ctrlKey || e.metaKey));
        if (secondaryPressed) {
          enableTiltAndResize();
          const liveCam2 = camera3DRef.current;
          if (liveCam2) liveCam2.cancelAllAnimations();
          gestureMode = 'rotate';
          activePointerId = e.pointerId;
          startX = e.clientX;
          startY = e.clientY;
          didDrag = false;
          if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
          el.classList.add('dragging');
          return;
        }
      }

      if (activePointerId != null && e.pointerId !== activePointerId) return;

      if (gestureMode === 'rotate' && cam && cam.enabled) {
        hideHoverBalloon();
        didDrag = true;
        const next = applyRotate({
          camera: cam,
          renderer: r,
          event: e,
          startX,
          startY,
          getMinimapDetailH,
          scheduleBalloonRelayout,
        });
        startX = next.startX;
        startY = next.startY;
        return;
      }

      if (gestureMode === 'minimap') {
        hideHoverBalloon();
        const rect = el.getBoundingClientRect();
        // Minimap is on a position:fixed overlay — use viewport coords.
        const hit = r.minimapHitTest(e.clientX, e.clientY);
        if (hit) {
          r.panX = hit.panX;
          r.panY = hit.panY;
          r.render();
          updateMinimapAvailability();
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
          scheduleBalloonRelayout();
        }
        return;
      }

      if (gestureMode === 'pan') {
        hideHoverBalloon();
        didDrag = true;
        applyPan({
          renderer: r,
          event: e,
          startX,
          startY,
          panStartX: panSX,
          panStartY: panSY,
          getMinimapDetailH,
          updateMinimapAvailability,
          scheduleBalloonRelayout,
        });
        return;
      }

      // Suppress the hover popup when the cursor is over an overlay (toolbar,
      // settings/events/details panels, timing panel, minimap, event-title banner,
      // trace-info popover). The pointermove listener is bound to window so it
      // fires everywhere; we probe the element under the cursor to gate the popup.
      if (!balloonsEnabled || !balloonHoverEnabled) {
        if (lastHoveredIdxRef.current !== -1) {
          lastHoveredIdxRef.current = -1;
          setHoveredBitInfo(null);
        }
        return;
      }

      const overOverlay = (() => {
        if (typeof document === 'undefined') return false;
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        if (!hit) return false;
        return !!hit.closest(
          '.toolbar, .events-panel, .settings-sidebar, .detail-panel, .timing-panel, ' +
          '.step-focus-banner, .events-panel-floating-title, .joined-events-widget, ' +
          '.minimap-overlay-canvas, .trace-info-popover, .debug-tools-panel, ' +
          '.bit-history-panel'
        );
      })();
      if (overOverlay) {
        if (lastHoveredIdxRef.current !== -1) {
          lastHoveredIdxRef.current = -1;
          setHoveredBitInfo(null);
        }
        return;
      }

      const coords = eventToCanvasCoords(e);
      const idx = r.canvasToBitIndex(coords.x, coords.y);
      el.style.cursor = 'crosshair';
      if (idx !== lastHoveredIdxRef.current) {
        lastHoveredIdxRef.current = idx;
        if (idx >= 0) {
          setHoveredBitInfo(computeBitInfo(idx));
        } else {
          setHoveredBitInfo(null);
        }
      }
    };

    const onPointerEnd = (e) => {
      if (mouseRotateActive) return;
      if (activePointerId != null && e.pointerId !== activePointerId) return;
      const rect = el.getBoundingClientRect();
      const releasedOverCanvas = isPointWithinRect(e.clientX, e.clientY, rect);
      const r = rendererRef.current;

      if (gestureMode === 'rotate') {
        clearInteraction();
        // Resize the canvas to match the final tilt angle. During the gesture
        // refreshCanvasLayout is no longer called every frame (getCanvasTargetSize
        // now reads from the camera ref directly, decoupling it from the
        // camera3DTransform state that changes each pointer-move).
        schedulePostLayoutRefresh(null);
        return;
      }

      if (gestureMode === 'none' && !releasedOverCanvas) {
        clearInteraction();
        return;
      }

      if (!didDrag && gestureMode !== 'minimap' && r) {
        // Ignore "clicks" that originate from interactive overlays sitting on
        // top of the canvas (event-title widget, bit-history popups, detail
        // inspector). Pointerdown on those overlays never reaches the canvas
        // listener, but pointerup is bound to window and would otherwise
        // toggle a pinned bit beneath the overlay — creating accidental
        // popups when the user is interacting with the widget itself.
        const t = e.target;
        if (t && typeof t.closest === 'function' && t.closest(
          '.step-focus-banner, .bit-history-panel, .detail-inspector-overlay, .toolbar, .events-panel, .settings-sidebar, .detail-panel, .timing-panel, .trace-info-popover, .debug-tools-panel'
        )) {
          clearInteraction();
          return;
        }
        if (!balloonsEnabled || !balloonClickEnabled) {
          clearInteraction();
          return;
        }
        const coords = pointerDownCanvasCoords || eventToCanvasCoords(e);
        const idx = r.canvasToBitIndex(coords.x, coords.y);
        if (idx >= 0) {
          const cam = camera3DRef.current;
          if (cam && cam.enabled) {
            flyToElement(idx);
          }
          if ((e.detail || 0) >= 2) {
            setPinnedBitIndices([idx]);
          } else {
            setPinnedBitIndices((prev) => (
              prev.includes(idx) ? prev.filter((value) => value !== idx) : [...prev, idx]
            ));
          }
        } else {
          setPinnedBitIndices([]);
        }
      }

      clearInteraction();
    };

    const onWheel = (e) => {
      e.preventDefault();
      const r = rendererRef.current;
      if (!r) return;
      const coords = eventToCanvasCoords(e);
      applyWheel({
        renderer: r,
        event: e,
        cursorX: coords.x,
        cursorY: coords.y,
        setZoom,
        getMinimapDetailH,
        updateMinimapAvailability,
        scheduleBalloonRelayout,
      });
      const pausedProgress = Math.max(0, Math.min(100, Number(stepScrubProgressValueRef.current) || 0));
      if (globalPausedRef.current && pausedProgress > 0 && pausedProgress < 100) {
        // Keep paused in-flight animation overlays visible after zoom changes.
        seekStepAnimation(pausedProgress / 100);
      }
      setBalloonLiveLayout(true);
      if (balloonLiveLayoutTimerRef.current != null) clearTimeout(balloonLiveLayoutTimerRef.current);
      scheduleBalloonRelayout(true);
      balloonLiveLayoutTimerRef.current = setTimeout(() => {
        balloonLiveLayoutTimerRef.current = null;
        setBalloonLiveLayout(false);
        scheduleBalloonRelayout(true);
      }, 140);
    };

    const onMouseDown = (e) => {
      const secondary = e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey));
      if (!secondary) return;
      enableTiltAndResize();
      const liveCam3 = camera3DRef.current;
      if (liveCam3) liveCam3.cancelAllAnimations();
      e.preventDefault();
      e.stopPropagation();
      hideHoverBalloon();
      mouseRotateActive = true;
      gestureMode = 'rotate';
      activePointerId = null;
      startX = e.clientX;
      startY = e.clientY;
      didDrag = false;
      el.classList.add('dragging');
    };

    const onMouseMove = (e) => {
      if (!mouseRotateActive) return;
      const cam = camera3DRef.current;
      const r = rendererRef.current;
      if (!cam || !cam.enabled || !r) {
        clearInteraction();
        return;
      }
      const stillSecondary = (e.buttons & 2) === 2 || ((e.buttons & 1) === 1 && (e.ctrlKey || e.metaKey));
      if (!stillSecondary) {
        clearInteraction();
        return;
      }
      didDrag = true;
      const next = applyRotate({
        camera: cam,
        renderer: r,
        event: e,
        startX,
        startY,
        getMinimapDetailH,
        updateMinimapAvailability,
        scheduleBalloonRelayout,
      });
      startX = next.startX;
      startY = next.startY;
    };

    const onMouseUp = () => {
      if (!mouseRotateActive) return;
      clearInteraction();
      schedulePostLayoutRefresh(null);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('contextmenu', onContextMenu);
    el.addEventListener('auxclick', onAuxClick);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    const onMouseLeave = () => {
      if (gestureMode === 'none') {
        lastHoveredIdxRef.current = -1;
        setHoveredBitInfo(null);
      }
      el.style.cursor = 'crosshair';
    };
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('contextmenu', onContextMenu);
      el.removeEventListener('auxclick', onAuxClick);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [computeBitInfo, flyToElement, getCanvasPlaneMetrics, getMinimapDetailH, updateMinimapAvailability, enableTiltAndResize, scheduleBalloonRelayout, schedulePostLayoutRefresh, balloonsEnabled, balloonClickEnabled, balloonHoverEnabled, seekStepAnimation]);

  // Keyboard shortcuts — see src/hooks/useKeyboardShortcuts.js for the full key map.
  useKeyboardShortcuts({
    currentStep,
    stepCount: steps.length,
    goToStep,
    handlePlayPause,
    doZoom,
    resetZoom,
    setTheme,
    toggleDetailPanel,
    toggleDebugToolsPanel: useCallback(() => setDebugToolsOpen((v) => !v), []),
    camera3DRef,
    toggleShortcutsOverlay: useCallback(() => setShowShortcutsHelp((v) => !v), []),
  });

  // PNG snapshot + WebM video export. See src/hooks/useTraceExport.js.
  const { exporting, exportProgress, exportError, exportPng, exportVideo, cancelExport } = useTraceExport({
    rendererRef,
    steps,
    bitCount: header.bitCount,
    currentStep,
    goToStep,
    autoRender,
  });

  // Search: navigate to a specific bit, byte, uint64, vector, or number.
  // State and handler live in useSearchState (src/hooks/useSearchState.js),
  // wired above after navigateToBit.

  const currentStepData = useMemo(() => {
    if (selectedSteps.size <= 1) return steps[currentStep] || null;

    const indices = Array.from(selectedSteps)
      .filter((idx) => idx >= 0 && idx < steps.length)
      .sort((a, b) => a - b);
    if (indices.length === 0) return steps[currentStep] || null;

    const union = new Set();
    let prime = null;
    let operation = null;
    let minStart = null;
    let maxStop = null;
    let factorStep = null;
    let annotation = '';
    const overlay = buildCombinedSelectionOverlay(selectedSteps);

    for (let i = 0; i < indices.length; i++) {
      const s = steps[indices[i]];
      if (!s) continue;
      if (prime == null && s.prime != null) prime = s.prime;
      if (!operation && s.operation) operation = s.operation;
      if (factorStep == null && s.factorStep != null) factorStep = s.factorStep;
      if (s.start != null) minStart = minStart == null ? s.start : Math.min(minStart, s.start);
      if (s.stop != null) maxStop = maxStop == null ? s.stop : Math.max(maxStop, s.stop);
      for (let j = 0; j < s.changedBits.length; j++) union.add(s.changedBits[j]);
    }

    annotation = `Aggregated ${indices.length} selected events (${indices[0]}-${indices[indices.length - 1]})`;

    const changed = new Uint32Array(Array.from(union).sort((a, b) => a - b));
    return {
      stepId: currentStep,
      annotation,
      operation: operation ? `${operation} (aggregate)` : 'Aggregate',
      prime,
      start: minStart,
      stop: maxStop,
      factorStep,
      changedBits: changed,
      numChanged: changed.length,
      maskWordBits: overlay.maskMetadata?.wordBits ?? null,
      maskWriteOrderWords: overlay.maskMetadata?.targetWords ?? new Uint32Array(0),
      maskWriteOrderSlots: overlay.maskMetadata?.targetSlots ?? new Uint8Array(0),
      maskSlotBits: overlay.maskMetadata?.slotBits ?? [],
    };
  }, [steps, currentStep, selectedSteps, buildCombinedSelectionOverlay]);

  const currentStepBanner = useMemo(() => {
    const s = currentStepData;
    if (!s) {
      return {
        line1: `Event ${currentStep} | No event selected`,
        annotationLines: [],
        bitsChanged: 0,
        title: 'No event selected',
      };
    }

    const functionName = s.operation || 'Unknown';
    const eventId = s.stepId ?? currentStep;
    const primePart = s.prime != null ? ` | Prime ${s.prime}` : '';
    const line1 = `Event ${eventId} | ${functionName}${primePart}`;

    // Build annotation lines: first line is metadata, then each line of s.annotation.
    const annotationLines = [];
    const metaParts = [];
    if (s.factorStep != null) metaParts.push(`Step size ${s.factorStep}`);
    if (s.start != null && s.stop != null) metaParts.push(`Range ${s.start}–${s.stop}`);
    if (metaParts.length > 0) annotationLines.push(metaParts.join(' | '));
    if (s.annotation) {
      const annLines = s.annotation.split('\n').filter(Boolean);
      annotationLines.push(...annLines);
    }

    const bitsChanged = Number(s.numChanged) || 0;

    return {
      line1,
      annotationLines,
      bitsChanged,
      title: [line1, ...annotationLines, bitsChanged > 0 ? `+${bitsChanged} bits changed` : ''].filter(Boolean).join(' | '),
    };
  }, [currentStep, currentStepData]);

  // Compact summary list for the surrounding events (-2, -1, +1, +2) shown in
  // the event-title widget so the user can see the local context of the
  // current event without having to open the full events panel.
  const surroundingEvents = useMemo(() => {
    const out = { prev: [], next: [] };
    if (!Array.isArray(steps) || steps.length === 0) return out;
    const summarize = (idx) => {
      const s = steps[idx];
      if (!s) return null;
      const eventId = s.stepId ?? idx;
      const op = s.operation || 'Unknown';
      const bits = Number(s.numChanged) || 0;
      const parts = [];
      if (s.prime != null) parts.push(`p${s.prime}`);
      if (s.factorStep != null) parts.push(`s${s.factorStep}`);
      if (s.start != null && s.stop != null) parts.push(`${s.start}-${s.stop}`);
      const meta = parts.join(' ');
      const elapsedNs = Number(s.elapsedNs) || 0;
      const elapsedLabel = elapsedNs > 0
        ? (elapsedNs >= 1e6 ? `${(elapsedNs / 1e6).toFixed(2)}ms`
          : elapsedNs >= 1e3 ? `${(elapsedNs / 1e3).toFixed(1)}µs`
          : `${elapsedNs}ns`)
        : '';
      return { idx, eventId, op, meta, bits, elapsedLabel };
    };
    for (let off = -2; off <= -1; off++) {
      const e = summarize(currentStep + off);
      if (e) out.prev.push(e);
    }
    for (let off = 1; off <= 2; off++) {
      const e = summarize(currentStep + off);
      if (e) out.next.push(e);
    }
    return out;
  }, [steps, currentStep]);

  const eventTitleStyle = useMemo(() => {
    const scale = Math.max(0.7, Math.min(1.6, (eventTitleSettings.scale || 100) / 100));
    const ox = Number.isFinite(eventTitleSettings.dragOffsetX) ? eventTitleSettings.dragOffsetX : 0;
    const oy = Number.isFinite(eventTitleSettings.dragOffsetY) ? eventTitleSettings.dragOffsetY : 0;
    return {
      fontSize: `${14 * scale}px`,
      padding: `${Math.round(10 * scale)}px ${Math.round(14 * scale)}px`,
      // Width stays stable across events so the sliders don't jump around.
      width: `${Math.round(420 * scale)}px`,
      maxWidth: `min(${Math.round(520 * scale)}px, calc(100% - 160px))`,
      minHeight: `${Math.round(150 * scale)}px`,
      // Anchored by bottom-left (see CSS .step-focus-banner: bottom/left fixed).
      // Drag offset nudges from the anchored origin.
      transform: `translate(${ox}px, ${oy}px)`,
    };
  }, [eventTitleSettings]);

  const renderCanvasStyle = useMemo(() => (
    // Unified: canvas is ALWAYS the oversized centered plane,
    // regardless of mode3D. mode3D only controls whether the
    // camera is tilted; the canvas placement is identical. This
    // is what eliminates the "2D in a different place than 3D"
    // jump on toggle and the placement drift on panel toggles.
    //
    // Applied to .canvas-transform-wrapper (not to canvas elements directly)
    // so that the 3D CSS transform lives on a div, not on the drawing canvases.
    // Safari creates one GPU compositing layer per element that has a 3D
    // transform; when a canvas in that layer draws, Safari briefly exposes a
    // black backing store during the GPU texture upload → visible black flash.
    // With a single wrapper div the three canvases share one GPU layer and
    // draw updates are atomic with respect to the compositor.
    //
    // left/top use pixel offsets from `canvasAnchorPx` (computed so
    // that the canvas center sits at the VIEWPORT center, not the
    // container center). When a side panel toggles the container
    // reshapes; without viewport anchoring the canvas's `50%/50%`
    // moves with the container and the user sees the content slide.
    {
      position: 'absolute',
      left: canvasAnchorPx ? `${canvasAnchorPx.left}px` : '50%',
      top: canvasAnchorPx ? `${canvasAnchorPx.top}px` : '50%',
      // Only the centering translate lives here. The 3D rotation (rotateX/Y)
      // is applied directly to the single GL canvas element so that only one
      // GPU compositing layer is created — avoids Safari black-flicker that
      // occurred when multiple canvases shared the same rotated wrapper layer.
      // preserve-3d is needed so the canvas's own rotation is interpreted in
      // the parent's 3D context rather than being flattened to 2D.
      transform: introPhase === 'hidden'
        ? 'translate(-50%, -50%) scale(0.02)'
        : 'translate(-50%, -50%)',
      transition: introPhase === 'scaling'
        ? 'transform 3800ms cubic-bezier(0.22, 1, 0.36, 1), opacity 2000ms ease-out'
        : undefined,
      opacity: introPhase === 'hidden' ? 0 : 1,
      transformStyle: 'preserve-3d',
    }
  ), [canvasAnchorPx, introPhase]);

  // Merge a px-based `perspectiveOrigin` into the container style so the
  // 3D vanishing point sits at the VIEWPORT center, matching where the
  // canvas itself is anchored. The Camera3D default is `50% 50%` of the
  // container, but the container reshapes when side panels toggle, so
  // its center moves in viewport space \u2014 producing a large projected
  // offset (especially noticeable with the events panel on the left,
  // which shifts the container's left edge by hundreds of px). Pinning
  // perspective-origin to the canvas anchor keeps the projection stable.
  const mergedCamera3DContainerStyle = useMemo(() => {
    // Derive the effective canvas background: user override (if any) or theme default.
    // Themes.dark.BACKGROUND = [26,26,26], Themes.light.BACKGROUND = [245,245,245].
    const THEME_BG = { dark: [26, 26, 26], light: [245, 245, 245] };
    const customBg = canvasColors && canvasColors[theme];
    const bg = customBg || THEME_BG[theme] || THEME_BG.dark;
    const bgCss = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    const base = !canvasAnchorPx ? camera3DContainerStyle : {
      ...camera3DContainerStyle,
      perspectiveOrigin: `${canvasAnchorPx.left}px ${canvasAnchorPx.top}px`,
    };
    return { ...base, background: bgCss };
  }, [camera3DContainerStyle, canvasAnchorPx, canvasColors, theme]);

  const detailInspectorRows = useMemo(() => {
    if (!currentStepData || !currentStepData.changedBits || currentStepData.changedBits.length === 0) return [];
    const bits = Array.from(currentStepData.changedBits).sort((a, b) => a - b);
    const groupBits = layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64);
    return bits.map((bit) => {
      const wheelBit = (storageModel || 'half') === 'wheel' ? describeWheelBit(bit, wheelDefinition) : null;
      const mappedNumber = wheelBit ? wheelBit.number : bitToNumber(bit, storageModel || 'half', wheelDefinition);
      const byte = Math.floor(bit / 8);
      const uint64 = Math.floor(bit / 64);
      const group = Math.floor(bit / groupBits);
      return {
        bit,
        number: mappedNumber == null ? 'unmapped' : mappedNumber,
        wheelPeriod: wheelBit?.period ?? null,
        relativeBit: wheelBit?.relativeBit ?? null,
        relativeNumber: wheelBit?.relativeNumber ?? null,
        byte,
        uint64,
        group,
        cacheline: Math.floor(bit / Math.max(8, cachelineSize * 8)),
      };
    });
  }, [currentStepData, layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup, storageModel, wheelDefinition, cachelineSize]);

  const filteredDetailInspectorRows = useMemo(() => {
    const q = detailInspectorQuery.trim().toLowerCase();
    if (!q) return detailInspectorRows;
    return detailInspectorRows.filter((row) => {
      const haystack = `${row.bit} ${row.number} ${row.wheelPeriod ?? ''} ${row.relativeBit ?? ''} ${row.relativeNumber ?? ''} ${row.byte} ${row.uint64} ${row.group} ${row.cacheline}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [detailInspectorRows, detailInspectorQuery]);

  const { openDetailInspector } = useDetailInspectorActions({
    setDetailInspectorMode,
    setDetailInspectorQuery,
    setDetailInspectorOpen,
  });

  const { getBitBalloonGeometry, getVisibleBalloonStyles } = useBalloonGeometry({
    rendererRef,
    containerRef,
    getCanvasPlaneMetrics,
    camera3DRef,
    eventsPanelCollapsed,
    panelWidth,
    settingsCollapsed,
    isMacPlatform,
    detailOpen,
    detailHeight,
  });

  const effectiveTitle = traceTitle;
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = effectiveTitle;
  }, [effectiveTitle]);

  // Reset the step-scrub slider whenever the user moves to a different event.
  useEffect(() => { setStepScrubProgress(0); }, [currentStep]);
  // Auto-pick the animation mode for the current event: prefer 'mask' when the
  // event has mask write-order metadata, otherwise fall back to 'bit'. The user
  // can still toggle this within the event.
  // Skip when an aggregate (multi-step) selection is active — the merged mask
  // state is already set up in the renderer and we must not clobber the mode.
  useEffect(() => {
    if (selectedSteps.size > 1) return;
    const step = stepsRef.current[currentStep];
    const hasMask = !!(step && step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0
      && Number.isFinite(step.maskWordBits) && step.maskWordBits > 0);
    setBitAnimationMode(hasMask ? 'mask' : 'bit');
  }, [currentStep, selectedSteps]);

  // Sliders for event timeline and animation speed. Rendered inside the
  // step-focus-banner when it's visible; moved into the detail panel when the
  // banner is hidden so the controls remain accessible.
  // Two separate slider instances: one for the floating banner (progress on
  // the far right) and one for the detail panel (progress inline to the right
  // of the timeline slider, i.e. docked=true).
  const stepAnimSlidersContent = (
    <StepAnimSliders
      currentStepData={currentStepData}
      bitAnimationMode={bitAnimationMode}
      setBitAnimationMode={setBitAnimationMode}
      bitAnimationModeRef={bitAnimationModeRef}
      stopSeqAnim={stopSeqAnim}
      seekStepAnimation={seekStepAnimation}
      stepScrubProgress={stepScrubProgress}
      setStepScrubProgress={setStepScrubProgress}
      handleStepAnimToggle={handleStepAnimToggle}
      stepAnimRunning={stepAnimRunning}
      singleEventLoopActive={singleEventLoopActive}
      animationReplayPaused={animationReplayPaused}
      delayPhaseMs={delayPhaseMs}
      playing={playing}
      exporting={exporting}
      onOpenAnimationSettings={openAnimationSettings}
      docked={false}
    />
  );
  const stepAnimSlidersDockedContent = (
    <StepAnimSliders
      currentStepData={currentStepData}
      bitAnimationMode={bitAnimationMode}
      setBitAnimationMode={setBitAnimationMode}
      bitAnimationModeRef={bitAnimationModeRef}
      stopSeqAnim={stopSeqAnim}
      seekStepAnimation={seekStepAnimation}
      stepScrubProgress={stepScrubProgress}
      setStepScrubProgress={setStepScrubProgress}
      handleStepAnimToggle={handleStepAnimToggle}
      stepAnimRunning={stepAnimRunning}
      singleEventLoopActive={singleEventLoopActive}
      animationReplayPaused={animationReplayPaused}
      delayPhaseMs={delayPhaseMs}
      playing={playing}
      exporting={exporting}
      onOpenAnimationSettings={openAnimationSettings}
      onDragOutFromDock={({ x, y }) => {
        setEventTitleSettings((prev) => ({ ...prev, visible: true }));
        setPendingBannerDragStart({ x, y, token: Date.now() });
      }}
      docked={true}
    />
  );

  const allEventsTransportContent = allEventsInDetailPanel ? (
    <AllEventsTransport
      currentStep={currentStep}
      steps={steps}
      playing={playing}
      handlePlayPause={handlePlayPause}
      goToStep={goToStep}
      exporting={!!exporting}
      isScrubbingTopRef={isScrubbingTopRef}
      playSpeedPercent={playSpeedPercent}
      setPlaySpeedPercent={setPlaySpeedPercent}
      onDismiss={() => {
        setAllEventsInDetailPanel(false);
        setAllEventsWidgetHidden(false);
      }}
      onUndockByDrag={() => {
        setAllEventsInDetailPanel(false);
        setAllEventsWidgetHidden(false);
      }}
    />
  ) : null;

  return (
    <div className={`visualizer${isMacPlatform ? ' platform-mac' : ''}${isWindowsPlatform ? ' platform-windows' : ''}${isElectron ? ' platform-electron' : ' platform-browser'}`}>
      <Toolbar
        isMacPlatform={isMacPlatform}
        isWindowsPlatform={isWindowsPlatform}
        isElectron={isElectron}
        effectiveTitle={effectiveTitle}
        showTraceInfo={showTraceInfo}
        setShowTraceInfo={setShowTraceInfo}
        traceInfoToggleRef={traceInfoToggleRef}
        traceInfoPopoverRef={traceInfoPopoverRef}
        storageModel={storageModel}
        setStorageModel={setStorageModel}
        header={header}
        traceInfoSections={traceInfoSections}
        onFetchRawSource={fetchRawSource}
        lineToStep={lineToStep}
        onJumpToStep={onJumpToStep}
        rawScrollToLine={rawScrollToLine}
        onClearRawScrollToLine={onClearRawScrollToLine}
        currentStepSourceLine={stepToLine[currentStep]}
        onClose={onClose}
        steps={steps}
        currentStep={currentStep}
        goToStep={goToStep}
        playing={playing}
        handlePlayPause={handlePlayPause}
        exporting={exporting}
        setPlaySpeedPercent={setPlaySpeedPercent}
        isScrubbingTopRef={isScrubbingTopRef}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResult={searchResult}
        handleSearch={handleSearch}
        zoom={zoom}
        doZoom={doZoom}
        resetZoom={resetZoom}
        tiltActive={tiltActive}
        tiltButtonEnabled={tiltButtonEnabled}
        toggleTilt={toggleTilt}
        heatMapEnabled={heatMapEnabled}
        setHeatMapEnabled={setHeatMapEnabled}
        primeOverlayEnabled={primeOverlayEnabled}
        setPrimeOverlayEnabled={setPrimeOverlayEnabled}
        debugToolsOpen={debugToolsOpen}
        setDebugToolsOpen={setDebugToolsOpen}
        timingPanelOpen={timingPanelOpen}
        setTimingPanelOpen={setTimingPanelOpen}
        exportPng={exportPng}
        exportVideo={exportVideo}
        cancelExport={cancelExport}
        exportProgress={exportProgress}
        theme={theme}
        setTheme={setTheme}
        controlsHidden={controlsHidden}
        allEventsWidgetHidden={allEventsWidgetHidden}
        showAllEventsWidget={showAllEventsWidget}
        eventsPanelCollapsed={eventsPanelCollapsed}
        toggleEventsPanel={toggleEventsPanel}
        detailOpen={detailOpen}
        toggleDetailPanel={toggleDetailPanel}
        settingsCollapsed={settingsCollapsed}
        toggleSettingsPanel={toggleSettingsPanel}
      />

      {exporting && <ExportProgress progress={exportProgress} />}
      <StatusBanners exportError={exportError} glUnavailable={glUnavailable} />

      {/* Main content — panels float (position:absolute) within this div, which sits
           below the toolbar. overflow:visible so collapsed toggle buttons are not
           clipped; canvas-area inside already clips the canvas with its own
           overflow:hidden. */}
      <div
        className={`main-content${mode3D ? ' mode-3d' : ''}${uiChromeVisible ? ' ui-chrome-visible' : ' ui-chrome-hidden'}`}
        style={{ '--events-panel-width': `${eventsPanelCollapsed ? 0 : panelWidth}px` }}
      >
        {/* Loading overlay — centered in the canvas area while streaming */}
        <CanvasLoadingOverlay
          loadingOverlayPhase={loadingOverlayPhase}
          steps={steps}
          overlayBarPct={overlayBarPct}
        />
        <EventsPanel
          steps={steps}
          currentStep={currentStep}
          selectedSteps={selectedSteps}
          onStepClick={handleStepSelection}
          onMultiStepSelect={handleMultiStepSelect}
          onUserScroll={stopPlayback}
          width={panelWidth}
          onWidthChange={setPanelWidth}
          panelCollapsed={eventsPanelCollapsed}
          onToggleCollapse={toggleEventsPanel}
          allEventsWidgetHidden={allEventsWidgetHidden || widgetsJoined}
          onExpandPanelFromWidget={expandEventsPanelFromWidget}
          onDockWidgetToTopBar={dockEventsWidgetToTopBar}
          onDockWidgetToDetailPanel={dockEventsWidgetToDetailPanel}
          onJoinWidgets={joinWidgets}
          externalOpFilter={timingFocusOp}
          onExternalOpFilterConsumed={() => setTimingFocusOp('')}
          revealStepRequest={revealStepRequest}
          goToStep={goToStep}
          playing={playing}
          handlePlayPause={handlePlayPause}
          exporting={!!exporting}
          isScrubbingTopRef={isScrubbingTopRef}
          playSpeedPercent={playSpeedPercent}
          setPlaySpeedPercent={setPlaySpeedPercent}
          eventTitleVisible={eventTitleSettings.visible && !widgetsJoined}
          onShowEventTitle={showEventTitleAboveCurrentDetail}
        />
        <CanvasStage
          mode3D={mode3D}
          containerRef={containerRef}
          glCanvasRef={glCanvasRef}
          glyphCanvasRef={glyphCanvasRef}
          wrapperCanvasRef={wrapperCanvasRef}
          glActive={true}
          hideGlCanvas={false}
          camera3DContainerStyle={mergedCamera3DContainerStyle}
          renderCanvasStyle={renderCanvasStyle}
          eventTitleSettings={eventTitleSettings}
          setEventTitleSettings={setEventTitleSettings}
          eventTitleStyle={eventTitleStyle}
          currentStepBanner={currentStepBanner}
          surroundingEvents={surroundingEvents}
          currentStepData={currentStepData}
          currentStep={currentStep}
          goToStep={goToStep}
          revealCurrentStepInPanel={revealCurrentStepInPanel}
          eventsPanelCollapsed={eventsPanelCollapsed}
          setEventsPanelCollapsed={setEventsPanelCollapsed}
          stepAnimSlidersContent={stepAnimSlidersContent}
          stepAnimSlidersDockedContent={stepAnimSlidersDockedContent}
          widgetsJoined={widgetsJoined}
          onJoinWidgets={joinWidgets}
          onSplitWidgets={splitWidgets}
          pinnedBitIndices={pinnedBitIndices}
          hoveredBitInfo={hoveredBitInfo}
          computeBitInfo={computeBitInfo}
          getVisibleBalloonStyles={getVisibleBalloonStyles}
          balloonLiveLayout={balloonLiveLayout}
          cachelineSize={cachelineSize}
          setPinnedBitIndices={setPinnedBitIndices}
          handleStepSelection={handleStepSelection}
          detailOpen={detailOpen}
          toggleDetailPanel={toggleDetailPanel}
          detailHeight={detailHeight}
          pendingBannerDragStart={pendingBannerDragStart}
          onConsumePendingBannerDragStart={() => setPendingBannerDragStart(null)}
          updateDetailHeight={updateDetailHeight}
          detailWidth={detailWidth}
          setDetailWidth={setDetailWidth}
          playing={playing}
          selectedSteps={selectedSteps}
          stepStats={stepStats}
          storageModel={storageModel}
          wheelDefinition={wheelDefinition}
          layoutSettings={layoutSettings}
          benchmarkTimingData={benchmarkTimingData}
          openDetailInspector={openDetailInspector}
          detailInspectorOpen={detailInspectorOpen}
          detailInspectorMode={detailInspectorMode}
          detailInspectorQuery={detailInspectorQuery}
          setDetailInspectorQuery={setDetailInspectorQuery}
          setDetailInspectorOpen={setDetailInspectorOpen}
          detailInspectorRows={detailInspectorRows}
          filteredDetailInspectorRows={filteredDetailInspectorRows}
          timingPanelOpen={timingPanelOpen}
          setTimingPanelOpen={setTimingPanelOpen}
          benchmarkTimingFileName={benchmarkTimingFileName}
          setTimingFocusOp={setTimingFocusOp}
          onImportBenchmarkTiming={onImportBenchmarkTiming}
          steps={steps}
          onShowEventTitle={showEventTitleAboveClosedDetail}
          onOpenRawLog={onOpenRawLog}
          currentStepSourceLine={stepToLine[currentStep]}
          hasRawSource={!!sourceRef}
          allEventsTransport={allEventsTransportContent}
          introPhase={introPhase}
          onIntroTransitionEnd={handleIntroTransitionEnd}
          singleEventWidgetRevealed={singleEventWidgetRevealed}
        />
        {widgetsJoined && eventsPanelCollapsed && !allEventsWidgetHidden && eventTitleSettings.visible && singleEventWidgetRevealed && (
          <JoinedEventsWidget
            currentStep={currentStep}
            steps={steps}
            goToStep={goToStep}
            playing={playing}
            handlePlayPause={handlePlayPause}
            exporting={!!exporting}
            isScrubbingTopRef={isScrubbingTopRef}
            playSpeedPercent={playSpeedPercent}
            setPlaySpeedPercent={setPlaySpeedPercent}
            settings={eventTitleSettings}
            setSettings={setEventTitleSettings}
            banner={currentStepBanner}
            surrounding={surroundingEvents}
            currentStepData={currentStepData}
            revealCurrentStepInPanel={revealCurrentStepInPanel}
            sliders={stepAnimSlidersContent}
            onSplitWidgets={splitWidgets}
            onPushToEventsPanel={pushJoinedWidgetToEventsPanel}
            onPushToDetailPanel={pushJoinedWidgetToDetailPanel}
            initialBannerRect={joinBannerRect}
            onHideWidget={hideJoinedWidget}
            detailOpen={detailOpen}
            detailHeight={detailHeight}
            onNavigate={() => { if (!detailOpenRef.current) setDetailOpen(true); }}
          />
        )}
        <SettingsPanel
          settings={layoutSettings}
          onChange={setLayoutSettings}
          autoFitColumns={autoFitColumnCount}
          collapsed={settingsCollapsed}
          onToggleCollapse={toggleSettingsPanel}
          onActiveTabChange={setSettingsActiveTab}
          playSpeed={playSpeedPercent}
          onPlaySpeedChange={setPlaySpeedPercent}
          repeatAnim={delayBetweenEvents}
          onRepeatAnimChange={setDelayBetweenEvents}
          delayBetweenRepeats={delayBetweenRepeats}
          onDelayBetweenRepeatsChange={setDelayBetweenRepeats}
          eventTimeTargets={eventTimeTargets}
          onEventTimeTargetsChange={setEventTimeTargets}
          animMode={animMode}
          onAnimModeChange={setAnimMode}
          animStyle={animStyle}
          onAnimStyleChange={setAnimStyle}
          animationReplayPaused={animationReplayPaused}
          onAnimationReplayPausedChange={setAnimationReplayPaused}
          eventDurationMode={eventDurationMode}
          onEventDurationModeChange={setEventDurationMode}
          gridOpacity={gridOpacity}
          onGridOpacityChange={setGridOpacity}
          colorPreset={colorPreset}
          onColorPresetChange={setColorPreset}
          customColors={customColors}
          onCustomColorsChange={setCustomColors}
          cachelineSize={cachelineSize}
          onCachelineSizeChange={setCachelineSize}
          cachePreset={cachePreset}
          onCachePresetChange={setCachePreset}
          heatMapEnabled={heatMapEnabled}
          onHeatMapToggle={setHeatMapEnabled}
          cachelineAnnotation={cachelineAnnotation}
          onCachelineAnnotationChange={setCachelineAnnotation}
          primeOverlayEnabled={primeOverlayEnabled}
          onPrimeOverlayToggle={setPrimeOverlayEnabled}
          rangeOverlayEnabled={rangeOverlayEnabled}
          rangeOverlayStart={rangeOverlayStart}
          rangeOverlayEnd={rangeOverlayEnd}
          onRangeOverlayToggle={(enabled) => {
            if (enabled && !rangeOverlayEnabled) {
              const step = steps[currentStep];
              if (step) {
                const start = step.focusStart != null ? step.focusStart : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
                const end = step.focusStop != null ? step.focusStop : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
                setRangeOverlayStart(start);
                setRangeOverlayEnd(end);
              }
            }
            setRangeOverlayEnabled(enabled);
          }}
          onRangeOverlayStartChange={setRangeOverlayStart}
          onRangeOverlayEndChange={setRangeOverlayEnd}
          multiplesOverlayEnabled={multiplesOverlayEnabled}
          multiplesOverlayPrime={multiplesOverlayPrime}
          onMultiplesOverlayToggle={(enabled) => {
            if (enabled && !multiplesOverlayEnabled) {
              const step = steps[currentStep];
              if (step && step.prime != null && step.prime >= 2) {
                setMultiplesOverlayPrime(step.prime);
              }
            }
            setMultiplesOverlayEnabled(enabled);
          }}
          onMultiplesOverlayPrimeChange={setMultiplesOverlayPrime}
          onRangeOverlayReset={() => {
            const step = steps[currentStep];
            if (step) {
              const start = step.focusStart != null ? step.focusStart : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
              const end = step.focusStop != null ? step.focusStop : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
              setRangeOverlayStart(start);
              setRangeOverlayEnd(end);
            }
          }}
          onMultiplesOverlayReset={() => {
            const step = steps[currentStep];
            if (step && step.prime != null && step.prime >= 2) {
              setMultiplesOverlayPrime(step.prime);
            }
          }}
          showMinimap={showMinimap}
          onShowMinimapChange={setShowMinimap}
          minimapControlVisible={true}
          eventTitleSettings={eventTitleSettings}
          onEventTitleSettingsChange={setEventTitleSettings}
          outlineSettings={layoutSettings.outlines}
          onOutlineChange={(outlines) => setLayoutSettings((prev) => ({ ...prev, outlines }))}
          isWindowsPlatform={isWindowsPlatform}
          showAnimationControls={true}
          theme={theme}
          onThemeChange={(t) => setTheme(t)}
          canvasColors={canvasColors}
          onCanvasColorsChange={setCanvasColors}
          activeTabRequest={settingsTabRequest}
          bitAnimationMode={bitAnimationMode}
          onBitAnimationModeChange={handleBitAnimationModeChange}
          autoAnimateOnSelect={autoAnimateOnSelect}
          onAutoAnimateOnSelectChange={setAutoAnimateOnSelect}
          detailOpen={detailOpen}
          detailHeight={detailHeight}
        />
        {debugToolsOpen && (
          <DebugToolsPanel
            rendererRef={rendererRef}
            glCanvasRef={glCanvasRef}
            glRendererRef={glRendererRef}
            camera3DRef={camera3DRef}
            camera3DTransform={camera3DTransform}
            zoomLevel={zoom}
            glDebugInfo={glDebugInfo}
            theme={theme}
            debugLayerMode={debugLayerMode}
            setDebugLayerMode={setDebugLayerMode}
            debugGlOffsetX={debugGlOffsetX}
            setDebugGlOffsetX={setDebugGlOffsetX}
            debugGlOffsetY={debugGlOffsetY}
            setDebugGlOffsetY={setDebugGlOffsetY}
            debugGlAutoOffsetY={debugGlAutoOffsetY}
            debugCalibrationMode={debugCalibrationMode}
            setDebugCalibrationMode={setDebugCalibrationMode}
            onApplyDebugSnapshot={applyDebugSnapshot}
            onForceGlRedraw={forceGlRedraw}
            rightOffset={settingsCollapsed ? 8 : (isMacPlatform ? 388 : 328)}
          />
        )}
      </div>
      {/* Minimap overlay — rendered OUTSIDE .main-content so it is never
          trapped inside the canvas-container stacking context
          (transform-style:preserve-3d). position:fixed + z-index:35 then
          places it above all floating panels (z-index:28) and the detail
          panel (document order) in the root stacking context. */}
      <canvas
        ref={minimapCanvasRef}
        className="minimap-overlay-canvas"
        aria-hidden="true"
      />
      <KeyboardShortcutsOverlay
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}

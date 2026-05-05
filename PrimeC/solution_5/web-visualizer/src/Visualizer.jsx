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
import { useViewportAnchoring } from './hooks/useViewportAnchoring';
import { useWindowResize } from './hooks/useWindowResize';
import CanvasLoadingOverlay from './visualizer/CanvasLoadingOverlay';
import StatusBanners from './visualizer/StatusBanners';
import { applyPan } from './visualizer/gestures/pan';
import { applyRotate } from './visualizer/gestures/rotate';
import { applyWheel } from './visualizer/gestures/wheel';
import {
  DEFAULT_EVENT_TIME_TARGETS,
  DEFAULT_LAYOUT_SETTINGS as DEFAULT_SETTINGS,
  DEFAULT_EVENT_TITLE_SETTINGS,
  writeViewPrefs,
  getInitialViewState,
} from './lib/viewPrefs';
import { buildTraceInfoSections } from './lib/traceHeader';
import { detectIsMac, detectIsWindows, detectIsElectron } from './lib/platform';
import {
  clampMs as clampMsPure,
  bitsAtTimeRatio as bitsAtTimeRatioPure,
  timeRatioAtBitIndex as timeRatioAtBitIndexPure,
  computeEventNormalDuration as computeEventNormalDurationPure,
  computeEventDuration as computeEventDurationPure,
  getFadeOutDuration as getFadeOutDurationPure,
} from './lib/animationTiming';
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

  // Keep refs in sync for use in callbacks
  const getMinimapDetailH = useCallback(() => {
    const panelEl = document.querySelector('.detail-panel');
    if (panelEl) {
      const rect = panelEl.getBoundingClientRect();
      if (rect.height > 0) return Math.round(rect.height);
    }
    return detailOpenRef.current ? detailHeightRef.current : 36;
  }, []);

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

  // Wrap setDetailOpen/setDetailHeight to keep refs updated
  const updateDetailOpen = useCallback((val) => {
    const next = typeof val === 'function' ? val(detailOpenRef.current) : val;
    detailOpenRef.current = next;
    setDetailOpen(next);
  }, []);

  const updateDetailHeight = useCallback((val) => {
    detailHeightRef.current = val;
    setDetailHeight(val);
  }, []);

  const updateMinimapAvailability = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    // Use the stored container-visible dimensions (set on every resize) rather
    // than the oversized canvas dimensions so the fully-visible check reflects
    // what the user actually sees, not the 3× drag-headroom canvas.
    const viewportW = r.viewportW || (containerRef.current?.clientWidth ?? 0);
    const viewportH = r.viewportH || (containerRef.current?.clientHeight ?? 0);
    const fullyVisible = viewportW > 0 && viewportH > 0 ? r.isContentFullyVisible(viewportW, viewportH) : false;
    const available = showMinimap !== false && !fullyVisible;
    r.minimapEnabled = available;
    setMinimapAvailable(available);
    if (!available) r.minimapRenderer._rect = null;
  }, [showMinimap]);

  const stopPlayback = useCallback(() => {
    setPlaying(false);
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

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

  const clearScheduledLayoutRefresh = useCallback(() => {
    if (layoutRefreshTimeoutRef.current != null) {
      clearTimeout(layoutRefreshTimeoutRef.current);
      layoutRefreshTimeoutRef.current = null;
    }
    if (layoutRefreshRaf1Ref.current != null) {
      cancelAnimationFrame(layoutRefreshRaf1Ref.current);
      layoutRefreshRaf1Ref.current = null;
    }
    if (layoutRefreshRaf2Ref.current != null) {
      cancelAnimationFrame(layoutRefreshRaf2Ref.current);
      layoutRefreshRaf2Ref.current = null;
    }
  }, []);

  const schedulePostLayoutRefresh = useCallback((anchor = null) => {
    // clearScheduledLayoutRefresh();
    layoutRefreshRaf1Ref.current = requestAnimationFrame(() => {
      layoutRefreshRaf2Ref.current = requestAnimationFrame(() => {
        // refreshCanvasLayout(anchor);
      });
    });
    layoutRefreshTimeoutRef.current = setTimeout(() => {
      // refreshCanvasLayout(anchor);
    }, 210);
  }, [clearScheduledLayoutRefresh, refreshCanvasLayout]);



  const applyViewportFit = useCallback((renderer, width, height) => {
    if (!renderer || width <= 0 || height <= 0) return;
    renderer.zoomToFit(width, height, { alignTop: false });
    const dpr = window.devicePixelRatio || 1;
    // Use renderer.canvasHeight (set by resize()) for the canvas CSS height.
    // renderer.canvas is null in Chrome/Edge worker mode (glyph runs in worker),
    // so renderer.canvas?.height would fall back to height*dpr (viewport size)
    // and collapse planeOffsetY to 0, placing content at the top of the canvas
    // instead of the vertical center.
    const canvasCssH = renderer.canvasHeight || (renderer.canvas?.height || height * dpr) / dpr;
    const canvasCssW = renderer.canvasWidth  || (renderer.canvas?.width  || width  * dpr) / dpr;
    const planeOffsetX = Math.max(0, (canvasCssW - width)  / 2);
    const planeOffsetY = Math.max(0, (canvasCssH - height) / 2);
    renderer.panX += planeOffsetX;
    renderer.panY += planeOffsetY;
  }, [header.bitCount]);

  /**
   * Stash a viewport anchor for the panel-toggle resize useEffect.
   * Must be called BEFORE the state update that triggers the layout change
   * (see §5 minefield: pendingResizeAnchorRef). Each panel toggle handler
   * calls this once immediately before its setState call.
   */
  const captureResizeAnchor = useCallback(() => {
    pendingResizeAnchorRef.current = captureViewportAnchor(0.5, 0.5);
  }, [captureViewportAnchor]);

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

  // Init renderer
  useEffect(() => {
    const r = new SieveRenderer();
    rendererRef.current = r;
    if (minimapCanvasRef.current) r.attachMinimapCanvas(minimapCanvasRef.current);

      // WebGL glyph-text renderer. Initialised once per session; reused
      // across trace reloads. Safe to create on every effect run because
      // GlyphTextGLCore.init() guards against duplicate initialisation.
      // Attachment (attachGlyphRenderer vs attachGLWorker) is deferred to
      // after the GL worker is set up so we know which rendering path is used.
      if (glyphCanvasRef.current) {
        let glr = glyphRendererRef.current;
        if (!glr) {
          const newGlr = new GlyphTextGLCore();
          try {
            if (newGlr.init(glyphCanvasRef.current)) {
              glr = newGlr;
              glyphRendererRef.current = glr;
            } else {
              console.warn('[GlyphText] WebGL2 context unavailable — glyph text disabled.');
            }
          } catch (err) {
            console.error('[GlyphText] init failed:', err);
          }
        }
        // Attachment happens below after GL worker init (direct vs worker mode).
      } else {
        console.warn('[GlyphText] glyphCanvasRef is null at init time — glyph text disabled.');
      }

      r.storageModel = header.storageModel || 'half';
      r.wheelDefinition = wheelDefinition;
      r.init(header.bitCount, header.sieveSize);
      bitStateRef.current = new Uint8Array(header.bitCount);
      // Warm the prime-overlay cache off the main thread so toggling the
      // overlay is instant. Re-render when the worker reply arrives in
      // case the overlay is already enabled.
      r.prefetchPrimeOverlay(() => {
        const rr = rendererRef.current;
        if (rr && rr.primeOverlay) rr.render();
      });

      // WebGL bit-grid scaffold (gl-worker via OffscreenCanvas).
      if (glCanvasRef.current) {
        // Attach the GL renderer once — transferControlToOffscreen is a
        // one-shot operation and cannot be repeated on the same canvas.
        // On trace changes (effect re-runs) we reuse the existing renderer
        // and just update the bit-count budget. On first mount (or when
        // the renderer was never successfully created) we create it fresh.
        let gl = glRendererRef.current;
        if (!gl) {
          // Pre-size the GL canvas to the full target CSS + backing dimensions
          // BEFORE transferControlToOffscreen().
          //
          // Chrome/Edge set the compositor layer bounds from the canvas's CSS
          // dimensions at the time the OffscreenCanvas transfer takes place.
          // The default canvas is 300×150 CSS (300×150 or 600×300 physical at
          // DPR=2). refreshCanvasLayout then sets CSS to ~3.2× viewport
          // (5530×3574 CSS = 11060×7148 physical at DPR=2 on a 1728×1117
          // screen). Because the compositor layer was created at the initial
          // size, Chrome cannot show content that renders outside those initial
          // bounds — the canvas appears entirely blank. Moving the window to a
          // different display forces Chrome to rebuild all compositor layers
          // at the current CSS size, which is why that unblocks it.
          //
          // Fix: set CSS + backing to the same ~3.2× target that
          // refreshCanvasLayout would compute (no camera tilt at startup, so
          // the formula collapses to baseW × 3.2). This guarantees the
          // compositor layer is large enough for the first rendered frame.
          if (typeof window !== 'undefined' && glCanvasRef.current) {
            const _dpr = window.devicePixelRatio || 1;
            const _baseW = Math.max(window.innerWidth  || 800, window.screen?.width  || 0);
            const _baseH = Math.max(window.innerHeight || 600, window.screen?.height || 0);
            // Match getCanvasTargetSize's formula at zero tilt (scaleW=1, diagonalOverscan=1).
            // dragOverscan=3.1, overscanFloor=3.2 → max(3.2, 3.1) = 3.2 always wins.
            const _canvasW = Math.max(1, Math.round(_baseW * 3.2));
            const _canvasH = Math.max(1, Math.round(_baseH * 3.2));
            glCanvasRef.current.style.width  = `${_canvasW}px`;
            glCanvasRef.current.style.height = `${_canvasH}px`;
            glCanvasRef.current.width  = Math.round(_canvasW * _dpr);
            glCanvasRef.current.height = Math.round(_canvasH * _dpr);
            // Force a synchronous CSS layout so Chrome's compositor reads the
            // correct element bounds when creating the OffscreenCanvas placeholder
            // layer. Without this, the layout is still pending (300×150 stale) and
            // the compositor clips the layer too small — rendering outside those
            // bounds is invisible until a window-move rebuilds the layer.
            void glCanvasRef.current.getBoundingClientRect();
          }
          const newGl = new BitGridGLWorker();
          if (newGl.attach(glCanvasRef.current)) {
            gl = newGl;
            glRendererRef.current = gl;
            updateGlDebugInfo(true);
          } else {
            // OffscreenCanvas not available — GL worker could not start.
            // Bit cells won't be filled. Show a browser-update notice.
            setGlUnavailable(true);
          }
        }
        if (gl) {
          gl.resizeForBitCount(header.bitCount);

          // Wire glyph rendering once the worker is ready (atlas data available).
          // In direct mode (Safari/fallback) this fires synchronously.
          // In worker mode this fires after the worker posts its ready message.
          gl.whenReady(() => {
            const rr = rendererRef.current;
            if (!rr) return;
            if (gl.isDirectMode()) {
              const glrForDirect = glyphRendererRef.current;
              if (glrForDirect) rr.attachGlyphRenderer(glrForDirect);
            } else {
              rr.attachGLWorker(gl);
              // Render immediately so the first frame shows text (if a trace
              // is already loaded).
              if (rr.bitState && rr.bitCount > 0) rr.render();
            }
          });

          const origRender = r.render.bind(r);
          r.render = () => {
            const g = glRendererRef.current;
            const rr = rendererRef.current;
            if (!g || !rr) return;
            const cssW = rr.canvasWidth || 0;
            const cssH = rr.canvasHeight || 0;
            g.resize(cssW, cssH);

            // Only re-upload the state texture when the bit data has actually
            // changed (setState(), overlay toggles, etc.). Pan/zoom/resize only
            // change layout uniforms — skipping the O(bitCount) pack+transfer
            // on those hot paths cuts per-frame CPU work dramatically for large
            // grids (e.g. 1M bits → skip 1 MB pack + worker message per frame).
            if (rr._stateDirty !== false) {
              g.uploadState(rr);
              rr._stateDirty = false;
            }
            // uploadAnim is omitted: packAnim always writes the no-op default
            // (0, 0, 1, 0) and the animTex is already initialised to that in
            // setBitCount(). Re-uploading 4×bitCount floats every frame was
            // pure waste. If real per-bit animation ever uses the anim texture,
            // add a dedicated _animDirty flag and re-introduce the upload.

            const px = Math.max(1, rr.pixelSize);
            const zoom = Math.max(0.01, rr.zoom || 1);
            const bitColors = rr._bitColors();
            const changed = rr._opColor();
            const renderParams = {
              panX: rr.panX || 0,
              panY: rr.panY || 0,
              cellSize: px * zoom,
              bgColor: rr.effectiveBackground,
              setColor: bitColors.set,
              clearedColor: bitColors.cleared,
              changedColor: changed,
              repeatedColor: [245, 158, 11],
              baseAlpha: Math.max(0.12, Math.min(1, rr.gridOpacity ?? 1)),
              ...rr.glLayoutParams(),
            };
            let renderSeq;
            if (rr._glyphBuf) {
              // Worker glyph mode: collect glyph commands first, then
              // dispatch them together with the bit-grid render.
              origRender();
              const glyphCmds = rr._pendingGlyphCmds;
              rr._pendingGlyphCmds = null;
              renderSeq = g.render(renderParams, glyphCmds);
            } else {
              // Direct mode: bit-grid renders first, then glyph on top.
              renderSeq = g.render(renderParams);
              origRender();
            }
            updateGlDebugInfo(false);
            return renderSeq;
          };

          // scheduleRender() coalesces rapid back-to-back renders (pan/zoom
          // gesture events) into a single rAF-aligned frame.  If called while
          // a frame is already pending it cancels the previous request so only
          // the latest state is drawn — this is the "abort current, start new"
          // behaviour for interactions.
          r.scheduleRender = () => {
            if (pendingRenderRafRef.current != null) {
              cancelAnimationFrame(pendingRenderRafRef.current);
            }
            pendingRenderRafRef.current = requestAnimationFrame(() => {
              pendingRenderRafRef.current = null;
              const rr = rendererRef.current;
              if (rr) rr.render();
            });
          };
        }
        // If GL is unavailable, fall back to separate glyph canvas.
        if (!gl) {
          const glrFallback = glyphRendererRef.current;
          if (glrFallback) r.attachGlyphRenderer(glrFallback);
        }
      }

    // Init 3D camera — see src/hooks/use3DCamera.js for the full lifecycle.
    createCamera({
      onPanZoom: ({ panX, panY, zoom: z }) => {
        const rr = rendererRef.current;
        if (!rr) return;
        rr.panX = panX;
        rr.panY = panY;
        rr.zoom = z;
        setZoom(z);
        // scheduleRender coalesces rapid gesture events to one rAF frame,
        // cancelling any in-flight pending render before scheduling the new one.
        (rr.scheduleRender ?? rr.render).call(rr);
        rr.renderMinimap(rr.canvasWidth, rr.canvasHeight || 0, getMinimapDetailH());
      },
    });

    return () => {
      // Do NOT dispose glRendererRef here — transferControlToOffscreen is
      // one-shot and the worker must survive both StrictMode remounts and
      // trace reloads.  See the comment on the mount-only useEffect below.
      rendererRef.current = null;
      disposeCamera();
    };
  }, [header.bitCount, header.sieveSize, header.storageModel, wheelDefinition]);

  // Phase E: after the renderer initialises and produces its first frame,
  // start the loading overlay and defer the intro scale animation until it's done.
  useEffect(() => {
    let fired = false;
    const tryTrigger = () => {
      if (fired) return;
      const r = rendererRef.current;
      if (!r) return;
      fired = true;
      introTiltStartedRef.current = false;
      // Reset intro phase each time a new trace header arrives.
      setIntroPhase('hidden');
      // Give React one frame to apply the hidden class before starting the overlay.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLoadingOverlayPhase('active');
          setUiChromeVisible(false);
          setOverlayBarPct(0);
          overlayStartTimeRef.current = Date.now();
          pendingIntroAfterOverlayRef.current = true;
        });
      });
    };
    // Fire once the renderer is ready (after next paint).
    const raf = requestAnimationFrame(tryTrigger);
    return () => cancelAnimationFrame(raf);
  }, [header.bitCount]); // Re-run whenever a new trace loads

  // Animate the loading overlay progress bar.
  // The bar takes at least 2 seconds to fill, even if the log loads faster.
  useEffect(() => {
    if (loadingOverlayPhase !== 'active') return;
    const MIN_MS = 2000;
    let timer = null;

    const update = () => {
      const elapsed = Date.now() - (overlayStartTimeRef.current || Date.now());
      const complete = loadCompleteRef.current;
      const progress = loadProgressRef.current;
      const stepCount = header.stepCount;

      const timePct = Math.min(100, (elapsed / MIN_MS) * 100);
      const realPct = complete ? 100
        : stepCount > 0 ? Math.min(95, (progress / stepCount) * 100)
        : Math.min(90, timePct * 0.9);
      const displayPct = Math.max(0, Math.min(timePct, realPct));
      setOverlayBarPct(Math.round(displayPct));

      if (complete && elapsed >= MIN_MS) {
        setOverlayBarPct(100);
        setTimeout(() => {
          setLoadingOverlayPhase('fading');
          setTimeout(() => {
            setLoadingOverlayPhase('hidden');
            setUiChromeVisible(true);
            // Trigger the pending intro animation
            if (pendingIntroAfterOverlayRef.current) {
              pendingIntroAfterOverlayRef.current = false;
              setIntroPhase('scaling');
            }
          }, 500);
        }, 300);
        return;
      }
      timer = setTimeout(update, 50);
    };

    timer = setTimeout(update, 50);
    return () => { if (timer) clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOverlayPhase, header.stepCount]); // reads loadComplete/loadProgress via refs

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

  // Precompute periodic bitState checkpoints whenever the trace changes.
  // Spacing: at most 50 checkpoints, minimum interval 100 events.
  // Memory guard: skip if total snapshot bytes would exceed 8 MB so large
  // traces (high bitCount) don't balloon the heap.
  // Guard: only run after streaming is complete so we snapshot a stable array.
  useEffect(() => {
    if (!loadComplete) return;
    const { bitCount } = header;
    const MAX_CHECKPOINTS = 50;
    const MIN_INTERVAL   = 100;
    const MAX_BYTES      = 8 * 1024 * 1024;
    if (!steps.length || !bitCount) {
      bitStateCheckpointsRef.current = [];
      return;
    }
    const interval = Math.max(MIN_INTERVAL, Math.ceil(steps.length / MAX_CHECKPOINTS));
    const estimatedCheckpoints = Math.floor(steps.length / interval);
    if (estimatedCheckpoints * bitCount > MAX_BYTES) {
      bitStateCheckpointsRef.current = [];
      return;
    }
    const checkpoints = [];
    const bs = new Uint8Array(bitCount);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      for (let j = 0; j < s.changedBits.length; j++) {
        const idx = s.changedBits[j];
        if (idx < bs.length) bs[idx] = 1;
      }
      if ((i + 1) % interval === 0) {
        // Checkpoint stores state AFTER events 0..i.
        // `step` is the first event index NOT yet included.
        checkpoints.push({ step: i + 1, bitState: bs.slice() });
      }
    }
    bitStateCheckpointsRef.current = checkpoints;
  }, [steps, header, loadComplete]);

  // Go to step
  const goToStep = useCallback((target, options = {}) => {
    const r = rendererRef.current;
    if (!r || steps.length === 0) return;
    target = Math.max(0, Math.min(target, steps.length - 1));
    const suppressHighlight = options.suppressHighlight === true;
    if (!options.keepPlaying && playing) stopPlayback();
    // Manual navigation (next/prev/first/last/scrub) cancels any active
    // single-event auto-replay loop. The user wants to "jump" to the new
    // event; whether or not it animates is governed by `playing`.
    if (!options.keepPlaying && !options.keepLoop && singleEventLoopActiveRef.current) {
      setSingleEventLoopActive(false);
    }
    // When scrubbing the timeline with an aggregate selection active, let the
    // selected-steps animation loop (Effect 1) keep running uninterrupted.
    // Skip the r.setState / triggerAnimation calls below so they don't
    // override r.changedBits with individual-step bits or cancel the loop.
    const aggregateScrub = isScrubbingTopRef.current && selectedStepsRef.current.size > 0;
    if (!suppressHighlight) initialHighlightHoldRef.current = false;

    let bs = bitStateRef.current;
    if (!bs) return;

    // Build state up to step before target (for stats).
    // If the scrubber left bitState in a partially-revealed state, do a full
    // rebuild regardless of direction so the incremental path can't desync.
    if (target <= currentStep || bitStateDirtyRef.current) {
      // Use the nearest precomputed checkpoint to skip bulk replay.
      const checkpoints = bitStateCheckpointsRef.current;
      let replayFrom = 0;
      for (let k = checkpoints.length - 1; k >= 0; k--) {
        if (checkpoints[k].step <= target) {
          bs.set(checkpoints[k].bitState);
          replayFrom = checkpoints[k].step;
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

    // bs is now at state just before target — compute stats
    const step = steps[target];
    let newlySet = 0, reSet = 0;
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

    // Apply target step
    for (let j = 0; j < step.changedBits.length; j++) {
      const idx = step.changedBits[j];
      if (idx < bs.length) bs[idx] = 1;
    }

    let totalSet = 0;
    for (let i = 0; i < bs.length; i++) { if (bs[i]) totalSet++; }
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
      // Set operation for color-coded highlighting
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

    // Update heat map (also when cacheline annotations are enabled, to provide hit-count data)
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
      // Same as refreshCanvasLayout: layout columns target a stable
      // window-anchored size so panel toggles don't reflow.
      const lvW = (typeof window !== 'undefined' ? window.innerWidth : rect.width) || rect.width;
      const lvH = (typeof window !== 'undefined' ? window.innerHeight : rect.height) || rect.height;
      r.layoutAvailWidth = lvW;
      r.layoutAvailHeight = lvH;
      // Zoom to fit on first render
      if (!initialFitDoneRef.current) {
        applyViewportFit(r, rect.width, rect.height);
        // If fit-to-screen cannot keep the full grid visible (e.g. min zoom
        // clamp), bias startup framing toward the top so row 1 appears at
        // roughly one-third of the visible viewport height.
        const fitsViewport = r.isContentFullyVisible(rect.width, rect.height);
        if (!fitsViewport) {
          const firstRow = r.getElementBounds('cacheline', 0);
          if (firstRow) {
            const canvasH = r.canvasHeight || rect.height;
            const planeOffsetY = Math.max(0, (canvasH - rect.height) / 2);
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

    // Trigger animation for changed bits
    // Only run the per-event reveal animation when there is an active "play"
    // context: all-events autoplay (`playing`), single-event auto-replay
    // (`singleEventLoopActive`), or active drag-scrub on the top slider.
    // Otherwise this is a "jump" — apply the new state silently.
    const hasPlayContext = playing
      || singleEventLoopActiveRef.current
      || isScrubbingTopRef.current
      || options.keepPlaying === true
      || options.forceAnimate === true;
    // For aggregate scrubbing, the selected-steps animation loop (Effect 1)
    // keeps running without interference — don't call triggerAnimation here.
    if (!aggregateScrub && !suppressHighlight && hasPlayContext && triggerAnimationRef.current) {
      // Pick the right delay context:
      //  - All-events autoplay (playing): wait `delayBetweenEvents` after this
      //    event before the scheduler advances to the next event.
      //  - Single-event auto-replay or manual navigation: 0 here — the
      //    pausedStepAnimLoop adds `delayBetweenRepeats` between repeats.
      //  - Mid-drag scrub of the top slider: 0 (each drag tick re-triggers).
      const delayMs = playing ? delayBetweenEvents : 0;
      triggerAnimationRef.current(changedSet, {
        adaptiveDuration: true,
        fadeOutBits: previousHighlights,
        delayMs,
        // No more forced playbackDurationMs — computeEventDuration drives the
        // per-event wall-clock duration from the per-tier time targets and
        // the speed % slider.
        pinnedBitIndices,
        groupBits: effectiveGroupBits,
      });
    }
  }, [currentStep, steps, updateMinimapAvailability, playing, stopPlayback, getCanvasTargetSize, delayBetweenEvents, applyViewportFit, pinnedBitIndices, effectiveGroupBits]);

  // Stable ref so long-lived closures (play scheduler, keyboard handler)
  // can call the latest goToStep without listing it in their dep arrays.
  const goToStepRef = useRef(null);
  goToStepRef.current = goToStep;

  // Called from the raw log viewer: close the popover, navigate, open events panel.
  const onJumpToStep = useCallback((stepIndex) => {
    setShowTraceInfo(false);
    goToStep(stepIndex);
    revealCurrentStepInPanel();
  }, [goToStep, revealCurrentStepInPanel, setShowTraceInfo]);

  // Used by the Detail Panel "Source" link: open trace-info popover + raw log at a specific line.
  const [rawScrollToLine, setRawScrollToLine] = useState(null);
  const onClearRawScrollToLine = useCallback(() => setRawScrollToLine(null), []);
  const onOpenRawLog = useCallback(async (lineIdx) => {
    if (lineIdx != null) {
      setRawScrollToLine(lineIdx);
      return;
    }
    // Line not yet known — fetch the raw source and scan for the current step's annotation.
    const text = await fetchRawSource();
    if (!text) { setRawScrollToLine(0); return; }
    const target = (steps[currentStep]?.annotation || '').trim();
    if (!target) { setRawScrollToLine(0); return; }
    const rawLines = text.split(/\r?\n/);
    let found = null;
    for (let l = 0; l < rawLines.length; l++) {
      const raw = rawLines[l];
      if (raw.trim() === target) { found = l; break; }
      const kvM = raw.match(/\bannotation="([^"]*)"/);
      if (kvM && kvM[1].trim() === target) { found = l; break; }
      const nsM = raw.match(/^(.+?)\s*\{[^}]*"?traceline"?\s*:/);
      if (nsM && nsM[1].trim() === target) { found = l; break; }
    }
    setRawScrollToLine(found ?? 0);
  }, [fetchRawSource, steps, currentStep]);

  const cancelViewportAnimation = useCallback(() => {
    if (viewportAnimRef.current) {
      cancelAnimationFrame(viewportAnimRef.current);
      viewportAnimRef.current = null;
    }
  }, []);

  // Stop any running sequential animation
  const stopSeqAnim = useCallback(() => {
    if (seqTimerRef.current) {
      // seqTimerRef may hold either a setTimeout id (sequential reveal) or a
      // RAF id (pausable waitForDelay). Cancel both possibilities; the unused
      // one is a harmless no-op.
      clearTimeout(seqTimerRef.current);
      cancelAnimationFrame(seqTimerRef.current);
      seqTimerRef.current = null;
    }
    // Cancel runEffect's in-flight animation and resolve its Promise cleanly so
    // the loop's `await triggerFn()` is never left permanently suspended.
    // Call BEFORE the generic rippleRef cancel — the cancel fn handles rippleRef.
    if (runEffectCancelRef.current) {
      runEffectCancelRef.current();
    } else if (rippleRef.current) {
      // Mask stamp or other RAF user — no associated resolve callback.
      cancelAnimationFrame(rippleRef.current);
      rippleRef.current = null;
    }
    // Cancel camera animations
    if (camera3DRef.current) camera3DRef.current.cancelAllAnimations();
    cancelViewportAnimation();
    if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
  }, [cancelViewportAnimation]);
  stopSeqAnimRef.current = stopSeqAnim;

  const freezeAnimationNow = useCallback(() => {
    stopPlayback();
    stopSeqAnim();
    setAnimationReplayPaused(true);
    const r = rendererRef.current;
    if (!r) return;
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
  }, [stopPlayback, stopSeqAnim, getMinimapDetailH]);

  // Scrub the animation inside the current event. progress is 0..1; maps to a
  // bit index inside this step's changedBits. We roll bitState back to the
  // state just BEFORE the current step, then apply only bits [0..targetIdx],
  // so the grid shows a true progressive reveal — bits beyond the scrub
  // position render as unset, not as the step's finished state.
  const seekStepAnimation = useCallback((progress) => {
    // Bump the seek generation so any in-flight triggerAnimation tick that
    // fires AFTER this point will self-abort instead of overwriting the canvas.
    seekGenRef.current += 1;
    stopPlayback();
    stopSeqAnim();
    // Synchronously kill any pending loop re-schedules (setTimeout(loop, 0))
    // that were posted after the previous animation completed. React 18's
    // MessageChannel-based scheduler fires as a macrotask — the same priority
    // as setTimeout — so the loop can restart before React's effect cleanup
    // runs clearTimeout. Clearing here prevents that race.
    if (pausedStepAnimLoopRef.current) {
      clearTimeout(pausedStepAnimLoopRef.current);
      pausedStepAnimLoopRef.current = null;
    }
    if (selectedAnimLoopRef.current) {
      clearTimeout(selectedAnimLoopRef.current);
      selectedAnimLoopRef.current = null;
    }
    // Clear the single-event loop so the Play button shows the correct state
    // (Play, not Pause) after the user manually repositions the animation.
    setSingleEventLoopActive(false);
    setAnimationReplayPaused(true);
    setDelayPhaseMsRef.current(null);
    const r = rendererRef.current;
    const stepIdx = currentStep;
    const allSteps = stepsRef.current;
    const step = allSteps[stepIdx];
    const bs = bitStateRef.current;
    if (!r || !step || !bs) return;
    const clamped = Math.max(0, Math.min(1, progress));

    // ── Aggregate seek ─────────────────────────────────────────────────────
    // When multiple steps are selected the renderer was already set up with
    // the merged mask/bit state by the selectedSteps effect.  Handle all
    // animation modes (mask, combined, sequential, all) using the renderer's
    // current state rather than a single step's data.
    const selSteps = selectedStepsRef.current;
    if (selSteps.size > 1) {
      const mode = bitAnimationModeRef.current;
      const aggHasMask = !!(r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0
        && Number.isFinite(r.maskWordBits) && r.maskWordBits > 0);
      const inMaskOrCombinedAgg = (mode === 'mask' || mode === 'combined') && aggHasMask;

      if (inMaskOrCombinedAgg) {
        const t = clamped;
        // Combined mode: reveal merged bits progressively alongside the stamp.
        if (mode === 'combined') {
          const mergedBits = new Set();
          let minIdx = Infinity;
          for (const idx of selSteps) {
            if (idx < minIdx) minIdx = idx;
            const s = allSteps[idx];
            if (s && s.changedBits) for (let j = 0; j < s.changedBits.length; j++) mergedBits.add(s.changedBits[j]);
          }
          const sorted = Array.from(mergedBits).sort((a, b) => a - b);
          bs.fill(0);
          for (let i = 0; i < minIdx; i++) {
            const s = allSteps[i];
            for (let j = 0; j < s.changedBits.length; j++) {
              const bit = s.changedBits[j];
              if (bit < bs.length) bs[bit] = 1;
            }
          }
          const revealCount = Math.floor(t * sorted.length);
          for (let i = 0; i < revealCount; i++) {
            const bit = sorted[i];
            if (bit < bs.length) bs[bit] = 1;
          }
          r.bitState = bs;
          bitStateDirtyRef.current = revealCount < sorted.length;
        }
        const targetBits = (r.targetBits && r.targetBits.size > 0) ? r.targetBits : new Set(r.changedBits || []);
        r.changedBits = new Set(targetBits);
        const slotGroups = r._maskEntriesBySlot ? r._maskEntriesBySlot() : [];
        const ghostBits = new Set();
        if (slotGroups.length > 0) {
          for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
            const entries = slotGroups[groupIndex];
            if (!entries || entries.length === 0) continue;
            const segmentCount = Math.max(1, entries.length);
            const unit = t * segmentCount;
            const index = Math.min(entries.length - 1, Math.floor(unit));
            const local = Math.max(0, Math.min(1, unit - index));
            for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
              const isStamped = entryIndex < index || entryIndex === index || (entryIndex === index + 1 && local > 0.78);
              if (isStamped) continue;
              const bitsForEntry = r._maskEntryBits ? r._maskEntryBits(entries[entryIndex]) : [];
              for (let bi = 0; bi < bitsForEntry.length; bi++) ghostBits.add(bitsForEntry[bi]);
            }
          }
        } else if (r.targetBits?.size) {
          for (const bit of r.targetBits) ghostBits.add(bit);
        }
        r.showMaskWriteOverlay = false;
        r.setMaskGhostBits(ghostBits);
        r.render();
        const orderedWrites = r.maskWriteOrderWords?.length || 0;
        if (orderedWrites > 0) r.renderMaskHover(t);
        else r.renderMaskStamp(t);
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        r.showMaskWriteOverlay = true;
        if (mode === 'mask') bitStateDirtyRef.current = clamped < 0.999;
        return;
      }

      // Aggregate sequential/all-mode seek.
      const mergedSet = new Set();
      let minStepIdx = Infinity;
      for (const idx of selSteps) {
        if (idx < minStepIdx) minStepIdx = idx;
        const s = allSteps[idx];
        if (s && s.changedBits) {
          for (let j = 0; j < s.changedBits.length; j++) mergedSet.add(s.changedBits[j]);
        }
      }
      const aggBits = Array.from(mergedSet).sort((a, b) => a - b);
      if (aggBits.length > 0) {
        const isAllMode = (animMode !== 'sequential' && animMode !== 'bounce');
        bs.fill(0);
        for (let i = 0; i < minStepIdx; i++) {
          const s = allSteps[i];
          for (let j = 0; j < s.changedBits.length; j++) {
            const bit = s.changedBits[j];
            if (bit < bs.length) bs[bit] = 1;
          }
        }
        if (isAllMode) {
          // All-mode: all bits revealed; scrub maps to visual overlay.
          for (let i = 0; i < aggBits.length; i++) {
            const bit = aggBits[i];
            if (bit < bs.length) bs[bit] = 1;
          }
          bitStateDirtyRef.current = false;
          const changedFull = new Set(aggBits);
          r.bitState = bs;
          r.changedBits = changedFull;
          r.animationFocusBits = changedFull;
          r.render();
          if (animStyle === 'ripple') r.renderRipple(clamped);
          else if (animStyle === 'fade') r.renderFade(clamped);
          else if (animStyle === 'pulse') r.renderPulse(clamped);
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        } else {
          // Sequential: progressively reveal bits.
          const revealCount = bitsAtTimeRatioRef.current
            ? bitsAtTimeRatioRef.current(clamped, aggBits.length)
            : Math.round(clamped * aggBits.length);
          const targetIdx = Math.max(0, Math.min(aggBits.length - 1, revealCount - 1));
          const revealed = new Set();
          for (let i = 0; i <= targetIdx; i++) {
            const bit = aggBits[i];
            if (bit < bs.length) bs[bit] = 1;
            revealed.add(bit);
          }
          bitStateDirtyRef.current = targetIdx < aggBits.length - 1;
          const focusBits = new Set([aggBits[targetIdx]]);
          r.bitState = bs;
          r.changedBits = revealed;
          r.animationFocusBits = focusBits;
          r.render();
          if (animStyle === 'ripple') r.renderRipple(0.18, focusBits, { intensity: 1.1, showBeacon: true });
          else if (animStyle === 'pulse') r.renderPulse(0.28, focusBits, { intensity: 1.2, showHalo: true });
          else if (animStyle === 'fade') r.renderFade(0.35);
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        }
      }
      return;
    }

    // ── Single-step seek ───────────────────────────────────────────────────
    // Mask + combined seek: render the apply-mask group stamp animation frozen
    // at progress `clamped`. In combined mode we *also* roll bitState to a
    // partial reveal so the bits fill in alongside the stamp position.
    const mode = bitAnimationModeRef.current;
    const stepHasMask = !!(step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0
      && Number.isFinite(step.maskWordBits) && step.maskWordBits > 0);
    const inMaskOrCombined = (mode === 'mask' || mode === 'combined') && stepHasMask;
    if (inMaskOrCombined) {
      const t = clamped;

      // Combined mode: progressively reveal bits in bitState up to the
      // matching fraction of the step's changedBits.
      if (mode === 'combined' && step.changedBits && step.changedBits.length > 0) {
        const sorted = Array.from(step.changedBits).sort((a, b) => a - b);
        bs.fill(0);
        for (let i = 0; i < stepIdx; i++) {
          const s = allSteps[i];
          for (let j = 0; j < s.changedBits.length; j++) {
            const bit = s.changedBits[j];
            if (bit < bs.length) bs[bit] = 1;
          }
        }
        const revealCount = Math.floor(t * sorted.length);
        for (let i = 0; i < revealCount; i++) {
          const bit = sorted[i];
          if (bit < bs.length) bs[bit] = 1;
        }
        r.bitState = bs;
        bitStateDirtyRef.current = revealCount < sorted.length;
      }

      const targetBits = (r.targetBits && r.targetBits.size > 0) ? r.targetBits : new Set(step.changedBits || []);
      r.changedBits = new Set(targetBits);
      const slotGroups = r._maskEntriesBySlot ? r._maskEntriesBySlot() : [];
      const ghostBits = new Set();
      if (slotGroups.length > 0) {
        for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
          const entries = slotGroups[groupIndex];
          if (!entries || entries.length === 0) continue;
          const segmentCount = Math.max(1, entries.length);
          const unit = t * segmentCount;
          const index = Math.min(entries.length - 1, Math.floor(unit));
          const local = Math.max(0, Math.min(1, unit - index));
          for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
            const isStamped = entryIndex < index || entryIndex === index || (entryIndex === index + 1 && local > 0.78);
            if (isStamped) continue;
            const bitsForEntry = r._maskEntryBits ? r._maskEntryBits(entries[entryIndex]) : [];
            for (let bi = 0; bi < bitsForEntry.length; bi++) ghostBits.add(bitsForEntry[bi]);
          }
        }
      } else if (r.targetBits?.size) {
        for (const bit of r.targetBits) ghostBits.add(bit);
      }
      r.showMaskWriteOverlay = false;
      r.setMaskGhostBits(ghostBits);
      r.render();
      const orderedWrites = r.maskWriteOrderWords?.length || 0;
      if (orderedWrites > 0) r.renderMaskHover(t);
      else r.renderMaskStamp(t);
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      // Ensure subsequent animations start clean (stamp overlay is a one-shot).
      r.showMaskWriteOverlay = true;
      if (mode === 'mask') bitStateDirtyRef.current = clamped < 0.999;
      return;
    }

    // 'all' mode: all bits are revealed in one go; the scrub position maps to
    // the visual effect overlay progress (ripple/fade/pulse), not bit-reveal.
    const isAllMode = (animMode !== 'sequential' && animMode !== 'bounce');
    if (!inMaskOrCombined && isAllMode) {
      bs.fill(0);
      for (let i = 0; i <= stepIdx; i++) {
        const s = allSteps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const b = s.changedBits[j];
          if (b < bs.length) bs[b] = 1;
        }
      }
      bitStateDirtyRef.current = false;
      r.bitState = bs;
      const changedFull = new Set(step.changedBits);
      r.changedBits = changedFull;
      r.animationFocusBits = changedFull;
      r.render();
      if (animStyle === 'ripple') r.renderRipple(clamped);
      else if (animStyle === 'fade') r.renderFade(clamped);
      else if (animStyle === 'pulse') r.renderPulse(clamped);
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      return;
    }

    if (!step.changedBits || step.changedBits.length === 0) return;
    const bits = Array.from(step.changedBits).sort((a, b) => a - b);
    // Map the time-based scrub fraction to a bit count using the same curve
    // the playback uses, so what the user sees while scrubbing matches what
    // they would see at that same moment of automatic playback.
    const revealCount = bitsAtTimeRatioRef.current
      ? bitsAtTimeRatioRef.current(clamped, bits.length)
      : Math.round(clamped * bits.length);
    const targetIdx = Math.max(0, Math.min(bits.length - 1, revealCount - 1));

    // Rebuild bitState: state BEFORE the current step, then reveal bits up to target.
    bs.fill(0);
    for (let i = 0; i < stepIdx; i++) {
      const s = allSteps[i];
      for (let j = 0; j < s.changedBits.length; j++) {
        const bit = s.changedBits[j];
        if (bit < bs.length) bs[bit] = 1;
      }
    }
    const revealed = new Set();
    for (let i = 0; i <= targetIdx; i++) {
      const bit = bits[i];
      if (bit < bs.length) bs[bit] = 1;
      revealed.add(bit);
    }
    // If we didn't reveal every bit, bitState is in an intermediate state; mark
    // dirty so the next goToStep does a full rebuild (not an incremental merge).
    bitStateDirtyRef.current = targetIdx < bits.length - 1;

    const focusBits = new Set([bits[targetIdx]]);
    r.bitState = bs;
    r.changedBits = revealed;
    r.animationFocusBits = focusBits;
    r.render();
    if (animStyle === 'ripple') r.renderRipple(0.18, focusBits, { intensity: 1.1, showBeacon: true });
    else if (animStyle === 'pulse') r.renderPulse(0.28, focusBits, { intensity: 1.2, showHalo: true });
    else if (animStyle === 'fade') r.renderFade(0.35);
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
  }, [currentStep, animMode, animStyle, stopPlayback, stopSeqAnim, getMinimapDetailH]);

  // Pausable delay. Uses RAF so the global pause flag freezes the timer in
  // place. The promise resolves once `ms` of un-paused wall-clock time have
  // elapsed, so resuming after a pause continues counting down the remainder.
  const waitForDelay = useCallback((ms) => {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      let remaining = ms;
      let prev = performance.now();
      const tick = (now) => {
        const dt = now - prev;
        prev = now;
        if (!globalPausedRef.current) remaining -= dt;
        if (remaining <= 0) {
          seqTimerRef.current = null;
          resolve();
          return;
        }
        seqTimerRef.current = requestAnimationFrame(tick);
      };
      // We reuse seqTimerRef to hold either a setTimeout id or a RAF id;
      // stopSeqAnim cancels both.
      seqTimerRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const animateViewportTo = useCallback((targetView, duration = 650) => {
    const r = rendererRef.current;
    if (!r) return Promise.resolve();

    cancelViewportAnimation();

    return new Promise((resolve) => {
      const startPanX = r.panX;
      const startPanY = r.panY;
      const startZoom = r.zoom;
      const startedAt = performance.now();

      const tick = (now) => {
        const t = Math.min(1, (now - startedAt) / duration);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        r.panX = startPanX + (targetView.panX - startPanX) * eased;
        r.panY = startPanY + (targetView.panY - startPanY) * eased;
        r.zoom = startZoom + (targetView.zoom - startZoom) * eased;
        setZoom(r.zoom);
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());

        if (t < 1) {
          viewportAnimRef.current = requestAnimationFrame(tick);
          return;
        }

        viewportAnimRef.current = null;
        resolve();
      };

      viewportAnimRef.current = requestAnimationFrame(tick);
    });
  }, [cancelViewportAnimation, getMinimapDetailH]);

  const refitViewportToContent = useCallback((options = {}) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return Promise.resolve(false);

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return Promise.resolve(false);

    const savedView = { panX: r.panX, panY: r.panY, zoom: r.zoom };
    applyViewportFit(r, rect.width, rect.height);
    const targetView = { panX: r.panX, panY: r.panY, zoom: r.zoom };
    r.panX = savedView.panX;
    r.panY = savedView.panY;
    r.zoom = savedView.zoom;

    if (options.instant) {
      r.panX = targetView.panX;
      r.panY = targetView.panY;
      r.zoom = targetView.zoom;
      setZoom(r.zoom);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      return Promise.resolve(true);
    }

    return animateViewportTo(targetView, options.duration ?? 720).then(() => true);
  }, [animateViewportTo, getMinimapDetailH, applyViewportFit]);

  useEffect(() => {
    const cam = camera3DRef.current;
    if (!cam) return;
    // Enable camera and animate to the default tilt. Keyed on `cameraKey` so
    // this re-fires whenever the renderer effect creates a new Camera3D
    // instance (including React StrictMode's double-mount), keeping
    // cam.enabled always in sync with the mode3D=true React state.
    //
    // Do NOT reset rotateX/rotateY here. A freshly-created Camera3D already
    // initialises them to 0, so the reset would be a no-op in the normal
    // startup case. In the desync case (enableTiltAndResize() fired before
    // this effect ran and set rotateX=30), the reset would wrongly wipe that
    // angle, causing the first right-click drag to start from 0° instead of
    // the current tilt.
    cam.perspective = 1500;
    cam.enable();
    setCamera3DContainerStyle(cam.getContainerStyle());
    setCamera3DTransform(cam.getCanvasTransform());
    schedulePostLayoutRefresh(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refitViewportToContent({ instant: true });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraKey]);

  const navigateToBit = useCallback((bitIdx, targetKind = 'bit') => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el || bitIdx < 0 || bitIdx >= r.bitCount) return Promise.resolve(false);

    const rect = el.getBoundingClientRect();
    const targetPos = r.bitIndexToCanvas(bitIdx);
    if (!targetPos) return Promise.resolve(false);

    let targetZoom;
    switch (targetKind) {
      case 'vector': targetZoom = Math.min(8, Math.max(r.zoom * 1.8, 2.8)); break;
      case 'uint64': targetZoom = Math.min(10, Math.max(r.zoom * 2.0, 3.6)); break;
      case 'uint32':
      case 'byte': targetZoom = Math.min(12, Math.max(r.zoom * 2.2, 4.4)); break;
      default: targetZoom = Math.min(16, Math.max(r.zoom * 2.5, 6)); break;
    }

    const contentX = (targetPos.x - r.panX) / Math.max(0.0001, r.zoom);
    const contentY = (targetPos.y - r.panY) / Math.max(0.0001, r.zoom);
    const targetView = {
      panX: rect.width / 2 - contentX * targetZoom,
      panY: rect.height / 2 - contentY * targetZoom,
      zoom: targetZoom,
    };

    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      const planeW = r.canvasWidth || rect.width;
      const planeH = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
      return cam.flyTo(
        { canvasX: targetPos.x, canvasY: targetPos.y },
        { containerW: planeW, containerH: planeH, centerX: planeW / 2, centerY: planeH / 2 },
        { panX: r.panX, panY: r.panY, zoom: r.zoom },
        targetZoom,
        950,
      ).then(() => true);
    }

    return animateViewportTo(targetView, 520).then(() => true);
  }, [animateViewportTo]);

  // Search state + handler — extracted to src/hooks/useSearchState.js (Pattern A).
  // Placed here so navigateToBit is in scope for the hook's dep arrays.
  const {
    searchQuery, setSearchQuery,
    searchResult,
    searchOpen, setSearchOpen,
    handleSearch,
  } = useSearchState({ rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH });

  // Run a single ripple/fade/pulse effect on current changedBits
  // onProgress: optional (p: 0..1) => void callback for timeline tracking
  const runEffect = useCallback((style, durationOverride = null, onProgress = null) => {
    const r = rendererRef.current;
    if (!r || !r.changedBits || r.changedBits.size === 0) return Promise.resolve();
    // Cancel any in-flight runEffect (e.g. rapid mode-change calls).
    if (runEffectCancelRef.current) runEffectCancelRef.current();
    if (style === 'none') return Promise.resolve();

    const duration = Math.max(280, durationOverride || 600);
    const start = performance.now();
    // Snapshot seek generation so we can abort when the user scrubs or changes
    // animation mode mid-flight without waiting for the full duration.
    const capturedSeekGen = seekGenRef.current;
    return new Promise((resolve) => {
      // Expose a cancel callback so stopSeqAnim() can resolve this Promise
      // without leaving triggerAnimation() suspended at `await runEffect(…)`.
      runEffectCancelRef.current = () => {
        runEffectCancelRef.current = null;
        if (rippleRef.current) { cancelAnimationFrame(rippleRef.current); rippleRef.current = null; }
        resolve();
      };
      const animate = (now) => {
        // Abort: seekGenRef bumped externally (mode change or timeline scrub).
        if (seekGenRef.current !== capturedSeekGen) {
          runEffectCancelRef.current = null;
          rippleRef.current = null;
          resolve();
          return;
        }
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        if (onProgress) onProgress(progress);
        r.render();
        if (style === 'ripple') r.renderRipple(progress);
        else if (style === 'fade') r.renderFade(progress);
        else if (style === 'pulse') r.renderPulse(progress);
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        if (progress < 1) {
          rippleRef.current = requestAnimationFrame(animate);
        } else {
          runEffectCancelRef.current = null;
          rippleRef.current = null;
          resolve();
        }
      };
      rippleRef.current = requestAnimationFrame(animate);
    });
  }, [getMinimapDetailH]);

  const clampMs = useCallback(clampMsPure, []);

  const getAnimationTimingPlan = useCallback((bitCount, options = {}) => {
    if (!options.adaptiveDuration) return null;
    const count = Math.max(1, bitCount || 0);
    const requestedDuration = Number.isFinite(options.durationMs) ? clampMs(options.durationMs, 120, 30000) : null;
    const preferredInterval = Math.max(
      18,
      Number.isFinite(options.preferredIntervalMs)
        ? options.preferredIntervalMs
        : (currentAnimIntervalRef.current || bitAnimInterval || 20)
    );
    const preferredTotal = count * preferredInterval;
    const maxTotal = 10000;
    const minTotal = 2800;

    if (requestedDuration != null) {
      const interval = Math.max(5, requestedDuration / count);
      return { startInterval: interval, endInterval: interval, accelerateAfter: 1, totalDuration: requestedDuration };
    }

    if (preferredTotal <= minTotal) {
      const interval = minTotal / count;
      return { startInterval: interval, endInterval: interval, accelerateAfter: 1, totalDuration: minTotal };
    }

    if (preferredTotal <= maxTotal) {
      return { startInterval: preferredInterval, endInterval: preferredInterval, accelerateAfter: 1, totalDuration: preferredTotal };
    }

    const accelerateAfter = 0.68;
    const frontCount = Math.max(1, Math.floor(count * accelerateAfter));
    const tailCount = Math.max(1, count - frontCount);
    let startInterval = preferredInterval;
    let endInterval = Math.max(3, startInterval * 0.18);

    let tailBudget = maxTotal - frontCount * startInterval;
    if (tailBudget < tailCount * 3.5) {
      startInterval = Math.max(8, maxTotal / Math.max(1, frontCount + tailCount * 0.35));
      tailBudget = maxTotal - frontCount * startInterval;
    }
    if (tailBudget > 0) {
      const solvedEnd = ((tailBudget * 2) / tailCount) - startInterval;
      endInterval = Math.max(2, Math.min(startInterval * 0.4, solvedEnd));
    }

    let estimated = frontCount * startInterval + tailCount * ((startInterval + endInterval) / 2);
    if (estimated > maxTotal) {
      const scale = maxTotal / estimated;
      startInterval = Math.max(12, startInterval * scale);
      endInterval = Math.max(2, endInterval * scale);
      estimated = frontCount * startInterval + tailCount * ((startInterval + endInterval) / 2);
    }

    return {
      startInterval,
      endInterval,
      accelerateAfter,
      totalDuration: Math.max(minTotal, Math.min(maxTotal, estimated)),
      exponential: true,
    };
  }, [bitAnimInterval]);

  const getAnimationBitInterval = useCallback((bitCount, options = {}) => {
    const plan = options.adaptivePlan || getAnimationTimingPlan(bitCount, options);
    if (plan) return Math.max(0, plan.startInterval || 0);
    if (Number.isFinite(options.preferredIntervalMs)) {
      return Math.max(0, options.preferredIntervalMs);
    }
    return Math.max(0, currentAnimIntervalRef.current || bitAnimInterval || 20);
  }, [bitAnimInterval, getAnimationTimingPlan]);

  const getCurrentLoopInterval = useCallback((fallback, options = {}, progress = 0, focusBit = null) => {
    const plan = options.adaptivePlan || null;
    const baseInterval = (() => {
      if (!plan) return Math.max(0, currentAnimIntervalRef.current || fallback || 20);
      const clampedProgress = Math.max(0, Math.min(1, progress));
      if (clampedProgress <= plan.accelerateAfter) return Math.max(0, plan.startInterval || fallback || 20);
      const local = (clampedProgress - plan.accelerateAfter) / Math.max(0.0001, 1 - plan.accelerateAfter);
      if (plan.exponential && plan.startInterval > 0 && plan.endInterval > 0) {
        const ratio = plan.endInterval / Math.max(0.0001, plan.startInterval);
        return Math.max(0, plan.startInterval * Math.pow(ratio, local));
      }
      return Math.max(0, plan.startInterval + (plan.endInterval - plan.startInterval) * local);
    })();

    if (!Number.isFinite(focusBit) || !Array.isArray(options.pinnedBitIndices) || options.pinnedBitIndices.length === 0) {
      return baseInterval;
    }

    const groupBits = Math.max(1, Number(options.groupBits) || 64);
    const focusGroup = Math.floor(Number(focusBit) / groupBits);
    let slowFactor = 1;
    for (let index = 0; index < options.pinnedBitIndices.length; index++) {
      const pinnedBit = Number(options.pinnedBitIndices[index]);
      if (!Number.isFinite(pinnedBit) || pinnedBit < 0) continue;
      const pinnedGroup = Math.floor(pinnedBit / groupBits);
      const dist = Math.abs(pinnedGroup - focusGroup);
      if (dist === 0) {
        slowFactor = Math.max(slowFactor, 1.7);
      } else if (dist === 1) {
        slowFactor = Math.max(slowFactor, 1.35);
      } else if (dist === 2) {
        slowFactor = Math.max(slowFactor, 1.18);
      }
    }

    return baseInterval * slowFactor;
  }, []);

  useEffect(() => {
    currentAnimIntervalRef.current = Math.max(0, bitAnimInterval || 20);
  }, [bitAnimInterval]);

  useEffect(() => {
    currentMaskAnimIntervalRef.current = Math.max(0, maskAnimInterval || 20);
  }, [maskAnimInterval]);

  const getFadeOutDuration = useCallback((bitCount, options = {}) => (
    getFadeOutDurationPure(bitCount, options)
  ), []);

  // The "normal" (100% speed) time target for one event, in ms, picked from
  // the configurable tier table by the event's change count and clamped to
  // the configured min/max. Independent of the speed slider.
  const computeEventNormalDuration = useCallback((bitCount) => (
    computeEventNormalDurationPure(bitCount, eventTimeTargetsRef.current || DEFAULT_EVENT_TIME_TARGETS)
  ), []);

  // Time-based timeline duration: how long the timeline slider takes to walk
  // 0 -> 100 % for an event with `bitCount` changes. The total duration is
  // derived from the per-tier time targets table and divided by the speed %.
  // The mode (progressive vs linear) only affects HOW bits are distributed
  // across that duration (see bitsAtTimeRatio), not the total duration.
  const computeEventDuration = useCallback((bitCount, modeOverride = null) => {
    void modeOverride; // mode only changes bit distribution, not total time
    return computeEventDurationPure(
      bitCount,
      eventTimeTargetsRef.current || DEFAULT_EVENT_TIME_TARGETS,
      playSpeedPercentRef.current,
    );
  }, []);

  // Inverse of computeEventDuration's curve: given a time ratio (0..1) inside
  // an event's animation window, return how many bits should be revealed.
  // - 'linear': bits revealed uniformly across the timeline.
  // - 'progressive': three equal time-thirds receive (a) the first up-to-10
  //   bits, (b) the next up-to-100 bits, (c) the rest. Empty tiers are
  //   skipped so a 5-bit event still uses the full timeline.
  const bitsAtTimeRatio = useCallback((timeRatio, bitCount, modeOverride = null) => (
    bitsAtTimeRatioPure(timeRatio, bitCount, modeOverride || eventDurationModeRef.current || 'progressive')
  ), []);

  // Inverse of bitsAtTimeRatio: given a bit index N, return the time ratio
  // at which that bit would appear. Used to seed virtualElapsed when the
  // banner Play resumes from a paused scrub position.
  const timeRatioAtBitIndex = useCallback((bitIdx, bitCount, modeOverride = null) => (
    timeRatioAtBitIndexPure(bitIdx, bitCount, modeOverride || eventDurationModeRef.current || 'progressive')
  ), []);

  // Keep forward refs in sync so functions declared above can call these.
  computeEventDurationRef.current = computeEventDuration;
  bitsAtTimeRatioRef.current = bitsAtTimeRatio;
  timeRatioAtBitIndexRef.current = timeRatioAtBitIndex;

  const estimateAnimDuration = useCallback((bitCount, options = {}) => {
    const plan = options.adaptivePlan || getAnimationTimingPlan(bitCount, options);
    const effectiveBitInterval = getAnimationBitInterval(bitCount, { ...options, adaptivePlan: plan });
    const currentHighlighted = rendererRef.current?.changedBits?.size || 0;
    const fadeOutMs = currentHighlighted > 0 ? getFadeOutDuration(currentHighlighted, options) : 0;

    if (bitCount <= 0 || animStyle === 'none') {
      return fadeOutMs + (plan ? Math.min(3200, plan.totalDuration) : 0);
    }

    if (animMode === 'all' || effectiveBitInterval <= 0) {
      return fadeOutMs + (plan ? Math.min(3200, plan.totalDuration) : 620);
    }

    let revealMs = plan ? plan.totalDuration : bitCount * Math.max(10, effectiveBitInterval);
    if (animMode === 'bounce') {
      revealMs = plan ? Math.min(10000, revealMs * 1.35) : revealMs * 2;
    }

    return fadeOutMs + revealMs;
  }, [animMode, animStyle, getAnimationBitInterval, getAnimationTimingPlan, getFadeOutDuration]);

  const fadeOutCurrentHighlights = useCallback((options = {}) => {
    const r = rendererRef.current;
    const currentBits = options.fadeOutBits != null
      ? Array.from(options.fadeOutBits)
      : (r?.changedBits ? Array.from(r.changedBits) : []);
    if (!r || currentBits.length === 0 || options.skipFadeOut) return Promise.resolve();

    if (rippleRef.current) {
      cancelAnimationFrame(rippleRef.current);
      rippleRef.current = null;
    }

    const duration = getFadeOutDuration(currentBits.length, options);
    const fadingBits = new Set(currentBits);
    r.changedBits = fadingBits;
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / Math.max(1, duration));
        r.changedBits = fadingBits;
        r.render();
        r.renderFade(progress);
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        if (progress < 1) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }

        rippleRef.current = null;
        r.changedBits = new Set();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        resolve();
      };

      rippleRef.current = requestAnimationFrame(tick);
    });
  }, [getFadeOutDuration, getMinimapDetailH]);

  const runMaskStampAnimation = useCallback((bitIntervalMs = null, options = {}) => {
    const r = rendererRef.current;
    const maskWriteCount = r?.maskWriteOrderWords?.length || 0;
    const animationBits = r?.changedBits?.size ? r.changedBits : (r?.targetBits?.size ? r.targetBits : null);
    if (!r || (maskWriteCount === 0 && (!animationBits || animationBits.size === 0))) return Promise.resolve();
    const previousShowMaskOverlay = r.showMaskWriteOverlay !== false;
    r.showMaskWriteOverlay = false;

    const bits = animationBits ? Array.from(animationBits) : [];
    const groupBits = r.customGroupingBits > 0 ? r.customGroupingBits : Math.max(1, r.vectorGroup * 64);
    const groupCount = new Set(bits.map((b) => Math.floor(b / groupBits))).size;
    const orderedWrites = (() => {
      if (!r?.maskWriteOrderSlots || r.maskWriteOrderSlots.length === 0) return maskWriteCount;
      const perSlot = new Map();
      for (let index = 0; index < r.maskWriteOrderSlots.length; index++) {
        const slot = Number(r.maskWriteOrderSlots[index] ?? 0);
        perSlot.set(slot, (perSlot.get(slot) || 0) + 1);
      }
      let maxWrites = 0;
      for (const value of perSlot.values()) maxWrites = Math.max(maxWrites, value);
      return Math.max(maskWriteCount > 0 ? 1 : 0, maxWrites);
    })();
    const plan = options.adaptivePlan || getAnimationTimingPlan(Math.max(orderedWrites, groupCount, 1), options);
    const maskInterval = Math.max(5, Number(bitIntervalMs ?? currentMaskAnimIntervalRef.current ?? 20) || 20);
    // Prefer an explicit per-event duration (driven by computeEventDuration +
    // speed %). Falls back to the legacy interval-based math only when no
    // explicit duration was supplied. Either way the stamp animation now uses
    // the same time budget as the per-bit reveal so they stay in lockstep.
    const explicitDurationMs = Number.isFinite(options.durationMs)
      ? Math.max(120, options.durationMs)
      : null;
    const durationFromInterval = orderedWrites > 0
      ? Math.round(orderedWrites * maskInterval * 2.35)
      : Math.round(420 + groupCount * maskInterval * 1.2);
    const duration = explicitDurationMs != null
      ? clampMs(explicitDurationMs, 120, 120000)
      : clampMs(
        Math.max(durationFromInterval, plan ? plan.totalDuration * 0.55 : 0),
        420,
        60000,
      );
    const startedAt = performance.now();
    const slotGroups = orderedWrites > 0 ? r._maskEntriesBySlot() : [];
    // Virtual-time tracker: progress accumulates as dt × (initialInterval/liveInterval),
    // so mid-flight changes to the speed slider proportionally speed up or slow down
    // the in-progress mask stamp animation without restarting it.
    let virtualMs = 0;
    let prevTickAt = startedAt;
    const initialMaskInterval = maskInterval;

    // Pre-compute bits for each mask entry so _maskEntryBits isn't called every frame.
    const entryBitsCache = new Map();
    if (slotGroups.length > 0) {
      for (let gi = 0; gi < slotGroups.length; gi++) {
        const entries = slotGroups[gi];
        for (let ei = 0; ei < entries.length; ei++) {
          entryBitsCache.set(entries[ei], r._maskEntryBits(entries[ei]));
        }
      }
    }

    if (rippleRef.current) {
      cancelAnimationFrame(rippleRef.current);
      rippleRef.current = null;
    }

    // Honor a starting progress (used by the banner Play button when resuming
    // from a paused mask animation).
    const requestedStartProgress = Math.max(0, Math.min(1,
      Number(options.startProgress) || 0
    ));
    virtualMs = requestedStartProgress * duration;

    // Combined mode: progressively reveal the step's bits in lockstep with t
    // by flipping the supplied bitState. The renderer paints bits set in
    // bitState as "set", so the bits visibly fill in alongside the moving stamp.
    const combinedBits = options.combinedBits || null;
    let combinedRevealedUpTo = combinedBits
      ? Math.floor(requestedStartProgress * combinedBits.sortedBits.length)
      : 0;
    if (combinedBits && combinedRevealedUpTo > 0) {
      for (let i = 0; i < combinedRevealedUpTo; i++) {
        const bit = combinedBits.sortedBits[i];
        if (bit < combinedBits.bs.length) combinedBits.bs[bit] = 1;
      }
    }

    return new Promise((resolve) => {
      const startSeekGen = seekGenRef.current;
      const tick = (now) => {
        // Abort: user scrubbed — stop without touching the canvas.
        if (seekGenRef.current !== startSeekGen) { rippleRef.current = null; resolve(); return; }
        const dt = Math.max(0, now - prevTickAt);
        prevTickAt = now;
        // Pause-in-flight: keep the RAF loop running but stop accumulating
        // virtual time. The user perceives a perfectly frozen frame; clearing
        // globalPausedRef resumes from the exact same virtualMs.
        if (globalPausedRef.current) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }
        const liveInterval = Math.max(5, Number(currentMaskAnimIntervalRef.current) || initialMaskInterval);
        virtualMs += dt * (initialMaskInterval / liveInterval);
        const t = Math.min(1, virtualMs / duration);
        // Surface mask animation progress onto the banner Timeline slider so
        // it tracks the in-flight stamp animation.
        if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(t * 100));
        if (combinedBits) {
          const targetCount = Math.floor(t * combinedBits.sortedBits.length);
          while (combinedRevealedUpTo < targetCount) {
            const bit = combinedBits.sortedBits[combinedRevealedUpTo];
            if (bit < combinedBits.bs.length) combinedBits.bs[bit] = 1;
            combinedRevealedUpTo++;
          }
        }
        const ghostBits = new Set();
        if (slotGroups.length > 0) {
          for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
            const entries = slotGroups[groupIndex];
            const segmentCount = Math.max(1, entries.length);
            const unit = t * segmentCount;
            const index = Math.min(entries.length - 1, Math.floor(unit));
            const local = Math.max(0, Math.min(1, unit - index));
            for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
              const isStamped = entryIndex < index || entryIndex === index || (entryIndex === index + 1 && local > 0.78);
              if (isStamped) continue;
              const bitsForEntry = entryBitsCache.get(entries[entryIndex]) || [];
              for (let bitIndex = 0; bitIndex < bitsForEntry.length; bitIndex++) ghostBits.add(bitsForEntry[bitIndex]);
            }
          }
        } else if (r.targetBits?.size) {
          for (const bit of r.targetBits) ghostBits.add(bit);
        }
        r.setMaskGhostBits(ghostBits);
        r.render();
        if (orderedWrites > 0) r.renderMaskHover(t, slotGroups);
        else r.renderMaskStamp(t);
        // Skip minimap on mid-animation frames — the viewport doesn't change
        // during animation so it would render the same content every frame.
        // Render it once at completion below.
        if (t < 1) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }
        r.setMaskGhostBits(new Set());
        r.showMaskWriteOverlay = previousShowMaskOverlay;
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        rippleRef.current = null;
        resolve();
      };

      rippleRef.current = requestAnimationFrame(tick);
    });
  }, [getAnimationTimingPlan, getMinimapDetailH, clampMs]);

  // Main animation trigger — fade old highlights, animate current step, then wait using animation delay.
  const triggerAnimation = useCallback(async (changedSet, options = {}) => {
    // Capture the current seek generation. If seekStepAnimation() is called
    // while this async function is awaiting, the generation is bumped and
    // every subsequent tick will call resolve()+return without touching the
    // canvas, preventing the orphaned animation from overwriting the scrub.
    const mySeekGen = seekGenRef.current;
    const isStillLive = () => seekGenRef.current === mySeekGen;
    const resuming = (!!options.startIndex && options.startIndex > 0) ||
      (Number.isFinite(options.startProgress) && options.startProgress > 0);
    if (!options.keepProgress) {
      stopSeqAnimRef.current?.();
      // Reset the banner scrub slider at the start of a fresh animation.
      // When resuming from a paused position, keep the slider where it is.
      if (!resuming && stepScrubProgressRef.current) stepScrubProgressRef.current(0);
    }
    const r = rendererRef.current;
    // The mask stamp animation runs in 'mask' and 'combined' modes; pure 'bit'
    // mode forces the per-bit sequential reveal even when mask metadata exists.
    const mode = bitAnimationModeRef.current;
    const maskModeActive = mode === 'mask' || mode === 'combined';
    const combinedMode = mode === 'combined';
    const hasMaskAnimation = !!(maskModeActive && r && r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0 && Number.isFinite(r.maskWordBits) && r.maskWordBits > 0);
    // For mask/combined mode the animation iterates maskWriteOrderWords (not changedSet),
    // so large aggregates must not be blocked by the bit-count guard.
    if (!r || !changedSet || (!hasMaskAnimation && changedSet.size === 0) || (!hasMaskAnimation && changedSet.size >= 100000)) return;

    const animatedBitCount = changedSet.size > 0 ? changedSet.size : Math.max(1, r.targetBits?.size || r.maskWriteOrderWords?.length || 1);
    const timingBaseOptions = {
      ...options,
      pinnedBitIndices: options.pinnedBitIndices ?? pinnedBitIndices,
      groupBits: options.groupBits ?? effectiveGroupBits,
    };
    // The "between" delay defaults vary by caller:
    //  - All-events scheduler passes delayMs=delayBetweenEvents
    //  - Single-event replay loop passes delayMs=delayBetweenRepeats
    //  - Manual goToStep (non-playing) passes 0 (the replay loop handles its own gap)
    const delayMs = Math.max(0, timingBaseOptions.delayMs ?? 0);
    // Per-event normal duration drives both the per-bit reveal and the mask
    // stamp animation. Speed % is folded into computeEventDuration.
    const eventNormalMs = computeEventDurationRef.current
      ? computeEventDurationRef.current(animatedBitCount)
      : null;
    const requestedCycleDuration = Number.isFinite(timingBaseOptions.playbackDurationMs)
      ? Math.max(0, timingBaseOptions.playbackDurationMs)
      : null;
    const explicitDuration = Number.isFinite(timingBaseOptions.durationMs)
      ? Math.max(80, timingBaseOptions.durationMs)
      : null;
    const requestedAnimationDuration = explicitDuration != null
      ? explicitDuration
      : (requestedCycleDuration != null
        ? Math.max(120, requestedCycleDuration - delayMs)
        : eventNormalMs);
    const durationOptions = requestedAnimationDuration != null
      ? { ...timingBaseOptions, adaptiveDuration: true, durationMs: requestedAnimationDuration }
      : timingBaseOptions;
    const adaptivePlan = getAnimationTimingPlan(animatedBitCount, durationOptions);
    const timingOptions = adaptivePlan ? { ...durationOptions, adaptivePlan } : durationOptions;
    const effectiveBitInterval = getAnimationBitInterval(animatedBitCount, timingOptions);
    const est = estimateAnimDuration(animatedBitCount, timingOptions);
    const totalCycleDuration = requestedCycleDuration != null ? Math.max(requestedCycleDuration, est + delayMs) : est + delayMs;
    animBusyUntilRef.current = performance.now() + totalCycleDuration;

    if (!options.keepProgress && !resuming) {
      await fadeOutCurrentHighlights(options);
      // Abort if the user scrubbed while the fade-out was running.
      if (!isStillLive()) return;
    }

    if (hasMaskAnimation) {
      // Mask-only modes paint every changed bit as "set" up front (the stamp
      // overlays them). Combined mode starts with no highlighted bits and
      // grows the set in lockstep with the stamp animation, so users see the
      // bits being set one by one underneath the moving stamps.
      if (combinedMode) {
        r.changedBits = new Set();
      } else if (!r.changedBits || r.changedBits.size === 0) {
        r.changedBits = new Set(changedSet.size > 0 ? changedSet : (r.targetBits || []));
      }
      const { durationMs: _ignoredDurationMs, ...maskTimingBaseOptions } = timingOptions;
      void _ignoredDurationMs;
      // Use the unified per-event total duration for the mask animation so
      // bits and mask stamps share the same time budget, speed %, and the
      // same scrub progress mapping.
      const maskTotalDurationMs = requestedAnimationDuration != null
        ? requestedAnimationDuration
        : (computeEventDurationRef.current ? computeEventDurationRef.current(animatedBitCount) : null);
      // When resuming, seed virtualMs at the current scrub progress so the
      // stamp animation picks up where the user paused/scrubbed.
      const resumeStartProgress = resuming
        ? Math.max(0, Math.min(0.999, (Number(options.startProgress) ?? (stepScrubProgressRef.current ? 0 : 0)) || 0))
        : 0;
      // Combined mode: progressively reveal the step's bits during the stamp
      // animation. We roll bitState back to the state before the current step,
      // then let runMaskStampAnimation flip bits as `t` advances.
      let combinedBitsConfig = null;
      if (combinedMode) {
        const stepIdx = currentStep;
        const bs = bitStateRef.current;
        const allSteps = stepsRef.current;
        const step = allSteps[stepIdx];
        if (bs && step && step.changedBits && step.changedBits.length > 0) {
          const sorted = Array.from(step.changedBits).sort((a, b) => a - b);
          // Roll bs back to state-before-step
          bs.fill(0);
          for (let i = 0; i < stepIdx; i++) {
            const s = allSteps[i];
            for (let j = 0; j < s.changedBits.length; j++) {
              const bit = s.changedBits[j];
              if (bit < bs.length) bs[bit] = 1;
            }
          }
          // If resuming partway, seed bits up to the resume fraction so the
          // grid matches the slider position before the next tick advances.
          if (resumeStartProgress > 0) {
            const seedTo = Math.floor(resumeStartProgress * sorted.length);
            for (let i = 0; i < seedTo; i++) {
              const bit = sorted[i];
              if (bit < bs.length) bs[bit] = 1;
            }
          }
          r.bitState = bs;
          bitStateDirtyRef.current = true;
          combinedBitsConfig = { sortedBits: sorted, bs };
        }
      }
      const maskTimingOptions = {
        ...maskTimingBaseOptions,
        preferredIntervalMs: Math.max(0, currentMaskAnimIntervalRef.current || maskAnimInterval || 20),
        startProgress: resumeStartProgress,
        combinedBits: combinedBitsConfig,
        durationMs: maskTotalDurationMs,
      };
      const effectiveMaskBitInterval = Math.max(5, maskTimingOptions.preferredIntervalMs || 20);
      r.setMaskGhostBits(new Set(changedSet.size > 0 ? changedSet : (r.targetBits || [])));
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      // Surface state so the banner play/pause button + timeline track this animation.
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(true);
      if (!resuming && stepScrubProgressRef.current) stepScrubProgressRef.current(0);
      await runMaskStampAnimation(effectiveMaskBitInterval, maskTimingOptions);
      if (!isStillLive()) return;
      if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
      // Keep stepAnimRunning true across the post-animation delay so the
      // banner Play/Pause button stays in its "running" state — the user
      // perceives the looping replay as a single continuous animation.
      // Combined mode: settle bitState to fully include the step's bits at end.
      if (combinedMode && combinedBitsConfig) {
        const { sortedBits, bs } = combinedBitsConfig;
        for (let i = 0; i < sortedBits.length; i++) {
          const bit = sortedBits[i];
          if (bit < bs.length) bs[bit] = 1;
        }
        bitStateDirtyRef.current = false;
      }
      if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      if (!isStillLive()) return;
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
      return;
    }

    if ((animMode === 'sequential' || animMode === 'bounce') && effectiveBitInterval > 0) {
      const bits = Array.from(changedSet).sort((a, b) => a - b);
      const fullChanged = new Set(changedSet);
      // Optional start index: lets the banner Play button resume a paused reveal
      // from the current scrub position instead of restarting at 0.
      const requestedStart = Math.max(0, Math.min(
        bits.length - 1,
        parseInt(options.startIndex || 0, 10) || 0
      ));
      let idx = requestedStart;
      let direction = 1;
      let bounced = false;
      let revealCount = requestedStart;
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(true);
      let previousFocusBit = null;
      const trailSize = animMode === 'bounce' ? Math.min(8, Math.max(3, Math.round(bits.length / 18))) : 0;

      const buildBounceTrail = () => {
        const trail = [];
        for (let offset = 0; offset < trailSize; offset++) {
          const trailIdx = idx - direction * offset;
          if (trailIdx < 0 || trailIdx >= bits.length) continue;
          trail.push(bits[trailIdx]);
        }
        return trail;
      };

      await new Promise((resolve) => {
        // Time-driven reveal: virtualElapsed advances with un-paused wall
        // time, the curve maps elapsed-ratio to a target bit count, and the
        // loop terminates as soon as virtualElapsed >= totalDuration. This
        // guarantees the visible animation matches the timeline slider 1:1
        // and stops cleanly at 100 %.
        const totalDuration = Math.max(120, computeEventDurationRef.current
          ? computeEventDurationRef.current(bits.length)
          : bits.length * 50);
        const isBounce = animMode === 'bounce';
        // Resume from pause: seed virtualElapsed so we pick up where the
        // user paused/scrubbed. requestedStart is a bit index; convert to a
        // time ratio using the active mode's curve.
        let virtualElapsed = requestedStart > 0 && !isBounce && timeRatioAtBitIndexRef.current
          ? Math.min(totalDuration - 1, timeRatioAtBitIndexRef.current(requestedStart, bits.length) * totalDuration)
          : 0;
        let lastTickAt = performance.now();
        let lastRevealedCount = -1;

        const renderFrame = (revealedCount, focusBit, t) => {
          const partial = isBounce
            ? new Set(buildBounceTrail())
            : (() => {
                const value = new Set();
                const cap = Math.min(bits.length, revealedCount);
                for (let i = 0; i < cap; i++) value.add(bits[i]);
                return value;
              })();
          const focusBits = isBounce
            ? new Set(buildBounceTrail().slice(0, Math.max(1, Math.min(3, trailSize))))
            : new Set([focusBit]);
          r.changedBits = partial;
          r.animationFocusBits = focusBits;
          if (!isBounce && previousFocusBit != null && previousFocusBit !== focusBit) {
            r.addBitMotionTrail(previousFocusBit, focusBit, {
              duration: Math.max(220, Math.min(900, effectiveBitInterval * 10)),
              intensity: 1,
            });
          }
          r.render();
          r.renderBitMotionTrails();
          if (animStyle === 'ripple' && focusBits.size > 0) {
            r.renderRipple(0.18, focusBits, { intensity: isBounce ? 1.25 : 1.05, showBeacon: true });
          } else if (animStyle === 'pulse' && focusBits.size > 0) {
            r.renderPulse(0.28, focusBits, { intensity: isBounce ? 1.35 : 1.15, showHalo: true });
          } else if (animStyle === 'fade' && partial.size > 0) {
            r.renderFade(isBounce ? 0.22 : 0.35);
          }
          if (isBounce && partial.size > 0) {
            r.renderFade(0.25);
          }
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
          previousFocusBit = focusBit;
          if (stepScrubProgressRef.current) {
            stepScrubProgressRef.current(Math.round(Math.max(0, Math.min(1, t)) * 100));
          }
        };

        const tick = () => {
          if (!rendererRef.current) {
            resolve();
            return;
          }
          // Abort: user scrubbed the timeline while this RAF was pending.
          // Just resolve (not render) so the canvas keeps the scrubbed state.
          if (!isStillLive()) {
            resolve();
            return;
          }
          if (globalPausedRef.current) {
            lastTickAt = performance.now();
            seqTimerRef.current = requestAnimationFrame(tick);
            return;
          }
          const now = performance.now();
          virtualElapsed += Math.max(0, now - lastTickAt);
          lastTickAt = now;
          const t = Math.min(1, virtualElapsed / totalDuration);

          let revealedCount;
          let focusBit;
          if (isBounce) {
            const phase = t * 2; // 0..2
            const len = Math.max(1, bits.length - 1);
            idx = phase <= 1
              ? Math.round(phase * len)
              : Math.round((2 - phase) * len);
            idx = Math.max(0, Math.min(bits.length - 1, idx));
            revealedCount = idx + 1;
            focusBit = bits[idx];
          } else {
            revealedCount = Math.max(0, Math.min(bits.length, bitsAtTimeRatioRef.current
              ? bitsAtTimeRatioRef.current(t, bits.length)
              : Math.round(t * bits.length)));
            const fIdx = Math.max(0, Math.min(bits.length - 1, revealedCount - 1));
            focusBit = bits[fIdx];
            idx = fIdx;
          }

          if (revealedCount !== lastRevealedCount || isBounce) {
            renderFrame(revealedCount, focusBit, t);
            lastRevealedCount = revealedCount;
          } else {
            // Update the slider even on frames where no new bit appeared so
            // the timeline keeps moving smoothly inside long inter-bit gaps.
            if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(t * 100));
            // Re-render active motion trails every frame so their time-based
            // fade animates at full 60 fps even when no new bit was revealed.
            if (!isBounce && r.bitMotionTrails && r.bitMotionTrails.length > 0) {
              r.render();
              r.renderBitMotionTrails();
              if (animStyle === 'ripple' && r.animationFocusBits && r.animationFocusBits.size > 0) {
                r.renderRipple(0.18, r.animationFocusBits, { intensity: 1.05, showBeacon: true });
              } else if (animStyle === 'pulse' && r.animationFocusBits && r.animationFocusBits.size > 0) {
                r.renderPulse(0.28, r.animationFocusBits, { intensity: 1.15, showHalo: true });
              } else if (animStyle === 'fade' && r.changedBits && r.changedBits.size > 0) {
                r.renderFade(0.35);
              }
            }
          }

          if (t >= 1) {
            r.changedBits = fullChanged;
            r.animationFocusBits = new Set();
            r.render();
            r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
            if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
            resolve();
            return;
          }
          seqTimerRef.current = requestAnimationFrame(tick);
        };

        // Seed the pre-revealed bits so resume picks up visually from where
        // the pause left off instead of briefly flashing back to empty.
        const seededChangedBits = new Set();
        if (requestedStart > 0 && !isBounce) {
          for (let i = 0; i < requestedStart; i++) seededChangedBits.add(bits[i]);
        }
        r.changedBits = seededChangedBits;
        r.animationFocusBits = new Set();
        r.clearBitMotionTrails();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        seqTimerRef.current = requestAnimationFrame(tick);
      });

      r.animationFocusBits = new Set();
      if (!isStillLive()) return;
      if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      if (!isStillLive()) return;
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
      return;
    }

    if (animStyle === 'none') {
      r.changedBits = new Set(changedSet);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
      if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      return;
    }

    r.changedBits = new Set(changedSet);
    r.animationFocusBits = new Set(changedSet);
    if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(true);
    if (!options.keepProgress && !resuming && stepScrubProgressRef.current) stepScrubProgressRef.current(0);
    await runEffect(
      animStyle,
      timingOptions.adaptivePlan ? Math.min(3200, timingOptions.adaptivePlan.totalDuration) : undefined,
      (p) => { if (stepScrubProgressRef.current) stepScrubProgressRef.current(Math.round(p * 100)); },
    );
    if (!isStillLive()) return;
    r.animationFocusBits = new Set();
    if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
    if (delayMs > 0) setDelayPhaseMsRef.current(delayMs);
    await waitForDelay(delayMs);
    setDelayPhaseMsRef.current(null);
    if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
  }, [animMode, animStyle, runEffect, estimateAnimDuration, getMinimapDetailH, getAnimationBitInterval, getAnimationTimingPlan, getCurrentLoopInterval, runMaskStampAnimation, fadeOutCurrentHighlights, waitForDelay, pinnedBitIndices, effectiveGroupBits, maskAnimInterval, computeEventDuration]);

  useEffect(() => {
    triggerAnimationRef.current = triggerAnimation;
  }, [triggerAnimation]);

  // Initial render — delay one frame so the container has its final dimensions
  useEffect(() => {
    if (steps.length > 0) {
      initialHighlightHoldRef.current = true;
      setSingleEventWidgetRevealed(false);
      const raf = requestAnimationFrame(() => goToStep(0, { suppressHighlight: true }));
      return () => cancelAnimationFrame(raf);
    }
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

  const { buildCombinedSelectionOverlay } = useSelectionOverlay({ steps });

  const handleStepSelection = useCallback((stepIndex) => {
    stopPlayback();
    setSingleEventWidgetRevealed(true);
    goToStep(stepIndex);
  }, [stopPlayback, goToStep]);

  const handleMultiStepSelect = useCallback((nextSelection) => {
    stopPlayback();
    // Clear any leftover pause state so the aggregate animation loop starts immediately
    // rather than being held off by a previous Pause or single-event pause-in-flight.
    globalPausedRef.current = false;
    setAnimationReplayPaused(false);
    setSelectedSteps(nextSelection);
  }, [stopPlayback]);

  // Multi-step selection: merge changedBits from selected steps
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
    // Trigger the initial animation via the stable ref, NOT as a direct dependency.
    // Using triggerAnimation directly in deps causes this effect to re-fire whenever
    // animMode/animStyle change, which calls stopSeqAnim() inside the new triggerAnimation
    // and permanently hangs the selected-steps loop's `await triggerFn(...)` Promise
    // (cancelAnimationFrame prevents the RAF tick from resolving it). The loop picks up
    // new animMode/animStyle naturally on its next iteration via triggerAnimationRef.current.
    if (overlay.changedBits.size > 0) triggerAnimationRef.current?.(overlay.changedBits, { adaptiveDuration: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSteps, buildCombinedSelectionOverlay, getMinimapDetailH, updateMinimapAvailability]);

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
  const handlePlayPause = useCallback(() => {
    // Reveal the single-event widget on first play interaction.
    setSingleEventWidgetRevealed(true);
    // Resume from a pause-in-flight (could be paused via toolbar or banner).
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setAnimationReplayPaused(false);
      // The user resumed via the all-events button: choose all-events context.
      setSingleEventLoopActive(false);
      // If we were mid-trace, also resume the trace-level scheduler.
      if (currentStep < Math.max(0, steps.length - 1) || stepAnimRunning) {
        setPlaying(true);
      }
      return;
    }
    if (playing) {
      // Pause-in-flight: do NOT call stopSeqAnim or stopPlayback. We want
      // the active reveal/mask animation to freeze on its current frame so
      // a follow-up Play resumes from the same position.
      globalPausedRef.current = true;
      // Keep the per-event replay loop parked while paused so it doesn't
      // start auto-looping the current event behind the scenes.
      setAnimationReplayPaused(true);
      setSingleEventLoopActive(false);
      setPlaying(false);
      return;
    }
    // Off + at-end: rewind and play.
    if (currentStep >= Math.max(0, steps.length - 1)) {
      globalPausedRef.current = false;
      setAnimationReplayPaused(false);
      setSingleEventLoopActive(false);
      goToStep(0, { keepPlaying: true });
      setPlaying(true);
      return;
    }
    // Off, not paused: start trace playback from the current event.
    globalPausedRef.current = false;
    setAnimationReplayPaused(false);
    setSingleEventLoopActive(false);
    setPlaying(true);
  }, [playing, currentStep, steps.length, stepAnimRunning, goToStep]);

  // Banner play/pause: toggles the per-event sequential reveal.
  //  - Pause: halts the timeline AND pauses the trace-level autoplay so the
  //    top-bar Play/Pause button mirrors the paused state. Sets
  //    animationReplayPaused so the auto-replay loop stays parked.
  //  - Play: clears animationReplayPaused (which lets the existing replay
  //    loop run); the loop's first iteration uses stepResumeStartIndexRef so
  //    the reveal picks up at the user's slider position. If the slider is
  //    already at 100%, the play button restarts from the beginning instead.
  //    The loop itself handles the post-animation delay and auto-restart.
  const handleStepAnimToggle = useCallback(() => {
    // Pause-in-flight: freeze the running per-event animation in place. The
    // mask tick and sequential-reveal loop both poll globalPausedRef and
    // halt without tearing down their state, so a follow-up Play resumes
    // from the exact frame/bit/virtualMs.
    if ((stepAnimRunning || singleEventLoopActiveRef.current) && !globalPausedRef.current) {
      globalPausedRef.current = true;
      setAnimationReplayPaused(true);
      // The single-event button shows Pause while the loop is active OR
      // while globally paused — either way the user expects clicking it to
      // resume the SAME event. We park the loop here; a follow-up Play
      // re-arms singleEventLoopActive.
      setSingleEventLoopActive(false);
      setPlaying(false);
      return;
    }
    // Resume from a pause-in-flight (set by either toolbar or banner pause).
    // The user pressed Play on the single-event widget, so resume in
    // single-event context — keep the all-events scheduler off and arm the
    // per-event replay loop.
    if (globalPausedRef.current) {
      globalPausedRef.current = false;
      setAnimationReplayPaused(false);
      setSingleEventLoopActive(true);
      return;
    }
    const step = stepsRef.current[currentStep];
    if (!step) return;
    // For aggregates, check the renderer's current mask state (set by the
    // selectedSteps effect) rather than the individual step's mask data.
    const r = rendererRef.current;
    const isAggregate = selectedStepsRef.current.size > 1;
    const hasMaskData = isAggregate
      ? !!(r && r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0)
      : !!(step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0);
    const inMaskOrCombined = (bitAnimationModeRef.current === 'mask' || bitAnimationModeRef.current === 'combined')
      && hasMaskData;
    if (inMaskOrCombined) {
      // Resume the mask stamp animation from the current scrub fraction. If the
      // animation already reached the end, restart from 0.
      const finished = stepScrubProgress >= 99;
      stepResumeMaskProgressRef.current = finished ? 0 : stepScrubProgress / 100;
      stepResumeStartIndexRef.current = 0;
      setAnimationReplayPaused(false);
      setSingleEventLoopActive(true);
      return;
    }
    if (!step.changedBits || step.changedBits.length === 0) return;
    const totalBits = step.changedBits.length;
    const finished = stepScrubProgress >= 99;
    const startIndex = finished
      ? 0
      : Math.max(0, Math.min(totalBits - 1, Math.round((stepScrubProgress / 100) * (totalBits - 1))));
    stepResumeStartIndexRef.current = startIndex;
    stepResumeMaskProgressRef.current = 0;
    setAnimationReplayPaused(false);
    setSingleEventLoopActive(true);
  }, [stepAnimRunning, currentStep, stepScrubProgress, stopSeqAnim, freezeAnimationNow]);

  // Zoom
  const doZoom = useCallback((factor) => {
    const r = rendererRef.current;
    if (!r) return;
    r.zoom = Math.max(0.1, Math.min(64, r.zoom * factor));
    setZoom(r.zoom);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
    updateMinimapAvailability();
  }, [getMinimapDetailH, updateMinimapAvailability]);

  const resetZoom = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.unfreezeLayout();
      applyViewportFit(r, rect.width, rect.height);
      r.freezeLayout();
    } else {
      r.zoom = 1; r.panX = 0; r.panY = 0;
    }
    setZoom(r.zoom);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
    updateMinimapAvailability();
  }, [getMinimapDetailH, updateMinimapAvailability, applyViewportFit]);

  const handleIntroTransitionEnd = useCallback(() => {
    if (introTiltStartedRef.current) return;
    introTiltStartedRef.current = true;
    setIntroPhase('tilting');

    const cam = camera3DRef.current;
    if (!cam || !cam.enabled) {
      setIntroPhase('visible');
      return;
    }

    const targetTilt = Math.min(30, cam.maxTilt || 30);
    cam.cancelAllAnimations();
    cam.animateTo({ rotateX: targetTilt, rotateY: 0, perspective: 1500 }, 900)
      .then(() => {
        setIntroPhase('visible');
        schedulePostLayoutRefresh(null);
      })
      .catch(() => {
        setIntroPhase('visible');
      });
  }, [schedulePostLayoutRefresh]);

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
  const toggleTilt = useCallback(() => {
    const cam = camera3DRef.current;
    if (!cam || !cam.enabled) return;
    const newTiltActive = !tiltActive;
    setTiltActive(newTiltActive);
    const targetTilt = newTiltActive ? Math.min(30, cam.maxTilt || 30) : 0;
    cam.animateTo({ rotateX: targetTilt, rotateY: 0, perspective: 1500 }, 900)
      .then(() => schedulePostLayoutRefresh(null));
  }, [tiltActive, schedulePostLayoutRefresh]);

  // 3D mode toggle is removed — the app is always in 3D mode.
  // enableTiltAndResize handles the StrictMode desync case where cam.enabled
  // is false despite mode3D being always true.
  const enableTiltAndResize = useCallback(() => {
    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      // Already in 3D mode — nothing to do.
      return cam;
    }
    if (cam && !cam.enabled) {
      // StrictMode desync: cam.enabled is false but mode3D is always true.
      // Re-enable the camera at its current rotateX (preserving any angle set
      // by the startup animation). If rotateX is still 0, snap to the default
      // tilt so the first drag starts there.
      cam.cancelAllAnimations();
      if (Math.abs(cam.rotateX) < 0.5) cam.rotateX = Math.min(16, cam.maxTilt || 16);
      cam.perspective = 1500;
      cam.enable();
      setCamera3DContainerStyle(cam.getContainerStyle());
      schedulePostLayoutRefresh(null);
      requestAnimationFrame(() => requestAnimationFrame(() => refitViewportToContent({ instant: true })));
      return cam;
    }
    return camera3DRef.current;
  }, [camera3DRef, setCamera3DContainerStyle, schedulePostLayoutRefresh, refitViewportToContent]);

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

  const openDetailInspector = useCallback((mode = 'bits') => {
    setDetailInspectorMode(mode === 'numbers' ? 'numbers' : 'bits');
    setDetailInspectorQuery('');
    setDetailInspectorOpen(true);
  }, []);

  const getBitBalloonGeometry = useCallback((bitIndex) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return null;

    const metrics = getCanvasPlaneMetrics();
    if (!metrics) return null;
    const { rect, planeW, planeH, planeOffsetX, planeOffsetY, canvasToViewport } = metrics;

    const pos = r.bitIndexToCanvas(bitIndex);
    if (!pos) return null;
    const cam = camera3DRef.current;
    const projected = canvasToViewport
      ? canvasToViewport(pos.x, pos.y)
      : cam && cam.enabled
      ? cam.canvasToScreen(pos.x, pos.y, planeW, planeH, planeOffsetX, planeOffsetY)
      : { x: pos.x - planeOffsetX, y: pos.y - planeOffsetY };
    if (!projected) return null;
    const anchorX = canvasToViewport ? projected.x : rect.left + projected.x;
    const anchorY = canvasToViewport ? projected.y : rect.top + projected.y;
    const bitHalf = Math.max(2.5, (r.pixelSize || 2) * (r.zoom || 1) * 0.52);

    // The anchor (the bit itself) must lie inside the grid container; otherwise
    // the balloon would be adrift from its bit and should fade out.
    const edgeMargin = 4;
    const anchorInsideGrid =
      anchorX >= rect.left + edgeMargin &&
      anchorX <= rect.right - edgeMargin &&
      anchorY >= rect.top + edgeMargin &&
      anchorY <= rect.bottom - edgeMargin;

    const sideInsetLeft = eventsPanelCollapsed ? 80 : Math.max(120, panelWidth + 32);
    const sideInsetRight = settingsCollapsed ? 48 : (isMacPlatform ? 388 : 328);
    const panelApproxHalfW = 170;
    const minLeft = sideInsetLeft + panelApproxHalfW;
    const maxLeft = window.innerWidth - sideInsetRight - panelApproxHalfW;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, anchorX));

    const detailPad = detailOpen ? detailHeight + 22 : 56;
    const minTop = 96;
    const maxTop = window.innerHeight - detailPad;
    const clampedTop = Math.max(minTop, Math.min(maxTop, anchorY - 72));

    return { left: clampedLeft, top: clampedTop, anchorX, anchorY, bitHalf, anchorInsideGrid };
  }, [getCanvasPlaneMetrics, eventsPanelCollapsed, panelWidth, settingsCollapsed, detailOpen, detailHeight]);

  const getVisibleBalloonStyles = useCallback((items) => {
    const approxWidth = 320;
    const approxHeight = 238;
    const margin = 18;
    const visualGap = 14;
    const placed = [];
    const result = {};

    // Collect the bounding rects of all overlays the balloon shouldn't cross.
    // If a balloon's computed box intersects any of these (or goes above the
    // titlebar), we mark it hidden — the CSS transition on `.bit-history-panel`
    // animates the hide/show.
    // We only hide a balloon when it actually can't fit: off-screen, under the
    // toolbar, or inside a "hard" side/bottom panel. The floating event-title
    // banner and the minimap are intentionally excluded — they're small and the
    // candidate-placement loop below generally finds room around them.
    const overlayRects = (() => {
      if (typeof document === 'undefined') return [];
      const selectors = [
        '.toolbar',
        '.events-panel:not(.collapsed)',
        '.settings-sidebar:not(.collapsed)',
        '.detail-panel.open',
        '.timing-panel',
        '.joined-events-widget',
      ];
      const rects = [];
      for (const sel of selectors) {
        const nodes = document.querySelectorAll(sel);
        for (const n of nodes) {
          const r = n.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) rects.push(r);
        }
      }
      return rects;
    })();
    const toolbarBottom = overlayRects
      .filter((r) => r.top <= 4) // titlebar-like rows
      .reduce((m, r) => Math.max(m, r.bottom), 0);

    const normalized = items
      .map((item) => {
        const geom = getBitBalloonGeometry(item.bitIndex);
        return geom ? { ...item, ...geom } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.anchorY - b.anchorY) || (a.anchorX - b.anchorX));

    // Shared clamping bounds (constant across candidates for this layout).
    const minLeft = eventsPanelCollapsed ? 170 : Math.max(200, panelWidth + 44);
    const maxLeft = window.innerWidth - (settingsCollapsed ? 48 : 360) - 170;
    const minTopClamp = Math.max(96, toolbarBottom + approxHeight + 8);

    for (const item of normalized) {
      // Hide balloon when the anchor bit is visually behind the events panel.
      const evPanelRight = eventsPanelCollapsed ? 32 : panelWidth;
      if (item.anchorX < evPanelRight) {
        result[`${item.kind}-${item.bitIndex}`] = { visible: false };
        continue;
      }

      const candidates = [
        { left: item.left, top: item.top },
        { left: item.left - 180, top: item.top - 10 },
        { left: item.left + 180, top: item.top - 10 },
        { left: item.left, top: item.top - 44 },
        { left: item.left - 220, top: item.top - 52 },
        { left: item.left + 220, top: item.top - 52 },
      ];

      let chosen = null;
      let chosenBox = null;
      for (const candidate of candidates) {
        // Clamp each candidate before overlap-checking so two candidates that
        // clamp to the same position are correctly seen as identical/overlapping.
        const cl = Math.max(minLeft, Math.min(maxLeft, candidate.left));
        const ct = Math.max(minTopClamp, candidate.top);
        const box = {
          left: cl - approxWidth / 2,
          right: cl + approxWidth / 2,
          top: ct - approxHeight - visualGap,
          bottom: ct - visualGap,
        };
        const overlaps = placed.some((other) => (
          box.left < other.right + margin &&
          box.right > other.left - margin &&
          box.top < other.bottom + margin &&
          box.bottom > other.top - margin
        ));
        if (!overlaps) {
          chosen = { left: cl, top: ct };
          chosenBox = box;
          break;
        }
      }

      if (!chosen) {
        const direction = placed.length % 2 === 0 ? 1 : -1;
        const cl = Math.max(minLeft, Math.min(maxLeft, item.left + direction * (120 + placed.length * 18)));
        const ct = Math.max(minTopClamp, item.top - 68 - placed.length * 10);
        chosen = { left: cl, top: ct };
        chosenBox = {
          left: cl - approxWidth / 2,
          right: cl + approxWidth / 2,
          top: ct - approxHeight - visualGap,
          bottom: ct - visualGap,
        };
      }

      const clampedLeft = chosen.left;
      const clampedTop = chosen.top;
      const box = chosenBox || {
        left: clampedLeft - approxWidth / 2,
        right: clampedLeft + approxWidth / 2,
        top: clampedTop - approxHeight - visualGap,
        bottom: clampedTop - visualGap,
      };
      // Hide only when a substantial portion of the balloon overlaps an overlay
      // or falls off-screen. A small edge-touch (< 12px) doesn't count as clipped.
      const overlapThresholdPx = 12;
      const intersectsOverlay = overlayRects.some((r) => {
        const ix = Math.min(box.right, r.right) - Math.max(box.left, r.left);
        const iy = Math.min(box.bottom, r.bottom) - Math.max(box.top, r.top);
        return ix > overlapThresholdPx && iy > overlapThresholdPx;
      });
      const offscreen =
        box.left < -4 || box.right > window.innerWidth + 4 ||
        box.top < -4 || box.bottom > window.innerHeight + 4;
      // If the anchor bit itself is outside the grid container (panned off or
      // behind a panel), the balloon is no longer attached to anything visible
      // and should fade regardless of where the clamp placed it.
      const anchorOutside = item.anchorInsideGrid === false;
      const visible = !intersectsOverlay && !offscreen && !anchorOutside;
      placed.push(box);
      result[`${item.kind}-${item.bitIndex}`] = {
        visible,
        panelStyle: {
          left: clampedLeft,
          top: clampedTop,
        },
        connector: {
          anchorX: item.anchorX,
          anchorY: item.anchorY,
          bitHalf: item.bitHalf,
          box,
        },
      };
    }

    return result;
  }, [getBitBalloonGeometry, eventsPanelCollapsed, panelWidth, settingsCollapsed]);

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

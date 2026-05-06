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
import { useLoadingOverlayLifecycle } from './hooks/useLoadingOverlayLifecycle';
import { useRendererLayoutSync } from './hooks/useRendererLayoutSync';
import { usePanelResizeRefresh } from './hooks/usePanelResizeRefresh';
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
import {
  DEFAULT_LAYOUT_SETTINGS as DEFAULT_SETTINGS,
  DEFAULT_EVENT_TITLE_SETTINGS,
  writeViewPrefs,
  getInitialViewState,
} from './lib/viewPrefs';
import { buildTraceInfoSections } from './lib/traceHeader';
import { detectIsMac, detectIsWindows, detectIsElectron } from './lib/platform';
import { useCanvasLayout } from './hooks/useCanvasLayout';
import { usePointerGestures } from './hooks/usePointerGestures';

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

  const { updateMinimapAvailability } = useMinimapAvailability({
    rendererRef,
    containerRef,
    showMinimap,
    setMinimapAvailable,
  });

  const {
    getCanvasTargetSize,
    getCanvasPlaneMetrics,
    captureViewportAnchor,
    refreshCanvasLayout,
    forceGlRedraw,
  } = useCanvasLayout({
    rendererRef,
    containerRef,
    glCanvasRef,
    glRendererRef,
    glyphCanvasRef,
    wrapperCanvasRef,
    glCssUnlockTokenRef,
    glCssUnlockRafRef,
    glCssUnlockTimeoutRef,
    glCssLockStateRef,
    camera3DRef,
    camera3DTransform,
    debugGlAutoOffsetYRef,
    debugGlOffsetXRef,
    debugGlOffsetYRef,
    canvasAnchorPx,
    debugGlOffsetX,
    debugGlOffsetY,
    debugGlAutoOffsetY,
    setDebugGlAutoOffsetY,
    setCamera3DTransform,
    setCamera3DContainerStyle,
    setAutoFitColumnCount,
    showMinimap,
    updateMinimapAvailability,
    getMinimapDetailH,
  });

  const { computeBitInfo } = useBitInfo({ rendererRef, stepsRef, wheelDefinition });

  const { updateDetailOpen, updateDetailHeight } = useDetailPanelStateSync({
    detailOpenRef,
    setDetailOpen,
    detailHeightRef,
    setDetailHeight,
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
  });

  useLoadingOverlayLifecycle({
    rendererRef,
    header,
    introTiltStartedRef,
    setIntroPhase,
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

  useRendererLayoutSync({
    rendererRef,
    theme,
    layoutSettings,
    showMinimap,
    colorPreset,
    customColors,
    canvasColors,
    storageModel,
    wheelDefinition,
    cachelineSize,
    heatMapEnabled,
    cachelineAnnotation,
    primeOverlayEnabled,
    rangeOverlayEnabled,
    rangeOverlayStart,
    rangeOverlayEnd,
    multiplesOverlayEnabled,
    multiplesOverlayPrime,
    gridOpacity,
    updateMinimapAvailability,
    debugCalibrationMode,
    prevLayoutRef,
    containerRef,
    mode3D,
    stepsRef,
    currentStepRef,
    setZoom,
    setAutoFitColumnCount,
    getMinimapDetailH,
  });

  usePanelResizeRefresh({
    panelWidth,
    showMinimap,
    detailOpen,
    detailHeight,
    refreshCanvasLayout,
    clearScheduledLayoutRefresh,
    captureViewportAnchor,
    pendingResizeAnchorRef,
  });

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

  usePointerGestures({
    rendererRef,
    containerRef,
    camera3DRef,
    getCanvasPlaneMetrics,
    getMinimapDetailH,
    updateMinimapAvailability,
    enableTiltAndResize,
    scheduleBalloonRelayout,
    schedulePostLayoutRefresh,
    seekStepAnimation,
    computeBitInfo,
    setZoom,
    setHoveredBitInfo,
    setPinnedBitIndices,
    setBalloonLiveLayout,
    balloonsEnabled,
    balloonClickEnabled,
    balloonHoverEnabled,
    lastHoveredIdxRef,
    balloonLiveLayoutTimerRef,
    stepScrubProgressValueRef,
    globalPausedRef,
  });

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

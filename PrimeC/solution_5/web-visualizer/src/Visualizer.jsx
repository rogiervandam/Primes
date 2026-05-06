import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SieveRenderer } from './SieveRenderer';
import { BitGridGLWorker, isWorkerGLSupported } from './renderer/gl/BitGridGLWorker';
import { GlyphTextGLCore } from './renderer/gl/GlyphTextGLCore';
import EventsPanel from './EventsPanel';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import TimingPanel from './TimingPanel';
import Toolbar from './visualizer/Toolbar';
import ExportProgress from './visualizer/ExportProgress';
import CanvasStage from './visualizer/CanvasStage';
import VisualizerMainContent from './visualizer/VisualizerMainContent';
import EventTitleBanner from './visualizer/EventTitleBanner';
import JoinedEventsWidget from './visualizer/JoinedEventsWidget';
import DetailInspectorOverlay from './visualizer/DetailInspectorOverlay';
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
import { useBalloonGeometry } from './hooks/useBalloonGeometry';
import { useSeekStepAnimation } from './hooks/useSeekStepAnimation';
import { useViewportNavigation } from './hooks/useViewportNavigation';
import { useViewportAnchoring } from './hooks/useViewportAnchoring';
import StatusBanners from './visualizer/StatusBanners';
import {
  DEFAULT_EVENT_TITLE_SETTINGS,
  getInitialViewState,
} from './lib/viewPrefs';
import { buildTraceInfoSections } from './lib/traceHeader';
import { detectIsMac, detectIsWindows, detectIsElectron } from './lib/platform';
import { useCanvasLayout } from './hooks/useCanvasLayout';
import { usePointerGestures } from './hooks/usePointerGestures';
import { useCanvasAnchorSync } from './hooks/useCanvasAnchorSync';
import { useViewPrefsSync } from './hooks/useViewPrefsSync';
import { useStepDisplayData } from './hooks/useStepDisplayData';
import { useCanvasStyles } from './hooks/useCanvasStyles';
import { useDetailInspectorRows } from './hooks/useDetailInspectorRows';
import { useRendererPipeline } from './hooks/useRendererPipeline';
import { useAnimationPipeline } from './hooks/useAnimationPipeline';
import { useTiltState } from './hooks/useTiltState';
import { useVisualizerEffects } from './hooks/useVisualizerEffects';
import { useStepAnimContent } from './hooks/useStepAnimContent';
import { ThemeProvider } from './contexts/ThemeContext';
import { PlaybackProvider } from './contexts/PlaybackContext';
import { AnimationConfigProvider } from './contexts/AnimationConfigContext';
import { PanelLayoutProvider } from './contexts/PanelLayoutContext';

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
    isGlUnavailable, setIsGlUnavailable,
    glDebugInfo, setGlDebugInfo,
    isDebugToolsOpen, setIsDebugToolsOpen,
    debugLayerMode, setDebugLayerMode,
    debugGlOffsetX, setDebugGlOffsetX,
    debugGlOffsetY, setDebugGlOffsetY,
    debugGlAutoOffsetY, setDebugGlAutoOffsetY,
    isDebugCalibrationMode, setIsDebugCalibrationMode,
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
    isSingleEventLoopActive, setIsSingleEventLoopActive, isSingleEventLoopActiveRef,
    isAutoAnimateOnSelect, setIsAutoAnimateOnSelect, isAutoAnimateOnSelectRef,
    isAnimationReplayPaused, setIsAnimationReplayPaused,
    isScrubbingTopRef,
    stepScrubProgress, setStepScrubProgress, stepScrubProgressRef, stepScrubProgressValueRef,
    delayPhaseMs, setDelayPhaseMsRef,
    isStepAnimRunning, setIsStepAnimRunningRef, isStepAnimRunningRefForScheduler,
    stepResumeStartIndexRef, stepResumeMaskProgressRef,
    currentAnimIntervalRef, currentMaskAnimIntervalRef,
    pausedStepAnimLoopRef, selectedAnimLoopRef,
    handleBitAnimationModeChange,
  } = useStepAnimation({ initialPrefs });

  const { globalPausedRef, seekGenRef, animBusyUntilRef } = usePlaybackClock();

  const {
    isHeatMapEnabled, setIsHeatMapEnabled,
    cachelineAnnotation, setCachelineAnnotation,
    isPrimeOverlayEnabled, setIsPrimeOverlayEnabled,
    isRangeOverlayEnabled, setIsRangeOverlayEnabled,
    rangeOverlayStart, setRangeOverlayStart,
    rangeOverlayEnd, setRangeOverlayEnd,
    isMultiplesOverlayEnabled, setIsMultiplesOverlayEnabled,
    multiplesOverlayPrime, setMultiplesOverlayPrime,
    cachelineSize, setCachelineSize,
    cachePreset, setCachePreset,
  } = useOverlays();

  const {
    introPhase, setIntroPhase,
    introTiltStartedRef,
    isTopbarPlaybackReady,
    loadingOverlayPhase, setLoadingOverlayPhase,
    isUiChromeVisible, setIsUiChromeVisible,
    overlayBarPct, setOverlayBarPct,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
    loadCompleteRef,
    loadProgressRef,
  } = useIntroSequence({ loadComplete, loadProgress });

  const {
    isAllEventsWidgetHidden, setIsAllEventsWidgetHidden,
    isSingleEventWidgetRevealed, setIsSingleEventWidgetRevealed,
    isAllEventsInDetailPanel, setIsAllEventsInDetailPanel,
    areWidgetsJoined, setAreWidgetsJoined,
    joinBannerRect, setJoinBannerRect,
    pendingBannerDragStart, setPendingBannerDragStart,
    revealStepRequest, setRevealStepRequest,
    isTimingPanelOpen, setIsTimingPanelOpen,
    timingFocusOp, setTimingFocusOp,
    isDetailInspectorOpen, setIsDetailInspectorOpen,
    detailInspectorMode, setDetailInspectorMode,
    detailInspectorQuery, setDetailInspectorQuery,
  } = useWidgetState({ initialPrefs });

  const {
    isEventsPanelCollapsed, setIsEventsPanelCollapsed,
    isSettingsCollapsed, setIsSettingsCollapsed,
    isDetailOpen, setIsDetailOpen, isDetailOpenRef,
    isMinimapVisible, setIsMinimapVisible,
    isMinimapAvailable, setIsMinimapAvailable,
    panelWidth, setPanelWidth,
    detailHeight, setDetailHeight, detailHeightRef,
    detailWidth, setDetailWidth,
    stepStats, setStepStats,
    settingsActiveTab, setSettingsActiveTab,
    settingsTabRequest, setSettingsTabRequest,
    deferredPanelStateRef,
  } = usePanelState({ initialPrefs, introPhase, isSingleEventWidgetRevealed });

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
  const [isTraceInfoVisible, setIsTraceInfoVisible] = useState(false);
  const [isShortcutsHelpVisible, setIsShortcutsHelpVisible] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState(initialPrefs.layoutSettings);
  const [autoFitColumnCount, setAutoFitColumnCount] = useState(0);
  const [eventTitleSettings, setEventTitleSettings] = useState(initialPrefs.eventTitleSettings);
  const [storageModel, setStorageModel] = useState(header.storageModel || 'half');
  useEffect(() => {
    setStorageModel(header.storageModel || 'half');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header]);

  // Derived values
  const areControlsHidden = isEventsPanelCollapsed && !isAllEventsWidgetHidden;
  const balloonMode = layoutSettings.balloonMode || 'click-hover';
  const areBalloonsEnabled = balloonMode !== 'off';
  const isBalloonClickEnabled = balloonMode === 'bit-clock' || balloonMode === 'click-hover';
  const isBalloonHoverEnabled = balloonMode === 'click-hover';

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

  const { getMinimapDetailH } = useMinimapDetailHeight({ isDetailOpenRef, detailHeightRef });

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
    isMinimapVisible,
    setIsMinimapAvailable,
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
    isMinimapVisible,
    updateMinimapAvailability,
    getMinimapDetailH,
  });

  const { computeBitInfo } = useBitInfo({ rendererRef, stepsRef, wheelDefinition });

  const { updateDetailOpen, updateDetailHeight } = useDetailPanelStateSync({
    isDetailOpenRef,
    setIsDetailOpen,
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
    if (setIsStepAnimRunningRef.current) setIsStepAnimRunningRef.current(false);
  }, [seqTimerRef, runEffectCancelRef, setIsStepAnimRunningRef]);

  useEffect(() => {
    stopSeqAnimRef.current = stopSeqAnim;
  }, [stopSeqAnim]);



  // Keep the canvas pinned to the VIEWPORT center (not the container
  // center) so panel collapse/expand transitions don't slide the
  // (stable) canvas content across the screen.
  useCanvasAnchorSync({ containerRef, wrapperCanvasRef, setCanvasAnchorPx });

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
    isDetailOpen,
    settingsActiveTab,
    isSettingsCollapsed,
    setIsAllEventsInDetailPanel,
    setIsAllEventsWidgetHidden,
    setEventTitleSettings,
    setIsEventsPanelCollapsed,
    setJoinBannerRect,
    setRevealStepRequest,
    setIsSettingsCollapsed,
    setSettingsTabRequest,
    setAreWidgetsJoined,
    updateDetailOpen,
  });




  // Don't persist panel states that were forced closed during loading; only
  // save what the user intentionally chose after the intro animation finishes.
  useViewPrefsSync({
    introPhase,
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
    isAllEventsWidgetHidden,
    areWidgetsJoined,
    isAllEventsInDetailPanel,
    isAutoAnimateOnSelect,
    isEventsPanelCollapsed,
    isSettingsCollapsed,
    isDetailOpen,
  });

  const effectiveGroupBits = useMemo(() => (
    layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64)
  ), [layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup]);

  useRendererPipeline({
    // useRendererBootstrap
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
    // useLoadingOverlayLifecycle
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
    // minimap inset effect
    isSettingsCollapsed,
    isMacPlatform,
    isMinimapVisible,
    updateMinimapAvailability,
    // useRendererLayoutSync
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
    containerRef,
    mode3D,
    stepsRef,
    currentStepRef,
    setAutoFitColumnCount,
    // usePanelResizeRefresh
    panelWidth,
    isDetailOpen,
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
    setIsSingleEventLoopActive,
    setIsAnimationReplayPaused,
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
  });

  const {
    rawScrollToLine,
    onJumpToStep,
    onClearRawScrollToLine,
    onOpenRawLog,
  } = useRawLogNavigation({
    setIsTraceInfoVisible,
    goToStep,
    revealCurrentStepInPanel,
    fetchRawSource,
    steps,
    currentStep,
  });

  useAnimationPipeline({
    // usePausableDelay
    globalPausedRef,
    seqTimerRef,
    // useRunEffect
    rendererRef,
    runEffectCancelRef,
    rippleRef,
    seekGenRef,
    getMinimapDetailH,
    // useAnimationTimingRuntime
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
    // useMaskStampAnimation
    stepScrubProgressRef,
    // useTriggerAnimation
    bitAnimationModeRef,
    pinnedBitIndices,
    effectiveGroupBits,
    animBusyUntilRef,
    currentStep,
    bitStateRef,
    stepsRef,
    bitStateDirtyRef,
    setDelayPhaseMsRef,
    setIsStepAnimRunningRef,
    stopSeqAnimRef,
    // triggerAnimationRef sync + animMode/animStyle replay
    triggerAnimationRef,
    isSingleEventLoopActiveRef,
    selectedAnimLoopRef,
    stepScrubProgressValueRef,
    stepResumeStartIndexRef,
    stepResumeMaskProgressRef,
    currentStepRef,
    initialHighlightHoldRef,
    steps,
    playing,
  });

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
    isSearchOpen, setIsSearchOpen,
    handleSearch,
  } = useSearchState({ rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH });





  const { buildCombinedSelectionOverlay } = useSelectionOverlay({ steps });

  const { handleStepSelection, handleMultiStepSelect } = useStepSelectionHandlers({
    stopPlayback,
    setIsSingleEventWidgetRevealed,
    goToStep,
    globalPausedRef,
    setIsAnimationReplayPaused,
    setSelectedSteps,
  });

  useSelectionOrchestration({
    steps,
    initialHighlightHoldRef,
    setIsSingleEventWidgetRevealed,
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
    isSingleEventLoopActiveRef, isScrubbingTopRef, initialHighlightHoldRef,
    delayBetweenRepeatsRef, stepResumeStartIndexRef, stepResumeMaskProgressRef,
    setIsStepAnimRunningRef, isStepAnimRunningRefForScheduler,
    playing, steps, currentStep, selectedSteps, isAnimationReplayPaused, isSingleEventLoopActive,
    isAutoAnimateOnSelect, isAutoAnimateOnSelectRef,
    setPlaying, setCurrentStep,
  });




  // Top-toolbar Play/Pause. Drives trace-wide playback (event-by-event with
  // no inter-event wait) and supports pause-in-flight + precise resume:
  //  - At end of trace: rewind and start playing.
  //  - Not playing, not paused: start playing.
  //  - Paused mid-flight: clear pause flag so animation resumes exactly where
  //    it stopped (mask virtualMs, sequential reveal idx, or waitForDelay).
  //  - Playing: set pause flag (in-flight loops freeze in place) and stop the
  //    scheduler. Refs are NOT torn down so resume can pick up.
  const { handlePlayPause, handleStepAnimToggle } = usePlaybackControls({
    setIsSingleEventWidgetRevealed,
    globalPausedRef,
    setIsAnimationReplayPaused,
    setIsSingleEventLoopActive,
    currentStep,
    stepsLength: steps.length,
    isStepAnimRunning,
    setPlaying,
    playing,
    goToStep,
    isSingleEventLoopActiveRef,
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
  //    isAnimationReplayPaused so the auto-replay loop stays parked.
  //  - Play: clears isAnimationReplayPaused (which lets the existing replay
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

  const { isTiltActive, setIsTiltActive, isTiltButtonEnabled } = useTiltState({ introPhase });

  // Tilt toggle: animates between 0° (flat) and 30° (tilted) in 3D mode.
  const { handleIntroTransitionEnd, toggleTilt, enableTiltAndResize } = useTiltControls({
    introTiltStartedRef,
    setIntroPhase,
    camera3DRef,
    schedulePostLayoutRefresh,
    isTiltActive,
    setIsTiltActive,
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
    areBalloonsEnabled,
    isBalloonClickEnabled,
    isBalloonHoverEnabled,
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
    toggleDebugToolsPanel: useCallback(() => setIsDebugToolsOpen((v) => !v), []),
    camera3DRef,
    toggleShortcutsOverlay: useCallback(() => setIsShortcutsHelpVisible((v) => !v), []),
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

  const { currentStepData, currentStepBanner, surroundingEvents } = useStepDisplayData({
    steps,
    currentStep,
    selectedSteps,
    buildCombinedSelectionOverlay,
  });

  const { renderCanvasStyle, mergedCamera3DContainerStyle, eventTitleStyle } = useCanvasStyles({
    canvasAnchorPx,
    introPhase,
    camera3DContainerStyle,
    canvasColors,
    theme,
    eventTitleSettings,
  });

  const themeContextValue = useMemo(() => ({
    theme,
    setTheme,
    gridOpacity,
    setGridOpacity,
    canvasColors,
    setCanvasColors,
    colorPreset,
    setColorPreset,
    customColors,
    setCustomColors,
  }), [
    theme,
    setTheme,
    gridOpacity,
    setGridOpacity,
    canvasColors,
    setCanvasColors,
    colorPreset,
    setColorPreset,
    customColors,
    setCustomColors,
  ]);

  const playbackContextValue = useMemo(() => ({
    steps,
    currentStep,
    goToStep,
    playing,
    handlePlayPause,
    exporting: !!exporting,
    setPlaySpeedPercent,
    isScrubbingTopRef,
    playSpeedPercent,
  }), [
    steps,
    currentStep,
    goToStep,
    playing,
    handlePlayPause,
    exporting,
    setPlaySpeedPercent,
    isScrubbingTopRef,
    playSpeedPercent,
  ]);

  const animationConfigContextValue = useMemo(() => ({
    animMode,
    setAnimMode,
    animStyle,
    setAnimStyle,
    delayBetweenEvents,
    setDelayBetweenEvents,
    delayBetweenRepeats,
    setDelayBetweenRepeats,
    eventTimeTargets,
    setEventTimeTargets,
    eventDurationMode,
    setEventDurationMode,
    isAnimationReplayPaused,
    setIsAnimationReplayPaused,
    bitAnimationMode,
    handleBitAnimationModeChange,
    isAutoAnimateOnSelect,
    setIsAutoAnimateOnSelect,
  }), [
    animMode,
    setAnimMode,
    animStyle,
    setAnimStyle,
    delayBetweenEvents,
    setDelayBetweenEvents,
    delayBetweenRepeats,
    setDelayBetweenRepeats,
    eventTimeTargets,
    setEventTimeTargets,
    eventDurationMode,
    setEventDurationMode,
    isAnimationReplayPaused,
    setIsAnimationReplayPaused,
    bitAnimationMode,
    handleBitAnimationModeChange,
    isAutoAnimateOnSelect,
    setIsAutoAnimateOnSelect,
  ]);

  const panelLayoutContextValue = useMemo(() => ({
    isEventsPanelCollapsed,
    setIsEventsPanelCollapsed,
    toggleEventsPanel,
    isDetailOpen,
    setIsDetailOpen,
    isDetailOpenRef,
    toggleDetailPanel,
    isSettingsCollapsed,
    toggleSettingsPanel,
    isAllEventsWidgetHidden,
    showAllEventsWidget,
    areControlsHidden,
    isTimingPanelOpen,
    setIsTimingPanelOpen,
    detailHeight,
  }), [
    isEventsPanelCollapsed,
    setIsEventsPanelCollapsed,
    toggleEventsPanel,
    isDetailOpen,
    setIsDetailOpen,
    isDetailOpenRef,
    toggleDetailPanel,
    isSettingsCollapsed,
    toggleSettingsPanel,
    isAllEventsWidgetHidden,
    showAllEventsWidget,
    areControlsHidden,
    isTimingPanelOpen,
    setIsTimingPanelOpen,
    detailHeight,
  ]);

  const { detailInspectorRows, filteredDetailInspectorRows } = useDetailInspectorRows({
    currentStepData,
    layoutSettings,
    storageModel,
    wheelDefinition,
    cachelineSize,
    detailInspectorQuery,
  });

  const { openDetailInspector } = useDetailInspectorActions({
    setDetailInspectorMode,
    setDetailInspectorQuery,
    setIsDetailInspectorOpen,
  });

  const { getBitBalloonGeometry, getVisibleBalloonStyles } = useBalloonGeometry({
    rendererRef,
    containerRef,
    getCanvasPlaneMetrics,
    camera3DRef,
    isEventsPanelCollapsed,
    panelWidth,
    isSettingsCollapsed,
    isMacPlatform,
    isDetailOpen,
    detailHeight,
  });

  const effectiveTitle = traceTitle;

  useVisualizerEffects({
    // balloon cleanup
    areBalloonsEnabled,
    isBalloonHoverEnabled,
    setPinnedBitIndices,
    setHoveredBitInfo,
    lastHoveredIdxRef,
    // trace-info popup
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
  });

  const { stepAnimSlidersContent, stepAnimSlidersDockedContent, allEventsTransportContent } = useStepAnimContent({
    currentStepData,
    bitAnimationMode,
    setBitAnimationMode,
    bitAnimationModeRef,
    stopSeqAnim,
    seekStepAnimation,
    stepScrubProgress,
    setStepScrubProgress,
    handleStepAnimToggle,
    isStepAnimRunning,
    isSingleEventLoopActive,
    isAnimationReplayPaused,
    delayPhaseMs,
    playing,
    exporting,
    openAnimationSettings,
    setEventTitleSettings,
    setPendingBannerDragStart,
    isAllEventsInDetailPanel,
    currentStep,
    steps,
    handlePlayPause,
    goToStep,
    isScrubbingTopRef,
    playSpeedPercent,
    setPlaySpeedPercent,
    setIsAllEventsInDetailPanel,
    setIsAllEventsWidgetHidden,
  });

  return (
    <ThemeProvider value={themeContextValue}>
    <PlaybackProvider value={playbackContextValue}>
    <AnimationConfigProvider value={animationConfigContextValue}>
    <PanelLayoutProvider value={panelLayoutContextValue}>
    <div className={`visualizer${isMacPlatform ? ' platform-mac' : ''}${isWindowsPlatform ? ' platform-windows' : ''}${isElectron ? ' platform-electron' : ' platform-browser'}`}>
      <Toolbar
        isMacPlatform={isMacPlatform}
        isWindowsPlatform={isWindowsPlatform}
        isElectron={isElectron}
        effectiveTitle={effectiveTitle}
        isTraceInfoVisible={isTraceInfoVisible}
        setIsTraceInfoVisible={setIsTraceInfoVisible}
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
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResult={searchResult}
        handleSearch={handleSearch}
        zoom={zoom}
        doZoom={doZoom}
        resetZoom={resetZoom}
        isTiltActive={isTiltActive}
        isTiltButtonEnabled={isTiltButtonEnabled}
        toggleTilt={toggleTilt}
        isHeatMapEnabled={isHeatMapEnabled}
        setIsHeatMapEnabled={setIsHeatMapEnabled}
        isPrimeOverlayEnabled={isPrimeOverlayEnabled}
        setIsPrimeOverlayEnabled={setIsPrimeOverlayEnabled}
        isDebugToolsOpen={isDebugToolsOpen}
        setIsDebugToolsOpen={setIsDebugToolsOpen}
        exporting={exporting}
        exportPng={exportPng}
        exportVideo={exportVideo}
        cancelExport={cancelExport}
        exportProgress={exportProgress}
      />

      {exporting && <ExportProgress progress={exportProgress} />}
      <StatusBanners exportError={exportError} isGlUnavailable={isGlUnavailable} />

      <VisualizerMainContent
        mode3D={mode3D}
        isUiChromeVisible={isUiChromeVisible}
        isEventsPanelCollapsed={isEventsPanelCollapsed}
        panelWidth={panelWidth}
        loadingOverlayPhase={loadingOverlayPhase}
        steps={steps}
        overlayBarPct={overlayBarPct}
        currentStep={currentStep}
        selectedSteps={selectedSteps}
        handleStepSelection={handleStepSelection}
        handleMultiStepSelect={handleMultiStepSelect}
        stopPlayback={stopPlayback}
        setPanelWidth={setPanelWidth}
        toggleEventsPanel={toggleEventsPanel}
        isAllEventsWidgetHidden={isAllEventsWidgetHidden}
        areWidgetsJoined={areWidgetsJoined}
        expandEventsPanelFromWidget={expandEventsPanelFromWidget}
        dockEventsWidgetToTopBar={dockEventsWidgetToTopBar}
        dockEventsWidgetToDetailPanel={dockEventsWidgetToDetailPanel}
        joinWidgets={joinWidgets}
        timingFocusOp={timingFocusOp}
        setTimingFocusOp={setTimingFocusOp}
        revealStepRequest={revealStepRequest}
        eventTitleSettings={eventTitleSettings}
        showEventTitleAboveCurrentDetail={showEventTitleAboveCurrentDetail}
        containerRef={containerRef}
        glCanvasRef={glCanvasRef}
        glyphCanvasRef={glyphCanvasRef}
        wrapperCanvasRef={wrapperCanvasRef}
        mergedCamera3DContainerStyle={mergedCamera3DContainerStyle}
        renderCanvasStyle={renderCanvasStyle}
        setEventTitleSettings={setEventTitleSettings}
        eventTitleStyle={eventTitleStyle}
        currentStepBanner={currentStepBanner}
        surroundingEvents={surroundingEvents}
        currentStepData={currentStepData}
        goToStep={goToStep}
        revealCurrentStepInPanel={revealCurrentStepInPanel}
        setIsEventsPanelCollapsed={setIsEventsPanelCollapsed}
        stepAnimSlidersContent={stepAnimSlidersContent}
        stepAnimSlidersDockedContent={stepAnimSlidersDockedContent}
        splitWidgets={splitWidgets}
        pinnedBitIndices={pinnedBitIndices}
        hoveredBitInfo={hoveredBitInfo}
        computeBitInfo={computeBitInfo}
        getVisibleBalloonStyles={getVisibleBalloonStyles}
        balloonLiveLayout={balloonLiveLayout}
        cachelineSize={cachelineSize}
        setPinnedBitIndices={setPinnedBitIndices}
        isDetailOpen={isDetailOpen}
        toggleDetailPanel={toggleDetailPanel}
        detailHeight={detailHeight}
        pendingBannerDragStart={pendingBannerDragStart}
        setPendingBannerDragStart={setPendingBannerDragStart}
        updateDetailHeight={updateDetailHeight}
        detailWidth={detailWidth}
        setDetailWidth={setDetailWidth}
        playing={playing}
        stepStats={stepStats}
        storageModel={storageModel}
        wheelDefinition={wheelDefinition}
        layoutSettings={layoutSettings}
        benchmarkTimingData={benchmarkTimingData}
        openDetailInspector={openDetailInspector}
        isDetailInspectorOpen={isDetailInspectorOpen}
        detailInspectorMode={detailInspectorMode}
        detailInspectorQuery={detailInspectorQuery}
        setDetailInspectorQuery={setDetailInspectorQuery}
        setIsDetailInspectorOpen={setIsDetailInspectorOpen}
        detailInspectorRows={detailInspectorRows}
        filteredDetailInspectorRows={filteredDetailInspectorRows}
        isTimingPanelOpen={isTimingPanelOpen}
        setIsTimingPanelOpen={setIsTimingPanelOpen}
        benchmarkTimingFileName={benchmarkTimingFileName}
        onImportBenchmarkTiming={onImportBenchmarkTiming}
        onShowEventTitle={showEventTitleAboveClosedDetail}
        onOpenRawLog={onOpenRawLog}
        currentStepSourceLine={stepToLine[currentStep]}
        sourceRef={sourceRef}
        allEventsTransportContent={allEventsTransportContent}
        introPhase={introPhase}
        handleIntroTransitionEnd={handleIntroTransitionEnd}
        isSingleEventWidgetRevealed={isSingleEventWidgetRevealed}
        joinBannerRect={joinBannerRect}
        pushJoinedWidgetToEventsPanel={pushJoinedWidgetToEventsPanel}
        pushJoinedWidgetToDetailPanel={pushJoinedWidgetToDetailPanel}
        hideJoinedWidget={hideJoinedWidget}
        isDetailOpenRef={isDetailOpenRef}
        setIsDetailOpen={setIsDetailOpen}
        autoFitColumnCount={autoFitColumnCount}
        setLayoutSettings={setLayoutSettings}
        setSettingsActiveTab={setSettingsActiveTab}
        setCachelineSize={setCachelineSize}
        cachePreset={cachePreset}
        setCachePreset={setCachePreset}
        isHeatMapEnabled={isHeatMapEnabled}
        setIsHeatMapEnabled={setIsHeatMapEnabled}
        cachelineAnnotation={cachelineAnnotation}
        setCachelineAnnotation={setCachelineAnnotation}
        isPrimeOverlayEnabled={isPrimeOverlayEnabled}
        setIsPrimeOverlayEnabled={setIsPrimeOverlayEnabled}
        isRangeOverlayEnabled={isRangeOverlayEnabled}
        rangeOverlayStart={rangeOverlayStart}
        rangeOverlayEnd={rangeOverlayEnd}
        onRangeOverlayToggle={(enabled) => {
          if (enabled && !isRangeOverlayEnabled) {
            const step = steps[currentStep];
            if (step) {
              const start = step.focusStart != null ? step.focusStart : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
              const end = step.focusStop != null ? step.focusStop : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
              setRangeOverlayStart(start);
              setRangeOverlayEnd(end);
            }
          }
          setIsRangeOverlayEnabled(enabled);
        }}
        setRangeOverlayStart={setRangeOverlayStart}
        setRangeOverlayEnd={setRangeOverlayEnd}
        isMultiplesOverlayEnabled={isMultiplesOverlayEnabled}
        multiplesOverlayPrime={multiplesOverlayPrime}
        onMultiplesOverlayToggle={(enabled) => {
          if (enabled && !isMultiplesOverlayEnabled) {
            const step = steps[currentStep];
            if (step && step.prime != null && step.prime >= 2) {
              setMultiplesOverlayPrime(step.prime);
            }
          }
          setIsMultiplesOverlayEnabled(enabled);
        }}
        setMultiplesOverlayPrime={setMultiplesOverlayPrime}
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
        isMinimapVisible={isMinimapVisible}
        setIsMinimapVisible={setIsMinimapVisible}
        isWindowsPlatform={isWindowsPlatform}
        settingsTabRequest={settingsTabRequest}
        isDebugToolsOpen={isDebugToolsOpen}
        rendererRef={rendererRef}
        glRendererRef={glRendererRef}
        camera3DRef={camera3DRef}
        camera3DTransform={camera3DTransform}
        zoom={zoom}
        glDebugInfo={glDebugInfo}
        theme={theme}
        debugLayerMode={debugLayerMode}
        setDebugLayerMode={setDebugLayerMode}
        debugGlOffsetX={debugGlOffsetX}
        setDebugGlOffsetX={setDebugGlOffsetX}
        debugGlOffsetY={debugGlOffsetY}
        setDebugGlOffsetY={setDebugGlOffsetY}
        debugGlAutoOffsetY={debugGlAutoOffsetY}
        isDebugCalibrationMode={isDebugCalibrationMode}
        setIsDebugCalibrationMode={setIsDebugCalibrationMode}
        applyDebugSnapshot={applyDebugSnapshot}
        forceGlRedraw={forceGlRedraw}
        isMacPlatform={isMacPlatform}
      />
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
        open={isShortcutsHelpVisible}
        onClose={() => setIsShortcutsHelpVisible(false)}
      />
    </div>
    </PanelLayoutProvider>
    </AnimationConfigProvider>
    </PlaybackProvider>
    </ThemeProvider>
  );
}

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
import { useTraceExport, useRawSource, useSearchState, useStepDisplayData } from './hooks/data';
import {
  useKeyboardShortcuts,
  usePointerGestures,
  useBalloonLayout,
  useStepSelectionHandlers,
  useSelectionOrchestration,
} from './hooks/interactions';
import {
  use3DCamera,
  useTiltControls,
  useTiltState,
  useCameraStartupRefit,
  useViewportNavigation,
  useViewportAnchoring,
  useZoomControls,
} from './hooks/camera_3d';
import {
  usePlaybackClock,
  usePlaybackLoop,
  usePlaybackControls,
  useStopPlayback,
  useGoToStep,
} from './hooks/playback';
import {
  useAnimationConfig,
  useStepAnimation,
  useAnimationPipeline,
  useSeekStepAnimation,
  useStepAnimContent,
} from './hooks/animation';
import {
  useOverlays,
  useBalloonGeometry,
  useDetailInspectorRows,
  useDetailInspectorActions,
  useSelectionOverlay,
} from './hooks/overlays';
import {
  usePanelState,
  useWidgetState,
  useBitState,
  useIntroSequence,
  useThemeAndColors,
  usePanelChoreography,
} from './hooks/ui_state';
import {
  useCanvasRefs,
  useCanvasLayout,
  useCanvasAnchorSync,
  useCanvasStyles,
  useRendererPipeline,
  useMinimapAvailability,
  useMinimapDetailHeight,
} from './hooks/rendering';
import {
  useDebugTools,
  useDetailPanelStateSync,
  useRawLogNavigation,
  useViewportFit,
  useLayoutRefreshScheduler,
  useCaptureResizeAnchor,
  useViewportAnimationCancel,
  useBitStateCheckpoints,
  useViewPrefsSync,
  useVisualizerEffects,
} from './hooks/utils';
import { useBitInfo } from './hooks/useBitInfo';
import StatusBanners from './visualizer/StatusBanners';
import {
  DEFAULT_EVENT_TITLE_SETTINGS,
  getInitialViewState,
} from './lib/viewPrefs';
import {
  isRenderMode,
  usesWebGLTilt,
} from './lib/renderModes';
import { buildTraceInfoSections } from './lib/traceHeader';
import { detectIsMac, detectIsWindows, detectIsElectron } from './lib/platform';
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
    glCanvasRef, glRendererRef, glyphCanvasRef, glyph2DCanvasRef, glyphRendererRef, wrapperCanvasRef,
    glCssUnlockTokenRef, glCssUnlockRafRef, glCssUnlockTimeoutRef, glCssLockStateRef,
    pendingRenderRafRef,
  } = useCanvasRefs();

  // All localStorage-backed UI state is resolved (read + clamp + migrate) in
  // a single pass by `getInitialViewState()` — see `src/lib/viewPrefs.js`.
  // The bundle is captured once via `useMemo` and then fed straight into
  // each `useState` seed. Persistence on change still happens in the
  // `writeViewPrefs(...)` effect further down.
  const initialPrefs = useMemo(() => getInitialViewState(), []);
  const initialRenderModeFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const value = params.get('renderMode');
    return isRenderMode(value) ? value : null;
  }, []);

  // Item 106: Start in the direct equivalent of worker modes for faster startup.
  // After the trace finishes loading, auto-switch to the originally-requested worker mode.
  const _resolvedInitialMode = initialRenderModeFromUrl || initialPrefs.renderMode;
  const _WORKER_TO_DIRECT = {
    'mode5-worker': 'mode1-direct',
    'mode6-worker': 'mode2-direct',
    'mode7-worker': 'mode3-direct',
    'mode8-worker': 'mode4-direct',
  };
  // pendingWorkerMode: non-null means "switch to this mode when loading completes"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pendingWorkerModeRef = useRef(_WORKER_TO_DIRECT[_resolvedInitialMode] ? _resolvedInitialMode : null);
  const _startupRenderMode = _WORKER_TO_DIRECT[_resolvedInitialMode] || _resolvedInitialMode;

  const {
    isGlUnavailable, setIsGlUnavailable,
    glDebugInfo, setGlDebugInfo,
    isDebugToolsOpen, setIsDebugToolsOpen,
    debugLayerMode, setDebugLayerMode,
    renderMode, setRenderMode,
    renderModeRestartNonce, restartRenderMode,
    debugGlModeOverride, setDebugGlModeOverride,
    debugWorkerGlyphMode, setDebugWorkerGlyphMode,
    debugGlOffsetX, setDebugGlOffsetX,
    debugGlOffsetY, setDebugGlOffsetY,
    debugGlAutoOffsetY, setDebugGlAutoOffsetY,
    isDebugCalibrationMode, setIsDebugCalibrationMode,
    debugRenderTuning, setDebugRenderTuning,
    debugGlOffsetXRef, debugGlOffsetYRef, debugGlAutoOffsetYRef,
    glDebugLastUpdateRef, updateGlDebugInfo,
  } = useDebugTools({
    glRendererRef,
    initialRenderMode: _startupRenderMode,
    initialDebugGlModeOverride: initialPrefs.debugGlModeOverride,
    initialDebugWorkerGlyphMode: initialPrefs.debugWorkerGlyphMode,
    initialDebugRenderTuning: initialPrefs.debugRenderTuning,
  });
  const isMacPlatform = useMemo(() => detectIsMac(), []);
  const isWindowsPlatform = useMemo(() => detectIsWindows(), []);
  // Electron (native app) inserts "Electron" into the UA and exposes process.versions.electron.
  // In browser mode we don't reserve space for traffic-light window controls.
  const isElectron = useMemo(() => detectIsElectron(), []);

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
    isSingleEventRepeatEnabled, setIsSingleEventRepeatEnabled, isSingleEventRepeatEnabledRef,
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

  // Tracks which sub-event's mask is currently shown during aggregated event animation/scrubbing.
  // Updated by animation hooks; used by DetailPanel to show the correct mask for each step.
  const [aggMaskStepIndex, _setAggMaskStepIndex] = useState(0);
  const aggMaskStepIndexRef = useRef(0);
  const aggMaskStepSetterRef = useRef(null);
  aggMaskStepSetterRef.current = (index) => {
    if (aggMaskStepIndexRef.current !== index) {
      aggMaskStepIndexRef.current = index;
      _setAggMaskStepIndex(index);
    }
  };

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
    isSingleEventSliderInPanel, setIsSingleEventSliderInPanel,
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
    // item 155: header hidden when dragged all the way down
    isDetailHeaderHidden, setIsDetailHeaderHidden,
    // item 157: floating detail panel
    isDetailPanelFloating, setIsDetailPanelFloating,
  } = usePanelState({ initialPrefs, introPhase, isSingleEventWidgetRevealed });

  // item 163: undocked double timeline (floats freely over canvas)
  const [isTimelineUndocked, setIsTimelineUndocked] = useState(false);
  const [floatingDetailVisible, setFloatingDetailVisible] = useState(false);

  // item 193: direction the events panel slides when collapsed
  const [eventsCollapseDir, setEventsCollapseDir] = useState('left');
  const collapseEventsPanelFromTimeline = useCallback(() => {
    setEventsCollapseDir('right');
    setIsEventsPanelCollapsed(true);
  }, [setIsEventsPanelCollapsed]);

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

  // Item 106: Once the trace finishes loading, switch from the startup direct mode to
  // the originally-requested worker mode (if one was deferred).
  useEffect(() => {
    if (!loadComplete) return;
    const target = pendingWorkerModeRef.current;
    if (!target) return;
    pendingWorkerModeRef.current = null;
    setRenderMode(target);
  }, [loadComplete, setRenderMode]);

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
    glyph2DCanvasRef,
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
    debugRenderTuning,
    renderMode,
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
    collapseEventsHideWidget,
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
    panelHandlers: {
      captureResizeAnchor,
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
    },
    detailState: {
      height: detailHeight,
      isOpen: isDetailOpen,
    },
    settingsState: {
      activeTab: settingsActiveTab,
      isCollapsed: isSettingsCollapsed,
    },
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
    renderMode,
    debugGlModeOverride,
    debugWorkerGlyphMode,
    debugRenderTuning,
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
    isSingleEventSliderInPanel,
    isSingleEventRepeatEnabled,
    isAutoAnimateOnSelect,
    isEventsPanelCollapsed,
    isSettingsCollapsed,
    isDetailOpen,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('renderMode', renderMode);
    window.history.replaceState(window.history.state, '', url.toString());
  }, [renderMode]);

  const effectiveGroupBits = useMemo(() => (
    layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64)
  ), [layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup]);

  useRendererPipeline({
    rendererRefs: {
      rendererRef,
      minimapCanvasRef,
      glyphCanvasRef,
      glyph2DCanvasRef,
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
      camera3DRef,
    },
    rendererConfig: {
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
      debugGlModeOverride,
      debugWorkerGlyphMode,
      renderMode,
      renderModeRestartNonce,
      mode3D,
    },
    rendererState: {
      loadingOverlayPhase,
      panelWidth,
      isDetailOpen,
      detailHeight,
    },
    rendererHandlers: {
      setIsGlUnavailable,
      setGlDebugInfo,
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
    },
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
    aggMaskStepSetterRef,
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
    animRefs: {
      globalPausedRef,
      seqTimerRef,
      rendererRef,
      runEffectCancelRef,
      rippleRef,
      seekGenRef,
      getMinimapDetailH,
      currentAnimIntervalRef,
      currentMaskAnimIntervalRef,
      eventTimeTargetsRef,
      eventDurationModeRef,
      playSpeedPercentRef,
      computeEventDurationRef,
      bitsAtTimeRatioRef,
      timeRatioAtBitIndexRef,
      stepScrubProgressRef,
      bitAnimationModeRef,
      animBusyUntilRef,
      bitStateRef,
      stepsRef,
      bitStateDirtyRef,
      setDelayPhaseMsRef,
      setIsStepAnimRunningRef,
      stopSeqAnimRef,
      triggerAnimationRef,
      isSingleEventLoopActiveRef,
      selectedAnimLoopRef,
      stepScrubProgressValueRef,
      stepResumeStartIndexRef,
      stepResumeMaskProgressRef,
      currentStepRef,
      initialHighlightHoldRef,
      aggMaskStepSetterRef,
    },
    animConfig: {
      bitAnimInterval,
      maskAnimInterval,
      animMode,
      animStyle,
      pinnedBitIndices,
      effectiveGroupBits,
    },
    animState: {
      currentStep,
      steps,
      playing,
    },
    animHandlers: {},
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
    loopRefs: {
      seekGenRef,
      globalPausedRef,
      animBusyUntilRef,
      triggerAnimationRef,
      goToStepRef,
      rendererRef,
      selectedAnimLoopRef,
      pausedStepAnimLoopRef,
      playTimeoutRef,
      playTimerRef,
      isSingleEventLoopActiveRef,
      isScrubbingTopRef,
      initialHighlightHoldRef,
      delayBetweenRepeatsRef,
      stepResumeStartIndexRef,
      stepResumeMaskProgressRef,
      setIsStepAnimRunningRef,
      isStepAnimRunningRefForScheduler,
      isAutoAnimateOnSelectRef,
      isSingleEventRepeatEnabledRef,
    },
    loopState: {
      playing,
      steps,
      currentStep,
      selectedSteps,
      isAnimationReplayPaused,
      isSingleEventLoopActive,
    },
    loopHandlers: {
      setPlaying,
      setCurrentStep,
      setIsSingleEventLoopActive,
    },
    loopConfig: {
      isAutoAnimateOnSelect,
    },
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

  // In WebGL-tilt modes (1, 3, 5, 7) the 3D perspective transform lives entirely
  // inside the GLSL shader. Camera3D.animateTo() updates rotateX/Y each RAF frame
  // and fires _notify() → setCamera3DTransform (React state), but that alone does
  // not cause the GL shader to redraw (unlike CSS-tilt modes where the browser
  // compositor handles it). Whenever camera3DTransform changes AND we are in a
  // WebGL-tilt mode, schedule a GL render so the intro 2D→3D and toggle tilt
  // animations are visible in modes 1, 3, 5 and 7.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !usesWebGLTilt(renderMode)) return;
    r.scheduleRender?.();
  }, [camera3DTransform, renderMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
    cancelViewportAnimation,
    // item 144: collapse the settings panel when the user clicks on the canvas
    collapseSettingsIfOpen: isSettingsCollapsed ? undefined : () => setIsSettingsCollapsed(true),
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
    glCanvasRef,
    glyphCanvasRef,
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

  // Reset agg mask step index when selection changes so detail panel shows index 0
  useEffect(() => {
    aggMaskStepSetterRef.current(0);
  }, [selectedSteps]); // eslint-disable-line react-hooks/exhaustive-deps

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
    isSingleEventRepeatEnabled,
    setIsSingleEventRepeatEnabled,
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
    isSingleEventRepeatEnabled,
    setIsSingleEventRepeatEnabled,
    isAutoAnimateOnSelect,
    setIsAutoAnimateOnSelect,
  ]);

  const panelLayoutContextValue = useMemo(() => ({
    collapseEventsHideWidget,
    isEventsPanelCollapsed,
    setIsEventsPanelCollapsed,
    toggleEventsPanel,
    eventsCollapseDir,
    setEventsCollapseDir,
    collapseEventsPanelFromTimeline,
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
    areWidgetsJoined,
  }), [
    collapseEventsHideWidget,
    isEventsPanelCollapsed,
    setIsEventsPanelCollapsed,
    toggleEventsPanel,
    eventsCollapseDir,
    setEventsCollapseDir,
    collapseEventsPanelFromTimeline,
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
    areWidgetsJoined,
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
    isSingleEventRepeatEnabled,
    setIsSingleEventRepeatEnabled,
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

  // ============================================================================
  // ORGANIZED STATE STRUCTURE (Phase 1 refactoring)
  // Groups all scattered variables into semantic domains for clarity.
  // All hook calls are complete at this point, so all variables are available.
  // ============================================================================

  // Canvas rendering infrastructure
  const canvasState = {
    refs: {
      minimap: minimapCanvasRef,
      container: containerRef,
      renderer: rendererRef,
      glCanvas: glCanvasRef,
      glRenderer: glRendererRef,
      glyphCanvas: glyphCanvasRef,
      glyph2DCanvas: glyph2DCanvasRef,
      glyphRenderer: glyphRendererRef,
      wrapperCanvas: wrapperCanvasRef,
      glCssUnlockToken: glCssUnlockTokenRef,
      glCssUnlockRaf: glCssUnlockRafRef,
      glCssUnlockTimeout: glCssUnlockTimeoutRef,
      glCssLockState: glCssLockStateRef,
      pendingRenderRaf: pendingRenderRafRef,
    },
    is3DEnabled: mode3D,
    camera: {
      ref: camera3DRef,
      transform: camera3DTransform,
      containerStyle: camera3DContainerStyle,
      key: cameraKey,
    },
  };

  // UI frame lifecycle (intro animation, loading overlay, chrome visibility)
  const uiFrameState = {
    introPhase,
    isUiChromeVisible,
    loadingOverlayPhase,
    isTopbarPlaybackReady,
    overlayBarPct,
    refs: {
      introTiltStarted: introTiltStartedRef,
      overlayStartTime: overlayStartTimeRef,
      pendingIntroAfterOverlay: pendingIntroAfterOverlayRef,
      loadComplete: loadCompleteRef,
      loadProgress: loadProgressRef,
    },
  };

  // Animation runtime configuration (timing, intervals, progression)
  const animationState = {
    config: {
      mode: animMode,
      style: animStyle,
      delayBetweenEvents,
      delayBetweenRepeats,
      eventTimeTargets,
      eventDurationMode,
      bitAnimInterval,
      maskAnimInterval,
      stepSpeedValue,
      maskSpeedValue,
    },
    runtime: {
      bitAnimationMode,
      isSingleEventLoopActive,
      isAutoAnimateOnSelect,
      isAnimationReplayPaused,
      isStepAnimRunning,
      stepScrubProgress,
      delayPhaseMs,
    },
    refs: {
      delayBetweenRepeats: delayBetweenRepeatsRef,
      eventTimeTargets: eventTimeTargetsRef,
      eventDurationMode: eventDurationModeRef,
      bitsAtTimeRatio: bitsAtTimeRatioRef,
      timeRatioAtBitIndex: timeRatioAtBitIndexRef,
      computeEventDuration: computeEventDurationRef,
      globalPaused: globalPausedRef,
      seekGen: seekGenRef,
      animBusyUntil: animBusyUntilRef,
      isScrubbingTop: isScrubbingTopRef,
      stepScrubProgress: stepScrubProgressRef,
      stepScrubProgressValue: stepScrubProgressValueRef,
      setIsStepAnimRunning: setIsStepAnimRunningRef,
      isStepAnimRunningForScheduler: isStepAnimRunningRefForScheduler,
      stepResumeStartIndex: stepResumeStartIndexRef,
      stepResumeMaskProgress: stepResumeMaskProgressRef,
      currentAnimInterval: currentAnimIntervalRef,
      currentMaskAnimInterval: currentMaskAnimIntervalRef,
      pausedStepAnimLoop: pausedStepAnimLoopRef,
      selectedAnimLoop: selectedAnimLoopRef,
    },
  };

  // Playback control state (play/pause, speed, current step)
  const playbackState = {
    isPlaying: playing,
    currentStep,
    speed: playSpeedPercent,
    refs: {
      speed: playSpeedPercentRef,
      timer: playTimerRef,
      timeout: playTimeoutRef,
      currentStep: currentStepRef,
      steps: stepsRef,
    },
  };

  // Visual theme and canvas rendering appearance
  const themeState = {
    colorPreset,
    customColors,
    canvasColors,
    gridOpacity,
    zoom,
    refs: {
      debugGlOffsetX: debugGlOffsetXRef,
      debugGlOffsetY: debugGlOffsetYRef,
      debugGlAutoOffsetY: debugGlAutoOffsetYRef,
      glDebugLastUpdate: glDebugLastUpdateRef,
    },
  };

  // Panel layout and UI panel states (Events, Settings, Detail, Minimap)
  const panelState = {
    events: {
      isCollapsed: isEventsPanelCollapsed,
      width: panelWidth,
    },
    settings: {
      isCollapsed: isSettingsCollapsed,
      activeTab: settingsActiveTab,
      tabRequest: settingsTabRequest,
    },
    detail: {
      isOpen: isDetailOpen,
      height: detailHeight,
      width: detailWidth,
      refs: {
        isOpen: isDetailOpenRef,
        height: detailHeightRef,
      },
      // item 155: header hidden when dragged all the way down
      isHeaderHidden: isDetailHeaderHidden,
      // item 157: floating detail panel
      isFloating: isDetailPanelFloating,
    },
    minimap: {
      isVisible: isMinimapVisible,
      isAvailable: isMinimapAvailable,
    },
    widgets: {
      allEventsHidden: isAllEventsWidgetHidden,
      singleEventRevealed: isSingleEventWidgetRevealed,
      allEventsInDetail: isAllEventsInDetailPanel,
      areJoined: areWidgetsJoined,
      joinBannerRect,
      pendingBannerDragStart,
      revealStepRequest,
    },
    refs: {
      layoutRefreshTimeout: layoutRefreshTimeoutRef,
      layoutRefreshRaf1: layoutRefreshRaf1Ref,
      layoutRefreshRaf2: layoutRefreshRaf2Ref,
      canvasAnchor: canvasAnchorPx,
      pendingResizeAnchor: pendingResizeAnchorRef,
      deferred: deferredPanelStateRef,
      viewportAnim: viewportAnimRef,
    },
  };

  // Overlay feature states (heat map, prime, range, multiples, balloons)
  const overlayState = {
    heatMap: {
      isEnabled: isHeatMapEnabled,
    },
    prime: {
      isEnabled: isPrimeOverlayEnabled,
    },
    range: {
      isEnabled: isRangeOverlayEnabled,
      start: rangeOverlayStart,
      end: rangeOverlayEnd,
    },
    multiples: {
      isEnabled: isMultiplesOverlayEnabled,
      prime: multiplesOverlayPrime,
    },
    balloons: {
      areEnabled: areBalloonsEnabled,
      isClickEnabled: isBalloonClickEnabled,
      isHoverEnabled: isBalloonHoverEnabled,
      pinnedIndices: pinnedBitIndices,
      hoveredBitInfo,
      liveLayout: balloonLiveLayout,
      refs: {
        layoutRaf: balloonLayoutRafRef,
        layoutTimer: balloonLiveLayoutTimerRef,
        lastHoveredIdx: lastHoveredIdxRef,
      },
    },
    cache: {
      cachelineSize,
      cachelineAnnotation,
      cachePreset,
    },
  };

  // Bit state (current data + selection)
  const bitState = {
    refs: {
      state: bitStateRef,
      checkpoints: bitStateCheckpointsRef,
      dirty: bitStateDirtyRef,
    },
    selected: {
      steps: selectedSteps,
      refs: selectedStepsRef,
    },
  };

  // 3D Camera controls
  const cameraState = {
    is3D: mode3D,
    ref: camera3DRef,
    transform: camera3DTransform,
    containerStyle: camera3DContainerStyle,
    isTiltActive,
  };

  // Debug tools state
  const debugState = {
    isToolsOpen: isDebugToolsOpen,
    isGlUnavailable,
    glDebugInfo,
    debugLayerMode,
    debugGlOffsetX,
    debugGlOffsetY,
    debugGlAutoOffsetY,
    isDebugCalibrationMode,
    debugRenderTuning,
  };

  // UI chrome visibility & settings
  const uiState = {
    isTraceInfoVisible,
    isShortcutsHelpVisible,
    layoutSettings,
    eventTitleSettings,
    storageModel,
    autoFitColumnCount,
  };

  // Timing Panel state
  const timingPanelState = {
    isOpen: isTimingPanelOpen,
    focusOp: timingFocusOp,
  };

  // Detail Inspector state
  const detailInspectorState = {
    isOpen: isDetailInspectorOpen,
    mode: detailInspectorMode,
    query: detailInspectorQuery,
  };

  // Animation timing refs (internal sequencing)
  const animationTimingRefs = {
    ripple: rippleRef,
    sequenceTimer: seqTimerRef,
    runEffectCancel: runEffectCancelRef,
    triggerAnimation: triggerAnimationRef,
    stopSequence: stopSeqAnimRef,
    initialFitDone: initialFitDoneRef,
    initialHighlightHold: initialHighlightHoldRef,
  };

  // UI element refs (popovers, overlays)
  const uiElementRefs = {
    traceInfoPopover: traceInfoPopoverRef,
    traceInfoToggle: traceInfoToggleRef,
  };

  // Platform detection
  const platformInfo = {
    isMac: isMacPlatform,
    isWindows: isWindowsPlatform,
    isElectron,
  };

  // Derived values for UI logic
  const uiLogic = {
    areControlsHidden,
    balloonMode,
  };

  // Local aliases from organized state domains to reduce flat-name noise.
  const eventsPanelState = panelState.events;
  const detailPanelState = panelState.detail;
  const settingsPanelState = panelState.settings;
  const widgetsPanelState = panelState.widgets;
  const balloonsOverlayState = overlayState.balloons;

  // ============================================================================
  // PHASE 2: CONSOLIDATED PROPS FOR CHILD COMPONENTS
  // Groups 120+ scattered props into organized objects for VisualizerMainContent
  // ============================================================================

  const visualizerMainContentProps = {
    // Canvas & rendering infrastructure
    canvas: {
      mode3D,
      refs: {
        container: containerRef,
        glCanvas: glCanvasRef,
        glyphCanvas: glyphCanvasRef,
        glyph2DCanvas: glyph2DCanvasRef,
        wrapperCanvas: wrapperCanvasRef,
        renderer: rendererRef,
        glRenderer: glRendererRef,
        camera3D: camera3DRef,
      },
      styles: {
        merged3D: mergedCamera3DContainerStyle,
        render: renderCanvasStyle,
        eventTitle: eventTitleStyle,
      },
      camera3D: {
        transform: camera3DTransform,
      },
      zoom,
      isMacPlatform,
      isWindowsPlatform,
    },

    // UI frame & chrome
    uiFrame: {
      isUiChromeVisible,
      introPhase,
      loadingOverlayPhase,
      overlayBarPct,
      handleIntroTransitionEnd,
    },

    // Playback state & control
    playback: {
      steps,
      currentStep: playbackState.currentStep,
      selectedSteps,
      playing: playbackState.isPlaying,
      handlers: {
        selection: handleStepSelection,
        multiSelection: handleMultiStepSelect,
        stop: stopPlayback,
        goToStep,
      },
    },

    // Animation & content rendering
    animation: {
      content: {
        stepAnimSliders: stepAnimSlidersContent,
        stepAnimSlidersDocked: stepAnimSlidersDockedContent,
        allEventsTransport: allEventsTransportContent,
      },
      currentStepBanner,
      surroundingEvents,
      currentStepData,
      aggMaskStepIndex,
      aggMaskStepSetterRef,
      // DoubleTimeline raw props (backlog #120)
      doubleTimeline: {
        stepScrubProgress,
        seekStepAnimation,
        setStepScrubProgress,
        handleStepAnimToggle,
        isStepAnimRunning,
        isSingleEventLoopActive,
        isAnimationReplayPaused,
        isSingleEventRepeatEnabled,
        onToggleRepeat: () => setIsSingleEventRepeatEnabled((v) => !v),
        onOpenAnimationSettings: openAnimationSettings,
        exporting,
        // item 159: left/right panel toggles in the timeline
        isEventsPanelCollapsed,
        onToggleEventsPanel: toggleEventsPanel,
        onCollapseEventsPanelFromTimeline: collapseEventsPanelFromTimeline,
        isSettingsCollapsed,
        onToggleSettingsPanel: toggleSettingsPanel,
        // item 154: delay phase for fill+fade animation
        delayPhaseMs,
        // item 155: hide/reveal detail panel header
        isDetailHeaderHidden,
        onHideDetailHeader: () => setIsDetailHeaderHidden(true),
        onRevealDetailHeader: () => setIsDetailHeaderHidden(false),
        // item 157: float/dock detail panel
        isDetailPanelFloating,
        onFloatDetailPanel: () => setIsDetailPanelFloating(true),
        onDockDetailPanel: () => { setIsDetailPanelFloating(false); setIsDetailOpen(true); },
        // item 163: undock/dock the timeline itself
        isTimelineUndocked,
        onUndockTimeline: () => { setIsTimelineUndocked(true); setFloatingDetailVisible(false); },
        onDockTimeline: () => { setIsTimelineUndocked(false); setFloatingDetailVisible(false); },
        floatingDetailVisible,
        onToggleFloatingDetail: () => setFloatingDetailVisible((v) => !v),
      },
    },

    // Panels & layout
    panels: {
      events: {
        isCollapsed: eventsPanelState.isCollapsed,
        width: eventsPanelState.width,
        isAllEventsWidgetHidden: widgetsPanelState.allEventsHidden,
        handlers: {
          toggle: toggleEventsPanel,
          setCollapsed: setIsEventsPanelCollapsed,
          setPanelWidth,
        },
      },
      detail: {
        isOpen: detailPanelState.isOpen,
        isOpenRef: detailPanelState.refs.isOpen,
        height: detailPanelState.height,
        width: detailPanelState.width,
        // item 155: header hidden state
        isHeaderHidden: detailPanelState.isHeaderHidden,
        // item 157: floating panel state
        isFloating: detailPanelState.isFloating,
        handlers: {
          toggle: toggleDetailPanel,
          setOpen: setIsDetailOpen,
          updateHeight: updateDetailHeight,
          setWidth: setDetailWidth,
          // item 157: dock the floating panel back to the bottom
          dock: () => { setIsDetailPanelFloating(false); setIsDetailOpen(true); },
        },
      },
      settings: {
        isCollapsed: isSettingsCollapsed,
        tabRequest: settingsPanelState.tabRequest,
        handlers: {
          setActiveTab: setSettingsActiveTab,
          setLayoutSettings,
        },
      },
      timing: {
        isOpen: isTimingPanelOpen,
        focusOp: timingFocusOp,
        handlers: {
          setOpen: setIsTimingPanelOpen,
          setFocusOp: setTimingFocusOp,
        },
      },
    },

    // Event title & widget management
    eventTitle: {
      settings: eventTitleSettings,
      style: eventTitleStyle,
      handlers: {
        setSettings: setEventTitleSettings,
        showAboveCurrentDetail: showEventTitleAboveCurrentDetail,
        showAboveClosedDetail: showEventTitleAboveClosedDetail,
      },
    },

    // Widget management (events + detail integration)
    widgets: {
      state: {
        areJoined: widgetsPanelState.areJoined,
        isSingleEventRevealed: widgetsPanelState.singleEventRevealed,
        joinBannerRect: widgetsPanelState.joinBannerRect,
        pendingBannerDragStart: widgetsPanelState.pendingBannerDragStart,
        revealStepRequest: widgetsPanelState.revealStepRequest,
      },
      handlers: {
        expandEventsPanel: expandEventsPanelFromWidget,
        dockEventsToTopBar: dockEventsWidgetToTopBar,
        dockEventsToDetail: dockEventsWidgetToDetailPanel,
        pushEventsToPanel: pushJoinedWidgetToEventsPanel,
        pushEventsToDetail: pushJoinedWidgetToDetailPanel,
        hideJoined: hideJoinedWidget,
        split: splitWidgets,
        join: joinWidgets,
        setPendingDragStart: setPendingBannerDragStart,
        // item 162: separate toggle for all-events floater and single-event slider in detail panel
        toggleAllEventsFloater: () => setIsAllEventsInDetailPanel((v) => !v),
        isAllEventsInDetailPanel,
        toggleSingleEventSlider: () => setIsSingleEventSliderInPanel((v) => !v),
        isSingleEventSliderInPanel,
      },
    },

    // Overlays (balloons, heat map, overlays)
    overlays: {
      balloons: {
        pinnedIndices: balloonsOverlayState.pinnedIndices,
        hoveredBitInfo: balloonsOverlayState.hoveredBitInfo,
        liveLayout: balloonsOverlayState.liveLayout,
        cachelineSize: overlayState.cache.cachelineSize,
        handlers: {
          setPinnedIndices: setPinnedBitIndices,
          computeBitInfo,
          getVisibleStyles: getVisibleBalloonStyles,
        },
      },
      heatMap: {
        isEnabled: isHeatMapEnabled,
        handlers: {
          setEnabled: setIsHeatMapEnabled,
        },
      },
      cache: {
        cachelineSize,
        cachelineAnnotation,
        cachePreset,
        handlers: {
          setCachelineSize,
          setCachelineAnnotation,
          setCachePreset,
        },
      },
      prime: {
        isEnabled: isPrimeOverlayEnabled,
        handlers: {
          setEnabled: setIsPrimeOverlayEnabled,
        },
      },
      range: {
        isEnabled: isRangeOverlayEnabled,
        start: rangeOverlayStart,
        end: rangeOverlayEnd,
        handlers: {
          setEnabled: setIsRangeOverlayEnabled,
          setStart: setRangeOverlayStart,
          setEnd: setRangeOverlayEnd,
          onToggle: (enabled) => {
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
          },
          onReset: () => {
            const step = steps[currentStep];
            if (step) {
              const start = step.focusStart != null ? step.focusStart : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
              const end = step.focusStop != null ? step.focusStop : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
              setRangeOverlayStart(start);
              setRangeOverlayEnd(end);
            }
          },
        },
      },
      multiples: {
        isEnabled: isMultiplesOverlayEnabled,
        prime: multiplesOverlayPrime,
        handlers: {
          setEnabled: setIsMultiplesOverlayEnabled,
          setPrime: setMultiplesOverlayPrime,
          onToggle: (enabled) => {
            if (enabled && !isMultiplesOverlayEnabled) {
              const step = steps[currentStep];
              if (step && step.prime != null && step.prime >= 2) {
                setMultiplesOverlayPrime(step.prime);
              }
            }
            setIsMultiplesOverlayEnabled(enabled);
          },
          onReset: () => {
            const step = steps[currentStep];
            if (step && step.prime != null && step.prime >= 2) {
              setMultiplesOverlayPrime(step.prime);
            }
          },
        },
      },
      minimap: {
        isVisible: isMinimapVisible,
        handlers: {
          setVisible: setIsMinimapVisible,
        },
      },
    },

    // Detail Inspector
    detailInspector: {
      isOpen: isDetailInspectorOpen,
      mode: detailInspectorMode,
      query: detailInspectorQuery,
      rows: detailInspectorRows,
      filteredRows: filteredDetailInspectorRows,
      handlers: {
        open: openDetailInspector,
        setOpen: setIsDetailInspectorOpen,
        setQuery: setDetailInspectorQuery,
      },
    },

    // Data & context
    data: {
      steps,
      currentStep,
      currentStepData,
      stepStats,
      storageModel,
      wheelDefinition,
      layoutSettings,
      benchmarkTimingData,
      benchmarkTimingFileName,
      sourceRef,
      currentStepSourceLine: stepToLine[currentStep],
    },

    // Navigation & references
    navigation: {
      revealStepRequest,
      revealCurrentStepInPanel,
      onOpenRawLog,
      onImportBenchmarkTiming,
      autoFitColumnCount,
    },

    // Debug tools
    debug: {
      isToolsOpen: isDebugToolsOpen,
      theme,
      isGlUnavailable,
      glDebugInfo,
      debugLayerMode,
      renderMode,
      renderModeRestartNonce,
      debugGlModeOverride,
      debugWorkerGlyphMode,
      debugGlOffsetX,
      debugGlOffsetY,
      debugGlAutoOffsetY,
      isDebugCalibrationMode,
      debugRenderTuning,
      handlers: {
        setDebugLayerMode,
        setRenderMode,
        restartRenderMode,
        setDebugGlModeOverride,
        setDebugWorkerGlyphMode,
        setDebugGlOffsetX,
        setDebugGlOffsetY,
        setDebugGlAutoOffsetY,
        setIsDebugCalibrationMode,
        setDebugRenderTuning,
        applySnapshot: applyDebugSnapshot,
        forceGlRedraw,
      },
    },
  };

  const toolbarProps = {
    platform: {
      isMacPlatform,
      isWindowsPlatform,
      isElectron,
    },
    traceInfo: {
      effectiveTitle,
      isTraceInfoVisible,
      setIsTraceInfoVisible,
      traceInfoToggleRef,
      traceInfoPopoverRef,
      storageModel,
      setStorageModel,
      header,
      traceInfoSections,
      onFetchRawSource: fetchRawSource,
      lineToStep,
      onJumpToStep,
      rawScrollToLine,
      onClearRawScrollToLine,
      currentStepSourceLine: stepToLine[currentStep],
      onClose,
    },
    search: {
      isSearchOpen,
      setIsSearchOpen,
      searchQuery,
      setSearchQuery,
      searchResult,
      handleSearch,
    },
    view: {
      zoom,
      doZoom,
      resetZoom,
      isTiltActive,
      isTiltButtonEnabled,
      toggleTilt,
    },
    debug: {
      isDebugToolsOpen,
      setIsDebugToolsOpen,
    },
    exportState: {
      exporting,
      exportPng,
      exportVideo,
      cancelExport,
      exportProgress,
    },
  };

  return (
    <ThemeProvider value={themeContextValue}>
    <PlaybackProvider value={playbackContextValue}>
    <AnimationConfigProvider value={animationConfigContextValue}>
    <PanelLayoutProvider value={panelLayoutContextValue}>
    <div className={`visualizer${isMacPlatform ? ' platform-mac' : ''}${isWindowsPlatform ? ' platform-windows' : ''}${isElectron ? ' platform-electron' : ' platform-browser'}`}>
      <Toolbar {...toolbarProps} />

      {exporting && <ExportProgress progress={exportProgress} />}
      <StatusBanners exportError={exportError} isGlUnavailable={isGlUnavailable} />

      <VisualizerMainContent
        {...visualizerMainContentProps}
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

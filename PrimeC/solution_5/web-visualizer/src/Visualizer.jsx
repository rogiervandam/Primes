import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { bumpRender } from './lib/debugCounters';
import { SieveRenderer } from './SieveRenderer';
import { hexToRgb, labelTextColor } from './renderer/drawingHelpers';
import { BitGridGLWorker, isWorkerGLSupported } from './renderer/gl/BitGridGLWorker';
import { GlyphTextGLCore } from './renderer/gl/GlyphTextGLCore';

import EventsPanel from './visualizer/EventsPanel';
import DetailPanel from './visualizer/DetailPanel';
import SettingsPanel from './visualizer/SettingsPanel';
import TimingPanel from './visualizer/TimingPanel';
import Toolbar from './visualizer/Toolbar';
import ExportProgress from './visualizer/ExportProgress';
import CanvasStage from './visualizer/CanvasStage';
import VisualizerMainContent from './visualizer/VisualizerMainContent';
import DetailInspectorOverlay from './visualizer/DetailInspectorOverlay';
import BitHistoryBalloons from './visualizer/BitHistoryBalloons';
import KeyboardShortcutsOverlay from './visualizer/KeyboardShortcutsOverlay';
import SearchOverlay from './visualizer/SearchOverlay';
import DebugToolsPanel from './visualizer/DebugToolsPanel';
import { useTraceExport, useRawSource, useSearchState, useStepDisplayData } from './hooks/data';
import {
  useKeyboardShortcuts,
  usePointerGestures,
  useBalloonLayout,
  useStepSelectionHandlers,
  useSelectionOrchestration,
  useWASDNavigation,
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
import { useVisualizerStateBundle } from './hooks/useVisualizerStateBundle';
import { useVisualizerPropBundles } from './hooks/useVisualizerPropBundles';
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
import { ActiveStepProvider } from './contexts/ActiveStepContext';
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
  // Perf counter — incremented on every render so DebugToolsPanel can show re-render rate.
  useEffect(() => { bumpRender('Visualizer'); });

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
    timelineColors, setTimelineColors,  // item 321
    floaterBg, setFloaterBg,            // item 322/323
    draggerColor, setDraggerColor,      // item 322/323
    zoneBgOpacity, setZoneBgOpacity,    // item 342
  } = useThemeAndColors({ initialPrefs });

  const {
    animMode, setAnimMode,
    animStyle, setAnimStyle,
    delayBetweenEvents, setDelayBetweenEvents, delayBetweenEventsRef,
    eventTimeTargets, setEventTimeTargets, eventTimeTargetsRef,
    eventDurationMode, setEventDurationMode, eventDurationModeRef,
    bitAnimInterval, setBitAnimInterval,
    maskAnimInterval, setMaskAnimInterval,
    bitsAtTimeRatioRef, timeRatioAtBitIndexRef, computeEventDurationRef,
    stepSpeedValue, maskSpeedValue, setStepSpeedValue, setMaskSpeedValue,
    cycleAnimStyle, cycleAnimMode, animStyleInfo, animModeInfo,
    animateBitsMode, setAnimateBitsMode, animateBitsModeRef,  // item 244
    delayBetweenRepeats, setDelayBetweenRepeats,
  } = useAnimationConfig({ initialPrefs });

  const {
    bitAnimationMode, setBitAnimationMode, bitAnimationModeRef,
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
    rangeOverlayUnit, setRangeOverlayUnit,
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
    joinBannerRect, setJoinBannerRect,
    pendingBannerDragStart, setPendingBannerDragStart,
    revealStepRequest, setRevealStepRequest,
    isTimingPanelOpen, setIsTimingPanelOpen,
    timingFocusOp, setTimingFocusOp,
    isDetailInspectorOpen, setIsDetailInspectorOpen,
    detailInspectorMode, setDetailInspectorMode,
    detailInspectorQuery, setDetailInspectorQuery,
  } = useWidgetState({ initialPrefs });

  // item 162: all-events transport shown inside the detail panel
  const [isAllEventsInDetailPanel, setIsAllEventsInDetailPanel] = useState(initialPrefs.isAllEventsInDetailPanel);

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
  } = usePanelState({ initialPrefs, introPhase });

  // item 163: undocked double timeline (floats freely over canvas)
  const [isTimelineUndocked, setIsTimelineUndocked] = useState(false);

  // item 243: fly mode — WASD navigation with full mouse look; closes panels on enter
  const [flyModeActive, setFlyModeActive] = useState(false);
  const flyModeActiveRef = useRef(false);
  flyModeActiveRef.current = flyModeActive;
  const savedPanelsRef = useRef(null);
  const toggleFlyMode = useCallback(() => {
    setFlyModeActive((prev) => {
      const next = !prev;
      flyModeActiveRef.current = next;
      if (next) {
        // Enter fly mode: save and close all panels for unobstructed view
        savedPanelsRef.current = {
          isEventsPanelCollapsed,
          isSettingsCollapsed,
          isDetailOpen: isDetailOpenRef.current,
        };
        if (!isEventsPanelCollapsed) setIsEventsPanelCollapsed(true);
        if (!isSettingsCollapsed) setIsSettingsCollapsed(true);
        if (isDetailOpenRef.current) setIsDetailOpen(false);
      } else {
        // Exit fly mode: restore panels to their previous state
        const saved = savedPanelsRef.current;
        if (saved) {
          if (!saved.isEventsPanelCollapsed) setIsEventsPanelCollapsed(false);
          if (!saved.isSettingsCollapsed) setIsSettingsCollapsed(false);
          if (saved.isDetailOpen) setIsDetailOpen(true);
          savedPanelsRef.current = null;
        }
      }
      return next;
    });
  }, [isEventsPanelCollapsed, isSettingsCollapsed, isDetailOpenRef, setIsEventsPanelCollapsed, setIsSettingsCollapsed, setIsDetailOpen]);

  // item 193: direction the events panel slides when collapsed
  const [eventsCollapseDir, setEventsCollapseDir] = useState('left');
  // item 349: true when the events panel was opened via the nearby-events bottom arrow
  const [eventsOpenFromBottom, setEventsOpenFromBottom] = useState(false);
  const collapseEventsPanelFromTimeline = useCallback(() => { setEventsCollapseDir('right'); setIsEventsPanelCollapsed(true); }, [setIsEventsPanelCollapsed]);

  const {
    pinnedBitIndices, setPinnedBitIndices,
    hoveredBitInfo, setHoveredBitInfo,
    balloonLiveLayout, setBalloonLiveLayout,
    balloonLayoutRafRef, balloonLiveLayoutTimerRef, lastHoveredIdxRef,
    scheduleBalloonRelayout,
  } = useBalloonLayout();

  // item 331: group inspector — byte/uint32/uint64/cacheline detail panel
  const [groupInspectorUnit, setGroupInspectorUnit] = useState(null);
  const openGroupInspector = useCallback((unit) => setGroupInspectorUnit(unit), []);
  const closeGroupInspector = useCallback(() => setGroupInspectorUnit(null), []);

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

  // item 416: auto-set mode – range overlay tracks the current/selected step's range
  const [rangeAutoSet, setRangeAutoSet] = useState(true);
  useEffect(() => {
    if (!rangeAutoSet || !isRangeOverlayEnabled) return;
    const step = steps[currentStep];
    if (!step) return;
    const start = step.focusStart != null ? step.focusStart : (step.changedBits?.length > 0 ? Math.min(...step.changedBits) : null);
    const end   = step.focusStop  != null ? step.focusStop  : (step.changedBits?.length > 0 ? Math.max(...step.changedBits) : null);
    if (start != null) setRangeOverlayStart(start);
    if (end   != null) setRangeOverlayEnd(end);
  }, [rangeAutoSet, isRangeOverlayEnabled, currentStep, steps, setRangeOverlayStart, setRangeOverlayEnd]);

  const [playing, setPlaying] = useState(false);
  const [playSpeedPercent, setPlaySpeedPercent] = useState(initialPrefs.playSpeedPercent);
  const playSpeedPercentRef = useRef(playSpeedPercent);
  playSpeedPercentRef.current = playSpeedPercent;
  const [zoom, setZoom] = useState(1);
  const [isTraceInfoVisible, setIsTraceInfoVisible] = useState(false);
  const [isShortcutsHelpVisible, setIsShortcutsHelpVisible] = useState(false);
  // item 239: Spotlight-style search overlay
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
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
  // item 335: block balloon clicks while the intro 2D→3D animation is in progress
  const isBalloonClickEnabled = (balloonMode === 'bit-clock' || balloonMode === 'click-hover') && introPhase === 'visible';
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
    addCameraDomListener,
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

  const { updateMinimapAvailability } = useMinimapAvailability({ rendererRef, containerRef, isMinimapVisible, setIsMinimapAvailable });

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
    addCameraDomListener,
    setAutoFitColumnCount,
    isMinimapVisible,
    updateMinimapAvailability,
    getMinimapDetailH,
  });

  const { computeBitInfo } = useBitInfo({ rendererRef, stepsRef, wheelDefinition });

  const { updateDetailOpen, updateDetailHeight } = useDetailPanelStateSync({ isDetailOpenRef, setIsDetailOpen, setIsDetailHeaderHidden, detailHeightRef, setDetailHeight });

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

  const { clearScheduledLayoutRefresh, schedulePostLayoutRefresh } = useLayoutRefreshScheduler({ layoutRefreshTimeoutRef, layoutRefreshRaf1Ref, layoutRefreshRaf2Ref });

  const { applyViewportFit } = useViewportFit();

  /**
   * Stash a viewport anchor for the panel-toggle resize useEffect.
   * Must be called BEFORE the state update that triggers the layout change
   * (see §5 minefield: pendingResizeAnchorRef). Each panel toggle handler
   * calls this once immediately before its setState call.
   */
  const { captureResizeAnchor } = useCaptureResizeAnchor({ pendingResizeAnchorRef, captureViewportAnchor });

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
    timelineColors,  // item 321
    floaterBg,        // item 322/323
    draggerColor,     // item 322/323
    zoneBgOpacity,    // item 342
    eventDurationMode,
    playSpeedPercent,
    delayBetweenEvents,
    delayBetweenRepeats,
    eventTimeTargets,
    isAllEventsWidgetHidden,
    isAllEventsInDetailPanel,
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
  });

  // Stable wrapper — goToStep recreates on every render (currentStep in deps).
  // Putting a stable ref-based wrapper in PlaybackContext keeps the context
  // value stable during playback, preventing EventsPanel from re-rendering.
  const stableGoToStep = useCallback((target, opts) => goToStepRef.current?.(target, opts), []);

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
    navigateToRange,
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
  // activateRangeOverlay: set and enable the range overlay from a search query.
  // item 254: use navigateToRange so the camera zooms to show the full range.
  const activateRangeOverlay = useCallback((startBit, endBit) => { setIsRangeOverlayEnabled(true); setRangeOverlayStart(startBit); setRangeOverlayEnd(endBit); navigateToRange(startBit, endBit); }, [setIsRangeOverlayEnabled, setRangeOverlayStart, setRangeOverlayEnd, navigateToRange]);

  const {
    searchQuery, setSearchQuery,
    searchResult,
    isSearchOpen, setIsSearchOpen,
    handleSearch,
  } = useSearchState({ rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH, activateRangeOverlay });





  const { buildCombinedSelectionOverlay } = useSelectionOverlay({ steps });

  // Use stableGoToStep here so handleStepSelection's identity does not change
  // every step during playback (goToStep itself depends on currentStep, which
  // would otherwise cascade into EventsPanel re-rendering on every step).
  const { handleStepSelection, handleMultiStepSelect } = useStepSelectionHandlers({ stopPlayback, goToStep: stableGoToStep, globalPausedRef, setIsAnimationReplayPaused, setSelectedSteps });

  useSelectionOrchestration({
    steps,
    initialHighlightHoldRef,
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
      isScrubbingTopRef,
      initialHighlightHoldRef,
      delayBetweenEventsRef,   // item 217: auto-advance to next event when repeat disabled
      stepResumeStartIndexRef,
      stepResumeMaskProgressRef,
      setIsStepAnimRunningRef,
      isStepAnimRunningRefForScheduler,
      isAutoAnimateOnSelectRef,
    },
    loopState: {
      playing,
      steps,
      currentStep,
      selectedSteps,
      isAnimationReplayPaused,
    },
    loopHandlers: {
      setPlaying,
      setCurrentStep,
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
    globalPausedRef,
    setIsAnimationReplayPaused,
    currentStep,
    stepsLength: steps.length,
    isStepAnimRunning,
    setPlaying,
    playing,
    goToStep,
    stepsRef,
    rendererRef,
    selectedStepsRef,
    bitAnimationModeRef,
    stepScrubProgress,
    stepResumeMaskProgressRef,
    stepResumeStartIndexRef,
  });

  // Stable wrapper — handlePlayPause recreates on every render (currentStep and
  // goToStep in deps). Using a ref-based wrapper keeps PlaybackContext stable.
  const handlePlayPauseRef = useRef(handlePlayPause);
  handlePlayPauseRef.current = handlePlayPause;
  const stableHandlePlayPause = useCallback(() => handlePlayPauseRef.current?.(), []);

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
    onInspectCanvasUnit: openGroupInspector,
    // item 144: collapse the settings panel when the user clicks on the canvas
    collapseSettingsIfOpen: isSettingsCollapsed ? undefined : () => setIsSettingsCollapsed(true),
  });

  // item 237: WASD/QE fly-through navigation. Registered BEFORE the keyboard shortcuts
  // hook so that stopPropagation in the WASD handler prevents WASD keys from also
  // triggering other shortcuts (e.g. D → detail panel toggle).
  // item 243: flyModeActiveRef gates whether WASD keys are active.
  useWASDNavigation({
    rendererRef,
    canvasRef: glCanvasRef,
    getMinimapDetailH,
    updateMinimapAvailability,
    scheduleBalloonRelayout,
    flyModeActiveRef,
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
    toggleEventsPanel,      // item 245
    toggleSettingsPanel,    // item 245
    openRawLog: onOpenRawLog, // item 245
    toggleFlyMode,          // item 243
    flyModeActiveRef,       // item 243
    toggleDebugToolsPanel: useCallback(() => setIsDebugToolsOpen((v) => !v), []),
    camera3DRef,
    toggleShortcutsOverlay: useCallback(() => setIsShortcutsHelpVisible((v) => !v), []),
    toggleSpotlight: useCallback(() => setIsSpotlightOpen((v) => !v), []),
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

  const { currentStepData, surroundingEvents } = useStepDisplayData({ steps, currentStep, selectedSteps, buildCombinedSelectionOverlay });

  // Reset agg mask step index when selection changes so detail panel shows index 0
  useEffect(() => {
    aggMaskStepSetterRef.current(0);
  }, [selectedSteps]); // eslint-disable-line react-hooks/exhaustive-deps

  const { renderCanvasStyle, mergedCamera3DContainerStyle } = useCanvasStyles({ canvasAnchorPx, introPhase, camera3DContainerStyle, canvasColors, theme });

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
    timelineColors,       // item 321
    setTimelineColors,    // item 321
    floaterBg,            // item 322/323
    setFloaterBg,         // item 322/323
    draggerColor,         // item 322/323
    setDraggerColor,      // item 322/323
    zoneBgOpacity,        // item 342
    setZoneBgOpacity,     // item 342
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
    timelineColors,
    setTimelineColors,
    floaterBg,
    setFloaterBg,
    draggerColor,
    setDraggerColor,
    zoneBgOpacity,
    setZoneBgOpacity,
  ]);

  // item 236/#4 perf: currentStep is removed from PlaybackContext so that step
  // advances during playback do not trigger re-renders in every PlaybackContext
  // consumer. currentStep is provided separately via ActiveStepContext using a
  // push-subscription model that allows imperative DOM updates without React
  // reconciliation.
  const playbackContextValue = useMemo(() => ({
    steps,
    goToStep: stableGoToStep,
    playing,
    handlePlayPause: stableHandlePlayPause,
    exporting: !!exporting,
    setPlaySpeedPercent,
    isScrubbingTopRef,
    playSpeedPercent,
  }), [
    steps,
    stableGoToStep,
    playing,
    stableHandlePlayPause,
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
    animateBitsMode,          // item 244
    setAnimateBitsMode,       // item 244
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
    animateBitsMode,          // item 244
    setAnimateBitsMode,       // item 244
  ]);

  // item 318: toolbar detail-panel toggle must target floating panel when undocked
  const toggleDetailPanelContextual = toggleDetailPanel;

  const panelLayoutContextValue = useMemo(() => ({
    collapseEventsHideWidget,
    isEventsPanelCollapsed,
    setIsEventsPanelCollapsed,
    toggleEventsPanel,
    eventsCollapseDir,
    setEventsCollapseDir,
    collapseEventsPanelFromTimeline,
    eventsOpenFromBottom,       // item 349
    setEventsOpenFromBottom,    // item 349
    isDetailOpen: isDetailOpen,
    setIsDetailOpen,
    isDetailOpenRef,
    toggleDetailPanel: toggleDetailPanelContextual,
    isSettingsCollapsed,
    toggleSettingsPanel,
    isAllEventsWidgetHidden,
    showAllEventsWidget,
    areControlsHidden,
    isTimingPanelOpen,
    setIsTimingPanelOpen,
    detailHeight,
  }), [
    collapseEventsHideWidget,
    isEventsPanelCollapsed,
    setIsEventsPanelCollapsed,
    toggleEventsPanel,
    eventsCollapseDir,
    setEventsCollapseDir,
    collapseEventsPanelFromTimeline,
    eventsOpenFromBottom,
    setEventsOpenFromBottom,
    isDetailOpen,
    setIsDetailOpen,
    isDetailOpenRef,
    toggleDetailPanelContextual,
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
    steps,  // item 224+225: passed to build bit→event index inside hook
  });

  const { openDetailInspector } = useDetailInspectorActions({ setDetailInspectorMode, setDetailInspectorQuery, setIsDetailInspectorOpen });

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

  const { allEventsTransportContent } = useStepAnimContent({
    isAllEventsInDetailPanel,
    currentStep,
    steps,
    playing,
    exporting,
    handlePlayPause,
    goToStep,
    isScrubbingTopRef,
    playSpeedPercent,
    setPlaySpeedPercent,
    setIsAllEventsInDetailPanel,
    setIsAllEventsWidgetHidden,
  });

  // ============================================================================
  // 2.1: Semantic state bundles (→ src/hooks/useVisualizerStateBundle.js)
  // Bundles are available for DevTools inspection; not consumed in this file.
  // ============================================================================
  // eslint-disable-next-line no-unused-vars
  const {
    canvasState, uiFrameState, animationState, playbackState, themeState,
    panelState, overlayState, bitState, cameraState, debugState, uiState,
    timingPanelState, detailInspectorState, animationTimingRefs, uiElementRefs,
    platformInfo, uiLogic,
  } = useVisualizerStateBundle({
    // Canvas refs
    minimapCanvasRef, containerRef, rendererRef,
    glCanvasRef, glRendererRef, glyphCanvasRef, glyph2DCanvasRef, glyphRendererRef, wrapperCanvasRef,
    glCssUnlockTokenRef, glCssUnlockRafRef, glCssUnlockTimeoutRef, glCssLockStateRef, pendingRenderRafRef,
    // 3D camera
    mode3D, camera3DRef, camera3DTransform, camera3DContainerStyle, cameraKey,
    // UI frame
    introPhase, isUiChromeVisible, loadingOverlayPhase, isTopbarPlaybackReady, overlayBarPct,
    introTiltStartedRef, overlayStartTimeRef, pendingIntroAfterOverlayRef, loadCompleteRef, loadProgressRef,
    // Animation config
    animMode, animStyle, delayBetweenEvents, eventTimeTargets, eventDurationMode,
    bitAnimInterval, maskAnimInterval, stepSpeedValue, maskSpeedValue,
    // Animation runtime
    bitAnimationMode, isAutoAnimateOnSelect, isAnimationReplayPaused, isStepAnimRunning,
    stepScrubProgress, delayPhaseMs,
    // Animation refs
    eventTimeTargetsRef, eventDurationModeRef, bitsAtTimeRatioRef, timeRatioAtBitIndexRef,
    computeEventDurationRef, globalPausedRef, seekGenRef, animBusyUntilRef,
    isScrubbingTopRef, stepScrubProgressRef, stepScrubProgressValueRef,
    setIsStepAnimRunningRef, isStepAnimRunningRefForScheduler,
    stepResumeStartIndexRef, stepResumeMaskProgressRef,
    currentAnimIntervalRef, currentMaskAnimIntervalRef, pausedStepAnimLoopRef, selectedAnimLoopRef,
    // Playback
    playing, currentStep, playSpeedPercent,
    playSpeedPercentRef, playTimerRef, playTimeoutRef, currentStepRef, stepsRef,
    // Theme
    colorPreset, customColors, canvasColors, gridOpacity, zoom,
    debugGlOffsetXRef, debugGlOffsetYRef, debugGlAutoOffsetYRef, glDebugLastUpdateRef,
    // Panel: events
    isEventsPanelCollapsed, panelWidth,
    // Panel: settings
    isSettingsCollapsed, settingsActiveTab, settingsTabRequest,
    // Panel: detail
    isDetailOpen, detailHeight, detailWidth, isDetailOpenRef, detailHeightRef,
    isDetailHeaderHidden, isDetailPanelFloating,
    // Panel: minimap
    isMinimapVisible, isMinimapAvailable,
    // Panel: widgets
    isAllEventsWidgetHidden, isAllEventsInDetailPanel,
    joinBannerRect, pendingBannerDragStart, revealStepRequest,
    // Panel: refs
    layoutRefreshTimeoutRef, layoutRefreshRaf1Ref, layoutRefreshRaf2Ref,
    canvasAnchorPx, pendingResizeAnchorRef, deferredPanelStateRef, viewportAnimRef,
    // Overlays
    isHeatMapEnabled, isPrimeOverlayEnabled,
    isRangeOverlayEnabled, rangeOverlayStart, rangeOverlayEnd,
    isMultiplesOverlayEnabled, multiplesOverlayPrime,
    areBalloonsEnabled, isBalloonClickEnabled, isBalloonHoverEnabled,
    pinnedBitIndices, hoveredBitInfo, balloonLiveLayout,
    balloonLayoutRafRef, balloonLiveLayoutTimerRef, lastHoveredIdxRef,
    cachelineSize, cachelineAnnotation, cachePreset,
    // Bit state
    bitStateRef, bitStateCheckpointsRef, bitStateDirtyRef, selectedSteps, selectedStepsRef,
    // Debug
    isDebugToolsOpen, isGlUnavailable, glDebugInfo,
    debugLayerMode, debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY,
    isDebugCalibrationMode, debugRenderTuning,
    // UI
    isTraceInfoVisible, isShortcutsHelpVisible, layoutSettings, eventTitleSettings, storageModel, autoFitColumnCount,
    // Timing panel
    isTimingPanelOpen, timingFocusOp,
    // Detail inspector
    isDetailInspectorOpen, detailInspectorMode, detailInspectorQuery,
    // Animation timing refs
    rippleRef, seqTimerRef, runEffectCancelRef, triggerAnimationRef, stopSeqAnimRef,
    initialFitDoneRef, initialHighlightHoldRef,
    // UI element refs
    traceInfoPopoverRef, traceInfoToggleRef,
    // Platform
    isMacPlatform, isWindowsPlatform, isElectron,
    // Tilt
    isTiltActive,
    // Derived
    areControlsHidden, balloonMode,
  });

  // ============================================================================
  // 2.2: Props bundles for child components (→ src/hooks/useVisualizerPropBundles.js)
  // ============================================================================
  const { visualizerMainContentProps, toolbarProps } = useVisualizerPropBundles({
    // Canvas & rendering
    mode3D,
    containerRef, glCanvasRef, glyphCanvasRef, glyph2DCanvasRef, wrapperCanvasRef,
    rendererRef, glRendererRef, camera3DRef,
    mergedCamera3DContainerStyle, renderCanvasStyle,
    camera3DTransform,
    zoom,
    isMacPlatform, isWindowsPlatform,
    // UI frame
    isUiChromeVisible, introPhase, loadingOverlayPhase, overlayBarPct,
    handleIntroTransitionEnd,
    // Playback
    steps, currentStep, selectedSteps, playing,
    handleStepSelection, handleMultiStepSelect, stopPlayback, goToStep,
    // Animation & content
    allEventsTransportContent, surroundingEvents, currentStepData,
    aggMaskStepIndex, aggMaskStepSetterRef,
    stepScrubProgress, seekStepAnimation, setStepScrubProgress, handleStepAnimToggle,
    isStepAnimRunning, isAnimationReplayPaused, openAnimationSettings, exporting,
    isEventsPanelCollapsed, toggleEventsPanel, collapseEventsPanelFromTimeline,
    revealCurrentStepInPanel, isSettingsCollapsed, toggleSettingsPanel, delayPhaseMs,
    isDetailHeaderHidden, setIsDetailHeaderHidden,
    isDetailPanelFloating, setIsDetailPanelFloating, setIsDetailOpen,
    isTimelineUndocked, setIsTimelineUndocked,
    timelineColors, floaterBg, draggerColor, colorPreset, zoneBgOpacity,
    // Panels: events
    panelWidth, isAllEventsWidgetHidden,
    setIsEventsPanelCollapsed, setPanelWidth,
    // Panels: detail
    detailWidth,
    toggleDetailPanel, updateDetailHeight, setDetailWidth,
    // Panels: settings
    settingsTabRequest, setSettingsActiveTab, setLayoutSettings,
    // Panels: timing
    isTimingPanelOpen, timingFocusOp, setIsTimingPanelOpen, setTimingFocusOp,
    // Event title
    eventTitleSettings, setEventTitleSettings,
    showEventTitleAboveCurrentDetail, showEventTitleAboveClosedDetail,
    // Widgets
    joinBannerRect, pendingBannerDragStart, revealStepRequest,
    expandEventsPanelFromWidget, dockEventsWidgetToTopBar, dockEventsWidgetToDetailPanel,
    pushJoinedWidgetToEventsPanel, pushJoinedWidgetToDetailPanel, hideJoinedWidget,
    splitWidgets, joinWidgets, setPendingBannerDragStart,
    setIsAllEventsInDetailPanel, isAllEventsInDetailPanel,
    // Overlays: balloons
    pinnedBitIndices, hoveredBitInfo, balloonLiveLayout, cachelineSize,
    setPinnedBitIndices, computeBitInfo, getVisibleBalloonStyles,
    // Overlays: group inspector
    groupInspectorUnit, effectiveGroupBits, storageModel, wheelDefinition,
    layoutSettings, header, openGroupInspector, closeGroupInspector,
    // Overlays: heat map / cache / prime
    isHeatMapEnabled, setIsHeatMapEnabled,
    cachelineAnnotation, cachePreset, setCachelineSize, setCachelineAnnotation, setCachePreset,
    isPrimeOverlayEnabled, setIsPrimeOverlayEnabled,
    // Overlays: range
    isRangeOverlayEnabled, rangeOverlayStart, rangeOverlayEnd, rangeOverlayUnit,
    setIsRangeOverlayEnabled, setRangeOverlayStart, setRangeOverlayEnd, setRangeOverlayUnit,
    rangeAutoSet, setRangeAutoSet,
    // Overlays: multiples
    isMultiplesOverlayEnabled, multiplesOverlayPrime,
    setIsMultiplesOverlayEnabled, setMultiplesOverlayPrime,
    // Overlays: minimap
    isMinimapVisible, setIsMinimapVisible,
    // Detail inspector
    isDetailInspectorOpen, detailInspectorMode, detailInspectorQuery,
    detailInspectorRows, filteredDetailInspectorRows,
    openDetailInspector, setIsDetailInspectorOpen, setDetailInspectorQuery,
    // Data / context
    stepStats, benchmarkTimingData, benchmarkTimingFileName,
    sourceRef, stepToLine, autoFitColumnCount,
    // Navigation
    onOpenRawLog, onImportBenchmarkTiming,
    // Debug tools
    isDebugToolsOpen, theme,
    isGlUnavailable, glDebugInfo, debugLayerMode,
    renderMode, renderModeRestartNonce, debugGlModeOverride, debugWorkerGlyphMode,
    debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY,
    isDebugCalibrationMode, debugRenderTuning,
    setDebugLayerMode, setRenderMode, restartRenderMode,
    setDebugGlModeOverride, setDebugWorkerGlyphMode,
    setDebugGlOffsetX, setDebugGlOffsetY, setDebugGlAutoOffsetY,
    setIsDebugCalibrationMode, setDebugRenderTuning,
    applyDebugSnapshot, forceGlRedraw,
    // Toolbar: trace info
    effectiveTitle, isTraceInfoVisible, setIsTraceInfoVisible,
    traceInfoToggleRef, traceInfoPopoverRef,
    setStorageModel, traceInfoSections, fetchRawSource, lineToStep,
    onJumpToStep, rawScrollToLine, onClearRawScrollToLine, onClose,
    // Toolbar: search
    isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery,
    searchResult, handleSearch, isSpotlightOpen, setIsSpotlightOpen,
    // Toolbar: view / platform
    isElectron, doZoom, resetZoom, isTiltActive, isTiltButtonEnabled, toggleTilt,
    // Toolbar: export
    setIsDebugToolsOpen, exportPng, exportVideo, cancelExport, exportProgress,
  });

  return (
    <ThemeProvider value={themeContextValue}>
    <PlaybackProvider value={playbackContextValue}>
    <ActiveStepProvider currentStep={currentStep}>
    <AnimationConfigProvider value={animationConfigContextValue}>
    <PanelLayoutProvider value={panelLayoutContextValue}>
    <div className={`visualizer${isMacPlatform ? ' platform-mac' : ''}${isWindowsPlatform ? ' platform-windows' : ''}${isElectron ? ' platform-electron' : ' platform-browser'}${flyModeActive ? ' visualizer--fly-mode' : ''}`}
      style={{
        // item 328: operation badge bg = events timeline color; fg = auto-contrast
        '--ep-label-color': timelineColors?.events || '#b87333',
        '--ep-label-fg': labelTextColor(hexToRgb(timelineColors?.events || '#b87333')),
      }}>
      <Toolbar {...toolbarProps} />

      {exporting && <ExportProgress progress={exportProgress} />}
      <StatusBanners exportError={exportError} isGlUnavailable={isGlUnavailable} />

      {/* item 243: fly mode indicator banner — shown when fly mode is active */}
      {flyModeActive && (
        <div className="fly-mode-banner" role="status" aria-live="polite">
          <span className="fly-mode-banner-icon">✈</span>
          <span className="fly-mode-banner-text">FLY MODE</span>
          <span className="fly-mode-banner-hint">WASD · R/C up/down · Q/E zoom · F to exit</span>
        </div>
      )}

      <VisualizerMainContent
        {...visualizerMainContentProps}
      />
      <KeyboardShortcutsOverlay
        open={isShortcutsHelpVisible}
        onClose={() => setIsShortcutsHelpVisible(false)}
      />
      {/* item 239: Spotlight-style search overlay — triggered by / or Cmd+K */}
      <SearchOverlay
        open={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        steps={steps}
        goToStep={goToStep}
        handleSearch={handleSearch}
        setIsEventsPanelCollapsed={setIsEventsPanelCollapsed}
        revealCurrentStepInPanel={revealCurrentStepInPanel}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSetRange={activateRangeOverlay}
        storageModel={storageModel}
        wheelDefinition={wheelDefinition}
      />
    </div>
    </PanelLayoutProvider>
    </AnimationConfigProvider>
    </ActiveStepProvider>
    </PlaybackProvider>
    </ThemeProvider>
  );
}

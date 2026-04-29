import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SieveRenderer, bitToNumber, numberToBit, CACHE_PRESETS } from './SieveRenderer';
import { BitGridGLWorker, isWorkerGLSupported } from './renderer/gl/BitGridGLWorker';
import StepPanel from './StepPanel';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import TimingPanel from './TimingPanel';
import Toolbar from './visualizer/Toolbar';
import ExportProgress from './visualizer/ExportProgress';
import CanvasStage from './visualizer/CanvasStage';
import EventTitleBanner from './visualizer/EventTitleBanner';
import DetailInspectorOverlay from './visualizer/DetailInspectorOverlay';
import StepAnimSliders from './visualizer/StepAnimSliders';
import BitHistoryBalloons from './visualizer/BitHistoryBalloons';
import { useTraceExport } from './hooks/useTraceExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { use3DCamera } from './hooks/use3DCamera';
import { usePlaybackClock } from './hooks/usePlaybackClock';
import { applyPan } from './visualizer/gestures/pan';
import { applyRotate } from './visualizer/gestures/rotate';
import { applyWheel } from './visualizer/gestures/wheel';
import {
  DEFAULT_EVENT_TIME_TARGETS,
  DEFAULT_LAYOUT_SETTINGS as DEFAULT_SETTINGS,
  DEFAULT_EVENT_TITLE_SETTINGS,
  DEFAULT_DEPTH_SETTINGS,
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

export default function Visualizer({
  trace,
  fileName,
  benchmarkTimingData,
  benchmarkTimingFileName,
  onImportBenchmarkTiming,
  onClose,
  autoRender,
}) {
  const { header, steps } = trace;
  const traceTitle = useMemo(() => header.title || fileName || 'Sieve Visualizer', [header.title, fileName]);
  const traceInfoSections = useMemo(
    () => buildTraceInfoSections(header, fileName),
    [header, fileName],
  );

  const canvasRef = useRef(null);
  const settledCanvasRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  // Experimental WebGL bit-grid (see docs/AI_MAINTENANCE.md §8). Only
  const glCanvasRef = useRef(null);
  const glRendererRef = useRef(null);
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

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Playback speed as a percentage of the per-event "normal" time target.
  // 50% => animations take twice as long; 200% => half as long. Range 25..400.
  const [playSpeedPercent, setPlaySpeedPercent] = useState(initialPrefs.playSpeedPercent);
  const playSpeedPercentRef = useRef(playSpeedPercent);
  playSpeedPercentRef.current = playSpeedPercent;
  const [zoom, setZoom] = useState(1);
  const [panelWidth, setPanelWidth] = useState(320);
  const [theme, setTheme] = useState(initialPrefs.theme);
  const [showTraceInfo, setShowTraceInfo] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(initialPrefs.settingsCollapsed);
  const [layoutSettings, setLayoutSettings] = useState(initialPrefs.layoutSettings);
  const [eventTitleSettings, setEventTitleSettings] = useState(initialPrefs.eventTitleSettings);
  const [depthSettings, setDepthSettings] = useState(initialPrefs.depthSettings);
  const [detailOpen, setDetailOpen] = useState(initialPrefs.detailOpen);
  // Two distinct delays. Both default to 500 ms but are independently adjustable.
  // - delayBetweenEvents: pause after one event finishes before the all-events
  //   widget advances to the next event (only honored while `playing`).
  // - delayBetweenRepeats: pause between repeats when the single-event widget
  //   is in play mode and is auto-replaying the current event.
  // Both fall back to the legacy single `repeatAnim` setting when absent —
  // see `initialDelayMs` in `lib/viewPrefs.js`.
  const [delayBetweenEvents, setDelayBetweenEvents] = useState(initialPrefs.delayBetweenEvents);
  const [delayBetweenRepeats, setDelayBetweenRepeats] = useState(initialPrefs.delayBetweenRepeats);
  const delayBetweenRepeatsRef = useRef(delayBetweenRepeats);
  delayBetweenRepeatsRef.current = delayBetweenRepeats;
  // Per-event time targets (ms) keyed by change-count tier.
  const [eventTimeTargets, setEventTimeTargets] = useState(initialPrefs.eventTimeTargets);
  const eventTimeTargetsRef = useRef(eventTimeTargets);
  eventTimeTargetsRef.current = eventTimeTargets;
  const [animMode, setAnimMode] = useState('sequential'); // 'all' or 'sequential'
  const [animStyle, setAnimStyle] = useState('fade'); // 'ripple', 'fade', 'pulse', 'none'
  const [maskAnimationEnabled, setMaskAnimationEnabled] = useState(true);
  const [animationReplayPaused, setAnimationReplayPaused] = useState(false);
  // True only when the user explicitly pressed Play on the single-event widget.
  // The per-event auto-replay loop only runs while this is true. Cleared on
  // explicit pause, on navigation (next/prev/scrub), and when entering all-
  // events playback (which has its own scheduler). Persisted across renders.
  const [singleEventLoopActive, setSingleEventLoopActive] = useState(false);
  const singleEventLoopActiveRef = useRef(false);
  singleEventLoopActiveRef.current = singleEventLoopActive;
  // True while the user is mid-drag on the top-bar all-events scrubber. While
  // true, the per-event animation re-triggers on every value change and the
  // event auto-loops. Cleared on pointerup.
  const isScrubbingTopRef = useRef(false);
  // 0..100 slider progress scrubbing through the current event's internal animation.
  // Resets whenever the current event changes. The sequential-reveal animation
  // writes to this state as it progresses so the banner slider follows along.
  const [stepScrubProgress, setStepScrubProgress] = useState(0);
  const stepScrubProgressRef = useRef(setStepScrubProgress);
  stepScrubProgressRef.current = setStepScrubProgress;
  // Non-null while waiting for the delay between single-event loop repeats.
  // Holds the total delay duration (ms) so the wipe animation in
  // StepAnimSliders knows how long to run. Cleared when the delay ends, is
  // interrupted by a scrub, or when the loop is paused/stopped.
  const [delayPhaseMs, setDelayPhaseMs] = useState(null);
  const setDelayPhaseMsRef = useRef(setDelayPhaseMs);
  setDelayPhaseMsRef.current = setDelayPhaseMs;
  // Is the per-event sequential reveal currently in progress? The banner
  // play/pause button reads this to pick its icon.
  const [stepAnimRunning, setStepAnimRunning] = useState(false);
  const setStepAnimRunningRef = useRef(setStepAnimRunning);
  setStepAnimRunningRef.current = setStepAnimRunning;
  // Live mirror of stepAnimRunning so long-lived schedulers (trace-play loop)
  // can poll it without re-binding on every state change.
  const stepAnimRunningRefForScheduler = useRef(false);
  stepAnimRunningRefForScheduler.current = stepAnimRunning;
  // One-shot resume hint: when the banner Play button kicks the existing
  // pausedStepAnimLoop, the first iteration uses this index instead of 0 so
  // resume picks up at the user's slider position. Subsequent loop iterations
  // restart from the beginning, after the configured replay delay.
  const stepResumeStartIndexRef = useRef(0);
  // 0..1 resume hint for the mask animation path (mirrors stepResumeStartIndexRef).
  const stepResumeMaskProgressRef = useRef(0);
  // Global pause flag, seek generation counter, and animation-busy
  // deadline. See `src/hooks/usePlaybackClock.js` for the full
  // semantics of each ref. Lifted into a hook so the playback
  // contract is documented in one place; behaviour is unchanged.
  const { globalPausedRef, seekGenRef, animBusyUntilRef } = usePlaybackClock();
  // Event-internal animation duration mode. 'progressive' uses a piecewise
  // tiered budget so a 5-bit event and a 5000-bit event both produce a
  // meaningful timeline; 'linear' scales total duration with the bit count.
  const [eventDurationMode, setEventDurationMode] = useState(initialPrefs.eventDurationMode);
  const eventDurationModeRef = useRef(eventDurationMode);
  eventDurationModeRef.current = eventDurationMode;
  // Forward refs so functions defined earlier in the file can use the
  // bits<->time helpers (which are defined further down).
  const bitsAtTimeRatioRef = useRef(null);
  const timeRatioAtBitIndexRef = useRef(null);
  const computeEventDurationRef = useRef(null);
  // Animation mode for the current event:
  //  - 'mask':     mask stamps only (bits all already painted as set under the stamp)
  //  - 'bit':      per-bit sequential reveal only (no stamp overlay)
  //  - 'combined': both — bits reveal progressively under the moving stamps
  // Auto-defaults to 'mask' on entering a step with mask data, 'bit' otherwise;
  // the user can toggle within a step via the banner button.
  const [bitAnimationMode, setBitAnimationMode] = useState('bit');
  const bitAnimationModeRef = useRef(bitAnimationMode);
  bitAnimationModeRef.current = bitAnimationMode;
  const [bitAnimInterval, setBitAnimInterval] = useState(20); // ms between sequential bits (0.02s default)
  const [maskAnimInterval, setMaskAnimInterval] = useState(() => {
    const stepIntervalDefault = 20;
    const stepSpeedValueDefault = Math.round(1 + ((5000 - stepIntervalDefault) / (5000 - 5)) * 499);
    const maskSpeedValueDefault = Math.max(1, Math.round(stepSpeedValueDefault * 0.2));
    const ratio = (maskSpeedValueDefault - 1) / 499;
    return Math.round(5000 - ratio * (5000 - 5));
  });
  const [maxStepDurationEnabled, setMaxStepDurationEnabled] = useState(initialPrefs.maxStepDurationEnabled);
  const [maxStepDurationMs, setMaxStepDurationMs] = useState(initialPrefs.maxStepDurationMs);
  const [gridOpacity, setGridOpacity] = useState(initialPrefs.gridOpacity);
  const [canvasColors, setCanvasColors] = useState(initialPrefs.canvasColors);
  const [detailHeight, setDetailHeight] = useState(280);
  const [detailWidth, setDetailWidth] = useState(0);
  const [showMinimap, setShowMinimap] = useState(true);
  const [minimapAvailable, setMinimapAvailable] = useState(true);
  const [stepStats, setStepStats] = useState(null); // { totalSet, newlySet, reSet, duplicateTargets }
  const [pinnedBitIndices, setPinnedBitIndices] = useState([]); // clicked bits with locked balloons
  const [hoveredBitInfo, setHoveredBitInfo] = useState(null);  // { bitIndex, history[] } — updated on hover
  const [, setHoverPos] = useState(null); // { x, y } viewport coords for hover balloon
  const [colorPreset, setColorPreset] = useState(null); // null = theme default
  const [customColors, setCustomColors] = useState({ setBit: null, clearedBit: null, unchangedBit: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // Whether the toolbar center+right (playback transport + timeline) are hidden
  // for a distraction-free immersive view. Toggled via the eye button or H key.
  const [controlsHidden, setControlsHidden] = useState(initialPrefs.controlsHidden);
  const toggleControlsHidden = useCallback(() => setControlsHidden((h) => !h), []);
  // When true, the floating "all events" widget (transport + timeline shown
  // while the events panel is collapsed) is hidden and replaced by a small
  // "show widget" button in the top toolbar. Set by dragging the widget onto
  // the top bar; cleared by clicking that button.
  const [allEventsWidgetHidden, setAllEventsWidgetHidden] = useState(initialPrefs.allEventsWidgetHidden);
  const showAllEventsWidget = useCallback(() => setAllEventsWidgetHidden(false), []);
  const [storageModel, setStorageModel] = useState(header.storageModel || 'half');
  const [selectedSteps, setSelectedSteps] = useState(new Set());
  const [heatMapEnabled, setHeatMapEnabled] = useState(false);
  // 'none' | 'hits' | 'age' | 'both'  — annotation shown on each cacheline when heatmap is on
  const [cachelineAnnotation, setCachelineAnnotation] = useState('none');
  const [primeOverlayEnabled, setPrimeOverlayEnabled] = useState(false);
  const [rangeOverlayEnabled, setRangeOverlayEnabled] = useState(false);
  const [rangeOverlayStart, setRangeOverlayStart] = useState(0);
  const [rangeOverlayEnd, setRangeOverlayEnd] = useState(0);
  const [multiplesOverlayEnabled, setMultiplesOverlayEnabled] = useState(false);
  const [multiplesOverlayPrime, setMultiplesOverlayPrime] = useState(3);
  const [cachelineSize, setCachelineSize] = useState(64);
  const [cachePreset, setCachePreset] = useState('fixed');
  const [stepsPanelCollapsed, setStepsPanelCollapsed] = useState(initialPrefs.stepsPanelCollapsed);
  // Bumped whenever the user explicitly asks to "reveal" the current event in
  // the events panel (e.g. via the locate button on the event-title widget).
  // StepPanel watches this counter to clear filters and expand parents so the
  // active step becomes visible.
  const [revealStepRequest, setRevealStepRequest] = useState(0);
  const [timingPanelOpen, setTimingPanelOpen] = useState(false);
  const [timingFocusOp, setTimingFocusOp] = useState('');
  const [detailInspectorOpen, setDetailInspectorOpen] = useState(false);
  const [detailInspectorMode, setDetailInspectorMode] = useState('bits');
  const [detailInspectorQuery, setDetailInspectorQuery] = useState('');
  const [, setBalloonLayoutTick] = useState(0);
  // Pixel offsets that place the canvas's center at the viewport center
  // regardless of the container's current bounding box. Without this,
  // the canvas was positioned `left:50%; top:50%` of `.canvas-container`,
  // so when the settings/steps panels collapse/expand the container
  // reshapes and the (stable) canvas slides in viewport space — visible
  // as a content shift on every panel toggle. Updated by a ResizeObserver
  // on the container so the anchor tracks the panel's CSS transition.
  const [canvasAnchorPx, setCanvasAnchorPx] = useState(null);

  // 3D camera state
  // The app always uses 3D mode; the camera is always enabled. The tilt
  // button controls the rotateX angle (flat 0° vs tilted 30°).
  const mode3D = true;
  const currentAnimIntervalRef = useRef(20);
  const currentMaskAnimIntervalRef = useRef(20);
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

  const bitStateRef = useRef(null);
  const stepsRef = useRef([]);
  const currentStepRef = useRef(0);
  const playTimerRef = useRef(null);
  const rippleRef = useRef(null);
  const seqTimerRef = useRef(null); // sequential animation timer
  const triggerAnimationRef = useRef(null);
  const playTimeoutRef = useRef(null);
  const selectedAnimLoopRef = useRef(null);
  const pausedStepAnimLoopRef = useRef(null);
  const initialFitDoneRef = useRef(false);
  const detailOpenRef = useRef(true);
  const detailHeightRef = useRef(280);
  const lastHoveredIdxRef = useRef(-1); // tracks last hovered bit to avoid redundant recomputes
  const layoutRefreshTimeoutRef = useRef(null);
  const layoutRefreshRaf1Ref = useRef(null);
  const layoutRefreshRaf2Ref = useRef(null);
  // Anchor captured by a panel-toggle handler BEFORE the state update,
  // i.e. while `getBoundingClientRect()` still reflects the old layout.
  // The resize useEffect consumes it (instead of capturing fresh, which
  // would always read the post-change rect and produce zero net pan
  // compensation, causing the canvas to drift on every panel toggle).
  const pendingResizeAnchorRef = useRef(null);
  const viewportAnimRef = useRef(null);
  const autoplayStartedRef = useRef(false);
  const initialHighlightHoldRef = useRef(true);
  const traceInfoPopoverRef = useRef(null);
  // True while the timeline slider has left bitState in a partially-revealed
  // (pre-step) state. goToStep checks this and always rebuilds bitState from
  // scratch so we don't end up with an inconsistent incremental update.
  const bitStateDirtyRef = useRef(false);
  const traceInfoToggleRef = useRef(null);
  const balloonLayoutRafRef = useRef(null);

  stepsRef.current = steps;
  currentStepRef.current = currentStep;

  /** Miller-Rabin primality test — deterministic for all n < 3,215,031,751 */
  const isPrimeNumber = useCallback((n) => {
    if (n < 2) return false;
    if (n === 2 || n === 3 || n === 5 || n === 7) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    // Trial division up to sqrt(n) for simplicity (numbers here are ≤ sieveSize, usually ≤ 10M)
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }, []);

  /** Compute bit history info object for a given bit index */
  const computeBitInfo = useCallback((idx) => {
    const r = rendererRef.current;
    const sm = r ? r.storageModel : 'half';
    const history = [];
    const allSteps = stepsRef.current;
    for (let i = 0; i < allSteps.length; i++) {
      const st = allSteps[i];
      for (let j = 0; j < st.changedBits.length; j++) {
        if (st.changedBits[j] === idx) {
          history.push({ stepIndex: i, operation: st.operation, prime: st.prime, annotation: st.annotation });
          break;
        }
      }
    }
    const num = bitToNumber(idx, sm);
    return { bitIndex: idx, number: num, isPrime: isPrimeNumber(num), history };
  }, [isPrimeNumber]);

  const scheduleBalloonRelayout = useCallback(() => {
    if (balloonLayoutRafRef.current != null) return;
    balloonLayoutRafRef.current = requestAnimationFrame(() => {
      balloonLayoutRafRef.current = null;
      setBalloonLayoutTick((value) => value + 1);
    });
  }, []);

  useEffect(() => () => {
    if (balloonLayoutRafRef.current != null) {
      cancelAnimationFrame(balloonLayoutRafRef.current);
      balloonLayoutRafRef.current = null;
    }
  }, []);

  // Keep refs in sync for use in callbacks
  const getMinimapDetailH = useCallback(() => {
    const panelEl = document.querySelector('.detail-panel');
    if (panelEl) {
      const rect = panelEl.getBoundingClientRect();
      if (rect.height > 0) return Math.round(rect.height);
    }
    return detailOpenRef.current ? detailHeightRef.current : 36;
  }, []);

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
    const canvas = r.canvas;
    const dpr = window.devicePixelRatio || 1;
    const viewportW = canvas?.clientWidth || r.canvasWidth || 0;
    const viewportH = canvas ? (canvas.height / dpr) : 0;
    const fullyVisible = viewportW > 0 && viewportH > 0 ? r.isContentFullyVisible(viewportW, viewportH) : false;
    const available = showMinimap !== false && !fullyVisible;
    r.minimapEnabled = available;
    setMinimapAvailable(available);
    if (!available) r._minimapRect = null;
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
    const baseW = Math.max(width || 0, (typeof window !== 'undefined' ? window.innerWidth : width) || 0);
    const baseH = Math.max(height || 0, (typeof window !== 'undefined' ? window.innerHeight : height) || 0);
    let scaleH = 1;
    let scaleW = 1;
    let diagonalOverscan = 1;
    if (cam && cam.enabled) {
      const ax = Math.abs(cam.rotateX) * Math.PI / 180;
      const ay = Math.abs(cam.rotateY) * Math.PI / 180;
      scaleH = 1 / Math.max(0.3, Math.cos(ax));
      scaleW = 1 / Math.max(0.3, Math.cos(ay));
      diagonalOverscan = 1 + Math.hypot(Math.sin(ax), Math.sin(ay)) * 0.55;
    }
    const dragOverscan = 3.1;
    const canvasW = Math.max(baseW * 3.2, baseW * scaleW * diagonalOverscan * dragOverscan);
    const canvasH = Math.max(baseH * 3.2, baseH * scaleH * diagonalOverscan * dragOverscan);
    return { canvasW, canvasH };
  }, []);

  const captureViewportAnchor = useCallback((xRatio = 0.5, yRatio = 0.5) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const clientX = rect.left + rect.width * xRatio;
    const clientY = rect.top + rect.height * yRatio;
    const canvasCssHeight = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
    const { canvasW, canvasH } = getCanvasTargetSize(rect.width, rect.height);
    const planeW = canvasW;
    const planeH = Math.max(canvasCssHeight, canvasH);
    const planeOffsetX = Math.max(0, (planeW - rect.width) / 2);
    const planeOffsetY = Math.max(0, (planeH - rect.height) / 2);
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
  }, [getCanvasTargetSize]);

  const refreshCanvasLayout = useCallback((anchor = null) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const { canvasW, canvasH } = getCanvasTargetSize(rect.width, rect.height);

    const oldCanvasW = r.canvasWidth || 0;
    const oldCanvasH = r.canvasHeight || 0;
    r.resize(canvasW, canvasH);
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

    // NOTE: anchor-based panX/panY compensation removed for panel toggles.
    // With the canvas pinned to the VIEWPORT center (see canvasAnchorPx and
    // renderCanvasStyle), the canvas no longer moves when the container
    // reshapes on a panel toggle (canvasW/H are based on windowW/H, not
    // containerW/H, so they don't change on panel toggles), so there is
    // nothing to compensate for. Window-resize is handled above via the
    // dCanvasW/2 adjustment which preserves canvas-center-relative content
    // positions and keeps the 3D perspective projection stable.
    void anchor;

    r.render();
    updateMinimapAvailability();
    if (showMinimap) r.renderMinimap(rect.width, rect.height, getMinimapDetailH());
  }, [getCanvasTargetSize, showMinimap, getMinimapDetailH, updateMinimapAvailability]);

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
      const targets = [canvasRef.current, settledCanvasRef.current, glCanvasRef.current];
      for (const c of targets) {
        if (!c) continue;
        if (c.style.left !== leftStr) c.style.left = leftStr;
        if (c.style.top !== topStr) c.style.top = topStr;
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
    document.addEventListener('transitionrun', onTransitionStart, true);
    return () => {
      if (ro) ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('transitionstart', onTransitionStart, true);
      document.removeEventListener('transitionrun', onTransitionStart, true);
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
    clearScheduledLayoutRefresh();
    layoutRefreshRaf1Ref.current = requestAnimationFrame(() => {
      layoutRefreshRaf2Ref.current = requestAnimationFrame(() => {
        refreshCanvasLayout(anchor);
      });
    });
    layoutRefreshTimeoutRef.current = setTimeout(() => {
      refreshCanvasLayout(anchor);
    }, 210);
  }, [clearScheduledLayoutRefresh, refreshCanvasLayout]);



  const applyViewportFit = useCallback((renderer, width, height) => {
    if (!renderer || width <= 0 || height <= 0) return;
    renderer.zoomToFit(width, height, { alignTop: false });
    const dpr = window.devicePixelRatio || 1;
    const canvasCssHeight = (renderer.canvas?.height || height * dpr) / dpr;
    const planeOffsetX = Math.max(0, (renderer.canvasWidth - width) / 2);
    const planeOffsetY = Math.max(0, (canvasCssHeight - height) / 2);
    renderer.panX += planeOffsetX;
    renderer.panY += planeOffsetY;
  }, [header.bitCount]);

  const toggleStepsPanel = useCallback(() => {
    // Snapshot the canvas-area centre's window position BEFORE the state
    // update so the resize useEffect can pin it after CSS reflow. See
    // pendingResizeAnchorRef for why fresh capture in the effect drifts.
    pendingResizeAnchorRef.current = captureViewportAnchor(0.5, 0.5);
    setStepsPanelCollapsed((wasCollapsed) => !wasCollapsed);
  }, [captureViewportAnchor]);

  // Open the events panel (if collapsed) and ask it to reveal the current
  // step: clear filters that hide it, expand its parent group + ancestor
  // nodes, and scroll it into view. Triggered from the event-title widget.
  const revealCurrentStepInPanel = useCallback(() => {
    // Same window-pinning contract as toggleStepsPanel: stash the
    // pre-state-change anchor for the resize useEffect to consume.
    setStepsPanelCollapsed((wasCollapsed) => {
      if (wasCollapsed) {
        pendingResizeAnchorRef.current = captureViewportAnchor(0.5, 0.5);
        return false;
      }
      return wasCollapsed;
    });
    setRevealStepRequest((n) => n + 1);
  }, [captureViewportAnchor]);

  const toggleDetailPanel = useCallback(() => {
    pendingResizeAnchorRef.current = captureViewportAnchor(0.5, 0.5);
    updateDetailOpen((o) => !o);
  }, [captureViewportAnchor, updateDetailOpen]);

  const toggleSettingsPanel = useCallback(() => {
    pendingResizeAnchorRef.current = captureViewportAnchor(0.5, 0.5);
    setSettingsCollapsed((collapsed) => !collapsed);
  }, [captureViewportAnchor]);

  // State for requesting a specific tab in the settings panel from external code.
  // { tab: string, counter: number } — counter increments each request so effects fire.
  const [settingsTabRequest, setSettingsTabRequest] = useState(null);

  // Open animation settings panel to the animation tab (e.g. from gear icon in event widget).
  const openAnimationSettings = useCallback(() => {
    pendingResizeAnchorRef.current = captureViewportAnchor(0.5, 0.5);
    setSettingsCollapsed(false);
    setSettingsTabRequest((prev) => ({ tab: 'animation', counter: (prev?.counter ?? 0) + 1 }));
  }, [captureViewportAnchor]);

  // Callback for changing bitAnimationMode from the settings panel (no seek side-effect needed there).
  const handleBitAnimationModeChange = useCallback((mode) => {
    setBitAnimationMode(mode);
    bitAnimationModeRef.current = mode;
  }, []);

  // Close trace info popup when clicking outside
  useEffect(() => {
    if (!showTraceInfo) return;
    const handleClickOutside = (e) => {
      const clickedInside = traceInfoPopoverRef.current && traceInfoPopoverRef.current.contains(e.target);
      const clickedTitle = traceInfoToggleRef.current && traceInfoToggleRef.current.contains(e.target);
      if (!clickedInside && !clickedTitle) setShowTraceInfo(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showTraceInfo]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    writeViewPrefs({
      theme,
      layoutSettings,
      eventTitleSettings,
      depthSettings,
      maxStepDurationEnabled,
      maxStepDurationMs,
      gridOpacity,
      canvasColors,
      eventDurationMode,
      playSpeedPercent,
      delayBetweenEvents,
      delayBetweenRepeats,
      eventTimeTargets,
      controlsHidden,
      allEventsWidgetHidden,
      stepsPanelCollapsed,
      settingsCollapsed,
      detailOpen,
    });
  }, [theme, layoutSettings, eventTitleSettings, depthSettings, maxStepDurationEnabled, maxStepDurationMs, gridOpacity, canvasColors, eventDurationMode, playSpeedPercent, delayBetweenEvents, delayBetweenRepeats, eventTimeTargets, controlsHidden, allEventsWidgetHidden, stepsPanelCollapsed, settingsCollapsed, detailOpen]);

  const effectiveGroupBits = useMemo(() => (
    layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64)
  ), [layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup]);

  // Init renderer
  useEffect(() => {
    const r = new SieveRenderer();
    rendererRef.current = r;
    if (canvasRef.current) {
      r.attach(canvasRef.current);
      if (settledCanvasRef.current) r.attachSettledCanvas(settledCanvasRef.current);
      if (minimapCanvasRef.current) r.attachMinimapCanvas(minimapCanvasRef.current);
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
          const newGl = new BitGridGLWorker();
          if (newGl.attach(glCanvasRef.current)) {
            gl = newGl;
            glRendererRef.current = gl;
          }
          // If attach failed (no WebGL2, or canvas already transferred)
          // leave glRendererRef.current as null/unchanged.
        }
        if (gl) {
          gl.resizeForBitCount(header.bitCount);
          const origRender = r.render.bind(r);
          r.render = () => {
            const g = glRendererRef.current;
            const rr = rendererRef.current;
            const glOwnsFill = !!g;
            if (rr) rr.skipBitFill = glOwnsFill;
            origRender();
            if (!g || !rr || !rr.canvas) return;
            if (!glOwnsFill) return;
            const dpr = window.devicePixelRatio || 1;
            const cssW = rr.canvas.width / dpr;
            const cssH = rr.canvas.height / dpr;
            g.resize(cssW, cssH);

            // Layout fingerprint — only repack the position texture when one
            // of these inputs changes. Pan is excluded (applied as a uniform).
            const fp = [
              rr.zoom, rr.pixelSize,
              rr.bitLayout, rr.byteLayout, rr.vectorGroup,
              rr.cachelineSize, rr.customGroupingBits, rr.horizontalGroups,
              rr.bitSpacingH, rr.bitSpacingV,
              rr.byteSpacingH, rr.byteSpacingV,
              rr.u64SpacingH, rr.u64SpacingV,
              rr.storageModel, rr.bitCount,
              cssW, cssH,
            ].join('|');
            g.uploadPositions(rr, fp);
            g.uploadState(rr);

            const px = Math.max(1, rr.pixelSize);
            const zoom = Math.max(0.01, rr.zoom || 1);
            const bitColors = rr._bitColors();
            const changed = rr._opColor();
            g.render({
              panX: rr.panX || 0,
              panY: rr.panY || 0,
              cellSize: px * zoom,
              bgColor: rr.effectiveBackground,
              setColor: bitColors.set,
              clearedColor: bitColors.cleared,
              changedColor: changed,
              repeatedColor: [245, 158, 11],
              baseAlpha: Math.max(0.12, Math.min(1, rr.gridOpacity ?? 1)),
            });
          };
        }
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
        rr.render();
        rr.renderMinimap(rr.canvasWidth, rr.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      },
    });

    return () => {
      // Do NOT dispose glRendererRef here — transferControlToOffscreen is
      // one-shot; disposing and re-attaching on the same canvas is impossible.
      // GL is disposed in the mount-only cleanup effect below.
      rendererRef.current = null;
      disposeCamera();
    };
  }, [header.bitCount, header.sieveSize]);

  // Dispose the GL renderer only when the component fully unmounts.
  // Kept separate from the init effect so trace changes (which re-run the
  // init effect) do not destroy the GL canvas ownership.
  useEffect(() => {
    return () => {
      if (glRendererRef.current) {
        glRendererRef.current.dispose();
        glRendererRef.current = null;
      }
      if (spacingPanAnimRef.current != null) {
        cancelAnimationFrame(spacingPanAnimRef.current);
        spacingPanAnimRef.current = null;
      }
    };
  }, []);

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
    r.bitLabelMode = layoutSettings.bitLabelMode || 'global';
    r.byteLabelMode = layoutSettings.byteLabelMode || 'group';
    r.horizontalGroups = Math.max(0, parseInt(layoutSettings.horizontalGroups || 0, 10) || 0);
    const outlineTargets = new Set(layoutSettings.outlines?.targets || []);
    r.outlineEnabled = outlineTargets.size > 0;
    r.outlineTargets = outlineTargets;
    r.outlineStyle = 'dashed';
    r.outlineColor = '#3b82f6';
    r.outlineRounded = true;
    r.colorPreset = colorPreset;
    r.storageModel = storageModel;
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
    r.loweredDepthStrength = Math.max(0, Math.min(1.0, (depthSettings.strength ?? 80) / 100));
    r.loweredDepthAngle = Math.max(0, Math.min(90, depthSettings.angle ?? 38));
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
    if (r.heatMapEnabled) {
      r.rebuildHeatMap(stepsRef.current, currentStepRef.current);
    }
    r.render();
    updateMinimapAvailability();
    if (showMinimap) r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [theme, layoutSettings, showMinimap, colorPreset, customColors, canvasColors, storageModel, cachelineSize, heatMapEnabled, cachelineAnnotation, primeOverlayEnabled, rangeOverlayEnabled, rangeOverlayStart, rangeOverlayEnd, multiplesOverlayEnabled, multiplesOverlayPrime, depthSettings, gridOpacity, updateMinimapAvailability]);

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

    return () => {
      window.removeEventListener('resize', winResize);
      clearTimeout(transitionRefreshTimer);
      clearScheduledLayoutRefresh();
    };
  }, [panelWidth, showMinimap, detailOpen, detailHeight, refreshCanvasLayout, clearScheduledLayoutRefresh, captureViewportAnchor]);

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
    if (!suppressHighlight) initialHighlightHoldRef.current = false;

    let bs = bitStateRef.current;
    if (!bs) return;

    // Build state up to step before target (for stats).
    // If the scrubber left bitState in a partially-revealed state, do a full
    // rebuild regardless of direction so the incremental path can't desync.
    if (target <= currentStep || bitStateDirtyRef.current) {
      bs.fill(0);
      for (let i = 0; i < target; i++) {
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

    // Update heat map
    if (r.heatMapEnabled) {
      r.rebuildHeatMap(steps, target);
    }

    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const { canvasW, canvasH } = getCanvasTargetSize(rect.width, rect.height);
      if (!initialFitDoneRef.current && (r.canvasWidth !== canvasW || r.canvasHeight !== canvasH)) {
        r.resize(canvasW, canvasH);
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
        setZoom(r.zoom);
        r.freezeLayout();
        initialFitDoneRef.current = true;
      }
    }
    r.render();
    updateMinimapAvailability();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
    if (!suppressHighlight && hasPlayContext && triggerAnimationRef.current) {
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
        maxDurationEnabled: maxStepDurationEnabled,
        maxDurationMs: maxStepDurationMs,
        pinnedBitIndices,
        groupBits: effectiveGroupBits,
      });
    }
  }, [currentStep, steps, updateMinimapAvailability, playing, stopPlayback, getCanvasTargetSize, delayBetweenEvents, applyViewportFit, maxStepDurationEnabled, maxStepDurationMs, pinnedBitIndices, effectiveGroupBits]);

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
    if (rippleRef.current) { cancelAnimationFrame(rippleRef.current); rippleRef.current = null; }
    // Cancel camera animations
    if (camera3DRef.current) camera3DRef.current.cancelAllAnimations();
    cancelViewportAnimation();
    if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
  }, [cancelViewportAnimation]);

  const freezeAnimationNow = useCallback(() => {
    stopPlayback();
    stopSeqAnim();
    setAnimationReplayPaused(true);
    const r = rendererRef.current;
    if (!r) return;
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
    setAnimationReplayPaused(true);
    setDelayPhaseMsRef.current(null);
    const r = rendererRef.current;
    const stepIdx = currentStep;
    const allSteps = stepsRef.current;
    const step = allSteps[stepIdx];
    const bs = bitStateRef.current;
    if (!r || !step || !bs) return;
    const clamped = Math.max(0, Math.min(1, progress));

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
      r.suppressMaskWriteOverlay = true;
      r.setMaskGhostBits(ghostBits);
      r.render();
      const orderedWrites = r.maskWriteOrderWords?.length || 0;
      if (orderedWrites > 0) r.renderMaskHover(t);
      else r.renderMaskStamp(t);
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      // Ensure subsequent animations start clean (stamp overlay is a one-shot).
      r.suppressMaskWriteOverlay = false;
      if (mode === 'mask') bitStateDirtyRef.current = clamped < 0.999;
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
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [currentStep, animStyle, stopPlayback, stopSeqAnim, getMinimapDetailH]);

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
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());

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
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
        cam.animateTo({ rotateX: 30, rotateY: 0, perspective: 1500 }, 520);
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

  // Run a single ripple/fade/pulse effect on current changedBits
  const runEffect = useCallback((style, durationOverride = null) => {
    const r = rendererRef.current;
    if (!r || !r.changedBits || r.changedBits.size === 0) return Promise.resolve();
    if (rippleRef.current) cancelAnimationFrame(rippleRef.current);
    if (style === 'none') return Promise.resolve();

    const duration = Math.max(280, durationOverride || 600);
    const start = performance.now();
    return new Promise((resolve) => {
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        r.render();
        if (style === 'ripple') r.renderRipple(progress);
        else if (style === 'fade') r.renderFade(progress);
        else if (style === 'pulse') r.renderPulse(progress);
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        if (progress < 1) {
          rippleRef.current = requestAnimationFrame(animate);
        } else {
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
    const pinnedBitCount = Array.isArray(options.pinnedBitIndices) ? options.pinnedBitIndices.length : 0;
    const maxDurationEnabled = options.maxDurationEnabled === true;
    const configuredMax = maxDurationEnabled
      ? clampMs(options.maxDurationMs ?? 8000, 2000, 30000)
      : 10000;
    const maxTotal = configuredMax + (maxDurationEnabled ? pinnedBitCount * 2000 : 0);
    const minTotal = maxDurationEnabled ? Math.max(900, Math.min(2400, configuredMax * 0.35)) : 2800;

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

    const accelerateAfter = maxDurationEnabled
      ? Math.max(0.24, Math.min(0.72, Math.min(3000, maxTotal * 0.45) / Math.max(1, maxTotal)))
      : 0.68;
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
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        if (progress < 1) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }

        rippleRef.current = null;
        r.changedBits = new Set();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
    const previousSuppressMaskOverlay = r.suppressMaskWriteOverlay === true;
    r.suppressMaskWriteOverlay = true;

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
              const bitsForEntry = r._maskEntryBits(entries[entryIndex]);
              for (let bitIndex = 0; bitIndex < bitsForEntry.length; bitIndex++) ghostBits.add(bitsForEntry[bitIndex]);
            }
          }
        } else if (r.targetBits?.size) {
          for (const bit of r.targetBits) ghostBits.add(bit);
        }
        r.setMaskGhostBits(ghostBits);
        r.render();
        if (orderedWrites > 0) r.renderMaskHover(t);
        else r.renderMaskStamp(t);
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        if (t < 1) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }
        r.setMaskGhostBits(new Set());
        r.suppressMaskWriteOverlay = previousSuppressMaskOverlay;
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
      stopSeqAnim();
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
    const hasMaskAnimation = !!(maskModeActive && maskAnimationEnabled && r && r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0 && Number.isFinite(r.maskWordBits) && r.maskWordBits > 0);
    if (!r || !changedSet || (!hasMaskAnimation && changedSet.size === 0) || changedSet.size >= 100000) return;

    const animatedBitCount = changedSet.size > 0 ? changedSet.size : Math.max(1, r.targetBits?.size || r.maskWriteOrderWords?.length || 1);
    const timingBaseOptions = {
      ...options,
      maxDurationEnabled: options.maxDurationEnabled ?? maxStepDurationEnabled,
      maxDurationMs: options.maxDurationMs ?? maxStepDurationMs,
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
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
      if (delayMs > 0 && singleEventLoopActiveRef.current) setDelayPhaseMsRef.current(delayMs);
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
          r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
          } else if (stepScrubProgressRef.current) {
            // Update the slider even on frames where no new bit appeared so
            // the timeline keeps moving smoothly inside long inter-bit gaps.
            stepScrubProgressRef.current(Math.round(t * 100));
          }

          if (t >= 1) {
            r.changedBits = fullChanged;
            r.animationFocusBits = new Set();
            r.render();
            r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        seqTimerRef.current = requestAnimationFrame(tick);
      });

      r.animationFocusBits = new Set();
      if (!isStillLive()) return;
      if (delayMs > 0 && singleEventLoopActiveRef.current) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      if (!isStillLive()) return;
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
      return;
    }

    if (animStyle === 'none') {
      r.changedBits = new Set(changedSet);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
      if (delayMs > 0 && singleEventLoopActiveRef.current) setDelayPhaseMsRef.current(delayMs);
      await waitForDelay(delayMs);
      setDelayPhaseMsRef.current(null);
      return;
    }

    r.changedBits = new Set(changedSet);
    r.animationFocusBits = new Set(changedSet);
    await runEffect(animStyle, timingOptions.adaptivePlan ? Math.min(3200, timingOptions.adaptivePlan.totalDuration) : undefined);
    if (!isStillLive()) return;
    r.animationFocusBits = new Set();
    if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
    if (delayMs > 0 && singleEventLoopActiveRef.current) setDelayPhaseMsRef.current(delayMs);
    await waitForDelay(delayMs);
    setDelayPhaseMsRef.current(null);
  }, [animMode, animStyle, maskAnimationEnabled, stopSeqAnim, runEffect, estimateAnimDuration, getMinimapDetailH, getAnimationBitInterval, getAnimationTimingPlan, getCurrentLoopInterval, runMaskStampAnimation, fadeOutCurrentHighlights, waitForDelay, maxStepDurationEnabled, maxStepDurationMs, pinnedBitIndices, effectiveGroupBits, maskAnimInterval, computeEventDuration]);

  useEffect(() => {
    triggerAnimationRef.current = triggerAnimation;
  }, [triggerAnimation]);

  // Initial render — delay one frame so the container has its final dimensions
  useEffect(() => {
    if (steps.length > 0) {
      autoplayStartedRef.current = false;
      initialHighlightHoldRef.current = true;
      const raf = requestAnimationFrame(() => goToStep(0, { suppressHighlight: true }));
      return () => cancelAnimationFrame(raf);
    }
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoRender || steps.length <= 1 || autoplayStartedRef.current) return;
    const timer = setTimeout(() => {
      autoplayStartedRef.current = true;
      initialHighlightHoldRef.current = false;
      setPlaying(true);
    }, 260);
    return () => clearTimeout(timer);
  }, [autoRender, steps.length]);

  const buildCombinedSelectionOverlay = useCallback((selection) => {
    const indices = Array.from(selection)
      .filter((idx) => idx >= 0 && idx < steps.length)
      .sort((a, b) => a - b);
    const mergedBits = new Set();
    const targetHitCounts = new Map();
    const orderedWords = [];
    const orderedSlots = [];
    const orderedEventIds = [];
    let maskWordBits = null;
    let maskSlotBits = [];

    const appendFallbackWords = (bits, wordBits, eventId) => {
      if (!wordBits || !bits || bits.length === 0) return;
      const seen = new Set();
      const sortedBits = Array.from(bits).sort((a, b) => a - b);
      for (let i = 0; i < sortedBits.length; i++) {
        const wordIndex = Math.floor(sortedBits[i] / wordBits);
        if (seen.has(wordIndex)) continue;
        seen.add(wordIndex);
        orderedWords.push(wordIndex);
        orderedSlots.push(0);
        orderedEventIds.push(eventId);
      }
    };

    for (let i = 0; i < indices.length; i++) {
      const step = steps[indices[i]];
      if (!step) continue;
      const targetBits = step.targetBits && step.targetBits.length > 0 ? step.targetBits : step.changedBits;

      for (let j = 0; j < step.changedBits.length; j++) mergedBits.add(step.changedBits[j]);
      for (let j = 0; j < targetBits.length; j++) {
        const bit = targetBits[j];
        targetHitCounts.set(bit, (targetHitCounts.get(bit) || 0) + (step.targetHitCounts?.[j] || 1));
      }

      if (step.maskWordBits != null && step.maskWordBits > 0 && maskWordBits == null) {
        maskWordBits = step.maskWordBits;
      }
      if (maskSlotBits.length === 0 && Array.isArray(step.maskSlotBits) && step.maskSlotBits.length > 0) {
        maskSlotBits = Array.from(step.maskSlotBits);
      }

      if (maskWordBits != null && step.maskWordBits === maskWordBits && step.maskWriteOrderWords?.length > 0) {
        for (let j = 0; j < step.maskWriteOrderWords.length; j++) {
          orderedWords.push(step.maskWriteOrderWords[j]);
          orderedSlots.push(step.maskWriteOrderSlots?.[j] ?? 0);
          orderedEventIds.push(step.stepId ?? indices[i]);
        }
      } else if (maskWordBits != null) {
        appendFallbackWords(targetBits, maskWordBits, step.stepId ?? indices[i]);
      }
    }

    return {
      changedBits: mergedBits,
      targetBits: mergedBits,
      targetHitCounts,
      annotation: indices.length > 1 ? '' : (steps[indices[0]]?.annotation || ''),
      maskMetadata: maskWordBits != null ? {
        wordBits: maskWordBits,
        targetWords: Uint32Array.from(orderedWords),
        targetSlots: Uint8Array.from(orderedSlots),
        targetEventIds: Int32Array.from(orderedEventIds),
        slotBits: maskSlotBits,
      } : null,
    };
  }, [steps]);

  const handleStepSelection = useCallback((stepIndex) => {
    stopPlayback();
    goToStep(stepIndex);
  }, [stopPlayback, goToStep]);

  const handleMultiStepSelect = useCallback((nextSelection) => {
    stopPlayback();
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
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    updateMinimapAvailability();
    if (overlay.changedBits.size > 0) triggerAnimation(overlay.changedBits, { adaptiveDuration: true });
  }, [selectedSteps, buildCombinedSelectionOverlay, triggerAnimation, getMinimapDetailH, updateMinimapAvailability]);

  // Repeat selected-step animation until selection changes.
  useEffect(() => {
    if (selectedAnimLoopRef.current) {
      clearTimeout(selectedAnimLoopRef.current);
      selectedAnimLoopRef.current = null;
    }
    if (playing || animationReplayPaused || selectedSteps.size === 0) return;

    const merged = new Set();
    for (const idx of selectedSteps) {
      const s = steps[idx];
      if (!s) continue;
      for (let j = 0; j < s.changedBits.length; j++) merged.add(s.changedBits[j]);
    }
    if (merged.size === 0) return;

    let cancelled = false;
    const loop = async () => {
      const triggerFn = triggerAnimationRef.current;
      if (!triggerFn) return;
      // Capture seek generation before animating. If seekStepAnimation fires
      // mid-animation the gen is bumped; detecting the change here prevents
      // the loop from rescheduling and overwriting the scrubbed canvas.
      const loopSeekGen = seekGenRef.current;
      await triggerFn(merged, { adaptiveDuration: true });
      if (cancelled || playing || animationReplayPaused || selectedSteps.size === 0) return;
      if (seekGenRef.current !== loopSeekGen) return;
      selectedAnimLoopRef.current = setTimeout(loop, 0);
    };

    selectedAnimLoopRef.current = setTimeout(loop, 0);

    return () => {
      cancelled = true;
      if (selectedAnimLoopRef.current) {
        clearTimeout(selectedAnimLoopRef.current);
        selectedAnimLoopRef.current = null;
      }
    };
    // triggerAnimation intentionally omitted; see pausedStepAnimLoop for rationale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSteps, steps, playing, animationReplayPaused]);

  // When paused on a single step, keep replaying that step's animation.
  useEffect(() => {
    if (pausedStepAnimLoopRef.current) {
      clearTimeout(pausedStepAnimLoopRef.current);
      pausedStepAnimLoopRef.current = null;
    }

    // The single-event widget's auto-replay only runs when the user explicitly
    // pressed Play on it (singleEventLoopActive=true), OR while the user is
    // mid-drag on the top-bar scrubber (isScrubbingTopRef.current). All-events
    // playback (`playing`) has its own scheduler so we stay out of its way.
    if (playing || animationReplayPaused || selectedSteps.size > 0 || initialHighlightHoldRef.current) return;
    if (!singleEventLoopActive && !isScrubbingTopRef.current) return;
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;

    const changed = new Set(step.changedBits);
    let cancelled = false;

    const loop = async () => {
      // First iteration honors the resume hints (set by the banner Play
      // button); subsequent iterations restart from 0 after the replay delay.
      const useStartIndex = stepResumeStartIndexRef.current || 0;
      const useStartProgress = stepResumeMaskProgressRef.current || 0;
      stepResumeStartIndexRef.current = 0;
      stepResumeMaskProgressRef.current = 0;
      // Read triggerAnimation through its ref so this effect doesn't tear down
      // and restart whenever the speed slider (bitAnimInterval) changes.
      const triggerFn = triggerAnimationRef.current;
      if (!triggerFn) return;
      // Capture seek generation before animating. If seekStepAnimation fires
      // mid-animation the gen is bumped; detecting the change here prevents
      // the loop from rescheduling and overwriting the scrubbed canvas.
      const loopSeekGen = seekGenRef.current;
      await triggerFn(changed, {
        adaptiveDuration: true,
        // Between repeats inside the single-event widget: use the configured
        // delayBetweenRepeats. Mid-drag scrub: 0 (each drag tick re-triggers).
        delayMs: isScrubbingTopRef.current ? 0 : (delayBetweenRepeatsRef.current || 0),
        startIndex: useStartIndex,
        startProgress: useStartProgress,
      });
      if (cancelled || playing || animationReplayPaused || selectedSteps.size > 0) return;
      if (!singleEventLoopActiveRef.current && !isScrubbingTopRef.current) return;
      if (seekGenRef.current !== loopSeekGen) return;
      pausedStepAnimLoopRef.current = setTimeout(loop, 0);
    };

    pausedStepAnimLoopRef.current = setTimeout(loop, 0);

    return () => {
      cancelled = true;
      if (pausedStepAnimLoopRef.current) {
        clearTimeout(pausedStepAnimLoopRef.current);
        pausedStepAnimLoopRef.current = null;
      }
    };
    // triggerAnimation intentionally omitted: it is rebuilt whenever the speed
    // slider changes, and we don't want to interrupt an in-flight reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, selectedSteps, steps, currentStep, animationReplayPaused, singleEventLoopActive]);

  // Auto-render mode (for CLI video export via puppeteer)
  useEffect(() => {
    if (autoRender && steps.length > 0 && !exporting) {
      const timer = setTimeout(() => exportVideo(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoRender, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Replay current step when animation mode or style changes so the active animation stops immediately.
  // Skip when the single-event replay loop is running: the loop holds an `await triggerFn(...)` promise
  // that resolves only when the animation finishes naturally. Calling stopSeqAnim() from here would
  // cancel the RAF without resolving that promise, permanently freezing the loop. The loop naturally
  // picks up the new animMode/animStyle on its next iteration via triggerAnimationRef.current.
  useEffect(() => {
    if (initialHighlightHoldRef.current) return;
    if (singleEventLoopActiveRef.current) return;
    stopSeqAnim();
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;
    const currentChanged = new Set(step.changedBits);
    triggerAnimation(currentChanged, { adaptiveDuration: !playing });
  }, [animMode, animStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seqTimerRef.current) return;
    currentAnimIntervalRef.current = Math.max(0, bitAnimInterval || 20);
  }, [bitAnimInterval]);

  // Play/pause
  useEffect(() => {
    if (!playing) {
      clearInterval(playTimerRef.current);
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      return;
    }

    if (selectedAnimLoopRef.current) {
      clearTimeout(selectedAnimLoopRef.current);
      selectedAnimLoopRef.current = null;
    }

    const scheduleNext = () => {
      if (!playing || !rendererRef.current) return;

      // While globally paused, freeze the trace-level scheduler too so the
      // toolbar Pause halts the cross-event walk in addition to the
      // in-flight animation.
      if (globalPausedRef.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 32);
        return;
      }

      if (performance.now() < animBusyUntilRef.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 16);
        return;
      }

      // If a per-event animation is still running (e.g. resumed from a
      // pause-in-flight whose wall-clock budget already expired), wait for it
      // to finish before advancing to the next event.
      if (setStepAnimRunningRef.current && stepAnimRunningRefForScheduler.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 32);
        return;
      }

      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= steps.length) {
          setPlaying(false);
          return prev;
        }
        setTimeout(() => goToStep(next, { keepPlaying: true }), 0);
        return next;
      });
      playTimeoutRef.current = setTimeout(scheduleNext, 16);
    };

    playTimeoutRef.current = setTimeout(scheduleNext, 0);

    return () => {
      clearInterval(playTimerRef.current);
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
    };
  }, [playing, steps.length, goToStep]);

  // Top-toolbar Play/Pause. Drives trace-wide playback (event-by-event with
  // no inter-event wait) and supports pause-in-flight + precise resume:
  //  - At end of trace: rewind and start playing.
  //  - Not playing, not paused: start playing.
  //  - Paused mid-flight: clear pause flag so animation resumes exactly where
  //    it stopped (mask virtualMs, sequential reveal idx, or waitForDelay).
  //  - Playing: set pause flag (in-flight loops freeze in place) and stop the
  //    scheduler. Refs are NOT torn down so resume can pick up.
  const handlePlayPause = useCallback(() => {
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
    const inMaskOrCombined = (bitAnimationModeRef.current === 'mask' || bitAnimationModeRef.current === 'combined')
      && step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0;
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
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    updateMinimapAvailability();
  }, [getMinimapDetailH, updateMinimapAvailability, applyViewportFit]);

  // Tracks whether the tilt button is in the "tilted" state (30°) or flat (0°).
  // Initialized to true since the startup animation goes to rotateX=30.
  const [tiltActive, setTiltActive] = useState(true);

  // Tilt toggle: animates between 0° (flat) and 30° (tilted) in 3D mode.
  const toggleTilt = useCallback(() => {
    const cam = camera3DRef.current;
    if (!cam || !cam.enabled) return;
    const newTiltActive = !tiltActive;
    setTiltActive(newTiltActive);
    cam.animateTo({ rotateX: newTiltActive ? 30 : 0, rotateY: cam.rotateY, perspective: 1500 }, 400);
  }, [tiltActive]);

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
      if (Math.abs(cam.rotateX) < 0.5) cam.rotateX = 16;
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

    const rect = el.getBoundingClientRect();
    const planeW = r.canvasWidth || rect.width;
    const planeH = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
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
      { containerW: planeW, containerH: planeH, centerX: planeW / 2, centerY: planeH / 2 },
      { panX: r.panX, panY: r.panY, zoom: r.zoom },
      targetZoom,
      1200
    );
  }, []);

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

    const getPlaneMetrics = () => {
      const rect = el.getBoundingClientRect();
      const r = rendererRef.current;
      const planeW = r?.canvasWidth || rect.width;
      const planeH = (r?.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
      const planeOffsetX = Math.max(0, (planeW - rect.width) / 2);
      const planeOffsetY = Math.max(0, (planeH - rect.height) / 2);
      return { rect, planeW, planeH, planeOffsetX, planeOffsetY };
    };

    const screenToCanvasCoords = (clientX, clientY) => {
      const { rect, planeW, planeH, planeOffsetX, planeOffsetY } = getPlaneMetrics();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cam = camera3DRef.current;
      if (cam && cam.enabled) {
        return cam.screenToCanvas(x, y, planeW, planeH, planeOffsetX, planeOffsetY);
      }
      return { x, y };
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
      setHoverPos(null);
    };

    const clearInteraction = () => {
      gestureMode = 'none';
      activePointerId = null;
      mouseRotateActive = false;
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

      // Check minimap hit first (use raw screen coords for minimap)
      const hit = r.minimapHitTest(rawX, rawY, canvasW, canvasH);
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
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        el.classList.add('dragging');
        return;
      }

      hideHoverBalloon();
      gestureMode = 'pan';
      activePointerId = e.pointerId;
      didDrag = false;
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
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = r.minimapHitTest(x, y, rect.width, rect.height);
        if (hit) {
          r.panX = hit.panX;
          r.panY = hit.panY;
          r.render();
          updateMinimapAvailability();
          r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
      const overOverlay = (() => {
        if (typeof document === 'undefined') return false;
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        if (!hit) return false;
        return !!hit.closest(
          '.toolbar, .step-panel, .settings-sidebar, .detail-panel, .timing-panel, ' +
          '.step-focus-banner, .minimap-overlay-canvas, .trace-info-popover, ' +
          '.bit-history-panel'
        );
      })();
      if (overOverlay) {
        if (lastHoveredIdxRef.current !== -1) {
          lastHoveredIdxRef.current = -1;
          setHoveredBitInfo(null);
          setHoverPos(null);
        }
        return;
      }

      const coords = screenToCanvasCoords(e.clientX, e.clientY);
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
      // Always update hover position so balloon follows cursor
      if (idx >= 0) setHoverPos({ x: e.clientX, y: e.clientY });
      else setHoverPos(null);
    };

    const onPointerEnd = (e) => {
      if (mouseRotateActive) return;
      if (activePointerId != null && e.pointerId !== activePointerId) return;
      const rect = el.getBoundingClientRect();
      const releasedOverCanvas = isPointWithinRect(e.clientX, e.clientY, rect);
      const r = rendererRef.current;

      if (gestureMode === 'rotate') {
        clearInteraction();
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
          '.step-focus-banner, .bit-history-panel, .detail-inspector-overlay, .toolbar, .step-panel, .settings-sidebar, .detail-panel, .timing-panel, .trace-info-popover'
        )) {
          clearInteraction();
          return;
        }
        const coords = screenToCanvasCoords(e.clientX, e.clientY);
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
      const coords = screenToCanvasCoords(e.clientX, e.clientY);
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
        setHoverPos(null);
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
  }, [computeBitInfo, flyToElement, getMinimapDetailH, updateMinimapAvailability, enableTiltAndResize, scheduleBalloonRelayout]);

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
    toggleControlsHidden,
    camera3DRef,
  });

  // PNG snapshot + WebM video export. See src/hooks/useTraceExport.js.
  const { exporting, exportProgress, exportPng, exportVideo, cancelExport } = useTraceExport({
    rendererRef,
    steps,
    bitCount: header.bitCount,
    currentStep,
    goToStep,
    autoRender,
  });

  // Search: navigate to a specific bit, byte, uint64, vector, or number
  const handleSearch = useCallback((query) => {
    const r = rendererRef.current;
    if (!r || !query.trim()) {
      setSearchResult(null);
      r?.clearSearchHighlight();
      r?.render();
      if (r) r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      return;
    }

    const q = query.trim().toLowerCase();
    let bitIdx = -1;
    let targetKind = 'bit';
    let highlightIndex = -1;

    // Parse: "bit N", "byte N", "uint32 N", "uint64 N", "vector N", "number N", or just a plain number
    const m = q.match(/^(bit|byte|uint32|uint64|vector|number|num|#)?\s*(\d+)$/);
    if (!m) {
      r.clearSearchHighlight();
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      setSearchResult('Invalid query');
      return;
    }

    const type = m[1] || '';
    const val = parseInt(m[2], 10);

    switch (type) {
      case 'bit':
        targetKind = 'bit';
        bitIdx = val;
        highlightIndex = val;
        break;
      case 'byte':
        targetKind = 'byte';
        bitIdx = val * 8;
        highlightIndex = val;
        break;
      case 'uint32':
        targetKind = 'uint32';
        bitIdx = val * 32;
        highlightIndex = val;
        break;
      case 'uint64':
        targetKind = 'uint64';
        bitIdx = val * 64;
        highlightIndex = val;
        break;
      case 'vector':
        targetKind = 'vector';
        bitIdx = val * 64 * r.vectorGroup;
        highlightIndex = val;
        break;
      case 'number': case 'num': case '#':
        targetKind = 'bit';
        bitIdx = numberToBit(val, storageModel);
        if (bitIdx < 0) {
          r.clearSearchHighlight();
          r.render();
          r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
          setSearchResult('Not representable in this storage model');
          return;
        }
        highlightIndex = bitIdx;
        break;
      default:
        // Plain number — treat as bit index
        targetKind = 'bit';
        bitIdx = val;
        highlightIndex = val;
    }

    if (bitIdx < 0 || bitIdx >= r.bitCount) {
      r.clearSearchHighlight();
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      setSearchResult(`Out of range (0–${r.bitCount - 1})`);
      return;
    }

    const num = bitToNumber(bitIdx, storageModel);
    r.setSearchHighlight(targetKind, highlightIndex, bitIdx);
    navigateToBit(bitIdx, targetKind);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    setSearchResult(`Bit ${bitIdx} -> Number ${num}`);
  }, [navigateToBit, storageModel, getMinimapDetailH]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || searchOpen) return;
    r.clearSearchHighlight();
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    setSearchResult(null);
  }, [searchOpen, getMinimapDetailH]);

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
    const line1 = `Event ${eventId} | ${functionName}`;

    // Build annotation lines: first line is metadata, then each line of s.annotation.
    const annotationLines = [];
    const metaParts = [];
    if (s.prime != null) metaParts.push(`Prime ${s.prime}`);
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
    // left/top use pixel offsets from `canvasAnchorPx` (computed so
    // that the canvas center sits at the VIEWPORT center, not the
    // container center). When a side panel toggles the container
    // reshapes; without viewport anchoring the canvas's `50%/50%`
    // moves with the container and the user sees the content slide.
    {
      position: 'absolute',
      left: canvasAnchorPx ? `${canvasAnchorPx.left}px` : '50%',
      top: canvasAnchorPx ? `${canvasAnchorPx.top}px` : '50%',
      transform: `translate(-50%, -50%)${camera3DTransform !== 'none' ? ` ${camera3DTransform}` : ''}`,
      transformStyle: 'preserve-3d',
      transformOrigin: '50% 50%',
    }
  ), [camera3DTransform, canvasAnchorPx]);

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

  // (legacy playSpeed-based label/value/setters removed; speed is now driven
  // by playSpeedPercent and per-event time targets — see SettingsPanel.)
  const stepSpeedValue = useMemo(() => {
    const interval = clampMs(parseInt(bitAnimInterval || 0, 10) || 20, 5, 5000);
    const ratio = (5000 - interval) / (5000 - 5);
    return Math.round(1 + ratio * 499);
  }, [bitAnimInterval, clampMs]);
  const maskSpeedValue = useMemo(() => {
    const interval = clampMs(parseInt(maskAnimInterval || 0, 10) || 20, 5, 5000);
    const ratio = (5000 - interval) / (5000 - 5);
    return Math.round(1 + ratio * 499);
  }, [maskAnimInterval, clampMs]);
  const setStepSpeedValue = useCallback((speedValue) => {
    const speed = clampMs(parseInt(speedValue || 0, 10) || 1, 1, 500);
    const ratio = (speed - 1) / 499;
    setBitAnimInterval(Math.round(5000 - ratio * (5000 - 5)));
  }, [clampMs]);
  const setMaskSpeedValue = useCallback((speedValue) => {
    const speed = clampMs(parseInt(speedValue || 0, 10) || 1, 1, 500);
    const ratio = (speed - 1) / 499;
    setMaskAnimInterval(Math.round(5000 - ratio * (5000 - 5)));
  }, [clampMs]);

  const cycleAnimStyle = useCallback(() => {
    const styles = ['ripple', 'fade', 'pulse', 'none'];
    const current = styles.indexOf(animStyle);
    const next = styles[(current + 1 + styles.length) % styles.length];
    setAnimStyle(next);
  }, [animStyle]);

  const cycleAnimMode = useCallback(() => {
    const modes = ['sequential', 'bounce', 'all'];
    const current = modes.indexOf(animMode);
    const next = modes[(current + 1 + modes.length) % modes.length];
    setAnimMode(next);
  }, [animMode]);

  const animStyleInfo = useMemo(() => ({
    ripple: { label: 'Ripple', shortLabel: 'Rip', hint: 'Water-drop ripple on changed bits', swatch: '◌' },
    fade: { label: 'Fade', shortLabel: 'Fade', hint: 'Soft fade highlight', swatch: '◔' },
    pulse: { label: 'Pulse', shortLabel: 'Pulse', hint: 'Pulse changed bits', swatch: '◎' },
    none: { label: 'None', shortLabel: 'Off', hint: 'No animated effect', swatch: '—' },
  }), []);

  const animModeInfo = useMemo(() => ({
    sequential: { label: 'Sequential', hint: 'Animate bit-by-bit in order', swatch: '1→2→3' },
    bounce: { label: 'Bounce', hint: 'Animate forward and backward', swatch: '↔' },
    all: { label: 'All At Once', hint: 'Animate all bits simultaneously', swatch: '⋯' },
  }), []);

  const detailInspectorRows = useMemo(() => {
    if (!currentStepData || !currentStepData.changedBits || currentStepData.changedBits.length === 0) return [];
    const bits = Array.from(currentStepData.changedBits).sort((a, b) => a - b);
    const groupBits = layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64);
    return bits.map((bit) => {
      const number = bitToNumber(bit, storageModel || 'half');
      const byte = Math.floor(bit / 8);
      const uint64 = Math.floor(bit / 64);
      const group = Math.floor(bit / groupBits);
      return {
        bit,
        number,
        byte,
        uint64,
        group,
        cacheline: Math.floor(bit / Math.max(8, cachelineSize * 8)),
      };
    });
  }, [currentStepData, layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup, storageModel, cachelineSize]);

  const filteredDetailInspectorRows = useMemo(() => {
    const q = detailInspectorQuery.trim().toLowerCase();
    if (!q) return detailInspectorRows;
    return detailInspectorRows.filter((row) => {
      const haystack = `${row.bit} ${row.number} ${row.byte} ${row.uint64} ${row.group} ${row.cacheline}`.toLowerCase();
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

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const pos = r.bitIndexToCanvas(bitIndex);
    if (!pos) return null;
    const dpr = window.devicePixelRatio || 1;
    const canvasCssHeight = (r.canvas?.height || rect.height * dpr) / dpr;
    const planeW = r.canvasWidth || rect.width;
    const planeH = canvasCssHeight;
    const planeOffsetX = Math.max(0, (planeW - rect.width) / 2);
    const planeOffsetY = Math.max(0, (planeH - rect.height) / 2);
    const anchorX = rect.left + (pos.x - planeOffsetX);
    const anchorY = rect.top + (pos.y - planeOffsetY);
    const bitHalf = Math.max(2.5, (r.pixelSize || 2) * (r.zoom || 1) * 0.52);

    // The anchor (the bit itself) must lie inside the grid container; otherwise
    // the balloon would be adrift from its bit and should fade out.
    const edgeMargin = 4;
    const anchorInsideGrid =
      anchorX >= rect.left + edgeMargin &&
      anchorX <= rect.right - edgeMargin &&
      anchorY >= rect.top + edgeMargin &&
      anchorY <= rect.bottom - edgeMargin;

    const sideInsetLeft = stepsPanelCollapsed ? 80 : Math.max(120, panelWidth + 32);
    const sideInsetRight = settingsCollapsed ? 48 : 360;
    const panelApproxHalfW = 170;
    const minLeft = sideInsetLeft + panelApproxHalfW;
    const maxLeft = window.innerWidth - sideInsetRight - panelApproxHalfW;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, anchorX));

    const detailPad = detailOpen ? detailHeight + 22 : 56;
    const minTop = 96;
    const maxTop = window.innerHeight - detailPad;
    const clampedTop = Math.max(minTop, Math.min(maxTop, anchorY - 12));

    return { left: clampedLeft, top: clampedTop, anchorX, anchorY, bitHalf, anchorInsideGrid };
  }, [stepsPanelCollapsed, panelWidth, settingsCollapsed, detailOpen, detailHeight]);

  const getVisibleBalloonStyles = useCallback((items) => {
    const approxWidth = 320;
    const approxHeight = 238;
    const margin = 18;
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
        '.step-panel:not(.collapsed)',
        '.settings-sidebar:not(.collapsed)',
        '.detail-panel.open',
        '.timing-panel',
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

    for (const item of normalized) {
      const candidates = [
        { left: item.left, top: item.top },
        { left: item.left - 180, top: item.top - 10 },
        { left: item.left + 180, top: item.top - 10 },
        { left: item.left, top: item.top - 44 },
        { left: item.left - 220, top: item.top - 52 },
        { left: item.left + 220, top: item.top - 52 },
      ];

      let chosen = candidates[0];
      let found = false;
      for (const candidate of candidates) {
        const box = {
          left: candidate.left - approxWidth / 2,
          right: candidate.left + approxWidth / 2,
          top: candidate.top - approxHeight,
          bottom: candidate.top,
        };
        const overlaps = placed.some((other) => (
          box.left < other.right + margin &&
          box.right > other.left - margin &&
          box.top < other.bottom + margin &&
          box.bottom > other.top - margin
        ));
        if (!overlaps) {
          chosen = candidate;
          found = true;
          break;
        }
      }

      if (!found) {
        const direction = placed.length % 2 === 0 ? 1 : -1;
        chosen = {
          left: item.left + direction * (120 + placed.length * 18),
          top: item.top - 68 - placed.length * 10,
        };
      }

      const minLeft = stepsPanelCollapsed ? 170 : Math.max(200, panelWidth + 44);
      const maxLeft = window.innerWidth - (settingsCollapsed ? 48 : 360) - 170;
      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, chosen.left));
      // Clamp the balloon top below the titlebar so it never paints over window chrome.
      const minTopClamp = Math.max(96, toolbarBottom + approxHeight + 8);
      const clampedTop = Math.max(minTopClamp, chosen.top);
      const box = {
        left: clampedLeft - approxWidth / 2,
        right: clampedLeft + approxWidth / 2,
        top: clampedTop - approxHeight,
        bottom: clampedTop,
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
      };
    }

    return result;
  }, [getBitBalloonGeometry, stepsPanelCollapsed, panelWidth, settingsCollapsed]);

  const effectiveTitle = traceTitle;
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = effectiveTitle;
  }, [effectiveTitle]);

  // Reset the step-scrub slider whenever the user moves to a different event.
  useEffect(() => { setStepScrubProgress(0); }, [currentStep]);
  // Auto-pick the animation mode for the current event: prefer 'mask' when the
  // event has mask write-order metadata, otherwise fall back to 'bit'. The user
  // can still toggle this within the event.
  useEffect(() => {
    const step = stepsRef.current[currentStep];
    const hasMask = !!(step && step.maskWriteOrderWords && step.maskWriteOrderWords.length > 0
      && Number.isFinite(step.maskWordBits) && step.maskWordBits > 0);
    setBitAnimationMode(hasMask ? 'mask' : 'bit');
  }, [currentStep]);

  // Sliders for event timeline and animation speed. Rendered inside the
  // step-focus-banner when it's visible; moved into the detail panel when the
  // banner is hidden so the controls remain accessible.
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
    />
  );

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
        toggleTilt={toggleTilt}
        heatMapEnabled={heatMapEnabled}
        setHeatMapEnabled={setHeatMapEnabled}
        primeOverlayEnabled={primeOverlayEnabled}
        setPrimeOverlayEnabled={setPrimeOverlayEnabled}
        timingPanelOpen={timingPanelOpen}
        setTimingPanelOpen={setTimingPanelOpen}
        exportPng={exportPng}
        exportVideo={exportVideo}
        cancelExport={cancelExport}
        exportProgress={exportProgress}
        theme={theme}
        setTheme={setTheme}
        controlsHidden={controlsHidden}
        toggleControlsHidden={toggleControlsHidden}
        allEventsWidgetHidden={allEventsWidgetHidden}
        showAllEventsWidget={showAllEventsWidget}
        stepsPanelCollapsed={stepsPanelCollapsed}
        toggleStepsPanel={toggleStepsPanel}
        detailOpen={detailOpen}
        toggleDetailPanel={toggleDetailPanel}
        settingsCollapsed={settingsCollapsed}
        toggleSettingsPanel={toggleSettingsPanel}
      />

      {exporting && <ExportProgress progress={exportProgress} />}

      {/* Main content — panels float (position:absolute) within this div, which sits
           below the toolbar. overflow:visible so collapsed toggle buttons are not
           clipped; canvas-area inside already clips the canvas with its own
           overflow:hidden. */}
      <div
        className={`main-content${mode3D ? ' mode-3d' : ''}`}
        style={{ '--events-panel-width': `${stepsPanelCollapsed ? 0 : panelWidth}px` }}
      >
        <StepPanel
          steps={steps}
          currentStep={currentStep}
          selectedSteps={selectedSteps}
          onStepClick={handleStepSelection}
          onMultiStepSelect={handleMultiStepSelect}
          onUserScroll={stopPlayback}
          width={panelWidth}
          onWidthChange={setPanelWidth}
          panelCollapsed={stepsPanelCollapsed}
          onToggleCollapse={toggleStepsPanel}
          allEventsWidgetHidden={allEventsWidgetHidden}
          onExpandPanelFromWidget={() => {
            setAllEventsWidgetHidden(false);
            setStepsPanelCollapsed(false);
          }}
          onDockWidgetToTopBar={() => {
            setAllEventsWidgetHidden(true);
            setControlsHidden(false);
          }}
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
        />
        <CanvasStage
          mode3D={mode3D}
          containerRef={containerRef}
          canvasRef={canvasRef}
          settledCanvasRef={settledCanvasRef}
          minimapCanvasRef={minimapCanvasRef}
          glCanvasRef={glCanvasRef}
          glActive={true}
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
          stepsPanelCollapsed={stepsPanelCollapsed}
          setStepsPanelCollapsed={setStepsPanelCollapsed}
          stepAnimSlidersContent={stepAnimSlidersContent}
          pinnedBitIndices={pinnedBitIndices}
          hoveredBitInfo={hoveredBitInfo}
          computeBitInfo={computeBitInfo}
          getVisibleBalloonStyles={getVisibleBalloonStyles}
          cachelineSize={cachelineSize}
          setPinnedBitIndices={setPinnedBitIndices}
          handleStepSelection={handleStepSelection}
          detailOpen={detailOpen}
          toggleDetailPanel={toggleDetailPanel}
          detailHeight={detailHeight}
          updateDetailHeight={updateDetailHeight}
          detailWidth={detailWidth}
          setDetailWidth={setDetailWidth}
          playing={playing}
          selectedSteps={selectedSteps}
          stepStats={stepStats}
          storageModel={storageModel}
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
        />
        <SettingsPanel
          settings={layoutSettings}
          onChange={setLayoutSettings}
          collapsed={settingsCollapsed}
          onToggleCollapse={toggleSettingsPanel}
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
          maskAnimationEnabled={maskAnimationEnabled}
          onMaskAnimationEnabledChange={setMaskAnimationEnabled}
          animationReplayPaused={animationReplayPaused}
          onAnimationReplayPausedChange={setAnimationReplayPaused}
          maxStepDurationEnabled={maxStepDurationEnabled}
          onMaxStepDurationEnabledChange={setMaxStepDurationEnabled}
          maxStepDurationMs={maxStepDurationMs}
          onMaxStepDurationMsChange={setMaxStepDurationMs}
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
          depthSettings={depthSettings}
          onDepthSettingsChange={setDepthSettings}
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
        />
      </div>
    </div>
  );
}

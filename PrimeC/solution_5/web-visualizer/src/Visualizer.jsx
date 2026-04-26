import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SieveRenderer, bitToNumber, numberToBit, STORAGE_MODELS, CACHE_PRESETS } from './SieveRenderer';
import { Camera3D } from './Camera3D';
import StepPanel from './StepPanel';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import TimingPanel from './TimingPanel';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Search, Minus, Plus, Thermometer, PlayPause
} from './Icons';

const VIEW_PREFS_KEY = 'sieve-visualizer:view-preferences:v1';

function readViewPrefs() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(VIEW_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mergeLayoutSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    outlines: {
      ...DEFAULT_SETTINGS.outlines,
      ...(saved.outlines || {}),
    },
  };
}

function writeViewPrefs(prefs) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage failures.
  }
}

const DEFAULT_SETTINGS = {
  bitLayout: '4x2',
  byteLayout: '4x2',
  bitSpacingH: 1,
  bitSpacingV: 1,
  byteSpacingH: 2,
  byteSpacingV: 2,
  u64SpacingH: 4,
  u64SpacingV: 4,
  vectorMode: 'preset',
  vectorGroup: 1,
  vectorBaseBits: 64,
  vectorLanes: 1,
  vectorLabel: 'uint64',
  customGroupBits: 0,
  showBitLabels: true,
  showNumberLabels: false,
  showByteLabels: true,
  showVectorLabels: true,
  showVectorTouchOrder: false,
  bitLabelMode: 'global',
  byteLabelMode: 'group',
  horizontalGroups: 0,
  outlines: {
    target: 'none',
  },
};

const DEFAULT_EVENT_TITLE_SETTINGS = {
  visible: true,
  position: 'center',
  scale: 100,
  // User-drag offset in pixels from the default (centered) position. Persisted.
  dragOffsetX: 0,
  dragOffsetY: 0,
};

const DEFAULT_DEPTH_SETTINGS = {
  strength: 80,
  angle: 38,
};

function mergeEventTitleSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_EVENT_TITLE_SETTINGS;
  const scale = Math.max(70, Math.min(160, parseInt(saved.scale || DEFAULT_EVENT_TITLE_SETTINGS.scale, 10) || DEFAULT_EVENT_TITLE_SETTINGS.scale));
  const dragOffsetX = Number.isFinite(Number(saved.dragOffsetX)) ? Number(saved.dragOffsetX) : 0;
  const dragOffsetY = Number.isFinite(Number(saved.dragOffsetY)) ? Number(saved.dragOffsetY) : 0;
  return {
    ...DEFAULT_EVENT_TITLE_SETTINGS,
    ...saved,
    visible: saved.visible !== false,
    position: 'center', // user removed the position picker; always re-center as baseline
    scale,
    dragOffsetX,
    dragOffsetY,
  };
}

function mergeDepthSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_DEPTH_SETTINGS;
  const strength = Math.max(0, Math.min(100, parseInt(saved.strength ?? DEFAULT_DEPTH_SETTINGS.strength, 10) || DEFAULT_DEPTH_SETTINGS.strength));
  const angle = Math.max(0, Math.min(90, parseInt(saved.angle ?? DEFAULT_DEPTH_SETTINGS.angle, 10) || DEFAULT_DEPTH_SETTINGS.angle));
  return {
    ...DEFAULT_DEPTH_SETTINGS,
    ...saved,
    strength,
    angle,
  };
}

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
  const traceInfoSections = useMemo(() => {
    // Parse a single info item into a {label, value} pair. Accepts "label: value",
    // "label=value", or "Label Value" (single-word label followed by value).
    const parseKeyValue = (raw) => {
      const text = String(raw || '').trim();
      if (!text) return null;
      const colonEq = text.match(/^\s*([^:=]+?)\s*[:=]\s*(.+?)\s*$/);
      if (colonEq) return { label: colonEq[1].trim(), value: colonEq[2].trim() };
      // "Storage half", "Max 1000", "v5"
      const labelSpace = text.match(/^\s*(Storage|Max|Bits|Events|Settings|Trace level|Version)\s+(.+)\s*$/i);
      if (labelSpace) return { label: labelSpace[1], value: labelSpace[2] };
      if (/^v\d/i.test(text)) return { label: 'Version', value: text.replace(/^v/i, '') };
      return null;
    };

    // Canonical key for dedup + routing.
    const canonicalize = (label) => String(label || '').trim().toLowerCase().replace(/\s+/g, '_');
    // Canonical value for dedup: strip grouping separators on numerics.
    const canonicalValue = (value) => {
      const text = String(value || '').trim();
      if (/^-?\d[\d,._\s]*$/.test(text)) return text.replace(/[,_\s]/g, '');
      return text.toLowerCase();
    };

    // Label + section routing for recognized keys. Unknown keys flow to Notes.
    const runKeys = new Set([
      'max', 'max_number', 'maxnumber', 'factor_max',
      'bits', 'bit_count', 'bitcount',
      'events', 'step_count', 'stepcount',
      'storage', 'storage_model', 'storagemodel',
      'trace_level', 'tracelevel',
      'threads', 'duration', 'elapsed',
      'version', 'v',
    ]);
    const settingsKeys = new Set(['settings', 'benchmark_settings', 'benchmarksettings']);
    const prettyLabel = (canon, fallback) => ({
      max: 'Max', max_number: 'Max', maxnumber: 'Max', factor_max: 'Max',
      bits: 'Bits', bit_count: 'Bits', bitcount: 'Bits',
      events: 'Events', step_count: 'Events', stepcount: 'Events',
      storage: 'Storage', storage_model: 'Storage', storagemodel: 'Storage',
      trace_level: 'Trace level', tracelevel: 'Trace level',
      threads: 'Threads', duration: 'Duration', elapsed: 'Elapsed',
      version: 'Version', v: 'Version',
      settings: 'Settings', benchmark_settings: 'Settings', benchmarksettings: 'Settings',
    }[canon] || fallback);

    const items = [];
    if (fileName) items.push({ label: 'File', value: fileName });
    if (header.subtitle) items.push({ label: 'Subtitle', value: header.subtitle });
    if (Array.isArray(header.infoLines)) {
      for (const line of header.infoLines) {
        const kv = parseKeyValue(line);
        if (kv) items.push(kv);
        else items.push({ label: 'Info', value: String(line) });
      }
    }
    if (header.maxNumber != null) items.push({ label: 'Max', value: String(header.maxNumber) });
    if (header.storageModel) items.push({ label: 'Storage', value: header.storageModel });
    if (header.traceLevel != null) items.push({ label: 'Trace level', value: String(header.traceLevel) });
    if (header.bitCount != null) items.push({ label: 'Bits', value: String(header.bitCount) });
    if (header.stepCount != null) items.push({ label: 'Events', value: String(header.stepCount) });
    if (header.version != null) items.push({ label: 'Version', value: String(header.version) });

    // Dedupe by canonical (label, value), preserving insertion order.
    const seen = new Set();
    const deduped = [];
    for (const kv of items) {
      const canonLabel = canonicalize(kv.label);
      const canonVal = canonicalValue(kv.value);
      const key = `${canonLabel}=${canonVal}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = prettyLabel(canonLabel, kv.label);
      // Format numerics with commas when display label is friendly.
      let displayValue = kv.value;
      if (/^-?\d+$/.test(String(kv.value))) {
        const n = Number(kv.value);
        if (Number.isFinite(n) && Math.abs(n) >= 1000) displayValue = n.toLocaleString();
      }
      deduped.push({ label, canonLabel, value: displayValue });
    }

    const file = [];
    const run = [];
    const settings = [];
    const extra = [];
    for (const kv of deduped) {
      if (kv.canonLabel === 'file' || kv.canonLabel === 'subtitle') { file.push(kv); continue; }
      if (settingsKeys.has(kv.canonLabel)) { settings.push(kv); continue; }
      if (runKeys.has(kv.canonLabel)) { run.push(kv); continue; }
      extra.push(kv);
    }

    return [
      { title: 'File', rows: file },
      { title: 'Run', rows: run },
      { title: 'Settings', rows: settings },
      { title: 'Notes', rows: extra },
    ].filter((section) => section.rows.length > 0);
  }, [header, fileName]);

  const canvasRef = useRef(null);
  const settledCanvasRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const isMacPlatform = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const uaDataPlatform = navigator.userAgentData?.platform || '';
    const probe = `${uaDataPlatform} ${navigator.platform || ''} ${navigator.userAgent || ''} ${navigator.appVersion || ''}`;
    return /(Mac|iPhone|iPad|iPod)/i.test(probe);
  }, []);
  const isWindowsPlatform = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const uaDataPlatform = navigator.userAgentData?.platform || '';
    const probe = `${uaDataPlatform} ${navigator.platform || ''} ${navigator.userAgent || ''} ${navigator.appVersion || ''}`;
    return /Win/i.test(probe);
  }, []);
  // Electron (native app) inserts "Electron" into the UA and exposes process.versions.electron.
  // In browser mode we don't reserve space for traffic-light window controls.
  const isElectron = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')) return true;
    const proc = (typeof window !== 'undefined' && window.process) || null;
    return !!(proc && proc.versions && proc.versions.electron);
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(4000);
  const [zoom, setZoom] = useState(1);
  const [panelWidth, setPanelWidth] = useState(320);
  const [theme, setTheme] = useState(() => readViewPrefs()?.theme === 'light' ? 'light' : 'dark');
  const [showTraceInfo, setShowTraceInfo] = useState(false);
  const [loweredSetBits, setLoweredSetBits] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(true);
  const [layoutSettings, setLayoutSettings] = useState(() => mergeLayoutSettings(readViewPrefs()?.layoutSettings));
  const [eventTitleSettings, setEventTitleSettings] = useState(() => mergeEventTitleSettings(readViewPrefs()?.eventTitleSettings));
  const [depthSettings, setDepthSettings] = useState(() => mergeDepthSettings(readViewPrefs()?.depthSettings));
  const [detailOpen, setDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [repeatAnim, setRepeatAnim] = useState(500);
  const [animMode, setAnimMode] = useState('sequential'); // 'all' or 'sequential'
  const [animStyle, setAnimStyle] = useState('fade'); // 'ripple', 'fade', 'pulse', 'none'
  const [maskAnimationEnabled, setMaskAnimationEnabled] = useState(true);
  const [animationReplayPaused, setAnimationReplayPaused] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  // 0..100 slider progress scrubbing through the current event's internal animation.
  // Resets whenever the current event changes. The sequential-reveal animation
  // writes to this state as it progresses so the banner slider follows along.
  const [stepScrubProgress, setStepScrubProgress] = useState(0);
  const stepScrubProgressRef = useRef(setStepScrubProgress);
  stepScrubProgressRef.current = setStepScrubProgress;
  // Is the per-event sequential reveal currently in progress? The banner
  // play/pause button reads this to pick its icon.
  const [stepAnimRunning, setStepAnimRunning] = useState(false);
  const setStepAnimRunningRef = useRef(setStepAnimRunning);
  setStepAnimRunningRef.current = setStepAnimRunning;
  // One-shot resume hint: when the banner Play button kicks the existing
  // pausedStepAnimLoop, the first iteration uses this index instead of 0 so
  // resume picks up at the user's slider position. Subsequent loop iterations
  // restart from the beginning, after the configured replay delay.
  const stepResumeStartIndexRef = useRef(0);
  // 0..1 resume hint for the mask animation path (mirrors stepResumeStartIndexRef).
  const stepResumeMaskProgressRef = useRef(0);
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
  const [maxStepDurationEnabled, setMaxStepDurationEnabled] = useState(() => readViewPrefs()?.maxStepDurationEnabled === true);
  const [maxStepDurationMs, setMaxStepDurationMs] = useState(() => {
    const saved = Number(readViewPrefs()?.maxStepDurationMs);
    return Number.isFinite(saved) ? Math.max(2000, Math.min(30000, Math.round(saved))) : 8000;
  });
  const [gridOpacity, setGridOpacity] = useState(() => {
    const saved = Number(readViewPrefs()?.gridOpacity);
    return Number.isFinite(saved) ? Math.max(0.12, Math.min(1, saved)) : 1;
  });
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
  const [storageModel, setStorageModel] = useState(header.storageModel || 'half');
  const [selectedSteps, setSelectedSteps] = useState(new Set());
  const [heatMapEnabled, setHeatMapEnabled] = useState(false);
  const [cachelineSize, setCachelineSize] = useState(64);
  const [cachePreset, setCachePreset] = useState('fixed');
  const [stepsPanelCollapsed, setStepsPanelCollapsed] = useState(true);
  const [timingPanelOpen, setTimingPanelOpen] = useState(false);
  const [timingFocusOp, setTimingFocusOp] = useState('');
  const [detailInspectorOpen, setDetailInspectorOpen] = useState(false);
  const [detailInspectorMode, setDetailInspectorMode] = useState('bits');
  const [detailInspectorQuery, setDetailInspectorQuery] = useState('');
  const [, setBalloonLayoutTick] = useState(0);

  // 3D camera state
  const [mode3D, setMode3D] = useState(false);
  const [camera3DTransform, setCamera3DTransform] = useState('none');
  const [camera3DContainerStyle, setCamera3DContainerStyle] = useState({});
  const currentAnimIntervalRef = useRef(20);
  const currentMaskAnimIntervalRef = useRef(20);
  const camera3DRef = useRef(null);

  const bitStateRef = useRef(null);
  const stepsRef = useRef([]);
  const playTimerRef = useRef(null);
  const exportCancelRef = useRef(false);
  const rippleRef = useRef(null);
  const seqTimerRef = useRef(null); // sequential animation timer
  const triggerAnimationRef = useRef(null);
  const playTimeoutRef = useRef(null);
  const animBusyUntilRef = useRef(0);
  const selectedAnimLoopRef = useRef(null);
  const pausedStepAnimLoopRef = useRef(null);
  const initialFitDoneRef = useRef(false);
  const detailOpenRef = useRef(true);
  const detailHeightRef = useRef(280);
  const lastHoveredIdxRef = useRef(-1); // tracks last hovered bit to avoid redundant recomputes
  const layoutRefreshTimeoutRef = useRef(null);
  const layoutRefreshRaf1Ref = useRef(null);
  const layoutRefreshRaf2Ref = useRef(null);
  const viewportAnimRef = useRef(null);
  const autoplayStartedRef = useRef(false);
  const initialHighlightHoldRef = useRef(true);
  const initial3DRestoreDoneRef = useRef(true);
  const traceInfoPopoverRef = useRef(null);
  // True while the timeline slider has left bitState in a partially-revealed
  // (pre-step) state. goToStep checks this and always rebuilds bitState from
  // scratch so we don't end up with an inconsistent incremental update.
  const bitStateDirtyRef = useRef(false);
  const traceInfoToggleRef = useRef(null);
  const balloonLayoutRafRef = useRef(null);

  stepsRef.current = steps;

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
    return { bitIndex: idx, number: bitToNumber(idx, sm), history };
  }, []);

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
    const cam = camera3DRef.current;
    let canvasW = width;
    let canvasH = height;
    if (cam && cam.enabled) {
      const ax = Math.abs(cam.rotateX) * Math.PI / 180;
      const ay = Math.abs(cam.rotateY) * Math.PI / 180;
      const scaleH = 1 / Math.max(0.3, Math.cos(ax));
      const scaleW = 1 / Math.max(0.3, Math.cos(ay));
      const diagonalOverscan = 1 + Math.hypot(Math.sin(ax), Math.sin(ay)) * 0.55;
      const dragOverscan = 3.1;
      canvasW = Math.max(width * 3.2, width * scaleW * diagonalOverscan * dragOverscan);
      canvasH = Math.max(height * 3.2, height * scaleH * diagonalOverscan * dragOverscan);
    }
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

    r.resize(canvasW, canvasH);
    r.unfreezeLayout();
    r.freezeLayout();

    if (anchor && anchor.contentX != null && anchor.contentY != null) {
      const canvasCssHeight = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
      const planeOffsetX = Math.max(0, (canvasW - rect.width) / 2);
      const planeOffsetY = Math.max(0, (canvasCssHeight - rect.height) / 2);
      const desiredX = planeOffsetX + Math.max(0, Math.min(rect.width, anchor.clientX - rect.left));
      const desiredY = planeOffsetY + Math.max(0, Math.min(rect.height, anchor.clientY - rect.top));
      const mappedX = anchor.contentX * Math.max(0.0001, r.zoom || 1) + r.panX;
      const mappedY = anchor.contentY * Math.max(0.0001, r.zoom || 1) + r.panY;
      r.panX += desiredX - mappedX;
      r.panY += desiredY - mappedY;
    }

    r.render();
    updateMinimapAvailability();
    if (showMinimap) r.renderMinimap(rect.width, rect.height, getMinimapDetailH());
  }, [getCanvasTargetSize, showMinimap, getMinimapDetailH, updateMinimapAvailability]);

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
    const r = rendererRef.current;
    setStepsPanelCollapsed((wasCollapsed) => {
      // When expanding, the canvas shrinks — shift pan right by half the panel width.
      // When collapsing, the canvas grows — shift pan left by half the panel width.
      const collapsedW = 32;
      const expandedW = panelWidth;
      const delta = expandedW - collapsedW;
      if (r) {
        r.panX += wasCollapsed ? -(delta / 2) : (delta / 2);
      }
      return !wasCollapsed;
    });
    // Schedule refresh without anchor — panX already compensated
    schedulePostLayoutRefresh(null);
  }, [panelWidth, schedulePostLayoutRefresh]);

  const toggleDetailPanel = useCallback(() => {
    const anchor = captureViewportAnchor(0.5, 0.5);
    updateDetailOpen((o) => !o);
    schedulePostLayoutRefresh(anchor);
  }, [captureViewportAnchor, updateDetailOpen, schedulePostLayoutRefresh]);

  const toggleSettingsPanel = useCallback(() => {
    const anchor = captureViewportAnchor(0.5, 0.5);
    setSettingsCollapsed((collapsed) => !collapsed);
    schedulePostLayoutRefresh(anchor);
  }, [captureViewportAnchor, schedulePostLayoutRefresh]);

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
    });
  }, [theme, layoutSettings, eventTitleSettings, depthSettings, maxStepDurationEnabled, maxStepDurationMs, gridOpacity]);

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
    }

    // Init 3D camera
    const cam = new Camera3D();
    camera3DRef.current = cam;
    cam.setUpdateCallback(() => {
      setCamera3DTransform(cam.getCanvasTransform());
      setCamera3DContainerStyle(cam.getContainerStyle());
    });
    cam.setPanZoomCallback(({ panX, panY, zoom: z }) => {
      const rr = rendererRef.current;
      if (!rr) return;
      rr.panX = panX;
      rr.panY = panY;
      rr.zoom = z;
      setZoom(z);
      rr.render();
      rr.renderMinimap(rr.canvasWidth, rr.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    });

    return () => {
      rendererRef.current = null;
      if (camera3DRef.current) camera3DRef.current.cancelAllAnimations();
      camera3DRef.current = null;
    };
  }, [header.bitCount, header.sieveSize]);

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
    const outlineTarget = layoutSettings.outlines?.target || 'none';
    r.outlineEnabled = outlineTarget !== 'none';
    r.outlineTarget = outlineTarget;
    r.outlineStyle = 'dashed';
    r.outlineColor = '#3b82f6';
    r.outlineRounded = true;
    r.colorPreset = colorPreset;
    r.storageModel = storageModel;
    r.cachelineSize = cachelineSize;
    r.heatMapEnabled = heatMapEnabled;
    r.loweredSetBits = loweredSetBits;
    r.loweredSetBits3D = mode3D;
    r.transparentBackground = mode3D;
    r.loweredDepthStrength = Math.max(0, Math.min(1.0, (depthSettings.strength ?? 80) / 100));
    r.loweredDepthAngle = Math.max(0, Math.min(90, depthSettings.angle ?? 38));
    r.gridOpacity = Math.max(0.12, Math.min(1, gridOpacity));
    r.customSetBit = customColors.setBit;
    r.customClearedBit = customColors.clearedBit;
    r.customUnchangedBit = customColors.unchangedBit;
    // Preserve centered bit while layout geometry changes.
    const prev = prevLayoutRef.current;
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
    if (structureChanged) {
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
      if (centerAnchorBit >= 0 && desiredX != null && desiredY != null) {
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
    r.render();
    updateMinimapAvailability();
    if (showMinimap) r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [theme, layoutSettings, showMinimap, colorPreset, customColors, storageModel, cachelineSize, heatMapEnabled, loweredSetBits, mode3D, depthSettings, gridOpacity, updateMinimapAvailability]);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const anchor = captureViewportAnchor(0.5, 0.5);
      refreshCanvasLayout(anchor);
    };

    clearScheduledLayoutRefresh();
    const transitionRefreshTimer = setTimeout(onResize, 190);

    onResize();
    // Run an extra post-layout refresh to catch CSS transition-based width changes.
    layoutRefreshRaf1Ref.current = requestAnimationFrame(() => {
      layoutRefreshRaf2Ref.current = requestAnimationFrame(onResize);
    });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(transitionRefreshTimer);
      clearScheduledLayoutRefresh();
    };
  }, [panelWidth, showMinimap, stepsPanelCollapsed, settingsCollapsed, detailOpen, detailHeight, mode3D, refreshCanvasLayout, clearScheduledLayoutRefresh, captureViewportAnchor]);

  // Go to step
  const goToStep = useCallback((target, options = {}) => {
    const r = rendererRef.current;
    if (!r || steps.length === 0) return;
    target = Math.max(0, Math.min(target, steps.length - 1));
    const suppressHighlight = options.suppressHighlight === true;
    if (!options.keepPlaying && playing) stopPlayback();
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
    if (!suppressHighlight && triggerAnimationRef.current) {
      triggerAnimationRef.current(changedSet, {
        adaptiveDuration: !playing,
        fadeOutBits: previousHighlights,
        delayMs: playing ? 0 : repeatAnim,
        playbackDurationMs: playing ? Math.max(160, playSpeed) : null,
        maxDurationEnabled: maxStepDurationEnabled,
        maxDurationMs: maxStepDurationMs,
        pinnedBitIndices,
        groupBits: effectiveGroupBits,
      });
    }
  }, [currentStep, steps, updateMinimapAvailability, playing, stopPlayback, getCanvasTargetSize, repeatAnim, playSpeed, applyViewportFit, maxStepDurationEnabled, maxStepDurationMs, pinnedBitIndices, effectiveGroupBits]);

  const cancelViewportAnimation = useCallback(() => {
    if (viewportAnimRef.current) {
      cancelAnimationFrame(viewportAnimRef.current);
      viewportAnimRef.current = null;
    }
  }, []);

  // Stop any running sequential animation
  const stopSeqAnim = useCallback(() => {
    if (seqTimerRef.current) { clearTimeout(seqTimerRef.current); seqTimerRef.current = null; }
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
    stopPlayback();
    stopSeqAnim();
    setAnimationReplayPaused(true);
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
    const targetIdx = Math.max(0, Math.min(bits.length - 1, Math.round(clamped * (bits.length - 1))));

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

  const waitForDelay = useCallback((ms) => {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      seqTimerRef.current = setTimeout(() => {
        seqTimerRef.current = null;
        resolve();
      }, ms);
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
    if (!cam || initial3DRestoreDoneRef.current || !mode3D) return;
    initial3DRestoreDoneRef.current = true;
    cam.rotateX = 16;
    cam.rotateY = 0;
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
  }, [mode3D, refitViewportToContent, schedulePostLayoutRefresh]);

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

  const clampMs = useCallback((value, min, max) => Math.max(min, Math.min(max, value)), []);

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

  const getFadeOutDuration = useCallback((bitCount, options = {}) => {
    if (options.skipFadeOut) return 0;
    return clampMs(Math.round(Math.min(320, Math.max(120, Math.max(1, bitCount) * 4))), 80, 420);
  }, [clampMs]);

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
    const durationFromInterval = orderedWrites > 0
      ? Math.round(orderedWrites * maskInterval * 2.35)
      : Math.round(420 + groupCount * maskInterval * 1.2);
    const duration = clampMs(
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
      const tick = (now) => {
        const dt = Math.max(0, now - prevTickAt);
        prevTickAt = now;
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
    const delayMs = Math.max(0, timingBaseOptions.delayMs ?? repeatAnim ?? 0);
    const requestedCycleDuration = Number.isFinite(timingBaseOptions.playbackDurationMs) ? Math.max(0, timingBaseOptions.playbackDurationMs) : null;
    const requestedAnimationDuration = requestedCycleDuration != null
      ? Math.max(120, requestedCycleDuration - delayMs)
      : null;
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
      };
      const effectiveMaskBitInterval = Math.max(5, maskTimingOptions.preferredIntervalMs || 20);
      r.setMaskGhostBits(new Set(changedSet.size > 0 ? changedSet : (r.targetBits || [])));
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      // Surface state so the banner play/pause button + timeline track this animation.
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(true);
      if (!resuming && stepScrubProgressRef.current) stepScrubProgressRef.current(0);
      await runMaskStampAnimation(effectiveMaskBitInterval, maskTimingOptions);
      if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
      if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
      // Combined mode: settle bitState to fully include the step's bits at end.
      if (combinedMode && combinedBitsConfig) {
        const { sortedBits, bs } = combinedBitsConfig;
        for (let i = 0; i < sortedBits.length; i++) {
          const bit = sortedBits[i];
          if (bit < bs.length) bs[bit] = 1;
        }
        bitStateDirtyRef.current = false;
      }
      await waitForDelay(delayMs);
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
        const revealNext = () => {
          if (!rendererRef.current) {
            resolve();
            return;
          }
          if (idx < 0 || idx >= bits.length) {
            if (animMode === 'bounce' && !bounced) {
              bounced = true;
              direction *= -1;
              idx = direction > 0 ? 0 : bits.length - 1;
            } else {
              r.changedBits = fullChanged;
              r.animationFocusBits = new Set();
              r.render();
              r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
              if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
              if (setStepAnimRunningRef.current) setStepAnimRunningRef.current(false);
              resolve();
              return;
            }
          }

          const partial = animMode === 'bounce'
            ? new Set(buildBounceTrail())
            : (() => {
                const value = new Set();
                if (direction > 0) {
                  for (let i = 0; i <= idx; i++) value.add(bits[i]);
                } else {
                  for (let i = idx; i < bits.length; i++) value.add(bits[i]);
                }
                return value;
              })();
          const focusBits = animMode === 'bounce'
            ? new Set(buildBounceTrail().slice(0, Math.max(1, Math.min(3, trailSize))))
            : new Set([bits[Math.max(0, Math.min(bits.length - 1, idx))]]);
          const currentFocusBit = bits[Math.max(0, Math.min(bits.length - 1, idx))];
          r.changedBits = partial;
          r.animationFocusBits = focusBits;
          if (previousFocusBit != null && previousFocusBit !== currentFocusBit) {
            r.addBitMotionTrail(previousFocusBit, currentFocusBit, {
              duration: Math.max(220, Math.min(900, effectiveBitInterval * (animMode === 'bounce' ? 6 : 10))),
              intensity: animMode === 'bounce' ? 1.2 : 1,
            });
          }
          r.render();
          r.renderBitMotionTrails();
          if (animStyle === 'ripple' && focusBits.size > 0) {
            r.renderRipple(0.18, focusBits, { intensity: animMode === 'bounce' ? 1.25 : 1.05, showBeacon: true });
          } else if (animStyle === 'pulse' && focusBits.size > 0) {
            r.renderPulse(0.28, focusBits, { intensity: animMode === 'bounce' ? 1.35 : 1.15, showHalo: true });
          } else if (animStyle === 'fade' && partial.size > 0) {
            r.renderFade(animMode === 'bounce' ? 0.22 : 0.35);
          }
          if (animMode === 'bounce' && partial.size > 0) {
            r.renderFade(0.25);
          }
          r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
          revealCount += 1;
          previousFocusBit = currentFocusBit;
          const totalRevealSteps = animMode === 'bounce'
            ? Math.max(1, bits.length * 2 - 1)
            : Math.max(1, bits.length);
          const progressRatio = totalRevealSteps <= 1 ? 1 : Math.min(1, revealCount / (totalRevealSteps - 1));
          // Let the banner's Timeline slider follow the animation. Sequential
          // reveal walks 0 → len-1; bounce returns, so we clamp to the forward
          // projection onto [0..1]. For bounce we use idx position directly.
          if (stepScrubProgressRef.current) {
            const uiProgress = animMode === 'bounce'
              ? Math.min(1, Math.max(0, idx / Math.max(1, bits.length - 1)))
              : progressRatio;
            stepScrubProgressRef.current(Math.round(uiProgress * 100));
          }
          idx += direction;
          seqTimerRef.current = setTimeout(revealNext, getCurrentLoopInterval(effectiveBitInterval, timingOptions, progressRatio, currentFocusBit));
        };

        // Seed the pre-revealed bits so resume picks up visually from where the
        // pause left off instead of briefly flashing back to empty.
        const seededChangedBits = new Set();
        if (requestedStart > 0 && animMode !== 'bounce') {
          for (let i = 0; i < requestedStart; i++) seededChangedBits.add(bits[i]);
        }
        r.changedBits = seededChangedBits;
        r.animationFocusBits = new Set();
        r.clearBitMotionTrails();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        seqTimerRef.current = setTimeout(revealNext, getCurrentLoopInterval(effectiveBitInterval, timingOptions, 0, bits[Math.min(bits.length - 1, requestedStart)]));
      });

      r.animationFocusBits = new Set();
      await waitForDelay(delayMs);
      return;
    }

    if (animStyle === 'none') {
      r.changedBits = new Set(changedSet);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
      await waitForDelay(delayMs);
      return;
    }

    r.changedBits = new Set(changedSet);
    r.animationFocusBits = new Set(changedSet);
    await runEffect(animStyle, timingOptions.adaptivePlan ? Math.min(3200, timingOptions.adaptivePlan.totalDuration) : undefined);
    r.animationFocusBits = new Set();
    if (stepScrubProgressRef.current) stepScrubProgressRef.current(100);
    await waitForDelay(delayMs);
  }, [animMode, animStyle, maskAnimationEnabled, stopSeqAnim, runEffect, estimateAnimDuration, repeatAnim, getMinimapDetailH, getAnimationBitInterval, getAnimationTimingPlan, getCurrentLoopInterval, runMaskStampAnimation, fadeOutCurrentHighlights, waitForDelay, maxStepDurationEnabled, maxStepDurationMs, pinnedBitIndices, effectiveGroupBits, maskAnimInterval]);

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
      await triggerFn(merged, { adaptiveDuration: true });
      if (cancelled || playing || animationReplayPaused || selectedSteps.size === 0) return;
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

    if (playing || animationReplayPaused || selectedSteps.size > 0 || initialHighlightHoldRef.current) return;
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
      await triggerFn(changed, { adaptiveDuration: false, startIndex: useStartIndex, startProgress: useStartProgress });
      if (cancelled || playing || animationReplayPaused || selectedSteps.size > 0) return;
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
  }, [playing, selectedSteps, steps, currentStep, animationReplayPaused]);

  // Auto-render mode (for CLI video export via puppeteer)
  useEffect(() => {
    if (autoRender && steps.length > 0 && !exporting) {
      const timer = setTimeout(() => exportVideo(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoRender, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Replay current step when animation mode or style changes so the active animation stops immediately.
  useEffect(() => {
    if (initialHighlightHoldRef.current) return;
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

      if (performance.now() < animBusyUntilRef.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 16);
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
  }, [playing, playSpeed, steps.length, goToStep]);

  const handlePlayPause = useCallback(() => {
    if (!playing && currentStep >= Math.max(0, steps.length - 1)) {
      goToStep(0, { keepPlaying: true });
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [playing, currentStep, steps.length, goToStep]);

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
    if (stepAnimRunning) {
      freezeAnimationNow();
      setPlaying(false);
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

  // 3D mode toggle
  const toggle3D = useCallback(() => {
    const cam = camera3DRef.current;
    if (!cam) return;
    if (cam.enabled) {
      cam.disable();
      setMode3D(false);
      // Refresh canvas at normal size
      schedulePostLayoutRefresh(captureViewportAnchor(0.5, 0.5));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refitViewportToContent({ instant: true });
        });
      });
    } else {
      cam.enable();
      setCamera3DContainerStyle(cam.getContainerStyle());
      // Enter 3D with only a backward bend, not a sideways twist.
      cam.animateTo({ rotateX: 16, rotateY: 0, perspective: 1500 }, 520);
      setMode3D(true);
      // Refresh with enlarged canvas for 3D
      schedulePostLayoutRefresh(null);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refitViewportToContent({ instant: true });
        });
      });
    }
  }, [schedulePostLayoutRefresh, captureViewportAnchor, refitViewportToContent]);

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

  const ensureTiltCamera = useCallback(() => {
    const cam = camera3DRef.current;
    if (!cam) return null;
    if (!cam.enabled) {
      cam.enable();
      if (!mode3D) {
        cam.rotateX = Math.max(10, cam.rotateX || 14);
        cam.rotateY = cam.rotateY || 0;
        cam.perspective = 1500;
        setCamera3DContainerStyle(cam.getContainerStyle());
        setCamera3DTransform(cam.getCanvasTransform());
      }
    }
    return cam;
  }, [mode3D]);

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
        ensureTiltCamera();
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
          ensureTiltCamera();
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
        cam.rotate(e.clientX - startX, e.clientY - startY);
        startX = e.clientX;
        startY = e.clientY;
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        scheduleBalloonRelayout();
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
        r.panX = panSX + (e.clientX - startX);
        r.panY = panSY + (e.clientY - startY);
        r.render();
        updateMinimapAvailability();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        scheduleBalloonRelayout();
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
      const mx = coords.x;
      const my = coords.y;
      const oldZoom = r.zoom;

      // Normalize delta: trackpad (deltaMode 0) sends pixel values,
      // mouse wheel (deltaMode 1) sends line units.
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;       // line → pixels
      else if (e.deltaMode === 2) delta *= 100;  // page → pixels

      const absDelta = Math.min(Math.abs(delta), 150);
      const factor = 1 + absDelta * 0.0022;
      const contentX = (mx - r.panX) / Math.max(0.0001, oldZoom);
      const contentY = (my - r.panY) / Math.max(0.0001, oldZoom);
      const nextZoom = delta > 0
        ? Math.max(0.1, r.zoom / factor)
        : Math.min(64, r.zoom * factor);
      r.zoom = nextZoom;
      r.panX = mx - contentX * nextZoom;
      r.panY = my - contentY * nextZoom;
      setZoom(r.zoom);
      r.render();
      updateMinimapAvailability();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      scheduleBalloonRelayout();
    };

    const onMouseDown = (e) => {
      const cam = camera3DRef.current;
      if (!mode3D && !cam) return;
      const secondary = e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey));
      if (!secondary) return;
      ensureTiltCamera();
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
      cam.rotate(e.clientX - startX, e.clientY - startY);
      startX = e.clientX;
      startY = e.clientY;
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      updateMinimapAvailability();
      scheduleBalloonRelayout();
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
        setHoverInfo('');
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
  }, [computeBitInfo, flyToElement, getMinimapDetailH, updateMinimapAvailability, mode3D, ensureTiltCamera, scheduleBalloonRelayout]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const cam = camera3DRef.current;
      const is3D = cam && cam.enabled;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (is3D && e.shiftKey) { cam.orbit('left'); }
          else { goToStep(currentStep - 1); }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (is3D && e.shiftKey) { cam.orbit('right'); }
          else { goToStep(currentStep + 1); }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (is3D) { cam.orbit('up'); }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (is3D) { cam.orbit('down'); }
          break;
        case 'Home':       e.preventDefault(); goToStep(0); break;
        case 'End':        e.preventDefault(); goToStep(steps.length - 1); break;
        case ' ':          e.preventDefault(); handleStepAnimToggle(); break;
        case '+': case '=': e.preventDefault(); doZoom(1.5); break;
        case '-':          e.preventDefault(); doZoom(1 / 1.5); break;
        case '0':          e.preventDefault(); resetZoom(); break;
        case 't': case 'T': e.preventDefault(); setTheme(t => t === 'dark' ? 'light' : 'dark'); break;
        case 'd': case 'D': e.preventDefault(); toggleDetailPanel(); break;
        case '3':          e.preventDefault(); toggle3D(); break;
        case 'r': case 'R':
          // Reset 3D rotation to flat
          e.preventDefault();
          if (is3D) cam.resetFlat();
          break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [currentStep, goToStep, doZoom, resetZoom, steps.length, handleStepAnimToggle, toggle3D]);

  // Export PNG
  const exportPng = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const url = r.toDataURL();
    const a = document.createElement('a');
    a.href = url;
    a.download = `sieve_step_${currentStep}.png`;
    a.click();
  }, [currentStep]);

  // Export Video (WebM)
  const exportVideo = useCallback(async () => {
    const r = rendererRef.current;
    if (!r || steps.length === 0 || exporting) return;
    setExporting(true);
    setExportProgress(0);
    exportCancelRef.current = false;

    try {
      const stream = r.canvas.captureStream(0);
      const track = stream.getVideoTracks()[0];
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.start();

      const bs = new Uint8Array(header.bitCount);
      for (let i = 0; i < steps.length; i++) {
        if (exportCancelRef.current) break;
        const s = steps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const idx = s.changedBits[j];
          if (idx < bs.length) bs[idx] = 1;
        }
        const changed = new Set(s.changedBits);
        const targetBits = s.targetBits && s.targetBits.length > 0 ? s.targetBits : s.changedBits;
        const targetSet = new Set(targetBits);
        const targetHitCounts = new Map();
        if (s.targetHitCounts && s.targetHitCounts.length === targetBits.length) {
          for (let index = 0; index < targetBits.length; index++) targetHitCounts.set(targetBits[index], s.targetHitCounts[index]);
        } else {
          for (let index = 0; index < targetBits.length; index++) targetHitCounts.set(targetBits[index], 1);
        }
        r.currentOperation = s.operation;
        r.setState(bs, changed, targetSet, targetHitCounts, {
          focusStart: s.focusStart,
          focusStop: s.focusStop,
        }, {
          wordBits: s.maskWordBits,
          targetWords: s.maskWriteOrderWords,
          targetSlots: s.maskWriteOrderSlots,
          slotBits: s.maskSlotBits,
        }, {
          repeatedBits: new Set(Array.from(targetHitCounts.entries()).filter(([, count]) => count > 1).map(([bit]) => bit)),
        });
        r.render();
        if (track.requestFrame) track.requestFrame();
        await new Promise(resolve => setTimeout(resolve, 33));
        setExportProgress(Math.round(((i + 1) / steps.length) * 100));
      }

      recorder.stop();
      await new Promise(resolve => { recorder.onstop = resolve; });

      if (!exportCancelRef.current) {
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (autoRender) {
          // CLI mode: store on window for puppeteer to pick up
          window.__exportedVideo = blob;
          window.__renderComplete = true;
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sieve_trace.webm';
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('Video export failed:', err);
    }

    setExporting(false);
    setExportProgress(0);
    // Restore current step
    goToStep(currentStep);
  }, [steps, header.bitCount, currentStep, exporting, goToStep]);

  const cancelExport = useCallback(() => {
    exportCancelRef.current = true;
  }, []);

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
        line2: '',
        line3: '',
        title: 'No event selected',
      };
    }

    const functionName = s.operation || 'Unknown';
    const eventId = s.stepId ?? currentStep;
    const line1 = `Event ${eventId} | ${functionName}`;

    const line2Parts = [];
    if (s.prime != null) line2Parts.push(`Prime ${s.prime}`);
    if (s.factorStep != null) line2Parts.push(`Step size ${s.factorStep}`);
    if (s.start != null && s.stop != null) line2Parts.push(`Range ${s.start}-${s.stop}`);
    if (s.annotation) line2Parts.push(s.annotation);
    const line2 = line2Parts.join(' | ');

    // Line 3: the "+N bits" annotation sits right under the heading so it's close to the action.
    const line3 = s.numChanged > 0 ? `+${s.numChanged} bits changed` : '';

    return {
      line1,
      line2,
      line3,
      title: [line1, line2, line3].filter(Boolean).join(' | '),
    };
  }, [currentStep, currentStepData]);

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
    mode3D
      ? {
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) ${camera3DTransform}`,
          transformStyle: 'preserve-3d',
          transformOrigin: '50% 50%',
        }
      : {
          transform: camera3DTransform,
          transformStyle: 'preserve-3d',
          transformOrigin: '50% 50%',
        }
  ), [camera3DTransform, mode3D]);

  const playSpeedLabel = useMemo(() => `${(playSpeed / 1000).toFixed(1)}s/step`, [playSpeed]);
  const playbackSpeedValue = useMemo(() => {
    const interval = clampMs(parseInt(playSpeed || 0, 10) || 4000, 4000, 12000);
    const ratio = (12000 - interval) / (12000 - 4000);
    return Math.round(1 + ratio * 99);
  }, [playSpeed, clampMs]);
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
  const setPlaybackSpeedValue = useCallback((speedValue) => {
    const speed = clampMs(parseInt(speedValue || 0, 10) || 1, 1, 100);
    const ratio = (speed - 1) / 99;
    setPlaySpeed(Math.round(12000 - ratio * (12000 - 4000)));
  }, [clampMs]);
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

  const effectiveTitle = customTitle && customTitle.trim() ? customTitle.trim() : traceTitle;
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
    <>
      {/* Mode toggle: switch between mask-stamp animation and per-bit
          sequential reveal. Defaults to 'mask' on entering an event
          that has mask metadata; toggling to 'bit' walks the bits
          individually. */}
      {currentStepData && currentStepData.maskWriteOrderWords && currentStepData.maskWriteOrderWords.length > 0 && (
        <div className="step-focus-slider-row step-focus-mode-row" title="Choose how the timeline scrubs this event">
          <span className="step-focus-slider-label">Mode</span>
          <div className="step-focus-mode-toggle">
            <button
              type="button"
              className={`step-focus-mode-btn${bitAnimationMode === 'mask' ? ' active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                stopSeqAnim();
                setBitAnimationMode('mask');
                bitAnimationModeRef.current = 'mask';
                seekStepAnimation(stepScrubProgress / 100);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Animate only the apply-mask group stamps"
            >Mask</button>
            <button
              type="button"
              className={`step-focus-mode-btn${bitAnimationMode === 'bit' ? ' active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                stopSeqAnim();
                setBitAnimationMode('bit');
                bitAnimationModeRef.current = 'bit';
                seekStepAnimation(stepScrubProgress / 100);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Animate only the bits being set one by one"
            >Bits</button>
            <button
              type="button"
              className={`step-focus-mode-btn${bitAnimationMode === 'combined' ? ' active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                stopSeqAnim();
                setBitAnimationMode('combined');
                bitAnimationModeRef.current = 'combined';
                seekStepAnimation(stepScrubProgress / 100);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Animate both the mask stamps and the bits revealing in lockstep"
            >Both</button>
          </div>
          <span className="step-focus-slider-value step-focus-mode-value">{bitAnimationMode}</span>
        </div>
      )}
      <div className="step-focus-slider-row" title="Scrub through this event's animation">
        <span className="step-focus-slider-label">Timeline</span>
        <div className="step-focus-slider-controls">
          <button
            type="button"
            className="step-focus-play-btn"
            onClick={(e) => { e.stopPropagation(); handleStepAnimToggle(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title={stepAnimRunning ? 'Pause the timeline animation' : 'Play the timeline animation at the current Speed'}
            disabled={exporting || !currentStepData || ((!currentStepData.changedBits || currentStepData.changedBits.length === 0) && (bitAnimationMode !== 'mask' || !currentStepData.maskWriteOrderWords || currentStepData.maskWriteOrderWords.length === 0))}
          >
            {stepAnimRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={stepScrubProgress}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setStepScrubProgress(v);
              seekStepAnimation(v / 100);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={exporting || !currentStepData || ((!currentStepData.changedBits || currentStepData.changedBits.length === 0) && (bitAnimationMode !== 'mask' || !currentStepData.maskWriteOrderWords || currentStepData.maskWriteOrderWords.length === 0))}
          />
        </div>
        <span className="step-focus-slider-value">{stepScrubProgress}%</span>
      </div>
      <label className="step-focus-slider-row" title="Speed of the per-bit animation inside the current event (also drives the apply-mask group stamp animation)">
        <span className="step-focus-slider-label">Speed</span>
        {/* 0..100 mapped logarithmically to bitAnimInterval 500ms..5ms so
            the middle of the slider lands around 50 ms/bit instead of the
            top 10% being the only useful range. The same value also drives
            the apply-mask group stamp animation so all animations stay
            synchronized. */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={(() => {
            const iv = Math.max(5, Math.min(500, Number(bitAnimInterval) || 20));
            const ratio = Math.log(iv / 5) / Math.log(500 / 5);
            return Math.round((1 - ratio) * 100);
          })()}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            const iv = Math.round(5 * Math.pow(500 / 5, 1 - v / 100));
            setBitAnimInterval(iv);
            // Keep the apply-mask stamp animation in lock-step with the
            // per-bit animation so users perceive a single consistent speed.
            setMaskAnimInterval(iv);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={exporting}
        />
        <span className="step-focus-slider-value" title={`${bitAnimInterval}ms/bit`}>{bitAnimInterval}ms</span>
      </label>
    </>
  );

  return (
    <div className={`visualizer${isMacPlatform ? ' platform-mac' : ''}${isWindowsPlatform ? ' platform-windows' : ''}${isElectron ? ' platform-electron' : ' platform-browser'}`}>
      {/* Header bar */}
      <header className="toolbar">
        <div className="toolbar-left">
          <div className="trace-title-block">
            <button
              ref={traceInfoToggleRef}
              type="button"
              className={`trace-title trace-title-button${showTraceInfo ? ' active' : ''}`}
              title="Trace information"
              onClick={() => setShowTraceInfo((open) => !open)}
            >
              {effectiveTitle}
            </button>
          </div>
          <div className="trace-actions">
            {onClose && <button className="btn-icon" onClick={onClose} title="Close trace">✕</button>}
          </div>
          {showTraceInfo && (
            <div className="trace-info-popover" ref={traceInfoPopoverRef}>
              <div className="trace-info-section">
                <div className="trace-info-section-title">Storage model</div>
                <div className="trace-info-row">
                  <select
                    className="trace-info-storage-select"
                    value={storageModel || 'half'}
                    onChange={(e) => setStorageModel(e.target.value)}
                    title={`Detected from log: ${header.storageModel || 'half'}`}
                  >
                    {Object.entries(STORAGE_MODELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                {header.storageModel && header.storageModel !== storageModel && (
                  <div className="trace-info-row trace-info-row-hint">
                    Log reported <code>{header.storageModel}</code> — override active.
                  </div>
                )}
              </div>
              {traceInfoSections.map((section) => (
                <div key={section.title} className="trace-info-section">
                  <div className="trace-info-section-title">{section.title}</div>
                  {section.rows.map((row) => (
                    <div key={`${section.title}-${row.label}-${row.value}`} className="trace-info-row trace-info-row-kv">
                      <span className="trace-info-key">{row.label}</span>
                      <span className="trace-info-value">{row.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="toolbar-center">
          <button className="btn-icon" onClick={() => goToStep(0)} title="First (Home)" disabled={exporting}><SkipBack /></button>
          <button className="btn-icon" onClick={() => goToStep(currentStep - 1)} title="Previous (←)" disabled={exporting}><StepBack /></button>
          <button className="btn-icon anim-speed-btn" onClick={() => setBitAnimInterval(i => Math.min(5000, Math.round(i * 1.4)))} title="Slower animation" disabled={exporting}><Minus size={14} /></button>
          <button
            className="btn-icon"
            onClick={handleStepAnimToggle}
            title={stepAnimRunning ? 'Pause animation (Space)' : 'Play animation (Space)'}
            disabled={exporting || !currentStepData || !currentStepData.changedBits || currentStepData.changedBits.length === 0}
          >
            {stepAnimRunning ? <Pause /> : <Play />}
          </button>
          <button className="btn-icon anim-speed-btn" onClick={() => setBitAnimInterval(i => Math.max(5, Math.round(i / 1.4)))} title="Faster animation" disabled={exporting}><Plus size={14} /></button>
          <button className="btn-icon" onClick={() => goToStep(currentStep + 1)} title="Next (→)" disabled={exporting}><StepForward /></button>
          <button className="btn-icon" onClick={() => goToStep(steps.length - 1)} title="Last (End)" disabled={exporting}><SkipForward /></button>
          <input
            type="range"
            className="step-slider"
            min={0}
            max={Math.max(0, steps.length - 1)}
            value={currentStep}
            onChange={(e) => goToStep(parseInt(e.target.value))}
            disabled={exporting}
          />
          <span className="step-counter">{currentStep} / {steps.length - 1}</span>
        </div>
        <div className="toolbar-right">
          {!isWindowsPlatform && (
            <>
              <div className={`search-box${searchOpen ? ' expanded' : ''}`}>
                <button className="btn-icon" onClick={() => setSearchOpen(o => !o)} title="Search (bit/byte/number)"><Search /></button>
                {searchOpen && (
                  <div className="search-popover">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="bit 42 / byte 5 / number 97"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); if (e.key === 'Escape') setSearchOpen(false); }}
                      autoFocus
                      title="Search: bit N, byte N, uint64 N, vector N, number N"
                    />
                    {searchResult && <div className="search-result">{searchResult}</div>}
                  </div>
                )}
              </div>
              <button className="btn-icon" onClick={() => doZoom(1.5)} title="Zoom In (+)"><ZoomIn /></button>
              <button className="btn-text" onClick={resetZoom} title="Reset Zoom (0)">{zoom.toFixed(1)}x</button>
              <button className="btn-icon" onClick={() => doZoom(1 / 1.5)} title="Zoom Out (−)"><ZoomOut /></button>
              <button className={`btn-icon${mode3D ? ' active' : ''}`} onClick={toggle3D} title="Toggle 3D view (3)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 11L8 14L14 11" />
                  <path d="M2 8L8 11L14 8" />
                  <path d="M2 5L8 2L14 5L8 8Z" />
                </svg>
              </button>
              <button className={`btn-icon${heatMapEnabled ? ' active' : ''}`} onClick={() => setHeatMapEnabled(h => !h)} title="Toggle heat map overlay"><Thermometer /></button>
              <button className={`btn-icon${timingPanelOpen ? ' active' : ''}`} onClick={() => setTimingPanelOpen(o => !o)} title="Function timings">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="9" r="5.5" />
                  <path d="M8 6v3.5l2 1.5" strokeLinecap="round" />
                  <path d="M6 1.5h4" strokeLinecap="round" />
                  <path d="M8 1.5v2" strokeLinecap="round" />
                </svg>
              </button>
              <button className={`btn-icon${loweredSetBits ? ' active' : ''}`} onClick={() => setLoweredSetBits((value) => !value)} title="Toggle lowered-set-bits sieve mode">
                ▽
              </button>
              <button className="btn-icon" onClick={exportPng} title="Export PNG"><Camera /></button>
              {!exporting ? (
                <button className="btn-icon" onClick={exportVideo} title="Export Video (WebM)"><Film /></button>
              ) : (
                <button className="btn-export-cancel" onClick={cancelExport} title="Cancel export">
                  {exportProgress}%
                </button>
              )}
              <button className="btn-icon" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme (T)">
                {theme === 'dark' ? <Sun /> : <Moon />}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Export progress bar */}
      {exporting && (
        <div className="export-progress">
          <div className="export-progress-bar" style={{ width: `${exportProgress}%` }} />
        </div>
      )}

      {/* Main content */}
      <div className={`main-content${mode3D ? ' mode-3d' : ''}`}>
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
          externalOpFilter={timingFocusOp}
          onExternalOpFilterConsumed={() => setTimingFocusOp('')}
        />

        <div className={`canvas-area${mode3D ? ' mode-3d' : ''}`}>
          {eventTitleSettings.visible && (
            <div
              className="step-focus-banner position-center"
              title={currentStepBanner.title}
              style={eventTitleStyle}
              onMouseDown={(e) => {
                if (e.target.closest('input') || e.target.closest('button')) return;
                const startX = e.clientX;
                const startY = e.clientY;
                const startOffX = eventTitleSettings.dragOffsetX || 0;
                const startOffY = eventTitleSettings.dragOffsetY || 0;
                let dragged = false;
                const onMove = (ev) => {
                  const dx = ev.clientX - startX;
                  const dy = ev.clientY - startY;
                  if (!dragged && Math.hypot(dx, dy) < 4) return;
                  dragged = true;
                  setEventTitleSettings((prev) => ({
                    ...prev,
                    dragOffsetX: startOffX + dx,
                    dragOffsetY: startOffY + dy,
                  }));
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                  if (!dragged) {
                    // Click without drag: open the Events panel.
                    if (stepsPanelCollapsed) setStepsPanelCollapsed(false);
                  }
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                e.preventDefault();
              }}
            >
              <button
                className="step-focus-close-btn"
                onClick={(e) => { e.stopPropagation(); setEventTitleSettings((prev) => ({ ...prev, visible: false })); }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Hide event title — use the ▲ in the details panel to show it again"
              >▼</button>
              <div className="step-focus-lines">
                <div className="step-focus-line1">{currentStepBanner.line1}</div>
                {currentStepBanner.line2 && <div className="step-focus-line2">{currentStepBanner.line2}</div>}
                {currentStepBanner.line3 && <div className="step-focus-line3">{currentStepBanner.line3}</div>}
              </div>
              <div className="step-focus-sliders">
                {stepAnimSlidersContent}
              </div>
            </div>
          )}
          <div className={`canvas-container${mode3D ? ' mode-3d' : ''}`} ref={containerRef} style={camera3DContainerStyle}>
            <canvas
              ref={settledCanvasRef}
              className={`settled-render-canvas${loweredSetBits ? ' active' : ''}`}
              style={renderCanvasStyle}
              aria-hidden="true"
            />
            <canvas
              ref={canvasRef}
              className="main-render-canvas"
              style={renderCanvasStyle}
            />
            <canvas ref={minimapCanvasRef} className="minimap-overlay-canvas" aria-hidden="true" />
          </div>
          {/* Bit history panels: hover plus one or more click-locked balloons */}
          {(() => {
            const hoverBalloonVisible = !!hoveredBitInfo && !pinnedBitIndices.includes(hoveredBitInfo.bitIndex);
            const visibleBalloonStyles = getVisibleBalloonStyles([
              ...pinnedBitIndices.map((bitIndex) => ({ kind: 'pinned', bitIndex })),
              ...(hoverBalloonVisible ? [{ kind: 'hover', bitIndex: hoveredBitInfo.bitIndex }] : []),
            ]);

            return (
              <>
                {pinnedBitIndices.map((bitIdx) => {
            const info = computeBitInfo(bitIdx);
            if (!info) return null;
            const bi = info.bitIndex;
            const byteIdx = Math.floor(bi / 8);
            const bitInByte = bi % 8;
            const u32Idx = Math.floor(bi / 32);
            const bitInU32 = bi % 32;
            const u64Idx = Math.floor(bi / 64);
            const bitInU64 = bi % 64;
            const clIdx = Math.floor(bi / (cachelineSize * 8));
            const pinnedEntry = visibleBalloonStyles[`pinned-${bi}`];
            const pinnedVisible = pinnedEntry ? pinnedEntry.visible !== false : true;
            return (
              <div
                key={`locked-bit-${bi}`}
                className={`bit-history-panel locked hover-balloon${pinnedVisible ? '' : ' clipped'}`}
                style={pinnedEntry?.panelStyle}
              >
                <div className="bit-history-header">
                  <span>📌 Bit {bi} → #{info.number}</span>
                  <button className="bit-history-close" onClick={() => setPinnedBitIndices((prev) => prev.filter((value) => value !== bi))}>✕</button>
                </div>
                <div className="bit-history-indices">
                  <table className="bit-index-table">
                    <tbody>
                      <tr><td>Bit</td><td>{bi}</td></tr>
                      <tr><td>Number</td><td>{info.number}</td></tr>
                      <tr><td>uint8 (byte)</td><td>byte #{byteIdx}, bit {bitInByte}</td></tr>
                      <tr><td>uint32</td><td>word #{u32Idx}, bit {bitInU32}</td></tr>
                      <tr><td>uint64</td><td>qword #{u64Idx}, bit {bitInU64}</td></tr>
                      <tr><td>Cache line</td><td>#{clIdx} ({cachelineSize}B)</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="bit-history-body">
                  {info.history.length === 0 ? (
                    <p className="bit-history-empty">No events have modified this bit.</p>
                  ) : (
                    <table className="bit-history-table">
                      <thead>
                        <tr><th>Event</th><th>Operation</th><th>Prime</th></tr>
                      </thead>
                      <tbody>
                        {info.history.map((h) => (
                          <tr key={`locked-${bi}-${h.stepIndex}`} className={h.stepIndex === currentStep ? 'bh-current' : ''}
                            onClick={() => { handleStepSelection(h.stepIndex); }}>
                            <td>{h.stepIndex}</td>
                            <td>{h.operation || '—'}</td>
                            <td>{h.prime != null ? h.prime : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
                })}

                {hoverBalloonVisible && (() => {
                  const info = hoveredBitInfo;
                  const bi = info.bitIndex;
                  const byteIdx = Math.floor(bi / 8);
                  const bitInByte = bi % 8;
                  const u32Idx = Math.floor(bi / 32);
                  const bitInU32 = bi % 32;
                  const u64Idx = Math.floor(bi / 64);
                  const bitInU64 = bi % 64;
                  const clIdx = Math.floor(bi / (cachelineSize * 8));
                  const hoverEntry = visibleBalloonStyles[`hover-${bi}`];
                  const hoverVisible = hoverEntry ? hoverEntry.visible !== false : true;
                  return (
                    <div className={`bit-history-panel hover-balloon${hoverVisible ? '' : ' clipped'}`} style={hoverEntry?.panelStyle}>
                <div className="bit-history-header">
                  <span>Bit {bi} → #{info.number}</span>
                </div>
                <div className="bit-history-indices">
                  <table className="bit-index-table">
                    <tbody>
                      <tr><td>Bit</td><td>{bi}</td></tr>
                      <tr><td>Number</td><td>{info.number}</td></tr>
                      <tr><td>uint8 (byte)</td><td>byte #{byteIdx}, bit {bitInByte}</td></tr>
                      <tr><td>uint32</td><td>word #{u32Idx}, bit {bitInU32}</td></tr>
                      <tr><td>uint64</td><td>qword #{u64Idx}, bit {bitInU64}</td></tr>
                      <tr><td>Cache line</td><td>#{clIdx} ({cachelineSize}B)</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="bit-history-body">
                  {info.history.length === 0 ? (
                    <p className="bit-history-empty">No events have modified this bit.</p>
                  ) : (
                    <table className="bit-history-table">
                      <thead>
                        <tr><th>Event</th><th>Operation</th><th>Prime</th></tr>
                      </thead>
                      <tbody>
                        {info.history.map((h) => (
                          <tr key={`hover-${bi}-${h.stepIndex}`} className={h.stepIndex === currentStep ? 'bh-current' : ''}
                            onClick={() => { handleStepSelection(h.stepIndex); }}>
                            <td>{h.stepIndex}</td>
                            <td>{h.operation || '—'}</td>
                            <td>{h.prime != null ? h.prime : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="bit-history-hint">Click to lock. Double-click to keep only this balloon.</div>
              </div>
                  );
                })()}
              </>
            );
          })()}

          {/* Detail panel at the bottom of the canvas area */}
          <DetailPanel
            step={currentStepData}
            stepIndex={currentStep}
            open={detailOpen}
            onToggle={toggleDetailPanel}
            height={detailHeight}
            onHeightChange={updateDetailHeight}
            width={detailWidth}
            onWidthChange={setDetailWidth}
            playing={playing}
            stepStats={selectedSteps.size > 1 ? null : stepStats}
            storageModel={storageModel}
            bitLayout={layoutSettings.bitLayout}
            byteLayout={layoutSettings.byteLayout}
            benchmarkTimingData={benchmarkTimingData}
            onInspectChangedBits={() => openDetailInspector('bits')}
            onInspectMarkedNumbers={() => openDetailInspector('numbers')}
            eventTitleVisible={eventTitleSettings.visible}
            onShowEventTitle={() => setEventTitleSettings((prev) => ({ ...prev, visible: true }))}
            eventAnimSliders={stepAnimSlidersContent}
          />

          {detailInspectorOpen && (
            <div className="detail-inspector-overlay" role="dialog" aria-modal="true">
              <div className="detail-inspector-panel">
                <div className="detail-inspector-header">
                  <div className="detail-inspector-title">{detailInspectorMode === 'numbers' ? 'Marked Numbers' : 'Changed Bits'}</div>
                  <button className="btn-icon" onClick={() => setDetailInspectorOpen(false)} title="Close inspector">✕</button>
                </div>
                <div className="detail-inspector-controls">
                  <input
                    type="text"
                    value={detailInspectorQuery}
                    onChange={(e) => setDetailInspectorQuery(e.target.value)}
                    placeholder="Search bit, number, byte, uint64, group, cacheline"
                    className="detail-inspector-search"
                  />
                  <span className="detail-inspector-count">{filteredDetailInspectorRows.length} / {detailInspectorRows.length}</span>
                </div>
                <div className="detail-inspector-table-wrap">
                  <table className="detail-inspector-table">
                    <thead>
                      <tr>
                        <th>Bit</th>
                        <th>Number</th>
                        <th>Byte</th>
                        <th>uint64</th>
                        <th>Group</th>
                        <th>Cacheline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDetailInspectorRows.map((row) => (
                        <tr key={`di-${row.bit}`}>
                          <td>{row.bit}</td>
                          <td>{row.number}</td>
                          <td>{row.byte}</td>
                          <td>{row.uint64}</td>
                          <td>{row.group}</td>
                          <td>{row.cacheline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {timingPanelOpen && (
            <TimingPanel
              steps={steps}
              benchmarkTimingData={benchmarkTimingData}
              benchmarkTimingFileName={benchmarkTimingFileName}
              onClose={() => setTimingPanelOpen(false)}
              onFocusFn={(fnName) => setTimingFocusOp(fnName || '')}
              onImportBenchmarkTiming={onImportBenchmarkTiming}
            />
          )}
        </div>

        <SettingsPanel
          settings={layoutSettings}
          onChange={setLayoutSettings}
          collapsed={settingsCollapsed}
          onToggleCollapse={toggleSettingsPanel}
          playSpeed={playSpeed}
          onPlaySpeedChange={setPlaySpeed}
          repeatAnim={repeatAnim}
          onRepeatAnimChange={setRepeatAnim}
          animMode={animMode}
          onAnimModeChange={setAnimMode}
          animStyle={animStyle}
          onAnimStyleChange={setAnimStyle}
          maskAnimationEnabled={maskAnimationEnabled}
          onMaskAnimationEnabledChange={setMaskAnimationEnabled}
          animationReplayPaused={animationReplayPaused}
          onAnimationReplayPausedChange={setAnimationReplayPaused}
          bitAnimInterval={bitAnimInterval}
          onBitAnimIntervalChange={setBitAnimInterval}
          maxStepDurationEnabled={maxStepDurationEnabled}
          onMaxStepDurationEnabledChange={setMaxStepDurationEnabled}
          maxStepDurationMs={maxStepDurationMs}
          onMaxStepDurationMsChange={setMaxStepDurationMs}
          gridOpacity={gridOpacity}
          onGridOpacityChange={setGridOpacity}
          colorPreset={colorPreset}
          onColorPresetChange={setColorPreset}
          customColors={customColors}
          onCustomColorsChange={setCustomColors}
          storageModel={storageModel}
          onStorageModelChange={setStorageModel}
          cachelineSize={cachelineSize}
          onCachelineSizeChange={setCachelineSize}
          cachePreset={cachePreset}
          onCachePresetChange={setCachePreset}
          heatMapEnabled={heatMapEnabled}
          onHeatMapToggle={setHeatMapEnabled}
          showMinimap={showMinimap}
          onShowMinimapChange={setShowMinimap}
          minimapControlVisible={true}
          depthModeEnabled={loweredSetBits}
          depthSettings={depthSettings}
          onDepthSettingsChange={setDepthSettings}
          loweredSetBits={loweredSetBits}
          onLoweredSetBitsToggle={() => setLoweredSetBits((v) => !v)}
          eventTitleSettings={eventTitleSettings}
          onEventTitleSettingsChange={setEventTitleSettings}
          outlineSettings={layoutSettings.outlines}
          onOutlineChange={(outlines) => setLayoutSettings((prev) => ({ ...prev, outlines }))}
          isWindowsPlatform={isWindowsPlatform}
          showAnimationControls={true}
          customTitle={customTitle}
          onCustomTitleChange={setCustomTitle}
          mode3D={mode3D}
          onToggle3D={toggle3D}
        />
      </div>
    </div>
  );
}

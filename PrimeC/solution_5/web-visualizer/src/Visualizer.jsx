import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SieveRenderer, bitToNumber, numberToBit, STORAGE_MODELS, CACHE_PRESETS } from './SieveRenderer';
import { Camera3D } from './Camera3D';
import StepPanel from './StepPanel';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Search, Minus, Plus, Thermometer
} from './Icons';

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

export default function Visualizer({ trace, fileName, onClose, autoRender }) {
  const { header, steps } = trace;

  const canvasRef = useRef(null);
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

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [hoverInfo, setHoverInfo] = useState('');
  const [panelWidth, setPanelWidth] = useState(320);
  const [theme, setTheme] = useState('dark');
  const [settingsCollapsed, setSettingsCollapsed] = useState(true);
  const [layoutSettings, setLayoutSettings] = useState(DEFAULT_SETTINGS);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [repeatAnim, setRepeatAnim] = useState(500);
  const [animMode, setAnimMode] = useState('sequential'); // 'all' or 'sequential'
  const [animStyle, setAnimStyle] = useState('ripple'); // 'ripple', 'fade', 'pulse', 'none'
  const [bitAnimInterval, setBitAnimInterval] = useState(20); // ms between sequential bits (0.02s default)
  const [detailHeight, setDetailHeight] = useState(280);
  const [detailWidth, setDetailWidth] = useState(0);
  const [showMinimap, setShowMinimap] = useState(true);
  const [minimapAvailable, setMinimapAvailable] = useState(true);
  const [stepStats, setStepStats] = useState(null); // { totalSet, newlySet, reSet }
  const [bitHistoryModal, setBitHistoryModal] = useState(null); // { bitIndex, history[] } — locked by click
  const [hoveredBitInfo, setHoveredBitInfo] = useState(null);  // { bitIndex, history[] } — updated on hover
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

  // 3D camera state
  const [mode3D, setMode3D] = useState(false);
  const [camera3DTransform, setCamera3DTransform] = useState('none');
  const [camera3DContainerStyle, setCamera3DContainerStyle] = useState({});
  const currentAnimIntervalRef = useRef(20);
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

  // Keep refs in sync for use in callbacks
  const getMinimapDetailH = useCallback(() => {
    return detailOpenRef.current ? 20 : 10;
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
    const available = showMinimap !== false;
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

  const captureViewportAnchor = useCallback((xRatio = 0.5, yRatio = 0.5) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const clientX = rect.left + rect.width * xRatio;
    const clientY = rect.top + rect.height * yRatio;
    const canvasCssHeight = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
    const planeOffsetX = Math.max(0, (r.canvasWidth - rect.width) / 2);
    const planeOffsetY = Math.max(0, (canvasCssHeight - rect.height) / 2);
    const localX = clientX - rect.left + planeOffsetX;
    const localY = clientY - rect.top + planeOffsetY;
    const zoom = Math.max(0.0001, r.zoom || 1);
    const bitIdx = r.canvasToBitIndex(localX, localY);
    return {
      bitIdx,
      clientX,
      clientY,
      contentX: (localX - r.panX) / zoom,
      contentY: (localY - r.panY) / zoom,
    };
  }, []);

  const refreshCanvasLayout = useCallback((anchor = null) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // In 3D mode, enlarge the canvas to compensate for perspective foreshortening
    // so the tilted plane fills (or exceeds) the viewport.
    const cam = camera3DRef.current;
    let canvasW = rect.width;
    let canvasH = rect.height;
    if (cam && cam.enabled) {
      const ax = Math.abs(cam.rotateX) * Math.PI / 180;
      const ay = Math.abs(cam.rotateY) * Math.PI / 180;
      const scaleH = 1 / Math.max(0.3, Math.cos(ax));
      const scaleW = 1 / Math.max(0.3, Math.cos(ay));
      const diagonalOverscan = 1 + Math.hypot(Math.sin(ax), Math.sin(ay)) * 0.55;
      const dragOverscan = 3.1;
      canvasW = Math.max(rect.width * 3.2, rect.width * scaleW * diagonalOverscan * dragOverscan);
      canvasH = Math.max(rect.height * 3.2, rect.height * scaleH * diagonalOverscan * dragOverscan);
    }

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
    if (showMinimap) r.renderMinimap(rect.width, rect.height, getMinimapDetailH());
    updateMinimapAvailability();
  }, [showMinimap, getMinimapDetailH, updateMinimapAvailability]);

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

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Init renderer
  useEffect(() => {
    const r = new SieveRenderer();
    rendererRef.current = r;
    if (canvasRef.current) {
      r.attach(canvasRef.current);
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
    r.minimapEnabled = showMinimap !== false;
    r.colorPreset = colorPreset;
    r.storageModel = storageModel;
    r.cachelineSize = cachelineSize;
    r.heatMapEnabled = heatMapEnabled;
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
    if (showMinimap) r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    updateMinimapAvailability();
  }, [theme, layoutSettings, showMinimap, colorPreset, customColors, storageModel, cachelineSize, heatMapEnabled, updateMinimapAvailability]);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      refreshCanvasLayout(null);
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
  }, [panelWidth, showMinimap, stepsPanelCollapsed, settingsCollapsed, detailOpen, detailHeight, mode3D, refreshCanvasLayout, clearScheduledLayoutRefresh]);

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

    // Build state up to step before target (for stats)
    if (target <= currentStep) {
      bs.fill(0);
      for (let i = 0; i < target; i++) {
        const s = steps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const idx = s.changedBits[j];
          if (idx < bs.length) bs[idx] = 1;
        }
      }
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
    for (let j = 0; j < step.changedBits.length; j++) {
      const idx = step.changedBits[j];
      if (idx < bs.length && bs[idx]) reSet++;
      else newlySet++;
    }

    // Apply target step
    for (let j = 0; j < step.changedBits.length; j++) {
      const idx = step.changedBits[j];
      if (idx < bs.length) bs[idx] = 1;
    }

    let totalSet = 0;
    for (let i = 0; i < bs.length; i++) { if (bs[i]) totalSet++; }
    setStepStats({ totalSet, newlySet, reSet });

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
      slotBits: step.maskSlotBits,
    });

    // Update heat map
    if (r.heatMapEnabled) {
      r.rebuildHeatMap(steps, target);
    }

    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.resize(rect.width, rect.height);
      // Zoom to fit on first render
      if (!initialFitDoneRef.current) {
        r.zoomToFit(rect.width, rect.height, { alignTop: header.bitCount > 16384 });
        setZoom(r.zoom);
        r.freezeLayout();
        initialFitDoneRef.current = true;
      }
    }
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    updateMinimapAvailability();
    setCurrentStep(target);

    // Trigger animation for changed bits
    if (!suppressHighlight && triggerAnimationRef.current) {
      triggerAnimationRef.current(changedSet, { adaptiveDuration: !playing, fadeOutBits: previousHighlights });
    }
  }, [currentStep, steps, updateMinimapAvailability, playing, stopPlayback]);

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
  }, [cancelViewportAnimation]);

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
  const runEffect = useCallback((style) => {
    const r = rendererRef.current;
    if (!r || !r.changedBits || r.changedBits.size === 0) return Promise.resolve();
    if (rippleRef.current) cancelAnimationFrame(rippleRef.current);
    if (style === 'none') return Promise.resolve();

    const duration = 600;
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

  const getAnimationBitInterval = useCallback((bitCount, options = {}) => {
    if (!options.adaptiveDuration) {
      return Math.max(0, currentAnimIntervalRef.current || bitAnimInterval || 20);
    }
    return clampMs(Math.round(2800 / Math.max(1, bitCount)), 5, 1200);
  }, [bitAnimInterval, clampMs]);

  const getCurrentLoopInterval = useCallback((fallback, options = {}) => {
    if (options.adaptiveDuration) return fallback;
    return Math.max(0, currentAnimIntervalRef.current || fallback || 20);
  }, []);

  useEffect(() => {
    currentAnimIntervalRef.current = Math.max(0, bitAnimInterval || 20);
  }, [bitAnimInterval]);

  const getFadeOutDuration = useCallback((bitCount, options = {}) => {
    if (options.skipFadeOut) return 0;
    return clampMs(Math.round(Math.min(320, Math.max(120, Math.max(1, bitCount) * 4))), 80, 420);
  }, [clampMs]);

  const estimateAnimDuration = useCallback((bitCount, options = {}) => {
    const effectiveBitInterval = getAnimationBitInterval(bitCount, options);
    const currentHighlighted = rendererRef.current?.changedBits?.size || 0;
    const fadeOutMs = currentHighlighted > 0 ? getFadeOutDuration(currentHighlighted, options) : 0;

    if (bitCount <= 0 || animStyle === 'none') {
      return fadeOutMs;
    }

    if (animMode === 'all' || effectiveBitInterval <= 0) {
      return fadeOutMs + 620;
    }

    let revealMs = bitCount * Math.max(10, effectiveBitInterval);
    if (animMode === 'bounce') {
      revealMs *= 2;
    }

    return fadeOutMs + revealMs;
  }, [animMode, animStyle, getAnimationBitInterval, getFadeOutDuration]);

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

  const runMaskStampAnimation = useCallback((bitIntervalMs = null) => {
    const r = rendererRef.current;
    const maskWriteCount = r?.maskWriteOrderWords?.length || 0;
    const animationBits = r?.changedBits?.size ? r.changedBits : (r?.targetBits?.size ? r.targetBits : null);
    if (!r || (maskWriteCount === 0 && (!animationBits || animationBits.size === 0))) return Promise.resolve();

    const bits = animationBits ? Array.from(animationBits) : [];
    const groupBits = r.customGroupingBits > 0 ? r.customGroupingBits : Math.max(1, r.vectorGroup * 64);
    const groupCount = new Set(bits.map((b) => Math.floor(b / groupBits))).size;
    const orderedWrites = maskWriteCount;
    const perStopDuration = Math.max(140, Math.min(360, Math.round((bitIntervalMs || currentAnimIntervalRef.current || 20) * 3.4)));
    const duration = orderedWrites > 0
      ? Math.max(420, Math.min(3400, orderedWrites * perStopDuration))
      : Math.max(520, Math.min(2200, 280 + groupCount * 130));
    const startedAt = performance.now();

    if (rippleRef.current) {
      cancelAnimationFrame(rippleRef.current);
      rippleRef.current = null;
    }

    return new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - startedAt) / duration);
        r.render();
        if (orderedWrites > 0) r.renderMaskHover(t);
        else r.renderMaskStamp(t);
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        if (t < 1) {
          rippleRef.current = requestAnimationFrame(tick);
          return;
        }
        rippleRef.current = null;
        resolve();
      };

      rippleRef.current = requestAnimationFrame(tick);
    });
  }, [getMinimapDetailH]);

  // Main animation trigger — fade old highlights, animate current step, then wait using animation delay.
  const triggerAnimation = useCallback(async (changedSet, options = {}) => {
    if (!options.keepProgress) {
      stopSeqAnim();
    }
    const r = rendererRef.current;
    const hasMaskAnimation = !!(r && r.maskWriteOrderWords && r.maskWriteOrderWords.length > 0 && Number.isFinite(r.maskWordBits) && r.maskWordBits > 0);
    if (!r || !changedSet || (!hasMaskAnimation && changedSet.size === 0) || changedSet.size >= 100000) return;

    const animatedBitCount = changedSet.size > 0 ? changedSet.size : Math.max(1, r.targetBits?.size || r.maskWriteOrderWords?.length || 1);
    const effectiveBitInterval = getAnimationBitInterval(animatedBitCount, options);
    const est = estimateAnimDuration(animatedBitCount, options);
    animBusyUntilRef.current = performance.now() + est + Math.max(0, repeatAnim || 0);

    if (!options.keepProgress) {
      await fadeOutCurrentHighlights(options);
    }

    if (hasMaskAnimation) {
      if (!r.changedBits || r.changedBits.size === 0) {
        r.changedBits = new Set(changedSet.size > 0 ? changedSet : (r.targetBits || []));
      }
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      await runMaskStampAnimation(effectiveBitInterval);
      await waitForDelay(Math.max(0, repeatAnim || 0));
      return;
    }

    if ((animMode === 'sequential' || animMode === 'bounce') && effectiveBitInterval > 0) {
      const bits = Array.from(changedSet).sort((a, b) => a - b);
      const fullChanged = new Set(changedSet);
      let idx = 0;
      let direction = 1;
      let bounced = false;
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
          r.changedBits = partial;
          r.animationFocusBits = focusBits;
          r.render();
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
          idx += direction;
          seqTimerRef.current = setTimeout(revealNext, getCurrentLoopInterval(effectiveBitInterval, options));
        };

        r.changedBits = new Set();
        r.animationFocusBits = new Set();
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        seqTimerRef.current = setTimeout(revealNext, getCurrentLoopInterval(effectiveBitInterval, options));
      });

      r.animationFocusBits = new Set();
      await waitForDelay(Math.max(0, repeatAnim || 0));
      return;
    }

    if (animStyle === 'none') {
      r.changedBits = new Set(changedSet);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      await waitForDelay(Math.max(0, repeatAnim || 0));
      return;
    }

    r.changedBits = new Set(changedSet);
    r.animationFocusBits = new Set(changedSet);
    await runEffect(animStyle);
    r.animationFocusBits = new Set();
    await waitForDelay(Math.max(0, repeatAnim || 0));
  }, [animMode, animStyle, stopSeqAnim, runEffect, estimateAnimDuration, repeatAnim, getMinimapDetailH, getAnimationBitInterval, getCurrentLoopInterval, runMaskStampAnimation, fadeOutCurrentHighlights, waitForDelay]);

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
    let maskWordBits = null;
    let maskSlotBits = [];

    const appendFallbackWords = (bits, wordBits) => {
      if (!wordBits || !bits || bits.length === 0) return;
      const seen = new Set();
      const sortedBits = Array.from(bits).sort((a, b) => a - b);
      for (let i = 0; i < sortedBits.length; i++) {
        const wordIndex = Math.floor(sortedBits[i] / wordBits);
        if (seen.has(wordIndex)) continue;
        seen.add(wordIndex);
        orderedWords.push(wordIndex);
        orderedSlots.push(0);
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
        }
      } else if (maskWordBits != null) {
        appendFallbackWords(targetBits, maskWordBits);
      }
    }

    return {
      changedBits: mergedBits,
      targetBits: mergedBits,
      targetHitCounts,
      annotation: indices.length > 1 ? `Selected ${indices.length} events` : (steps[indices[0]]?.annotation || ''),
      maskMetadata: maskWordBits != null ? {
        wordBits: maskWordBits,
        targetWords: Uint32Array.from(orderedWords),
        targetSlots: Uint8Array.from(orderedSlots),
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
    r.currentOperation = 'aggregate-selection';
    r.currentAnnotation = overlay.annotation || '';
    r.setState(r.bitState, overlay.changedBits, overlay.targetBits, overlay.targetHitCounts, {
      focusStart: null,
      focusStop: null,
    }, overlay.maskMetadata);
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
    if (playing || selectedSteps.size === 0) return;

    const merged = new Set();
    for (const idx of selectedSteps) {
      const s = steps[idx];
      if (!s) continue;
      for (let j = 0; j < s.changedBits.length; j++) merged.add(s.changedBits[j]);
    }
    if (merged.size === 0) return;

    const loop = () => {
      triggerAnimation(merged, { adaptiveDuration: true });
      const waitMs = Math.max(0, repeatAnim || 0) + estimateAnimDuration(merged.size, { adaptiveDuration: true });
      selectedAnimLoopRef.current = setTimeout(loop, waitMs);
    };

    // Initial replay starts after configured delay to keep cadence predictable.
    selectedAnimLoopRef.current = setTimeout(loop, Math.max(0, repeatAnim || 0));

    return () => {
      if (selectedAnimLoopRef.current) {
        clearTimeout(selectedAnimLoopRef.current);
        selectedAnimLoopRef.current = null;
      }
    };
  }, [selectedSteps, steps, playing, repeatAnim, animStyle, triggerAnimation, estimateAnimDuration]);

  // When paused on a single step, keep replaying that step's animation.
  useEffect(() => {
    if (pausedStepAnimLoopRef.current) {
      clearTimeout(pausedStepAnimLoopRef.current);
      pausedStepAnimLoopRef.current = null;
    }

    if (playing || selectedSteps.size > 0 || initialHighlightHoldRef.current) return;
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;

    const changed = new Set(step.changedBits);
    const intervalMs = Math.max(40, repeatAnim || 0);

    const loop = () => {
      triggerAnimation(changed, { adaptiveDuration: false });
      pausedStepAnimLoopRef.current = setTimeout(loop, intervalMs);
    };

    pausedStepAnimLoopRef.current = setTimeout(loop, intervalMs);

    return () => {
      if (pausedStepAnimLoopRef.current) {
        clearTimeout(pausedStepAnimLoopRef.current);
        pausedStepAnimLoopRef.current = null;
      }
    };
  }, [playing, selectedSteps, steps, currentStep, repeatAnim, triggerAnimation]);

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

      const waitMs = Math.max(120, playSpeed);
      playTimeoutRef.current = setTimeout(scheduleNext, waitMs);
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
      r.zoomToFit(rect.width, rect.height, { alignTop: header.bitCount > 16384 });
      r.freezeLayout();
    } else {
      r.zoom = 1; r.panX = 0; r.panY = 0;
    }
    setZoom(r.zoom);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    updateMinimapAvailability();
  }, [getMinimapDetailH, updateMinimapAvailability]);

  // 3D mode toggle
  const toggle3D = useCallback(() => {
    const cam = camera3DRef.current;
    const r = rendererRef.current;
    const el = containerRef.current;
    const anchor = captureViewportAnchor(0.5, 0.5);
    if (!cam) return;
    if (cam.enabled) {
      cam.disable();
      setMode3D(false);
      // Refresh canvas at normal size
      schedulePostLayoutRefresh(anchor);
    } else {
      cam.enable();
      setCamera3DContainerStyle(cam.getContainerStyle());
      // Enter 3D with only a backward bend, not a sideways twist.
      cam.animateTo({ rotateX: 24, rotateY: 0, perspective: 1360 }, 800);
      setMode3D(true);
      // Refresh with enlarged canvas for 3D
      schedulePostLayoutRefresh(anchor);
    }
  }, [schedulePostLayoutRefresh, captureViewportAnchor]);

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

  // Mouse pan & zoom on canvas (with 3D rotation support)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let dragging = false, startX = 0, startY = 0, panSX = 0, panSY = 0;
    let minimapDragging = false;
    let didDrag = false;
    let rotating3D = false; // right-click drag for 3D rotation

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
      // Prevent context menu when 3D mode is active (right-click is used for rotation)
      const cam = camera3DRef.current;
      if (cam && cam.enabled) e.preventDefault();
    };

    const onMouseDown = (e) => {
      const r = rendererRef.current;
      if (!r) return;
      const rect = el.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const canvasW = rect.width;
      const canvasH = rect.height;

      // Right-click or middle-click: 3D rotation
      const cam = camera3DRef.current;
      if (cam && cam.enabled && (e.button === 2 || e.button === 1)) {
        e.preventDefault();
        rotating3D = true;
        startX = e.clientX;
        startY = e.clientY;
        didDrag = false;
        el.classList.add('dragging');
        return;
      }

      // Transform coordinates for 3D mode
      const coords = screenToCanvasCoords(e.clientX, e.clientY);

      // Check minimap hit first (use raw screen coords for minimap)
      const hit = r.minimapHitTest(rawX, rawY, canvasW, canvasH);
      if (hit) {
        minimapDragging = true;
        didDrag = true;
        r.panX = hit.panX;
        r.panY = hit.panY;
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        updateMinimapAvailability();
        el.classList.add('dragging');
        return;
      }

      dragging = true;
      didDrag = false;
      startX = e.clientX; startY = e.clientY;
      if (r) { panSX = r.panX; panSY = r.panY; }
      el.classList.add('dragging');
    };
    const onMouseMove = (e) => {
      const r = rendererRef.current;
      const cam = camera3DRef.current;

      if (rotating3D && cam && cam.enabled) {
        didDrag = true;
        cam.rotate(e.clientX - startX, e.clientY - startY);
        startX = e.clientX;
        startY = e.clientY;
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        return;
      }

      if (minimapDragging && r) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = r.minimapHitTest(x, y, rect.width, rect.height);
        if (hit) {
          r.panX = hit.panX;
          r.panY = hit.panY;
          r.render();
          r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
          updateMinimapAvailability();
        }
      } else if (dragging && r) {
        didDrag = true;
        r.panX = panSX + (e.clientX - startX);
        r.panY = panSY + (e.clientY - startY);
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        updateMinimapAvailability();
      } else if (r && !dragging) {
        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        const idx = r.canvasToBitIndex(coords.x, coords.y);
        el.style.cursor = 'crosshair';
        setHoverInfo(idx >= 0 ? r.getBitInfo(idx) : '');
        // Update hover panel only when bit index changes
        if (idx !== lastHoveredIdxRef.current) {
          lastHoveredIdxRef.current = idx;
          if (idx >= 0) {
            setHoveredBitInfo(computeBitInfo(idx));
          } else {
            setHoveredBitInfo(null);
          }
        }
      }
    };
    const onMouseUp = (e) => {
      const releasedOverCanvas = e.target instanceof Node && el.contains(e.target);
      if (rotating3D) {
        rotating3D = false;
        el.classList.remove('dragging');
        return;
      }
      if (!dragging && !minimapDragging && !releasedOverCanvas) {
        el.classList.remove('dragging');
        return;
      }
      if (!didDrag && !minimapDragging && rendererRef.current) {
        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        const r = rendererRef.current;
        const idx = r.canvasToBitIndex(coords.x, coords.y);
        if (idx >= 0) {
          const cam = camera3DRef.current;
          // In 3D mode, clicking flies to the element cinematically
          if (cam && cam.enabled) {
            flyToElement(idx);
          }
          const info = computeBitInfo(idx);
          // Toggle lock: clicking same bit unlocks, clicking different bit locks
          setBitHistoryModal(prev => (prev && prev.bitIndex === idx) ? null : info);
        } else {
          setBitHistoryModal(null);
        }
      }
      dragging = false; minimapDragging = false; el.classList.remove('dragging');
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
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      updateMinimapAvailability();
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    const onMouseLeave = () => {
      if (!dragging && !rotating3D) {
        setHoverInfo('');
        lastHoveredIdxRef.current = -1;
        setHoveredBitInfo(null);
      }
      el.style.cursor = 'crosshair';
    };
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [computeBitInfo, flyToElement, getMinimapDetailH, updateMinimapAvailability]);

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
        case ' ':          e.preventDefault(); handlePlayPause(); break;
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
  }, [currentStep, goToStep, doZoom, resetZoom, steps.length, handlePlayPause, toggle3D]);

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
    };
  }, [steps, currentStep, selectedSteps]);

  const currentStepBanner = useMemo(() => {
    const s = currentStepData;
    if (!s) {
      return {
        line1: `Event ${currentStep} | No event selected`,
        line2: '',
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
    if (s.numChanged != null) line2Parts.push(`+${s.numChanged} bits changed`);
    if (s.annotation) line2Parts.push(s.annotation);
    const line2 = line2Parts.join(' | ');

    return {
      line1,
      line2,
      title: `${line1}${line2 ? ` | ${line2}` : ''}`,
    };
  }, [currentStep, currentStepData]);

  const playSpeedLabel = useMemo(() => `${(1000 / Math.max(1, playSpeed)).toFixed(1)}/s`, [playSpeed]);

  return (
    <div className={`visualizer${isMacPlatform ? ' platform-mac' : ''}${isWindowsPlatform ? ' platform-windows' : ''}`}>
      {/* Header bar */}
      <header className="toolbar">
        <div className="toolbar-left">
          <span className="sieve-info">
            Max: {header.maxNumber.toLocaleString()} | Bits: {header.bitCount.toLocaleString()} | Events: {header.stepCount} | v{header.version}
          </span>
        </div>
        <div className="toolbar-center">
          <button className="btn-icon" onClick={() => goToStep(0)} title="First (Home)" disabled={exporting}><SkipBack /></button>
          <button className="btn-icon" onClick={() => goToStep(currentStep - 1)} title="Previous (←)" disabled={exporting}><StepBack /></button>
          <button className="btn-icon" onClick={handlePlayPause} title="Play/Pause (Space)" disabled={exporting}>
            {playing ? <Pause /> : <Play />}
          </button>
          <button className="btn-icon" onClick={() => goToStep(currentStep + 1)} title="Next (→)" disabled={exporting}><StepForward /></button>
          <button className="btn-icon" onClick={() => goToStep(steps.length - 1)} title="Last (End)" disabled={exporting}><SkipForward /></button>
          <span className="speed-group">
            <button className="btn-icon" onClick={() => setPlaySpeed(s => Math.min(3000, s + 50))} title="Slower" disabled={exporting}><Minus size={14} /></button>
            <span className="speed-val" title={`Playback speed (${playSpeed}ms per step)`}>{playSpeedLabel}</span>
            <button className="btn-icon" onClick={() => setPlaySpeed(s => Math.max(120, s - 50))} title="Faster" disabled={exporting}><Plus size={14} /></button>
          </span>
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
              <button className={`btn-icon${heatMapEnabled ? ' active' : ''}`} onClick={() => setHeatMapEnabled(h => !h)} title="Toggle heat map overlay"><Thermometer /></button>
              <button className={`btn-icon${mode3D ? ' active' : ''}`} onClick={toggle3D} title="Toggle 3D view (3)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 11L8 14L14 11" />
                  <path d="M2 8L8 11L14 8" />
                  <path d="M2 5L8 2L14 5L8 8Z" />
                </svg>
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
      <div className="main-content">
        <StepPanel
          steps={steps}
          currentStep={currentStep}
          selectedSteps={selectedSteps}
          onStepClick={handleStepSelection}
          onMultiStepSelect={handleMultiStepSelect}
          width={panelWidth}
          onWidthChange={setPanelWidth}
          panelCollapsed={stepsPanelCollapsed}
          onToggleCollapse={toggleStepsPanel}
          fileName={fileName}
          onClose={onClose}
        />

        <div className={`canvas-area${mode3D ? ' mode-3d' : ''}`}>
          <div className={`step-focus-banner${stepsPanelCollapsed ? ' shifted-for-collapsed-events' : ''}`} title={currentStepBanner.title}>
            <div className="step-focus-line1">{currentStepBanner.line1}</div>
            {currentStepBanner.line2 && <div className="step-focus-line2">{currentStepBanner.line2}</div>}
          </div>
          <div className={`canvas-container${mode3D ? ' mode-3d' : ''}`} ref={containerRef} style={camera3DContainerStyle}>
            <canvas
              ref={canvasRef}
              className="main-render-canvas"
              style={mode3D
                ? {
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) ${camera3DTransform}`,
                    transformStyle: 'preserve-3d',
                    transformOrigin: '50% 50%',
                  }
                : { transform: camera3DTransform, transformStyle: 'preserve-3d', transformOrigin: '50% 50%' }}
            />
            <canvas ref={minimapCanvasRef} className="minimap-overlay-canvas" aria-hidden="true" />
          </div>
          {hoverInfo && <div className="hover-info">{hoverInfo}</div>}

          {/* Bit history panel: shown when locked (clicked) or hovered */}
          {(bitHistoryModal || hoveredBitInfo) && (() => {
            const info = bitHistoryModal || hoveredBitInfo;
            const locked = !!bitHistoryModal;
            const bi = info.bitIndex;
            const byteIdx   = Math.floor(bi / 8);
            const bitInByte = bi % 8;
            const u32Idx    = Math.floor(bi / 32);
            const bitInU32  = bi % 32;
            const u64Idx    = Math.floor(bi / 64);
            const bitInU64  = bi % 64;
            const clIdx     = Math.floor(bi / (cachelineSize * 8));
            return (
              <div className={`bit-history-panel${locked ? ' locked' : ''}`}>
                <div className="bit-history-header">
                  <span>
                    {locked ? '📌 ' : ''}Bit {bi} → #{info.number}
                  </span>
                  {locked && <button className="bit-history-close" onClick={() => setBitHistoryModal(null)}>✕</button>}
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
                        {info.history.map(h => (
                            <tr key={h.stepIndex} className={h.stepIndex === currentStep ? 'bh-current' : ''}
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
                {!locked && <div className="bit-history-hint">Click bit to lock this panel</div>}
              </div>
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
          />
        </div>

        <SettingsPanel
          settings={layoutSettings}
          onChange={setLayoutSettings}
          collapsed={settingsCollapsed}
          onToggleCollapse={toggleSettingsPanel}
          repeatAnim={repeatAnim}
          onRepeatAnimChange={setRepeatAnim}
          animMode={animMode}
          onAnimModeChange={setAnimMode}
          animStyle={animStyle}
          onAnimStyleChange={setAnimStyle}
          bitAnimInterval={bitAnimInterval}
          onBitAnimIntervalChange={setBitAnimInterval}
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
          outlineSettings={layoutSettings.outlines}
          onOutlineChange={(outlines) => setLayoutSettings((prev) => ({ ...prev, outlines }))}
          isWindowsPlatform={isWindowsPlatform}
        />
      </div>
    </div>
  );
}

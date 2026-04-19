import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SieveRenderer, bitToNumber, numberToBit, STORAGE_MODELS, CACHE_PRESETS } from './SieveRenderer';
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
  vectorGroup: 1,
  vectorBaseBits: 64,
  vectorLanes: 1,
  vectorLabel: 'uint64',
  showBitLabels: true,
  showByteLabels: true,
  showVectorLabels: true,
  outlines: {
    target: 'vector',
  },
};

export default function Visualizer({ trace, fileName, onClose, autoRender }) {
  const { header, steps } = trace;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [hoverInfo, setHoverInfo] = useState('');
  const [panelWidth, setPanelWidth] = useState(320);
  const [theme, setTheme] = useState('dark');
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState(DEFAULT_SETTINGS);
  const [detailOpen, setDetailOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [repeatAnim, setRepeatAnim] = useState(500);
  const [animMode, setAnimMode] = useState('sequential'); // 'all' or 'sequential'
  const [animStyle, setAnimStyle] = useState('ripple'); // 'ripple', 'fade', 'pulse', 'none'
  const [bitAnimInterval, setBitAnimInterval] = useState(100); // ms between sequential bits (0.1s default)
  const [detailHeight, setDetailHeight] = useState(200);
  const [detailWidth, setDetailWidth] = useState(0);
  const [showMinimap, setShowMinimap] = useState(true);
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
  const [stepsPanelCollapsed, setStepsPanelCollapsed] = useState(false);
  const [spacingFocus, setSpacingFocus] = useState(null);
  const [spacingGuide, setSpacingGuide] = useState(null); // { focus, axis, x1, y1, x2, y2, anchorX, anchorY }
  const [guideDrag, setGuideDrag] = useState(null); // { focus, axis, handle, startX, startY, startSpacing, anchorX, anchorY }

  const bitStateRef = useRef(null);
  const stepsRef = useRef([]);
  const playTimerRef = useRef(null);
  const exportCancelRef = useRef(false);
  const rippleRef = useRef(null);
  const seqTimerRef = useRef(null); // sequential animation timer
  const playTimeoutRef = useRef(null);
  const animBusyUntilRef = useRef(0);
  const outlineHoverRafRef = useRef(null);
  const initialFitDoneRef = useRef(false);
  const detailOpenRef = useRef(true);
  const detailHeightRef = useRef(200);
  const lastHoveredIdxRef = useRef(-1); // tracks last hovered bit to avoid redundant recomputes

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
    return detailOpenRef.current ? (detailHeightRef.current + 30) : 30; // 30px for toggle bar
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
      r.init(header.bitCount, header.sieveSize);
      bitStateRef.current = new Uint8Array(header.bitCount);
    }
    return () => { rendererRef.current = null; };
  }, [header.bitCount, header.sieveSize]);

  const prevLayoutRef = useRef({ bitLayout: DEFAULT_SETTINGS.bitLayout, byteLayout: DEFAULT_SETTINGS.byteLayout, cachelineSize: 64 });

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
    r.vectorGroup = layoutSettings.vectorGroup;
    r.vectorLabel = layoutSettings.vectorLabel || `uint64v${layoutSettings.vectorGroup || 1}`;
    r.showBitLabels = layoutSettings.showBitLabels;
    r.showByteLabels = layoutSettings.showByteLabels;
    r.showVectorLabels = layoutSettings.showVectorLabels !== false;
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
    r.customSetBit = customColors.setBit;
    r.customClearedBit = customColors.clearedBit;
    r.customUnchangedBit = customColors.unchangedBit;
    // Reset zoom when bit/byte layout or cacheline size changes
    const prev = prevLayoutRef.current;
    if (prev.bitLayout !== layoutSettings.bitLayout || prev.byteLayout !== layoutSettings.byteLayout || prev.cachelineSize !== cachelineSize) {
      r.unfreezeLayout();
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        r.zoomToFit(rect.width, rect.height);
        setZoom(r.zoom);
      }
      r.freezeLayout();
      prev.bitLayout = layoutSettings.bitLayout;
      prev.byteLayout = layoutSettings.byteLayout;
      prev.cachelineSize = cachelineSize;
    }
    r.render();
    if (showMinimap) r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [theme, layoutSettings, showMinimap, colorPreset, customColors, storageModel, cachelineSize, heatMapEnabled]);

  const adjustSpacingFromOutline = useCallback((focus, axis, delta) => {
    const keyMap = {
      byte: axis === 'H' ? 'byteSpacingH' : 'byteSpacingV',
      vector: axis === 'H' ? 'u64SpacingH' : 'u64SpacingV',
      cacheline: axis === 'H' ? 'u64SpacingH' : 'u64SpacingV',
    };
    const key = keyMap[focus];
    if (!key) return;
    setLayoutSettings((prev) => {
      const max = key.includes('bitSpacing') ? 10 : 20;
      const next = Math.max(0, Math.min(max, (prev[key] || 0) + delta));
      return { ...prev, [key]: next };
    });
  }, []);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !spacingGuide) return;
    const next = r.getOutlineSpacingGuide(spacingGuide.anchorX, spacingGuide.anchorY);
    if (!next) {
      setSpacingGuide(null);
      return;
    }
    if (
      next.focus !== spacingGuide.focus ||
      next.axis !== spacingGuide.axis ||
      next.x1 !== spacingGuide.x1 ||
      next.y1 !== spacingGuide.y1 ||
      next.x2 !== spacingGuide.x2 ||
      next.y2 !== spacingGuide.y2
    ) {
      setSpacingGuide(next);
    }
  }, [layoutSettings, spacingGuide?.anchorX, spacingGuide?.anchorY]);

  useEffect(() => {
    if (!guideDrag) return;

    const mapKey = {
      byte: guideDrag.axis === 'H' ? 'byteSpacingH' : 'byteSpacingV',
      vector: guideDrag.axis === 'H' ? 'u64SpacingH' : 'u64SpacingV',
      cacheline: guideDrag.axis === 'H' ? 'u64SpacingH' : 'u64SpacingV',
    };
    const key = mapKey[guideDrag.focus];
    if (!key) return;

    const onMove = (e) => {
      const r = rendererRef.current;
      const z = Math.max(0.25, r?.zoom || 1);
      const axisDelta = guideDrag.axis === 'H'
        ? (e.clientX - guideDrag.startX)
        : (e.clientY - guideDrag.startY);
      let sign = 1;
      if (guideDrag.axis === 'H' && guideDrag.handle === 'start') sign = -1;
      if (guideDrag.axis === 'V' && guideDrag.handle === 'start') sign = -1;
      const stepDelta = Math.round((sign * axisDelta) / z);
      const max = key.includes('bitSpacing') ? 10 : 20;
      const nextVal = Math.max(0, Math.min(max, guideDrag.startSpacing + stepDelta));
      setLayoutSettings((prev) => ({ ...prev, [key]: nextVal }));
    };

    const onUp = () => setGuideDrag(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [guideDrag]);

  const stopOutlineHoverAnim = useCallback(() => {
    if (outlineHoverRafRef.current) {
      cancelAnimationFrame(outlineHoverRafRef.current);
      outlineHoverRafRef.current = null;
    }
    const r = rendererRef.current;
    if (r) {
      r.outlineHoverActive = false;
      r.outlineHoverPulse = 0;
    }
  }, []);

  const startOutlineHoverAnim = useCallback(() => {
    const r = rendererRef.current;
    if (!r || outlineHoverRafRef.current) return;

    const tick = () => {
      const rr = rendererRef.current;
      if (!rr || !rr.outlineHoverActive) {
        outlineHoverRafRef.current = null;
        return;
      }
      rr.outlineHoverPulse = (Math.sin(performance.now() / 140) + 1) / 2;
      rr.render();
      rr.renderMinimap(rr.canvasWidth, rr.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      outlineHoverRafRef.current = requestAnimationFrame(tick);
    };

    outlineHoverRafRef.current = requestAnimationFrame(tick);
  }, [getMinimapDetailH]);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const r = rendererRef.current;
      const el = containerRef.current;
      if (!r || !el) return;
      const rect = el.getBoundingClientRect();
      r.resize(rect.width, rect.height);
      r.unfreezeLayout();
      r.freezeLayout();
      r.render();
      if (showMinimap) r.renderMinimap(rect.width, rect.height, getMinimapDetailH());
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [panelWidth, showMinimap, stepsPanelCollapsed, settingsCollapsed]);

  // Go to step
  const goToStep = useCallback((target) => {
    const r = rendererRef.current;
    if (!r || steps.length === 0) return;
    target = Math.max(0, Math.min(target, steps.length - 1));

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

    const changedSet = new Set(step.changedBits);

    // Set operation for color-coded highlighting
    r.currentOperation = step.operation;
    r.setState(bs, changedSet);

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
        r.zoomToFit(rect.width, rect.height);
        setZoom(r.zoom);
        r.freezeLayout();
        initialFitDoneRef.current = true;
      }
    }
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    setCurrentStep(target);

    // Trigger animation for changed bits
    triggerAnimation(changedSet);
  }, [currentStep, steps]);

  // Stop any running sequential animation
  const stopSeqAnim = useCallback(() => {
    if (seqTimerRef.current) { clearTimeout(seqTimerRef.current); seqTimerRef.current = null; }
    if (rippleRef.current) { cancelAnimationFrame(rippleRef.current); rippleRef.current = null; }
  }, []);

  // Run a single ripple/fade/pulse effect on current changedBits
  const runEffect = useCallback((style) => {
    const r = rendererRef.current;
    if (!r || !r.changedBits || r.changedBits.size === 0) return;
    if (rippleRef.current) cancelAnimationFrame(rippleRef.current);
    if (style === 'none') return;

    const duration = 600;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      r.render();
      if (style === 'ripple') r.renderRipple(progress);
      else if (style === 'fade') r.renderFade(progress);
      else if (style === 'pulse') r.renderPulse(progress);
      // Keep minimap visible during animation frames
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      if (progress < 1) {
        rippleRef.current = requestAnimationFrame(animate);
      } else {
        rippleRef.current = null;
      }
    };
    rippleRef.current = requestAnimationFrame(animate);
  }, []);

  const clampMs = useCallback((value, min, max) => Math.max(min, Math.min(max, value)), []);

  const estimateAnimDuration = useCallback((bitCount) => {
    const holdMs = 280;
    const dissolvePerBit = 8;
    const dissolveMax = 1200;

    if (bitCount <= 0 || animStyle === 'none') {
      return holdMs;
    }

    if (animMode === 'all' || bitAnimInterval <= 0) {
      return 620 + holdMs + Math.min(dissolveMax, Math.max(120, bitCount * dissolvePerBit));
    }

    let revealMs = bitCount * Math.max(10, bitAnimInterval);
    if (animMode === 'bounce') {
      revealMs *= 2;
    }

    return revealMs + holdMs + Math.min(dissolveMax, Math.max(120, bitCount * dissolvePerBit));
  }, [animMode, animStyle, bitAnimInterval]);

  const dissolveInOrder = useCallback((r, bits, holdMs = 280) => {
    if (!r || bits.length === 0) return;
    const dissolveStepMs = clampMs(Math.floor((bitAnimInterval || 100) * 0.45), 12, 140);
    const fullSet = new Set(bits);

    seqTimerRef.current = setTimeout(() => {
      let idx = 0;

      const dissolveNext = () => {
        if (!rendererRef.current) return;
        if (idx >= bits.length) {
          r.changedBits = new Set();
          r.render();
          r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
          return;
        }

        fullSet.delete(bits[idx]);
        r.changedBits = new Set(fullSet);
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        idx += 1;
        seqTimerRef.current = setTimeout(dissolveNext, dissolveStepMs);
      };

      dissolveNext();
    }, Math.max(80, holdMs));
  }, [bitAnimInterval, clampMs, getMinimapDetailH]);

  // Main animation trigger — all-at-once, sequential per-bit, or bounce
  const triggerAnimation = useCallback((changedSet) => {
    stopSeqAnim();
    const r = rendererRef.current;
    if (!r || !changedSet || changedSet.size === 0 || changedSet.size >= 100000) return;

    const est = estimateAnimDuration(changedSet.size);
    animBusyUntilRef.current = performance.now() + est + Math.max(0, repeatAnim || 0);

    if ((animMode === 'sequential' || animMode === 'bounce') && bitAnimInterval > 0) {
      // Sequential / bounce: reveal bits one-by-one
      const bits = Array.from(changedSet).sort((a, b) => a - b);
      const fullChanged = new Set(changedSet);
      let idx = 0;
      let direction = 1; // 1 = forward, -1 = backward
      let bounced = false;
      const revealOrder = [];
      const holdMs = 280;

      const revealNext = () => {
        if (!rendererRef.current) return;
        if (idx < 0 || idx >= bits.length) {
          if (animMode === 'bounce') {
            if (!bounced) {
              bounced = true;
              direction *= -1;
              idx = direction > 0 ? 0 : bits.length - 1;
            } else {
              r.changedBits = fullChanged;
              r.render();
              r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
              dissolveInOrder(r, revealOrder.length ? revealOrder : bits, holdMs);
              return;
            }
          } else {
            // Sequential done — restore full set and dissolve in reveal order
            r.changedBits = fullChanged;
            r.render();
            r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
            dissolveInOrder(r, revealOrder.length ? revealOrder : bits, holdMs);
            return;
          }
        }

        const partial = new Set();
        if (direction > 0) {
          for (let i = 0; i <= idx; i++) partial.add(bits[i]);
        } else {
          for (let i = idx; i < bits.length; i++) partial.add(bits[i]);
        }
        r.changedBits = partial;
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        revealOrder.push(bits[idx]);
        // Small effect on the just-added bit
        if (animStyle !== 'none') {
          const singleSet = new Set([bits[idx]]);
          r.changedBits = singleSet;
          if (animStyle === 'ripple') r.renderRipple(0.3);
          else if (animStyle === 'fade') r.renderFade(0.3);
          else if (animStyle === 'pulse') r.renderPulse(0.3);
          r.changedBits = partial;
        }
        idx += direction;
        seqTimerRef.current = setTimeout(revealNext, bitAnimInterval);
      };

      r.changedBits = new Set();
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      seqTimerRef.current = setTimeout(revealNext, bitAnimInterval);
    } else {
      // All at once with chosen effect style
      runEffect(animStyle);
      const bits = Array.from(changedSet).sort((a, b) => a - b);
      const holdMs = animStyle === 'none' ? 200 : 300;
      dissolveInOrder(r, bits, holdMs);
    }
  }, [animMode, animStyle, bitAnimInterval, stopSeqAnim, runEffect, estimateAnimDuration, repeatAnim, dissolveInOrder, getMinimapDetailH]);

  // Initial render — delay one frame so the container has its final dimensions
  useEffect(() => {
    if (steps.length > 0) {
      const raf = requestAnimationFrame(() => goToStep(0));
      return () => cancelAnimationFrame(raf);
    }
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Multi-step selection: merge changedBits from selected steps
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || selectedSteps.size === 0) return;
    const merged = new Set();
    for (const idx of selectedSteps) {
      const s = steps[idx];
      if (s) for (let j = 0; j < s.changedBits.length; j++) merged.add(s.changedBits[j]);
    }
    r.changedBits = merged;
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [selectedSteps, steps]);

  // Auto-render mode (for CLI video export via puppeteer)
  useEffect(() => {
    if (autoRender && steps.length > 0 && !exporting) {
      const timer = setTimeout(() => exportVideo(), 500);
      return () => clearTimeout(timer);
    }
  }, [autoRender, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Replay current step when animation mode changes so all bits are animated in the new mode
  useEffect(() => {
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;
    const currentChanged = new Set(step.changedBits);
    triggerAnimation(currentChanged);
  }, [animMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
        setTimeout(() => goToStep(next), 0);
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
      goToStep(0);
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
  }, []);

  const resetZoom = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.unfreezeLayout();
      r.zoomToFit(rect.width, rect.height);
      r.freezeLayout();
    } else {
      r.zoom = 1; r.panX = 0; r.panY = 0;
    }
    setZoom(r.zoom);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, []);

  // Mouse pan & zoom on canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let dragging = false, startX = 0, startY = 0, panSX = 0, panSY = 0;
    let minimapDragging = false;
    let didDrag = false;

    const onMouseDown = (e) => {
      const r = rendererRef.current;
      if (!r) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const canvasW = rect.width;
      const canvasH = rect.height;

      // Check minimap hit first
      const hit = r.minimapHitTest(x, y, canvasW, canvasH);
      if (hit) {
        minimapDragging = true;
        didDrag = true;
        r.panX = hit.panX;
        r.panY = hit.panY;
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
        }
      } else if (dragging && r) {
        didDrag = true;
        r.panX = panSX + (e.clientX - startX);
        r.panY = panSY + (e.clientY - startY);
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      } else if (r && !dragging) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const idx = r.canvasToBitIndex(x, y);
        const outlineHit = idx >= 0 ? null : r.hitTestOutline(x, y, { includeInterior: false });
        const onOutline = !!outlineHit;
        r.outlineHoverActive = onOutline;
        if (onOutline) {
          el.style.cursor = 'pointer';
          startOutlineHoverAnim();
        } else {
          el.style.cursor = 'crosshair';
          stopOutlineHoverAnim();
        }
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
      if (!didDrag && !minimapDragging && rendererRef.current) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const r = rendererRef.current;
        const idx = r.canvasToBitIndex(x, y);
        const outlineHit = idx >= 0 ? null : r.hitTestOutline(x, y, { includeInterior: false });
        if (outlineHit) {
          setSpacingFocus(outlineHit);
          setSpacingGuide(r.getOutlineSpacingGuide(x, y));
          setBitHistoryModal(null);
          dragging = false; minimapDragging = false; el.classList.remove('dragging');
          return;
        }
        setSpacingGuide(null);
        if (idx >= 0) {
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
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldZoom = r.zoom;
      r.zoom = e.deltaY < 0
        ? Math.min(64, r.zoom * 1.2)
        : Math.max(0.1, r.zoom / 1.2);
      const scale = r.zoom / oldZoom;
      r.panX = mx - scale * (mx - r.panX);
      r.panY = my - scale * (my - r.panY);
      setZoom(r.zoom);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    const onMouseLeave = () => {
      if (!dragging) {
        setHoverInfo('');
        lastHoveredIdxRef.current = -1;
        setHoveredBitInfo(null);
      }
      stopOutlineHoverAnim();
      el.style.cursor = 'crosshair';
    };
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mouseleave', onMouseLeave);
      stopOutlineHoverAnim();
    };
  }, [computeBitInfo, getMinimapDetailH, startOutlineHoverAnim, stopOutlineHoverAnim]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); goToStep(currentStep - 1); break;
        case 'ArrowRight': e.preventDefault(); goToStep(currentStep + 1); break;
        case 'Home':       e.preventDefault(); goToStep(0); break;
        case 'End':        e.preventDefault(); goToStep(steps.length - 1); break;
        case ' ':          e.preventDefault(); handlePlayPause(); break;
        case '+': case '=': e.preventDefault(); doZoom(1.5); break;
        case '-':          e.preventDefault(); doZoom(1 / 1.5); break;
        case '0':          e.preventDefault(); resetZoom(); break;
        case 't': case 'T': e.preventDefault(); setTheme(t => t === 'dark' ? 'light' : 'dark'); break;
        case 'd': case 'D': e.preventDefault(); setDetailOpen(o => !o); break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [currentStep, goToStep, doZoom, resetZoom, steps.length, handlePlayPause]);

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
        r.currentOperation = s.operation;
        r.setState(bs, changed);
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
    const el = containerRef.current;
    if (!r || !el || !query.trim()) { setSearchResult(null); return; }

    const q = query.trim().toLowerCase();
    let bitIdx = -1;

    // Parse: "bit N", "byte N", "uint32 N", "uint64 N", "vector N", "number N", or just a plain number
    const m = q.match(/^(bit|byte|uint32|uint64|vector|number|num|#)?\s*(\d+)$/);
    if (!m) { setSearchResult('Invalid query'); return; }

    const type = m[1] || '';
    const val = parseInt(m[2], 10);

    switch (type) {
      case 'bit':    bitIdx = val; break;
      case 'byte':   bitIdx = val * 8; break;
      case 'uint32': bitIdx = val * 32; break;
      case 'uint64': bitIdx = val * 64; break;
      case 'vector': bitIdx = val * 64 * r.vectorGroup; break;
      case 'number': case 'num': case '#':
        bitIdx = numberToBit(val, storageModel);
        if (bitIdx < 0) { setSearchResult('Not representable in this storage model'); return; }
        break;
      default:
        // Plain number — treat as bit index
        bitIdx = val;
    }

    if (bitIdx < 0 || bitIdx >= r.bitCount) {
      setSearchResult(`Out of range (0–${r.bitCount - 1})`);
      return;
    }

    // Calculate the canvas position of this bit and pan to center it
    const bitsPerCacheLine = 512;
    const clIdx = Math.floor(bitIdx / bitsPerCacheLine);
    const clPerVRow = r._cacheLinesPerVisualRow();
    const vRow = Math.floor(clIdx / clPerVRow);
    const rowD = r._rowDims();
    const labelH = r._labelHeight();
    const vRowHeight = labelH + rowD.h + r.u64SpacingV * r.zoom;

    const rect = el.getBoundingClientRect();
    // Center vertically on the visual row
    const targetY = vRow * vRowHeight + labelH + rowD.h / 2;
    r.panY = rect.height / 2 - targetY;

    // Center horizontally
    const clInRow = clIdx % clPerVRow;
    const clStepX = rowD.w + r.u64SpacingH * r.zoom;
    const targetX = clInRow * clStepX + rowD.w / 2;
    r.panX = rect.width / 2 - targetX;

    r.render();
    r.renderMinimap(r.canvasWidth, rect.height, getMinimapDetailH());
    const num = bitToNumber(bitIdx, storageModel);
    setSearchResult(`Bit ${bitIdx} → Number ${num}`);
  }, [storageModel]);

  const beginGuideDrag = useCallback((handle, e) => {
    if (!spacingGuide) return;
    e.preventDefault();
    e.stopPropagation();
    const keyMap = {
      byte: spacingGuide.axis === 'H' ? 'byteSpacingH' : 'byteSpacingV',
      vector: spacingGuide.axis === 'H' ? 'u64SpacingH' : 'u64SpacingV',
      cacheline: spacingGuide.axis === 'H' ? 'u64SpacingH' : 'u64SpacingV',
    };
    const key = keyMap[spacingGuide.focus];
    if (!key) return;
    setGuideDrag({
      focus: spacingGuide.focus,
      axis: spacingGuide.axis,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startSpacing: layoutSettings[key] || 0,
      anchorX: spacingGuide.anchorX,
      anchorY: spacingGuide.anchorY,
    });
  }, [spacingGuide, layoutSettings]);

  const currentStepData = steps[currentStep] || null;

  return (
    <div className="visualizer">
      {/* Header bar */}
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="btn-icon" onClick={onClose} title="Close file">✕</button>
          <span className="file-name">{fileName}</span>
          <span className="sieve-info">
            Max: {header.maxNumber.toLocaleString()} | Bits: {header.bitCount.toLocaleString()} | Steps: {header.stepCount} | v{header.version}
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
            <span className="speed-val" title="Playback interval (ms)">{playSpeed}ms</span>
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
          <div className="search-box">
            <button className="btn-icon" onClick={() => setSearchOpen(o => !o)} title="Search (bit/byte/number)"><Search /></button>
            {searchOpen && (
              <>
                <input
                  type="text"
                  className="search-input"
                  placeholder="bit 42 / byte 5 / number 97…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); if (e.key === 'Escape') setSearchOpen(false); }}
                  autoFocus
                  title="Search: bit N, byte N, uint64 N, vector N, number N"
                />
                {searchResult && <span className="search-result">{searchResult}</span>}
              </>
            )}
          </div>
          <button className="btn-icon" onClick={() => doZoom(1.5)} title="Zoom In (+)"><ZoomIn /></button>
          <button className="btn-text" onClick={resetZoom} title="Reset Zoom (0)">{zoom.toFixed(1)}x</button>
          <button className="btn-icon" onClick={() => doZoom(1 / 1.5)} title="Zoom Out (−)"><ZoomOut /></button>
          <button className={`btn-icon${heatMapEnabled ? ' active' : ''}`} onClick={() => setHeatMapEnabled(h => !h)} title="Toggle heat map overlay"><Thermometer /></button>
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
          onStepClick={goToStep}
          onMultiStepSelect={setSelectedSteps}
          width={panelWidth}
          onWidthChange={setPanelWidth}
          panelCollapsed={stepsPanelCollapsed}
          onToggleCollapse={() => setStepsPanelCollapsed(c => !c)}
        />

        <div className="canvas-area">
          <div className="canvas-container" ref={containerRef}>
            <canvas ref={canvasRef} />
            {spacingGuide && (
              <svg className="outline-spacing-guide" width="100%" height="100%">
                <line
                  x1={spacingGuide.x1}
                  y1={spacingGuide.y1}
                  x2={spacingGuide.x2}
                  y2={spacingGuide.y2}
                  className="outline-spacing-line"
                />
                <polygon
                  points={spacingGuide.axis === 'H'
                    ? `${spacingGuide.x1},${spacingGuide.y1} ${spacingGuide.x1 + 10},${spacingGuide.y1 - 6} ${spacingGuide.x1 + 10},${spacingGuide.y1 + 6}`
                    : `${spacingGuide.x1},${spacingGuide.y1} ${spacingGuide.x1 - 6},${spacingGuide.y1 + 10} ${spacingGuide.x1 + 6},${spacingGuide.y1 + 10}`}
                  className="outline-spacing-arrow"
                />
                <polygon
                  points={spacingGuide.axis === 'H'
                    ? `${spacingGuide.x2},${spacingGuide.y2} ${spacingGuide.x2 - 10},${spacingGuide.y2 - 6} ${spacingGuide.x2 - 10},${spacingGuide.y2 + 6}`
                    : `${spacingGuide.x2},${spacingGuide.y2} ${spacingGuide.x2 - 6},${spacingGuide.y2 - 10} ${spacingGuide.x2 + 6},${spacingGuide.y2 - 10}`}
                  className="outline-spacing-arrow"
                />
                <circle
                  cx={spacingGuide.x1}
                  cy={spacingGuide.y1}
                  r={7}
                  className="outline-spacing-handle"
                  onMouseDown={(e) => beginGuideDrag('start', e)}
                />
                <circle
                  cx={spacingGuide.x2}
                  cy={spacingGuide.y2}
                  r={7}
                  className="outline-spacing-handle"
                  onMouseDown={(e) => beginGuideDrag('end', e)}
                />
              </svg>
            )}
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
                    <p className="bit-history-empty">No steps have modified this bit.</p>
                  ) : (
                    <table className="bit-history-table">
                      <thead>
                        <tr><th>Step</th><th>Operation</th><th>Prime</th></tr>
                      </thead>
                      <tbody>
                        {info.history.map(h => (
                          <tr key={h.stepIndex} className={h.stepIndex === currentStep ? 'bh-current' : ''}
                              onClick={() => { goToStep(h.stepIndex); }}>
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
            onToggle={() => updateDetailOpen(o => !o)}
            height={detailHeight}
            onHeightChange={updateDetailHeight}
            width={detailWidth}
            onWidthChange={setDetailWidth}
            playing={playing}
            stepStats={stepStats}
            storageModel={storageModel}
          />
        </div>

        <SettingsPanel
          settings={layoutSettings}
          onChange={setLayoutSettings}
          collapsed={settingsCollapsed}
          onToggleCollapse={() => setSettingsCollapsed(c => !c)}
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
          outlineSettings={layoutSettings.outlines}
          onOutlineChange={(outlines) => setLayoutSettings((prev) => ({ ...prev, outlines }))}
          spacingFocus={spacingFocus}
          onAdjustSpacingFromOutline={adjustSpacingFromOutline}
        />
      </div>
    </div>
  );
}

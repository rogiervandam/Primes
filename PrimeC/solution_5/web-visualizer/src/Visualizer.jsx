import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SieveRenderer, bitToNumber, numberToBit, STORAGE_MODELS } from './SieveRenderer';
import StepPanel from './StepPanel';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Settings, Search, Minus, Plus
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
  showBitLabels: false,
  showByteLabels: false,
};

export default function Visualizer({ trace, fileName, onClose, autoRender }) {
  const { header, steps } = trace;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [hoverInfo, setHoverInfo] = useState('');
  const [panelWidth, setPanelWidth] = useState(320);
  const [theme, setTheme] = useState('dark');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState(DEFAULT_SETTINGS);
  const [detailOpen, setDetailOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [repeatAnim, setRepeatAnim] = useState(500);
  const [animMode, setAnimMode] = useState('all'); // 'all' or 'sequential'
  const [animStyle, setAnimStyle] = useState('ripple'); // 'ripple', 'fade', 'pulse', 'none'
  const [bitAnimInterval, setBitAnimInterval] = useState(50); // ms between sequential bits
  const [detailHeight, setDetailHeight] = useState(200);
  const [detailWidth, setDetailWidth] = useState(0);
  const [showMinimap, setShowMinimap] = useState(true);
  const [stepStats, setStepStats] = useState(null); // { totalSet, newlySet, reSet }
  const [bitHistoryModal, setBitHistoryModal] = useState(null); // { bitIndex, history[] }
  const [colorPreset, setColorPreset] = useState(null); // null = theme default
  const [customColors, setCustomColors] = useState({ setBit: null, clearedBit: null, unchangedBit: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [storageModel, setStorageModel] = useState(header.storageModel || 'half');
  const [selectedSteps, setSelectedSteps] = useState(new Set());

  const bitStateRef = useRef(null);
  const stepsRef = useRef([]);
  const playTimerRef = useRef(null);
  const exportCancelRef = useRef(false);
  const rippleRef = useRef(null);
  const seqTimerRef = useRef(null); // sequential animation timer
  const initialFitDoneRef = useRef(false);
  const detailOpenRef = useRef(true);
  const detailHeightRef = useRef(200);

  stepsRef.current = steps;

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

  const prevLayoutRef = useRef({ bitLayout: DEFAULT_SETTINGS.bitLayout, byteLayout: DEFAULT_SETTINGS.byteLayout });

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
    r.showBitLabels = layoutSettings.showBitLabels;
    r.showByteLabels = layoutSettings.showByteLabels;
    r.colorPreset = colorPreset;
    r.storageModel = storageModel;
    r.customSetBit = customColors.setBit;
    r.customClearedBit = customColors.clearedBit;
    r.customUnchangedBit = customColors.unchangedBit;
    // Reset zoom when bit/byte layout changes
    const prev = prevLayoutRef.current;
    if (prev.bitLayout !== layoutSettings.bitLayout || prev.byteLayout !== layoutSettings.byteLayout) {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        r.zoomToFit(rect.width, rect.height);
        setZoom(r.zoom);
      }
      prev.bitLayout = layoutSettings.bitLayout;
      prev.byteLayout = layoutSettings.byteLayout;
    }
    r.render();
    if (showMinimap) r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
  }, [theme, layoutSettings, showMinimap, colorPreset, customColors, storageModel]);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const r = rendererRef.current;
      const el = containerRef.current;
      if (!r || !el) return;
      const rect = el.getBoundingClientRect();
      r.resize(rect.width, rect.height);
      r.render();
      if (showMinimap) r.renderMinimap(rect.width, rect.height, getMinimapDetailH());
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [panelWidth, showMinimap]);

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
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.resize(rect.width, rect.height);
      // Zoom to fit on first render
      if (!initialFitDoneRef.current) {
        r.zoomToFit(rect.width, rect.height);
        setZoom(r.zoom);
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
      // Re-render minimap only at end to avoid flickering
      if (progress < 1) {
        rippleRef.current = requestAnimationFrame(animate);
      } else {
        r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
        rippleRef.current = null;
      }
    };
    rippleRef.current = requestAnimationFrame(animate);
  }, []);

  // Main animation trigger — all-at-once, sequential per-bit, or bounce
  const triggerAnimation = useCallback((changedSet) => {
    stopSeqAnim();
    const r = rendererRef.current;
    if (!r || !changedSet || changedSet.size === 0 || changedSet.size >= 100000) return;

    if ((animMode === 'sequential' || animMode === 'bounce') && bitAnimInterval > 0) {
      // Sequential / bounce: reveal bits one-by-one
      const bits = Array.from(changedSet).sort((a, b) => a - b);
      const fullChanged = new Set(changedSet);
      let idx = 0;
      let direction = 1; // 1 = forward, -1 = backward

      const revealNext = () => {
        if (!rendererRef.current) return;
        if (idx < 0 || idx >= bits.length) {
          if (animMode === 'bounce') {
            direction *= -1;
            idx = direction > 0 ? 0 : bits.length - 1;
          } else {
            // Sequential done — restore full set
            r.changedBits = fullChanged;
            r.render();
            r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
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
      seqTimerRef.current = setTimeout(revealNext, bitAnimInterval);
    } else {
      // All at once with chosen effect style
      runEffect(animStyle);
    }
  }, [animMode, animStyle, bitAnimInterval, stopSeqAnim, runEffect]);

  // Repeat animation timer
  useEffect(() => {
    if (repeatAnim <= 0) return;
    const timer = setInterval(() => {
      const r = rendererRef.current;
      if (r && r.changedBits) triggerAnimation(r.changedBits);
    }, repeatAnim);
    return () => clearInterval(timer);
  }, [repeatAnim, triggerAnimation]);

  // Initial render
  useEffect(() => {
    if (steps.length > 0) goToStep(0);
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

  // Play/pause
  useEffect(() => {
    if (playing) {
      playTimerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= steps.length) {
            setPlaying(false);
            return prev;
          }
          setTimeout(() => goToStep(next), 0);
          return next;
        });
      }, playSpeed);
    } else {
      clearInterval(playTimerRef.current);
    }
    return () => clearInterval(playTimerRef.current);
  }, [playing, playSpeed, steps.length, goToStep]);

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
      r.zoomToFit(rect.width, rect.height);
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
        setHoverInfo(idx >= 0 ? r.getBitInfo(idx) : '');
      }
    };
    const onMouseUp = (e) => {
      if (!didDrag && !minimapDragging && rendererRef.current) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const r = rendererRef.current;
        const idx = r.canvasToBitIndex(x, y);
        if (idx >= 0) {
          // Find all steps that affected this bit
          const history = [];
          for (let i = 0; i < stepsRef.current.length; i++) {
            const s = stepsRef.current[i];
            for (let j = 0; j < s.changedBits.length; j++) {
              if (s.changedBits[j] === idx) {
                history.push({ stepIndex: i, operation: s.operation, prime: s.prime, annotation: s.annotation });
                break;
              }
            }
          }
          setBitHistoryModal({ bitIndex: idx, number: bitToNumber(idx, storageModel), history });
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
    const onMouseLeave = () => { if (!dragging) setHoverInfo(''); };
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); goToStep(currentStep - 1); break;
        case 'ArrowRight': e.preventDefault(); goToStep(currentStep + 1); break;
        case 'Home':       e.preventDefault(); goToStep(0); break;
        case 'End':        e.preventDefault(); goToStep(steps.length - 1); break;
        case ' ':          e.preventDefault(); setPlaying(p => !p); break;
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
  }, [currentStep, goToStep, doZoom, resetZoom, steps.length]);

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
          <button className="btn-icon" onClick={() => setPlaying(p => !p)} title="Play/Pause (Space)" disabled={exporting}>
            {playing ? <Pause /> : <Play />}
          </button>
          <button className="btn-icon" onClick={() => goToStep(currentStep + 1)} title="Next (→)" disabled={exporting}><StepForward /></button>
          <button className="btn-icon" onClick={() => goToStep(steps.length - 1)} title="Last (End)" disabled={exporting}><SkipForward /></button>
          <span className="speed-group">
            <button className="btn-icon" onClick={() => setPlaySpeed(s => Math.min(2000, s + 50))} title="Slower" disabled={exporting}><Minus size={14} /></button>
            <span className="speed-val" title="Playback interval (ms)">{playSpeed}ms</span>
            <button className="btn-icon" onClick={() => setPlaySpeed(s => Math.max(10, s - 50))} title="Faster" disabled={exporting}><Plus size={14} /></button>
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
          <button className="btn-icon" onClick={() => setSettingsOpen(o => !o)} title="Layout settings"><Settings /></button>
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
        />

        <div className="canvas-area">
          <div className="canvas-container" ref={containerRef}>
            <canvas ref={canvasRef} />
          </div>
          {hoverInfo && <div className="hover-info">{hoverInfo}</div>}

          {bitHistoryModal && (
            <div className="bit-history-panel">
              <div className="bit-history-header">
                <span>Bit {bitHistoryModal.bitIndex} — Number {bitHistoryModal.number}</span>
                <button className="bit-history-close" onClick={() => setBitHistoryModal(null)}>✕</button>
              </div>
              <div className="bit-history-body">
                {bitHistoryModal.history.length === 0 ? (
                  <p className="bit-history-empty">No steps have modified this bit.</p>
                ) : (
                  <table className="bit-history-table">
                    <thead>
                      <tr><th>Step</th><th>Operation</th><th>Prime</th></tr>
                    </thead>
                    <tbody>
                      {bitHistoryModal.history.map(h => (
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
            </div>
          )}

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
      </div>

      <SettingsPanel
        settings={layoutSettings}
        onChange={setLayoutSettings}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
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
      />
    </div>
  );
}

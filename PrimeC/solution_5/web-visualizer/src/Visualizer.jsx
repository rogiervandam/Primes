import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SieveRenderer } from './SieveRenderer';
import StepPanel from './StepPanel';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Settings
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
  const [repeatAnim, setRepeatAnim] = useState(0); // 0 = off, else interval in ms

  const bitStateRef = useRef(null);
  const playTimerRef = useRef(null);
  const exportCancelRef = useRef(false);
  const rippleRef = useRef(null); // animation frame id

  const { header, steps } = trace;

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
    r.render();
  }, [theme, layoutSettings]);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const r = rendererRef.current;
      const el = containerRef.current;
      if (!r || !el) return;
      const rect = el.getBoundingClientRect();
      r.resize(rect.width, rect.height);
      r.render();
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [panelWidth]);

  // Go to step
  const goToStep = useCallback((target) => {
    const r = rendererRef.current;
    if (!r || steps.length === 0) return;
    target = Math.max(0, Math.min(target, steps.length - 1));

    let bs = bitStateRef.current;
    if (!bs) return;

    if (target < currentStep) {
      bs.fill(0);
      for (let i = 0; i <= target; i++) {
        const s = steps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const idx = s.changedBits[j];
          if (idx < bs.length) bs[idx] = 1;
        }
      }
    } else {
      for (let i = currentStep + 1; i <= target; i++) {
        const s = steps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const idx = s.changedBits[j];
          if (idx < bs.length) bs[idx] = 1;
        }
      }
    }

    const changedSet = new Set();
    const step = steps[target];
    for (let j = 0; j < step.changedBits.length; j++) {
      changedSet.add(step.changedBits[j]);
    }

    // Set operation for color-coded highlighting
    r.currentOperation = step.operation;
    r.setState(bs, changedSet);
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.resize(rect.width, rect.height);
    }
    r.render();
    setCurrentStep(target);

    // Trigger ripple animation for changed bits
    triggerRipple();
  }, [currentStep, steps]);

  const triggerRipple = useCallback(() => {
    const r = rendererRef.current;
    if (!r || !r.changedBits || r.changedBits.size === 0 || r.changedBits.size >= 100000) return;
    if (rippleRef.current) cancelAnimationFrame(rippleRef.current);
    const duration = 600;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      r.render();
      r.renderRipple(progress);
      if (progress < 1) {
        rippleRef.current = requestAnimationFrame(animate);
      } else {
        rippleRef.current = null;
      }
    };
    rippleRef.current = requestAnimationFrame(animate);
  }, []);

  // Repeat animation timer
  useEffect(() => {
    if (repeatAnim <= 0) return;
    const timer = setInterval(triggerRipple, repeatAnim);
    return () => clearInterval(timer);
  }, [repeatAnim, triggerRipple]);

  // Initial render
  useEffect(() => {
    if (steps.length > 0) goToStep(0);
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []);

  const resetZoom = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.zoom = 1; r.panX = 0; r.panY = 0;
    setZoom(1);
    r.render();
  }, []);

  // Mouse pan & zoom on canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let dragging = false, startX = 0, startY = 0, panSX = 0, panSY = 0;

    const onMouseDown = (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const r = rendererRef.current;
      if (r) { panSX = r.panX; panSY = r.panY; }
      el.classList.add('dragging');
    };
    const onMouseMove = (e) => {
      const r = rendererRef.current;
      if (dragging && r) {
        r.panX = panSX + (e.clientX - startX);
        r.panY = panSY + (e.clientY - startY);
        r.render();
      } else if (r && !dragging) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const idx = r.canvasToBitIndex(x, y);
        setHoverInfo(idx >= 0 ? r.getBitInfo(idx) : '');
      }
    };
    const onMouseUp = () => { dragging = false; el.classList.remove('dragging'); };
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
          <label className="speed-label" title="Playback speed (ms)">
            Speed
            <input
              type="number"
              className="speed-input"
              min={10}
              max={2000}
              step={10}
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Math.max(10, parseInt(e.target.value) || 100))}
            />
            ms
          </label>
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
          onStepClick={goToStep}
          width={panelWidth}
          onWidthChange={setPanelWidth}
        />

        <div className="canvas-area">
          <div className="canvas-container" ref={containerRef}>
            <canvas ref={canvasRef} />
          </div>
          {hoverInfo && <div className="hover-info">{hoverInfo}</div>}

          {/* Detail panel at the bottom of the canvas area */}
          <DetailPanel
            step={currentStepData}
            stepIndex={currentStep}
            open={detailOpen}
            onToggle={() => setDetailOpen(o => !o)}
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
      />
    </div>
  );
}

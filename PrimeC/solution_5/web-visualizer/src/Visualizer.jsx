import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SieveRenderer } from './SieveRenderer';
import StepPanel from './StepPanel';
import SettingsPanel from './SettingsPanel';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Sun, Moon, Settings
} from './Icons';

const DEFAULT_SETTINGS = {
  bitLayout: '8x1',
  byteLayout: '8x1',
  bitSpacingH: 0,
  bitSpacingV: 0,
  byteSpacingH: 1,
  byteSpacingV: 0,
  u64SpacingH: 2,
  u64SpacingV: 2,
};

export default function Visualizer({ trace, fileName, onClose }) {
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

  const bitStateRef = useRef(null);
  const playTimerRef = useRef(null);

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

    r.setState(bs, changedSet);
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.resize(rect.width, rect.height);
    }
    r.render();
    setCurrentStep(target);
  }, [currentStep, steps]);

  // Initial render
  useEffect(() => {
    if (steps.length > 0) goToStep(0);
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

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

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
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

  const currentStepData = steps[currentStep] || null;

  return (
    <div className="visualizer">
      {/* Header bar */}
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="btn-icon" onClick={onClose} title="Close file">✕</button>
          <span className="file-name">{fileName}</span>
          <span className="sieve-info">
            Sieve: {header.sieveSize.toLocaleString()} | Bits: {header.bitCount.toLocaleString()} | Steps: {header.stepCount} | v{header.version}
          </span>
        </div>
        <div className="toolbar-center">
          <button className="btn-icon" onClick={() => goToStep(0)} title="First (Home)"><SkipBack /></button>
          <button className="btn-icon" onClick={() => goToStep(currentStep - 1)} title="Previous (←)"><StepBack /></button>
          <button className="btn-icon" onClick={() => setPlaying(p => !p)} title="Play/Pause (Space)">
            {playing ? <Pause /> : <Play />}
          </button>
          <button className="btn-icon" onClick={() => goToStep(currentStep + 1)} title="Next (→)"><StepForward /></button>
          <button className="btn-icon" onClick={() => goToStep(steps.length - 1)} title="Last (End)"><SkipForward /></button>
          <input
            type="range"
            className="step-slider"
            min={0}
            max={Math.max(0, steps.length - 1)}
            value={currentStep}
            onChange={(e) => goToStep(parseInt(e.target.value))}
          />
          <span className="step-counter">{currentStep} / {steps.length - 1}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn-icon" onClick={() => doZoom(1.5)} title="Zoom In (+)"><ZoomIn /></button>
          <button className="btn-text" onClick={resetZoom} title="Reset Zoom (0)">{zoom.toFixed(1)}x</button>
          <button className="btn-icon" onClick={() => doZoom(1 / 1.5)} title="Zoom Out (−)"><ZoomOut /></button>
          <button className="btn-icon" onClick={exportPng} title="Export PNG"><Camera /></button>
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
          {currentStepData && (
            <div className="step-detail">
              <strong>Step {currentStep}</strong>
              {currentStepData.operation && (
                <span className="detail-tag op-tag">{currentStepData.operation}</span>
              )}
              {currentStepData.prime != null && (
                <span className="detail-tag prime-tag">prime: {currentStepData.prime}</span>
              )}
              {currentStepData.blockStart != null && currentStepData.blockStop != null && (
                <span className="detail-tag block-tag">
                  block: [{currentStepData.blockStart}–{currentStepData.blockStop}]
                </span>
              )}
              {currentStepData.factorStep != null && (
                <span className="detail-tag step-tag">step: {currentStepData.factorStep}</span>
              )}
              <span className="detail-changes">
                {currentStepData.numChanged} bits changed
              </span>
              <span className="detail-annotation">{currentStepData.annotation}</span>
            </div>
          )}
        </div>
      </div>

      <SettingsPanel
        settings={layoutSettings}
        onChange={setLayoutSettings}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

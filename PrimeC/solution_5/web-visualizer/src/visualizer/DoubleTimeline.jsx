import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  Play, Pause, SkipBack, StepBack, StepForward, SkipForward, Minus, Plus, Settings, Repeat,
} from '../Icons';
import { usePlaybackContext } from '../contexts/PlaybackContext';

const MIN_DETAIL_HEIGHT = 180;
const MAX_DETAIL_HEIGHT = 700;

/**
 * DoubleTimeline — backlog items 120-125.
 *
 * Three-zone horizontal control strip that sits above the detail panel.
 *
 *  LEFT   — waveform overview of all events (bits changed per event as bars).
 *           Click or drag to jump to a specific event.
 *  MIDDLE — draggable divider / transport cluster.
 *           Drag left/right to trade width between the two timelines.
 *           Drag up/down to expand/collapse the detail panel below.
 *  RIGHT  — animation scrubber for the current event.
 *           Blue background, white vertical-bar playhead. Click or drag to scrub.
 */
export default function DoubleTimeline({
  steps = [],
  currentStep = 0,
  stepScrubProgress = 0,
  seekStepAnimation,
  setStepScrubProgress,
  currentStepData = null,
  playing = false,
  isStepAnimRunning = false,
  isAnimationReplayPaused = false,
  isSingleEventLoopActive = false,
  isSingleEventRepeatEnabled = false,
  onToggleRepeat,
  handleStepAnimToggle,
  onOpenAnimationSettings,
  exporting = false,
  // Detail panel control (item 121)
  isDetailOpen = false,
  detailHeight = 200,
  onToggleDetail,
  onDetailHeightChange,
}) {
  const {
    goToStep,
    handlePlayPause,
    setPlaySpeedPercent,
    playSpeedPercent,
    isScrubbingTopRef,
  } = usePlaybackContext();

  // splitFraction: fraction of total width given to the LEFT timeline.
  const [splitFraction, setSplitFraction] = useState(0.5);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ── Canvas for the events waveform ──────────────────────────────────────────
  const waveCanvasRef = useRef(null);
  const waveContainerRef = useRef(null);
  const containerRef = useRef(null);

  // Pre-compute bar heights (normalised 0-1) from steps
  const barHeights = useMemo(() => {
    if (!steps.length) return [];
    const vals = steps.map((s) => Math.max(0, Number(s.numChanged) || 0));
    const max = Math.max(1, ...vals);
    return vals.map((v) => v / max);
  }, [steps]);

  // Draw waveform on canvas whenever size or data changes
  const drawWave = useCallback(() => {
    const canvas = waveCanvasRef.current;
    const container = waveContainerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const n = barHeights.length;
    if (n === 0) return;

    ctx.fillStyle = '#0e1b2e';
    ctx.fillRect(0, 0, width, height);

    const barW = width / n;
    const padFrac = barW > 3 ? 0.12 : 0;

    for (let i = 0; i < n; i++) {
      const h = barHeights[i] * (height - 2);
      const x = i * barW + barW * padFrac;
      const w = barW * (1 - 2 * padFrac);
      const y = height - h;
      const isActive = i === currentStep;
      const isPast = i < currentStep;
      if (isActive) {
        ctx.fillStyle = '#ffffff';
      } else if (isPast) {
        ctx.fillStyle = 'rgba(100,180,255,0.65)';
      } else {
        ctx.fillStyle = 'rgba(72,128,200,0.35)';
      }
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.round(h) || 1);
    }

    // White vertical playhead line (item 125)
    if (n > 0) {
      const px = (currentStep / Math.max(1, n - 1)) * width;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  }, [barHeights, currentStep]);

  useEffect(() => { drawWave(); }, [drawWave]);

  useEffect(() => {
    const el = waveContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => drawWave());
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawWave]);

  // ── Left timeline: click + drag to jump to event (item 125) ─────────────────
  const waveSeek = useCallback((e) => {
    const canvas = waveCanvasRef.current;
    if (!canvas || steps.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    goToStep(Math.round(frac * (steps.length - 1)));
  }, [goToStep, steps.length]);

  const handleWavePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    waveSeek(e);
  }, [waveSeek]);

  const handleWavePointerMove = useCallback((e) => {
    if (e.buttons !== 1) return;
    waveSeek(e);
  }, [waveSeek]);

  // ── Centre divider drag: horizontal = split; vertical = detail panel (items 121, 125, 130–133, 142) ──
  // item 142: use pointer events so touch works the same as mouse
  const handleDividerPointerDown = useCallback((e) => {
    // item 131: no preventDefault — buttons must still fire onClick
    const startX = e.clientX;
    const startY = e.clientY;
    const startFraction = splitFraction;
    const startDetailOpen = isDetailOpen;
    const startDetailHeight = detailHeight || MIN_DETAIL_HEIGHT;
    let isDragging = false;
    let openedByDrag = false;
    let closedByDrag = false;
    let lastH = startDetailHeight;

    const onMove = (ev) => {
      const container = containerRef.current;
      if (!container) return;
      const dx = ev.clientX - startX;
      const accY = startY - ev.clientY;

      // item 131: only start drag effects after 3px movement
      if (!isDragging) {
        if (Math.abs(dx) + Math.abs(accY) < 3) return;
        isDragging = true;
        // item 132: suppress ALL detail-panel transitions/animations during drag
        // (class on root affects newly-mounted elements too, unlike inline style)
        document.documentElement.classList.add('detail-drag-active');
      }

      // Horizontal — adjust split fraction
      const totalW = container.getBoundingClientRect().width;
      setSplitFraction(Math.max(0.15, Math.min(0.85, startFraction + dx / totalW)));

      // Vertical — 1:1 pixel tracking (items 139, 140: no snapping during drag; close at 0)
      if (!startDetailOpen) {
        // Panel was closed: open after tiny dead-zone, then track from scratch
        if (accY > 2 && !openedByDrag) {
          openedByDrag = true;
          onToggleDetail?.();
        }
        if (openedByDrag && !closedByDrag) {
          lastH = Math.max(0, Math.min(MAX_DETAIL_HEIGHT, accY));
          onDetailHeightChange?.(lastH);
          // item 140: if dragged back down below start, re-close
          if (accY <= 0) {
            closedByDrag = true;
            onToggleDetail?.();
          }
        }
      } else if (!closedByDrag) {
        const rawH = startDetailHeight + accY;
        // item 140: dragged all the way down — close the panel during drag
        if (rawH <= 0) {
          closedByDrag = true;
          onToggleDetail?.();
          return;
        }
        // item 139: track 1:1 without snapping
        lastH = Math.max(0, Math.min(MAX_DETAIL_HEIGHT, rawH));
        onDetailHeightChange?.(lastH);
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      // item 132: restore transitions/animations (class is idempotent to remove)
      document.documentElement.classList.remove('detail-drag-active');
      // item 139: spring-settle on release — transitions are now active again
      if (!isDragging) return;
      const panelOpen = (startDetailOpen || openedByDrag) && !closedByDrag;
      if (panelOpen) {
        if (lastH < 80) {
          // Too small — spring-close (CSS transition animates it shut)
          onToggleDetail?.();
        } else if (lastH < MIN_DETAIL_HEIGHT) {
          // Below min but not tiny — spring-snap up to minimum
          onDetailHeightChange?.(MIN_DETAIL_HEIGHT);
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [splitFraction, isDetailOpen, detailHeight, onToggleDetail, onDetailHeightChange]);

  // ── Right timeline: animation scrubber (items 122, 125, 138) ──────────────────────
  // item 138: attach to zone (not track) so playhead and click target span full zone height
  const animZoneRef = useRef(null);
  const animSeek = useCallback((e) => {
    const el = animZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setStepScrubProgress?.(frac * 100);
    seekStepAnimation?.(frac);
  }, [seekStepAnimation, setStepScrubProgress]);

  const handleAnimPointerDown = useCallback((e) => {
    if (isScrubbingTopRef) isScrubbingTopRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    animSeek(e);
  }, [isScrubbingTopRef, animSeek]);
  const handleAnimPointerMove = useCallback((e) => {
    if (e.buttons !== 1) return;
    animSeek(e);
  }, [animSeek]);
  const handleAnimPointerUp = useCallback((e) => {
    if (isScrubbingTopRef) isScrubbingTopRef.current = false;
    animSeek(e);
  }, [isScrubbingTopRef, animSeek]);

  const isAnimPlaying = (playing || isStepAnimRunning || isSingleEventLoopActive) && !isAnimationReplayPaused;
  const stepCount = steps.length;
  const canNavigate = stepCount > 0 && !exporting;

  return (
    <div
      ref={containerRef}
      className={`double-timeline${isCollapsed ? ' dtl-collapsed' : ''}`}
    >
      <div className="dtl-strip">

        {/* LEFT: events waveform */}
        <div
          className="dtl-zone dtl-wave-zone"
          style={{ flex: `${splitFraction} 1 0`, minWidth: 40 }}
          ref={waveContainerRef}
          onPointerDown={handleWavePointerDown}
          onPointerMove={handleWavePointerMove}
          onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
          title="Click or drag to jump to event"
          role="slider"
          aria-label="Events overview"
          aria-valuemin={0}
          aria-valuemax={stepCount - 1}
          aria-valuenow={currentStep}
        >
          <canvas ref={waveCanvasRef} className="dtl-wave-canvas" />
          <div className="dtl-wave-overlay">
            <span className="dtl-wave-label">Events</span>
            <span className="dtl-wave-counter">{currentStep}/{Math.max(0, stepCount - 1)}</span>
          </div>
        </div>

        {/* MIDDLE: transport + drag handle (item 131: entire zone is the drag handle) */}
        <div
          className="dtl-zone dtl-center-zone"
          onPointerDown={handleDividerPointerDown}
          title="Drag left/right to resize · Drag up/down to expand/collapse detail panel"
        >
          <div className="dtl-grip" />
          <div className="dtl-transport">
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(0)} disabled={!canNavigate} title="First event">
              <SkipBack size={10} />
            </button>
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(currentStep - 1)} disabled={!canNavigate} title="Previous event">
              <StepBack size={10} />
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.max(1, Math.round(v / 1.25)))} disabled={exporting} title="Slower">
              <Minus size={9} />
            </button>
            {/* Main play button — oversized per items 123, 128 */}
            <button className="dtl-btn dtl-play" onClick={handlePlayPause} disabled={exporting || stepCount === 0} title={playing ? 'Pause' : 'Play all events'}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.min(1600, Math.round(v * 1.25)))} disabled={exporting} title="Faster">
              <Plus size={9} />
            </button>
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(currentStep + 1)} disabled={!canNavigate} title="Next event">
              <StepForward size={10} />
            </button>
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(stepCount - 1)} disabled={!canNavigate} title="Last event">
              <SkipForward size={10} />
            </button>
          </div>
          <div className="dtl-center-actions">
            <button className="dtl-btn dtl-anim-play" onClick={handleStepAnimToggle} disabled={exporting} title={isAnimPlaying ? 'Pause animation' : 'Play animation'}>
              {isAnimPlaying ? <Pause size={10} /> : <Play size={10} />}
            </button>
            <button className="dtl-btn dtl-toggle-btn" onClick={() => setIsCollapsed((v) => !v)} title={isCollapsed ? 'Expand timeline' : 'Collapse timeline'}>
              {isCollapsed ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* RIGHT: animation scrubber — blue bg, white bar playhead (items 122, 124, 125, 135-138) */}
        {/* item 138: pointer handlers on zone so click/drag works over full height; playhead is absolute on zone */}
        <div
          ref={animZoneRef}
          className="dtl-zone dtl-anim-zone"
          style={{ flex: `${1 - splitFraction} 1 0`, minWidth: 40 }}
          onPointerDown={handleAnimPointerDown}
          onPointerMove={handleAnimPointerMove}
          onPointerUp={handleAnimPointerUp}
          onPointerCancel={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          title="Click or drag to scrub animation"
        >
          {/* White vertical bar playhead — absolute on zone so it spans full section height (item 138) */}
          <div
            className="dtl-anim-playhead"
            style={{ left: `${stepScrubProgress}%` }}
          />
          {/* Header row: [speed%] [Animation label] [progress] [replay] [gear] (items 137, 135, 136) */}
          <div className="dtl-anim-header">
            <div className="dtl-anim-header-left">
              {playSpeedPercent != null && (
                <span className="dtl-anim-speed">{playSpeedPercent}%</span>
              )}
              <span className="dtl-wave-label">Animation</span>
              <span className="dtl-wave-counter">{parseFloat(Number(stepScrubProgress).toFixed(1))}%</span>
            </div>
            {/* item 138: stop propagation so replay/gear clicks don't trigger a seek */}
            <div className="dtl-anim-header-right" onPointerDown={(e) => e.stopPropagation()}>
              {/* Replay toggle (item 135) */}
              <button
                className={`dtl-btn dtl-repeat-btn${isSingleEventRepeatEnabled ? ' dtl-active' : ''}`}
                onClick={onToggleRepeat}
                title={isSingleEventRepeatEnabled ? 'Loop: on — click to disable' : 'Loop: off — click to enable'}
              >
                <Repeat size={10} />
              </button>
              {/* Gear icon moved here from centre (item 136) */}
              {onOpenAnimationSettings && (
                <button className="dtl-btn dtl-gear" onClick={onOpenAnimationSettings} title="Animation settings">
                  <Settings size={10} />
                </button>
              )}
            </div>
          </div>
          <div className="dtl-anim-track" />
        </div>

      </div>
    </div>
  );
}

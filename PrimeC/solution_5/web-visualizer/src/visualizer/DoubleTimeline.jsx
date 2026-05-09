import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  Play, Pause, SkipBack, StepBack, StepForward, SkipForward, Minus, Plus, Repeat,
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
  // items 151/152: toggle all-events vs single-event in detail panel
  isAllEventsInDetailPanel = true,
  onToggleAllEventsPanel,
  // item 159: arrow toggles on left/right control side panels
  isEventsPanelCollapsed = false,
  onToggleEventsPanel,
  isSettingsCollapsed = false,
  onToggleSettingsPanel,
  // item 154: delay phase ms for fill+fade animation
  delayPhaseMs = 0,
  // item 155: hide/reveal detail panel header
  isDetailHeaderHidden = false,
  onHideDetailHeader,
  onRevealDetailHeader,
  // item 157: float/dock detail panel
  isDetailPanelFloating = false,
  onFloatDetailPanel,
  onDockDetailPanel,
  // item 163: undock/dock the timeline itself
  isTimelineUndocked = false,
  onUndockTimeline,
  onDockTimeline,
  // item 170: when undocked, show detail panel content inside the floating widget
  floatingPanelContent = null,
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

  // item 163: free-floating position when undocked (x/y relative to viewport)
  const [undockPos, setUndockPos] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    const h = typeof window !== 'undefined' ? window.innerHeight : 600;
    const floatW = Math.round(w * 0.6);
    return { x: Math.round((w - floatW) / 2), y: Math.round(h * 0.15) };
  });
  const undockPosRef = useRef(undockPos);
  // item 170: resizable when undocked
  const [undockSize, setUndockSize] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    return { width: Math.round(w * 0.6), height: 420 };
  });
  const undockSizeRef = useRef(undockSize);
  // item 170: toggle to show/hide the detail contents inside the floating widget
  const [floatingDetailVisible, setFloatingDetailVisible] = useState(true);

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
    // item 163: when undocked, grip drags the timeline position instead
    if (isTimelineUndocked) {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startPos = { ...undockPosRef.current };
      const onMove = (ev) => {
        const newPos = {
          x: startPos.x + ev.clientX - startX,
          y: Math.max(0, startPos.y + ev.clientY - startY),
        };
        undockPosRef.current = newPos;
        setUndockPos({ ...newPos });
        // Auto-dock when dragged to the very bottom of the screen
        if (ev.clientY > window.innerHeight - 80) {
          onDockTimeline?.();
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      return;
    }

    // item 131: no preventDefault — buttons must still fire onClick
    const startX = e.clientX;
    const startY = e.clientY;
    const startFraction = splitFraction;
    const startDetailOpen = isDetailOpen;
    const startDetailHeight = detailHeight || MIN_DETAIL_HEIGHT;
    let isDragging = false;
    let openedByDrag = false;
    let closedByDrag = false;
    let floatedByDrag = false;
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
          // item 155: reveal header when dragging up
          onRevealDetailHeader?.();
          onToggleDetail?.();
        }
        if (openedByDrag && !closedByDrag) {
          lastH = Math.max(0, Math.min(MAX_DETAIL_HEIGHT, accY));
          onDetailHeightChange?.(lastH);
          // item 140: if dragged back down below start, re-close
          if (accY <= 0) {
            closedByDrag = true;
            onToggleDetail?.();
            // item 155: hide header when dragged back down
            onHideDetailHeader?.();
          }
          // item 170: drag all the way up → undock the timeline widget
          if (!floatedByDrag && lastH >= MAX_DETAIL_HEIGHT) {
            floatedByDrag = true;
            onUndockTimeline?.();
          }
        }
      } else if (!closedByDrag) {
        const rawH = startDetailHeight + accY;
        // item 140: dragged all the way down — close the panel during drag
        if (rawH <= 0) {
          closedByDrag = true;
          onToggleDetail?.();
          // item 155: hide header when dragged all the way down
          onHideDetailHeader?.();
          return;
        }
        // item 170: drag all the way up → undock the timeline widget
        if (!floatedByDrag && rawH >= MAX_DETAIL_HEIGHT) {
          floatedByDrag = true;
          onUndockTimeline?.();
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
          // item 155: hide header when spring-closed
          onHideDetailHeader?.();
        } else if (lastH < MIN_DETAIL_HEIGHT) {
          // Below min but not tiny — spring-snap up to minimum
          onDetailHeightChange?.(MIN_DETAIL_HEIGHT);
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [isTimelineUndocked, onDockTimeline, onUndockTimeline, splitFraction, isDetailOpen, detailHeight, onToggleDetail, onDetailHeightChange, onHideDetailHeader, onRevealDetailHeader]);

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
  const isInDelayPhase = delayPhaseMs > 0;

  // item 156/158: event title shown as a bar ABOVE the strip
  const eventTitle = currentStepData ? [
    currentStepData.prime != null ? `Prime ${currentStepData.prime}` : null,
    `Event ${currentStepData.stepId ?? currentStep}`,
    currentStepData.operation || null,
  ].filter(Boolean).join(' | ') : '';

  // item 163: position container based on docked/undocked state
  const dockedBottom = isDetailPanelFloating ? 0 : (isDetailOpen ? (detailHeight || 0) : 0);
  const containerStyle = isTimelineUndocked
    ? {
        top: `${undockPos.y}px`,
        left: `${undockPos.x}px`,
        width: `${undockSize.width}px`,
        height: (floatingPanelContent && floatingDetailVisible) ? `${undockSize.height}px` : undefined,
      }
    : { bottom: `${dockedBottom}px` };

  // item 170: resize handlers for the floating widget
  const handleResizeStart = useCallback((direction, e) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...undockPosRef.current };
    const startSize = { ...undockSizeRef.current };

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newW = startSize.width;
      let newH = startSize.height;
      let newX = startPos.x;
      let newY = startPos.y;

      if (direction.includes('e')) newW = Math.max(320, startSize.width + dx);
      if (direction.includes('w')) { newW = Math.max(320, startSize.width - dx); newX = startPos.x + (startSize.width - newW); }
      if (direction.includes('s')) newH = Math.max(200, startSize.height + dy);
      if (direction.includes('n')) { newH = Math.max(200, startSize.height - dy); newY = Math.max(0, startPos.y + (startSize.height - newH)); }

      const newSize = { width: newW, height: newH };
      const newPosition = { x: newX, y: newY };
      undockSizeRef.current = newSize;
      undockPosRef.current = newPosition;
      setUndockSize({ ...newSize });
      setUndockPos({ ...newPosition });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`double-timeline${isCollapsed ? ' dtl-collapsed' : ''}${isDetailPanelFloating ? ' dtl-panel-floating' : ''}${isTimelineUndocked ? ' dtl-timeline-undocked' : ''}`}
      style={containerStyle}
    >
      {/* item 156/158/169/171: event title is now inside the center zone so it moves with the dragger */}
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
            {/* item 159: left arrow toggles the events panel (left sidebar) */}
            {onToggleEventsPanel && (
              <button
                className={`dtl-btn dtl-zone-toggle dtl-events-toggle${!isEventsPanelCollapsed ? ' dtl-active' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleEventsPanel(); }}
                onPointerDown={(e) => e.stopPropagation()}
                title={isEventsPanelCollapsed ? 'Show events panel' : 'Hide events panel'}
              >‹</button>
            )}
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
          {/* item 169/171: title floats above the center zone, moves with the dragger */}
          {eventTitle && (
            <div className="dtl-event-title-bar" title={eventTitle}>
              {eventTitle}
            </div>
          )}
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
            {/* item 163: undock button — pops timeline out as freely draggable */}
            {!isTimelineUndocked && onUndockTimeline && (
              <button
                className="dtl-btn dtl-undock-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const newPos = { x: Math.round(rect.left), y: Math.round(rect.top) };
                    undockPosRef.current = newPos;
                    setUndockPos(newPos);
                  }
                  onUndockTimeline();
                }}
                title="Detach timeline — drag to reposition"
              >⊞</button>
            )}
            {/* item 163: dock-back button — shown only when undocked */}
            {isTimelineUndocked && onDockTimeline && (
              <button
                className="dtl-btn dtl-undock-btn dtl-active"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDockTimeline(); }}
                title="Dock timeline back to bottom"
              >⊟</button>
            )}
            {/* item 170: toggle to show/hide detail contents when floating */}
            {isTimelineUndocked && floatingPanelContent && (
              <button
                className={`dtl-btn${floatingDetailVisible ? ' dtl-active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setFloatingDetailVisible((v) => !v); }}
                title={floatingDetailVisible ? 'Hide detail panel' : 'Show detail panel'}
              >{floatingDetailVisible ? '▼' : '▲'}</button>
            )}
          </div>
          {/* item 168: grip at bottom of center zone so dots appear inside the dragger, not above */}
          <div className="dtl-grip" />
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
          {/* item 154: fill bar that grows 0→100% and fades out during delay phase */}
          <div
            className={`dtl-anim-fill${isInDelayPhase ? ' dtl-anim-fill--fading' : ''}`}
            style={{ width: `${stepScrubProgress}%`, '--delay-ms': `${delayPhaseMs}ms` }}
          />
          {/* Header row: items 137, 135, 136; item 153: ANIMATION label right-aligned */}
          <div className="dtl-anim-header">
            <div className="dtl-anim-header-left">
              {playSpeedPercent != null && (
                <span className="dtl-anim-speed">{playSpeedPercent}%</span>
              )}
              <span className="dtl-wave-counter">{parseFloat(Number(stepScrubProgress).toFixed(1))}%</span>
            </div>
            {/* item 138: stop propagation so replay/toggle clicks don't trigger a seek */}
            <div className="dtl-anim-header-right" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onPointerCancel={(e) => e.stopPropagation()}>
              {/* item 153: ANIMATION label right-aligned */}
              <span className="dtl-wave-label dtl-anim-label">Animation</span>
              {/* Replay toggle (item 135) */}
              <button
                className={`dtl-btn dtl-repeat-btn${isSingleEventRepeatEnabled ? ' dtl-active' : ''}`}
                onClick={onToggleRepeat}
                title={isSingleEventRepeatEnabled ? 'Loop: on — click to disable' : 'Loop: off — click to enable'}
              >
                <Repeat size={10} />
              </button>
              {/* item 152/159: right arrow toggles the settings panel (right sidebar) */}
              {onToggleSettingsPanel && (
                <button
                  className={`dtl-btn dtl-zone-toggle dtl-anim-toggle${!isSettingsCollapsed ? ' dtl-active' : ''}`}
                  onClick={onToggleSettingsPanel}
                  title={isSettingsCollapsed ? 'Show settings panel' : 'Hide settings panel'}
                >›</button>
              )}
            </div>
          </div>
          <div className="dtl-anim-track" />
        </div>

      </div>
      {/* item 170: floating panel content (detail panel) shown when undocked */}
      {isTimelineUndocked && floatingDetailVisible && floatingPanelContent && (
        <div className="dtl-floating-panel-body">
          {floatingPanelContent}
        </div>
      )}
      {/* item 170: resize handles for the floating widget */}
      {isTimelineUndocked && (
        <>
          <div className="dtl-resize-handle dtl-resize-e" onPointerDown={(e) => handleResizeStart('e', e)} />
          <div className="dtl-resize-handle dtl-resize-w" onPointerDown={(e) => handleResizeStart('w', e)} />
          <div className="dtl-resize-handle dtl-resize-s" onPointerDown={(e) => handleResizeStart('s', e)} />
          <div className="dtl-resize-handle dtl-resize-n" onPointerDown={(e) => handleResizeStart('n', e)} />
          <div className="dtl-resize-handle dtl-resize-se" onPointerDown={(e) => handleResizeStart('se', e)} />
          <div className="dtl-resize-handle dtl-resize-sw" onPointerDown={(e) => handleResizeStart('sw', e)} />
          <div className="dtl-resize-handle dtl-resize-ne" onPointerDown={(e) => handleResizeStart('ne', e)} />
          <div className="dtl-resize-handle dtl-resize-nw" onPointerDown={(e) => handleResizeStart('nw', e)} />
        </>
      )}
    </div>
  );
}

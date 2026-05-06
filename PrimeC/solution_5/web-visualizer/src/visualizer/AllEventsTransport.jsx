import React, { useCallback } from 'react';
import { Play, Pause, SkipBack, StepBack, StepForward, SkipForward, Minus, Plus } from '../Icons';

/**
 * Compact all-events transport control for use inside the detail panel
 * when the joined widget has been dropped there.
 *
 * Mirrors the transport section of JoinedEventsWidget/EventsPanel so the
 * same CSS classes apply.
 */
export default function AllEventsTransport({
  currentStep,
  steps,
  playing,
  handlePlayPause,
  goToStep,
  exporting,
  isScrubbingTopRef,
  playSpeedPercent,
  setPlaySpeedPercent,
  onDismiss,
  onUndockByDrag,
}) {
  const handleDragStart = useCallback((e) => {
    if (!onUndockByDrag) return;
    if (e.target.closest('button') || e.target.closest('input')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragged = false;
    const onMove = (ev) => {
      if (!dragged && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 6) {
        dragged = true;
      }
    };
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!dragged) return;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!(hit && hit.closest && hit.closest('.detail-panel'))) {
        onUndockByDrag();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onUndockByDrag]);

  return (
    <div
      className="events-panel-transport detail-all-events-transport"
      onMouseDown={handleDragStart}
      title={onUndockByDrag ? 'Drag out of detail panel to undock' : undefined}
    >
      <div className="spt-row spt-row-nav">
        <button className="spt-btn" onClick={() => goToStep(0)} title="First event" disabled={exporting}><SkipBack size={12} /></button>
        <button className="spt-btn" onClick={() => goToStep(currentStep - 1)} title="Previous event" disabled={exporting}><StepBack size={12} /></button>
        {setPlaySpeedPercent && (
          <button className="spt-btn spt-speed" onClick={() => setPlaySpeedPercent((v) => Math.max(25, Math.round(v / 1.25)))} title="Slower" disabled={exporting}><Minus size={11} /></button>
        )}
        <button
          className="spt-btn spt-play"
          onClick={handlePlayPause}
          title={playing ? 'Pause playback' : 'Play all events'}
          disabled={exporting || !steps.length}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        {setPlaySpeedPercent && (
          <button className="spt-btn spt-speed" onClick={() => setPlaySpeedPercent((v) => Math.min(1600, Math.round(v * 1.25)))} title="Faster" disabled={exporting}><Plus size={11} /></button>
        )}
        <button className="spt-btn" onClick={() => goToStep(currentStep + 1)} title="Next event" disabled={exporting}><StepForward size={12} /></button>
        <button className="spt-btn" onClick={() => goToStep(steps.length - 1)} title="Last event" disabled={exporting}><SkipForward size={12} /></button>
        {setPlaySpeedPercent && playSpeedPercent != null && (
          <span className="spt-speed-label" title={`Playback speed: ${playSpeedPercent}% of normal`}>{playSpeedPercent}%</span>
        )}
        {onDismiss && (
          <button className="spt-btn detail-transport-dismiss" onClick={onDismiss} title="Move all-events controls back to floating widget">✕</button>
        )}
      </div>
      <div className="spt-row spt-row-timeline">
        <input
          type="range"
          className="spt-slider"
          min={0}
          max={Math.max(0, steps.length - 1)}
          value={currentStep}
          onChange={(e) => goToStep(parseInt(e.target.value, 10))}
          onPointerDown={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = true; }}
          onPointerUp={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          onPointerCancel={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          disabled={exporting}
          title={`Event ${currentStep} of ${steps.length - 1}`}
        />
        <span className="spt-counter">
          {currentStep}<span className="spt-total">/{steps.length - 1}</span>
        </span>
      </div>
    </div>
  );
}

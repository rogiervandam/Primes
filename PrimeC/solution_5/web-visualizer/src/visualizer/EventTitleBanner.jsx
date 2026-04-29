import React from 'react';

/**
 * Floating, draggable "current event" banner shown over the canvas.
 * Displays the current step heading, last/next-2 events, and any animation
 * sliders for the active step.
 *
 * Drag is implemented inline on `onMouseDown` because the title needs the
 * same gesture to also act as a click-to-open-events-panel affordance when
 * the pointer barely moves. The component itself is pure presentation —
 * the state setters belong to the visualizer.
 */
export default function EventTitleBanner({
  settings,
  setSettings,
  style,
  banner,
  surrounding,
  currentStepData,
  currentStep,
  goToStep,
  revealCurrentStepInPanel,
  stepsPanelCollapsed,
  setStepsPanelCollapsed,
  sliders,
}) {
  const handleMouseDown = (e) => {
    if (e.target.closest('input') || e.target.closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffX = settings.dragOffsetX || 0;
    const startOffY = settings.dragOffsetY || 0;
    let dragged = false;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) < 4) return;
      dragged = true;
      setSettings((prev) => ({
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
  };

  return (
    <div
      className="step-focus-banner position-center"
      title={banner.title}
      style={style}
      onMouseDown={handleMouseDown}
    >
      <button
        className="step-focus-close-btn"
        onClick={(e) => { e.stopPropagation(); setSettings((prev) => ({ ...prev, visible: false })); }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Hide event title — use the ▲ in the details panel to show it again"
      >▼</button>
      <button
        className="step-focus-locate-btn"
        onClick={(e) => { e.stopPropagation(); revealCurrentStepInPanel(); }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Reveal this event in the events panel (clears filters and expands parents)"
      >⤢</button>
      <div className="step-focus-lines">
        <div className="step-focus-line1">{banner.line1}</div>
        {banner.line2 && <div className="step-focus-line2">{banner.line2}</div>}
        {banner.line3 && <div className="step-focus-line3">{banner.line3}</div>}
      </div>
      {(surrounding.prev.length > 0 || surrounding.next.length > 0) && (
        <div
          className={`step-focus-context${settings.contextCollapsed ? ' collapsed' : ''}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="step-focus-context-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setSettings((prev) => ({ ...prev, contextCollapsed: !prev.contextCollapsed }));
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={settings.contextCollapsed ? 'Show nearby events' : 'Hide nearby events'}
          >
            <span className="step-focus-context-toggle-arrow">{settings.contextCollapsed ? '▶' : '▼'}</span>
            <span className="step-focus-context-toggle-label">Nearby events</span>
          </button>
          {!settings.contextCollapsed && (
            <div
              className="step-focus-context-rows"
              title="Last 2 and next 2 events. Click any row to jump to it."
            >
              {surrounding.prev.map((ev) => (
                <div
                  key={`prev-${ev.idx}`}
                  className="step-focus-context-row prev"
                  onClick={(e) => { e.stopPropagation(); goToStep(ev.idx); }}
                >
                  <span className="ctx-id">#{ev.eventId}</span>
                  <span className="ctx-op">{ev.op}</span>
                  {ev.meta && <span className="ctx-meta">{ev.meta}</span>}
                  {ev.bits > 0 && <span className="ctx-bits">+{ev.bits}b</span>}
                  {ev.elapsedLabel && <span className="ctx-time">{ev.elapsedLabel}</span>}
                </div>
              ))}
              <div className="step-focus-context-row current">
                <span className="ctx-id">#{currentStepData?.stepId ?? currentStep}</span>
                <span className="ctx-op">▶ current</span>
              </div>
              {surrounding.next.map((ev) => (
                <div
                  key={`next-${ev.idx}`}
                  className="step-focus-context-row next"
                  onClick={(e) => { e.stopPropagation(); goToStep(ev.idx); }}
                >
                  <span className="ctx-id">#{ev.eventId}</span>
                  <span className="ctx-op">{ev.op}</span>
                  {ev.meta && <span className="ctx-meta">{ev.meta}</span>}
                  {ev.bits > 0 && <span className="ctx-bits">+{ev.bits}b</span>}
                  {ev.elapsedLabel && <span className="ctx-time">{ev.elapsedLabel}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="step-focus-sliders">
        {sliders}
      </div>
    </div>
  );
}

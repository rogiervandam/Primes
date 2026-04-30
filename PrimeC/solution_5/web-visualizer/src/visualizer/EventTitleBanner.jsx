import React from 'react';
import { LinkIcon } from '../Icons';

const MAX_ANNOTATION_LINES = 3;

/**
 * Floating, draggable "current event" banner shown over the canvas.
 * Displays the current step heading, last/next-2 events, and any animation
 * sliders for the active step.
 *
 * Drag is implemented inline on `onMouseDown` because the title needs the
 * same gesture to also act as a click-to-open-events-panel affordance when
 * the pointer barely moves. The component itself is pure presentation —
 * the state setters belong to the visualizer.
 *
 * Drop-zone gestures while dragging:
 *   - left edge of the window → expand the events panel and hide the widget
 *   - bottom edge of the window → hide the widget (same as the ▼ button)
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
  eventsPanelCollapsed,
  setEventsPanelCollapsed,
  detailOpen,
  toggleDetailPanel,
  sliders,
  onJoinWidgets,
}) {
  const bannerRef = React.useRef(null);
  const [dropHint, setDropHint] = React.useState(null); // 'left' | 'bottom' | 'detail' | null
  const [showAllAnnotations, setShowAllAnnotations] = React.useState(false);

  // Hit-test the detail panel directly so the user can drop the widget on the
  // collapsed bottom bar without having to reach the very bottom of the
  // window. We temporarily hide the banner from hit testing while probing so
  // it doesn't shadow the detail panel underneath.
  const isOverDetailPanel = React.useCallback((clientX, clientY, bannerEl) => {
    if (typeof document === 'undefined') return false;
    const prevPE = bannerEl ? bannerEl.style.pointerEvents : null;
    if (bannerEl) bannerEl.style.pointerEvents = 'none';
    const el = document.elementFromPoint(clientX, clientY);
    if (bannerEl) bannerEl.style.pointerEvents = prevPE || '';
    return !!(el && el.closest && el.closest('.detail-panel'));
  }, []);

  const detectDropZone = React.useCallback((clientX, clientY, bannerEl) => {
    if (typeof window === 'undefined') return null;
    const LEFT_BAND = 80;
    const BOTTOM_BAND = 80;
    if (clientX <= LEFT_BAND) return 'left';
    if (isOverDetailPanel(clientX, clientY, bannerEl)) return 'detail';
    if (clientY >= window.innerHeight - BOTTOM_BAND) return 'bottom';
    // Check proximity to the floating all-events widget (join affordance).
    if (onJoinWidgets && eventsPanelCollapsed) {
      const floater = document.querySelector('.events-panel-floating-title');
      if (floater) {
        const r = floater.getBoundingClientRect();
        const HIT_PAD = 40;
        if (clientX >= r.left - HIT_PAD && clientX <= r.right + HIT_PAD &&
            clientY >= r.top - HIT_PAD && clientY <= r.bottom + HIT_PAD) {
          return 'joinWidget';
        }
      }
    }
    return null;
  }, [isOverDetailPanel, onJoinWidgets, eventsPanelCollapsed]);

  const handleMouseDown = (e) => {
    if (e.target.closest('input') || e.target.closest('button')) return;
    const bannerEl = bannerRef.current;
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffX = settings.dragOffsetX || 0;
    const startOffY = settings.dragOffsetY || 0;
    let dragged = false;
    let lastZone = null;
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
      const zone = detectDropZone(ev.clientX, ev.clientY, bannerEl);
      if (zone !== lastZone) {
        lastZone = zone;
        setDropHint(zone);
        // Visual merge hint on the all-events floater when dragging near it.
        const floater = document.querySelector('.events-panel-floating-title');
        if (floater) floater.classList.toggle('merge-target', zone === 'joinWidget');
      }
    };
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDropHint(null);
      // Remove merge-target hint from the floater.
      const floater = document.querySelector('.events-panel-floating-title');
      if (floater) floater.classList.remove('merge-target');
      if (!dragged) {
        // Click without drag: open the Events panel.
        if (eventsPanelCollapsed) setEventsPanelCollapsed(false);
        return;
      }
      const zone = detectDropZone(ev.clientX, ev.clientY, bannerEl);
      if (zone === 'joinWidget' && onJoinWidgets) {
        // The banner was dropped onto the all-events floater: join them.
        // Pass the banner's current screen rect so the joined widget can
        // anchor its bottom-left corner to the same position.
        const bannerRect = bannerEl ? bannerEl.getBoundingClientRect() : null;
        // Reset drag offset so the banner re-appears at its default position
        // when the widgets are later split.
        setSettings((prev) => ({ ...prev, dragOffsetX: 0, dragOffsetY: 0 }));
        onJoinWidgets(bannerRect);
        return;
      }
      if (zone === 'left') {
        // Snap drag offset back so the banner returns to its anchor next time.
        setSettings((prev) => ({
          ...prev,
          dragOffsetX: 0,
          dragOffsetY: 0,
          visible: false,
        }));
        if (eventsPanelCollapsed) setEventsPanelCollapsed(false);
      } else if (zone === 'detail') {
        // Drop into the detail panel: expand it (if collapsed) and hide the
        // floating widget — the detail panel itself surfaces the event info.
        setSettings((prev) => ({
          ...prev,
          dragOffsetX: 0,
          dragOffsetY: 0,
          visible: false,
        }));
        if (!detailOpen && toggleDetailPanel) toggleDetailPanel();
      } else if (zone === 'bottom') {
        setSettings((prev) => ({
          ...prev,
          dragOffsetX: 0,
          dragOffsetY: 0,
          visible: false,
        }));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  return (
    <div
      ref={bannerRef}
      className={`step-focus-banner position-center${dropHint ? ` dropping dropping-${dropHint}` : ''}`}
      title={banner.title}
      style={style}
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
      ><LinkIcon size={12} /></button>
      {/* The drag handle covers the title + annotation + bits-changed area.
          The context rows and sliders below are interactive and not draggable. */}
      <div className="step-focus-drag-handle" onMouseDown={handleMouseDown}>
      <div className="step-focus-lines">
        <div className="step-focus-line1">{banner.line1}</div>
        {(() => {
          const lines = banner.annotationLines || [];
          const hasContent = lines.length > 0;
          const displayLines = showAllAnnotations ? lines : lines.slice(0, MAX_ANNOTATION_LINES);
          const paddedLines = showAllAnnotations ? displayLines : [...displayLines];
          if (!showAllAnnotations) {
            // while (paddedLines.length < MAX_ANNOTATION_LINES) paddedLines.push('\u00A0');
          }
          return (
            <div
              className={`step-focus-annotation-area${hasContent ? ' expandable' : ''}${showAllAnnotations ? ' expanded' : ''}`}
              title={hasContent ? (showAllAnnotations ? 'Click to collapse annotation' : 'Click to expand annotation') : undefined}
            >
              <div className='step-focus-annotation-line2'>{banner.annotationLines}</div>
            </div>
          );
        })()}
        {(banner.bitsChanged > 0) && (
          <div className="step-focus-line3">+{banner.bitsChanged} bits changed</div>
        )}
        {!(banner.bitsChanged > 0) && (
          <div className="step-focus-line3 step-focus-line3-empty">{'\u00A0'}</div>
        )}
      </div>
      </div>{/* end .step-focus-drag-handle */}
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

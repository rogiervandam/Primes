import React from 'react';
import { LinkIcon } from '../Icons';
import { isDOMAvailable, isWindowAvailable, getWindowSize, getElementFromPoint } from '../lib/browser.js';

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
  isEventsPanelCollapsed,
  setIsEventsPanelCollapsed,
  isDetailOpen,
  detailHeight = 280,
  toggleDetailPanel,
  externalDragStart,
  onConsumeExternalDragStart,
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
    if (!isDOMAvailable()) return false;
    const prevPE = bannerEl ? bannerEl.style.pointerEvents : null;
    if (bannerEl) bannerEl.style.pointerEvents = 'none';
    const el = getElementFromPoint(clientX, clientY);
    if (bannerEl) bannerEl.style.pointerEvents = prevPE || '';
    return !!(el && el.closest && el.closest('.detail-panel'));
  }, []);

  const getMinDragOffsetY = React.useCallback(() => {
    if (!isWindowAvailable()) return -9999;
    const el = bannerRef.current;
    const h = el ? el.offsetHeight : 220;
    // top = windowH - 20 - h + oy >= 4  => oy >= 24 + h - windowH
    return 24 + h - window.innerHeight;
  }, []);

  const getMaxDragOffsetY = React.useCallback(() => {
    if (!isWindowAvailable()) return 9999;
    const panelBottom = isDetailOpen ? detailHeight : 36;
    const SAFE_GAP = 8;
    // bottom edge = windowH - 20 + oy <= windowH - panelBottom - SAFE_GAP
    return 20 - panelBottom - SAFE_GAP;
  }, [isDetailOpen, detailHeight]);

  const clampDragOffsetY = React.useCallback((oy) => {
    const minY = getMinDragOffsetY();
    const maxY = getMaxDragOffsetY();
    return Math.max(minY, Math.min(maxY, oy));
  }, [getMaxDragOffsetY, getMinDragOffsetY]);

  const detectDropZone = React.useCallback((clientX, clientY, bannerEl) => {
    if (!isWindowAvailable()) return null;
    const LEFT_BAND = 80;
    const BOTTOM_BAND = 80;
    if (clientX <= LEFT_BAND) return 'left';
    if (isOverDetailPanel(clientX, clientY, bannerEl)) return 'detail';
    if (clientY >= window.innerHeight - BOTTOM_BAND) return 'bottom';
    // Check proximity to the floating all-events widget (join affordance).
    if (onJoinWidgets && isEventsPanelCollapsed) {
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
  }, [isOverDetailPanel, onJoinWidgets, isEventsPanelCollapsed]);

  const startDrag = React.useCallback((startClientX, startClientY, fromExternal = false) => {
    const bannerEl = bannerRef.current;
    const startX = startClientX;
    const startY = startClientY;
    const startOffX = settings.dragOffsetX || 0;
    const startOffY = clampDragOffsetY(settings.dragOffsetY || 0);
    let dragged = false;
    let lastZone = null;
    let finalX = startOffX;
    let finalY = startOffY;
    // Suppress CSS transition during drag so Safari doesn't re-animate each
    // incremental transform update (which causes visible shaking).
    if (bannerEl) bannerEl.classList.add('is-dragging');
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) < 4) return;
      dragged = true;
      finalX = startOffX + dx;
      finalY = clampDragOffsetY(startOffY + dy);
      // Direct DOM mutation — bypasses the React re-render cascade through
      // setSettings → parent useMemo → style prop so the CSS transition never
      // fires during the drag. State is persisted once on mouseup instead.
      if (bannerEl) bannerEl.style.transform = `translate(${finalX}px, ${finalY}px)`;
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
      if (bannerEl) bannerEl.classList.remove('is-dragging');
      setDropHint(null);
      // Remove merge-target hint from the floater.
      const floater = document.querySelector('.events-panel-floating-title');
      if (floater) floater.classList.remove('merge-target');
      if (!dragged) {
        // Click without drag: open the Events panel.
        if (!fromExternal && isEventsPanelCollapsed) setIsEventsPanelCollapsed(false);
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
        if (isEventsPanelCollapsed) setIsEventsPanelCollapsed(false);
      } else if (zone === 'detail') {
        // Drop into the detail panel: expand it (if collapsed) and hide the
        // floating widget — the detail panel itself surfaces the event info.
        setSettings((prev) => ({
          ...prev,
          dragOffsetX: 0,
          dragOffsetY: 0,
          visible: false,
        }));
        if (!isDetailOpen && toggleDetailPanel) toggleDetailPanel();
      } else if (zone === 'bottom') {
        setSettings((prev) => ({
          ...prev,
          dragOffsetX: 0,
          dragOffsetY: 0,
          visible: false,
        }));
      } else {
        // No drop zone — persist the final drag position to React state.
        setSettings((prev) => ({
          ...prev,
          dragOffsetX: finalX,
          dragOffsetY: finalY,
        }));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [clampDragOffsetY, detectDropZone, isDetailOpen, isEventsPanelCollapsed, isOverDetailPanel, onJoinWidgets, setIsEventsPanelCollapsed, setSettings, settings.dragOffsetX, settings.dragOffsetY, toggleDetailPanel]);

  const handleMouseDown = (e) => {
    if (
      e.target.closest('input')
      || e.target.closest('button')
      || e.target.closest('.step-focus-play-btn')
      || e.target.closest('.step-focus-timeline-wrap')
      || e.target.closest('.step-focus-gear-btn')
    ) return;
    startDrag(e.clientX, e.clientY, false);
    e.preventDefault();
  };

  // If the detail panel slider starts a drag-out gesture, consume it here and
  // continue as a normal banner drag.
  React.useEffect(() => {
    if (!externalDragStart) return;
    if (!bannerRef.current) return;
    startDrag(externalDragStart.x, externalDragStart.y, true);
    onConsumeExternalDragStart?.();
  }, [externalDragStart, onConsumeExternalDragStart, startDrag]);

  // Keep the banner vertically clamped when detail panel state changes.
  React.useLayoutEffect(() => {
    const currentY = Number.isFinite(settings.dragOffsetY) ? settings.dragOffsetY : 0;
    const clampedY = clampDragOffsetY(currentY);
    if (clampedY !== currentY) {
      setSettings((prev) => ({ ...prev, dragOffsetY: clampedY }));
    }
  }, [clampDragOffsetY, detailHeight, isDetailOpen, setSettings, settings.dragOffsetY]);

  const renderAnnotation = (extraClass = '') => {
    const lines = banner.annotationLines || [];
    const isExpandable = lines.length > MAX_ANNOTATION_LINES;
    const displayLines = showAllAnnotations ? lines : lines.slice(0, MAX_ANNOTATION_LINES);
    const paddedLines = showAllAnnotations ? displayLines : [...displayLines];
    return (
      <div
        className={`step-focus-annotation-area${extraClass ? ` ${extraClass}` : ''}${isExpandable ? ' expandable' : ''}${showAllAnnotations && isExpandable ? ' expanded' : ''}`}
        onClick={isExpandable ? (e) => { e.stopPropagation(); setShowAllAnnotations((v) => !v); } : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        title={isExpandable ? (showAllAnnotations ? 'Click to collapse annotation' : 'Click to expand annotation') : undefined}
      >
        {paddedLines.map((line, i) => (
          <div key={i} className={`step-focus-annotation-line${i === 0 ? ' line2' : ''}`}>{line}</div>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={bannerRef}
      className={`step-focus-banner position-center${dropHint ? ` dropping dropping-${dropHint}` : ''}`}
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
      ><LinkIcon size={12} /></button>
      <button
        className={`step-focus-context-mode-btn${settings?.nearbyEventsMode ? ' active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setSettings((prev) => ({ ...prev, nearbyEventsMode: !prev.nearbyEventsMode }));
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title={settings?.nearbyEventsMode ? 'Show event title' : 'Show nearby events instead of title'}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
          <line x1="1" y1="3" x2="11" y2="3"/>
          <line x1="1" y1="6" x2="11" y2="6"/>
          <line x1="1" y1="9" x2="11" y2="9"/>
        </svg>
      </button>
      {/* The drag handle covers the title + annotation + bits-changed area.
          The context rows and sliders below are interactive and not draggable. */}
      <div className="step-focus-drag-handle">
      {!settings?.nearbyEventsMode && (
        <div key={currentStep} className="step-focus-lines">
          <div className="step-focus-line1">{banner.line1}</div>
          {renderAnnotation()}
          {(banner.bitsChanged > 0) && (
            <div className="step-focus-line3">+{banner.bitsChanged} bits changed</div>
          )}
          {!(banner.bitsChanged > 0) && (
            <div className="step-focus-line3 step-focus-line3-empty">{'\u00A0'}</div>
          )}
        </div>
      )}
      </div>{/* end .step-focus-drag-handle */}
      {(surrounding.prev.length > 0 || surrounding.next.length > 0) && (
        <div
          className={`step-focus-context${!settings?.nearbyEventsMode && settings.contextCollapsed ? ' collapsed' : ''}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!settings?.nearbyEventsMode && (
            <div className="step-focus-context-header">
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
            </div>
          )}
          {(settings?.nearbyEventsMode || !settings.contextCollapsed) && (
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
              <div className={`step-focus-context-row current${settings?.nearbyEventsMode ? ' nearby-mode' : ''}`}>
                <span className="ctx-id">#{currentStepData?.stepId ?? currentStep}</span>
                <span className="ctx-op ctx-op-current">
                  <span className="ctx-play-icon">▶</span>
                  <span className="step-focus-line1 ctx-current-title">{banner?.line1}</span>
                </span>
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
          {settings?.nearbyEventsMode && renderAnnotation('step-focus-annotation-under-context')}
        </div>
      )}
      <div className="step-focus-sliders">
        {sliders}
      </div>
    </div>
  );
}

import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { isDOMAvailable, isWindowAvailable, getElementFromPoint } from '../lib/browser.js';
import PlaybackTransport from './PlaybackTransport';
import JoinedWidgetHeader from './JoinedWidgetHeader';
import { usePlaybackContext } from '../contexts/PlaybackContext';
import { usePanelLayoutContext } from '../contexts/PanelLayoutContext';

const MAX_ANNOTATION_LINES = 3;

/**
 * JoinedEventsWidget — a merged version of the floating "all events" transport
 * widget (from EventsPanel) and the single-event EventTitleBanner.
 *
 * Shown when `areWidgetsJoined` is true and the events panel is collapsed.
 * The widget is draggable and contains a split button to separate the two
 * widgets again.
 *
 * Position is stored in `settings.dragOffsetX/Y` (the same slot used by
 * EventTitleBanner) so it persists across sessions.
 */
export default function JoinedEventsWidget(props) {
  const bannerState = props.bannerState;
  const widgetHandlers = props.widgetHandlers;

  // Banner props (from single-event widget)
  const settings = bannerState.settings;
  const setSettings = bannerState.setSettings;
  const banner = bannerState.banner;
  const surrounding = bannerState.surrounding;
  const currentStepData = bannerState.currentStepData;
  const revealCurrentStepInPanel = bannerState.revealCurrentStepInPanel;
  const sliders = bannerState.sliders;
  const initialBannerRect = bannerState.initialBannerRect;

  // Interaction handlers
  const onPushToEventsPanel = widgetHandlers.onPushToEventsPanel;
  const onPushToDetailPanel = widgetHandlers.onPushToDetailPanel;
  const onSplitWidgets = widgetHandlers.onSplitWidgets;
  const onHideWidget = widgetHandlers.onHideWidget;
  const onNavigate = widgetHandlers.onNavigate;

  const {
    currentStep,
    steps,
    goToStep,
    playing,
    handlePlayPause,
    exporting,
    isScrubbingTopRef,
    playSpeedPercent,
    setPlaySpeedPercent,
  } = usePlaybackContext();
  const {
    isDetailOpen,
    detailHeight,
  } = usePanelLayoutContext();

  const [isSplitting, setIsSplitting] = useState(false);
  const [dropHint, setDropHint] = useState(null);
  const [showAllAnnotations, setShowAllAnnotations] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    const text = banner?.title || '';
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => {/* ignore */});
  }, [banner?.title]);

  // Compute the initial horizontal offset so the joined widget's left edge
  // aligns with the EventTitleBanner's left edge at the time of joining.
  // The y-offset is corrected after mount (useLayoutEffect) to pin the
  // bottom-left, since widget height is unknown before first render.
  const WIDGET_WIDTH = 520; // matches CSS min-width / max-width
  const TOP_OFFSET = 56;    // matches .joined-events-widget { top: 56px }
  // Compute the maximum Y offset allowed so the widget doesn't cover the detail panel.
  const getMaxY = useCallback(() => {
    if (!isWindowAvailable()) return 9999;
    const panelBottom = isDetailOpen ? detailHeight : 36; // 36 = collapsed detail header height
    const SAFE_GAP = 8;
    const widgetH = widgetRef.current ? widgetRef.current.offsetHeight : 300;
    return window.innerHeight - TOP_OFFSET - widgetH - panelBottom - SAFE_GAP;
  }, [isDetailOpen, detailHeight]);
  const computeInitialDragX = () => {
    if (!initialBannerRect || !isWindowAvailable()) return 0;
    return initialBannerRect.left - (window.innerWidth / 2 - WIDGET_WIDTH / 2);
  };

  const floatDragRef = useRef({ x: computeInitialDragX(), y: 0 });
  const [floatDrag, setFloatDrag] = useState({ x: computeInitialDragX(), y: 0 });
  const widgetRef = useRef(null);

  const isOverDetailPanel = useCallback((clientX, clientY, widgetEl) => {
    if (!isDOMAvailable()) return false;
    const prevPE = widgetEl ? widgetEl.style.pointerEvents : null;
    if (widgetEl) widgetEl.style.pointerEvents = 'none';
    const el = getElementFromPoint(clientX, clientY);
    if (widgetEl) widgetEl.style.pointerEvents = prevPE || '';
    return !!(el && el.closest && el.closest('.detail-panel'));
  }, []);

  const detectDropZone = useCallback((clientX, clientY, widgetEl) => {
    if (!isWindowAvailable()) return null;
    if (clientX <= 80) return 'left';
    if (onPushToDetailPanel && isOverDetailPanel(clientX, clientY, widgetEl)) return 'detail';
    return null;
  }, [isOverDetailPanel, onPushToDetailPanel]);
  // sits at the same screen position as the banner's bottom-left corner.
  useLayoutEffect(() => {
    if (!initialBannerRect || !widgetRef.current) return;
    const widgetHeight = widgetRef.current.offsetHeight;
    const targetTop = initialBannerRect.bottom - widgetHeight;
    const y = targetTop - TOP_OFFSET;
    // Clamp so the widget doesn't go above the toolbar or below the detail panel.
    const maxY = getMaxY();
    const clampedY = Math.max(4 - TOP_OFFSET, Math.min(maxY, y));
    const next = { x: floatDragRef.current.x, y: clampedY };
    floatDragRef.current = next;
    setFloatDrag(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — initialBannerRect is stable for this instance

  // Re-clamp Y when the detail panel opens/closes or resizes.
  useLayoutEffect(() => {
    if (!widgetRef.current) return;
    const maxY = getMaxY();
    if (floatDragRef.current.y > maxY) {
      const next = { x: floatDragRef.current.x, y: maxY };
      floatDragRef.current = next;
      setFloatDrag({ ...next });
    }
  }, [isDetailOpen, detailHeight, getMaxY]);

  const handleDragStart = useCallback((e) => {
    if (e.target.closest('input') || e.target.closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startDrag = { ...floatDragRef.current };
    let dragged = false;
    let lastZone = null;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) < 4) return;
      dragged = true;
      const maxY = getMaxY();
      const next = { x: startDrag.x + dx, y: Math.min(maxY, startDrag.y + dy) };
      floatDragRef.current = next;
      setFloatDrag({ ...next });
      const zone = detectDropZone(ev.clientX, ev.clientY, widgetRef.current);
      if (zone !== lastZone) {
        lastZone = zone;
        setDropHint(zone);
      }
    };
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDropHint(null);
      const zone = detectDropZone(ev.clientX, ev.clientY, widgetRef.current);
      if (dragged && zone === 'left' && onPushToEventsPanel) {
        onPushToEventsPanel();
        return;
      }
      if (dragged && zone === 'detail' && onPushToDetailPanel) {
        onPushToDetailPanel();
        return;
      }
      // Persist position so EventTitleBanner reappears here after split.
      setSettings((prev) => ({
        ...prev,
        dragOffsetX: floatDragRef.current.x,
        dragOffsetY: floatDragRef.current.y,
      }));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  }, [detectDropZone, onPushToDetailPanel, onPushToEventsPanel, setSettings]);

  const handleSplit = useCallback((e) => {
    e.stopPropagation();
    setIsSplitting(true);
    setTimeout(() => {
      onSplitWidgets();
    }, 320);
  }, [onSplitWidgets]);

  const handleExpandPanel = useCallback((e) => {
    e.stopPropagation();
    if (onPushToEventsPanel) {
      onPushToEventsPanel();
      return;
    }
    onSplitWidgets();
  }, [onPushToEventsPanel, onSplitWidgets]);

  return (
    <div
      ref={widgetRef}
      className={`joined-events-widget${isSplitting ? ' is-splitting' : ''}${dropHint ? ` dropping dropping-${dropHint}` : ''}`}
      style={{ transform: `translateX(calc(-50% + ${floatDrag.x}px)) translateY(${floatDrag.y}px)` }}
      onMouseDown={handleDragStart}
    >
      <JoinedWidgetHeader
        settings={settings}
        setSettings={setSettings}
        surrounding={surrounding}
        copied={copied}
        handleCopy={handleCopy}
        handleExpandPanel={handleExpandPanel}
        handleSplit={handleSplit}
        revealCurrentStepInPanel={revealCurrentStepInPanel}
        onHideWidget={onHideWidget}
      />

      {/* ── Transport controls ──────────────────────────────────────── */}
      <PlaybackTransport variant="compact" onNavigate={onNavigate} />

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="joined-widget-divider" />

      {/* ── Single-event content ────────────────────────────────────── */}
      <div className="joined-widget-event" onMouseDown={(e) => {
        // Allow dragging the widget from the "Animation" label.
        if (e.target.closest('.step-focus-slider-label')) return;
        e.stopPropagation();
      }}>
        {/* In nearby-events mode, the title block is replaced by the context rows */}
        {!settings?.nearbyEventsMode && (
          <div className="step-focus-lines">
          <div className="step-focus-line1">{banner?.line1}</div>
          {(() => {
            const lines = banner?.annotationLines || [];
            const hasContent = lines.length > 0;
            const displayLines = showAllAnnotations ? lines : lines.slice(0, MAX_ANNOTATION_LINES);
            const paddedLines = showAllAnnotations ? displayLines : [...displayLines];
            if (!showAllAnnotations) {
              while (paddedLines.length < MAX_ANNOTATION_LINES) paddedLines.push('\u00A0');
            }
            return (
              <div
                className={`step-focus-annotation-area${hasContent ? ' expandable' : ''}${showAllAnnotations ? ' expanded' : ''}`}
                onClick={hasContent ? (e) => { e.stopPropagation(); setShowAllAnnotations((v) => !v); } : undefined}
                onMouseDown={(e) => e.stopPropagation()}
                title={hasContent ? (showAllAnnotations ? 'Click to collapse' : 'Click to expand') : undefined}
              >
                {paddedLines.map((line, i) => (
                  <div key={i} className={`step-focus-annotation-line${i === 0 ? ' line2' : ''}`}>{line}</div>
                ))}
              </div>
            );
          })()}
          {banner?.bitsChanged > 0
            ? <div className="step-focus-line3">+{banner.bitsChanged} bits changed</div>
            : <div className="step-focus-line3 step-focus-line3-empty">{'\u00A0'}</div>
          }
        </div>
        )}

        {(surrounding?.prev?.length > 0 || surrounding?.next?.length > 0) && (
          <div
            className={`step-focus-context${!settings?.nearbyEventsMode && settings?.contextCollapsed ? ' collapsed' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {!settings?.nearbyEventsMode && (
              <button
                className="step-focus-context-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setSettings((prev) => ({ ...prev, contextCollapsed: !prev.contextCollapsed }));
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title={settings?.contextCollapsed ? 'Show nearby events' : 'Hide nearby events'}
              >
                <span className="step-focus-context-toggle-arrow">{settings?.contextCollapsed ? '▶' : '▼'}</span>
                <span className="step-focus-context-toggle-label">Nearby events</span>
              </button>
            )}
            {(settings?.nearbyEventsMode || !settings?.contextCollapsed) && (
              <div className="step-focus-context-rows">
                {surrounding.prev.map((ev) => (
                  <div key={`prev-${ev.idx}`} className="step-focus-context-row prev"
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
                  <span className="ctx-op ctx-op-current">
                    <span className="ctx-play-icon">▶</span>
                    <span className="step-focus-line1 ctx-current-title">{banner?.line1}</span>
                  </span>
                </div>
                {surrounding.next.map((ev) => (
                  <div key={`next-${ev.idx}`} className="step-focus-context-row next"
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
    </div>
  );
}

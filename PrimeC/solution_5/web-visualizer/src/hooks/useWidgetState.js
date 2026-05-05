/**
 * useWidgetState — owns floating-widget and overlay-panel visibility state.
 *
 * Owns:
 *  - allEventsWidgetHidden / singleEventWidgetRevealed
 *  - allEventsInDetailPanel / widgetsJoined
 *  - joinBannerRect / pendingBannerDragStart
 *  - revealStepRequest
 *  - timingPanelOpen / timingFocusOp
 *  - detailInspectorOpen / detailInspectorMode / detailInspectorQuery
 *
 * @param {{ initialPrefs: object }} params
 */
import { useState } from 'react';

export function useWidgetState({ initialPrefs }) {
  // When true, the floating all-events widget is hidden (e.g. after docking
  // to the top bar). Reset when the events panel is collapsed again.
  const [allEventsWidgetHidden, setAllEventsWidgetHidden] = useState(initialPrefs.allEventsWidgetHidden);
  // Hidden until the user first hits play or selects an event.
  const [singleEventWidgetRevealed, setSingleEventWidgetRevealed] = useState(false);
  // When true, the all-events transport is shown inside the detail panel.
  const [allEventsInDetailPanel, setAllEventsInDetailPanel] = useState(initialPrefs.allEventsInDetailPanel);
  // When true, the all-events widget and single-event banner are joined.
  const [widgetsJoined, setWidgetsJoined] = useState(
    (initialPrefs.widgetsJoined === true && initialPrefs.eventsPanelCollapsed === true)
      ? true
      : false,
  );
  // Stores the EventTitleBanner DOMRect at the moment of joining.
  const [joinBannerRect, setJoinBannerRect] = useState(null);
  // One-shot drag-start request for EventTitleBanner.
  const [pendingBannerDragStart, setPendingBannerDragStart] = useState(null);

  // Bumped whenever the user asks to reveal the current event in the events panel.
  const [revealStepRequest, setRevealStepRequest] = useState(0);

  const [timingPanelOpen, setTimingPanelOpen] = useState(false);
  const [timingFocusOp, setTimingFocusOp] = useState('');

  const [detailInspectorOpen, setDetailInspectorOpen] = useState(false);
  const [detailInspectorMode, setDetailInspectorMode] = useState('bits');
  const [detailInspectorQuery, setDetailInspectorQuery] = useState('');

  return {
    allEventsWidgetHidden, setAllEventsWidgetHidden,
    singleEventWidgetRevealed, setSingleEventWidgetRevealed,
    allEventsInDetailPanel, setAllEventsInDetailPanel,
    widgetsJoined, setWidgetsJoined,
    joinBannerRect, setJoinBannerRect,
    pendingBannerDragStart, setPendingBannerDragStart,
    revealStepRequest, setRevealStepRequest,
    timingPanelOpen, setTimingPanelOpen,
    timingFocusOp, setTimingFocusOp,
    detailInspectorOpen, setDetailInspectorOpen,
    detailInspectorMode, setDetailInspectorMode,
    detailInspectorQuery, setDetailInspectorQuery,
  };
}

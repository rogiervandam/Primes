/**
 * useWidgetState — owns floating-widget and overlay-panel visibility state.
 *
 * Owns:
 *  - isAllEventsWidgetHidden / isSingleEventWidgetRevealed
 *  - isAllEventsInDetailPanel / areWidgetsJoined
 *  - joinBannerRect / pendingBannerDragStart
 *  - revealStepRequest
 *  - isTimingPanelOpen / timingFocusOp
 *  - isDetailInspectorOpen / detailInspectorMode / detailInspectorQuery
 *
 * @param {{ initialPrefs: object }} params
 */
import { useState } from 'react';

export function useWidgetState({ initialPrefs }) {
  // When true, the floating all-events widget is hidden (e.g. after docking
  // to the top bar). Reset when the events panel is collapsed again.
  const [isAllEventsWidgetHidden, setIsAllEventsWidgetHidden] = useState(initialPrefs.isAllEventsWidgetHidden);
  // Hidden until the user first hits play or selects an event.
  const [isSingleEventWidgetRevealed, setIsSingleEventWidgetRevealed] = useState(false);
  // When true, the all-events transport is shown inside the detail panel.
  const [isAllEventsInDetailPanel, setIsAllEventsInDetailPanel] = useState(initialPrefs.isAllEventsInDetailPanel);
  // When true, the all-events widget and single-event banner are joined.
  const [areWidgetsJoined, setAreWidgetsJoined] = useState(
    (initialPrefs.areWidgetsJoined === true && initialPrefs.isEventsPanelCollapsed === true)
      ? true
      : false,
  );
  // Stores the EventTitleBanner DOMRect at the moment of joining.
  const [joinBannerRect, setJoinBannerRect] = useState(null);
  // One-shot drag-start request for EventTitleBanner.
  const [pendingBannerDragStart, setPendingBannerDragStart] = useState(null);

  // Bumped whenever the user asks to reveal the current event in the events panel.
  const [revealStepRequest, setRevealStepRequest] = useState(0);

  const [isTimingPanelOpen, setIsTimingPanelOpen] = useState(false);
  const [timingFocusOp, setTimingFocusOp] = useState('');

  const [isDetailInspectorOpen, setIsDetailInspectorOpen] = useState(false);
  const [detailInspectorMode, setDetailInspectorMode] = useState('bits');
  const [detailInspectorQuery, setDetailInspectorQuery] = useState('');

  return {
    isAllEventsWidgetHidden, setIsAllEventsWidgetHidden,
    isSingleEventWidgetRevealed, setIsSingleEventWidgetRevealed,
    isAllEventsInDetailPanel, setIsAllEventsInDetailPanel,
    areWidgetsJoined, setAreWidgetsJoined,
    joinBannerRect, setJoinBannerRect,
    pendingBannerDragStart, setPendingBannerDragStart,
    revealStepRequest, setRevealStepRequest,
    isTimingPanelOpen, setIsTimingPanelOpen,
    timingFocusOp, setTimingFocusOp,
    isDetailInspectorOpen, setIsDetailInspectorOpen,
    detailInspectorMode, setDetailInspectorMode,
    detailInspectorQuery, setDetailInspectorQuery,
  };
}

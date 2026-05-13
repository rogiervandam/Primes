/**
 * useWidgetState — owns floating-widget and overlay-panel visibility state.
 *
 * Owns:
 *  - isAllEventsWidgetHidden
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

  // Bumped whenever the user asks to reveal the current event in the events panel.
  const [revealStepRequest, setRevealStepRequest] = useState(0);

  const [isTimingPanelOpen, setIsTimingPanelOpen] = useState(false);
  const [timingFocusOp, setTimingFocusOp] = useState('');

  const [isDetailInspectorOpen, setIsDetailInspectorOpen] = useState(false);
  const [detailInspectorMode, setDetailInspectorMode] = useState('bits');
  const [detailInspectorQuery, setDetailInspectorQuery] = useState('');

  return {
    isAllEventsWidgetHidden, setIsAllEventsWidgetHidden,
    revealStepRequest, setRevealStepRequest,
    isTimingPanelOpen, setIsTimingPanelOpen,
    timingFocusOp, setTimingFocusOp,
    isDetailInspectorOpen, setIsDetailInspectorOpen,
    detailInspectorMode, setDetailInspectorMode,
    detailInspectorQuery, setDetailInspectorQuery,
  };
}

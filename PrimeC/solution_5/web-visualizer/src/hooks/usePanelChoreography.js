import { useCallback } from 'react';

/**
 * Centralizes the visualizer's panel/widget choreography.
 *
 * Phase 3 Refactoring: Accepts organized prop objects instead of scattered parameters.
 * This reduces parameter count and makes dependencies explicit.
 *
 * The hook does not own the panel state; Visualizer persists values.
 * This keeps the extraction low-risk while moving resize-anchor and widget
 * transition rules out of the main component body.
 *
 * @param {Object} panelConfig - Organized panel state and handlers
 * @param {Object} panelConfig.panelHandlers - Handlers for panel operations
 * @param {function} panelConfig.panelHandlers.captureResizeAnchor
 * @param {function} panelConfig.panelHandlers.setIsAllEventsWidgetHidden
 * @param {function} panelConfig.panelHandlers.setEventTitleSettings
 * @param {function} panelConfig.panelHandlers.setIsEventsPanelCollapsed
 * @param {function} panelConfig.panelHandlers.setRevealStepRequest
 * @param {function} panelConfig.panelHandlers.setIsSettingsCollapsed
 * @param {function} panelConfig.panelHandlers.setSettingsTabRequest
 * @param {function} panelConfig.panelHandlers.updateDetailOpen
 * @param {Object} panelConfig.detailState - Detail panel state
 * @param {number} panelConfig.detailState.height
 * @param {boolean} panelConfig.detailState.isOpen
 * @param {Object} panelConfig.settingsState - Settings state
 * @param {string} panelConfig.settingsState.activeTab
 * @param {boolean} panelConfig.settingsState.isCollapsed
 */
export function usePanelChoreography(panelConfig = {}) {
  // Support both organized objects (Phase 3) and scattered params (backward compatibility)
  const handlers = panelConfig.panelHandlers || panelConfig;
  const detailState = panelConfig.detailState || {};
  const settingsState = panelConfig.settingsState || {};

  // Extract from organized handlers
  const {
    captureResizeAnchor,
    detailHeight = detailState.height,
    isDetailOpen = detailState.isOpen,
    settingsActiveTab = settingsState.activeTab,
    isSettingsCollapsed = settingsState.isCollapsed,
    setIsAllEventsWidgetHidden,
    setEventTitleSettings,
    setIsEventsPanelCollapsed,
    setRevealStepRequest,
    setIsSettingsCollapsed,
    setSettingsTabRequest,
    updateDetailOpen,
  } = handlers;

  const showAllEventsWidget = useCallback(() => {
    setIsAllEventsWidgetHidden(false);
  }, [setIsAllEventsWidgetHidden]);

  const expandEventsPanelFromWidget = useCallback(() => {
    captureResizeAnchor();
    setIsAllEventsWidgetHidden(false);
    setIsEventsPanelCollapsed(false);
  }, [captureResizeAnchor, setIsAllEventsWidgetHidden, setIsEventsPanelCollapsed]);

  const dockEventsWidgetToTopBar = useCallback(() => {
    setIsAllEventsWidgetHidden(true);
  }, [setIsAllEventsWidgetHidden]);

  const dockEventsWidgetToDetailPanel = useCallback(() => {
    captureResizeAnchor();
    setIsAllEventsWidgetHidden(true);
    updateDetailOpen(true);
  }, [captureResizeAnchor, setIsAllEventsWidgetHidden, updateDetailOpen]);

  const toggleEventsPanel = useCallback(() => {
    captureResizeAnchor();
    setIsEventsPanelCollapsed((wasCollapsed) => !wasCollapsed);
    setIsAllEventsWidgetHidden(false);
  }, [captureResizeAnchor, setIsAllEventsWidgetHidden, setIsEventsPanelCollapsed]);

  // Collapse the events panel without showing the all-events floater.
  // Used by the ↓ button in EventsPanel so the widget doesn't pop back open.
  const collapseEventsHideWidget = useCallback(() => {
    captureResizeAnchor();
    setIsEventsPanelCollapsed(true);
    setIsAllEventsWidgetHidden(true);
  }, [captureResizeAnchor, setIsAllEventsWidgetHidden, setIsEventsPanelCollapsed]);

  const revealCurrentStepInPanel = useCallback(() => {
    // item 348: track whether the panel was just opened so we can delay the
    // scroll until after the 240ms slide-in animation completes.
    let opening = false;
    setIsEventsPanelCollapsed((wasCollapsed) => {
      if (wasCollapsed) {
        opening = true;
        captureResizeAnchor();
        return false;
      }
      return wasCollapsed;
    });
    // If opening from collapsed, wait for animation before scrolling.
    if (opening) {
      setTimeout(() => setRevealStepRequest((n) => n + 1), 280);
    } else {
      setRevealStepRequest((n) => n + 1);
    }
  }, [captureResizeAnchor, setIsEventsPanelCollapsed, setRevealStepRequest]);

  const toggleDetailPanel = useCallback(() => {
    captureResizeAnchor();
    updateDetailOpen((open) => !open);
  }, [captureResizeAnchor, updateDetailOpen]);

  const toggleSettingsPanel = useCallback(() => {
    captureResizeAnchor();
    setIsSettingsCollapsed((collapsed) => !collapsed);
  }, [captureResizeAnchor, setIsSettingsCollapsed]);

  const openAnimationSettings = useCallback(() => {
    captureResizeAnchor();
    if (!isSettingsCollapsed && settingsActiveTab === 'animation') {
      setIsSettingsCollapsed(true);
      return;
    }
    setIsSettingsCollapsed(false);
    setSettingsTabRequest((prev) => ({ tab: 'animation', counter: (prev?.counter ?? 0) + 1 }));
  }, [
    captureResizeAnchor,
    setIsSettingsCollapsed,
    setSettingsTabRequest,
    settingsActiveTab,
    isSettingsCollapsed,
  ]);

  const showEventTitleAboveCurrentDetail = useCallback(() => {
    const DETAIL_HEADER_H = 22;
    const totalPanelH = isDetailOpen ? detailHeight + DETAIL_HEADER_H : DETAIL_HEADER_H;
    const dragOffsetY = -(totalPanelH + 30 - 20);
    setEventTitleSettings((prev) => ({ ...prev, visible: true, dragOffsetX: 0, dragOffsetY }));
  }, [detailHeight, isDetailOpen, setEventTitleSettings]);

  const showEventTitleAboveClosedDetail = useCallback(() => {
    const DETAIL_HEADER_H = 22;
    const dragOffsetY = -(DETAIL_HEADER_H + 30 - 20);
    setEventTitleSettings((prev) => ({ ...prev, visible: true, dragOffsetX: 0, dragOffsetY }));
  }, [setEventTitleSettings]);

  return {
    collapseEventsHideWidget,
    dockEventsWidgetToDetailPanel,
    dockEventsWidgetToTopBar,
    expandEventsPanelFromWidget,
    openAnimationSettings,
    revealCurrentStepInPanel,
    showAllEventsWidget,
    showEventTitleAboveClosedDetail,
    showEventTitleAboveCurrentDetail,
    toggleDetailPanel,
    toggleEventsPanel,
    toggleSettingsPanel,
  };
}

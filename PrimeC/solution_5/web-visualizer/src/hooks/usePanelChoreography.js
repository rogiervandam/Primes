import { useCallback } from 'react';

/**
 * Centralizes the visualizer's panel/widget choreography.
 *
 * The hook does not own the panel state yet; Visualizer still persists and
 * passes the raw values. This keeps the extraction low-risk while moving the
 * resize-anchor and widget transition rules out of the main component body.
 */
export function usePanelChoreography({
  captureResizeAnchor,
  detailHeight,
  isDetailOpen,
  settingsActiveTab,
  isSettingsCollapsed,
  setIsAllEventsInDetailPanel,
  setIsAllEventsWidgetHidden,
  setEventTitleSettings,
  setIsEventsPanelCollapsed,
  setJoinBannerRect,
  setRevealStepRequest,
  setIsSettingsCollapsed,
  setSettingsTabRequest,
  setAreWidgetsJoined,
  updateDetailOpen,
}) {
  const showAllEventsWidget = useCallback(() => {
    setIsAllEventsWidgetHidden(false);
  }, [setIsAllEventsWidgetHidden]);

  const joinWidgets = useCallback((bannerRect) => {
    setJoinBannerRect(bannerRect || null);
    setAreWidgetsJoined(true);
  }, [setJoinBannerRect, setAreWidgetsJoined]);

  const splitWidgets = useCallback(() => {
    setAreWidgetsJoined(false);
    setEventTitleSettings((prev) => ({ ...prev, dragOffsetX: 0, dragOffsetY: 0 }));
  }, [setEventTitleSettings, setAreWidgetsJoined]);

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
    if (setIsAllEventsInDetailPanel) setIsAllEventsInDetailPanel(true);
  }, [captureResizeAnchor, setIsAllEventsInDetailPanel, setIsAllEventsWidgetHidden, updateDetailOpen]);

  const toggleEventsPanel = useCallback(() => {
    captureResizeAnchor();
    setIsEventsPanelCollapsed((wasCollapsed) => {
      if (wasCollapsed) setAreWidgetsJoined(false);
      return !wasCollapsed;
    });
    setIsAllEventsWidgetHidden(false);
  }, [captureResizeAnchor, setIsAllEventsWidgetHidden, setIsEventsPanelCollapsed, setAreWidgetsJoined]);

  const revealCurrentStepInPanel = useCallback(() => {
    setIsEventsPanelCollapsed((wasCollapsed) => {
      if (wasCollapsed) {
        captureResizeAnchor();
        setAreWidgetsJoined(false);
        return false;
      }
      return wasCollapsed;
    });
    setRevealStepRequest((n) => n + 1);
  }, [captureResizeAnchor, setIsEventsPanelCollapsed, setRevealStepRequest, setAreWidgetsJoined]);

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
    splitWidgets();
  }, [detailHeight, isDetailOpen, setEventTitleSettings, splitWidgets]);

  const showEventTitleAboveClosedDetail = useCallback(() => {
    const DETAIL_HEADER_H = 22;
    const dragOffsetY = -(DETAIL_HEADER_H + 30 - 20);
    setEventTitleSettings((prev) => ({ ...prev, visible: true, dragOffsetX: 0, dragOffsetY }));
    splitWidgets();
  }, [setEventTitleSettings, splitWidgets]);

  const pushJoinedWidgetToEventsPanel = useCallback(() => {
    captureResizeAnchor();
    setAreWidgetsJoined(false);
    setIsAllEventsWidgetHidden(false);
    setIsEventsPanelCollapsed(false);
    updateDetailOpen(true);
    setEventTitleSettings((prev) => ({
      ...prev,
      visible: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
    }));
  }, [
    captureResizeAnchor,
    setIsAllEventsWidgetHidden,
    setEventTitleSettings,
    setIsEventsPanelCollapsed,
    setAreWidgetsJoined,
    updateDetailOpen,
  ]);

  const pushJoinedWidgetToDetailPanel = useCallback(() => {
    captureResizeAnchor();
    setAreWidgetsJoined(false);
    setIsAllEventsWidgetHidden(true);
    updateDetailOpen(true);
    if (setIsAllEventsInDetailPanel) setIsAllEventsInDetailPanel(true);
    setEventTitleSettings((prev) => ({
      ...prev,
      visible: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
    }));
  }, [
    captureResizeAnchor,
    setIsAllEventsInDetailPanel,
    setIsAllEventsWidgetHidden,
    setEventTitleSettings,
    setAreWidgetsJoined,
    updateDetailOpen,
  ]);

  const hideJoinedWidget = useCallback(() => {
    setAreWidgetsJoined(false);
    setIsAllEventsWidgetHidden(true);
    setEventTitleSettings((prev) => ({ ...prev, visible: false }));
  }, [setIsAllEventsWidgetHidden, setEventTitleSettings, setAreWidgetsJoined]);

  return {
    dockEventsWidgetToDetailPanel,
    dockEventsWidgetToTopBar,
    expandEventsPanelFromWidget,
    hideJoinedWidget,
    joinWidgets,
    openAnimationSettings,
    pushJoinedWidgetToDetailPanel,
    pushJoinedWidgetToEventsPanel,
    revealCurrentStepInPanel,
    showAllEventsWidget,
    showEventTitleAboveClosedDetail,
    showEventTitleAboveCurrentDetail,
    splitWidgets,
    toggleDetailPanel,
    toggleEventsPanel,
    toggleSettingsPanel,
  };
}

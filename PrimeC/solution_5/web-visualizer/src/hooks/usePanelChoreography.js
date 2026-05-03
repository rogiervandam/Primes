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
  detailOpen,
  settingsActiveTab,
  settingsCollapsed,
  setAllEventsInDetailPanel,
  setAllEventsWidgetHidden,
  setEventTitleSettings,
  setEventsPanelCollapsed,
  setJoinBannerRect,
  setRevealStepRequest,
  setSettingsCollapsed,
  setSettingsTabRequest,
  setWidgetsJoined,
  updateDetailOpen,
}) {
  const showAllEventsWidget = useCallback(() => {
    setAllEventsWidgetHidden(false);
  }, [setAllEventsWidgetHidden]);

  const joinWidgets = useCallback((bannerRect) => {
    setJoinBannerRect(bannerRect || null);
    setWidgetsJoined(true);
  }, [setJoinBannerRect, setWidgetsJoined]);

  const splitWidgets = useCallback(() => {
    setWidgetsJoined(false);
    setEventTitleSettings((prev) => ({ ...prev, dragOffsetX: 0, dragOffsetY: 0 }));
  }, [setEventTitleSettings, setWidgetsJoined]);

  const expandEventsPanelFromWidget = useCallback(() => {
    captureResizeAnchor();
    setAllEventsWidgetHidden(false);
    setEventsPanelCollapsed(false);
  }, [captureResizeAnchor, setAllEventsWidgetHidden, setEventsPanelCollapsed]);

  const dockEventsWidgetToTopBar = useCallback(() => {
    setAllEventsWidgetHidden(true);
  }, [setAllEventsWidgetHidden]);

  const toggleEventsPanel = useCallback(() => {
    captureResizeAnchor();
    setEventsPanelCollapsed((wasCollapsed) => {
      if (wasCollapsed) setWidgetsJoined(false);
      return !wasCollapsed;
    });
    setAllEventsWidgetHidden(false);
  }, [captureResizeAnchor, setAllEventsWidgetHidden, setEventsPanelCollapsed, setWidgetsJoined]);

  const revealCurrentStepInPanel = useCallback(() => {
    setEventsPanelCollapsed((wasCollapsed) => {
      if (wasCollapsed) {
        captureResizeAnchor();
        setWidgetsJoined(false);
        return false;
      }
      return wasCollapsed;
    });
    setRevealStepRequest((n) => n + 1);
  }, [captureResizeAnchor, setEventsPanelCollapsed, setRevealStepRequest, setWidgetsJoined]);

  const toggleDetailPanel = useCallback(() => {
    captureResizeAnchor();
    updateDetailOpen((open) => !open);
  }, [captureResizeAnchor, updateDetailOpen]);

  const toggleSettingsPanel = useCallback(() => {
    captureResizeAnchor();
    setSettingsCollapsed((collapsed) => !collapsed);
  }, [captureResizeAnchor, setSettingsCollapsed]);

  const openAnimationSettings = useCallback(() => {
    captureResizeAnchor();
    if (!settingsCollapsed && settingsActiveTab === 'animation') {
      setSettingsCollapsed(true);
      return;
    }
    setSettingsCollapsed(false);
    setSettingsTabRequest((prev) => ({ tab: 'animation', counter: (prev?.counter ?? 0) + 1 }));
  }, [
    captureResizeAnchor,
    setSettingsCollapsed,
    setSettingsTabRequest,
    settingsActiveTab,
    settingsCollapsed,
  ]);

  const showEventTitleAboveCurrentDetail = useCallback(() => {
    const DETAIL_HEADER_H = 22;
    const totalPanelH = detailOpen ? detailHeight + DETAIL_HEADER_H : DETAIL_HEADER_H;
    const dragOffsetY = -(totalPanelH + 30 - 20);
    setEventTitleSettings((prev) => ({ ...prev, visible: true, dragOffsetX: 0, dragOffsetY }));
    splitWidgets();
  }, [detailHeight, detailOpen, setEventTitleSettings, splitWidgets]);

  const showEventTitleAboveClosedDetail = useCallback(() => {
    const DETAIL_HEADER_H = 22;
    const dragOffsetY = -(DETAIL_HEADER_H + 30 - 20);
    setEventTitleSettings((prev) => ({ ...prev, visible: true, dragOffsetX: 0, dragOffsetY }));
    splitWidgets();
  }, [setEventTitleSettings, splitWidgets]);

  const pushJoinedWidgetToEventsPanel = useCallback(() => {
    captureResizeAnchor();
    setWidgetsJoined(false);
    setAllEventsWidgetHidden(false);
    setEventsPanelCollapsed(false);
    updateDetailOpen(true);
    setEventTitleSettings((prev) => ({
      ...prev,
      visible: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
    }));
  }, [
    captureResizeAnchor,
    setAllEventsWidgetHidden,
    setEventTitleSettings,
    setEventsPanelCollapsed,
    setWidgetsJoined,
    updateDetailOpen,
  ]);

  const pushJoinedWidgetToDetailPanel = useCallback(() => {
    captureResizeAnchor();
    setWidgetsJoined(false);
    setAllEventsWidgetHidden(true);
    updateDetailOpen(true);
    if (setAllEventsInDetailPanel) setAllEventsInDetailPanel(true);
    setEventTitleSettings((prev) => ({
      ...prev,
      visible: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
    }));
  }, [
    captureResizeAnchor,
    setAllEventsInDetailPanel,
    setAllEventsWidgetHidden,
    setEventTitleSettings,
    setWidgetsJoined,
    updateDetailOpen,
  ]);

  const hideJoinedWidget = useCallback(() => {
    setWidgetsJoined(false);
    setAllEventsWidgetHidden(true);
    setEventTitleSettings((prev) => ({ ...prev, visible: false }));
  }, [setAllEventsWidgetHidden, setEventTitleSettings, setWidgetsJoined]);

  return {
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

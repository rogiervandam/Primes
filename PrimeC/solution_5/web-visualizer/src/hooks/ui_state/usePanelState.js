/**
 * usePanelState — owns sidebar and detail-panel visibility + dimension state.
 *
 * Owns:
 *  - isEventsPanelCollapsed / isSettingsCollapsed / isDetailOpen + isDetailOpenRef
 *  - isMinimapVisible / isMinimapAvailable
 *  - panelWidth / detailHeight + detailHeightRef / detailWidth
 *  - stepStats
 *  - settingsActiveTab / settingsTabRequest
 *  - deferredPanelStateRef (panel open-states deferred until after intro)
 *
 * Effects included:
 *  - Phase F: restore isEventsPanelCollapsed + isSettingsCollapsed + isDetailOpen after introPhase==='visible'
 *
 * @param {{ initialPrefs: object, introPhase: string }} params
 */
import { useState, useRef, useEffect } from 'react';

export function usePanelState({ initialPrefs, introPhase }) {
  // Forced closed on mount; restored after intro animation finishes.
  const [isEventsPanelCollapsed, setIsEventsPanelCollapsed] = useState(true);
  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isDetailOpenRef = useRef(false);
  isDetailOpenRef.current = isDetailOpen;

  const [isMinimapVisible, setIsMinimapVisible] = useState(true);
  const [isMinimapAvailable, setIsMinimapAvailable] = useState(true);
  const [panelWidth, setPanelWidth] = useState(320);
  const [detailHeight, setDetailHeight] = useState(280);
  const detailHeightRef = useRef(280);
  detailHeightRef.current = detailHeight;
  const [detailWidth, setDetailWidth] = useState(0);

  const [stepStats, setStepStats] = useState(null);

  // item 155: true when the detail panel header is hidden (panel dragged all the way down)
  const [isDetailHeaderHidden, setIsDetailHeaderHidden] = useState(false);
  // item 157: true when the detail panel is floating (detached from the bottom)
  const [isDetailPanelFloating, setIsDetailPanelFloating] = useState(false);

  const [settingsActiveTab, setSettingsActiveTab] = useState('layout');
  const [settingsTabRequest, setSettingsTabRequest] = useState(null);

  // Panel open-states saved in prefs — applied once after the intro completes.
  const deferredPanelStateRef = useRef({
    isEventsPanelCollapsed: initialPrefs.isEventsPanelCollapsed,
    isSettingsCollapsed: initialPrefs.isSettingsCollapsed,
    isDetailOpen: initialPrefs.isDetailOpen,
    applied: false,
  });

  // Phase F: once intro animation finishes, restore panels that were open last session.
  useEffect(() => {
    if (introPhase !== 'visible') return;
    const deferred = deferredPanelStateRef.current;
    if (deferred.applied) return;
    deferred.applied = true;
    if (!deferred.isEventsPanelCollapsed) setIsEventsPanelCollapsed(false);
    if (!deferred.isSettingsCollapsed) setIsSettingsCollapsed(false);
    if (deferred.isDetailOpen) setIsDetailOpen(true);
  }, [introPhase]);

  return {
    isEventsPanelCollapsed, setIsEventsPanelCollapsed,
    isSettingsCollapsed, setIsSettingsCollapsed,
    isDetailOpen, setIsDetailOpen, isDetailOpenRef,
    isMinimapVisible, setIsMinimapVisible,
    isMinimapAvailable, setIsMinimapAvailable,
    panelWidth, setPanelWidth,
    detailHeight, setDetailHeight, detailHeightRef,
    detailWidth, setDetailWidth,
    stepStats, setStepStats,
    settingsActiveTab, setSettingsActiveTab,
    settingsTabRequest, setSettingsTabRequest,
    deferredPanelStateRef,
    // item 155: header hidden when dragged all the way down
    isDetailHeaderHidden, setIsDetailHeaderHidden,
    // item 157: floating detail panel
    isDetailPanelFloating, setIsDetailPanelFloating,
  };
}

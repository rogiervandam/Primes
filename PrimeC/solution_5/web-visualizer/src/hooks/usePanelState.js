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
 *  - Phase F: restore isEventsPanelCollapsed + isSettingsCollapsed after introPhase==='visible'
 *  - Detail-panel restore after isSingleEventWidgetRevealed
 *
 * @param {{ initialPrefs: object, introPhase: string, isSingleEventWidgetRevealed: boolean }} params
 */
import { useState, useRef, useEffect } from 'react';

export function usePanelState({ initialPrefs, introPhase, isSingleEventWidgetRevealed }) {
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
    // Detail panel is only restored once the user shows intent (see effect below).
  }, [introPhase]);

  // Restore the detail panel open state after the user first plays or selects an event.
  const detailPanelRestoredRef = useRef(false);
  useEffect(() => {
    if (!isSingleEventWidgetRevealed) return;
    if (detailPanelRestoredRef.current) return;
    detailPanelRestoredRef.current = true;
    const deferred = deferredPanelStateRef.current;
    if (deferred.isDetailOpen) setIsDetailOpen(true);
  }, [isSingleEventWidgetRevealed]);

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
  };
}

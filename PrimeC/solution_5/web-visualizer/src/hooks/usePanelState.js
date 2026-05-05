/**
 * usePanelState — owns sidebar and detail-panel visibility + dimension state.
 *
 * Owns:
 *  - eventsPanelCollapsed / settingsCollapsed / detailOpen + detailOpenRef
 *  - showMinimap / minimapAvailable
 *  - panelWidth / detailHeight + detailHeightRef / detailWidth
 *  - stepStats
 *  - settingsActiveTab / settingsTabRequest
 *  - deferredPanelStateRef (panel open-states deferred until after intro)
 *
 * Effects included:
 *  - Phase F: restore eventsPanelCollapsed + settingsCollapsed after introPhase==='visible'
 *  - Detail-panel restore after singleEventWidgetRevealed
 *
 * @param {{ initialPrefs: object, introPhase: string, singleEventWidgetRevealed: boolean }} params
 */
import { useState, useRef, useEffect } from 'react';

export function usePanelState({ initialPrefs, introPhase, singleEventWidgetRevealed }) {
  // Forced closed on mount; restored after intro animation finishes.
  const [eventsPanelCollapsed, setEventsPanelCollapsed] = useState(true);
  const [settingsCollapsed, setSettingsCollapsed] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailOpenRef = useRef(false);
  detailOpenRef.current = detailOpen;

  const [showMinimap, setShowMinimap] = useState(true);
  const [minimapAvailable, setMinimapAvailable] = useState(true);
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
    eventsPanelCollapsed: initialPrefs.eventsPanelCollapsed,
    settingsCollapsed: initialPrefs.settingsCollapsed,
    detailOpen: initialPrefs.detailOpen,
    applied: false,
  });

  // Phase F: once intro animation finishes, restore panels that were open last session.
  useEffect(() => {
    if (introPhase !== 'visible') return;
    const deferred = deferredPanelStateRef.current;
    if (deferred.applied) return;
    deferred.applied = true;
    if (!deferred.eventsPanelCollapsed) setEventsPanelCollapsed(false);
    if (!deferred.settingsCollapsed) setSettingsCollapsed(false);
    // Detail panel is only restored once the user shows intent (see effect below).
  }, [introPhase]);

  // Restore the detail panel open state after the user first plays or selects an event.
  const detailPanelRestoredRef = useRef(false);
  useEffect(() => {
    if (!singleEventWidgetRevealed) return;
    if (detailPanelRestoredRef.current) return;
    detailPanelRestoredRef.current = true;
    const deferred = deferredPanelStateRef.current;
    if (deferred.detailOpen) setDetailOpen(true);
  }, [singleEventWidgetRevealed]);

  return {
    eventsPanelCollapsed, setEventsPanelCollapsed,
    settingsCollapsed, setSettingsCollapsed,
    detailOpen, setDetailOpen, detailOpenRef,
    showMinimap, setShowMinimap,
    minimapAvailable, setMinimapAvailable,
    panelWidth, setPanelWidth,
    detailHeight, setDetailHeight, detailHeightRef,
    detailWidth, setDetailWidth,
    stepStats, setStepStats,
    settingsActiveTab, setSettingsActiveTab,
    settingsTabRequest, setSettingsTabRequest,
    deferredPanelStateRef,
  };
}

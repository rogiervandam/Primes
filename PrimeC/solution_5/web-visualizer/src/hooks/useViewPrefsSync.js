import { useEffect, useRef } from 'react';
import { writeViewPrefs } from '../lib/viewPrefs';

/**
 * Persists view preferences to localStorage whenever they change.
 * Skips writes until the intro animation finishes (introPhase === 'visible')
 * so panel states forced-closed during loading are not persisted.
 */
export function useViewPrefsSync({
  introPhase,
  theme,
  layoutSettings,
  eventTitleSettings,
  gridOpacity,
  canvasColors,
  colorPreset,
  customColors,
  eventDurationMode,
  playSpeedPercent,
  delayBetweenEvents,
  delayBetweenRepeats,
  eventTimeTargets,
  allEventsWidgetHidden,
  widgetsJoined,
  allEventsInDetailPanel,
  autoAnimateOnSelect,
  eventsPanelCollapsed,
  settingsCollapsed,
  detailOpen,
}) {
  const introCompleteRef = useRef(false);
  introCompleteRef.current = introPhase === 'visible';

  useEffect(() => {
    if (!introCompleteRef.current) return;
    writeViewPrefs({
      theme,
      layoutSettings,
      eventTitleSettings,
      gridOpacity,
      canvasColors,
      colorPreset,
      customColors,
      eventDurationMode,
      playSpeedPercent,
      delayBetweenEvents,
      delayBetweenRepeats,
      eventTimeTargets,
      allEventsWidgetHidden,
      widgetsJoined,
      allEventsInDetailPanel,
      autoAnimateOnSelect,
      eventsPanelCollapsed,
      settingsCollapsed,
      detailOpen,
    });
  }, [theme, layoutSettings, eventTitleSettings, gridOpacity, canvasColors, colorPreset, customColors, eventDurationMode, playSpeedPercent, delayBetweenEvents, delayBetweenRepeats, eventTimeTargets, allEventsWidgetHidden, widgetsJoined, allEventsInDetailPanel, autoAnimateOnSelect, eventsPanelCollapsed, settingsCollapsed, detailOpen]);
}

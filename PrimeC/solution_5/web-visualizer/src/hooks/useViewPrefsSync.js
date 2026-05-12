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
  renderMode,
  debugGlModeOverride,
  debugWorkerGlyphMode,
  debugRenderTuning,
  colorPreset,
  customColors,
  timelineColors,  // item 321
  floaterBg,       // item 322/323
  draggerColor,    // item 322/323
  eventDurationMode,
  playSpeedPercent,
  delayBetweenEvents,
  delayBetweenRepeats,
  eventTimeTargets,
  isAllEventsWidgetHidden,
  areWidgetsJoined,
  isAllEventsInDetailPanel,
  isSingleEventSliderInPanel,
  isSingleEventRepeatEnabled,
  isAutoAnimateOnSelect,
  isEventsPanelCollapsed,
  isSettingsCollapsed,
  isDetailOpen,
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
      renderMode,
      debugGlModeOverride,
      debugWorkerGlyphMode,
      debugRenderTuning,
      colorPreset,
      customColors,
      timelineColors,  // item 321
      floaterBg,       // item 322/323
      draggerColor,    // item 322/323
      eventDurationMode,
      playSpeedPercent,
      delayBetweenEvents,
      delayBetweenRepeats,
      eventTimeTargets,
      isAllEventsWidgetHidden,
      areWidgetsJoined,
      isAllEventsInDetailPanel,
      isSingleEventSliderInPanel,
      isSingleEventRepeatEnabled,
      isAutoAnimateOnSelect,
      isEventsPanelCollapsed,
      isSettingsCollapsed,
      isDetailOpen,
    });
  }, [theme, layoutSettings, eventTitleSettings, gridOpacity, canvasColors, renderMode, debugGlModeOverride, debugWorkerGlyphMode, debugRenderTuning, colorPreset, customColors, timelineColors, floaterBg, draggerColor, eventDurationMode, playSpeedPercent, delayBetweenEvents, delayBetweenRepeats, eventTimeTargets, isAllEventsWidgetHidden, areWidgetsJoined, isAllEventsInDetailPanel, isSingleEventSliderInPanel, isSingleEventRepeatEnabled, isAutoAnimateOnSelect, isEventsPanelCollapsed, isSettingsCollapsed, isDetailOpen]);
}

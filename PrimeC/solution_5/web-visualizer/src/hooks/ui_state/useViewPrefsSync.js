import { useEffect, useRef } from 'react';
import { writeViewPrefs } from '../../lib/viewPrefs';

/**
 * Persists view preferences to localStorage whenever they change.
 * Skips writes until the intro animation finishes (introPhase === 'visible')
 * so panel states forced-closed during loading are not persisted.
 */
export function useViewPrefsSync({
  introPhase,
  theme,
  isUseSystemTheme,  // item 478
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
  zoneBgOpacity,   // item 342
  eventDurationMode,
  playSpeedPercent,
  delayBetweenEvents,
  delayBetweenRepeats,
  eventTimeTargets,
  isAllEventsWidgetHidden,
  isAllEventsInDetailPanel,
  isAutoAnimateOnSelect,
  isRepeatOnSelect,         // item 480
  isSkipNoChangeEvents,     // item 476
  annotationMarginLeft,     // item 479
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
      isUseSystemTheme,  // item 478
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
      zoneBgOpacity,   // item 342
      eventDurationMode,
      playSpeedPercent,
      delayBetweenEvents,
      delayBetweenRepeats,
      eventTimeTargets,
      isAllEventsWidgetHidden,
      isAllEventsInDetailPanel,
      isAutoAnimateOnSelect,
      isRepeatOnSelect,         // item 480
      isSkipNoChangeEvents,     // item 476
      annotationMarginLeft,     // item 479
      isEventsPanelCollapsed,
      isSettingsCollapsed,
      isDetailOpen,
    });
  }, [theme, isUseSystemTheme, layoutSettings, eventTitleSettings, gridOpacity, canvasColors, renderMode, debugGlModeOverride, debugWorkerGlyphMode, debugRenderTuning, colorPreset, customColors, timelineColors, floaterBg, draggerColor, zoneBgOpacity, eventDurationMode, playSpeedPercent, delayBetweenEvents, delayBetweenRepeats, eventTimeTargets, isAllEventsWidgetHidden, isAllEventsInDetailPanel, isAutoAnimateOnSelect, isRepeatOnSelect, isSkipNoChangeEvents, annotationMarginLeft, isEventsPanelCollapsed, isSettingsCollapsed, isDetailOpen]);
}

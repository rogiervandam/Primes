/**
 * useThemeAndColors — owns the visual-appearance state.
 *
 * Owns:
 *  - theme ('light' | 'dark')
 *  - gridOpacity (0..1)
 *  - canvasColors ({ light: [r,g,b]|null, dark: [r,g,b]|null })
 *  - colorPreset (named preset key)
 *  - customColors (per-class color overrides)
 */
import { useState } from 'react';

export function useThemeAndColors({ initialPrefs }) {
  const [theme, setTheme] = useState(initialPrefs.theme);
  const [gridOpacity, setGridOpacity] = useState(initialPrefs.gridOpacity);
  const [canvasColors, setCanvasColors] = useState(initialPrefs.canvasColors);
  const [colorPreset, setColorPreset] = useState(initialPrefs.colorPreset);
  const [customColors, setCustomColors] = useState(initialPrefs.customColors);
  const [timelineColors, setTimelineColors] = useState(initialPrefs.timelineColors);  // item 321
  const [floaterBg, setFloaterBg]       = useState(initialPrefs.floaterBg);     // item 322/323
  const [draggerColor, setDraggerColor] = useState(initialPrefs.draggerColor);  // item 322/323

  return {
    theme, setTheme,
    gridOpacity, setGridOpacity,
    canvasColors, setCanvasColors,
    colorPreset, setColorPreset,
    customColors, setCustomColors,
    timelineColors, setTimelineColors,
    floaterBg, setFloaterBg,
    draggerColor, setDraggerColor,
  };
}

import React from 'react';
import { COLOR_PRESETS } from '../SieveRenderer';

function rgbToHex(rgb) {
  if (!rgb || rgb.length < 3) return '#555555';
  return '#' + rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

/**
 * ColorsTab — content for the "Colors" tab of the settings sidebar.
 *
 * Contains grid opacity, color preset, custom colors, and a dark/light
 * mode toggle button.
 */
export default function ColorsTab({
  gridOpacity, onGridOpacityChange,
  colorPreset, onColorPresetChange,
  customColors, onCustomColorsChange,
  theme, onThemeChange,
  canvasColors, onCanvasColorsChange,
}) {
  // Fallback display values match THEMES[theme].BACKGROUND exactly.
  const THEME_BG_LIGHT = [245, 245, 245]; // #f5f5f5
  const THEME_BG_DARK  = [26,  26,  26];  // #1a1a1a
  const effectiveLightBg = (canvasColors && canvasColors.light) || THEME_BG_LIGHT;
  const effectiveDarkBg  = (canvasColors && canvasColors.dark)  || THEME_BG_DARK;
  const hasCustomLight = !!(canvasColors && canvasColors.light);
  const hasCustomDark  = !!(canvasColors && canvasColors.dark);
  const hasAnyCustom   = hasCustomLight || hasCustomDark;
  return (
    <>
      <div className="settings-section">
        <label>Theme</label>
        <div className="settings-row" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn-option${theme === 'light' ? ' active' : ''}`}
            onClick={() => onThemeChange && onThemeChange('light')}
            title="Switch to light theme"
          >
            ☀ Light
          </button>
          <button
            type="button"
            className={`btn-option${theme === 'dark' ? ' active' : ''}`}
            onClick={() => onThemeChange && onThemeChange('dark')}
            title="Switch to dark theme"
          >
            ☽ Dark
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label>Canvas background</label>
        <div className="settings-row color-row" style={{ marginTop: 4 }}>
          <label className="color-label" title="Canvas background color for light (day) mode">
            ☀ Day
            <input
              type="color"
              value={rgbToHex(effectiveLightBg)}
              onChange={(e) => onCanvasColorsChange && onCanvasColorsChange({
                ...(canvasColors || {}),
                light: hexToRgb(e.target.value),
              })}
            />
          </label>
          <label className="color-label" title="Canvas background color for dark (night) mode">
            ☽ Night
            <input
              type="color"
              value={rgbToHex(effectiveDarkBg)}
              onChange={(e) => onCanvasColorsChange && onCanvasColorsChange({
                ...(canvasColors || {}),
                dark: hexToRgb(e.target.value),
              })}
            />
          </label>
          {hasAnyCustom && (
            <button
              className="btn-text"
              style={{ fontSize: '0.8rem' }}
              onClick={() => onCanvasColorsChange && onCanvasColorsChange({ light: null, dark: null })}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="settings-section">
        <label>Grid opacity</label>
        <div className="settings-row overlay-inline-controls">
          <label className="overlay-inline-field overlay-inline-field-range">
            <span>Opacity</span>
            <input
              type="range"
              min={12}
              max={100}
              step={1}
              value={Math.round((gridOpacity ?? 1) * 100)}
              onChange={(e) => onGridOpacityChange && onGridOpacityChange((Math.max(12, Math.min(100, parseInt(e.target.value || '100', 10) || 100))) / 100)}
            />
            <span className="val">{Math.round((gridOpacity ?? 1) * 100)}%</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <label>Color preset</label>
        <div className="settings-row">
          <select value={colorPreset || ''} onChange={(e) => {
            const val = e.target.value || null;
            onColorPresetChange(val);
            if (val) onCustomColorsChange({ setBit: null, clearedBit: null, unchangedBit: null });
          }}>
            <option value="">Theme default</option>
            {Object.entries(COLOR_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="settings-row color-row" style={{ marginTop: 6 }}>
          <label className="color-label">
            Set
            <input type="color"
              value={rgbToHex(customColors?.setBit || (colorPreset && COLOR_PRESETS[colorPreset] ? COLOR_PRESETS[colorPreset].setBit : [85, 85, 85]))}
              onChange={(e) => onCustomColorsChange({ ...customColors, setBit: hexToRgb(e.target.value) })} />
          </label>
          <label className="color-label">
            Cleared
            <input type="color"
              value={rgbToHex(customColors?.clearedBit || (colorPreset && COLOR_PRESETS[colorPreset] ? COLOR_PRESETS[colorPreset].clearedBit : [232, 232, 232]))}
              onChange={(e) => onCustomColorsChange({ ...customColors, clearedBit: hexToRgb(e.target.value) })} />
          </label>
          <label className="color-label">
            Unchanged
            <input type="color"
              value={rgbToHex(customColors?.unchangedBit || (colorPreset && COLOR_PRESETS[colorPreset] ? COLOR_PRESETS[colorPreset].unchangedBit : [232, 232, 232]))}
              onChange={(e) => onCustomColorsChange({ ...customColors, unchangedBit: hexToRgb(e.target.value) })} />
          </label>
        </div>
        {(customColors?.setBit || customColors?.clearedBit || customColors?.unchangedBit) && (
          <button className="btn-text" style={{ marginTop: 4, fontSize: '0.8rem' }}
                  onClick={() => onCustomColorsChange({ setBit: null, clearedBit: null, unchangedBit: null })}>
            Reset custom colors
          </button>
        )}
      </div>
    </>
  );
}

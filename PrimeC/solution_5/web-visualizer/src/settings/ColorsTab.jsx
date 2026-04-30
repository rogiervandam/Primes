import React, { useTransition } from 'react';
import { COLOR_PRESETS } from '../renderer/constants';
import { PreviewOptionButton } from './buttons';

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
  // Wrap slider onChange in startTransition to deprioritise re-renders vs rAF.
  const [, startTransition] = useTransition();
  return (
    <>
      <div className="settings-section">
        <label>Theme</label>
        <div className="preview-btn-grid preview-btn-grid-3">
          <PreviewOptionButton
            compact
            label="Light"
            hint="Light theme"
            active={theme === 'light'}
            onClick={() => onThemeChange && onThemeChange('light')}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <circle cx="24" cy="11" r="5" fill="currentColor" stroke="none" />
                <line x1="24" y1="2" x2="24" y2="4" strokeWidth="2" />
                <line x1="24" y1="18" x2="24" y2="20" strokeWidth="2" />
                <line x1="15" y1="11" x2="17" y2="11" strokeWidth="2" />
                <line x1="31" y1="11" x2="33" y2="11" strokeWidth="2" />
                <line x1="18" y1="5" x2="19.5" y2="6.5" strokeWidth="2" />
                <line x1="28.5" y1="15.5" x2="30" y2="17" strokeWidth="2" />
                <line x1="30" y1="5" x2="28.5" y2="6.5" strokeWidth="2" />
                <line x1="19.5" y1="15.5" x2="18" y2="17" strokeWidth="2" />
              </svg>
            )}
          />
          <PreviewOptionButton
            compact
            label="Dark"
            hint="Dark theme"
            active={theme === 'dark'}
            onClick={() => onThemeChange && onThemeChange('dark')}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <path d="M22 5 a9 9 0 1 0 0 12 a6.5 6.5 0 1 1 0-12z" fill="currentColor" stroke="none" />
              </svg>
            )}
          />
        </div>
      </div>

      <div className="settings-section">
        <label>Color preset</label>
        <div className="preview-btn-grid preview-btn-grid-3">
          <PreviewOptionButton
            compact
            label="Theme"
            hint="Use theme default colors"
            active={!colorPreset}
            onClick={() => {
              onColorPresetChange(null);
              onCustomColorsChange({ setBit: null, clearedBit: null, unchangedBit: null });
            }}
            preview={(
              <svg viewBox="0 0 40 20" width="40" height="20" aria-hidden="true">
                {[0,1,2,0,0,2,1,0].map((type, i) => (
                  <rect key={i} x={(i % 4) * 10 + 1} y={Math.floor(i / 4) * 10 + 1} width={8} height={8} rx={1}
                    style={{ fill: type === 0 ? 'var(--accent)' : type === 1 ? '#ef4444' : 'var(--fg-dim)', stroke: 'none' }}
                  />
                ))}
              </svg>
            )}
          />
          {Object.entries(COLOR_PRESETS).map(([k, v]) => {
            const PATTERN = [0, 1, 2, 0, 0, 2, 1, 0];
            const cols = [
              'rgb(' + v.setBit.join(',') + ')',
              'rgb(' + v.clearedBit.join(',') + ')',
              'rgb(' + v.unchangedBit.join(',') + ')',
            ];
            return (
              <PreviewOptionButton
                key={k}
                compact
                label={v.label}
                hint={v.label}
                active={colorPreset === k}
                onClick={() => {
                  onColorPresetChange(k);
                  onCustomColorsChange({ setBit: null, clearedBit: null, unchangedBit: null });
                }}
                preview={(
                  <svg viewBox="0 0 40 20" width="40" height="20" aria-hidden="true">
                    {PATTERN.map((ci, i) => (
                      <rect key={i} x={(i % 4) * 10 + 1} y={Math.floor(i / 4) * 10 + 1} width={8} height={8} rx={1}
                        style={{ fill: cols[ci], stroke: 'none' }}
                      />
                    ))}
                  </svg>
                )}
              />
            );
          })}
        </div>

      </div>
      <div className="settings-section">
        <label>Adjustments</label>

        <div className="settings-row color-row" >
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

        <div className="settings-row color-row" >
          <label className="color-label" title="Canvas background color for light (day) mode">
            Day
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
            Night
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
        <div className="settings-row overlay-inline-controls" style={{ padding: '1em 0 0 0' }}>
          <label className="overlay-inline-field overlay-inline-field-range">
            <span>Grid opacity</span>
            <input
              type="range"
              min={12}
              max={100}
              step={1}
              value={Math.round((gridOpacity ?? 1) * 100)}
              onChange={(e) => startTransition(() => onGridOpacityChange && onGridOpacityChange((Math.max(12, Math.min(100, parseInt(e.target.value || '100', 10) || 100))) / 100))}
            />
            <span className="val">{Math.round((gridOpacity ?? 1) * 100)}%</span>
          </label>
        </div>
      </div>

    </>
  );
}

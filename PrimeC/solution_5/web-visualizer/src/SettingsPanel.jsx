import React from 'react';
import { BIT_LAYOUTS, BYTE_LAYOUTS, VECTOR_GROUPS, COLOR_PRESETS } from './SieveRenderer';

function rgbToHex(rgb) {
  if (!rgb || rgb.length < 3) return '#555555';
  return '#' + rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

/**
 * Settings panel for layout modes, spacing, and rendering options.
 */
export default function SettingsPanel({
  settings, onChange, open, onClose,
  repeatAnim, onRepeatAnimChange,
  animMode, onAnimModeChange,
  animStyle, onAnimStyleChange,
  bitAnimInterval, onBitAnimIntervalChange,
  colorPreset, onColorPresetChange,
  customColors, onCustomColorsChange,
}) {
  if (!open) return null;

  const set = (key, val) => onChange({ ...settings, [key]: val });
  const numSet = (key, e) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 20) set(key, v);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h3>Layout Settings</h3>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="settings-section">
          <label>Bits in byte</label>
          <select value={settings.bitLayout} onChange={(e) => set('bitLayout', e.target.value)}>
            {Object.entries(BIT_LAYOUTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-section">
          <label>Bytes in uint64</label>
          <select value={settings.byteLayout} onChange={(e) => set('byteLayout', e.target.value)}>
            {Object.entries(BYTE_LAYOUTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-section">
          <label>Bit spacing</label>
          <div className="settings-row">
            <span>H</span>
            <input type="range" min="0" max="10" value={settings.bitSpacingH}
                   onChange={(e) => numSet('bitSpacingH', e)} />
            <span className="val">{settings.bitSpacingH}</span>
            <span>V</span>
            <input type="range" min="0" max="10" value={settings.bitSpacingV}
                   onChange={(e) => numSet('bitSpacingV', e)} />
            <span className="val">{settings.bitSpacingV}</span>
          </div>
        </div>

        <div className="settings-section">
          <label>Byte spacing</label>
          <div className="settings-row">
            <span>H</span>
            <input type="range" min="0" max="20" value={settings.byteSpacingH}
                   onChange={(e) => numSet('byteSpacingH', e)} />
            <span className="val">{settings.byteSpacingH}</span>
            <span>V</span>
            <input type="range" min="0" max="20" value={settings.byteSpacingV}
                   onChange={(e) => numSet('byteSpacingV', e)} />
            <span className="val">{settings.byteSpacingV}</span>
          </div>
        </div>

        <div className="settings-section">
          <label>Vector grouping</label>
          <select value={settings.vectorGroup} onChange={(e) => set('vectorGroup', parseInt(e.target.value))}>
            {Object.entries(VECTOR_GROUPS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-section">
          <label>uint64 spacing</label>
          <div className="settings-row">
            <span>H</span>
            <input type="range" min="0" max="20" value={settings.u64SpacingH}
                   onChange={(e) => numSet('u64SpacingH', e)} />
            <span className="val">{settings.u64SpacingH}</span>
            <span>V</span>
            <input type="range" min="0" max="20" value={settings.u64SpacingV}
                   onChange={(e) => numSet('u64SpacingV', e)} />
            <span className="val">{settings.u64SpacingV}</span>
          </div>
        </div>

        <div className="settings-section">
          <label>Labels</label>
          <div className="settings-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showBitLabels || false}
                     onChange={(e) => set('showBitLabels', e.target.checked)} />
              Bit numbers
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showByteLabels || false}
                     onChange={(e) => set('showByteLabels', e.target.checked)} />
              Byte indices
            </label>
          </div>
        </div>

        <div className="settings-section">
          <label>Repeat animation: {repeatAnim === 0 ? 'Off' : `${(repeatAnim / 1000).toFixed(1)}s`}</label>
          <div className="settings-row">
            <input type="range" min={0} max={5000} step={100}
                   value={repeatAnim}
                   onChange={(e) => onRepeatAnimChange(parseInt(e.target.value))} />
          </div>
        </div>

        <div className="settings-section">
          <label>Animation style</label>
          <div className="settings-row">
            <select value={animStyle || 'ripple'} onChange={(e) => onAnimStyleChange(e.target.value)}>
              <option value="ripple">Ripple</option>
              <option value="fade">Fade</option>
              <option value="pulse">Pulse</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <label>Animation mode</label>
          <div className="settings-row">
            <select value={animMode || 'all'} onChange={(e) => onAnimModeChange(e.target.value)}>
              <option value="all">All at once</option>
              <option value="sequential">Sequential (per bit)</option>
              <option value="bounce">Bounce (forward &amp; back)</option>
            </select>
          </div>
        </div>

        {(animMode === 'sequential' || animMode === 'bounce') && (
          <div className="settings-section">
            <label>Per-bit interval: {bitAnimInterval}ms</label>
            <div className="settings-row">
              <input type="range" min={10} max={500} step={10}
                     value={bitAnimInterval || 50}
                     onChange={(e) => onBitAnimIntervalChange(parseInt(e.target.value))} />
            </div>
          </div>
        )}

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
        </div>

        <div className="settings-section">
          <label>Custom bit colors</label>
          <div className="settings-row color-row">
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
      </div>
    </div>
  );
}

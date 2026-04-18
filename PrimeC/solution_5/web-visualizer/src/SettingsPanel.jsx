import React from 'react';
import { BIT_LAYOUTS, BYTE_LAYOUTS, VECTOR_GROUPS, COLOR_PRESETS, STORAGE_MODELS } from './SieveRenderer';

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
  storageModel, onStorageModelChange,
}) {
  if (!open) return null;

  const set = (key, val) => onChange({ ...settings, [key]: val });
  const incr = (key, max) => set(key, Math.min(max, (settings[key] || 0) + 1));
  const decr = (key, min = 0) => set(key, Math.max(min, (settings[key] || 0) - 1));

  /** Mini SVG preview of a layout grid */
  const LayoutIcon = ({ cols, rows, grid3x3, active, onClick, size = 32 }) => {
    const gap = 1;
    const cellW = (size - (cols - 1) * gap) / cols;
    const cellH = (size - (rows - 1) * gap) / rows;
    return (
      <svg width={size} height={size} onClick={onClick}
           style={{ cursor: 'pointer', border: active ? '2px solid var(--accent)' : '2px solid var(--border)', borderRadius: 4, padding: 2 }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          if (grid3x3 && i === 4) return null; // center cell empty
          const col = i % cols;
          const row = Math.floor(i / cols);
          return <rect key={i} x={col * (cellW + gap)} y={row * (cellH + gap)} width={cellW} height={cellH}
                       fill={active ? 'var(--accent)' : 'var(--fg-dim)'} rx={1} />;
        })}
      </svg>
    );
  };

  const SpacingControl = ({ label, valueH, valueV, keyH, keyV, max = 20 }) => (
    <div className="settings-section">
      <label>{label}</label>
      <div className="settings-row">
        <span>H</span>
        <button className="btn-icon btn-sm" onClick={() => decr(keyH)}>−</button>
        <span className="val">{valueH}</span>
        <button className="btn-icon btn-sm" onClick={() => incr(keyH, max)}>+</button>
        <span style={{ width: 8 }} />
        <span>V</span>
        <button className="btn-icon btn-sm" onClick={() => decr(keyV)}>−</button>
        <span className="val">{valueV}</span>
        <button className="btn-icon btn-sm" onClick={() => incr(keyV, max)}>+</button>
      </div>
    </div>
  );

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h3>Layout Settings</h3>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="settings-section">
          <label>Storage model</label>
          <select value={storageModel || 'half'} onChange={(e) => onStorageModelChange(e.target.value)}>
            {Object.entries(STORAGE_MODELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — {v.description}</option>
            ))}
          </select>
        </div>

        <div className="settings-section">
          <label>Bits in byte</label>
          <div className="layout-icons">
            {Object.entries(BIT_LAYOUTS).map(([k, v]) => (
              <LayoutIcon key={k} cols={v.grid3x3 ? 3 : v.cols} rows={v.grid3x3 ? 3 : v.rows}
                          grid3x3={v.grid3x3} active={settings.bitLayout === k}
                          onClick={() => set('bitLayout', k)} />
            ))}
          </div>
        </div>

        <SpacingControl label="Bit spacing" valueH={settings.bitSpacingH} valueV={settings.bitSpacingV}
                        keyH="bitSpacingH" keyV="bitSpacingV" max={10} />

        <div className="settings-section">
          <label>Bytes in uint64</label>
          <div className="layout-icons">
            {Object.entries(BYTE_LAYOUTS).map(([k, v]) => (
              <LayoutIcon key={k} cols={v.grid3x3 ? 3 : v.cols} rows={v.grid3x3 ? 3 : v.rows}
                          grid3x3={v.grid3x3} active={settings.byteLayout === k}
                          onClick={() => set('byteLayout', k)} />
            ))}
          </div>
        </div>

        <SpacingControl label="Byte spacing" valueH={settings.byteSpacingH} valueV={settings.byteSpacingV}
                        keyH="byteSpacingH" keyV="byteSpacingV" max={20} />

        <div className="settings-section">
          <label>Vector grouping</label>
          <select value={settings.vectorGroup} onChange={(e) => set('vectorGroup', parseInt(e.target.value))}>
            {Object.entries(VECTOR_GROUPS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <SpacingControl label="uint64 spacing" valueH={settings.u64SpacingH} valueV={settings.u64SpacingV}
                        keyH="u64SpacingH" keyV="u64SpacingV" max={20} />

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
          <div className="btn-group">
            {['ripple', 'fade', 'pulse', 'none'].map(s => (
              <button key={s} className={`btn-option${(animStyle || 'ripple') === s ? ' active' : ''}`}
                      onClick={() => onAnimStyleChange(s)}>{s}</button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <label>Animation mode</label>
          <div className="btn-group">
            {[['all', 'All'], ['sequential', 'Sequential'], ['bounce', 'Bounce']].map(([k, l]) => (
              <button key={k} className={`btn-option${(animMode || 'all') === k ? ' active' : ''}`}
                      onClick={() => onAnimModeChange(k)}>{l}</button>
            ))}
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

import React from 'react';
import { BIT_LAYOUTS, BYTE_LAYOUTS, VECTOR_GROUPS } from './SieveRenderer';

/**
 * Settings panel for layout modes, spacing, and rendering options.
 */
export default function SettingsPanel({ settings, onChange, open, onClose, repeatAnim, onRepeatAnimChange }) {
  if (!open) return null;

  const set = (key, val) => onChange({ ...settings, [key]: val });
  const numSet = (key, e) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 20) set(key, v);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
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
          <label>Repeat animation</label>
          <div className="settings-row">
            <select value={repeatAnim || 0} onChange={(e) => onRepeatAnimChange(parseInt(e.target.value))}>
              <option value={0}>Off</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

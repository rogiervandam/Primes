import React from 'react';
import { BIT_LAYOUTS, BYTE_LAYOUTS, VECTOR_GROUPS, COLOR_PRESETS, STORAGE_MODELS, CACHELINE_SIZES, CACHE_PRESETS } from './SieveRenderer';

function rgbToHex(rgb) {
  if (!rgb || rgb.length < 3) return '#555555';
  return '#' + rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

/** Tooltip descriptions for layouts */
const BIT_LAYOUT_TIPS = {
  '8x1': 'Horizontal row of 8 bits — compact wide layout',
  '4x2': '4 columns × 2 rows — balanced, default',
  '1x8': 'Vertical column of 8 bits — tall narrow layout',
  '3x3': '3×3 grid with center empty — square arrangement',
  '8c1': '8 bits in a row',
  '4c2': '4 bits in 2 columns',
  'grid3x3': '3x3 grid with center empty',
};
const BYTE_LAYOUT_TIPS = {
  '8x1': '8 bytes in a row — full-width uint64 display',
  '4x2': '4 columns × 2 rows — balanced, default',
  '1x8': 'Vertical column of 8 bytes — tall display',
  '3x3': '3×3 grid with center empty — square display',
  '8c1': '8 bytes in a row',
  '4c2': '4 bytes in 2 columns',
  'grid3x3': '3x3 grid with center empty',
};
const VECTOR_TIPS = {
  1: 'No grouping — each uint64 is standalone',
  2: 'SSE/128-bit — group 2 uint64s together',
  4: 'AVX2/256-bit — group 4 uint64s together',
  8: 'AVX-512/512-bit — group 8 uint64s together',
  '1': 'Single vector',
  '2': '2 vectors',
  '4': '4 vectors',
};

const VECTOR_BASE_OPTIONS = [
  { bits: 1, label: 'bit' },
  { bits: 8, label: 'byte' },
  { bits: 16, label: 'uint16' },
  { bits: 32, label: 'uint32' },
  { bits: 64, label: 'uint64' },
];
const VECTOR_LANE_OPTIONS = [1, 2, 4, 8];

/**
 * Settings panel for layout modes, spacing, and rendering options.
 */
export default function SettingsPanel({
  settings, onChange, collapsed, onToggleCollapse,
  repeatAnim, onRepeatAnimChange,
  animMode, onAnimModeChange,
  animStyle, onAnimStyleChange,
  bitAnimInterval, onBitAnimIntervalChange,
  colorPreset, onColorPresetChange,
  customColors, onCustomColorsChange,
  storageModel, onStorageModelChange,
  cachelineSize, onCachelineSizeChange,
  cachePreset, onCachePresetChange,
  heatMapEnabled, onHeatMapToggle,
  showMinimap, onShowMinimapChange,
  outlineSettings, onOutlineChange,
  spacingFocus, onAdjustSpacingFromOutline,
}) {
  const s = settings || {};
  const set = (key, val) => {
    const updatedSettings = { ...s, [key]: val };
    if (key === 'bitLayout') updatedSettings.bitLayoutDescription = BIT_LAYOUT_TIPS[val] || '';
    else if (key === 'byteLayout') updatedSettings.byteLayoutDescription = BYTE_LAYOUT_TIPS[val] || '';
    else if (key === 'vectorGroup') {
      updatedSettings.vectorGroupDescription = VECTOR_TIPS[val] || '';
      updatedSettings.vectorLabel = val > 1 ? `uint64v${val}` : 'uint64';
      updatedSettings.vectorBaseBits = 64;
      updatedSettings.vectorLanes = val;
    }
    onChange(updatedSettings);
  };
  const buildVectorLabel = (baseBits, lanes) => {
    if (baseBits === 1) return lanes > 1 ? `bitv${lanes}` : 'bit';
    if (baseBits === 8) return lanes > 1 ? `bytev${lanes}` : 'byte';
    if (lanes <= 1) return `uint${baseBits}`;
    return `uint${baseBits}v${lanes}`;
  };
  const deriveU64Group = (baseBits, lanes) => {
    const bits = baseBits * lanes;
    if (bits <= 64) return 1;
    if (bits <= 128) return 2;
    if (bits <= 256) return 4;
    return 8;
  };
  const setVectorProfile = (baseBits, lanes) => {
    const vg = deriveU64Group(baseBits, lanes);
    const profileLabel = buildVectorLabel(baseBits, lanes);
    onChange({
      ...s,
      vectorBaseBits: baseBits,
      vectorLanes: lanes,
      vectorGroup: vg,
      vectorLabel: profileLabel,
      vectorGroupDescription: `${profileLabel} (${vg}×uint64 layout group)`
    });
  };
  const incr = (key, max) => set(key, Math.min(max, (s[key] || 0) + 1));
  const decr = (key, min = 0) => set(key, Math.max(min, (s[key] || 0) - 1));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const adjustRepeatAnim = (deltaMs) => onRepeatAnimChange(clamp((repeatAnim || 0) + deltaMs, 0, 5000));
  const adjustBitInterval = (deltaMs) => onBitAnimIntervalChange(clamp((bitAnimInterval || 100) + deltaMs, 20, 2000));
  const setVectorGroupSimple = (group) => {
    onChange({
      ...s,
      vectorGroup: group,
      vectorLabel: group > 1 ? `uint64v${group}` : 'uint64',
      vectorGroupDescription: VECTOR_TIPS[group] || '',
    });
  };

  /** Mini SVG preview of a layout grid */
  const LayoutIcon = ({ cols, rows, grid3x3, active, onClick, size = 32, tooltip }) => {
    const gap = 1;
    const cellW = (size - (cols - 1) * gap) / cols;
    const cellH = (size - (rows - 1) * gap) / rows;
    return (
      <svg width={size} height={size} onClick={onClick} title={tooltip}
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

  /** Mini SVG preview for vector grouping */
  const VectorIcon = ({ count, active, onClick, size = 32, tooltip }) => {
    const gap = 2;
    const boxW = (size - (count - 1) * gap) / count;
    return (
      <svg width={size} height={size} onClick={onClick} title={tooltip}
           style={{ cursor: 'pointer', border: active ? '2px solid var(--accent)' : '2px solid var(--border)', borderRadius: 4, padding: 2 }}>
        {Array.from({ length: count }, (_, i) => (
          <rect key={i} x={i * (boxW + gap)} y={2} width={boxW} height={size - 4}
                fill={active ? 'var(--accent)' : 'var(--fg-dim)'} rx={1} />
        ))}
      </svg>
    );
  };

  const AnnotationButton = ({ title, hint, active, onClick, preview }) => (
    <button
      type="button"
      className={`anno-btn${active ? ' active' : ''}`}
      onClick={onClick}
      title={hint}
    >
      <span className="anno-btn-preview">{preview}</span>
      <span className="anno-btn-title">{title}</span>
      <span className="anno-btn-hint">{hint}</span>
    </button>
  );

  const PreviewOptionButton = ({ label, hint, active, onClick, preview, compact = false }) => (
    <button
      type="button"
      className={`preview-btn${active ? ' active' : ''}${compact ? ' compact' : ''}`}
      onClick={onClick}
      title={hint}
    >
      <span className="preview-btn-swatch">{preview}</span>
      <span className="preview-btn-title">{label}</span>
      <span className="preview-btn-hint">{hint}</span>
    </button>
  );

  const outline = outlineSettings || {
    target: 'none',
  };

  /**
   * Unified layout controls with icon buttons and spacing rows.
   * No large preview block so panel height remains stable while changing options.
   */
  const LayoutOverview = () => {

    // Compact H/V spacing control row
    const SpRow = ({ label, dot, keyH, keyV, max }) => (
      <div className="lo-sp-row">
        <span className="lo-sp-dot" style={{ background: dot }} />
        <span className="lo-sp-label">{label}</span>
        <span className="lo-sp-axis">H</span>
        <button className="btn-icon btn-sm" onClick={() => decr(keyH)}>−</button>
        <span className="lo-sp-val">{s[keyH] ?? 0}</span>
        <button className="btn-icon btn-sm" onClick={() => incr(keyH, max)}>+</button>
        <span className="lo-sp-axis">V</span>
        <button className="btn-icon btn-sm" onClick={() => decr(keyV)}>−</button>
        <span className="lo-sp-val">{s[keyV] ?? 0}</span>
        <button className="btn-icon btn-sm" onClick={() => incr(keyV, max)}>+</button>
      </div>
    );

    return (
      <>
      <div className="settings-section lo-section">
        <label>Grouping</label>

        {/* Bit layout row */}
        <div className="lo-level-row">
          <span className="lo-level-tag">Bit</span>
          <div className="layout-icons">
            {Object.entries(BIT_LAYOUTS).map(([k, v]) => (
              <LayoutIcon key={k} cols={v.grid3x3 ? 3 : v.cols} rows={v.grid3x3 ? 3 : v.rows}
                          grid3x3={v.grid3x3} active={s.bitLayout === k}
                          onClick={() => set('bitLayout', k)} tooltip={BIT_LAYOUT_TIPS[k]} size={26} />
            ))}
          </div>
        </div>
        <p className="layout-description">{BIT_LAYOUT_TIPS[s.bitLayout] || 'Pick how bits are arranged inside a byte.'}</p>

        {/* Byte layout row */}
        <div className="lo-level-row">
          <span className="lo-level-tag">Byte</span>
          <div className="layout-icons">
            {Object.entries(BYTE_LAYOUTS).map(([k, v]) => (
              <LayoutIcon key={k} cols={v.grid3x3 ? 3 : v.cols} rows={v.grid3x3 ? 3 : v.rows}
                          grid3x3={v.grid3x3} active={s.byteLayout === k}
                          onClick={() => set('byteLayout', k)} tooltip={BYTE_LAYOUT_TIPS[k]} size={26} />
            ))}
          </div>
        </div>
        <p className="layout-description">{BYTE_LAYOUT_TIPS[s.byteLayout] || 'Pick how bytes are arranged inside a uint64.'}</p>

        <div className="lo-level-row lo-level-row-stacked">
          <span className="lo-level-tag">Vector</span>
          <div className="lo-vec-wrap">
            <span className="lo-subtag">Grouping (clear presets)</span>
            <div className="lo-vec-icons">
              {Object.entries(VECTOR_GROUPS).map(([k, v]) => (
                <button
                  key={k}
                  className={`btn-option${s.vectorGroup === parseInt(k) ? ' active' : ''}`}
                  title={VECTOR_TIPS[k]}
                  onClick={() => setVectorGroupSimple(parseInt(k))}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="layout-description">Current: {VECTOR_GROUPS[s.vectorGroup || 1]?.label || 'uint64'}</p>
          </div>
        </div>
      </div>

        {/* Spacing controls — colour-coded to match preview */}
      <div className="settings-section lo-section">
        <label>Spacing</label>
        <div className="lo-sp-table">
          <SpRow label="Bit"  dot="var(--fg-dim)"   keyH="bitSpacingH"  keyV="bitSpacingV"  max={10} />
          <SpRow label="Byte" dot="var(--border)"   keyH="byteSpacingH" keyV="byteSpacingV" max={20} />
          <SpRow label="u64"  dot="var(--accent)"   keyH="u64SpacingH"  keyV="u64SpacingV"  max={20} />
        </div>
      </div>
      </>
    );
  };

  return (
    <div className={`settings-sidebar${collapsed ? ' collapsed' : ''}`}>
      <button className="settings-collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand settings' : 'Collapse settings'}>
        {collapsed ? '◀' : '▶'}
      </button>
      {!collapsed && (
        <div className="settings-panel-content">
          <div className="settings-header">
            <h3>Layout Settings</h3>
          </div>

        {/* Heat Map Toggle */}
        <div className="settings-section">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={heatMapEnabled || false} onChange={(e) => onHeatMapToggle(e.target.checked)} />
            Heat map overlay
          </label>
          <span className="settings-hint">Color bits by recency: red (hot) → orange → blue (cold)</span>
        </div>

        <div className="settings-section">
          <label>Storage model</label>
          <select value={storageModel || 'half'} onChange={(e) => onStorageModelChange(e.target.value)}>
            {Object.entries(STORAGE_MODELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — {v.description}</option>
            ))}
          </select>
        </div>

        {/* Wheel grouping (only when storage model is wheel) */}
        {storageModel === 'wheel' && (
          <div className="settings-section">
            <label>Wheel grouping</label>
            <div className="settings-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={s.wheelGrouping || false}
                       onChange={(e) => set('wheelGrouping', e.target.checked)} />
                Group bits by wheel size (8 bits per group)
              </label>
            </div>
          </div>
        )}

        <LayoutOverview />

        {/* Cacheline size */}
        <div className="settings-section">
          <label>Cacheline size</label>
          <div className="layout-icons">
            {Object.entries(CACHELINE_SIZES).map(([k, v]) => (
              <button key={k} className={`btn-option${cachelineSize === parseInt(k) ? ' active' : ''}`}
                      onClick={() => {
                        onCachelineSizeChange(parseInt(k));
                        onCachePresetChange('fixed');
                      }} title={v.label}>
                {k}B
              </button>
            ))}
            <button className={`btn-option${(cachePreset || 'fixed') !== 'fixed' ? ' active' : ''}`}
                    onClick={() => onCachePresetChange('custom')} title="Custom cacheline size">
              custom
            </button>
          </div>
        </div>

        {(cachePreset || 'fixed') !== 'fixed' && (
          <>
            {/* Cache presets (processor model) */}
            <div className="settings-section">
              <label>Processor cache preset</label>
              <select value={(cachePreset || 'custom') === 'fixed' ? 'custom' : (cachePreset || 'custom')} onChange={(e) => {
                const key = e.target.value;
                onCachePresetChange(key);
                if (key !== 'custom') {
                  const p = CACHE_PRESETS[key];
                  if (p) onCachelineSizeChange(p.cachelineSize);
                }
              }}>
                {Object.entries(CACHE_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}{v.l1 ? ` — L1: ${(v.l1/1024).toFixed(0)}KB, L2: ${(v.l2/1024/1024).toFixed(1)}MB` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-section">
              <label>Custom cacheline bytes</label>
              <input
                type="number"
                min={1}
                step={1}
                value={cachelineSize > 0 ? cachelineSize : ''}
                placeholder="e.g. 64"
                onChange={(e) => {
                  const n = Math.max(1, parseInt(e.target.value || '0', 10) || 0);
                  if (n > 0) onCachelineSizeChange(n);
                }}
              />
            </div>
          </>
        )}

        <div className="settings-section">
          <label>Annotations</label>
          <div className="anno-btn-grid">
            <AnnotationButton
              title="Bits"
              hint="Bit numbers (zoom >= 6x)"
              active={!!s.showBitLabels}
              onClick={() => set('showBitLabels', !s.showBitLabels)}
              preview={(
                <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="17" y="1" width="6" height="6" rx="1" />
                  <text x="2" y="16" fontSize="7">0 1 2</text>
                </svg>
              )}
            />
            <AnnotationButton
              title="Bytes"
              hint="Byte indices (zoom >= 4x)"
              active={!!s.showByteLabels}
              onClick={() => set('showByteLabels', !s.showByteLabels)}
              preview={(
                <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
                  <rect x="1" y="1" width="18" height="8" rx="1" />
                  <rect x="23" y="1" width="18" height="8" rx="1" />
                  <text x="2" y="16" fontSize="7">b0    b1</text>
                </svg>
              )}
            />
            <AnnotationButton
              title="Vectors"
              hint="Vector and uint64 labels"
              active={s.showVectorLabels !== false}
              onClick={() => set('showVectorLabels', s.showVectorLabels === false)}
              preview={(
                <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
                  <rect x="1" y="4" width="42" height="8" rx="2" />
                  <line x1="15" y1="4" x2="15" y2="12" />
                  <line x1="29" y1="4" x2="29" y2="12" />
                  <text x="2" y="17" fontSize="7">v0  v1  v2</text>
                </svg>
              )}
            />
          </div>
        </div>

        <div className="settings-section">
          <label>Grouping outlines</label>
          <div className="preview-btn-grid preview-btn-grid-4">
            <PreviewOptionButton
              compact
              label="None"
              hint="Disable outlines"
              active={(outline.target || 'none') === 'none'}
              onClick={() => onOutlineChange({ ...outline, target: 'none' })}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <line x1="8" y1="11" x2="40" y2="11" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Byte"
              hint="Thick dashed blue byte outlines"
              active={(outline.target || 'none') === 'byte'}
              onClick={() => onOutlineChange({ ...outline, target: 'byte' })}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="9" y="5" width="10" height="12" rx="3" strokeDasharray="4 3" stroke="#3b82f6" strokeWidth="2" fill="none" />
                  <rect x="29" y="5" width="10" height="12" rx="3" strokeDasharray="4 3" stroke="#3b82f6" strokeWidth="2" fill="none" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Vector"
              hint="Thick dashed blue vector outlines"
              active={(outline.target || 'none') === 'vector'}
              onClick={() => onOutlineChange({ ...outline, target: 'vector' })}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="4" y="4" width="40" height="14" rx="4" strokeDasharray="5 3" stroke="#3b82f6" strokeWidth="2" fill="none" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Cacheline"
              hint="Thick dashed blue cacheline outlines"
              active={(outline.target || 'none') === 'cacheline'}
              onClick={() => onOutlineChange({ ...outline, target: 'cacheline' })}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="2" y="3" width="44" height="16" rx="4" strokeDasharray="6 3" stroke="#3b82f6" strokeWidth="2" fill="none" />
                </svg>
              )}
            />
          </div>
          <span className="settings-hint">Click an outline in the canvas to set spacing focus.</span>
        </div>

        {spacingFocus && (
          <div className="settings-section">
            <label>Spacing focus: {spacingFocus}</label>
            <div className="settings-row" style={{ gap: 8 }}>
              <button className="btn-option btn-sm" onClick={() => onAdjustSpacingFromOutline(spacingFocus, 'H', -1)}>H−</button>
              <button className="btn-option btn-sm" onClick={() => onAdjustSpacingFromOutline(spacingFocus, 'H', 1)}>H+</button>
              <button className="btn-option btn-sm" onClick={() => onAdjustSpacingFromOutline(spacingFocus, 'V', -1)}>V−</button>
              <button className="btn-option btn-sm" onClick={() => onAdjustSpacingFromOutline(spacingFocus, 'V', 1)}>V+</button>
            </div>
          </div>
        )}

        {/* Minimap */}
        <div className="settings-section">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showMinimap !== false}
                   onChange={(e) => onShowMinimapChange && onShowMinimapChange(e.target.checked)} />
            Show minimap
          </label>
        </div>

        <div className="settings-section">
          <label>Animation style</label>
          <div className="preview-btn-grid preview-btn-grid-4">
            <PreviewOptionButton
              label="Ripple"
              hint="Contracting ripple ring"
              active={(animStyle || 'ripple') === 'ripple'}
              onClick={() => onAnimStyleChange('ripple')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <circle cx="24" cy="11" r="8" />
                  <circle cx="24" cy="11" r="4" />
                  <circle cx="24" cy="11" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              )}
            />
            <PreviewOptionButton
              label="Fade"
              hint="Soft fading highlight"
              active={(animStyle || 'ripple') === 'fade'}
              onClick={() => onAnimStyleChange('fade')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="4" y="5" width="8" height="12" opacity="0.3" />
                  <rect x="16" y="5" width="8" height="12" opacity="0.5" />
                  <rect x="28" y="5" width="8" height="12" opacity="0.75" />
                  <rect x="40" y="5" width="4" height="12" opacity="1" />
                </svg>
              )}
            />
            <PreviewOptionButton
              label="Pulse"
              hint="Expand and contract"
              active={(animStyle || 'ripple') === 'pulse'}
              onClick={() => onAnimStyleChange('pulse')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <circle cx="12" cy="11" r="3" />
                  <circle cx="24" cy="11" r="5" />
                  <circle cx="36" cy="11" r="7" />
                </svg>
              )}
            />
            <PreviewOptionButton
              label="None"
              hint="No animation"
              active={(animStyle || 'ripple') === 'none'}
              onClick={() => onAnimStyleChange('none')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <line x1="8" y1="11" x2="40" y2="11" />
                  <line x1="10" y1="4" x2="38" y2="18" />
                </svg>
              )}
            />
          </div>
        </div>

        <div className="settings-section">
          <label>Animation mode</label>
          <div className="preview-btn-grid preview-btn-grid-3">
            <PreviewOptionButton
              compact
              label="All"
              hint="All bits at once"
              active={(animMode || 'all') === 'all'}
              onClick={() => onAnimModeChange('all')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="6" y="6" width="8" height="8" />
                  <rect x="20" y="6" width="8" height="8" />
                  <rect x="34" y="6" width="8" height="8" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Sequential"
              hint="Step through bits"
              active={(animMode || 'all') === 'sequential'}
              onClick={() => onAnimModeChange('sequential')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="6" y="6" width="8" height="8" opacity="1" />
                  <rect x="20" y="6" width="8" height="8" opacity="0.6" />
                  <rect x="34" y="6" width="8" height="8" opacity="0.3" />
                  <line x1="14" y1="10" x2="20" y2="10" />
                  <line x1="28" y1="10" x2="34" y2="10" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Bounce"
              hint="Forward and backward"
              active={(animMode || 'all') === 'bounce'}
              onClick={() => onAnimModeChange('bounce')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <line x1="6" y1="10" x2="42" y2="10" />
                  <polygon points="42,10 36,7 36,13" fill="currentColor" stroke="none" />
                  <polygon points="6,10 12,7 12,13" fill="currentColor" stroke="none" />
                </svg>
              )}
            />
          </div>
        </div>

        {animStyle !== 'none' && (
          <div className="settings-section">
            <label>Animation timing</label>
            <div className="settings-row animation-timing-row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <div className="timing-control">
                <span className="timing-title">Per-bit interval</span>
                <div className="settings-row" style={{ alignItems: 'center', gap: 6, opacity: animMode === 'all' ? 0.55 : 1 }}>
                  <button className="btn-option btn-sm" onClick={() => adjustBitInterval(-50)} title="Decrease per-bit interval by 0.05s" disabled={animMode === 'all'}>−</button>
                  <span className="speed-val" style={{ minWidth: 62, textAlign: 'center' }}>{((bitAnimInterval || 100) / 1000).toFixed(2)}s</span>
                  <button className="btn-option btn-sm" onClick={() => adjustBitInterval(50)} title="Increase per-bit interval by 0.05s" disabled={animMode === 'all'}>+</button>
                </div>
              </div>
              <div className="timing-control">
                <span className="timing-title">Animation delay</span>
                <div className="settings-row" style={{ alignItems: 'center', gap: 6 }}>
                  <button className="btn-option btn-sm" onClick={() => adjustRepeatAnim(-100)} title="Decrease animation delay by 0.1s">−</button>
                  <span className="speed-val" style={{ minWidth: 58, textAlign: 'center' }}>{repeatAnim === 0 ? 'Off' : `${(repeatAnim / 1000).toFixed(1)}s`}</span>
                  <button className="btn-option btn-sm" onClick={() => adjustRepeatAnim(100)} title="Increase animation delay by 0.1s">+</button>
                </div>
              </div>
            </div>
            <span className="settings-hint">Per-bit interval controls bit-to-bit pace. Animation delay waits after step animation completes before next step starts.</span>
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
      )}
    </div>
  );
}

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

  const outline = outlineSettings || {
    target: 'none',
  };

  /**
   * Unified layout controls with icon buttons and spacing rows.
   * No large preview block so panel height remains stable while changing options.
   */
  const LayoutOverview = () => {
    const vectorBaseBits = s.vectorBaseBits ?? 64;
    const vectorLanes = s.vectorLanes ?? 1;

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
            <span className="lo-subtag">Type</span>
            <div className="lo-vec-bases">
              {VECTOR_BASE_OPTIONS.map((opt) => (
                <button key={opt.bits}
                        className={`btn-option btn-sm${vectorBaseBits === opt.bits ? ' active' : ''}`}
                        title={`Vector base type: ${opt.label}`}
                        onClick={() => setVectorProfile(opt.bits, vectorLanes)}>
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="lo-subtag">Lanes</span>
            <div className="lo-vec-lanes">
              {VECTOR_LANE_OPTIONS.map((lane) => (
                <button key={lane}
                        className={`btn-option btn-sm${vectorLanes === lane ? ' active' : ''}`}
                        title={`Vector lanes: ${lane}`}
                        onClick={() => setVectorProfile(vectorBaseBits, lane)}>
                  v{lane}
                </button>
              ))}
            </div>
            <span className="lo-subtag">Grouping</span>
            <div className="lo-vec-icons">
              {Object.entries(VECTOR_GROUPS).map(([k]) => (
                <VectorIcon key={k} count={parseInt(k)} active={s.vectorGroup === parseInt(k)}
                            onClick={() => set('vectorGroup', parseInt(k))} tooltip={VECTOR_TIPS[k]} size={20} />
              ))}
            </div>
            <p className="layout-description">Current: {buildVectorLabel(vectorBaseBits, vectorLanes)} ({s.vectorGroup || 1}x uint64 group)</p>
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
          <div className="settings-row" style={{ flexDirection: 'column', gap: 6 }}>
            <select
              value={outline.target || 'none'}
              onChange={(e) => onOutlineChange({ ...outline, target: e.target.value })}
            >
              <option value="none">None</option>
              <option value="byte">Byte outline</option>
              <option value="vector">Vector outline</option>
              <option value="cacheline">Cacheline outline</option>
            </select>
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
            {['ripple', 'fade', 'pulse', 'none'].map(st => (
              <button key={st} className={`btn-option${(animStyle || 'ripple') === st ? ' active' : ''}`}
                      onClick={() => onAnimStyleChange(st)}>{st}</button>
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
              <input type="range" min={20} max={700} step={10}
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
      )}
    </div>
  );
}

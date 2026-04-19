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

  /**
   * Unified layout overview — shows all three nesting levels (bit → byte → vector) in one
   * live SVG preview, with layout icon-buttons per level and compact H/V spacing controls.
   */
  const LayoutOverview = () => {
    const BIT_PX = 3;
    const blKey = s.bitLayout  || '4x2';
    const byKey = s.byteLayout || '4x2';
    const vg    = Math.max(1, parseInt(s.vectorGroup) || 1);

    const bl  = BIT_LAYOUTS[blKey]  || { cols: 4, rows: 2, grid3x3: false };
    const byl = BYTE_LAYOUTS[byKey] || { cols: 4, rows: 2, grid3x3: false };
    const vectorBaseBits = s.vectorBaseBits ?? 64;
    const vectorLanes = s.vectorLanes ?? 1;

    const bitCols  = bl.grid3x3  ? 3 : (bl.cols  || 4);
    const bitRows  = bl.grid3x3  ? 3 : (bl.rows  || 2);
    const byteCols = byl.grid3x3 ? 3 : (byl.cols || 4);
    const byteRows = byl.grid3x3 ? 3 : (byl.rows || 2);

    // Clamp spacing to small values so the preview fits no matter what the user sets
    const bsH = Math.min(4, Math.max(0, s.bitSpacingH  ?? 1));
    const bsV = Math.min(4, Math.max(0, s.bitSpacingV  ?? 1));
    const ysH = Math.min(5, Math.max(0, s.byteSpacingH ?? 2));
    const ysV = Math.min(5, Math.max(0, s.byteSpacingV ?? 2));
    const vsH = Math.min(7, Math.max(0, s.u64SpacingH  ?? 4));
    const vsV = Math.min(7, Math.max(0, s.u64SpacingV  ?? 4));

    // Pixel dimensions of one byte / one uint64 in the preview
    const byteW = bitCols  * BIT_PX + Math.max(0, bitCols  - 1) * bsH;
    const byteH = bitRows  * BIT_PX + Math.max(0, bitRows  - 1) * bsV;
    const u64W  = byteCols * byteW  + Math.max(0, byteCols - 1) * ysH;
    const u64H  = byteRows * byteH  + Math.max(0, byteRows - 1) * ysV;

    // Show at most 2×2 vectors so the preview doesn't get huge
    const vecShowW = Math.min(vg, 2);
    const vecShowH = Math.min(Math.ceil(vg / vecShowW), 2);
    const rawW = vecShowW * u64W + Math.max(0, vecShowW - 1) * vsH + 4;
    const rawH = vecShowH * u64H + Math.max(0, vecShowH - 1) * vsV + 4;

    // Auto-scale to fit the panel (max 175 px wide; allow up-scale for tiny previews)
    const MAX_W  = 175;
    const scale  = Math.min(2.5, MAX_W / Math.max(1, rawW));
    const svgW   = Math.round(rawW * scale);
    const svgH   = Math.round(rawH * scale);

    // Build SVG elements (vector outline → byte background → bit cell)
    const vecBgs = [], byteBgs = [], bitCells = [];
    for (let vy = 0; vy < vecShowH; vy++) {
      for (let vx = 0; vx < vecShowW; vx++) {
        const vox = 2 + vx * (u64W + vsH);
        const voy = 2 + vy * (u64H + vsV);

        vecBgs.push(
          <rect key={`vbg-${vy}-${vx}`}
            x={vox - 1} y={voy - 1} width={u64W + 2} height={u64H + 2}
            fill="none" stroke="var(--accent)" strokeWidth={0.6} rx={1} opacity={0.55} />
        );

        for (let bi = 0; bi < byteCols * byteRows; bi++) {
          if (byl.grid3x3 && bi === 4) continue;
          const bc  = bi % byteCols;
          const br  = Math.floor(bi / byteCols);
          const box = vox + bc * (byteW + ysH);
          const boy = voy + br * (byteH + ysV);

          byteBgs.push(
            <rect key={`bbg-${vy}-${vx}-${bi}`}
              x={box} y={boy} width={byteW} height={byteH}
              fill="var(--fg-muted)" opacity={0.15} rx={0.5} />
          );

          for (let pi = 0; pi < bitCols * bitRows; pi++) {
            if (bl.grid3x3 && pi === 4) continue;
            const pc = pi % bitCols;
            const pr = Math.floor(pi / bitCols);
            bitCells.push(
              <rect key={`bit-${vy}-${vx}-${bi}-${pi}`}
                x={box + pc * (BIT_PX + bsH)}
                y={boy + pr * (BIT_PX + bsV)}
                width={BIT_PX} height={BIT_PX}
                fill="var(--fg-dim)" rx={0.5} />
            );
          }
        }
      }
    }

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
      <div className="settings-section lo-section">
        <label>Layout</label>

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

        {/* Vector grouping row */}
        <div className="lo-level-row">
          <span className="lo-level-tag">Vec</span>
          <div className="lo-vec-wrap">
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
            <div className="lo-vec-icons">
              {Object.entries(VECTOR_GROUPS).map(([k]) => (
                <VectorIcon key={k} count={parseInt(k)} active={s.vectorGroup === parseInt(k)}
                            onClick={() => set('vectorGroup', parseInt(k))} tooltip={VECTOR_TIPS[k]} size={20} />
              ))}
            </div>
          </div>
        </div>

        {/* Spacing controls — colour-coded to match preview */}
        <div className="lo-sp-table">
          <SpRow label="Bit"  dot="var(--fg-dim)"   keyH="bitSpacingH"  keyV="bitSpacingV"  max={10} />
          <SpRow label="Byte" dot="var(--border)"   keyH="byteSpacingH" keyV="byteSpacingV" max={20} />
          <SpRow label="u64"  dot="var(--accent)"   keyH="u64SpacingH"  keyV="u64SpacingV"  max={20} />
        </div>

        {/* Live SVG preview — stays below +/- controls so controls do not shift */}
        <div className="lo-preview-wrap">
          <svg className="lo-preview" width={svgW} height={svgH}
               viewBox={`0 0 ${rawW} ${rawH}`}>
            {vecBgs}
            {byteBgs}
            {bitCells}
          </svg>
        </div>
      </div>
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
                      onClick={() => onCachelineSizeChange(parseInt(k))} title={v.label}>
                {k}B
              </button>
            ))}
          </div>
        </div>

        {/* Cache presets (processor model) */}
        <div className="settings-section">
          <label>Processor cache preset</label>
          <select value={cachePreset || 'custom'} onChange={(e) => {
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
          <label>Annotations</label>
          <div className="settings-row" style={{ flexDirection: 'column', gap: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={s.showBitLabels || false}
                     onChange={(e) => set('showBitLabels', e.target.checked)} />
              Bit numbers <span className="settings-hint" style={{ marginLeft: 4 }}>(zoom ≥6×)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={s.showByteLabels || false}
                     onChange={(e) => set('showByteLabels', e.target.checked)} />
              Byte indices <span className="settings-hint" style={{ marginLeft: 4 }}>(zoom ≥4×)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={s.showVectorLabels !== false}
                     onChange={(e) => set('showVectorLabels', e.target.checked)} />
              Vector / uint64 labels
            </label>
          </div>
        </div>

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

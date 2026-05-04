import React from 'react';
import { BIT_LAYOUTS, BYTE_LAYOUTS, CACHELINE_SIZES, CACHE_PRESETS } from '../SieveRenderer';
import { useDraftInput } from '../hooks/useDraftInput';
import { useSettingsBundle } from './useSettingsBundle';
import {
  BIT_LAYOUT_TIPS,
  BYTE_LAYOUT_TIPS,
  describeLayout,
  GROUPING_PRESETS,
  GROUPING_FAMILIES,
  CUSTOM_GROUP_PRESETS,
  groupingPreviewClassName,
} from './constants';
import {
  LayoutIcon,
  SpacingIcon,
  AnnotationButton,
  PreviewOptionButton,
} from './buttons';

/**
 * Module-level spacing-control widget.
 * Promoted from inside LayoutOverview to prevent React unmount/remount on
 * each animation frame (inline components are new references every render).
 * Needs the five LayoutTab state/bundle props passed explicitly.
 */
function SpacingControl({ title, keyH, keyV, max, className = '', columnControl = null,
  openSpacingControl, setOpenSpacingControl, s, incr, decr }) {
  const controlId = `${keyH}:${keyV}`;
  const open = openSpacingControl === controlId;
  return (
    <div className={`spacing-inline-control spacing-inline-floating ${className}${open ? ' open' : ''}`.trim()}>
      <button
        type="button"
        className={`spacing-inline-trigger${open ? ' active' : ''}`}
        onClick={() => setOpenSpacingControl(open ? null : controlId)}
        title={title}
        aria-expanded={open ? 'true' : 'false'}
      >
        <span className="spacing-inline-trigger-icon"><SpacingIcon title={title} /></span>
      </button>
      {open && (
        <div className="spacing-inline-popover">
          <div className="spacing-inline-title">{title}</div>
          <div className="spacing-inline-row">
            <span className="spacing-inline-axis">H</span>
            <button type="button" className="btn-icon btn-sm spacing-adjust-btn" onClick={() => decr(keyH)} title={`Decrease ${title.toLowerCase()} horizontal spacing`}>−</button>
            <div className="spacing-inline-preview spacing-inline-preview-h" aria-hidden="true">
              <span className="spacing-inline-box" />
              <span className="spacing-inline-gap">{s[keyH] ?? 0}</span>
              <span className="spacing-inline-box" />
            </div>
            <button type="button" className="btn-icon btn-sm spacing-adjust-btn" onClick={() => incr(keyH, max)} title={`Increase ${title.toLowerCase()} horizontal spacing`}>+</button>
          </div>
          <div className="spacing-inline-row">
            <span className="spacing-inline-axis">V</span>
            <button type="button" className="btn-icon btn-sm spacing-adjust-btn" onClick={() => decr(keyV)} title={`Decrease ${title.toLowerCase()} vertical spacing`}>−</button>
            <div className="spacing-inline-preview spacing-inline-preview-v" aria-hidden="true">
              <span className="spacing-inline-box" />
              <span className="spacing-inline-gap">{s[keyV] ?? 0}</span>
              <span className="spacing-inline-box" />
            </div>
            <button type="button" className="btn-icon btn-sm spacing-adjust-btn" onClick={() => incr(keyV, max)} title={`Increase ${title.toLowerCase()} vertical spacing`}>+</button>
          </div>
          {columnControl ? (
            <div className="spacing-inline-row spacing-inline-row-extended">
              <span className="spacing-inline-axis">C</span>
              <button type="button" className="btn-icon btn-sm spacing-adjust-btn" onClick={columnControl.decr} title={columnControl.decrTitle}>−</button>
              <div className="spacing-inline-preview spacing-inline-preview-h" aria-hidden="true">
                <span className="spacing-inline-box" />
                <span className="spacing-inline-gap">{columnControl.value}</span>
                <span className="spacing-inline-box" />
              </div>
              <button type="button" className="btn-icon btn-sm spacing-adjust-btn" onClick={columnControl.incr} title={columnControl.incrTitle}>+</button>
            </div>
          ) : null}
          {columnControl ? (
            <div className="spacing-inline-row spacing-inline-row-toggle">
              <span className="spacing-inline-axis">A</span>
              <button
                type="button"
                className={`spacing-toggle-btn${columnControl.auto ? ' active' : ''}`}
                onClick={columnControl.toggleAuto}
                title={columnControl.toggleTitle}
              >
                {columnControl.auto ? 'Auto fit on' : 'Auto fit off'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * LayoutTab — content for the "Layout" tab of the settings sidebar.
 *
 * This is the heaviest of the three tabs (~750 lines including helpers
 * and the inner `LayoutOverview` component). It owns
 * its own UI state for the grouping menu, custom-preset menu and
 * spacing popovers because none of that state is observed outside this
 * tab. All sieve settings flow in via `settings`/`onChange`; everything
 * else comes in as plain props.
 *
 * Per docs/AI_MAINTENANCE.md the original plan called for a
 * `useSettingsBundle()` hook in the parent first. The hook now exists
 * (`./useSettingsBundle`) and is consumed locally to derive `set` /
 * `setMany` / `incr` / `decr` helpers from the (`settings`, `onChange`)
 * pair. The signature still takes `settings` + `onChange` separately to
 * keep the prop contract with `SettingsPanel` unchanged — the bundle
 * is purely an internal ergonomic.
 */
export default function LayoutTab({
  settings, onChange,
  autoFitColumns = 0,
  cachelineSize, onCachelineSizeChange,
  cachePreset, onCachePresetChange,
  heatMapEnabled,
  cachelineAnnotation = 'none', onCachelineAnnotationChange,
  primeOverlayEnabled, onPrimeOverlayToggle,
  rangeOverlayEnabled = false, rangeOverlayStart = 0, rangeOverlayEnd = 0,
  onRangeOverlayToggle, onRangeOverlayStartChange, onRangeOverlayEndChange,
  multiplesOverlayEnabled = false, multiplesOverlayPrime = 3,
  onMultiplesOverlayToggle, onMultiplesOverlayPrimeChange,
  onRangeOverlayReset,
  onMultiplesOverlayReset,
  showMinimap, onShowMinimapChange,
  minimapControlVisible = true,
  onHeatMapToggle,
  outlineSettings, onOutlineChange,
  isWindowsPlatform = false,
}) {
  const { s, set, setMany, incr, decr } = useSettingsBundle(settings, onChange);
  const [groupingMenuOpen, setGroupingMenuOpen] = React.useState(false);
  const [customPresetMenuOpen, setCustomPresetMenuOpen] = React.useState(false);
  const [customGroupDraft, setCustomGroupDraft] = React.useState('');
  const [openSpacingControl, setOpenSpacingControl] = React.useState(null);

  const rangeStart = useDraftInput(
    rangeOverlayStart,
    (n) => onRangeOverlayStartChange && onRangeOverlayStartChange(n),
    { clamp: (n) => Math.max(0, n) },
  );
  const rangeEnd = useDraftInput(
    rangeOverlayEnd,
    (n) => onRangeOverlayEndChange && onRangeOverlayEndChange(n),
    { clamp: (n) => Math.max(0, n) },
  );
  const multiplesPrime = useDraftInput(
    multiplesOverlayPrime,
    (n) => onMultiplesOverlayPrimeChange && onMultiplesOverlayPrimeChange(n),
    { clamp: (n) => Math.max(2, n) },
  );
  const lastManualColumnCountRef = React.useRef(Math.max(1, parseInt(settings?.horizontalGroups || 0, 10) || 1));
  const balloonMode = s.balloonMode || 'click-hover';

  React.useEffect(() => {
    const value = Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0);
    if (value > 0) lastManualColumnCountRef.current = value;
  }, [s.horizontalGroups]);

  React.useEffect(() => {
    if (!openSpacingControl) return undefined;
    const handlePointerDown = (event) => {
      if (event.target instanceof Element && event.target.closest('.spacing-inline-floating')) return;
      setOpenSpacingControl(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [openSpacingControl]);

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
    setMany({
      vectorMode: 'preset',
      vectorBaseBits: baseBits,
      vectorLanes: lanes,
      vectorGroup: deriveU64Group(baseBits, lanes),
      customGroupBits: 0,
      vectorLabel: buildVectorLabel(baseBits, lanes),
    });
  };
  const setCustomVectorGrouping = (bits) => {
    const nextBits = Math.max(1, parseInt(bits || '0', 10) || 1);
    setMany({
      vectorMode: 'custom',
      customGroupBits: nextBits,
      bitLayout: '8x1',
      byteLayout: '8x1',
      vectorLabel: `custom (${nextBits}b)`,
    });
  };
  const commitCustomGrouping = React.useCallback((value) => {
    const parsed = Math.max(1, parseInt(value || '0', 10) || 1);
    setCustomGroupDraft(String(parsed));
    setCustomVectorGrouping(parsed);
  }, [setCustomVectorGrouping]);
  const isCustomVectorMode = s.vectorMode === 'custom' && (parseInt(s.customGroupBits || 0, 10) || 0) > 0;
  const activeGroupingKey = (() => {
    if (isCustomVectorMode) return 'custom';
    const baseBits = parseInt(s.vectorBaseBits || 64, 10) || 64;
    const lanes = parseInt(s.vectorLanes || 1, 10) || 1;
    if (baseBits === 16 && lanes === 1) return '16bit';
    if (baseBits === 16 && lanes === 2) return '16x2';
    if (baseBits === 16 && lanes === 4) return '16x4';
    if (baseBits === 16 && lanes === 8) return '16x8';
    if (baseBits === 32 && lanes === 1) return '32bit';
    if (baseBits === 32 && lanes === 2) return '32x2';
    if (baseBits === 32 && lanes === 4) return '32x4';
    if (baseBits === 32 && lanes === 8) return '32x8';
    if (baseBits === 64 && lanes === 1) return '64bit';
    if (baseBits === 64 && lanes === 2) return '64x2';
    if (baseBits === 64 && lanes === 4) return '64x4';
    if (baseBits === 64 && lanes === 8) return '64x8';
    return '64bit';
  })();
  const activeGroupingLabel = isCustomVectorMode
    ? `custom (${Math.max(1, parseInt(s.customGroupBits || 1, 10) || 1)} bits)`
    : GROUPING_PRESETS[activeGroupingKey]?.label || (s.vectorLabel || '64bit');
  const selectGroupingPreset = (presetKey) => {
    const preset = GROUPING_PRESETS[presetKey];
    if (!preset) return;
    setVectorProfile(preset.baseBits, preset.lanes);
    setGroupingMenuOpen(false);
    setCustomPresetMenuOpen(false);
  };

  const renderGroupingFamily = (family) => {
    const activeKey = family.optionKeys.includes(activeGroupingKey) ? activeGroupingKey : family.defaultKey;
    const menuOpen = groupingMenuOpen === family.familyKey;
    const showGroupingMenuItems = !isWindowsPlatform;
    return (
      <div key={family.familyKey} className={`grouping-family grouping-family-${family.familyKey}${family.optionKeys.includes(activeGroupingKey) ? ' active-family' : ''}${menuOpen ? ' open' : ''}`}>
        <button
          type="button"
          className={`btn-option grouping-family-main${family.optionKeys.includes(activeGroupingKey) ? ' active' : ''}`}
          title={GROUPING_PRESETS[activeKey].title}
          onClick={() => selectGroupingPreset(activeKey)}
        >
          <span className={`grouping-chip-preview ${groupingPreviewClassName(activeKey)}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>{GROUPING_PRESETS[activeKey].label}</span>
        </button>
        {showGroupingMenuItems && (
          <button
            type="button"
            className={`btn-option grouping-family-toggle${menuOpen ? ' active' : ''}`}
            title={menuOpen ? `Hide ${family.familyKey}-bit grouping options` : `Show ${family.familyKey}-bit grouping options`}
            aria-expanded={menuOpen ? 'true' : 'false'}
            onClick={() => setGroupingMenuOpen((open) => open === family.familyKey ? false : family.familyKey)}
          >
            {menuOpen ? '▴' : '▾'}
          </button>
        )}
        {showGroupingMenuItems && menuOpen && (
          <div className="grouping-family-menu">
            {family.optionKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={`btn-option grouping-menu-chip${activeGroupingKey === key ? ' active' : ''}`}
                title={GROUPING_PRESETS[key].title}
                onClick={() => selectGroupingPreset(key)}
              >
                <span className={`grouping-chip-preview ${groupingPreviewClassName(key)}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span>{GROUPING_PRESETS[key].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const outline = outlineSettings || { targets: [] };

  const CL_ANNOT_CYCLE = ['none', 'hits', 'age', 'both'];
  const CL_ANNOT_HINTS = {
    none: 'Annotation off — click to enable',
    hits: 'Hit count (\u00d7N) per cache line',
    age:  'Steps since last hit (\u0394N) per cache line',
    both: 'Hit count + steps since last hit per cache line',
  };
  const cycleCLAnnotation = () => {
    const i = CL_ANNOT_CYCLE.indexOf(cachelineAnnotation);
    onCachelineAnnotationChange(CL_ANNOT_CYCLE[(i + 1) % CL_ANNOT_CYCLE.length]);
  };

  const annotationGroupingLabel = isCustomVectorMode
    ? `custom (${Math.max(1, parseInt(s.customGroupBits || 1, 10) || 1)} bits)`
    : activeGroupingLabel;
  const bitAnnotationHint = !s.showBitLabels
    ? `Bit labels are hidden. `
    : (s.bitLabelMode === 'byte'
      ? `Shows bit position relative to each byte.`
      : s.bitLabelMode === 'group'
        ? `Shows bit position inside each grouping.`
        : `Shows global bit index in the full sieve.`);
  const byteAnnotationHint = !s.showByteLabels
    ? `Byte labels are hidden. ${describeLayout(s.byteLayout, BYTE_LAYOUTS, 'Bytes')}`
    : ((s.byteLabelMode || 'group') === 'global'
      ? `Shows byte index across the full sieve.`
      : `Shows byte index relative to each grouping.`);

  React.useEffect(() => {
    if (isCustomVectorMode) {
      setCustomGroupDraft(String(Math.max(1, parseInt(s.customGroupBits || 1, 10) || 1)));
      return;
    }
    setCustomGroupDraft('');
  }, [isCustomVectorMode, s.customGroupBits]);

  const cycleBitAnnotation = () => {
    if (!s.showBitLabels) {
      onChange({ ...s, showBitLabels: true, bitLabelMode: 'global' });
      return;
    }
    if ((s.bitLabelMode || 'global') === 'global') {
      onChange({ ...s, showBitLabels: true, bitLabelMode: 'byte' });
      return;
    }
    if (s.bitLabelMode === 'byte') {
      onChange({ ...s, showBitLabels: true, bitLabelMode: 'group' });
      return;
    }
    onChange({ ...s, showBitLabels: false, bitLabelMode: 'global' });
  };

  const cycleByteAnnotation = () => {
    if (!s.showByteLabels) {
      onChange({ ...s, showByteLabels: true, byteLabelMode: 'group' });
      return;
    }
    if ((s.byteLabelMode || 'group') === 'group') {
      onChange({ ...s, showByteLabels: true, byteLabelMode: 'global' });
      return;
    }
    onChange({ ...s, showByteLabels: false, byteLabelMode: 'group' });
  };

  /**
   * Unified layout controls with icon buttons and spacing rows.
   * No large preview block so panel height remains stable while changing options.
   */
  const LayoutOverview = () => {
    return (
      <>
        <div className="settings-section">
        <label>Annotations</label>
        <div className="anno-btn-grid">
          <AnnotationButton
            title="Number"
            hint="Represented numbers in squares"
            active={!!s.showNumberLabels}
            onClick={() => set('showNumberLabels', !s.showNumberLabels)}
            preview={(
              <svg viewBox="0 0 44 18" width="44" height="22" aria-hidden="true">
                <rect x="1" y="1" width="10" height="8" rx="1" />
                <rect x="15" y="1" width="12" height="8" rx="1" />
                <text x="2" y="16" fontSize="7">1 3 5</text>
              </svg>
            )}
          />
          <AnnotationButton
            title="Bits"
            hint={bitAnnotationHint}
            active={!!s.showBitLabels}
            onClick={cycleBitAnnotation}
            preview={(
              <svg viewBox="0 0 44 18" width="44" height="22" aria-hidden="true">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="17" y="1" width="6" height="6" rx="1" />
                <text x="2" y="16" fontSize="7">0 1 2</text>
              </svg>
            )}
          />
          <AnnotationButton
            title="Bytes"
            hint={byteAnnotationHint}
            active={!!s.showByteLabels}
            onClick={cycleByteAnnotation}
            preview={(
              <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
                <text x="2" y="0" fontSize="10">b0</text>
                <text x="26" y="0" fontSize="10">b1</text>
                <rect x="1" y="3" width="18" height="20" rx="1" />
                <rect x="25" y="3" width="18" height="20" rx="1" />
              </svg>
            )}
          />
          <AnnotationButton
            title="Grouping"
            hint={`Grouping and uint64 labels (${annotationGroupingLabel})`}
            active={s.showVectorLabels !== false}
            onClick={() => set('showVectorLabels', s.showVectorLabels === false)}
            preview={(
              <svg viewBox="0 0 44 18" width="44" height="22" aria-hidden="true">
                <rect x="1" y="4" width="42" height="8" rx="2" />
                <line x1="15" y1="4" x2="15" y2="12" />
                <line x1="29" y1="4" x2="29" y2="12" />
                <text x="2" y="17" fontSize="7">v0  v1  v2</text>
              </svg>
            )}
          />
          <AnnotationButton
            title="Touch order"
            hint="Touch order above vectors"
            active={!!s.showVectorTouchOrder}
            onClick={() => set('showVectorTouchOrder', !(s.showVectorTouchOrder === true))}
            preview={(
              <svg viewBox="0 0 44 18" width="44" height="22" aria-hidden="true">
                <rect x="2" y="8" width="10" height="6" rx="1" />
                <rect x="16" y="8" width="10" height="6" rx="1" />
                <rect x="30" y="8" width="10" height="6" rx="1" />
                <text x="5" y="6" fontSize="6">1</text>
                <text x="16" y="6" fontSize="6">(2,6)</text>
              </svg>
            )}
          />
          <AnnotationButton
            title={cachelineAnnotation === 'none' ? 'Cacheline hits' : `Cacheline: ${cachelineAnnotation}`}
            hint={CL_ANNOT_HINTS[cachelineAnnotation]}
            active={cachelineAnnotation !== 'none'}
            onClick={cycleCLAnnotation}
            preview={(
              <svg viewBox="0 0 44 18" width="44" height="22" aria-hidden="true">
                <rect x="1" y="2" width="20" height="13" rx="1" fill="rgba(239,68,68,0.28)" stroke="currentColor" strokeWidth="0.5" />
                <rect x="3" y="10" width="16" height="4" rx="1" fill="rgba(239,68,68,0.85)" />
                <text x="4" y="13.5" fontSize="4.5" fill="#fff">×4 Δ3</text>
                <rect x="23" y="2" width="20" height="13" rx="1" fill="rgba(59,130,246,0.28)" stroke="currentColor" strokeWidth="0.5" />
                <rect x="25" y="10" width="16" height="4" rx="1" fill="rgba(59,130,246,0.85)" />
                <text x="26" y="13.5" fontSize="4.5" fill="#fff">×1 Δ12</text>
              </svg>
            )}
          />
        </div>
      </div>

      <div className="settings-section">
        <label>Grouping outlines</label>
        <div className="preview-btn-grid preview-btn-grid-3">
          <PreviewOptionButton
            compact
            label="Byte"
            hint="Thick dashed blue byte outlines"
            active={(outline.targets || []).includes('byte')}
            onClick={() => { const ts = outline.targets || []; const next = ts.includes('byte') ? ts.filter(t => t !== 'byte') : [...ts, 'byte']; onOutlineChange({ ...outline, targets: next }); }}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="9" y="5" width="10" height="12" rx="3" strokeDasharray="4 3" stroke="#3b82f6" strokeWidth="2" fill="none" />
                <rect x="29" y="5" width="10" height="12" rx="3" strokeDasharray="4 3" stroke="#3b82f6" strokeWidth="2" fill="none" />
              </svg>
            )}
          />
          <PreviewOptionButton
            compact
            label="Grouping"
            hint="Thin dashed blue grouping outlines"
            active={(outline.targets || []).includes('vector')}
            onClick={() => { const ts = outline.targets || []; const next = ts.includes('vector') ? ts.filter(t => t !== 'vector') : [...ts, 'vector']; onOutlineChange({ ...outline, targets: next }); }}
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
            active={(outline.targets || []).includes('cacheline')}
            onClick={() => { const ts = outline.targets || []; const next = ts.includes('cacheline') ? ts.filter(t => t !== 'cacheline') : [...ts, 'cacheline']; onOutlineChange({ ...outline, targets: next }); }}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="2" y="3" width="44" height="16" rx="4" strokeDasharray="6 3" stroke="#3b82f6" strokeWidth="2" fill="none" />
              </svg>
            )}
          />
        </div>
        <span className="settings-hint">Outlines are optional helpers for structure visibility. Multiple can be active at once.</span>
      </div>
      <div className="settings-section lo-section">
        <label>Arrangements and grouping</label>
        <div className="lo-level-row">
          <span className="lo-level-tag">Columns</span>
          <div className="lo-row-body">
            <div className="lo-vec-wrap lo-column-count-control">
              <button
                type="button"
                className={`spacing-toggle-btn${Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0) === 0 ? ' active' : ''}`}
                onClick={() => {
                  const current = Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0);
                  if (current === 0) {
                    const fromAutoFit = Math.max(0, parseInt(autoFitColumns || 0, 10) || 0);
                    const next = Math.max(1, fromAutoFit || lastManualColumnCountRef.current || 1);
                    lastManualColumnCountRef.current = next;
                    set('horizontalGroups', next);
                    return;
                  }
                  lastManualColumnCountRef.current = current;
                  set('horizontalGroups', 0);
                }}
                title={Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0) === 0
                  ? 'Disable auto fit and use the last manual column count'
                  : 'Enable automatic column fitting'}
              >
                {Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0) === 0 ? 'Auto fit on' : 'Auto fit off'}
              </button>
              <button
                type="button"
                className="btn-icon btn-sm spacing-adjust-btn"
                onClick={() => {
                  const current = Math.max(1, parseInt(s.horizontalGroups || 0, 10) || lastManualColumnCountRef.current || 1);
                  const next = Math.max(1, current - 1);
                  lastManualColumnCountRef.current = next;
                  set('horizontalGroups', next);
                }}
                title="Decrease grouping column count"
              >−</button>
              <span
                className="lo-column-count-value"
                title={Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0) === 0 ? 'Auto fit: number of columns adjusts to viewport' : `${Math.max(1, parseInt(s.horizontalGroups || 0, 10) || lastManualColumnCountRef.current || 1)} grouping columns`}
              >
                {Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0) === 0
                  ? 'auto'
                  : Math.max(1, parseInt(s.horizontalGroups || 0, 10) || lastManualColumnCountRef.current || 1)}
              </span>
              <button
                type="button"
                className="btn-icon btn-sm spacing-adjust-btn"
                onClick={() => {
                  const current = Math.max(1, parseInt(s.horizontalGroups || 0, 10) || lastManualColumnCountRef.current || 1);
                  const next = current + 1;
                  lastManualColumnCountRef.current = next;
                  set('horizontalGroups', next);
                }}
                title="Increase grouping column count"
              >+</button>
            </div>
          </div>
        </div>

        {/* Bit layout row */}
        <div className="lo-level-row lo-level-row-with-spacing">
          <span className="lo-level-tag">Bit</span>
          <div className="lo-row-body">
            <div className="layout-icons">
              {Object.entries(BIT_LAYOUTS).map(([k, v]) => (
                <LayoutIcon key={k} cols={v.grid3x3 ? 3 : v.cols} rows={v.grid3x3 ? 3 : v.rows}
                            grid3x3={v.grid3x3} active={s.bitLayout === k}
                            onClick={() => set('bitLayout', k)} tooltip={BIT_LAYOUT_TIPS[k]} size={40} />
              ))}
            </div>
            <SpacingControl title="Bit spacing" keyH="bitSpacingH" keyV="bitSpacingV" max={10}
              openSpacingControl={openSpacingControl} setOpenSpacingControl={setOpenSpacingControl}
              s={s} incr={incr} decr={decr} />
          </div>
        </div>
        <p className="layout-description layout-description-grouping">{BIT_LAYOUT_TIPS[s.bitLayout] || 'Pick how bits are arranged inside a byte.'}</p>

        {/* Byte layout row */}
        <div className="lo-level-row lo-level-row-with-spacing">
          <span className="lo-level-tag">Byte</span>
          <div className="lo-row-body">
            <div className="layout-icons">
              {Object.entries(BYTE_LAYOUTS).map(([k, v]) => (
                <LayoutIcon key={k} cols={v.grid3x3 ? 3 : v.cols} rows={v.grid3x3 ? 3 : v.rows}
                            grid3x3={v.grid3x3} active={s.byteLayout === k}
                            onClick={() => set('byteLayout', k)} tooltip={BYTE_LAYOUT_TIPS[k]} size={40} />
              ))}
            </div>
            <SpacingControl title="Byte spacing" keyH="byteSpacingH" keyV="byteSpacingV" max={20}
              openSpacingControl={openSpacingControl} setOpenSpacingControl={setOpenSpacingControl}
              s={s} incr={incr} decr={decr} />
          </div>
        </div>
        <p className="layout-description layout-description-grouping">{BYTE_LAYOUT_TIPS[s.byteLayout] || 'Pick how bytes are arranged inside a uint64.'}</p>

        <div className="lo-level-row lo-level-row-stacked">
          <span className="lo-level-tag">Grouping</span>
          <div className="lo-row-body lo-row-body-stacked">
            <div className="lo-vec-wrap">
              <div className="grouping-preset-row grouping-preset-row-primary">
                {GROUPING_FAMILIES.map(renderGroupingFamily)}
                <button
                  type="button"
                  className={`btn-option grouping-chip${isCustomVectorMode ? ' active' : ''}`}
                  title="Custom bit grouping mode"
                  onClick={() => {
                    setGroupingMenuOpen(false);
                    setCustomPresetMenuOpen(false);
                    setCustomVectorGrouping((parseInt(s.customGroupBits || 0, 10) || CUSTOM_GROUP_PRESETS[2]));
                  }}
                >
                  <span className="grouping-chip-preview grouping-chip-preview-custom" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>custom</span>
                </button>
                <SpacingControl
                  title="Grouping spacing"
                  keyH="u64SpacingH"
                  keyV="u64SpacingV"
                  max={20}
                  className="spacing-inline-grouping"
                  openSpacingControl={openSpacingControl} setOpenSpacingControl={setOpenSpacingControl}
                  s={s} incr={incr} decr={decr}
                />
              </div>
              <p className="layout-description">Current: {activeGroupingLabel}</p>
              {isCustomVectorMode && (
                <>
                  <div className="grouping-custom-control">
                    <div className={`grouping-custom-input-wrap${customPresetMenuOpen ? ' open' : ''}`}>
                      <input
                        className="grouping-custom-input"
                        type="number"
                        min={1}
                        step={1}
                        value={customGroupDraft}
                        onChange={(e) => setCustomGroupDraft(e.target.value)}
                        onBlur={(e) => commitCustomGrouping(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            commitCustomGrouping(e.currentTarget.value);
                          }
                        }}
                        placeholder="bits"
                      />
                      <button
                        type="button"
                        className={`grouping-custom-toggle${customPresetMenuOpen ? ' active' : ''}`}
                        title={customPresetMenuOpen ? 'Hide preset group sizes' : 'Show preset group sizes'}
                        aria-expanded={customPresetMenuOpen ? 'true' : 'false'}
                        onClick={() => setCustomPresetMenuOpen((open) => !open)}
                      >
                        {customPresetMenuOpen ? '▴' : '▾'}
                      </button>
                      {customPresetMenuOpen && (
                        <div className="grouping-custom-menu">
                          {CUSTOM_GROUP_PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              className={`btn-option grouping-custom-menu-item${Number(s.customGroupBits) === p ? ' active' : ''}`}
                              onClick={() => {
                                commitCustomGrouping(String(p));
                                setCustomPresetMenuOpen(false);
                              }}
                              title={`Use ${p} bits per grouping`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="settings-hint">bits per group</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lo-level-row lo-level-row-stacked">
          <span className="lo-level-tag">Cache</span>
          <div className="lo-vec-wrap">
            <span className="lo-subtag">Cacheline size</span>
            <div className="lo-vec-icons lo-cache-icons">
              {Object.entries(CACHELINE_SIZES).map(([k]) => (
                <button
                  key={k}
                  className={`btn-option grouping-chip cacheline-chip${cachelineSize === parseInt(k) ? ' active' : ''}`}
                  onClick={() => {
                    onCachelineSizeChange(parseInt(k));
                    onCachePresetChange('fixed');
                  }}
                  title={`${k} byte cacheline`}
                >
                  {k}B
                </button>
              ))}
              <button
                className={`btn-option grouping-chip cacheline-chip${(cachePreset || 'fixed') !== 'fixed' ? ' active' : ''}`}
                onClick={() => onCachePresetChange('custom')}
                title="Custom cacheline size"
              >
                custom
              </button>
            </div>
          </div>
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
      </>
    );
  };

  return (
    <>
      <div className="settings-section">
        <label>Grid view</label>
        <div className="preview-btn-grid preview-btn-grid-3">
          <PreviewOptionButton
            compact
            label="Heatmap"
            hint="Color cachelines by hit count and recency"
            active={!!heatMapEnabled}
            onClick={() => onHeatMapToggle(!heatMapEnabled)}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="4" y="5" width="10" height="12" fill="#ef4444" stroke="none" />
                <rect x="18" y="5" width="10" height="12" fill="#f59e0b" stroke="none" />
                <rect x="32" y="5" width="10" height="12" fill="#3b82f6" stroke="none" />
              </svg>
            )}
          />
          <PreviewOptionButton
            compact
            label="Primes"
            hint="Highlight bits representing primes"
            active={!!primeOverlayEnabled}
            extraClass="prime-overlay-preview-btn"
            onClick={() => onPrimeOverlayToggle && onPrimeOverlayToggle(!primeOverlayEnabled)}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="4" y="5" width="8" height="10" rx="1" fill="#fbbf24" stroke="none" />
                <rect x="16" y="5" width="8" height="10" rx="1" fill="rgba(251,191,36,0.35)" stroke="none" />
                <rect x="28" y="5" width="8" height="10" rx="1" fill="#fbbf24" stroke="none" />
                <rect x="40" y="5" width="4" height="10" rx="1" fill="rgba(251,191,36,0.35)" stroke="none" />
              </svg>
            )}
          />
          <PreviewOptionButton
            compact
            label="Range"
            hint="Highlight a contiguous range of bit indices"
            active={!!rangeOverlayEnabled}
            extraClass="range-overlay-preview-btn"
            onClick={() => onRangeOverlayToggle && onRangeOverlayToggle(!rangeOverlayEnabled)}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="4" y="5" width="8" height="10" rx="1" fill="rgba(34,211,238,0.35)" stroke="none" />
                <rect x="14" y="5" width="8" height="10" rx="1" fill="#22d3ee" stroke="none" />
                <rect x="24" y="5" width="8" height="10" rx="1" fill="#22d3ee" stroke="none" />
                <rect x="34" y="5" width="8" height="10" rx="1" fill="rgba(34,211,238,0.35)" stroke="none" />
              </svg>
            )}
          />
          <PreviewOptionButton
            compact
            label="Multiples"
            hint="Highlight multiples of a given prime"
            active={!!multiplesOverlayEnabled}
            extraClass="multiples-overlay-preview-btn"
            onClick={() => onMultiplesOverlayToggle && onMultiplesOverlayToggle(!multiplesOverlayEnabled)}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="4" y="5" width="8" height="10" rx="1" fill="rgba(167,139,250,0.35)" stroke="none" />
                <rect x="14" y="5" width="8" height="10" rx="1" fill="rgba(167,139,250,0.35)" stroke="none" />
                <rect x="24" y="5" width="8" height="10" rx="1" fill="#a78bfa" stroke="none" />
                <rect x="34" y="5" width="8" height="10" rx="1" fill="rgba(167,139,250,0.35)" stroke="none" />
              </svg>
            )}
          />
          {minimapControlVisible && (
            <PreviewOptionButton
              compact
              label="Minimap"
              hint="Show navigation minimap"
              active={showMinimap !== false}
              onClick={() => onShowMinimapChange && onShowMinimapChange(!(showMinimap !== false))}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="3" y="3" width="42" height="16" rx="2" />
                  <rect x="18" y="7" width="12" height="8" rx="1" />
                </svg>
              )}
            />
          )}
          <PreviewOptionButton
            compact
            label={balloonMode === 'off' ? 'Balloon: off' : balloonMode === 'bit-clock' ? 'Balloon: click' : 'Balloon: hover'}
            hint={balloonMode === 'off' ? 'Balloons off — click to enable on bit click' : balloonMode === 'bit-clock' ? 'Balloons on bit click — click for click+hover' : 'Balloons on click+hover — click to disable'}
            active={balloonMode !== 'off'}
            onClick={() => set('balloonMode', balloonMode === 'off' ? 'bit-clock' : balloonMode === 'bit-clock' ? 'click-hover' : 'off')}
            preview={balloonMode === 'off' ? (
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="8" y="4" width="28" height="14" rx="3" fill="var(--bg-input)" stroke="var(--border-light)" strokeWidth="1.5" />
                <line x1="10" y1="6" x2="34" y2="18" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round" />
                <line x1="34" y1="6" x2="10" y2="18" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : balloonMode === 'bit-clock' ? (
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="7" y="2" width="24" height="13" rx="2" fill="var(--bg-raised)" stroke="var(--border-light)" strokeWidth="1.5" />
                <polygon points="13,15 19,15 16,19" fill="var(--border-light)" />
                <rect x="11" y="5" width="12" height="2" rx="1" fill="var(--fg-muted)" />
                <rect x="11" y="9" width="8" height="2" rx="1" fill="var(--fg-dim)" />
                <circle cx="38" cy="16" r="4" fill="none" stroke="var(--fg-muted)" strokeWidth="1.5" />
                <line x1="36" y1="18" x2="42" y2="22" stroke="var(--fg-muted)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="4" y="2" width="24" height="13" rx="2" fill="var(--bg-raised)" stroke="var(--accent)" strokeWidth="1.5" />
                <polygon points="10,15 16,15 13,19" fill="var(--accent)" />
                <rect x="8" y="5" width="12" height="2" rx="1" fill="var(--fg-muted)" />
                <rect x="8" y="9" width="8" height="2" rx="1" fill="var(--fg-dim)" />
                <circle cx="38" cy="11" r="5" fill="var(--accent-bg)" stroke="var(--accent)" strokeWidth="1.5" />
              </svg>
            )}
          />
        </div>
        {/* Range overlay controls */}
        {rangeOverlayEnabled && (
          <div className="settings-row overlay-inline-controls overlay-input-row">
            <label className="overlay-inline-field overlay-input-label" title="First bit index in range (inclusive)">
              <span>Range start (bit)</span>
              <input
                type="number"
                min={0}
                step={1}
                className="overlay-number-input"
                value={rangeStart.draft}
                onChange={(e) => rangeStart.setDraft(e.target.value)}
                onBlur={(e) => rangeStart.commit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') rangeStart.commit(e.currentTarget.value);
                }}
              />
            </label>
            <label className="overlay-inline-field overlay-input-label" title="Last bit index in range (inclusive)">
              <span>Range end (bit)</span>
              <input
                type="number"
                min={0}
                step={1}
                className="overlay-number-input"
                value={rangeEnd.draft}
                onChange={(e) => rangeEnd.setDraft(e.target.value)}
                onBlur={(e) => rangeEnd.commit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') rangeEnd.commit(e.currentTarget.value);
                }}
              />
            </label>
            <button type="button" className="overlay-reset-btn" onClick={() => onRangeOverlayReset && onRangeOverlayReset()} title="Reset range to current event defaults">⟳</button>
          </div>
        )}
        {/* Multiples overlay controls */}
        {multiplesOverlayEnabled && (
          <div className="settings-row overlay-inline-controls overlay-input-row">
            <label className="overlay-inline-field overlay-input-label" title="Highlight all bits whose number is a multiple of this value">
              <span>Prime / step factor</span>
              <input
                type="number"
                min={2}
                step={1}
                className="overlay-number-input"
                value={multiplesPrime.draft}
                onChange={(e) => multiplesPrime.setDraft(e.target.value)}
                onBlur={(e) => multiplesPrime.commit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') multiplesPrime.commit(e.currentTarget.value);
                }}
              />
            </label>
            <button type="button" className="overlay-reset-btn" onClick={() => onMultiplesOverlayReset && onMultiplesOverlayReset()} title="Reset to current event's prime">⟳</button>
            <span className="settings-hint" style={{ alignSelf: 'flex-end', marginBottom: 2 }}>Highlights multiples of this number in purple</span>
          </div>
        )}
      </div>

      {LayoutOverview()}
   </>
  );
}

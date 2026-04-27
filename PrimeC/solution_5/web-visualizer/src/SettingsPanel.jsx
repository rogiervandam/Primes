import React from 'react';
import { BIT_LAYOUTS, BYTE_LAYOUTS, COLOR_PRESETS, STORAGE_MODELS, CACHELINE_SIZES, CACHE_PRESETS } from './SieveRenderer';
import {
  playbackSpeedToPercent as playbackSpeedToMs,
  percentToPlaybackSpeed as msToPlaybackSpeed,
  stepSpeedToInterval,
  intervalToStepSpeed,
} from './lib/unitConverters';
import { useDraftInput } from './hooks/useDraftInput';
import {
  BIT_LAYOUT_TIPS,
  BYTE_LAYOUT_TIPS,
  describeLayout,
  VECTOR_TIPS,
  GROUPING_PRESETS,
  GROUPING_FAMILIES,
  CUSTOM_GROUP_PRESETS,
  groupingPreviewClassName,
  VECTOR_BASE_OPTIONS,
  VECTOR_LANE_OPTIONS,
} from './settings/constants';
import LegendSections from './settings/LegendSections';
import {
  LayoutIcon,
  VectorIcon,
  SpacingIcon,
  GearIcon,
  AnnotationButton,
  PreviewOptionButton,
} from './settings/buttons';

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
  settings, onChange, collapsed, onToggleCollapse,
  playSpeed, onPlaySpeedChange,
  repeatAnim, onRepeatAnimChange,
  delayBetweenRepeats, onDelayBetweenRepeatsChange,
  eventTimeTargets, onEventTimeTargetsChange,
  animMode, onAnimModeChange,
  animStyle, onAnimStyleChange,
  maskAnimationEnabled, onMaskAnimationEnabledChange,
  animationReplayPaused, onAnimationReplayPausedChange,
  bitAnimInterval, onBitAnimIntervalChange,
  maxStepDurationEnabled, onMaxStepDurationEnabledChange,
  maxStepDurationMs, onMaxStepDurationMsChange,
  gridOpacity, onGridOpacityChange,
  colorPreset, onColorPresetChange,
  customColors, onCustomColorsChange,
  storageModel, onStorageModelChange,
  cachelineSize, onCachelineSizeChange,
  cachePreset, onCachePresetChange,
  heatMapEnabled, onHeatMapToggle,
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
  depthModeEnabled = false,
  depthSettings,
  onDepthSettingsChange,
  loweredSetBits = false,
  onLoweredSetBitsToggle,
  eventTitleSettings,
  onEventTitleSettingsChange,
  outlineSettings, onOutlineChange,
  isWindowsPlatform = false,
  showAnimationControls = true,
  customTitle = '',
  onCustomTitleChange,
  mode3D = false,
  onToggle3D,
}) {
  const s = settings || {};
  const [activeTab, setActiveTab] = React.useState('layout');
  const [groupingMenuOpen, setGroupingMenuOpen] = React.useState(false);
  const [customPresetMenuOpen, setCustomPresetMenuOpen] = React.useState(false);
  const [customGroupDraft, setCustomGroupDraft] = React.useState('');
  const [openSpacingControl, setOpenSpacingControl] = React.useState(null);
  const [legendFloating, setLegendFloating] = React.useState(false);
  const [legendDetailed, setLegendDetailed] = React.useState(true);
  const [floatPos, setFloatPos] = React.useState(null);
  const floatDragRef = React.useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  // Editable text drafts for the overlay inputs. The hook keeps the draft in
  // sync with the externally-controlled value and parses + clamps on commit.
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

  React.useEffect(() => {
    const value = Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0);
    if (value > 0) lastManualColumnCountRef.current = value;
  }, [s.horizontalGroups]);

  // Drag handler for floating legend panel
  React.useEffect(() => {
    if (!legendFloating) return undefined;
    const onMouseMove = (e) => {
      if (!floatDragRef.current.dragging) return;
      const dx = e.clientX - floatDragRef.current.startX;
      const dy = e.clientY - floatDragRef.current.startY;
      setFloatPos({ x: floatDragRef.current.originX + dx, y: floatDragRef.current.originY + dy });
    };
    const onMouseUp = () => { floatDragRef.current.dragging = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [legendFloating]);

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

  const set = (key, val) => {
    // Note: *Description fields used to be written here as tooltip cache,
    // but nothing reads them anymore. Tooltips are looked up from the
    // *_TIPS tables at render time. Keep this writer minimal.
    const updatedSettings = { ...s, [key]: val };
    if (key === 'vectorGroup') {
      updatedSettings.vectorMode = 'preset';
      updatedSettings.customGroupBits = 0;
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
      vectorMode: 'preset',
      vectorBaseBits: baseBits,
      vectorLanes: lanes,
      vectorGroup: vg,
      customGroupBits: 0,
      vectorLabel: profileLabel,
    });
  };
  const incr = (key, max) => set(key, Math.min(max, (s[key] || 0) + 1));
  const decr = (key, min = 0) => set(key, Math.max(min, (s[key] || 0) - 1));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const adjustRepeatAnim = (deltaMs) => onRepeatAnimChange(clamp((repeatAnim || 0) + deltaMs, 0, 5000));
  const playbackSpeedValue = msToPlaybackSpeed(playSpeed || 100);
  const stepSpeedValue = intervalToStepSpeed(bitAnimInterval || 20);
  const setVectorGroupSimple = (group) => {
    onChange({
      ...s,
      vectorMode: 'preset',
      vectorGroup: group,
      customGroupBits: 0,
      vectorLabel: group > 1 ? `uint64v${group}` : 'uint64',
    });
  };
  const setCustomVectorGrouping = (bits) => {
    const nextBits = Math.max(1, parseInt(bits || '0', 10) || 1);
    onChange({
      ...s,
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
  const activeFamily = GROUPING_FAMILIES.find((family) => family.optionKeys.includes(activeGroupingKey)) || GROUPING_FAMILIES[2];
  const activeFamilyKey = activeFamily.optionKeys.includes(activeGroupingKey) ? activeGroupingKey : activeFamily.defaultKey;
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

  const outline = outlineSettings || {
    target: 'none',
  };

  const CL_ANNOT_CYCLE = ['none', 'hits', 'age', 'both'];
  const CL_ANNOT_HINTS = {
    none: 'Heatmap annotation off',
    hits: 'Hit count (\u00d7N) since last event',
    age:  'Age since last hit (\u0394N)',
    both: 'Hits until this event + age since last hit',
  };
  const cycleCLAnnotation = () => {
    if (!heatMapEnabled) return;
    const i = CL_ANNOT_CYCLE.indexOf(cachelineAnnotation);
    onCachelineAnnotationChange(CL_ANNOT_CYCLE[(i + 1) % CL_ANNOT_CYCLE.length]);
  };

  const annotationGroupingLabel = isCustomVectorMode
    ? `custom (${Math.max(1, parseInt(s.customGroupBits || 1, 10) || 1)} bits)`
    : activeGroupingLabel;
  const bitAnnotationHint = !s.showBitLabels
    ? `Bit labels are hidden. ${describeLayout(s.bitLayout, BIT_LAYOUTS, 'Bits')}`
    : (s.bitLabelMode === 'byte'
      ? `Shows bit position relative to each byte. ${describeLayout(s.bitLayout, BIT_LAYOUTS, 'Bits')}`
      : s.bitLabelMode === 'group'
        ? `Shows bit position inside each grouping. ${describeLayout(s.bitLayout, BIT_LAYOUTS, 'Bits')}`
        : `Shows global bit index in the full sieve. ${describeLayout(s.bitLayout, BIT_LAYOUTS, 'Bits')}`);
  const byteAnnotationHint = !s.showByteLabels
    ? `Byte labels are hidden. ${describeLayout(s.byteLayout, BYTE_LAYOUTS, 'Bytes')}`
    : ((s.byteLabelMode || 'group') === 'global'
      ? `Shows byte index across the full sieve. ${describeLayout(s.byteLayout, BYTE_LAYOUTS, 'Bytes')}`
      : `Shows byte index relative to each grouping. ${describeLayout(s.byteLayout, BYTE_LAYOUTS, 'Bytes')}`);

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
    // Compact spacing control row
    const SpacingControl = ({ title, keyH, keyV, max, className = '', columnControl = null }) => {
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
    };

    return (
      <>
      <div className="settings-section lo-section">
        <label>Arrangements and grouping</label>

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
            <SpacingControl title="Bit spacing" keyH="bitSpacingH" keyV="bitSpacingV" max={10} />
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
            <SpacingControl title="Byte spacing" keyH="byteSpacingH" keyV="byteSpacingV" max={20} />
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

        <div className="lo-level-row">
          <span className="lo-level-tag">Columns</span>
          <div className="lo-row-body">
            <div className="lo-vec-wrap lo-column-count-control">
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
                  const next = Math.min(64, current + 1);
                  lastManualColumnCountRef.current = next;
                  set('horizontalGroups', next);
                }}
                title="Increase grouping column count"
              >+</button>
              <button
                type="button"
                className={`spacing-toggle-btn${Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0) === 0 ? ' active' : ''}`}
                onClick={() => {
                  const current = Math.max(0, parseInt(s.horizontalGroups || 0, 10) || 0);
                  if (current === 0) {
                    set('horizontalGroups', Math.max(1, lastManualColumnCountRef.current || 1));
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

        {/* Spacing controls — direct edits from this panel */}
      <div className="settings-section lo-section">
        <label>Spacing</label>
        <span className="settings-hint">Use the spacing controls above to tune horizontal and vertical gaps.</span>
      </div>
      </>
    );
  };

  return (
    <>
    <div className={`settings-sidebar${collapsed ? ' collapsed' : ''}${isWindowsPlatform ? ' platform-windows' : ''}`}>
      <div className="settings-header-rail" title="Settings">
        {collapsed ? (
          <h3 className="settings-collapsed-label"><GearIcon /> Settings</h3>
        ) : (
          <div className="settings-tab-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'layout'}
              className={`settings-tab-btn${activeTab === 'layout' ? ' active' : ''}`}
              onClick={() => setActiveTab('layout')}
            >
              Layout
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'animation'}
              className={`settings-tab-btn${activeTab === 'animation' ? ' active' : ''}`}
              onClick={() => setActiveTab('animation')}
            >
              Animation
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'legend'}
              className={`settings-tab-btn${activeTab === 'legend' ? ' active' : ''}`}
              onClick={() => setActiveTab('legend')}
            >
              Legend
            </button>
          </div>
        )}
        <button className="settings-collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand settings' : 'Collapse settings'}>
          {collapsed ? '◀' : '▶'}
        </button>
      </div>
      {!collapsed && (
        <div className="settings-panel-content">
        {activeTab === 'layout' && (<>
        <div className="settings-section">
          <label>Title &amp; Grid</label>
          <div className="settings-row overlay-inline-controls">
            <label className="overlay-inline-field overlay-inline-field-range">
              <span>Grid opacity</span>
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
          <div className="settings-row" style={{ marginTop: 8 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 4, width: '100%' }}>Color preset</label>
          </div>
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

        <div className="settings-section">
          <label>Grid view</label>
          <div className="preview-btn-grid preview-btn-grid-4">
            <PreviewOptionButton
              compact
              label="Heat map"
              hint="Color cachelines by hit count and recency: hot (red) = recently/frequently hit, cold (blue) = rarely/old"
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
              hint="Highlight all bits whose represented number is prime (gold overlay)"
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
              hint="Highlight a contiguous range of bit indices (cyan overlay). Defaults to the current event's focus range."
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
              hint="Highlight all bits whose represented number is a multiple of a given prime (purple overlay). Defaults to the current event's prime."
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
          {onToggle3D && (
            <div className="preview-btn-grid" >
              <PreviewOptionButton
                compact
                label="3D mode"
                hint="Toggle 3D bit-depth view"
                active={!!mode3D}
                onClick={() => onToggle3D()}
                preview={(
                  <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                    <path d="M6 15L24 20L42 15" stroke="currentColor" fill="none" strokeWidth="1.5" />
                    <path d="M6 11L24 16L42 11" stroke="currentColor" fill="none" strokeWidth="1.5" />
                    <path d="M6 7L24 2L42 7L24 12Z" stroke="currentColor" fill="none" strokeWidth="1.5" />
                  </svg>
                )}
              />
            </div>
          )}
            <PreviewOptionButton
              compact
              label="Event title"
              hint="Show the current event title above the canvas"
              active={eventTitleSettings?.visible !== false}
              onClick={() => onEventTitleSettingsChange && onEventTitleSettingsChange((prev) => ({
                ...(prev || eventTitleSettings || {}),
                visible: !((prev || eventTitleSettings || {}).visible !== false),
              }))}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="4" y="4" width="40" height="14" rx="3" />
                  <path d="M9 9h18" />
                  <path d="M9 13h28" />
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
          {eventTitleSettings?.visible !== false && (
            <>
              <div className="settings-row overlay-inline-controls">
                <label className="overlay-inline-field overlay-inline-field-range">
                  <span>Size</span>
                  <input
                    type="range"
                    min={70}
                    max={160}
                    step={5}
                    value={eventTitleSettings?.scale || 100}
                    onChange={(e) => onEventTitleSettingsChange && onEventTitleSettingsChange((prev) => ({
                      ...(prev || eventTitleSettings || {}),
                      scale: parseInt(e.target.value, 10),
                    }))}
                  />
                  <span className="val">{eventTitleSettings?.scale || 100}%</span>
                </label>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => onEventTitleSettingsChange && onEventTitleSettingsChange((prev) => ({
                    ...(prev || eventTitleSettings || {}),
                    dragOffsetX: 0,
                    dragOffsetY: 0,
                  }))}
                  title="Re-center the event title banner"
                >
                  Recenter
                </button>
              </div>
              <span className="settings-hint">Drag the banner to reposition. It opens the events panel when clicked without dragging.</span>
            </>
          )}
        </div>


        <LayoutOverview />

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
              title="Number"
              hint="Represented numbers in squares"
              active={!!s.showNumberLabels}
              onClick={() => set('showNumberLabels', !s.showNumberLabels)}
              preview={(
                <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
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
              hint={byteAnnotationHint}
              active={!!s.showByteLabels}
              onClick={cycleByteAnnotation}
              preview={(
                <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
                  <rect x="1" y="1" width="18" height="8" rx="1" />
                  <rect x="23" y="1" width="18" height="8" rx="1" />
                  <text x="2" y="16" fontSize="7">b0    b1</text>
                </svg>
              )}
            />
            <AnnotationButton
              title="Grouping"
              hint={`Grouping and uint64 labels (${annotationGroupingLabel})`}
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
            <AnnotationButton
              title="Touch order"
              hint="Touch order above vectors"
              active={!!s.showVectorTouchOrder}
              onClick={() => set('showVectorTouchOrder', !(s.showVectorTouchOrder === true))}
              preview={(
                <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
                  <rect x="2" y="8" width="10" height="6" rx="1" />
                  <rect x="16" y="8" width="10" height="6" rx="1" />
                  <rect x="30" y="8" width="10" height="6" rx="1" />
                  <text x="5" y="6" fontSize="6">1</text>
                  <text x="16" y="6" fontSize="6">(2,6)</text>
                </svg>
              )}
            />
            <AnnotationButton
              title={cachelineAnnotation === 'none' ? 'CL label' : `Cacheline: ${cachelineAnnotation}`}
              hint={!heatMapEnabled ? 'Enable heat map to use cacheline annotation' : CL_ANNOT_HINTS[cachelineAnnotation]}
              active={heatMapEnabled && cachelineAnnotation !== 'none'}
              onClick={cycleCLAnnotation}
              preview={(
                <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
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
              label="Grouping"
              hint="Thin dashed blue grouping outlines"
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
          <span className="settings-hint">Outlines are optional helpers for structure visibility.</span>
        </div>
        </>)}

        {activeTab === 'legend' && (
          <div className="legend-tab-content">
            <div className="legend-tab-header">
              <span className="legend-tab-title">Visualizer Legend</span>
              <div className="legend-tab-controls">
                <button
                  type="button"
                  className={`legend-detail-btn${legendDetailed ? ' active' : ''}`}
                  onClick={() => setLegendDetailed((d) => !d)}
                  title={legendDetailed ? 'Show compact legend' : 'Show detailed legend'}
                >
                  {legendDetailed ? 'Compact' : 'Detailed'}
                </button>
                <button
                  type="button"
                  className="legend-float-btn"
                  title="Float legend panel (collapses settings)"
                  onClick={() => {
                    if (!floatPos) setFloatPos({ x: window.innerWidth - 380, y: 60 });
                    setLegendFloating(true);
                    onToggleCollapse && onToggleCollapse();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              </div>
            </div>
            <LegendSections detailed={legendDetailed} />
          </div>
        )}

        {activeTab === 'animation' && showAnimationControls && (<>
        <div className="settings-section">
          <label>Animation style</label>
          <div className="preview-btn-grid preview-btn-grid-3">
            <PreviewOptionButton
              compact
              label="Ripple"
              hint="Contracting ripple ring"
              active={(animStyle || 'ripple') === 'ripple'}
              onClick={() => onAnimStyleChange((animStyle || 'ripple') === 'ripple' ? 'none' : 'ripple')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <circle cx="24" cy="11" r="8" />
                  <circle cx="24" cy="11" r="4" />
                  <circle cx="24" cy="11" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Fade"
              hint="Soft fading highlight"
              active={(animStyle || 'ripple') === 'fade'}
              onClick={() => onAnimStyleChange((animStyle || 'ripple') === 'fade' ? 'none' : 'fade')}
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
              compact
              label="Pulse"
              hint="Expand and contract"
              active={(animStyle || 'ripple') === 'pulse'}
              onClick={() => onAnimStyleChange((animStyle || 'ripple') === 'pulse' ? 'none' : 'pulse')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <circle cx="12" cy="11" r="3" />
                  <circle cx="24" cy="11" r="5" />
                  <circle cx="36" cy="11" r="7" />
                </svg>
              )}
            />
          </div>
        </div>

        {animStyle !== 'none' && (
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
        )}

        <div className="settings-section">
            <label>Animation timing</label>
            <div className="settings-row animation-timing-row" style={{ alignItems: 'flex-start', gap: 8 }}>
              <div className="timing-control">
                <span className="timing-title">Overall speed</span>
                <input
                  className="timing-slider"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={playbackSpeedValue}
                  onChange={(e) => onPlaySpeedChange(playbackSpeedToMs(e.target.value))}
                  title="Speed % applied to every per-event time target. 50% = twice as long, 200% = half as long."
                />
                <div className="timing-scale" aria-hidden="true">
                  <span>Slow</span>
                  <span className="timing-value">{playSpeed || 100}%</span>
                  <span>Fast</span>
                </div>
              </div>
              <div className="timing-control">
                <span className="timing-title">Delay between events</span>
                <input
                  className="timing-slider"
                  type="range"
                  min={0}
                  max={5000}
                  step={100}
                  value={repeatAnim || 0}
                  onChange={(e) => onRepeatAnimChange(clamp(parseInt(e.target.value || '0', 10) || 0, 0, 5000))}
                  title="Pause after one event finishes before the all-events widget advances to the next event."
                />
                <div className="timing-scale" aria-hidden="true">
                  <span>Off</span>
                  <span className="timing-value">{repeatAnim === 0 ? 'Off' : `${(repeatAnim / 1000).toFixed(1)}s`}</span>
                  <span>Long</span>
                </div>
              </div>
              <div className="timing-control">
                <span className="timing-title">Delay between repeats</span>
                <input
                  className="timing-slider"
                  type="range"
                  min={0}
                  max={5000}
                  step={100}
                  value={delayBetweenRepeats || 0}
                  onChange={(e) => onDelayBetweenRepeatsChange && onDelayBetweenRepeatsChange(clamp(parseInt(e.target.value || '0', 10) || 0, 0, 5000))}
                  title="Pause between repeats when the single-event widget is in play mode."
                />
                <div className="timing-scale" aria-hidden="true">
                  <span>Off</span>
                  <span className="timing-value">{(delayBetweenRepeats || 0) === 0 ? 'Off' : `${((delayBetweenRepeats || 0) / 1000).toFixed(1)}s`}</span>
                  <span>Long</span>
                </div>
              </div>
            </div>
            <div className="settings-row" style={{ marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={maskAnimationEnabled !== false} onChange={(e) => onMaskAnimationEnabledChange(e.target.checked)} />
                Mask stamp animation
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={maxStepDurationEnabled === true} onChange={(e) => onMaxStepDurationEnabledChange && onMaxStepDurationEnabledChange(e.target.checked)} />
                Limit step duration
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={animationReplayPaused === true} onChange={(e) => onAnimationReplayPausedChange(e.target.checked)} />
                Pause event replay
              </label>
            </div>
            {maxStepDurationEnabled === true && (
              <div className="settings-row" style={{ marginTop: 8 }}>
                <label className="overlay-inline-field overlay-inline-field-range" style={{ width: '100%' }}>
                  <span>Max step duration</span>
                  <input
                    type="range"
                    min={2000}
                    max={30000}
                    step={500}
                    value={Math.max(2000, Math.min(30000, parseInt(maxStepDurationMs || 8000, 10) || 8000))}
                    onChange={(e) => onMaxStepDurationMsChange && onMaxStepDurationMsChange(Math.max(2000, Math.min(30000, parseInt(e.target.value || '8000', 10) || 8000)))}
                  />
                  <span className="val">{(Math.max(2000, Math.min(30000, parseInt(maxStepDurationMs || 8000, 10) || 8000)) / 1000).toFixed(1)}s</span>
                </label>
              </div>
            )}
            {/* Per-event time targets — used when adaptiveDuration is on. The
                tier picked is based on the change count of the event; the
                resulting normal duration is divided by Overall speed %. */}
            {eventTimeTargets && onEventTimeTargetsChange && (
              <div className="settings-row" style={{ marginTop: 8, flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <span className="timing-title" style={{ marginBottom: 4 }}>Per-event normal time targets (at 100% speed)</span>
                {[
                  { key: 'none', label: '0 changes' },
                  { key: 'one',  label: '1 change' },
                  { key: 'two',  label: '2 changes' },
                  { key: 'few',  label: '3–10 changes' },
                  { key: 'many', label: '11–100 changes' },
                  { key: 'lots', label: '> 100 changes' },
                  { key: 'min',  label: 'Min (clamp ↓)' },
                  { key: 'max',  label: 'Max (clamp ↑)' },
                ].map(({ key, label }) => (
                  <label key={key} className="overlay-inline-field overlay-inline-field-range" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 130, fontSize: '0.85em' }}>{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={key === 'max' ? 30000 : (key === 'lots' ? 20000 : 10000)}
                      step={50}
                      value={Math.max(0, parseInt(eventTimeTargets[key] || 0, 10) || 0)}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                        onEventTimeTargetsChange({ ...eventTimeTargets, [key]: v });
                      }}
                    />
                    <span className="val" style={{ minWidth: 56, textAlign: 'right' }}>{((eventTimeTargets[key] || 0) / 1000).toFixed(2)}s</span>
                  </label>
                ))}
              </div>
            )}
            <span className="settings-hint">Overall speed multiplies every per-event time target. Per-event tiers set how long an event takes at 100% speed; values are clamped to Min / Max. Delay between events is used by the all-events play. Delay between repeats is used by the single-event play.</span>
          </div>

          {onLoweredSetBitsToggle && (
            <div className="settings-section">
              <label>Sieve depth mode</label>
              <div className="preview-btn-grid preview-btn-grid-3">
                <PreviewOptionButton
                  compact
                  label="Lowered bits"
                  hint="Set bits sink through the sieve — cleared bits stay at surface level"
                  active={!!loweredSetBits}
                  onClick={() => onLoweredSetBitsToggle()}
                  preview={(
                    <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true" strokeLinecap="round">
                      <rect x="4"  y="3" width="7" height="7" opacity="0.35" />
                      <rect x="14" y="3" width="7" height="7" opacity="0.35" />
                      <rect x="24" y="3" width="7" height="7" opacity="0.35" />
                      <rect x="34" y="3" width="7" height="7" opacity="0.35" />
                      <rect x="4"  y="13" width="5" height="5" opacity="0.9" />
                      <rect x="24" y="13" width="5" height="5" opacity="0.9" />
                    </svg>
                  )}
                />
              </div>
              {loweredSetBits && (
                <>
                  <div className="settings-row overlay-inline-controls">
                    <label className="overlay-inline-field overlay-inline-field-range">
                      <span>Depth strength</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={depthSettings?.strength ?? 80}
                        onChange={(e) => onDepthSettingsChange && onDepthSettingsChange((prev) => ({
                          ...(prev || depthSettings || {}),
                          strength: parseInt(e.target.value, 10),
                        }))}
                      />
                      <span className="val">{depthSettings?.strength ?? 80}%</span>
                    </label>
                    <label className="overlay-inline-field overlay-inline-field-range">
                      <span>Depth angle</span>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        step={1}
                        value={depthSettings?.angle ?? 38}
                        onChange={(e) => onDepthSettingsChange && onDepthSettingsChange((prev) => ({
                          ...(prev || depthSettings || {}),
                          angle: parseInt(e.target.value, 10),
                        }))}
                      />
                      <span className="val">{depthSettings?.angle ?? 38}°</span>
                    </label>
                  </div>
                  <span className="settings-hint">Tune how deep and at what angle bits fall through the sieve. Labels on set bits follow the lowered position.</span>
                </>
              )}
            </div>
          )}
        </>)}
        </div>
      )}
    </div>
    {legendFloating && (() => {
      const posX = floatPos ? floatPos.x : window.innerWidth - 380;
      const posY = floatPos ? floatPos.y : 60;
      return (
        <div
          className="legend-float-panel"
          style={{ left: posX, top: posY }}
        >
          <div
            className="legend-float-header"
            onMouseDown={(e) => {
              floatDragRef.current.dragging = true;
              floatDragRef.current.startX = e.clientX;
              floatDragRef.current.startY = e.clientY;
              floatDragRef.current.originX = posX;
              floatDragRef.current.originY = posY;
              e.preventDefault();
            }}
          >
            <span className="legend-float-title">Visualizer Legend</span>
            <div className="legend-tab-controls">
              <button
                type="button"
                className={`legend-detail-btn${legendDetailed ? ' active' : ''}`}
                onClick={() => setLegendDetailed((d) => !d)}
                title={legendDetailed ? 'Show compact legend' : 'Show detailed legend'}
              >
                {legendDetailed ? 'Compact' : 'Detailed'}
              </button>
              <button
                type="button"
                className="legend-close-float-btn"
                title="Return to settings panel"
                onClick={() => {
                  setLegendFloating(false);
                  setActiveTab('legend');
                  onToggleCollapse && onToggleCollapse();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 3 3 3 3 9" />
                  <polyline points="15 21 21 21 21 15" />
                  <line x1="3" y1="3" x2="10" y2="10" />
                  <line x1="21" y1="21" x2="14" y2="14" />
                </svg>
              </button>
            </div>
          </div>
          <div className="legend-float-body">
            <LegendSections detailed={legendDetailed} />
          </div>
        </div>
      );
    })()}
    </>
  );
}

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
import LegendTab from './settings/LegendTab';
import AnimationTab from './settings/AnimationTab';
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
  const [legendFloating, setLegendFloating] = React.useState(false);
  const [legendDetailed, setLegendDetailed] = React.useState(true);
  const [floatPos, setFloatPos] = React.useState(null);
  const floatDragRef = React.useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });

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
        {activeTab === 'layout' && (
          <LayoutTab
            settings={settings} onChange={onChange}
            gridOpacity={gridOpacity} onGridOpacityChange={onGridOpacityChange}
            colorPreset={colorPreset} onColorPresetChange={onColorPresetChange}
            customColors={customColors} onCustomColorsChange={onCustomColorsChange}
            cachelineSize={cachelineSize} onCachelineSizeChange={onCachelineSizeChange}
            cachePreset={cachePreset} onCachePresetChange={onCachePresetChange}
            heatMapEnabled={heatMapEnabled} onHeatMapToggle={onHeatMapToggle}
            cachelineAnnotation={cachelineAnnotation} onCachelineAnnotationChange={onCachelineAnnotationChange}
            primeOverlayEnabled={primeOverlayEnabled} onPrimeOverlayToggle={onPrimeOverlayToggle}
            rangeOverlayEnabled={rangeOverlayEnabled} rangeOverlayStart={rangeOverlayStart} rangeOverlayEnd={rangeOverlayEnd}
            onRangeOverlayToggle={onRangeOverlayToggle} onRangeOverlayStartChange={onRangeOverlayStartChange} onRangeOverlayEndChange={onRangeOverlayEndChange}
            multiplesOverlayEnabled={multiplesOverlayEnabled} multiplesOverlayPrime={multiplesOverlayPrime}
            onMultiplesOverlayToggle={onMultiplesOverlayToggle} onMultiplesOverlayPrimeChange={onMultiplesOverlayPrimeChange}
            onRangeOverlayReset={onRangeOverlayReset} onMultiplesOverlayReset={onMultiplesOverlayReset}
            showMinimap={showMinimap} onShowMinimapChange={onShowMinimapChange}
            minimapControlVisible={minimapControlVisible}
            eventTitleSettings={eventTitleSettings} onEventTitleSettingsChange={onEventTitleSettingsChange}
            outlineSettings={outlineSettings} onOutlineChange={onOutlineChange}
            isWindowsPlatform={isWindowsPlatform}
            mode3D={mode3D} onToggle3D={onToggle3D}
          />
        )}

        {activeTab === 'legend' && (
          <LegendTab
            legendDetailed={legendDetailed}
            setLegendDetailed={setLegendDetailed}
            floatPos={floatPos}
            setFloatPos={setFloatPos}
            setLegendFloating={setLegendFloating}
            onToggleCollapse={onToggleCollapse}
          />
        )}
        {activeTab === 'animation' && showAnimationControls && (
          <AnimationTab
            animStyle={animStyle} onAnimStyleChange={onAnimStyleChange}
            animMode={animMode} onAnimModeChange={onAnimModeChange}
            playSpeed={playSpeed} onPlaySpeedChange={onPlaySpeedChange}
            repeatAnim={repeatAnim} onRepeatAnimChange={onRepeatAnimChange}
            delayBetweenRepeats={delayBetweenRepeats} onDelayBetweenRepeatsChange={onDelayBetweenRepeatsChange}
            eventTimeTargets={eventTimeTargets} onEventTimeTargetsChange={onEventTimeTargetsChange}
            maskAnimationEnabled={maskAnimationEnabled} onMaskAnimationEnabledChange={onMaskAnimationEnabledChange}
            animationReplayPaused={animationReplayPaused} onAnimationReplayPausedChange={onAnimationReplayPausedChange}
            maxStepDurationEnabled={maxStepDurationEnabled} onMaxStepDurationEnabledChange={onMaxStepDurationEnabledChange}
            maxStepDurationMs={maxStepDurationMs} onMaxStepDurationMsChange={onMaxStepDurationMsChange}
            loweredSetBits={loweredSetBits} onLoweredSetBitsToggle={onLoweredSetBitsToggle}
            depthSettings={depthSettings} onDepthSettingsChange={onDepthSettingsChange}
          />
        )}
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

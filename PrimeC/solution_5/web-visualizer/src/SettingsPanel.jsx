import React from 'react';
import LegendSections from './settings/LegendSections';
import LegendTab from './settings/LegendTab';
import LayoutTab from './settings/LayoutTab';
import AnimationTab from './settings/AnimationTab';
import ColorsTab from './settings/ColorsTab';
import TitleTab from './settings/TitleTab';
import { GearIcon } from './settings/buttons';

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
  maxStepDurationEnabled, onMaxStepDurationEnabledChange,
  maxStepDurationMs, onMaxStepDurationMsChange,
  eventDurationMode, onEventDurationModeChange,
  gridOpacity, onGridOpacityChange,
  colorPreset, onColorPresetChange,
  customColors, onCustomColorsChange,
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
  depthSettings,
  onDepthSettingsChange,
  loweredSetBits = false,
  onLoweredSetBitsToggle,
  eventTitleSettings,
  onEventTitleSettingsChange,
  outlineSettings, onOutlineChange,
  isWindowsPlatform = false,
  showAnimationControls = true,
  theme,
  onThemeChange,
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
    {collapsed ? (
      <button
        type="button"
        className={`settings-toggle-float${isWindowsPlatform ? ' platform-windows' : ''}`}
        onClick={onToggleCollapse}
        title="Expand settings"
      >
        <span className="settings-collapsed-label"><GearIcon /> Settings</span>
        ◀
      </button>
    ) : (
    <div className={`settings-sidebar${isWindowsPlatform ? ' platform-windows' : ''}`}>
      <div className="settings-header-rail" title="Settings">
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
              aria-selected={activeTab === 'colors'}
              className={`settings-tab-btn${activeTab === 'colors' ? ' active' : ''}`}
              onClick={() => setActiveTab('colors')}
            >
              Colors
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'title'}
              className={`settings-tab-btn${activeTab === 'title' ? ' active' : ''}`}
              onClick={() => setActiveTab('title')}
            >
              Title
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
        <button className="settings-collapse-btn" onClick={onToggleCollapse} title="Collapse settings">
          ▶
        </button>
      </div>
        <div className="settings-panel-content">
        {activeTab === 'layout' && (
          <LayoutTab
            settings={settings} onChange={onChange}
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
            outlineSettings={outlineSettings} onOutlineChange={onOutlineChange}
            isWindowsPlatform={isWindowsPlatform}
            loweredSetBits={loweredSetBits} onLoweredSetBitsToggle={onLoweredSetBitsToggle}
            depthSettings={depthSettings} onDepthSettingsChange={onDepthSettingsChange}
          />
        )}

        {activeTab === 'colors' && (
          <ColorsTab
            gridOpacity={gridOpacity} onGridOpacityChange={onGridOpacityChange}
            colorPreset={colorPreset} onColorPresetChange={onColorPresetChange}
            customColors={customColors} onCustomColorsChange={onCustomColorsChange}
            theme={theme} onThemeChange={onThemeChange}
          />
        )}

        {activeTab === 'title' && (
          <TitleTab
            eventTitleSettings={eventTitleSettings} onEventTitleSettingsChange={onEventTitleSettingsChange}
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
            eventDurationMode={eventDurationMode} onEventDurationModeChange={onEventDurationModeChange}
          />
        )}
        </div>
    </div>
    )}
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

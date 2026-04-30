import React from 'react';
import LegendSections from './settings/LegendSections';
import LegendTab from './settings/LegendTab';
import LayoutTab from './settings/LayoutTab';
import AnimationTab from './settings/AnimationTab';
import ColorsTab from './settings/ColorsTab';
/**
 * Right-hand collapsible settings panel. Pure tab-row shell that delegates
 * content to LayoutTab, AnimationTab, ColorsTab, and LegendTab.
 *
 * @param {object}   props
 * @param {object}   props.settings                   - Layout settings object (forwarded to LayoutTab)
 * @param {function} props.onChange                   - Layout settings change callback
 * @param {boolean}  props.collapsed                  - Whether the sidebar is collapsed
 * @param {function} props.onToggleCollapse           - Toggle sidebar visibility
 * @param {number}   props.playSpeed                  - Playback speed (ms per step) forwarded to AnimationTab
 * @param {function} props.onPlaySpeedChange
 * @param {boolean}  props.repeatAnim                 - (legacy) repeat animation flag
 * @param {function} props.onRepeatAnimChange
 * @param {number}   props.delayBetweenRepeats        - Delay between single-event repeats (ms)
 * @param {function} props.onDelayBetweenRepeatsChange
 * @param {object}   props.eventTimeTargets           - Per-tier event duration targets
 * @param {function} props.onEventTimeTargetsChange
 * @param {string}   props.animMode                   - Bit animation mode: 'mask'|'bits'|'combined'
 * @param {function} props.onAnimModeChange
 * @param {string}   props.animStyle                  - Animation style: 'ripple'|'fade'|'pulse'|'sequential'
 * @param {function} props.onAnimStyleChange
 * @param {boolean}  props.animationReplayPaused      - Whether single-event replay is paused
 * @param {function} props.onAnimationReplayPausedChange
 * @param {string}   props.eventDurationMode          - 'progressive'|'linear'
 * @param {function} props.onEventDurationModeChange
 * @param {number}   props.gridOpacity                - Grid-line opacity 0–1
 * @param {function} props.onGridOpacityChange
 * @param {string}   props.colorPreset               - Active colour-preset key
 * @param {function} props.onColorPresetChange
 * @param {object}   props.customColors               - Per-class custom RGB overrides
 * @param {function} props.onCustomColorsChange
 * @param {number}   props.cachelineSize              - Cacheline size in bits
 * @param {function} props.onCachelineSizeChange
 * @param {string}   props.cachePreset               - Cacheline layout preset key
 * @param {function} props.onCachePresetChange
 * @param {boolean}  props.heatMapEnabled             - Whether the cacheline heat-map overlay is active
 * @param {function} props.onHeatMapToggle
 * @param {string}   [props.cachelineAnnotation]      - Annotation mode: 'none'|'counts'|'delta'|'both'
 * @param {function} props.onCachelineAnnotationChange
 * @param {boolean}  props.primeOverlayEnabled        - Whether the prime overlay is active
 * @param {function} props.onPrimeOverlayToggle
 * @param {boolean}  [props.rangeOverlayEnabled]
 * @param {number}   [props.rangeOverlayStart]
 * @param {number}   [props.rangeOverlayEnd]
 * @param {function} props.onRangeOverlayToggle
 * @param {function} props.onRangeOverlayStartChange
 * @param {function} props.onRangeOverlayEndChange
 * @param {boolean}  [props.multiplesOverlayEnabled]
 * @param {number}   [props.multiplesOverlayPrime]
 * @param {function} props.onMultiplesOverlayToggle
 * @param {function} props.onMultiplesOverlayPrimeChange
 * @param {function} props.onRangeOverlayReset
 * @param {function} props.onMultiplesOverlayReset
 * @param {boolean}  props.showMinimap               - Whether the minimap is enabled
 * @param {function} props.onShowMinimapChange
 * @param {boolean}  [props.minimapControlVisible]
 * @param {object}   props.depthSettings              - Depth/3D rendering settings
 * @param {function} props.onDepthSettingsChange
 * @param {object}   props.eventTitleSettings         - Floating event-title banner settings
 * @param {function} props.onEventTitleSettingsChange
 * @param {object}   props.outlineSettings            - Group-outline settings
 * @param {function} props.onOutlineChange
 * @param {boolean}  [props.isWindowsPlatform]        - Adjusts scrollbar styling
 * @param {boolean}  [props.showAnimationControls]
 * @param {string}   props.theme                     - 'light'|'dark'
 * @param {function} props.onThemeChange
 * @param {object}   props.canvasColors               - Per-theme canvas background overrides
 * @param {function} props.onCanvasColorsChange
 * @param {{ tab: string }}  [props.activeTabRequest] - Counter-incremented to switch to a tab externally
 * @param {function} [props.onActiveTabChange]        - Called whenever the active tab changes
 * @param {string}   props.bitAnimationMode           - 'mask'|'bits'|'combined'
 * @param {function} props.onBitAnimationModeChange
 * @param {boolean}  [props.detailOpen]               - Whether the detail panel is expanded
 * @param {number}   [props.detailHeight]             - Detail panel height in px
 */
export default function SettingsPanel({
  settings, onChange, collapsed, onToggleCollapse,
  playSpeed, onPlaySpeedChange,
  repeatAnim, onRepeatAnimChange,
  delayBetweenRepeats, onDelayBetweenRepeatsChange,
  eventTimeTargets, onEventTimeTargetsChange,
  animMode, onAnimModeChange,
  animStyle, onAnimStyleChange,
  animationReplayPaused, onAnimationReplayPausedChange,
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
  eventTitleSettings,
  onEventTitleSettingsChange,
  outlineSettings, onOutlineChange,
  isWindowsPlatform = false,
  showAnimationControls = true,
  theme,
  onThemeChange,
  canvasColors,
  onCanvasColorsChange,
  activeTabRequest,
  onActiveTabChange,
  bitAnimationMode,
  onBitAnimationModeChange,
  detailOpen = false,
  detailHeight = 280,
}) {
  const s = settings || {};
  const [activeTab, setActiveTab] = React.useState('layout');
  const prevTabRequestRef = React.useRef(null);

  // Wrapper so external observers (e.g. gear-icon toggle) know the current tab.
  const changeActiveTab = React.useCallback((tab) => {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
  }, [onActiveTabChange]);

  React.useEffect(() => {
    if (activeTabRequest && activeTabRequest !== prevTabRequestRef.current) {
      prevTabRequestRef.current = activeTabRequest;
      changeActiveTab(activeTabRequest.tab);
    }
  }, [activeTabRequest, changeActiveTab]);
  const [legendFloating, setLegendFloating] = React.useState(false);
  const [legendDetailed, setLegendDetailed] = React.useState(true);
  const [floatPos, setFloatPos] = React.useState(null);
  const floatDragRef = React.useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  /**
   * Handler passed to LegendSections.onAction.
   * Clicking an actionable legend row executes the associated settings toggle
   * and, when the sidebar is visible, switches to the relevant tab.
   * When called from the floating legend the sidebar may be collapsed; in that
   * case we dock the floating panel and re-open the sidebar on the right tab.
   */
  const legendActions = React.useCallback((key) => {
    // If the legend is floating, dock it and re-open the settings sidebar.
    if (legendFloating) {
      setLegendFloating(false);
      onToggleCollapse && onToggleCollapse(); // expands the sidebar
    }
    switch (key) {
      case 'primeOverlay':    changeActiveTab('layout');    onPrimeOverlayToggle?.(); break;
      case 'rangeOverlay':    changeActiveTab('layout');    onRangeOverlayToggle?.(); break;
      case 'multiplesOverlay':changeActiveTab('layout');    onMultiplesOverlayToggle?.(); break;
      case 'heatMap':         changeActiveTab('layout');    onHeatMapToggle?.(); break;
      case 'animRipple':      changeActiveTab('animation'); onAnimStyleChange?.('ripple'); break;
      case 'animFade':        changeActiveTab('animation'); onAnimStyleChange?.('fade'); break;
      case 'animPulse':       changeActiveTab('animation'); onAnimStyleChange?.('pulse'); break;
      case 'animSequential':  changeActiveTab('animation'); onAnimStyleChange?.('sequential'); break;
      default: break;
    }
  }, [legendFloating, onToggleCollapse, changeActiveTab,
      onPrimeOverlayToggle, onRangeOverlayToggle, onMultiplesOverlayToggle,
      onHeatMapToggle, onAnimStyleChange]);

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
    {!collapsed && (
    <div className={`settings-sidebar${isWindowsPlatform ? ' platform-windows' : ''}`} style={detailOpen ? { bottom: `${detailHeight}px` } : undefined}>
      <div className="settings-header-rail" title="Settings">
          <div className="settings-tab-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'layout'}
              className={`settings-tab-btn${activeTab === 'layout' ? ' active' : ''}`}
              onClick={() => changeActiveTab('layout')}
            >
              Layout
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'colors'}
              className={`settings-tab-btn${activeTab === 'colors' ? ' active' : ''}`}
              onClick={() => changeActiveTab('colors')}
            >
              Colors
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'animation'}
              className={`settings-tab-btn${activeTab === 'animation' ? ' active' : ''}`}
              onClick={() => changeActiveTab('animation')}
            >
              Animation
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'legend'}
              className={`settings-tab-btn${activeTab === 'legend' ? ' active' : ''}`}
              onClick={() => changeActiveTab('legend')}
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
            depthSettings={depthSettings} onDepthSettingsChange={onDepthSettingsChange}
          />
        )}

        {activeTab === 'colors' && (
          <ColorsTab
            gridOpacity={gridOpacity} onGridOpacityChange={onGridOpacityChange}
            colorPreset={colorPreset} onColorPresetChange={onColorPresetChange}
            customColors={customColors} onCustomColorsChange={onCustomColorsChange}
            theme={theme} onThemeChange={onThemeChange}
            canvasColors={canvasColors} onCanvasColorsChange={onCanvasColorsChange}
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
            onAction={legendActions}
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
            animationReplayPaused={animationReplayPaused} onAnimationReplayPausedChange={onAnimationReplayPausedChange}
            eventDurationMode={eventDurationMode} onEventDurationModeChange={onEventDurationModeChange}
            bitAnimationMode={bitAnimationMode} onBitAnimationModeChange={onBitAnimationModeChange}
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
            <LegendSections detailed={legendDetailed} onAction={legendActions} />
          </div>
        </div>
      );
    })()}
    </>
  );
}

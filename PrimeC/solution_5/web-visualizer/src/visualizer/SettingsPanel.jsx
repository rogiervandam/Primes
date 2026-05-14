import React from 'react';
import LegendSections from '../settings/LegendSections';
import LegendTab from '../settings/LegendTab';
import LayoutTab from '../settings/LayoutTab';
import AnimationTab from '../settings/AnimationTab';
import ColorsTab from '../settings/ColorsTab';
import { useThemeContext } from '../contexts/ThemeContext';
import { usePlaybackContext } from '../contexts/PlaybackContext';
import { useAnimationConfigContext } from '../contexts/AnimationConfigContext';
import { usePanelLayoutContext } from '../contexts/PanelLayoutContext';
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
 * @param {boolean}  props.isAnimationReplayPaused      - Whether single-event replay is paused
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
 * @param {boolean}  props.isHeatMapEnabled             - Whether the cacheline heat-map overlay is active
 * @param {function} props.onHeatMapToggle
 * @param {string}   [props.cachelineAnnotation]      - Annotation mode: 'none'|'counts'|'delta'|'both'
 * @param {function} props.onCachelineAnnotationChange
 * @param {boolean}  props.isPrimeOverlayEnabled        - Whether the prime overlay is active
 * @param {function} props.onPrimeOverlayToggle
 * @param {boolean}  [props.isRangeOverlayEnabled]
 * @param {number}   [props.rangeOverlayStart]
 * @param {number}   [props.rangeOverlayEnd]
 * @param {function} props.onRangeOverlayToggle
 * @param {function} props.onRangeOverlayStartChange
 * @param {function} props.onRangeOverlayEndChange
 * @param {boolean}  [props.isMultiplesOverlayEnabled]
 * @param {number}   [props.multiplesOverlayPrime]
 * @param {function} props.onMultiplesOverlayToggle
 * @param {function} props.onMultiplesOverlayPrimeChange
 * @param {function} props.onRangeOverlayReset
 * @param {function} props.onMultiplesOverlayReset
 * @param {boolean}  props.isMinimapVisible               - Whether the minimap is enabled
 * @param {function} props.onShowMinimapChange
 * @param {boolean}  [props.minimapControlVisible]
 * @param {object}   props.eventTitleSettings         - Floating event-title banner settings
 * @param {function} props.onEventTitleSettingsChange
 * @param {object}   props.outlineSettings            - Group-outline settings
 * @param {function} props.onOutlineChange
 * @param {boolean}  [props.isWindowsPlatform]        - Adjusts scrollbar styling
 * @param {boolean}  [props.showAnimationControls]
 * Theme and color values are consumed from ThemeContext.
 * @param {{ tab: string }}  [props.activeTabRequest] - Counter-incremented to switch to a tab externally
 * @param {function} [props.onActiveTabChange]        - Called whenever the active tab changes
 * @param {string}   props.bitAnimationMode           - 'mask'|'bits'|'combined'
 * @param {function} props.onBitAnimationModeChange
 * @param {boolean}  [props.isAutoAnimateOnSelect]      - Whether to auto-start animation loop on event select
 * @param {function} [props.onAutoAnimateOnSelectChange]
 * @param {boolean}  [props.isDetailOpen]               - Whether the detail panel is expanded
 * @param {number}   [props.detailHeight]             - Detail panel height in px
 */
export default function SettingsPanel({
  settingsState = {},
  settingsHandlers = {},
  settingsConfig = {},
}) {
  const {
    settings,
    autoFitColumns = 0,
    cachelineSize,
    cachePreset,
    isHeatMapEnabled,
    cachelineAnnotation = 'none',
    isPrimeOverlayEnabled,
    isRangeOverlayEnabled = false,
    rangeOverlayStart = 0,
    rangeOverlayEnd = 0,
    rangeOverlayUnit = 'bits',
    rangeAutoSet = true,
    isMultiplesOverlayEnabled = false,
    multiplesOverlayPrime = 3,
    multiplesOverlayMode = 'number',  // item 425
    bitsGridView = {},  // item 426
    isMinimapVisible,
    isGroupInspectorEnabled,  // item 428
    eventTitleSettings,
    outlineSettings,
    activeTabRequest,
    storageModel,
    wheelDefinition,
  } = settingsState;

  const {
    onChange,
    onCachelineSizeChange,
    onCachePresetChange,
    onHeatMapToggle,
    onCachelineAnnotationChange,
    onPrimeOverlayToggle,
    onRangeOverlayToggle,
    onRangeOverlayStartChange,
    onRangeOverlayEndChange,
    onRangeOverlayUnitChange,
    onMultiplesOverlayToggle,
    onMultiplesOverlayPrimeChange,
    onMultiplesOverlayModeChange,  // item 425
    onBitsGridViewChange,  // item 426
    onRangeOverlayReset,
    onRangeAutoSetChange,
    onMultiplesOverlayReset,
    onShowMinimapChange,
    onGroupInspectorEnabledChange,  // item 428
    onEventTitleSettingsChange,
    onOutlineChange,
    onActiveTabChange,
  } = settingsHandlers;

  const {
    minimapControlVisible = true,
    isWindowsPlatform = false,
    showAnimationControls = true,
  } = settingsConfig;

  const {
    theme,
    setTheme,
    gridOpacity,
    setGridOpacity,
    canvasColors,
    setCanvasColors,
    colorPreset,
    setColorPreset,
    customColors,
    setCustomColors,
    timelineColors,
    setTimelineColors,
    floaterBg,
    setFloaterBg,
    draggerColor,
    setDraggerColor,
    zoneBgOpacity,
    setZoneBgOpacity,
  } = useThemeContext();
  const {
    playSpeedPercent,
    setPlaySpeedPercent,
  } = usePlaybackContext();
  const {
    animMode,
    setAnimMode,
    animStyle,
    setAnimStyle,
    delayBetweenEvents,
    setDelayBetweenEvents,
    delayBetweenRepeats,
    setDelayBetweenRepeats,
    eventTimeTargets,
    setEventTimeTargets,
    eventDurationMode,
    setEventDurationMode,
    isAnimationReplayPaused,
    setIsAnimationReplayPaused,
    bitAnimationMode,
    handleBitAnimationModeChange,
    isAutoAnimateOnSelect,
    setIsAutoAnimateOnSelect,
    animateBitsMode,       // item 244
    setAnimateBitsMode,    // item 244
  } = useAnimationConfigContext();
  const {
    isSettingsCollapsed: collapsed,
    toggleSettingsPanel: onToggleCollapse,
    isDetailOpen,
    detailHeight,
  } = usePanelLayoutContext();

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
  // item 298: removed animation-class approach (expanding-in / collapsing-out keyframes).
  // The settings panel now uses CSS transitions like the events panel.
  // Just use the `collapsed` prop directly — CSS handles the transition.
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
      case 'animRipple':      changeActiveTab('animation'); setAnimStyle?.('ripple'); break;
      case 'animFade':        changeActiveTab('animation'); setAnimStyle?.('fade'); break;
      case 'animPulse':       changeActiveTab('animation'); setAnimStyle?.('pulse'); break;
      case 'animSequential':  changeActiveTab('animation'); setAnimStyle?.('sequential'); break;
      default: break;
    }
  }, [legendFloating, onToggleCollapse, changeActiveTab,
      onPrimeOverlayToggle, onRangeOverlayToggle, onMultiplesOverlayToggle,
      onHeatMapToggle, setAnimStyle]);

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
    <div className={`settings-sidebar${collapsed ? ' is-collapsed' : ''}${isWindowsPlatform ? ' platform-windows' : ''}`}>
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
        {/* item 353: panel-toggle-arrow gives unified design; › = collapse to the right */}
        <button className="settings-collapse-btn panel-toggle-arrow is-open" onClick={onToggleCollapse} title="Collapse settings">
          ›
        </button>
      </div>
        <div className="settings-panel-content">
        {activeTab === 'layout' && (
          <LayoutTab
            settings={settings} onChange={onChange}
            autoFitColumns={autoFitColumns}
            cachelineSize={cachelineSize} onCachelineSizeChange={onCachelineSizeChange}
            cachePreset={cachePreset} onCachePresetChange={onCachePresetChange}
            isHeatMapEnabled={isHeatMapEnabled} onHeatMapToggle={onHeatMapToggle}
            cachelineAnnotation={cachelineAnnotation} onCachelineAnnotationChange={onCachelineAnnotationChange}
            isPrimeOverlayEnabled={isPrimeOverlayEnabled} onPrimeOverlayToggle={onPrimeOverlayToggle}
            isRangeOverlayEnabled={isRangeOverlayEnabled} rangeOverlayStart={rangeOverlayStart} rangeOverlayEnd={rangeOverlayEnd} rangeOverlayUnit={rangeOverlayUnit}
            onRangeOverlayToggle={onRangeOverlayToggle} onRangeOverlayStartChange={onRangeOverlayStartChange} onRangeOverlayEndChange={onRangeOverlayEndChange} onRangeOverlayUnitChange={onRangeOverlayUnitChange}
            storageModel={storageModel} wheelDefinition={wheelDefinition}
            isMultiplesOverlayEnabled={isMultiplesOverlayEnabled} multiplesOverlayPrime={multiplesOverlayPrime}
            multiplesOverlayMode={multiplesOverlayMode} onMultiplesOverlayModeChange={onMultiplesOverlayModeChange}
            bitsGridView={bitsGridView} onBitsGridViewChange={onBitsGridViewChange}
            onMultiplesOverlayToggle={onMultiplesOverlayToggle} onMultiplesOverlayPrimeChange={onMultiplesOverlayPrimeChange}
            onRangeOverlayReset={onRangeOverlayReset} onMultiplesOverlayReset={onMultiplesOverlayReset}
            rangeAutoSet={rangeAutoSet} onRangeAutoSetChange={onRangeAutoSetChange}
            isMinimapVisible={isMinimapVisible} onShowMinimapChange={onShowMinimapChange}
            minimapControlVisible={minimapControlVisible}
            isGroupInspectorEnabled={isGroupInspectorEnabled} onGroupInspectorEnabledChange={onGroupInspectorEnabledChange}
            isAutoAnimateOnSelect={isAutoAnimateOnSelect} onAutoAnimateOnSelectChange={setIsAutoAnimateOnSelect}
            outlineSettings={outlineSettings} onOutlineChange={onOutlineChange}
            isWindowsPlatform={isWindowsPlatform}
          />
        )}

        {activeTab === 'colors' && (
          <ColorsTab
            gridOpacity={gridOpacity} onGridOpacityChange={setGridOpacity}
            colorPreset={colorPreset} onColorPresetChange={setColorPreset}
            customColors={customColors} onCustomColorsChange={setCustomColors}
            theme={theme} onThemeChange={setTheme}
            canvasColors={canvasColors} onCanvasColorsChange={setCanvasColors}
            timelineColors={timelineColors} onTimelineColorsChange={setTimelineColors}
            floaterBg={floaterBg} onFloaterBgChange={setFloaterBg}
            draggerColor={draggerColor} onDraggerColorChange={setDraggerColor}
            zoneBgOpacity={zoneBgOpacity} onZoneBgOpacityChange={setZoneBgOpacity}
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
            animStyle={animStyle} onAnimStyleChange={setAnimStyle}
            animMode={animMode} onAnimModeChange={setAnimMode}
            playSpeed={playSpeedPercent} onPlaySpeedChange={setPlaySpeedPercent}
            repeatAnim={delayBetweenEvents} onRepeatAnimChange={setDelayBetweenEvents}
            delayBetweenRepeats={delayBetweenRepeats} onDelayBetweenRepeatsChange={setDelayBetweenRepeats}
            eventTimeTargets={eventTimeTargets} onEventTimeTargetsChange={setEventTimeTargets}
            isAnimationReplayPaused={isAnimationReplayPaused} onAnimationReplayPausedChange={setIsAnimationReplayPaused}
            eventDurationMode={eventDurationMode} onEventDurationModeChange={setEventDurationMode}
            bitAnimationMode={bitAnimationMode} onBitAnimationModeChange={handleBitAnimationModeChange}
            isAutoAnimateOnSelect={isAutoAnimateOnSelect} onAutoAnimateOnSelectChange={setIsAutoAnimateOnSelect}
            animateBitsMode={animateBitsMode} onAnimateBitsModeChange={setAnimateBitsMode}
          />
        )}
        </div>
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
            <LegendSections detailed={legendDetailed} onAction={legendActions} />
          </div>
        </div>
      );
    })()}
    </>
  );
}

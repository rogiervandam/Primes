import React from 'react';
import {
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Search, Toolkit,
} from '../Icons';
import { GearIcon } from '../settings/buttons';
import TraceInfoPopover from './TraceInfoPopover';
import ToolbarPanelToggles from './ToolbarPanelToggles';
import { useThemeContext } from '../contexts/ThemeContext';
import { usePanelLayoutContext } from '../contexts/PanelLayoutContext';

/**
 * Top toolbar: trace title (with info popover), playback transport, and the
 * right-hand action cluster (search, zoom, tilt, heatmap, primes, timings,
 * export, theme). All state is owned by the parent — this component is
 * purely a presentation layer that wires events back to callbacks.
 * The app always runs in 3D mode; the tilt button controls the camera angle.
 *
 * Most right-hand actions are hidden on Windows (mirrors the original
 * behaviour where they live in the SettingsPanel header instead); the debug
 * tools and settings buttons stay in the top bar.
 */
export default function Toolbar({
  platform = {},
  traceInfo = {},
  search = {},
  view = {},
  debug = {},
  exportState = {},
}) {
  const {
    isMacPlatform,
    isWindowsPlatform,
    isElectron,
  } = platform;

  const {
    effectiveTitle,
    isTraceInfoVisible,
    setIsTraceInfoVisible,
    traceInfoToggleRef,
    traceInfoPopoverRef,
    storageModel,
    setStorageModel,
    header,
    traceInfoSections,
    onFetchRawSource,
    lineToStep,
    onJumpToStep,
    rawScrollToLine,
    onClearRawScrollToLine,
    currentStepSourceLine,
    onClose,
    onOpenRawLog,  // item 221: quick open log button in top bar
  } = traceInfo;

  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResult,
    handleSearch,
  } = search;

  const {
    zoom,
    doZoom,
    resetZoom,
    isTiltActive,
    isTiltButtonEnabled = true,
    toggleTilt,
  } = view;

  const {
    isDebugToolsOpen,
    setIsDebugToolsOpen,
  } = debug;

  const {
    exporting = false,
    exportPng,
    exportVideo,
    cancelExport,
    exportProgress,
  } = exportState;

  const { theme, setTheme } = useThemeContext();
  const {
    isSettingsCollapsed,
    toggleSettingsPanel,
    areControlsHidden,
    isTimingPanelOpen,
    setIsTimingPanelOpen,
  } = usePanelLayoutContext();

  const visualizerClass =
    `visualizer${isMacPlatform ? ' platform-mac' : ''}` +
    `${isWindowsPlatform ? ' platform-windows' : ''}` +
    `${isElectron ? ' platform-electron' : ' platform-browser'}`;
  // visualizerClass is currently consumed by the parent; we simply expose the
  // header element here so the existing layout wrapper is preserved.
  void visualizerClass;

  return (
    <header className={`toolbar${areControlsHidden ? ' toolbar--controls-hidden' : ''}`}>
      <div className="toolbar-left">
        {/* item 208: panel toggle buttons on the far left */}
        <ToolbarPanelToggles />
        <div className="trace-title-block">
          <button
            ref={traceInfoToggleRef}
            type="button"
            className={`trace-title trace-title-button${isTraceInfoVisible ? ' active' : ''}`}
            title="Trace information"
            onClick={() => setIsTraceInfoVisible((open) => !open)}
          >
            {effectiveTitle}
          </button>
        </div>
        <div className="trace-actions">
          {onClose && <button className="btn-icon" onClick={onClose} title="Close trace">✕</button>}
        </div>
        <TraceInfoPopover
          popoverRef={traceInfoPopoverRef}
          visible={isTraceInfoVisible}
          storageModel={storageModel}
          setStorageModel={setStorageModel}
          header={header}
          sections={traceInfoSections}
          onFetchRawSource={onFetchRawSource}
          lineToStep={lineToStep}
          onJumpToStep={onJumpToStep}
          rawScrollToLine={rawScrollToLine}
          onClearRawScrollToLine={onClearRawScrollToLine}
          currentStepSourceLine={currentStepSourceLine}
        />
      </div>
      <div className="toolbar-right">
        {!isWindowsPlatform && (
          <>
            <div className={`search-box${isSearchOpen ? ' search-box--open' : ''}`}>
              {isSearchOpen ? (
                <>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="bit 42 / byte 5 / number 97"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); if (e.key === 'Escape') setIsSearchOpen(false); }}
                    autoFocus
                    title="Search: bit N, byte N, uint64 N, vector N, number N"
                  />
                  {searchResult && <span className="search-result-inline" title={searchResult}>{searchResult}</span>}
                  <button className="btn-icon" onClick={() => setIsSearchOpen(false)} title="Close search">✕</button>
                </>
              ) : (
                <button className="btn-icon" onClick={() => setIsSearchOpen(true)} title="Search (bit/byte/number)"><Search /></button>
              )}
            </div>
            <button className="btn-icon" onClick={() => doZoom(1.5)} title="Zoom In (+)"><ZoomIn /></button>
            <button className="btn-text" onClick={resetZoom} title="Reset Zoom (0)">{zoom.toFixed(1)}x</button>
            <button className="btn-icon" onClick={() => doZoom(1 / 1.5)} title="Zoom Out (−)"><ZoomOut /></button>
            <button
              className={`btn-icon${isTiltActive ? ' active' : ''}`}
              onClick={toggleTilt}
              title={isTiltButtonEnabled ? (isTiltActive ? 'Remove tilt (0°)' : 'Tilt view (30°)') : 'Tilt control unlocks after intro transform'}
              disabled={!isTiltButtonEnabled}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 13L8 10L14 13" />
                <path d="M4 9L8 7L12 9" strokeOpacity="0.6" />
                <path d="M6 5.5L8 4.5L10 5.5" strokeOpacity="0.35" />
              </svg>
            </button>
            <button className={`btn-icon${isTimingPanelOpen ? ' active' : ''}`} onClick={() => setIsTimingPanelOpen(o => !o)} title="Function timings">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="9" r="5.5" />
                <path d="M8 6v3.5l2 1.5" strokeLinecap="round" />
                <path d="M6 1.5h4" strokeLinecap="round" />
                <path d="M8 1.5v2" strokeLinecap="round" />
              </svg>
            </button>
            {/* item 221: quick open raw log button */}
            {onFetchRawSource && onOpenRawLog && (
              <button className="btn-icon" onClick={() => onOpenRawLog(0)} title="Open raw log">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="1.5" width="9" height="13" rx="1.5" />
                  <path d="M5 5h4M5 8h4M5 11h2" strokeLinecap="round" />
                  <path d="M11 10l3 3m0-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button className="btn-icon" onClick={exportPng} title="Export PNG"><Camera /></button>
            {!exporting ? (
              <button className="btn-icon" onClick={exportVideo} title="Export Video (WebM)"><Film /></button>
            ) : (
              <button className="btn-export-cancel" onClick={cancelExport} title="Cancel export">
                {exportProgress}%
              </button>
            )}
            <button className="btn-icon" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme (T)">
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
          </>
        )}
        {setIsDebugToolsOpen && (
          <button
            className={`btn-icon${isDebugToolsOpen ? ' active' : ''}`}
            onClick={() => setIsDebugToolsOpen((v) => !v)}
            title={isDebugToolsOpen ? 'Hide debug tools (`)' : 'Show debug tools (`)'}
          >
            <Toolkit />
          </button>
        )}
        <button
          className={`btn-icon panel-toggle-btn${!isSettingsCollapsed ? ' active' : ''}`}
          onClick={toggleSettingsPanel}
          title={isSettingsCollapsed ? 'Show Settings panel' : 'Hide Settings panel'}
        >
          <GearIcon />
        </button>
      </div>
    </header>
  );
}

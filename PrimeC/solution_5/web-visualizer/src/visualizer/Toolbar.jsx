import React from 'react';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Search, Minus, Plus,
  PanelLeft, PanelBottom, PanelRight, Toolkit,
} from '../Icons';
import { GearIcon } from '../settings/buttons';
import TraceInfoPopover from './TraceInfoPopover';

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
  // platform
  isMacPlatform,
  isWindowsPlatform,
  isElectron,
  // title / info popover
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
  // close
  onClose,
  // playback transport
  steps,
  currentStep,
  goToStep,
  playing,
  handlePlayPause,
  exporting,
  setPlaySpeedPercent,
  isScrubbingTopRef,
  // search
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  searchResult,
  handleSearch,
  // zoom / view
  zoom,
  doZoom,
  resetZoom,
  isTiltActive,
  isTiltButtonEnabled = true,
  toggleTilt,
  // overlays / panels
  isHeatMapEnabled,
  setIsHeatMapEnabled,
  isPrimeOverlayEnabled,
  setIsPrimeOverlayEnabled,
  isTimingPanelOpen,
  setIsTimingPanelOpen,
  // debug tools
  isDebugToolsOpen,
  setIsDebugToolsOpen,
  // panel collapse/expand
  isEventsPanelCollapsed,
  toggleEventsPanel,
  isDetailOpen,
  toggleDetailPanel,
  isSettingsCollapsed,
  toggleSettingsPanel,
  // export
  exportPng,
  exportVideo,
  cancelExport,
  exportProgress,
  // theme
  theme,
  setTheme,
  // immersive mode (auto-computed from widget visibility — no manual toggle)
  areControlsHidden,
  // floating all-events widget: show pop-out button when widget was docked away
  isAllEventsWidgetHidden,
  showAllEventsWidget,
}) {
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
        <div className="panel-toggle-group">

          {isEventsPanelCollapsed && isAllEventsWidgetHidden && (
            <button
              className="btn-icon panel-toggle-btn panel-toggle-btn--popout"
              onClick={showAllEventsWidget}
              title="Show events widget"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1.5" y="4.5" width="8" height="8" rx="1.2" />
                <path d="M7 1.5h6.5v6.5" />
                <path d="M13.5 1.5L8.5 6.5" />
              </svg>
            </button>
          )}

          <button
            className={`btn-icon panel-toggle-btn${!isEventsPanelCollapsed ? ' active' : ''}`}
            onClick={toggleEventsPanel}
            title={isEventsPanelCollapsed ? 'Show Events panel' : 'Hide Events panel'}
          >
            <PanelLeft size={15} />
          </button>

          <button
            className={`btn-icon panel-toggle-btn${isDetailOpen ? ' active' : ''}`}
            onClick={toggleDetailPanel}
            title={isDetailOpen ? 'Hide Detail panel' : 'Show Detail panel'}
          >
            <PanelBottom size={15} />
          </button>
          <button
            className={`btn-icon panel-toggle-btn${!isSettingsCollapsed ? ' active' : ''}`}
            onClick={toggleSettingsPanel}
            title={isSettingsCollapsed ? 'Show Settings panel' : 'Hide Settings panel'}
          >
            <PanelRight size={15} />
          </button>
        </div>
      </div>
      {!areControlsHidden && (
      <div className="toolbar-center">
        <>
            <button className="btn-icon" onClick={() => goToStep(0)} title="First (Home)" disabled={exporting}><SkipBack /></button>
            <button className="btn-icon" onClick={() => goToStep(currentStep - 1)} title="Previous (←)" disabled={exporting}><StepBack /></button>
            <button className="btn-icon anim-speed-btn" onClick={() => setPlaySpeedPercent(v => Math.max(25, Math.round(v / 1.25)))} title="Slower animation" disabled={exporting}><Minus size={14} /></button>
            <button
              className="btn-icon"
              onClick={handlePlayPause}
              title={playing ? 'Pause playback' : (currentStep >= Math.max(0, steps.length - 1) ? 'Restart trace and play' : 'Play trace from current event')}
              disabled={exporting || steps.length === 0}
            >
              {playing ? <Pause /> : <Play />}
            </button>
            <button className="btn-icon anim-speed-btn" onClick={() => setPlaySpeedPercent(v => Math.min(400, Math.round(v * 1.25)))} title="Faster animation" disabled={exporting}><Plus size={14} /></button>
            <button className="btn-icon" onClick={() => goToStep(currentStep + 1)} title="Next (→)" disabled={exporting}><StepForward /></button>
            <button className="btn-icon" onClick={() => goToStep(steps.length - 1)} title="Last (End)" disabled={exporting}><SkipForward /></button>
            <input
              type="range"
              className="step-slider"
              min={0}
              max={Math.max(0, steps.length - 1)}
              value={currentStep}
              onChange={(e) => {
                const target = parseInt(e.target.value, 10);
                goToStep(target);
              }}
              onPointerDown={() => { isScrubbingTopRef.current = true; }}
              onPointerUp={() => { isScrubbingTopRef.current = false; }}
              onPointerCancel={() => { isScrubbingTopRef.current = false; }}
              onMouseLeave={(e) => { if (e.buttons === 0) isScrubbingTopRef.current = false; }}
              disabled={exporting}
            />
            <span className="step-counter">{currentStep} / {steps.length - 1}</span>
        </>
      </div>
      )}
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

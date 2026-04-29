import React from 'react';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Search, Minus, Plus, Eye, EyeOff,
} from '../Icons';
import TraceInfoPopover from './TraceInfoPopover';

/**
 * Top toolbar: trace title (with info popover), playback transport, and the
 * right-hand action cluster (search, zoom, tilt, heatmap, primes, timings,
 * export, theme). All state is owned by the parent — this component is
 * purely a presentation layer that wires events back to callbacks.
 * The app always runs in 3D mode; the tilt button controls the camera angle.
 *
 * Right-hand cluster is hidden on Windows (mirrors the original behaviour
 * where the actions live in the SettingsPanel header instead).
 */
export default function Toolbar({
  // platform
  isMacPlatform,
  isWindowsPlatform,
  isElectron,
  // title / info popover
  effectiveTitle,
  showTraceInfo,
  setShowTraceInfo,
  traceInfoToggleRef,
  traceInfoPopoverRef,
  storageModel,
  setStorageModel,
  header,
  traceInfoSections,
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
  searchOpen,
  setSearchOpen,
  searchQuery,
  setSearchQuery,
  searchResult,
  handleSearch,
  // zoom / view
  zoom,
  doZoom,
  resetZoom,
  tiltActive,
  toggleTilt,
  // overlays / panels
  heatMapEnabled,
  setHeatMapEnabled,
  primeOverlayEnabled,
  setPrimeOverlayEnabled,
  timingPanelOpen,
  setTimingPanelOpen,
  loweredSetBits,
  setLoweredSetBits,
  // export
  exportPng,
  exportVideo,
  cancelExport,
  exportProgress,
  // theme
  theme,
  setTheme,
  // immersive mode
  controlsHidden,
  toggleControlsHidden,
}) {
  const visualizerClass =
    `visualizer${isMacPlatform ? ' platform-mac' : ''}` +
    `${isWindowsPlatform ? ' platform-windows' : ''}` +
    `${isElectron ? ' platform-electron' : ' platform-browser'}`;
  // visualizerClass is currently consumed by the parent; we simply expose the
  // header element here so the existing layout wrapper is preserved.
  void visualizerClass;

  return (
    <header className={`toolbar${controlsHidden ? ' toolbar--controls-hidden' : ''}`}>
      <div className="toolbar-left">
        <div className="trace-title-block">
          <button
            ref={traceInfoToggleRef}
            type="button"
            className={`trace-title trace-title-button${showTraceInfo ? ' active' : ''}`}
            title="Trace information"
            onClick={() => setShowTraceInfo((open) => !open)}
          >
            {effectiveTitle}
          </button>
        </div>
        <div className="trace-actions">
          {onClose && <button className="btn-icon" onClick={onClose} title="Close trace">✕</button>}
        </div>
        {showTraceInfo && (
          <TraceInfoPopover
            popoverRef={traceInfoPopoverRef}
            storageModel={storageModel}
            setStorageModel={setStorageModel}
            header={header}
            sections={traceInfoSections}
          />
        )}
        <button
          className={`btn-icon toolbar-immersive-toggle${controlsHidden ? ' active' : ''}`}
          onClick={toggleControlsHidden}
          title={controlsHidden ? 'Show playback controls (H)' : 'Hide playback controls (H)'}
        >
          {controlsHidden ? <Eye /> : <EyeOff />}
        </button>
      </div>
      {!controlsHidden && (
      <div className="toolbar-center">
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
      </div>
      )}
      <div className="toolbar-right">
        {!isWindowsPlatform && (
          <>
            <div className={`search-box${searchOpen ? ' expanded' : ''}`}>
              <button className="btn-icon" onClick={() => setSearchOpen(o => !o)} title="Search (bit/byte/number)"><Search /></button>
              {searchOpen && (
                <div className="search-popover">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="bit 42 / byte 5 / number 97"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); if (e.key === 'Escape') setSearchOpen(false); }}
                    autoFocus
                    title="Search: bit N, byte N, uint64 N, vector N, number N"
                  />
                  {searchResult && <div className="search-result">{searchResult}</div>}
                </div>
              )}
            </div>
            <button className="btn-icon" onClick={() => doZoom(1.5)} title="Zoom In (+)"><ZoomIn /></button>
            <button className="btn-text" onClick={resetZoom} title="Reset Zoom (0)">{zoom.toFixed(1)}x</button>
            <button className="btn-icon" onClick={() => doZoom(1 / 1.5)} title="Zoom Out (−)"><ZoomOut /></button>
            <button className={`btn-icon${tiltActive ? ' active' : ''}`} onClick={toggleTilt} title={tiltActive ? 'Remove tilt (0°)' : 'Tilt view (30°)'}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 13L8 10L14 13" />
                <path d="M4 9L8 7L12 9" strokeOpacity="0.6" />
                <path d="M6 5.5L8 4.5L10 5.5" strokeOpacity="0.35" />
              </svg>
            </button>
            <button className={`btn-icon${timingPanelOpen ? ' active' : ''}`} onClick={() => setTimingPanelOpen(o => !o)} title="Function timings">
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
      </div>
    </header>
  );
}

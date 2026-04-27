import React from 'react';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward,
  ZoomIn, ZoomOut, Camera, Film, Sun, Moon, Search, Minus, Plus, Thermometer, PrimeStar,
} from '../Icons';
import TraceInfoPopover from './TraceInfoPopover';

/**
 * Top toolbar: trace title (with info popover), playback transport, and the
 * right-hand action cluster (search, zoom, 3D, heatmap, primes, timings,
 * export, theme). All state is owned by the parent — this component is
 * purely a presentation layer that wires events back to callbacks.
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
  mode3D,
  toggle3D,
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
}) {
  const visualizerClass =
    `visualizer${isMacPlatform ? ' platform-mac' : ''}` +
    `${isWindowsPlatform ? ' platform-windows' : ''}` +
    `${isElectron ? ' platform-electron' : ' platform-browser'}`;
  // visualizerClass is currently consumed by the parent; we simply expose the
  // header element here so the existing layout wrapper is preserved.
  void visualizerClass;

  return (
    <header className="toolbar">
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
      </div>
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
            <button className={`btn-icon${mode3D ? ' active' : ''}`} onClick={toggle3D} title="Toggle 3D view (3)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 11L8 14L14 11" />
                <path d="M2 8L8 11L14 8" />
                <path d="M2 5L8 2L14 5L8 8Z" />
              </svg>
            </button>
            <button className={`btn-icon${heatMapEnabled ? ' active' : ''}`} onClick={() => setHeatMapEnabled(h => !h)} title="Toggle cacheline heat map overlay — shows hit count and recency per cacheline"><Thermometer /></button>
            <button className={`btn-icon${primeOverlayEnabled ? ' active prime-overlay-btn' : ''}`} onClick={() => setPrimeOverlayEnabled(v => !v)} title="Toggle prime number overlay — highlights every bit whose represented number is prime"><PrimeStar /></button>
            <button className={`btn-icon${timingPanelOpen ? ' active' : ''}`} onClick={() => setTimingPanelOpen(o => !o)} title="Function timings">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="9" r="5.5" />
                <path d="M8 6v3.5l2 1.5" strokeLinecap="round" />
                <path d="M6 1.5h4" strokeLinecap="round" />
                <path d="M8 1.5v2" strokeLinecap="round" />
              </svg>
            </button>
            <button className={`btn-icon${loweredSetBits ? ' active' : ''}`} onClick={() => setLoweredSetBits((value) => !value)} title="Toggle lowered-set-bits sieve mode">
              ▽
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

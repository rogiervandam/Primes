/**
 * CanvasLoadingOverlay — progress bar shown while the trace is loading.
 *
 * Props:
 *  - loadingOverlayPhase: 'hidden' | 'active' | 'fading'
 *  - steps: parsed step array (used only for its .length)
 *  - overlayBarPct: 0..100 fill progress
 */
import React from 'react';

export default function CanvasLoadingOverlay({ loadingOverlayPhase, steps, overlayBarPct }) {
  if (loadingOverlayPhase === 'hidden') return null;
  return (
    <div className={`canvas-loading-overlay${loadingOverlayPhase === 'fading' ? ' fading' : ''}`}>
      <div className="canvas-loading-text">Loading log…</div>
      {steps.length > 0 && (
        <div className="canvas-loading-count">
          {(overlayBarPct < 75
            ? Math.floor(steps.length * (overlayBarPct / 100))
            : steps.length
          ).toLocaleString()}
          {' '}
          events
        </div>
      )}
      <div
        className="canvas-loading-bar-track"
        role="progressbar"
        aria-label="Loading trace"
        aria-valuenow={overlayBarPct}
        aria-valuemax={100}
      >
        <div className="canvas-loading-bar-fill" style={{ width: `${overlayBarPct}%` }} />
      </div>
    </div>
  );
}

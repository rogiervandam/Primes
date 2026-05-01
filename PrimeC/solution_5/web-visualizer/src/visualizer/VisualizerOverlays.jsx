import React from 'react';
import KeyboardShortcutsOverlay from './KeyboardShortcutsOverlay';

/**
 * Fixed-position overlays that must live outside .main-content to avoid
 * being trapped inside the canvas-container stacking context
 * (transform-style:preserve-3d). Both use position:fixed so they appear
 * above all floating panels in the root stacking context.
 *
 * Includes:
 *  - minimap overlay canvas (position:fixed, z-index:35)
 *  - keyboard-shortcuts modal
 *
 * Refs and open/close state remain in Visualizer.jsx; this component is
 * pure presentation.
 */
export default function VisualizerOverlays({ minimapCanvasRef, showShortcutsHelp, onCloseShortcuts }) {
  return (
    <>
      {/* Minimap overlay — rendered OUTSIDE .main-content so it is never
          trapped inside the canvas-container stacking context
          (transform-style:preserve-3d). position:fixed + z-index:35 then
          places it above all floating panels (z-index:28) and the detail
          panel (document order) in the root stacking context. */}
      <canvas
        ref={minimapCanvasRef}
        className="minimap-overlay-canvas"
        aria-hidden="true"
      />
      <KeyboardShortcutsOverlay
        open={showShortcutsHelp}
        onClose={onCloseShortcuts}
      />
    </>
  );
}

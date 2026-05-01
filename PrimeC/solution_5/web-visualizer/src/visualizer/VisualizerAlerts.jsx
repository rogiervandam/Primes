import React from 'react';
import ExportProgress from './ExportProgress';

/**
 * Alert banners rendered directly below the toolbar:
 *  - slim export-progress bar while a video export is in progress
 *  - export-error banner when the export fails
 *  - GL-unavailable warning when WebGL2/OffscreenCanvas is not supported
 *
 * All state remains in Visualizer.jsx; this component is pure presentation.
 */
export default function VisualizerAlerts({ exporting, exportProgress, exportError, glUnavailable }) {
  return (
    <>
      {exporting && <ExportProgress progress={exportProgress} />}
      {exportError && (
        <div className="export-error-banner" role="alert">
          {exportError}
        </div>
      )}
      {glUnavailable && (
        <div className="gl-unavailable-banner" role="alert">
          WebGL2 with OffscreenCanvas is required for rendering. Please use a modern browser (Chrome 69+, Firefox 105+, Edge 79+, or Safari 16.4+).
        </div>
      )}
    </>
  );
}

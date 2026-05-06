/**
 * StatusBanners — renders GL-unavailable and export-error alert banners.
 *
 * Props:
 *  - exportError: string | null — non-null while an export failed
 *  - isGlUnavailable: boolean — true when WebGL could not attach
 */
import React from 'react';

export default function StatusBanners({ exportError, isGlUnavailable }) {
  return (
    <>
      {exportError && (
        <div className="export-error-banner" role="alert">
          {exportError}
        </div>
      )}
      {isGlUnavailable && (
        <div className="gl-unavailable-banner" role="alert">
          WebGL2 with OffscreenCanvas is required for rendering. Please use a modern browser (Chrome 69+, Firefox 105+, Edge 79+, or Safari 16.4+).
        </div>
      )}
    </>
  );
}

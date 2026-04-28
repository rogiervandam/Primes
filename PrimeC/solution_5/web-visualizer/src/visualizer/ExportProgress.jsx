import React from 'react';

/**
 * Slim progress bar shown while a video export is in progress.
 * Intentionally controlled — parent owns the `exporting` flag and `progress` value.
 */
export default function ExportProgress({ progress }) {
  return (
    <div className="export-progress">
      <div className="export-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}

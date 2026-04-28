import React from 'react';
import { PreviewOptionButton } from './buttons';

/**
 * TitleTab — content for the "Title" tab of the settings sidebar.
 *
 * Contains the event title visibility toggle, size slider, and
 * recenter button (previously in the "Grid view" section of LayoutTab).
 */
export default function TitleTab({
  eventTitleSettings,
  onEventTitleSettingsChange,
}) {
  return (
    <>
      <div className="settings-section">
        <label>Event title</label>
        <div className="preview-btn-grid preview-btn-grid-4">
          <PreviewOptionButton
            compact
            label="Event title"
            hint="Show the current event title above the canvas"
            active={eventTitleSettings?.visible !== false}
            onClick={() => onEventTitleSettingsChange && onEventTitleSettingsChange((prev) => ({
              ...(prev || eventTitleSettings || {}),
              visible: !((prev || eventTitleSettings || {}).visible !== false),
            }))}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="4" y="4" width="40" height="14" rx="3" />
                <path d="M9 9h18" />
                <path d="M9 13h28" />
              </svg>
            )}
          />
        </div>
        {eventTitleSettings?.visible !== false && (
          <>
            <div className="settings-row overlay-inline-controls">
              <label className="overlay-inline-field overlay-inline-field-range">
                <span>Size</span>
                <input
                  type="range"
                  min={70}
                  max={160}
                  step={5}
                  value={eventTitleSettings?.scale || 100}
                  onChange={(e) => onEventTitleSettingsChange && onEventTitleSettingsChange((prev) => ({
                    ...(prev || eventTitleSettings || {}),
                    scale: parseInt(e.target.value, 10),
                  }))}
                />
                <span className="val">{eventTitleSettings?.scale || 100}%</span>
              </label>
              <button
                type="button"
                className="btn-text"
                onClick={() => onEventTitleSettingsChange && onEventTitleSettingsChange((prev) => ({
                  ...(prev || eventTitleSettings || {}),
                  dragOffsetX: 0,
                  dragOffsetY: 0,
                }))}
                title="Re-center the event title banner"
              >
                Recenter
              </button>
            </div>
            <span className="settings-hint">Drag the banner to reposition. It opens the events panel when clicked without dragging.</span>
          </>
        )}
      </div>
    </>
  );
}

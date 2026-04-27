import React from 'react';
import { STORAGE_MODELS } from '../SieveRenderer';

/**
 * Popover anchored to the trace title showing storage model + parsed
 * header sections. Pure presentational — parent controls open state.
 *
 * @param {object}  props
 * @param {React.Ref} props.popoverRef     Ref attached to the popover root for outside-click handling.
 * @param {string}    props.storageModel   Currently selected storage model key.
 * @param {function}  props.setStorageModel Setter for the storage model select.
 * @param {object}    props.header         Parsed trace header (for hint text).
 * @param {Array}     props.sections       Output of `buildTraceInfoSections`.
 */
export default function TraceInfoPopover({ popoverRef, storageModel, setStorageModel, header, sections }) {
  return (
    <div className="trace-info-popover" ref={popoverRef}>
      <div className="trace-info-section">
        <div className="trace-info-section-title">Storage model</div>
        <div className="trace-info-row">
          <select
            className="trace-info-storage-select"
            value={storageModel || 'half'}
            onChange={(e) => setStorageModel(e.target.value)}
            title={`Detected from log: ${header.storageModel || 'half'}`}
          >
            {Object.entries(STORAGE_MODELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        {header.storageModel && header.storageModel !== storageModel && (
          <div className="trace-info-row trace-info-row-hint">
            Log reported <code>{header.storageModel}</code> — override active.
          </div>
        )}
      </div>
      {sections.map((section) => (
        <div key={section.title} className="trace-info-section">
          <div className="trace-info-section-title">{section.title}</div>
          {section.rows.map((row) => (
            <div key={`${section.title}-${row.label}-${row.value}`} className="trace-info-row trace-info-row-kv">
              <span className="trace-info-key">{row.label}</span>
              <span className="trace-info-value">{row.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

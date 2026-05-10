import React from 'react';

/**
 * Modal overlay that shows the per-bit/per-number detail table for the
 * current step. Pure presentational — all state and filtering live in the
 * parent (`Visualizer`).
 *
 * Props:
 *   open                — whether to render the overlay
 *   mode                — `'bits'` or `'numbers'`; toggles the heading
 *   query               — current search filter
 *   onQueryChange       — (string) => void
 *   onClose             — () => void invoked by the close button
 *   rows                — full unfiltered row list (for the "X / Y" count)
 *   filteredRows        — rows currently visible after `query` filtering
 *   steps               — all trace steps (items 224+225: for event labels in changedBySteps)
 */
export default function DetailInspectorOverlay({
  open,
  mode,
  query,
  onQueryChange,
  onClose,
  rows,
  filteredRows,
  steps,
}) {
  if (!open) return null;

  const hasWheelColumns = rows.some((row) => row.wheelPeriod != null || row.relativeBit != null || row.relativeNumber != null);
  // items 224+225: show "Events" column only when rows have changedBySteps data
  const hasEventsColumn = rows.some((row) => row.changedBySteps && row.changedBySteps.length > 0);

  // items 224+225: format which events changed a bit for display and tooltip
  const formatChangedBySteps = (changedBySteps) => {
    if (!changedBySteps || changedBySteps.length === 0) return { label: '—', tooltip: '' };
    const labels = changedBySteps.map((idx) => {
      const step = steps?.[idx];
      return step ? (step.annotation || step.operation || `#${idx}`) : `#${idx}`;
    });
    return {
      label: labels[0] + (labels.length > 1 ? ` +${labels.length - 1}` : ''),
      tooltip: labels.join('\n'),
    };
  };

  return (
    <div className="detail-inspector-overlay" role="dialog" aria-modal="true">
      <div className="detail-inspector-panel">
        <div className="detail-inspector-header">
          <div className="detail-inspector-title">
            {mode === 'numbers' ? 'Marked Numbers' : 'Changed Bits'}
          </div>
          <button className="btn-icon" onClick={onClose} title="Close inspector">✕</button>
        </div>
        <div className="detail-inspector-controls">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={hasWheelColumns ? 'Search bit, number, wheel, relative bit, relative number' : 'Search bit, number, byte, uint64, group, cacheline'}
            className="detail-inspector-search"
          />
          <span className="detail-inspector-count">
            {filteredRows.length} / {rows.length}
          </span>
        </div>
        <div className="detail-inspector-table-wrap">
          <table className="detail-inspector-table">
            <thead>
              <tr>
                <th>Bit</th>
                <th>Number</th>
                {hasWheelColumns && <th>Wheel</th>}
                {hasWheelColumns && <th>Rel Bit</th>}
                {hasWheelColumns && <th>Rel Number</th>}
                <th>Byte</th>
                <th>uint64</th>
                <th>Group</th>
                <th>Cacheline</th>
                {hasEventsColumn && <th title="Events that changed this bit">Events</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const { label, tooltip } = hasEventsColumn ? formatChangedBySteps(row.changedBySteps) : {};
                return (
                  <tr key={`di-${row.bit}`}>
                    <td>{row.bit}</td>
                    <td>{row.number}</td>
                    {hasWheelColumns && <td>{row.wheelPeriod ?? ''}</td>}
                    {hasWheelColumns && <td>{row.relativeBit ?? ''}</td>}
                    {hasWheelColumns && <td>{row.relativeNumber ?? ''}</td>}
                    <td>{row.byte}</td>
                    <td>{row.uint64}</td>
                    <td>{row.group}</td>
                    <td>{row.cacheline}</td>
                    {hasEventsColumn && (
                      <td title={tooltip} style={{ cursor: tooltip ? 'help' : 'default', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

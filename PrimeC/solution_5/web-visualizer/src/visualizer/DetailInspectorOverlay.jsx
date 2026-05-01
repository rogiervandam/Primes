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
 */
export default function DetailInspectorOverlay({
  open,
  mode,
  query,
  onQueryChange,
  onClose,
  rows,
  filteredRows,
}) {
  if (!open) return null;

  const hasWheelColumns = rows.some((row) => row.wheelPeriod != null || row.relativeBit != null || row.relativeNumber != null);

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
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

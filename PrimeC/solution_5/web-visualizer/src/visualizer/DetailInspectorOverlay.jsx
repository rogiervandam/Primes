import React, { useState, useRef, useCallback, useEffect } from 'react';

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
 *
 * item 466: panel is draggable (header drag handle), resizable (bottom-right
 * corner handle), and the table scrolls horizontally when columns overflow.
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
  // item 466: drag / resize state.  null = default centered/auto layout.
  const [dragPos, setDragPos] = useState(null);   // { x, y } panel offset from overlay origin
  const [panelSize, setPanelSize] = useState(null); // { width, height } in px
  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  // Reset position/size when the panel re-opens so it always starts centered.
  const prevOpen = useRef(false);
  useEffect(() => {
    if (!prevOpen.current && open) {
      setDragPos(null);
      setPanelSize(null);
    }
    prevOpen.current = open;
  }, [open]);

  // Drag the panel by its header.
  const handleHeaderPointerDown = useCallback((e) => {
    if (e.target.closest('button, input')) return;
    e.preventDefault();
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;
    const panelRect = panel.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = panelRect.left - overlayRect.left;
    const startTop = panelRect.top - overlayRect.top;
    panel.setPointerCapture(e.pointerId);
    const onMove = (me) => {
      const overlayR = overlay.getBoundingClientRect();
      const panelR = panel.getBoundingClientRect();
      const newLeft = Math.max(0, Math.min(overlayR.width - panelR.width, startLeft + (me.clientX - startX)));
      const newTop = Math.max(0, Math.min(overlayR.height - panelR.height, startTop + (me.clientY - startY)));
      setDragPos({ x: newLeft, y: newTop });
    };
    const onUp = () => {
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup', onUp);
    };
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', onUp);
  }, []);

  // Resize the panel from its bottom-right handle.
  const handleResizePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const panel = panelRef.current;
    if (!panel) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = panel.getBoundingClientRect().width;
    const startH = panel.getBoundingClientRect().height;
    panel.setPointerCapture(e.pointerId);
    const onMove = (me) => {
      const newW = Math.max(280, startW + (me.clientX - startX));
      const newH = Math.max(160, startH + (me.clientY - startY));
      setPanelSize({ width: newW, height: newH });
    };
    const onUp = () => {
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup', onUp);
    };
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', onUp);
  }, []);

  if (!open) return null;

  const hasWheelColumns = rows.some((row) => row.wheelPeriod != null || row.relativeBit != null || row.relativeNumber != null);
  // items 224+225: show "Events" column only when rows have changedBySteps data
  const hasEventsColumn = rows.some((row) => row.changedBySteps && row.changedBySteps.length > 0);

  // item 446: map mode to human-readable title
  const MODE_TITLE = { numbers: 'Marked Numbers', bits: 'Changed Bits', targeted: 'Targeted Bits', alreadySet: 'Already Set Bits', newlySet: 'Newly Set Bits' };
  const overlayTitle = MODE_TITLE[mode] ?? 'Changed Bits';

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

  // item 466: compute panel inline style — absolute positioning when dragged.
  const panelStyle = {};
  if (dragPos) {
    panelStyle.left = `${dragPos.x}px`;
    panelStyle.top = `${dragPos.y}px`;
    panelStyle.transform = 'none';
  }
  if (panelSize) {
    panelStyle.width = `${panelSize.width}px`;
    panelStyle.height = `${panelSize.height}px`;
    panelStyle.maxHeight = 'none';
  }

  return (
    <div
      className={`detail-inspector-overlay${dragPos ? ' detail-inspector-overlay--floating' : ''}`}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="detail-inspector-panel"
        ref={panelRef}
        style={panelStyle}
      >
        {/* item 466: header is the drag handle */}
        <div
          className="detail-inspector-header detail-inspector-header--draggable"
          onPointerDown={handleHeaderPointerDown}
        >
          <div className="detail-inspector-title">
            {overlayTitle}
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
        {/* item 466: overflow-x: auto for horizontal scroll when columns are wide */}
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
                      <td title={tooltip} style={{ cursor: tooltip ? 'help' : 'default' }}>
                        {label}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* item 466: resize handle — bottom-right corner */}
        <div
          className="detail-inspector-resize-handle"
          onPointerDown={handleResizePointerDown}
          title="Drag to resize"
        />
      </div>
    </div>
  );
}


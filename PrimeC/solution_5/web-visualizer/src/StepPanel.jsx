import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

/**
 * Resizable step list panel with search/filter.
 */
export default function StepPanel({ steps, currentStep, onStepClick, width, onWidthChange }) {
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState('');

  // Collect unique operations for filter dropdown
  const operations = useMemo(() => {
    const ops = new Set();
    for (const s of steps) {
      if (s.operation) ops.add(s.operation);
    }
    return Array.from(ops).sort();
  }, [steps]);

  // Filtered steps
  const filteredSteps = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return steps.map((s, i) => ({ ...s, originalIndex: i })).filter((s) => {
      if (filterOp && s.operation !== filterOp) return false;
      if (lowerSearch) {
        const text = `${s.stepId} ${s.annotation} ${s.operation || ''} ${s.prime ?? ''}`.toLowerCase();
        if (!text.includes(lowerSearch)) return false;
      }
      return true;
    });
  }, [steps, search, filterOp]);

  // Scroll active step into view
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector('.step-item.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentStep]);

  // Resize drag handle
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (e) => {
      const delta = e.clientX - startX;
      onWidthChange(Math.max(200, Math.min(800, startWidth + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width, onWidthChange]);

  return (
    <div className="step-panel" ref={panelRef} style={{ width: `${width}px` }}>
      <div className="step-panel-header">
        <h3>Steps ({filteredSteps.length}/{steps.length})</h3>
        <input
          className="step-search"
          type="text"
          placeholder="Search steps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {operations.length > 0 && (
          <select
            className="step-filter"
            value={filterOp}
            onChange={(e) => setFilterOp(e.target.value)}
          >
            <option value="">All operations</option>
            {operations.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        )}
      </div>

      <div className="step-list" ref={listRef}>
        {filteredSteps.map((s) => {
          const tooltip = [
            `Step ${s.originalIndex}`,
            s.operation ? `Operation: ${s.operation}` : null,
            s.prime != null ? `Prime: ${s.prime}` : null,
            s.blockStart != null ? `Block: [${s.blockStart} – ${s.blockStop}]` : null,
            s.factorStep != null ? `Factor step: ${s.factorStep}` : null,
            `Bits changed: ${s.numChanged}`,
            s.annotation,
          ].filter(Boolean).join('\n');

          return (
            <div
              key={s.originalIndex}
              className={`step-item${s.originalIndex === currentStep ? ' active' : ''}`}
              onClick={() => onStepClick(s.originalIndex)}
              title={tooltip}
            >
              <span className="step-num">{s.originalIndex}</span>
              {s.operation && <span className="step-op">{s.operation}</span>}
              <span className="step-changes">
                {s.numChanged > 0 ? `+${s.numChanged}` : ''}
              </span>
              <span className="step-prime">
                {s.prime != null ? `p${s.prime}` : ''}
              </span>
              <span className="step-text">{s.annotation}</span>
            </div>
          );
        })}
      </div>

      {/* Resize handle */}
      <div className="resize-handle" onMouseDown={handleMouseDown} />
    </div>
  );
}

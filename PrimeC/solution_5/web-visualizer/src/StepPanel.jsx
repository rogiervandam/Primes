import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

/**
 * Hierarchical step panel grouped by prime, with collapse/expand.
 */
export default function StepPanel({ steps, currentStep, onStepClick, width, onWidthChange }) {
  const listRef = useRef(null);
  const scrollTopRef = useRef(0);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState('');
  const [collapsed, setCollapsed] = useState(new Set());

  // Unique operations for filter
  const operations = useMemo(() => {
    const ops = new Set();
    for (const s of steps) if (s.operation) ops.add(s.operation);
    return Array.from(ops).sort();
  }, [steps]);

  // Build hierarchical tree grouped by prime
  const tree = useMemo(() => {
    const groups = [];
    let current = null;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];

      // Step 0 with no prime => Sieve Creation
      if (i === 0 && s.prime == null) {
        groups.push({
          id: 0,
          prime: null,
          label: 'Sieve Creation',
          operation: 'Initialization',
          children: [{ ...s, originalIndex: i }],
          totalChanged: s.numChanged,
        });
        current = null;
        continue;
      }

      // Group by prime
      if (!current || current.prime !== s.prime) {
        current = {
          id: groups.length,
          prime: s.prime,
          label: s.prime != null ? `Prime ${s.prime}` : (s.operation || 'Unknown'),
          operation: s.operation || '',
          children: [],
          totalChanged: 0,
        };
        groups.push(current);
      }

      current.children.push({ ...s, originalIndex: i });
      current.totalChanged += s.numChanged;
    }

    return groups;
  }, [steps]);

  // Filter
  const filteredTree = useMemo(() => {
    if (!search && !filterOp) return tree;
    const lower = search.toLowerCase();
    return tree.map(g => {
      const fc = g.children.filter(s => {
        if (filterOp && s.operation !== filterOp) return false;
        if (lower) {
          const text = `${s.stepId} ${s.annotation} ${s.operation || ''} ${s.prime ?? ''} ${g.label}`.toLowerCase();
          if (!text.includes(lower)) return false;
        }
        return true;
      });
      return { ...g, children: fc };
    }).filter(g => g.children.length > 0);
  }, [tree, search, filterOp]);

  // Scroll active step into view
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector('.step-item.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentStep]);

  const toggleGroup = useCallback((groupId) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Resize with scroll preservation
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    if (listRef.current) scrollTopRef.current = listRef.current.scrollTop;

    const onMove = (ev) => {
      onWidthChange(Math.max(200, Math.min(800, startWidth + (ev.clientX - startX))));
    };
    const onUp = () => {
      if (listRef.current) listRef.current.scrollTop = scrollTopRef.current;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width, onWidthChange]);

  const totalVisible = filteredTree.reduce((a, g) => a + g.children.length, 0);

  return (
    <div className="step-panel" style={{ width: `${width}px` }}>
      <div className="step-panel-header">
        <h3>Steps ({totalVisible}/{steps.length})</h3>
        <input
          className="step-search"
          type="text"
          placeholder="Search steps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {operations.length > 0 && (
          <select className="step-filter" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
            <option value="">All operations</option>
            {operations.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        )}
      </div>

      <div className="step-list" ref={listRef}>
        {filteredTree.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const containsActive = group.children.some(s => s.originalIndex === currentStep);

          return (
            <div key={group.id} className="step-group">
              <div
                className={`step-group-header${containsActive ? ' active-group' : ''}`}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="step-group-toggle">{isCollapsed ? '▶' : '▼'}</span>
                <span className="step-group-prime">{group.label}</span>
                {group.operation && group.operation !== 'Initialization' && (
                  <span className="step-op">{group.operation}</span>
                )}
                <span className="step-group-info">
                  {group.children.length > 1 ? `${group.children.length} steps` : '1 step'}
                  {group.totalChanged > 0 ? ` · +${group.totalChanged}` : ''}
                </span>
              </div>

              {!isCollapsed && group.children.map(s => {
                const isActive = s.originalIndex === currentStep;
                const tooltip = [
                  s.prime != null ? `Prime ${s.prime}` : null,
                  `Step ${s.originalIndex}`,
                  s.operation ? `Operation: ${s.operation}` : null,
                  s.blockStart != null ? `Block: [${s.blockStart} – ${s.blockStop}]` : null,
                  s.factorStep != null ? `Factor step: ${s.factorStep}` : null,
                  `Bits changed: ${s.numChanged}`,
                  s.annotation,
                ].filter(Boolean).join('\n');

                return (
                  <div
                    key={s.originalIndex}
                    className={`step-item step-child${isActive ? ' active' : ''}`}
                    onClick={() => onStepClick(s.originalIndex)}
                    title={tooltip}
                  >
                    <span className="step-num">{s.originalIndex}</span>
                    {s.operation && <span className="step-op">{s.operation}</span>}
                    <span className="step-changes">
                      {s.numChanged > 0 ? `+${s.numChanged}` : ''}
                    </span>
                    <span className="step-text">{s.annotation}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="resize-handle" onMouseDown={handleMouseDown} />
    </div>
  );
}

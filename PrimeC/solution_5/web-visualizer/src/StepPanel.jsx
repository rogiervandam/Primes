import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

/**
 * Convert a flat list of steps (each with a `depth` field, 0-based) into
 * a tree structure, capped at maxDepth levels.
 */
function buildDepthTree(steps) {
  const root = { children: [], isRoot: true, _depth: -1 };
  const stack = [root];

  for (const step of steps) {
    const d = Math.max(0, step.depth || 0);
    const node = { ...step, children: [], _depth: d };

    // Absolute-depth model: same depth => sibling, larger depth => nested
    while (stack.length > 1 && stack[stack.length - 1]._depth >= d) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    parent.children.push(node);
    stack.push(node);
  }

  return root.children;
}

/**
 * Hierarchical step panel grouped by prime, with collapse/expand.
 */
export default function StepPanel({ steps, currentStep, selectedSteps, onStepClick, onMultiStepSelect, width, onWidthChange, panelCollapsed, onToggleCollapse }) {
  const listRef = useRef(null);
  const scrollTopRef = useRef(0);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState('');
  const [collapsed, setCollapsed] = useState(new Set());
  const lastClickedRef = useRef(null);

  const handleStepClick = useCallback((stepIdx, e) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle individual step in selection
      onMultiStepSelect(prev => {
        const next = new Set(prev);
        if (next.has(stepIdx)) next.delete(stepIdx);
        else next.add(stepIdx);
        return next;
      });
    } else if (e.shiftKey && lastClickedRef.current != null) {
      // Range select
      const from = Math.min(lastClickedRef.current, stepIdx);
      const to = Math.max(lastClickedRef.current, stepIdx);
      onMultiStepSelect(() => {
        const next = new Set();
        for (let i = from; i <= to; i++) next.add(i);
        return next;
      });
    } else {
      onStepClick(stepIdx);
      onMultiStepSelect(new Set());
    }
    lastClickedRef.current = stepIdx;
  }, [onStepClick, onMultiStepSelect]);

  // Unique operations for filter
  const operations = useMemo(() => {
    const ops = new Set();
    for (const s of steps) {
      if (s.operation) ops.add(s.operation);
      for (const op of (s.operationPath || [])) ops.add(op);
    }
    return Array.from(ops).sort();
  }, [steps]);

  // Build hierarchical tree grouped by prime, then nested by depth within each group
  const tree = useMemo(() => {
    const groups = [];
    let current = null;
    let lastPrime = null;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const effectivePrime = s.prime != null ? s.prime : lastPrime;
      if (s.prime != null) lastPrime = s.prime;

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
      if (!current || current.prime !== effectivePrime) {
        current = {
          id: groups.length,
          prime: effectivePrime,
          label: effectivePrime != null ? `Prime ${effectivePrime}` : (s.operation || 'Unknown'),
          operation: s.operation || '',
          children: [],
          totalChanged: 0,
        };
        groups.push(current);
      }

      current.children.push({ ...s, originalIndex: i });
      current.totalChanged += s.numChanged;
    }

    // Within each group, build a depth tree from the flat children list
    return groups.map(g => ({
      ...g,
      depthTree: buildDepthTree(g.children),
    }));
  }, [steps]);

  // Filter — operates on flat children before depth-tree is built
  const filteredTree = useMemo(() => {
    if (!search && !filterOp) return tree;
    const lower = search.toLowerCase();
    return tree.map(g => {
      const fc = g.children.filter(s => {
        const path = s.operationPath || [];
        if (filterOp && s.operation !== filterOp && !path.includes(filterOp)) return false;
        if (lower) {
          const text = `${s.stepId} ${s.annotation} ${s.operation || ''} ${(s.operationPath || []).join(' ')} ${s.prime ?? ''} ${g.label}`.toLowerCase();
          if (!text.includes(lower)) return false;
        }
        return true;
      });
      return { ...g, children: fc, depthTree: buildDepthTree(fc) };
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

  /**
   * Recursive renderer for a depth-tree node.
   * `nodeDepth` = visual indent level (0 = group child, 1..5 = nested).
   */
  const renderStepNode = useCallback((node, nodeDepth = 0) => {
    const isActive = node.originalIndex === currentStep;
    const isSelected = selectedSteps.has(node.originalIndex);
    const hasChildren = node.children && node.children.length > 0;
    const collapseKey = `node-${node.originalIndex}`;
    const isNodeCollapsed = collapsed.has(collapseKey);

    const tooltip = [
      node.prime != null ? `Prime ${node.prime}` : null,
      `Step ${node.originalIndex}`,
      node.depth > 0 ? `Depth: ${node.depth}` : null,
      node.operation ? `Operation: ${node.operation}` : null,
      node.operationPath?.length ? `Path: ${node.operationPath.join(' > ')}` : null,
      node.blockStart != null ? `Block: [${node.blockStart} – ${node.blockStop}]` : null,
      node.factorStep != null ? `Factor step: ${node.factorStep}` : null,
      `Bits changed: ${node.numChanged}`,
      node.annotation,
    ].filter(Boolean).join('\n');

    return (
      <div key={node.originalIndex} className={`step-depth-node depth-${Math.min(6, nodeDepth)}`}>
        <div
          className={`step-item step-child${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}${hasChildren ? ' has-children' : ''}`}
          style={{ paddingLeft: `${8 + nodeDepth * 14}px` }}
          onClick={(e) => {
            if (hasChildren && e.target.classList.contains('step-depth-toggle')) return;
            handleStepClick(node.originalIndex, e);
          }}
          title={tooltip}
        >
          {hasChildren && (
            <span
              className="step-depth-toggle"
              onClick={(e) => { e.stopPropagation(); toggleGroup(collapseKey); }}
            >
              {isNodeCollapsed ? '▶' : '▼'}
            </span>
          )}
          {!hasChildren && <span className="step-depth-bullet">·</span>}
          <span className="step-num">{node.originalIndex}</span>
          {node.operation && <span className="step-op">{node.operation}</span>}
          <span className="step-changes">{node.numChanged > 0 ? `+${node.numChanged}` : ''}</span>
          <span className="step-text">{node.annotation}</span>
        </div>
        {hasChildren && !isNodeCollapsed && (
          <div className="step-depth-children">
            {node.children.map(child => renderStepNode(child, nodeDepth + 1))}
          </div>
        )}
      </div>
    );
  }, [currentStep, selectedSteps, collapsed, handleStepClick, toggleGroup]);

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
    <div className={`step-panel${panelCollapsed ? ' collapsed' : ''}`} style={{ width: panelCollapsed ? '32px' : `${width}px` }}>
      <button className="step-panel-collapse-btn" onClick={onToggleCollapse} title={panelCollapsed ? 'Expand steps panel' : 'Collapse steps panel'}>
        {panelCollapsed ? '▶' : '◀'}
      </button>
      {!panelCollapsed && (
        <>
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
          const containsActive = group.children.some(s => s.originalIndex === currentStep || selectedSteps.has(s.originalIndex));

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

              {!isCollapsed && (
                <div className="step-group-children">
                  {group.depthTree.map(node => renderStepNode(node, 0))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="resize-handle" onMouseDown={handleMouseDown} />
        </>
      )}
    </div>
  );
}

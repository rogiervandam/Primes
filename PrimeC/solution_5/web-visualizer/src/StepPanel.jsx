import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Play, Pause, StepBack, StepForward, SkipBack, SkipForward, Minus, Plus } from './Icons';
import { formatNs } from './TimingPanel';

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

  const annotate = (node) => {
    const own = Number(node.numChanged || 0);
    let aggregateChanged = own;
    let aggregateElapsedNs = Number(node.elapsedNs || 0);
    const aggregateStepIndices = [node.originalIndex];

    for (const child of (node.children || [])) {
      annotate(child);
      aggregateChanged += Number(child.aggregateChanged || 0);
      aggregateElapsedNs += Number(child.aggregateElapsedNs || 0);
      if (Array.isArray(child.aggregateStepIndices)) {
        aggregateStepIndices.push(...child.aggregateStepIndices);
      }
    }

    node.aggregateChanged = aggregateChanged;
    node.aggregateElapsedNs = aggregateElapsedNs;
    node.aggregateStepIndices = aggregateStepIndices;
  };

  for (const n of root.children) annotate(n);

  // Post-pass: for each node with no timing, look for a next sibling in the
  // flat steps array at the same level (or one higher) with the same range
  // and factorStep that carries timing — absorb its timing and annotation.
  const stepByOrigIndex = new Map();
  for (const s of steps) stepByOrigIndex.set(s.originalIndex, s);

  const mergeTimingFromNext = (node) => {
    if (!(Number(node.elapsedNs) > 0) && node.originalIndex != null) {
      const nodeLevel = node.level;
      const nodeStart = node.start;
      const nodeStop = node.stop;
      const nodeFactorStep = node.factorStep;
      if (nodeStart != null && nodeStop != null) {
        // Look at subsequent steps (by originalIndex order) for a matching timing event
        const sortedIndices = Array.from(stepByOrigIndex.keys()).sort((a, b) => a - b);
        const pos = sortedIndices.indexOf(node.originalIndex);
        if (pos !== -1) {
          for (let i = pos + 1; i < sortedIndices.length; i++) {
            const candidate = stepByOrigIndex.get(sortedIndices[i]);
            if (!candidate) continue;
            // Only look at same or one-higher level
            if (Number.isFinite(nodeLevel) && Number.isFinite(candidate.level)) {
              if (candidate.level !== nodeLevel && candidate.level !== nodeLevel - 1) break;
            }
            if (candidate.start === nodeStart && candidate.stop === nodeStop &&
                candidate.factorStep === nodeFactorStep && Number(candidate.elapsedNs) > 0) {
              node.elapsedNs = candidate.elapsedNs;
              node.aggregateElapsedNs = (node.aggregateElapsedNs || 0) + Number(candidate.elapsedNs);
              if (candidate.annotation && !node.annotation) node.annotation = candidate.annotation;
              break;
            }
            // If the levels jump too far or range doesn't match, stop searching
            if (candidate.start !== nodeStart || candidate.stop !== nodeStop) break;
          }
        }
      }
    }
    for (const child of node.children || []) mergeTimingFromNext(child);
  };

  for (const n of root.children) mergeTimingFromNext(n);

  return root.children;
}

/**
 * Hierarchical step panel grouped by prime, with collapse/expand.
 */
export default function StepPanel({ steps, currentStep, selectedSteps, onStepClick, onMultiStepSelect, width, onWidthChange, panelCollapsed, onToggleCollapse, onUserScroll, externalOpFilter = '', onExternalOpFilterConsumed, revealStepRequest = 0, goToStep, playing, handlePlayPause, exporting, isScrubbingTopRef, playSpeedPercent, setPlaySpeedPercent }) {
  const listRef = useRef(null);
  const scrollTopRef = useRef(0);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState('');
  // Drag state for the collapsed floating panel
  const [floatDrag, setFloatDrag] = useState({ x: 0, y: 0 });
  const floatDragRef = useRef({ x: 0, y: 0 });

  const handleFloatDragStart = useCallback((e) => {
    if (e.target.closest('input') || e.target.closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startDrag = { ...floatDragRef.current };
    let dragged = false;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) < 4) return;
      dragged = true;
      const next = { x: startDrag.x + dx, y: startDrag.y + dy };
      floatDragRef.current = next;
      setFloatDrag(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  }, []);
  // filterLevel encoding: '' (all) | 'exact:N' | 'upto:N' | 'collapse:N'
  const [filterLevel, setFilterLevel] = useState(() => {
    try { return localStorage.getItem('sieve-filter-level') || ''; } catch { return ''; }
  });
  const [hideUntimed, setHideUntimed] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(false);

  // Sync externally-driven op filter (e.g. from TimingPanel click)
  useEffect(() => {
    if (externalOpFilter && externalOpFilter !== filterOp) {
      setFilterOp(externalOpFilter);
      if (onExternalOpFilterConsumed) onExternalOpFilterConsumed();
    }
  }, [externalOpFilter, filterOp, onExternalOpFilterConsumed]);

  // Persist filterLevel to localStorage
  useEffect(() => {
    try { localStorage.setItem('sieve-filter-level', filterLevel); } catch {}
  }, [filterLevel]);
  const [collapsed, setCollapsed] = useState(new Set());
  const initialCollapseDoneRef = useRef(false);
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

  const traceLevels = useMemo(() => {
    const levels = new Set();
    for (const s of steps) {
      if (Number.isFinite(s.level)) levels.add(Number(s.level));
    }
    return Array.from(levels).sort((a, b) => a - b);
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

  // Parse filterLevel encoding ('' | 'exact:N' | 'upto:N' | 'collapse:N')
  const levelFilter = useMemo(() => {
    if (!filterLevel) return null;
    const [mode, numStr] = String(filterLevel).split(':');
    const n = Number(numStr);
    if (!Number.isFinite(n)) return null;
    return { mode, value: n };
  }, [filterLevel]);

  // Flat lookup from originalIndex → full (unfiltered) tree node, so the
  // filtered tree can recover aggregate totals for nodes whose descendants
  // are hidden by the level filter.
  const nodeByOriginalIndex = useMemo(() => {
    const map = new Map();
    const walk = (node) => {
      if (node.originalIndex != null) map.set(node.originalIndex, node);
      for (const child of node.children || []) walk(child);
    };
    for (const g of tree) for (const n of g.depthTree || []) walk(n);
    return map;
  }, [tree]);

  // Filter — operates on flat children before depth-tree is built
  const filteredTree = useMemo(() => {
    if (!search && !filterOp && !levelFilter && !hideUntimed && !hideUnchanged) return tree;
    const lower = search.toLowerCase();

    // After rebuilding the depth tree from filtered children, walk it and
    // patch each node's aggregates from the full unfiltered tree so that
    // nodes at the level cutoff show totals that include their hidden descendants.
    const patchAggregates = (node) => {
      const full = nodeByOriginalIndex.get(node.originalIndex);
      if (full) {
        const hiddenCount = (full.aggregateStepIndices?.length ?? 1) - (node.aggregateStepIndices?.length ?? 1);
        if (hiddenCount > 0) {
          node.aggregateChanged = full.aggregateChanged;
          node.aggregateElapsedNs = full.aggregateElapsedNs;
          node.aggregateStepIndices = full.aggregateStepIndices;
          node.hasHiddenDescendants = true;
          node.hiddenDescendantCount = hiddenCount;
        }
      }
      for (const child of node.children || []) patchAggregates(child);
    };

    return tree.map(g => {
      const fc = g.children.filter(s => {
        const path = s.operationPath || [];
        if (levelFilter && levelFilter.mode !== 'collapse') {
          if (!Number.isFinite(s.level)) return false;
          if (levelFilter.mode === 'exact' && s.level !== levelFilter.value) return false;
          if (levelFilter.mode === 'upto' && s.level > levelFilter.value) return false;
        }
        if (filterOp && s.operation !== filterOp && !path.includes(filterOp)) return false;
        if (hideUntimed && !(Number(s.elapsedNs) > 0)) return false;
        if (hideUnchanged && !(Number(s.numChanged) > 0)) return false;
        if (lower) {
          const text = `${s.stepId} ${s.level ?? ''} ${s.annotation} ${s.operation || ''} ${(s.operationPath || []).join(' ')} ${s.prime ?? ''} ${g.label}`.toLowerCase();
          if (!text.includes(lower)) return false;
        }
        return true;
      });
      const depthTree = buildDepthTree(fc);
      for (const n of depthTree) patchAggregates(n);
      return { ...g, children: fc, depthTree };
    }).filter(g => g.children.length > 0);
  }, [tree, nodeByOriginalIndex, search, filterOp, levelFilter, hideUntimed, hideUnchanged]);

  useEffect(() => {
    if (initialCollapseDoneRef.current || tree.length === 0) return;
    setCollapsed(new Set(tree.map((g) => g.id)));
    initialCollapseDoneRef.current = true;
  }, [tree]);

  // When filterLevel is 'collapse:N', auto-collapse all nodes whose level > N.
  useEffect(() => {
    if (!levelFilter || levelFilter.mode !== 'collapse') return;
    const collapseLevel = levelFilter.value;
    const keys = new Set();
    const collectCollapseKeys = (node) => {
      if (Number.isFinite(node.level) && node.level >= collapseLevel && node.children?.length > 0) {
        keys.add(`node-${node.originalIndex}`);
      }
      for (const child of node.children || []) collectCollapseKeys(child);
    };
    for (const g of tree) for (const n of g.depthTree || []) collectCollapseKeys(n);
    setCollapsed(prev => {
      const next = new Set(prev);
      for (const k of keys) next.add(k);
      return next;
    });
  }, [levelFilter, tree]);

  // New trace import: clear stale filters; default level filter to "up to second-lowest level"
  // so users see the high-level operations first and can drill down.
  useEffect(() => {
    setSearch('');
    setFilterOp('');
    setHideUntimed(false);
    setHideUnchanged(false);
    // Determine second-lowest level from the incoming steps (levels 5..9 in this codebase).
    const levels = new Set();
    for (const s of steps) if (Number.isFinite(s.level)) levels.add(Number(s.level));
    const sorted = Array.from(levels).sort((a, b) => a - b);
    // Only apply default filter if user has no saved preference
    let savedLevel = '';
    try { savedLevel = localStorage.getItem('sieve-filter-level') || ''; } catch {}
    if (!savedLevel) {
      if (sorted.length >= 2) setFilterLevel(`upto:${sorted[1]}`);
      else setFilterLevel('');
    }
    setCollapsed(new Set());
    initialCollapseDoneRef.current = false;
    lastClickedRef.current = null;
  }, [steps]);

  // Scroll active step into view
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector('.step-item.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentStep]);

  // Reveal request: when bumped, clear filters that hide the current step,
  // expand its enclosing group + every ancestor node, then scroll it into
  // view. Triggered from the event-title widget's locate button.
  useEffect(() => {
    if (!revealStepRequest) return;
    if (currentStep == null || currentStep < 0) return;

    // 1. Drop filters that could be hiding the step.
    setSearch('');
    setFilterOp('');
    setFilterLevel('');
    setHideUntimed(false);
    setHideUnchanged(false);

    // 2. Find the enclosing group + the chain of ancestor nodes.
    const collapseKeysToOpen = new Set();
    for (const g of tree) {
      const indicesInGroup = (g.children || []).some((c) => c.originalIndex === currentStep);
      if (!indicesInGroup) continue;
      collapseKeysToOpen.add(g.id);
      // Walk the depthTree to find the path to the node and add every
      // ancestor that has children (i.e. that could be collapsed).
      const findPath = (node) => {
        if (node.originalIndex === currentStep) return [node];
        for (const child of node.children || []) {
          const sub = findPath(child);
          if (sub) return [node, ...sub];
        }
        return null;
      };
      for (const root of g.depthTree || []) {
        const path = findPath(root);
        if (!path) continue;
        // Add every node along the path EXCEPT the leaf itself (that's the
        // target — we want it visible, not collapsed).
        for (let i = 0; i < path.length - 1; i++) {
          collapseKeysToOpen.add(`node-${path[i].originalIndex}`);
        }
        break;
      }
      break;
    }

    // 3. Remove those keys from the collapsed set.
    setCollapsed((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const k of collapseKeysToOpen) {
        if (next.has(k)) { next.delete(k); changed = true; }
      }
      return changed ? next : prev;
    });

    // 4. Scroll into view shortly after re-render.
    const handle = setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const active = el.querySelector('.step-item.active');
      if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 60);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealStepRequest]);

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
    const hasHiddenDescendants = !!node.hasHiddenDescendants;
    // A node is an "aggregate leaf" when its visible children were fully filtered
    // out but it has hidden descendants — show it like a collapsed parent.
    const isAggregateLeaf = hasHiddenDescendants && !hasChildren;
    const changedCount = (hasChildren || hasHiddenDescendants)
      ? Number(node.aggregateChanged || node.numChanged || 0)
      : Number(node.numChanged || 0);
    const displayElapsedNs = (hasChildren || hasHiddenDescendants)
      ? Number(node.aggregateElapsedNs || node.elapsedNs || 0)
      : Number(node.elapsedNs || 0);
    const collapseKey = `node-${node.originalIndex}`;
    const isNodeCollapsed = collapsed.has(collapseKey);
    const eventId = node.stepId ?? node.originalIndex;

    const tooltip = [
      node.prime != null ? `Prime ${node.prime}` : null,
      `Event ${eventId}`,
      node.depth > 0 ? `Depth: ${node.depth}` : null,
      node.operation ? `Operation: ${node.operation}` : null,
      node.operationPath?.length ? `Path: ${node.operationPath.join(' > ')}` : null,
      node.start != null ? `Range: [${node.start} – ${node.stop}]` : null,
      node.factorStep != null ? `Step size: ${node.factorStep}` : null,
      `Bits changed: ${changedCount}`,
      hasHiddenDescendants ? `(includes ${node.hiddenDescendantCount} hidden event${node.hiddenDescendantCount !== 1 ? 's' : ''})` : null,
      node.annotation,
    ].filter(Boolean).join('\n');
    const summaryText = formatStepSummary(node);

    return (
      <div key={node.originalIndex} className={`step-depth-node depth-${Math.min(6, nodeDepth)}`}>
        <div
          className={`step-item step-child${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}${hasChildren ? ' has-children' : ''}${isAggregateLeaf ? ' has-hidden-descendants' : ''}`}
          style={{ '--node-depth': nodeDepth }}
          onClick={(e) => {
            if (hasChildren && e.target.classList.contains('step-depth-toggle')) return;
            if ((hasChildren || hasHiddenDescendants) && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              onStepClick(node.originalIndex);
              onMultiStepSelect(new Set(node.aggregateStepIndices || [node.originalIndex]));
              lastClickedRef.current = node.originalIndex;
              return;
            }
            handleStepClick(node.originalIndex, e);
          }}
          title={tooltip}
        >
          <span className="step-left" style={{ paddingLeft: `${8 + nodeDepth * 14}px` }}>
          {hasChildren && (
            <span
              className="step-depth-toggle"
              onClick={(e) => { e.stopPropagation(); toggleGroup(collapseKey); }}
            >
              {isNodeCollapsed ? '▶' : '▼'}
            </span>
          )}
          {!hasChildren && !isAggregateLeaf && <span className="step-depth-bullet">·</span>}
          {isAggregateLeaf && (
            <span className="step-depth-bullet step-agg-collapsed" title={`${node.hiddenDescendantCount} events hidden by level filter`}>▸</span>
          )}
          <span className="step-num">{eventId}</span>
          {Number.isFinite(node.level) && <span className="step-op">L{node.level}</span>}
          {node.operation && <span className="step-op">{node.operation}</span>}
          <span className="step-changes">{changedCount > 0 ? `+${changedCount}` : ''}</span>
          {isAggregateLeaf && node.hiddenDescendantCount > 0 && (
            <span className="step-agg-badge" title={`Aggregated from ${node.hiddenDescendantCount} hidden event${node.hiddenDescendantCount !== 1 ? 's' : ''}`}>
              +{node.hiddenDescendantCount}
            </span>
          )}
          {displayElapsedNs > 0 && (
            <span className="step-timing" title={(hasChildren || hasHiddenDescendants) ? `Aggregate: ${formatNs(displayElapsedNs, 2)}` : `Elapsed: ${formatNs(displayElapsedNs, 2)}`}>
              {formatNs(displayElapsedNs)}
            </span>
          )}
          </span>
          <span className="step-text">{summaryText}</span>
        </div>
        {hasChildren && !isNodeCollapsed && (
          <div className="step-depth-children">
            {node.children.map(child => renderStepNode(child, nodeDepth + 1))}
          </div>
        )}
      </div>
    );
  }, [currentStep, selectedSteps, collapsed, handleStepClick, toggleGroup, onStepClick, onMultiStepSelect]);

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

  const handleGroupClick = useCallback((group) => {
    const indices = (group.children || []).map((s) => s.originalIndex);
    if (indices.length === 0) return;
    onStepClick(indices[0]);
    onMultiStepSelect(new Set(indices));
    lastClickedRef.current = indices[0];
  }, [onStepClick, onMultiStepSelect]);

  const formatStepSummary = useCallback((node) => {
    if (node.start == null || node.stop == null) return '';
    const rangeLabel = `range[${node.start}-${node.stop}]`;
    if (node.factorStep != null) return `${rangeLabel} with step ${node.factorStep}`;
    return rangeLabel;
  }, []);

  // Compact transport controls used both in collapsed and expanded states
  const transportControls = goToStep ? (
    <div className="step-panel-transport" onMouseDown={(e) => e.stopPropagation()}>
      <div className="spt-row spt-row-nav">
        <button className="spt-btn" onClick={() => goToStep(0)} title="First event (Home)" disabled={exporting}><SkipBack size={12} /></button>
        <button className="spt-btn" onClick={() => goToStep(currentStep - 1)} title="Previous event (←)" disabled={exporting}><StepBack size={12} /></button>
        {setPlaySpeedPercent && (
          <button className="spt-btn spt-speed" onClick={() => setPlaySpeedPercent(v => Math.max(25, Math.round(v / 1.25)))} title="Slower animation" disabled={exporting}><Minus size={11} /></button>
        )}
        <button className="spt-btn spt-play" onClick={handlePlayPause} title={playing ? 'Pause playback' : 'Play all events'} disabled={exporting || !steps.length}>
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        {setPlaySpeedPercent && (
          <button className="spt-btn spt-speed" onClick={() => setPlaySpeedPercent(v => Math.min(400, Math.round(v * 1.25)))} title="Faster animation" disabled={exporting}><Plus size={11} /></button>
        )}
        <button className="spt-btn" onClick={() => goToStep(currentStep + 1)} title="Next event (→)" disabled={exporting}><StepForward size={12} /></button>
        <button className="spt-btn" onClick={() => goToStep(steps.length - 1)} title="Last event (End)" disabled={exporting}><SkipForward size={12} /></button>
        {setPlaySpeedPercent && playSpeedPercent != null && (
          <span className="spt-speed-label" title={`Playback speed: ${playSpeedPercent}% of normal`}>{playSpeedPercent}%</span>
        )}
      </div>
      <div className="spt-row spt-row-timeline">
        <input
          type="range"
          className="spt-slider"
          min={0}
          max={Math.max(0, steps.length - 1)}
          value={currentStep}
          onChange={(e) => goToStep(parseInt(e.target.value, 10))}
          onPointerDown={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = true; }}
          onPointerUp={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          onPointerCancel={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          disabled={exporting}
          title={`Event ${currentStep} of ${steps.length - 1}`}
        />
        <span className="spt-counter">{currentStep}<span className="spt-total">/{steps.length - 1}</span></span>
      </div>
    </div>
  ) : null;

  return (
    <div className={`step-panel${panelCollapsed ? ' collapsed' : ''}`} style={{ width: panelCollapsed ? '32px' : `${width}px` }}>
      {panelCollapsed && (
        <div
          className="step-panel-floating-title"
          style={{ transform: `translate(${floatDrag.x}px, ${floatDrag.y}px)`, cursor: 'grab' }}
          onMouseDown={handleFloatDragStart}
        >
          <div className="step-panel-float-top-row">
            <button className="step-panel-collapse-inline-btn" onClick={onToggleCollapse} title="Expand events panel" onMouseDown={(e) => e.stopPropagation()}>▼</button>
            <span className="panel-label" title="Events">Events</span>
          </div>
          {transportControls}
        </div>
      )}
      {!panelCollapsed && (
        <>
      <div className="step-panel-header">
        <div className="step-panel-header-title-row">
          <h3>Events ({totalVisible}/{steps.length})</h3>
          <button className="step-panel-collapse-inline-btn" onClick={onToggleCollapse} title="Collapse events panel">
            ◀
          </button>
        </div>
        {transportControls}
        <input
          className="step-search"
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {operations.length > 0 && (
          <select className="step-filter" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
            <option value="">All operations</option>
            {operations.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        )}
        {traceLevels.length > 0 && (
          <select className="step-filter" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="">All log levels</option>
            <optgroup label="Up to (inclusive)">
              {traceLevels.map((level) => <option key={`upto-${level}`} value={`upto:${level}`}>Up to L{level}</option>)}
            </optgroup>
            <optgroup label="Collapse at level">
              {traceLevels.map((level) => <option key={`collapse-${level}`} value={`collapse:${level}`}>Collapse at L{level}</option>)}
            </optgroup>
            <optgroup label="Exactly">
              {traceLevels.map((level) => <option key={`exact-${level}`} value={`exact:${level}`}>Only L{level}</option>)}
            </optgroup>
          </select>
        )}
        <div className="step-filter-toggles">
          <label className="step-filter-toggle" title="Hide events that have no recorded elapsed time">
            <input type="checkbox" checked={hideUntimed} onChange={(e) => setHideUntimed(e.target.checked)} />
            <span>Hide untimed</span>
          </label>
          <label className="step-filter-toggle" title="Hide events that don't change any bits">
            <input type="checkbox" checked={hideUnchanged} onChange={(e) => setHideUnchanged(e.target.checked)} />
            <span>Hide no-ops</span>
          </label>
        </div>
      </div>
      <div className="step-list" ref={listRef} onWheel={onUserScroll}>
        {filteredTree.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const containsActive = group.children.some(s => s.originalIndex === currentStep || selectedSteps.has(s.originalIndex));

          return (
            <div key={group.id} className="step-group">
              <div
                className={`step-group-header${containsActive ? ' active-group' : ''}`}
                onClick={() => handleGroupClick(group)}
              >
                <span
                  className="step-group-toggle"
                  onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                >
                  {isCollapsed ? '▶' : '▼'}
                </span>
                <span className="step-group-prime">{group.label}</span>
                {group.operation && group.operation !== 'Initialization' && (
                  <span className="step-op">{group.operation}</span>
                )}
                <span className="step-group-info">
                  {group.children.length > 1 ? `${group.children.length} events` : '1 event'}
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

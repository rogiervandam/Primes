import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Play, Pause, StepBack, StepForward, SkipBack, SkipForward, Minus, Plus, Eye } from './Icons';
import { formatNs } from './TimingPanel';
import { isWindowAvailable } from './lib/browser.js';
import { usePlaybackContext } from './contexts/PlaybackContext';
import { usePanelLayoutContext } from './contexts/PanelLayoutContext';

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
 * Left-hand events panel: hierarchical step list with search, grouping, and
 * an optional floating transport widget when the panel is collapsed.
 *
 * Phase 5 Refactoring: Accepts organized prop objects instead of 20+ scattered props.
 *
 * @param {object}   props
 * @param {object}   props.eventsState               - Event list state (steps, currentStep, selectedSteps, width, externalOpFilter, revealStepRequest, eventTitleVisible)
 * @param {object}   props.eventsHandlers            - Event handlers (onStepClick, onMultiStepSelect, onWidthChange, onExpandPanelFromWidget, onDockWidgetToTopBar, onDockWidgetToDetailPanel, onJoinWidgets, onUserScroll, onExternalOpFilterConsumed, onShowEventTitle)
 *
 */
export default function EventsPanel({ eventsState = {}, eventsHandlers = {} }) {
  const {
    steps,
    currentStep,
    selectedSteps,
    width,
    externalOpFilter = '',
    revealStepRequest = 0,
    eventTitleVisible = true,
  } = eventsState;

  const {
    onStepClick,
    onMultiStepSelect,
    onWidthChange,
    onExpandPanelFromWidget,
    onDockWidgetToTopBar,
    onDockWidgetToDetailPanel,
    onJoinWidgets,
    onUserScroll,
    onExternalOpFilterConsumed,
    onShowEventTitle,
  } = eventsHandlers;
  const {
    goToStep,
    playing,
    handlePlayPause,
    exporting,
    isScrubbingTopRef,
    playSpeedPercent,
    setPlaySpeedPercent,
  } = usePlaybackContext();
  const {
    isEventsPanelCollapsed: panelCollapsed,
    toggleEventsPanel: onToggleCollapse,
    isAllEventsWidgetHidden,
  } = usePanelLayoutContext();

  const listRef = useRef(null);
  const scrollTopRef = useRef(0);
  const sentinelRef = useRef(null);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState('');
  // Lazy rendering: only show this many groups at first; extend on scroll.
  const [visibleGroupCount, setVisibleGroupCount] = useState(20);
  // Whether the operation column is in wide mode (shows full text, no truncation).
  // Persisted to localStorage so it survives reloads.
  const [opColWide, setOpColWide] = useState(() => {
    try { return localStorage.getItem('sieve-ep-op-wide') === '1'; } catch { return false; }
  });
  const toggleOpColWide = useCallback(() => {
    setOpColWide(prev => {
      const next = !prev;
      try { localStorage.setItem('sieve-ep-op-wide', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);
  // Drag state for the collapsed floating panel
  const [floatDrag, setFloatDrag] = useState({ x: 0, y: 0 });
  const floatDragRef = useRef({ x: 0, y: 0 });
  // Visual hint for the active drop-zone while dragging the widget.
  // 'left' | 'top' | null
  const [floatDropHint, setFloatDropHint] = useState(null);

  // Drag-to-collapse state for the expanded panel title row
  const [headerDragX, setHeaderDragX] = useState(0);
  const [headerDragWillCollapse, setHeaderDragWillCollapse] = useState(false);
  const [isCollapsingOut, setIsCollapsingOut] = useState(false);
  const [isExpandingIn, setIsExpandingIn] = useState(false);
  const prevPanelCollapsedRef = useRef(panelCollapsed);
  useEffect(() => {
    const prev = prevPanelCollapsedRef.current;
    prevPanelCollapsedRef.current = panelCollapsed;
    if (prev && !panelCollapsed) {
      // Panel just expanded - trigger slide-in animation
      setIsExpandingIn(true);
      const t = setTimeout(() => setIsExpandingIn(false), 500);
      return () => clearTimeout(t);
    }
  }, [panelCollapsed]);

  // Detect which drop-zone the pointer is currently over.
  // Returns 'left' (expand events panel), 'top' (dock to top bar),
  // 'detail' (dock into detail panel), 'joinWidget' (merge with EventTitleBanner), or null.
  const detectDropZone = useCallback((clientX, clientY) => {
    if (!isWindowAvailable()) return null;
    const TOP_BAND = 60;   // top toolbar drop band height
    const LEFT_BAND = 80;  // left edge drop band width
    if (clientY <= TOP_BAND) return 'top';
    if (clientX <= LEFT_BAND) return 'left';
    if (onDockWidgetToDetailPanel) {
      const floater = document.querySelector('.events-panel-floating-title');
      const prevPE = floater ? floater.style.pointerEvents : null;
      if (floater) floater.style.pointerEvents = 'none';
      const hit = document.elementFromPoint(clientX, clientY);
      if (floater) floater.style.pointerEvents = prevPE || '';
      if (hit && hit.closest && hit.closest('.detail-panel')) return 'detail';
    }
    // Check proximity to the floating single-event banner (join affordance).
    if (onJoinWidgets) {
      const banner = document.querySelector('.step-focus-banner');
      if (banner) {
        const r = banner.getBoundingClientRect();
        const HIT_PAD = 40;
        if (clientX >= r.left - HIT_PAD && clientX <= r.right + HIT_PAD &&
            clientY >= r.top - HIT_PAD && clientY <= r.bottom + HIT_PAD) {
          return 'joinWidget';
        }
      }
    }
    return null;
  }, [onDockWidgetToDetailPanel, onJoinWidgets]);

  const handleFloatDragStart = useCallback((e) => {
    if (e.target.closest('input') || e.target.closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startDrag = { ...floatDragRef.current };
    let dragged = false;
    let lastZone = null;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) < 4) return;
      dragged = true;
      const next = { x: startDrag.x + dx, y: startDrag.y + dy };
      floatDragRef.current = next;
      setFloatDrag(next);
      const zone = detectDropZone(ev.clientX, ev.clientY);
      if (zone !== lastZone) {
        lastZone = zone;
        setFloatDropHint(zone);
        // Visual merge hint on the single-event banner when dragging near it.
        const banner = document.querySelector('.step-focus-banner');
        if (banner) banner.classList.toggle('merge-target', zone === 'joinWidget');
      }
    };
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setFloatDropHint(null);
      // Remove merge-target hint from the banner.
      const banner = document.querySelector('.step-focus-banner');
      if (banner) banner.classList.remove('merge-target');
      if (!dragged) return;
      const zone = detectDropZone(ev.clientX, ev.clientY);
      if (zone === 'joinWidget' && onJoinWidgets) {
        floatDragRef.current = { x: 0, y: 0 };
        setFloatDrag({ x: 0, y: 0 });
        // Pass the EventTitleBanner's screen rect so the joined widget can
        // anchor its bottom-left corner to the same position.
        const bannerEl = document.querySelector('.step-focus-banner');
        const bannerRect = bannerEl ? bannerEl.getBoundingClientRect() : null;
        onJoinWidgets(bannerRect);
      } else if (zone === 'left' && onExpandPanelFromWidget) {
        // Snap drag offset back so the widget is fresh next time it appears.
        floatDragRef.current = { x: 0, y: 0 };
        setFloatDrag({ x: 0, y: 0 });
        onExpandPanelFromWidget();
      } else if (zone === 'top' && onDockWidgetToTopBar) {
        floatDragRef.current = { x: 0, y: 0 };
        setFloatDrag({ x: 0, y: 0 });
        onDockWidgetToTopBar();
      } else if (zone === 'detail' && onDockWidgetToDetailPanel) {
        floatDragRef.current = { x: 0, y: 0 };
        setFloatDrag({ x: 0, y: 0 });
        onDockWidgetToDetailPanel();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  }, [detectDropZone, onDockWidgetToDetailPanel, onExpandPanelFromWidget, onDockWidgetToTopBar, onJoinWidgets]);

  // Drag-to-collapse: dragging the expanded title row rightward collapses the panel.
  const COLLAPSE_DRAG_THRESHOLD = 80;
  const handleHeaderTitleDragStart = useCallback((e) => {
    if (e.target.closest('input') || e.target.closest('button') || e.target.closest('select')) return;
    const startX = e.clientX;

    const onMove = (ev) => {
      const raw = ev.clientX - startX;
      if (raw <= 0) {
        setHeaderDragX(0);
        setHeaderDragWillCollapse(false);
        return;
      }
      // Rubber-band: full travel up to threshold, then sqrt-damped beyond
      const visual = raw <= COLLAPSE_DRAG_THRESHOLD
        ? raw * 0.65
        : COLLAPSE_DRAG_THRESHOLD * 0.65 + Math.sqrt(raw - COLLAPSE_DRAG_THRESHOLD) * 3;
      setHeaderDragX(visual);
      setHeaderDragWillCollapse(raw >= COLLAPSE_DRAG_THRESHOLD);
    };

    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const raw = ev.clientX - startX;
      setHeaderDragWillCollapse(false);
      setHeaderDragX(0); // spring back via CSS transition
      if (raw >= COLLAPSE_DRAG_THRESHOLD) {
        // Brief pause for the spring-back, then animate the panel out
        setTimeout(() => {
          setIsCollapsingOut(true);
          setTimeout(() => {
            setIsCollapsingOut(false);
            onToggleCollapse();
          }, 280);
        }, 80);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  }, [onToggleCollapse]);

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

  // Navigate detail levels with < / > arrows.
  // < and > cycle within the current group (upto: / collapse: / exact:).
  // From "all" (empty), < steps to the highest upto level.
  // From the max upto level, > goes to "all".
  // collapse: and exact: clamp at their extremes.
  const handleLevelDecrease = useCallback(() => {
    if (traceLevels.length === 0) return;
    if (!filterLevel) {
      // At "all" → step down to the highest upto level
      setFilterLevel(`upto:${traceLevels[traceLevels.length - 1]}`);
      return;
    }
    const [prefix, numStr] = filterLevel.split(':');
    const n = Number(numStr);
    const idx = traceLevels.indexOf(n);
    if (idx <= 0) return; // already at minimum of this group
    setFilterLevel(`${prefix}:${traceLevels[idx - 1]}`);
  }, [filterLevel, traceLevels]);

  const handleLevelIncrease = useCallback(() => {
    if (traceLevels.length === 0 || !filterLevel) return; // already at "all"
    const [prefix, numStr] = filterLevel.split(':');
    const n = Number(numStr);
    const idx = traceLevels.indexOf(n);
    if (idx === -1) return;
    if (prefix === 'upto' && idx >= traceLevels.length - 1) {
      setFilterLevel(''); // upto at max → go to "all"
      return;
    }
    if (idx >= traceLevels.length - 1) return; // collapse/exact at max → stay
    setFilterLevel(`${prefix}:${traceLevels[idx + 1]}`);
  }, [filterLevel, traceLevels]);

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

    return groups;
  }, [steps]);

  // Parse filterLevel encoding ('' | 'exact:N' | 'upto:N' | 'collapse:N')
  const levelFilter = useMemo(() => {
    if (!filterLevel) return null;
    const [mode, numStr] = String(filterLevel).split(':');
    const n = Number(numStr);
    if (!Number.isFinite(n)) return null;
    return { mode, value: n };
  }, [filterLevel]);

  // Filter — operates on flat children; depth trees are built lazily in visibleRenderedGroups.
  const filteredTree = useMemo(() => {
    if (!search && !filterOp && !levelFilter && !hideUntimed && !hideUnchanged) return tree;
    const lower = search.toLowerCase();

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
      // Keep original (unfiltered) children so visibleRenderedGroups can compute full aggregates.
      return { ...g, originalChildren: g.children, children: fc };
    }).filter(g => g.children.length > 0);
  }, [tree, search, filterOp, levelFilter, hideUntimed, hideUnchanged]);

  // Build depth trees lazily — only for the groups currently visible in the list.
  // When filters are active each group's originalChildren hold the full unfiltered
  // children so aggregate totals for level-cut nodes can still be patched correctly.
  const visibleRenderedGroups = useMemo(() => {
    return filteredTree.slice(0, visibleGroupCount).map(g => {
      if (!g.originalChildren) {
        // No active filter: g.children is already the full set, plain depth tree.
        return { ...g, depthTree: buildDepthTree(g.children) };
      }
      // Filter active: build full depth tree first to get correct aggregate values,
      // then build the filtered depth tree and patch each node.
      const fullDepthTree = buildDepthTree(g.originalChildren);
      const localNodeMap = new Map();
      const walkFull = (node) => {
        if (node.originalIndex != null) localNodeMap.set(node.originalIndex, node);
        for (const child of node.children || []) walkFull(child);
      };
      for (const n of fullDepthTree) walkFull(n);

      const depthTree = buildDepthTree(g.children);
      const patch = (node) => {
        const full = localNodeMap.get(node.originalIndex);
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
        for (const child of node.children || []) patch(child);
      };
      for (const n of depthTree) patch(n);
      return { ...g, depthTree };
    });
  }, [filteredTree, visibleGroupCount]);

  useEffect(() => {
    if (initialCollapseDoneRef.current || tree.length === 0) return;
    setCollapsed(new Set(tree.map((g) => g.id)));
    initialCollapseDoneRef.current = true;
  }, [tree]);

  // Reset visible count when the filtered list changes (e.g. search query changes).
  useEffect(() => {
    setVisibleGroupCount(20);
  }, [search, filterOp, levelFilter, hideUntimed, hideUnchanged]);

  // Lazy loading: extend visibleGroupCount when the sentinel scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleGroupCount((n) => Math.min(n + 20, filteredTree.length));
        }
      },
      { root: listRef.current, rootMargin: '0px 0px 200px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredTree.length]);

  // Auto-extend when the current step falls outside the visible window.
  useEffect(() => {
    if (currentStep == null) return;
    const groupIndex = filteredTree.findIndex((g) =>
      g.children.some((s) => s.originalIndex === currentStep)
    );
    if (groupIndex >= visibleGroupCount) {
      setVisibleGroupCount((n) => Math.max(n, groupIndex + 5));
    }
  }, [currentStep, filteredTree, visibleGroupCount]);

  // When filterLevel is 'collapse:N', auto-collapse all nodes at level >= N and
  // auto-expand any nodes at level < N that were previously collapsed by a lower
  // collapse filter (e.g. switching from collapse:5 → collapse:9 should re-open
  // levels 5–8 that were collapsed before).
  useEffect(() => {
    if (!levelFilter || levelFilter.mode !== 'collapse') return;
    const collapseLevel = levelFilter.value;
    const toCollapse = new Set();
    const toExpand = new Set();
    const collectKeys = (node) => {
      if (Number.isFinite(node.level) && node.children?.length > 0) {
        if (node.level >= collapseLevel) {
          toCollapse.add(`node-${node.originalIndex}`);
        } else {
          // This node is below the threshold — ensure it is expanded.
          toExpand.add(`node-${node.originalIndex}`);
        }
      }
      for (const child of node.children || []) collectKeys(child);
    };
    for (const g of tree) for (const n of buildDepthTree(g.children)) collectKeys(n);
    setCollapsed(prev => {
      const next = new Set(prev);
      for (const k of toExpand) next.delete(k);
      for (const k of toCollapse) next.add(k);
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
    const active = el.querySelector('.event-item.active');
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
      for (const root of buildDepthTree(g.children)) {
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
      const active = el.querySelector('.event-item.active');
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
      <div key={node.originalIndex} className={`event-depth-node depth-${Math.min(6, nodeDepth)}`}>
        <div
          className={`event-item event-child${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}${hasChildren ? ' has-children' : ''}${isAggregateLeaf ? ' has-hidden-descendants' : ''}`}
          style={{ '--node-depth': nodeDepth }}
          onClick={(e) => {
            if (hasChildren && e.target.classList.contains('event-depth-toggle')) return;
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
          <span className="event-left" style={{ paddingLeft: '6px' }}>
          {hasChildren && (
            <span
              className="event-depth-toggle"
              onClick={(e) => { e.stopPropagation(); toggleGroup(collapseKey); }}
            >
              {isNodeCollapsed ? '▶' : '▼'}
            </span>
          )}
          {!hasChildren && !isAggregateLeaf && <span className="event-depth-bullet">·</span>}
          {isAggregateLeaf && (
            <span className="event-depth-bullet event-agg-collapsed" title={`${node.hiddenDescendantCount} events hidden by level filter`}>▸</span>
          )}
          <span className="event-num">{eventId}</span>
          {Number.isFinite(node.level) && <span className="event-op">L{node.level}</span>}
          {node.operation && (
            <span className="event-op-wrap">
              <span className="event-op" title={node.operation}>{node.operation}</span>
            </span>
          )}
          <span className="event-changes">{changedCount > 0 ? `+${changedCount}` : ''}</span>
          {isAggregateLeaf && node.hiddenDescendantCount > 0 && (
            <span className="event-agg-badge" title={`Aggregated from ${node.hiddenDescendantCount} hidden event${node.hiddenDescendantCount !== 1 ? 's' : ''}`}>
              +{node.hiddenDescendantCount}
            </span>
          )}
          {displayElapsedNs > 0 && (
            <span className="step-timing" title={(hasChildren || hasHiddenDescendants) ? `Aggregate: ${formatNs(displayElapsedNs, 2)}` : `Elapsed: ${formatNs(displayElapsedNs, 2)}`}>
              {formatNs(displayElapsedNs)}
            </span>
          )}
          </span>
          <span className="event-text">
            {summaryText}
            {node.annotation && (
              <span className="event-annotation" title={node.annotation}>{node.annotation}</span>
            )}
          </span>
        </div>
        {hasChildren && !isNodeCollapsed && (
          <div className="event-depth-children">
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
    <div className="events-panel-transport" onMouseDown={(e) => e.stopPropagation()}>
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
          <button className="spt-btn spt-speed" onClick={() => setPlaySpeedPercent(v => Math.min(1600, Math.round(v * 1.25)))} title="Faster animation" disabled={exporting}><Plus size={11} /></button>
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
      <div className={`events-panel${panelCollapsed ? ' collapsed' : ''}${isCollapsingOut ? ' collapsing-out' : ''}${isExpandingIn ? ' expanding-in' : ''}${floatDropHint === 'left' ? ' drop-hint-left' : ''}${floatDropHint === 'detail' ? ' drop-hint-detail' : ''}${opColWide ? ' op-wide' : ''}`} style={{ width: panelCollapsed ? '32px' : `${width}px` }}>
      {panelCollapsed && !isAllEventsWidgetHidden && (
        <div
          className={`events-panel-floating-title${floatDropHint ? ` dropping dropping-${floatDropHint}` : ''}`}
          style={{ transform: `translate(${floatDrag.x}px, ${floatDrag.y}px)`, cursor: 'grab' }}
          onMouseDown={handleFloatDragStart}
        >
          <div className="events-panel-float-top-row">
            <button className="events-panel-collapse-inline-btn" onClick={onToggleCollapse} title="Expand events panel" onMouseDown={(e) => e.stopPropagation()}>▼</button>
            <span className="panel-label" title="Events">Events</span>
            {!eventTitleVisible && onShowEventTitle && (
              <button
                className="events-panel-show-event-title-btn"
                onClick={(e) => { e.stopPropagation(); onShowEventTitle(); }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Show single-event widget"
              ><Eye size={11} /></button>
            )}
          </div>
          {transportControls}
        </div>
      )}
      {!panelCollapsed && (
        <>
      <div className="events-panel-header">
        <div
          className={`events-panel-header-title-row${headerDragWillCollapse ? ' drag-will-collapse' : ''}${headerDragX > 0 ? ' is-header-dragging' : ''}`}
          style={headerDragX > 0 ? { transform: `translateX(${headerDragX}px)` } : undefined}
          onMouseDown={handleHeaderTitleDragStart}
          title="Drag right to collapse"
        >
          <h3>Events ({totalVisible}/{steps.length})</h3>
          {!eventTitleVisible && onShowEventTitle && (
            <button
              className="events-panel-show-event-title-btn"
              onClick={(e) => { e.stopPropagation(); onShowEventTitle(); }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Show single-event widget"
            ><Eye size={12} /></button>
          )}
          <button className="events-panel-collapse-inline-btn" onClick={onToggleCollapse} title="Collapse events panel">
            ◀
          </button>
        </div>
        {transportControls}
        <input
          className="event-search"
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {operations.length > 0 && (
          <div className="event-op-filter-row">
            <select className="event-filter event-filter-op" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
              <option value="">All operations</option>
              {operations.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <button
              className={`event-op-wide-btn${opColWide ? ' active' : ''}`}
              onClick={toggleOpColWide}
              title={opColWide ? 'Narrow operation column' : 'Wide operation column'}
            >{opColWide ? '←→' : '→←'}</button>
          </div>
        )}
        {traceLevels.length > 0 && (
          <div className="event-level-filter-row">
            <button
              className="event-level-btn"
              onClick={handleLevelDecrease}
              title="Less detail"
              disabled={!!filterLevel && traceLevels.indexOf(Number(filterLevel.split(':')[1])) === 0}
            >&lt;</button>
            <select className="event-filter event-level-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="">All log levels</option>
              <optgroup label="Up to (inclusive)">
                {traceLevels.map((level) => <option key={`upto-${level}`} value={`upto:${level}`}>Up to level {level} (L{level})</option>)}
              </optgroup>
              <optgroup label="Collapse at level">
                {traceLevels.map((level) => <option key={`collapse-${level}`} value={`collapse:${level}`}>Collapse at level {level} (L{level})</option>)}
              </optgroup>
              <optgroup label="Exactly">
                {traceLevels.map((level) => <option key={`exact-${level}`} value={`exact:${level}`}>Only level {level} (L{level})</option>)}
              </optgroup>
            </select>
            <button
              className="event-level-btn"
              onClick={handleLevelIncrease}
              title="More detail"
              disabled={!filterLevel || (filterLevel.split(':')[0] !== 'upto' && traceLevels.indexOf(Number(filterLevel.split(':')[1])) >= traceLevels.length - 1)}
            >&gt;</button>
          </div>
        )}
        <div className="event-filter-toggles">
          <label className="event-filter-toggle" title="Hide events that have no recorded elapsed time">
            <input type="checkbox" checked={hideUntimed} onChange={(e) => setHideUntimed(e.target.checked)} />
            <span>Hide untimed</span>
          </label>
          <label className="event-filter-toggle" title="Hide events that don't change any bits">
            <input type="checkbox" checked={hideUnchanged} onChange={(e) => setHideUnchanged(e.target.checked)} />
            <span>Hide no-ops</span>
          </label>
        </div>
      </div>
      <div className="event-list" ref={listRef} onWheel={onUserScroll}>
        {visibleRenderedGroups.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const containsActive = group.children.some(s => s.originalIndex === currentStep || selectedSteps.has(s.originalIndex));

          return (
            <div key={group.id} className="event-group">
              <div
                className={`event-group-header${containsActive ? ' active-group' : ''}`}
                onClick={() => handleGroupClick(group)}
              >
                <span
                  className="event-group-toggle"
                  onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                >
                  {isCollapsed ? '▶' : '▼'}
                </span>
                <span className="event-group-prime">{group.label}</span>
                {isCollapsed && group.children.length > 1 && (
                  <span className="event-group-count-badge" title={`${group.children.length} events hidden`}>×{group.children.length}</span>
                )}
                {group.operation && group.operation !== 'Initialization' && (
                  <span className="event-op">{group.operation}</span>
                )}
                <span className="event-group-info">
                  {!isCollapsed && (group.children.length > 1 ? `${group.children.length} events` : '1 event')}
                  {group.totalChanged > 0 ? ` · +${group.totalChanged}` : ''}
                </span>
              </div>

              {!isCollapsed && (
                <div className="event-group-children">
                  {group.depthTree.map(node => renderStepNode(node, 0))}
                </div>
              )}
            </div>
          );
        })}
        {/* Sentinel triggers lazy-loading of the next batch */}
        <div ref={sentinelRef} className="event-list-sentinel" />
      </div>

      <div className="resize-handle" onMouseDown={handleMouseDown} />
        </>
      )}
    </div>
  );
}

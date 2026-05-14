import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useCallback, startTransition } from 'react';
import { Play, Pause, StepBack, StepForward, SkipBack, SkipForward, Minus, Plus, Eye } from '../Icons';
import { bumpRender, recordStepCallback, setEventNodeCount } from '../lib/debugCounters';
import { formatNs } from './TimingPanel';
import { isWindowAvailable } from '../lib/browser.js';
import { usePlaybackContext } from '../contexts/PlaybackContext';
import { useActiveStepContext } from '../contexts/ActiveStepContext';
import { usePanelLayoutContext } from '../contexts/PanelLayoutContext';

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
    const ownTargeted = Number(node.numTargeted || 0);
    let aggregateChanged = own;
    let aggregateTargeted = ownTargeted;
    let aggregateElapsedNs = Number(node.elapsedNs || 0);
    const aggregateStepIndices = [node.originalIndex];

    for (const child of (node.children || [])) {
      annotate(child);
      aggregateChanged += Number(child.aggregateChanged || 0);
      aggregateTargeted += Number(child.aggregateTargeted || 0);
      aggregateElapsedNs += Number(child.aggregateElapsedNs || 0);
      if (Array.isArray(child.aggregateStepIndices)) {
        aggregateStepIndices.push(...child.aggregateStepIndices);
      }
    }

    node.aggregateChanged = aggregateChanged;
    node.aggregateTargeted = aggregateTargeted;
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
export default React.memo(function EventsPanel({ eventsState = {}, eventsHandlers = {} }) {
  // Perf counter — should stay at 0 during playback if React.memo is working.
  useEffect(() => { bumpRender('EventsPanel'); });

  const {
    steps,
    // currentStep intentionally absent — received via ActiveStepContext subscription
    selectedSteps,
    width,
    externalOpFilter = '',
    revealStepRequest = 0,
    eventTitleVisible = true,
  } = eventsState;

  // item 236/#3+4 perf: subscribe to step changes imperatively so no React
  // reconciliation occurs during playback. The subscription callback updates
  // DOM class names and uncontrolled input values directly.
  const { subscribe, stepRef } = useActiveStepContext();

  // localStep: a React state that mirrors currentStep but is ONLY updated when
  // playback is not running. Used for ancestor highlighting and group-header
  // "contains active" indicators — both of which are unnecessary during fast
  // playback and can safely lag one render behind.
  const [localStep, setLocalStep] = useState(() => stepRef?.current ?? 0);

  // Tracks the step currently reflected in the DOM (for imperative .active swap).
  const prevActiveRef = useRef(stepRef?.current ?? -1);

  // O(1) step-index → HTMLElement map, rebuilt after each render (never during
  // playback since EventsPanel doesn't re-render while playing).
  const stepElemMapRef = useRef(new Map());
  // item 304: ref to filteredTree so the scroll effect can find which group
  // contains the localStep even if the effect is defined before filteredTree.
  const filteredTreeRef = useRef(null);

  // Ref for the uncontrolled transport slider and step counter text span.
  const sliderRef = useRef(null);
  const stepNumRef = useRef(null);

  // Always-current view of the `playing` flag — used inside the subscription
  // callback without closing over a stale render-time value.
  const isPlayingRef = useRef(false);

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
    onEnableRepeat,   // item 215: click event → enable repeat
    onInspectAnnotationUnit,
  } = eventsHandlers;

  const parseInspectableUnitFromAnnotation = useCallback((annotation) => {
    const text = String(annotation || '');
    const patterns = [
      { type: 'cacheline', label: 'cache line', regex: /\bcache(?:\s*line|line)\s*#?\s*(\d+)\b/i },
      { type: 'byte', label: 'byte', regex: /\bbyte\s*#?\s*(\d+)\b/i },
      { type: 'group', label: 'group', regex: /\bgroup\s*#?\s*(\d+)\b/i },
      { type: 'uint32', label: 'uint32', regex: /\buint32\s*#?\s*(\d+)\b/i },
      { type: 'uint64', label: 'uint64', regex: /\buint64\s*#?\s*(\d+)\b/i },
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (!match) continue;
      return { type: pattern.type, index: Number(match[1]), title: `Inspect ${pattern.label} ${match[1]}` };
    }
    return null;
  }, []);
  const {
    goToStep,
    playing,
    handlePlayPause,
    exporting,
    isScrubbingTopRef,
    playSpeedPercent,
    setPlaySpeedPercent,
  } = usePlaybackContext();

  // Keep isPlayingRef always current so the subscription callback (which is
  // created once and never re-created) can read the live playing state.
  useEffect(() => {
    isPlayingRef.current = playing;
    if (!playing) {
      // Playback stopped: sync localStep so ancestor highlighting and group
      // headers update to reflect the final step position.
      setLocalStep(stepRef.current ?? 0);
    }
  }, [playing, stepRef]);

  // Imperative step subscription — runs once on mount, never re-created.
  // Handles: .active class swap (O(1) Map lookup), slider + counter update,
  // localStep sync (when not playing).
  //
  // During fast playback the subscription can fire many times per animation
  // frame. We coalesce the DOM mutations to one apply per RAF so the browser
  // only invalidates / repaints the active row once per frame instead of once
  // per step. Without this, high-speed playback (1000+ steps/sec) was
  // thrashing classList + slider value writes on every step, dropping FPS
  // when the events panel is open and the DOM is large.
  useEffect(() => {
    if (!subscribe) return;
    let pendingStep = null;
    let rafId = 0;
    const apply = () => {
      rafId = 0;
      if (pendingStep == null) return;
      const step = pendingStep;
      pendingStep = null;
      const t0 = performance.now();
      const map = stepElemMapRef.current;
      if (prevActiveRef.current !== step) {
        map.get(prevActiveRef.current)?.classList.remove('active');
        map.get(step)?.classList.add('active');
        prevActiveRef.current = step;
      }
      if (sliderRef.current) sliderRef.current.value = step;
      if (stepNumRef.current) stepNumRef.current.textContent = step;
      if (!isPlayingRef.current) {
        setLocalStep(step);
      }
      recordStepCallback(performance.now() - t0);
    };
    const unsubscribe = subscribe((step) => {
      pendingStep = step;
      // During playback we coalesce per-RAF; when paused (scrubbing,
      // keyboard nav, click), apply synchronously so the UI feels immediate.
      if (isPlayingRef.current) {
        if (!rafId) rafId = requestAnimationFrame(apply);
      } else {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        apply();
      }
    });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      unsubscribe?.();
    };
  }, [subscribe]); // subscribe is stable — this effect runs exactly once

  // Scroll active row into view whenever localStep changes (only happens when
  // not playing, so no jank during playback).
  // item 304: (1) center the active row; (2) cap animation to ~1.5s by using
  //   instant for large distances; (3) when the row isn't in the DOM (group
  //   collapsed or filtered out), scroll to the group header instead.
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const activeEl = stepElemMapRef.current.get(localStep);
    if (activeEl) {
      // Measure current scroll distance to decide behavior
      const listRect = listEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const dist = Math.abs(activeRect.top + activeRect.height / 2 - (listRect.top + listRect.height / 2));
      // At ~400–600 px/s native smooth scroll speed, >800px ≈ >1.5s, so use instant
      const behavior = dist > 800 ? 'instant' : 'smooth';
      activeEl.scrollIntoView({ block: 'center', behavior });
    } else {
      // Step not visible in DOM — find the group that contains it and highlight
      const tree = filteredTreeRef.current;
      if (!tree) return;
      let groupId = null;
      for (const g of tree) {
        if (g.children.some(c => c.originalIndex === localStep)) {
          groupId = g.id;
          break;
        }
      }
      if (groupId != null) {
        const groupHeader = listEl.querySelector(`[data-group-id="${groupId}"]`);
        if (groupHeader) {
          groupHeader.scrollIntoView({ block: 'center', behavior: 'smooth' });
          groupHeader.classList.add('has-hidden-active');
          setTimeout(() => groupHeader.classList.remove('has-hidden-active'), 1500);
        }
      }
    }
  }, [localStep]);

  // After any EventsPanel re-render (filter change, group toggle, etc.) rebuild
  // the step→element Map and reapply the active class imperatively.
  // This runs only on renders — never during playback (EventsPanel is memoized).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const map = new Map();
    list.querySelectorAll('[data-step-idx]').forEach((el) => {
      el.classList.remove('active');
      map.set(Number(el.dataset.stepIdx), el);
    });
    stepElemMapRef.current = map;
    setEventNodeCount(map.size);
    map.get(prevActiveRef.current)?.classList.add('active');
  });
  const {
    isEventsPanelCollapsed: panelCollapsed,
    toggleEventsPanel: onToggleCollapse,
    collapseEventsHideWidget,
    isAllEventsWidgetHidden,
    showAllEventsWidget,
    eventsCollapseDir,
    setEventsCollapseDir,
    eventsOpenFromBottom,        // item 349
    setEventsOpenFromBottom,     // item 349
  } = usePanelLayoutContext();

  const listRef = useRef(null);
  const panelRef = useRef(null);   // item 209: ref for DOM-level transition reset
  const scrollTopRef = useRef(0);
  const sentinelRef = useRef(null);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState('');
  // Lazy rendering: only show this many groups at first; extend on scroll.
  const [visibleGroupCount, setVisibleGroupCount] = useState(20);
  // Performance: only render the expensive event list when the panel is visible.
  // When collapsing, keep the list mounted during the slide-out animation (240ms),
  // then unmount it to stop per-step React re-renders while the panel is hidden.
  // When expanding, mount immediately so content is visible during slide-in.
  const [listVisible, setListVisible] = useState(!panelCollapsed);
  // item 349: ref so the collapse useEffect can read eventsOpenFromBottom without stale closure
  const eventsOpenFromBottomRef = useRef(eventsOpenFromBottom);
  eventsOpenFromBottomRef.current = eventsOpenFromBottom;
  useEffect(() => {
    if (!panelCollapsed) {
      // item 209: always slide in from left, even when previous close was a collapse-right.
      // When closing via timeline (collapse-right), the panel ends at scaleX(0).
      // Reset transform to translateX(-100%) with no transition, then remove
      // the override to trigger the standard left-slide-in animation.
      const panel = panelRef.current;
      if (panel && eventsCollapseDir === 'right') {
        panel.style.transition = 'none';
        panel.style.transform = 'translateX(-100%)';
        void panel.offsetHeight;  // force synchronous layout flush
        panel.style.transition = '';
        panel.style.transform = '';
      } else if (panel && eventsOpenFromBottomRef.current) {
        // item 349: when opening from-bottom, reset to translateY(100%) so the CSS
        // transition animates upward from the bottom edge (not diagonally from the left).
        panel.style.transition = 'none';
        panel.style.transform = 'translateY(100%)';
        void panel.offsetHeight;  // force synchronous layout flush
        panel.style.transition = '';
        panel.style.transform = '';
      }
      // item 297: defer mounting the event list by one rAF so the expensive
      // React render (1000+ event nodes) doesn't block the opening animation.
      // The panel slides in with empty content for ~16ms, then the list appears.
      startTransition(() => { setListVisible(true); });
      setEventsCollapseDir('left');  // item 193: reset direction when opening
    } else {
      // item 349: reset from-bottom mode after the close animation completes
      const t = setTimeout(() => {
        setListVisible(false);
        setEventsOpenFromBottom?.(false);
      }, 240);
      return () => clearTimeout(t);
    }
  }, [panelCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // filterLevel encoding: '' (all) | 'exact:N' | 'upto:N' | 'collapse:N'
  // item 427: save default to localStorage synchronously so the [steps] effect
  // (which also reads localStorage) sees the preference even on the very first render.
  const [filterLevel, setFilterLevel] = useState(() => {
    try {
      const saved = localStorage.getItem('sieve-filter-level');
      if (saved) return saved;
      localStorage.setItem('sieve-filter-level', 'collapse:7');
      return 'collapse:7';
    } catch { return 'collapse:7'; }
  });

  const [hideUntimed, setHideUntimed] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(false);

  // item 222: groupBy mode — 'prime' (default) | 'step' (flat) | 'range' (by start)
  const [groupBy, setGroupBy] = useState(() => {
    try { return localStorage.getItem('sieve-ep-groupby') || 'prime'; } catch { return 'prime'; }
  });
  useEffect(() => {
    try { localStorage.setItem('sieve-ep-groupby', groupBy); } catch {}
  }, [groupBy]);

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
      onEnableRepeat?.(stepIdx);  // item 431: pass stepIdx so parent can toggle repeat on/off
    }
    lastClickedRef.current = stepIdx;
  }, [onStepClick, onMultiStepSelect, onEnableRepeat]);

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
    // item 222: groupBy mode changes how steps are aggregated into groups
    if (groupBy === 'step') {
      // item 230/#222: group by factorStep value (the sieve stride, e.g. "strip off with step 14")
      const groups = [];
      const stepMap = new Map();
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const key = s.factorStep != null ? s.factorStep : '__unknown__';
        if (!stepMap.has(key)) {
          const g = {
            id: groups.length,
            prime: s.prime,
            label: s.factorStep != null ? `Factor step ${s.factorStep}` : 'No step',
            operation: s.operation || '',
            children: [],
            totalChanged: 0,
            totalTargeted: 0,
          };
          stepMap.set(key, g);
          groups.push(g);
        }
        const g = stepMap.get(key);
        g.children.push({ ...s, originalIndex: i });
        g.totalChanged += s.numChanged;
        g.totalTargeted += s.numTargeted ?? 0;
      }
      return groups;
    }

    if (groupBy === 'range') {
      // Group by step.start (range start value)
      const groups = [];
      const rangeMap = new Map();
      let otherGroup = null;
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (s.start != null) {
          const key = s.start;
          if (!rangeMap.has(key)) {
            const g = {
              id: groups.length,
              prime: s.prime,
              label: `Range [${s.start}–${s.stop ?? '?'}]`,
              operation: s.operation || '',
              children: [],
              totalChanged: 0,
              totalTargeted: 0,
            };
            rangeMap.set(key, g);
            groups.push(g);
          }
          const g = rangeMap.get(key);
          g.children.push({ ...s, originalIndex: i });
          g.totalChanged += s.numChanged;
          g.totalTargeted += s.numTargeted ?? 0;
        } else {
          if (!otherGroup) {
            otherGroup = { id: -1, prime: null, label: 'Other', operation: '', children: [], totalChanged: 0, totalTargeted: 0 };
            groups.unshift(otherGroup);
          }
          otherGroup.children.push({ ...s, originalIndex: i });
          otherGroup.totalChanged += s.numChanged;
          otherGroup.totalTargeted += s.numTargeted ?? 0;
        }
      }
      // Re-assign IDs after potential unshift
      groups.forEach((g, i) => { g.id = i; });
      return groups;
    }

    // Default: group by prime (original logic)
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
          totalTargeted: s.numTargeted ?? 0,
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
          totalTargeted: 0,
        };
        groups.push(current);
      }

      current.children.push({ ...s, originalIndex: i });
      current.totalChanged += s.numChanged;
      current.totalTargeted += s.numTargeted ?? 0;
    }

    return groups;
  }, [steps, groupBy]);

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
  // item 304: keep ref in sync so the scroll effect can access filteredTree
  filteredTreeRef.current = filteredTree;

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
            node.aggregateTargeted = full.aggregateTargeted;
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
    if (!listVisible) return;
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
  }, [filteredTree.length, listVisible]);

  // Auto-extend when the current step falls outside the visible window.
  // item 236/#1 perf: localStep only updates when not playing, so this tree
  // search never runs during fast playback.
  useEffect(() => {
    if (localStep == null) return;
    const groupIndex = filteredTree.findIndex((g) =>
      g.children.some((s) => s.originalIndex === localStep)
    );
    if (groupIndex >= visibleGroupCount) {
      setVisibleGroupCount((n) => Math.max(n, groupIndex + 5));
    }
  }, [localStep, filteredTree, visibleGroupCount]);

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

  // Scroll active step is now handled by the localStep useEffect above.

  // Reveal request: when bumped, clear filters that hide the current step,
  // expand its enclosing group + every ancestor node, then scroll it into
  // view. Triggered from the event-title widget's locate button.
  useEffect(() => {
    if (!revealStepRequest) return;
    const currentStep = stepRef.current;  // live value from subscription ref
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
      const active = stepElemMapRef.current.get(currentStep);
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

  // Compute ancestor step indices for the currently active step.
  // These are highlighted with a subtle background tint so the user can see
  // where in the hierarchy the current event lives.
  // item 236/#4 perf: uses localStep which only updates when not playing,
  // so this O(n) tree walk never runs during fast playback.
  const ancestorStepIndices = useMemo(() => {
    const ancestors = new Set();
    if (localStep == null || localStep < 0) return ancestors;
    for (const g of filteredTree) {
      const findAncestors = (node) => {
        if (node.originalIndex === localStep) return true;
        for (const child of node.children || []) {
          if (findAncestors(child)) {
            ancestors.add(node.originalIndex);
            return true;
          }
        }
        return false;
      };
      for (const root of buildDepthTree(g.children)) {
        findAncestors(root);
      }
    }
    return ancestors;
  }, [localStep, filteredTree]);

  // Build a map from originalIndex → annotation for all steps, used to surface
  // annotations from aggregated (hidden) children on collapsed/aggregate nodes.
  const stepAnnotationMap = useMemo(() => {
    const map = new Map();
    for (const s of (steps || [])) {
      if (s.annotation) map.set(s.originalIndex, s.annotation);
    }
    return map;
  }, [steps]);

  /**
   * Recursive renderer for a depth-tree node.
   * `nodeDepth` = visual indent level (0 = group child, 1..5 = nested).
   */
  const renderStepNode = useCallback((node, nodeDepth = 0) => {
    // item 236/#3 perf: isActive is intentionally omitted — the .active class is
    // applied imperatively via data-step-idx + DOM subscription so renderStepNode
    // is not re-called every step change during playback.
    const isSelected = selectedSteps.has(node.originalIndex);
    const isAncestor = ancestorStepIndices.has(node.originalIndex);
    const hasChildren = node.children && node.children.length > 0;
    const hasHiddenDescendants = !!node.hasHiddenDescendants;
    // A node is an "aggregate leaf" when its visible children were fully filtered
    // out but it has hidden descendants — show it like a collapsed parent.
    const isAggregateLeaf = hasHiddenDescendants && !hasChildren;
    const changedCount = (hasChildren || hasHiddenDescendants)
      ? Number(node.aggregateChanged || node.numChanged || 0)
      : Number(node.numChanged || 0);
    const targetedCount = (hasChildren || hasHiddenDescendants)
      ? Number(node.aggregateTargeted || 0)
      : Number(node.numTargeted || 0);
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
      targetedCount > changedCount ? `Bits targeted: ${targetedCount} (${targetedCount - changedCount} already set)` : null,
      hasHiddenDescendants ? `(includes ${node.hiddenDescendantCount} hidden event${node.hiddenDescendantCount !== 1 ? 's' : ''})` : null,
      node.annotation,
    ].filter(Boolean).join('\n');
    const summaryText = formatStepSummary(node);

    return (
      <div key={node.originalIndex} className={`event-depth-node depth-${Math.min(6, nodeDepth)}`}>
        <div
          className={`event-item event-child${isSelected ? ' selected' : ''}${isAncestor ? ' is-ancestor' : ''}${hasChildren ? ' has-children' : ''}${isAggregateLeaf ? ' has-hidden-descendants' : ''}`}
          data-step-idx={node.originalIndex}
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
          {targetedCount > changedCount && (
            <span className="event-targeted" title={`${targetedCount} bits targeted (${targetedCount - changedCount} already set)`}>⊙{targetedCount}</span>
          )}
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
            {(() => {
              // For aggregate events (collapsed parents or level-filtered leaves),
              // show annotation from the node itself or the first aggregated child that has one.
              const displayAnnotation = node.annotation ||
                ((hasHiddenDescendants || (hasChildren && isNodeCollapsed))
                  ? node.aggregateStepIndices?.reduce((acc, idx) => acc ?? stepAnnotationMap.get(idx) ?? null, null) ?? null
                  : null);
              const inspectableUnit = displayAnnotation ? parseInspectableUnitFromAnnotation(displayAnnotation) : null;
              return displayAnnotation
                ? (
                  <span
                    className={`event-annotation${inspectableUnit ? ' event-annotation-clickable' : ''}`}
                    title={inspectableUnit ? `${displayAnnotation}\n\n${inspectableUnit.title}` : displayAnnotation}
                    onClick={inspectableUnit && onInspectAnnotationUnit ? (e) => {
                      e.stopPropagation();
                      onInspectAnnotationUnit({ type: inspectableUnit.type, index: inspectableUnit.index });
                    } : undefined}
                  >
                    {displayAnnotation}
                  </span>
                )
                : null;
            })()}
          </span>
        </div>
        {hasChildren && !isNodeCollapsed && (
          <div className="event-depth-children">
            {node.children.map(child => renderStepNode(child, nodeDepth + 1))}
          </div>
        )}
      </div>
    );
  }, [selectedSteps, ancestorStepIndices, collapsed, handleStepClick, toggleGroup, onStepClick, onMultiStepSelect, onInspectAnnotationUnit, parseInspectableUnitFromAnnotation, stepAnnotationMap]);

  // Resize with scroll preservation
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    if (listRef.current) scrollTopRef.current = listRef.current.scrollTop;

    const onMove = (ev) => {
      onWidthChange(Math.max(200, Math.min(2000, startWidth + (ev.clientX - startX)))); // item 263: allow wide panel
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

  // Compact transport controls used both in collapsed and expanded states.
  // item 236/#3 perf: the slider is uncontrolled (defaultValue) so React never
  // overwrites the position set imperatively by the subscription callback.
  const transportControls = goToStep ? (
    <div className="events-panel-transport" onMouseDown={(e) => e.stopPropagation()}>
      <div className="spt-row spt-row-nav">
        <button className="spt-btn" onClick={() => goToStep(0)} title="First event (Home)" disabled={exporting}><SkipBack size={12} /></button>
        <button className="spt-btn" onClick={() => goToStep(localStep - 1)} title="Previous event (←)" disabled={exporting}><StepBack size={12} /></button>
        {setPlaySpeedPercent && (
          <button className="spt-btn spt-speed" onClick={() => setPlaySpeedPercent(v => Math.max(1, Math.round(v / 1.25)))} title="Slower animation" disabled={exporting}><Minus size={11} /></button>
        )}
        <button className="spt-btn spt-play" onClick={handlePlayPause} title={playing ? 'Pause playback' : 'Play all events'} disabled={exporting || !steps.length}>
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        {setPlaySpeedPercent && (
          <button className="spt-btn spt-speed" onClick={() => setPlaySpeedPercent(v => Math.min(1600, Math.round(v * 1.25)))} title="Faster animation" disabled={exporting}><Plus size={11} /></button>
        )}
        <button className="spt-btn" onClick={() => goToStep(localStep + 1)} title="Next event (→)" disabled={exporting}><StepForward size={12} /></button>
        <button className="spt-btn" onClick={() => goToStep(steps.length - 1)} title="Last event (End)" disabled={exporting}><SkipForward size={12} /></button>
        {setPlaySpeedPercent && playSpeedPercent != null && (
          <span className="spt-speed-label" title={`Playback speed: ${playSpeedPercent}% of normal`}>{playSpeedPercent}%</span>
        )}
      </div>
      <div className="spt-row spt-row-timeline">
        <input
          type="range"
          ref={sliderRef}
          className="spt-slider"
          min={0}
          max={Math.max(0, steps.length - 1)}
          defaultValue={stepRef?.current ?? 0}
          onChange={(e) => goToStep(parseInt(e.target.value, 10))}
          onPointerDown={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = true; }}
          onPointerUp={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          onPointerCancel={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          disabled={exporting}
          title="Scrub events"
        />
        <span className="spt-counter">
          <span ref={stepNumRef}>{stepRef?.current ?? 0}</span>
          <span className="spt-total">/{steps.length - 1}</span>
        </span>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div ref={panelRef} className={`events-panel${panelCollapsed ? ' collapsed' : ''}${panelCollapsed && eventsCollapseDir === 'right' ? ' collapse-right' : ''}${eventsOpenFromBottom ? ' events-panel--from-bottom' : ''}${opColWide ? ' op-wide' : ''}`} style={{ width: `${width}px` }}>
      <div className="events-panel-header">
        <div className="events-panel-header-title-row">
          {/* item 210: left arrow to hide the events panel, like the settings panel toggle */}
          {/* item 353: panel-toggle-arrow gives unified design across all panel toggles */}
          <button
            className="events-panel-close-btn panel-toggle-arrow is-open"
            onClick={onToggleCollapse}
            title="Hide Events panel"
            onMouseDown={(e) => e.stopPropagation()}
          >‹</button>
          <h3>Events</h3>
          {/* item 211: wide op button always in the title row so it's visible even when panel is narrow */}
          <button
            className={`event-op-wide-btn${opColWide ? ' active' : ''}`}
            onClick={toggleOpColWide}
            title={opColWide ? 'Narrow operation column' : 'Wide operation column'}
          >{opColWide ? '←→' : '→←'}</button>
          {!eventTitleVisible && onShowEventTitle && (
            <button
              className="events-panel-show-event-title-btn"
              onClick={(e) => { e.stopPropagation(); onShowEventTitle(); }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Show single-event widget"
            ><Eye size={12} /></button>
          )}
        </div>
        <div className="event-search-row">
          <input
            className="event-search"
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="event-search-clear" onClick={() => setSearch('')} onMouseDown={(e) => e.stopPropagation()} title="Clear search">✕</button>
          )}
        </div>
        {/* item 300: merged operations + group-by into one compact row */}
        <div className="event-filters-row">
          {operations.length > 0 && (
            <select className="event-filter event-filter-op" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
              <option value="">All operations</option>
              {operations.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          )}
          <select className="event-filter event-groupby-select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="prime">By Prime</option>
            <option value="range">By Range</option>
            <option value="step">By Factor</option>
          </select>
        </div>
        {/* item 300: merged level filter + hide-checkboxes + count into one compact row */}
        <div className="event-level-toggles-row">
          {traceLevels.length > 0 && (
            <>
              <button
                className="event-level-btn"
                onClick={handleLevelDecrease}
                title="Less detail"
                disabled={!!filterLevel && traceLevels.indexOf(Number(filterLevel.split(':')[1])) === 0}
              >&lt;</button>
              <select className="event-filter event-level-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                <option value="">All levels</option>
                <optgroup label="Collapse at level">
                  {traceLevels.map((level) => <option key={`collapse-${level}`} value={`collapse:${level}`}>Collapse L{level}</option>)}
                </optgroup>
                <optgroup label="Up to (inclusive)">
                  {traceLevels.map((level) => <option key={`upto-${level}`} value={`upto:${level}`}>Up to L{level}</option>)}
                </optgroup>
                <optgroup label="Exactly">
                  {traceLevels.map((level) => <option key={`exact-${level}`} value={`exact:${level}`}>Only L{level}</option>)}
                </optgroup>
              </select>
              <button
                className="event-level-btn"
                onClick={handleLevelIncrease}
                title="More detail"
                disabled={!filterLevel || (filterLevel.split(':')[0] !== 'upto' && traceLevels.indexOf(Number(filterLevel.split(':')[1])) >= traceLevels.length - 1)}
              >&gt;</button>
            </>
          )}
          <label className="event-filter-toggle" title="Hide events with no elapsed time">
            <input type="checkbox" checked={hideUntimed} onChange={(e) => setHideUntimed(e.target.checked)} />
            <span>⏱</span>
          </label>
          <label className="event-filter-toggle" title="Hide events that don't change any bits">
            <input type="checkbox" checked={hideUnchanged} onChange={(e) => setHideUnchanged(e.target.checked)} />
            <span>⊘</span>
          </label>
          <span className="events-visible-count" title={`${totalVisible} of ${steps.length} events visible`}>{totalVisible}/{steps.length}</span>
        </div>
      </div>
      {listVisible && (
      <div className="event-list" ref={listRef} onWheel={onUserScroll}>
        {visibleRenderedGroups.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const containsActive = group.children.some(s => s.originalIndex === localStep || selectedSteps.has(s.originalIndex));

          return (
            <div key={group.id} className="event-group">
              <div
                className={`event-group-header${containsActive ? ' active-group' : ''}`}
                data-group-id={group.id}
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
                  {group.totalTargeted > group.totalChanged ? ` · ⊙${group.totalTargeted}` : ''}
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
      )}

      <div className="resize-handle" onMouseDown={handleMouseDown} />
    </div>
    </>
  );
});

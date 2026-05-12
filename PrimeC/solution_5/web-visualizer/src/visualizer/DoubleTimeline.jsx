import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  Play, Pause, SkipBack, StepBack, StepForward, SkipForward, Minus, Plus, Repeat,
} from '../Icons';
import { usePlaybackContext } from '../contexts/PlaybackContext';

const MIN_DETAIL_HEIGHT = 180;
const MAX_DETAIL_HEIGHT = 700;

/**
 * DoubleTimeline — backlog items 120-125.
 *
 * Three-zone horizontal control strip that sits above the detail panel.
 *
 *  LEFT   — waveform overview of all events (bits changed per event as bars).
 *           Click or drag to jump to a specific event.
 *  MIDDLE — draggable divider / transport cluster.
 *           Drag left/right to trade width between the two timelines.
 *           Drag up/down to expand/collapse the detail panel below.
 *  RIGHT  — animation scrubber for the current event.
 *           Blue background, white vertical-bar playhead. Click or drag to scrub.
 */
export default function DoubleTimeline({
  steps = [],
  currentStep = 0,
  stepScrubProgress = 0,
  seekStepAnimation,
  setStepScrubProgress,
  currentStepData = null,
  playing = false,
  isStepAnimRunning = false,
  isAnimationReplayPaused = false,
  isSingleEventLoopActive = false,
  isSingleEventRepeatEnabled = false,
  onToggleRepeat,
  handleStepAnimToggle,
  onOpenAnimationSettings,
  exporting = false,
  // Detail panel control (item 121)
  isDetailOpen = false,
  detailHeight = 200,
  totalDetailHeight = 0,  // item 190: full rendered height (header + body) for dockedBottom
  onToggleDetail,
  onDetailHeightChange,
  // items 151/152: toggle all-events vs single-event in detail panel
  isAllEventsInDetailPanel = true,
  onToggleAllEventsPanel,
  // item 159: arrow toggles on left/right control side panels
  isEventsPanelCollapsed = false,
  onToggleEventsPanel,
  onCollapseEventsPanelFromTimeline,
  isSettingsCollapsed = false,
  onToggleSettingsPanel,
  // item 154: delay phase ms for fill+fade animation
  delayPhaseMs = 0,
  // item 155: hide/reveal detail panel header
  isDetailHeaderHidden = false,
  onHideDetailHeader,
  // item 157: float/dock detail panel
  isDetailPanelFloating = false,
  onFloatDetailPanel,
  onDockDetailPanel,
  // item 163: undock/dock the timeline itself
  isTimelineUndocked = false,
  onUndockTimeline,
  onDockTimeline,
  // when undocked: toggle detail panel visibility (shown in normal position, not inside widget)
  floatingDetailVisible = false,
  onToggleFloatingDetail,
  // item 290: repeat handle on animation timeline
  repeatFraction = 0,
  onRepeatFractionChange,
}) {
  const {
    goToStep,
    handlePlayPause,
    setPlaySpeedPercent,
    playSpeedPercent,
    isScrubbingTopRef,
  } = usePlaybackContext();

  // splitFraction: fraction of total width given to the LEFT timeline.
  const [splitFraction, setSplitFraction] = useState(0.5);
  const splitFractionRef = useRef(0.5);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // item 163: free-floating position when undocked (x/y relative to viewport)
  // item 201: default y puts the strip ~40px from the bottom (strip height ≈ 90px: title+strip+annotation)
  const [undockPos, setUndockPos] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    const h = typeof window !== 'undefined' ? window.innerHeight : 600;
    const floatW = Math.round(w * 0.6);
    const stripH = 90;  // approximate height of floating strip without detail panel open
    return { x: Math.round((w - floatW) / 2), y: Math.max(8, h - stripH - 40) };
  });
  const undockPosRef = useRef(undockPos);
  // item 170: resizable when undocked
  const [undockSize, setUndockSize] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    return { width: Math.round(w * 0.6), height: 420 };
  });
  const undockSizeRef = useRef(undockSize);
  const preDockWidthRef = useRef(Math.round((typeof window !== 'undefined' ? window.innerWidth : 800) * 0.6));  // Default 60%
  const isDockAnimatingRef = useRef(false);
  const undockAnimatingRef = useRef(false);  // true during undock FLIP animation; blocks drag position tracking
  const animAccumDeltaRef = useRef({ x: 0, y: 0 });  // item 251: cursor delta accumulated during undock transition
  const preferredBottomGapRef = useRef(96);
  const prevFloatingDetailVisibleRef = useRef(floatingDetailVisible);

  // item 214: undocking is always enabled — no toggle needed
  const undockEnabled = true;

  // item 219: focus mode — 'events' | 'animation'
  // Switches which timeline the center controls affect and adds visual highlight.
  const [focusMode, setFocusMode] = useState('events');

  // item 181: smooth undock/dock animation
  const preUndockRectRef = useRef(null);  // rect captured just before undocking
  const undockCursorPosRef = useRef(null);  // cursor position when undocking via drag
  const undockGrabOffsetRef = useRef({ x: 0, y: 0 });  // pointer offset from the strip top-left
  const undockSplitFractionRef = useRef(0.5);  // split fraction captured at undock trigger
  const draggerHoldOffsetRef = useRef({ x: 0, y: 0 });  // pointer offset inside center dragger zone
  const draggerCenterWidthRef = useRef(0);  // center zone width captured at pointer down
  const [undockTransition, setUndockTransition] = useState(null); // 'entering' | 'leaving' | null

  // ── Canvas for the events waveform ──────────────────────────────────────────
  const waveCanvasRef = useRef(null);
  const waveContainerRef = useRef(null);
  const containerRef = useRef(null);
  // item 291: active-area refs — the inset region excluding toggle buttons
  const waveActiveAreaRef = useRef(null);
  const animActiveAreaRef = useRef(null);

  // item 289: zoom ranges for both timelines
  const [waveZoomRange, setWaveZoomRange] = useState({ start: 0, end: 1 }); // fractions of total steps
  const waveZoomRangeRef = useRef({ start: 0, end: 1 });
  const [animZoomRange, setAnimZoomRange] = useState({ start: 0, end: 100 }); // percent 0-100
  const animZoomRangeRef = useRef({ start: 0, end: 100 });

  // Pre-compute bar heights (normalised 0-1) from steps
  const barHeights = useMemo(() => {
    if (!steps.length) return [];
    const vals = steps.map((s) => Math.max(0, Number(s.numChanged) || 0));
    const max = Math.max(1, ...vals);
    return vals.map((v) => v / max);
  }, [steps]);

  // Draw waveform on canvas whenever size or data changes
  const drawWave = useCallback(() => {
    const canvas = waveCanvasRef.current;
    // item 291: measure the active area (inset past the toggle button) not the full zone
    const activeArea = waveActiveAreaRef.current || waveContainerRef.current;
    if (!canvas || !activeArea) return;
    const { width, height } = activeArea.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const n = barHeights.length;
    if (n === 0) return;

    // item 242: transparent canvas so glassmorphism CSS backdrop-filter shows through
    ctx.clearRect(0, 0, width, height);

    // item 289: only render bars in the zoom range
    const { start: zStart, end: zEnd } = waveZoomRangeRef.current;
    const iStart = Math.floor(zStart * n);
    const iEnd = Math.ceil(zEnd * n);
    const visibleCount = Math.max(1, iEnd - iStart);
    const barW = width / visibleCount;
    const padFrac = barW > 3 ? 0.12 : 0;

    for (let i = iStart; i < iEnd; i++) {
      if (i < 0 || i >= n) continue;
      const h = barHeights[i] * (height - 2);
      const x = (i - iStart) * barW + barW * padFrac;
      const w = barW * (1 - 2 * padFrac);
      const y = height - h;
      const isActive = i === currentStep;
      const isPast = i < currentStep;
      if (isActive) {
        ctx.fillStyle = '#ffffff';
      } else if (isPast) {
        ctx.fillStyle = 'rgba(100,180,255,0.65)';
      } else {
        ctx.fillStyle = 'rgba(72,128,200,0.35)';
      }
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.round(h) || 1);
    }
    // item 288: scrubber is now a separate pill div overlay — no canvas line needed
  }, [barHeights, currentStep]);

  useEffect(() => { drawWave(); }, [drawWave]);

  useEffect(() => {
    const el = waveContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => drawWave());
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawWave]);

  // ── Left timeline: click + drag to jump to event (item 125) ─────────────────
  // item 192: rAF-throttled scrub — avoids queuing multiple React state updates per frame
  const waveRafRef = useRef(null);
  const isDividerDraggingRef = useRef(false);  // item 218: block zone interactions during center drag
  // Ref so wave pointer handlers can read the current playing state without stale closures
  const isAnimPlayingRef = useRef(false);
  isAnimPlayingRef.current = (playing || isStepAnimRunning || isSingleEventLoopActive) && !isAnimationReplayPaused;
  // Ref so repeat-handle handler can check playhead proximity without a stale closure
  const stepScrubProgressRef = useRef(stepScrubProgress);
  stepScrubProgressRef.current = stepScrubProgress;
  // Ref: true while the repeat handle is being dragged — gates zone pointer handlers
  const isRepeatDraggingRef = useRef(false);
  const waveSeek = useCallback((e) => {
    const canvas = waveCanvasRef.current;
    if (!canvas || steps.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // item 289: map fraction to zoomed range
    const { start: zStart, end: zEnd } = waveZoomRangeRef.current;
    const mappedFrac = zStart + frac * (zEnd - zStart);
    goToStep(Math.round(mappedFrac * (steps.length - 1)));
  }, [goToStep, steps.length]);

  const handleWavePointerDown = useCallback((e) => {
    if (isDividerDraggingRef.current) return;  // item 218: ignore if center is being dragged
    e.currentTarget.setPointerCapture(e.pointerId);
    setFocusMode('events');  // item 219: click/drag in events zone → events focus
    if (isAnimPlayingRef.current) handleStepAnimToggle?.();  // stop animation when scrubbing events
    // Reset animation to 0% so it doesn't show stale progress while browsing events
    setStepScrubProgress?.(0);
    seekStepAnimation?.(0);
    waveSeek(e);
  }, [waveSeek, handleStepAnimToggle, setStepScrubProgress, seekStepAnimation]);

  const handleWavePointerMove = useCallback((e) => {
    if (isDividerDraggingRef.current) return;  // item 218
    if (e.buttons !== 1) return;
    const clientX = e.clientX;
    if (waveRafRef.current !== null) return;  // already scheduled
    waveRafRef.current = requestAnimationFrame(() => {
      waveRafRef.current = null;
      const canvas = waveCanvasRef.current;
      if (!canvas || steps.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // item 289: map fraction to zoomed range
      const { start: zStart, end: zEnd } = waveZoomRangeRef.current;
      const mappedFrac = zStart + frac * (zEnd - zStart);
      goToStep(Math.round(mappedFrac * (steps.length - 1)));
      // item 294: keep animation progress at 0% while scrubbing events
      setStepScrubProgress?.(0);
      seekStepAnimation?.(0);
    });
  }, [goToStep, steps.length, setStepScrubProgress, seekStepAnimation]);

  // item 289: wheel zoom for the wave zone
  const handleWaveWheel = useCallback((e) => {
    if (steps.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cursorFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const { start, end } = waveZoomRangeRef.current;
    const range = end - start;
    // deltaY > 0 = scroll down = zoom out; < 0 = scroll up = zoom in
    const factor = e.deltaY > 0 ? 1.25 : 0.8;
    const newRange = Math.max(2 / steps.length, Math.min(1, range * factor));
    // Keep cursor's fraction fixed
    const cursorAbs = start + cursorFrac * range;
    let newStart = cursorAbs - cursorFrac * newRange;
    let newEnd = newStart + newRange;
    if (newStart < 0) { newStart = 0; newEnd = newRange; }
    if (newEnd > 1) { newEnd = 1; newStart = 1 - newRange; }
    const next = { start: newStart, end: newEnd };
    waveZoomRangeRef.current = next;
    setWaveZoomRange(next);
    drawWave();
  }, [steps.length, drawWave]);

  // ── Centre divider drag: horizontal = split; vertical = detail panel (items 121, 125, 130–133, 142) ──
  // item 142: use pointer events so touch works the same as mouse
  // item 172: container-level drag handler — drags the floating widget when undocked from ANY part
  const handleContainerPointerDown = useCallback((e) => {
    if (!isTimelineUndocked) return;
    // Ignore right-clicks and multi-touch
    if (e.button !== 0) return;
    // Don't start a drag if the target is an interactive element or a resize handle
    const t = e.target;
    if (t.closest('button,input,select,textarea,a,[role="slider"]')) return;
    if (t.closest('.dtl-resize-handle')) return;
    // Don't intercept waveform / anim zone pointer interactions (seeking)
    if (t.closest('.dtl-wave-zone,.dtl-anim-zone')) return;

    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...undockPosRef.current };
    let moved = false;
    let docked = false;

    const onMove = (ev) => {
      if (docked) return;
      moved = true;
      const newPos = {
        x: startPos.x + ev.clientX - startX,
        y: Math.max(0, startPos.y + ev.clientY - startY),
      };
      // Auto-dock only when the floater actually touches the bottom boundary.
      const panelH = containerRef.current?.getBoundingClientRect().height || 120;
      const touchBoundary = floatingDetailVisible
        ? window.innerHeight - (detailHeight || 0)
        : window.innerHeight;
      if (newPos.y + panelH >= touchBoundary) {
        docked = true;
        triggerDockAnimation();
        return;
      }
      undockPosRef.current = newPos;
      setUndockPos({ ...newPos });
      if (!floatingDetailVisible) {
        const gap = window.innerHeight - (newPos.y + panelH);
        preferredBottomGapRef.current = Math.max(8, Math.min(window.innerHeight * 0.8, gap));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [isTimelineUndocked, floatingDetailVisible, onDockTimeline]);

  const getFloatingSideInsets = useCallback(() => {
    const node = containerRef.current;
    if (!node || typeof window === 'undefined') {
      return { left: 8, right: (typeof window !== 'undefined' ? window.innerWidth : 1024) - 8 };
    }
    const styles = getComputedStyle(node);
    const leftInset = Math.max(0, Number.parseFloat(styles.getPropertyValue('--events-panel-width')) || 0);
    const rightInset = Math.max(0, Number.parseFloat(styles.getPropertyValue('--settings-panel-width')) || 0);
    return {
      left: leftInset + 8,
      right: window.innerWidth - rightInset - 8,
    };
  }, []);

  const triggerDockAnimation = useCallback(() => {
    if (isDockAnimatingRef.current) return;
    if (typeof window === 'undefined') {
      onDockTimeline?.();
      return;
    }
    isDockAnimatingRef.current = true;
    const insets = getFloatingSideInsets();
    const targetW = Math.max(320, insets.right - insets.left);
    const panelH = containerRef.current?.getBoundingClientRect().height || 120;
    const touchBoundary = floatingDetailVisible
      ? window.innerHeight - (detailHeight || 0)
      : window.innerHeight;
    const ty = Math.max(0, touchBoundary - panelH);
    // Save the current floating width before animating to full width.
    preDockWidthRef.current = undockSizeRef.current.width;

    // Preserve dragger screen x: recompute split fraction so the dragger stays
    // at the same screen position after the container expands to full docked width.
    const floatLeft = undockPosRef.current.x;
    const floatW = undockSizeRef.current.width;
    const centerW = Math.max(1, draggerCenterWidthRef.current || 1);
    const currentFrac = splitFractionRef.current;
    const draggerScreenX = floatLeft + currentFrac * Math.max(1, floatW - centerW);
    const newFrac = Math.max(0.15, Math.min(0.85, (draggerScreenX - insets.left) / Math.max(1, targetW - centerW)));
    setSplitFraction(newFrac);
    splitFractionRef.current = newFrac;

    setUndockTransition('leaving-expand');
    undockSizeRef.current = { ...undockSizeRef.current, width: targetW };
    setUndockSize((prev) => ({ ...prev, width: targetW }));
    setUndockPos({ x: insets.left, y: ty });
    undockPosRef.current = { x: insets.left, y: ty };
    setTimeout(() => {
      setUndockTransition('leaving-fade');
      setTimeout(() => {
        setUndockTransition(null);
        onDockTimeline?.();
      }, 180);
    }, 320);
  }, [onDockTimeline, getFloatingSideInsets, floatingDetailVisible, detailHeight]);

  // item 207: title bar drag triggers immediate undock when docked (no delay/distance threshold)
  const handleTitleBarPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    // When already undocked the container handler moves the floater; let event bubble
    if (isTimelineUndocked) return;
    if (!undockEnabled || !onUndockTimeline) return;

    e.stopPropagation();

    const containerRect = containerRef.current?.getBoundingClientRect() ?? null;
    preUndockRectRef.current = containerRect;
    undockSplitFractionRef.current = splitFraction;
    undockGrabOffsetRef.current = containerRect
      ? { x: e.clientX - containerRect.left, y: e.clientY - containerRect.top }
      : { x: 0, y: 0 };
    draggerHoldOffsetRef.current = { x: 0, y: 0 };
    draggerCenterWidthRef.current = 0;
    undockCursorPosRef.current = { x: e.clientX, y: e.clientY };
    animAccumDeltaRef.current = { x: 0, y: 0 };  // item 251: reset accumulator before each drag-undock
    onUndockTimeline();

    // Track pointer after the FLIP animation to move the freshly-floated strip
    let docked = false;
    let lastX = e.clientX;
    let lastY = e.clientY;

    const onMove = (ev) => {
      if (docked) return;
      if (undockAnimatingRef.current) {
        // item 251: accumulate cursor movement so the panel can catch up when the transition ends
        animAccumDeltaRef.current.x += ev.clientX - lastX;
        animAccumDeltaRef.current.y += ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        return;
      }
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;

      const insets = getFloatingSideInsets();
      const panelH = containerRef.current?.getBoundingClientRect().height || 120;
      const touchBoundary = floatingDetailVisible
        ? window.innerHeight - (detailHeight || 0)
        : window.innerHeight;
      const newPos = {
        x: Math.max(insets.left, Math.min(insets.right - undockSizeRef.current.width, undockPosRef.current.x + dx)),
        y: Math.max(0, undockPosRef.current.y + dy),
      };
      if (newPos.y + panelH >= touchBoundary) {
        docked = true;
        triggerDockAnimation();
        return;
      }
      undockPosRef.current = newPos;
      setUndockPos({ ...newPos });
      if (!floatingDetailVisible) {
        const gap = window.innerHeight - (newPos.y + panelH);
        preferredBottomGapRef.current = Math.max(8, Math.min(window.innerHeight * 0.8, gap));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [isTimelineUndocked, undockEnabled, onUndockTimeline, splitFraction, floatingDetailVisible, detailHeight, triggerDockAnimation, getFloatingSideInsets]);

  const adjustFloatingTimelineBounds = useCallback(({ restoreBottom = false } = {}) => {
    if (!isTimelineUndocked || typeof window === 'undefined') return;

    const node = containerRef.current;
    const panelH = node?.getBoundingClientRect().height || 120;
    const insets = getFloatingSideInsets();

    let nextW = undockSizeRef.current.width;
    let nextX = undockPosRef.current.x;
    let nextY = undockPosRef.current.y;

    const maxW = Math.max(320, insets.right - insets.left);
    if (nextW > maxW) nextW = maxW;

    nextX = Math.max(insets.left, Math.min(insets.right - nextW, nextX));

    if (restoreBottom && !floatingDetailVisible) {
      nextY = window.innerHeight - panelH - preferredBottomGapRef.current;
    }

    if (floatingDetailVisible) {
      const detailTop = window.innerHeight - (detailHeight || 0);
      const maxBottom = detailTop - 8;
      if (nextY + panelH > maxBottom) {
        nextY = Math.max(8, maxBottom - panelH);
      }
    }

    nextY = Math.max(8, Math.min(window.innerHeight - panelH - 8, nextY));

    if (!floatingDetailVisible) {
      const gap = window.innerHeight - (nextY + panelH);
      preferredBottomGapRef.current = Math.max(8, Math.min(window.innerHeight * 0.8, gap));
    }

    if (Math.abs(nextW - undockSizeRef.current.width) > 0.5) {
      undockSizeRef.current = { ...undockSizeRef.current, width: nextW };
      setUndockSize((prev) => ({ ...prev, width: nextW }));
    }

    if (Math.abs(nextX - undockPosRef.current.x) > 0.5 || Math.abs(nextY - undockPosRef.current.y) > 0.5) {
      const nextPos = { x: nextX, y: nextY };
      undockPosRef.current = nextPos;
      setUndockPos(nextPos);
    }
  }, [isTimelineUndocked, getFloatingSideInsets, floatingDetailVisible, detailHeight]);

  useEffect(() => {
    if (!isTimelineUndocked || typeof window === 'undefined') return;

    const shouldRestoreBottom = prevFloatingDetailVisibleRef.current && !floatingDetailVisible;
    prevFloatingDetailVisibleRef.current = floatingDetailVisible;

    adjustFloatingTimelineBounds({ restoreBottom: shouldRestoreBottom });

    const onResize = () => adjustFloatingTimelineBounds();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isTimelineUndocked, floatingDetailVisible, detailHeight, isEventsPanelCollapsed, isSettingsCollapsed, adjustFloatingTimelineBounds]);

  const handleDividerPointerDown = useCallback((e) => {
    // item 163: when undocked, grip drags the timeline position instead
    // (container drag still works elsewhere; dragging the center down docks immediately)
    const containerRectAtDown = containerRef.current?.getBoundingClientRect() ?? null;
    const centerRectAtDown = e.currentTarget.getBoundingClientRect();
    undockGrabOffsetRef.current = containerRectAtDown
      ? { x: e.clientX - containerRectAtDown.left, y: e.clientY - containerRectAtDown.top }
      : { x: 0, y: 0 };
    draggerHoldOffsetRef.current = { x: e.clientX - centerRectAtDown.left, y: e.clientY - centerRectAtDown.top };
    draggerCenterWidthRef.current = centerRectAtDown.width;

    if (isTimelineUndocked) {
      e.stopPropagation();
      const startX = e.clientX;
      const startFraction = splitFraction;
      const startCenterWidth = e.currentTarget.getBoundingClientRect().width;
      let isDragging = false;

      const onMoveUndocked = (ev) => {
        const dx = ev.clientX - startX;
        if (!isDragging) {
          if (Math.abs(dx) < 3) return;
          isDragging = true;
        }
        const totalW = containerRef.current?.getBoundingClientRect().width || 800;
        const availableW = Math.max(1, totalW - startCenterWidth);
        const nextFraction = Math.max(0.15, Math.min(0.85, startFraction + dx / availableW));
        setSplitFraction(nextFraction);
        splitFractionRef.current = nextFraction;
      };
      const onUpUndocked = () => {
        window.removeEventListener('pointermove', onMoveUndocked);
        window.removeEventListener('pointerup', onUpUndocked);
        window.removeEventListener('pointercancel', onUpUndocked);
      };
      window.addEventListener('pointermove', onMoveUndocked);
      window.addEventListener('pointerup', onUpUndocked);
      window.addEventListener('pointercancel', onUpUndocked);
      return;
    }

    // item 131: no preventDefault — buttons must still fire onClick
    const startX = e.clientX;
    const startY = e.clientY;
    const startFraction = splitFraction;
    const startCenterWidth = e.currentTarget.getBoundingClientRect().width;
    const startDetailOpen = isDetailOpen;
    const startDetailHeight = detailHeight || MIN_DETAIL_HEIGHT;
    let isDragging = false;
    let closedByDrag = false;
    let lastH = startDetailHeight;

    const onMove = (ev) => {
      const container = containerRef.current;
      if (!container) return;
      const dx = ev.clientX - startX;
      const accY = startY - ev.clientY;

      // item 131: only start drag effects after 3px movement
      if (!isDragging) {
        if (Math.abs(dx) + Math.abs(accY) < 3) return;
        isDragging = true;
        // item 218: block wave/anim zone pointer events during center drag
        isDividerDraggingRef.current = true;
        // item 132: suppress ALL detail-panel transitions/animations during drag
        // (class on root affects newly-mounted elements too, unlike inline style)
        document.documentElement.classList.add('detail-drag-active');
      }

      // Horizontal — adjust split fraction
      const totalW = container.getBoundingClientRect().width;
      const availableW = Math.max(1, totalW - startCenterWidth);
      const nextFraction = Math.max(0.15, Math.min(0.85, startFraction + dx / availableW));
      setSplitFraction(nextFraction);
      splitFractionRef.current = nextFraction;

      // item 219: update focus mode based on horizontal drag direction
      if (Math.abs(dx) > 8) {
        setFocusMode(dx > 0 ? 'events' : 'animation');
      }

      // Vertical — 1:1 pixel tracking (items 139, 140: no snapping during drag; close at 0)
      if (startDetailOpen && !closedByDrag) {
        const rawH = startDetailHeight + accY;
        // item 140: dragged all the way down — close the panel during drag
        if (rawH <= 0) {
          closedByDrag = true;
          onToggleDetail?.();
          // item 155: hide header when dragged all the way down
          onHideDetailHeader?.();
          return;
        }
        // item 139: track 1:1 without snapping
        lastH = Math.max(0, Math.min(MAX_DETAIL_HEIGHT, rawH));
        onDetailHeightChange?.(lastH);
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      // item 218: restore zone pointer events
      isDividerDraggingRef.current = false;
      // item 132: restore transitions/animations (class is idempotent to remove)
      document.documentElement.classList.remove('detail-drag-active');
      // item 139: spring-settle on release — transitions are now active again
      if (!isDragging) return;
      const panelOpen = startDetailOpen && !closedByDrag;
      if (panelOpen) {
        if (lastH < 80) {
          // Too small — spring-close (CSS transition animates it shut)
          onToggleDetail?.();
          // item 155: hide header when spring-closed
          onHideDetailHeader?.();
        } else if (lastH < MIN_DETAIL_HEIGHT) {
          // Below min but not tiny — spring-snap up to minimum
          onDetailHeightChange?.(MIN_DETAIL_HEIGHT);
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [isTimelineUndocked, splitFraction, isDetailOpen, detailHeight, onToggleDetail, onDetailHeightChange, onHideDetailHeader]);

  // ── Right timeline: animation scrubber (items 122, 125, 138) ──────────────────────
  // item 138: attach to zone (not track) so playhead and click target span full zone height
  const animZoneRef = useRef(null);
  const animRafRef = useRef(null);  // item 192: rAF throttle for anim scrub

  const animSeek = useCallback((e) => {
    // item 291: use active area rect (inset past settings toggle)
    const el = animActiveAreaRef.current || animZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // item 289: map fraction to zoomed range
    const { start: zStart, end: zEnd } = animZoomRangeRef.current;
    const mappedPercent = zStart + frac * (zEnd - zStart);
    setStepScrubProgress?.(mappedPercent);
    seekStepAnimation?.(mappedPercent / 100);
  }, [seekStepAnimation, setStepScrubProgress]);

  const handleAnimPointerDown = useCallback((e) => {
    if (isDividerDraggingRef.current) return;  // item 218: ignore if center is being dragged
    if (isRepeatDraggingRef.current) return;   // ignore if repeat handle is being dragged
    if (isScrubbingTopRef) isScrubbingTopRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFocusMode('animation');  // item 219: click/drag in anim zone → animation focus
    animSeek(e);
  }, [isScrubbingTopRef, animSeek]);
  const handleAnimPointerMove = useCallback((e) => {
    if (isRepeatDraggingRef.current) return;   // ignore while repeat handle drag owns the pointer
    if (e.buttons !== 1) return;
    const clientX = e.clientX;
    if (animRafRef.current !== null) return;  // already scheduled
    animRafRef.current = requestAnimationFrame(() => {
      animRafRef.current = null;
      // item 291: use active area rect
      const el = animActiveAreaRef.current || animZoneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // item 289: map fraction to zoomed range
      const { start: zStart, end: zEnd } = animZoomRangeRef.current;
      const mappedPercent = zStart + frac * (zEnd - zStart);
      setStepScrubProgress?.(mappedPercent);
      seekStepAnimation?.(mappedPercent / 100);
    });
  }, [seekStepAnimation, setStepScrubProgress]);
  const handleAnimPointerUp = useCallback((e) => {
    if (isRepeatDraggingRef.current) return;   // ignore: repeat handle drag will release its own capture
    if (isScrubbingTopRef) isScrubbingTopRef.current = false;
    animSeek(e);
  }, [isScrubbingTopRef, animSeek]);

  // item 289: wheel zoom for the anim zone
  const handleAnimWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // item 291: use active area rect
    const el = animActiveAreaRef.current || animZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cursorFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const { start, end } = animZoomRangeRef.current;
    const range = end - start;
    const factor = e.deltaY > 0 ? 1.25 : 0.8;
    const newRange = Math.max(1, Math.min(100, range * factor));
    const cursorAbs = start + cursorFrac * range;
    let newStart = cursorAbs - cursorFrac * newRange;
    let newEnd = newStart + newRange;
    if (newStart < 0) { newStart = 0; newEnd = newRange; }
    if (newEnd > 100) { newEnd = 100; newStart = 100 - newRange; }
    const next = { start: newStart, end: newEnd };
    animZoomRangeRef.current = next;
    setAnimZoomRange(next);
  }, []);

  // item 290: repeat handle drag on the animation timeline
  const handleRepeatHandlePointerDown = useCallback((e) => {
    if (!onRepeatFractionChange) return;
    // item 293: if the anim playhead is within 10px of the repeat handle, treat the
    // click as a seek rather than a repeat-handle drag so the playhead takes priority.
    const el = animActiveAreaRef.current || animZoneRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const { start: zStart, end: zEnd } = animZoomRangeRef.current;
      const playheadX = rect.left + ((stepScrubProgressRef.current - zStart) / (zEnd - zStart)) * rect.width;
      if (Math.abs(e.clientX - playheadX) < 10) return;  // let event bubble to zone → seek
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isRepeatDraggingRef.current = true;
    // item 291: use active area rect
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const onMove = (ev) => {
      const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const { start: zStart, end: zEnd } = animZoomRangeRef.current;
      const mappedPercent = Math.round(zStart + frac * (zEnd - zStart));
      onRepeatFractionChange(Math.max(0, Math.min(99, mappedPercent)));
    };
    const onUp = () => {
      isRepeatDraggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [onRepeatFractionChange]);

  const isAnimPlaying = (playing || isStepAnimRunning || isSingleEventLoopActive) && !isAnimationReplayPaused;
  const stepCount = steps.length;
  const canNavigate = stepCount > 0 && !exporting;
  const isInDelayPhase = delayPhaseMs > 0;
  const annotationText = currentStepData?.annotation || '';

  // item 289: computed zoom-aware values for display in JSX
  const waveIsZoomed = waveZoomRange.start > 0.001 || waveZoomRange.end < 0.999;
  const animIsZoomed = animZoomRange.start > 0.1 || animZoomRange.end < 99.9;
  // Wave playhead position within the zoomed range (hidden if outside zoom window)
  const wavePlayheadFrac = stepCount > 1
    ? (currentStep / (stepCount - 1) - waveZoomRange.start) / (waveZoomRange.end - waveZoomRange.start)
    : 0;
  const wavePlayheadVisible = stepCount > 0 && wavePlayheadFrac >= -0.01 && wavePlayheadFrac <= 1.01;
  // Anim zone: map stepScrubProgress to zoomed range position
  const animZoomSpan = animZoomRange.end - animZoomRange.start;
  const animPlayheadPct = animIsZoomed && animZoomSpan > 0
    ? ((stepScrubProgress - animZoomRange.start) / animZoomSpan) * 100
    : stepScrubProgress;
  const animPlayheadVisible = !animIsZoomed || (stepScrubProgress >= animZoomRange.start - 0.1 && stepScrubProgress <= animZoomRange.end + 0.1);
  const animFillPct = animIsZoomed && animZoomSpan > 0
    ? Math.max(0, Math.min(100, ((Math.min(stepScrubProgress, animZoomRange.end) - animZoomRange.start) / animZoomSpan) * 100))
    : stepScrubProgress;
  // item 290: repeat handle position in zoomed range
  const repeatHandlePct = animIsZoomed && animZoomSpan > 0
    ? ((repeatFraction - animZoomRange.start) / animZoomSpan) * 100
    : repeatFraction;
  const repeatHandleVisible = !animIsZoomed || (repeatFraction >= animZoomRange.start - 0.1 && repeatFraction <= animZoomRange.end + 0.1);

  // item 289: attach non-passive wheel listeners for zoom (React wheel events are passive by default)
  useEffect(() => {
    const waveEl = waveContainerRef.current;
    const animEl = animZoneRef.current;
    if (waveEl) waveEl.addEventListener('wheel', handleWaveWheel, { passive: false });
    if (animEl) animEl.addEventListener('wheel', handleAnimWheel, { passive: false });
    return () => {
      if (waveEl) waveEl.removeEventListener('wheel', handleWaveWheel);
      if (animEl) animEl.removeEventListener('wheel', handleAnimWheel);
    };
  }, [handleWaveWheel, handleAnimWheel]);

  // item 216: big play button reflects both event playback and animation state.
  // When animation is running, clicking the big button pauses the animation.
  // When events are playing (not animation), clicking pauses event playback.
  const isAnyPlaying = playing || isAnimPlaying;
  const handleMainPlayClick = useCallback(() => {
    if (isAnimPlaying) {
      handleStepAnimToggle?.();  // pause/resume the step animation
    } else {
      handlePlayPause();  // pause/resume event-to-event playback
    }
  }, [isAnimPlaying, handleStepAnimToggle, handlePlayPause]);

  // item 198: long-press on main play button reveals animation settings
  const playLongPressRef = useRef(null);
  const playLongPressTriggeredRef = useRef(false);
  const handlePlayPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    playLongPressTriggeredRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    playLongPressRef.current = setTimeout(() => {
      playLongPressRef.current = null;
      playLongPressTriggeredRef.current = true;
      onOpenAnimationSettings?.();
    }, 600);
  }, [onOpenAnimationSettings]);
  const handlePlayPointerUp = useCallback((e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (playLongPressRef.current) {
      clearTimeout(playLongPressRef.current);
      playLongPressRef.current = null;
    }
    if (!playLongPressTriggeredRef.current && !exporting && stepCount > 0) {
      handleMainPlayClick();  // item 216: unified play/pause for events + animation
    }
    playLongPressTriggeredRef.current = false;
  }, [handleMainPlayClick, exporting, stepCount]);
  const handlePlayPointerCancel = useCallback(() => {
    if (playLongPressRef.current) {
      clearTimeout(playLongPressRef.current);
      playLongPressRef.current = null;
    }
    playLongPressTriggeredRef.current = false;
  }, []);

  // item 181: FLIP animation when transitioning between docked ↔ undocked
  const prevUndockedRef = useRef(isTimelineUndocked);
  useEffect(() => {
    const wasUndocked = prevUndockedRef.current;
    prevUndockedRef.current = isTimelineUndocked;

    if (!wasUndocked && isTimelineUndocked && preUndockRectRef.current) {
      const r = preUndockRectRef.current;
      const cursorAtUndock = undockCursorPosRef.current;
      const desiredFloatingWidth = preDockWidthRef.current || undockSizeRef.current.width;
      preUndockRectRef.current = null;

      if (cursorAtUndock) {
        // DRAG-INITIATED UNDOCK: same FLIP as button-triggered (center-stable).
        // We block drag-position tracking during the animation via undockAnimatingRef,
        // then re-enable after 420 ms so the first subsequent pointermove repositions correctly.
        const floatFrac = undockSplitFractionRef.current;
        undockCursorPosRef.current = null;
        undockAnimatingRef.current = true;

        // item 203: DRAG-INITIATED UNDOCK — skip the Phase 1 position snap (drag handler already
        // placed the panel at the correct position). Only animate the width from docked to float.
        // Phase 1: set size to docked width without changing position (no visible jump).
        setSplitFraction(floatFrac);
        splitFractionRef.current = floatFrac;
        const dockedWidth = Math.max(320, Math.round(r.width));
        undockSizeRef.current = { ...undockSizeRef.current, width: dockedWidth };
        setUndockSize((prev) => ({ ...prev, width: dockedWidth }));
        setUndockTransition(null);

        // Phase 2 (rAF): animate width to float width; adjust X to keep dragger under cursor.
        // If docked width != float width, shift X by (floatFrac * delta) to keep dragger stable.
        const insets = getFloatingSideInsets();
        const widthDelta = dockedWidth - desiredFloatingWidth;  // positive = panel shrinks
        const tx = Math.max(insets.left, Math.min(
          insets.right - desiredFloatingWidth,
          undockPosRef.current.x + Math.round(floatFrac * widthDelta)
        ));
        const ty = undockPosRef.current.y;
        const finalPos = { x: tx, y: ty };
        requestAnimationFrame(() => {
          void containerRef.current?.offsetHeight;
          setUndockTransition('entering');
          undockPosRef.current = finalPos;
          setUndockPos({ ...finalPos });
          undockSizeRef.current = { ...undockSizeRef.current, width: desiredFloatingWidth };
          setUndockSize((prev) => ({ ...prev, width: desiredFloatingWidth }));
          setTimeout(() => {
            setUndockTransition(null);
            // item 251: apply cursor movement accumulated during the transition so the panel
            // follows the mouse pointer without a disconnect after the animation.
            const delta = animAccumDeltaRef.current;
            animAccumDeltaRef.current = { x: 0, y: 0 };
            if (delta.x !== 0 || delta.y !== 0) {
              const insets = getFloatingSideInsets();
              const newPos = {
                x: Math.max(insets.left, Math.min(insets.right - undockSizeRef.current.width, undockPosRef.current.x + delta.x)),
                y: Math.max(0, undockPosRef.current.y + delta.y),
              };
              undockPosRef.current = newPos;
              setUndockPos({ ...newPos });
            }
            undockAnimatingRef.current = false;
          }, 420);
        });
      } else {
        // BUTTON-TRIGGERED UNDOCK: FLIP Phase 1 → Phase 2, keeping visual center stable.
        undockPosRef.current = { x: r.left, y: r.top };
        setUndockPos({ x: r.left, y: r.top });
        undockSizeRef.current = { ...undockSizeRef.current, width: Math.max(320, Math.round(r.width)) };
        setUndockSize((prev) => ({ ...prev, width: Math.max(320, Math.round(r.width)) }));
        setUndockTransition(null);

        const insets = getFloatingSideInsets();
        const startCenterX = r.left + Math.max(1, Math.round(r.width)) / 2;
        const tx = Math.max(insets.left, Math.min(insets.right - desiredFloatingWidth, Math.round(startCenterX - desiredFloatingWidth / 2)));
        // item 201: default float position near the bottom (40px from bottom, strip ≈ 90px tall)
        const ty = Math.max(8, Math.round(window.innerHeight - 90 - 40));
        const finalPos = { x: tx, y: ty };

        requestAnimationFrame(() => {
          void containerRef.current?.offsetHeight;
          setUndockTransition('entering');
          undockPosRef.current = finalPos;
          setUndockPos({ ...finalPos });
          undockSizeRef.current = { ...undockSizeRef.current, width: desiredFloatingWidth };
          setUndockSize((prev) => ({ ...prev, width: desiredFloatingWidth }));
          setTimeout(() => setUndockTransition(null), 420);
        });
      }
    }

    if (wasUndocked && !isTimelineUndocked) {
      // Became docked — clear any transition state
      isDockAnimatingRef.current = false;
      setUndockTransition(null);
    }
  }, [isTimelineUndocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // item 156/158: event title shown as a bar ABOVE the strip.
  // Always provide a visible title when step data exists, even if the
  // enriched currentStepData object is temporarily unavailable.
  const activeStep = currentStepData || steps[currentStep] || null;
  const eventTitle = activeStep
    ? [
      activeStep.prime != null ? `Prime ${activeStep.prime}` : null,
      `Event ${activeStep.stepId ?? currentStep}`,
      activeStep.operation || null,
    ].filter(Boolean).join(' | ')
    : 'Event timeline';

  // item 163/190: position timeline above the full detail panel (header + body) so it never covers it
  const dockedBottom = isDetailPanelFloating ? 0 : (totalDetailHeight || 0);
  // item 181: smooth transition during undock/dock animations
  const floatTransitionStyle = undockTransition === 'entering'
    ? 'top 380ms cubic-bezier(0.22, 0.61, 0.36, 1), left 380ms cubic-bezier(0.22, 0.61, 0.36, 1), width 380ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 380ms'
    : undockTransition === 'leaving-expand'
    ? 'top 320ms cubic-bezier(0.55, 0, 1, 0.45), left 320ms cubic-bezier(0.55, 0, 1, 0.45), width 320ms cubic-bezier(0.55, 0, 1, 0.45)'
    : undockTransition === 'leaving-fade'
    ? 'opacity 180ms ease-out'
    : undefined;
  const containerStyle = isTimelineUndocked
    ? {
        top: `${undockPos.y}px`,
        left: `${undockPos.x}px`,
        width: `${undockSize.width}px`,
        height: undefined,  /* floating strip has no fixed height — sized by content */
        transition: floatTransitionStyle,
        opacity: undockTransition === 'leaving-fade' ? 0 : 1,
      }
    : { bottom: `${dockedBottom}px` };

  // item 170: resize handlers for the floating widget
  const handleResizeStart = useCallback((direction, e) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...undockPosRef.current };
    const startSize = { ...undockSizeRef.current };

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newW = startSize.width;
      let newH = startSize.height;
      let newX = startPos.x;
      let newY = startPos.y;

      if (direction.includes('e')) newW = Math.max(320, startSize.width + dx);
      if (direction.includes('w')) { newW = Math.max(320, startSize.width - dx); newX = startPos.x + (startSize.width - newW); }
      if (direction.includes('s')) newH = Math.max(200, startSize.height + dy);
      if (direction.includes('n')) { newH = Math.max(200, startSize.height - dy); newY = Math.max(0, startPos.y + (startSize.height - newH)); }

      const newSize = { width: newW, height: newH };
      const newPosition = { x: newX, y: newY };
      // User-resized floating width becomes the preferred width for future undocks.
      preDockWidthRef.current = newW;
      undockSizeRef.current = newSize;
      undockPosRef.current = newPosition;
      setUndockSize({ ...newSize });
      setUndockPos({ ...newPosition });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`double-timeline${isCollapsed ? ' dtl-collapsed' : ''}${isDetailPanelFloating ? ' dtl-panel-floating' : ''}${isTimelineUndocked ? ' dtl-timeline-undocked' : ''}${!isTimelineUndocked ? ' dtl-undock-enabled' : ''}${focusMode === 'events' ? ' dtl-focus-events' : ' dtl-focus-animation'}`}
      style={containerStyle}
      onPointerDown={handleContainerPointerDown}
    >
      {/* item 179: event title is full-width above the strip; transparent when docked, solid when undocked */}
      {/* item 207: title bar is a drag handle for undocking when docked */}
      <div className="dtl-event-title-bar" title={eventTitle} onPointerDown={handleTitleBarPointerDown}>
        {eventTitle}
      </div>
      <div className="dtl-strip">

        {/* LEFT: events waveform */}
        <div
          className="dtl-zone dtl-wave-zone"
          style={{ flex: `${splitFraction} 1 0`, minWidth: 40 }}
          ref={waveContainerRef}
          onPointerDown={handleWavePointerDown}
          onPointerMove={handleWavePointerMove}
          onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
          title="Click or drag to jump to event"
          role="slider"
          aria-label="Events overview"
          aria-valuemin={0}
          aria-valuemax={stepCount - 1}
          aria-valuenow={currentStep}
        >
          {/* item 291: active area — inset past the events toggle button */}
          <div className="dtl-wave-active-area" ref={waveActiveAreaRef}>
            <canvas ref={waveCanvasRef} className="dtl-wave-canvas" />
            {wavePlayheadVisible && (
              <div
                className="dtl-wave-playhead"
                style={{ left: `${Math.max(0, Math.min(100, wavePlayheadFrac * 100))}%` }}
              />
            )}
            {waveIsZoomed && (
              <div className="dtl-zoom-range-indicators">
                <span className="dtl-zoom-range-start">{Math.round(waveZoomRange.start * (stepCount - 1))}</span>
                <span className="dtl-zoom-range-end">{Math.round(waveZoomRange.end * (stepCount - 1))}</span>
              </div>
            )}
          </div>
          <div className="dtl-wave-overlay">
            {/* item 159: left arrow toggles the events panel (left sidebar) */}
            {onToggleEventsPanel && (
              <button
                className={`dtl-btn dtl-zone-toggle dtl-events-toggle${!isEventsPanelCollapsed ? ' dtl-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // item 193: when closing from timeline toggle, slide right (inward)
                  if (!isEventsPanelCollapsed && onCollapseEventsPanelFromTimeline) {
                    onCollapseEventsPanelFromTimeline();
                  } else {
                    onToggleEventsPanel();
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                title={isEventsPanelCollapsed ? 'Show events panel' : 'Hide events panel'}
              >‹</button>
            )}
            <span className="dtl-wave-label">Events</span>
            <span className="dtl-wave-counter">{currentStep}/{Math.max(0, stepCount - 1)}</span>
          </div>
        </div>

        {/* MIDDLE: transport + drag handle (item 131: entire zone is the drag handle) */}
        <div
          className="dtl-zone dtl-center-zone"
          onPointerDown={handleDividerPointerDown}
          title="Drag left/right to resize · Drag up/down to expand/collapse detail panel"
        >
          <div className="dtl-transport">
            {/* item 219: in animation focus mode, first/prev/next/last control animation; otherwise they control events */}
            <button className="dtl-btn" onClick={() => {
              if (focusMode === 'animation') { setStepScrubProgress(0); seekStepAnimation?.(0); }
              else canNavigate && goToStep(0);
            }} disabled={!canNavigate} title={focusMode === 'animation' ? 'Animation start' : 'First event'}>
              <SkipBack size={10} />
            </button>
            <button className="dtl-btn" onClick={() => {
              if (focusMode === 'animation') { const p = Math.max(0, stepScrubProgress - 10); setStepScrubProgress(p); seekStepAnimation?.(p / 100); }
              else canNavigate && goToStep(currentStep - 1);
            }} disabled={!canNavigate} title={focusMode === 'animation' ? 'Animation back 10%' : 'Previous event'}>
              <StepBack size={10} />
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.max(1, Math.round(v / 1.25)))} disabled={exporting} title="Slower">
              <Minus size={9} />
            </button>
            {/* Main play button — items 123, 128; item 198: long-press reveals animation settings; item 216: also reflects animation state */}
            {/* item 241: dtl-repeat-on class added when repeat is active to show a visible indicator */}
            <button
              className={`dtl-btn dtl-play${isSingleEventRepeatEnabled ? ' dtl-repeat-on' : ''}`}
              onPointerDown={handlePlayPointerDown}
              onPointerUp={handlePlayPointerUp}
              onPointerCancel={handlePlayPointerCancel}
              disabled={exporting || stepCount === 0}
              title={isAnyPlaying ? 'Pause (long-press for animation settings)' : 'Play all events (long-press for animation settings)'}
            >
              {isAnyPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.min(1600, Math.round(v * 1.25)))} disabled={exporting} title="Faster">
              <Plus size={9} />
            </button>
            <button className="dtl-btn" onClick={() => {
              if (focusMode === 'animation') { const p = Math.min(100, stepScrubProgress + 10); setStepScrubProgress(p); seekStepAnimation?.(p / 100); }
              else canNavigate && goToStep(currentStep + 1);
            }} disabled={!canNavigate} title={focusMode === 'animation' ? 'Animation forward 10%' : 'Next event'}>
              <StepForward size={10} />
            </button>
            <button className="dtl-btn" onClick={() => {
              if (focusMode === 'animation') { setStepScrubProgress(100); seekStepAnimation?.(1); }
              else canNavigate && goToStep(stepCount - 1);
            }} disabled={!canNavigate} title={focusMode === 'animation' ? 'Animation end' : 'Last event'}>
              <SkipForward size={10} />
            </button>
            {/* item 290: repeat button moved to animation timeline as draggable handle */}
          </div>
          {/* item 168: grip at bottom of center zone so dots appear inside the dragger, not above */}
          <div className="dtl-grip" />
        </div>

        {/* RIGHT: animation scrubber — blue bg, white bar playhead (items 122, 124, 125, 135-138) */}
        {/* item 138: pointer handlers on zone so click/drag works over full height; playhead is absolute on zone */}
        <div
          ref={animZoneRef}
          className="dtl-zone dtl-anim-zone"
          style={{ flex: `${1 - splitFraction} 1 0`, minWidth: 40 }}
          onPointerDown={handleAnimPointerDown}
          onPointerMove={handleAnimPointerMove}
          onPointerUp={handleAnimPointerUp}
          onPointerCancel={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          title="Click or drag to scrub animation"
        >
          {/* item 291: active area — inset past the settings toggle on the right */}
          <div className="dtl-anim-active-area" ref={animActiveAreaRef}>
            {/* item 289: use zoom-aware position */}
            {animPlayheadVisible && (
              <div
                className="dtl-anim-playhead"
                style={{ left: `${Math.max(0, Math.min(100, animPlayheadPct))}%` }}
              />
            )}
            {/* item 154: fill bar that grows 0→100% and fades out during delay phase */}
            {/* item 289: fill bar is also zoom-aware */}
            <div
              className={`dtl-anim-fill${isInDelayPhase ? ' dtl-anim-fill--fading' : ''}`}
              style={{ width: `${animFillPct}%`, '--delay-ms': `${delayPhaseMs}ms` }}
            />
            {/* item 289: zoom range indicators when zoomed in on animation */}
            {animIsZoomed && (
              <div className="dtl-zoom-range-indicators">
                <span className="dtl-zoom-range-start">{parseFloat(animZoomRange.start.toFixed(1))}%</span>
                <span className="dtl-zoom-range-end">{parseFloat(animZoomRange.end.toFixed(1))}%</span>
              </div>
            )}
            {/* item 290: draggable repeat handle — shows where single-event repeat restarts from */}
            {repeatHandleVisible && (
              <div
                className={`dtl-repeat-handle${isSingleEventRepeatEnabled ? ' dtl-repeat-handle--active' : ''}`}
                style={{ left: `${Math.max(0, Math.min(100, repeatHandlePct))}%` }}
                onPointerDown={handleRepeatHandlePointerDown}
                onClick={(e) => { e.stopPropagation(); onToggleRepeat?.(); }}
                title={isSingleEventRepeatEnabled
                  ? `Loop on — repeat from ${repeatFraction}% (click to disable, drag to move)`
                  : `Loop off — repeat point at ${repeatFraction}% (click to enable, drag to move)`}
              >
                <Repeat size={9} />
              </div>
            )}
            {/* item 290: repeat range fill — shows the portion from repeat point to end when active */}
            {isSingleEventRepeatEnabled && repeatFraction > 0 && repeatHandleVisible && (
              <div
                className="dtl-repeat-range"
                style={{
                  left: `${Math.max(0, Math.min(100, repeatHandlePct))}%`,
                  right: '0',
                }}
              />
            )}
          </div>
          {/* Header row: items 194, 195: ANIMATION centered, speed to its right */}
          <div className="dtl-anim-header">
            <div className="dtl-anim-header-left">
              <span className="dtl-wave-counter">{parseFloat(Number(stepScrubProgress).toFixed(1))}%</span>
            </div>
            {/* items 194, 195: ANIMATION label centered, speed to its right */}
            <div className="dtl-anim-center-group">
              <span className="dtl-wave-label dtl-anim-label">Animation</span>
              {playSpeedPercent != null && (
                <span className="dtl-anim-speed-group">
                  <span className="dtl-anim-speed-label-text">speed</span>
                  <span className="dtl-anim-speed">{playSpeedPercent}%</span>
                </span>
              )}
            </div>
            {/* item 138: stop propagation so toggle clicks don't trigger a seek */}
            <div className="dtl-anim-header-right" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onPointerCancel={(e) => e.stopPropagation()}>
              {/* item 152/159: right arrow toggles the settings panel (right sidebar) */}
              {onToggleSettingsPanel && (
                <button
                  className={`dtl-btn dtl-zone-toggle dtl-anim-toggle${!isSettingsCollapsed ? ' dtl-active' : ''}`}
                  onClick={onToggleSettingsPanel}
                  title={isSettingsCollapsed ? 'Show settings panel' : 'Hide settings panel'}
                >›</button>
              )}
            </div>
          </div>
          <div className="dtl-anim-track" />
        </div>

      </div>
      {/* item 179: annotation strip below the timelines, above the detail body */}
      <div className="dtl-annotation-row">
        <div className="dtl-annotation-bar" title={annotationText}>
          {annotationText}
        </div>
        <div className="dtl-center-actions dtl-annotation-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button className="dtl-btn dtl-anim-play" onClick={handleStepAnimToggle} disabled={exporting} title={isAnimPlaying ? 'Pause animation' : 'Play animation'}>
            {isAnimPlaying ? <Pause size={10} /> : <Play size={10} />}
          </button>
          {/* item 200: detail panel toggle — shown when docked; opens/closes the detail panel */}
          {!isTimelineUndocked && onToggleDetail && (
            <button
                className={`dtl-btn dtl-zone-toggle dtl-detail-toggle${isDetailOpen ? ' dtl-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleDetail(); }}
              title={isDetailOpen ? 'Hide detail panel' : 'Show detail panel'}
              >{isDetailOpen ? '∨' : '∧'}</button>
          )}
          {/* item 173: collapse timeline toggle removed */}
          {/* item 163: undock button — pops timeline out as freely draggable */}
          {!isTimelineUndocked && onUndockTimeline && (
            <button
              className="dtl-btn dtl-undock-btn"
              onClick={(e) => {
                e.stopPropagation();
                // item 181: capture docked rect so we can FLIP-animate to undocked position
                preUndockRectRef.current = containerRef.current?.getBoundingClientRect() ?? null;
                onUndockTimeline();
              }}
              title="Detach timeline — drag to reposition"
            >⊞</button>
          )}
          {/* item 163: dock-back button — shown only when undocked */}
          {isTimelineUndocked && onDockTimeline && (
            <button
              className="dtl-btn dtl-undock-btn dtl-active"
              onClick={(e) => {
                e.stopPropagation();
                triggerDockAnimation();
              }}
              title="Dock timeline back to bottom"
            >⊟</button>
          )}
          {/* toggle to show/hide detail panel when undocked */}
          {isTimelineUndocked && onToggleFloatingDetail && (
            <button
              className={`dtl-btn${floatingDetailVisible ? ' dtl-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleFloatingDetail(); }}
              title={floatingDetailVisible ? 'Hide detail panel' : 'Show detail panel'}
            >{floatingDetailVisible ? '▼' : '▲'}</button>
          )}
          {/* item 214: undock toggle removed — undocking is always possible */}
        </div>
      </div>
      {/* resize handles remain for resizing the floating strip itself */}
      {isTimelineUndocked && (
        <>
          <div className="dtl-resize-handle dtl-resize-e" onPointerDown={(e) => handleResizeStart('e', e)} />
          <div className="dtl-resize-handle dtl-resize-w" onPointerDown={(e) => handleResizeStart('w', e)} />
          <div className="dtl-resize-handle dtl-resize-se" onPointerDown={(e) => handleResizeStart('se', e)} />
          <div className="dtl-resize-handle dtl-resize-sw" onPointerDown={(e) => handleResizeStart('sw', e)} />
          <div className="dtl-resize-handle dtl-resize-ne" onPointerDown={(e) => handleResizeStart('ne', e)} />
          <div className="dtl-resize-handle dtl-resize-nw" onPointerDown={(e) => handleResizeStart('nw', e)} />
        </>
      )}
    </div>
  );
}

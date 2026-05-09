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
  const preferredBottomGapRef = useRef(96);
  const prevFloatingDetailVisibleRef = useRef(floatingDetailVisible);

  // item 180: toggle to enable/disable undocking (persisted across sessions)
  const [undockEnabled, setUndockEnabled] = useState(() => {
    try { return localStorage.getItem('dtl-undock-enabled') !== '0'; } catch { return true; }
  });
  const toggleUndockEnabled = useCallback(() => {
    setUndockEnabled((v) => {
      const next = !v;
      try { localStorage.setItem('dtl-undock-enabled', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

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
    const container = waveContainerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
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

    ctx.fillStyle = '#0e1b2e';
    ctx.fillRect(0, 0, width, height);

    const barW = width / n;
    const padFrac = barW > 3 ? 0.12 : 0;

    for (let i = 0; i < n; i++) {
      const h = barHeights[i] * (height - 2);
      const x = i * barW + barW * padFrac;
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

    // White vertical playhead line (item 125)
    if (n > 0) {
      const px = (currentStep / Math.max(1, n - 1)) * width;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
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
  const waveSeek = useCallback((e) => {
    const canvas = waveCanvasRef.current;
    if (!canvas || steps.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    goToStep(Math.round(frac * (steps.length - 1)));
  }, [goToStep, steps.length]);

  const handleWavePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    waveSeek(e);
  }, [waveSeek]);

  const handleWavePointerMove = useCallback((e) => {
    if (e.buttons !== 1) return;
    const clientX = e.clientX;
    if (waveRafRef.current !== null) return;  // already scheduled
    waveRafRef.current = requestAnimationFrame(() => {
      waveRafRef.current = null;
      const canvas = waveCanvasRef.current;
      if (!canvas || steps.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      goToStep(Math.round(frac * (steps.length - 1)));
    });
  }, [goToStep, steps.length]);

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
    onUndockTimeline();

    // Track pointer after the FLIP animation to move the freshly-floated strip
    let docked = false;
    let lastX = e.clientX;
    let lastY = e.clientY;

    const onMove = (ev) => {
      if (docked) return;
      if (undockAnimatingRef.current) {
        // Keep reference point current so delta is small when animation ends
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
    const el = animZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setStepScrubProgress?.(frac * 100);
    seekStepAnimation?.(frac);
  }, [seekStepAnimation, setStepScrubProgress]);

  const handleAnimPointerDown = useCallback((e) => {
    if (isScrubbingTopRef) isScrubbingTopRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    animSeek(e);
  }, [isScrubbingTopRef, animSeek]);
  const handleAnimPointerMove = useCallback((e) => {
    if (e.buttons !== 1) return;
    const clientX = e.clientX;
    if (animRafRef.current !== null) return;  // already scheduled
    animRafRef.current = requestAnimationFrame(() => {
      animRafRef.current = null;
      const el = animZoneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setStepScrubProgress?.(frac * 100);
      seekStepAnimation?.(frac);
    });
  }, [seekStepAnimation, setStepScrubProgress]);
  const handleAnimPointerUp = useCallback((e) => {
    if (isScrubbingTopRef) isScrubbingTopRef.current = false;
    animSeek(e);
  }, [isScrubbingTopRef, animSeek]);

  const isAnimPlaying = (playing || isStepAnimRunning || isSingleEventLoopActive) && !isAnimationReplayPaused;
  const stepCount = steps.length;
  const canNavigate = stepCount > 0 && !exporting;
  const isInDelayPhase = delayPhaseMs > 0;
  const annotationText = currentStepData?.annotation || '';

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
      handlePlayPause();
    }
    playLongPressTriggeredRef.current = false;
  }, [handlePlayPause, exporting, stepCount]);
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
      className={`double-timeline${isCollapsed ? ' dtl-collapsed' : ''}${isDetailPanelFloating ? ' dtl-panel-floating' : ''}${isTimelineUndocked ? ' dtl-timeline-undocked' : ''}${undockEnabled && !isTimelineUndocked ? ' dtl-undock-enabled' : ''}`}
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
          <canvas ref={waveCanvasRef} className="dtl-wave-canvas" />
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
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(0)} disabled={!canNavigate} title="First event">
              <SkipBack size={10} />
            </button>
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(currentStep - 1)} disabled={!canNavigate} title="Previous event">
              <StepBack size={10} />
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.max(1, Math.round(v / 1.25)))} disabled={exporting} title="Slower">
              <Minus size={9} />
            </button>
            {/* Main play button — items 123, 128; item 198: long-press reveals animation settings */}
            <button
              className="dtl-btn dtl-play"
              onPointerDown={handlePlayPointerDown}
              onPointerUp={handlePlayPointerUp}
              onPointerCancel={handlePlayPointerCancel}
              disabled={exporting || stepCount === 0}
              title={playing ? 'Pause (long-press for animation settings)' : 'Play all events (long-press for animation settings)'}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.min(1600, Math.round(v * 1.25)))} disabled={exporting} title="Faster">
              <Plus size={9} />
            </button>
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(currentStep + 1)} disabled={!canNavigate} title="Next event">
              <StepForward size={10} />
            </button>
            <button className="dtl-btn" onClick={() => canNavigate && goToStep(stepCount - 1)} disabled={!canNavigate} title="Last event">
              <SkipForward size={10} />
            </button>
            {/* item 206: repeat at far right — separated from play by speed controls to prevent accidental clicks */}
            <button
              className={`dtl-btn dtl-repeat-btn${isSingleEventRepeatEnabled ? ' dtl-active' : ''}`}
              onClick={onToggleRepeat}
              onPointerDown={(e) => e.stopPropagation()}
              title={isSingleEventRepeatEnabled ? 'Loop: on — click to disable' : 'Loop: off — click to enable'}
            >
              <Repeat size={10} />
            </button>
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
          {/* White vertical bar playhead — absolute on zone so it spans full section height (item 138) */}
          <div
            className="dtl-anim-playhead"
            style={{ left: `${stepScrubProgress}%` }}
          />
          {/* item 154: fill bar that grows 0→100% and fades out during delay phase */}
          <div
            className={`dtl-anim-fill${isInDelayPhase ? ' dtl-anim-fill--fading' : ''}`}
            style={{ width: `${stepScrubProgress}%`, '--delay-ms': `${delayPhaseMs}ms` }}
          />
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
              className={`dtl-btn${isDetailOpen ? ' dtl-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleDetail(); }}
              title={isDetailOpen ? 'Hide detail panel' : 'Show detail panel'}
            >▤</button>
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
          {/* item 180: toggle to enable/disable drag-to-undock behavior */}
          {!isTimelineUndocked && onUndockTimeline && (
            <button
              className={`dtl-btn dtl-undock-toggle${undockEnabled ? ' dtl-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleUndockEnabled(); }}
              title={undockEnabled ? 'Drag-up to undock: ON — click to disable' : 'Drag-up to undock: OFF — click to enable'}
            >⤢</button>
          )}
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

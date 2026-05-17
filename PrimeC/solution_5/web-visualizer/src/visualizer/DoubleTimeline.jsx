import React, { useRef, useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  Play, Pause, SkipBack, StepBack, StepForward, SkipForward, Minus, Plus,
  PanelLeft, PanelBottom, PanelRight, Repeat,
} from '../components/Icons.jsx';
import { usePlaybackContext } from '../contexts/PlaybackContext';

const MIN_DETAIL_HEIGHT = 180;
const MAX_DETAIL_HEIGHT = 700;

/** item 321: parse #rrggbb → [r, g, b] */
function hexToRgb(hex) {
  const m = (hex || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [180, 180, 180];
}

function parseInspectableUnitFromAnnotation(annotation) {
  const text = String(annotation || '');
  const patterns = [
    { type: 'cacheline', label: 'cache line', regex: /\bcache\s*line\s*#?\s*(\d+)\b/i },
    { type: 'cacheline', label: 'cacheline', regex: /\bcacheline\s*#?\s*(\d+)\b/i },
    { type: 'byte', label: 'byte', regex: /\bbyte\s*#?\s*(\d+)\b/i },
    { type: 'group', label: 'group', regex: /\bgroup\s*#?\s*(\d+)\b/i },
    { type: 'uint32', label: 'uint32', regex: /\buint32\s*#?\s*(\d+)\b/i },
    { type: 'uint64', label: 'uint64', regex: /\buint64\s*#?\s*(\d+)\b/i },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    return {
      type: pattern.type,
      index: Number(match[1]),
      title: `Inspect ${pattern.label} ${match[1]}`,
    };
  }

  return null;
}

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
  // item 321: timeline strip colors
  timelineColors = { events: '#b87333', animation: '#3a8cb8' },
  // item 322/323: floater zone background and center dragger color
  // item 342: unified glass CSS variable for the undocked container background
  floaterBg    = '#0a0a0a',
  draggerColor = '#481c20',
  // item 342: per-preset zone background tint (replaces floaterBg-derived zone bg)
  timelineBg   = null,
  // item 342: user-adjustable zone background opacity (0.05–0.95)
  zoneBgOpacity = 0.45,
  onInspectAnnotationUnit,
  // item 348: reveal current step in events panel (open + scroll to center)
  onRevealCurrentStepInPanel,
  // item 424: repeat mode dragger on animation timeline
  isRepeatMode = false,
  onRepeatModeChange,
  repeatStartPct = 0,
  onRepeatStartPctChange,
  // item 433: split repeat handle into start + end handles via long press
  isRepeatSplit = false,
  onRepeatSplitChange,
  repeatEndPct = 100,
  onRepeatEndPctChange,
  // item 458: delay between events (ms) — used to scale the ticker animation speed
  delayBetweenEvents = 2000,
  // item 485: skip empty events when navigating with < > buttons
  isSkipNoChangeEvents = false,
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

  // item 306: navigation direction for slide animation
  // item 458: ticker animation — prev content exits, new content enters
  const [navDir, setNavDir] = useState(null);  // null | 'next' | 'prev'
  const prevNavStepRef = useRef(null);
  const navDirTimerRef = useRef(null);
  const [prevTicker, setPrevTicker] = useState(null);  // { title, annotation } during nav transition
  const prevTitleRef = useRef('');      // holds previous step's title for exit animation
  const prevAnnotationRef = useRef(''); // holds previous step's annotation for exit animation
  // tickerMs: animation duration scales with delay between events (item 458)
  const tickerMs = Math.max(120, Math.min(350, (delayBetweenEvents || 2000) * 0.35));
  const tickerMsRef = useRef(tickerMs);
  tickerMsRef.current = tickerMs;  // updated every render
  useEffect(() => {
    if (prevNavStepRef.current === null) { prevNavStepRef.current = currentStep; return; }
    if (currentStep === prevNavStepRef.current) return;
    const dir = currentStep > prevNavStepRef.current ? 'next' : 'prev';
    prevNavStepRef.current = currentStep;
    // Capture old title/annotation for exit animation (prevTitleRef holds the PREVIOUS render's value
    // because the capture effect declared later in the function runs AFTER this effect in the same commit)
    setPrevTicker({ title: prevTitleRef.current, annotation: prevAnnotationRef.current });
    setNavDir(dir);
    if (navDirTimerRef.current) clearTimeout(navDirTimerRef.current);
    navDirTimerRef.current = setTimeout(() => { setNavDir(null); setPrevTicker(null); }, tickerMsRef.current);
  }, [currentStep]);
  useEffect(() => () => { if (navDirTimerRef.current) clearTimeout(navDirTimerRef.current); }, []);

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
  // item 214: undocking is always enabled — no toggle needed
  const undockEnabled = true;

  // item 219: focus mode — 'events' | 'animation'
  // Switches which timeline the center controls affect and adds visual highlight.
  const [focusMode, setFocusMode] = useState('events');

  // item 310: track whether a drag happened during the last center-zone pointer-down
  // so the click handler can tell a drag apart from a plain click.
  const centerWasDraggedRef = useRef(false);

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

  // item 240: detect events with no animation content (no changed bits, no mask data)
  const isEmptyEvent = currentStepData != null && (
    !(Number(currentStepData.numChanged) > 0) &&
    !(currentStepData.changedBits?.length > 0) &&
    !(currentStepData.maskWriteOrderWords?.length > 0)
  );

  // Draw waveform on canvas whenever size or data changes
  const drawWave = useCallback(() => {
    const canvas = waveCanvasRef.current;
    // item 291: measure the active area (inset past the toggle button) not the full zone
    const activeArea = waveActiveAreaRef.current || waveContainerRef.current;
    if (!canvas || !activeArea) return;
    // item 351: use layout dimensions (offsetWidth/offsetHeight, unaffected by CSS transforms)
    // instead of getBoundingClientRect() so the zone's scaleY(1.3) zoom transform is not
    // applied twice — once when we size the canvas and again by the parent's CSS scale.
    const width = activeArea.offsetWidth;
    const height = activeArea.offsetHeight;
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
        // item 340: use CSS variable so light-theme presets can override the active bar colour
        const activeColor = getComputedStyle(canvas).getPropertyValue('--dtl-chart-active-color').trim() || '#ffffff';
        ctx.fillStyle = activeColor;
      } else if (isPast) {
        // item 321/340: use a brightened events color (mix toward white) for better contrast on dark presets
        // item 461: slightly dimmed to 0.70 so progress stands out against the more visible inactive bars
        const [r, g, b] = hexToRgb(timelineColors?.events);
        const pr = Math.round(r + (255 - r) * 0.35);
        const pg = Math.round(g + (255 - g) * 0.35);
        const pb = Math.round(b + (255 - b) * 0.35);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},0.70)`;
      } else {
        // item 321/340: future bars — brightened color at lower opacity
        // item 461: increased to 0.55 so the unplayed portion of the events timeline has more visible color
        const [r, g, b] = hexToRgb(timelineColors?.events);
        const pr = Math.round(r + (255 - r) * 0.35);
        const pg = Math.round(g + (255 - g) * 0.35);
        const pb = Math.round(b + (255 - b) * 0.35);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},0.55)`;
      }
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.round(h) || 1);
    }
    // item 288: scrubber is now a separate pill div overlay — no canvas line needed
  }, [barHeights, currentStep, timelineColors]);

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
  isAnimPlayingRef.current = (playing || isStepAnimRunning) && !isAnimationReplayPaused;
  // Ref so repeat-handle handler can check playhead proximity without a stale closure
  const stepScrubProgressRef = useRef(stepScrubProgress);
  stepScrubProgressRef.current = stepScrubProgress;
  // item 420/423: stable refs for detail panel state — needed inside drag callback closure
  const isDetailOpenRef = useRef(isDetailOpen);
  isDetailOpenRef.current = isDetailOpen;
  const totalDetailHeightRef = useRef(totalDetailHeight);
  totalDetailHeightRef.current = totalDetailHeight;
  const isDetailPanelFloatingRef = useRef(isDetailPanelFloating);
  isDetailPanelFloatingRef.current = isDetailPanelFloating;

  // item 420/423: when the detail panel opens while the timeline is floating, push the
  // timeline up so it stays above the panel rather than being covered by it.
  useEffect(() => {
    if (!isTimelineUndocked || !isDetailOpen || isDetailPanelFloating) return;
    const dh = totalDetailHeight;
    if (!dh || dh <= 0) return;
    const panelH = containerRef.current?.getBoundingClientRect().height || 120;
    const maxY = window.innerHeight - dh - panelH - 8;
    if (undockPosRef.current.y > maxY) {
      const newY = Math.max(8, maxY);
      undockPosRef.current = { ...undockPosRef.current, y: newY };
      setUndockPos((prev) => ({ ...prev, y: newY }));
    }
  }, [isDetailOpen, isTimelineUndocked, isDetailPanelFloating, totalDetailHeight]);

  // Ref: true while the repeat handle is being dragged — gates zone pointer handlers
  const isRepeatDraggingRef = useRef(false);
  // item 437: true if the repeat handle was dragged since last pointerdown — suppresses onClick toggle
  const repeatHandleWasDraggedRef = useRef(false);
  // item 433: long-press timer ref for splitting the repeat handle
  const repeatLongPressTimerRef = useRef(null);
  // item 424: stable ref for repeatStartPct (used in drag callback)
  const repeatStartPctRef = useRef(repeatStartPct);
  repeatStartPctRef.current = repeatStartPct;
  // item 433: stable refs for split state
  const repeatEndPctRef = useRef(repeatEndPct);
  repeatEndPctRef.current = repeatEndPct;
  const isRepeatSplitRef = useRef(isRepeatSplit);
  isRepeatSplitRef.current = isRepeatSplit;
  // Latest pointer X during a wave drag — the RAF always reads this so it uses
  // the most recent position even when intermediate pointer events are coalesced.
  const waveLatestClientXRef = useRef(null);
  const waveSeek = useCallback((e) => {
    const canvas = waveCanvasRef.current;
    if (!canvas || steps.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // item 289: map fraction to zoomed range
    const { start: zStart, end: zEnd } = waveZoomRangeRef.current;
    const mappedFrac = zStart + frac * (zEnd - zStart);
    goToStep(Math.round(mappedFrac * (steps.length - 1)), { scrub: true });
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
    // Always track the latest pointer position so the RAF uses the most recent
    // coordinates even when high-frequency events are coalesced (fixes lag).
    waveLatestClientXRef.current = e.clientX;
    if (waveRafRef.current !== null) return;  // already scheduled
    waveRafRef.current = requestAnimationFrame(() => {
      waveRafRef.current = null;
      const clientX = waveLatestClientXRef.current;
      if (clientX === null) return;
      const canvas = waveCanvasRef.current;
      if (!canvas || steps.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // item 289: map fraction to zoomed range
      const { start: zStart, end: zEnd } = waveZoomRangeRef.current;
      const mappedFrac = zStart + frac * (zEnd - zStart);
      goToStep(Math.round(mappedFrac * (steps.length - 1)), { scrub: true });
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
      // item 423: dock when dragged into the detail panel area (not just viewport bottom)
      const panelH = containerRef.current?.getBoundingClientRect().height || 120;
      const dh = totalDetailHeightRef.current;
      const touchBoundary = (isDetailOpenRef.current && !isDetailPanelFloatingRef.current && dh > 0)
        ? window.innerHeight - dh
        : window.innerHeight;
      if (newPos.y + panelH >= touchBoundary) {
        docked = true;
        triggerDockAnimation();
        return;
      }
      undockPosRef.current = newPos;
      setUndockPos({ ...newPos });
      const gap = window.innerHeight - (newPos.y + panelH);
      preferredBottomGapRef.current = Math.max(8, Math.min(window.innerHeight * 0.8, gap));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [isTimelineUndocked, onDockTimeline]);

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
    // item 465: when detail panel is open and docked, animate to the position just above it
    const detailH = isDetailPanelFloatingRef.current ? 0 : (totalDetailHeightRef.current || 0);
    const ty = Math.max(0, window.innerHeight - panelH - detailH);
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
  }, [onDockTimeline, getFloatingSideInsets]);

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
      const newPos = {
        x: Math.max(insets.left, Math.min(insets.right - undockSizeRef.current.width, undockPosRef.current.x + dx)),
        y: Math.max(0, undockPosRef.current.y + dy),
      };
      if (newPos.y + panelH >= window.innerHeight) {
        docked = true;
        triggerDockAnimation();
        return;
      }
      undockPosRef.current = newPos;
      setUndockPos({ ...newPos });
      const gap = window.innerHeight - (newPos.y + panelH);
      preferredBottomGapRef.current = Math.max(8, Math.min(window.innerHeight * 0.8, gap));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [isTimelineUndocked, undockEnabled, onUndockTimeline, splitFraction, triggerDockAnimation, getFloatingSideInsets]);

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

    if (restoreBottom) {
      nextY = window.innerHeight - panelH - preferredBottomGapRef.current;
    }

    nextY = Math.max(8, Math.min(window.innerHeight - panelH - 8, nextY));

    const gap = window.innerHeight - (nextY + panelH);
    preferredBottomGapRef.current = Math.max(8, Math.min(window.innerHeight * 0.8, gap));

    if (Math.abs(nextW - undockSizeRef.current.width) > 0.5) {
      undockSizeRef.current = { ...undockSizeRef.current, width: nextW };
      setUndockSize((prev) => ({ ...prev, width: nextW }));
    }

    if (Math.abs(nextX - undockPosRef.current.x) > 0.5 || Math.abs(nextY - undockPosRef.current.y) > 0.5) {
      const nextPos = { x: nextX, y: nextY };
      undockPosRef.current = nextPos;
      setUndockPos(nextPos);
    }
  }, [isTimelineUndocked, getFloatingSideInsets]);

  useEffect(() => {
    if (!isTimelineUndocked || typeof window === 'undefined') return;

    adjustFloatingTimelineBounds();

    const onResize = () => adjustFloatingTimelineBounds();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isTimelineUndocked, isEventsPanelCollapsed, isSettingsCollapsed, adjustFloatingTimelineBounds]);

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
        centerWasDraggedRef.current = true;  // item 310: flag for click handler
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

  // item 310: click left half of dragger → events focus; click right half → animation focus
  const handleCenterZoneClick = useCallback((e) => {
    if (centerWasDraggedRef.current) { centerWasDraggedRef.current = false; return; }
    if (e.target.closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setFocusMode((e.clientX - rect.left) < rect.width / 2 ? 'events' : 'animation');
  }, []);
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
    // item 439: if released beyond the repeat end boundary, snap back to the limit
    if (isRepeatMode) {
      const el = animActiveAreaRef.current || animZoneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const { start: zStart, end: zEnd } = animZoomRangeRef.current;
      const mappedPercent = zStart + frac * (zEnd - zStart);
      // Non-split: single handle at repeatStartPct is the end stop
      // Split: end handle at repeatEndPct is the end stop
      const endLimit = isRepeatSplit ? repeatEndPct : repeatStartPct;
      if (mappedPercent > endLimit) {
        setStepScrubProgress?.(endLimit);
        seekStepAnimation?.(endLimit / 100);
      }
    }
  }, [isScrubbingTopRef, animSeek, isRepeatMode, isRepeatSplit, repeatEndPct, repeatStartPct, seekStepAnimation, setStepScrubProgress]);

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

  // item 424: repeat handle drag — sets the loop start point on the animation timeline
  const handleRepeatHandlePointerDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    isRepeatDraggingRef.current = true;
    repeatHandleWasDraggedRef.current = false; // item 437: reset drag flag on each pointerdown
    const downX = e.clientX;

    // item 433: long press (500ms) splits the single handle into start+end handles
    repeatLongPressTimerRef.current = setTimeout(() => {
      repeatLongPressTimerRef.current = null;
      if (!isRepeatSplitRef.current) {
        const startPct = repeatStartPctRef.current;
        const newEndPct = Math.min(100, startPct + 20);
        onRepeatSplitChange?.(true);
        onRepeatEndPctChange?.(newEndPct);
        // item 447: mark as "dragged" so the subsequent pointerup→click doesn't toggle repeat mode
        repeatHandleWasDraggedRef.current = true;
      }
    }, 500);

    const activeArea = animActiveAreaRef.current;
    const onMove = (ev) => {
      // item 437: mark as dragged if pointer moved more than 3px
      if (!repeatHandleWasDraggedRef.current && Math.abs(ev.clientX - downX) > 3) {
        repeatHandleWasDraggedRef.current = true;
      }
      // item 433: any movement cancels the long-press timer
      if (repeatLongPressTimerRef.current) {
        clearTimeout(repeatLongPressTimerRef.current);
        repeatLongPressTimerRef.current = null;
      }
      if (!activeArea) return;
      const rect = activeArea.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      onRepeatStartPctChange?.(pct);
    };
    const onUp = () => {
      // item 433: cancel long-press if pointer lifted before 500ms
      if (repeatLongPressTimerRef.current) {
        clearTimeout(repeatLongPressTimerRef.current);
        repeatLongPressTimerRef.current = null;
      }
      isRepeatDraggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [onRepeatStartPctChange, onRepeatSplitChange, onRepeatEndPctChange]);

  // item 433: drag handler for the repeat end handle (only visible when split)
  const handleRepeatEndHandlePointerDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    isRepeatDraggingRef.current = true;
    const activeArea = animActiveAreaRef.current;
    const onMove = (ev) => {
      if (!activeArea) return;
      const rect = activeArea.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      // item 433: if end handle dragged within 2% of start, merge handles
      if (Math.abs(pct - repeatStartPctRef.current) < 2) {
        onRepeatSplitChange?.(false);
      } else {
        onRepeatEndPctChange?.(pct);
      }
    };
    const onUp = () => {
      isRepeatDraggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [onRepeatEndPctChange, onRepeatSplitChange]);

  const isAnimPlaying = (playing || isStepAnimRunning) && !isAnimationReplayPaused;
  const stepCount = steps.length;
  const canNavigate = stepCount > 0 && !exporting;
  const isInDelayPhase = delayPhaseMs > 0;

  // item 485: find the nearest step with animation content when skipping
  const findPrevStepWithChanges = useCallback((fromIndex) => {
    for (let i = fromIndex - 1; i >= 0; i--) {
      const s = steps[i];
      if (s && (s.changedBits?.length > 0 || s.maskWriteOrderWords?.length > 0)) return i;
    }
    return -1;
  }, [steps]);
  const findNextStepWithChanges = useCallback((fromIndex) => {
    for (let i = fromIndex + 1; i < steps.length; i++) {
      const s = steps[i];
      if (s && (s.changedBits?.length > 0 || s.maskWriteOrderWords?.length > 0)) return i;
    }
    return -1;
  }, [steps]);

  const annotationText = currentStepData?.annotation || '';
  const inspectableAnnotationUnit = useMemo(() => parseInspectableUnitFromAnnotation(annotationText), [annotationText]);

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
  // item 444: active range bounds and active fill width for two-color progress bar
  const animActiveRangeStartRaw = isRepeatMode && isRepeatSplit ? repeatStartPct : 0;
  const animActiveRangeEndRaw   = isRepeatMode ? (isRepeatSplit ? repeatEndPct : repeatStartPct) : 100;
  const toAnimDisplayPct = (pct) =>
    animIsZoomed && animZoomSpan > 0
      ? Math.max(0, Math.min(100, ((pct - animZoomRange.start) / animZoomSpan) * 100))
      : pct;
  const animRangeStartDisplayPct = toAnimDisplayPct(animActiveRangeStartRaw);
  const animRangeEndDisplayPct   = toAnimDisplayPct(animActiveRangeEndRaw);
  const animRangeWidthDisplayPct = Math.max(0, animRangeEndDisplayPct - animRangeStartDisplayPct);
  // Active (bright) portion: from range start to playhead, clamped within range
  const animActiveFillWidthPct = Math.max(0, Math.min(animRangeWidthDisplayPct, animPlayheadPct - animRangeStartDisplayPct));
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
  // item 459: unified play/pause — events mode and repeat mode both use handlePlayPause;
  //           only fall back to handleStepAnimToggle for standalone (non-events) animation.
  const isAnyPlaying = playing || isAnimPlaying;
  const handleMainPlayClick = useCallback(() => {
    if (playing || isAnimationReplayPaused) {
      handlePlayPause();  // pause/resume event-to-event playback (also stops animation via globalPaused)
    } else if (isStepAnimRunning) {
      handleStepAnimToggle?.();  // pause standalone animation (selected-events auto-loop)
    } else {
      handlePlayPause();  // start playing from playhead position
    }
  }, [playing, isAnimationReplayPaused, isStepAnimRunning, handleStepAnimToggle, handlePlayPause]);

  // item 326: long-press on play button for settings removed — play is a simple click

  // item 181: FLIP animation when transitioning between docked ↔ undocked
  // item 465: useLayoutEffect so Phase 1 position is applied before the first paint,
  // preventing a flash of the element at the stale float position (bottom of screen).
  const prevUndockedRef = useRef(isTimelineUndocked);
  useLayoutEffect(() => {
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
        // item 465: when detail panel is open and docked, float just above it instead of behind it
        const detailH = isDetailPanelFloatingRef.current ? 0 : (totalDetailHeightRef.current || 0);
        const ty = Math.max(8, Math.round(window.innerHeight - 90 - 40 - detailH));
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
      `Event ${activeStep.stepId ?? currentStep}`,   // item 305: Event number first
      activeStep.prime != null ? `Prime ${activeStep.prime}` : null,
      activeStep.operation || null,
    ].filter(Boolean).join(' | ')
    : 'Event timeline';

  // item 458: capture current title/annotation for the ticker exit animation.
  // This effect runs AFTER the navDir effect (declared earlier in the function body),
  // so when navDir fires on a step change, prevTitleRef.current still holds the OLD value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    prevTitleRef.current = eventTitle;
    prevAnnotationRef.current = annotationText;
  });

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
        // item 462: leaving-fade overrides to 0 for exit animation.
        // item 475: zone opacity only applies to the background (via --dtl-zone-bg CSS var),
        // not the entire widget, so the text/controls stay fully visible.
        opacity: undockTransition === 'leaving-fade' ? 0 : undefined,
      }
    : { bottom: `${dockedBottom}px` }; // item 475: zone opacity only affects background, not widget

  // item 321: CSS variables derived from timelineColors for focus-state highlights
  const eventsRgb = hexToRgb(timelineColors?.events);
  const animRgb   = hexToRgb(timelineColors?.animation);
  const zoneRgb   = hexToRgb(timelineBg ?? floaterBg);    // item 322/323/342
  const dragRgb   = hexToRgb(draggerColor); // item 322/323
  const timelineCssVars = {
    '--dtl-events-color-bg': `rgba(${eventsRgb.join(',')}, 0.60)`,   // item 461: dimmed from 0.82 → 0.60
    '--dtl-events-color-hl': `rgba(${eventsRgb.join(',')}, 0.55)`,   // item 461: dimmed from 0.70 → 0.55
    '--dtl-events-color-bg-dim': `rgba(${eventsRgb.join(',')}, 0.22)`,  // item 461: subtle tint for inactive zone
    '--dtl-anim-color-bg':   `rgba(${animRgb.join(',')},   0.60)`,   // item 461: dimmed from 0.82 → 0.60
    '--dtl-anim-color-hl':   `rgba(${animRgb.join(',')},   0.55)`,   // item 461: dimmed from 0.70 → 0.55
    '--dtl-anim-color-bg-dim': `rgba(${animRgb.join(',')},   0.22)`,  // item 461: subtle tint for inactive zone
    '--dtl-zone-bg':         `rgba(${zoneRgb.join(',')}, ${zoneBgOpacity})`,    // item 342: zone background from per-preset timelineBg
    '--dtl-dragger-color':   `rgba(${dragRgb.join(',')}, 0.88)`,    // item 322/323: dragger base color
    // item 340/343: override active chart bar colour for light-theme presets
    ...(timelineColors?.chartActive ? { '--dtl-chart-active-color': timelineColors.chartActive } : {}),
    // item 342: unified glass background for the entire floater (uses same base as zone but more opaque)
    '--dtl-floater-unified-bg': `rgba(${zoneRgb.join(',')}, 0.88)`,
    // item 419: text color for title bar and annotation text in floating timeline
    '--dtl-text-color': timelineColors?.textColor || '#e8e8e8',
    // item 458: ticker animation duration CSS variable (drives both exit and enter animations)
    '--ticker-ms': `${tickerMs}ms`,
  };
  const mergedContainerStyle = { ...containerStyle, ...timelineCssVars };

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
      className={`double-timeline${isCollapsed ? ' dtl-collapsed' : ''}${isDetailPanelFloating ? ' dtl-panel-floating' : ''}${isTimelineUndocked ? ' dtl-timeline-undocked' : ''}${!isTimelineUndocked ? ' dtl-undock-enabled' : ''}${focusMode === 'events' ? ' dtl-focus-events' : ' dtl-focus-animation'}${navDir ? ` dtl-nav-${navDir}` : ''}`}
      style={mergedContainerStyle}
      onPointerDown={handleContainerPointerDown}
    >
      {/* item 179: event title is full-width above the strip; transparent when docked, solid when undocked */}
      {/* item 207: title bar is a drag handle for undocking when docked */}
      <div className="dtl-event-title-bar" title={eventTitle} onPointerDown={handleTitleBarPointerDown}>
        {/* item 325: only the text slides; background stays fixed */}
        {/* item 458: exit span — overlays current text during navigation transition */}
        {prevTicker && (
          <span
            className={`dtl-title-text dtl-title-text-exit dtl-ticker-exit-${navDir || 'next'}`}
            aria-hidden="true"
          >
            {prevTicker.title}
          </span>
        )}
        {/* item 348: "Event N" part is a button that opens the events panel */}
        <span className="dtl-title-text">
          {activeStep ? (
            <>
              <button
                className="dtl-title-event-link"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRevealCurrentStepInPanel) {
                    // item 348: open panel AND scroll to+center the current event
                    onRevealCurrentStepInPanel();
                  } else if (isEventsPanelCollapsed && onToggleEventsPanel) {
                    onToggleEventsPanel();
                  }
                }}
                title="Scroll events panel to this event"
              >
                Event {activeStep.stepId ?? currentStep}
              </button>
              {activeStep.prime != null && ` | Prime ${activeStep.prime}`}
              {activeStep.operation && ` | ${activeStep.operation}`}
            </>
          ) : 'Event timeline'}
        </span>
      </div>
      <div className="dtl-strip">

        {/* LEFT: events waveform */}
        <div
          className={`dtl-zone dtl-wave-zone${waveIsZoomed ? ' dtl-wave-zoomed' : ''}`}
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
            {/* item 353: panel-toggle-arrow gives unified design across all panel toggles */}
            {onToggleEventsPanel && (
              <button
                className={`dtl-btn dtl-zone-toggle dtl-events-toggle panel-toggle-arrow${!isEventsPanelCollapsed ? ' dtl-active is-open' : ''}`}
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
              ><PanelLeft size={13} /></button>
            )}
            <span className="dtl-wave-label">Events</span>
            <span className="dtl-wave-counter">{currentStep}/{Math.max(0, stepCount - 1)}</span>
          </div>
        </div>

        {/* MIDDLE: transport + drag handle (item 131: entire zone is the drag handle) */}
        <div
          className="dtl-zone dtl-center-zone"
          onPointerDown={handleDividerPointerDown}
          onClick={handleCenterZoneClick}
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
              else if (canNavigate) {
                // item 485: skip to prev event with changes when skip-no-change is enabled
                if (isSkipNoChangeEvents) {
                  const target = findPrevStepWithChanges(currentStep);
                  if (target >= 0) goToStep(target);
                } else {
                  goToStep(currentStep - 1);
                }
              }
            }} disabled={!canNavigate} title={focusMode === 'animation' ? 'Animation back 10%' : (isSkipNoChangeEvents ? 'Previous event with changes' : 'Previous event')}>
              <StepBack size={10} />
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.max(1, Math.round(v / 1.25)))} disabled={exporting} title="Slower">
              <Minus size={9} />
            </button>
            {/* Main play button — items 123, 128, 216: unified play/pause for events + animation */}
            {/* item 241: dtl-repeat-on class added when repeat is active to show a visible indicator */}
            <button
              className={`dtl-btn dtl-play${isRepeatMode ? ' dtl-repeat-on' : ''}`}
              onClick={() => { if (!exporting && stepCount > 0) handleMainPlayClick(); }}
              disabled={exporting || stepCount === 0}
              title={isAnyPlaying ? 'Pause' : 'Play all events'}
            >
              {isAnyPlaying ? <Pause size={16} /> : <Play size={16} />}
              {/* item 429: repeat toggle button above the play button — click to disable repeat */}
              {isRepeatMode && (
                <button
                  type="button"
                  className="dtl-repeat-toggle-btn"
                  onClick={(e) => { e.stopPropagation(); onRepeatModeChange?.(false); }}
                  title="Repeat mode on — click to turn off"
                >
                  <Repeat size={7} />
                </button>
              )}
            </button>
            <button className="dtl-btn dtl-speed" onClick={() => setPlaySpeedPercent?.((v) => Math.min(1600, Math.round(v * 1.25)))} disabled={exporting} title="Faster">
              <Plus size={9} />
            </button>
            <button className="dtl-btn" onClick={() => {
              if (focusMode === 'animation') { const p = Math.min(100, stepScrubProgress + 10); setStepScrubProgress(p); seekStepAnimation?.(p / 100); }
              else if (canNavigate) {
                // item 485: skip to next event with changes when skip-no-change is enabled
                if (isSkipNoChangeEvents) {
                  const target = findNextStepWithChanges(currentStep);
                  if (target >= 0) goToStep(target);
                } else {
                  goToStep(currentStep + 1);
                }
              }
            }} disabled={!canNavigate} title={focusMode === 'animation' ? 'Animation forward 10%' : (isSkipNoChangeEvents ? 'Next event with changes' : 'Next event')}>
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
          className={`dtl-zone dtl-anim-zone${animIsZoomed ? ' dtl-anim-zoomed' : ''}`}
          style={{ flex: `${1 - splitFraction} 1 0`, minWidth: 40 }}
          onPointerDown={handleAnimPointerDown}
          onPointerMove={handleAnimPointerMove}
          onPointerUp={handleAnimPointerUp}
          onPointerCancel={() => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; }}
          title="Click or drag to see animation progress"
        >
          {/* item 291: active area — inset past the settings toggle on the right */}
          <div className="dtl-anim-active-area" ref={animActiveAreaRef}>
            {/* item 289: use zoom-aware position */}
            {/* item 303: during empty event, CSS animation drives left — no inline style */}
            {animPlayheadVisible && (
              <div
                className={`dtl-anim-playhead${isEmptyEvent && playing ? ' dtl-anim-playhead--empty' : ''}`}
                style={isEmptyEvent && playing ? undefined : { left: `${Math.max(0, Math.min(100, animPlayheadPct))}%` }}
              />
            )}
            {/* item 154: fill bar that grows 0→100% and fades out during delay phase */}
            {/* item 240: empty event — same bar but CSS-animated left-fill then fade */}
            {/* item 289: fill bar is also zoom-aware */}
            {/* item 444: inactive background — covers the full active range, faded color */}
            <div
              className="dtl-anim-fill"
              style={{
                left: `${animRangeStartDisplayPct}%`,
                width: `${animRangeWidthDisplayPct}%`,
                backgroundColor: `rgba(${animRgb[0]},${animRgb[1]},${animRgb[2]},0.25)`,  // item 459/461: more visible inactive track so progress stands out
              }}
            />
            {/* item 444: active fill — from range start to playhead, bright color; wipes during delay */}
            <div
              key={isEmptyEvent && playing ? `empty-${currentStep}` : (isInDelayPhase ? `delay-${currentStep}` : 'active')}
              className={`dtl-anim-fill-active${
                isEmptyEvent && playing
                  ? ' dtl-anim-fill--empty'
                  : isInDelayPhase ? ' dtl-anim-fill-active--fading' : ''
              }`}
              style={{
                left: `${animRangeStartDisplayPct}%`,
                width: `${animActiveFillWidthPct}%`,
                backgroundColor: `rgba(${animRgb[0]},${animRgb[1]},${animRgb[2]},0.80)`,  // item 459: bright fill for visibility
                '--delay-ms': `${delayPhaseMs}ms`,
              }}
            />
            {/* item 289: zoom range indicators when zoomed in on animation */}
            {animIsZoomed && (
              <div className="dtl-zoom-range-indicators">
                <span className="dtl-zoom-range-start">{parseFloat(animZoomRange.start.toFixed(1))}%</span>
                <span className="dtl-zoom-range-end">{parseFloat(animZoomRange.end.toFixed(1))}%</span>
              </div>
            )}
            {/* item 424: repeat mode dragger — sets loop-back point; click to toggle repeat on/off */}
            <div
              className={`dtl-repeat-handle${isRepeatMode ? ' dtl-repeat-handle--active' : ''}`}
              style={{ left: `${repeatStartPct}%` }}
              onPointerDown={handleRepeatHandlePointerDown}
              onClick={(e) => {
                e.stopPropagation();
                // item 437: suppress toggle when the handle was dragged
                if (repeatHandleWasDraggedRef.current) { repeatHandleWasDraggedRef.current = false; return; }
                onRepeatModeChange?.(!isRepeatMode);
              }}
              title={isRepeatMode
                ? `Loop from ${Math.round(repeatStartPct)}% — click to disable, long-press to set range`
                : `Click to enable loop from ${Math.round(repeatStartPct)}%, long-press to set range`}
            >
              <Repeat size={8} />
            </div>
            {/* item 433: split mode — range highlight + end handle */}
            {isRepeatMode && isRepeatSplit && (
              <>
                <div
                  className="dtl-repeat-range"
                  style={{ left: `${Math.min(repeatStartPct, repeatEndPct)}%`, width: `${Math.abs(repeatEndPct - repeatStartPct)}%` }}
                />
                <div
                  className="dtl-repeat-end-handle"
                  style={{ left: `${repeatEndPct}%` }}
                  onPointerDown={handleRepeatEndHandlePointerDown}
                  onClick={(e) => e.stopPropagation()}
                  title={`Loop end at ${Math.round(repeatEndPct)}% — drag to adjust, drag to start to merge`}
                >
                  <Repeat size={8} />
                </div>
              </>
            )}
          </div>
          {/* Header row: items 194, 195: ANIMATION centered, speed to its right */}
          <div className="dtl-anim-header">
            <div className="dtl-anim-header-left">
              <span className="dtl-wave-counter">{parseFloat(Number(stepScrubProgress).toFixed(1))}%</span>
            </div>
            {/* items 194, 195: ANIMATION label centered, speed to its right */}
            <div className="dtl-anim-center-group">
              {/* item 240: show NO CHANGES label when playing a step with no animation */}
              {isEmptyEvent && playing ? (
                <span className="dtl-no-changes-label">NO CHANGES — NO ANIMATION</span>
              ) : (
                <>
                  <span className="dtl-wave-label dtl-anim-label">Animation</span>
                  {playSpeedPercent != null && (
                    <span className="dtl-anim-speed-group">
                      <span className="dtl-anim-speed-label-text">speed</span>
                      <span className="dtl-anim-speed">{playSpeedPercent}%</span>
                    </span>
                  )}
                </>
              )}
            </div>
            {/* item 138: stop propagation so toggle clicks don't trigger a seek */}
            <div className="dtl-anim-header-right" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onPointerCancel={(e) => e.stopPropagation()}>
              {/* item 152/159: right arrow toggles the settings panel (right sidebar) */}
              {/* item 353: panel-toggle-arrow gives unified design across all panel toggles */}
              {onToggleSettingsPanel && (
                <button
                  className={`dtl-btn dtl-zone-toggle dtl-anim-toggle panel-toggle-arrow${!isSettingsCollapsed ? ' dtl-active is-open' : ''}`}
                  onClick={onToggleSettingsPanel}
                  title={isSettingsCollapsed ? 'Show settings panel' : 'Hide settings panel'}
                ><PanelRight size={13} /></button>
              )}
            </div>
          </div>
          <div className="dtl-anim-track" />
        </div>

      </div>
      {/* item 179: annotation strip below the timelines, above the detail body */}
      <div className="dtl-annotation-row">
        {/* item 324: always reserve 2-line height; when empty, hide background */}
        {/* item 325: only the text slides; background stays fixed */}
        <div
          className={`dtl-annotation-bar${annotationText ? '' : ' dtl-annotation-empty'}${inspectableAnnotationUnit ? ' dtl-annotation-clickable' : ''}`}
          title={inspectableAnnotationUnit ? `${annotationText}\n\n${inspectableAnnotationUnit.title}` : annotationText}
          onClick={inspectableAnnotationUnit && onInspectAnnotationUnit ? (e) => {
            e.stopPropagation();
            onInspectAnnotationUnit({ type: inspectableAnnotationUnit.type, index: inspectableAnnotationUnit.index });
          } : undefined}
        >
          {/* item 458: exit span — overlays current annotation during navigation transition */}
          {prevTicker && (
            <span
              className={`dtl-annotation-text dtl-annotation-text-exit dtl-ticker-exit-${navDir || 'next'}`}
              aria-hidden="true"
            >
              {prevTicker.annotation}
            </span>
          )}
          <span className="dtl-annotation-text">{annotationText}</span>
        </div>
        <div className="dtl-center-actions dtl-annotation-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button className="dtl-btn dtl-anim-play" onClick={handleStepAnimToggle} disabled={exporting} title={isAnimPlaying ? 'Pause animation' : 'Play animation'}>
            {isAnimPlaying ? <Pause size={10} /> : <Play size={10} />}
          </button>
          {/* item 200: detail panel toggle — shown when docked or undocked (item 420) */}
          {/* item 353: panel-toggle-arrow gives unified design across all panel toggles */}
          {onToggleDetail && (
            <button
                className={`dtl-btn dtl-zone-toggle dtl-detail-toggle panel-toggle-arrow${isDetailOpen ? ' dtl-active is-open' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleDetail(); }}
              title={isDetailOpen ? 'Hide detail panel' : 'Show detail panel'}
              ><PanelBottom size={13} /></button>
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

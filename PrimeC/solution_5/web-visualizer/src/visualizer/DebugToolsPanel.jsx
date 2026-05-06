import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseAppliedRotateAngles } from '../lib/canvasProjection';

const EMPTY_SNAPSHOT = {
  fps: 0,
  avgMs: 0,
  latestMs: 0,
  maxMs: 0,
  sampleCount: 0,
  budgetMs: 16.67,
  frameTimes: [],
};

function readSnapshot(rendererRef) {
  const renderer = rendererRef.current;
  if (!renderer || typeof renderer.getPerformanceSnapshot !== 'function') {
    return EMPTY_SNAPSHOT;
  }
  return renderer.getPerformanceSnapshot();
}

function barClass(frameMs, budgetMs) {
  if (frameMs > budgetMs * 1.5) return 'debug-tools-bar high';
  if (frameMs > budgetMs) return 'debug-tools-bar warn';
  return 'debug-tools-bar ok';
}

function parseDebugSnapshotText(text) {
  if (!text || typeof text !== 'string') return null;
  const pickNumber = (label) => {
    const rx = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i');
    const m = rx.exec(text);
    return m ? Number(m[1]) : null;
  };
  const pickLayer = () => {
    const m = /Layer Mode\s*:\s*(normal|gl-only|overlays-only)/i.exec(text);
    return m ? m[1].toLowerCase() : null;
  };
  const zoom = pickNumber('Zoom');
  const panX = pickNumber('panX');
  const panY = pickNumber('panY');
  const rotateX = pickNumber('Rotate X \(applied\)');
  const rotateY = pickNumber('Rotate Y \(applied\)');
  const manualOffsetX = pickNumber('GL X Offset \(manual\)');
  const manualOffset = pickNumber('GL Y Offset \(manual\)') ?? pickNumber('GL Y Offset \(debug\)');
  const layerMode = pickLayer();
  const hasAny = [zoom, panX, panY, rotateX, rotateY, manualOffsetX, manualOffset].some((v) => Number.isFinite(v)) || !!layerMode;
  if (!hasAny) return null;
  return {
    zoom: Number.isFinite(zoom) ? zoom : undefined,
    panX: Number.isFinite(panX) ? panX : undefined,
    panY: Number.isFinite(panY) ? panY : undefined,
    rotateX: Number.isFinite(rotateX) ? rotateX : undefined,
    rotateY: Number.isFinite(rotateY) ? rotateY : undefined,
    manualOffsetX: Number.isFinite(manualOffsetX) ? manualOffsetX : undefined,
    manualOffsetY: Number.isFinite(manualOffset) ? manualOffset : undefined,
    layerMode: layerMode || undefined,
  };
}

const CALIBRATION_CASES = [
  { id: 'flat-base', title: 'Flat baseline', rotateX: 0, rotateY: 0 },
  { id: 'rx-18', title: 'RotateX 18', rotateX: 18, rotateY: 0 },
  { id: 'rx-32', title: 'RotateX 32', rotateX: 32, rotateY: 0 },
  { id: 'ry-18', title: 'RotateY 18', rotateX: 0, rotateY: 18 },
  { id: 'rx-24', title: 'RotateX 24', rotateX: 24, rotateY: 0 },
  { id: 'ry-24', title: 'RotateY 24', rotateX: 0, rotateY: 24 },
  { id: 'rxy-12-12', title: 'RotateX 12 / RotateY 12', rotateX: 12, rotateY: 12 },
  { id: 'rxy-16-8', title: 'RotateX 16 / RotateY 8', rotateX: 16, rotateY: 8 },
  { id: 'rxy-8-16', title: 'RotateX 8 / RotateY 16', rotateX: 8, rotateY: 16 },
  { id: 'rxy-28-4', title: 'RotateX 28 / RotateY 4', rotateX: 28, rotateY: 4 },
  { id: 'rxy-4-28', title: 'RotateX 4 / RotateY 28', rotateX: 4, rotateY: 28 },
  { id: 'rxy-6-24', title: 'RotateX 6 / RotateY 24', rotateX: 6, rotateY: 24 },
  { id: 'rxy-neg', title: 'RotateX -10 / RotateY -14', rotateX: -10, rotateY: -14 },
  { id: 'rx-45', title: 'RotateX 45', rotateX: 45, rotateY: 0 },
  { id: 'ry-32', title: 'RotateY 32', rotateX: 0, rotateY: 32 },
  { id: 'rxy-20-20', title: 'RotateX 20 / RotateY 20', rotateX: 20, rotateY: 20 },
];

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function buildCurrentCalibrationSnapshot({
  rendererRef,
  camera3DRef,
  zoomLevel,
  debugLayerMode,
  debugGlOffsetX,
  debugGlOffsetY,
}) {
  const rr = rendererRef?.current;
  const cam = camera3DRef?.current;
  return {
    zoom: Number.isFinite(zoomLevel) ? zoomLevel : undefined,
    panX: Number.isFinite(rr?.panX) ? rr.panX : undefined,
    panY: Number.isFinite(rr?.panY) ? rr.panY : undefined,
    rotateX: Number.isFinite(cam?.rotateX) ? cam.rotateX : undefined,
    rotateY: Number.isFinite(cam?.rotateY) ? cam.rotateY : undefined,
    layerMode: debugLayerMode || 'normal',
    manualOffsetX: Number.isFinite(debugGlOffsetX) ? debugGlOffsetX : 0,
    manualOffsetY: Number.isFinite(debugGlOffsetY) ? debugGlOffsetY : 0,
  };
}

function readBrowserZoomTelemetry() {
  const dpr = (typeof window !== 'undefined' && Number(window.devicePixelRatio)) || 1;
  const vvScaleRaw = (typeof window !== 'undefined' && window.visualViewport)
    ? Number(window.visualViewport.scale)
    : Number.NaN;
  return {
    devicePixelRatio: Number.isFinite(dpr) ? Number(dpr.toFixed(4)) : null,
    visualViewportScale: Number.isFinite(vvScaleRaw) ? Number(vvScaleRaw.toFixed(4)) : null,
  };
}

function CollapsibleSection({ title, defaultOpen = true, palette, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      style={{
        marginTop: '12px',
        paddingTop: '8px',
        borderTop: `1px solid ${palette.border}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: 0,
          margin: 0,
          border: 'none',
          background: 'transparent',
          color: palette.panelFg,
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span style={{ color: palette.subtle }}>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div style={{ marginTop: '6px' }}>{children}</div>}
    </section>
  );
}

export default function DebugToolsPanel({
  debugRefs = {},
  debugState = {},
  debugHandlers = {},
  debugConfig = {},
}) {
  const {
    rendererRef,
    glCanvasRef = null,
    glRendererRef = null,
    camera3DRef = null,
  } = debugRefs;

  const {
    camera3DTransform = 'none',
    zoomLevel = 1,
    glDebugInfo = null,
    theme = 'dark',
    debugLayerMode = 'normal',
    debugGlOffsetX = 0,
    debugGlOffsetY = 0,
    debugGlAutoOffsetY = 0,
    isDebugCalibrationMode = false,
  } = debugState;

  const {
    setDebugLayerMode = null,
    setDebugGlOffsetX = null,
    setDebugGlOffsetY = null,
    setIsDebugCalibrationMode = null,
    onApplyDebugSnapshot = null,
    onForceGlRedraw = null,
  } = debugHandlers;

  const {
    rightOffset = 8,
  } = debugConfig;

  const [snapshot, setSnapshot] = useState(() => readSnapshot(rendererRef));
  const [canvasCoords, setCanvasCoords] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [forceRedrawStatus, setForceRedrawStatus] = useState('');
  const [calibrationCaseIndex, setCalibrationCaseIndex] = useState(0);
  const [calibrationTargetViewport, setCalibrationTargetViewport] = useState({ width: 0, height: 0 });
  const [calibrationViewportStatus, setCalibrationViewportStatus] = useState('');
  const [calibrationRestoreSnapshot, setCalibrationRestoreSnapshot] = useState(null);
  const [calibrationCaseResults, setCalibrationCaseResults] = useState({});
  const [calibrationViewpoints, setCalibrationViewpoints] = useState([]);
  const [calibrationViewpointLabel, setCalibrationViewpointLabel] = useState('');

  // 'c' key copies to clipboard when the panel is visible
  const handleCopyDebugRef = useRef(null);

  useEffect(() => {
    setSnapshot(readSnapshot(rendererRef));
    const id = window.setInterval(() => {
      setSnapshot(readSnapshot(rendererRef));
    }, 250);
    return () => window.clearInterval(id);
  }, [rendererRef]);

  // Update canvas coordinates tracking
  useEffect(() => {
    const updateCanvasCoords = () => {
      if (!glCanvasRef?.current) {
        setCanvasCoords(null);
        return;
      }

      const glCanvas = glCanvasRef.current;
      const mainCanvas = rendererRef?.current?.canvas || null;
      const wrapperEl = glCanvas.parentElement;
      const glRect = glCanvas.getBoundingClientRect();
      const mainRect = mainCanvas ? mainCanvas.getBoundingClientRect() : null;

      // Calculate CSS size (GL canvas)
      const cssW = Math.round(glCanvas.offsetWidth);
      const cssH = Math.round(glCanvas.offsetHeight);

      // CSS display size of the main (Canvas2D) canvas — reveals any implicit scaling
      const mainOffsetW = mainCanvas ? mainCanvas.offsetWidth : null;
      const mainOffsetH = mainCanvas ? mainCanvas.offsetHeight : null;

      // Bit-0 canvas coordinate — compare vs GL to detect coordinate system mismatch
      let bit0X = null;
      let bit0Y = null;
      try {
        const rr = rendererRef?.current;
        if (rr && typeof rr.bitIndexToCanvas === 'function') {
          const p = rr.bitIndexToCanvas(0);
          bit0X = p?.x ?? null;
          bit0Y = p?.y ?? null;
        }
      } catch (_) { /* ignore */ }

      const glComputed = window.getComputedStyle(glCanvas);
      const wrapperComputed = wrapperEl ? window.getComputedStyle(wrapperEl) : null;

      setCanvasCoords({
        glLeft: Math.round(glRect.left),
        glTop: Math.round(glRect.top),
        glWidth: Math.round(glRect.width),
        glHeight: Math.round(glRect.height),
        mainLeft: mainRect ? Math.round(mainRect.left) : null,
        mainTop: mainRect ? Math.round(mainRect.top) : null,
        mainWidth: mainRect ? Math.round(mainRect.width) : null,
        mainHeight: mainRect ? Math.round(mainRect.height) : null,
        deltaLeft: mainRect ? Math.round(glRect.left - mainRect.left) : null,
        deltaTop: mainRect ? Math.round(glRect.top - mainRect.top) : null,
        deltaWidth: mainRect ? Math.round(glRect.width - mainRect.width) : null,
        deltaHeight: mainRect ? Math.round(glRect.height - mainRect.height) : null,
        mainOffsetW,
        mainOffsetH,
        bit0X,
        bit0Y,
        glInlineTransform: glCanvas.style.transform || '',
        glComputedTransform: glComputed.transform || 'none',
        wrapperComputedTransform: wrapperComputed?.transform || 'none',
        cssW,
        cssH,
      });
    };

    updateCanvasCoords();
    const resizeObs = new ResizeObserver(updateCanvasCoords);
    if (glCanvasRef?.current) {
      resizeObs.observe(glCanvasRef.current);
    }

    return () => resizeObs.disconnect();
  }, [glCanvasRef]);

  const frameTimes = snapshot.frameTimes || [];
  const budgetMs = snapshot.budgetMs || 16.67;
  const scaleMs = Math.max(snapshot.maxMs || 0, budgetMs * 1.5, 1);
  const bars = Array.from({ length: 60 }, (_, index) => (
    frameTimes[frameTimes.length - 60 + index] || 0
  ));

  const palette = useMemo(() => {
    const light = theme === 'light';
    return {
      panelBg: light ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 12, 15, 0.92)',
      panelFg: light ? '#17212b' : '#d9e0e8',
      border: light ? '#c7d1dc' : '#2b3138',
      sectionGl: light ? '#0c4a6e' : '#7fffb2',
      sectionCoords: light ? '#0b5f6e' : '#6fe8ff',
      subtle: light ? '#425161' : '#8a98a8',
      good: light ? '#0b6b2b' : '#6ee787',
      bad: light ? '#b42318' : '#ff6b6b',
      buttonBg: light ? '#f4f7fa' : '#161616',
      buttonFg: light ? '#13263a' : '#d9d9d9',
      buttonBorder: light ? '#aebdcb' : '#3a3a3a',
    };
  }, [theme]);

  const cameraState = useMemo(() => {
    const cam = camera3DRef?.current;
    const applied = parseAppliedRotateAngles(camera3DTransform);
    return {
      rotateX: Number.isFinite(cam?.rotateX) ? cam.rotateX : 0,
      rotateY: Number.isFinite(cam?.rotateY) ? cam.rotateY : 0,
      appliedRotateX: Number.isFinite(applied.rotateX) ? applied.rotateX : 0,
      appliedRotateY: Number.isFinite(applied.rotateY) ? applied.rotateY : 0,
    };
  }, [camera3DRef, camera3DTransform, snapshot.sampleCount, canvasCoords]);

  const currentViewport = useMemo(() => ({
    width: Number(glDebugInfo?.viewportWidth) || window.innerWidth || 0,
    height: Number(glDebugInfo?.viewportHeight) || window.innerHeight || 0,
  }), [glDebugInfo?.viewportWidth, glDebugInfo?.viewportHeight]);

  useEffect(() => {
    if (!isDebugCalibrationMode) {
      setCalibrationTargetViewport((prev) => {
        const next = { width: currentViewport.width, height: currentViewport.height };
        if (prev.width === next.width && prev.height === next.height) return prev;
        return next;
      });
    }
  }, [currentViewport.width, currentViewport.height, isDebugCalibrationMode]);

  const buildDebugReport = useCallback(() => {
    const rr = rendererRef?.current;
    const gr = glRendererRef?.current;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rrPanX = rr?.panX ?? '?';
    const rrPanY = rr?.panY ?? '?';
    const rrPixelSize = rr?.pixelSize ?? '?';
    const rrZoom = rr?.zoom ?? '?';
    const rrCellSize = (rr?.pixelSize != null && rr?.zoom != null)
      ? (rr.pixelSize * rr.zoom).toFixed(4) : '?';
    const rrFrozenCl = rr?._frozenClPerVRow ?? '?';
    const rrLayoutAvailW = rr?.layoutAvailWidth ?? '?';
    const rrLayoutAvailH = rr?.layoutAvailHeight ?? '?';
    const rrCanvasW = rr?.canvas?.width != null ? rr.canvas.width : '?';
    const rrCanvasH = rr?.canvas?.height != null ? rr.canvas.height : '?';
    const rrCssW = rr?.canvasWidth != null ? Number(rr.canvasWidth).toFixed(2) : '?';
    const rrCssH = rr?.canvasHeight != null ? Number(rr.canvasHeight).toFixed(2) : '?';
    const rrDpr = rr?.canvasDpr ?? dpr;
    const grCssW = gr?._cssW ?? '?';
    const grCssH = gr?._cssH ?? '?';
    const grDpr = gr?._dpr ?? '?';
    const browserZoom = readBrowserZoomTelemetry();
    // Bit-0 diagnostic: Canvas2D computes bit0, GL re-derives it from (bit0 - pan) + pan
    const b0x = canvasCoords?.bit0X;
    const b0y = canvasCoords?.bit0Y;
    const b0xStr = b0x != null ? b0x.toFixed(2) : '?';
    const b0yStr = b0y != null ? b0y.toFixed(2) : '?';
    // Pan-stripped position that goes into the GL texture:
    const b0TexX = (b0x != null && rr?.panX != null) ? (b0x - (rr.panX || 0)).toFixed(2) : '?';
    const b0TexY = (b0y != null && rr?.panY != null) ? (b0y - (rr.panY || 0)).toFixed(2) : '?';
    const b0GlX = (b0x != null && rr?.panX != null)
      ? ((b0x - (rr.panX || 0)) + (rr.panX || 0)).toFixed(2)
      : '?';
    const b0GlY = (b0y != null && rr?.panY != null)
      ? ((b0y - (rr.panY || 0)) + (rr.panY || 0)).toFixed(2)
      : '?';
    const lines = [
      'GL MODE',
      `Mode: ${glDebugInfo?.mode ?? 'unknown'}`,
      `Reason: ${glDebugInfo?.modeReason ?? 'unknown'}`,
      `At Risk: ${glDebugInfo?.isAtRisk ? 'YES' : 'NO'}`,
      `Viewport: ${glDebugInfo?.viewportWidth ?? '?'} x ${glDebugInfo?.viewportHeight ?? '?'}`,
      `Canvas: ${glDebugInfo?.currentCssW ?? '?'} x ${glDebugInfo?.currentCssH ?? '?'} CSS`,
      `Backing: ${glDebugInfo?.currentBackingW ?? '?'} x ${glDebugInfo?.currentBackingH ?? '?'}`,
      `Max GL Dim: ${glDebugInfo?.maxGLDimension ?? '?'}`,
      `Effective Max Backing Dim: ${glDebugInfo?.effectiveMaxBackingDimension ?? '?'}`,
      `Direct Compositor Safe Dim: ${glDebugInfo?.directCompositorSafeDimension ?? '?'}`,
      `DPR: ${Number.isFinite(glDebugInfo?.devicePixelRatio) ? glDebugInfo.devicePixelRatio.toFixed(2) : '?'}`,
      `Browser Zoom DPR (window.devicePixelRatio): ${browserZoom.devicePixelRatio ?? '?'}`,
      `Browser Zoom Scale (visualViewport.scale): ${browserZoom.visualViewportScale ?? 'n/a'}`,
      `Zoom: ${Number.isFinite(zoomLevel) ? zoomLevel.toFixed(3) : '?'}`,
      `Rotate X (camera): ${cameraState.rotateX.toFixed(2)} deg`,
      `Rotate Y (camera): ${cameraState.rotateY.toFixed(2)} deg`,
      `Rotate X (applied): ${cameraState.appliedRotateX.toFixed(2)} deg`,
      `Rotate Y (applied): ${cameraState.appliedRotateY.toFixed(2)} deg`,
      `Calibration Mode: ${isDebugCalibrationMode ? 'ON' : 'OFF'}`,
      `Layer Mode: ${debugLayerMode}`,
      `GL X Offset (manual): ${Number.isFinite(debugGlOffsetX) ? debugGlOffsetX.toFixed(2) : debugGlOffsetX}`,
      `GL Y Offset (auto): ${Number.isFinite(debugGlAutoOffsetY) ? debugGlAutoOffsetY.toFixed(2) : debugGlAutoOffsetY}`,
      `GL Y Offset (manual): ${Number.isFinite(debugGlOffsetY) ? debugGlOffsetY.toFixed(2) : debugGlOffsetY}`,
      `GL Y Offset (total): ${Number.isFinite((debugGlAutoOffsetY || 0) + (debugGlOffsetY || 0)) ? ((debugGlAutoOffsetY || 0) + (debugGlOffsetY || 0)).toFixed(2) : '?'}`,
      'RENDERER STATE',
      `panX: ${typeof rrPanX === 'number' ? rrPanX.toFixed(2) : rrPanX}`,
      `panY: ${typeof rrPanY === 'number' ? rrPanY.toFixed(2) : rrPanY}`,
      `pixelSize: ${rrPixelSize}`,
      `zoom (rr): ${typeof rrZoom === 'number' ? rrZoom.toFixed(4) : rrZoom}`,
      `cellSize (px*zoom): ${rrCellSize}`,
      `frozenClPerVRow: ${rrFrozenCl}`,
      `layoutAvail (W x H): ${rrLayoutAvailW} x ${rrLayoutAvailH}`,
      `canvas.width: ${rrCanvasW}  canvas.height: ${rrCanvasH}`,
      `canvas CSS (logical): ${rrCssW} x ${rrCssH}`,
      `canvas DPR (renderer): ${typeof rrDpr === 'number' ? rrDpr.toFixed(2) : rrDpr}`,
      'GL WORKER STATE',
      `GL _cssW: ${grCssW}  _cssH: ${grCssH}  _dpr: ${typeof grDpr === 'number' ? grDpr.toFixed(2) : grDpr}`,
      'CANVAS COORDS',
      `GL Rect: (${canvasCoords?.glLeft ?? '?'}, ${canvasCoords?.glTop ?? '?'}) ${canvasCoords?.glWidth ?? '?'}x${canvasCoords?.glHeight ?? '?'}`,
      `Main Rect: (${canvasCoords?.mainLeft ?? '?'}, ${canvasCoords?.mainTop ?? '?'}) ${canvasCoords?.mainWidth ?? '?'}x${canvasCoords?.mainHeight ?? '?'}`,
      `Rect Delta (GL-Main): dx=${canvasCoords?.deltaLeft ?? '?'} dy=${canvasCoords?.deltaTop ?? '?'} dw=${canvasCoords?.deltaWidth ?? '?'} dh=${canvasCoords?.deltaHeight ?? '?'}`,
      `GL Inline Transform: ${canvasCoords?.glInlineTransform || 'none'}`,
      `GL Computed Transform: ${canvasCoords?.glComputedTransform || 'none'}`,
      `Wrapper Transform: ${canvasCoords?.wrapperComputedTransform || 'none'}`,
      `CSS Size: ${canvasCoords?.cssW ?? '?'} x ${canvasCoords?.cssH ?? '?'}`,
      `Main canvas offsetW/H: ${canvasCoords?.mainOffsetW ?? '?'} x ${canvasCoords?.mainOffsetH ?? '?'}`,
      'BIT-0 POSITION',
      `bit0 (Canvas2D): (${b0xStr}, ${b0yStr})`,
      `bit0 tex (b0 - pan): (${b0TexX}, ${b0TexY})`,
      `bit0 GL result (tex + pan): (${b0GlX}, ${b0GlY})`,
    ];
    return lines.join('\n');
  }, [rendererRef, glRendererRef, cameraState.rotateX, cameraState.rotateY, cameraState.appliedRotateX, cameraState.appliedRotateY, canvasCoords, glDebugInfo, zoomLevel, isDebugCalibrationMode, debugLayerMode, debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY]);

  const handleCopyDebug = useCallback(async () => {
    try {
      const text = buildDebugReport();
      await copyTextToClipboard(text);
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy failed');
    }
    window.setTimeout(() => setCopyStatus(''), 1200);
  }, [buildDebugReport]);

  const liveDebugReport = useMemo(() => buildDebugReport(), [buildDebugReport]);

  const applyImportedSnapshot = useCallback(() => {
    const parsed = parseDebugSnapshotText(importText);
    if (!parsed) {
      setImportStatus('No recognizable snapshot values found');
      return;
    }
    if (typeof onApplyDebugSnapshot !== 'function') {
      setImportStatus('Apply callback is unavailable');
      return;
    }
    const result = onApplyDebugSnapshot(parsed);
    if (result && result.ok === false) {
      setImportStatus(result.message || 'Failed to apply snapshot');
      return;
    }
    setImportStatus(result?.message || 'Snapshot applied');
  }, [importText, onApplyDebugSnapshot]);

  const startCalibrationMode = useCallback(() => {
    const restore = buildCurrentCalibrationSnapshot({
      rendererRef,
      camera3DRef,
      zoomLevel,
      debugLayerMode,
      debugGlOffsetX,
      debugGlOffsetY,
    });
    setCalibrationRestoreSnapshot(restore);
    setCalibrationCaseResults({});
    setCalibrationViewpoints([]);
    setCalibrationCaseIndex(0);
    setCalibrationViewpointLabel('');
    setCalibrationTargetViewport({ width: currentViewport.width, height: currentViewport.height });
    setIsDebugCalibrationMode?.(true);
    setDebugLayerMode?.('normal');
    setDebugGlOffsetX?.(0);
    setDebugGlOffsetY?.(0);
    const first = CALIBRATION_CASES[0];
    onApplyDebugSnapshot?.({ rotateX: first.rotateX, rotateY: first.rotateY, layerMode: 'normal', manualOffsetX: 0, manualOffsetY: 0 });
    setCalibrationViewportStatus('Calibration mode started');
  }, [rendererRef, camera3DRef, zoomLevel, debugLayerMode, debugGlOffsetX, debugGlOffsetY, currentViewport.width, currentViewport.height, setIsDebugCalibrationMode, setDebugLayerMode, setDebugGlOffsetX, setDebugGlOffsetY, onApplyDebugSnapshot]);

  const stopCalibrationMode = useCallback(() => {
    setIsDebugCalibrationMode?.(false);
    if (calibrationRestoreSnapshot && onApplyDebugSnapshot) {
      onApplyDebugSnapshot(calibrationRestoreSnapshot);
    }
    setCalibrationViewportStatus('Calibration mode ended and previous view restored');
  }, [setIsDebugCalibrationMode, calibrationRestoreSnapshot, onApplyDebugSnapshot]);

  const applyCalibrationCase = useCallback((index) => {
    const nextIndex = Math.max(0, Math.min(CALIBRATION_CASES.length - 1, index));
    const item = CALIBRATION_CASES[nextIndex];
    setCalibrationCaseIndex(nextIndex);
    setDebugLayerMode?.('normal');
    setDebugGlOffsetX?.(0);
    setDebugGlOffsetY?.(0);
    if (onApplyDebugSnapshot) {
      onApplyDebugSnapshot({ rotateX: item.rotateX, rotateY: item.rotateY, layerMode: 'normal', manualOffsetX: 0, manualOffsetY: 0 });
    }
    setCalibrationViewportStatus(`Applied case ${nextIndex + 1}: ${item.title}`);
  }, [setDebugLayerMode, setDebugGlOffsetX, setDebugGlOffsetY, onApplyDebugSnapshot]);

  const tryResizeViewport = useCallback(async () => {
    const targetW = Math.max(320, Math.round(calibrationTargetViewport.width || 0));
    const targetH = Math.max(240, Math.round(calibrationTargetViewport.height || 0));
    if (targetW <= 0 || targetH <= 0) {
      setCalibrationViewportStatus('Set a valid target viewport size first');
      return;
    }
    try {
      const outerTargetW = window.outerWidth + (targetW - window.innerWidth);
      const outerTargetH = window.outerHeight + (targetH - window.innerHeight);
      if (typeof window.resizeTo === 'function') {
        window.resizeTo(Math.max(320, outerTargetW), Math.max(240, outerTargetH));
        window.dispatchEvent(new Event('resize'));
        setCalibrationViewportStatus('Resize requested. If the browser blocks it, drag the window border until the delta is near zero and then commit the case.');
      } else {
        setCalibrationViewportStatus('This browser cannot resize windows programmatically. Drag the window border to the target viewport and then commit the case.');
      }
    } catch {
      setCalibrationViewportStatus('Window resize failed. Drag the window border manually to the target viewport and then commit the case.');
    }
  }, [calibrationTargetViewport.height, calibrationTargetViewport.width]);

  const buildCalibrationEntry = useCallback((kind, caseDef, label = '') => ({
    ...readBrowserZoomTelemetry(),
    kind,
    label: label || caseDef?.title || `Viewpoint ${calibrationViewpoints.length + 1}`,
    caseId: caseDef?.id || null,
    timestamp: new Date().toISOString(),
    targetViewport: { ...calibrationTargetViewport },
    viewport: { ...currentViewport },
    rotateX: Number(cameraState.appliedRotateX.toFixed(2)),
    rotateY: Number(cameraState.appliedRotateY.toFixed(2)),
    zoom: Number(Number.isFinite(zoomLevel) ? zoomLevel.toFixed(4) : 0),
    manualOffsetX: Number(Number(debugGlOffsetX || 0).toFixed(2)),
    manualOffsetY: Number(Number(debugGlOffsetY || 0).toFixed(2)),
    autoOffsetY: Number(Number(debugGlAutoOffsetY || 0).toFixed(2)),
    totalOffsetY: Number(Number((debugGlAutoOffsetY || 0) + (debugGlOffsetY || 0)).toFixed(2)),
    debugReport: buildDebugReport(),
  }), [calibrationTargetViewport, currentViewport, cameraState.appliedRotateX, cameraState.appliedRotateY, zoomLevel, debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY, buildDebugReport, calibrationViewpoints.length]);

  const commitCalibrationCase = useCallback((advance = false) => {
    const caseDef = CALIBRATION_CASES[calibrationCaseIndex];
    const entry = buildCalibrationEntry('case', caseDef);
    setCalibrationCaseResults((prev) => ({ ...prev, [caseDef.id]: entry }));
    setCalibrationViewportStatus(`Committed ${caseDef.title}`);
    if (advance && calibrationCaseIndex < CALIBRATION_CASES.length - 1) {
      applyCalibrationCase(calibrationCaseIndex + 1);
    }
  }, [calibrationCaseIndex, buildCalibrationEntry, applyCalibrationCase]);

  const recordCalibrationViewpoint = useCallback(() => {
    const label = calibrationViewpointLabel.trim() || `Viewpoint ${calibrationViewpoints.length + 1}`;
    const entry = buildCalibrationEntry('viewpoint', null, label);
    setCalibrationViewpoints((prev) => [...prev, entry]);
    setCalibrationViewpointLabel('');
    setCalibrationViewportStatus(`Recorded ${label}`);
  }, [buildCalibrationEntry, calibrationViewpointLabel, calibrationViewpoints.length]);

  const buildCalibrationReport = useCallback(() => {
    const reportBrowserZoom = readBrowserZoomTelemetry();
    const lines = [
      'GL CALIBRATION REPORT',
      `Generated: ${new Date().toISOString()}`,
      `Calibration target viewport: ${calibrationTargetViewport.width} x ${calibrationTargetViewport.height}`,
      `Current viewport: ${currentViewport.width} x ${currentViewport.height}`,
      `Browser Zoom DPR (window.devicePixelRatio): ${reportBrowserZoom.devicePixelRatio ?? '?'}`,
      `Browser Zoom Scale (visualViewport.scale): ${reportBrowserZoom.visualViewportScale ?? 'n/a'}`,
      '',
      'CALIBRATION CASES',
    ];
    CALIBRATION_CASES.forEach((item, index) => {
      const result = calibrationCaseResults[item.id];
      lines.push(`${index + 1}. ${item.title} (RotateX=${item.rotateX}, RotateY=${item.rotateY})`);
      if (!result) {
        lines.push('Status: not recorded');
        lines.push('');
        return;
      }
      lines.push(`Viewport: ${result.viewport.width} x ${result.viewport.height}`);
      lines.push(`Browser Zoom DPR/Scale: ${result.devicePixelRatio ?? '?'} / ${result.visualViewportScale ?? 'n/a'}`);
      lines.push(`Zoom: ${result.zoom}`);
      lines.push(`GL X Offset (manual): ${result.manualOffsetX}`);
      lines.push(`GL Y Offset (auto/manual/total): ${result.autoOffsetY} / ${result.manualOffsetY} / ${result.totalOffsetY}`);
      lines.push('');
    });
    if (calibrationViewpoints.length) {
      lines.push('EXTRA VIEWPOINTS');
      calibrationViewpoints.forEach((entry, index) => {
        lines.push(`${index + 1}. ${entry.label}`);
        lines.push(`Viewport: ${entry.viewport.width} x ${entry.viewport.height}`);
        lines.push(`Browser Zoom DPR/Scale: ${entry.devicePixelRatio ?? '?'} / ${entry.visualViewportScale ?? 'n/a'}`);
        lines.push(`RotateX/RotateY: ${entry.rotateX} / ${entry.rotateY}`);
        lines.push(`Zoom: ${entry.zoom}`);
        lines.push(`GL X Offset (manual): ${entry.manualOffsetX}`);
        lines.push(`GL Y Offset (auto/manual/total): ${entry.autoOffsetY} / ${entry.manualOffsetY} / ${entry.totalOffsetY}`);
        lines.push('');
      });
    }
    lines.push('LIVE DEBUG REPORT');
    lines.push(liveDebugReport);
    return lines.join('\n');
  }, [calibrationTargetViewport.height, calibrationTargetViewport.width, currentViewport.height, currentViewport.width, calibrationCaseResults, calibrationViewpoints, liveDebugReport]);

  const copyCalibrationReport = useCallback(async () => {
    try {
      await copyTextToClipboard(buildCalibrationReport());
      setCalibrationViewportStatus('Calibration report copied to clipboard');
    } catch {
      setCalibrationViewportStatus('Failed to copy calibration report');
    }
  }, [buildCalibrationReport]);

  const cycleLayerMode = useCallback(() => {
    if (!setDebugLayerMode) return;
    setDebugLayerMode((prev) => {
      if (prev === 'normal') return 'gl-only';
      if (prev === 'gl-only') return 'overlays-only';
      return 'normal';
    });
  }, [setDebugLayerMode]);

  // Store handleCopyDebug in ref so the keyboard effect can access it
  useEffect(() => {
    handleCopyDebugRef.current = handleCopyDebug;
  }, [handleCopyDebug]);

  // 'c' keyboard shortcut — copy when panel is visible
  // 'v' keyboard shortcut — cycle layer isolation mode
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        e.stopPropagation();
        handleCopyDebugRef.current?.();
        return;
      }
      if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        e.stopPropagation();
        cycleLayerMode();
      }
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
  }, [cycleLayerMode]);

  const currentCase = CALIBRATION_CASES[calibrationCaseIndex] || CALIBRATION_CASES[0];
  const viewportDelta = {
    width: currentViewport.width - (calibrationTargetViewport.width || 0),
    height: currentViewport.height - (calibrationTargetViewport.height || 0),
  };

  return (
    <aside
      className="debug-tools-panel"
      style={{
        '--debug-tools-right': `${Math.max(8, rightOffset)}px`,
        background: palette.panelBg,
        color: palette.panelFg,
        borderColor: palette.border,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      aria-label="Debug tools"
    >
      <div className="debug-tools-header">
        <span>Debug tools</span>
        <span>Renderer</span>
      </div>

      {/* FPS Metrics */}
      <div className="debug-tools-metrics">
        <div className="debug-tools-metric">
          <strong>{snapshot.sampleCount > 0 ? snapshot.fps : '...'}</strong>
          <span>fps</span>
        </div>
        <div className="debug-tools-metric">
          <strong>{snapshot.sampleCount > 0 ? snapshot.avgMs.toFixed(1) : '...'}</strong>
          <span>avg ms</span>
        </div>
        <div className="debug-tools-metric">
          <strong>{snapshot.sampleCount > 0 ? snapshot.latestMs.toFixed(1) : '...'}</strong>
          <span>last ms</span>
        </div>
      </div>
      <div className="debug-tools-chart" aria-hidden="true">
        <div
          className="debug-tools-budget-line"
          style={{ bottom: `${Math.min(100, (budgetMs / scaleMs) * 100)}%` }}
        />
        {bars.map((frameMs, index) => (
          <span
            key={index}
            className={barClass(frameMs, budgetMs)}
            style={{ height: `${Math.max(2, Math.min(100, (frameMs / scaleMs) * 100))}%` }}
          />
        ))}
      </div>
      <div className="debug-tools-footer">
        <span>{snapshot.sampleCount}/60 samples</span>
        <span>16.7 ms budget</span>
      </div>

      {/* GL Debug Info Section */}
      {glDebugInfo && (
        <CollapsibleSection title="GL MODE" defaultOpen={true} palette={palette}>
          <div style={{ fontSize: '10px', lineHeight: '1.4', color: palette.sectionGl }}>
            <div>Mode: <strong>{glDebugInfo.mode}</strong></div>
            <div>Reason: {glDebugInfo.modeReason}</div>
            <div>At Risk: <span style={{ color: glDebugInfo.isAtRisk ? palette.bad : palette.good }}>
              {glDebugInfo.isAtRisk ? 'YES' : 'NO'}
            </span></div>
          </div>
          <div style={{ fontSize: '9px', lineHeight: '1.3', color: palette.subtle, marginTop: '6px' }}>
            <div>Viewport: {glDebugInfo.viewportWidth} × {glDebugInfo.viewportHeight}</div>
            <div>Canvas: {glDebugInfo.currentCssW} × {glDebugInfo.currentCssH} CSS</div>
            <div>Backing: {glDebugInfo.currentBackingW} × {glDebugInfo.currentBackingH}</div>
            <div>Max GL Dim: {glDebugInfo.maxGLDimension}</div>
            <div>Effective Max: {glDebugInfo.effectiveMaxBackingDimension}</div>
            <div>Compositor Safe: {glDebugInfo.directCompositorSafeDimension}</div>
            <div>DPR: {glDebugInfo.devicePixelRatio.toFixed(2)}</div>
            <div>Zoom: {Number.isFinite(zoomLevel) ? zoomLevel.toFixed(3) : 'n/a'}</div>
            <div>Rotate X/Y (camera): {cameraState.rotateX.toFixed(2)}° / {cameraState.rotateY.toFixed(2)}°</div>
            <div>Rotate X/Y (applied): {cameraState.appliedRotateX.toFixed(2)}° / {cameraState.appliedRotateY.toFixed(2)}°</div>
          </div>
          {onForceGlRedraw && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  onForceGlRedraw();
                  setForceRedrawStatus('Redraw triggered');
                  window.setTimeout(() => setForceRedrawStatus(''), 1500);
                }}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${palette.buttonBorder}`,
                  background: palette.buttonBg,
                  color: palette.buttonFg,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
                title="Cancel any pending CSS-lock unlock, clear the lock, and force a full GL + Canvas2D redraw. Use this when the WebGL layer appears frozen or blank after a resize in Chrome/Edge."
              >
                Force GL Redraw
              </button>
              {forceRedrawStatus && (
                <div style={{ fontSize: '10px', color: palette.good }}>{forceRedrawStatus}</div>
              )}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Canvas Coordinates Section */}
      {canvasCoords && (
        <CollapsibleSection title="CANVAS COORDS" defaultOpen={false} palette={palette}>
          <div style={{ fontSize: '9px', lineHeight: '1.3', color: palette.sectionCoords }}>
            <div>GL Rect: ({canvasCoords.glLeft}, {canvasCoords.glTop}) {canvasCoords.glWidth}×{canvasCoords.glHeight}</div>
            <div>Main Rect: ({canvasCoords.mainLeft ?? '?'}, {canvasCoords.mainTop ?? '?'}) {canvasCoords.mainWidth ?? '?'}×{canvasCoords.mainHeight ?? '?'}</div>
            <div>Delta(GL-Main): {canvasCoords.deltaLeft ?? '?'} / {canvasCoords.deltaTop ?? '?'} / {canvasCoords.deltaWidth ?? '?'} / {canvasCoords.deltaHeight ?? '?'}</div>
            <div>CSS Size: {canvasCoords.cssW} × {canvasCoords.cssH}</div>
            <div style={{ color: palette.subtle, marginTop: '4px' }}>GL inline tx: {canvasCoords.glInlineTransform || 'none'}</div>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="FULL DEBUG REPORT (LIVE)" defaultOpen={false} palette={palette}>
        <pre
          style={{
            margin: 0,
            padding: '8px',
            maxHeight: '220px',
            overflow: 'auto',
            whiteSpace: 'pre',
            fontSize: '9px',
            lineHeight: '1.35',
            border: `1px solid ${palette.border}`,
            borderRadius: '4px',
            background: theme === 'light' ? '#f7fafc' : 'rgba(0,0,0,0.25)',
            color: palette.panelFg,
          }}
        >
          {liveDebugReport}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection title="IMPORT SNAPSHOT (PASTE)" defaultOpen={false} palette={palette}>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste old debug info here"
          style={{
            width: '100%',
            minHeight: '92px',
            resize: 'vertical',
            boxSizing: 'border-box',
            marginBottom: '6px',
            borderRadius: '4px',
            border: `1px solid ${palette.buttonBorder}`,
            background: theme === 'light' ? '#fff' : 'rgba(0,0,0,0.2)',
            color: palette.panelFg,
            fontSize: '10px',
            lineHeight: '1.35',
            padding: '6px',
          }}
        />
        <button
          type="button"
          onClick={applyImportedSnapshot}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: `1px solid ${palette.buttonBorder}`,
            background: palette.buttonBg,
            color: palette.buttonFg,
            fontSize: '11px',
            cursor: 'pointer',
            marginBottom: '6px',
          }}
          title="Apply pasted pan/zoom/rotation/layer/manual offset"
        >
          Apply Pasted Snapshot
        </button>
        {importStatus && (
          <div style={{ marginBottom: '6px', fontSize: '10px', color: palette.sectionCoords }}>
            {importStatus}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="ALIGNMENT CONTROLS" defaultOpen={true} palette={palette}>
        <button
          type="button"
          onClick={cycleLayerMode}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: `1px solid ${palette.buttonBorder}`,
            background: palette.buttonBg,
            color: palette.buttonFg,
            fontSize: '11px',
            cursor: 'pointer',
            marginBottom: '6px',
          }}
          title="Cycle layer mode (V): normal -> GL only -> overlays only"
        >
          Layer Mode: {debugLayerMode} (press V)
        </button>
        <div style={{
          marginBottom: '8px',
          padding: '6px',
          border: `1px solid ${palette.buttonBorder}`,
          borderRadius: '4px',
          background: theme === 'light' ? '#f4f7fa' : 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontSize: '10px', marginBottom: '6px', color: palette.sectionCoords }}>
            CALIBRATION MODE
          </div>
          <div style={{ marginBottom: '6px', fontSize: '10px', color: palette.subtle }}>
            When enabled, overlays outline every visible cell and the panel exposes a 10-case alignment workflow.
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <button
              type="button"
              onClick={isDebugCalibrationMode ? stopCalibrationMode : startCalibrationMode}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '11px', cursor: 'pointer' }}
            >
              {isDebugCalibrationMode ? 'Stop Calibration' : 'Start Calibration'}
            </button>
            {isDebugCalibrationMode && (
              <button
                type="button"
                onClick={() => applyCalibrationCase(calibrationCaseIndex)}
                style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '11px', cursor: 'pointer' }}
              >
                Reapply Case
              </button>
            )}
          </div>
          {isDebugCalibrationMode && (
            <>
              <div style={{ fontSize: '10px', marginBottom: '4px', color: palette.sectionCoords }}>
                Target viewport
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  type="number"
                  value={calibrationTargetViewport.width || ''}
                  onChange={(e) => setCalibrationTargetViewport((prev) => ({ ...prev, width: Number(e.target.value) || 0 }))}
                  style={{ flex: 1, minWidth: 0, borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: theme === 'light' ? '#fff' : 'rgba(0,0,0,0.2)', color: palette.panelFg, fontSize: '10px', padding: '6px' }}
                />
                <input
                  type="number"
                  value={calibrationTargetViewport.height || ''}
                  onChange={(e) => setCalibrationTargetViewport((prev) => ({ ...prev, height: Number(e.target.value) || 0 }))}
                  style={{ flex: 1, minWidth: 0, borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: theme === 'light' ? '#fff' : 'rgba(0,0,0,0.2)', color: palette.panelFg, fontSize: '10px', padding: '6px' }}
                />
              </div>
              <div style={{ fontSize: '10px', marginBottom: '6px', color: palette.subtle }}>
                Current viewport: {currentViewport.width} x {currentViewport.height} | Delta: {viewportDelta.width >= 0 ? '+' : ''}{viewportDelta.width} / {viewportDelta.height >= 0 ? '+' : ''}{viewportDelta.height}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCalibrationTargetViewport({ width: currentViewport.width, height: currentViewport.height })}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
                >
                  Use Current Viewport
                </button>
                <button
                  type="button"
                  onClick={tryResizeViewport}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
                >
                  Try Resize Window
                </button>
              </div>
              <div style={{ fontSize: '10px', marginBottom: '8px', color: palette.subtle }}>
                If the browser blocks programmatic resize, drag the window border until the delta is near zero, then commit the case.
              </div>
              <div style={{ fontSize: '10px', marginBottom: '6px', color: palette.sectionCoords }}>
                Calibration cases
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                {CALIBRATION_CASES.map((item, index) => {
                  const recorded = !!calibrationCaseResults[item.id];
                  const isActive = index === calibrationCaseIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyCalibrationCase(index)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${isActive ? palette.sectionCoords : palette.buttonBorder}`,
                        background: recorded ? (theme === 'light' ? '#e7f7ef' : 'rgba(110,231,135,0.12)') : palette.buttonBg,
                        color: palette.buttonFg,
                        fontSize: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {index + 1}. {item.title}{recorded ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '10px', marginBottom: '6px', color: palette.subtle }}>
                Current case: {calibrationCaseIndex + 1}. {currentCase.title} | RotateX={currentCase.rotateX}, RotateY={currentCase.rotateY}. Adjust zoom if needed, then align GL to overlays with the X/Y controls below.
              </div>
            </>
          )}
        </div>
        {isDebugCalibrationMode && (
          <div style={{
            marginBottom: '8px',
            padding: '6px',
            border: `1px solid ${palette.buttonBorder}`,
            borderRadius: '4px',
            background: theme === 'light' ? '#f4f7fa' : 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontSize: '10px', marginBottom: '6px', color: palette.sectionCoords }}>
              GL X Offset (manual trim)
            </div>
            <input
              type="range"
              min={-1200}
              max={1200}
              step={1}
              value={Number.isFinite(debugGlOffsetX) ? debugGlOffsetX : 0}
              onChange={(e) => setDebugGlOffsetX?.(Number(e.target.value))}
              style={{ width: '100%', marginBottom: '6px' }}
            />
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button type="button" onClick={() => setDebugGlOffsetX?.((prev) => (Number(prev) || 0) - 10)} style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>-10</button>
              <button type="button" onClick={() => setDebugGlOffsetX?.((prev) => (Number(prev) || 0) - 1)} style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>-1</button>
              <button type="button" onClick={() => setDebugGlOffsetX?.(0)} style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>0</button>
              <button type="button" onClick={() => setDebugGlOffsetX?.((prev) => (Number(prev) || 0) + 1)} style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>+1</button>
              <button type="button" onClick={() => setDebugGlOffsetX?.((prev) => (Number(prev) || 0) + 10)} style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>+10</button>
            </div>
            <div style={{ marginTop: '6px', fontSize: '10px', color: palette.subtle }}>
              Manual: {Number.isFinite(debugGlOffsetX) ? debugGlOffsetX.toFixed(0) : '0'} px
            </div>
          </div>
        )}
        <div style={{
          marginBottom: '8px',
          padding: '6px',
          border: `1px solid ${palette.buttonBorder}`,
          borderRadius: '4px',
          background: theme === 'light' ? '#f4f7fa' : 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontSize: '10px', marginBottom: '6px', color: palette.sectionCoords }}>
            GL Y Offset (manual trim)
          </div>
          <div style={{ marginBottom: '6px', fontSize: '10px', color: palette.subtle }}>
            Auto: {Number.isFinite(debugGlAutoOffsetY) ? debugGlAutoOffsetY.toFixed(0) : '0'} px | Total: {Number.isFinite((debugGlAutoOffsetY || 0) + (debugGlOffsetY || 0)) ? ((debugGlAutoOffsetY || 0) + (debugGlOffsetY || 0)).toFixed(0) : '0'} px
          </div>
          <input
            type="range"
            min={-400}
            max={400}
            step={1}
            value={Number.isFinite(debugGlOffsetY) ? debugGlOffsetY : 0}
            onChange={(e) => setDebugGlOffsetY?.(Number(e.target.value))}
            style={{ width: '100%', marginBottom: '6px' }}
          />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setDebugGlOffsetY?.((prev) => (Number(prev) || 0) - 10)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
            >
              -10
            </button>
            <button
              type="button"
              onClick={() => setDebugGlOffsetY?.((prev) => (Number(prev) || 0) - 1)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => setDebugGlOffsetY?.(0)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setDebugGlOffsetY?.((prev) => (Number(prev) || 0) + 1)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => setDebugGlOffsetY?.((prev) => (Number(prev) || 0) + 10)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
            >
              +10
            </button>
          </div>
          <div style={{ marginTop: '6px', fontSize: '10px', color: palette.subtle }}>
            Manual: {Number.isFinite(debugGlOffsetY) ? debugGlOffsetY.toFixed(0) : '0'} px
          </div>
        </div>
        {isDebugCalibrationMode && (
          <div style={{
            marginBottom: '8px',
            padding: '6px',
            border: `1px solid ${palette.buttonBorder}`,
            borderRadius: '4px',
            background: theme === 'light' ? '#f4f7fa' : 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <button type="button" onClick={() => commitCalibrationCase(false)} style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>Commit Current Case</button>
              <button type="button" onClick={() => commitCalibrationCase(true)} style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>Commit + Next</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input
                type="text"
                value={calibrationViewpointLabel}
                onChange={(e) => setCalibrationViewpointLabel(e.target.value)}
                placeholder="Optional viewpoint label"
                style={{ flex: 1, minWidth: 0, borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: theme === 'light' ? '#fff' : 'rgba(0,0,0,0.2)', color: palette.panelFg, fontSize: '10px', padding: '6px' }}
              />
              <button type="button" onClick={recordCalibrationViewpoint} style={{ padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}>Record Viewpoint</button>
            </div>
            <button type="button" onClick={copyCalibrationReport} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer', marginBottom: '6px' }}>Copy Calibration Report</button>
            {calibrationViewportStatus && (
              <div style={{ fontSize: '10px', color: palette.sectionCoords }}>
                {calibrationViewportStatus}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={handleCopyDebug}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: `1px solid ${palette.buttonBorder}`,
            background: palette.buttonBg,
            color: palette.buttonFg,
            fontSize: '11px',
            cursor: 'pointer',
          }}
          title="Copy debug report to clipboard"
        >
          Copy Debug To Clipboard
        </button>
        {copyStatus && (
          <div style={{ marginTop: '6px', fontSize: '10px', color: palette.sectionCoords }}>
            {copyStatus}
          </div>
        )}
      </CollapsibleSection>
    </aside>
  );
}

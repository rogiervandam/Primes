import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

function parseAppliedRotateAngles(transformStr) {
  if (!transformStr || transformStr === 'none') return { rotateX: 0, rotateY: 0 };
  const xMatch = /rotateX\((-?\d+(?:\.\d+)?)deg\)/.exec(transformStr);
  const yMatch = /rotateY\((-?\d+(?:\.\d+)?)deg\)/.exec(transformStr);
  return {
    rotateX: xMatch ? Number(xMatch[1]) : 0,
    rotateY: yMatch ? Number(yMatch[1]) : 0,
  };
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
  const manualOffset = pickNumber('GL Y Offset \(manual\)') ?? pickNumber('GL Y Offset \(debug\)');
  const layerMode = pickLayer();
  const hasAny = [zoom, panX, panY, rotateX, rotateY, manualOffset].some((v) => Number.isFinite(v)) || !!layerMode;
  if (!hasAny) return null;
  return {
    zoom: Number.isFinite(zoom) ? zoom : undefined,
    panX: Number.isFinite(panX) ? panX : undefined,
    panY: Number.isFinite(panY) ? panY : undefined,
    rotateX: Number.isFinite(rotateX) ? rotateX : undefined,
    rotateY: Number.isFinite(rotateY) ? rotateY : undefined,
    manualOffsetY: Number.isFinite(manualOffset) ? manualOffset : undefined,
    layerMode: layerMode || undefined,
  };
}

export default function DebugToolsPanel({
  rendererRef,
  glCanvasRef = null,
  glRendererRef = null,
  camera3DRef = null,
  camera3DTransform = 'none',
  zoomLevel = 1,
  glDebugInfo = null,
  theme = 'dark',
  debugLayerMode = 'normal',
  setDebugLayerMode = null,
  debugGlOffsetY = 0,
  setDebugGlOffsetY = null,
  debugGlAutoOffsetY = 0,
  onApplyDebugSnapshot = null,
  rightOffset = 8,
}) {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(rendererRef));
  const [canvasCoords, setCanvasCoords] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');

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
    const rrCssW = rr?.canvasWidth != null
      ? Number(rr.canvasWidth).toFixed(2)
      : (rr?.canvas?.width != null ? (rr.canvas.width / dpr).toFixed(2) : '?');
    const rrCssH = rr?.canvasHeight != null
      ? Number(rr.canvasHeight).toFixed(2)
      : (rr?.canvas?.height != null ? (rr.canvas.height / dpr).toFixed(2) : '?');
    const rrDpr = rr?.canvasDpr ?? dpr;
    const grCssW = gr?._cssW ?? '?';
    const grCssH = gr?._cssH ?? '?';
    const grDpr = gr?._dpr ?? '?';
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
      `Zoom: ${Number.isFinite(zoomLevel) ? zoomLevel.toFixed(3) : '?'}`,
      `Rotate X (camera): ${cameraState.rotateX.toFixed(2)} deg`,
      `Rotate Y (camera): ${cameraState.rotateY.toFixed(2)} deg`,
      `Rotate X (applied): ${cameraState.appliedRotateX.toFixed(2)} deg`,
      `Rotate Y (applied): ${cameraState.appliedRotateY.toFixed(2)} deg`,
      `Layer Mode: ${debugLayerMode}`,
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
  }, [rendererRef, glRendererRef, cameraState.rotateX, cameraState.rotateY, cameraState.appliedRotateX, cameraState.appliedRotateY, canvasCoords, glDebugInfo, zoomLevel, debugLayerMode, debugGlOffsetY, debugGlAutoOffsetY]);

  const handleCopyDebug = useCallback(async () => {
    try {
      const text = buildDebugReport();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
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
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${palette.border}` }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: palette.sectionGl }}>
            GL MODE
          </div>
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
        </div>
      )}

      {/* Canvas Coordinates Section */}
      {canvasCoords && (
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${palette.border}` }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: palette.sectionCoords }}>
            CANVAS COORDS
          </div>
          <div style={{ fontSize: '9px', lineHeight: '1.3', color: palette.sectionCoords }}>
            <div>GL Rect: ({canvasCoords.glLeft}, {canvasCoords.glTop}) {canvasCoords.glWidth}×{canvasCoords.glHeight}</div>
            <div>Main Rect: ({canvasCoords.mainLeft ?? '?'}, {canvasCoords.mainTop ?? '?'}) {canvasCoords.mainWidth ?? '?'}×{canvasCoords.mainHeight ?? '?'}</div>
            <div>Delta(GL-Main): {canvasCoords.deltaLeft ?? '?'} / {canvasCoords.deltaTop ?? '?'} / {canvasCoords.deltaWidth ?? '?'} / {canvasCoords.deltaHeight ?? '?'}</div>
            <div>CSS Size: {canvasCoords.cssW} × {canvasCoords.cssH}</div>
            <div style={{ color: palette.subtle, marginTop: '4px' }}>GL inline tx: {canvasCoords.glInlineTransform || 'none'}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${palette.border}` }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: palette.sectionCoords }}>
          FULL DEBUG REPORT (LIVE)
        </div>
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
      </div>

      <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${palette.border}` }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: palette.sectionCoords }}>
          IMPORT SNAPSHOT (PASTE)
        </div>
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
              onClick={() => setDebugGlOffsetY?.(0)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: `1px solid ${palette.buttonBorder}`, background: palette.buttonBg, color: palette.buttonFg, fontSize: '10px', cursor: 'pointer' }}
            >
              0
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
      </div>
    </aside>
  );
}

/**
 * useDebugTools — owns GL-debug and debug-overlay state.
 *
 * Owns:
 *  - isGlUnavailable / glDebugInfo (WebGL capability)
 *  - isDebugToolsOpen / debugLayerMode / isDebugCalibrationMode
 *  - debugGlModeOverride / debugGlOffsetX/Y/AutoY (manual GL trim) + their refs
 *  - glDebugLastUpdateRef (throttle for getDebugInfo calls)
 *  - updateGlDebugInfo callback
 *
 * @param {{ glRendererRef: React.MutableRefObject, initialDebugGlModeOverride?: string, initialDebugWorkerGlyphMode?: string }} params
 */
import { useState, useRef, useCallback } from 'react';

export function useDebugTools({
  glRendererRef,
  initialDebugGlModeOverride = 'auto',
  initialDebugWorkerGlyphMode = 'gl',
  initialDebugRenderTuning = null,
}) {
  const [isGlUnavailable, setIsGlUnavailable] = useState(false);
  const [glDebugInfo, setGlDebugInfo] = useState(null);
  const [isDebugToolsOpen, setIsDebugToolsOpen] = useState(false);
  const [debugLayerMode, setDebugLayerMode] = useState('normal');
  const [debugGlModeOverride, setDebugGlModeOverride] = useState(
    initialDebugGlModeOverride === 'worker' || initialDebugGlModeOverride === 'direct'
      ? initialDebugGlModeOverride
      : 'auto'
  );
  const [debugWorkerGlyphMode, setDebugWorkerGlyphMode] = useState(
    initialDebugWorkerGlyphMode === 'separate-text' ? 'separate-text' : 'gl'
  );
  const [debugGlOffsetX, setDebugGlOffsetX] = useState(0);
  const [debugGlOffsetY, setDebugGlOffsetY] = useState(0);
  const [debugGlAutoOffsetY, setDebugGlAutoOffsetY] = useState(0);
  const [isDebugCalibrationMode, setIsDebugCalibrationMode] = useState(false);
  const [debugRenderTuning, setDebugRenderTuning] = useState(() => {
    const tuning = initialDebugRenderTuning || {};
    const toNullableNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const toPercent = (value) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : 100;
    };
    const legacyDpr = toNullableNumber(tuning.dprOverride);
    const legacyGlW = toNullableNumber(tuning.glCssW);
    const legacyGlH = toNullableNumber(tuning.glCssH);
    const legacyOverlayW = toNullableNumber(tuning.overlayCssW);
    const legacyOverlayH = toNullableNumber(tuning.overlayCssH);
    const legacyGlyph2DW = toNullableNumber(tuning.glyph2DCssW);
    const legacyGlyph2DH = toNullableNumber(tuning.glyph2DCssH);

    const dprManualActive = tuning.dprManualActive === true || legacyDpr != null;
    const glManualActive = tuning.glManualActive === true || legacyGlW != null || legacyGlH != null;
    const overlayManualActive = tuning.overlayManualActive === true || legacyOverlayW != null || legacyOverlayH != null;
    const glyph2DManualActive = tuning.glyph2DManualActive === true || legacyGlyph2DW != null || legacyGlyph2DH != null;

    const dprManualValue = toNullableNumber(tuning.dprManualValue) ?? legacyDpr;
    const glManualW = toNullableNumber(tuning.glManualW) ?? legacyGlW;
    const glManualH = toNullableNumber(tuning.glManualH) ?? legacyGlH;
    const overlayManualW = toNullableNumber(tuning.overlayManualW) ?? legacyOverlayW;
    const overlayManualH = toNullableNumber(tuning.overlayManualH) ?? legacyOverlayH;
    const glyph2DManualW = toNullableNumber(tuning.glyph2DManualW) ?? legacyGlyph2DW;
    const glyph2DManualH = toNullableNumber(tuning.glyph2DManualH) ?? legacyGlyph2DH;

    return {
      dprPercent: toPercent(tuning.dprPercent),
      glPercent: toPercent(tuning.glPercent),
      overlayPercent: toPercent(tuning.overlayPercent),
      glyph2DPercent: toPercent(tuning.glyph2DPercent),
      dprManualActive,
      dprManualValue,
      glManualActive,
      glManualW,
      glManualH,
      overlayManualActive,
      overlayManualW,
      overlayManualH,
      glyph2DManualActive,
      glyph2DManualW,
      glyph2DManualH,
    };
  });

  const debugGlOffsetXRef = useRef(0);
  const debugGlOffsetYRef = useRef(0);
  const debugGlAutoOffsetYRef = useRef(0);
  const glDebugLastUpdateRef = useRef(0);

  debugGlOffsetXRef.current = debugGlOffsetX;
  debugGlOffsetYRef.current = debugGlOffsetY;
  debugGlAutoOffsetYRef.current = debugGlAutoOffsetY;

  const updateGlDebugInfo = useCallback((force = false) => {
    const gl = glRendererRef.current;
    if (!gl || typeof gl.getDebugInfo !== 'function') return;
    const now = Date.now();
    if (!force && now - glDebugLastUpdateRef.current < 120) return;
    glDebugLastUpdateRef.current = now;
    setGlDebugInfo(gl.getDebugInfo());
  }, [glRendererRef]);

  return {
    isGlUnavailable, setIsGlUnavailable,
    glDebugInfo, setGlDebugInfo,
    isDebugToolsOpen, setIsDebugToolsOpen,
    debugLayerMode, setDebugLayerMode,
    debugGlModeOverride, setDebugGlModeOverride,
    debugWorkerGlyphMode, setDebugWorkerGlyphMode,
    debugGlOffsetX, setDebugGlOffsetX,
    debugGlOffsetY, setDebugGlOffsetY,
    debugGlAutoOffsetY, setDebugGlAutoOffsetY,
    isDebugCalibrationMode, setIsDebugCalibrationMode,
    debugRenderTuning, setDebugRenderTuning,
    debugGlOffsetXRef,
    debugGlOffsetYRef,
    debugGlAutoOffsetYRef,
    glDebugLastUpdateRef,
    updateGlDebugInfo,
  };
}

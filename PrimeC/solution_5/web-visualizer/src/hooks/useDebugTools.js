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
import {
  DEFAULT_RENDER_MODE,
  getRenderModeBackendPreset,
  normalizeRenderMode,
} from '../lib/renderModes';

export function useDebugTools({
  glRendererRef,
  initialRenderMode = DEFAULT_RENDER_MODE,
  initialDebugGlModeOverride = 'auto',
  initialDebugWorkerGlyphMode = 'gl',
  initialDebugRenderTuning = null,
}) {
  const [isGlUnavailable, setIsGlUnavailable] = useState(false);
  const [glDebugInfo, setGlDebugInfo] = useState(null);
  const [isDebugToolsOpen, setIsDebugToolsOpen] = useState(false);
  const [debugLayerMode, setDebugLayerMode] = useState('normal');
  const [renderMode, setRenderModeState] = useState(() => normalizeRenderMode(initialRenderMode));
  const [renderModeRestartNonce, setRenderModeRestartNonce] = useState(0);
  // Derive initial GL settings from renderMode preset so state is always consistent
  const _initialPreset = getRenderModeBackendPreset(normalizeRenderMode(initialRenderMode));
  const [debugGlModeOverride, setDebugGlModeOverride] = useState(
    _initialPreset.glMode === 'direct' || _initialPreset.glMode === 'worker'
      ? _initialPreset.glMode
      : (initialDebugGlModeOverride === 'worker' || initialDebugGlModeOverride === 'direct'
        ? initialDebugGlModeOverride
        : 'auto')
  );
  const [debugWorkerGlyphMode, setDebugWorkerGlyphMode] = useState(
    _initialPreset.workerGlyphMode || (initialDebugWorkerGlyphMode === 'separate-text' ? 'separate-text' : 'gl')
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
    const glAaScaleRaw = Number(tuning.glAaScale);
    const glAaScale = (Number.isFinite(glAaScaleRaw) && glAaScaleRaw >= 1) ? glAaScaleRaw : 1;

    return {
      dprPercent: toPercent(tuning.dprPercent),
      glPercent: toPercent(tuning.glPercent),
      overlayPercent: toPercent(tuning.overlayPercent),
      glyph2DPercent: toPercent(tuning.glyph2DPercent),
      glAaScale,
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

  const setRenderMode = useCallback((nextMode) => {
    const normalized = normalizeRenderMode(nextMode);
    const preset = getRenderModeBackendPreset(normalized);
    setRenderModeState(normalized);
    setDebugGlModeOverride(preset.glMode);
    setDebugWorkerGlyphMode(preset.workerGlyphMode);
    // Always force a GL reattachment on mode switch so the new canvas
    // (from the key change) gets a fresh context with the correct mode.
    setRenderModeRestartNonce((value) => value + 1);
  }, []);

  const restartRenderMode = useCallback(() => {
    setRenderModeRestartNonce((value) => value + 1);
  }, []);

  return {
    isGlUnavailable, setIsGlUnavailable,
    glDebugInfo, setGlDebugInfo,
    isDebugToolsOpen, setIsDebugToolsOpen,
    debugLayerMode, setDebugLayerMode,
    renderMode,
    setRenderMode,
    renderModeRestartNonce,
    restartRenderMode,
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

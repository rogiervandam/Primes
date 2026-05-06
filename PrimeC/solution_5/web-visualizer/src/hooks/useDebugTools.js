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
    debugGlOffsetXRef,
    debugGlOffsetYRef,
    debugGlAutoOffsetYRef,
    glDebugLastUpdateRef,
    updateGlDebugInfo,
  };
}

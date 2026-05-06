/**
 * useDebugTools — owns GL-debug and debug-overlay state.
 *
 * Owns:
 *  - isGlUnavailable / glDebugInfo (WebGL capability)
 *  - isDebugToolsOpen / debugLayerMode / isDebugCalibrationMode
 *  - debugGlOffsetX/Y/AutoY (manual GL trim) + their refs
 *  - glDebugLastUpdateRef (throttle for getDebugInfo calls)
 *  - updateGlDebugInfo callback
 *
 * @param {{ glRendererRef: React.MutableRefObject }} params
 */
import { useState, useRef, useCallback } from 'react';

export function useDebugTools({ glRendererRef }) {
  const [isGlUnavailable, setIsGlUnavailable] = useState(false);
  const [glDebugInfo, setGlDebugInfo] = useState(null);
  const [isDebugToolsOpen, setIsDebugToolsOpen] = useState(false);
  const [debugLayerMode, setDebugLayerMode] = useState('normal');
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

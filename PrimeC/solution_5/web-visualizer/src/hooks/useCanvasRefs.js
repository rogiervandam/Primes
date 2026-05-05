/**
 * useCanvasRefs — groups all canvas and renderer ref objects.
 *
 * Owns every ref that is handed to a canvas element or a rendering
 * engine instance. Cleanup of GL-CSS-lock RAF/timeout refs is
 * handled here so Visualizer's mount-cleanup effect doesn't need them.
 */
import { useRef, useEffect } from 'react';

export function useCanvasRefs() {
  const minimapCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  // WebGL bit-grid worker (see docs/AI_MAINTENANCE.md §8).
  const glCanvasRef = useRef(null);
  const glRendererRef = useRef(null);
  // WebGL glyph-text canvas.
  const glyphCanvasRef = useRef(null);
  const glyphRendererRef = useRef(null);
  // Wrapper div that receives the 3D CSS transform so canvases stay flat.
  const wrapperCanvasRef = useRef(null);

  // GL CSS-lock mechanism — used by refreshCanvasLayout and forceGlRedraw.
  const glCssUnlockTokenRef = useRef(0);
  const glCssUnlockRafRef = useRef(null);
  const glCssUnlockTimeoutRef = useRef(null);
  const glCssLockStateRef = useRef(null);

  // rAF id for pending coalesced render (pan/zoom path).
  const pendingRenderRafRef = useRef(null);

  useEffect(() => () => {
    if (glCssUnlockRafRef.current != null) {
      cancelAnimationFrame(glCssUnlockRafRef.current);
      glCssUnlockRafRef.current = null;
    }
    if (glCssUnlockTimeoutRef.current != null) {
      clearTimeout(glCssUnlockTimeoutRef.current);
      glCssUnlockTimeoutRef.current = null;
    }
  }, []);

  return {
    minimapCanvasRef,
    containerRef,
    rendererRef,
    glCanvasRef,
    glRendererRef,
    glyphCanvasRef,
    glyphRendererRef,
    wrapperCanvasRef,
    glCssUnlockTokenRef,
    glCssUnlockRafRef,
    glCssUnlockTimeoutRef,
    glCssLockStateRef,
    pendingRenderRafRef,
  };
}

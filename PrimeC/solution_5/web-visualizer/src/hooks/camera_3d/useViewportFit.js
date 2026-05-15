import { useCallback } from 'react';

export function useViewportFit() {
  const applyViewportFit = useCallback((renderer, width, height) => {
    if (!renderer || width <= 0 || height <= 0) return;
    renderer.zoomToFit(width, height, { alignTop: false });
    const dpr = window.devicePixelRatio || 1;
    const canvasCssH = renderer.canvasHeight || (renderer.canvas?.height || height * dpr) / dpr;
    const canvasCssW = renderer.canvasWidth || (renderer.canvas?.width || width * dpr) / dpr;
    const planeOffsetX = Math.max(0, (canvasCssW - width) / 2);
    const planeOffsetY = Math.max(0, (canvasCssH - height) / 2);
    renderer.panX += planeOffsetX;
    renderer.panY += planeOffsetY;
  }, []);

  return { applyViewportFit };
}
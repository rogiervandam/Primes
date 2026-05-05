import { useCallback } from 'react';

export function useZoomControls({
  rendererRef,
  containerRef,
  setZoom,
  getMinimapDetailH,
  updateMinimapAvailability,
  applyViewportFit,
}) {
  const doZoom = useCallback((factor) => {
    const r = rendererRef.current;
    if (!r) return;
    r.zoom = Math.max(0.1, Math.min(64, r.zoom * factor));
    setZoom(r.zoom);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
    updateMinimapAvailability();
  }, [rendererRef, setZoom, getMinimapDetailH, updateMinimapAvailability]);

  const resetZoom = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.unfreezeLayout();
      applyViewportFit(r, rect.width, rect.height);
      r.freezeLayout();
    } else {
      r.zoom = 1;
      r.panX = 0;
      r.panY = 0;
    }
    setZoom(r.zoom);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
    updateMinimapAvailability();
  }, [rendererRef, containerRef, applyViewportFit, setZoom, getMinimapDetailH, updateMinimapAvailability]);

  return { doZoom, resetZoom };
}
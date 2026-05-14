import { useCallback, useEffect, useRef } from 'react';

export function useZoomControls({
  rendererRef,
  containerRef,
  setZoom,
  getMinimapDetailH,
  updateMinimapAvailability,
  applyViewportFit,
}) {
  const zoomAnimRef = useRef(null);

  const cancelZoomAnimation = useCallback(() => {
    if (zoomAnimRef.current != null) {
      cancelAnimationFrame(zoomAnimRef.current);
      zoomAnimRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelZoomAnimation(), [cancelZoomAnimation]);

  const renderViewport = useCallback((renderer) => {
    setZoom(renderer.zoom);
    renderer.render();
    updateMinimapAvailability();
    renderer.renderMinimap(renderer.canvasWidth, renderer.canvasHeight || 0, getMinimapDetailH());
  }, [setZoom, getMinimapDetailH, updateMinimapAvailability]);

  const animateToView = useCallback((targetView, duration = 300) => {
    const r = rendererRef.current;
    if (!r) return;

    cancelZoomAnimation();

    const start = {
      panX: r.panX,
      panY: r.panY,
      zoom: r.zoom,
    };
    const startedAt = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / Math.max(1, duration));
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      r.panX = start.panX + (targetView.panX - start.panX) * eased;
      r.panY = start.panY + (targetView.panY - start.panY) * eased;
      r.zoom = start.zoom + (targetView.zoom - start.zoom) * eased;
      renderViewport(r);

      if (t < 1) {
        zoomAnimRef.current = requestAnimationFrame(tick);
        return;
      }
      zoomAnimRef.current = null;
    };

    zoomAnimRef.current = requestAnimationFrame(tick);
  }, [rendererRef, cancelZoomAnimation, renderViewport]);

  const doZoom = useCallback((factor) => {
    const r = rendererRef.current;
    if (!r) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const anchorX = rect ? rect.width / 2 : ((r.canvasWidth || 0) / 2);
    const anchorY = rect ? rect.height / 2 : ((r.canvasHeight || 0) / 2);
    const nextZoom = Math.max(0.01, Math.min(64, r.zoom * factor)); // item 448: allow zoom out to 0.01
    const contentX = (anchorX - r.panX) / Math.max(0.0001, r.zoom);
    const contentY = (anchorY - r.panY) / Math.max(0.0001, r.zoom);

    animateToView({
      zoom: nextZoom,
      panX: anchorX - contentX * nextZoom,
      panY: anchorY - contentY * nextZoom,
    }, 300);
  }, [rendererRef, containerRef, animateToView]);

  const resetZoom = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      r.unfreezeLayout();
      const savedView = { panX: r.panX, panY: r.panY, zoom: r.zoom };
      applyViewportFit(r, rect.width, rect.height);
      const targetView = { panX: r.panX, panY: r.panY, zoom: r.zoom };
      r.panX = savedView.panX;
      r.panY = savedView.panY;
      r.zoom = savedView.zoom;
      r.freezeLayout();
      animateToView(targetView, 300);
    } else {
      animateToView({ zoom: 1, panX: 0, panY: 0 }, 300);
    }
  }, [rendererRef, containerRef, applyViewportFit, animateToView]);

  return { doZoom, resetZoom };
}
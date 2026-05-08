import { useCallback } from 'react';

export function useViewportNavigation({
  rendererRef,
  containerRef,
  camera3DRef,
  viewportAnimRef,
  cancelViewportAnimation,
  applyViewportFit,
  setZoom,
  getMinimapDetailH,
}) {
  const animateViewportTo = useCallback((targetView, duration = 650) => {
    const r = rendererRef.current;
    if (!r) return Promise.resolve();

    cancelViewportAnimation();

    return new Promise((resolve) => {
      const startPanX = r.panX;
      const startPanY = r.panY;
      const startZoom = r.zoom;
      const startedAt = performance.now();

      const tick = (now) => {
        const t = Math.min(1, (now - startedAt) / duration);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        r.panX = startPanX + (targetView.panX - startPanX) * eased;
        r.panY = startPanY + (targetView.panY - startPanY) * eased;
        r.zoom = startZoom + (targetView.zoom - startZoom) * eased;
        setZoom(r.zoom);
        r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());

        if (t < 1) {
          viewportAnimRef.current = requestAnimationFrame(tick);
          return;
        }

        viewportAnimRef.current = null;
        resolve();
      };

      viewportAnimRef.current = requestAnimationFrame(tick);
    });
  }, [rendererRef, cancelViewportAnimation, setZoom, getMinimapDetailH, viewportAnimRef]);

  const refitViewportToContent = useCallback((options = {}) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return Promise.resolve(false);

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return Promise.resolve(false);

    const savedView = { panX: r.panX, panY: r.panY, zoom: r.zoom };
    applyViewportFit(r, rect.width, rect.height);
    const targetView = { panX: r.panX, panY: r.panY, zoom: r.zoom };
    r.panX = savedView.panX;
    r.panY = savedView.panY;
    r.zoom = savedView.zoom;

    if (options.instant) {
      r.panX = targetView.panX;
      r.panY = targetView.panY;
      r.zoom = targetView.zoom;
      setZoom(r.zoom);
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      return Promise.resolve(true);
    }

    return animateViewportTo(targetView, options.duration ?? 720).then(() => true);
  }, [rendererRef, containerRef, applyViewportFit, setZoom, getMinimapDetailH, animateViewportTo]);

  const navigateToBit = useCallback((bitIdx, targetKind = 'bit') => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el || bitIdx < 0 || bitIdx >= r.bitCount) return Promise.resolve(false);

    const rect = el.getBoundingClientRect();
    const targetPos = r.bitIndexToCanvas(bitIdx);
    if (!targetPos) return Promise.resolve(false);

    let targetZoom;
    switch (targetKind) {
      case 'vector': targetZoom = Math.min(8, Math.max(r.zoom * 1.8, 2.8)); break;
      case 'uint64': targetZoom = Math.min(10, Math.max(r.zoom * 2.0, 3.6)); break;
      case 'uint32':
      case 'byte': targetZoom = Math.min(12, Math.max(r.zoom * 2.2, 4.4)); break;
      default: targetZoom = Math.min(16, Math.max(r.zoom * 2.5, 6)); break;
    }

    const contentX = (targetPos.x - r.panX) / Math.max(0.0001, r.zoom);
    const contentY = (targetPos.y - r.panY) / Math.max(0.0001, r.zoom);
    const targetView = {
      panX: rect.width / 2 - contentX * targetZoom,
      panY: rect.height / 2 - contentY * targetZoom,
      zoom: targetZoom,
    };

    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      const planeW = r.canvasWidth || rect.width;
      const planeH = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
      return cam.flyTo(
        { canvasX: targetPos.x, canvasY: targetPos.y },
        { containerW: planeW, containerH: planeH, centerX: planeW / 2, centerY: planeH / 2 },
        { panX: r.panX, panY: r.panY, zoom: r.zoom },
        targetZoom,
        950,
      ).then(() => true);
    }

    return animateViewportTo(targetView, 520).then(() => true);
  }, [rendererRef, containerRef, camera3DRef, animateViewportTo]);

  return {
    animateViewportTo,
    refitViewportToContent,
    navigateToBit,
  };
}
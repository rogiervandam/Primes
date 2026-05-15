import { useCallback } from 'react';
import { readContainerInsets } from './useViewportFit';

export function useViewportNavigation({
  rendererRef,
  containerRef,
  camera3DRef,
  glCanvasRef,
  viewportAnimRef,
  cancelViewportAnimation,
  applyViewportFit,
  setZoom,
  getMinimapDetailH,
  updateMinimapAvailability,
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
        updateMinimapAvailability();
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
  }, [rendererRef, cancelViewportAnimation, setZoom, getMinimapDetailH, updateMinimapAvailability, viewportAnimRef]);

  const refitViewportToContent = useCallback((options = {}) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return Promise.resolve(false);

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return Promise.resolve(false);

    // item 468: account for side panels when computing the fit target.
    const insets = readContainerInsets(el);

    const savedView = { panX: r.panX, panY: r.panY, zoom: r.zoom };
    applyViewportFit(r, rect.width, rect.height, insets, {
      camera3D: camera3DRef.current,
      glCanvasEl: glCanvasRef.current,
    });
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
      updateMinimapAvailability();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      return Promise.resolve(true);
    }

    return animateViewportTo(targetView, options.duration ?? 720).then(() => true);
  }, [rendererRef, containerRef, camera3DRef, glCanvasRef, applyViewportFit, setZoom, getMinimapDetailH, updateMinimapAvailability, animateViewportTo]);

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

  // item 254: navigate to a bit range, zooming to show the full range in view.
  const navigateToRange = useCallback((startBit, endBit) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return Promise.resolve(false);
    const clampedStart = Math.max(0, startBit);
    const clampedEnd = Math.min(r.bitCount - 1, endBit);
    if (clampedStart > clampedEnd) return Promise.resolve(false);

    const rect = el.getBoundingClientRect();
    const startPos = r.bitIndexToCanvas(clampedStart);
    const endPos = r.bitIndexToCanvas(clampedEnd);
    if (!startPos || !endPos) return navigateToBit(clampedStart, 'bit');

    // Bounding box of the range in canvas coordinates.
    const rangeLeft   = Math.min(startPos.x, endPos.x);
    const rangeRight  = Math.max(startPos.x, endPos.x);
    const rangeTop    = Math.min(startPos.y, endPos.y);
    const rangeBottom = Math.max(startPos.y, endPos.y);
    const rangeW = rangeRight - rangeLeft;
    const rangeH = rangeBottom - rangeTop;

    // Compute target zoom: fit the range with 15% padding on each side.
    const PADDING = 0.15;
    const viewW = rect.width  * (1 - 2 * PADDING);
    const viewH = rect.height * (1 - 2 * PADDING);
    let targetZoom;
    if (rangeW > 0 && rangeH > 0) {
      // range spans both axes — fit the larger dimension
      const zoomX = (viewW / rangeW) * r.zoom;
      const zoomY = (viewH / rangeH) * r.zoom;
      targetZoom = Math.max(0.5, Math.min(16, Math.min(zoomX, zoomY)));
    } else if (rangeW > 0) {
      targetZoom = Math.max(0.5, Math.min(16, (viewW / rangeW) * r.zoom));
    } else {
      // Single bit or vertical strip — fall back to bit navigation
      return navigateToBit(clampedStart, 'bit');
    }

    // Centre of the range in content (pre-pan) coordinates.
    const centerX = (rangeLeft + rangeRight) / 2;
    const centerY = (rangeTop  + rangeBottom) / 2;
    const contentX = (centerX - r.panX) / Math.max(0.0001, r.zoom);
    const contentY = (centerY - r.panY) / Math.max(0.0001, r.zoom);

    const targetView = {
      panX: rect.width  / 2 - contentX * targetZoom,
      panY: rect.height / 2 - contentY * targetZoom,
      zoom: targetZoom,
    };

    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      const planeW = r.canvasWidth || rect.width;
      const planeH = (r.canvas?.height || rect.height * (window.devicePixelRatio || 1)) / (window.devicePixelRatio || 1);
      return cam.flyTo(
        { canvasX: centerX, canvasY: centerY },
        { containerW: planeW, containerH: planeH, centerX: planeW / 2, centerY: planeH / 2 },
        { panX: r.panX, panY: r.panY, zoom: r.zoom },
        targetZoom,
        950,
      ).then(() => true);
    }

    return animateViewportTo(targetView, 650).then(() => true);
  }, [rendererRef, containerRef, camera3DRef, animateViewportTo, navigateToBit]);

  return {
    animateViewportTo,
    refitViewportToContent,
    navigateToBit,
    navigateToRange,
  };
}
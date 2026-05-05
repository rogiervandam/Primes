import { useCallback } from 'react';

export function useBalloonGeometry({
  rendererRef,
  containerRef,
  getCanvasPlaneMetrics,
  camera3DRef,
  eventsPanelCollapsed,
  panelWidth,
  settingsCollapsed,
  isMacPlatform,
  detailOpen,
  detailHeight,
}) {
  const getBitBalloonGeometry = useCallback((bitIndex) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return null;

    const metrics = getCanvasPlaneMetrics();
    if (!metrics) return null;
    const { rect, planeW, planeH, planeOffsetX, planeOffsetY, canvasToViewport } = metrics;

    const pos = r.bitIndexToCanvas(bitIndex);
    if (!pos) return null;
    const cam = camera3DRef.current;
    const projected = canvasToViewport
      ? canvasToViewport(pos.x, pos.y)
      : cam && cam.enabled
      ? cam.canvasToScreen(pos.x, pos.y, planeW, planeH, planeOffsetX, planeOffsetY)
      : { x: pos.x - planeOffsetX, y: pos.y - planeOffsetY };
    if (!projected) return null;
    const anchorX = canvasToViewport ? projected.x : rect.left + projected.x;
    const anchorY = canvasToViewport ? projected.y : rect.top + projected.y;
    const bitHalf = Math.max(2.5, (r.pixelSize || 2) * (r.zoom || 1) * 0.52);

    const edgeMargin = 4;
    const anchorInsideGrid =
      anchorX >= rect.left + edgeMargin &&
      anchorX <= rect.right - edgeMargin &&
      anchorY >= rect.top + edgeMargin &&
      anchorY <= rect.bottom - edgeMargin;

    const sideInsetLeft = eventsPanelCollapsed ? 80 : Math.max(120, panelWidth + 32);
    const sideInsetRight = settingsCollapsed ? 48 : (isMacPlatform ? 388 : 328);
    const panelApproxHalfW = 170;
    const minLeft = sideInsetLeft + panelApproxHalfW;
    const maxLeft = window.innerWidth - sideInsetRight - panelApproxHalfW;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, anchorX));

    const detailPad = detailOpen ? detailHeight + 22 : 56;
    const minTop = 96;
    const maxTop = window.innerHeight - detailPad;
    const clampedTop = Math.max(minTop, Math.min(maxTop, anchorY - 72));

    return { left: clampedLeft, top: clampedTop, anchorX, anchorY, bitHalf, anchorInsideGrid };
  }, [
    rendererRef,
    containerRef,
    getCanvasPlaneMetrics,
    camera3DRef,
    eventsPanelCollapsed,
    panelWidth,
    settingsCollapsed,
    isMacPlatform,
    detailOpen,
    detailHeight,
  ]);

  const getVisibleBalloonStyles = useCallback((items) => {
    const approxWidth = 320;
    const approxHeight = 238;
    const margin = 18;
    const visualGap = 14;
    const placed = [];
    const result = {};

    const overlayRects = (() => {
      if (typeof document === 'undefined') return [];
      const selectors = [
        '.toolbar',
        '.events-panel:not(.collapsed)',
        '.settings-sidebar:not(.collapsed)',
        '.detail-panel.open',
        '.timing-panel',
        '.joined-events-widget',
      ];
      const rects = [];
      for (const sel of selectors) {
        const nodes = document.querySelectorAll(sel);
        for (const n of nodes) {
          const r = n.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) rects.push(r);
        }
      }
      return rects;
    })();
    const toolbarBottom = overlayRects
      .filter((r) => r.top <= 4)
      .reduce((m, r) => Math.max(m, r.bottom), 0);

    const normalized = items
      .map((item) => {
        const geom = getBitBalloonGeometry(item.bitIndex);
        return geom ? { ...item, ...geom } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.anchorY - b.anchorY) || (a.anchorX - b.anchorX));

    const minLeft = eventsPanelCollapsed ? 170 : Math.max(200, panelWidth + 44);
    const maxLeft = window.innerWidth - (settingsCollapsed ? 170 : (isMacPlatform ? 410 : 356));
    const minTop = Math.max(88, toolbarBottom + 12);
    const maxTop = window.innerHeight - (detailOpen ? detailHeight + 28 : 72);

    const intersectsRect = (a, b) => !(
      a.right <= b.left ||
      a.left >= b.right ||
      a.bottom <= b.top ||
      a.top >= b.bottom
    );

    for (let i = 0; i < normalized.length; i++) {
      const item = normalized[i];
      const candidates = [
        { left: item.left - approxWidth / 2, top: item.top - approxHeight - visualGap },
        { left: item.left - approxWidth / 2, top: item.top + visualGap },
        { left: item.left + visualGap, top: item.top - approxHeight / 2 },
        { left: item.left - approxWidth - visualGap, top: item.top - approxHeight / 2 },
      ];

      let chosen = null;
      for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        const left = Math.max(minLeft, Math.min(maxLeft - approxWidth, cand.left));
        const top = Math.max(minTop, Math.min(maxTop - approxHeight, cand.top));
        const rect = { left, top, right: left + approxWidth, bottom: top + approxHeight };

        if (rect.left < margin || rect.top < minTop || rect.right > window.innerWidth - margin || rect.bottom > window.innerHeight - margin) {
          continue;
        }
        if (overlayRects.some((or) => intersectsRect(rect, or))) {
          continue;
        }
        if (placed.some((pr) => intersectsRect(rect, pr))) {
          continue;
        }
        chosen = rect;
        break;
      }

      if (chosen && item.anchorInsideGrid) {
        placed.push(chosen);
        result[item.bitIndex] = {
          left: Math.round(chosen.left),
          top: Math.round(chosen.top),
          visible: true,
          anchorX: item.anchorX,
          anchorY: item.anchorY,
          bitHalf: item.bitHalf,
        };
      } else {
        result[item.bitIndex] = {
          left: Math.round(item.left - approxWidth / 2),
          top: Math.round(item.top - approxHeight - visualGap),
          visible: false,
          anchorX: item.anchorX,
          anchorY: item.anchorY,
          bitHalf: item.bitHalf,
        };
      }
    }

    return result;
  }, [
    getBitBalloonGeometry,
    eventsPanelCollapsed,
    panelWidth,
    settingsCollapsed,
    isMacPlatform,
    detailOpen,
    detailHeight,
  ]);

  return { getBitBalloonGeometry, getVisibleBalloonStyles };
}
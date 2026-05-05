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
    const maxLeft = window.innerWidth - (settingsCollapsed ? 48 : 360) - 170;
    const minTopClamp = Math.max(96, toolbarBottom + approxHeight + 8);

    for (const item of normalized) {
      const evPanelRight = eventsPanelCollapsed ? 32 : panelWidth;
      if (item.anchorX < evPanelRight) {
        result[`${item.kind}-${item.bitIndex}`] = { visible: false };
        continue;
      }

      const candidates = [
        { left: item.left, top: item.top },
        { left: item.left - 180, top: item.top - 10 },
        { left: item.left + 180, top: item.top - 10 },
        { left: item.left, top: item.top - 44 },
        { left: item.left - 220, top: item.top - 52 },
        { left: item.left + 220, top: item.top - 52 },
      ];

      let chosen = null;
      let chosenBox = null;
      for (const candidate of candidates) {
        const cl = Math.max(minLeft, Math.min(maxLeft, candidate.left));
        const ct = Math.max(minTopClamp, candidate.top);
        const box = {
          left: cl - approxWidth / 2,
          right: cl + approxWidth / 2,
          top: ct - approxHeight - visualGap,
          bottom: ct - visualGap,
        };
        const overlaps = placed.some((other) => (
          box.left < other.right + margin &&
          box.right > other.left - margin &&
          box.top < other.bottom + margin &&
          box.bottom > other.top - margin
        ));
        if (!overlaps) {
          chosen = { left: cl, top: ct };
          chosenBox = box;
          break;
        }
      }

      if (!chosen) {
        const direction = placed.length % 2 === 0 ? 1 : -1;
        const cl = Math.max(minLeft, Math.min(maxLeft, item.left + direction * (120 + placed.length * 18)));
        const ct = Math.max(minTopClamp, item.top - 68 - placed.length * 10);
        chosen = { left: cl, top: ct };
        chosenBox = {
          left: cl - approxWidth / 2,
          right: cl + approxWidth / 2,
          top: ct - approxHeight - visualGap,
          bottom: ct - visualGap,
        };
      }

      const clampedLeft = chosen.left;
      const clampedTop = chosen.top;
      const box = chosenBox || {
        left: clampedLeft - approxWidth / 2,
        right: clampedLeft + approxWidth / 2,
        top: clampedTop - approxHeight - visualGap,
        bottom: clampedTop - visualGap,
      };
      const overlapThresholdPx = 12;
      const intersectsOverlay = overlayRects.some((r) => {
        const ix = Math.min(box.right, r.right) - Math.max(box.left, r.left);
        const iy = Math.min(box.bottom, r.bottom) - Math.max(box.top, r.top);
        return ix > overlapThresholdPx && iy > overlapThresholdPx;
      });
      const offscreen =
        box.left < -4 || box.right > window.innerWidth + 4 ||
        box.top < -4 || box.bottom > window.innerHeight + 4;
      const anchorOutside = item.anchorInsideGrid === false;
      const visible = !intersectsOverlay && !offscreen && !anchorOutside;
      placed.push(box);
      result[`${item.kind}-${item.bitIndex}`] = {
        visible,
        panelStyle: {
          left: clampedLeft,
          top: clampedTop,
        },
        connector: {
          anchorX: item.anchorX,
          anchorY: item.anchorY,
          bitHalf: item.bitHalf,
          box,
        },
      };
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
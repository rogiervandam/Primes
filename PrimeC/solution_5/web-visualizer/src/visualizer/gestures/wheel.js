/**
 * Wheel zoom gesture body. Pure helper extracted from the
 * pointer-handling `useEffect` in `Visualizer.jsx`. Owns no state; the
 * dispatcher decides whether to call this (it always does, on every
 * `wheel` event over the canvas) and the helper applies the zoom-around-
 * cursor math.
 *
 * Normalises trackpad (deltaMode 0) vs mouse-wheel (deltaMode 1, line
 * units) vs page (deltaMode 2) inputs and clamps the per-event delta so
 * a single fast wheel-tick can't blow zoom past its bounds.
 *
 * Returns nothing — mutates `renderer.{zoom,panX,panY}`, calls
 * `setZoom(renderer.zoom)` and re-renders. Caller must `e.preventDefault()`
 * itself before invoking (the wheel listener is registered with
 * `{ passive: false }`).
 */
export function applyWheel({
  renderer,
  event,
  cursorX,
  cursorY,
  setZoom,
  getMinimapDetailH,
  updateMinimapAvailability,
  scheduleBalloonRelayout,
}) {
  const oldZoom = renderer.zoom;

  // Normalise delta: trackpad (deltaMode 0) sends pixel values, mouse
  // wheel (deltaMode 1) sends line units, page (deltaMode 2) sends pages.
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 16;
  else if (event.deltaMode === 2) delta *= 100;

  const absDelta = Math.min(Math.abs(delta), 150);
  const factor = 1 + absDelta * 0.0022;
  const contentX = (cursorX - renderer.panX) / Math.max(0.0001, oldZoom);
  const contentY = (cursorY - renderer.panY) / Math.max(0.0001, oldZoom);
  const nextZoom = delta > 0
    ? Math.max(0.01, renderer.zoom / factor) // item 448: allow zoom out to 0.01
    : Math.min(64, renderer.zoom * factor);
  renderer.zoom = nextZoom;
  renderer.panX = cursorX - contentX * nextZoom;
  renderer.panY = cursorY - contentY * nextZoom;
  setZoom(renderer.zoom);
  renderer.render();
  updateMinimapAvailability();
  renderer.renderMinimap(
    renderer.canvasWidth,
    renderer.canvasHeight || 0,
    getMinimapDetailH(),
  );
  scheduleBalloonRelayout();
}

export default applyWheel;

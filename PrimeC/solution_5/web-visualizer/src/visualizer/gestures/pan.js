/**
 * Pan gesture body. Pure helper extracted from the pointer-handling
 * `useEffect` in `Visualizer.jsx`. Owns no state of its own; all needed
 * state (start coords, original pan offsets) and side-effect callbacks
 * are passed in. The dispatcher decides *when* to call this; this file
 * only knows *how* to apply a pan delta.
 *
 * Returns nothing — mutates `renderer.panX/panY`, triggers a re-render,
 * updates the minimap and re-lays out balloons.
 */
export function applyPan({
  renderer,
  event,
  startX,
  startY,
  panStartX,
  panStartY,
  getMinimapDetailH,
  updateMinimapAvailability,
  scheduleBalloonRelayout,
}) {
  renderer.panX = panStartX + (event.clientX - startX);
  renderer.panY = panStartY + (event.clientY - startY);
  renderer.render();
  updateMinimapAvailability();
  renderer.renderMinimap(
    renderer.canvasWidth,
    renderer.canvasHeight || 0,
    getMinimapDetailH(),
  );
  scheduleBalloonRelayout();
}

export default applyPan;

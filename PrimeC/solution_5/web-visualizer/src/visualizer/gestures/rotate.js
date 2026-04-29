/**
 * Rotate gesture body (3D camera tilt). Pure helper extracted from the
 * pointer-handling `useEffect` in `Visualizer.jsx`. The dispatcher owns
 * the gesture-mode state machine (deciding *when* to rotate); this file
 * only knows *how* to apply a single rotation delta.
 *
 * Returns the new `{ startX, startY }` so the caller can update its
 * running anchor (rotate is a delta-from-last-event gesture, not a
 * delta-from-start one — that's why pan does not return new starts).
 *
 * Used by both the primary pointer path (`onPointerMove`) and the
 * fallback secondary-button path (`onMouseMove`). They share this body
 * but keep their own local state in the useEffect closure.
 */
export function applyRotate({
  camera,
  renderer,
  event,
  startX,
  startY,
  getMinimapDetailH,
  updateMinimapAvailability,
  scheduleBalloonRelayout,
}) {
  camera.rotate(event.clientX - startX, event.clientY - startY);
  renderer.render();
  renderer.renderMinimap(
    renderer.canvasWidth,
    renderer.canvas.height / (window.devicePixelRatio || 1),
    getMinimapDetailH(),
  );
  if (updateMinimapAvailability) updateMinimapAvailability();
  scheduleBalloonRelayout();
  return { startX: event.clientX, startY: event.clientY };
}

export default applyRotate;

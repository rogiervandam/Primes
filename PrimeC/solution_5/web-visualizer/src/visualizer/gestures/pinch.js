/**
 * Pinch-zoom-rotate gesture utilities for two-pointer touch (item 141).
 *
 * `getTwoPointerState` extracts the composite geometric state (distance,
 * angle, midpoint) from a Map of active pointers.  It is called on every
 * pointer-move when two fingers are on the canvas so the caller can derive
 * zoom-ratio and twist-angle deltas.
 */

/**
 * @param {Map<number, {clientX: number, clientY: number}>} pointers
 * @returns {{ dist: number, angle: number, cx: number, cy: number } | null}
 */
export function getTwoPointerState(pointers) {
  const pts = Array.from(pointers.values());
  if (pts.length < 2) return null;
  const [p1, p2] = pts;
  const dx = p2.clientX - p1.clientX;
  const dy = p2.clientY - p1.clientY;
  return {
    dist: Math.sqrt(dx * dx + dy * dy),
    angle: Math.atan2(dy, dx),
    cx: (p1.clientX + p2.clientX) / 2,
    cy: (p1.clientY + p2.clientY) / 2,
  };
}

export default getTwoPointerState;

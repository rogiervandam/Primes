/**
 * useViewportAnchoring — owns canvas-anchor and layout-refresh state.
 *
 * Owns:
 *  - canvasAnchorPx: pixel offsets that pin the canvas center to the
 *    viewport center regardless of panel layout changes
 *  - pendingResizeAnchorRef: viewport anchor captured BEFORE a panel
 *    state change so the resize effect can compensate correctly
 *  - layoutRefreshTimeoutRef / layoutRefreshRaf1Ref / layoutRefreshRaf2Ref:
 *    timer refs for the post-layout canvas refresh scheduling
 *  - viewportAnimRef: ref for the currently-running viewport animation
 *
 * The ResizeObserver effect that updates canvasAnchorPx remains in
 * Visualizer.jsx because it also updates wrapperCanvasRef and
 * containerRef and has many external deps.
 */
import { useState, useRef } from 'react';

export function useViewportAnchoring() {
  const [canvasAnchorPx, setCanvasAnchorPx] = useState(null);
  const pendingResizeAnchorRef = useRef(null);
  const layoutRefreshTimeoutRef = useRef(null);
  const layoutRefreshRaf1Ref = useRef(null);
  const layoutRefreshRaf2Ref = useRef(null);
  const viewportAnimRef = useRef(null);

  return {
    canvasAnchorPx, setCanvasAnchorPx,
    pendingResizeAnchorRef,
    layoutRefreshTimeoutRef,
    layoutRefreshRaf1Ref,
    layoutRefreshRaf2Ref,
    viewportAnimRef,
  };
}

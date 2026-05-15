import { useCallback } from 'react';

/**
 * Read panel insets from CSS custom properties inherited by the container
 * element. Returns {left, right, top, bottom} pixel offsets.
 * item 468: panel-aware viewport fit.
 */
export function readContainerInsets(el) {
  if (!el) return { left: 0, right: 0, top: 0, bottom: 0 };
  const styles = getComputedStyle(el);
  const left  = Math.max(0, parseFloat(styles.getPropertyValue('--events-panel-width'))  || 0);
  const right = Math.max(0, parseFloat(styles.getPropertyValue('--settings-panel-width')) || 0);
  return { left, right, top: 0, bottom: 0 };
}

export function useViewportFit() {
  /**
   * Fit the renderer's pan/zoom so the sieve fills the visible area.
   * @param {object} renderer  - SieveRenderer instance
   * @param {number} width     - full container width in CSS pixels
   * @param {number} height    - full container height in CSS pixels
   * @param {{ left?: number, right?: number, top?: number, bottom?: number }} [insets]
   *   Panel insets that reduce the effective viewport (item 468).
   * @param {{ camera3D?: object, glCanvasEl?: HTMLCanvasElement }} [extras]
   *   Optional extras.  camera3D (Camera3D instance) supplies a timing-reliable
   *   rotateX angle and the current perspective value.  glCanvasEl (the WebGL
   *   canvas element) is always present across all render modes and allows
   *   anchor + CSS-tilt detection even when renderer.canvas == null (single-
   *   canvas modes 2, 3, 6, 7 – including the default mode 3).
   */
  const applyViewportFit = useCallback((renderer, width, height, insets = {}, extras = {}) => {
    if (!renderer || width <= 0 || height <= 0) return;

    // item 468: fit within the area not covered by side panels.
    const left   = Math.max(0, insets.left   ?? 0);
    const right  = Math.max(0, insets.right  ?? 0);
    const top    = Math.max(0, insets.top    ?? 0);
    const bottom = Math.max(0, insets.bottom ?? 0);
    const effectiveW = Math.max(1, width  - left - right);
    let   effectiveH = Math.max(1, height - top  - bottom);

    const { camera3D = null, glCanvasEl = null } = extras;

    // Canvas wrapper is pinned to the VIEWPORT centre (not container centre)
    // by useCanvasAnchorSync, which imperatively sets wrapperEl.style.left/top
    // each rAF frame. Reading those values gives the correct anchor for the
    // plane-offset calculation instead of incorrectly assuming the canvas is
    // centred in the container.
    //
    // Use the GL canvas parent (always available, all render modes) in preference
    // to renderer.canvas.parentElement, which is null for single-canvas modes
    // (the default mode 3 among others) and would cause the wrong anchor fallback.
    const wrapperEl  = glCanvasEl?.parentElement ?? renderer.canvas?.parentElement ?? null;
    const dpr        = renderer.canvasDpr || window.devicePixelRatio || 1;
    const canvasCssH = renderer.canvasHeight || (renderer.canvas?.height || height * dpr) / dpr;
    const canvasCssW = renderer.canvasWidth  || (renderer.canvas?.width  || width  * dpr) / dpr;
    const anchorLeft = wrapperEl?.style.left ? parseFloat(wrapperEl.style.left) : width  / 2;
    const anchorTop  = wrapperEl?.style.top  ? parseFloat(wrapperEl.style.top)  : height / 2;

    // Both CSS-tilt modes (2, 4, 6, 8) and WebGL-tilt modes (1, 3, 5, 7) apply a
    // perspective tilt that foreshortens the visible canvas height. Without
    // correction, zoomToFit uses the full effectiveH and the bottom of the content
    // extends past the viewport boundary after the perspective projection (appears
    // as "zoomed in too much" — item 503).
    //
    // camera3D is the authoritative source for the tilt angle: it is updated
    // synchronously in every animation frame for both CSS-tilt and WebGL-tilt
    // modes.  Reading it directly avoids the one-frame lag that occurs between
    // animateTo().then() and the React-effect that writes the final angle to the
    // GL canvas style.transform — and, critically, also works for WebGL-tilt
    // modes where the GL canvas CSS transform is always empty (the shader reads
    // camera3D.rotateX internally).
    //
    // The CSS-transform regex is kept as a fallback for call sites that do not
    // yet pass extras.camera3D (e.g. the initial fit in useGoToStep where the
    // camera is not yet tilted, so the fallback value of 0 is correct anyway).
    const cssTransform = glCanvasEl?.style.transform || renderer.canvas?.style.transform || '';
    const tiltMatch    = cssTransform.match(/rotateX\(([+-]?\d+(?:\.\d+)?)deg\)/);
    const deg = (camera3D != null && typeof camera3D.rotateX === 'number')
      ? camera3D.rotateX
      : (tiltMatch ? parseFloat(tiltMatch[1]) : 0);
    if (Math.abs(deg) > 0.001) {
      const ax          = Math.abs(deg) * Math.PI / 180;
      const cosA        = Math.cos(ax);
      const sinA        = Math.sin(ax);
      // Use the live perspective value from Camera3D when available; it is
      // animated from 1200 → 1500 during a tilt transition, so reading it
      // from the object gives the correct final value.
      const perspective = camera3D?.perspective ?? 1500;
      // B = viewportH/2; A is the max canvas-centre-relative Y so that the
      // bottom of content lands exactly at containerH after perspective projection.
      const B           = Math.max(1, height - anchorTop); // = viewportH/2
      const A_max       = perspective * B / (perspective * cosA + B * sinA);
      const toolbarHalf = height / 2 - anchorTop;          // ≈ toolbarH/2
      const maxEffH     = Math.max(1, 2 * Math.max(0, A_max - toolbarHalf) / 0.96);
      effectiveH = Math.min(effectiveH, maxEffH);
    }

    renderer.zoomToFit(effectiveW, effectiveH, { alignTop: false });

    // Shift pan so content is centred in the visible area, not the full canvas.
    renderer.panX += left;
    renderer.panY += top;

    // Compensate for the canvas plane being larger than the container.
    // planeOffsetX/Y = distance from canvas centre to the viewport-centre anchor.
    const planeOffsetX = canvasCssW / 2 - anchorLeft;
    const planeOffsetY = canvasCssH / 2 - anchorTop;
    renderer.panX += planeOffsetX;
    renderer.panY += planeOffsetY;
  }, []);

  return { applyViewportFit };
}
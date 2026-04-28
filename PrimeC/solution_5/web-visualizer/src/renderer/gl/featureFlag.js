/**
 * Renderer mode selector for the bit-grid renderer.
 *
 * URL params (override the default):
 *   ?renderer=canvas2d   Force the legacy Canvas2D bit-fill path.
 *   ?renderer=gl         Force main-thread direct-mode WebGL2 (BitGridGL).
 *   ?renderer=gl-worker  Force worker-mode WebGL2 (BitGridGLWorker)
 *                        via OffscreenCanvas.transferControlToOffscreen.
 *                        Falls back to direct GL if OffscreenCanvas
 *                        isn't supported.
 *
 * Default: `gl` (main-thread direct mode). The Canvas2D layer keeps
 * drawing overlays/labels/outlines/minimap on top; only the per-bit
 * cell-fill rectangles + background are deferred to the GL canvas.
 * If the GL context can't be created (no WebGL2 support) the
 * Visualizer falls back to the Canvas2D bit-fill path automatically
 * via `BitGridGL.attach()` returning false.
 *
 * Lowered-3D shading has no GL parity; when `loweredSetBits` is on,
 * the SieveRenderer takes over the bit fill regardless of this flag
 * (see `SieveRenderer.skipBitFill`).
 *
 * Flags are read once at module load to keep behaviour stable across
 * re-renders within a session.
 *
 * See `docs/AI_MAINTENANCE.md` \u00a78 for scope and limitations.
 */

let cachedMode = null;

function readMode() {
  if (typeof window === 'undefined' || !window.location) return 'gl';
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('renderer');
    if (v === 'canvas2d' || v === 'canvas') return 'canvas2d';
    if (v === 'gl') return 'gl';
    if (v === 'gl-worker') return 'gl-worker';
    return 'gl';
  } catch {
    return 'gl';
  }
}

export function getRendererMode() {
  if (cachedMode === null) cachedMode = readMode();
  return cachedMode;
}

export function isGLEnabled() {
  const m = getRendererMode();
  return m === 'gl' || m === 'gl-worker';
}

export function isGLWorkerEnabled() {
  return getRendererMode() === 'gl-worker';
}

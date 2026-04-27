/**
 * Feature flag for the experimental WebGL bit-grid renderer.
 *
 * URL params:
 *   ?renderer=gl         Enable main-thread direct-mode WebGL2 (BitGridGL).
 *   ?renderer=gl-worker  Enable worker-mode WebGL2 (BitGridGLWorker)
 *                        via OffscreenCanvas.transferControlToOffscreen.
 *                        Falls back to no-op if OffscreenCanvas isn't
 *                        supported by the browser; the Canvas2D layer
 *                        keeps drawing on top either way.
 *
 * Default is the Canvas2D path. Flags are read once at module load to
 * keep behaviour stable across re-renders within a session.
 *
 * See `docs/AI_MAINTENANCE.md` §8 for scope, limitations, and item 6.
 */

let cachedMode = null;

function readMode() {
  if (typeof window === 'undefined' || !window.location) return 'canvas2d';
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('renderer');
    if (v === 'gl') return 'gl';
    if (v === 'gl-worker') return 'gl-worker';
    return 'canvas2d';
  } catch {
    return 'canvas2d';
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

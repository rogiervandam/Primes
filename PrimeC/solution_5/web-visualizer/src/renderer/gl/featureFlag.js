/**
 * Feature flag for the experimental WebGL bit-grid renderer.
 *
 * Enabled when the URL contains `?renderer=gl` (or `&renderer=gl`).
 * Default is the Canvas2D path. The flag is read once at module load
 * to keep behaviour stable across re-renders within a session.
 *
 * See `docs/AI_MAINTENANCE.md` §8 for scope and limitations.
 */

let cached = null;

export function isGLEnabled() {
  if (cached !== null) return cached;
  cached = false;
  if (typeof window === 'undefined' || !window.location) return cached;
  try {
    const params = new URLSearchParams(window.location.search);
    cached = params.get('renderer') === 'gl';
  } catch {
    cached = false;
  }
  return cached;
}

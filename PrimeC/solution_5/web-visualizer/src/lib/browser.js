/**
 * SSR-safe browser API wrappers.
 *
 * All helpers return safe fallbacks when `window`/`document` are not
 * available (e.g. during SSR or test environments).
 * No React, no side-effects.
 */

/** Returns true when the DOM is available (not in a server/worker context). */
export const isDOMAvailable = () =>
  typeof document !== 'undefined' && document.documentElement != null;

/** Returns true when `window` is available. */
export const isWindowAvailable = () => typeof window !== 'undefined';

/**
 * Safe `window.innerWidth` / `window.innerHeight`.
 * Falls back to the provided fallback values when `window` is absent.
 */
export function getWindowSize(fallbackW = 0, fallbackH = 0) {
  if (typeof window === 'undefined') return { w: fallbackW, h: fallbackH };
  return { w: window.innerWidth || fallbackW, h: window.innerHeight || fallbackH };
}

/**
 * Safe `window.devicePixelRatio`.
 * Returns 1 when `window` is absent.
 */
export const getDevicePixelRatio = () =>
  (typeof window !== 'undefined' && Number(window.devicePixelRatio)) || 1;

/**
 * Safe `document.elementFromPoint`.
 * Returns null when DOM is unavailable.
 */
export const getElementFromPoint = (x, y) =>
  isDOMAvailable() ? document.elementFromPoint(x, y) : null;

/**
 * Safe `window.screen` dimensions.
 */
export function getScreenSize() {
  if (typeof window === 'undefined') return { w: 0, h: 0 };
  return { w: window.screen?.width || 0, h: window.screen?.height || 0 };
}

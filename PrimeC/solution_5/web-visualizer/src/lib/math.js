/**
 * Pure math helpers shared across the visualizer.
 *
 * No React, no DOM, no closures over component state.
 * All functions are named exports so tree-shaking eliminates unused ones.
 */

/** Clamp `value` into the inclusive `[min, max]` range. */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Clamp an integer — rounds to nearest integer first, then clamps.
 * Returns `fallback` when the value is not finite.
 */
export function clampInt(value, lo, hi, fallback = lo) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Linear interpolation from `from` to `to` at position `t` (0..1). */
export const lerp = (from, to, t) => from + (to - from) * t;

/** Inverse of `lerp`: returns the t that produces `value` given `from` and `to`. */
export const inverseLerp = (from, to, value) =>
  to === from ? 0 : (value - from) / (to - from);

/** Clamp a millisecond value — alias kept for readability in timing code. */
export const clampMs = (value, min, max) => clamp(value, min, max);

/**
 * Nudge `value` by `delta`, clamping to `[min, max]`.
 * Useful for increment/decrement controls.
 */
export const nudge = (value, delta, min, max) => clamp(value + delta, min, max);

/** Fractional progress of `part` within `whole` (0..1, zero-safe). */
export const percentOf = (part, whole) => (whole > 0 ? part / whole : 0);

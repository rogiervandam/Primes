/**
 * Pure animation-timing math used by the Visualizer.
 *
 * These helpers contain no React state, no refs, and no closures over the
 * component — every input they need is passed explicitly. The Visualizer
 * wraps each one in a `useCallback` that supplies the current refs/state.
 */
import { clamp } from './math.js';

/** Clamp `value` into the inclusive `[min, max]` range (ms-naming alias). */
export const clampMs = clamp;

/**
 * Tier sizes for the 'progressive' bits-at-time mapping. Bits are split
 * into three buckets: up to 10, the next up to 100, then the rest. Empty
 * tiers are skipped so a 5-bit event still uses the full timeline.
 */
export function progressiveTierShares(c) {
  const t1 = Math.min(c, 10);
  const t2 = c > 10 ? Math.min(c - 10, 100) : 0;
  const t3 = c > 110 ? c - 110 : 0;
  const filledTiers = (t1 > 0 ? 1 : 0) + (t2 > 0 ? 1 : 0) + (t3 > 0 ? 1 : 0);
  const slice = filledTiers > 0 ? 1 / filledTiers : 0;
  return { t1, t2, t3, slice };
}

/**
 * Given a time ratio (0..1) inside an event's animation window, return how
 * many bits should be revealed.
 *  - `'linear'`     : bits revealed uniformly across the timeline.
 *  - `'progressive'`: see {@link progressiveTierShares}.
 */
export function bitsAtTimeRatio(timeRatio, bitCount, mode = 'progressive') {
  const c = Math.max(0, Math.floor(Number(bitCount) || 0));
  if (c === 0) return 0;
  const t = Math.max(0, Math.min(1, Number(timeRatio) || 0));
  if (mode === 'linear') return Math.min(c, Math.round(t * c));
  const { t1, t2, t3, slice } = progressiveTierShares(c);
  if (slice <= 0) return c;
  let cursor = 0;
  if (t1 > 0) {
    if (t <= cursor + slice) return Math.round(((t - cursor) / slice) * t1);
    cursor += slice;
  }
  if (t2 > 0) {
    if (t <= cursor + slice) return t1 + Math.round(((t - cursor) / slice) * t2);
    cursor += slice;
  }
  if (t3 > 0) {
    return t1 + t2 + Math.round(((t - cursor) / slice) * t3);
  }
  return c;
}

/**
 * Inverse of {@link bitsAtTimeRatio}: given a bit index, return the time
 * ratio (0..1) at which it would appear.
 */
export function timeRatioAtBitIndex(bitIdx, bitCount, mode = 'progressive') {
  const c = Math.max(0, Math.floor(Number(bitCount) || 0));
  if (c === 0) return 0;
  const n = Math.max(0, Math.min(c, Math.floor(Number(bitIdx) || 0)));
  if (mode === 'linear') return Math.min(1, n / c);
  const { t1, t2, t3, slice } = progressiveTierShares(c);
  if (slice <= 0) return 1;
  if (n <= t1) return t1 > 0 ? (n / t1) * slice : 0;
  let r = (t1 > 0 ? slice : 0);
  if (n <= t1 + t2) return r + (t2 > 0 ? ((n - t1) / t2) * slice : 0);
  r += (t2 > 0 ? slice : 0);
  return r + (t3 > 0 ? ((n - t1 - t2) / t3) * slice : 0);
}

/**
 * The "normal" (100 % speed) time target for one event, in ms, picked from
 * the `targets` table by the event's change count and clamped to the
 * configured min/max. Independent of the speed slider.
 */
export function computeEventNormalDuration(bitCount, targets) {
  const n = Math.max(0, Math.floor(Number(bitCount) || 0));
  let base;
  if (n === 0) base = targets.none;
  else if (n === 1) base = targets.one;
  else if (n === 2) base = targets.two;
  else if (n <= 10) base = targets.few;
  else if (n <= 100) base = targets.many;
  else base = targets.lots;
  const min = Math.max(0, targets.min || 0);
  const max = Math.max(min, targets.max || base);
  return Math.max(min, Math.min(max, Math.round(base)));
}

/**
 * Compute the per-event duration in ms once the speed slider is applied.
 * Caller must pass `speedPercent` (1..1600) and the `targets` table; the
 * returned duration is at least 80 ms.
 */
export function computeEventDuration(bitCount, targets, speedPercent) {
  const normal = computeEventNormalDuration(bitCount, targets);
  const speedPct = Math.max(1, Math.min(1600, Number(speedPercent) || 100));
  return Math.max(80, Math.round(normal * 100 / speedPct));
}

/** Fade-out duration for residual highlights, scaled by the bit count. */
export function getFadeOutDuration(bitCount, options = {}) {
  if (options.skipFadeOut) return 0;
  return clampMs(Math.round(Math.min(320, Math.max(120, Math.max(1, bitCount) * 4))), 80, 420);
}

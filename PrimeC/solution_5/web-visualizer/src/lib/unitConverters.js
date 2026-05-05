/**
 * Bidirectional converters between user-facing slider values (1..100)
 * and underlying durations.
 *
 * - `playbackSpeed` slider maps log-scaled to a percentage 25..400 (where
 *   100% is the per-event "normal" target time).
 * - `stepSpeed` slider maps linear to an interval in milliseconds 5..5000
 *   used for sequential per-bit reveal animations.
 *
 * Keeping these in one file ensures the SettingsPanel sliders and any
 * other UI showing the same logical knob agree on the math.
 */

import { clamp } from './math.js';

/** Map slider value (1..100) → playback speed percentage (25..400). */
export function playbackSpeedToPercent(speedValue) {
  const speed = clamp(parseInt(speedValue || 0, 10) || 1, 1, 100);
  const ratio = (speed - 1) / 99;
  return Math.round(25 * Math.pow(400 / 25, ratio));
}

/** Inverse: percentage → slider value. */
export function percentToPlaybackSpeed(pctValue) {
  const pct = clamp(parseInt(pctValue || 0, 10) || 100, 25, 400);
  const ratio = Math.log(pct / 25) / Math.log(400 / 25);
  return Math.round(1 + ratio * 99);
}

/** Map slider value (1..100) → per-bit interval in milliseconds (5..5000). */
export function stepSpeedToInterval(speedValue) {
  const speed = clamp(parseInt(speedValue || 0, 10) || 1, 1, 100);
  const ratio = (speed - 1) / 99;
  return Math.round(5000 - ratio * (5000 - 5));
}

/** Inverse: per-bit interval → slider value. */
export function intervalToStepSpeed(intervalValue) {
  const interval = clamp(parseInt(intervalValue || 0, 10) || 20, 5, 5000);
  const ratio = (5000 - interval) / (5000 - 5);
  return Math.round(1 + ratio * 99);
}

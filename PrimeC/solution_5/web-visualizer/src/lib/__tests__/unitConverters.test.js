import { describe, it, expect } from 'vitest';
import {
  playbackSpeedToPercent,
  percentToPlaybackSpeed,
  stepSpeedToInterval,
  intervalToStepSpeed,
} from '../unitConverters.js';

// ─── playbackSpeedToPercent ───────────────────────────────────────────────

describe('playbackSpeedToPercent', () => {
  it('slider=1 → 25% (minimum)', () => {
    expect(playbackSpeedToPercent(1)).toBe(25);
  });

  it('slider=100 → 400% (maximum)', () => {
    expect(playbackSpeedToPercent(100)).toBe(400);
  });

  it('slider=50 → approximately 100% (log-scale midpoint, rounds to 99)', () => {
    const pct = playbackSpeedToPercent(50);
    // Geometric mean of 25 and 400 = sqrt(10000) = 100.
    // Due to slider range 1..100 (not 0..100), ratio=49/99 ≠ 0.5 exactly,
    // so result is 99 rather than exactly 100.
    expect(pct).toBeGreaterThanOrEqual(95);
    expect(pct).toBeLessThanOrEqual(105);
  });

  it('clamps below 1 to slider=1', () => {
    expect(playbackSpeedToPercent(0)).toBe(25);
    expect(playbackSpeedToPercent(-5)).toBe(25);
  });

  it('clamps above 100 to slider=100', () => {
    expect(playbackSpeedToPercent(101)).toBe(400);
    expect(playbackSpeedToPercent(999)).toBe(400);
  });

  it('handles string input', () => {
    expect(playbackSpeedToPercent('1')).toBe(25);
    expect(playbackSpeedToPercent('100')).toBe(400);
  });

  it('handles null/undefined gracefully (falls back to slider=1)', () => {
    expect(playbackSpeedToPercent(null)).toBe(25);
    expect(playbackSpeedToPercent(undefined)).toBe(25);
  });
});

// ─── percentToPlaybackSpeed ───────────────────────────────────────────────

describe('percentToPlaybackSpeed', () => {
  it('25% → slider=1 (minimum)', () => {
    expect(percentToPlaybackSpeed(25)).toBe(1);
  });

  it('400% → slider=100 (maximum)', () => {
    expect(percentToPlaybackSpeed(400)).toBe(100);
  });

  it('100% → approximately slider=50 (rounds to 51 due to Math.round(50.5))', () => {
    // ratio=log(100/25)/log(400/25)=0.5 exactly; result=round(1+0.5*99)=round(50.5)=51
    expect(percentToPlaybackSpeed(100)).toBe(51);
  });

  it('clamps below 25% to 25% (0 is falsy, falls back to 100%)', () => {
    // parseInt(0) || 100 = 100, so 0 and null both behave like 100%
    expect(percentToPlaybackSpeed(0)).toBeCloseTo(51, 0);
    expect(percentToPlaybackSpeed(10)).toBe(1);
  });

  it('clamps above 400% to 400%', () => {
    expect(percentToPlaybackSpeed(500)).toBe(100);
  });

  it('handles string input', () => {
    expect(percentToPlaybackSpeed('25')).toBe(1);
    expect(percentToPlaybackSpeed('400')).toBe(100);
  });

  it('handles null/undefined gracefully (falls back to 100%, returns ~51)', () => {
    // null/undefined → parseInt(null) = NaN → NaN || 100 → clamp(100,25,400)=100
    // percentToPlaybackSpeed(100) = Math.round(1 + 0.5*99) = Math.round(50.5) = 51
    expect(percentToPlaybackSpeed(null)).toBe(51);
    expect(percentToPlaybackSpeed(undefined)).toBe(51);
  });
});

// ─── Round-trip: playbackSpeedToPercent ↔ percentToPlaybackSpeed ─────────

describe('playbackSpeed round-trip', () => {
  for (const speed of [1, 10, 25, 50, 75, 100]) {
    it(`slider=${speed} survives round-trip`, () => {
      const pct = playbackSpeedToPercent(speed);
      expect(percentToPlaybackSpeed(pct)).toBeCloseTo(speed, 0);
    });
  }
});

// ─── stepSpeedToInterval ─────────────────────────────────────────────────

describe('stepSpeedToInterval', () => {
  it('slider=1 → 5000 ms (slowest)', () => {
    expect(stepSpeedToInterval(1)).toBe(5000);
  });

  it('slider=100 → 5 ms (fastest)', () => {
    expect(stepSpeedToInterval(100)).toBe(5);
  });

  it('slider=50 → 2528 ms (formula: 5000 - ratio*4995 where ratio=49/99)', () => {
    const ms = stepSpeedToInterval(50);
    // ratio = (50-1)/99 = 49/99 ≈ 0.4949; ms = round(5000 - 49/99*4995) = 2528
    expect(ms).toBe(2528);
  });

  it('clamps below 1 to slider=1', () => {
    expect(stepSpeedToInterval(0)).toBe(5000);
    expect(stepSpeedToInterval(-10)).toBe(5000);
  });

  it('clamps above 100 to slider=100', () => {
    expect(stepSpeedToInterval(200)).toBe(5);
  });
});

// ─── intervalToStepSpeed ─────────────────────────────────────────────────

describe('intervalToStepSpeed', () => {
  it('5000 ms → slider=1 (slowest)', () => {
    expect(intervalToStepSpeed(5000)).toBe(1);
  });

  it('5 ms → slider=100 (fastest)', () => {
    expect(intervalToStepSpeed(5)).toBe(100);
  });

  it('clamps below 5 ms to 5 ms', () => {
    expect(intervalToStepSpeed(0)).toBe(100);
    expect(intervalToStepSpeed(1)).toBe(100);
  });

  it('clamps above 5000 ms to 5000 ms', () => {
    expect(intervalToStepSpeed(9999)).toBe(1);
  });

  it('handles string input', () => {
    expect(intervalToStepSpeed('5000')).toBe(1);
    expect(intervalToStepSpeed('5')).toBe(100);
  });

  it('handles null/undefined gracefully (falls back to 20 ms → mid-high speed)', () => {
    const v = intervalToStepSpeed(null);
    expect(v).toBeGreaterThanOrEqual(90);
    expect(v).toBeLessThanOrEqual(100);
  });
});

// ─── Round-trip: stepSpeedToInterval ↔ intervalToStepSpeed ───────────────

describe('stepSpeed round-trip', () => {
  for (const speed of [1, 10, 25, 50, 75, 100]) {
    it(`slider=${speed} survives round-trip`, () => {
      const ms = stepSpeedToInterval(speed);
      expect(intervalToStepSpeed(ms)).toBeCloseTo(speed, 0);
    });
  }
});

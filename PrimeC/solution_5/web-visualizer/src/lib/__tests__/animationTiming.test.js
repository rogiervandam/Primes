import { describe, it, expect } from 'vitest';
import {
  clampMs,
  progressiveTierShares,
  bitsAtTimeRatio,
  timeRatioAtBitIndex,
  computeEventNormalDuration,
  computeEventDuration,
  getFadeOutDuration,
} from '../animationTiming.js';

// Default targets table matching the production defaults used in Visualizer.jsx
const DEFAULT_TARGETS = {
  none: 400,
  one: 600,
  two: 700,
  few: 1200,
  many: 2000,
  lots: 3000,
  min: 400,
  max: 4000,
};

describe('clampMs', () => {
  it('returns value when within range', () => {
    expect(clampMs(500, 100, 1000)).toBe(500);
  });
  it('clamps to min', () => {
    expect(clampMs(50, 100, 1000)).toBe(100);
  });
  it('clamps to max', () => {
    expect(clampMs(2000, 100, 1000)).toBe(1000);
  });
});

describe('progressiveTierShares', () => {
  it('1 bit → t1=1, t2=0, t3=0, slice=1', () => {
    const r = progressiveTierShares(1);
    expect(r).toEqual({ t1: 1, t2: 0, t3: 0, slice: 1 });
  });

  it('10 bits → t1=10, t2=0, t3=0, 1 tier', () => {
    const r = progressiveTierShares(10);
    expect(r.t1).toBe(10);
    expect(r.t2).toBe(0);
    expect(r.t3).toBe(0);
    expect(r.slice).toBe(1);
  });

  it('15 bits → t1=10, t2=5, t3=0, 2 tiers, slice=0.5', () => {
    const r = progressiveTierShares(15);
    expect(r.t1).toBe(10);
    expect(r.t2).toBe(5);
    expect(r.t3).toBe(0);
    expect(r.slice).toBeCloseTo(0.5);
  });

  it('120 bits → t1=10, t2=100, t3=10, 3 tiers, slice≈0.333', () => {
    const r = progressiveTierShares(120);
    expect(r.t1).toBe(10);
    expect(r.t2).toBe(100);
    expect(r.t3).toBe(10);
    expect(r.slice).toBeCloseTo(1 / 3);
  });
});

describe('bitsAtTimeRatio', () => {
  it('returns 0 for zero bitCount', () => {
    expect(bitsAtTimeRatio(0.5, 0)).toBe(0);
  });

  it('linear mode: t=0 → 0 bits', () => {
    expect(bitsAtTimeRatio(0, 100, 'linear')).toBe(0);
  });

  it('linear mode: t=1 → full bitCount', () => {
    expect(bitsAtTimeRatio(1, 100, 'linear')).toBe(100);
  });

  it('linear mode: t=0.5 → ~50 bits', () => {
    expect(bitsAtTimeRatio(0.5, 100, 'linear')).toBe(50);
  });

  it('progressive mode: t=0 → 0 bits', () => {
    expect(bitsAtTimeRatio(0, 120)).toBe(0);
  });

  it('progressive mode: t=1 → full bitCount', () => {
    expect(bitsAtTimeRatio(1, 120)).toBe(120);
  });

  it('progressive mode: first tier ends at slice boundary', () => {
    // 120 bits: t1=10, t2=100, t3=10, slice=1/3
    // At t=1/3: should reveal all 10 of t1
    expect(bitsAtTimeRatio(1 / 3, 120)).toBe(10);
  });

  it('progressive mode: second tier ends at 2*slice boundary', () => {
    // At t=2/3: should reveal t1+t2 = 110 bits
    expect(bitsAtTimeRatio(2 / 3, 120)).toBe(110);
  });
});

describe('timeRatioAtBitIndex (inverse of bitsAtTimeRatio)', () => {
  it('returns 0 for zero bitCount', () => {
    expect(timeRatioAtBitIndex(0, 0)).toBe(0);
  });

  it('linear: index=0 → 0', () => {
    expect(timeRatioAtBitIndex(0, 100, 'linear')).toBe(0);
  });

  it('linear: last index → 1', () => {
    expect(timeRatioAtBitIndex(100, 100, 'linear')).toBe(1);
  });

  it('linear: round-trips with bitsAtTimeRatio', () => {
    for (const idx of [0, 10, 50, 99, 100]) {
      const ratio = timeRatioAtBitIndex(idx, 100, 'linear');
      const back = bitsAtTimeRatio(ratio, 100, 'linear');
      expect(back).toBeCloseTo(idx, 0);
    }
  });

  it('progressive: tier-1 boundary round-trips', () => {
    // t1=10 of 120 bits; the ratio should be 1/3 (one filled tier)
    const ratio = timeRatioAtBitIndex(10, 120, 'progressive');
    expect(ratio).toBeCloseTo(1 / 3);
  });

  it('progressive: tier-1+2 boundary round-trips', () => {
    const ratio = timeRatioAtBitIndex(110, 120, 'progressive');
    expect(ratio).toBeCloseTo(2 / 3);
  });
});

describe('computeEventNormalDuration', () => {
  it('0 bits → targets.none', () => {
    expect(computeEventNormalDuration(0, DEFAULT_TARGETS)).toBe(DEFAULT_TARGETS.none);
  });

  it('1 bit → targets.one', () => {
    expect(computeEventNormalDuration(1, DEFAULT_TARGETS)).toBe(DEFAULT_TARGETS.one);
  });

  it('2 bits → targets.two', () => {
    expect(computeEventNormalDuration(2, DEFAULT_TARGETS)).toBe(DEFAULT_TARGETS.two);
  });

  it('5 bits → targets.few', () => {
    expect(computeEventNormalDuration(5, DEFAULT_TARGETS)).toBe(DEFAULT_TARGETS.few);
  });

  it('50 bits → targets.many', () => {
    expect(computeEventNormalDuration(50, DEFAULT_TARGETS)).toBe(DEFAULT_TARGETS.many);
  });

  it('200 bits → targets.lots', () => {
    expect(computeEventNormalDuration(200, DEFAULT_TARGETS)).toBe(DEFAULT_TARGETS.lots);
  });

  it('clamped to max', () => {
    const targets = { ...DEFAULT_TARGETS, lots: 9999, max: 4000 };
    expect(computeEventNormalDuration(200, targets)).toBe(4000);
  });
});

describe('computeEventDuration', () => {
  it('100% speed → normal duration', () => {
    const normal = computeEventNormalDuration(50, DEFAULT_TARGETS);
    expect(computeEventDuration(50, DEFAULT_TARGETS, 100)).toBe(normal);
  });

  it('200% speed → half duration', () => {
    const normal = computeEventNormalDuration(50, DEFAULT_TARGETS);
    const fast = computeEventDuration(50, DEFAULT_TARGETS, 200);
    expect(fast).toBe(Math.max(80, Math.round(normal / 2)));
  });

  it('never returns less than 80 ms', () => {
    // Extreme speed (1000%) + tiny event
    expect(computeEventDuration(0, DEFAULT_TARGETS, 1000)).toBeGreaterThanOrEqual(80);
  });
});

describe('getFadeOutDuration', () => {
  it('returns 0 when skipFadeOut is true', () => {
    expect(getFadeOutDuration(100, { skipFadeOut: true })).toBe(0);
  });

  it('scales with bitCount', () => {
    const small = getFadeOutDuration(1);
    const large = getFadeOutDuration(10000);
    expect(large).toBeGreaterThanOrEqual(small);
  });

  it('clamped between 80 and 420 ms', () => {
    expect(getFadeOutDuration(0)).toBeGreaterThanOrEqual(80);
    expect(getFadeOutDuration(100000)).toBeLessThanOrEqual(420);
  });
});

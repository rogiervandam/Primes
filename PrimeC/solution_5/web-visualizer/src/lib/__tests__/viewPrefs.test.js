import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EVENT_TIME_TARGETS,
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_EVENT_TITLE_SETTINGS,
  DEFAULT_DEPTH_SETTINGS,
  mergeEventTimeTargets,
  mergeLayoutSettings,
  mergeEventTitleSettings,
  mergeDepthSettings,
} from '../viewPrefs';

// Note: readViewPrefs / writeViewPrefs / getInitialViewState are NOT tested
// here because they depend on window.localStorage (not available in Node).
// The merge helpers below are pure (no DOM dependency) and cover the
// critical migration / validation logic.

// ─── mergeEventTimeTargets ────────────────────────────────────────────────────

describe('mergeEventTimeTargets', () => {
  it('returns defaults for null input', () => {
    expect(mergeEventTimeTargets(null)).toEqual(DEFAULT_EVENT_TIME_TARGETS);
  });

  it('returns defaults for undefined input', () => {
    expect(mergeEventTimeTargets(undefined)).toEqual(DEFAULT_EVENT_TIME_TARGETS);
  });

  it('returns defaults for non-object input', () => {
    expect(mergeEventTimeTargets('string')).toEqual(DEFAULT_EVENT_TIME_TARGETS);
    expect(mergeEventTimeTargets(42)).toEqual(DEFAULT_EVENT_TIME_TARGETS);
  });

  it('merges valid numeric overrides', () => {
    const result = mergeEventTimeTargets({ none: 300, one: 600 });
    expect(result.none).toBe(300);
    expect(result.one).toBe(600);
    // Others stay at default
    expect(result.two).toBe(DEFAULT_EVENT_TIME_TARGETS.two);
  });

  it('rounds fractional values', () => {
    const result = mergeEventTimeTargets({ none: 250.7 });
    expect(result.none).toBe(251);
  });

  it('keeps default when value is negative (only non-negative values are applied)', () => {
    // The guard is `v >= 0`, so a negative input is silently ignored and
    // the default remains rather than being clamped to 0.
    const result = mergeEventTimeTargets({ none: -100 });
    expect(result.none).toBe(DEFAULT_EVENT_TIME_TARGETS.none);
  });

  it('ignores NaN / non-numeric strings but treats null/undefined as 0 (Number semantics)', () => {
    // 'bad' → Number('bad') = NaN → ignored, default kept.
    // null  → Number(null) = 0 → finite & ≥ 0, so it IS applied (overrides to 0).
    const result = mergeEventTimeTargets({ none: 'bad', one: null });
    expect(result.none).toBe(DEFAULT_EVENT_TIME_TARGETS.none); // kept
    expect(result.one).toBe(0); // null coerces to 0 and is accepted
  });

  it('swaps min/max if min > max', () => {
    const result = mergeEventTimeTargets({ min: 20000, max: 100 });
    expect(result.min).toBeLessThan(result.max);
    expect(result.min).toBe(100);
    expect(result.max).toBe(20000);
  });

  it('preserves all keys from defaults', () => {
    const result = mergeEventTimeTargets({});
    expect(Object.keys(result)).toEqual(Object.keys(DEFAULT_EVENT_TIME_TARGETS));
  });
});

// ─── mergeLayoutSettings ─────────────────────────────────────────────────────

describe('mergeLayoutSettings', () => {
  it('returns defaults for null input', () => {
    expect(mergeLayoutSettings(null)).toEqual(DEFAULT_LAYOUT_SETTINGS);
  });

  it('returns defaults for undefined', () => {
    expect(mergeLayoutSettings(undefined)).toEqual(DEFAULT_LAYOUT_SETTINGS);
  });

  it('merges flat overrides', () => {
    const result = mergeLayoutSettings({ bitLayout: '8x1', bitSpacingH: 3 });
    expect(result.bitLayout).toBe('8x1');
    expect(result.bitSpacingH).toBe(3);
    expect(result.byteLayout).toBe(DEFAULT_LAYOUT_SETTINGS.byteLayout);
  });

  it('deep-merges the outlines sub-object', () => {
    const result = mergeLayoutSettings({
      outlines: { targets: ['prime'], extra: true },
    });
    expect(result.outlines.targets).toEqual(['prime']);
    expect(result.outlines.extra).toBe(true);
  });

  it('migrates legacy single outlines.target to targets array', () => {
    const result = mergeLayoutSettings({
      outlines: { target: 'prime' },
    });
    expect(result.outlines.targets).toEqual(['prime']);
    expect(result.outlines.target).toBe('prime'); // original key preserved
  });

  it('treats legacy target "none" as empty targets array', () => {
    const result = mergeLayoutSettings({
      outlines: { target: 'none' },
    });
    expect(result.outlines.targets).toEqual([]);
  });

  it('ignores outlines.target when targets array is already present', () => {
    const result = mergeLayoutSettings({
      outlines: { target: 'prime', targets: ['range'] },
    });
    expect(result.outlines.targets).toEqual(['range']);
  });

  it('defaults outlines.targets to empty array when absent', () => {
    const result = mergeLayoutSettings({ outlines: {} });
    expect(result.outlines.targets).toEqual([]);
  });
});

// ─── mergeEventTitleSettings ─────────────────────────────────────────────────

describe('mergeEventTitleSettings', () => {
  it('returns defaults for null', () => {
    const result = mergeEventTitleSettings(null);
    expect(result).toEqual({
      ...DEFAULT_EVENT_TITLE_SETTINGS,
      visible: true,
      position: 'center',
    });
  });

  it('forces visible:true regardless of saved value', () => {
    expect(mergeEventTitleSettings({ visible: false }).visible).toBe(true);
    expect(mergeEventTitleSettings({ visible: true }).visible).toBe(true);
  });

  it('forces position:"center" regardless of saved value', () => {
    expect(mergeEventTitleSettings({ position: 'left' }).position).toBe('center');
  });

  it('clamps scale to [70, 160]', () => {
    expect(mergeEventTitleSettings({ scale: 50 }).scale).toBe(70);
    expect(mergeEventTitleSettings({ scale: 200 }).scale).toBe(160);
    expect(mergeEventTitleSettings({ scale: 100 }).scale).toBe(100);
  });

  it('falls back to default scale for non-numeric', () => {
    expect(mergeEventTitleSettings({ scale: 'bad' }).scale).toBe(
      DEFAULT_EVENT_TITLE_SETTINGS.scale
    );
  });

  it('preserves finite dragOffsetX / dragOffsetY', () => {
    const result = mergeEventTitleSettings({ dragOffsetX: -120, dragOffsetY: 40 });
    expect(result.dragOffsetX).toBe(-120);
    expect(result.dragOffsetY).toBe(40);
  });

  it('defaults dragOffsets to 0 for non-finite values', () => {
    const result = mergeEventTitleSettings({ dragOffsetX: 'bad', dragOffsetY: Infinity });
    expect(result.dragOffsetX).toBe(0);
    expect(result.dragOffsetY).toBe(0);
  });

  it('preserves contextCollapsed:true', () => {
    expect(mergeEventTitleSettings({ contextCollapsed: true }).contextCollapsed).toBe(true);
  });

  it('coerces contextCollapsed to false for non-boolean', () => {
    expect(mergeEventTitleSettings({ contextCollapsed: 1 }).contextCollapsed).toBe(false);
    expect(mergeEventTitleSettings({ contextCollapsed: 'yes' }).contextCollapsed).toBe(false);
    expect(mergeEventTitleSettings({}).contextCollapsed).toBe(false);
  });
});

// ─── mergeDepthSettings ──────────────────────────────────────────────────────

describe('mergeDepthSettings', () => {
  it('returns defaults for null', () => {
    expect(mergeDepthSettings(null)).toEqual(DEFAULT_DEPTH_SETTINGS);
  });

  it('clamps strength to [0, 100]', () => {
    expect(mergeDepthSettings({ strength: -10 }).strength).toBe(0);
    expect(mergeDepthSettings({ strength: 150 }).strength).toBe(100);
    expect(mergeDepthSettings({ strength: 50 }).strength).toBe(50);
  });

  it('clamps angle to [0, 90]', () => {
    expect(mergeDepthSettings({ angle: -5 }).angle).toBe(0);
    expect(mergeDepthSettings({ angle: 120 }).angle).toBe(90);
    expect(mergeDepthSettings({ angle: 45 }).angle).toBe(45);
  });

  it('falls back to default for non-numeric strength', () => {
    expect(mergeDepthSettings({ strength: 'bad' }).strength).toBe(
      DEFAULT_DEPTH_SETTINGS.strength
    );
  });

  it('falls back to default for non-numeric angle', () => {
    expect(mergeDepthSettings({ angle: null }).angle).toBe(
      DEFAULT_DEPTH_SETTINGS.angle
    );
  });
});

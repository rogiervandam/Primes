import { describe, it, expect } from 'vitest';
import {
  maskTintColor,
  maskWriteEntries,
  maskWordOrderSummary,
  maskEntriesBySlot,
  maskEntryBits,
  maskEntryGroupBounds,
} from '../mask/maskMetadata';
import { mixRgb } from '../drawingHelpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHost(overrides = {}) {
  return {
    // maskTintColor needs these
    _opColor: () => [100, 200, 100],
    _mixRgb: (a, b, t) => mixRgb(a, b, t),

    // maskWriteEntries needs these
    maskWriteOrderWords: [],
    maskWriteOrderSlots: [],
    maskWriteOrderEventIds: [],
    maskWordBits: 64,
    bitCount: 128,
    _multiBitBoundsSegments: (startBit, count) => [
      { startBit, count, bounds: { x: 0, y: 0, w: 64, h: 8, cx: 32, cy: 4 }, row: 0 },
    ],
    _vectorSlotLayout: () => ({}),
    _logicalGroupBits: () => 64,

    // maskEntryBits needs these
    maskSlotBits: {},

    ...overrides,
  };
}

// ─── maskTintColor ────────────────────────────────────────────────────────────

describe('maskTintColor', () => {
  it('returns the base op-colour for even slots', () => {
    const host = makeHost();
    expect(maskTintColor(host, 0)).toEqual([100, 200, 100]);
    expect(maskTintColor(host, 2)).toEqual([100, 200, 100]);
  });

  it('returns a mixed colour for odd slots', () => {
    const host = makeHost();
    const result = maskTintColor(host, 1);
    // Should be different from the base colour
    expect(result).not.toEqual([100, 200, 100]);
    // Should be a valid rgb triple
    expect(result).toHaveLength(3);
    result.forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    });
  });

  it('defaults slotIndex to 0 when omitted', () => {
    const host = makeHost();
    expect(maskTintColor(host)).toEqual(maskTintColor(host, 0));
  });
});

// ─── maskWriteEntries ─────────────────────────────────────────────────────────

describe('maskWriteEntries', () => {
  it('returns [] when maskWriteOrderWords is empty', () => {
    expect(maskWriteEntries(makeHost())).toEqual([]);
  });

  it('returns [] when maskWriteOrderWords is undefined', () => {
    const host = makeHost({ maskWriteOrderWords: undefined });
    expect(maskWriteEntries(host)).toEqual([]);
  });

  it('returns [] when maskWordBits is invalid', () => {
    const host = makeHost({ maskWriteOrderWords: [0], maskWordBits: 0 });
    expect(maskWriteEntries(host)).toEqual([]);
  });

  it('returns one entry for a single word write', () => {
    const host = makeHost({
      maskWriteOrderWords: [0],
      maskWriteOrderSlots: [0],
      maskWriteOrderEventIds: [42],
    });
    const entries = maskWriteEntries(host);
    expect(entries).toHaveLength(1);
    expect(entries[0].wordIndex).toBe(0);
    expect(entries[0].slotIndex).toBe(0);
    expect(entries[0].eventId).toBe(42);
    expect(entries[0].startBit).toBe(0);
    expect(entries[0].count).toBe(64);
  });

  it('skips invalid (non-finite/negative) word indices', () => {
    const host = makeHost({
      maskWriteOrderWords: [NaN, -1, 0],
      maskWriteOrderSlots: [0, 0, 0],
      maskWriteOrderEventIds: [1, 2, 3],
    });
    const entries = maskWriteEntries(host);
    // Only wordIndex=0 is valid
    expect(entries).toHaveLength(1);
    expect(entries[0].wordIndex).toBe(0);
  });

  it('assigns sequential order values across segments', () => {
    const host = makeHost({
      maskWriteOrderWords: [0, 1],
      maskWriteOrderSlots: [0, 1],
      maskWriteOrderEventIds: [10, 20],
    });
    const entries = maskWriteEntries(host);
    expect(entries).toHaveLength(2);
    expect(entries[0].order).toBe(0);
    expect(entries[1].order).toBe(1);
  });
});

// ─── maskWordOrderSummary ─────────────────────────────────────────────────────

describe('maskWordOrderSummary', () => {
  it('returns [] when there are no write entries', () => {
    expect(maskWordOrderSummary(makeHost())).toEqual([]);
  });

  it('deduplicates repeated writes to the same word index', () => {
    const host = makeHost({
      maskWriteOrderWords: [0, 0, 1],
      maskWriteOrderSlots: [0, 0, 0],
      maskWriteOrderEventIds: [1, 2, 3],
    });
    const summary = maskWordOrderSummary(host);
    expect(summary).toHaveLength(2);
    const word0 = summary.find((s) => s.wordIndex === 0);
    expect(word0.orders).toHaveLength(2);
  });

  it('sorts results by wordIndex', () => {
    const host = makeHost({
      maskWriteOrderWords: [2, 0, 1],
      maskWriteOrderSlots: [0, 0, 0],
      maskWriteOrderEventIds: [1, 2, 3],
    });
    const summary = maskWordOrderSummary(host);
    const indices = summary.map((s) => s.wordIndex);
    expect(indices).toEqual([0, 1, 2]);
  });
});

// ─── maskEntriesBySlot ────────────────────────────────────────────────────────

describe('maskEntriesBySlot', () => {
  it('returns [] when there are no write entries', () => {
    expect(maskEntriesBySlot(makeHost())).toEqual([]);
  });

  it('groups entries by slotIndex', () => {
    const host = makeHost({
      maskWriteOrderWords: [0, 1, 2],
      maskWriteOrderSlots: [0, 1, 0],
      maskWriteOrderEventIds: [1, 2, 3],
    });
    const grouped = maskEntriesBySlot(host);
    expect(grouped).toHaveLength(2); // slot 0 and slot 1
    expect(grouped[0]).toHaveLength(2); // two words in slot 0
    expect(grouped[1]).toHaveLength(1); // one word in slot 1
  });
});

// ─── maskEntryBits ────────────────────────────────────────────────────────────

describe('maskEntryBits', () => {
  it('returns [] for a null entry', () => {
    expect(maskEntryBits(makeHost(), null)).toEqual([]);
  });

  it('returns [] when the slot has no bits recorded', () => {
    const host = makeHost({ maskSlotBits: {} });
    const entry = { slotIndex: 0, wordStartBit: 0, startBit: 0, count: 64 };
    expect(maskEntryBits(host, entry)).toEqual([]);
  });

  it('returns only bits that fall within the entry range', () => {
    const host = makeHost({
      bitCount: 128,
      maskSlotBits: {
        0: [0, 8, 72], // bits 0 and 8 are in [0,64); bit 72 maps to word 0 + 72 = out of range
      },
    });
    const entry = { slotIndex: 0, wordStartBit: 0, startBit: 0, count: 64 };
    const bits = maskEntryBits(host, entry);
    expect(bits).toEqual([0, 8]);
  });
});

// ─── maskEntryGroupBounds ─────────────────────────────────────────────────────

describe('maskEntryGroupBounds', () => {
  it('returns null for a null entry', () => {
    expect(maskEntryGroupBounds(makeHost(), null)).toBeNull();
  });

  it('returns bounds from the segment containing the entry', () => {
    const expectedBounds = { x: 10, y: 0, w: 64, h: 8, cx: 42, cy: 4 };
    const host = makeHost({
      _multiBitBoundsSegments: (_start, _count) => [
        { startBit: 0, count: 64, bounds: expectedBounds, row: 0 },
      ],
      _logicalGroupBits: () => 64,
    });
    const entry = { startBit: 0, count: 64 };
    const bounds = maskEntryGroupBounds(host, entry);
    expect(bounds).toEqual(expectedBounds);
  });
});

import { describe, it, expect } from 'vitest';
import {
  bitVisualRow,
  multiBitBounds,
  multiBitBoundsSegments,
  getElementBounds,
} from '../layout/geometry';

/**
 * Minimal mock host — same layout as in transforms.test.js.
 * Each bit maps to an (x, y) centre point via bitIndexToCanvas.
 */
function makeHost(overrides = {}) {
  return {
    bitCount: 128,
    bitsPerCacheLine: 64,
    vectorGroup: 1,
    pixelSize: 8,
    zoom: 1,
    panX: 0,
    panY: 0,
    bitLayout: '8x1',
    byteLayout: '8x1',

    _bitStepX: () => 8,
    _bitStepY: () => 8,
    _byteGapX: () => 0,
    _byteGapY: () => 0,
    _u64GapX: () => 0,
    _u64GapY: () => 0,
    _byteDims: () => ({ w: 64, h: 8 }),
    _u64Dims: () => ({ w: 512, h: 8 }),
    _vectorDims: () => ({ w: 512, h: 8, intraGap: 0 }),
    _rowDims: () => ({ w: 512, h: 8 }),
    _labelHeight: () => 0,
    _numVectorsPerRow: () => 1,
    _vectorGroupsPerVisualRow: () => 1,
    _bytePosInU64: (i) => ({ col: i, row: 0 }),
    _bitPosInByte: (i) => ({ col: i, row: 0 }),

    // bitIndexToCanvas uses these — provide the real implementation via host
    bitIndexToCanvas(bitIdx) {
      if (bitIdx < 0 || bitIdx >= this.bitCount) return null;
      const clIdx = Math.floor(bitIdx / this.bitsPerCacheLine);
      const bitInRow = bitIdx % this.bitsPerCacheLine;
      const u64Idx = Math.floor(bitInRow / 64);
      const bitInU64 = bitInRow % 64;
      const byteIdx = Math.floor(bitInU64 / 8);
      const bitInByte = bitInU64 % 8;
      const vRow = clIdx; // one vector per row
      const rowDataY = this.panY + vRow * 8 + 0; // labelH=0, vRowHeight=8
      const byteX = this.panX + byteIdx * 64;
      const px = this.pixelSize * this.zoom;
      const x = byteX + bitInByte * 8 + px / 2;
      const y = rowDataY + px / 2;
      return { x, y };
    },

    ...overrides,
  };
}

// ─── bitVisualRow ─────────────────────────────────────────────────────────────

describe('bitVisualRow', () => {
  it('returns 0 for bits in the first cache line', () => {
    const host = makeHost();
    expect(bitVisualRow(host, 0)).toBe(0);
    expect(bitVisualRow(host, 1)).toBe(0);
    expect(bitVisualRow(host, 63)).toBe(0);
  });

  it('returns 1 for bits in the second cache line', () => {
    const host = makeHost();
    expect(bitVisualRow(host, 64)).toBe(1);
    expect(bitVisualRow(host, 127)).toBe(1);
  });

  it('returns -1 for out-of-range indices', () => {
    const host = makeHost();
    expect(bitVisualRow(host, -1)).toBe(-1);
    expect(bitVisualRow(host, 128)).toBe(-1);
  });
});

// ─── multiBitBounds ───────────────────────────────────────────────────────────

describe('multiBitBounds', () => {
  it('returns a 1-pixel-square bounding box for a single bit', () => {
    const host = makeHost();
    const b = multiBitBounds(host, 0, 1);
    expect(b).not.toBeNull();
    expect(b.x).toBe(0);   // centre.x(4) - px/2(4)
    expect(b.y).toBe(0);   // centre.y(4) - px/2(4)
    expect(b.w).toBe(8);
    expect(b.h).toBe(8);
    expect(b.cx).toBe(4);
    expect(b.cy).toBe(4);
  });

  it('spans the full first cache line width for 64 bits', () => {
    const host = makeHost();
    const b = multiBitBounds(host, 0, 64);
    expect(b).not.toBeNull();
    expect(b.x).toBe(0);       // leftmost bit centre - 4 = 0
    expect(b.y).toBe(0);
    expect(b.w).toBe(512);     // rightmost bit centre + 4 = 512
    expect(b.h).toBe(8);
  });

  it('returns null when all requested bits are out of range', () => {
    const host = makeHost();
    expect(multiBitBounds(host, 200, 10)).toBeNull();
  });

  it('centres cx/cy at the midpoint of the spanned region', () => {
    const host = makeHost();
    const b = multiBitBounds(host, 0, 2); // bits 0 and 1 → centres at x=4 and x=12
    expect(b.cx).toBe(8);   // (0 + 16) / 2
  });
});

// ─── multiBitBoundsSegments ───────────────────────────────────────────────────

describe('multiBitBoundsSegments', () => {
  it('returns an empty array when startBit is out of range', () => {
    expect(multiBitBoundsSegments(makeHost(), 200, 10)).toEqual([]);
  });

  it('returns a single segment when all bits share the same visual row', () => {
    const segments = multiBitBoundsSegments(makeHost(), 0, 8);
    expect(segments).toHaveLength(1);
    expect(segments[0].startBit).toBe(0);
    expect(segments[0].count).toBe(8);
    expect(segments[0].row).toBe(0);
  });

  it('splits into two segments across a visual-row boundary', () => {
    const segments = multiBitBoundsSegments(makeHost(), 60, 8); // bits 60-67 cross row 0→1
    expect(segments).toHaveLength(2);
    expect(segments[0].row).toBe(0);
    expect(segments[1].row).toBe(1);
    expect(segments[0].count + segments[1].count).toBe(8);
  });
});

// ─── getElementBounds ────────────────────────────────────────────────────────

describe('getElementBounds', () => {
  it('returns null for an empty sieve (bitCount=0)', () => {
    const host = makeHost({ bitCount: 0 });
    expect(getElementBounds(host, 'bit', 0)).toBeNull();
  });

  it('type "bit" – returns a pixel-square centred on the bit', () => {
    const host = makeHost();
    const b = getElementBounds(host, 'bit', 0);
    expect(b).not.toBeNull();
    expect(b.w).toBe(8);
    expect(b.h).toBe(8);
    expect(b.cx).toBe(4);
    expect(b.cy).toBe(4);
  });

  it('type "byte" – delegates to multiBitBounds for 8 bits', () => {
    const host = makeHost();
    const b = getElementBounds(host, 'byte', 0);
    expect(b).not.toBeNull();
    expect(b.w).toBe(64); // 8 bits × 8px
  });

  it('type "uint64" – delegates to multiBitBounds for 64 bits', () => {
    const host = makeHost();
    const b = getElementBounds(host, 'uint64', 0);
    expect(b).not.toBeNull();
    expect(b.w).toBe(512); // 64 bits × 8px
  });

  it('returns null for an unknown element type', () => {
    expect(getElementBounds(makeHost(), 'bogus', 0)).toBeNull();
  });

  it('returns null for an out-of-range bit', () => {
    const host = makeHost();
    expect(getElementBounds(host, 'bit', 200)).toBeNull();
  });
});

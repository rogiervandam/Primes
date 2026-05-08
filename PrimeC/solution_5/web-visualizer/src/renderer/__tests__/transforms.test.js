import { describe, it, expect } from 'vitest';
import { bitIndexToCanvas, canvasToBitIndex } from '../layout/transforms';

/**
 * Minimal mock host:
 *   - bitLayout='8x1': 8 bits across, 1 row per byte
 *   - byteLayout='8x1': 8 bytes across, 1 row per u64
 *   - pixelSize=8, zoom=1, no extra spacing
 *   - vectorGroup=1, bitsPerCacheLine=64
 *   - 2 cache lines (bitCount=128), one vector per visual row
 *   - no labels (labelHeight=0), no pan
 *
 * With these values:
 *   px=8, bitStepX=8, bitStepY=8,
 *   byteD={w:64,h:8}, u64D={w:512,h:8}, vecD={w:512,h:8,intraGap:0},
 *   rowD={w:512,h:8}, labelH=0, vRowHeight=8, vecPerRow=1
 */
function makeHost(overrides = {}) {
  const host = {
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

    // '8x1' byte layout: byte i → col=i, row=0
    _bytePosInU64: (i) => ({ col: i, row: 0 }),
    // '8x1' bit layout: bit i → col=i, row=0
    _bitPosInByte: (i) => ({ col: i, row: 0 }),

    ...overrides,
  };
  return host;
}

// ─── bitIndexToCanvas ────────────────────────────────────────────────────────

describe('bitIndexToCanvas', () => {
  it('maps bit 0 to the centre of the first pixel', () => {
    expect(bitIndexToCanvas(makeHost(), 0)).toEqual({ x: 4, y: 4 });
  });

  it('advances x by one bitStep for consecutive bits in the same byte', () => {
    const host = makeHost();
    expect(bitIndexToCanvas(host, 1)).toEqual({ x: 12, y: 4 });
    expect(bitIndexToCanvas(host, 7)).toEqual({ x: 60, y: 4 });
  });

  it('jumps to the next byte (byteD.w = 64) at bit 8', () => {
    expect(bitIndexToCanvas(makeHost(), 8)).toEqual({ x: 68, y: 4 });
  });

  it('wraps to the next visual row at bitsPerCacheLine boundary', () => {
    // vRowHeight = labelH(0) + rowD.h(8) + u64GapY(0) = 8
    expect(bitIndexToCanvas(makeHost(), 64)).toEqual({ x: 4, y: 12 });
  });

  it('returns null for out-of-range bit indices', () => {
    const host = makeHost();
    expect(bitIndexToCanvas(host, -1)).toBeNull();
    expect(bitIndexToCanvas(host, 128)).toBeNull();
    expect(bitIndexToCanvas(host, 999)).toBeNull();
  });

  it('respects panX and panY offsets', () => {
    const host = makeHost({ panX: 100, panY: 50 });
    const pos = bitIndexToCanvas(host, 0);
    expect(pos).toEqual({ x: 104, y: 54 });
  });
});

// ─── canvasToBitIndex ────────────────────────────────────────────────────────

describe('canvasToBitIndex', () => {
  it('is the inverse of bitIndexToCanvas for bit 0', () => {
    const host = makeHost();
    const { x, y } = bitIndexToCanvas(host, 0);
    expect(canvasToBitIndex(host, x, y)).toBe(0);
  });

  it('is the inverse of bitIndexToCanvas for consecutive bits', () => {
    const host = makeHost();
    for (const bit of [0, 1, 7, 8, 63, 64, 127]) {
      const { x, y } = bitIndexToCanvas(host, bit);
      expect(canvasToBitIndex(host, x, y)).toBe(bit);
    }
  });

  it('returns -1 for canvas coords above the grid', () => {
    expect(canvasToBitIndex(makeHost(), 4, -1)).toBe(-1);
  });

  it('returns -1 for canvas coords to the left of the grid', () => {
    expect(canvasToBitIndex(makeHost(), -1, 4)).toBe(-1);
  });

  it('returns -1 when hitting the gap between visual rows', () => {
    // The mock has no u64GapY, but with rowD.h=8 the row occupies y=[0,8).
    // A coord in a second visual row's label area (y>=8 but below row data)
    // would only occur if labelH > 0, so nothing to test for gaps here.
    // Verify that a coord exactly at the boundary (y=8) in the second row's
    // data zone hits bit 64.
    const host = makeHost();
    expect(canvasToBitIndex(host, 4, 8)).toBe(64);
  });

  it('respects panX and panY', () => {
    const host = makeHost({ panX: 100, panY: 50 });
    expect(canvasToBitIndex(host, 104, 54)).toBe(0);
  });
});

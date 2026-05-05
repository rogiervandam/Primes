import { describe, it, expect, vi } from 'vitest';
import { drawBitOverlayIndicator } from '../bits/overlayIndicators';

function makeGlyph() {
  return { drawDot: vi.fn(), drawText: vi.fn() };
}

// Standard options for a 16px bit cell
const BASE = {
  bitX: 0,
  bitY: 0,
  px: 16,
  color: [255, 100, 0],
  alpha: 0.9,
  dotScale: 0.25,
  dotMax: 6,
  anchor: 'bottom-right',
  label: null,
  labelAnchor: 'bottom-right',
  labelScale: 0.6,
  labelMax: 10,
  labelThreshold: 8,
};

describe('drawBitOverlayIndicator – null guard', () => {
  it('does nothing when glyph is null', () => {
    // Must not throw
    drawBitOverlayIndicator(null, BASE);
  });
});

describe('drawBitOverlayIndicator – dot rendering', () => {
  it('calls drawDot with the colour and computed radius', () => {
    const glyph = makeGlyph();
    drawBitOverlayIndicator(glyph, { ...BASE, px: 16 });

    expect(glyph.drawDot).toHaveBeenCalledOnce();
    const [, , r, cr, cg, cb, alpha] = glyph.drawDot.mock.calls[0];
    expect(r).toBeGreaterThan(0);
    expect([cr, cg, cb]).toEqual([255, 100, 0]);
    expect(alpha).toBe(0.9);
  });

  it('clamps dot radius to dotMax', () => {
    const glyph = makeGlyph();
    // px=200, dotScale=0.25 → 50, but dotMax=6 → clamp to 6
    drawBitOverlayIndicator(glyph, { ...BASE, px: 200, dotMax: 6 });
    const [, , r] = glyph.drawDot.mock.calls[0];
    expect(r).toBe(6);
  });

  it('enforces minimum dot radius of 0.8', () => {
    const glyph = makeGlyph();
    // px=0.5, dotScale=0.1 → 0.05, clamped to 0.8
    drawBitOverlayIndicator(glyph, { ...BASE, px: 0.5, dotScale: 0.1, dotMax: 100 });
    const [, , r] = glyph.drawDot.mock.calls[0];
    expect(r).toBe(0.8);
  });
});

describe('drawBitOverlayIndicator – anchor positions', () => {
  it('places dot near bottom-right corner (default anchor)', () => {
    const glyph = makeGlyph();
    const px = 16;
    drawBitOverlayIndicator(glyph, { ...BASE, bitX: 0, bitY: 0, px, anchor: 'bottom-right' });
    const [dotX, dotY] = glyph.drawDot.mock.calls[0];
    // bottom-right: x = bitX + px - dotR*0.75, y = bitY + px - dotR*0.75
    expect(dotX).toBeGreaterThan(px / 2);
    expect(dotY).toBeGreaterThan(px / 2);
  });

  it('places dot near top-left corner', () => {
    const glyph = makeGlyph();
    const px = 16;
    drawBitOverlayIndicator(glyph, { ...BASE, bitX: 0, bitY: 0, px, anchor: 'top-left' });
    const [dotX, dotY] = glyph.drawDot.mock.calls[0];
    // top-left: x = bitX + dotR*0.75, y = bitY + dotR*0.75
    expect(dotX).toBeLessThan(px / 2);
    expect(dotY).toBeLessThan(px / 2);
  });

  it('places dot near top-right corner', () => {
    const glyph = makeGlyph();
    const px = 16;
    drawBitOverlayIndicator(glyph, { ...BASE, bitX: 0, bitY: 0, px, anchor: 'top-right' });
    const [dotX, dotY] = glyph.drawDot.mock.calls[0];
    // top-right: x near right, y near top
    expect(dotX).toBeGreaterThan(px / 2);
    expect(dotY).toBeLessThan(px / 2);
  });
});

describe('drawBitOverlayIndicator – label rendering', () => {
  it('does not call drawText when label is null', () => {
    const glyph = makeGlyph();
    drawBitOverlayIndicator(glyph, { ...BASE, label: null, px: 16 });
    expect(glyph.drawText).not.toHaveBeenCalled();
  });

  it('does not call drawText when px is below labelThreshold', () => {
    const glyph = makeGlyph();
    drawBitOverlayIndicator(glyph, { ...BASE, label: 'Hi', px: 7, labelThreshold: 8 });
    expect(glyph.drawText).not.toHaveBeenCalled();
  });

  it('calls drawText when label is set and px meets threshold', () => {
    const glyph = makeGlyph();
    drawBitOverlayIndicator(glyph, { ...BASE, label: 'P', px: 16, labelThreshold: 8 });
    expect(glyph.drawText).toHaveBeenCalledOnce();
    const [text, , , size, cr, cg, cb, alpha] = glyph.drawText.mock.calls[0];
    expect(text).toBe('P');
    expect(size).toBeGreaterThan(0);
    expect([cr, cg, cb]).toEqual([255, 100, 0]);
    expect(alpha).toBe(0.9);
  });

  it('clamps label size to labelMax', () => {
    const glyph = makeGlyph();
    drawBitOverlayIndicator(glyph, { ...BASE, label: 'X', px: 1000, labelScale: 1, labelMax: 12, labelThreshold: 0 });
    const [, , , size] = glyph.drawText.mock.calls[0];
    expect(size).toBe(12);
  });

  it('uses labelAnchor independently of dot anchor', () => {
    const glyphA = makeGlyph();
    const glyphB = makeGlyph();
    const common = { ...BASE, label: 'X', px: 16, anchor: 'bottom-right', labelThreshold: 0 };
    drawBitOverlayIndicator(glyphA, { ...common, labelAnchor: 'top-left' });
    drawBitOverlayIndicator(glyphB, { ...common, labelAnchor: 'bottom-right' });

    const [, xA, yA] = glyphA.drawText.mock.calls[0];
    const [, xB, yB] = glyphB.drawText.mock.calls[0];
    // top-left label should have smaller x and y than bottom-right label
    expect(xA).toBeLessThan(xB);
    expect(yA).toBeLessThan(yB);
  });
});

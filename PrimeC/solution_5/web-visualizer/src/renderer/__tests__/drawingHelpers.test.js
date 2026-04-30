import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  mixRgb,
  labelTextColor,
  fitLabelFontSize,
  truncateTextToWidth,
} from '../drawingHelpers.js';

// ─── hexToRgb ─────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('parses #rrggbb with hash', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255]);
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('parses rrggbb without hash', () => {
    expect(hexToRgb('aabbcc')).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#FF8800')).toEqual([255, 136, 0]);
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
  });

  it('falls back to soft-green on null', () => {
    expect(hexToRgb(null)).toEqual([92, 207, 141]);
  });

  it('falls back to soft-green on empty string', () => {
    expect(hexToRgb('')).toEqual([92, 207, 141]);
  });

  it('falls back to soft-green on non-string', () => {
    expect(hexToRgb(123)).toEqual([92, 207, 141]);
    expect(hexToRgb(undefined)).toEqual([92, 207, 141]);
  });

  it('falls back to soft-green on invalid hex', () => {
    expect(hexToRgb('#zzzzzz')).toEqual([92, 207, 141]);
    expect(hexToRgb('not-a-color')).toEqual([92, 207, 141]);
  });
});

// ─── mixRgb ───────────────────────────────────────────────────────────────

describe('mixRgb', () => {
  it('t=0 returns the first colour', () => {
    expect(mixRgb([255, 0, 0], [0, 255, 0], 0)).toEqual([255, 0, 0]);
  });

  it('t=1 returns the second colour', () => {
    expect(mixRgb([255, 0, 0], [0, 255, 0], 1)).toEqual([0, 255, 0]);
  });

  it('t=0.5 returns midpoint (rounded)', () => {
    expect(mixRgb([0, 0, 0], [100, 200, 100], 0.5)).toEqual([50, 100, 50]);
  });

  it('rounds fractional channels', () => {
    // 0.5 * (10 + 11) = 10.5 → rounds to 11
    expect(mixRgb([10, 0, 0], [11, 0, 0], 0.5)).toEqual([11, 0, 0]);
  });

  it('handles white ↔ black', () => {
    const mid = mixRgb([255, 255, 255], [0, 0, 0], 0.5);
    expect(mid).toEqual([128, 128, 128]);
  });
});

// ─── labelTextColor ───────────────────────────────────────────────────────

describe('labelTextColor', () => {
  it('returns dark text for bright background', () => {
    expect(labelTextColor([255, 255, 255])).toBe('rgba(17, 24, 39, 0.95)');
  });

  it('returns light text for dark background', () => {
    expect(labelTextColor([0, 0, 0])).toBe('rgba(249, 250, 251, 0.96)');
  });

  it('returns dark text for light-grey', () => {
    // luminance([200,200,200]) = 0.2126*200 + 0.7152*200 + 0.0722*200 ≈ 200 > 150
    expect(labelTextColor([200, 200, 200])).toBe('rgba(17, 24, 39, 0.95)');
  });

  it('returns light text for mid-dark background below threshold', () => {
    // e.g. pure green [0,150,0]: luminance ≈ 0.7152*150 ≈ 107 < 150
    expect(labelTextColor([0, 150, 0])).toBe('rgba(249, 250, 251, 0.96)');
  });
});

// ─── fitLabelFontSize (via mock ctx) ─────────────────────────────────────

/**
 * Minimal canvas-2D-like mock. `measureText` returns `text.length * charWidth`
 * so tests can predict exact outcomes without a real canvas.
 */
function makeMockCtx(charWidth = 8) {
  return {
    font: '',
    save() {},
    restore() {},
    measureText(text) { return { width: text.length * charWidth }; },
  };
}

describe('fitLabelFontSize', () => {
  it('returns preferredSize when text fits', () => {
    // charWidth=8, text="hi" (2 chars = 16px), maxWidth=20, preferred=12
    const ctx = makeMockCtx(8);
    const size = fitLabelFontSize(ctx, 'hi', 20, 12);
    expect(size).toBe(12);
  });

  it('returns 0 for empty text', () => {
    const ctx = makeMockCtx(8);
    expect(fitLabelFontSize(ctx, '', 100, 12)).toBe(0);
  });

  it('returns 0 for zero maxWidth', () => {
    const ctx = makeMockCtx(8);
    expect(fitLabelFontSize(ctx, 'abc', 0, 12)).toBe(0);
  });

  it('returns 0 when text cannot fit even at minSize', () => {
    // text="abcdefghij" (10 chars), with charWidth=8 always returns 80 px width
    // → nothing fits regardless of font size (mock ignores size)
    const ctx = makeMockCtx(8);
    // maxWidth=5 means even minSize won't fit (width=80 > 5 always)
    expect(fitLabelFontSize(ctx, 'abcdefghij', 5, 12)).toBe(0);
  });

  it('sets ctx.font as a side effect', () => {
    const ctx = makeMockCtx(1); // charWidth=1, everything fits
    fitLabelFontSize(ctx, 'hi', 100, 10, 4, 'bold ');
    expect(ctx.font).toBe('bold 10px monospace');
  });
});

// ─── truncateTextToWidth (via mock ctx) ───────────────────────────────────

describe('truncateTextToWidth', () => {
  it('returns full text when it fits', () => {
    const ctx = makeMockCtx(8); // "hello" = 5*8 = 40px
    expect(truncateTextToWidth(ctx, 'hello', 40, '')).toBe('hello');
  });

  it('returns empty string for empty text', () => {
    const ctx = makeMockCtx(8);
    expect(truncateTextToWidth(ctx, '', 100, '')).toBe('');
  });

  it('returns empty string for zero maxWidth', () => {
    const ctx = makeMockCtx(8);
    expect(truncateTextToWidth(ctx, 'hello', 0, '')).toBe('');
  });

  it('returns empty string when even ellipsis does not fit', () => {
    // "..." = 3 chars * 8 = 24px, maxWidth=10
    const ctx = makeMockCtx(8);
    expect(truncateTextToWidth(ctx, 'hello', 10, '')).toBe('');
  });

  it('truncates to one char + ellipsis when barely fitting', () => {
    // charWidth=8: "h..." = 4*8 = 32px, "he..." = 5*8 = 40px
    // maxWidth=35: "h..." (32) fits, "he..." (40) does not
    const ctx = makeMockCtx(8);
    expect(truncateTextToWidth(ctx, 'hello', 35, '')).toBe('h...');
  });

  it('returns ellipsis alone when single char + ellipsis still too wide', () => {
    // charWidth=8: "..." = 24px, "h..." = 32px
    // maxWidth=28: "..." (24) fits, "h..." (32) does not → return "..."
    const ctx = makeMockCtx(8);
    expect(truncateTextToWidth(ctx, 'hello', 28, '')).toBe('...');
  });
});

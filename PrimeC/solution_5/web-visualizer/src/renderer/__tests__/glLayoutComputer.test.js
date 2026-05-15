/**
 * Tests for SSAA zoom invariance (item 502).
 *
 * Root cause: different render modes use different CSS canvas sizes, which
 * causes glForcedDpr to be clamped to different values. If physCellSize used
 * canvasDpr (SSAA-inflated, mode-dependent) the bitStride downsampling would
 * differ across modes and across SSAA levels even at the same real zoom value.
 *
 * Fix: physCellSize = cellSize * (canvasSnapDpr || canvasDpr || 1).
 * canvasSnapDpr = forcedDpr (physical device DPR without SSAA), which is
 * constant across all SSAA levels and render modes.
 *
 * These tests verify that the fix holds and serve as a regression guard.
 * Run for all 8 render modes by varying canvasWidth (which drives DPR
 * clamping in BitGridGLWorker.resize) while keeping canvasSnapDpr fixed.
 */

import { describe, it, expect } from 'vitest';
import { computeGlLayoutParams } from '../layout/glLayoutComputer';
import { RENDER_MODES } from '../../lib/renderModes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Approximate the effective canvasDpr that BitGridGLWorker.resize() would
 * produce for a given CSS canvas width, a requested SSAA DPR, and a
 * compositor max-dimension limit.
 */
function simulateClampedDpr(cssWidth, cssHeight, requestedDpr, maxDim = 8192) {
  const maxDpr = Math.min(maxDim / cssWidth, maxDim / cssHeight);
  return Math.max(0.1, Math.min(requestedDpr, maxDpr));
}

/**
 * Canvas CSS dimensions each render mode uses (relative to viewport).
 * Mode 3 / 7 → 1.2× viewport (usesViewportSizeCanvas)
 * Mode 2 / 6 → grid-sized ≈ viewport (use 1.0× for test purposes)
 * Mode 1 / 4 / 5 / 8 → 3.2× viewport
 */
const MODE_CANVAS_MULTIPLIERS = {
  [RENDER_MODES.MODE1_DIRECT]: 3.2,
  [RENDER_MODES.MODE2_DIRECT]: 1.0,
  [RENDER_MODES.MODE3_DIRECT]: 1.2,
  [RENDER_MODES.MODE4_DIRECT]: 3.2,
  [RENDER_MODES.MODE5_WORKER]: 3.2,
  [RENDER_MODES.MODE6_WORKER]: 1.0,
  [RENDER_MODES.MODE7_WORKER]: 1.2,
  [RENDER_MODES.MODE8_WORKER]: 3.2,
};

/** Typical viewport at a high-DPI display with 2× device pixel ratio. */
const VIEWPORT_W = 1920;
const VIEWPORT_H = 1080;
const DEVICE_DPR  = 2; // canvasSnapDpr = forcedDpr (no SSAA multiplier)

/**
 * Minimal mock renderer that satisfies computeGlLayoutParams.
 * Accepts overrides for canvasDpr and canvasSnapDpr to simulate
 * different SSAA levels and render modes.
 */
function makeRenderer({ zoom = 1, canvasDpr = 2, canvasSnapDpr = 2 } = {}) {
  return {
    // --- Core layout ---
    bitsPerCacheLine:  512,
    vectorGroup:       1,
    zoom,
    pixelSize:         2,
    bitSpacingH:       0,
    bitSpacingV:       0,
    byteSpacingH:      0,
    byteSpacingV:      0,
    u64SpacingH:       0,
    u64SpacingV:       0,
    bitLayout:         '8x1',
    byteLayout:        '8x1',

    // --- Canvas / DPR ---
    canvasWidth:       VIEWPORT_W,
    canvasHeight:      VIEWPORT_H,
    canvasDpr,
    canvasSnapDpr,

    // --- Bit state ---
    bitCount:          512,
    panX:              0,
    panY:              0,

    // --- Layout helpers called by computeGlLayoutParams ---
    _logicalGroupBits()           { return 64; },         // 1 u64 per vector
    _vectorGroupsPerVisualRow()   { return 1; },
    _labelHeight()                { return 0; },
  };
}

// ---------------------------------------------------------------------------
// SSAA invariance: bitStride must not change when SSAA level changes
// ---------------------------------------------------------------------------

describe('SSAA zoom invariance — bitStride is SSAA-independent', () => {
  const ZOOM_LEVELS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.0];

  // SSAA levels that would be passed as glAaScale in DebugToolsPanel.
  const SSAA_LEVELS = [1, 2, 4, 8];

  for (const mode of Object.values(RENDER_MODES)) {
    const mult = MODE_CANVAS_MULTIPLIERS[mode] ?? 3.2;
    const cssW = Math.round(VIEWPORT_W * mult);
    const cssH = Math.round(VIEWPORT_H * mult);

    describe(`render mode: ${mode} (canvas ${cssW}×${cssH})`, () => {
      for (const zoom of ZOOM_LEVELS) {
        it(`zoom=${zoom}: bitStride is the same at all SSAA levels`, () => {
          // Compute effective canvasDpr for each SSAA level in this mode.
          const dprs = SSAA_LEVELS.map((aa) =>
            simulateClampedDpr(cssW, cssH, DEVICE_DPR * aa),
          );

          const strides = dprs.map((canvasDpr) => {
            const r = makeRenderer({ zoom, canvasDpr, canvasSnapDpr: DEVICE_DPR });
            return computeGlLayoutParams(r).bitStride;
          });

          // All SSAA levels must produce the same stride.
          const referenceStride = strides[0]; // 1x SSAA
          for (let i = 1; i < SSAA_LEVELS.length; i++) {
            expect(strides[i]).toBe(referenceStride);
          }
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// SSAA invariance: zoom and pan values are not mutated by computeGlLayoutParams
// ---------------------------------------------------------------------------

describe('SSAA zoom invariance — renderer zoom/pan not mutated', () => {
  it('computeGlLayoutParams does not modify zoom, panX, panY', () => {
    const r = makeRenderer({ zoom: 0.5, canvasDpr: 4, canvasSnapDpr: DEVICE_DPR });
    const originalZoom = r.zoom;
    const originalPanX = r.panX;
    const originalPanY = r.panY;

    computeGlLayoutParams(r);

    expect(r.zoom).toBe(originalZoom);
    expect(r.panX).toBe(originalPanX);
    expect(r.panY).toBe(originalPanY);
  });
});

// ---------------------------------------------------------------------------
// Mode invariance: same zoom + canvasSnapDpr → same bitStride regardless of
// which mode's canvasDpr clamping is applied.
// ---------------------------------------------------------------------------

describe('SSAA zoom invariance — bitStride matches across render modes', () => {
  const ZOOM_LEVELS = [0.05, 0.1, 0.25, 0.5, 1.0];
  const AA_SCALE = 8; // most extreme SSAA level; exposes worst-case DPR clamping

  for (const zoom of ZOOM_LEVELS) {
    it(`zoom=${zoom}: bitStride is the same in all 8 render modes at 8× SSAA`, () => {
      const strides = Object.values(RENDER_MODES).map((mode) => {
        const mult = MODE_CANVAS_MULTIPLIERS[mode] ?? 3.2;
        const cssW = Math.round(VIEWPORT_W * mult);
        const cssH = Math.round(VIEWPORT_H * mult);
        const canvasDpr = simulateClampedDpr(cssW, cssH, DEVICE_DPR * AA_SCALE);
        const r = makeRenderer({ zoom, canvasDpr, canvasSnapDpr: DEVICE_DPR });
        return computeGlLayoutParams(r).bitStride;
      });

      // All modes must produce the same stride.
      const referenceStride = strides[0];
      for (let i = 1; i < strides.length; i++) {
        expect(strides[i]).toBe(referenceStride);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Regression: canvasSnapDpr absent (legacy path) still works
// ---------------------------------------------------------------------------

describe('SSAA zoom invariance — canvasSnapDpr absent falls back to canvasDpr', () => {
  it('does not throw when canvasSnapDpr is undefined', () => {
    const r = makeRenderer({ zoom: 0.5, canvasDpr: 4 });
    delete r.canvasSnapDpr; // simulate missing property
    expect(() => computeGlLayoutParams(r)).not.toThrow();
    const { bitStride } = computeGlLayoutParams(r);
    expect(bitStride).toBeGreaterThanOrEqual(1);
    expect(bitStride).toBeLessThanOrEqual(4);
  });
});

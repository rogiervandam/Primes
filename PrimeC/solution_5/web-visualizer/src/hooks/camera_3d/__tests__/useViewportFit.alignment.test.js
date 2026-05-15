/**
 * Pixel-level alignment tests for applyViewportFit (item 503).
 *
 * Verifies that after calling applyViewportFit, the screen-relative position
 * of content and the zoom level are IDENTICAL across:
 *
 *   1. All 8 render modes (which have different canvas multipliers — 1.0×,
 *      1.2×, or 3.2× of the viewport — and therefore different DPR clamping).
 *   2. All SSAA levels (which change canvasDpr but not canvasSnapDpr).
 *   3. CSS-tilt vs WebGL-tilt modes at the same camera angle.
 *
 * "Pixel-level" here is the CSS-pixel position of the content block relative
 * to the visible viewport, computed as:
 *
 *   screenX = anchorLeft − canvasCssW / 2 + renderer.panX
 *   screenY = anchorTop  − canvasCssH / 2 + renderer.panY
 *
 * The anchorLeft/Top come from the wrapper element's style.left/top (set by
 * useCanvasAnchorSync to the viewport centre); canvasCssW/H is the CSS-pixel
 * size of the canvas (constant per mode, SSAA-independent because
 * renderer.canvasWidth/Height are always set).
 *
 * When the code is correct, all mode × SSAA combinations should produce the
 * same (screenX, screenY, zoom) triple regardless of canvas multiplier or DPR
 * clamping, because the extra canvas area exactly cancels out through the
 * planeOffset compensation.
 *
 * --- mock strategy ---
 * applyViewportFit is a useCallback(fn, []) — a plain function wrapped in a
 * React memoisation primitive. We mock React.useCallback to be the identity
 * function so the hook can be called in node without a React renderer. The
 * mock is scoped to this module's import graph and has no effect on other
 * test files.
 */

import { vi, describe, it, expect, beforeAll } from 'vitest';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useCallback: (fn) => fn };
});

import { useViewportFit } from '../useViewportFit.js';

// ---------------------------------------------------------------------------
// Canvas-size multiplier per render mode
// (mirrors the actual values used by useCanvasLayout.getCanvasTargetSize)
// ---------------------------------------------------------------------------
const CANVAS_MULTS = {
  MODE1: 3.2,   // overscan WebGL-tilt
  MODE2: 1.0,   // grid-sized CSS-tilt
  MODE3: 1.2,   // 1.2× WebGL-tilt
  MODE4: 3.2,   // overscan CSS-tilt
  MODE5: 3.2,   // overscan WebGL-tilt (worker)
  MODE6: 1.0,   // grid-sized CSS-tilt (worker)
  MODE7: 1.2,   // 1.2× WebGL-tilt (worker)
  MODE8: 3.2,   // overscan CSS-tilt (worker)
};

// SSAA levels that change canvasDpr (but not canvasSnapDpr / CSS canvas size).
const SSAA_LEVELS = [1, 2, 4];

// Viewport and DPR constants used in all scenarios.
const VIEWPORT_W   = 1920;
const VIEWPORT_H   = 1080;
const DEVICE_DPR   = 1;   // canvasSnapDpr — SSAA-independent

// Panel insets (simulate both panels open).
const INSETS = { left: 300, right: 240, top: 0, bottom: 0 };

// Fixed content dimensions at zoom=1 (a representative sieve grid).
const CONTENT_W1 = 512;   // CSS pixels at zoom=1
const CONTENT_H1 = 64;

// GL canvas max-dimension limit (WebGL compositor limit).
const MAX_DIM = 8192;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate the DPR clamping that BitGridGLWorker.resize() applies:
 *   canvasDpr = clamp(requestedDpr, 0.1, maxDim / max(cssW, cssH))
 */
function simulateClampedDpr(cssW, cssH, requestedDpr) {
  const maxDpr = Math.min(MAX_DIM / cssW, MAX_DIM / cssH);
  return Math.max(0.1, Math.min(requestedDpr, maxDpr));
}

/**
 * Minimal renderer mock with a real zoomToFit implementation that mirrors
 * SieveRenderer.zoomToFit exactly (same margin, same centering formula).
 *
 * We use fixed CONTENT_W1 / CONTENT_H1 so every renderer instance represents
 * the same grid content — the only variation between instances is the canvas
 * size (mode) and canvasDpr (SSAA level).
 */
function makeRenderer({ canvasWidth, canvasHeight, canvasDpr }) {
  const r = {
    bitCount:    512,
    zoom:        1,
    panX:        0,
    panY:        0,
    canvasWidth,
    canvasHeight,
    canvasDpr,

    contentDimensions() {
      return { width: this.zoom * CONTENT_W1, height: this.zoom * CONTENT_H1 };
    },

    zoomToFit(w, h, opts = {}) {
      if (this.bitCount === 0 || w <= 0 || h <= 0) return;
      const margin   = 0.96;
      const fitZoom  = Math.min((w * margin) / CONTENT_W1, (h * margin) / CONTENT_H1);
      this.zoom      = Math.max(0.1, Math.min(fitZoom, 32));
      const finalDims = this.contentDimensions();
      this.panX = (w - finalDims.width)  / 2;
      this.panY = opts.alignTop ? 12 : (h - finalDims.height) / 2;
    },
  };
  return r;
}

/**
 * Mock GL canvas element.  The parentElement carries the wrapper's
 * style.left / style.top (set by useCanvasAnchorSync to the viewport centre).
 * style.transform encodes the CSS rotateX for CSS-tilt modes (modes 2/4/6/8);
 * for WebGL-tilt modes this is empty (the shader reads camera3D.rotateX).
 */
function makeGlCanvasEl({ anchorLeft, anchorTop, cssTransform = '' } = {}) {
  return {
    style:         { transform: cssTransform },
    parentElement: { style: { left: `${anchorLeft}px`, top: `${anchorTop}px` } },
  };
}

/**
 * After applyViewportFit, compute the CSS-pixel position of the content
 * block's top-left corner relative to the visible viewport origin (0,0).
 *
 * Formula:
 *   canvas top-left on screen  = (anchorLeft − canvasCssW/2, anchorTop − canvasCssH/2)
 *   content inside canvas      = (panX, panY)
 *   → content on screen        = (anchorLeft − canvasCssW/2 + panX,
 *                                  anchorTop  − canvasCssH/2 + panY)
 */
function screenPosition(renderer, glCanvasEl) {
  const anchorLeft  = parseFloat(glCanvasEl.parentElement.style.left);
  const anchorTop   = parseFloat(glCanvasEl.parentElement.style.top);
  const canvasCssW  = renderer.canvasWidth;
  const canvasCssH  = renderer.canvasHeight;
  return {
    x: anchorLeft - canvasCssW / 2 + renderer.panX,
    y: anchorTop  - canvasCssH / 2 + renderer.panY,
  };
}

// ---------------------------------------------------------------------------
// Get applyViewportFit from the (mocked) hook
// ---------------------------------------------------------------------------
let applyViewportFit;
beforeAll(() => {
  ({ applyViewportFit } = useViewportFit());
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Run applyViewportFit for every render mode × SSAA combination and return an
 * array of { mode, ssaa, zoom, screenX, screenY } objects.
 *
 * @param {object}   camera3D   – Camera3D mock with rotateX / perspective
 * @param {Function} [makeCss]  – optional: return a CSS transform string given a mode name
 */
function collectResults(camera3D, makeCss = () => '') {
  const results = [];

  for (const [mode, mult] of Object.entries(CANVAS_MULTS)) {
    const canvasCssW = Math.round(VIEWPORT_W * mult);
    const canvasCssH = Math.round(VIEWPORT_H * mult);

    for (const ssaa of SSAA_LEVELS) {
      const canvasDpr  = simulateClampedDpr(canvasCssW, canvasCssH, DEVICE_DPR * ssaa);
      const renderer   = makeRenderer({ canvasWidth: canvasCssW, canvasHeight: canvasCssH, canvasDpr });
      const glCanvasEl = makeGlCanvasEl({
        anchorLeft:   VIEWPORT_W / 2,
        anchorTop:    VIEWPORT_H / 2,
        cssTransform: makeCss(mode),
      });

      applyViewportFit(renderer, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D, glCanvasEl });

      const pos = screenPosition(renderer, glCanvasEl);
      results.push({ mode, ssaa, zoom: renderer.zoom, screenX: pos.x, screenY: pos.y });
    }
  }

  return results;
}

/**
 * Assert that all entries in `results` have the same zoom, screenX, and
 * screenY (within floating-point rounding, ±0.0001 CSS px).
 */
function assertAllEqual(results) {
  const ref = results[0];
  for (const r of results) {
    expect(r.zoom,    `zoom mismatch: mode=${r.mode} ssaa=${r.ssaa}`   ).toBeCloseTo(ref.zoom,    6);
    expect(r.screenX, `screenX mismatch: mode=${r.mode} ssaa=${r.ssaa}`).toBeCloseTo(ref.screenX, 4);
    expect(r.screenY, `screenY mismatch: mode=${r.mode} ssaa=${r.ssaa}`).toBeCloseTo(ref.screenY, 4);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useViewportFit — pixel alignment across render modes and SSAA levels', () => {

  describe('flat view (tilt = 0°)', () => {
    it('all 8 modes × 3 SSAA levels produce the same zoom and screen position', () => {
      const camera3D = { rotateX: 0, perspective: 1500 };
      const results  = collectResults(camera3D);
      expect(results).toHaveLength(24); // 8 modes × 3 SSAA
      assertAllEqual(results);
    });

    it('panels closed (no insets) also produces uniform alignment', () => {
      const camera3D = { rotateX: 0, perspective: 1500 };
      const results  = [];

      for (const [mode, mult] of Object.entries(CANVAS_MULTS)) {
        const canvasCssW = Math.round(VIEWPORT_W * mult);
        const canvasCssH = Math.round(VIEWPORT_H * mult);
        const renderer   = makeRenderer({ canvasWidth: canvasCssW, canvasHeight: canvasCssH, canvasDpr: DEVICE_DPR });
        const glCanvasEl = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });

        applyViewportFit(renderer, VIEWPORT_W, VIEWPORT_H, {}, { camera3D, glCanvasEl });

        const pos = screenPosition(renderer, glCanvasEl);
        results.push({ mode, zoom: renderer.zoom, screenX: pos.x, screenY: pos.y });
      }

      assertAllEqual(results);
    });
  });

  // -------------------------------------------------------------------------
  // Tilt: camera3D.rotateX is the authoritative source for both CSS-tilt and
  // WebGL-tilt modes (item 503 fix). The effectiveH reduction formula depends
  // only on the angle, the perspective, and the viewport height — all of which
  // are mode-independent — so all modes should still align.
  // -------------------------------------------------------------------------

  describe('tilted view via camera3D (CSS-tilt and WebGL-tilt, tilt = 30°)', () => {
    it('all 8 modes × 3 SSAA levels produce the same zoom and screen position', () => {
      const camera3D = { rotateX: 30, perspective: 1500 };
      const results  = collectResults(camera3D);
      expect(results).toHaveLength(24);
      assertAllEqual(results);
    });

    it('tilt = 15° also aligns across all modes and SSAA levels', () => {
      const camera3D = { rotateX: 15, perspective: 1500 };
      const results  = collectResults(camera3D);
      assertAllEqual(results);
    });

    it('tilt = 45° also aligns across all modes and SSAA levels', () => {
      const camera3D = { rotateX: 45, perspective: 1500 };
      const results  = collectResults(camera3D);
      assertAllEqual(results);
    });
  });

  // -------------------------------------------------------------------------
  // Without camera3D: CSS-tilt modes (2/4/6/8) derive the angle from the CSS
  // transform string.  This covers the fallback path used when camera3D is not
  // passed (e.g. in some SSR or initial-render edge cases).
  // -------------------------------------------------------------------------

  describe('CSS-tilt fallback (no camera3D, angle in style.transform)', () => {
    const CSS_TILT_MODES = new Set(['MODE2', 'MODE4', 'MODE6', 'MODE8']);

    it('CSS-tilt modes with matching rotateX in transform align with each other', () => {
      const deg     = 30;
      const results = [];

      for (const [mode] of Object.entries(CANVAS_MULTS)) {
        if (!CSS_TILT_MODES.has(mode)) continue;

        const mult       = CANVAS_MULTS[mode];
        const canvasCssW = Math.round(VIEWPORT_W * mult);
        const canvasCssH = Math.round(VIEWPORT_H * mult);
        const renderer   = makeRenderer({ canvasWidth: canvasCssW, canvasHeight: canvasCssH, canvasDpr: DEVICE_DPR });
        const glCanvasEl = makeGlCanvasEl({
          anchorLeft:   VIEWPORT_W / 2,
          anchorTop:    VIEWPORT_H / 2,
          cssTransform: `perspective(1500px) rotateX(${deg}deg)`,
        });

        // No camera3D — rely on CSS regex fallback
        applyViewportFit(renderer, VIEWPORT_W, VIEWPORT_H, INSETS, { glCanvasEl });

        const pos = screenPosition(renderer, glCanvasEl);
        results.push({ mode, zoom: renderer.zoom, screenX: pos.x, screenY: pos.y });
      }

      assertAllEqual(results);
    });

    it('CSS-tilt fallback at 30° matches camera3D path at 30°', () => {
      const deg = 30;

      // Path A: camera3D
      const rA   = makeRenderer({ canvasWidth: VIEWPORT_W, canvasHeight: VIEWPORT_H, canvasDpr: DEVICE_DPR });
      const elA  = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });
      applyViewportFit(rA, VIEWPORT_W, VIEWPORT_H, INSETS, {
        camera3D: { rotateX: deg, perspective: 1500 },
        glCanvasEl: elA,
      });
      const posA = screenPosition(rA, elA);

      // Path B: CSS regex
      const rB  = makeRenderer({ canvasWidth: VIEWPORT_W, canvasHeight: VIEWPORT_H, canvasDpr: DEVICE_DPR });
      const elB = makeGlCanvasEl({
        anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2,
        cssTransform: `perspective(1500px) rotateX(${deg}deg)`,
      });
      applyViewportFit(rB, VIEWPORT_W, VIEWPORT_H, INSETS, { glCanvasEl: elB });
      const posB = screenPosition(rB, elB);

      expect(rA.zoom).toBeCloseTo(rB.zoom, 6);
      expect(posA.x).toBeCloseTo(posB.x, 4);
      expect(posA.y).toBeCloseTo(posB.y, 4);
    });
  });

  // -------------------------------------------------------------------------
  // SSAA invariance: confirm that changing canvasDpr (SSAA level) while
  // holding canvasWidth/Height constant has ZERO effect on zoom and position.
  // This is a direct regression guard for item 502 side-effects.
  // -------------------------------------------------------------------------

  describe('SSAA level has no effect on viewport fit', () => {
    it('canvasDpr changes do not affect zoom or screen position (flat)', () => {
      const camera3D = { rotateX: 0, perspective: 1500 };

      for (const [mode, mult] of Object.entries(CANVAS_MULTS)) {
        const canvasCssW = Math.round(VIEWPORT_W * mult);
        const canvasCssH = Math.round(VIEWPORT_H * mult);
        const glCanvasEl = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });

        const modeResults = SSAA_LEVELS.map((ssaa) => {
          const canvasDpr = simulateClampedDpr(canvasCssW, canvasCssH, DEVICE_DPR * ssaa);
          const renderer  = makeRenderer({ canvasWidth: canvasCssW, canvasHeight: canvasCssH, canvasDpr });
          applyViewportFit(renderer, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D, glCanvasEl });
          const pos = screenPosition(renderer, glCanvasEl);
          return { zoom: renderer.zoom, screenX: pos.x, screenY: pos.y };
        });

        const ref = modeResults[0];
        for (const r of modeResults.slice(1)) {
          expect(r.zoom,    `${mode}: zoom differs at SSAA > 1`   ).toBeCloseTo(ref.zoom,    6);
          expect(r.screenX, `${mode}: screenX differs at SSAA > 1`).toBeCloseTo(ref.screenX, 4);
          expect(r.screenY, `${mode}: screenY differs at SSAA > 1`).toBeCloseTo(ref.screenY, 4);
        }
      }
    });

    it('canvasDpr changes do not affect zoom or screen position (tilt 30°)', () => {
      const camera3D = { rotateX: 30, perspective: 1500 };

      for (const [mode, mult] of Object.entries(CANVAS_MULTS)) {
        const canvasCssW = Math.round(VIEWPORT_W * mult);
        const canvasCssH = Math.round(VIEWPORT_H * mult);
        const glCanvasEl = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });

        const modeResults = SSAA_LEVELS.map((ssaa) => {
          const canvasDpr = simulateClampedDpr(canvasCssW, canvasCssH, DEVICE_DPR * ssaa);
          const renderer  = makeRenderer({ canvasWidth: canvasCssW, canvasHeight: canvasCssH, canvasDpr });
          applyViewportFit(renderer, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D, glCanvasEl });
          const pos = screenPosition(renderer, glCanvasEl);
          return { zoom: renderer.zoom, screenX: pos.x, screenY: pos.y };
        });

        const ref = modeResults[0];
        for (const r of modeResults.slice(1)) {
          expect(r.zoom,    `${mode}: zoom differs at SSAA > 1 (tilted)`   ).toBeCloseTo(ref.zoom,    6);
          expect(r.screenX, `${mode}: screenX differs at SSAA > 1 (tilted)`).toBeCloseTo(ref.screenX, 4);
          expect(r.screenY, `${mode}: screenY differs at SSAA > 1 (tilted)`).toBeCloseTo(ref.screenY, 4);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // Sanity: tilt correction actually reduces effectiveH (and therefore zoom)
  // for height-constrained content at moderate tilt angles.
  //
  // Geometry note: the effectiveH cap formula has a minimum at arctan(B/P) ≈ 20°
  // (where B = viewportH/2 = 540, P = 1500). After that angle the cap relaxes
  // again (perspective squishes the plane so much that even large canvas heights
  // fit within the viewport).  We test the narrow content case (64 × 512) where
  // zoom is height-constrained so the cap is observable.
  // -------------------------------------------------------------------------

  describe('sanity: tilt correction actually reduces effective zoom', () => {
    it('zoom at 20° tilt is less than zoom at 0° for height-constrained content', () => {
      // Use tall, narrow content so zoom is height-constrained (not width-constrained).
      // CONTENT: 64 × 512 at zoom=1; effectiveW=1380, effectiveH≈1080/1058@20°.
      const TALL_W = 64;
      const TALL_H = 512;

      function makeTallRenderer(canvasDpr = DEVICE_DPR) {
        const r = makeRenderer({ canvasWidth: VIEWPORT_W, canvasHeight: VIEWPORT_H, canvasDpr });
        // Override content dimensions to tall + narrow.
        r.contentDimensions = function () { return { width: this.zoom * TALL_W, height: this.zoom * TALL_H }; };
        r.zoomToFit = function (w, h, opts = {}) {
          if (this.bitCount === 0 || w <= 0 || h <= 0) return;
          const margin  = 0.96;
          const fitZoom = Math.min((w * margin) / TALL_W, (h * margin) / TALL_H);
          this.zoom     = Math.max(0.1, Math.min(fitZoom, 32));
          const d = this.contentDimensions();
          this.panX = (w - d.width)  / 2;
          this.panY = opts.alignTop ? 12 : (h - d.height) / 2;
        };
        return r;
      }

      const rFlat = makeTallRenderer(); const elFlat = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });
      const rTilt = makeTallRenderer(); const elTilt = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });

      applyViewportFit(rFlat, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D: { rotateX:  0, perspective: 1500 }, glCanvasEl: elFlat });
      applyViewportFit(rTilt, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D: { rotateX: 20, perspective: 1500 }, glCanvasEl: elTilt });

      // At 20° the effectiveH cap ≈ 1058 < 1080 → zoom must be strictly less.
      expect(rTilt.zoom).toBeLessThan(rFlat.zoom);
    });

    it('zoom at 0° is identical to zoom at 45° for height-constrained content (cap releases at high angles)', () => {
      // At 45° the A_max formula yields a cap > original effectiveH so no reduction
      // applies — the zoom returns to the flat value.  This confirms we understand
      // the correction geometry and are not over-correcting at high tilt.
      const TALL_W = 64;
      const TALL_H = 512;

      function makeTallRenderer(canvasDpr = DEVICE_DPR) {
        const r = makeRenderer({ canvasWidth: VIEWPORT_W, canvasHeight: VIEWPORT_H, canvasDpr });
        r.contentDimensions = function () { return { width: this.zoom * TALL_W, height: this.zoom * TALL_H }; };
        r.zoomToFit = function (w, h, opts = {}) {
          if (this.bitCount === 0 || w <= 0 || h <= 0) return;
          const margin  = 0.96;
          const fitZoom = Math.min((w * margin) / TALL_W, (h * margin) / TALL_H);
          this.zoom     = Math.max(0.1, Math.min(fitZoom, 32));
          const d = this.contentDimensions();
          this.panX = (w - d.width)  / 2;
          this.panY = opts.alignTop ? 12 : (h - d.height) / 2;
        };
        return r;
      }

      const rFlat = makeTallRenderer(); const elFlat = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });
      const rTilt = makeTallRenderer(); const elTilt = makeGlCanvasEl({ anchorLeft: VIEWPORT_W / 2, anchorTop: VIEWPORT_H / 2 });

      applyViewportFit(rFlat, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D: { rotateX:  0, perspective: 1500 }, glCanvasEl: elFlat });
      applyViewportFit(rTilt, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D: { rotateX: 45, perspective: 1500 }, glCanvasEl: elTilt });

      // At 45° the maxEffH formula gives ≈ 1170 > 1080, so effectiveH stays at
      // 1080 — zoom is identical to the flat case.
      expect(rTilt.zoom).toBeCloseTo(rFlat.zoom, 6);
    });
  });

  // =========================================================================
  // Multi-resolution alignment: QHD (2560×1440), 4K (3840×2160), DPR=2
  //
  // The invariant (same screen position across all modes × SSAA) must hold at
  // every viewport resolution and device pixel ratio, including cases where:
  //   • DPR is clamped differently per mode (e.g. overscan MODE1 at QHD DPR=2
  //     is clamped to DPR=1.0 while viewport-sized MODE3 reaches DPR=2.0)
  //   • Tilt-adjusted overscan produces canvas widths/heights that differ from
  //     the flat 3.2× baseline (e.g. at 30° tilt MODE1 uses ~4.56× height)
  //   • The canvas CSS size is larger than the GPU max-dimension limit
  //     (e.g. MODE1 at 4K DPR=2 with 30° tilt: canvasW ≈ 15 197 px → DPR=0.54)
  //
  // These tests use a parameterised `collectResultsAt` helper that mirrors the
  // real `getCanvasTargetSize` overscan formula from useCanvasLayout.js so the
  // canvas dimensions fed to `applyViewportFit` match what the browser would
  // actually produce.
  // =========================================================================

  // ---------------------------------------------------------------------------
  // Multi-resolution helpers
  // ---------------------------------------------------------------------------

  /**
   * Compute the CSS canvas size for a given mode, viewport, and camera tilt.
   * Mirrors `getCanvasTargetSize` in useCanvasLayout.js:
   *   • Overscan modes (1/4/5/8): tilt-adjusted max(3.2, scaleHW × diagOverscan × 3.1)
   *   • Viewport-sized modes (3/7): 1.2× fixed
   *   • Grid-sized modes (2/6): 1.0× (test approximation; real size is content-derived)
   */
  function canvasSizeForMode(mode, viewportW, viewportH, deg = 0) {
    if (['MODE3', 'MODE7'].includes(mode)) {
      return { w: Math.round(viewportW * 1.2), h: Math.round(viewportH * 1.2) };
    }
    if (['MODE2', 'MODE6'].includes(mode)) {
      return { w: Math.round(viewportW * 1.0), h: Math.round(viewportH * 1.0) };
    }
    // Overscan modes (1/4/5/8) — tilt-adjusted.
    const ax           = Math.abs(deg) * Math.PI / 180;
    const ay           = 0; // rotateY assumed 0 in these tests
    const scaleH       = 1 / Math.max(0.3, Math.cos(ax));
    const scaleW       = 1 / Math.max(0.3, Math.cos(ay));
    const diagOverscan = 1 + Math.hypot(Math.sin(ax), Math.sin(ay)) * 0.55;
    const drag         = 3.1;
    const rawW = Math.max(viewportW * 3.2, viewportW * scaleW * diagOverscan * drag);
    const rawH = Math.max(viewportH * 3.2, viewportH * scaleH * diagOverscan * drag);
    return { w: Math.round(rawW), h: Math.round(rawH) };
  }

  /**
   * Like `collectResults` but parameterised by viewport dimensions and DPR.
   * Canvas sizes are computed via `canvasSizeForMode` (tilt-aware), matching
   * the real browser sizes more accurately than the fixed CANVAS_MULTS map.
   */
  function collectResultsAt(camera3D, { viewportW, viewportH, deviceDpr, insets: ins = INSETS } = {}) {
    const results = [];
    for (const mode of Object.keys(CANVAS_MULTS)) {
      const { w: cssW, h: cssH } = canvasSizeForMode(mode, viewportW, viewportH, camera3D.rotateX);
      for (const ssaa of SSAA_LEVELS) {
        const canvasDpr  = simulateClampedDpr(cssW, cssH, deviceDpr * ssaa);
        const renderer   = makeRenderer({ canvasWidth: cssW, canvasHeight: cssH, canvasDpr });
        const glCanvasEl = makeGlCanvasEl({ anchorLeft: viewportW / 2, anchorTop: viewportH / 2 });
        applyViewportFit(renderer, viewportW, viewportH, ins, { camera3D, glCanvasEl });
        const pos = screenPosition(renderer, glCanvasEl);
        results.push({ mode, ssaa, zoom: renderer.zoom, screenX: pos.x, screenY: pos.y });
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // QHD (2560 × 1440)
  // ---------------------------------------------------------------------------

  describe('multi-resolution: QHD (2560×1440)', () => {
    it('flat, DPR=1 — all modes × 3 SSAA produce the same zoom and screen position', () => {
      const r = collectResultsAt({ rotateX: 0, perspective: 1500 }, { viewportW: 2560, viewportH: 1440, deviceDpr: 1 });
      expect(r).toHaveLength(24);
      assertAllEqual(r);
    });

    it('tilt 30°, DPR=1 — tilt-adjusted overscan canvas; positions still equal', () => {
      const r = collectResultsAt({ rotateX: 30, perspective: 1500 }, { viewportW: 2560, viewportH: 1440, deviceDpr: 1 });
      assertAllEqual(r);
    });

    it('flat, DPR=2 — overscan MODE1 clamped to DPR=1; viewport MODE3 at DPR=2; still equal', () => {
      // At 2560px MODE1 canvasW=8192 → maxDpr=1.0 (clamped from 2).
      // At 2560px MODE3 canvasW=3072 → maxDpr≈2.67 so canvasDpr=2.0.
      // Despite this per-mode DPR difference, screen positions must be equal.
      const r = collectResultsAt({ rotateX: 0, perspective: 1500 }, { viewportW: 2560, viewportH: 1440, deviceDpr: 2 });
      expect(r).toHaveLength(24);
      assertAllEqual(r);
    });

    it('tilt 30°, DPR=2 — tilt-adjusted canvas + per-mode DPR clamping; positions equal', () => {
      const r = collectResultsAt({ rotateX: 30, perspective: 1500 }, { viewportW: 2560, viewportH: 1440, deviceDpr: 2 });
      assertAllEqual(r);
    });
  });

  // ---------------------------------------------------------------------------
  // 4K (3840 × 2160)
  // ---------------------------------------------------------------------------

  describe('multi-resolution: 4K (3840×2160)', () => {
    it('flat, DPR=1 — all modes × 3 SSAA produce the same zoom and screen position', () => {
      const r = collectResultsAt({ rotateX: 0, perspective: 1500 }, { viewportW: 3840, viewportH: 2160, deviceDpr: 1 });
      expect(r).toHaveLength(24);
      assertAllEqual(r);
    });

    it('tilt 30°, DPR=1 — overscan canvas exceeds GPU limit; DPR clamped < 1; positions equal', () => {
      // At 4K with 30° tilt, MODE1 canvasW ≈ 15 197 px → canvasDpr clamped to ≈ 0.54.
      // applyViewportFit does not use canvasDpr for positioning, so this is safe.
      const r = collectResultsAt({ rotateX: 30, perspective: 1500 }, { viewportW: 3840, viewportH: 2160, deviceDpr: 1 });
      assertAllEqual(r);
    });

    it('flat, DPR=2 — overscan MODE1 canvasW=12288 → canvasDpr≈0.67; positions equal', () => {
      const r = collectResultsAt({ rotateX: 0, perspective: 1500 }, { viewportW: 3840, viewportH: 2160, deviceDpr: 2 });
      assertAllEqual(r);
    });

    it('tilt 30°, DPR=2 — extreme canvas sizes; all modes × 3 SSAA still equal', () => {
      const r = collectResultsAt({ rotateX: 30, perspective: 1500 }, { viewportW: 3840, viewportH: 2160, deviceDpr: 2 });
      assertAllEqual(r);
    });
  });

  // ---------------------------------------------------------------------------
  // DPR=2 at HD (1920×1080) — retina baseline
  // ---------------------------------------------------------------------------

  describe('DPR=2 retina at HD (1920×1080)', () => {
    it('flat — MODE1 DPR clamped to 1.333, MODE3/7 DPR=2; positions equal', () => {
      // MODE1 canvasW=6144 → maxDpr=8192/6144≈1.33; MODE3 canvasW=2304 → maxDpr≈3.56.
      const r = collectResultsAt({ rotateX: 0, perspective: 1500 }, { viewportW: 1920, viewportH: 1080, deviceDpr: 2 });
      expect(r).toHaveLength(24);
      assertAllEqual(r);
    });

    it('tilt 30° — tilt-adjusted canvas with DPR=2; positions equal', () => {
      const r = collectResultsAt({ rotateX: 30, perspective: 1500 }, { viewportW: 1920, viewportH: 1080, deviceDpr: 2 });
      assertAllEqual(r);
    });

    it('tilt 15° and 45° also align at DPR=2', () => {
      assertAllEqual(collectResultsAt({ rotateX: 15, perspective: 1500 }, { viewportW: 1920, viewportH: 1080, deviceDpr: 2 }));
      assertAllEqual(collectResultsAt({ rotateX: 45, perspective: 1500 }, { viewportW: 1920, viewportH: 1080, deviceDpr: 2 }));
    });
  });

  // ---------------------------------------------------------------------------
  // Tilt-adjusted canvas sizes: verify that canvasSizeForMode returns real
  // overscan values (not the fixed 3.2× shortcut) and that alignment holds.
  // ---------------------------------------------------------------------------

  describe('tilt-adjusted canvas sizes (HD baseline, real overscan formula)', () => {
    it('at deg=0 canvasSizeForMode returns same dimensions as CANVAS_MULTS', () => {
      for (const [mode, mult] of Object.entries(CANVAS_MULTS)) {
        const { w, h } = canvasSizeForMode(mode, VIEWPORT_W, VIEWPORT_H, 0);
        expect(w).toBe(Math.round(VIEWPORT_W * mult));
        expect(h).toBe(Math.round(VIEWPORT_H * mult));
      }
    });

    it('at 30° tilt overscan modes exceed 3.2× baseline', () => {
      // scaleH = 1/cos(30°)≈1.155, diagOverscan = 1+sin(30°)×0.55=1.275
      // canvasHMult = max(3.2, 1.155×1.275×3.1) ≈ 4.56 → canvasH > 3456
      const { w, h } = canvasSizeForMode('MODE1', VIEWPORT_W, VIEWPORT_H, 30);
      expect(h).toBeGreaterThan(VIEWPORT_H * 3.2);  // > 3456
      expect(w).toBeGreaterThan(VIEWPORT_W * 3.2);  // > 6144 (diagonal widens too)
    });

    it('flat (deg=0), tilt-aware helper — all modes × 3 SSAA align', () => {
      const r = collectResultsAt({ rotateX: 0, perspective: 1500 },
        { viewportW: VIEWPORT_W, viewportH: VIEWPORT_H, deviceDpr: DEVICE_DPR });
      assertAllEqual(r);
    });

    it('tilt 30°, tilt-aware canvas sizes — all modes × 3 SSAA align', () => {
      const r = collectResultsAt({ rotateX: 30, perspective: 1500 },
        { viewportW: VIEWPORT_W, viewportH: VIEWPORT_H, deviceDpr: DEVICE_DPR });
      assertAllEqual(r);
    });

    it('perspective = 1200 (mid-animation) at 30° tilt — all modes align', () => {
      // During the tilt animation, camera3D.perspective transitions from 1200 → 1500.
      // applyViewportFit reads perspective from camera3D, so calling it at any
      // point in the animation should still produce mode-invariant positions.
      const r = collectResultsAt({ rotateX: 30, perspective: 1200 },
        { viewportW: VIEWPORT_W, viewportH: VIEWPORT_H, deviceDpr: DEVICE_DPR });
      assertAllEqual(r);
    });
  });

  // ---------------------------------------------------------------------------
  // Asymmetric anchor: when the canvas wrapper is not centred in the viewport
  // (e.g. the OS window is partially off-screen, or there is a fixed left bar),
  // the anchor cancels out in the planeOffset formula so all modes still align.
  // ---------------------------------------------------------------------------

  describe('asymmetric anchor (canvas not centred at viewport centre)', () => {
    it('anchor at 70% × 60% of viewport — all modes × 3 SSAA still align', () => {
      const camera3D = { rotateX: 30, perspective: 1500 };
      const results  = [];
      for (const mode of Object.keys(CANVAS_MULTS)) {
        const { w: cssW, h: cssH } = canvasSizeForMode(mode, VIEWPORT_W, VIEWPORT_H, camera3D.rotateX);
        for (const ssaa of SSAA_LEVELS) {
          const canvasDpr  = simulateClampedDpr(cssW, cssH, DEVICE_DPR * ssaa);
          const renderer   = makeRenderer({ canvasWidth: cssW, canvasHeight: cssH, canvasDpr });
          const glCanvasEl = makeGlCanvasEl({
            anchorLeft: VIEWPORT_W * 0.7,  // 1344 instead of 960
            anchorTop:  VIEWPORT_H * 0.6,  // 648  instead of 540
          });
          applyViewportFit(renderer, VIEWPORT_W, VIEWPORT_H, INSETS, { camera3D, glCanvasEl });
          const pos = screenPosition(renderer, glCanvasEl);
          results.push({ mode, ssaa, zoom: renderer.zoom, screenX: pos.x, screenY: pos.y });
        }
      }
      assertAllEqual(results);
    });
  });
});

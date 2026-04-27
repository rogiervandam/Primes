/**
 * BitGridGL — main-thread direct-mode WebGL2 bit-grid renderer.
 *
 * Now a thin facade over `BitGridGLCore` (the pure-GL substrate) and
 * `hostStatePacker` (the host-walking code). Behaviour and external API
 * are unchanged from the pre-extraction version; the split is needed
 * so the worker variant (`BitGridGLWorker` + `bitGridWorker.js`) can
 * share the same shaders and packing logic. See docs/AI_MAINTENANCE.md
 * §8 items 5 (parity harness) and 6 (worker dispatch).
 *
 * SCOPE: see header comment in `bitGridGLCore.js`. This file owns:
 *   - Attaching to a real DOM `<canvas>`
 *   - Reading `window.devicePixelRatio`
 *   - Wiring `webglcontextlost` / `webglcontextrestored`
 *   - Layout-fingerprint caching (so we don't repack positions every frame)
 *   - Defensive `pointer-events: none` (hit-test contract — see §8 item 4)
 */

import { BitGridGLCore } from './bitGridGLCore.js';
import { packPositions, packState } from './hostStatePacker.js';

export class BitGridGL {
  constructor() {
    this.canvas = null;
    this._core = new BitGridGLCore();
    this._posBuf = null;          // Float32Array (texW*texH*2), pan-independent CSS-px
    this._stateBuf = null;        // Uint8Array (texW*texH), packed flags
    this._lost = false;
    this._layoutFingerprint = '';
    this._slots = 0;
  }

  /**
   * Attach to a `<canvas>` and create the WebGL2 context. Returns false
   * (and sets `_lost`) if WebGL2 is unavailable.
   *
   * Hit-testing contract (see docs/AI_MAINTENANCE.md §8 item 4): this
   * canvas MUST never receive pointer events. The Canvas2D layer
   * mounted above it owns input. Any future hit-test must call
   * `host.canvasToBitIndex(x, y)`, the authoritative inverse of
   * `host.bitIndexToCanvas(i)`.
   */
  attach(canvas) {
    if (!canvas) return false;
    this.canvas = canvas;
    canvas.style.pointerEvents = 'none';
    let ok;
    try {
      ok = this._core.init(canvas);
    } catch (err) {
      console.warn('[BitGridGL] init failed:', err);
      this._lost = true;
      return false;
    }
    if (!ok) {
      this._lost = true;
      return false;
    }
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._lost = true;
      this._core.markLost();
    }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        const prevSlots = this._slots;
        this._core = new BitGridGLCore();
        if (!this._core.init(canvas)) throw new Error('webgl2 unavailable');
        // Re-allocate textures at the previous size; uploadPositions
        // will repack on next frame (we cleared the fingerprint).
        const bc = prevSlots ? Math.min(prevSlots, this._posBuf ? this._posBuf.length / 2 : prevSlots) : 0;
        if (bc > 0) this._core.setBitCount(bc);
        this._layoutFingerprint = '';
        this._lost = false;
      } catch (err) {
        console.warn('[BitGridGL] context restore failed:', err);
        this._lost = true;
      }
    }, false);
    return true;
  }

  /** (Re)allocate textures + JS-side pack buffers for the given bit count. */
  resizeForBitCount(bitCount) {
    if (this._lost) return;
    this._core.setBitCount(bitCount);
    const slots = this._core.texW * this._core.texH;
    if (slots !== this._slots) {
      this._slots = slots;
      this._posBuf   = new Float32Array(slots * 2);
      this._stateBuf = new Uint8Array(slots);
      this._layoutFingerprint = '';
    }
  }

  /**
   * Repack the position texture only when the layout fingerprint
   * changes. Pan is excluded from the fingerprint (applied as a
   * shader uniform).
   */
  uploadPositions(host, fingerprint) {
    if (this._lost || !host || !this._posBuf) return;
    if (fingerprint && fingerprint === this._layoutFingerprint) return;
    this._layoutFingerprint = fingerprint || '';
    packPositions(host, this._posBuf, this._slots);
    this._core.uploadPositionBuffer(this._posBuf);
  }

  /** Repack and upload the state texture (recomputed every frame). */
  uploadState(host) {
    if (this._lost || !host || !this._stateBuf) return;
    packState(host, this._stateBuf, this._slots);
    this._core.uploadStateBuffer(this._stateBuf);
  }

  /** Resize the drawing buffer to match CSS pixel size at current DPR. */
  resize(cssWidth, cssHeight) {
    if (this._lost || !this.canvas) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this._core.resize(cssWidth, cssHeight, dpr);
  }

  /**
   * Render one frame.
   *
   * @param {object} params
   * @param {number} params.panX
   * @param {number} params.panY
   * @param {number} params.cellSize    bit cell size in CSS px (after zoom)
   * @param {number[]} params.bgColor
   * @param {number[]} params.setColor
   * @param {number[]} params.clearedColor
   * @param {number[]} params.changedColor
   * @param {number[]} params.repeatedColor
   * @param {number} params.baseAlpha
   */
  render(params) {
    if (this._lost || !this.canvas) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const cssW = parseFloat(this.canvas.style.width) || (this.canvas.width / dpr);
    const cssH = parseFloat(this.canvas.style.height) || (this.canvas.height / dpr);
    this._core.render({
      ...params,
      cssW,
      cssH,
      dpr,
    });
  }

  /** Force the next `uploadPositions()` call to repack regardless of fingerprint. */
  invalidateLayout() {
    this._layoutFingerprint = '';
  }

  dispose() {
    this._core.dispose();
    this.canvas = null;
    this._posBuf = null;
    this._stateBuf = null;
  }
}

/**
 * BitGridGLWorker — main-thread facade matching the BitGridGL API but
 * dispatching the actual WebGL2 work to a module worker via
 * `OffscreenCanvas.transferControlToOffscreen()`.
 *
 * See docs/AI_MAINTENANCE.md §8 item 6.
 *
 * Why a separate facade rather than swapping a backend inside
 * BitGridGL: the worker path has fundamentally different lifecycle
 * (async init, message round-trip for context loss, no synchronous
 * `getContext` failure) and `Visualizer.jsx` already gates the
 * direct-mode wiring on `gl.attach()` returning `true`. Keeping them
 * separate avoids forcing the existing Canvas2D fallback path to
 * become async.
 *
 * Capability fallback: if `OffscreenCanvas.transferControlToOffscreen`
 * is unavailable, `attach()` returns false so callers can skip wiring.
 * The Canvas2D layer keeps drawing — the GL canvas just stays blank.
 *
 * Buffer ownership: positions and state buffers are allocated fresh on
 * each upload and transferred one-way to the worker (no ack). See the
 * comment in `bitGridWorker.js` for the rationale.
 */

import { BitGridGLCore } from './bitGridGLCore.js';
import { packPositions, packState, packAnim } from './hostStatePacker.js';

export function isWorkerGLSupported() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return false;
  if (typeof OffscreenCanvas === 'undefined') return false;
  // Some browsers expose OffscreenCanvas but `transferControlToOffscreen`
  // is on HTMLCanvasElement.prototype.
  return typeof HTMLCanvasElement !== 'undefined'
      && typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';
}

export class BitGridGLWorker {
  constructor() {
    this.canvas = null;
    this._worker = null;
    this._ready = false;
    this._lost = false;
    this._slots = 0;
    this._bitCount = 0;
    this._texW = 0;
    this._texH = 0;
    this._layoutFingerprint = '';
    // Buffered messages while waiting for `ready`. The worker is
    // initialised synchronously after `attach()` but the WebGL context
    // creation inside the worker is async from our perspective.
    this._pending = [];
    // Pending capture callbacks keyed by sequence id.
    this._captureCallbacks = new Map();
    this._captureSeq = 0;
  }

  attach(canvas) {
    if (!canvas) return false;
    if (!isWorkerGLSupported()) {
      this._lost = true;
      return false;
    }
    this.canvas = canvas;
    canvas.style.pointerEvents = 'none';
    let offscreen;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch (err) {
      // `transferControlToOffscreen` throws if the canvas already had a
      // 2D/WebGL context — defensive in case our React mount order ever
      // changes.
      console.warn('[BitGridGLWorker] transferControlToOffscreen failed:', err);
      this._lost = true;
      return false;
    }
    try {
      this._worker = new Worker(
        new URL('./bitGridWorker.js', import.meta.url),
        { type: 'module' },
      );
    } catch (err) {
      console.warn('[BitGridGLWorker] worker construction failed:', err);
      this._lost = true;
      return false;
    }
    this._worker.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'ready') {
        this._ready = true;
        // Flush any queued messages.
        for (const { msg: m, transfer } of this._pending) {
          this._worker.postMessage(m, transfer || []);
        }
        this._pending.length = 0;
      } else if (msg.type === 'error') {
        console.error('[BitGridGLWorker] worker error:', msg.message);
        // Don't tear down — the worker may still be partially functional
        // (e.g. a single bad render call) and the Canvas2D layer is
        // visible above us anyway.
      } else if (msg.type === 'contextlost') {
        // The GPU context inside the worker was lost. Mark ourselves
        // lost so all _post() calls become no-ops during the blackout.
        // Clear the layout fingerprint so positions are re-uploaded on
        // the first frame after restore.
        this._lost = true;
        this._layoutFingerprint = '';
        console.warn('[BitGridGLWorker] WebGL context lost — awaiting restore');
      } else if (msg.type === 'contextrestored') {
        // Worker re-initialised the core and re-allocated textures at
        // the previous bit count. Resume posting; the normal per-frame
        // upload loop (uploadPositions + uploadState + render) will
        // repopulate the GPU data without any extra intervention.
        this._lost = false;
        this._layoutFingerprint = ''; // force position repack on next frame
        console.info('[BitGridGLWorker] WebGL context restored — resuming');
      } else if (msg.type === 'captured') {
        const cb = this._captureCallbacks.get(msg.id);
        if (cb) {
          cb(msg.bitmap || null, msg.error || null);
          this._captureCallbacks.delete(msg.id);
        }
      }
    };
    this._worker.onerror = (err) => {
      console.error('[BitGridGLWorker] worker crashed:', err && err.message);
      this._lost = true;
    };
    this._worker.onmessageerror = (err) => {
      // Fires when a message from the worker cannot be deserialized (rare
      // structured-clone failures, e.g. transferring a neutered buffer).
      // Log so it surfaces during development; treat as non-fatal because the
      // Canvas2D layer continues rendering regardless.
      console.error('[BitGridGLWorker] message deserialization error:', err);
    };
    this._post({ type: 'init', canvas: offscreen }, [offscreen]);
    return true;
  }

  _post(msg, transfer) {
    if (this._lost || !this._worker) return;
    if (!this._ready && msg.type !== 'init') {
      this._pending.push({ msg, transfer });
      return;
    }
    this._worker.postMessage(msg, transfer || []);
  }

  resizeForBitCount(bitCount) {
    if (this._lost) return;
    if (bitCount === this._bitCount && this._slots > 0) return;
    this._bitCount = bitCount;
    const { texW, texH } = BitGridGLCore.texDims(bitCount);
    this._texW = texW;
    this._texH = texH;
    this._slots = texW * texH;
    this._layoutFingerprint = '';
    this._post({ type: 'setBitCount', bitCount });
  }

  uploadPositions(host, fingerprint) {
    if (this._lost || !host || this._slots === 0) return;
    if (fingerprint && fingerprint === this._layoutFingerprint) return;
    this._layoutFingerprint = fingerprint || '';
    const buf = new Float32Array(this._slots * 2);
    packPositions(host, buf, this._slots);
    this._post({ type: 'positions', buf }, [buf.buffer]);
  }

  uploadState(host) {
    if (this._lost || !host || this._slots === 0) return;
    const buf = new Uint8Array(this._slots);
    packState(host, buf, this._slots);
    this._post({ type: 'state', buf }, [buf.buffer]);
  }

  /**
   * Pack per-bit animation state (lowered-3D position deltas + size scale)
   * and transfer to the worker. Called every frame when loweredSetBits may
   * be active; a no-op data payload (all sizeScale=1) is sent when the mode
   * is off so the animTex stays consistent.
   */
  uploadAnim(host) {
    if (this._lost || !host || this._slots === 0) return;
    const buf = new Float32Array(this._slots * 4);
    packAnim(host, buf, this._slots);
    this._post({ type: 'anim', buf }, [buf.buffer]);
  }

  /**
   * @param {number} cssWidth
   * @param {number} cssHeight
   * @param {number} [dprOverride]  Explicit DPR. When omitted,
   *   `window.devicePixelRatio` is used (the normal production path).
   *   The override is exposed for test harnesses that need a controlled DPR.
   */
  resize(cssWidth, cssHeight, dprOverride) {
    if (this._lost) return;
    const dpr = dprOverride != null
      ? dprOverride
      : ((typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    this._cssW = cssWidth;
    this._cssH = cssHeight;
    this._dpr = dpr;
    this._post({ type: 'resize', cssW: cssWidth, cssH: cssHeight, dpr });
  }

  render(params) {
    if (this._lost) return;
    // The worker has no `window`; pass cssW/cssH/dpr explicitly so its
    // BitGridGLCore can configure the viewport without DOM access.
    this._post({
      type: 'render',
      params: {
        ...params,
        cssW: this._cssW || 0,
        cssH: this._cssH || 0,
        dpr: this._dpr || 1,
      },
    });
  }

  invalidateLayout() {
    this._layoutFingerprint = '';
  }

  /**
   * Request a one-shot pixel snapshot from the worker. The worker calls
   * `OffscreenCanvas.transferToImageBitmap()` after flushing pending GL
   * commands and posts back the bitmap as a transferable.
   *
   * Designed for the parity harness only — not called in production.
   *
   * @param {(bitmap: ImageBitmap|null, error: string|null) => void} callback
   */
  capture(callback) {
    if (this._lost || !this._worker) {
      callback(null, 'worker lost or unavailable');
      return;
    }
    const id = ++this._captureSeq;
    this._captureCallbacks.set(id, callback);
    this._post({ type: 'capture', id });
  }

  dispose() {
    if (this._worker) {
      try { this._worker.postMessage({ type: 'dispose' }); } catch { /* ignore */ }
      try { this._worker.terminate(); } catch { /* ignore */ }
    }
    this._worker = null;
    this.canvas = null;
    this._ready = false;
    this._pending.length = 0;
  }
}

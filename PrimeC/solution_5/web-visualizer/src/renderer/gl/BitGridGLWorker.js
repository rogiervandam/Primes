/**
 * BitGridGLWorker — main-thread facade matching the BitGridGL API but
 * dispatching the actual WebGL2 work to a module worker via
 * `OffscreenCanvas.transferControlToOffscreen()`.
 *
 * The worker path has a distinct lifecycle: async init, message round-trip
 * for context loss, and no synchronous `getContext` failure. `Visualizer.jsx`
 * gates wiring on `attach()` returning `true`.
 *
 * Capability fallback: if `OffscreenCanvas.transferControlToOffscreen`
 * is unavailable, `attach()` returns false so callers can show the
 * `glUnavailable` warning instead of pretending cell fills are available.
 *
 * Buffer ownership: positions and state buffers are allocated fresh on
 * each upload and transferred one-way to the worker (no ack). See the
 * comment in `bitGridWorker.js` for the rationale.
 */

import { BitGridGLCore } from './bitGridGLCore.js';
import { packPositions, packState, packAnim } from './hostStatePacker.js';

let cachedMaxCanvasDimension = null;

export function isWorkerGLSupported() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return false;
  if (typeof OffscreenCanvas === 'undefined') return false;
  // Some browsers expose OffscreenCanvas but `transferControlToOffscreen`
  // is on HTMLCanvasElement.prototype.
  return typeof HTMLCanvasElement !== 'undefined'
      && typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';
}

/**
 * Safari has a persistent WebKit bug: an OffscreenCanvas running in a Web
 * Worker gets its own GPU compositing layer, which is updated asynchronously
 * from the worker. During animation or canvas drag, the compositor briefly
 * reads the layer between the worker's gl.clear() call and the instanced-quad
 * draw call, exposing the cleared state. Because the GL context is created
 * with alpha:false, that cleared state is opaque black — the visible flicker.
 *
 * preserveDrawingBuffer:true does not help because the GPU layer swap itself
 * (not the within-frame clear) is what exposes black in Safari's Metal
 * compositor path.
 *
 * The fix: on Safari, skip the worker entirely and call BitGridGLCore
 * synchronously on the main thread. The main thread and Canvas2D renderer
 * then share the same compositing tick, eliminating the race.
 */
function isSafari() {
  if (typeof navigator === 'undefined') return false;
  // UA test: Safari on macOS/iOS but not Chrome/Edge/Firefox which also
  // include "Safari" in their UA strings.
  return /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
}

function getMaxGLCanvasDimension() {
  if (cachedMaxCanvasDimension != null) return cachedMaxCanvasDimension;
  if (typeof document === 'undefined') {
    cachedMaxCanvasDimension = Number.POSITIVE_INFINITY;
    return cachedMaxCanvasDimension;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      cachedMaxCanvasDimension = Number.POSITIVE_INFINITY;
      return cachedMaxCanvasDimension;
    }
    const viewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) || [Infinity, Infinity];
    const maxViewportDim = Math.min(viewportDims[0] || Infinity, viewportDims[1] || Infinity);
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || Infinity;
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || Infinity;
    cachedMaxCanvasDimension = Math.min(maxViewportDim, maxRenderbufferSize, maxTextureSize);
  } catch {
    cachedMaxCanvasDimension = Number.POSITIVE_INFINITY;
  }
  return cachedMaxCanvasDimension;
}

function getDisplayRiskMetrics(maxCanvasDimension) {
  const dpr = Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const viewportW = (typeof window !== 'undefined' && window.innerWidth) || 0;
  const viewportH = (typeof window !== 'undefined' && window.innerHeight) || 0;
  const screenW = (typeof window !== 'undefined' && window.screen?.width) || 0;
  const screenH = (typeof window !== 'undefined' && window.screen?.height) || 0;
  const baseW = Math.max(viewportW, screenW);
  const baseH = Math.max(viewportH, screenH);
  const estimatedCanvasW = baseW * 3.2;
  const estimatedCanvasH = baseH * 3.2;
  const estimatedBackingMax = Math.max(estimatedCanvasW * dpr, estimatedCanvasH * dpr);
  const riskThreshold = Number.isFinite(maxCanvasDimension) ? maxCanvasDimension * 0.98 : Infinity;
  const isRisky = Number.isFinite(maxCanvasDimension)
    ? estimatedBackingMax >= riskThreshold
    : false;
  return {
    dpr,
    viewportW,
    viewportH,
    screenW,
    screenH,
    estimatedCanvasW,
    estimatedCanvasH,
    estimatedBackingMax,
    riskThreshold,
    isRisky,
  };
}

function shouldPreferDirectMode(maxCanvasDimension) {
  return getDisplayRiskMetrics(maxCanvasDimension).isRisky;
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
    this._renderSeq = 0;
    this._renderedSeq = 0;
    this._renderWaiters = new Map();
    this._maxCanvasDimension = getMaxGLCanvasDimension();
    // Direct (main-thread) mode — used on Safari to avoid OffscreenCanvas
    // compositing flicker. When true, _core is a BitGridGLCore instance
    // running synchronously; _worker is null.
    this._direct = false;
    this._directReason = 'unknown';
    this._core = null;
  }

  attach(canvas) {
    if (!canvas) return false;
    const safari = isSafari();
    const workerSupported = isWorkerGLSupported();
    const nearGLLimit = shouldPreferDirectMode(this._maxCanvasDimension);
    const preferDirectMode = safari || !workerSupported || nearGLLimit;
    if (safari) this._directReason = 'safari';
    else if (!workerSupported) this._directReason = 'worker-unsupported';
    else if (nearGLLimit) this._directReason = 'near-gpu-limit';
    else this._directReason = 'worker-path';
    // On Safari, or on displays where the oversized GL plane would sit at the
    // GPU backing-size limit, fall back to main-thread WebGL so we avoid both
    // OffscreenCanvas compositor lag and near-limit worker backing-store races.
    if (preferDirectMode) {
      this.canvas = canvas;
      canvas.style.pointerEvents = 'none';
      const core = new BitGridGLCore();
      if (!core.init(canvas)) {
        this._lost = true;
        return false;
      }
      this._core = core;
      this._direct = true;
      this._ready = true;
      return true;
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
      } else if (msg.type === 'rendered') {
        this._resolveRendered(msg.seq | 0);
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

  _resolveRendered(seq) {
    if (!seq) return;
    if (seq > this._renderedSeq) this._renderedSeq = seq;
    if (this._renderWaiters.size === 0) return;
    for (const [waitSeq, callbacks] of this._renderWaiters.entries()) {
      if (waitSeq > this._renderedSeq) continue;
      for (const cb of callbacks) {
        try {
          cb();
        } catch {
          // Keep render ack failures isolated from the rendering pipeline.
        }
      }
      this._renderWaiters.delete(waitSeq);
    }
  }

  waitForRender(seq, callback) {
    if (typeof callback !== 'function') return;
    const targetSeq = seq | 0;
    if (!targetSeq || targetSeq <= this._renderedSeq || this._direct) {
      callback();
      return;
    }
    let callbacks = this._renderWaiters.get(targetSeq);
    if (!callbacks) {
      callbacks = new Set();
      this._renderWaiters.set(targetSeq, callbacks);
    }
    callbacks.add(callback);
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
    if (this._direct) {
      this._core.setBitCount(bitCount);
      return;
    }
    this._post({ type: 'setBitCount', bitCount });
  }

  uploadPositions(host, fingerprint) {
    if (this._lost || !host || this._slots === 0) return;
    if (fingerprint && fingerprint === this._layoutFingerprint) return;
    this._layoutFingerprint = fingerprint || '';
    const buf = new Float32Array(this._slots * 2);
    packPositions(host, buf, this._slots);
    if (this._direct) {
      this._core.uploadPositionBuffer(buf);
      return;
    }
    this._post({ type: 'positions', buf }, [buf.buffer]);
  }

  uploadState(host) {
    if (this._lost || !host || this._slots === 0) return;
    const buf = new Uint8Array(this._slots);
    packState(host, buf, this._slots);
    if (this._direct) {
      this._core.uploadStateBuffer(buf);
      return;
    }
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
    if (this._direct) {
      this._core.uploadAnimBuffer(buf);
      return;
    }
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
    const requestedDpr = dprOverride != null
      ? dprOverride
      : ((typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    let dpr = Math.max(0.1, requestedDpr || 1);
    const maxDim = this._maxCanvasDimension;
    if (Number.isFinite(maxDim) && cssWidth > 0 && cssHeight > 0) {
      const maxDpr = Math.min(maxDim / cssWidth, maxDim / cssHeight);
      dpr = Math.max(0.1, Math.min(dpr, maxDpr));
    }
    this._cssW = cssWidth;
    this._cssH = cssHeight;
    this._dpr = dpr;
    if (this._direct) {
      this._core.resize(cssWidth, cssHeight, dpr);
      return;
    }
    this._post({ type: 'resize', cssW: cssWidth, cssH: cssHeight, dpr });
  }

  getEffectiveDpr() {
    return this._dpr || 1;
  }

  isDirectMode() {
    return this._direct === true;
  }

  render(params) {
    if (this._lost) return 0;
    const seq = ++this._renderSeq;
    if (this._direct) {
      this._core.render({
        ...params,
        cssW: this._cssW || 0,
        cssH: this._cssH || 0,
        dpr: this._dpr || 1,
      });
      this._resolveRendered(seq);
      return seq;
    }
    // The worker has no `window`; pass cssW/cssH/dpr explicitly so its
    // BitGridGLCore can configure the viewport without DOM access.
    this._post({
      type: 'render',
      seq,
      params: {
        ...params,
        cssW: this._cssW || 0,
        cssH: this._cssH || 0,
        dpr: this._dpr || 1,
      },
    });
    return seq;
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
    if (this._lost) {
      callback(null, 'worker lost or unavailable');
      return;
    }
    if (this._direct) {
      // Main-thread capture: flush and grab an ImageBitmap from the canvas.
      if (!this.canvas || typeof this.canvas.transferToImageBitmap !== 'function') {
        callback(null, 'capture not supported in direct mode');
        return;
      }
      try {
        this._core.gl.flush();
        const bitmap = this.canvas.transferToImageBitmap();
        callback(bitmap, null);
      } catch (err) {
        callback(null, String(err && err.message || err));
      }
      return;
    }
    if (!this._worker) {
      callback(null, 'worker lost or unavailable');
      return;
    }
    const id = ++this._captureSeq;
    this._captureCallbacks.set(id, callback);
    this._post({ type: 'capture', id });
  }

  /**
   * Returns diagnostic information for debugging GL mode and capacity issues.
   * Used by the debug overlay to understand why direct mode is/isn't engaged.
   */
  getDebugInfo() {
    const maxDim = this._maxCanvasDimension;
    const metrics = getDisplayRiskMetrics(maxDim);
    
    return {
      mode: this._direct ? 'direct' : 'worker',
      modeReason: this._directReason,
      ready: this._ready,
      lost: this._lost,
      isSafari: isSafari(),
      isWorkerSupported: isWorkerGLSupported(),
      maxGLDimension: Number.isFinite(maxDim) ? maxDim : 'Infinity',
      devicePixelRatio: metrics.dpr,
      viewportWidth: metrics.viewportW,
      viewportHeight: metrics.viewportH,
      screenWidth: metrics.screenW,
      screenHeight: metrics.screenH,
      estimatedCanvasW: Math.round(metrics.estimatedCanvasW),
      estimatedCanvasH: Math.round(metrics.estimatedCanvasH),
      estimatedBackingMax: Math.round(metrics.estimatedBackingMax),
      riskThreshold: Number.isFinite(metrics.riskThreshold) ? Math.round(metrics.riskThreshold) : 'Infinity',
      isAtRisk: metrics.isRisky,
      effectiveDpr: this._dpr || 1,
      currentCssW: this._cssW || 0,
      currentCssH: this._cssH || 0,
      currentBackingW: Math.round((this._cssW || 0) * (this._dpr || 1)),
      currentBackingH: Math.round((this._cssH || 0) * (this._dpr || 1)),
    };
  }

  dispose() {
    if (this._direct && this._core) {
      try { this._core.dispose(); } catch { /* ignore */ }
      this._core = null;
    }
    if (this._worker) {
      try { this._worker.postMessage({ type: 'dispose' }); } catch { /* ignore */ }
      try { this._worker.terminate(); } catch { /* ignore */ }
    }
    this._worker = null;
    this.canvas = null;
    this._ready = false;
    this._lost = true;   // prevent buffer allocation in uploadPositions/uploadState/uploadAnim after disposal
    this._pending.length = 0;
  }
}

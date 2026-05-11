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
 * `isGlUnavailable` warning instead of pretending cell fills are available.
 *
 * Buffer ownership: positions and state buffers are allocated fresh on
 * each upload and transferred one-way to the worker (no ack). See the
 * comment in `bitGridWorker.js` for the rationale.
 */

import { BitGridGLCore } from './bitGridGLCore.js';
import { packState, packAnim } from './hostStatePacker.js';
import { GlyphTextGLCore } from './GlyphTextGLCore.js';
import { replayGlyphCmds } from './glyphReplay.js';

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

function isChromiumFamily() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Chrome / Edge / Chromium / Opera on desktop and iOS Chromium variants.
  const chromiumLike = /(Chrome|Chromium|Edg|OPR|CriOS|EdgiOS)/i.test(ua);
  return chromiumLike && !isSafari();
}

function getCompositorSafeDimension() {
  // Chromium visually drifts the GL layer when very large canvases are
  // rendered inside a CSS 3D stacking context (e.g. a parent div with
  // perspective set). This affects both direct-mode HTMLCanvasElement and
  // worker-mode OffscreenCanvas whenever the camera is active (which sets
  // `perspective: Xpx` on the container div). Keeping backing dimensions at
  // or below ~8K avoids the compositor tiling path that causes this drift.
  return isChromiumFamily() ? 8192 : Infinity;
}

/** @deprecated Use getCompositorSafeDimension() */
function getDirectModeCompositorSafeDimension() {
  return getCompositorSafeDimension();
}

/**
 * Some browsers silently clamp HTMLCanvasElement backing dimensions below
 * WebGL's reported MAX_* caps. Probe the real width limit by assignment.
 */
function detectCanvasBackingLimit(canvas, upperBound) {
  const cap = Math.max(1, Math.floor(Math.min(upperBound || Infinity, 32768)));
  let lo = 1;
  let hi = cap;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    let ok = false;
    try {
      canvas.width = mid;
      ok = canvas.width === mid;
    } catch {
      ok = false;
    }
    if (ok) lo = mid;
    else hi = mid - 1;
  }
  // Reset probe canvas to a tiny default so we don't retain large allocations.
  canvas.width = 1;
  canvas.height = 1;
  return lo;
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
    const maxByGLCaps = Math.min(maxViewportDim, maxRenderbufferSize, maxTextureSize);
    const maxByCanvasBacking = detectCanvasBackingLimit(canvas, maxByGLCaps);
    cachedMaxCanvasDimension = Math.min(maxByGLCaps, maxByCanvasBacking || Infinity);
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

function isDevBuild() {
  try {
    return !!(import.meta && import.meta.env && import.meta.env.DEV);
  } catch {
    return false;
  }
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
    // Buffered messages while waiting for `ready`. The worker is
    // initialised synchronously after `attach()` but the WebGL context
    // creation inside the worker is async from our perspective.
    this._pending = [];
    // Callbacks invoked once when the worker (or direct core) is ready.
    this._onReadyCallbacks = [];
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
    this._requestedMode = 'auto';
    this._core = null;
    // Glyph renderer sharing the bit-grid GL context in direct mode.
    // Used by viewport-size modes (3 & 7) to render text into the same canvas.
    this._glyphCore = null;
    // Atlas data received from the worker's ready message (worker mode only).
    this._atlasAdvances = null;
    this._atlasCharSize = 0;
  }

  attach(canvas, forceMode = 'auto') {
    if (!canvas) return false;
    const requestedMode = forceMode === 'worker' || forceMode === 'direct' ? forceMode : 'auto';
    this._requestedMode = requestedMode;
    const safari = isSafari();
    const workerSupported = isWorkerGLSupported();
    const nearGLLimit = shouldPreferDirectMode(this._maxCanvasDimension);
    let preferDirectMode;
    if (requestedMode === 'direct') {
      preferDirectMode = true;
      this._directReason = 'forced-direct';
    } else if (requestedMode === 'worker') {
      if (!workerSupported) {
        this._directReason = 'forced-worker-unsupported';
        this._lost = true;
        return false;
      }
      preferDirectMode = false;
      this._directReason = 'forced-worker';
    } else {
      // In React StrictMode dev builds, passive effects are intentionally
      // mounted twice. Offscreen transfer is one-shot, so the second mount on
      // the same canvas would fail. Prefer direct mode for auto selection.
      const devAutoDirect = isDevBuild();
      preferDirectMode = devAutoDirect || safari || !workerSupported || nearGLLimit;
      if (devAutoDirect) this._directReason = 'dev-auto';
      else if (safari) this._directReason = 'safari';
      else if (!workerSupported) this._directReason = 'worker-unsupported';
      else if (nearGLLimit) this._directReason = 'near-gpu-limit';
      else this._directReason = 'worker-path';
    }
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
      // Initialise a glyph renderer sharing the bit-grid GL context so that
      // viewport-size modes (3 & 7) can render text into the same canvas without
      // a separate overlay element.
      try {
        const glyphCore = new GlyphTextGLCore();
        glyphCore.initWithContext(core.gl, canvas);
        this._glyphCore = glyphCore;
        if (glyphCore._atlas) {
          this._atlasAdvances = glyphCore._atlas.getAdvancesArray();
          this._atlasCharSize = glyphCore._atlas.fontSize;
        }
      } catch (err) {
        console.warn('[BitGridGLWorker] direct-mode glyph init failed:', err);
        this._glyphCore = null;
      }
      // Fire ready callbacks synchronously (no async worker involved).
      for (const cb of this._onReadyCallbacks) cb();
      this._onReadyCallbacks = [];
      return true;
    }
    this.canvas = canvas;
    canvas.style.pointerEvents = 'none';
    let offscreen;
    try {
      offscreen = canvas.transferControlToOffscreen();
      canvas.__offscreenTransferred = true;
    } catch (err) {
      // One-shot transfer: once a canvas is transferred, main-thread
      // getContext() is permanently unavailable. Do NOT attempt direct-mode
      // fallback on this same element.
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        this._directReason = 'offscreen-already-transferred';
        this._lost = true;
        console.warn('[BitGridGLWorker] transferControlToOffscreen failed: canvas already transferred', err);
        return false;
      }
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
        this._atlasAdvances = msg.atlasAdvances || null;
        this._atlasCharSize = msg.atlasCharSize || 0;
        this._ready = true;
        for (const cb of this._onReadyCallbacks) cb();
        this._onReadyCallbacks = [];
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
        console.warn('[BitGridGLWorker] WebGL context lost — awaiting restore');
      } else if (msg.type === 'contextrestored') {
        // Worker re-initialised the core and re-allocated textures at
        // the previous bit count. Resume posting; the normal per-frame
        // upload loop (uploadState + render) will repopulate the GPU
        // data without any extra intervention.
        this._lost = false;
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
    if (this._direct) {
      this._core.setBitCount(bitCount);
      return;
    }
    this._post({ type: 'setBitCount', bitCount });
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
   * Pack per-bit animation state (position deltas + size scale) and transfer
   * to the worker. A no-op data payload (all sizeScale=1) is sent every frame
   * so the animTex stays consistent.
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
   * @param {number} [snapDprOverride]  Snap DPR for sub-pixel snapping (u_dpr).
   *   Should be the user-facing DPR without the SSAA multiplier. When omitted,
   *   defaults to the clamped physical DPR.
   */
  resize(cssWidth, cssHeight, dprOverride, snapDprOverride) {
    if (this._lost) return;
    const requestedDpr = dprOverride != null
      ? dprOverride
      : ((typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    let dpr = Math.max(0.1, requestedDpr || 1);
    // Apply the same compositor-safe limit to both direct and worker modes.
    // In WebGL-tilt modes the camera always sets perspective: Xpx on the
    // container, creating a CSS 3D stacking context. Chromium compositor
    // tiles any canvas whose backing store exceeds ~8K in that context,
    // causing visible drift / offset. Worker-mode OffscreenCanvas is
    // affected the same way as direct-mode HTMLCanvasElement.
    const compositorSafeDim = getCompositorSafeDimension();
    const maxDim = Math.min(this._maxCanvasDimension, compositorSafeDim);
    if (Number.isFinite(maxDim) && cssWidth > 0 && cssHeight > 0) {
      const maxDpr = Math.min(maxDim / cssWidth, maxDim / cssHeight);
      dpr = Math.max(0.1, Math.min(dpr, maxDpr));
    }
    this._cssW = cssWidth;
    this._cssH = cssHeight;
    this._dpr = dpr;
    // snapDpr is clamped to at most the physical DPR so it never exceeds it.
    this._snapDpr = Math.max(0.1, Math.min(
      snapDprOverride != null ? snapDprOverride : dpr,
      dpr,
    ));
    if (this._direct) {
      this._core.resize(cssWidth, cssHeight, dpr);
      if (this._glyphCore) this._glyphCore.resize(cssWidth, cssHeight, dpr, this._snapDpr);
      return;
    }
    this._post({ type: 'resize', cssW: cssWidth, cssH: cssHeight, dpr, snapDpr: this._snapDpr });
  }

  getEffectiveDpr() {
    return this._dpr || 1;
  }

  isDirectMode() {
    return this._direct === true;
  }

  /**
   * Returns atlas advance widths and char size received from the worker,
   * or null if the worker hasn't reported them (e.g. direct mode).
   * @returns {{ advances: Float32Array, charSize: number } | null}
   */
  getAtlasData() {
    if (!this._atlasAdvances || !this._atlasCharSize) return null;
    return { advances: this._atlasAdvances, charSize: this._atlasCharSize };
  }

  /**
   * Invoke `callback` once the worker (or direct core) is ready.
   * If already ready, invokes synchronously; otherwise queues for the
   * next `ready` message from the worker.
   * @param {() => void} callback
   */
  whenReady(callback) {
    if (typeof callback !== 'function') return;
    if (this._ready) {
      callback();
    } else {
      this._onReadyCallbacks.push(callback);
    }
  }

  render(params, glyphCmds) {
    if (this._lost) return 0;
    const seq = ++this._renderSeq;
    if (this._direct) {
      this._core.render({
        ...params,
        cssW: this._cssW || 0,
        cssH: this._cssH || 0,
        dpr: this._dpr || 1,
        snapDpr: this._snapDpr || this._dpr || 1,
      });
      if (glyphCmds && glyphCmds.count > 0 && this._glyphCore) {
        this._glyphCore.setTilt(
          Number(params.tiltXDeg) || 0,
          Number(params.tiltYDeg) || 0,
          Math.max(1, Number(params.perspective) || 1500),
          params.enableGlTilt ? 1 : 0,
        );
        replayGlyphCmds(this._glyphCore, glyphCmds);
      }
      this._resolveRendered(seq);
      return seq;
    }
    // The worker has no `window`; pass cssW/cssH/dpr explicitly so its
    // BitGridGLCore can configure the viewport without DOM access.
    const msg = {
      type: 'render',
      seq,
      params: {
        ...params,
        cssW: this._cssW || 0,
        cssH: this._cssH || 0,
        dpr: this._dpr || 1,
        snapDpr: this._snapDpr || this._dpr || 1,
      },
    };
    const transfers = [];
    if (glyphCmds && glyphCmds.count > 0) {
      msg.glyphCmds = glyphCmds;
      if (glyphCmds.paramBuf?.buffer) transfers.push(glyphCmds.paramBuf.buffer);
      if (glyphCmds.textBuf?.buffer)  transfers.push(glyphCmds.textBuf.buffer);
    }
    this._post(msg, transfers);
    return seq;
  }

  /**
   * Replay glyph-only draw commands on top of the existing frame.
   * Used by animation methods (ripple, trails, etc.) that run after render().
   * @param {{ paramBuf: Float32Array, textBuf: Uint8Array, count: number,
   *           cssW: number, cssH: number, dpr: number }} glyphCmds
   */
  renderGlyph(glyphCmds) {
    if (this._lost || !glyphCmds || glyphCmds.count === 0) return;
    if (this._direct) {
      // Direct mode (modes 2/3): replay animation glyph commands into the
      // shared GL context so ripple/pulse/fade overlays are visible on the
      // single-canvas modes that have no separate glyph overlay element.
      if (this._glyphCore) replayGlyphCmds(this._glyphCore, glyphCmds);
      return;
    }
    const msg = { type: 'renderGlyph', glyphCmds };
    const transfers = [];
    if (glyphCmds.paramBuf?.buffer) transfers.push(glyphCmds.paramBuf.buffer);
    if (glyphCmds.textBuf?.buffer)  transfers.push(glyphCmds.textBuf.buffer);
    this._post(msg, transfers);
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
    const compositorSafeDim = getCompositorSafeDimension();
    const effectiveMaxDim = Math.min(maxDim, compositorSafeDim);
    const metrics = getDisplayRiskMetrics(maxDim);
    
    return {
      requestedMode: this._requestedMode,
      mode: this._direct ? 'direct' : 'worker',
      modeReason: this._directReason,
      ready: this._ready,
      lost: this._lost,
      isSafari: isSafari(),
      isWorkerSupported: isWorkerGLSupported(),
      isChromiumFamily: isChromiumFamily(),
      maxGLDimension: Number.isFinite(maxDim) ? maxDim : 'Infinity',
      directCompositorSafeDimension: Number.isFinite(compositorSafeDim) ? compositorSafeDim : 'Infinity',
      effectiveMaxBackingDimension: Number.isFinite(effectiveMaxDim) ? effectiveMaxDim : 'Infinity',
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
    if (this._direct) {
      if (this._glyphCore) {
        try { this._glyphCore.dispose(); } catch { /* ignore */ }
        this._glyphCore = null;
      }
      if (this._core) {
        try { this._core.dispose(); } catch { /* ignore */ }
        this._core = null;
      }
    }
    if (this._worker) {
      try { this._worker.postMessage({ type: 'dispose' }); } catch { /* ignore */ }
      try { this._worker.terminate(); } catch { /* ignore */ }
    }
    this._worker = null;
    this.canvas = null;
    this._ready = false;
    this._lost = true;   // prevent buffer allocation in uploadState/uploadAnim after disposal
    this._pending.length = 0;
    this._requestedMode = 'auto';
  }
}

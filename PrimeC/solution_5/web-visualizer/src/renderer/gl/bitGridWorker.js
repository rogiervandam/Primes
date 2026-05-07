/**
 * bitGridWorker — module worker that owns the WebGL2 context for the
 * production BitGridGL renderer.
 *
 * Message protocol (main → worker):
 *   { type: 'init',        canvas: OffscreenCanvas }   // canvas transferred
 *   { type: 'setBitCount', bitCount: number }
 *   { type: 'resize',      cssW, cssH, dpr }
 *   { type: 'state',       buf: Uint8Array }           // buf transferred (one-way)
 *   { type: 'anim',        buf: Float32Array }         // buf transferred (one-way)
 *   { type: 'render',      params: { ... }, glyphCmds?: { paramBuf, textBuf, count, cssW, cssH, dpr } }
 *   { type: 'renderGlyph', glyphCmds: { paramBuf, textBuf, count, cssW, cssH, dpr } }
 *   { type: 'dispose' }
 *
 * Worker → main:
 *   { type: 'ready', atlasAdvances?: Float32Array, atlasCharSize?: number }
 *   { type: 'error',            message: string }
 *   { type: 'contextlost' }
 *   { type: 'contextrestored' }
 *   { type: 'captured', id: number, bitmap?: ImageBitmap, error?: string }
 *
 * Buffers are NOT round-tripped back. The main-thread facade allocates
 * a fresh typed array per upload and transfers it; this avoids the
 * latency of an async ack and keeps the message flow strictly one-way.
 * GC cost is minor at this app's bit counts (≤ ~256 KB / frame for the
 * state buffer).
 *
 * Context-loss recovery: `webglcontextlost` / `webglcontextrestored`
 * events fire on the OffscreenCanvas itself (same as on HTMLCanvasElement).
 * On loss: core is marked lost and nulled; main thread is notified so it
 * stops posting. On restore: core is re-initialised at the previous bit
 * count; main thread resumes uploading on the next animation frame.
 */

import { BitGridGLCore } from './bitGridGLCore.js';
import { GlyphTextGLCore } from './GlyphTextGLCore.js';
import { replayGlyphCmds } from './glyphReplay.js';

let core = null;
// Persistent across context loss/restore so we can re-initialise.
let savedCanvas = null;
let currentBitCount = 0;

// Glyph renderer sharing the same GL context as the bit-grid core.
let glyphCore = null;
let lastCssW = 0;
let lastCssH = 0;
let lastDpr  = 1;
let lastGlyphTilt = {
  tiltXDeg: 0,
  tiltYDeg: 0,
  perspective: 1200,
  enableGlTilt: 0,
};

function safe(fn) {
  try { fn(); }
  catch (err) {
    self.postMessage({ type: 'error', message: String(err && err.message || err) });
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  if (!msg || !msg.type) return;
  switch (msg.type) {
    case 'init': {
      safe(() => {
        const canvas = msg.canvas;
        savedCanvas = canvas;
        core = new BitGridGLCore();
        const ok = core.init(canvas);
        if (!ok) {
          self.postMessage({ type: 'error', message: 'webgl2 unavailable in worker' });
          core = null;
          return;
        }

        // Wire context-loss recovery on the OffscreenCanvas.
        canvas.addEventListener('webglcontextlost', (e) => {
          // Prevent the default so the browser may restore the context.
          e.preventDefault();
          if (core) { core.markLost(); core = null; }
          glyphCore = null;
          self.postMessage({ type: 'contextlost' });
        }, false);

        canvas.addEventListener('webglcontextrestored', () => {
          try {
            core = new BitGridGLCore();
            if (!core.init(savedCanvas)) {
              core = null;
              glyphCore = null;
              self.postMessage({ type: 'error', message: 'webgl2 restore failed: unavailable' });
              return;
            }
            // Re-allocate textures at the last known bit count so the
            // next uploadState / render round-trip works
            // without needing a resizeForBitCount call from the main thread.
            if (currentBitCount > 0) core.setBitCount(currentBitCount);
            // Re-init glyph renderer on the restored context.
            try {
              glyphCore = new GlyphTextGLCore();
              glyphCore.initWithContext(core.gl, savedCanvas);
              if (lastCssW > 0) glyphCore.resize(lastCssW, lastCssH, lastDpr);
            } catch {
              glyphCore = null;
            }
            self.postMessage({ type: 'contextrestored' });
          } catch (err) {
            core = null;
            glyphCore = null;
            self.postMessage({
              type: 'error',
              message: 'webgl2 restore failed: ' + String(err && err.message || err),
            });
          }
        }, false);

        // Init glyph renderer sharing the bit-grid GL context.
        let atlasAdvances = null;
        let atlasCharSize = 0;
        try {
          glyphCore = new GlyphTextGLCore();
          glyphCore.initWithContext(core.gl, savedCanvas);
          if (glyphCore._atlas) {
            atlasAdvances = glyphCore._atlas.getAdvancesArray();
            atlasCharSize = glyphCore._atlas.fontSize;
          }
        } catch (err) {
          glyphCore = null;
          self.postMessage({ type: 'error', message: 'glyph init failed: ' + String(err && err.message || err) });
        }

        if (atlasAdvances) {
          self.postMessage({ type: 'ready', atlasAdvances, atlasCharSize }, [atlasAdvances.buffer]);
        } else {
          self.postMessage({ type: 'ready' });
        }
      });
      break;
    }
    case 'setBitCount': {
      currentBitCount = msg.bitCount | 0;
      if (!core) return;
      safe(() => core.setBitCount(currentBitCount));
      break;
    }
    case 'resize': {
      lastCssW = msg.cssW || 0;
      lastCssH = msg.cssH || 0;
      lastDpr  = msg.dpr  || 1;
      if (!core) return;
      safe(() => {
        core.resize(lastCssW, lastCssH, lastDpr);
        if (glyphCore) glyphCore.resize(lastCssW, lastCssH, lastDpr);
      });
      break;
    }
    case 'state': {
      if (!core) return;
      safe(() => core.uploadStateBuffer(msg.buf));
      break;
    }
    case 'anim': {
      if (!core) return;
      safe(() => core.uploadAnimBuffer(msg.buf));
      break;
    }
    case 'render': {
      if (!core) return;
      safe(() => {
        core.render(msg.params);
        if (msg.glyphCmds && glyphCore) {
          _applyGlyphTilt(glyphCore, msg.params);
          replayGlyphCmds(glyphCore, msg.glyphCmds);
        }
        self.postMessage({ type: 'rendered', seq: msg.seq | 0 });
      });
      break;
    }
    case 'renderGlyph': {
      if (!glyphCore || !msg.glyphCmds) return;
      safe(() => {
        _applyGlyphTilt(glyphCore, lastGlyphTilt);
        replayGlyphCmds(glyphCore, msg.glyphCmds);
      });
      break;
    }
    case 'capture': {
      // One-shot pixel-capture for the parity harness. Always posts a
      // response (success or error) so the caller's Promise settles.
      const captureId = msg.id;
      if (!core || !savedCanvas) {
        self.postMessage({ type: 'captured', id: captureId, error: 'no core or canvas' });
        break;
      }
      if (typeof savedCanvas.transferToImageBitmap !== 'function') {
        self.postMessage({ type: 'captured', id: captureId, error: 'transferToImageBitmap not supported' });
        break;
      }
      try {
        // flush() ensures pending GPU commands are submitted before capture.
        core.gl.flush();
        const bitmap = savedCanvas.transferToImageBitmap();
        self.postMessage({ type: 'captured', id: captureId, bitmap }, [bitmap]);
      } catch (err) {
        self.postMessage({
          type: 'captured',
          id: captureId,
          error: String(err && err.message || err),
        });
      }
      break;
    }
    case 'dispose': {
      if (core) core.dispose();
      core = null;
      glyphCore = null;
      savedCanvas = null;
      currentBitCount = 0;
      break;
    }
    default:
      // Unknown message — ignore. Not worth posting an error and
      // burning a round trip; protocol is deliberately small.
      break;
  }
};

// ---------------------------------------------------------------------------
// Glyph command replay
// ---------------------------------------------------------------------------

// _replayGlyphCmds is imported from glyphReplay.js (shared with BitGridGLWorker
// direct-mode path). See glyphReplay.js for the implementation.


function _applyGlyphTilt(gc, params) {
  if (!gc || typeof gc.setTilt !== 'function') return;
  const nextTilt = {
    tiltXDeg: Number(params?.tiltXDeg) || 0,
    tiltYDeg: Number(params?.tiltYDeg) || 0,
    perspective: Math.max(1, Number(params?.perspective) || 1500),
    enableGlTilt: params?.enableGlTilt ? 1 : 0,
  };
  lastGlyphTilt = nextTilt;
  gc.setTilt(nextTilt.tiltXDeg, nextTilt.tiltYDeg, nextTilt.perspective, nextTilt.enableGlTilt);
}

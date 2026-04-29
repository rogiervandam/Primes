/**
 * bitGridWorker — module worker that owns the WebGL2 context for the
 * worker-mode BitGridGL renderer (?renderer=gl-worker).
 *
 * See docs/AI_MAINTENANCE.md §8 item 6.
 *
 * Message protocol (main → worker):
 *   { type: 'init',        canvas: OffscreenCanvas }   // canvas transferred
 *   { type: 'setBitCount', bitCount: number }
 *   { type: 'resize',      cssW, cssH, dpr }
 *   { type: 'positions',   buf: Float32Array }         // buf transferred (one-way)
 *   { type: 'state',       buf: Uint8Array }           // buf transferred (one-way)
 *   { type: 'render',      params: { ... } }
 *   { type: 'dispose' }
 *
 * Worker → main:
 *   { type: 'ready' }
 *   { type: 'error', message: string }
 *
 * Buffers are NOT round-tripped back. The main-thread facade allocates
 * a fresh typed array per upload and transfers it; this avoids the
 * latency of an async ack and keeps the message flow strictly one-way.
 * GC cost is minor at this app's bit counts (≤ ~256 KB / frame for the
 * state buffer).
 */

import { BitGridGLCore } from './bitGridGLCore.js';

let core = null;

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
        core = new BitGridGLCore();
        const ok = core.init(msg.canvas);
        if (!ok) {
          self.postMessage({ type: 'error', message: 'webgl2 unavailable in worker' });
          core = null;
          return;
        }
        self.postMessage({ type: 'ready' });
      });
      break;
    }
    case 'setBitCount': {
      if (!core) return;
      safe(() => core.setBitCount(msg.bitCount | 0));
      break;
    }
    case 'resize': {
      if (!core) return;
      safe(() => core.resize(msg.cssW, msg.cssH, msg.dpr || 1));
      break;
    }
    case 'positions': {
      if (!core) return;
      safe(() => core.uploadPositionBuffer(msg.buf));
      break;
    }
    case 'state': {
      if (!core) return;
      safe(() => core.uploadStateBuffer(msg.buf));
      break;
    }
    case 'render': {
      if (!core) return;
      safe(() => core.render(msg.params));
      break;
    }
    case 'dispose': {
      if (core) core.dispose();
      core = null;
      break;
    }
    default:
      // Unknown message — ignore. Not worth posting an error and
      // burning a round trip; protocol is deliberately small.
      break;
  }
};

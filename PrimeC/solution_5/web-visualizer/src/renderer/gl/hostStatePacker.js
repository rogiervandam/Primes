/**
 * hostStatePacker — turn a `SieveRenderer`-shaped host object into the
 * two pre-packed typed arrays consumed by `BitGridGLCore`.
 *
 * Lives outside `BitGridGLCore` because the host object is React-side
 * (typed arrays + `Set` instances + a `bitIndexToCanvas` method that
 * closes over `SieveRenderer` state). Only the main thread can read it
 * — the worker variant calls these packers on the main thread, then
 * transfers the resulting buffers via `postMessage`.
 *
 * See `docs/AI_MAINTENANCE.md` §8 items 5 (parity harness) and 6
 * (worker dispatch).
 */

import { bitToNumber } from '../bitMath';

/**
 * Walk every bit through `host.bitIndexToCanvas` and write the
 * pan-independent (x, y) cell-centre into `buf`. Returns the
 * fingerprint that should be cached so the next call can early-exit.
 *
 * `slots` is the texture slot count (`texW * texH`); `buf` must be
 * `slots * 2` long.
 */
export function packPositions(host, buf, slots) {
  // Fast path: SieveRenderer exposes a batch-optimised packer that hoists
  // all invariant layout calculations out of the per-bit loop and avoids
  // per-bit object allocations and method calls entirely.
  if (typeof host.packPositionsDirect === 'function') {
    host.packPositionsDirect(buf, slots);
    return;
  }

  const bitCount = Math.min(host.bitCount || 0, slots);
  const panX = host.panX || 0;
  const panY = host.panY || 0;
  const canvasW = Math.max(1, host.canvasWidth || host.canvas?.width || 1);
  const canvasH = Math.max(1, host.canvasHeight || host.canvas?.height || 1);
  for (let i = 0; i < bitCount; i++) {
    const p = host.bitIndexToCanvas(i);
    if (p) {
      buf[i * 2]     = (p.x - panX) / canvasW;
      buf[i * 2 + 1] = (p.y - panY) / canvasH;
    } else {
      // Off-screen sentinel — vertex shader's bit-count guard handles
      // bounds, but stale entries should not produce stray quads.
      buf[i * 2]     = -1;
      buf[i * 2 + 1] = -1;
    }
  }
  // Pad unused slots so a shrunken bitCount doesn't paint stale quads.
  for (let i = bitCount; i < slots; i++) {
    buf[i * 2]     = -1;
    buf[i * 2 + 1] = -1;
  }
}

/**
 * Pack the host's classifier flags into one byte per bit. Layout matches
 * the shader; see `bitGridGLCore.js`.
 */
export function packState(host, buf, slots) {
  const bitState = host.bitState;
  if (!bitState) {
    for (let i = 0; i < slots; i++) buf[i] = 0;
    return;
  }
  const bitCount = Math.min(host.bitCount || 0, slots, bitState.length);

  // Base pass: set bit (flag 1).
  for (let i = 0; i < bitCount; i++) buf[i] = bitState[i] ? 1 : 0;

  const changed = host.changedBits;
  if (changed && typeof changed.forEach === 'function') {
    changed.forEach((bit) => {
      if (bit >= 0 && bit < bitCount) buf[bit] |= 2;
    });
  }
  const ghost = host.maskGhostBits;
  if (ghost && typeof ghost.forEach === 'function') {
    ghost.forEach((bit) => {
      if (bit >= 0 && bit < bitCount && (buf[bit] & 1)) buf[bit] |= 4;
    });
  }
  const repeated = host.repeatedChangedBits;
  if (repeated && typeof repeated.forEach === 'function') {
    repeated.forEach((bit) => {
      if (bit >= 0 && bit < bitCount) buf[bit] |= 8;
    });
  }
  const hits = host.targetHitCounts;
  if (hits && typeof hits.forEach === 'function') {
    hits.forEach((count, bit) => {
      if (count > 1 && bit >= 0 && bit < bitCount) buf[bit] |= 8;
    });
  }

  if (host.primeOverlay && host._primeBitFlags) {
    const pf = host._primeBitFlags;
    const pn = Math.min(bitCount, pf.length);
    for (let i = 0; i < pn; i++) if (pf[i]) { buf[i] |= 16; }
  }

  if (host.rangeOverlay) {
    const lo = Math.max(0, host.rangeOverlayStart | 0);
    const hi = Math.min(bitCount - 1, host.rangeOverlayEnd | 0);
    for (let i = lo; i <= hi; i++) buf[i] |= 32;
  }

  if (host.multiplesOverlay && host.multiplesOverlayPrime >= 2) {
    const k = host.multiplesOverlayPrime | 0;
    const sm = host.storageModel;
    const wheel = host.wheelDefinition;
    for (let i = 0; i < bitCount; i++) {
      const num = bitToNumber(i, sm, wheel);
      if (num >= 2 && num % k === 0) buf[i] |= 64;
    }
  }

  if (host.focusStart != null && host.focusStop != null) {
    const lo = Math.max(0, host.focusStart | 0);
    const hi = Math.min(bitCount - 1, host.focusStop | 0);
    for (let i = lo; i <= hi; i++) buf[i] |= 128;
  }

  for (let i = bitCount; i < slots; i++) buf[i] = 0;
}

/**
 * Pack per-bit animation state into a Float32Array consumed by
 * `BitGridGLCore.uploadAnimBuffer`.
 *
 * Each entry is 4 floats (RGBA32F texel):
 *   [i*4+0] xDelta    — CSS px shift applied to the cell centre (horizontal)
 *   [i*4+1] yDelta    — CSS px shift applied to the cell centre (vertical)
 *   [i*4+2] sizeScale — multiplier on u_cellSize (1.0 = full size)
 *   [i*4+3] (unused, always 0)
 *
 * Every entry is (0, 0, 1, 0) — a no-op that lets the GL shader render
 * normally without any position/size change.
 *
 * `buf` must be `slots * 4` floats long.
 */
export function packAnim(host, buf, slots) {
  for (let i = 0; i < slots; i++) {
    buf[i * 4]     = 0;
    buf[i * 4 + 1] = 0;
    buf[i * 4 + 2] = 1.0;
    buf[i * 4 + 3] = 0;
  }
}

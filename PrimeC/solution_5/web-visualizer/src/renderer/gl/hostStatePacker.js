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
  const bitCount = Math.min(host.bitCount || 0, slots);
  const panX = host.panX || 0;
  const panY = host.panY || 0;
  for (let i = 0; i < bitCount; i++) {
    const p = host.bitIndexToCanvas(i);
    if (p) {
      buf[i * 2]     = p.x - panX;
      buf[i * 2 + 1] = p.y - panY;
    } else {
      // Off-screen sentinel — vertex shader's bit-count guard handles
      // bounds, but stale entries should not produce stray quads.
      buf[i * 2]     = -1e6;
      buf[i * 2 + 1] = -1e6;
    }
  }
  // Pad unused slots so a shrunken bitCount doesn't paint stale quads.
  for (let i = bitCount; i < slots; i++) {
    buf[i * 2]     = -1e6;
    buf[i * 2 + 1] = -1e6;
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
    for (let i = 0; i < pn; i++) if (pf[i]) buf[i] |= 16;
  }

  if (host.rangeOverlay) {
    const lo = Math.max(0, host.rangeOverlayStart | 0);
    const hi = Math.min(bitCount - 1, host.rangeOverlayEnd | 0);
    for (let i = lo; i <= hi; i++) buf[i] |= 32;
  }

  if (host.multiplesOverlay && host.multiplesOverlayPrime >= 2) {
    const k = host.multiplesOverlayPrime | 0;
    const sm = host.storageModel;
    for (let i = 0; i < bitCount; i++) {
      const num = bitToNumber(i, sm);
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
 * Pack per-bit animation state for the lowered-3D / rise-and-settle modes
 * into a Float32Array consumed by `BitGridGLCore.uploadAnimBuffer`.
 *
 * Each entry is 4 floats (RGBA32F texel):
 *   [i*4+0] xDelta    — CSS px shift applied to the cell centre (horizontal)
 *   [i*4+1] yDelta    — CSS px shift applied to the cell centre (vertical)
 *   [i*4+2] sizeScale — multiplier on u_cellSize (1.0 = full size, <1 = sunk)
 *   [i*4+3] (unused, always 0)
 *
 * When `host.loweredSetBits` is false every entry is (0, 0, 1, 0) — a no-op
 * that lets the GL shader render normally without any position/size change.
 *
 * When loweredSetBits is true:
 *   - Set bits (lowered) receive the sinkDrop/sinkShiftX/sinkScale from
 *     `_computeBitDrawState`, including the rise-and-settle animation for
 *     bits that recently changed (driven by `host.changedBitRiseAt`).
 *   - Cleared bits (raised 3D box top face) receive (0, 0, 1) so GL draws
 *     the top face at the original full-size position; Canvas2D still
 *     draws the side-face polygons on top.
 *
 * `buf` must be `slots * 4` floats long.
 */
export function packAnim(host, buf, slots) {
  const bitCount = Math.min(host.bitCount || 0, slots);

  if (!host.loweredSetBits) {
    // Normal mode: no per-bit animation; fill with identity (0, 0, 1, 0).
    for (let i = 0; i < slots; i++) {
      buf[i * 4]     = 0;
      buf[i * 4 + 1] = 0;
      buf[i * 4 + 2] = 1.0;
      buf[i * 4 + 3] = 0;
    }
    return;
  }

  // Lowered-3D mode: replicate the geometry math from _computeBitDrawState.
  const px = (host.pixelSize || 1) * (host.zoom || 1);
  const depthStrength  = Math.max(0, Math.min(1.0, host.loweredDepthStrength ?? 0.8));
  const depthAngleRad  = (Math.max(0, Math.min(90, host.loweredDepthAngle ?? 38)) * Math.PI) / 180;
  const depthScale     = host.loweredSetBits3D ? 1.18 : 1;
  const baseDrop       = px * Math.sin(depthAngleRad) * 1.05 * depthStrength * depthScale;
  const baseShiftX     = px * Math.cos(depthAngleRad) * 0.55 * depthStrength * depthScale;
  const defaultSink    = host.loweredSetBits3D ? 0.56 : 0.68;

  const bitState        = host.bitState;
  const changedBits     = host.changedBits;
  const changedBitRiseAt = host.changedBitRiseAt;
  const now = performance.now();

  for (let i = 0; i < bitCount; i++) {
    const isSetBit = bitState ? !!bitState[i] : false;

    if (!isSetBit) {
      // Raised (cleared) bit: top face at original position, side faces drawn by Canvas2D.
      buf[i * 4]     = 0;
      buf[i * 4 + 1] = 0;
      buf[i * 4 + 2] = 1.0;
      buf[i * 4 + 3] = 0;
      continue;
    }

    // Lowered (set) bit: compute sinkDrop / sinkShiftX / sinkScale,
    // including the rise-and-settle animation for recently changed bits.
    let sinkDrop   = baseDrop;
    let sinkShiftX = baseShiftX;
    let sk         = defaultSink;

    const isChangedBit = changedBits && changedBits.has(i);
    if (isChangedBit && changedBitRiseAt) {
      const startedAt = changedBitRiseAt.get(i) || now;
      const elapsed   = now - startedAt;
      const progress  = Math.max(0, Math.min(1, elapsed / 700));
      const peakLift  = px * 0.42 * depthStrength;
      let riseLift = 0;
      if (progress < 0.32) {
        riseLift   = peakLift * (progress / 0.32);
        sinkDrop   = 0;
        sinkShiftX = 0;
      } else if (progress < 0.56) {
        riseLift   = peakLift * (1 - (progress - 0.32) / 0.24);
        sinkDrop   = 0;
        sinkShiftX = 0;
      } else {
        const settleT = (progress - 0.56) / 0.44;
        sinkDrop   = baseDrop   * settleT;
        sinkShiftX = baseShiftX * settleT;
      }
      sk        = 1 - (1 - defaultSink) * Math.max(0, Math.min(1, (progress - 0.56) / 0.44));
      sinkDrop -= riseLift;
    }

    buf[i * 4]     = sinkShiftX;
    buf[i * 4 + 1] = sinkDrop;
    buf[i * 4 + 2] = sk;
    buf[i * 4 + 3] = 0;
  }

  for (let i = bitCount; i < slots; i++) {
    buf[i * 4]     = 0;
    buf[i * 4 + 1] = 0;
    buf[i * 4 + 2] = 1.0;
    buf[i * 4 + 3] = 0;
  }
}

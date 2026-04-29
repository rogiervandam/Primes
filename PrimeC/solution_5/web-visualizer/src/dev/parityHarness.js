/**
 * BitGridGLWorker parity harness — see docs/AI_MAINTENANCE.md §8 item 5.
 *
 * Pins the GL renderer's contract: given identical positions + state +
 * colours, BitGridGLWorker output must match a small Canvas2D reference that
 * does the same uniform-grid `fillRect`-per-bit + overlay composite +
 * border strips.
 *
 * This harness deliberately does NOT drive the full `SieveRenderer` —
 * GL only covers the base bit pass + four cell-fill overlays + borders, and
 * most of `SieveRenderer.render()` is features that intentionally stay
 * Canvas2D-on-top (dots, labels, lowered-3D, minimap, …). Testing those
 * would be a parity test against features GL has never claimed to implement.
 * The reference here mirrors only what GL actually does.
 *
 * Invoked from `parity.html`. Dev-only; not bundled into the app.
 */

import { BitGridGLWorker, isWorkerGLSupported } from '../renderer/gl/BitGridGLWorker.js';

// Match the Canvas2D source-of-truth tints from
// `_drawBitFocusRange` / `_drawBitPrimeOverlay` /
// `_drawBitRangeOverlay` / `_drawBitMultiplesOverlay`.
const TINTS = {
  focus: { r:  96, g: 165, b: 250, a: 0.16 },
  prime: { r: 251, g: 191, b:  36, a: 0.20 },
  range: { r:  34, g: 211, b: 238, a: 0.22 },
  mult:  { r: 167, g: 139, b: 250, a: 0.30 },
};

const BG       = [14, 17, 22];   // matches body background so empty area diffs are zero
const SET      = [96, 165, 250];
const CLEARED  = [40, 50, 70];
const CHANGED  = [248, 113, 113];
const REPEATED = [245, 158, 11];

const els = {
  bits:    document.getElementById('bits'),
  cell:    document.getElementById('cell'),
  dpr:     document.getElementById('dpr'),
  overlays:document.getElementById('overlays'),
  run:     document.getElementById('run'),
  ref:     document.getElementById('ref'),
  gl:      document.getElementById('gl'),
  diff:    document.getElementById('diff'),
  out:     document.getElementById('out'),
  glLabel: document.getElementById('gl-label'),
};

/**
 * Build the synthetic state. Deterministic so reruns are diffable.
 *
 * Layout: square-ish grid, columns = ceil(sqrt(bitCount)), each cell is
 * `cell` CSS px, with 1-px gap. We bake the centre coordinate the same
 * way `bitIndexToCanvas` does (top-left + px/2).
 */
function buildScene(bitCount, cellSize) {
  const cols = Math.ceil(Math.sqrt(bitCount));
  const rows = Math.ceil(bitCount / cols);
  const gap = 1;
  const stride = cellSize + gap;
  const cssW = cols * stride;
  const cssH = rows * stride;

  // Per-bit (col, row) → centre in CSS px.
  const positions = new Float32Array(bitCount * 2);
  for (let i = 0; i < bitCount; i++) {
    const c = i % cols;
    const r = (i / cols) | 0;
    positions[i * 2]     = c * stride + cellSize / 2;
    positions[i * 2 + 1] = r * stride + cellSize / 2;
  }

  // State + flag classes. Pattern is arbitrary but deterministic.
  const bitState = new Uint8Array(bitCount);
  const changedBits = new Set();
  const ghostBits = new Set();
  const repeatedBits = new Set();
  const primeFlags = new Uint8Array(bitCount);
  const focusStart = Math.floor(bitCount * 0.10);
  const focusStop  = Math.floor(bitCount * 0.20);
  const rangeStart = Math.floor(bitCount * 0.55);
  const rangeStop  = Math.floor(bitCount * 0.65);

  for (let i = 0; i < bitCount; i++) {
    if (i % 3 === 0) bitState[i] = 1;                // ~1/3 set
    if (i % 17 === 5) changedBits.add(i);
    if (i % 31 === 0 && bitState[i]) ghostBits.add(i);
    if (i % 23 === 11) repeatedBits.add(i);
    if (isPrimeSmall(i + 2)) primeFlags[i] = 1;       // small primes for visual sanity
  }

  return {
    cols, rows, cellSize, gap, cssW, cssH,
    positions, bitState, changedBits, ghostBits, repeatedBits,
    primeFlags, focusStart, focusStop, rangeStart, rangeStop,
    multiplesPrime: 7,                                // mark every 7th multiple
  };
}

function isPrimeSmall(n) {
  if (n < 2) return 0;
  if (n < 4) return 1;
  if (n % 2 === 0) return 0;
  for (let f = 3; f * f <= n; f += 2) if (n % f === 0) return 0;
  return 1;
}

/** Composite alpha over base, returning [r,g,b]. */
function over(base, tint) {
  return [
    Math.round(base[0] * (1 - tint.a) + tint.r * tint.a),
    Math.round(base[1] * (1 - tint.a) + tint.g * tint.a),
    Math.round(base[2] * (1 - tint.a) + tint.b * tint.a),
  ];
}

function classify(scene, i, withOverlays) {
  const isSet      = !!scene.bitState[i];
  const isChanged  = scene.changedBits.has(i);
  const isGhost    = scene.ghostBits.has(i) && isSet;
  const isRepeated = scene.repeatedBits.has(i);

  let base;
  if (isGhost) base = CLEARED;
  else if (isRepeated && isChanged) base = REPEATED;
  else if (isChanged) base = CHANGED;
  else if (isSet) base = SET;
  else base = CLEARED;

  // Bg-compose: shader does `mix(bg, color, alpha)` with alpha=1 here
  // (we render with baseAlpha=1 in the GL call, see runGL).
  let composed = base;

  if (withOverlays) {
    const isFocus = i >= scene.focusStart && i <= scene.focusStop;
    const isPrime = !!scene.primeFlags[i];
    const isRange = i >= scene.rangeStart && i <= scene.rangeStop;
    // Multiples overlay: mark every k-th bit (k = scene.multiplesPrime).
    // We use bit index directly for parity with how the GL host walks
    // `bitToNumber(i, sm)` — for this synthetic test, treat index as
    // the number, so "multiples of k" == "i % k == 0 && i >= 2".
    const num = i;
    const isMult = num >= 2 && num % scene.multiplesPrime === 0;

    if (isFocus) composed = over(composed, TINTS.focus);
    if (isPrime) composed = over(composed, TINTS.prime);
    if (isRange) composed = over(composed, TINTS.range);
    if (isMult)  composed = over(composed, TINTS.mult);
  }
  return composed;
}

/** Canvas2D reference: fillRect per bit, exact same colour algebra as the shader. */
function renderRef(scene, ctx, dpr, withOverlays) {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`;
  ctx.fillRect(0, 0, scene.cssW, scene.cssH);
  for (let i = 0; i < scene.bitState.length; i++) {
    const cx = scene.positions[i * 2];
    const cy = scene.positions[i * 2 + 1];
    const x = Math.round(cx - scene.cellSize / 2);
    const y = Math.round(cy - scene.cellSize / 2);
    const w = Math.round(cx + scene.cellSize / 2) - x;
    const h = Math.round(cy + scene.cellSize / 2) - y;
    const c = classify(scene, i, withOverlays);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(x, y, w, h);
  }

  // Border pass — mirrors the GL shader's UV-based border rendering.
  // Priority matches shader: prime first, range second, multiples third
  // (last writer wins). Only drawn when cellSize >= 4, same as GL.
  // Multiples are disabled here (scene.multiplesPrime === -1 via
  // refWithoutMultiples) to match the GL host's multiplesOverlay=false.
  if (withOverlays && scene.cellSize >= 4) {
    for (let i = 0; i < scene.bitState.length; i++) {
      const cx = scene.positions[i * 2];
      const cy = scene.positions[i * 2 + 1];
      const x = Math.round(cx - scene.cellSize / 2);
      const y = Math.round(cy - scene.cellSize / 2);
      const w = Math.round(cx + scene.cellSize / 2) - x;
      const h = Math.round(cy + scene.cellSize / 2) - y;

      const isPrime = !!scene.primeFlags[i];
      const isRange = i >= scene.rangeStart && i <= scene.rangeStop;
      const isMult  = scene.multiplesPrime >= 2 && i >= 2 && i % scene.multiplesPrime === 0;

      if (isPrime) {
        const bw = Math.max(0.35, Math.min(1.3, scene.cellSize * 0.075));
        _fillBorderStrips(ctx, x, y, w, h, bw, `rgba(251,191,36,0.68)`);
      }
      if (isRange) {
        const bw = Math.max(0.35, Math.min(1.3, scene.cellSize * 0.07));
        _fillBorderStrips(ctx, x, y, w, h, bw, `rgba(34,211,238,0.60)`);
      }
      if (isMult) {
        const bw = Math.max(1.0, Math.min(2.5, scene.cellSize * 0.14));
        _fillBorderStrips(ctx, x, y, w, h, bw, `rgba(167,139,250,0.88)`);
      }
    }
  }
  ctx.restore();
}

/**
 * Draw a hollow border inside `(x, y, w, h)` as four fillRect strips.
 * Corners are covered by the top/bottom strips; left/right strips fill
 * only the middle rows to avoid double-compositing corners — this
 * exactly mirrors the GL shader's `min(min(uv.x,1-uv.x),min(uv.y,1-uv.y))`
 * edge detection where each fragment is coloured at most once.
 */
function _fillBorderStrips(ctx, x, y, w, h, bw, color) {
  ctx.fillStyle = color;
  // Top
  ctx.fillRect(x, y, w, bw);
  // Bottom
  ctx.fillRect(x, y + h - bw, w, bw);
  // Left (middle — no corners)
  ctx.fillRect(x, y + bw, bw, h - 2 * bw);
  // Right (middle — no corners)
  ctx.fillRect(x + w - bw, y + bw, bw, h - 2 * bw);
}

/** Build the fake host object consumed by uploadPositions / uploadState. */
function buildFakeHost(scene, withOverlays) {
  const host = {
    panX: 0, panY: 0,
    bitIndexToCanvas(i) {
      return { x: scene.positions[i * 2], y: scene.positions[i * 2 + 1] };
    },
    bitState: scene.bitState,
    changedBits: scene.changedBits,
    maskGhostBits: scene.ghostBits,
    repeatedChangedBits: scene.repeatedBits,
    targetHitCounts: null,
    primeOverlay: withOverlays,
    _primeBitFlags: scene.primeFlags,
    rangeOverlay: withOverlays,
    rangeOverlayStart: scene.rangeStart,
    rangeOverlayEnd: scene.rangeStop,
    // Multiples overlay disabled — see note in runGL().
    multiplesOverlay: false,
    multiplesOverlayPrime: scene.multiplesPrime,
    storageModel: 'half',
    focusStart: withOverlays ? scene.focusStart : null,
    focusStop:  withOverlays ? scene.focusStop  : null,
  };
  return host;
}

/** Disable multiples in the reference scene so it matches the GL host's
 *  multiplesOverlay=false — bitToNumber(i, sm) ≠ i so a fair comparison
 *  would require a matching storageModel identity, which doesn't exist.
 *  Focus / prime / range still exercise the same shader composite path.
 */
function refWithoutMultiples(scene) {
  return { ...scene, multiplesPrime: -1 };
}

/** Drive BitGridGLWorker and capture a frame as an ImageBitmap.
 *
 * Uses a detached HTMLCanvasElement (not in the DOM) so `els.gl` can
 * stay a plain 2D canvas for display. After the worker renders, the
 * bitmap is drawn onto `displayCanvas` and returned for pixel comparison.
 *
 * @param {Scene} scene
 * @param {HTMLCanvasElement} displayCanvas  Where to draw the result for visual inspection.
 * @param {number} dpr
 * @param {boolean} withOverlays
 * @returns {Promise<{ok:boolean, error?:string, glWorker?:BitGridGLWorker}>}
 */
async function runGLWorker(scene, displayCanvas, dpr, withOverlays) {
  if (!isWorkerGLSupported()) {
    return { ok: false, error: 'OffscreenCanvas / worker not supported in this browser' };
  }

  // The worker gets a hidden HTMLCanvasElement it will control via
  // transferControlToOffscreen. We do NOT use displayCanvas for this
  // so displayCanvas can keep its 2D context for drawing the result.
  const workerCanvas = document.createElement('canvas');
  // Initial size; the worker will resize via core.resize() on the OffscreenCanvas.
  workerCanvas.width  = Math.round(scene.cssW * dpr);
  workerCanvas.height = Math.round(scene.cssH * dpr);

  const glWorker = new BitGridGLWorker();
  if (!glWorker.attach(workerCanvas)) {
    return { ok: false, error: 'BitGridGLWorker.attach() failed' };
  }

  glWorker.resizeForBitCount(scene.bitState.length);
  // Pass explicit dpr so the backing-store sizing matches the reference.
  glWorker.resize(scene.cssW, scene.cssH, dpr);

  const host = buildFakeHost(scene, withOverlays);
  glWorker.uploadPositions(host, 'harness');
  glWorker.uploadState(host);
  glWorker.render({
    panX: 0, panY: 0,
    cellSize: scene.cellSize,
    bgColor: BG,
    setColor: SET,
    clearedColor: CLEARED,
    changedColor: CHANGED,
    repeatedColor: REPEATED,
    baseAlpha: 1,
  });

  // Round-trip to worker: waits for all preceding messages to be processed,
  // then captures the rendered frame as a transferable ImageBitmap.
  const bitmap = await new Promise((resolve, reject) => {
    glWorker.capture((bm, err) => {
      if (err) reject(new Error('capture failed: ' + err));
      else resolve(bm);
    });
  });

  // Draw bitmap into displayCanvas (2D context) for visual inspection and
  // pixel comparison. displayCanvas was never transferred so getContext('2d') works.
  displayCanvas.width  = bitmap.width;
  displayCanvas.height = bitmap.height;
  displayCanvas.style.width  = `${scene.cssW}px`;
  displayCanvas.style.height = `${scene.cssH}px`;
  displayCanvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();

  return { ok: true, glWorker };
}

function readPixels(canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  }
  // GL canvas — copy through a scratch 2D canvas.
  const scratch = document.createElement('canvas');
  scratch.width = canvas.width;
  scratch.height = canvas.height;
  scratch.getContext('2d').drawImage(canvas, 0, 0);
  return scratch.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
}

function diff(refPx, glPx, diffCanvas) {
  const n = refPx.length / 4;
  const d = diffCanvas.getContext('2d').createImageData(diffCanvas.width, diffCanvas.height);
  let maxDelta = 0;
  let mismatches = 0;          // strict (any channel != 0 after rounding)
  let bigMismatches = 0;       // > 8/255 on any channel
  let sumDelta = 0;
  for (let i = 0; i < n; i++) {
    const dr = Math.abs(refPx[i*4]   - glPx[i*4]);
    const dg = Math.abs(refPx[i*4+1] - glPx[i*4+1]);
    const db = Math.abs(refPx[i*4+2] - glPx[i*4+2]);
    const m = Math.max(dr, dg, db);
    if (m > 0) mismatches++;
    if (m > 8) bigMismatches++;
    if (m > maxDelta) maxDelta = m;
    sumDelta += m;
    d.data[i*4]   = Math.min(255, dr * 8);
    d.data[i*4+1] = Math.min(255, dg * 8);
    d.data[i*4+2] = Math.min(255, db * 8);
    d.data[i*4+3] = 255;
  }
  diffCanvas.getContext('2d').putImageData(d, 0, 0);
  return { n, mismatches, bigMismatches, maxDelta, meanDelta: sumDelta / n };
}

async function run() {
  const bitCount = Math.max(16, Math.min(262144, Number(els.bits.value) | 0));
  const cellSize = Math.max(2, Math.min(64, Number(els.cell.value) | 0));
  const dpr = Math.max(1, Math.min(3, Number(els.dpr.value) || 1));
  const withOverlays = els.overlays.checked;

  const scene = buildScene(bitCount, cellSize);

  // Sync reference + diff canvas sizes; the GL panel is sized inside runGLWorker.
  for (const c of [els.ref, els.diff]) {
    c.width = Math.round(scene.cssW * dpr);
    c.height = Math.round(scene.cssH * dpr);
    c.style.width  = `${scene.cssW}px`;
    c.style.height = `${scene.cssH}px`;
  }

  // Reference: multiples-overlay disabled so we compare apples-to-apples
  // with the GL host (storageModel-mapped multiples don't equal `i % k`).
  renderRef(refWithoutMultiples(scene), els.ref.getContext('2d'), dpr, withOverlays);

  els.out.textContent = 'running worker…';
  let glRes;
  try {
    glRes = await runGLWorker(scene, els.gl, dpr, withOverlays);
  } catch (err) {
    els.out.innerHTML = `<span class="err">Worker error: ${err.message}</span>`;
    return;
  }

  if (!glRes.ok) {
    els.out.innerHTML = `<span class="err">GL init failed: ${glRes.error}</span>`;
    return;
  }

  const refPx = readPixels(els.ref);
  const glPx  = readPixels(els.gl);
  const r = diff(refPx, glPx, els.diff);

  const pct = (r.mismatches / r.n * 100).toFixed(2);
  const bigPct = (r.bigMismatches / r.n * 100).toFixed(2);
  const verdict =
    r.maxDelta === 0      ? '<span class="ok">✓ exact match</span>' :
    r.bigMismatches === 0 ? '<span class="ok">✓ within rounding tolerance (≤8/255)</span>' :
    r.bigMismatches < r.n * 0.001 ? '<span class="warn">⚠ minor edge artefacts</span>' :
                            '<span class="err">✗ divergence</span>';

  els.out.innerHTML = [
    `renderer       : BitGridGLWorker (worker path)`,
    `bits           : ${bitCount}`,
    `grid           : ${scene.cols} × ${scene.rows} (cell ${cellSize}px, dpr ${dpr})`,
    `pixels         : ${r.n.toLocaleString()}`,
    `max Δ (channel): ${r.maxDelta} / 255`,
    `mean Δ         : ${r.meanDelta.toFixed(3)} / 255`,
    `mismatches     : ${r.mismatches.toLocaleString()} (${pct}%)`,
    `> 8/255        : ${r.bigMismatches.toLocaleString()} (${bigPct}%)`,
    ``,
    verdict,
    ``,
    `note: multiples overlay omitted (host uses bitToNumber(i, sm),`,
    `      reference uses i; tested via range/focus/prime which exercise`,
    `      the same shader composite path + border rendering).`,
  ].join('\n');

  if (glRes.glWorker) glRes.glWorker.dispose();
}

const doRun = () => run().catch(err => { els.out.innerHTML = `<span class="err">${err.message}</span>`; });
els.run.addEventListener('click', doRun);
doRun();

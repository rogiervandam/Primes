/**
 * Canvas-based renderer for sieve bitstorage visualization.
 *
 * Supports configurable layouts, adjustable spacing, light/dark themes,
 * operation-colored highlighting, vector grouping, and vector labels.
 */

// Theme palettes with per-operation changed-bit colors
export const THEMES = {
  dark: {
    BIT_ZERO:     [232, 232, 232],
    BIT_ONE:      [85,  85,  85],
    BIT_CHANGED:  [46,  204, 113],
    BACKGROUND:   [26,  26,  26],
    BYTE_BORDER:  [50,  50,  50],
    U64_BORDER:   [70,  70,  70],
    CACHE_BORDER: [100, 100, 100],
    LABEL_COLOR:  'rgba(200,200,200,0.7)',
    OPERATION_COLORS: {
      markFactors:     [72,  201, 176],
      extend:          [68,  136, 255],  // blue
      continuePattern: [68,  220, 136],  // green
      setBitsTrue:     [46,  204, 113],
      applyMask:       [39,  174, 96],
    },
  },
  light: {
    BIT_ZERO:     [240, 240, 240],
    BIT_ONE:      [60,  60,  60],
    BIT_CHANGED:  [46,  160, 67],
    BACKGROUND:   [255, 255, 255],
    BYTE_BORDER:  [200, 200, 200],
    U64_BORDER:   [170, 170, 170],
    CACHE_BORDER: [130, 130, 130],
    LABEL_COLOR:  'rgba(60,60,60,0.7)',
    OPERATION_COLORS: {
      markFactors:     [34,  139, 34],
      extend:          [30,  90,  200],
      continuePattern: [20,  160, 80],
      setBitsTrue:     [46,  160, 67],
      applyMask:       [27,  120, 54],
    },
  },
};

// Color presets for set/cleared/unchanged bits
export const COLOR_PRESETS = {
  default: {
    label: 'Default',
    setBit:       [76, 175, 80],   // green
    clearedBit:   [244, 67, 54],   // red
    unchangedBit: [158, 158, 158], // gray
  },
  highContrast: {
    label: 'High Contrast',
    setBit:       [0, 255, 0],     // bright green
    clearedBit:   [255, 0, 0],     // bright red
    unchangedBit: [0, 0, 0],       // black
  },
  pastel: {
    label: 'Pastel',
    setBit:       [165, 214, 167], // pastel green
    clearedBit:   [239, 154, 154], // pastel red
    unchangedBit: [224, 224, 224], // pastel gray
  },
  darkMode: {
    label: 'Dark Mode',
    setBit:       [129, 199, 132], // light green
    clearedBit:   [229, 115, 115], // light red
    unchangedBit: [66, 66, 66],    // dark gray
  },
};

// Bit-in-byte layout modes
export const BIT_LAYOUTS = {
  '8x1': { label: '8 bits in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bits in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bits in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3Ã—3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
};

// Byte-in-uint64 layout modes
export const BYTE_LAYOUTS = {
  '8x1': { label: '8 bytes in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bytes in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bytes in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3Ã—3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
};

// Vector grouping options
export const VECTOR_GROUPS = {
  1:  { label: 'uint64 (no grouping)', u64sPerGroup: 1 },
  2:  { label: 'uint64v2 (SSE/128-bit)', u64sPerGroup: 2 },
  4:  { label: 'uint64v4 (AVX2/256-bit)', u64sPerGroup: 4 },
  8:  { label: 'uint64v8 (AVX-512/512-bit)', u64sPerGroup: 8 },
};

// Cacheline size presets
export const CACHELINE_SIZES = {
  32:  { label: '32 bytes (256 bits)' },
  64:  { label: '64 bytes (512 bits)' },
  128: { label: '128 bytes (1024 bits)' },
};

// Processor cache presets with L1/L2 sizes and cacheline size
export const CACHE_PRESETS = {
  custom:              { label: 'Custom',                         l1: 0,          l2: 0,            cachelineSize: 64 },
  'intel-alder-lake':  { label: 'Intel Alder Lake (12th Gen)',    l1: 48*1024,    l2: 1280*1024,    cachelineSize: 64 },
  'intel-raptor-lake': { label: 'Intel Raptor Lake (13/14th Gen)',l1: 48*1024,    l2: 2048*1024,    cachelineSize: 64 },
  'amd-zen3':          { label: 'AMD Zen 3 (Ryzen 5000)',        l1: 32*1024,    l2: 512*1024,     cachelineSize: 64 },
  'amd-zen4':          { label: 'AMD Zen 4 (Ryzen 7000)',        l1: 32*1024,    l2: 1024*1024,    cachelineSize: 64 },
  'amd-zen5':          { label: 'AMD Zen 5 (Ryzen 9000)',        l1: 32*1024,    l2: 1024*1024,    cachelineSize: 64 },
  'apple-m1':          { label: 'Apple M1',                      l1: 192*1024,   l2: 12*1024*1024, cachelineSize: 128 },
  'apple-m2':          { label: 'Apple M2',                      l1: 192*1024,   l2: 16*1024*1024, cachelineSize: 128 },
  'apple-m3':          { label: 'Apple M3',                      l1: 192*1024,   l2: 16*1024*1024, cachelineSize: 128 },
  'apple-m4':          { label: 'Apple M4',                      l1: 192*1024,   l2: 16*1024*1024, cachelineSize: 128 },
  'arm-cortex-a78':    { label: 'ARM Cortex-A78',                l1: 64*1024,    l2: 512*1024,     cachelineSize: 64 },
  'snapdragon-8gen3':  { label: 'Snapdragon 8 Gen 3',            l1: 64*1024,    l2: 2048*1024,    cachelineSize: 64 },
};

// Map a linear index (0-7) to a position in a 3x3 grid skipping center (4)
const GRID3X3_MAP = [0, 1, 2, 3, /*skip 4*/ 5, 6, 7, 8];

// Storage model definitions
export const STORAGE_MODELS = {
  half:  { label: 'Half (odd only)',   description: 'bit i â†’ 2i+1' },
  full:  { label: 'Full (all)',        description: 'bit i â†’ i' },
  wheel: { label: 'Wheel 8-of-30',    description: 'bit i â†’ wheel30 residue' },
};

const WHEEL30_RESIDUES = [1, 7, 11, 13, 17, 19, 23, 29];

/** Convert a bit index to a number for the given storage model */
export function bitToNumber(bitIdx, model) {
  switch (model) {
    case 'full':  return bitIdx;
    case 'wheel': return Math.floor(bitIdx / 8) * 30 + WHEEL30_RESIDUES[bitIdx % 8];
    case 'half':
    default:      return bitIdx * 2 + 1;
  }
}

/** Convert a number to a bit index, or -1 if not representable */
export function numberToBit(num, model) {
  switch (model) {
    case 'full':  return num;
    case 'wheel': {
      const group = Math.floor(num / 30);
      const rem = num % 30;
      const idx = WHEEL30_RESIDUES.indexOf(rem);
      return idx >= 0 ? group * 8 + idx : -1;
    }
    case 'half':
    default:
      return (num < 1 || num % 2 === 0) ? -1 : (num - 1) / 2;
  }
}

export class SieveRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.bitCount = 0;
    this.sieveSize = 0;
    this.bitState = null;
    this.changedBits = null;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    // Layout config
    this.pixelSize = 2;
    this.bitLayout = '4x2';
    this.byteLayout = '4x2';
    this.bitSpacingH = 1;
    this.bitSpacingV = 1;
    this.byteSpacingH = 2;
    this.byteSpacingV = 2;
    this.u64SpacingH = 4;
    this.u64SpacingV = 4;
    this.theme = 'dark';

    // Operation-based coloring
    this.currentOperation = null;

    // Color preset: null = use theme defaults, or a preset key from COLOR_PRESETS
    this.colorPreset = null;
    // Custom colors override preset (each is [r,g,b] or null)
    this.customSetBit = null;
    this.customClearedBit = null;
    this.customUnchangedBit = null;

    // Vector grouping
    this.vectorGroup = 1;  // 1, 2, 4, or 8 uint64s per vector
    this.vectorLabel = 'uint64';

    // Label toggles
    this.showBitLabels = false;
    this.showByteLabels = false;
    this.showVectorLabels = true;

    // Optional grouping outlines
    this.outlineEnabled = false;
    this.outlineTarget = 'byte'; // 'byte' | 'vector' | 'cacheline'
    this.outlineStyle = 'thin'; // 'thin' | 'thick' | 'dashed' | 'dotted'
    this.outlineColor = '#5ccf8d';
    this.outlineRounded = false;
    this.outlineHoverActive = false;
    this.outlineHoverPulse = 0;

    // Storage model for bit-to-number mapping
    this.storageModel = 'half';

    // Canvas width for wrapping (set by resize)
    this.canvasWidth = 0;

    // Cacheline size in bytes (default 64)
    this.cachelineSize = 64;

    // Heat map: tracks recency of access per bit
    this.heatMapEnabled = false;
    this.lastAccessStep = null;   // Int32Array, per-bit last step index (-1 = never)
    this.heatMapCurrentStep = 0;

    // Frozen wrapping: once set, zoom doesn't change layout
    this._frozenClPerVRow = 0;
  }

  get colors() { return THEMES[this.theme] || THEMES.dark; }

  // Get effective bit colors (preset > custom > theme default)
  _bitColors() {
    const C = this.colors;
    const preset = this.colorPreset && COLOR_PRESETS[this.colorPreset];
    return {
      set:       this.customSetBit || (preset ? preset.setBit : C.BIT_ONE),
      cleared:   this.customClearedBit || (preset ? preset.clearedBit : C.BIT_ZERO),
      unchanged: this.customUnchangedBit || (preset ? preset.unchangedBit : C.BIT_ZERO),
    };
  }

  _opColor() {
    const C = this.colors;
    if (this.currentOperation && C.OPERATION_COLORS[this.currentOperation]) {
      return C.OPERATION_COLORS[this.currentOperation];
    }
    return C.BIT_CHANGED;
  }

  _outlineConfig() {
    return { lineWidth: 2.2, dash: [7, 5], radius: 7 };
  }

  _outlinePadding() {
    // Keep a visible gap between pixels and the outline border.
    return 3;
  }

  _outlineTopExtra(kind) {
    if (kind === 'byte' && this.showByteLabels) {
      return Math.max(8, Math.min(14, 2 + 2 * this.zoom));
    }
    if (kind === 'vector' && this.showVectorLabels) {
      return Math.max(10, Math.min(18, 3 + 2 * this.zoom));
    }
    return 0;
  }

  _hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return [92, 207, 141];
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return [92, 207, 141];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  _mixRgb(a, b, t) {
    return [
      Math.round(a[0] * (1 - t) + b[0] * t),
      Math.round(a[1] * (1 - t) + b[1] * t),
      Math.round(a[2] * (1 - t) + b[2] * t),
    ];
  }

  _drawOutlineRect(ctx, x, y, w, h) {
    const cfg = this._outlineConfig();
    let lineWidth = cfg.lineWidth;
    const dash = cfg.dash;
    const radius = cfg.radius;
    let strokeRgb = this._hexToRgb(this.outlineColor || '#5ccf8d');
    let inflate = 0;

    if (this.outlineHoverActive) {
      const p = Math.max(0, Math.min(1, this.outlineHoverPulse || 0));
      lineWidth += 0.8 + 1.0 * p;
      inflate = 0.8 + 1.6 * p;
      strokeRgb = this._mixRgb(strokeRgb, [255, 255, 255], 0.22 + 0.28 * p);
    }

    x -= inflate;
    y -= inflate;
    w += inflate * 2;
    h += inflate * 2;

    ctx.save();
    ctx.strokeStyle = `rgb(${strokeRgb[0]},${strokeRgb[1]},${strokeRgb[2]})`;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    if (radius > 0) {
      const rr = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    }
    ctx.restore();
  }

  _isNearRectEdge(px, py, x, y, w, h, tol = 4) {
    const insideX = px >= x - tol && px <= x + w + tol;
    const insideY = py >= y - tol && py <= y + h + tol;
    if (!insideX || !insideY) return false;
    const dl = Math.abs(px - x);
    const dr = Math.abs(px - (x + w));
    const dt = Math.abs(py - y);
    const db = Math.abs(py - (y + h));
    return Math.min(dl, dr, dt, db) <= tol;
  }

  _pointInRect(px, py, x, y, w, h, tol = 0) {
    return px >= x - tol && px <= x + w + tol && py >= y - tol && py <= y + h + tol;
  }

  attach(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
  }

  init(bitCount, sieveSize) {
    this.bitCount = bitCount;
    this.sieveSize = sieveSize;
    this.bitState = new Uint8Array(bitCount);
    this.changedBits = new Set();
    this.lastAccessStep = new Int32Array(bitCount).fill(-1);
    this._frozenClPerVRow = 0;
  }

  get bitsPerCacheLine() {
    return this.cachelineSize * 8;
  }

  setState(bitState, changedBits) {
    this.bitState = bitState;
    this.changedBits = changedBits;
  }

  /** Update heat map tracking: mark changed bits with current step */
  updateHeatMap(changedBits, stepIndex) {
    if (!this.lastAccessStep) return;
    this.heatMapCurrentStep = stepIndex;
    for (const bit of changedBits) {
      if (bit < this.lastAccessStep.length) {
        this.lastAccessStep[bit] = stepIndex;
      }
    }
  }

  /** Rebuild heat map from scratch up to targetStep */
  rebuildHeatMap(steps, targetStep) {
    if (!this.lastAccessStep) return;
    this.lastAccessStep.fill(-1);
    for (let i = 0; i <= targetStep && i < steps.length; i++) {
      const s = steps[i];
      for (let j = 0; j < s.changedBits.length; j++) {
        const bit = s.changedBits[j];
        if (bit < this.lastAccessStep.length) {
          this.lastAccessStep[bit] = i;
        }
      }
    }
    this.heatMapCurrentStep = targetStep;
  }

  /** Compute heat color for a bit based on recency */
  _heatColor(bitIdx) {
    const lastStep = this.lastAccessStep[bitIdx];
    if (lastStep < 0) return [40, 40, 80]; // never accessed - dark blue-gray

    const age = this.heatMapCurrentStep - lastStep;
    if (age === 0) return [255, 50, 50];     // hot - red
    if (age <= 2) {
      // transition red -> orange
      const t = age / 2;
      return [255, Math.round(50 + t * 130), Math.round(50 * (1 - t))];
    }
    // transition orange -> blue over ~20 steps
    const t = Math.min(1, (age - 2) / 20);
    return [
      Math.round(255 * (1 - t) + 40 * t),
      Math.round(180 * (1 - t) + 80 * t),
      Math.round(0 * (1 - t) + 220 * t),
    ];
  }

  resize(width, height) {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvasWidth = width;
    // Recompute frozen layout on resize
    if (this._frozenClPerVRow > 0) {
      this._frozenClPerVRow = this._computeClPerVRow();
    }
  }

  _bitPosInByte(bitInByte) {
    const bl = BIT_LAYOUTS[this.bitLayout];
    if (bl.grid3x3) {
      const cell = GRID3X3_MAP[bitInByte];
      return { col: cell % 3, row: Math.floor(cell / 3) };
    }
    return { col: bitInByte % bl.cols, row: Math.floor(bitInByte / bl.cols) };
  }

  _bytePosInU64(byteInU64) {
    const bl = BYTE_LAYOUTS[this.byteLayout];
    if (bl.grid3x3) {
      const cell = GRID3X3_MAP[byteInU64];
      return { col: cell % 3, row: Math.floor(cell / 3) };
    }
    return { col: byteInU64 % bl.cols, row: Math.floor(byteInU64 / bl.cols) };
  }

  _byteDims() {
    const bl = BIT_LAYOUTS[this.bitLayout];
    const px = this.pixelSize * this.zoom;
    const cols = bl.grid3x3 ? 3 : bl.cols;
    const rows = bl.grid3x3 ? 3 : bl.rows;
    return {
      w: cols * px + (cols - 1) * this.bitSpacingH * this.zoom,
      h: rows * px + (rows - 1) * this.bitSpacingV * this.zoom,
    };
  }

  _u64Dims() {
    const byteD = this._byteDims();
    const bl = BYTE_LAYOUTS[this.byteLayout];
    const cols = bl.grid3x3 ? 3 : bl.cols;
    const rows = bl.grid3x3 ? 3 : bl.rows;
    return {
      w: cols * byteD.w + (cols - 1) * this.byteSpacingH * this.zoom,
      h: rows * byteD.h + (rows - 1) * this.byteSpacingV * this.zoom,
    };
  }

  // Dimensions of one vector group (vectorGroup uint64s side by side)
  _vectorDims() {
    const u64D = this._u64Dims();
    const n = this.vectorGroup;
    // uint64s within a vector use a tight gap (half of u64SpacingH, min 1)
    const intraGap = Math.max(1, Math.floor(this.u64SpacingH * 0.5)) * this.zoom;
    return {
      w: n * u64D.w + (n - 1) * intraGap,
      h: u64D.h,
      intraGap,
    };
  }

  _numVectorsPerRow() {
    const u64sPerCL = this.bitsPerCacheLine / 64;
    return Math.max(1, u64sPerCL / this.vectorGroup);
  }

  // How many cache lines to wrap per visual row based on canvas width
  // When frozen, zoom changes don't alter the wrapping layout
  _cacheLinesPerVisualRow() {
    if (this._frozenClPerVRow > 0) return this._frozenClPerVRow;
    return this._computeClPerVRow();
  }

  _computeClPerVRow() {
    if (!this.canvasWidth || this.canvasWidth <= 0) return 1;
    // Compute row width at zoom=1 for stable measurement
    const savedZoom = this.zoom;
    this.zoom = 1;
    const rowW = this._rowDims().w;
    this.zoom = savedZoom;
    if (rowW <= 0) return 1;
    const avail = this.canvasWidth;
    const count = Math.floor(avail / (rowW + this.u64SpacingH));
    // Round down to nearest power of 2 or factor of 4 for clean alignment
    if (count >= 16) return 16;
    if (count >= 8) return 8;
    if (count >= 4) return 4;
    if (count >= 2) return 2;
    return 1;
  }

  /** Freeze the current wrapping layout so zoom doesn't change it */
  freezeLayout() {
    this._frozenClPerVRow = this._computeClPerVRow();
  }

  /** Unfreeze layout (e.g. when window is resized or layout settings change) */
  unfreezeLayout() {
    this._frozenClPerVRow = 0;
  }

  // Row = one cache line = numVectors vector groups
  _rowDims() {
    const vecD = this._vectorDims();
    const n = this._numVectorsPerRow();
    return {
      w: n * vecD.w + (n - 1) * this.u64SpacingH * this.zoom,
      h: vecD.h,
    };
  }

  // Height of a label area above each row (only when zoomed in enough)
  _labelHeight() {
    if (this.vectorGroup <= 1) return 0;
    const fontSize = Math.max(7, Math.min(13, 2 + 2 * this.zoom));
    return this.showVectorLabels ? (fontSize + 4) : 0;
  }

  render() {
    if (!this.ctx || !this.bitState || this.bitCount === 0) return;

    const C = this.colors;
    const ctx = this.ctx;
    const cw = this.canvas.width / (window.devicePixelRatio || 1);
    const ch = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.fillStyle = `rgb(${C.BACKGROUND.join(',')})`;
    ctx.fillRect(0, 0, cw, ch);

    const px = this.pixelSize * this.zoom;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const totalCacheLines = Math.ceil(this.bitCount / bitsPerCacheLine);
    const rowD = this._rowDims();
    const labelH = this._labelHeight();

    // Wrapping: how many cache lines fit per visual row
    const clPerVRow = this._cacheLinesPerVisualRow();
    const vRowWidth = clPerVRow * rowD.w + (clPerVRow - 1) * this.u64SpacingH * this.zoom;
    const vRowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const totalVRows = Math.ceil(totalCacheLines / clPerVRow);

    const startVRow = Math.max(0, Math.floor(-this.panY / vRowHeight));
    const endVRow = Math.min(totalVRows, Math.ceil((ch - this.panY) / vRowHeight) + 1);

    const u64D = this._u64Dims();
    const vecD = this._vectorDims();
    const byteD = this._byteDims();
    const bitBl = BIT_LAYOUTS[this.bitLayout];
    const numVec = this._numVectorsPerRow();
    const changedColor = this._opColor();
    const bitColors = this._bitColors();

    // Font for labels (bit/byte labels need higher zoom)
    const bitLabelFontSize = Math.max(6, Math.min(10, 2 * this.zoom));
    const showBitLabels = this.showBitLabels && this.zoom >= 6;
    const showByteLabels = this.showByteLabels && this.zoom >= 4;

    for (let vRow = startVRow; vRow < endVRow; vRow++) {
      const vRowBaseY = this.panY + vRow * vRowHeight;
      const vRowDataY = vRowBaseY + labelH;
      if (vRowDataY + rowD.h < 0 || vRowBaseY > ch) continue;

      for (let clInRow = 0; clInRow < clPerVRow; clInRow++) {
        const clIdx = vRow * clPerVRow + clInRow;
        if (clIdx >= totalCacheLines) break;

        const clOffsetX = clInRow * (rowD.w + this.u64SpacingH * this.zoom);
        const rowBitStart = clIdx * bitsPerCacheLine;

        if (this.outlineEnabled && this.outlineTarget === 'cacheline') {
          const clX = this.panX + clOffsetX;
          const pad = this._outlinePadding();
          const topExtra = this._outlineTopExtra('cacheline');
          this._drawOutlineRect(ctx, clX - pad, vRowDataY - pad - topExtra, rowD.w + 2 * pad, rowD.h + 2 * pad + topExtra);
        }

        // Render vector labels
        if (labelH > 0 && this.vectorGroup > 1 && this.showVectorLabels) {
          const fontSize = Math.max(7, Math.min(13, 2 + 2 * this.zoom));
          ctx.font = `${fontSize}px monospace`;
          ctx.fillStyle = C.LABEL_COLOR;
          ctx.textBaseline = 'top';

          for (let vi = 0; vi < numVec; vi++) {
            const vecX = this.panX + clOffsetX + vi * (vecD.w + this.u64SpacingH * this.zoom);
            const u64Start = vi * this.vectorGroup;
            const bitStart = rowBitStart + u64Start * 64;
            const bitEnd = Math.min(bitStart + this.vectorGroup * 64 - 1, this.bitCount - 1);
            if (bitStart >= this.bitCount) break;

            const vecLabel = this.vectorLabel || `uint64v${this.vectorGroup}`;
            const label = `${vecLabel}[${vi}] bits ${bitStart}\u2013${bitEnd}`;
            const labelX = Math.max(0, vecX);
            if (labelX < cw && vRowBaseY >= -labelH && vRowBaseY < ch) {
              ctx.fillText(label, labelX, Math.round(vRowBaseY + 1));
            }
          }
        }

        // Render bits
        const u64sPerCL = bitsPerCacheLine / 64;
        for (let u64Idx = 0; u64Idx < u64sPerCL; u64Idx++) {
          const u64BitStart = rowBitStart + u64Idx * 64;
          if (u64BitStart >= this.bitCount) break;

          const vecIdx = Math.floor(u64Idx / this.vectorGroup);
          const intraIdx = u64Idx % this.vectorGroup;
          const vecX = this.panX + clOffsetX + vecIdx * (vecD.w + this.u64SpacingH * this.zoom);
          const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);

          if (this.outlineEnabled && this.outlineTarget === 'vector' && intraIdx === 0) {
            const pad = this._outlinePadding();
            const topExtra = this._outlineTopExtra('vector');
            this._drawOutlineRect(ctx, vecX - pad, vRowDataY - pad - topExtra, vecD.w + 2 * pad, vecD.h + 2 * pad + topExtra);
          }

          for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
            const byteBitStart = u64BitStart + byteIdx * 8;
            if (byteBitStart >= this.bitCount) break;

            const bytePos = this._bytePosInU64(byteIdx);
            const byteX = u64X + bytePos.col * (byteD.w + this.byteSpacingH * this.zoom);
            const byteY = vRowDataY + bytePos.row * (byteD.h + this.byteSpacingV * this.zoom);

            if (this.outlineEnabled && this.outlineTarget === 'byte') {
              const pad = this._outlinePadding();
              const topExtra = this._outlineTopExtra('byte');
              this._drawOutlineRect(ctx, byteX - pad, byteY - pad - topExtra, byteD.w + 2 * pad, byteD.h + 2 * pad + topExtra);
            }

            // Byte label
            if (showByteLabels) {
              ctx.font = `${Math.max(7, bitLabelFontSize)}px monospace`;
              ctx.fillStyle = C.LABEL_COLOR;
              ctx.textBaseline = 'bottom';
              const byteLabel = `B${byteIdx}`;
              ctx.fillText(byteLabel, Math.round(byteX), Math.round(byteY - 1));
            }

            for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
              const globalBit = byteBitStart + bitIdx;
              if (globalBit >= this.bitCount) break;

              if (bitBl.grid3x3 && bitIdx >= 8) continue;

              const bitPos = this._bitPosInByte(bitIdx);
              const bitX = byteX + bitPos.col * (px + this.bitSpacingH * this.zoom);
              const bitY = byteY + bitPos.row * (px + this.bitSpacingV * this.zoom);

              if (bitX + px < 0 || bitX > cw || bitY + px < 0 || bitY > ch) continue;

              let color;
              if (this.heatMapEnabled && this.lastAccessStep) {
                color = this._heatColor(globalBit);
              } else if (this.changedBits.has(globalBit)) {
                color = changedColor;
              } else if (this.bitState[globalBit]) {
                color = bitColors.set;
              } else {
                color = bitColors.cleared;
              }

              ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
              ctx.fillRect(
                Math.round(bitX), Math.round(bitY),
                Math.max(1, Math.round(px)), Math.max(1, Math.round(px))
              );

              // Bit label (number represented by this bit)
              if (showBitLabels && px >= 12) {
                const number = bitToNumber(globalBit, this.storageModel);
                ctx.font = `${Math.max(6, Math.min(9, px * 0.4))}px monospace`;
                ctx.fillStyle = this.changedBits.has(globalBit) ? '#fff' :
                  (this.bitState[globalBit] ? `rgb(${bitColors.cleared.join(',')})` : `rgb(${bitColors.set.join(',')})`);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(number), Math.round(bitX + px / 2), Math.round(bitY + px / 2));
                ctx.textAlign = 'start';
              }
            }
          }
        }
      }
      // No separator line â€” spacing between rows is transparent (background color)
    }
  }

  canvasToBitIndex(canvasX, canvasY) {
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const clPerVRow = this._cacheLinesPerVisualRow();
    const vRowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const vecD = this._vectorDims();
    const px = this.pixelSize * this.zoom;
    const numVec = this._numVectorsPerRow();
    const clStepX = rowD.w + this.u64SpacingH * this.zoom;

    const vRow = Math.floor((canvasY - this.panY) / vRowHeight);
    if (vRow < 0) return -1;

    const localY = canvasY - this.panY - vRow * vRowHeight - labelH;
    const localX = canvasX - this.panX;
    if (localX < 0 || localY < 0 || localY > rowD.h) return -1;

    // Which cache line within the visual row
    const clInRow = Math.floor(localX / clStepX);
    if (clInRow < 0 || clInRow >= clPerVRow) return -1;
    const clIdx = vRow * clPerVRow + clInRow;

    const clLocalX = localX - clInRow * clStepX;

    // Find which vector group
    const vecStep = vecD.w + this.u64SpacingH * this.zoom;
    const vecIdx = Math.floor(clLocalX / vecStep);
    if (vecIdx < 0 || vecIdx >= numVec) return -1;

    const inVecX = clLocalX - vecIdx * vecStep;

    // Find which u64 within the vector
    const u64InVecStep = u64D.w + vecD.intraGap;
    const intraIdx = Math.floor(inVecX / u64InVecStep);
    if (intraIdx < 0 || intraIdx >= this.vectorGroup) return -1;

    const u64Idx = vecIdx * this.vectorGroup + intraIdx;
    const u64sPerCL = bitsPerCacheLine / 64;
    if (u64Idx >= u64sPerCL) return -1;

    const inU64X = inVecX - intraIdx * u64InVecStep;

    // Find byte within u64
    const byteStep_w = byteD.w + this.byteSpacingH * this.zoom;
    const byteStep_h = byteD.h + this.byteSpacingV * this.zoom;
    const byteBl = BYTE_LAYOUTS[this.byteLayout];
    const bCols = byteBl.grid3x3 ? 3 : byteBl.cols;

    const byteCol = Math.floor(inU64X / byteStep_w);
    const byteRow = Math.floor(localY / byteStep_h);
    if (byteCol < 0 || byteCol >= bCols || byteRow < 0) return -1;

    let byteIdx = -1;
    for (let i = 0; i < 8; i++) {
      const pos = this._bytePosInU64(i);
      if (pos.col === byteCol && pos.row === byteRow) { byteIdx = i; break; }
    }
    if (byteIdx < 0) return -1;

    // Find bit within byte
    const inByteX = inU64X - byteCol * byteStep_w;
    const inByteY = localY - byteRow * byteStep_h;
    const bitStep_w = px + this.bitSpacingH * this.zoom;
    const bitStep_h = px + this.bitSpacingV * this.zoom;
    const bitBl = BIT_LAYOUTS[this.bitLayout];
    const bitCols = bitBl.grid3x3 ? 3 : bitBl.cols;

    const bitCol = Math.floor(inByteX / bitStep_w);
    const bitRow = Math.floor(inByteY / bitStep_h);
    if (bitCol < 0 || bitCol >= bitCols || bitRow < 0) return -1;

    let bitInByte = -1;
    for (let i = 0; i < 8; i++) {
      const pos = this._bitPosInByte(i);
      if (pos.col === bitCol && pos.row === bitRow) { bitInByte = i; break; }
    }
    if (bitInByte < 0) return -1;

    const globalBit = clIdx * bitsPerCacheLine + u64Idx * 64 + byteIdx * 8 + bitInByte;
    if (globalBit < 0 || globalBit >= this.bitCount) return -1;
    return globalBit;
  }

  hitTestOutline(canvasX, canvasY, options = {}) {
    if (!this.outlineEnabled) return null;
    const includeInterior = options.includeInterior !== false;

    const bitsPerCacheLine = this.bitsPerCacheLine;
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const clPerVRow = this._cacheLinesPerVisualRow();
    const vRowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const vecD = this._vectorDims();
    const numVec = this._numVectorsPerRow();
    const clStepX = rowD.w + this.u64SpacingH * this.zoom;

    const vRow = Math.floor((canvasY - this.panY) / vRowHeight);
    if (vRow < 0) return null;

    const localY = canvasY - this.panY - vRow * vRowHeight - labelH;
    const localX = canvasX - this.panX;
    if (localX < 0 || localY < 0 || localY > rowD.h) return null;

    const clInRow = Math.floor(localX / clStepX);
    if (clInRow < 0 || clInRow >= clPerVRow) return null;
    const clIdx = vRow * clPerVRow + clInRow;
    const totalCacheLines = Math.ceil(this.bitCount / bitsPerCacheLine);
    if (clIdx >= totalCacheLines) return null;

    const clOffsetX = clInRow * clStepX;
    const clX = this.panX + clOffsetX;
    const rowDataY = this.panY + vRow * vRowHeight + labelH;

    if (this.outlineTarget === 'cacheline') {
      const pad = this._outlinePadding();
      const topExtra = this._outlineTopExtra('cacheline');
      const rx = clX - pad;
      const ry = rowDataY - pad - topExtra;
      const rw = rowD.w + 2 * pad;
      const rh = rowD.h + 2 * pad + topExtra;
      const edgeHit = this._isNearRectEdge(canvasX, canvasY, rx, ry, rw, rh, 10);
      const hit = edgeHit || (includeInterior && this._pointInRect(canvasX, canvasY, rx, ry, rw, rh, 1));
      return hit ? 'cacheline' : null;
    }

    const clLocalX = localX - clInRow * clStepX;
    const vecStep = vecD.w + this.u64SpacingH * this.zoom;
    const vecIdx = Math.floor(clLocalX / vecStep);
    if (vecIdx < 0 || vecIdx >= numVec) return null;
    const vecX = clX + vecIdx * vecStep;

    if (this.outlineTarget === 'vector') {
      const pad = this._outlinePadding();
      const topExtra = this._outlineTopExtra('vector');
      const rx = vecX - pad;
      const ry = rowDataY - pad - topExtra;
      const rw = vecD.w + 2 * pad;
      const rh = vecD.h + 2 * pad + topExtra;
      const edgeHit = this._isNearRectEdge(canvasX, canvasY, rx, ry, rw, rh, 10);
      const hit = edgeHit || (includeInterior && this._pointInRect(canvasX, canvasY, rx, ry, rw, rh, 1));
      return hit ? 'vector' : null;
    }

    const inVecX = clLocalX - vecIdx * vecStep;
    const u64InVecStep = u64D.w + vecD.intraGap;
    const intraIdx = Math.floor(inVecX / u64InVecStep);
    if (intraIdx < 0 || intraIdx >= this.vectorGroup) return null;
    const u64X = vecX + intraIdx * u64InVecStep;

    const inU64X = inVecX - intraIdx * u64InVecStep;
    const byteStep_w = byteD.w + this.byteSpacingH * this.zoom;
    const byteStep_h = byteD.h + this.byteSpacingV * this.zoom;
    const byteBl = BYTE_LAYOUTS[this.byteLayout];
    const bCols = byteBl.grid3x3 ? 3 : byteBl.cols;

    const byteCol = Math.floor(inU64X / byteStep_w);
    const byteRow = Math.floor(localY / byteStep_h);
    if (byteCol < 0 || byteCol >= bCols || byteRow < 0) return null;

    let byteIdx = -1;
    for (let i = 0; i < 8; i++) {
      const pos = this._bytePosInU64(i);
      if (pos.col === byteCol && pos.row === byteRow) { byteIdx = i; break; }
    }
    if (byteIdx < 0) return null;

    const bytePos = this._bytePosInU64(byteIdx);
    const byteX = u64X + bytePos.col * byteStep_w;
    const byteY = rowDataY + bytePos.row * byteStep_h;
    const pad = this._outlinePadding();
    const topExtra = this._outlineTopExtra('byte');
    const rx = byteX - pad;
    const ry = byteY - pad - topExtra;
    const rw = byteD.w + 2 * pad;
    const rh = byteD.h + 2 * pad + topExtra;
    const edgeHit = this._isNearRectEdge(canvasX, canvasY, rx, ry, rw, rh, 9);
    const hit = edgeHit || (includeInterior && this._pointInRect(canvasX, canvasY, rx, ry, rw, rh, 1));
    return hit ? 'byte' : null;
  }

  getOutlineSpacingGuide(canvasX, canvasY) {
    if (!this.outlineEnabled) return null;

    const bitsPerCacheLine = this.bitsPerCacheLine;
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const clPerVRow = this._cacheLinesPerVisualRow();
    const vRowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const vecD = this._vectorDims();
    const numVec = this._numVectorsPerRow();
    const clStepX = rowD.w + this.u64SpacingH * this.zoom;

    const vRow = Math.floor((canvasY - this.panY) / vRowHeight);
    if (vRow < 0) return null;

    const localY = canvasY - this.panY - vRow * vRowHeight - labelH;
    const localX = canvasX - this.panX;
    if (localX < 0 || localY < 0 || localY > rowD.h) return null;

    const clInRow = Math.floor(localX / clStepX);
    if (clInRow < 0 || clInRow >= clPerVRow) return null;
    const clIdx = vRow * clPerVRow + clInRow;
    const totalCacheLines = Math.ceil(this.bitCount / bitsPerCacheLine);
    if (clIdx >= totalCacheLines) return null;

    const pad = this._outlinePadding();
    const clOffsetX = clInRow * clStepX;
    const clX = this.panX + clOffsetX;
    const rowDataY = this.panY + vRow * vRowHeight + labelH;

    if (this.outlineTarget === 'cacheline') {
      const topExtra = this._outlineTopExtra('cacheline');
      const rect1 = { x: clX - pad, y: rowDataY - pad - topExtra, w: rowD.w + 2 * pad, h: rowD.h + 2 * pad + topExtra };
      let rect2 = null;
      let axis = 'H';

      if (clInRow + 1 < clPerVRow && clIdx + 1 < totalCacheLines) {
        const nx = this.panX + (clInRow + 1) * clStepX;
        rect2 = { x: nx - pad, y: rect1.y, w: rect1.w, h: rect1.h };
      } else if (clIdx + clPerVRow < totalCacheLines) {
        axis = 'V';
        const ny = this.panY + (vRow + 1) * vRowHeight + labelH;
        rect2 = { x: rect1.x, y: ny - pad - topExtra, w: rect1.w, h: rect1.h };
      }
      if (!rect2) return null;

      if (axis === 'H') {
        const y = rect1.y + rect1.h / 2;
        return { focus: 'cacheline', axis, x1: rect1.x + rect1.w, y1: y, x2: rect2.x, y2: y, anchorX: canvasX, anchorY: canvasY };
      }
      const x = rect1.x + rect1.w / 2;
      return { focus: 'cacheline', axis, x1: x, y1: rect1.y + rect1.h, x2: x, y2: rect2.y, anchorX: canvasX, anchorY: canvasY };
    }

    const clLocalX = localX - clInRow * clStepX;
    const vecStep = vecD.w + this.u64SpacingH * this.zoom;
    const vecIdx = Math.floor(clLocalX / vecStep);
    if (vecIdx < 0 || vecIdx >= numVec) return null;
    const vecX = clX + vecIdx * vecStep;

    if (this.outlineTarget === 'vector') {
      const topExtra = this._outlineTopExtra('vector');
      const rect1 = { x: vecX - pad, y: rowDataY - pad - topExtra, w: vecD.w + 2 * pad, h: vecD.h + 2 * pad + topExtra };
      if (vecIdx + 1 >= numVec) return null;
      const nVecX = clX + (vecIdx + 1) * vecStep;
      const rect2 = { x: nVecX - pad, y: rect1.y, w: rect1.w, h: rect1.h };
      const y = rect1.y + rect1.h / 2;
      return { focus: 'vector', axis: 'H', x1: rect1.x + rect1.w, y1: y, x2: rect2.x, y2: y, anchorX: canvasX, anchorY: canvasY };
    }

    const inVecX = clLocalX - vecIdx * vecStep;
    const u64InVecStep = u64D.w + vecD.intraGap;
    const intraIdx = Math.floor(inVecX / u64InVecStep);
    if (intraIdx < 0 || intraIdx >= this.vectorGroup) return null;
    const u64X = vecX + intraIdx * u64InVecStep;

    const inU64X = inVecX - intraIdx * u64InVecStep;
    const byteStep_w = byteD.w + this.byteSpacingH * this.zoom;
    const byteStep_h = byteD.h + this.byteSpacingV * this.zoom;
    const byteBl = BYTE_LAYOUTS[this.byteLayout];
    const bCols = byteBl.grid3x3 ? 3 : byteBl.cols;
    const bRows = byteBl.grid3x3 ? 3 : byteBl.rows;

    const byteCol = Math.floor(inU64X / byteStep_w);
    const byteRow = Math.floor(localY / byteStep_h);
    if (byteCol < 0 || byteCol >= bCols || byteRow < 0 || byteRow >= bRows) return null;

    const topExtra = this._outlineTopExtra('byte');
    const rect1 = {
      x: u64X + byteCol * byteStep_w - pad,
      y: rowDataY + byteRow * byteStep_h - pad - topExtra,
      w: byteD.w + 2 * pad,
      h: byteD.h + 2 * pad + topExtra,
    };

    let axis = 'H';
    let rect2 = null;
    if (byteCol + 1 < bCols) {
      rect2 = { ...rect1, x: rect1.x + byteStep_w };
    } else if (byteRow + 1 < bRows) {
      axis = 'V';
      rect2 = { ...rect1, y: rect1.y + byteStep_h };
    }
    if (!rect2) return null;

    if (axis === 'H') {
      const y = rect1.y + rect1.h / 2;
      return { focus: 'byte', axis, x1: rect1.x + rect1.w, y1: y, x2: rect2.x, y2: y, anchorX: canvasX, anchorY: canvasY };
    }
    const x = rect1.x + rect1.w / 2;
    return { focus: 'byte', axis, x1: x, y1: rect1.y + rect1.h, x2: x, y2: rect2.y, anchorX: canvasX, anchorY: canvasY };
  }

  getBitInfo(bitIdx) {
    if (bitIdx < 0 || bitIdx >= this.bitCount) return '';
    const number = bitToNumber(bitIdx, this.storageModel);
    const byteIdx = Math.floor(bitIdx / 8);
    const u64Idx = Math.floor(bitIdx / 64);
    const cacheLineIdx = Math.floor(bitIdx / this.bitsPerCacheLine);
    const vectorIdx = Math.floor(u64Idx / this.vectorGroup);
    const u64InVector = u64Idx % this.vectorGroup;
    const byteInVector = byteIdx % (this.vectorGroup * 8);
    const vecLabel = this.vectorLabel || `uint64v${this.vectorGroup}`;
    const state = this.bitState[bitIdx] ? 'composite' : 'prime candidate';
    const changed = this.changedBits.has(bitIdx) ? ' [CHANGED]' : '';
    return `Bit ${bitIdx} -> Number ${number} | byte ${byteInVector} in ${vecLabel}[${vectorIdx}], ${byteIdx} from start | uint64 ${u64InVector} in ${vecLabel}[${vectorIdx}], ${u64Idx} from start | Cache line ${cacheLineIdx} | ${state}${changed}`;
  }

  toDataURL() {
    if (!this.canvas) return '';
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Render a contracting ripple overlay on changed bits.
   * A large circle contracts to each changed bit while fading.
   * @param {number} progress 0..1 animation progress
   */
  renderRipple(progress) {
    if (!this.ctx || !this.changedBits || this.changedBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const ctx = this.ctx;
    const cw = this.canvas.width / (window.devicePixelRatio || 1);
    const ch = this.canvas.height / (window.devicePixelRatio || 1);
    const px = this.pixelSize * this.zoom;

    const bitsPerCacheLine = this.bitsPerCacheLine;
    const labelH = this._labelHeight();
    const rowD = this._rowDims();
    const clPerVRow = this._cacheLinesPerVisualRow();
    const vRowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const clStepX = rowD.w + this.u64SpacingH * this.zoom;
    const u64D = this._u64Dims();
    const vecD = this._vectorDims();
    const byteD = this._byteDims();

    const color = this._opColor();
    // Ease-out cubic for smooth deceleration
    const ease = 1 - Math.pow(1 - progress, 3);

    // Contracting ring: starts large, contracts to 0
    const maxRadius = Math.max(12, px * 8);
    const ringRadius = maxRadius * (1 - ease);
    // Ring line width: thick at start, thins out
    const ringWidth = Math.max(1, 3 * (1 - ease));
    // Ring alpha: visible throughout, fading at end
    const ringAlpha = Math.max(0, 0.7 * (1 - ease * ease));

    // Inner flash: bright fill that fades quickly
    const flashAlpha = progress < 0.3 ? 0.5 * (1 - progress / 0.3) : 0;
    const flashRadius = px * 0.7;

    ctx.save();

    for (const globalBit of this.changedBits) {
      if (globalBit >= this.bitCount) continue;

      const clIdx = Math.floor(globalBit / bitsPerCacheLine);
      const bitInRow = globalBit % bitsPerCacheLine;
      const u64Idx = Math.floor(bitInRow / 64);
      const bitInU64 = bitInRow % 64;
      const byteIdx = Math.floor(bitInU64 / 8);
      const bitInByte = bitInU64 % 8;

      const vRow = Math.floor(clIdx / clPerVRow);
      const clInRow = clIdx % clPerVRow;
      const clOffsetX = clInRow * clStepX;
      const rowDataY = this.panY + vRow * vRowHeight + labelH;

      const vecIdx = Math.floor(u64Idx / this.vectorGroup);
      const intraIdx = u64Idx % this.vectorGroup;
      const vecX = this.panX + clOffsetX + vecIdx * (vecD.w + this.u64SpacingH * this.zoom);
      const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);

      const bytePos = this._bytePosInU64(byteIdx);
      const byteX = u64X + bytePos.col * (byteD.w + this.byteSpacingH * this.zoom);
      const byteY = rowDataY + bytePos.row * (byteD.h + this.byteSpacingV * this.zoom);

      const bitPos = this._bitPosInByte(bitInByte);
      const cx = byteX + bitPos.col * (px + this.bitSpacingH * this.zoom) + px / 2;
      const cy = byteY + bitPos.row * (px + this.bitSpacingV * this.zoom) + px / 2;

      // Skip off-screen bits
      if (cx + maxRadius < 0 || cx - maxRadius > cw || cy + maxRadius < 0 || cy - maxRadius > ch) continue;

      // Contracting ring
      if (ringAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${ringAlpha})`;
        ctx.lineWidth = ringWidth;
        ctx.stroke();
      }

      // Inner bright flash
      if (flashAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(cx, cy, flashRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${flashAlpha})`;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /** Fade animation: changed bits fade from transparent to full color */
  renderFade(progress) {
    if (!this.ctx || !this.changedBits || this.changedBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const ctx = this.ctx;
    const px = this.pixelSize * this.zoom;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const labelH = this._labelHeight();
    const rowD = this._rowDims();
    const clPerVRow = this._cacheLinesPerVisualRow();
    const vRowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const clStepX = rowD.w + this.u64SpacingH * this.zoom;
    const u64D = this._u64Dims();
    const vecD = this._vectorDims();
    const byteD = this._byteDims();
    const color = this._opColor();
    const alpha = 1 - progress; // fades out over time

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;

    for (const globalBit of this.changedBits) {
      if (globalBit >= this.bitCount) continue;
      const clIdx = Math.floor(globalBit / bitsPerCacheLine);
      const bitInRow = globalBit % bitsPerCacheLine;
      const u64Idx = Math.floor(bitInRow / 64);
      const bitInU64 = bitInRow % 64;
      const byteIdx = Math.floor(bitInU64 / 8);
      const bitInByte = bitInU64 % 8;

      const vRow = Math.floor(clIdx / clPerVRow);
      const clInRow = clIdx % clPerVRow;
      const clOffsetX = clInRow * clStepX;
      const rowDataY = this.panY + vRow * vRowHeight + labelH;

      const vecIdx = Math.floor(u64Idx / this.vectorGroup);
      const intraIdx = u64Idx % this.vectorGroup;
      const vecX = this.panX + clOffsetX + vecIdx * (vecD.w + this.u64SpacingH * this.zoom);
      const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);
      const bytePos = this._bytePosInU64(byteIdx);
      const byteX = u64X + bytePos.col * (byteD.w + this.byteSpacingH * this.zoom);
      const byteY = rowDataY + bytePos.row * (byteD.h + this.byteSpacingV * this.zoom);
      const bitPos = this._bitPosInByte(bitInByte);
      const bx = byteX + bitPos.col * (px + this.bitSpacingH * this.zoom);
      const by = byteY + bitPos.row * (px + this.bitSpacingV * this.zoom);

      ctx.fillRect(bx - 1, by - 1, px + 2, px + 2);
    }
    ctx.restore();
  }

  /** Pulse animation: changed bits scale up then back down */
  renderPulse(progress) {
    if (!this.ctx || !this.changedBits || this.changedBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const ctx = this.ctx;
    const px = this.pixelSize * this.zoom;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const labelH = this._labelHeight();
    const rowD = this._rowDims();
    const clPerVRow = this._cacheLinesPerVisualRow();
    const vRowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const clStepX = rowD.w + this.u64SpacingH * this.zoom;
    const u64D = this._u64Dims();
    const vecD = this._vectorDims();
    const byteD = this._byteDims();
    const color = this._opColor();

    // Scale: grow to 1.6x at 30%, then shrink back
    const peak = 0.3;
    const scale = progress < peak
      ? 1 + 0.6 * (progress / peak)
      : 1 + 0.6 * (1 - (progress - peak) / (1 - peak));
    const alpha = progress < 0.7 ? 0.8 : 0.8 * (1 - (progress - 0.7) / 0.3);

    ctx.save();
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, alpha)})`;

    for (const globalBit of this.changedBits) {
      if (globalBit >= this.bitCount) continue;
      const clIdx = Math.floor(globalBit / bitsPerCacheLine);
      const bitInRow = globalBit % bitsPerCacheLine;
      const u64Idx = Math.floor(bitInRow / 64);
      const bitInU64 = bitInRow % 64;
      const byteIdx = Math.floor(bitInU64 / 8);
      const bitInByte = bitInU64 % 8;

      const vRow = Math.floor(clIdx / clPerVRow);
      const clInRow = clIdx % clPerVRow;
      const clOffsetX = clInRow * clStepX;
      const rowDataY = this.panY + vRow * vRowHeight + labelH;

      const vecIdx = Math.floor(u64Idx / this.vectorGroup);
      const intraIdx = u64Idx % this.vectorGroup;
      const vecX = this.panX + clOffsetX + vecIdx * (vecD.w + this.u64SpacingH * this.zoom);
      const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);
      const bytePos = this._bytePosInU64(byteIdx);
      const byteX = u64X + bytePos.col * (byteD.w + this.byteSpacingH * this.zoom);
      const byteY = rowDataY + bytePos.row * (byteD.h + this.byteSpacingV * this.zoom);
      const bitPos = this._bitPosInByte(bitInByte);
      const cx = byteX + bitPos.col * (px + this.bitSpacingH * this.zoom) + px / 2;
      const cy = byteY + bitPos.row * (px + this.bitSpacingV * this.zoom) + px / 2;

      const s = px * scale;
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    }
    ctx.restore();
  }

  /** Content dimensions at current zoom */
  contentDimensions() {
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const totalCL = Math.ceil(this.bitCount / bitsPerCacheLine);
    const clPerVRow = this._cacheLinesPerVisualRow();
    const totalVRows = Math.ceil(totalCL / clPerVRow);
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const w = clPerVRow * (rowD.w + this.u64SpacingH * this.zoom) - this.u64SpacingH * this.zoom;
    const h = totalVRows * (labelH + rowD.h + this.u64SpacingV * this.zoom);
    return { width: Math.max(1, w), height: Math.max(1, h) };
  }

  /** Set zoom & pan so all content fits with a border */
  zoomToFit(canvasW, canvasH) {
    if (this.bitCount === 0 || canvasW <= 0 || canvasH <= 0) return;

    // Measure base dimensions at zoom=1
    const saved = this.zoom;
    this.zoom = 1;
    const dims = this.contentDimensions();
    this.zoom = saved;

    // Everything scales linearly with zoom
    const margin = 0.9;
    const fitZoom = Math.min(
      (canvasW * margin) / dims.width,
      (canvasH * margin) / dims.height
    );
    this.zoom = Math.max(0.1, Math.min(fitZoom, 4));

    // Center content
    const finalDims = this.contentDimensions();
    this.panX = (canvasW - finalDims.width) / 2;
    this.panY = (canvasH - finalDims.height) / 2;
  }

  /** Viewport info for scrollbars/minimap */
  viewportInfo(canvasW, canvasH) {
    const dims = this.contentDimensions();
    return {
      contentW: dims.width,
      contentH: dims.height,
      viewX: -this.panX,
      viewY: -this.panY,
      viewW: canvasW,
      viewH: canvasH,
    };
  }

  /** Render minimap overlay in bottom-right corner, offset above detailH */
  renderMinimap(canvasW, canvasH, detailH = 0) {
    if (this.bitCount === 0) return;
    const dims = this.contentDimensions();
    if (dims.width <= canvasW && dims.height <= canvasH) return;

    const ctx = this.ctx;
    const pad = 4;

    const scale = Math.min(
      (130) / dims.width,
      (130) / dims.height
    );
    const mapW = dims.width * scale + 2 * pad;
    const mapH = dims.height * scale + 2 * pad;
    const mx = canvasW - mapW - 10;
    const my = canvasH - mapH - 10 - detailH;

    // Store minimap geometry for hit testing
    this._minimapRect = { mx, my, mapW, mapH, scale, pad, dims };

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(mx, my, mapW, mapH);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mapW, mapH);

    // Content outline only (no per-bit colors)
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const totalCL = Math.ceil(this.bitCount / bitsPerCacheLine);
    const clPerVRow = this._cacheLinesPerVisualRow();
    const totalVRows = Math.ceil(totalCL / clPerVRow);
    const contentW = mapW - 2 * pad;
    const contentH = mapH - 2 * pad;

    // Draw a simple filled rectangle for the content area
    ctx.fillStyle = 'rgba(180,180,180,0.15)';
    ctx.fillRect(mx + pad, my + pad, contentW, contentH);

    // Draw outline of the content boundary
    ctx.strokeStyle = 'rgba(200,200,200,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + pad, my + pad, contentW, contentH);

    // Viewport rectangle
    const vpX = mx + pad + (-this.panX) * scale;
    const vpY = my + pad + (-this.panY) * scale;
    const vpW = canvasW * scale;
    const vpH = canvasH * scale;

    ctx.strokeStyle = 'rgba(255,68,68,0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      Math.max(mx + pad, Math.min(vpX, mx + mapW - pad)),
      Math.max(my + pad, Math.min(vpY, my + mapH - pad)),
      Math.min(vpW, mapW - 2 * pad),
      Math.min(vpH, mapH - 2 * pad)
    );
  }

  /** Test if (x,y) in canvas coords is inside the minimap; returns {panX, panY} to center there */
  minimapHitTest(x, y, canvasW, canvasH) {
    const r = this._minimapRect;
    if (!r) return null;
    const { mx, my, mapW, mapH, scale, pad } = r;
    if (x < mx || x > mx + mapW || y < my || y > my + mapH) return null;
    // Map click position to content coordinates
    const contentX = (x - mx - pad) / scale;
    const contentY = (y - my - pad) / scale;
    // Center the viewport on that content point
    return {
      panX: -(contentX - canvasW / 2),
      panY: -(contentY - canvasH / 2),
    };
  }
}

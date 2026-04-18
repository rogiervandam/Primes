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
    BIT_CHANGED:  [255, 68,  68],
    BACKGROUND:   [26,  26,  26],
    BYTE_BORDER:  [50,  50,  50],
    U64_BORDER:   [70,  70,  70],
    CACHE_BORDER: [100, 100, 100],
    LABEL_COLOR:  'rgba(200,200,200,0.7)',
    OPERATION_COLORS: {
      markFactors:     [255, 68,  68],   // red
      extend:          [68,  136, 255],  // blue
      continuePattern: [68,  220, 136],  // green
      setBitsTrue:     [255, 180, 68],   // orange
      applyMask:       [200, 120, 255],  // purple
    },
  },
  light: {
    BIT_ZERO:     [240, 240, 240],
    BIT_ONE:      [60,  60,  60],
    BIT_CHANGED:  [220, 40,  40],
    BACKGROUND:   [255, 255, 255],
    BYTE_BORDER:  [200, 200, 200],
    U64_BORDER:   [170, 170, 170],
    CACHE_BORDER: [130, 130, 130],
    LABEL_COLOR:  'rgba(60,60,60,0.7)',
    OPERATION_COLORS: {
      markFactors:     [200, 30,  30],
      extend:          [30,  90,  200],
      continuePattern: [20,  160, 80],
      setBitsTrue:     [200, 140, 20],
      applyMask:       [140, 60,  200],
    },
  },
};

// Bit-in-byte layout modes
export const BIT_LAYOUTS = {
  '8x1': { label: '8 bits in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bits in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bits in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3×3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
};

// Byte-in-uint64 layout modes
export const BYTE_LAYOUTS = {
  '8x1': { label: '8 bytes in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bytes in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bytes in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3×3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
};

// Vector grouping options
export const VECTOR_GROUPS = {
  1:  { label: 'uint64 (no grouping)', u64sPerGroup: 1 },
  2:  { label: 'uint64v2 (SSE/128-bit)', u64sPerGroup: 2 },
  4:  { label: 'uint64v4 (AVX2/256-bit)', u64sPerGroup: 4 },
  8:  { label: 'uint64v8 (AVX-512/512-bit)', u64sPerGroup: 8 },
};

// Map a linear index (0-7) to a position in a 3x3 grid skipping center (4)
const GRID3X3_MAP = [0, 1, 2, 3, /*skip 4*/ 5, 6, 7, 8];

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
    this.bitLayout = '8x1';
    this.byteLayout = '8x1';
    this.bitSpacingH = 0;
    this.bitSpacingV = 0;
    this.byteSpacingH = 1;
    this.byteSpacingV = 0;
    this.u64SpacingH = 2;
    this.u64SpacingV = 2;
    this.theme = 'dark';

    // Operation-based coloring
    this.currentOperation = null;

    // Vector grouping
    this.vectorGroup = 1;  // 1, 2, 4, or 8 uint64s per vector
  }

  get colors() { return THEMES[this.theme] || THEMES.dark; }

  _opColor() {
    const C = this.colors;
    if (this.currentOperation && C.OPERATION_COLORS[this.currentOperation]) {
      return C.OPERATION_COLORS[this.currentOperation];
    }
    return C.BIT_CHANGED;
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
  }

  setState(bitState, changedBits) {
    this.bitState = bitState;
    this.changedBits = changedBits;
  }

  resize(width, height) {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  _numVectorsPerRow() { return Math.max(1, 8 / this.vectorGroup); }

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
    const fontSize = Math.max(8, Math.min(14, 3 * this.zoom));
    return (fontSize > 6 && this.zoom >= 2) ? fontSize + 4 : 0;
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
    const bitsPerCacheLine = 512;
    const totalRows = Math.ceil(this.bitCount / bitsPerCacheLine);
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const rowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;

    const startRow = Math.max(0, Math.floor(-this.panY / rowHeight));
    const endRow = Math.min(totalRows, Math.ceil((ch - this.panY) / rowHeight) + 1);

    const u64D = this._u64Dims();
    const vecD = this._vectorDims();
    const byteD = this._byteDims();
    const bitBl = BIT_LAYOUTS[this.bitLayout];
    const numVec = this._numVectorsPerRow();
    const changedColor = this._opColor();

    for (let row = startRow; row < endRow; row++) {
      const rowBaseY = this.panY + row * rowHeight;
      const rowDataY = rowBaseY + labelH;
      if (rowDataY + rowD.h < 0 || rowBaseY > ch) continue;

      const rowBitStart = row * bitsPerCacheLine;

      // Render vector labels
      if (labelH > 0 && this.vectorGroup > 1) {
        const fontSize = Math.max(8, Math.min(14, 3 * this.zoom));
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = C.LABEL_COLOR;
        ctx.textBaseline = 'top';

        for (let vi = 0; vi < numVec; vi++) {
          const vecX = this.panX + vi * (vecD.w + this.u64SpacingH * this.zoom);
          const u64Start = vi * this.vectorGroup;
          const bitStart = rowBitStart + u64Start * 64;
          const bitEnd = Math.min(bitStart + this.vectorGroup * 64 - 1, this.bitCount - 1);
          if (bitStart >= this.bitCount) break;

          const label = `uint64v${this.vectorGroup}[${vi}] bits ${bitStart}–${bitEnd}`;
          const labelX = Math.max(0, vecX);
          if (labelX < cw && rowBaseY >= -labelH && rowBaseY < ch) {
            ctx.fillText(label, labelX, Math.round(rowBaseY + 1));
          }
        }
      }

      // Render bits
      for (let u64Idx = 0; u64Idx < 8; u64Idx++) {
        const u64BitStart = rowBitStart + u64Idx * 64;
        if (u64BitStart >= this.bitCount) break;

        // Calculate x position accounting for vector grouping
        const vecIdx = Math.floor(u64Idx / this.vectorGroup);
        const intraIdx = u64Idx % this.vectorGroup;
        const vecX = this.panX + vecIdx * (vecD.w + this.u64SpacingH * this.zoom);
        const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);

        for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
          const byteBitStart = u64BitStart + byteIdx * 8;
          if (byteBitStart >= this.bitCount) break;

          const bytePos = this._bytePosInU64(byteIdx);
          const byteX = u64X + bytePos.col * (byteD.w + this.byteSpacingH * this.zoom);
          const byteY = rowDataY + bytePos.row * (byteD.h + this.byteSpacingV * this.zoom);

          for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            const globalBit = byteBitStart + bitIdx;
            if (globalBit >= this.bitCount) break;

            if (bitBl.grid3x3 && bitIdx >= 8) continue;

            const bitPos = this._bitPosInByte(bitIdx);
            const bitX = byteX + bitPos.col * (px + this.bitSpacingH * this.zoom);
            const bitY = byteY + bitPos.row * (px + this.bitSpacingV * this.zoom);

            if (bitX + px < 0 || bitX > cw || bitY + px < 0 || bitY > ch) continue;

            let color;
            if (this.changedBits.has(globalBit)) {
              color = changedColor;
            } else if (this.bitState[globalBit]) {
              color = C.BIT_ONE;
            } else {
              color = C.BIT_ZERO;
            }

            ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
            ctx.fillRect(
              Math.round(bitX), Math.round(bitY),
              Math.max(1, Math.round(px)), Math.max(1, Math.round(px))
            );
          }
        }
      }

      // Cache-line separator: only span data width, not full canvas
      if (this.u64SpacingV > 0) {
        ctx.fillStyle = `rgb(${C.CACHE_BORDER.join(',')})`;
        const sepY = rowDataY + rowD.h;
        if (sepY >= 0 && sepY <= ch) {
          const dataStartX = Math.max(0, this.panX);
          const dataEndX = Math.min(cw, this.panX + rowD.w);
          if (dataEndX > dataStartX) {
            ctx.fillRect(
              Math.round(dataStartX), Math.round(sepY),
              Math.round(dataEndX - dataStartX),
              Math.max(1, Math.round(this.u64SpacingV * this.zoom))
            );
          }
        }
      }
    }
  }

  canvasToBitIndex(canvasX, canvasY) {
    const bitsPerCacheLine = 512;
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const rowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const vecD = this._vectorDims();
    const px = this.pixelSize * this.zoom;
    const numVec = this._numVectorsPerRow();

    const row = Math.floor((canvasY - this.panY) / rowHeight);
    if (row < 0) return -1;

    const localY = canvasY - this.panY - row * rowHeight - labelH;
    const localX = canvasX - this.panX;
    if (localX < 0 || localY < 0 || localY > rowD.h) return -1;

    // Find which vector group
    const vecStep = vecD.w + this.u64SpacingH * this.zoom;
    const vecIdx = Math.floor(localX / vecStep);
    if (vecIdx < 0 || vecIdx >= numVec) return -1;

    const inVecX = localX - vecIdx * vecStep;

    // Find which u64 within the vector
    const u64InVecStep = u64D.w + vecD.intraGap;
    const intraIdx = Math.floor(inVecX / u64InVecStep);
    if (intraIdx < 0 || intraIdx >= this.vectorGroup) return -1;

    const u64Idx = vecIdx * this.vectorGroup + intraIdx;
    if (u64Idx >= 8) return -1;

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

    const globalBit = row * bitsPerCacheLine + u64Idx * 64 + byteIdx * 8 + bitInByte;
    if (globalBit < 0 || globalBit >= this.bitCount) return -1;
    return globalBit;
  }

  getBitInfo(bitIdx) {
    if (bitIdx < 0 || bitIdx >= this.bitCount) return '';
    const number = bitIdx * 2 + 1;
    const byteIdx = Math.floor(bitIdx / 8);
    const u64Idx = Math.floor(bitIdx / 64);
    const cacheLineIdx = Math.floor(bitIdx / 512);
    const state = this.bitState[bitIdx] ? 'composite' : 'prime candidate';
    const changed = this.changedBits.has(bitIdx) ? ' [CHANGED]' : '';
    return `Bit ${bitIdx} → Number ${number} | Byte ${byteIdx} | u64 ${u64Idx} | Cache line ${cacheLineIdx} | ${state}${changed}`;
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

    const bitsPerCacheLine = 512;
    const labelH = this._labelHeight();
    const rowD = this._rowDims();
    const rowHeight = labelH + rowD.h + this.u64SpacingV * this.zoom;
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

      const row = Math.floor(globalBit / bitsPerCacheLine);
      const bitInRow = globalBit % bitsPerCacheLine;
      const u64Idx = Math.floor(bitInRow / 64);
      const bitInU64 = bitInRow % 64;
      const byteIdx = Math.floor(bitInU64 / 8);
      const bitInByte = bitInU64 % 8;

      const rowDataY = this.panY + row * rowHeight + labelH;

      const vecIdx = Math.floor(u64Idx / this.vectorGroup);
      const intraIdx = u64Idx % this.vectorGroup;
      const vecX = this.panX + vecIdx * (vecD.w + this.u64SpacingH * this.zoom);
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
}

/**
 * Canvas-based renderer for sieve bitstorage visualization.
 *
 * Supports configurable layouts for bits-within-byte and bytes-within-uint64,
 * adjustable spacing, and light/dark themes.
 */

// Theme palettes
export const THEMES = {
  dark: {
    BIT_ZERO:     [232, 232, 232],
    BIT_ONE:      [85,  85,  85],
    BIT_CHANGED:  [255, 68,  68],
    BACKGROUND:   [26,  26,  26],
    BYTE_BORDER:  [50,  50,  50],
    U64_BORDER:   [70,  70,  70],
    CACHE_BORDER: [100, 100, 100],
  },
  light: {
    BIT_ZERO:     [240, 240, 240],
    BIT_ONE:      [60,  60,  60],
    BIT_CHANGED:  [220, 40,  40],
    BACKGROUND:   [255, 255, 255],
    BYTE_BORDER:  [200, 200, 200],
    U64_BORDER:   [170, 170, 170],
    CACHE_BORDER: [130, 130, 130],
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
    this.bitSpacingH = 0;     // horizontal px between bits within a byte
    this.bitSpacingV = 0;     // vertical px between bit rows within a byte
    this.byteSpacingH = 1;    // horizontal px between bytes within a uint64
    this.byteSpacingV = 0;    // vertical px between byte rows within a uint64
    this.u64SpacingH = 2;     // horizontal px between uint64 groups
    this.u64SpacingV = 2;     // vertical px between uint64 rows (cache lines)
    this.theme = 'dark';
  }

  get colors() { return THEMES[this.theme] || THEMES.dark; }

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

  // Calculate the pixel position of a bit within its byte group
  _bitPosInByte(bitInByte) {
    const bl = BIT_LAYOUTS[this.bitLayout];
    let col, row;
    if (bl.grid3x3) {
      const cell = GRID3X3_MAP[bitInByte];
      col = cell % 3;
      row = Math.floor(cell / 3);
    } else {
      col = bitInByte % bl.cols;
      row = Math.floor(bitInByte / bl.cols);
    }
    return { col, row };
  }

  // Calculate the pixel position of a byte within its uint64 group
  _bytePosInU64(byteInU64) {
    const bl = BYTE_LAYOUTS[this.byteLayout];
    let col, row;
    if (bl.grid3x3) {
      const cell = GRID3X3_MAP[byteInU64];
      col = cell % 3;
      row = Math.floor(cell / 3);
    } else {
      col = byteInU64 % bl.cols;
      row = Math.floor(byteInU64 / bl.cols);
    }
    return { col, row };
  }

  // Dimensions of one byte group in pixels (including internal spacing)
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

  // Dimensions of one uint64 group in pixels
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

  // How many uint64 groups per row (cache line = 8 uint64)
  _u64sPerRow() { return 8; }

  // Row dimensions: one cache line = 8 uint64 groups
  _rowDims() {
    const u64D = this._u64Dims();
    const n = this._u64sPerRow();
    const bl = BYTE_LAYOUTS[this.byteLayout];
    const u64Cols = bl.grid3x3 ? 3 : bl.cols;
    // u64 groups are arranged left-to-right
    return {
      w: n * u64D.w + (n - 1) * this.u64SpacingH * this.zoom,
      h: u64D.h,
    };
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
    const rowHeight = rowD.h + this.u64SpacingV * this.zoom;

    // Visible row range
    const startRow = Math.max(0, Math.floor(-this.panY / rowHeight));
    const endRow = Math.min(totalRows, Math.ceil((ch - this.panY) / rowHeight) + 1);

    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const bitBl = BIT_LAYOUTS[this.bitLayout];
    const byteBl = BYTE_LAYOUTS[this.byteLayout];
    const bitCols = bitBl.grid3x3 ? 3 : bitBl.cols;
    const byteCols = byteBl.grid3x3 ? 3 : byteBl.cols;

    for (let row = startRow; row < endRow; row++) {
      const rowY = this.panY + row * rowHeight;
      if (rowY + rowD.h < 0 || rowY > ch) continue;

      const rowBitStart = row * bitsPerCacheLine;

      for (let u64Idx = 0; u64Idx < 8; u64Idx++) {
        const u64BitStart = rowBitStart + u64Idx * 64;
        if (u64BitStart >= this.bitCount) break;
        const u64X = this.panX + u64Idx * (u64D.w + this.u64SpacingH * this.zoom);

        for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
          const byteBitStart = u64BitStart + byteIdx * 8;
          if (byteBitStart >= this.bitCount) break;

          const bytePos = this._bytePosInU64(byteIdx);
          const byteX = u64X + bytePos.col * (byteD.w + this.byteSpacingH * this.zoom);
          const byteY = rowY + bytePos.row * (byteD.h + this.byteSpacingV * this.zoom);

          for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            const globalBit = byteBitStart + bitIdx;
            if (globalBit >= this.bitCount) break;

            // Skip center in 3x3 grid mode
            if (bitBl.grid3x3 && bitIdx >= 8) continue;

            const bitPos = this._bitPosInByte(bitIdx);
            const bitX = byteX + bitPos.col * (px + this.bitSpacingH * this.zoom);
            const bitY = byteY + bitPos.row * (px + this.bitSpacingV * this.zoom);

            // Cull off-screen
            if (bitX + px < 0 || bitX > cw || bitY + px < 0 || bitY > ch) continue;

            let color;
            if (this.changedBits.has(globalBit)) {
              color = C.BIT_CHANGED;
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

      // Cache-line separator
      if (this.u64SpacingV > 0) {
        ctx.fillStyle = `rgb(${C.CACHE_BORDER.join(',')})`;
        const sepY = rowY + rowD.h;
        if (sepY >= 0 && sepY <= ch) {
          ctx.fillRect(0, Math.round(sepY), cw, Math.max(1, Math.round(this.u64SpacingV * this.zoom)));
        }
      }
    }
  }

  canvasToBitIndex(canvasX, canvasY) {
    const bitsPerCacheLine = 512;
    const rowD = this._rowDims();
    const rowHeight = rowD.h + this.u64SpacingV * this.zoom;
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const px = this.pixelSize * this.zoom;

    const row = Math.floor((canvasY - this.panY) / rowHeight);
    if (row < 0) return -1;

    const localY = canvasY - this.panY - row * rowHeight;
    const localX = canvasX - this.panX;
    if (localX < 0 || localY < 0 || localY > rowD.h) return -1;

    // Find which u64 group
    const u64Step = u64D.w + this.u64SpacingH * this.zoom;
    const u64Idx = Math.floor(localX / u64Step);
    if (u64Idx < 0 || u64Idx >= 8) return -1;

    // Approximate: for complex layouts, use a rough bit estimate
    const inU64X = localX - u64Idx * u64Step;
    const inU64Y = localY;

    // Find byte within u64
    const byteStep_w = byteD.w + this.byteSpacingH * this.zoom;
    const byteStep_h = byteD.h + this.byteSpacingV * this.zoom;
    const byteBl = BYTE_LAYOUTS[this.byteLayout];
    const bCols = byteBl.grid3x3 ? 3 : byteBl.cols;

    const byteCol = Math.floor(inU64X / byteStep_w);
    const byteRow = Math.floor(inU64Y / byteStep_h);
    if (byteCol < 0 || byteCol >= bCols || byteRow < 0) return -1;

    // Reverse-map byte position to byte index
    let byteIdx = -1;
    for (let i = 0; i < 8; i++) {
      const pos = this._bytePosInU64(i);
      if (pos.col === byteCol && pos.row === byteRow) { byteIdx = i; break; }
    }
    if (byteIdx < 0) return -1;

    // Find bit within byte
    const inByteX = inU64X - byteCol * byteStep_w;
    const inByteY = inU64Y - byteRow * byteStep_h;
    const bitStep_w = px + this.bitSpacingH * this.zoom;
    const bitStep_h = px + this.bitSpacingV * this.zoom;
    const bitBl = BIT_LAYOUTS[this.bitLayout];
    const bitCols = bitBl.grid3x3 ? 3 : bitBl.cols;

    const bitCol = Math.floor(inByteX / bitStep_w);
    const bitRow = Math.floor(inByteY / bitStep_h);
    if (bitCol < 0 || bitCol >= bitCols || bitRow < 0) return -1;

    // Reverse-map bit position
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
}

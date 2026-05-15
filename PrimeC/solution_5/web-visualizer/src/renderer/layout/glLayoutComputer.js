/**
 * GL layout parameter computation extracted from SieveRenderer (item 408).
 *
 * computeGlLayoutParams(r) builds the flat GPU-ready layout descriptor used
 * by the GL bit-grid shader pass.  Separated here to keep SieveRenderer.js
 * focused on class structure and state management.
 */
import { BIT_LAYOUTS, BYTE_LAYOUTS, GRID3X3_MAP } from '../constants';

/**
 * Compute the full set of GL layout parameters from the current renderer state.
 * @param {import('../SieveRenderer').SieveRenderer} r
 */
export function computeGlLayoutParams(r) {
  // ── Invariant layout values ──────────────────────────────────────────
  const bitsPerCacheLine = r.bitsPerCacheLine;
  const u64sPerCL  = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
  const vectorGroup = r.vectorGroup;

  const zoom       = r.zoom;
  const pixelSize  = r.pixelSize;
  const px         = pixelSize * zoom;

  const bitSpacingH  = r.bitSpacingH;
  const bitSpacingV  = r.bitSpacingV;
  const byteSpacingH = r.byteSpacingH;
  const byteSpacingV = r.byteSpacingV;
  const u64SpacingH  = r.u64SpacingH;
  const u64SpacingV  = r.u64SpacingV;

  const bitStepX  = (pixelSize + bitSpacingH) * zoom;
  const bitStepY  = (pixelSize + bitSpacingV) * zoom;
  const byteGapX  = (bitSpacingH + byteSpacingH) * zoom;
  const byteGapY  = (bitSpacingV + byteSpacingV) * zoom;
  const u64GapX   = (bitSpacingH + byteSpacingH + u64SpacingH) * zoom;
  const u64GapY   = (bitSpacingV + byteSpacingV + u64SpacingV) * zoom;

  // byteDims
  const bitBl    = BIT_LAYOUTS[r.bitLayout];
  const bitCols  = bitBl.grid3x3 ? 3 : bitBl.cols;
  const bitRows  = bitBl.grid3x3 ? 3 : bitBl.rows;
  const byteDimW = bitCols * px + (bitCols - 1) * bitSpacingH * zoom;
  const byteDimH = bitRows * px + (bitRows - 1) * bitSpacingV * zoom;

  // Build byte-in-u64 lookup tables (8 entries max)
  const byteBl      = BYTE_LAYOUTS[r.byteLayout];
  const activeBytes = Math.max(1, Math.min(8, Math.ceil(r._logicalGroupBits() / 8)));
  const byteColLookup = new Int32Array(8);
  const byteRowLookup = new Int32Array(8);
  let minBCol = Infinity, maxBCol = -Infinity;
  let minBRow = Infinity, maxBRow = -Infinity;
  for (let b = 0; b < activeBytes; b++) {
    let col, row;
    if (byteBl.grid3x3) {
      const cell = GRID3X3_MAP[b];
      col = cell % 3;
      row = Math.floor(cell / 3);
    } else {
      col = b % byteBl.cols;
      row = Math.floor(b / byteBl.cols);
    }
    byteColLookup[b] = col;
    byteRowLookup[b] = row;
    if (col < minBCol) minBCol = col;
    if (col > maxBCol) maxBCol = col;
    if (row < minBRow) minBRow = row;
    if (row > maxBRow) maxBRow = row;
  }

  // u64Dims (derived from byte layout extents)
  const u64Cols  = Number.isFinite(minBCol) ? (maxBCol - minBCol + 1) : (byteBl.grid3x3 ? 3 : byteBl.cols);
  const u64Rows  = Number.isFinite(minBRow) ? (maxBRow - minBRow + 1) : (byteBl.grid3x3 ? 3 : byteBl.rows);
  const u64DimW  = u64Cols * byteDimW + (u64Cols - 1) * byteGapX;
  const u64DimH  = u64Rows * byteDimH + (u64Rows - 1) * byteGapY;

  // vectorDims / steps
  const vecDimW  = vectorGroup * u64DimW + (vectorGroup - 1) * u64GapX;
  const vecStep  = vecDimW + u64GapX;
  const u64Step  = u64DimW + u64GapX;

  // byteSteps
  const byteStepX = byteDimW + byteGapX;
  const byteStepY = byteDimH + byteGapY;

  // numVectorsPerCL and vecPerRow
  const numVecsPerCL = Math.max(1, Math.ceil(u64sPerCL / vectorGroup));
  const vecPerRow    = r._vectorGroupsPerVisualRow();

  // label height and row height
  const labelH     = r._labelHeight();
  const vRowHeight = labelH + u64DimH + u64GapY;

  // Build bit-in-byte lookup tables (always 8 entries)
  const bitColLookup = new Int32Array(8);
  const bitRowLookup = new Int32Array(8);
  for (let b = 0; b < 8; b++) {
    if (bitBl.grid3x3) {
      const cell = GRID3X3_MAP[b];
      bitColLookup[b] = cell % 3;
      bitRowLookup[b] = Math.floor(cell / 3);
    } else {
      bitColLookup[b] = b % bitBl.cols;
      bitRowLookup[b] = Math.floor(b / bitBl.cols);
    }
  }

  // Pack lookup tables as flat Float32Array(16) for gl.uniform2fv().
  const bytePos = new Float32Array(16);
  const bitPos  = new Float32Array(16);
  for (let i = 0; i < 8; i++) {
    bytePos[i * 2]     = byteColLookup[i];
    bytePos[i * 2 + 1] = byteRowLookup[i];
    bitPos[i * 2]      = bitColLookup[i];
    bitPos[i * 2 + 1]  = bitRowLookup[i];
  }

  // ── Viewport culling: compute the visible bit range ─────────────────
  const totalCacheLines  = Math.max(1, Math.ceil(r.bitCount / bitsPerCacheLine));
  const totalVectorSlots = totalCacheLines * numVecsPerCL;
  const totalVRows       = Math.ceil(totalVectorSlots / vecPerRow);
  const ch               = r.canvasHeight || 0;
  let firstBit = 0;
  let endBit   = r.bitCount;
  if (ch > 0 && vRowHeight > 0) {
    const startVRow = Math.max(0, Math.floor(-r.panY / vRowHeight));
    const endVRow   = Math.min(totalVRows, Math.ceil((ch - r.panY) / vRowHeight) + 1);
    const firstCL   = Math.floor(startVRow * vecPerRow / numVecsPerCL);
    const lastCL    = Math.min(Math.ceil(endVRow * vecPerRow / numVecsPerCL), totalCacheLines);
    firstBit        = Math.max(0, firstCL * bitsPerCacheLine);
    endBit          = Math.min(lastCL * bitsPerCacheLine, r.bitCount);
  }

  // ── Downsampling: skip every N-th bit when zoomed out far enough ─────
  // Use canvasSnapDpr (physical device DPR, without SSAA multiplier) so that
  // bitStride – and therefore visual density – stays consistent across SSAA
  // levels and across render modes that clamp canvasDpr differently due to
  // their different CSS canvas sizes (item 502: SSAA zoom invariance).
  const cellSize = px;
  const physCellSize = cellSize * (r.canvasSnapDpr || r.canvasDpr || 1);
  const bitStride    = Math.max(1, Math.min(4, Math.floor(1 / Math.max(0.0625, physCellSize))));
  const instanceCount = Math.max(0, Math.ceil((endBit - firstBit) / bitStride));

  return {
    bitsPerCL:    bitsPerCacheLine,
    u64sPerCL,
    vectorGroup,
    numVecsPerCL,
    vecPerRow,
    vecStep,
    u64Step,
    byteStepX,
    byteStepY,
    bitStepX,
    bitStepY,
    labelH,
    vRowHeight,
    pxHalf: px / 2,
    bytePos,
    bitPos,
    firstBit,
    instanceCount,
    bitStride,
  };
}

import { BIT_LAYOUTS } from '../constants';

export class FrameContextBuilder {
  constructor(host) {
    this.host = host;
  }

  build() {
    const host = this.host;
    const C = host.colors;
    const ctx = host._measureCtx;
    const cw = host.canvasWidth || 0;
    const ch = host.canvasHeight || 0;

    const px = host.pixelSize * host.zoom;
    const bitsPerCacheLine = host.bitsPerCacheLine;
    const totalCacheLines = Math.ceil(host.bitCount / bitsPerCacheLine);
    const rowD = host._rowDims();
    const labelBands = host._labelBands();
    const labelH = host._labelHeight();
    const numVec = host._numVectorsPerRow();
    const totalVectorSlots = totalCacheLines * numVec;
    const vecPerVRow = host._vectorGroupsPerVisualRow();
    const vRowHeight = labelH + rowD.h + host._u64GapY();
    const totalVRows = Math.ceil(totalVectorSlots / vecPerVRow);

    const startVRow = Math.max(0, Math.floor(-host.panY / vRowHeight));
    const endVRow = Math.min(totalVRows, Math.ceil((ch - host.panY) / vRowHeight) + 1);

    const u64D = host._u64Dims();
    const vecD = host._vectorDims();
    const byteD = host._byteDims();
    const bitBl = BIT_LAYOUTS[host.bitLayout];
    const changedColor = host._opColor();
    const bitColors = host._bitColors();

    const showBitLabels = host.showBitLabels && host.zoom >= 6;
    const showNumberLabels = host.showNumberLabels && host.zoom >= 6;
    const showByteLabels = labelBands.showByte;
    const showVectorLabels = labelBands.showVector;

    const u64sPerCL = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
    const u64GapX = host._u64GapX();
    const byteGapX = host._byteGapX();
    const byteGapY = host._byteGapY();
    const bitStepX = host._bitStepX();
    const bitStepY = host._bitStepY();
    const baseAlpha = Math.max(0.12, Math.min(1, host.gridOpacity ?? 1));

    return {
      C, ctx, cw, ch, px,
      bitsPerCacheLine, totalCacheLines, rowD, labelBands, labelH,
      numVec, totalVectorSlots, vecPerVRow, vRowHeight, totalVRows,
      startVRow, endVRow,
      u64D, vecD, byteD, bitBl, changedColor, bitColors,
      showBitLabels, showNumberLabels, showByteLabels, showVectorLabels,
      u64sPerCL, u64GapX, byteGapX, byteGapY, bitStepX, bitStepY, baseAlpha,
      vectorLabelY: vRow => host.panY + vRow * vRowHeight + 1,
      byteLabelY: (vRowBaseY, byteTopY) => Math.max(vRowBaseY + labelBands.vector + 1, byteTopY - labelBands.byteFont - 1),
    };
  }
}

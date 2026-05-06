import { BIT_LAYOUTS, BYTE_LAYOUTS, GRID3X3_MAP } from '../constants';

export class LayoutMetricsEngine {
  constructor(host) {
    this.host = host;
  }

  bitPosInByte(bitInByte) {
    const host = this.host;
    const bitLayout = BIT_LAYOUTS[host.bitLayout];
    if (bitLayout.grid3x3) {
      const cell = GRID3X3_MAP[bitInByte];
      return { col: cell % 3, row: Math.floor(cell / 3) };
    }
    return { col: bitInByte % bitLayout.cols, row: Math.floor(bitInByte / bitLayout.cols) };
  }

  bytePosInU64(byteInU64) {
    const host = this.host;
    const byteLayout = BYTE_LAYOUTS[host.byteLayout];
    if (byteLayout.grid3x3) {
      const cell = GRID3X3_MAP[byteInU64];
      return { col: cell % 3, row: Math.floor(cell / 3) };
    }
    return { col: byteInU64 % byteLayout.cols, row: Math.floor(byteInU64 / byteLayout.cols) };
  }

  bitStepX() {
    const host = this.host;
    return host.pixelSize * host.zoom + host.bitSpacingH * host.zoom;
  }

  bitStepY() {
    const host = this.host;
    return host.pixelSize * host.zoom + host.bitSpacingV * host.zoom;
  }

  byteGapX() {
    const host = this.host;
    return (host.bitSpacingH + host.byteSpacingH) * host.zoom;
  }

  byteGapY() {
    const host = this.host;
    return (host.bitSpacingV + host.byteSpacingV) * host.zoom;
  }

  u64GapX() {
    const host = this.host;
    return (host.bitSpacingH + host.byteSpacingH + host.u64SpacingH) * host.zoom;
  }

  u64GapY() {
    const host = this.host;
    return (host.bitSpacingV + host.byteSpacingV + host.u64SpacingV) * host.zoom;
  }

  byteDims() {
    const host = this.host;
    const bitLayout = BIT_LAYOUTS[host.bitLayout];
    const px = host.pixelSize * host.zoom;
    const cols = bitLayout.grid3x3 ? 3 : bitLayout.cols;
    const rows = bitLayout.grid3x3 ? 3 : bitLayout.rows;
    return {
      w: cols * px + (cols - 1) * host.bitSpacingH * host.zoom,
      h: rows * px + (rows - 1) * host.bitSpacingV * host.zoom,
    };
  }

  u64Dims() {
    const host = this.host;
    const byteDims = this.byteDims();
    const byteLayout = BYTE_LAYOUTS[host.byteLayout];
    const activeBytes = host._logicalBytesPerWord();
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    for (let byteIndex = 0; byteIndex < activeBytes; byteIndex++) {
      const pos = this.bytePosInU64(byteIndex);
      minCol = Math.min(minCol, pos.col);
      maxCol = Math.max(maxCol, pos.col);
      minRow = Math.min(minRow, pos.row);
      maxRow = Math.max(maxRow, pos.row);
    }
    const cols = Number.isFinite(minCol) ? (maxCol - minCol + 1) : (byteLayout.grid3x3 ? 3 : byteLayout.cols);
    const rows = Number.isFinite(minRow) ? (maxRow - minRow + 1) : (byteLayout.grid3x3 ? 3 : byteLayout.rows);
    return {
      w: cols * byteDims.w + (cols - 1) * this.byteGapX(),
      h: rows * byteDims.h + (rows - 1) * this.byteGapY(),
    };
  }

  vectorDims() {
    const host = this.host;
    const u64Dims = this.u64Dims();
    const vectorCount = host.vectorGroup;
    const intraGap = this.u64GapX();
    return {
      w: vectorCount * u64Dims.w + (vectorCount - 1) * intraGap,
      h: u64Dims.h,
      intraGap,
    };
  }

  numVectorsPerRow() {
    const host = this.host;
    const u64sPerCacheLine = Math.max(1, Math.ceil(host.bitsPerCacheLine / 64));
    return Math.max(1, Math.ceil(u64sPerCacheLine / host.vectorGroup));
  }

  totalVectorSlots() {
    const host = this.host;
    const bitsPerCacheLine = host.bitsPerCacheLine;
    const totalCacheLines = Math.max(1, Math.ceil(host.bitCount / bitsPerCacheLine));
    return totalCacheLines * this.numVectorsPerRow();
  }

  vectorGroupsPerVisualRow() {
    const host = this.host;
    if (host.horizontalGroups > 0) return Math.max(1, host.horizontalGroups);
    return Math.max(1, this.cacheLinesPerVisualRow() * this.numVectorsPerRow());
  }

  vectorSlotLayout(globalVectorIndex) {
    const host = this.host;
    const numVec = this.numVectorsPerRow();
    const vecPerRow = this.vectorGroupsPerVisualRow();
    const rowDims = this.rowDims();
    const labelH = this.labelHeight();
    const vecDims = this.vectorDims();
    const vRowHeight = labelH + rowDims.h + this.u64GapY();
    const vRow = Math.floor(globalVectorIndex / vecPerRow);
    const vecInRow = globalVectorIndex % vecPerRow;
    const clIdx = Math.floor(globalVectorIndex / numVec);
    const vecIdxInCL = globalVectorIndex % numVec;
    const rowDataY = host.panY + vRow * vRowHeight + labelH;
    const vecX = host.panX + vecInRow * (vecDims.w + this.u64GapX());
    return { numVec, vecPerRow, rowD: rowDims, labelH, vecD: vecDims, vRowHeight, vRow, vecInRow, clIdx, vecIdxInCL, rowDataY, vecX };
  }

  cacheLinesPerVisualRow() {
    const host = this.host;
    if (host._frozenClPerVRow > 0) return host._frozenClPerVRow;
    return this.computeCacheLinesPerVisualRow();
  }

  computeCacheLinesPerVisualRow() {
    const host = this.host;
    if (host.horizontalGroups > 0) return Math.max(1, host.horizontalGroups);

    const avail = (host.layoutAvailWidth && host.layoutAvailWidth > 0)
      ? host.layoutAvailWidth
      : host.canvasWidth;
    const availH0 = (host.layoutAvailHeight && host.layoutAvailHeight > 0)
      ? host.layoutAvailHeight
      : (host.canvasHeight || 0);

    if (!avail || avail <= 0) return 1;

    const bitsPerCacheLine = host.bitsPerCacheLine;
    const totalCacheLines = Math.max(1, Math.ceil(host.bitCount / bitsPerCacheLine));

    const savedZoom = host.zoom;
    host.zoom = 1;
    const rowW = this.rowDims().w;
    const rowH = this.rowDims().h;
    const labelH = this.labelHeight();
    host.zoom = savedZoom;

    if (rowW <= 0 || rowH <= 0) return 1;

    const availH = Math.max(1, availH0);
    const clStepX = rowW + host.bitSpacingH + host.byteSpacingH + host.u64SpacingH;
    const vRowH = labelH + rowH + host.bitSpacingV + host.byteSpacingV + host.u64SpacingV;
    const maxByWidth = Math.max(1, Math.floor(avail / clStepX));
    const maxCandidate = Math.min(totalCacheLines, Math.max(1, maxByWidth));

    let best = 1;
    let bestScore = Number.POSITIVE_INFINITY;
    const targetAspect = Math.max(0.2, Math.min(5, avail / availH));

    const sectionAnchors = [maxCandidate, Math.floor(maxCandidate / 2), Math.floor(maxCandidate / 4), Math.floor(maxCandidate / 8)]
      .filter((v, i, arr) => v >= 1 && arr.indexOf(v) === i);

    for (let n = 1; n <= maxCandidate; n++) {
      const visualRows = Math.ceil(totalCacheLines / n);
      const layoutW = n * rowW + Math.max(0, n - 1) * (host.bitSpacingH + host.byteSpacingH + host.u64SpacingH);
      const layoutH = visualRows * vRowH;
      if (layoutW <= 0 || layoutH <= 0) continue;

      const layoutAspect = layoutW / layoutH;
      const aspectPenalty = Math.abs(Math.log(layoutAspect / targetAspect));

      const widthFill = Math.min(1, layoutW / avail);
      const heightFill = Math.min(1, layoutH / availH);
      const fillPenalty = 1 - (widthFill * heightFill);

      let sectionBias = 0;
      for (const anchor of sectionAnchors) {
        const dist = Math.abs(n - anchor);
        sectionBias = Math.max(sectionBias, Math.exp(-dist / 2));
      }

      const score = aspectPenalty + fillPenalty * 0.7 - sectionBias * 0.12;
      if (score < bestScore) {
        bestScore = score;
        best = n;
      }
    }

    return Math.max(1, Math.min(maxCandidate, best));
  }

  freezeLayout() {
    this.host._frozenClPerVRow = this.computeCacheLinesPerVisualRow();
  }

  unfreezeLayout() {
    this.host._frozenClPerVRow = 0;
  }

  rowDims() {
    const vecDims = this.vectorDims();
    const vectorCount = this.numVectorsPerRow();
    return {
      w: vectorCount * vecDims.w + (vectorCount - 1) * this.u64GapX(),
      h: vecDims.h,
    };
  }

  labelBands() {
    const host = this.host;
    const showByte = host.showByteLabels && host.zoom >= 4;
    const showVector = host.showVectorLabels;
    const vectorFont = Math.max(4, Math.min(13, host.zoom * 0.84));
    const byteFont = Math.max(4, Math.min(11, host.zoom * 0.72));
    const vector = showVector ? Math.ceil(vectorFont + 6) : 0;
    const byte = showByte ? Math.ceil(byteFont + 5) : 0;
    const byteRows = byte;
    const byteLine = showByte ? Math.ceil(byteFont + 2) : 0;
    return {
      vector,
      byte,
      total: vector + byte,
      vectorFont,
      byteFont,
      byteRows,
      byteLine,
      showVector,
      showByte,
    };
  }

  labelHeight() {
    return this.labelBands().total;
  }
}

export function computeMultiBitBounds(host, startBit, count) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const px = host.pixelSize * host.zoom;

  for (let offset = 0; offset < count; offset++) {
    const pos = host.bitIndexToCanvas(startBit + offset);
    if (!pos) continue;
    minX = Math.min(minX, pos.x - px / 2);
    minY = Math.min(minY, pos.y - px / 2);
    maxX = Math.max(maxX, pos.x + px / 2);
    maxY = Math.max(maxY, pos.y + px / 2);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    w: Math.max(px, maxX - minX),
    h: Math.max(px, maxY - minY),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

export function computeBitVisualRow(host, bitIdx) {
  if (bitIdx < 0 || bitIdx >= host.bitCount) return -1;
  const bitsPerCacheLine = host.bitsPerCacheLine;
  const numVec = host._numVectorsPerRow();
  const vecPerRow = host._vectorGroupsPerVisualRow();
  const clIdx = Math.floor(bitIdx / bitsPerCacheLine);
  const bitInRow = bitIdx % bitsPerCacheLine;
  const u64Idx = Math.floor(bitInRow / 64);
  const vecIdx = Math.floor(u64Idx / host.vectorGroup);
  const globalVectorIndex = clIdx * numVec + vecIdx;
  return Math.floor(globalVectorIndex / vecPerRow);
}

export function computeMultiBitBoundsSegments(host, startBit, count) {
  const endBit = Math.min(host.bitCount, startBit + count);
  if (startBit < 0 || endBit <= startBit) return [];

  const segments = [];
  let segmentStart = startBit;
  let previousRow = computeBitVisualRow(host, startBit);

  for (let bit = startBit + 1; bit < endBit; bit++) {
    const row = computeBitVisualRow(host, bit);
    if (row !== previousRow) {
      const segmentCount = bit - segmentStart;
      const bounds = computeMultiBitBounds(host, segmentStart, segmentCount);
      if (bounds) {
        segments.push({ startBit: segmentStart, count: segmentCount, bounds, row: previousRow });
      }
      segmentStart = bit;
      previousRow = row;
    }
  }

  const finalCount = endBit - segmentStart;
  const finalBounds = computeMultiBitBounds(host, segmentStart, finalCount);
  if (finalBounds) {
    segments.push({ startBit: segmentStart, count: finalCount, bounds: finalBounds, row: previousRow });
  }

  return segments;
}

export function computeElementBounds(host, type, index) {
  if (host.bitCount === 0) return null;

  const px = host.pixelSize * host.zoom;
  const bitsPerCacheLine = host.bitsPerCacheLine;
  const rowD = host._rowDims();
  const labelH = host._labelHeight();
  const vRowHeight = labelH + rowD.h + host._u64GapY();
  const u64D = host._u64Dims();
  const byteD = host._byteDims();
  const vecD = host._vectorDims();
  const vecPerVRow = host._vectorGroupsPerVisualRow();

  if (type === 'bit') {
    const pos = host.bitIndexToCanvas(index);
    if (!pos) return null;
    return { x: pos.x - px / 2, y: pos.y - px / 2, w: px, h: px, cx: pos.x, cy: pos.y };
  }

  if (type === 'byte') return computeMultiBitBounds(host, index * 8, 8);
  if (type === 'uint32') return computeMultiBitBounds(host, index * 32, 32);
  if (type === 'uint64') return computeMultiBitBounds(host, index * 64, 64);

  if (type === 'byte-legacy') {
    const bitStart = index * 8;
    if (bitStart >= host.bitCount) return null;
    const clIdx = Math.floor(bitStart / bitsPerCacheLine);
    const bitInRow = bitStart % bitsPerCacheLine;
    const u64Idx = Math.floor(bitInRow / 64);
    const byteIdx = Math.floor((bitInRow % 64) / 8);
    const vecIdx = Math.floor(u64Idx / host.vectorGroup);
    const intraIdx = u64Idx % host.vectorGroup;
    const globalVectorIndex = clIdx * host._numVectorsPerRow() + vecIdx;
    const vRow = Math.floor(globalVectorIndex / vecPerVRow);
    const vecInRow = globalVectorIndex % vecPerVRow;
    const rowDataY = host.panY + vRow * vRowHeight + labelH;
    const vecX = host.panX + vecInRow * (vecD.w + host._u64GapX());
    const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);
    const bytePos = host._bytePosInU64(byteIdx);
    const bx = u64X + bytePos.col * (byteD.w + host._byteGapX());
    const by = rowDataY + bytePos.row * (byteD.h + host._byteGapY());
    return { x: bx, y: by, w: byteD.w, h: byteD.h, cx: bx + byteD.w / 2, cy: by + byteD.h / 2 };
  }

  if (type === 'vector') {
    const u64Start = index * host.vectorGroup;
    const bitStart = u64Start * 64;
    if (bitStart >= host.bitCount) return null;
    const vRow = Math.floor(index / vecPerVRow);
    const vecInRow = index % vecPerVRow;
    const rowDataY = host.panY + vRow * vRowHeight + labelH;
    const vecX = host.panX + vecInRow * (vecD.w + host._u64GapX());
    return { x: vecX, y: rowDataY, w: vecD.w, h: vecD.h, cx: vecX + vecD.w / 2, cy: rowDataY + vecD.h / 2 };
  }

  if (type === 'cacheline') {
    if (index * bitsPerCacheLine >= host.bitCount) return null;
    const startVectorIndex = index * host._numVectorsPerRow();
    const vRow = Math.floor(startVectorIndex / vecPerVRow);
    const vecInRow = startVectorIndex % vecPerVRow;
    const rowDataY = host.panY + vRow * vRowHeight + labelH;
    const rx = host.panX + vecInRow * (vecD.w + host._u64GapX());
    return { x: rx, y: rowDataY, w: rowD.w, h: rowD.h, cx: rx + rowD.w / 2, cy: rowDataY + rowD.h / 2 };
  }

  return null;
}

// Backward-compatible aliases.
export const multiBitBounds = computeMultiBitBounds;
export const bitVisualRow = computeBitVisualRow;
export const multiBitBoundsSegments = computeMultiBitBoundsSegments;
export const getElementBounds = computeElementBounds;

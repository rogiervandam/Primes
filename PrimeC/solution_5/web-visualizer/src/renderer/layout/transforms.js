import { BIT_LAYOUTS, BYTE_LAYOUTS } from '../constants';

/**
 * Converts a bit index to its canvas (x, y) centre-point.
 * Returns null for out-of-range bit indices.
 *
 * @param {object} host - SieveRenderer instance (duck-typed)
 * @param {number} bitIdx
 * @returns {{ x: number, y: number } | null}
 */
export function bitIndexToCanvas(host, bitIdx) {
  if (bitIdx < 0 || bitIdx >= host.bitCount) return null;

  const bitsPerCacheLine = host.bitsPerCacheLine;
  const rowD = host._rowDims();
  const labelH = host._labelHeight();
  const vRowHeight = labelH + rowD.h + host._u64GapY();
  const u64D = host._u64Dims();
  const byteD = host._byteDims();
  const vecD = host._vectorDims();
  const vecPerRow = host._vectorGroupsPerVisualRow();

  const clIdx = Math.floor(bitIdx / bitsPerCacheLine);
  const bitInRow = bitIdx % bitsPerCacheLine;
  const u64Idx = Math.floor(bitInRow / 64);
  const bitInU64 = bitInRow % 64;
  const byteIdx = Math.floor(bitInU64 / 8);
  const bitInByte = bitInU64 % 8;

  const u64sPerCL = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
  if (u64Idx < 0 || u64Idx >= u64sPerCL) return null;

  const vecIdx = Math.floor(u64Idx / host.vectorGroup);
  const globalVectorIndex = clIdx * host._numVectorsPerRow() + vecIdx;
  const vRow = Math.floor(globalVectorIndex / vecPerRow);
  const vecInRow = globalVectorIndex % vecPerRow;
  const rowDataY = host.panY + vRow * vRowHeight + labelH;

  const intraIdx = u64Idx % host.vectorGroup;
  const vecX = host.panX + vecInRow * (vecD.w + host._u64GapX());
  const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);

  const bytePos = host._bytePosInU64(byteIdx);
  const byteX = u64X + bytePos.col * (byteD.w + host._byteGapX());
  const byteY = rowDataY + bytePos.row * (byteD.h + host._byteGapY());

  const px = host.pixelSize * host.zoom;
  const bitPos = host._bitPosInByte(bitInByte);
  const x = byteX + bitPos.col * host._bitStepX() + px / 2;
  const y = byteY + bitPos.row * host._bitStepY() + px / 2;

  return { x, y };
}

/**
 * Hit-tests a canvas coordinate against the bit grid layout.
 * Returns the global bit index at (canvasX, canvasY), or -1 if none.
 *
 * @param {object} host - SieveRenderer instance (duck-typed)
 * @param {number} canvasX
 * @param {number} canvasY
 * @returns {number}
 */
export function canvasToBitIndex(host, canvasX, canvasY) {
  const bitsPerCacheLine = host.bitsPerCacheLine;
  const rowD = host._rowDims();
  const labelH = host._labelHeight();
  const vRowHeight = labelH + rowD.h + host._u64GapY();
  const u64D = host._u64Dims();
  const byteD = host._byteDims();
  const vecD = host._vectorDims();
  const numVec = host._numVectorsPerRow();
  const vecPerRow = host._vectorGroupsPerVisualRow();
  const vecStep = vecD.w + host._u64GapX();

  const vRow = Math.floor((canvasY - host.panY) / vRowHeight);
  if (vRow < 0) return -1;

  const localY = canvasY - host.panY - vRow * vRowHeight - labelH;
  const localX = canvasX - host.panX;
  if (localX < 0 || localY < 0 || localY > rowD.h) return -1;

  const vecInRow = Math.floor(localX / vecStep);
  if (vecInRow < 0 || vecInRow >= vecPerRow) return -1;
  const globalVectorIndex = vRow * vecPerRow + vecInRow;
  const clIdx = Math.floor(globalVectorIndex / numVec);
  const vecIdx = globalVectorIndex % numVec;
  const rowBitStart = clIdx * bitsPerCacheLine;
  const rowBitStop = Math.min(rowBitStart + bitsPerCacheLine, host.bitCount);
  const inVecX = localX - vecInRow * vecStep;

  // Find which u64 within the vector
  const u64InVecStep = u64D.w + vecD.intraGap;
  const intraIdx = Math.floor(inVecX / u64InVecStep);
  if (intraIdx < 0 || intraIdx >= host.vectorGroup) return -1;

  const u64Idx = vecIdx * host.vectorGroup + intraIdx;
  const u64sPerCL = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
  if (u64Idx >= u64sPerCL) return -1;

  const inU64X = inVecX - intraIdx * u64InVecStep;

  // Find byte within u64
  const byteStep_w = byteD.w + host._byteGapX();
  const byteStep_h = byteD.h + host._byteGapY();
  const byteBl = BYTE_LAYOUTS[host.byteLayout];
  const bCols = byteBl.grid3x3 ? 3 : byteBl.cols;

  const byteCol = Math.floor(inU64X / byteStep_w);
  const byteRow = Math.floor(localY / byteStep_h);
  if (byteCol < 0 || byteCol >= bCols || byteRow < 0) return -1;

  let byteIdx = -1;
  for (let i = 0; i < 8; i++) {
    const pos = host._bytePosInU64(i);
    if (pos.col === byteCol && pos.row === byteRow) { byteIdx = i; break; }
  }
  if (byteIdx < 0) return -1;

  // Find bit within byte
  const inByteX = inU64X - byteCol * byteStep_w;
  const inByteY = localY - byteRow * byteStep_h;
  const bitBl = BIT_LAYOUTS[host.bitLayout];
  const bitCols = bitBl.grid3x3 ? 3 : bitBl.cols;

  const bitCol = Math.floor(inByteX / host._bitStepX());
  const bitRow = Math.floor(inByteY / host._bitStepY());
  if (bitCol < 0 || bitCol >= bitCols || bitRow < 0) return -1;

  let bitInByte = -1;
  for (let i = 0; i < 8; i++) {
    const pos = host._bitPosInByte(i);
    if (pos.col === bitCol && pos.row === bitRow) { bitInByte = i; break; }
  }
  if (bitInByte < 0) return -1;

  const globalBit = clIdx * bitsPerCacheLine + u64Idx * 64 + byteIdx * 8 + bitInByte;
  if (globalBit >= rowBitStop) return -1;
  if (globalBit < 0 || globalBit >= host.bitCount) return -1;
  return globalBit;
}

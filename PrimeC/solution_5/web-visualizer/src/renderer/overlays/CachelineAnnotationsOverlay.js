/**
 * CachelineAnnotationsOverlay — draws the per-cacheline "×N Δstep" badges
 * shown when the heat map is enabled and `cachelineAnnotation !== 'none'`.
 *
 * Same Pattern D shape as the other overlays in this folder
 * (`SearchOverlay`, `MaskWriteOverlay`, `VectorTouchOrderOverlay`):
 * stateless class that pulls every input through duck-typed accessors on
 * the host renderer at render time. Keeps the heat-map data
 * (`clHitCount`, `clLastHitStep`, `heatMapCurrentStep`,
 * `_cachelineHeatOverlayColor`) on the renderer because it is shared
 * with `_renderCachelineHeatOverlay` and the cacheline outline pass.
 *
 * Required host accessors / fields:
 *   - host.heatMapEnabled, host.cachelineAnnotation
 *   - host.clHitCount, host.clLastHitStep, host.heatMapCurrentStep
 *   - host.cachelineSize, host.bitsPerCacheLine, host.bitCount
 *   - host.canvas, host.panX, host.panY
 *   - host._vectorDims(), host._rowDims(), host._labelHeight()
 *   - host._numVectorsPerRow(), host._vectorGroupsPerVisualRow()
 *   - host._u64GapX(), host._u64GapY()
 *   - host._cachelineHeatOverlayColor(phyClIdx)
 *   - host._fitLabelFontSize(ctx, text, maxW, preferred, min, weight)
 *   - host._labelTextColor([r, g, b])
 *
 * See docs/AI_MAINTENANCE.md §7 for the overlay backlog status.
 */
export class CachelineAnnotationsOverlay {
  constructor(host) {
    this.host = host;
  }

  render(ctx) {
    const host = this.host;
    if (!host.heatMapEnabled || !host.clHitCount) return;
    const mode = host.cachelineAnnotation;
    if (!mode || mode === 'none') return;

    const phyBitsPerCL    = host.cachelineSize * 8;
    const bitsPerCacheLine = host.bitsPerCacheLine;
    const numPhyCL        = host.clHitCount.length;
    const totalLogCL      = Math.ceil(host.bitCount / bitsPerCacheLine);

    const vecD       = host._vectorDims();
    const rowD       = host._rowDims();
    const labelH     = host._labelHeight();
    const numVec     = host._numVectorsPerRow();
    const vecPerVRow = host._vectorGroupsPerVisualRow();
    const vRowHeight = labelH + rowD.h + host._u64GapY();
    const vecStep    = vecD.w + host._u64GapX();
    const pad        = 1;

    const ch = host.canvas.height / (window.devicePixelRatio || 1);
    const startVRow = Math.max(0, Math.floor(-host.panY / vRowHeight));
    const endVRow   = Math.ceil((ch - host.panY) / vRowHeight) + 1;

    const firstVisLogCL = startVRow * vecPerVRow / numVec;
    const lastVisLogCL  = endVRow   * vecPerVRow / numVec;
    const firstVisPhy   = Math.max(0,           Math.floor(firstVisLogCL * bitsPerCacheLine / phyBitsPerCL));
    const lastVisPhy    = Math.min(numPhyCL - 1, Math.ceil(lastVisLogCL  * bitsPerCacheLine / phyBitsPerCL));

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    for (let phyClIdx = firstVisPhy; phyClIdx <= lastVisPhy; phyClIdx++) {
      const oc = host._cachelineHeatOverlayColor(phyClIdx);
      if (!oc) continue;

      const hitCount = host.clHitCount[phyClIdx];
      const lastStep = host.clLastHitStep[phyClIdx];
      const showHits = mode === 'hits' || mode === 'both';
      const showAge  = mode === 'age'  || mode === 'both';
      const hitsStr  = showHits ? `\u00d7${hitCount}` : '';
      const ageStr   = showAge
        ? (lastStep >= 0 ? `\u0394${host.heatMapCurrentStep - lastStep}` : '\u0394\u2014')
        : '';
      const text = hitsStr && ageStr ? `${hitsStr} ${ageStr}` : (hitsStr || ageStr);
      if (!text) continue;

      const phyBitStart = phyClIdx * phyBitsPerCL;
      const phyBitEnd   = Math.min(host.bitCount, phyBitStart + phyBitsPerCL);
      const firstLogCL  = Math.floor(phyBitStart / bitsPerCacheLine);
      const lastLogCL   = Math.min(totalLogCL - 1, Math.floor((phyBitEnd - 1) / bitsPerCacheLine));

      // Build segments (same logic as heat overlay)
      const segments = [];
      let segVRow = -1, segVecStart = -1, segVecEnd = -1;
      for (let logCL = firstLogCL; logCL <= lastLogCL; logCL++) {
        const globalVecIdx = logCL * numVec;
        const vRow      = Math.floor(globalVecIdx / vecPerVRow);
        const vecInRow  = globalVecIdx % vecPerVRow;
        const vecInRowEnd = vecInRow + numVec - 1;
        if (vRow !== segVRow) {
          if (segVRow >= 0 && segVRow >= startVRow && segVRow < endVRow)
            segments.push({ vRow: segVRow, vecStart: segVecStart, vecEnd: segVecEnd });
          segVRow = vRow; segVecStart = vecInRow;
        }
        segVecEnd = vecInRowEnd;
      }
      if (segVRow >= 0 && segVRow >= startVRow && segVRow < endVRow)
        segments.push({ vRow: segVRow, vecStart: segVecStart, vecEnd: segVecEnd });

      // Find the largest segment to draw the badge on
      let bestSeg = segments[0];
      for (const s of segments)
        if ((s.vecEnd - s.vecStart) > (bestSeg.vecEnd - bestSeg.vecStart)) bestSeg = s;
      if (!bestSeg) continue;

      const rx = Math.round(host.panX + bestSeg.vecStart * vecStep - pad);
      const ry = Math.round(host.panY + bestSeg.vRow * vRowHeight + labelH - pad);
      const rw = Math.max(1, Math.round((bestSeg.vecEnd - bestSeg.vecStart + 1) * vecStep - host._u64GapX() + pad * 2));
      const rh = Math.max(1, Math.round(rowD.h + pad * 2));

      if (rw < 18 || rh < 10) continue;

      const padBX = 5, padBY = 3;
      const maxLabelW = rw - padBX * 2 - 2;
      // Prefer up to 45% of the row height, cap at 14px
      const preferredFs = Math.min(rh * 0.45, 14);
      const fs = host._fitLabelFontSize(ctx, text, maxLabelW, preferredFs, 6, '600 ');
      if (fs <= 0) continue;

      ctx.font = `400 ${fs}px Helvetica, Arial, sans-serif`;
      const tw  = ctx.measureText(text).width;
      const bw  = Math.min(rw - 4, tw + padBX * 2);
      const bh  = fs + padBY * 2;
      const bx  = rx + (rw - bw) / 2;
      // Place badge near the bottom of the cell, with a small inset margin
      // so it stays within the cacheline outline boundary.
      const by  = ry + rh - bh - Math.max(2, rh * 0.05);

      const fillAlpha = Math.min(0.97, Math.max(0.82, oc.alpha * 2 + 0.5));
      ctx.fillStyle = `rgba(${oc.r},${oc.g},${oc.b},${fillAlpha})`;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, Math.min(5, bh * 0.4));
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = host._labelTextColor([oc.r, oc.g, oc.b]);
      ctx.fillText(text, bx + bw / 2, by + bh / 2);
    }

    ctx.restore();
  }
}

export default CachelineAnnotationsOverlay;

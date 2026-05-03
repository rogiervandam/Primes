/**
 * CachelineAnnotationsOverlay — draws per-cacheline "cache ×N Δstep" badges.
 *
 * Shown whenever `cachelineAnnotation !== 'none'` and hit-count data is
 * available — does NOT require `heatMapEnabled`. When the heat overlay is
 * off the badge uses a neutral slate colour instead of the heat gradient.
 * `Visualizer.jsx` ensures `rebuildHeatMap` is called whenever
 * `cachelineAnnotation !== 'none'` so `clHitCount` is always populated.
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

/** Neutral badge colour used when the heat overlay is disabled. */
const NEUTRAL_BADGE = { r: 100, g: 116, b: 139 }; // slate-500

export class CachelineAnnotationsOverlay {
  constructor(host) {
    this.host = host;
  }

  render(ctx, glCtx = null) {
    const host = this.host;
    // clHitCount is populated by rebuildHeatMap (called unconditionally
    // when cachelineAnnotation !== 'none' by Visualizer.jsx).
    if (!host.clHitCount) return;
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
      const hitCount = host.clHitCount[phyClIdx];
      if (!hitCount || hitCount <= 0) continue;

      // Badge fill colour: use heat gradient when heatmap is on, neutral slate otherwise.
      let bc; // { r, g, b, alpha }
      if (host.heatMapEnabled) {
        const oc = host._cachelineHeatOverlayColor(phyClIdx);
        if (!oc) continue;
        bc = { r: oc.r, g: oc.g, b: oc.b, alpha: Math.min(0.97, Math.max(0.82, oc.alpha * 2 + 0.5)) };
      } else {
        bc = { ...NEUTRAL_BADGE, alpha: 0.82 };
      }

      const lastStep = host.clLastHitStep[phyClIdx];
      const showHits = mode === 'hits' || mode === 'both';
      const showAge  = mode === 'age'  || mode === 'both';
      const hitPart  = showHits ? `\u00d7${hitCount}` : '';
      const agePart  = showAge
        ? (lastStep >= 0 ? `\u0394${host.heatMapCurrentStep - lastStep}` : '\u0394\u2014')
        : '';
      const mainText = hitPart && agePart ? `${hitPart} ${agePart}` : (hitPart || agePart);
      const text = mainText ? `cache ${mainText}` : '';
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

      const padBX = 6, padBY = 2;
      const maxLabelW = rw - padBX * 2 - 2;
      // Extension zone below the bit cells (mirrors annotBottomExtra in _renderCachelineOutline).
      // Badge is placed centred in this zone so it never overlaps the bit cells.
      const annotExt = Math.min(28, Math.max(16, rowD.h * 0.24));
      const maxBh = annotExt - 2; // 1px top + 1px bottom margin within the zone
      const preferredFs = Math.min(maxBh - padBY * 2, 12);
      const fs = host._fitLabelFontSize(ctx, text, maxLabelW, preferredFs, 7, '600 ');
      if (fs <= 0) continue;

      ctx.font = `500 ${fs}px Helvetica, Arial, sans-serif`;
      const tw  = ctx.measureText(text).width;
      const bw  = Math.min(rw - 4, tw + padBX * 2);
      const bh  = fs + padBY * 2;
      const bx  = rx + (rw - bw) / 2;
      // Place badge centred in the extension zone directly below the bit cells.
      const by  = ry + rh + Math.max(0, (annotExt - bh) / 2);

      if (glCtx) {
        const [lr, lg, lb, la] = host._labelTextColorGL([bc.r, bc.g, bc.b]);
        glCtx.drawFilledRect(bx, by, bw, bh, bc.r / 255, bc.g / 255, bc.b / 255, Math.min(0.98, bc.alpha + 0.06));
        glCtx.drawOutlineRect(bx, by, bw, bh, 15 / 255, 23 / 255, 42 / 255, 0.58, 1.1);
        glCtx.drawText(text, Math.round(bx + bw / 2), Math.round(by + bh / 2), fs, lr, lg, lb, Math.min(1, la + 0.08), 'center', 'middle');
      } else {
        ctx.fillStyle = `rgba(${bc.r},${bc.g},${bc.b},${bc.alpha})`;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, Math.min(5, bh * 0.4));
        ctx.fill();
        ctx.strokeStyle = 'rgba(15,23,42,0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = host._labelTextColor([bc.r, bc.g, bc.b]);
        ctx.fillText(text, bx + bw / 2, by + bh / 2);
      }
    }

    ctx.restore();
  }
}

export default CachelineAnnotationsOverlay;

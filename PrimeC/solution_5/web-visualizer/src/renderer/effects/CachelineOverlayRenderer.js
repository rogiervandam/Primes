export class CachelineOverlayRenderer {
  constructor(host) {
    this.host = host;
  }

  renderHeatOverlay() {
    const host = this.host;
    if (!host.isHeatMapEnabled || !host.clHitCount) return;

    const physicalBitsPerCacheline = host.cachelineSize * 8;
    const bitsPerCacheLine = host.bitsPerCacheLine;
    const numPhysicalCachelines = host.clHitCount.length;
    const totalLogicalCachelines = Math.ceil(host.bitCount / bitsPerCacheLine);

    const vecD = host._vectorDims();
    const rowD = host._rowDims();
    const labelH = host._labelHeight();
    const numVec = host._numVectorsPerRow();
    const vecPerVisualRow = host._vectorGroupsPerVisualRow();
    const visualRowHeight = labelH + rowD.h + host._u64GapY();
    const vecStep = vecD.w + host._u64GapX();
    const px = host.pixelSize * host.zoom;
    const pad = 1;

    const canvasHeight = host.canvasHeight || 0;
    const startVisualRow = Math.max(0, Math.floor(-host.panY / visualRowHeight));
    const endVisualRow = Math.ceil((canvasHeight - host.panY) / visualRowHeight) + 1;

    const firstVisibleLogicalCacheline = startVisualRow * vecPerVisualRow / numVec;
    const lastVisibleLogicalCacheline = endVisualRow * vecPerVisualRow / numVec;
    const firstVisiblePhysical = Math.max(0, Math.floor(firstVisibleLogicalCacheline * bitsPerCacheLine / physicalBitsPerCacheline));
    const lastVisiblePhysical = Math.min(numPhysicalCachelines - 1, Math.ceil(lastVisibleLogicalCacheline * bitsPerCacheLine / physicalBitsPerCacheline));

    const lineWidth = Math.max(0.8, Math.min(2.4, px * 0.10));

    for (let physicalCachelineIndex = firstVisiblePhysical; physicalCachelineIndex <= lastVisiblePhysical; physicalCachelineIndex++) {
      const overlayColor = host._cachelineHeatOverlayColor(physicalCachelineIndex);
      if (!overlayColor) continue;

      const borderAlpha = Math.max(0.30, Math.min(0.92, overlayColor.alpha * 1.8 + 0.22));

      const physicalBitStart = physicalCachelineIndex * physicalBitsPerCacheline;
      const physicalBitEnd = Math.min(host.bitCount, physicalBitStart + physicalBitsPerCacheline);
      const firstLogicalCacheline = Math.floor(physicalBitStart / bitsPerCacheLine);
      const lastLogicalCacheline = Math.min(totalLogicalCachelines - 1, Math.floor((physicalBitEnd - 1) / bitsPerCacheLine));

      const segments = [];
      let segmentVisualRow = -1;
      let segmentVectorStart = -1;
      let segmentVectorEnd = -1;

      for (let logicalCacheline = firstLogicalCacheline; logicalCacheline <= lastLogicalCacheline; logicalCacheline++) {
        const globalVectorIndex = logicalCacheline * numVec;
        const visualRow = Math.floor(globalVectorIndex / vecPerVisualRow);
        const vectorInRow = globalVectorIndex % vecPerVisualRow;
        const vectorInRowEnd = vectorInRow + numVec - 1;

        if (visualRow !== segmentVisualRow) {
          if (segmentVisualRow >= 0 && segmentVisualRow >= startVisualRow && segmentVisualRow < endVisualRow) {
            segments.push({ visualRow: segmentVisualRow, vectorStart: segmentVectorStart, vectorEnd: segmentVectorEnd });
          }
          segmentVisualRow = visualRow;
          segmentVectorStart = vectorInRow;
        }
        segmentVectorEnd = vectorInRowEnd;
      }
      if (segmentVisualRow >= 0 && segmentVisualRow >= startVisualRow && segmentVisualRow < endVisualRow) {
        segments.push({ visualRow: segmentVisualRow, vectorStart: segmentVectorStart, vectorEnd: segmentVectorEnd });
      }

      if (segments.length === 0) continue;

      const glyph = host._glyph;
      for (const segment of segments) {
        const rectX = Math.round(host.panX + segment.vectorStart * vecStep - pad);
        const rectY = Math.round(host.panY + segment.visualRow * visualRowHeight + labelH - pad);
        const rectW = Math.max(1, Math.round((segment.vectorEnd - segment.vectorStart + 1) * vecStep - host._u64GapX() + pad * 2));
        const rectH = Math.max(1, Math.round(rowD.h + pad * 2));

        if (overlayColor.alpha > 0.01) {
          glyph.drawFilledRect(rectX, rectY, rectW, rectH, overlayColor.r / 255, overlayColor.g / 255, overlayColor.b / 255, overlayColor.alpha);
        }
        glyph.drawOutlineRect(rectX + 0.5, rectY + 0.5, Math.max(1, rectW - 1), Math.max(1, rectH - 1),
          overlayColor.r / 255, overlayColor.g / 255, overlayColor.b / 255, borderAlpha, lineWidth);
      }
    }
  }

  renderOutline() {
    const host = this.host;
    if (!host.outlineEnabled || !host.outlineTargets?.has('cacheline')) return;

    const physicalBitsPerCacheline = host.cachelineSize * 8;
    const bitsPerCacheLine = host.bitsPerCacheLine;
    const numPhysicalCachelines = Math.ceil(host.bitCount / physicalBitsPerCacheline);
    const totalLogicalCachelines = Math.ceil(host.bitCount / bitsPerCacheLine);

    const vecD = host._vectorDims();
    const rowD = host._rowDims();
    const labelH = host._labelHeight();
    const numVec = host._numVectorsPerRow();
    const vecPerVisualRow = host._vectorGroupsPerVisualRow();
    const visualRowHeight = labelH + rowD.h + host._u64GapY();
    const vecStep = vecD.w + host._u64GapX();

    const pad = host._outlinePadding();
    const topExtra = host._outlineTopExtra('cacheline');
    const annotationsActive = host.cachelineAnnotation && host.cachelineAnnotation !== 'none';
      // item 250: clamp annotationBottomExtra so the bottom of one row's outline
      // never extends past the top of the next row's outline.  At low zoom levels
      // u64GapY shrinks quickly, so we cap by the available inter-row gap.
      const maxBottomExtra = Math.max(0, host._u64GapY() - pad + Math.max(0, labelH - topExtra));
      const annotationBottomExtra = annotationsActive ? Math.min(22, Math.min(maxBottomExtra, Math.max(0, rowD.h * 0.18))) : 0;
    const canvasHeight = host.canvasHeight || 0;
    const startVisualRow = Math.max(0, Math.floor(-host.panY / visualRowHeight));
    const endVisualRow = Math.ceil((canvasHeight - host.panY) / visualRowHeight) + 1;

    const firstVisiblePhysical = Math.max(0, Math.floor(startVisualRow * vecPerVisualRow / numVec * bitsPerCacheLine / physicalBitsPerCacheline));
    const lastVisiblePhysical = Math.min(numPhysicalCachelines - 1, Math.ceil(endVisualRow * vecPerVisualRow / numVec * bitsPerCacheLine / physicalBitsPerCacheline));

    for (let physicalCachelineIndex = firstVisiblePhysical; physicalCachelineIndex <= lastVisiblePhysical; physicalCachelineIndex++) {
      const physicalBitStart = physicalCachelineIndex * physicalBitsPerCacheline;
      const physicalBitEnd = Math.min(host.bitCount, physicalBitStart + physicalBitsPerCacheline);
      const firstLogicalCacheline = Math.floor(physicalBitStart / bitsPerCacheLine);
      const lastLogicalCacheline = Math.min(totalLogicalCachelines - 1, Math.floor((physicalBitEnd - 1) / bitsPerCacheLine));

      const segments = [];
      let segmentVisualRow = -1;
      let segmentVectorStart = -1;
      let segmentVectorEnd = -1;

      for (let logicalCacheline = firstLogicalCacheline; logicalCacheline <= lastLogicalCacheline; logicalCacheline++) {
        const globalVectorIndex = logicalCacheline * numVec;
        const visualRow = Math.floor(globalVectorIndex / vecPerVisualRow);
        const vectorInRow = globalVectorIndex % vecPerVisualRow;
        const vectorInRowEnd = vectorInRow + numVec - 1;

        if (visualRow !== segmentVisualRow) {
          if (segmentVisualRow >= 0 && segmentVisualRow >= startVisualRow && segmentVisualRow < endVisualRow) {
            segments.push({ visualRow: segmentVisualRow, vectorStart: segmentVectorStart, vectorEnd: segmentVectorEnd });
          }
          segmentVisualRow = visualRow;
          segmentVectorStart = vectorInRow;
        }
        segmentVectorEnd = vectorInRowEnd;
      }
      if (segmentVisualRow >= 0 && segmentVisualRow >= startVisualRow && segmentVisualRow < endVisualRow) {
        segments.push({ visualRow: segmentVisualRow, vectorStart: segmentVectorStart, vectorEnd: segmentVectorEnd });
      }

      for (const segment of segments) {
        const x = host.panX + segment.vectorStart * vecStep - pad;
        const y = host.panY + segment.visualRow * visualRowHeight + labelH - pad - topExtra;
        const w = (segment.vectorEnd - segment.vectorStart + 1) * vecStep - host._u64GapX() + pad * 2;
        const h = rowD.h + pad * 2 + topExtra + annotationBottomExtra;
        if (host._glyph) {
          const [or, og, ob, oa] = host._outlineColorGL();
          const cfg = host._outlineConfig();
          host._glyph.drawOutlineRect(x, y, w, h, or, og, ob, oa, cfg.lineWidth);
        }
      }
    }
  }
}

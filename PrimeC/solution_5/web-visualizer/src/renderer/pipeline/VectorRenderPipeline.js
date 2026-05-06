import { bitToNumber } from '../bitMath';
import { drawBitOverlayIndicator } from '../bits/overlayIndicators';

export class VectorRenderPipeline {
  constructor(host) {
    this.host = host;
  }

  renderVisualRow(frame, visualRow) {
    const host = this.host;
    const visualRowBaseY = host.panY + visualRow * frame.vRowHeight;
    const visualRowDataY = visualRowBaseY + frame.labelH;
    if (visualRowDataY + frame.rowD.h < 0 || visualRowBaseY > frame.ch) return;

    for (let vectorInRow = 0; vectorInRow < frame.vecPerVRow; vectorInRow++) {
      const globalVectorIndex = visualRow * frame.vecPerVRow + vectorInRow;
      if (globalVectorIndex >= frame.totalVectorSlots) break;
      if (this.renderVector(frame, visualRow, vectorInRow, globalVectorIndex, visualRowBaseY, visualRowDataY) === false) {
        break;
      }
    }
  }

  renderVector(frame, visualRow, vectorInRow, globalVectorIndex, visualRowBaseY, visualRowDataY) {
    const host = this.host;
    const cachelineIndex = Math.floor(globalVectorIndex / frame.numVec);
    if (cachelineIndex >= frame.totalCacheLines) return false;

    const vectorIndexInCacheline = globalVectorIndex % frame.numVec;
    const vectorX = host.panX + vectorInRow * (frame.vecD.w + frame.u64GapX);
    const rowBitStart = cachelineIndex * frame.bitsPerCacheLine;
    const rowBitStop = Math.min(rowBitStart + frame.bitsPerCacheLine, host.bitCount);
    const u64Start = vectorIndexInCacheline * host.vectorGroup;
    const bitStart = rowBitStart + u64Start * 64;
    const bitEnd = Math.min(bitStart + host.vectorGroup * 64 - 1, rowBitStop - 1, host.bitCount - 1);
    if (bitStart >= rowBitStop) return true;

    if (frame.showVectorLabels) {
      const label = `${host._groupLabel(globalVectorIndex)} bits ${bitStart}-${bitEnd}`;
      const labelX = Math.round(vectorX);
      const labelY = Math.round(frame.vectorLabelY(visualRow));
      if (labelX + frame.vecD.w > 0 && labelX < frame.cw && visualRowBaseY >= -frame.labelH && visualRowBaseY < frame.ch) {
        if (host._glyph) {
          const [lr, lg, lb, la] = host._parseCssColorGL(frame.C.LABEL_COLOR);
          host._glyph.drawFittedText(label, labelX + 1, labelY, frame.labelBands.vectorFont, Math.max(8, frame.vecD.w - 4), lr, lg, lb, la, 'left', 'top', 3.5);
        }
      }
    }

    for (let intraIndex = 0; intraIndex < host.vectorGroup; intraIndex++) {
      const u64Index = u64Start + intraIndex;
      if (u64Index >= frame.u64sPerCL) break;
      const u64BitStart = rowBitStart + u64Index * 64;
      if (u64BitStart >= rowBitStop) break;
      this.renderVectorU64(frame, vectorX, visualRowDataY, visualRowBaseY, intraIndex, u64BitStart, rowBitStop);
    }
    return true;
  }

  renderVectorU64(frame, vectorX, visualRowDataY, visualRowBaseY, intraIndex, u64BitStart, rowBitStop) {
    const host = this.host;
    const u64X = vectorX + intraIndex * (frame.u64D.w + frame.vecD.intraGap);

    if (host.outlineEnabled && host.outlineTargets?.has('vector') && intraIndex === 0 && host._glyph) {
      const pad = host._outlinePadding();
      const topExtra = host._outlineTopExtra('vector');
      const [or, og, ob, oa] = host._outlineColorGL();
      const cfg = host._outlineConfig();
      host._glyph.drawOutlineRect(vectorX - pad, visualRowDataY - pad - topExtra, frame.vecD.w + 2 * pad, frame.vecD.h + 2 * pad + topExtra, or, og, ob, oa, cfg.lineWidth);
    }

    for (let byteIndex = 0; byteIndex < 8; byteIndex++) {
      const byteBitStart = u64BitStart + byteIndex * 8;
      if (byteBitStart >= rowBitStop) break;
      this.renderVectorByte(frame, u64X, visualRowDataY, visualRowBaseY, byteIndex, byteBitStart, rowBitStop);
    }
  }

  renderVectorByte(frame, u64X, visualRowDataY, visualRowBaseY, byteIndex, byteBitStart, rowBitStop) {
    const host = this.host;
    const bytePos = host._bytePosInU64(byteIndex);
    const byteX = u64X + bytePos.col * (frame.byteD.w + frame.byteGapX);
    const byteY = visualRowDataY + bytePos.row * (frame.byteD.h + frame.byteGapY);

    if (host.outlineEnabled && host.outlineTargets?.has('byte') && host._glyph) {
      const pad = host._outlinePadding();
      const topExtra = host._outlineTopExtra('byte');
      const [or, og, ob, oa] = host._outlineColorGL();
      const cfg = host._outlineConfig();
      host._glyph.drawOutlineRect(byteX - pad, byteY - pad - topExtra, frame.byteD.w + 2 * pad, frame.byteD.h + 2 * pad + topExtra, or, og, ob, oa, cfg.lineWidth);
    }

    if (frame.showByteLabels && host._glyph) {
      const byteLabel = `Byte ${host._byteLabelValue(byteBitStart)}`;
      const [lr, lg, lb, la] = host._parseCssColorGL(frame.C.LABEL_COLOR);
      host._glyph.drawFittedText(byteLabel, Math.round(byteX) + 1, Math.round(frame.byteLabelY(visualRowBaseY, byteY)), frame.labelBands.byteFont, Math.max(8, frame.byteD.w - 4), lr, lg, lb, la, 'left', 'top', 3.5);
    }

    for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
      const globalBit = byteBitStart + bitIndex;
      if (globalBit >= rowBitStop || globalBit >= host.bitCount) break;
      if (frame.bitBl.grid3x3 && bitIndex >= 8) continue;

      const bitPos = host._bitPosInByte(bitIndex);
      const bitX = byteX + bitPos.col * frame.bitStepX;
      const bitY = byteY + bitPos.row * frame.bitStepY;
      if (bitX + frame.px < 0 || bitX > frame.cw || bitY + frame.px < 0 || bitY > frame.ch) continue;

      this.renderBitCell(frame, globalBit, bitIndex, bitX, bitY);
    }
  }

  renderBitCell(frame, globalBit, bitIndex, bitX, bitY) {
    const cls = this.classifyBit(frame, globalBit);
    const draw = this.computeBitDrawState(frame, globalBit, cls.isSetBit, cls.isChangedBit, bitX, bitY);
    this.drawBitBody(frame, cls, draw, bitX, bitY);
    this.drawDebugCellOutline(frame, draw, bitX, bitY);
    if (cls.isGhostMaskedBit) this.drawGhostMaskHighlight(frame, draw);
    this.drawBitTargetOutline(frame, globalBit, draw, cls.targetHitCount);
    this.drawBitPrimeOverlay(frame, globalBit, bitX, bitY);
    this.drawBitRangeOverlay(frame, globalBit, bitX, bitY);
    this.drawBitMultiplesOverlay(frame, globalBit, bitX, bitY);
    this.drawBitLabels(frame, globalBit, bitIndex, cls, draw, bitX, bitY);
  }

  classifyBit(frame, globalBit) {
    const host = this.host;
    const inFocusRange = host._isInFocusRange(globalBit);
    const targetHitCount = host.targetHitCounts?.get(globalBit) || 0;
    const isSetBit = !!host.bitState[globalBit];
    const isGhostMaskedBit = host.maskGhostBits?.has(globalBit) && isSetBit;
    const isChangedBit = host.changedBits.has(globalBit);
    const isRepeatedWrite = (targetHitCount > 1) || host.repeatedChangedBits?.has(globalBit);

    let color;
    if (isGhostMaskedBit) {
      color = frame.bitColors.cleared;
    } else if (isChangedBit) {
      color = isRepeatedWrite ? [245, 158, 11] : frame.changedColor;
    } else if (isSetBit) {
      color = frame.bitColors.set;
    } else {
      color = frame.bitColors.cleared;
    }
    const bitAlpha = (!isChangedBit && !isGhostMaskedBit && !isRepeatedWrite) ? frame.baseAlpha : 1;
    return { color, inFocusRange, targetHitCount, isGhostMaskedBit, isChangedBit, isRepeatedWrite, isSetBit, bitAlpha };
  }

  computeBitDrawState(frame, globalBit, isSetBit, isChangedBit, bitX, bitY) {
    const px = frame.px;
    const drawSize = Math.max(1, Math.round(px));
    const drawX = Math.round(bitX);
    const drawY = Math.round(bitY);
    return { drawX, drawY, drawSize };
  }

  drawBitBody(frame, cls, draw, bitX, bitY) {
    // GL fills the cell via the instanced quad shader (stateTex color lookup).
  }

  drawDebugCellOutline(frame, draw, bitX, bitY) {
    const host = this.host;
    if (!host.debugAllCellOutlines) return;
    const x = Number.isFinite(draw?.drawX) ? draw.drawX : bitX;
    const y = Number.isFinite(draw?.drawY) ? draw.drawY : bitY;
    const size = Math.max(1, Number.isFinite(draw?.drawSize) ? draw.drawSize : frame.px);
    const lineWidth = Math.max(0.75, Math.min(1.25, 0.85 + (host.zoom || 1) * 0.015));
    const glyph = host._glyph;
    if (!glyph) return;
    const [cr, cg, cb, ca] = host._parseCssColorGL(host.debugAllCellOutlineColor || 'rgba(255,255,255,0.82)');
    glyph.drawOutlineRect(x + 0.5, y + 0.5, Math.max(0, size - 1), Math.max(0, size - 1), cr, cg, cb, ca, lineWidth);
  }

  drawGhostMaskHighlight(frame, draw) {
    const host = this.host;
    const { drawX, drawY, drawSize } = draw;
    const px = frame.px;
    const set = frame.bitColors.set;
    if (!host._glyph) return;
    const glyph = host._glyph;
    const lineWidth = Math.max(0.7, Math.min(1.6, px * 0.12));
    glyph.drawFilledRect(drawX, drawY, drawSize, drawSize, set[0] / 255, set[1] / 255, set[2] / 255, 0.2);
    glyph.drawOutlineRect(
      Math.round(drawX - 0.5), Math.round(drawY - 0.5),
      Math.max(2, Math.round(drawSize + 1)), Math.max(2, Math.round(drawSize + 1)),
      set[0] / 255, set[1] / 255, set[2] / 255, 0.95, lineWidth,
    );
  }

  drawBitTargetOutline(frame, globalBit, draw, targetHitCount) {
    const host = this.host;
    const showTargetOutline = host.targetBits?.has(globalBit)
      && !host.maskGhostBits?.has(globalBit)
      && host.zoom >= 1.4
      && frame.px >= 2.5;
    if (!showTargetOutline) return;
    const { drawX, drawY, drawSize } = draw;
    const px = frame.px;
    const lineWidthOuter = Math.max(0.35, Math.min(1.25, px * 0.08));
    if (!host._glyph) return;
    const glyph = host._glyph;
    glyph.drawOutlineRect(
      Math.round(drawX - 0.5), Math.round(drawY - 0.5),
      Math.max(2, Math.round(drawSize + 1)), Math.max(2, Math.round(drawSize + 1)),
      59 / 255, 130 / 255, 246 / 255, 0.95, lineWidthOuter,
    );
    if (targetHitCount > 1 && host.zoom >= 2.2 && px >= 4) {
      const lineWidthInner = Math.max(0.5, Math.min(1.6, px * 0.11));
      glyph.drawOutlineRect(
        Math.round(drawX + 1), Math.round(drawY + 1),
        Math.max(1, Math.round(drawSize - 2)), Math.max(1, Math.round(drawSize - 2)),
        245 / 255, 158 / 255, 11 / 255, 0.95, lineWidthInner,
      );
    }
  }

  drawBitPrimeOverlay(frame, globalBit, bitX, bitY) {
    const host = this.host;
    if (!(host.primeOverlay && host._primeBitFlags?.[globalBit])) return;
    if (!host._glyph) return;
    drawBitOverlayIndicator(host._glyph, {
      bitX,
      bitY,
      px: frame.px,
      color: [251 / 255, 191 / 255, 36 / 255],
      alpha: 0.92,
      dotScale: 0.22,
      dotMax: 4,
      anchor: 'top-right',
      label: 'p',
      labelAnchor: 'top-left',
      labelScale: 0.22,
      labelMax: 9,
      labelThreshold: 16,
    });
  }

  drawBitRangeOverlay(frame, globalBit, bitX, bitY) {
    const host = this.host;
    if (!(host.rangeOverlay && globalBit >= host.rangeOverlayStart && globalBit <= host.rangeOverlayEnd)) return;
    if (!host._glyph) return;
    drawBitOverlayIndicator(host._glyph, {
      bitX,
      bitY,
      px: frame.px,
      color: [34 / 255, 211 / 255, 238 / 255],
      alpha: 0.88,
      dotScale: 0.20,
      dotMax: 3.5,
      anchor: 'top-left',
      label: 'r',
      labelAnchor: 'top-right',
      labelScale: 0.20,
      labelMax: 8,
      labelThreshold: 16,
    });
  }

  drawBitMultiplesOverlay(frame, globalBit, bitX, bitY) {
    const host = this.host;
    if (!(host.multiplesOverlay && host.multiplesOverlayPrime >= 2)) return;
    const number = bitToNumber(globalBit, host.storageModel, host.wheelDefinition);
    if (!(number >= 2 && number % host.multiplesOverlayPrime === 0)) return;
    if (!host._glyph) return;
    drawBitOverlayIndicator(host._glyph, {
      bitX,
      bitY,
      px: frame.px,
      color: [167 / 255, 139 / 255, 250 / 255],
      alpha: 0.90,
      dotScale: 0.20,
      dotMax: 3.5,
      anchor: 'bottom-right',
      label: '×',
      labelAnchor: 'bottom-right',
      labelScale: 0.20,
      labelMax: 8,
      labelThreshold: 16,
    });
  }

  drawBitLabels(frame, globalBit, bitIndex, cls, draw, bitX, bitY) {
    const host = this.host;
    const { showBitLabels, showNumberLabels, px } = frame;
    const dualLabelMode = showBitLabels && showNumberLabels;
    if (!((dualLabelMode && px >= 22) || (!dualLabelMode && (showBitLabels || showNumberLabels) && px >= 12))) {
      return;
    }

    const lines = [];
    if (showBitLabels) lines.push(String(host._bitLabelValue(globalBit, bitIndex)));
    if (showNumberLabels) {
      const number = bitToNumber(globalBit, host.storageModel, host.wheelDefinition);
      lines.push(number == null ? 'unmapped' : String(number));
    }

    const dualLine = lines.length > 1;
    const zoomBoost = host.zoom > 20 ? 1 + Math.min(1, (host.zoom - 20) / 24) : 1;

    const baseFontSize = dualLine
      ? Math.max(5, Math.min(8, px * 0.2))
      : Math.max(5, Math.min(9, px * 0.34));
    const fontSize = baseFontSize * zoomBoost;
    const centerX = Math.round(bitX + px / 2);
    const centerY = Math.round(bitY + px / 2);

    if (!host._glyph) return;
    const glyph = host._glyph;
    const [tr, tg, tb, ta] = host._labelTextColorGL(cls.color);
    if (dualLine) {
      glyph.drawText(lines[0], centerX, Math.round(bitY + px * 0.32), fontSize,
        tr, tg, tb, ta, 'center', 'middle');
      glyph.drawText(lines[1], centerX, Math.round(bitY + px * 0.7),
        Math.max(4.5, fontSize - 0.25), tr, tg, tb, ta, 'center', 'middle');
    } else {
      glyph.drawText(lines[0], centerX, centerY, fontSize,
        tr, tg, tb, ta, 'center', 'middle');
    }
  }
}

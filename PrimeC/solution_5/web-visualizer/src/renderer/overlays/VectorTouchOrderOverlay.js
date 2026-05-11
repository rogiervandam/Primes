/**
 * VectorTouchOrderOverlay — renders the per-slot vector touch order
 * labels that show which mask words a given vector instruction touched
 * and in which order, plus the originating event id(s).
 *
 * Pattern D from docs/AI_MAINTENANCE.md: a stateless overlay class that
 * pulls all of its inputs through host accessors at render time. The
 * mask metadata (`_maskWordOrderSummary`, `_maskTintColor`,
 * `_maskEntryGroupBounds`) intentionally stays on `SieveRenderer`
 * because it is shared with `MaskWriteOverlay`, the cacheline
 * annotations and the transition animations.
 */
export class VectorTouchOrderOverlay {
  constructor(host) {
    this.host = host;
  }

  render(ctx, glCtx = null) {
    const host = this.host;
    if (!host.showVectorTouchOrder) return;

    const entries = host._maskWordOrderSummary();
    if (entries.length === 0) return;
    // item 270: flag indicating the mask just changed (set by useGoToStep).
    const maskIsNew = !!host.maskIsNew;

    const px = host.pixelSize * host.zoom;
    const fontSize = Math.max(11, Math.min(20, 9 + px * 0.26));
    const detailFont = Math.max(8, Math.min(13, 6 + px * 0.08));
    const padX = Math.max(5, Math.min(11, px * 0.46));
    const padY = Math.max(2, Math.min(6, px * 0.2));
    const usedRects = [];

    // Canvas 2D context is always used for measurement (font metrics).
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const label = entry.orders.join(',');
      const tint = host._maskTintColor(entry.slotIndex);
      const groupBounds = host._maskEntryGroupBounds(entry);
      const slotWidth = entry.slot?.vecD?.w || groupBounds?.w || entry.bounds.w;
      const maxBoxW = Math.max(28, Math.min(host.canvasWidth - 6, slotWidth * 2.5));
      ctx.font = `600 ${fontSize}px monospace`;
      const textWidth = ctx.measureText(label).width;
      ctx.font = `500 ${detailFont}px monospace`;
      const eventLabel = entry.eventIds && entry.eventIds.length > 0
        ? `(${entry.eventIds.length === 1 ? 'event' : 'events'} ${entry.eventIds.join(',')})`
        : '';
      const annotation = host._truncateTextToWidth(ctx, eventLabel, Math.max(0, maxBoxW - padX * 2), `500 ${detailFont}px monospace`);
      const detailWidth = annotation ? ctx.measureText(annotation).width : 0;
      const boxW = Math.min(maxBoxW, Math.max(textWidth, detailWidth) + padX * 2);
      const labelSize = host._fitLabelFontSize(ctx, label, Math.max(0, boxW - padX * 2), fontSize, 7, '600 ');
      const detailSize = annotation ? host._fitLabelFontSize(ctx, annotation, Math.max(0, boxW - padX * 2), detailFont, 6, '500 ') : 0;
      const showAnnotation = annotation && detailSize > 0;
      const boxH = (labelSize || fontSize) + padY * 2 + (showAnnotation ? detailSize + 3 : 0);
      const slot = entry.slot;
      // Anchor to the data-area top so the label bottom always clears the bit
      // grid regardless of label height vs label-band height.  Fall back to
      // entry.bounds.y (≈ rowDataY) when the slot object is unavailable.
      const rowDataTop = slot?.rowDataY != null ? slot.rowDataY : entry.bounds.y;
      const candidateX = slot
        ? Math.min(slot.vecX + slot.vecD.w - boxW / 2 - 3, Math.max(slot.vecX + boxW / 2 + 3, entry.bounds.cx))
        : entry.bounds.cx;
      let x = candidateX;
      // Place the label box so its bottom edge is 2 px above the data area;
      // clamp so it never goes above y = boxH/2 + 2 (canvas top guard).
      let y = Math.max(boxH / 2 + 2, rowDataTop - boxH / 2 - 2);
      for (let pass = 0; pass < 6; pass++) {
        const collides = usedRects.some((rect) => !(x + boxW / 2 < rect.x || x - boxW / 2 > rect.x + rect.w || y + boxH / 2 < rect.y || y - boxH / 2 > rect.y + rect.h));
        if (!collides) break;
        y = Math.max(boxH / 2 + 2, y - (boxH + 4));
        x = Math.max(boxW / 2 + 2, Math.min(candidateX + (pass % 2 === 0 ? -1 : 1) * (Math.ceil(pass / 2) * (boxW * 0.35)), host.canvasWidth - boxW / 2 - 2));
      }
      usedRects.push({ x: x - boxW / 2, y: y - boxH / 2, w: boxW, h: boxH });

      const tr = tint[0] / 255, tg = tint[1] / 255, tb = tint[2] / 255;
      const bx = x - boxW / 2, by = y - boxH / 2;

      if (glCtx) {
        // Fill and border (connector line skipped in GL mode).
        glCtx.drawFilledRect(bx, by, boxW, boxH, tr, tg, tb, 0.96);
        // item 270: brighter outer glow when this label belongs to a newly-changed mask.
        if (maskIsNew) {
          glCtx.drawOutlineRect(bx - 2, by - 2, boxW + 4, boxH + 4, tr, tg, tb, 0.72, 2.2);
        }
        glCtx.drawOutlineRect(bx, by, boxW, boxH, 15 / 255, 23 / 255, 42 / 255, 0.52, 1.1);
        const [lr, lg, lb, la] = host._labelTextColorGL(tint);
        if (labelSize > 0) {
          const labelY = showAnnotation ? by + padY + labelSize * 0.5 : by + boxH / 2;
          glCtx.drawText(label, Math.round(x), Math.round(labelY), labelSize, lr, lg, lb, Math.min(1, la + 0.1), 'center', 'middle');
        }
        if (showAnnotation) {
          const annY = by + padY + (labelSize || fontSize) + 3 + detailSize * 0.5;
          glCtx.drawText(annotation, Math.round(x), Math.round(annY), detailSize, lr, lg, lb, Math.min(1, la + 0.08), 'center', 'middle');
        }
      }
    }

    ctx.restore();
  }
}

export default VectorTouchOrderOverlay;

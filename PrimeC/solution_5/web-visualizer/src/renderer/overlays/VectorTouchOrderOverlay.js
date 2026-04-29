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

  render(ctx) {
    const host = this.host;
    if (!host.showVectorTouchOrder) return;

    const entries = host._maskWordOrderSummary();
    if (entries.length === 0) return;

    const px = host.pixelSize * host.zoom;
    const fontSize = Math.max(10, Math.min(17, 8 + px * 0.24));
    const detailFont = Math.max(7, Math.min(11, 5.2 + px * 0.06));
    const padX = Math.max(4, Math.min(10, px * 0.42));
    const padY = Math.max(2, Math.min(6, px * 0.18));
    const usedRects = [];

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const label = entry.orders.join(',');
      const tint = host._maskTintColor(entry.slotIndex);
      const groupBounds = host._maskEntryGroupBounds(entry);
      const slotWidth = entry.slot?.vecD?.w || groupBounds?.w || entry.bounds.w;
      const maxBoxW = Math.max(28, Math.min(host.canvasWidth - 6, slotWidth));
      ctx.font = `600 ${fontSize}px monospace`;
      const textWidth = ctx.measureText(label).width;
      ctx.font = `500 ${detailFont}px monospace`;
      const eventLabel = entry.eventIds && entry.eventIds.length > 0
        ? `(${entry.eventIds.length === 1 ? 'event' : 'events'} ${entry.eventIds.join(',')})`
        : '';
      const annotation = host._truncateTextToWidth(ctx, eventLabel, Math.max(0, maxBoxW - padX * 2), `500 ${detailFont}px monospace`);
      const detailWidth = annotation ? ctx.measureText(annotation).width : 0;
      const boxW = Math.min(maxBoxW, Math.max(textWidth, detailWidth) + padX * 2);
      const labelSize = host._fitLabelFontSize(ctx, label, Math.max(0, boxW - padX * 2), fontSize, 6, '600 ');
      const detailSize = annotation ? host._fitLabelFontSize(ctx, annotation, Math.max(0, boxW - padX * 2), detailFont, 5, '500 ') : 0;
      const showAnnotation = annotation && detailSize > 0;
      const boxH = (labelSize || fontSize) + padY * 2 + (showAnnotation ? detailSize + 3 : 0);
      const slot = entry.slot;
      const slotTop = slot?.vRowHeight != null ? host.panY + slot.vRow * slot.vRowHeight : entry.bounds.y - (boxH + 12);
      const candidateX = slot
        ? Math.min(slot.vecX + slot.vecD.w - boxW / 2 - 3, Math.max(slot.vecX + boxW / 2 + 3, entry.bounds.cx))
        : entry.bounds.cx;
      let x = candidateX;
      let y = Math.max(slotTop + boxH / 2 + 2, entry.bounds.y - boxH / 2 - 10);
      for (let pass = 0; pass < 6; pass++) {
        const collides = usedRects.some((rect) => !(x + boxW / 2 < rect.x || x - boxW / 2 > rect.x + rect.w || y + boxH / 2 < rect.y || y - boxH / 2 > rect.y + rect.h));
        if (!collides) break;
        y = Math.max(slotTop + boxH / 2 + 2, y - (boxH + 4));
        x = Math.max(boxW / 2 + 2, Math.min(candidateX + (pass % 2 === 0 ? -1 : 1) * (Math.ceil(pass / 2) * (boxW * 0.35)), host.canvasWidth - boxW / 2 - 2));
      }
      usedRects.push({ x: x - boxW / 2, y: y - boxH / 2, w: boxW, h: boxH });

      ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.52)`;
      ctx.lineWidth = Math.max(0.7, Math.min(1.4, px * 0.08));
      ctx.beginPath();
      ctx.moveTo(x, y + boxH / 2 - 1);
      ctx.lineTo(entry.bounds.cx, entry.bounds.y - Math.max(4, px * 0.35));
      ctx.stroke();

      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.94)`;
      ctx.beginPath();
      ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, Math.max(5, Math.min(12, boxH * 0.35)));
      ctx.fill();

      ctx.strokeStyle = 'rgba(15, 23, 42, 0.38)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = host._labelTextColor(tint);
      if (labelSize > 0) {
        ctx.font = `600 ${labelSize}px monospace`;
        const labelY = showAnnotation ? y - detailSize * 0.5 : y + 0.5;
        ctx.fillText(label, x, labelY);
      }
      if (showAnnotation) {
        ctx.font = `500 ${detailSize}px monospace`;
        ctx.fillText(annotation, x, y + (labelSize || fontSize) * 0.45);
      }
    }

    ctx.restore();
  }
}

export default VectorTouchOrderOverlay;

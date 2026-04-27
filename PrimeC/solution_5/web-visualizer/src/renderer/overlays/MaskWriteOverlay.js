/**
 * MaskWriteOverlay — paints the per-word/per-slot tint boxes that show
 * which mask slots were written during the current step.
 *
 * Same pattern as SearchOverlay: the overlay holds NO state. All inputs
 * (entries, tint, mask metadata) are pulled from the host renderer
 * through duck-typed accessors at render time. This is intentional —
 * the underlying mask metadata (`maskWordBits`, `maskWriteOrderWords`,
 * `_maskWriteEntries`, `_maskTintColor`) is shared with several other
 * code paths (vector-touch-order labels, transition animations,
 * cacheline annotations) and is not safe to migrate piecewise.
 *
 * Required host accessors:
 *   - host.pixelSize, host.zoom            — sizing
 *   - host.maskWordBits                    — controls inset/border behaviour
 *   - host._maskWriteEntries()             — returns the entries to paint
 *   - host._maskTintColor(slotIndex)       — RGB triple for a slot
 *
 * Future overlays should follow the same shape; see
 * `src/renderer/overlays/SearchOverlay.js` for the original template
 * and docs/AI_MAINTENANCE.md §7 for the prioritised overlay backlog.
 */
export class MaskWriteOverlay {
  constructor(host) {
    this.host = host;
  }

  render(ctx) {
    const host = this.host;
    const entries = host._maskWriteEntries();
    if (entries.length === 0) return;

    const px = host.pixelSize * host.zoom;
    const wordBits = host.maskWordBits;
    const tightLayout = wordBits && wordBits <= 32;

    ctx.save();
    ctx.setLineDash([]);

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const bounds = entry.bounds;
      const tint = host._maskTintColor(entry.slotIndex);
      const inset = tightLayout
        ? Math.max(0.8, Math.min(2.2, px * 0.2))
        : Math.max(1.2, Math.min(4.2, px * 0.42));
      const radius = Math.max(4, Math.min(10, 4 + px * 0.18));
      const rx = bounds.x - inset;
      const ry = bounds.y - inset;
      const rw = bounds.w + inset * 2;
      const rh = bounds.h + inset * 2;

      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${tightLayout ? 0.025 : 0.055})`;
      ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.76)`;
      ctx.lineWidth = Math.max(0.9, Math.min(2.2, px * 0.11));
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, radius);
      ctx.fill();
      ctx.stroke();

      if (tightLayout) {
        ctx.strokeStyle = 'rgba(255,255,255,0.42)';
        ctx.lineWidth = Math.max(0.45, Math.min(1.1, px * 0.06));
        ctx.strokeRect(rx + inset * 0.45, ry + inset * 0.45, Math.max(1, rw - inset * 0.9), Math.max(1, rh - inset * 0.9));
      }
    }

    ctx.restore();
  }
}

export default MaskWriteOverlay;

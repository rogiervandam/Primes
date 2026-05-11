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

  render(glCtx) {
    const host = this.host;
    const entries = host._maskWriteEntries();
    if (entries.length === 0) return;

    const px = host.pixelSize * host.zoom;
    const wordBits = host.maskWordBits;
    const tightLayout = wordBits && wordBits <= 32;
    // item 270: when the mask just changed, draw a brighter glow to signal "new mask".
    const maskIsNew = !!host.maskIsNew;

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const bounds = entry.bounds;
      const tint = host._maskTintColor(entry.slotIndex);
      const inset = tightLayout
        ? Math.max(0.8, Math.min(2.2, px * 0.2))
        : Math.max(1.2, Math.min(4.2, px * 0.42));
      const rx = bounds.x - inset;
      const ry = bounds.y - inset;
      const rw = bounds.w + inset * 2;
      const rh = bounds.h + inset * 2;
      const tr = tint[0] / 255, tg = tint[1] / 255, tb = tint[2] / 255;
      const lineWidth = Math.max(0.9, Math.min(2.2, px * 0.11));

      if (glCtx) {
        glCtx.drawFilledRect(rx, ry, rw, rh, tr, tg, tb, tightLayout ? 0.025 : 0.055);
        glCtx.drawOutlineRect(rx, ry, rw, rh, tr, tg, tb, 0.76, lineWidth);
        if (tightLayout) {
          const ii = inset * 0.45;
          glCtx.drawOutlineRect(rx + ii, ry + ii, Math.max(1, rw - ii * 2), Math.max(1, rh - ii * 2),
            1, 1, 1, 0.42, Math.max(0.45, Math.min(1.1, px * 0.06)));
        }
        // item 270: extra glow ring when this is a newly-changed mask pattern.
        if (maskIsNew) {
          const glow = Math.max(2.5, inset * 1.6);
          glCtx.drawOutlineRect(rx - glow, ry - glow, rw + glow * 2, rh + glow * 2,
            tr, tg, tb, 0.55, Math.max(1.5, lineWidth * 1.6));
        }
      }
    }
  }
}

export default MaskWriteOverlay;

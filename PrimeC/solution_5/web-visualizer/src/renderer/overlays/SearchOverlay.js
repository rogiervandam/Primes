/**
 * SearchOverlay — paints the "search target" highlight on the canvas.
 *
 * This was inlined in `SieveRenderer` as `setSearchHighlight()` /
 * `clearSearchHighlight()` / `_renderSearchHighlight()`. Extracted so that:
 *   - it is the simplest example of the overlay pattern (Pattern D in
 *     docs/AI_MAINTENANCE.md). New overlays should follow the same shape.
 *   - other renderers (see src/renderer/VisualizationRenderer.js) can
 *     compose it without inheriting from SieveRenderer.
 *
 * Contract:
 *   - constructed with a "host" object that provides `getElementBounds`,
 *     `bitIndexToCanvas`, plus current `zoom` and `pixelSize`.
 *   - `set(type, index, bitIndex?)` — record the target.
 *   - `clear()` — drop the target.
 *   - `render(ctx, canvasW, canvasH)` — no-op if cleared.
 *
 * The host owns the call to `render()` from inside its main draw loop.
 * This class never touches host state outside of read-only access through
 * the host accessors.
 */
export class SearchOverlay {
  constructor(host) {
    this.host = host;
    this.target = null;
  }

  set(type, index, bitIndex = null) {
    this.target = { type, index, bitIndex };
  }

  clear() {
    this.target = null;
  }

  render(canvasW, canvasH, glCtx) {
    const t = this.target;
    if (!t) return;
    const host = this.host;
    const bounds = host.getElementBounds(t.type, t.index);
    if (!bounds) return;

    const zoom = host.zoom;
    const pad = Math.max(6, Math.min(16, 8 + zoom * 0.45));
    const x = bounds.x - pad;
    const y = bounds.y - pad;
    const w = bounds.w + pad * 2;
    const h = bounds.h + pad * 2;
    if (x > canvasW || y > canvasH || x + w < 0 || y + h < 0) return;

    const lineWidth = Math.max(1.5, 1.8 + zoom * 0.08);

    if (glCtx) {
      // Fill
      glCtx.drawFilledRect(x, y, w, h, 56 / 255, 189 / 255, 248 / 255, 0.12);
      // Outer blue border
      glCtx.drawOutlineRect(x, y, w, h, 56 / 255, 189 / 255, 248 / 255, 0.96, lineWidth);
      // Inner yellow border (approximates the dashed overlay)
      glCtx.drawOutlineRect(x + lineWidth, y + lineWidth, w - lineWidth * 2, h - lineWidth * 2,
        250 / 255, 204 / 255, 21 / 255, 0.9, Math.max(1, lineWidth * 0.65));
      // Circle marker on the target bit
      if (t.bitIndex != null) {
        const anchor = host.bitIndexToCanvas(t.bitIndex);
        if (anchor) {
          const markerRadius = Math.max(4, Math.min(12, host.pixelSize * zoom * 1.8));
          glCtx.drawDot(anchor.x, anchor.y, markerRadius, 250 / 255, 204 / 255, 21 / 255, 0.92);
        }
      }
      return;
    }
  }
}

export default SearchOverlay;

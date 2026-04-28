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

  render(ctx, canvasW, canvasH) {
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

    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.96)';
    ctx.lineWidth = Math.max(1.5, 1.8 + zoom * 0.08);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.max(6, Math.min(16, 10 + zoom * 0.2)));
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
    ctx.lineWidth = Math.max(1, 1.1 + zoom * 0.04);
    ctx.setLineDash([Math.max(3, 5 + zoom * 0.08), Math.max(2, 4 + zoom * 0.04)]);
    ctx.stroke();

    if (t.bitIndex != null) {
      const anchor = host.bitIndexToCanvas(t.bitIndex);
      if (anchor) {
        const markerRadius = Math.max(4, Math.min(12, host.pixelSize * zoom * 1.8));
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.92)';
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, markerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export default SearchOverlay;

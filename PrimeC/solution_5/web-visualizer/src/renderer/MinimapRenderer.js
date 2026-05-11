/**
 * MinimapRenderer — draws the minimap overlay canvas and handles hit-testing.
 *
 * Follows Pattern D (docs/AI_MAINTENANCE.md §3): a focused class that reads
 * all host state through `this.host` accessors and stores only the last
 * computed minimap geometry (`_rect`) for hit-testing.
 *
 * Lifecycle:
 *   const minimap = new MinimapRenderer(sieveRenderer);
 *   minimap.attach(canvasElement);  // call once after DOM mount
 *   minimap.render(canvasW, canvasH, detailH);  // call each frame
 *   const hit = minimap.hitTest(e.clientX, e.clientY, canvasW, canvasH);
 *
 * The host (`SieveRenderer`) must expose:
 *   .ctx, .bitCount, .panX, .panY,
 *   .viewportW, .viewportH, .minimapRightInset, .minimapEnabled,
 *   .contentDimensions()   → { width, height }
 */
export class MinimapRenderer {
  constructor(host) {
    this.host = host;
    this._canvas = null;
    this._ctx = null;
    /**
     * Last computed minimap bounding box + projection parameters.
     * Updated by `render()`; consumed by `hitTest()`.
     * @type {{ mx, my, mapW, mapH, scale, pad, dims } | null}
     */
    this._rect = null;
  }

  _hideAttachedCanvas() {
    if (!this._canvas) return;
    this._canvas.style.display = 'none';
  }

  /** Attach (or detach when canvas is null) the dedicated minimap overlay canvas. */
  attach(canvas) {
    this._canvas = canvas;
    this._ctx = canvas ? canvas.getContext('2d') : null;
  }

  /**
   * True when the current viewport already contains the full content bounds.
   * Delegates from SieveRenderer so callers keep working without change.
   */
  isContentFullyVisible(viewportW, viewportH) {
    const h = this.host;
    if (h.bitCount === 0) return true;
    const dims = h.contentDimensions();
    // The canvas is ~3.2× oversized and centered on screen, so the visible
    // region starts at (canvasWidth - viewportW) / 2 in canvas coordinates.
    const viewX = (h.canvasWidth - viewportW) / 2 - h.panX;
    const viewY = (h.canvasHeight - viewportH) / 2 - h.panY;
    const eps = 0.5;
    return (
      viewX <= eps &&
      viewY <= eps &&
      viewX + viewportW >= dims.width - eps &&
      viewY + viewportH >= dims.height - eps
    );
  }

  /**
   * Render the minimap overlay in the bottom-right corner, offset above
   * detailH so it doesn't overlap the detail panel.
   *
   * When a separate minimap canvas is attached (position:fixed viewport
   * overlay) it is used as the drawing surface; otherwise the host's main
   * canvas context is used as a fallback.
   */
  render(canvasW, canvasH, detailH = 0) {
    const h = this.host;
    // React effects can call renderMinimap before either the main GL/2D canvas
    // context or the dedicated minimap canvas context is ready.
    // In that short window, safely no-op instead of throwing.
    if (this._canvas && !this._ctx) this._ctx = this._canvas.getContext('2d');
    let ctx = this._ctx || h.ctx;
    // Prefer container-visible dimensions, then window viewport size, and only
    // finally fall back to the caller-provided canvas dimensions. This avoids
    // positioning the fixed overlay using oversized render-canvas dimensions.
    const winW = typeof window !== 'undefined' ? window.innerWidth : 0;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 0;
    const viewportW = h.viewportW || winW || canvasW;
    const viewportH = h.viewportH || winH || canvasH;

    if (!h.minimapEnabled) {
      this._rect = null;
      this._hideAttachedCanvas();
      return;
    }
    if (h.bitCount === 0) {
      this._rect = null;
      this._hideAttachedCanvas();
      return;
    }
    if (this.isContentFullyVisible(viewportW, viewportH)) {
      this._rect = null;
      this._hideAttachedCanvas();
      return;
    }

    if (!ctx) {
      this._rect = null;
      return;
    }

    const dims = h.contentDimensions();
    const pad = 4;
    const scale = Math.min(130 / dims.width, 130 / dims.height);
    const mapW = dims.width * scale + 2 * pad;
    const mapH = dims.height * scale + 2 * pad;
    const edgePad = 10;
    const rightInset = h.minimapRightInset || 0;
    const targetX = Math.max(edgePad, viewportW - mapW - edgePad - rightInset);
    const panelClearance = Math.max(0, detailH) + edgePad;
    const targetY = Math.max(edgePad, viewportH - mapH - panelClearance);

    let drawX = targetX;
    let drawY = targetY;

    if (this._canvas && this._ctx) {
      const dpr = window.devicePixelRatio || 1;
      const nextW = Math.max(1, Math.round(mapW * dpr));
      const nextH = Math.max(1, Math.round(mapH * dpr));
      if (this._canvas.width !== nextW || this._canvas.height !== nextH) {
        this._canvas.width = nextW;
        this._canvas.height = nextH;
      }
      this._canvas.style.display = 'block';
      this._canvas.style.width = `${mapW}px`;
      this._canvas.style.height = `${mapH}px`;
      this._canvas.style.left = `${targetX}px`;
      this._canvas.style.top = `${targetY}px`;
      ctx = this._ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, mapW, mapH);
      drawX = 0;
      drawY = 0;
    }

    // Store geometry for hit-testing.
    this._rect = { mx: targetX, my: targetY, mapW, mapH, scale, pad, dims };

    // Background panel.
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(drawX, drawY, mapW, mapH);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX, drawY, mapW, mapH);

    // Content outline.
    const contentW = mapW - 2 * pad;
    const contentH = mapH - 2 * pad;
    ctx.fillStyle = 'rgba(180,180,180,0.15)';
    ctx.fillRect(drawX + pad, drawY + pad, contentW, contentH);
    ctx.strokeStyle = 'rgba(200,200,200,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX + pad, drawY + pad, contentW, contentH);

    // Viewport rectangle.
    // The canvas is ~3.2× oversized and centered on screen, so the visible
    // region starts at (canvasWidth - viewportW) / 2 in canvas coordinates.
    const viewLeft = (h.canvasWidth - viewportW) / 2 - h.panX;
    const viewTop = (h.canvasHeight - viewportH) / 2 - h.panY;
    const vpX = drawX + pad + viewLeft * scale;
    const vpY = drawY + pad + viewTop * scale;
    const vpW = viewportW * scale;
    const vpH = viewportH * scale;
    ctx.strokeStyle = 'rgba(255,68,68,0.8)';
    ctx.lineWidth = 1.5;
    const clampedX = Math.max(drawX + pad, Math.min(vpX, drawX + mapW - pad));
    const clampedY = Math.max(drawY + pad, Math.min(vpY, drawY + mapH - pad));
    const clampedR = Math.max(drawX + pad, Math.min(vpX + vpW, drawX + mapW - pad));
    const clampedB = Math.max(drawY + pad, Math.min(vpY + vpH, drawY + mapH - pad));
    ctx.strokeRect(clampedX, clampedY, clampedR - clampedX, clampedB - clampedY);
  }

  /**
   * Test if (x, y) in viewport coords is inside the minimap.
   * Returns `{ panX, panY }` to center the viewport on the clicked point,
   * or `null` when the minimap is inactive or the point misses.
   *
   * NOTE: centering uses `host.canvasWidth/Height` (the full oversized canvas,
   * ~3.2× the window) because panX is defined in oversized-canvas coordinates:
   *   panX = (canvasWidth - contentWidth) / 2   (centered fit)
   * Using the container CSS width here would place the content far off-screen.
   */
  hitTest(x, y) {
    // Guard against stale geometry when the minimap has been disabled since
    // the last render call — no need to clear _rect externally.
    if (!this.host.minimapEnabled) return null;
    const r = this._rect;
    if (!r) return null;
    const { mx, my, mapW, mapH, scale, pad } = r;
    if (x < mx || x > mx + mapW || y < my || y > my + mapH) return null;
    // Map click position to content coordinates.
    const contentX = (x - mx - pad) / scale;
    const contentY = (y - my - pad) / scale;
    // Center the viewport on that content point.
    // canvasWidth/Height are the oversized canvas dimensions (~3.2× the window).
    return {
      panX: -(contentX - this.host.canvasWidth / 2),
      panY: -(contentY - this.host.canvasHeight / 2),
    };
  }
}

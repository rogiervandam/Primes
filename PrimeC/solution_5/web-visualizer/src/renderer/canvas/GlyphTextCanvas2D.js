/**
 * GlyphTextCanvas2D - Canvas2D fallback that mirrors the GlyphTextGLCore API.
 *
 * This backend is used by worker+separate-text mode so glyph/text rendering
 * stays on the main thread without WebGL.
 */

const FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function rgbaCss(r, g, b, a) {
  const rr = Math.round(clamp01(r) * 255);
  const gg = Math.round(clamp01(g) * 255);
  const bb = Math.round(clamp01(b) * 255);
  const aa = clamp01(a);
  return `rgba(${rr}, ${gg}, ${bb}, ${aa})`;
}

export class GlyphTextCanvas2D {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this._cssW = 0;
    this._cssH = 0;
    this._dpr = 1;
  }

  init(canvas) {
    if (!canvas) return false;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return false;
    this.canvas = canvas;
    this.ctx = ctx;
    return true;
  }

  resize(cssW, cssH, dpr) {
    if (!this.canvas || !this.ctx) return;
    this._cssW = Math.max(0, cssW || 0);
    this._cssH = Math.max(0, cssH || 0);
    this._dpr = Math.max(1, dpr || 1);

    const bw = Math.max(1, Math.round(this._cssW * this._dpr));
    const bh = Math.max(1, Math.round(this._cssH * this._dpr));

    if (this.canvas.width !== bw) this.canvas.width = bw;
    if (this.canvas.height !== bh) this.canvas.height = bh;
    if (this.canvas.style) {
      this.canvas.style.width = `${this._cssW}px`;
      this.canvas.style.height = `${this._cssH}px`;
    }

    this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
  }

  beginFrame(cssW, cssH, dpr, clear = true) {
    this.resize(cssW, cssH, dpr);
    if (!this.ctx) return;
    if (clear) this.ctx.clearRect(0, 0, this._cssW, this._cssH);
  }

  beginOverlayPass() {
    // No special state required for Canvas2D overlay pass.
  }

  drawDot(cx, cy, radius, r, g, b, a) {
    const ctx = this.ctx;
    if (!ctx || radius <= 0) return;
    ctx.fillStyle = rgbaCss(r, g, b, a);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawText(text, x, y, fontSize, r, g, b, a, align = 'left', baseline = 'alphabetic') {
    const ctx = this.ctx;
    if (!ctx || !text) return;
    ctx.fillStyle = rgbaCss(r, g, b, a);
    ctx.font = `${Math.max(1, fontSize)}px ${FONT_FAMILY}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  }

  drawOutlineRect(x, y, w, h, r, g, b, a, lineWidth) {
    const ctx = this.ctx;
    if (!ctx || w <= 0 || h <= 0) return;
    ctx.strokeStyle = rgbaCss(r, g, b, a);
    ctx.lineWidth = Math.max(0.1, lineWidth || 1);
    ctx.strokeRect(x, y, w, h);
  }

  drawFilledRect(x, y, w, h, r, g, b, a) {
    const ctx = this.ctx;
    if (!ctx || w <= 0 || h <= 0) return;
    ctx.fillStyle = rgbaCss(r, g, b, a);
    ctx.fillRect(x, y, w, h);
  }

  measureText(text, fontSize) {
    const ctx = this.ctx;
    if (!ctx || !text) return 0;
    ctx.font = `${Math.max(1, fontSize)}px ${FONT_FAMILY}`;
    return ctx.measureText(text).width;
  }

  drawFittedText(text, x, y, maxFontSize, maxWidth, r, g, b, a, align = 'left', baseline = 'top', minFontSize = 4) {
    if (!text || maxWidth <= 2) return;
    let fontSize = maxFontSize;
    while (fontSize > minFontSize) {
      if (this.measureText(text, fontSize) <= maxWidth) break;
      fontSize -= 0.5;
    }
    let finalText = text;
    if (this.measureText(text, fontSize) > maxWidth) {
      const ellipsis = '...';
      if (this.measureText(ellipsis, fontSize) > maxWidth) return;
      let truncated = text;
      while (truncated.length > 0) {
        truncated = truncated.slice(0, -1);
        if (this.measureText(truncated + ellipsis, fontSize) <= maxWidth) {
          finalText = truncated + ellipsis;
          break;
        }
      }
      if (truncated.length === 0) return;
    }
    this.drawText(finalText, x, y, fontSize, r, g, b, a, align, baseline);
  }

  endFrame() {
    // Immediate-mode Canvas2D drawing, nothing to flush.
  }
}

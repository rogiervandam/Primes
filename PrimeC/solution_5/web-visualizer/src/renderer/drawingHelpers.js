/**
 * Pure canvas-2D drawing helpers used by `SieveRenderer`.
 *
 * None of these depend on renderer state — they take a context and return
 * a value or mutate the context. Keeping them in a separate module shrinks
 * the renderer class and makes them trivially testable.
 */

/** Parse `#rrggbb` (or `rrggbb`) into `[r, g, b]`. Falls back to a soft green. */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return [92, 207, 141];
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [92, 207, 141];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Linear-interpolate two `[r, g, b]` triples. */
export function mixRgb(a, b, t) {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

/** Pick a readable text color for a given background fill. */
export function labelTextColor(fillRgb) {
  const [r, g, b] = fillRgb;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 150 ? 'rgba(17, 24, 39, 0.95)' : 'rgba(249, 250, 251, 0.96)';
}

/**
 * Find the largest integer-or-half font size (in monospace) for `text` that
 * still fits within `maxWidth`. Returns 0 if even `minSize` does not fit.
 *
 * As a side effect the context's `font` is left set to the chosen size.
 */
export function fitLabelFontSize(ctx, text, maxWidth, preferredSize, minSize = 4, style = '') {
  if (!text || maxWidth <= 0) return 0;
  let size = preferredSize;
  while (size > minSize) {
    ctx.font = `${style}${size}px monospace`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 0.5;
  }
  ctx.font = `${style}${minSize}px monospace`;
  return ctx.measureText(text).width <= maxWidth ? minSize : 0;
}

/**
 * Truncate `text` with an ellipsis so it fits within `maxWidth` using the
 * given canvas font `style` string. Returns `''` if even the ellipsis itself
 * cannot fit.
 */
export function truncateTextToWidth(ctx, text, maxWidth, style = '') {
  if (!text || maxWidth <= 0) return '';
  ctx.save();
  ctx.font = style;
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.restore();
    return text;
  }
  const ellipsis = '...';
  if (ctx.measureText(ellipsis).width > maxWidth) {
    ctx.restore();
    return '';
  }
  let end = text.length;
  while (end > 0) {
    const candidate = `${text.slice(0, end)}${ellipsis}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      ctx.restore();
      return candidate;
    }
    end -= 1;
  }
  ctx.restore();
  return ellipsis;
}

/**
 * Create a duck-typed canvas-2D context adapter that delegates text
 * measurement to a `GlyphTextGLCore` instance. Returned object is
 * compatible with the `ctx` parameter accepted by `fitLabelFontSize` and
 * `truncateTextToWidth`, so those helpers work without modification.
 *
 * @param {import('./gl/GlyphTextGLCore').GlyphTextGLCore} glyphCtx
 */
export function glMeasureAdapter(glyphCtx) {
  let _size = 12;
  return {
    get font() { return `${_size}px monospace`; },
    set font(cssStr) {
      // Parse the size from e.g. '600 12px monospace' or '8.5px monospace'
      const m = String(cssStr).match(/(\d+(?:\.\d+)?)px/);
      if (m) _size = parseFloat(m[1]);
    },
    measureText(text) { return { width: glyphCtx.measureText(text, _size) }; },
    save() {},
    restore() {},
    set textAlign(_v) {},
    set textBaseline(_v) {},
  };
}

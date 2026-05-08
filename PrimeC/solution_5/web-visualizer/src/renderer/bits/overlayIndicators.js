function dotPosition(bitX, bitY, px, dotR, anchor) {
  if (anchor === 'top-left') {
    return { x: Math.round(bitX) + dotR * 0.75, y: Math.round(bitY) + dotR * 0.75 };
  }
  if (anchor === 'top-right') {
    return { x: Math.round(bitX + px) - dotR * 0.75, y: Math.round(bitY) + dotR * 0.75 };
  }
  return { x: Math.round(bitX + px) - dotR * 0.75, y: Math.round(bitY + px) - dotR * 0.75 };
}

function labelPosition(bitX, bitY, px, anchor) {
  if (anchor === 'top-left') return { x: Math.round(bitX + 1), y: Math.round(bitY + 1), alignX: 'left', alignY: 'top' };
  if (anchor === 'top-right') return { x: Math.round(bitX + px - 1), y: Math.round(bitY + 1), alignX: 'right', alignY: 'top' };
  return { x: Math.round(bitX + px - 1), y: Math.round(bitY + px - 1), alignX: 'right', alignY: 'bottom' };
}

export function drawBitOverlayIndicator(glyph, options) {
  if (!glyph) return;
  const {
    bitX,
    bitY,
    px,
    color,
    alpha,
    dotScale,
    dotMax,
    anchor,
    label,
    labelAnchor,
    labelScale,
    labelMax,
    labelThreshold,
  } = options;

  const dotR = Math.max(0.8, Math.min(px * dotScale, dotMax));
  const dot = dotPosition(bitX, bitY, px, dotR, anchor);
  glyph.drawDot(dot.x, dot.y, dotR, color[0], color[1], color[2], alpha);

  if (!label || px < labelThreshold) return;
  const labelSize = Math.max(4, Math.min(px * labelScale, labelMax));
  const pos = labelPosition(bitX, bitY, px, labelAnchor || anchor);
  glyph.drawText(label, pos.x, pos.y, labelSize, color[0], color[1], color[2], alpha, pos.alignX, pos.alignY);
}

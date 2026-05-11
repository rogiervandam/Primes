/**
 * GlyphCommandBuffer — main-thread encoder for glyph draw commands.
 *
 * Records drawText / drawDot / drawFilledRect / drawOutlineRect calls and
 * exposes the same measureText() interface as GlyphTextGLCore so that
 * SieveRenderer can use it as a drop-in replacement when the glyph renderer
 * runs inside the bit-grid worker.
 *
 * endFrame() returns transferable buffers that BitGridGLWorker passes along
 * with the render message so the worker can replay them via GlyphTextGLCore.
 */

// Command type codes (must match the replay switch in bitGridWorker.js)
export const CMD_TEXT  = 0;
export const CMD_DOT   = 1;
export const CMD_FRECT = 2;
export const CMD_ORECT = 3;

/** Floats per command record in the param buffer. */
const FLOATS_PER = 16;
/** Maximum number of recorded commands per frame. */
const MAX_CMDS   = 65536;
/** Maximum total bytes for encoded text strings. */
const MAX_TEXT   = 131072;

const ALIGN_CODES = { left: 0, start: 0, center: 1, right: 2, end: 2 };
const BASE_CODES  = { top: 0, middle: 1, bottom: 2, alphabetic: 3 };

// ATLAS_CHARS character order: printable ASCII 32–126 then × (U+00D7)
// charCode 32..126 → index = charCode - 32
// charCode 0xD7 (215) → index = 95
function _charIndex(code) {
  return code === 0xD7 ? 95 : code - 32;
}

export class GlyphCommandBuffer {
  /**
   * @param {{ advances: Float32Array, charSize: number }} atlasData
   *   Atlas advance widths and fontSize — received from the worker's ready message.
   */
  constructor({ advances, charSize }) {
    this._advances = advances;  // Float32Array[ATLAS_CHARS.length], advance widths in atlas pixels
    this._charSize = charSize;  // atlas fontSize in pixels

    this._paramBuf = new Float32Array(MAX_CMDS * FLOATS_PER);
    this._textBuf  = new Uint8Array(MAX_TEXT);
    this._count    = 0;
    this._textPos  = 0;
    this._cssW = 0;
    this._cssH = 0;
    this._dpr  = 1;
    this._snapDpr = 1;
  }

  // ---------------------------------------------------------------------------
  // Frame lifecycle (mirrors GlyphTextGLCore API)
  // ---------------------------------------------------------------------------

  /** Reset the buffer for a new frame. */
  beginFrame(cssW, cssH, dpr, _clear, snapDpr) {
    this._count   = 0;
    this._textPos = 0;
    this._cssW    = cssW;
    this._cssH    = cssH;
    this._dpr     = dpr || 1;
    this._snapDpr = snapDpr || this._dpr;
  }

  /**
   * Finalise the frame: produce transferable typed arrays.
   * The internal backing buffers are replaced so the caller can immediately
   * start the next frame.
   *
   * @returns {{ paramBuf: Float32Array, textBuf: Uint8Array, count: number,
   *             cssW: number, cssH: number, dpr: number }}
   */
  endFrame() {
    const count    = this._count;
    const textLen  = this._textPos;
    const paramBuf = this._paramBuf.slice(0, count * FLOATS_PER);
    const textBuf  = this._textBuf.slice(0, textLen);

    // Replace backing buffers for the next frame (old ones are transferred).
    this._paramBuf = new Float32Array(MAX_CMDS * FLOATS_PER);
    this._textBuf  = new Uint8Array(MAX_TEXT);
    this._count    = 0;
    this._textPos  = 0;

    return { paramBuf, textBuf, count, cssW: this._cssW, cssH: this._cssH, dpr: this._dpr, snapDpr: this._snapDpr };
  }

  // ---------------------------------------------------------------------------
  // Measurement helper (mirrors GlyphTextGLCore.measureText)
  // ---------------------------------------------------------------------------

  measureText(text, fontSize) {
    if (!text || !this._advances || !this._charSize) return 0;
    const scale = fontSize / this._charSize;
    let w = 0;
    for (let i = 0; i < text.length; i++) {
      const idx = _charIndex(text.charCodeAt(i));
      w += (idx >= 0 && idx < this._advances.length ? this._advances[idx] : this._charSize * 0.6) * scale;
    }
    return w;
  }

  // ---------------------------------------------------------------------------
  // Draw commands (API mirrors GlyphTextGLCore primitives)
  // ---------------------------------------------------------------------------

  drawText(text, x, y, fontSize, r, g, b, a, align = 'left', baseline = 'alphabetic') {
    if (!text || this._count >= MAX_CMDS) return;
    const textOffset = this._textPos;
    for (let i = 0; i < text.length && this._textPos < MAX_TEXT - 1; i++) {
      this._textBuf[this._textPos++] = text.charCodeAt(i) & 0xFF;
    }
    const textLen = this._textPos - textOffset;
    const base = this._count * FLOATS_PER;
    this._paramBuf[base +  0] = CMD_TEXT;
    this._paramBuf[base +  1] = x;
    this._paramBuf[base +  2] = y;
    this._paramBuf[base +  3] = fontSize;
    this._paramBuf[base +  4] = r;
    this._paramBuf[base +  5] = g;
    this._paramBuf[base +  6] = b;
    this._paramBuf[base +  7] = a;
    this._paramBuf[base +  8] = ALIGN_CODES[align]    ?? 0;
    this._paramBuf[base +  9] = BASE_CODES[baseline]  ?? 3;
    this._paramBuf[base + 10] = textOffset;
    this._paramBuf[base + 11] = textLen;
    // slots 12–15: unused
    this._count++;
  }

  drawDot(cx, cy, radius, r, g, b, a) {
    if (this._count >= MAX_CMDS) return;
    const base = this._count * FLOATS_PER;
    this._paramBuf[base +  0] = CMD_DOT;
    this._paramBuf[base +  1] = cx;
    this._paramBuf[base +  2] = cy;
    this._paramBuf[base +  3] = radius;
    this._paramBuf[base +  4] = r;
    this._paramBuf[base +  5] = g;
    this._paramBuf[base +  6] = b;
    this._paramBuf[base +  7] = a;
    // slots 8–15: unused
    this._count++;
  }

  drawFilledRect(x, y, w, h, r, g, b, a) {
    if (this._count >= MAX_CMDS) return;
    const base = this._count * FLOATS_PER;
    this._paramBuf[base +  0] = CMD_FRECT;
    this._paramBuf[base +  1] = x;
    this._paramBuf[base +  2] = y;
    this._paramBuf[base +  3] = w;
    this._paramBuf[base +  4] = h;
    this._paramBuf[base +  5] = r;
    this._paramBuf[base +  6] = g;
    this._paramBuf[base +  7] = b;
    this._paramBuf[base +  8] = a;
    // slots 9–15: unused
    this._count++;
  }

  drawOutlineRect(x, y, w, h, r, g, b, a, lineWidth) {
    if (this._count >= MAX_CMDS) return;
    const base = this._count * FLOATS_PER;
    this._paramBuf[base +  0] = CMD_ORECT;
    this._paramBuf[base +  1] = x;
    this._paramBuf[base +  2] = y;
    this._paramBuf[base +  3] = w;
    this._paramBuf[base +  4] = h;
    this._paramBuf[base +  5] = r;
    this._paramBuf[base +  6] = g;
    this._paramBuf[base +  7] = b;
    this._paramBuf[base +  8] = a;
    this._paramBuf[base +  9] = lineWidth ?? 1;
    // slots 10–15: unused
    this._count++;
  }

  /**
   * Mirrors GlyphTextGLCore.drawFittedText: finds the largest fontSize where
   * text fits in maxWidth, truncating with '…' if needed, then calls drawText.
   */
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
}

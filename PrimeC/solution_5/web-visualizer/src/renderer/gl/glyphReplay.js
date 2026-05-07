/**
 * glyphReplay.js — shared glyph command replay helper.
 *
 * Used by both bitGridWorker.js (OffscreenCanvas worker path) and
 * BitGridGLWorker.js (direct main-thread path for viewport-size modes).
 *
 * Extracted from bitGridWorker.js so both paths can stay in sync
 * without duplicating the ~60-line replay loop.
 */

// Command type codes — must match GlyphCommandBuffer.js constants.
const CMD_TEXT  = 0;
const CMD_DOT   = 1;
const CMD_FRECT = 2;
const CMD_ORECT = 3;

/** Floats per command record in the param buffer (must match GlyphCommandBuffer.js). */
const FLOATS_PER = 16;

const ALIGNS    = ['left', 'left', 'center', 'right'];
const BASELINES = ['top',  'middle', 'bottom', 'alphabetic'];

/**
 * Replay a serialised GlyphCommandBuffer payload via a live GlyphTextGLCore.
 * The canvas is NOT cleared (clear=false) so bit-grid fills remain visible.
 *
 * @param {import('./GlyphTextGLCore').GlyphTextGLCore} gc
 * @param {{ paramBuf: Float32Array, textBuf: Uint8Array, count: number,
 *           cssW: number, cssH: number, dpr: number }} cmds
 */
export function replayGlyphCmds(gc, cmds) {
  const { paramBuf, textBuf, count, cssW, cssH, dpr } = cmds;
  if (!count || !paramBuf) return;
  gc.beginFrame(cssW || 0, cssH || 0, dpr || 1, false);
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    const base = i * FLOATS_PER;
    const type = paramBuf[base + 0];
    switch (type) {
      case CMD_TEXT: {
        const x          = paramBuf[base + 1];
        const y          = paramBuf[base + 2];
        const fontSize   = paramBuf[base + 3];
        const r          = paramBuf[base + 4];
        const g          = paramBuf[base + 5];
        const b          = paramBuf[base + 6];
        const a          = paramBuf[base + 7];
        const align      = ALIGNS[paramBuf[base + 8] | 0]    || 'left';
        const baseline   = BASELINES[paramBuf[base + 9] | 0] || 'alphabetic';
        const textOffset = paramBuf[base + 10] | 0;
        const textLen    = paramBuf[base + 11] | 0;
        const text = textLen > 0 ? decoder.decode(textBuf.subarray(textOffset, textOffset + textLen)) : '';
        if (text) gc.drawText(text, x, y, fontSize, r, g, b, a, align, baseline);
        break;
      }
      case CMD_DOT: {
        gc.drawDot(
          paramBuf[base + 1], paramBuf[base + 2], paramBuf[base + 3],
          paramBuf[base + 4], paramBuf[base + 5], paramBuf[base + 6], paramBuf[base + 7],
        );
        break;
      }
      case CMD_FRECT: {
        gc.drawFilledRect(
          paramBuf[base + 1], paramBuf[base + 2], paramBuf[base + 3], paramBuf[base + 4],
          paramBuf[base + 5], paramBuf[base + 6], paramBuf[base + 7], paramBuf[base + 8],
        );
        break;
      }
      case CMD_ORECT: {
        gc.drawOutlineRect(
          paramBuf[base + 1], paramBuf[base + 2], paramBuf[base + 3], paramBuf[base + 4],
          paramBuf[base + 5], paramBuf[base + 6], paramBuf[base + 7], paramBuf[base + 8],
          paramBuf[base + 9],
        );
        break;
      }
      default:
        break;
    }
  }
  gc.endFrame();
}

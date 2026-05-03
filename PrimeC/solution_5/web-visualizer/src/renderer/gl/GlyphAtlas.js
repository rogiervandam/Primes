/**
 * GlyphAtlas — builds a bitmap font texture atlas from the system monospace
 * font. All printable ASCII characters (code-points 32–126) plus the
 * Unicode '×' character are rendered into a single RGBA8 texture using a
 * 2D canvas. The alpha channel encodes the anti-aliased glyph mask; RGB
 * channels are always 255 (white). GlyphTextGLCore multiplies the sampled
 * alpha by the desired draw colour.
 *
 * Layout: `cols` glyphs per row, rows as needed. Each cell is (cellW × cellH)
 * pixels. Characters are drawn with textBaseline='alphabetic'; the baseline
 * sits at `ascent + padding` from the cell top.
 *
 * Usage:
 *   const atlas = new GlyphAtlas({ fontSize: 32 });
 *   atlas.build();         // synchronous; requires DOM canvas API
 *   atlas.upload(gl);      // upload RGBA8 texture; bind before calling this
 *   const glyph = atlas.get('A');  // { u0, v0, u1, v1, advW }
 *   const w = atlas.measureWidth('123', scale);
 */

/** All characters rendered into the atlas. */
export const ATLAS_CHARS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?' +
  '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
  'abcdefghijklmnopqrstuvwxyz{|}~\u00d7'; // × at end

export class GlyphAtlas {
  /**
   * @param {object} [opts]
   * @param {number} [opts.fontSize=32] - Atlas render size in px.
   * @param {number} [opts.cols=16]     - Glyphs per row in the atlas.
   * @param {string} [opts.fontFamily='monospace'] - CSS font family.
   */
  constructor({ fontSize = 32, cols = 16, fontFamily = 'monospace' } = {}) {
    this._fontSize = fontSize;
    this._fontFamily = fontFamily;
    this._cols = cols;
    this._charMap = new Map();
    this._atlasW = 0;
    this._atlasH = 0;
    this._cellW = 0;
    this._cellH = 0;
    this._ascent = 0;
    this._imageData = null;
    /** @type {WebGLTexture|null} */
    this.texture = null;
  }

  /**
   * Render all glyphs onto a hidden 2D canvas and cache the ImageData.
   * Must be called before `upload()`. Safe to call on the main thread only.
   * @returns {this}
   */
  build() {
    const chars = ATLAS_CHARS;
    const fontSize = this._fontSize;
    const fontFamily = this._fontFamily;
    const cols = this._cols;
    const rows = Math.ceil(chars.length / cols);

    // -- Measure font metrics -------------------------------------------------
    const mc = document.createElement('canvas');
    mc.width = 512;
    mc.height = 64;
    const mctx = mc.getContext('2d');
    mctx.font = `${fontSize}px ${fontFamily}`;

    // Use a tall representative string to capture ascent & descent reliably.
    const testMetrics = mctx.measureText('Agj|q×');
    const ascent  = Math.ceil(testMetrics.actualBoundingBoxAscent  || fontSize * 0.78);
    const descent = Math.ceil(testMetrics.actualBoundingBoxDescent || fontSize * 0.22);

    // Cell width: widest char + 4 px lateral padding.
    let maxAdvW = 0;
    for (const ch of chars) {
      maxAdvW = Math.max(maxAdvW, mctx.measureText(ch).width);
    }
    const cellW = Math.ceil(maxAdvW) + 4;
    const cellH = ascent + descent + 4; // 2 px top + 2 px bottom padding

    this._cellW  = cellW;
    this._cellH  = cellH;
    this._ascent = ascent;

    const atlasW = cols * cellW;
    const atlasH = rows * cellH;
    this._atlasW = atlasW;
    this._atlasH = atlasH;

    // -- Render glyphs --------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.width  = atlasW;
    canvas.height = atlasH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, atlasW, atlasH);
    ctx.fillStyle    = 'white';
    ctx.font         = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'left';

    for (let i = 0; i < chars.length; i++) {
      const ch  = chars[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      // Draw at cell origin + padding; baseline = top + ascent + 2 px padding.
      ctx.fillText(ch, col * cellW + 2, row * cellH + ascent + 2);

      const advW = mctx.measureText(ch).width;
      const u0 = (col * cellW)       / atlasW;
      const v0 = (row * cellH)       / atlasH;
      const u1 = ((col + 1) * cellW) / atlasW;
      const v1 = ((row + 1) * cellH) / atlasH;
      this._charMap.set(ch, { u0, v0, u1, v1, advW });
    }

    this._imageData = ctx.getImageData(0, 0, atlasW, atlasH);
    return this;
  }

  /**
   * Upload the atlas as a WebGL2 RGBA8 texture. Binds to
   * `gl.TEXTURE_2D` on unit 0; callers should re-bind as needed.
   * @param {WebGL2RenderingContext} gl
   * @returns {this}
   */
  upload(gl) {
    if (!this._imageData) throw new Error('GlyphAtlas: call build() before upload()');
    if (this.texture) gl.deleteTexture(this.texture);
    this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA8,
      this._atlasW, this._atlasH, 0,
      gl.RGBA, gl.UNSIGNED_BYTE,
      this._imageData.data,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return this;
  }

  /**
   * Glyph metrics for a character. Returns the space glyph as fallback.
   * @param {string} ch
   * @returns {{ u0: number, v0: number, u1: number, v1: number, advW: number }}
   */
  get(ch) {
    return this._charMap.get(ch) || this._charMap.get(' ');
  }

  /** Cell width in atlas pixels (same for every glyph). */
  get cellWidth()  { return this._cellW; }
  /** Cell height in atlas pixels (same for every glyph). */
  get cellHeight() { return this._cellH; }
  /** Ascent from cell top (in atlas pixels). */
  get ascent()     { return this._ascent; }
  /** Atlas texture width in pixels. */
  get atlasWidth() { return this._atlasW; }
  /** Atlas texture height in pixels. */
  get atlasHeight(){ return this._atlasH; }
  /** Font size used to render the atlas (px). */
  get fontSize()   { return this._fontSize; }

  /**
   * Sum of advance widths for `text` at a given scale factor.
   * `scale = targetFontSize / atlas.fontSize`.
   * @param {string} text
   * @param {number} [scale=1]
   */
  measureWidth(text, scale = 1) {
    let w = 0;
    for (const ch of text) {
      const g = this._charMap.get(ch);
      w += (g ? g.advW : this._cellW * 0.6) * scale;
    }
    return w;
  }

  /** Delete the WebGL texture and free cached image data. */
  dispose(gl) {
    if (this.texture && gl) gl.deleteTexture(this.texture);
    this.texture   = null;
    this._imageData = null;
  }
}

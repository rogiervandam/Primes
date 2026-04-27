/**
 * BitGridGL — experimental WebGL2 bit-grid renderer.
 *
 * SCOPE (see docs/AI_MAINTENANCE.md §8):
 *   - Base bit pass only: cleared / set / changed colors.
 *   - Single fullscreen quad whose fragment shader samples a R8UI data
 *     texture of `bitState` (with the changed flag packed into bit 1).
 *   - Uniform grid layout (cols × rows). Vector grouping, cacheline
 *     grouping, custom grouping, lowered-3D, labels, overlays, minimap,
 *     focus/range/multiples/prime overlays and motion trails are NOT
 *     implemented. Use the Canvas2D path for any of those.
 *   - Context loss is handled by setting `_lost` and silently no-op'ing
 *     subsequent draws. Reload the page to recover.
 *
 * INTENDED USE:
 *   - Regression sandbox for benchmarking the shader-based color path.
 *   - Mounted under the Canvas2D layer when `?renderer=gl` is set, so
 *     overlays/labels keep working unchanged on top.
 */

const VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Grid math is done in the fragment shader: each fragment maps its
// canvas-space pixel back through (panX, panY, zoom, pixelSize) to a
// (col, row) → bit index, samples the state texture and paints the
// matching color. Inter-bit gaps render as background.
const FS = `#version 300 es
precision highp float;
precision highp usampler2D;

uniform vec2 u_canvasSize;          // CSS pixels (pre-DPR)
uniform vec2 u_pan;                 // pan in CSS pixels
uniform float u_zoom;
uniform float u_pixelSize;          // base bit cell size in CSS px
uniform float u_bitGap;             // gap between bits in CSS px (post-zoom)
uniform int u_cols;                 // bits per row
uniform int u_bitCount;
uniform ivec2 u_texSize;
uniform usampler2D u_state;         // per-bit state byte

uniform vec3 u_bgColor;
uniform vec3 u_setColor;
uniform vec3 u_clearedColor;
uniform vec3 u_changedColor;
uniform float u_baseAlpha;

in vec2 v_uv;
out vec4 outColor;

void main() {
  // v_uv is (0,0) bottom-left → (1,1) top-right; flip Y to canvas convention.
  vec2 canvasPx = vec2(v_uv.x, 1.0 - v_uv.y) * u_canvasSize;
  vec2 local = canvasPx - u_pan;

  float cell = max(1.0, u_pixelSize * u_zoom);
  float gap = max(0.0, u_bitGap);
  float stride = cell + gap;

  if (local.x < 0.0 || local.y < 0.0) { outColor = vec4(u_bgColor, 1.0); return; }

  float colF = floor(local.x / stride);
  float rowF = floor(local.y / stride);
  if (colF < 0.0 || colF >= float(u_cols)) { outColor = vec4(u_bgColor, 1.0); return; }

  // Inside the gap between cells → background.
  float xInCell = local.x - colF * stride;
  float yInCell = local.y - rowF * stride;
  if (xInCell >= cell || yInCell >= cell) { outColor = vec4(u_bgColor, 1.0); return; }

  int col = int(colF);
  int row = int(rowF);
  int bit = row * u_cols + col;
  if (bit < 0 || bit >= u_bitCount) { outColor = vec4(u_bgColor, 1.0); return; }

  int tx = bit % u_texSize.x;
  int ty = bit / u_texSize.x;
  uint state = texelFetch(u_state, ivec2(tx, ty), 0).r;

  // bit 0 = set/cleared, bit 1 = changed-this-step
  bool isSet = (state & 1u) != 0u;
  bool isChanged = (state & 2u) != 0u;

  vec3 color;
  if (isChanged) color = u_changedColor;
  else if (isSet) color = u_setColor;
  else color = u_clearedColor;

  outColor = vec4(mix(u_bgColor, color, u_baseAlpha), 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`BitGridGL shader compile failed: ${log}`);
  }
  return sh;
}

function link(gl, vs, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`BitGridGL program link failed: ${log}`);
  }
  return prog;
}

export class BitGridGL {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.vao = null;
    this.tex = null;
    this.bitCount = 0;
    this.texW = 0;
    this.texH = 0;
    this._stateBytes = null;       // Uint8Array sized to texW*texH
    this._lost = false;
    this._uniforms = {};
  }

  attach(canvas) {
    if (!canvas) return false;
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) {
      this._lost = true;
      return false;
    }
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._lost = true;
    }, false);
    try {
      this._initProgram();
      this._initQuad();
    } catch (err) {
      console.warn('[BitGridGL] init failed:', err);
      this._lost = true;
      return false;
    }
    return true;
  }

  _initProgram() {
    const gl = this.gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    this.program = link(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const u = (n) => gl.getUniformLocation(this.program, n);
    this._uniforms = {
      canvasSize: u('u_canvasSize'),
      pan: u('u_pan'),
      zoom: u('u_zoom'),
      pixelSize: u('u_pixelSize'),
      bitGap: u('u_bitGap'),
      cols: u('u_cols'),
      bitCount: u('u_bitCount'),
      texSize: u('u_texSize'),
      state: u('u_state'),
      bgColor: u('u_bgColor'),
      setColor: u('u_setColor'),
      clearedColor: u('u_clearedColor'),
      changedColor: u('u_changedColor'),
      baseAlpha: u('u_baseAlpha'),
    };
  }

  _initQuad() {
    const gl = this.gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
       1, -1,  1,  1,  -1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /**
   * (Re)allocate the state texture for the given bit count. Idempotent.
   * Picks a roughly-square texture so the largest dimension stays under
   * the GL implementation's MAX_TEXTURE_SIZE.
   */
  resizeForBitCount(bitCount) {
    if (this._lost || !this.gl) return;
    if (this.bitCount === bitCount && this.tex) return;
    this.bitCount = bitCount;
    const dim = Math.max(1, Math.ceil(Math.sqrt(bitCount)));
    this.texW = dim;
    this.texH = Math.max(1, Math.ceil(bitCount / dim));
    this._stateBytes = new Uint8Array(this.texW * this.texH);

    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.R8UI, this.texW, this.texH, 0,
      gl.RED_INTEGER, gl.UNSIGNED_BYTE, this._stateBytes,
    );
  }

  /**
   * Pack `bitState` (Uint8Array of 0/1) and `changedBits` (Set<number>)
   * into the state texture: bit0 = set, bit1 = changed.
   */
  uploadState(bitState, changedBits) {
    if (this._lost || !this.gl || !this.tex) return;
    if (!bitState) return;
    const buf = this._stateBytes;
    const n = Math.min(this.bitCount, bitState.length);
    for (let i = 0; i < n; i++) buf[i] = bitState[i] ? 1 : 0;
    if (changedBits && typeof changedBits.forEach === 'function') {
      changedBits.forEach((bit) => {
        if (bit >= 0 && bit < this.bitCount) buf[bit] |= 2;
      });
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, this.texW, this.texH,
      gl.RED_INTEGER, gl.UNSIGNED_BYTE, buf,
    );
  }

  /** Resize the drawing buffer to match CSS pixel size at current DPR. */
  resize(cssWidth, cssHeight) {
    if (this._lost || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
  }

  /**
   * Render one frame.
   *
   * @param {object} params
   * @param {number} params.panX
   * @param {number} params.panY
   * @param {number} params.zoom
   * @param {number} params.pixelSize    base bit cell size in CSS px
   * @param {number} params.bitGap       gap between bits in CSS px (post-zoom)
   * @param {number} params.cols         bits per row
   * @param {number[]} params.bgColor    [r,g,b] 0..255
   * @param {number[]} params.setColor   [r,g,b] 0..255
   * @param {number[]} params.clearedColor [r,g,b] 0..255
   * @param {number[]} params.changedColor [r,g,b] 0..255
   * @param {number} params.baseAlpha    0..1
   */
  render(params) {
    if (this._lost || !this.gl || !this.program || !this.tex) return;
    const gl = this.gl;
    const cssW = parseFloat(this.canvas.style.width) || (this.canvas.width / (window.devicePixelRatio || 1));
    const cssH = parseFloat(this.canvas.style.height) || (this.canvas.height / (window.devicePixelRatio || 1));

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(
      (params.bgColor[0] || 0) / 255,
      (params.bgColor[1] || 0) / 255,
      (params.bgColor[2] || 0) / 255,
      1,
    );
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this._uniforms.state, 0);

    const u = this._uniforms;
    gl.uniform2f(u.canvasSize, cssW, cssH);
    gl.uniform2f(u.pan, params.panX || 0, params.panY || 0);
    gl.uniform1f(u.zoom, params.zoom || 1);
    gl.uniform1f(u.pixelSize, params.pixelSize || 2);
    gl.uniform1f(u.bitGap, params.bitGap || 0);
    gl.uniform1i(u.cols, Math.max(1, params.cols | 0));
    gl.uniform1i(u.bitCount, this.bitCount);
    gl.uniform2i(u.texSize, this.texW, this.texH);
    gl.uniform3f(u.bgColor, params.bgColor[0] / 255, params.bgColor[1] / 255, params.bgColor[2] / 255);
    gl.uniform3f(u.setColor, params.setColor[0] / 255, params.setColor[1] / 255, params.setColor[2] / 255);
    gl.uniform3f(u.clearedColor, params.clearedColor[0] / 255, params.clearedColor[1] / 255, params.clearedColor[2] / 255);
    gl.uniform3f(u.changedColor, params.changedColor[0] / 255, params.changedColor[1] / 255, params.changedColor[2] / 255);
    gl.uniform1f(u.baseAlpha, params.baseAlpha == null ? 1 : params.baseAlpha);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.tex) gl.deleteTexture(this.tex);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.tex = null;
    this.program = null;
    this.vao = null;
    this.gl = null;
    this.canvas = null;
  }
}

/**
 * GlyphTextGLCore — WebGL2 text and dot renderer for the sieve visualiser.
 *
 * Draws batched, instanced quads each frame. Two primitive types are
 * supported:
 *   • Glyph quads   — sample the GlyphAtlas texture; alpha from the atlas.
 *   • Circle quads  — analytic smooth-edged disk; no texture required.
 *
 * Intended use (called from SieveRenderer when `webglText` is enabled):
 *
 *   renderer.beginFrame(cssW, cssH, dpr);     // clears canvas + resets batch
 *   renderer.drawDot(cx, cy, r, r, g, b, a);  // add a filled circle
 *   renderer.drawText(text, x, y, size, ...); // add a string
 *   renderer.endFrame();                       // upload + draw
 *
 * The canvas must be placed in the DOM stack above all other canvases so
 * its transparent background lets lower layers show through. Use:
 *   canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true })
 * and output premultiplied colours from the fragment shader so the browser
 * compositor blends correctly.
 *
 * Instance layout (FLOATS_PER = 13 floats per instance):
 *   [0..3]  a_posSize  — top-left (x, y) and size (w, h) in CSS pixels
 *   [4..7]  a_uvRect   — (u0, v0, u1, v1) atlas UVs (ignored for circles)
 *   [8..11] a_color    — (r, g, b, alpha) normalised [0..1]; premultiplied
 *                        before upload
 *   [12]    a_mode     — 0.0 = glyph, 1.0 = circle
 */

import { GlyphAtlas } from './GlyphAtlas.js';

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VS = `#version 300 es
precision highp float;

// Per-vertex (divisor 0)
layout(location = 0) in vec2 a_corner;      // unit quad [-0.5, +0.5]

// Per-instance (divisor 1)
layout(location = 1) in vec4 a_posSize;     // x, y, w, h  (CSS px, top-left)
layout(location = 2) in vec4 a_uvRect;      // u0, v0, u1, v1
layout(location = 3) in vec4 a_color;       // r, g, b, a  (already premultiplied)
layout(location = 4) in float a_mode;       // 0 = glyph, 1 = circle

uniform vec2 u_canvasSize;   // CSS px
uniform float u_dpr;

flat out vec4  v_color;
flat out float v_mode;
out vec2 v_cellUV;            // [0,1]^2 within the quad (for circle SDF)
out vec2 v_atlasUV;           // atlas UV coordinates

void main() {
  v_color   = a_color;
  v_mode    = a_mode;

  vec2 localUV  = a_corner + 0.5;   // map [-0.5,0.5] → [0,1]
  v_cellUV  = localUV;
  v_atlasUV = mix(a_uvRect.xy, a_uvRect.zw, localUV);

  vec2 topLeft = a_posSize.xy;
  vec2 size    = a_posSize.zw;
  vec2 pos     = topLeft + localUV * size;

  // Sub-pixel snapping (only when DPR is meaningfully above 1).
  if (u_dpr > 1.01) {
    pos = floor(pos * u_dpr + 0.5) / u_dpr;
  }

  vec2 clip = (pos / u_canvasSize) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision mediump float;

uniform sampler2D u_atlas;

flat in vec4  v_color;
flat in float v_mode;
in vec2 v_cellUV;
in vec2 v_atlasUV;

out vec4 outColor;

void main() {
  // v_color.rgb is already premultiplied (r*a, g*a, b*a); v_color.a is
  // the straight alpha.  We need to scale both by the shape mask so the
  // output is also premultiplied: (r*a*mask, g*a*mask, b*a*mask, a*mask).
  float mask;
  if (v_mode > 0.5) {
    // Smooth-edged circle SDF: distance from quad centre in [0,1] range.
    float d = distance(v_cellUV, vec2(0.5, 0.5)) * 2.0;
    mask = 1.0 - smoothstep(0.85, 1.0, d);
  } else {
    // Glyph: mask = coverage from the atlas alpha channel.
    mask = texture(u_atlas, v_atlasUV).a;
  }
  // Output premultiplied RGBA so the browser compositor blends correctly.
  outColor = vec4(v_color.rgb * mask, v_color.a * mask);
}`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of float32 values per instance. */
const FLOATS_PER = 13;
/** Maximum glyphs/dots batched before a flush is forced. */
const MAX_INSTANCES = 65536;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`GlyphTextGL shader compile: ${log}`);
  }
  return sh;
}

function link(gl, vs, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`GlyphTextGL link: ${log}`);
  }
  return prog;
}

// ---------------------------------------------------------------------------
// GlyphTextGLCore
// ---------------------------------------------------------------------------

export class GlyphTextGLCore {
  constructor() {
    /** @type {HTMLCanvasElement|null} */
    this.canvas = null;
    /** @type {WebGL2RenderingContext|null} */
    this.gl = null;
    this._program    = null;
    this._vao        = null;
    this._cornerVBO  = null;
    this._instanceVBO = null;
    /** @type {GlyphAtlas|null} */
    this._atlas      = null;
    this._buf        = new Float32Array(MAX_INSTANCES * FLOATS_PER);
    this._count      = 0;
    this._uniforms   = {};
    this._cssW       = 1;
    this._cssH       = 1;
    this._dpr        = 1;
    this._lost       = false;
  }

  /**
   * Initialise WebGL2 on `canvas`. Returns `false` if WebGL2 is unavailable.
   * Must be called once before any other method.
   * @param {HTMLCanvasElement} canvas
   */
  init(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      // preserveDrawingBuffer: false is fine here — the glyph layer is
      // fully redrawn every frame via beginFrame() + endFrame().
    });
    if (!gl) {
      this._lost = true;
      return false;
    }
    this.gl = gl;
    try {
      this._initProgram();
      this._initBuffers();
      this._initAtlas();
    } catch (err) {
      this._lost = true;
      throw err;
    }
    return true;
  }

  _initProgram() {
    const gl = this.gl;
    const vs = compile(gl, gl.VERTEX_SHADER,   VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    this._program = link(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const u = (n) => gl.getUniformLocation(this._program, n);
    this._uniforms = {
      canvasSize: u('u_canvasSize'),
      dpr:        u('u_dpr'),
      atlas:      u('u_atlas'),
    };
  }

  _initBuffers() {
    const gl = this.gl;
    this._vao = gl.createVertexArray();
    gl.bindVertexArray(this._vao);

    // Location 0 — static unit-quad corners (divisor 0, shared by all instances)
    this._cornerVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._cornerVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5,   0.5, -0.5,   -0.5,  0.5,
       0.5, -0.5,   0.5,  0.5,   -0.5,  0.5,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0); // per-vertex

    // Locations 1–4 — per-instance data (divisor 1)
    this._instanceVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceVBO);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_INSTANCES * FLOATS_PER * 4, gl.DYNAMIC_DRAW);

    const stride = FLOATS_PER * 4; // bytes
    let offset = 0;

    // loc 1: a_posSize (vec4 — x, y, w, h)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(1, 1);
    offset += 4 * 4;

    // loc 2: a_uvRect (vec4 — u0, v0, u1, v1)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 4 * 4;

    // loc 3: a_color (vec4 — r, g, b, a; premultiplied)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 4 * 4;

    // loc 4: a_mode (float — 0=glyph, 1=circle)
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);
  }

  _initAtlas() {
    const atlas = new GlyphAtlas({ fontSize: 32 });
    atlas.build();
    atlas.upload(this.gl); // binds TEXTURE0 during upload
    this._atlas = atlas;
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  /**
   * Resize the backing store. Call whenever the canvas CSS size or DPR changes.
   * @param {number} cssW
   * @param {number} cssH
   * @param {number} dpr
   */
  resize(cssW, cssH, dpr) {
    if (this._lost || !this.canvas) return;
    const r = Math.max(1, dpr || 1);
    this._dpr  = r;
    this._cssW = cssW;
    this._cssH = cssH;
    const pw = Math.max(1, Math.round(cssW * r));
    const ph = Math.max(1, Math.round(cssH * r));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width  = pw;
      this.canvas.height = ph;
    }
    this.canvas.style.width  = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  // ---------------------------------------------------------------------------
  // Frame lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Begin a new frame: set viewport, clear to transparent, reset the batch.
   * Must be called once at the start of each render cycle.
   * @param {number} cssW
   * @param {number} cssH
   * @param {number} dpr
   */
  beginFrame(cssW, cssH, dpr) {
    if (this._lost || !this.gl) return;
    this._cssW  = cssW;
    this._cssH  = cssH;
    const r = Math.max(1, dpr || 1);
    this._dpr   = r;
    this._count = 0;

    // Lazily size the canvas backing store in case resize() was never
    // explicitly called (e.g. on the very first render before the layout
    // refresh effect fires).
    const pw = Math.max(1, Math.round(cssW * r));
    const ph = Math.max(1, Math.round(cssH * r));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width  = pw;
      this.canvas.height = ph;
    }
    if (!this.canvas.style.width) {
      this.canvas.style.width  = `${cssW}px`;
      this.canvas.style.height = `${cssH}px`;
    }

    const gl = this.gl;
    gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // ---------------------------------------------------------------------------
  // Batch primitives
  // ---------------------------------------------------------------------------

  /** @private */
  _addInstance(x, y, w, h, u0, v0, u1, v1, pr, pg, pb, pa, mode) {
    if (this._count >= MAX_INSTANCES) return;
    const i = this._count * FLOATS_PER;
    this._buf[i +  0] = x;
    this._buf[i +  1] = y;
    this._buf[i +  2] = w;
    this._buf[i +  3] = h;
    this._buf[i +  4] = u0;
    this._buf[i +  5] = v0;
    this._buf[i +  6] = u1;
    this._buf[i +  7] = v1;
    // Store premultiplied colour so the shader can output it directly.
    this._buf[i +  8] = pr * pa;
    this._buf[i +  9] = pg * pa;
    this._buf[i + 10] = pb * pa;
    this._buf[i + 11] = pa;
    this._buf[i + 12] = mode;
    this._count++;
  }

  /**
   * Add a filled circle (disk) to the batch.
   * @param {number} cx     - Centre X in CSS pixels.
   * @param {number} cy     - Centre Y in CSS pixels.
   * @param {number} radius - Radius in CSS pixels.
   * @param {number} r      - Red   [0..1].
   * @param {number} g      - Green [0..1].
   * @param {number} b      - Blue  [0..1].
   * @param {number} a      - Alpha [0..1].
   */
  drawDot(cx, cy, radius, r, g, b, a) {
    if (this._lost || !this._atlas) return;
    const d = radius * 2;
    // UV = (0,0)→(1,1) so the fragment shader gets the full [0,1]^2 range
    // for the circle SDF.
    this._addInstance(cx - radius, cy - radius, d, d, 0, 0, 1, 1, r, g, b, a, 1.0);
  }

  /**
   * Add a text string to the batch. Each character becomes one instanced quad.
   *
   * @param {string} text
   * @param {number} x          - Anchor X in CSS pixels.
   * @param {number} y          - Anchor Y in CSS pixels.
   * @param {number} fontSize   - Target font size in CSS pixels.
   * @param {number} r          - Red   [0..1].
   * @param {number} g          - Green [0..1].
   * @param {number} b          - Blue  [0..1].
   * @param {number} a          - Alpha [0..1].
   * @param {string} [align='left']        - 'left'|'center'|'right'
   * @param {string} [baseline='alphabetic'] - 'top'|'middle'|'alphabetic'|'bottom'
   */
  drawText(text, x, y, fontSize, r, g, b, a, align = 'left', baseline = 'alphabetic') {
    if (this._lost || !this._atlas || !text) return;
    const atlas  = this._atlas;
    const scale  = fontSize / atlas.fontSize;
    const cellH  = atlas.cellHeight * scale;
    const ascent = atlas.ascent     * scale;

    // Total advance width for alignment.
    let totalW = 0;
    for (const ch of text) {
      const glyph = atlas.get(ch);
      totalW += (glyph ? glyph.advW : atlas.cellWidth) * scale;
    }

    // Left-edge X.
    let left;
    if (align === 'center') left = x - totalW / 2;
    else if (align === 'right' || align === 'end') left = x - totalW;
    else left = x; // 'left', 'start'

    // Top-edge Y (quad top corresponds to atlas cell top).
    let top;
    if (baseline === 'top') top = y;
    else if (baseline === 'middle') top = y - cellH / 2;
    else if (baseline === 'bottom') top = y - cellH;
    else top = y - ascent; // 'alphabetic' (default)

    let cx = left;
    for (const ch of text) {
      const glyph = atlas.get(ch);
      if (!glyph) { cx += atlas.cellWidth * scale; continue; }
      const qw = atlas.cellWidth * scale;
      this._addInstance(cx, top, qw, cellH, glyph.u0, glyph.v0, glyph.u1, glyph.v1, r, g, b, a, 0.0);
      cx += glyph.advW * scale;
    }
  }

  // ---------------------------------------------------------------------------
  // Flush
  // ---------------------------------------------------------------------------

  /**
   * Upload the accumulated instance buffer and issue one draw call.
   * Must be called after all `drawText`/`drawDot` calls for the frame.
   */
  endFrame() {
    if (this._lost || !this.gl || this._count === 0) return;
    const gl = this.gl;

    gl.enable(gl.BLEND);
    // Premultiplied alpha: src=ONE, dst=1-srcAlpha.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this._program);
    gl.bindVertexArray(this._vao);

    // Upload only the filled portion of the instance buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceVBO);
    gl.bufferSubData(
      gl.ARRAY_BUFFER, 0,
      this._buf, 0, this._count * FLOATS_PER,
    );

    // Bind atlas texture.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._atlas.texture);
    gl.uniform1i(this._uniforms.atlas, 0);

    gl.uniform2f(this._uniforms.canvasSize, this._cssW, this._cssH);
    gl.uniform1f(this._uniforms.dpr,        this._dpr);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this._count);

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Free all GPU resources. */
  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this._atlas)       this._atlas.dispose(gl);
    if (this._instanceVBO) gl.deleteBuffer(this._instanceVBO);
    if (this._cornerVBO)   gl.deleteBuffer(this._cornerVBO);
    if (this._vao)         gl.deleteVertexArray(this._vao);
    if (this._program)     gl.deleteProgram(this._program);
    this.gl          = null;
    this._program    = null;
    this._vao        = null;
    this._cornerVBO  = null;
    this._instanceVBO = null;
    this._atlas      = null;
    this.canvas      = null;
  }
}

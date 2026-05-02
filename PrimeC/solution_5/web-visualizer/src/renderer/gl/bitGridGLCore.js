/**
 * BitGridGLCore — the pure-WebGL2 part of the bit-grid renderer.
 *
 * Has NO references to `window`, `document`, `HTMLCanvasElement` or any
 * other DOM-only API. Accepts either an `HTMLCanvasElement` or an
 * `OffscreenCanvas`. All DPR / sizing /
 * pan / colour decisions are passed in as plain values.
 *
 * This is the substrate used by `bitGridWorker.js`, the production worker
 * that owns the transferred OffscreenCanvas. The shaders, state-flag layout
 * and overlay tints are the source of truth for the GL parity harness.
 */

// State-flag bit layout (one byte per bit, R8UI):
//   bit 0: set
//   bit 1: changed
//   bit 2: ghost-masked
//   bit 3: repeated write
//   bit 4: prime-overlay member
//   bit 5: range-overlay member
//   bit 6: multiples-overlay member
//   bit 7: focus-range member

const VS = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_corner;       // unit quad corners (-0.5..0.5)

uniform vec2 u_canvasSize;     // CSS pixels (pre-DPR)
uniform vec2 u_pan;            // CSS pixels
uniform float u_cellSize;      // base bit cell size in CSS px (already includes zoom)
uniform float u_dpr;           // device-pixel ratio; used to snap edges to the device grid
uniform sampler2D u_pos;       // RG32F: per-bit (x,y) in CSS px, pan-independent
uniform sampler2D u_state;     // RGBA8: per-bit packed flag byte in .r (normalized 0-1)
uniform sampler2D u_anim;      // RGBA32F: per-bit (xDelta, yDelta, sizeScale, _unused)
uniform ivec2 u_texSize;
uniform int u_bitCount;

flat out uint v_state;
out vec2 v_uv;                 // [0,1]x[0,1] within the cell; used by FS for border detection

void main() {
  int bit = gl_InstanceID;
  v_uv = a_corner + 0.5;
  if (bit >= u_bitCount) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0); // off-screen
    return;
  }
  int tx = bit % u_texSize.x;
  int ty = bit / u_texSize.x;
  vec2 basePos = texelFetch(u_pos, ivec2(tx, ty), 0).rg;
  // State byte stored as normalized R in RGBA8 texture; decode to uint.
  v_state = uint(round(texelFetch(u_state, ivec2(tx, ty), 0).r * 255.0));
  vec4 animData = texelFetch(u_anim, ivec2(tx, ty), 0);
  float animScale = max(0.01, animData.z);  // sizeScale (default 1.0 when not lowered)

  vec2 centre = basePos + u_pan + animData.xy;  // apply per-bit position delta
  vec2 corner = centre + a_corner * u_cellSize * animScale;  // apply per-bit size scale
  // DPR snap to device-pixel grid; no-op on integer DPR.
  corner = floor(corner * u_dpr + 0.5) / u_dpr;

  vec2 clip = (corner / u_canvasSize) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;

uniform vec3 u_setColor;
uniform vec3 u_clearedColor;
uniform vec3 u_changedColor;
uniform vec3 u_repeatedColor;
uniform vec3 u_bgColor;
uniform float u_baseAlpha;
uniform float u_cellSize;      // CSS px cell size; used for border-width fractions
uniform float u_loweredActive; // 1.0 when loweredSetBits mode is on, else 0.0

flat in uint v_state;
in vec2 v_uv;                  // [0,1]x[0,1] within cell (from VS)
out vec4 outColor;

const vec4 FOCUS_TINT = vec4(96.0/255.0, 165.0/255.0, 250.0/255.0, 0.16);
const vec4 PRIME_TINT = vec4(251.0/255.0, 191.0/255.0,  36.0/255.0, 0.38);
const vec4 RANGE_TINT = vec4( 34.0/255.0, 211.0/255.0, 238.0/255.0, 0.42);
const vec4 MULT_TINT  = vec4(167.0/255.0, 139.0/255.0, 250.0/255.0, 0.40);

vec3 overlay(vec3 base, vec4 tint) {
  return mix(base, tint.rgb, tint.a);
}

void main() {
  bool isSet      = (v_state & 1u)  != 0u;
  bool isChanged  = (v_state & 2u)  != 0u;
  bool isGhost    = (v_state & 4u)  != 0u;
  bool isRepeated = (v_state & 8u)  != 0u;
  bool isPrime    = (v_state & 16u) != 0u;
  bool isRange    = (v_state & 32u) != 0u;
  bool isMult     = (v_state & 64u) != 0u;
  bool isFocus    = (v_state & 128u)!= 0u;

  vec3 color;
  float alpha;
  if (isGhost) {
    color = u_clearedColor; alpha = 1.0;
  } else if (isRepeated && isChanged) {
    color = u_repeatedColor; alpha = 1.0;
  } else if (isChanged) {
    color = u_changedColor; alpha = 1.0;
  } else if (isSet) {
    color = u_setColor; alpha = u_baseAlpha;
  } else {
    color = u_clearedColor; alpha = u_baseAlpha;
  }

  vec3 composed = mix(u_bgColor, color, alpha);
  if (isFocus) composed = overlay(composed, FOCUS_TINT);
  if (isPrime) composed = overlay(composed, PRIME_TINT);
  if (isRange) composed = overlay(composed, RANGE_TINT);
  if (isMult)  composed = overlay(composed, MULT_TINT);

  // Border rendering -- mirrors Canvas2D strokeRect logic in
  // _drawBitPrimeOverlay / _drawBitRangeOverlay / _drawBitMultiplesOverlay.
  // Only drawn when cellSize >= 4 px (matching the "if (px >= 4)" guards).
  // Priority: prime first, range second, multiples third (last writer wins,
  // matching the draw order in SieveRenderer). Canvas2D only draws the
  // small overlay dots/labels on top.
  if (u_cellSize >= 4.0) {
    // Distance to nearest cell edge in [0, 0.5]; 0 = on edge, 0.5 = centre.
    float edge = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));

    if (isPrime) {
      // lineWidth: clamp(px*0.075, 0.35, 1.3)  alpha: 0.68
      float bwFrac = clamp(u_cellSize * 0.075, 0.35, 1.3) / u_cellSize;
      if (edge < bwFrac)
        composed = mix(composed, vec3(251.0/255.0, 191.0/255.0, 36.0/255.0), 0.68);
    }
    if (isRange) {
      // lineWidth: clamp(px*0.07, 0.35, 1.3)  alpha: 0.60
      float bwFrac = clamp(u_cellSize * 0.07, 0.35, 1.3) / u_cellSize;
      if (edge < bwFrac)
        composed = mix(composed, vec3(34.0/255.0, 211.0/255.0, 238.0/255.0), 0.60);
    }
    if (isMult) {
      // lineWidth: clamp(px*0.14, 1.0, 2.5)  alpha: 0.88
      float bwFrac = clamp(u_cellSize * 0.14, 1.0, 2.5) / u_cellSize;
      if (edge < bwFrac)
        composed = mix(composed, vec3(167.0/255.0, 139.0/255.0, 250.0/255.0), 0.88);
    }

    // Lowered-3D inner highlight -- mirrors Canvas2D strokeRect in _drawBitBody.
    // Lowered set bits: rgba(255,255,255,0.12); raised cleared bits: rgba(255,255,255,0.14).
    // Applied when loweredSetBits mode is active and cellSize is large enough to see it.
    if (u_loweredActive > 0.5) {
      float hlFrac = clamp(u_cellSize * 0.055, 0.3, 0.8) / u_cellSize;
      if (edge < hlFrac)
        composed = mix(composed, vec3(1.0, 1.0, 1.0), isSet ? 0.12 : 0.14);
    }
  }

  outColor = vec4(composed, 1.0);
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
  gl.bindAttribLocation(prog, 0, 'a_corner');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`BitGridGL program link failed: ${log}`);
  }
  return prog;
}

export class BitGridGLCore {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.vao = null;
    this.posTex = null;
    this.stateTex = null;
    this.animTex = null;
    this.bitCount = 0;
    this.texW = 0;
    this.texH = 0;
    this._dpr = 1;
    this._lost = false;
    this._uniforms = {};
  }

  /**
   * Initialise WebGL2 against `canvas` (HTMLCanvasElement or
   * OffscreenCanvas). Returns false (and sets `_lost`) if WebGL2 is
   * unavailable. Does not register context-loss handlers — that's the
   * facade's job because OffscreenCanvas events differ from DOM events.
   */
  init(canvas) {
    if (!canvas) return false;
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      premultipliedAlpha: false,
      alpha: false,
      // preserveDrawingBuffer: true prevents Safari's compositor from clearing
      // the drawing buffer to opaque black after each composite operation.
      // Without this, there is a race window (after the post-composite clear
      // but before the next frame's gl.clear(bgColor)) where Safari reads the
      // buffer and sees (0,0,0,1) — the source of the black flicker visible
      // during animation and while dragging in Safari. The performance cost
      // (no buffer-swap optimisation, one extra copy per frame) is acceptable
      // since this canvas only draws instanced bit-grid quads.
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      this._lost = true;
      return false;
    }
    this.gl = gl;
    try {
      this._initProgram();
      this._initQuad();
    } catch (err) {
      // Worker-safe: no `console.warn` swallowed; rethrow so the facade
      // can surface it through its message channel.
      this._lost = true;
      throw err;
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
      cellSize: u('u_cellSize'),
      dpr: u('u_dpr'),
      pos: u('u_pos'),
      state: u('u_state'),
      anim: u('u_anim'),
      texSize: u('u_texSize'),
      bitCount: u('u_bitCount'),
      setColor: u('u_setColor'),
      clearedColor: u('u_clearedColor'),
      changedColor: u('u_changedColor'),
      repeatedColor: u('u_repeatedColor'),
      bgColor: u('u_bgColor'),
      baseAlpha: u('u_baseAlpha'),
      loweredActive: u('u_loweredActive'),
    };
  }

  _initQuad() {
    const gl = this.gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5,   0.5, -0.5,  -0.5,  0.5,
       0.5, -0.5,   0.5,  0.5,  -0.5,  0.5,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /**
   * Compute texture dimensions for `bitCount`. Exposed so the facade
   * can pre-size its host-state buffers to the same slot count.
   */
  static texDims(bitCount) {
    const dim = Math.max(1, Math.ceil(Math.sqrt(bitCount)));
    return {
      texW: dim,
      texH: Math.max(1, Math.ceil(bitCount / dim)),
    };
  }

  /** (Re)allocate the two textures for the given bit count. Idempotent. */
  setBitCount(bitCount) {
    if (this._lost || !this.gl) return;
    if (this.bitCount === bitCount && this.posTex && this.stateTex) return;
    this.bitCount = bitCount;
    const { texW, texH } = BitGridGLCore.texDims(bitCount);
    this.texW = texW;
    this.texH = texH;

    const gl = this.gl;
    if (this.posTex) gl.deleteTexture(this.posTex);
    if (this.stateTex) gl.deleteTexture(this.stateTex);
    if (this.animTex) gl.deleteTexture(this.animTex);

    this.posTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RG32F, this.texW, this.texH, 0,
      gl.RG, gl.FLOAT, new Float32Array(this.texW * this.texH * 2),
    );

    this.stateTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // RGBA8 (normalized): state byte stored in .r channel. Using RGBA8 avoids
    // the INVALID_OPERATION issues with R8UI integer textures in OffscreenCanvas.
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA8, this.texW, this.texH, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(this.texW * this.texH * 4),
    );

    // Animation texture: RGBA32F — (xDelta, yDelta, sizeScale, unused).
    // Default is (0, 0, 1, 0): no offset, full size (normal / non-lowered mode).
    const slots = this.texW * this.texH;
    const animDefault = new Float32Array(slots * 4);
    for (let i = 0; i < slots; i++) animDefault[i * 4 + 2] = 1.0;
    this.animTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.animTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA32F, this.texW, this.texH, 0,
      gl.RGBA, gl.FLOAT, animDefault,
    );
  }

  /**
   * Upload a pre-packed Float32Array of (x, y) pairs into the position
   * texture. Caller is responsible for sizing `buf` to `texW*texH*2`.
   */
  uploadPositionBuffer(buf) {
    if (this._lost || !this.gl || !this.posTex) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, this.texW, this.texH,
      gl.RG, gl.FLOAT, buf,
    );
  }

  /**
   * Upload a pre-packed Uint8Array of state bytes. Caller is
   * responsible for sizing `buf` to `texW*texH`.
   */
  uploadStateBuffer(buf) {
    if (this._lost || !this.gl || !this.stateTex) return;
    const gl = this.gl;
    // Expand the 1-byte-per-slot state buffer into RGBA8 (state in R, zeros in GBA).
    const slots = this.texW * this.texH;
    const rgba = new Uint8Array(slots * 4);
    for (let i = 0; i < buf.length && i < slots; i++) rgba[i * 4] = buf[i];
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, this.texW, this.texH,
      gl.RGBA, gl.UNSIGNED_BYTE, rgba,
    );
  }

  /**
   * Upload a pre-packed Float32Array of animation data (RGBA32F).
   * Each entry is (xDelta, yDelta, sizeScale, unused). Caller is
   * responsible for sizing `buf` to `texW*texH*4`.
   */
  uploadAnimBuffer(buf) {
    if (this._lost || !this.gl || !this.animTex) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.animTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0, this.texW, this.texH,
      gl.RGBA, gl.FLOAT, buf,
    );
  }

  /** Resize the drawing buffer. `dpr` must be supplied (no `window` here). */
  resize(cssWidth, cssHeight, dpr) {
    if (this._lost || !this.canvas) return;
    const r = Math.max(1, dpr || 1);
    this._dpr = r;
    this.canvas.width  = Math.max(1, Math.round(cssWidth * r));
    this.canvas.height = Math.max(1, Math.round(cssHeight * r));
    // OffscreenCanvas has no `style`; only set it when present.
    if (this.canvas.style) {
      this.canvas.style.width  = `${cssWidth}px`;
      this.canvas.style.height = `${cssHeight}px`;
    }
  }

  /**
   * Render one frame. `params.cssW`/`cssH` are required (we cannot
   * derive them from `canvas.style` on OffscreenCanvas).
   */
  render(params) {
    if (this._lost || !this.gl || !this.program || !this.posTex || !this.stateTex) return;
    const gl = this.gl;
    const cssW = params.cssW;
    const cssH = params.cssH;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const bg = params.bgColor;
    gl.clearColor((bg[0] || 0) / 255, (bg[1] || 0) / 255, (bg[2] || 0) / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.posTex);
    gl.uniform1i(this._uniforms.pos, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex);
    gl.uniform1i(this._uniforms.state, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.animTex);
    gl.uniform1i(this._uniforms.anim, 2);

    const u = this._uniforms;
    gl.uniform2f(u.canvasSize, cssW, cssH);
    gl.uniform2f(u.pan, params.panX || 0, params.panY || 0);
    gl.uniform1f(u.cellSize, Math.max(1, params.cellSize || 1));
    gl.uniform1f(u.dpr, Math.max(1, params.dpr || this._dpr || 1));
    gl.uniform2i(u.texSize, this.texW, this.texH);
    gl.uniform1i(u.bitCount, this.bitCount);
    gl.uniform3f(u.setColor, params.setColor[0] / 255, params.setColor[1] / 255, params.setColor[2] / 255);
    gl.uniform3f(u.clearedColor, params.clearedColor[0] / 255, params.clearedColor[1] / 255, params.clearedColor[2] / 255);
    gl.uniform3f(u.changedColor, params.changedColor[0] / 255, params.changedColor[1] / 255, params.changedColor[2] / 255);
    const rep = params.repeatedColor || [245, 158, 11];
    gl.uniform3f(u.repeatedColor, rep[0] / 255, rep[1] / 255, rep[2] / 255);
    gl.uniform3f(u.bgColor, bg[0] / 255, bg[1] / 255, bg[2] / 255);
    gl.uniform1f(u.baseAlpha, params.baseAlpha == null ? 1 : params.baseAlpha);
    gl.uniform1f(u.loweredActive, params.loweredActive ? 1.0 : 0.0);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.bitCount);
  }

  /**
   * Mark resources lost (e.g. on `webglcontextlost`). The facade is
   * expected to call `init` again on restore.
   */
  markLost() {
    this._lost = true;
    this.program = null;
    this.vao = null;
    this.posTex = null;
    this.stateTex = null;
    this.animTex = null;
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.posTex) gl.deleteTexture(this.posTex);
    if (this.stateTex) gl.deleteTexture(this.stateTex);
    if (this.animTex) gl.deleteTexture(this.animTex);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.posTex = null;
    this.stateTex = null;
    this.animTex = null;
    this.program = null;
    this.vao = null;
    this.gl = null;
    this.canvas = null;
  }
}

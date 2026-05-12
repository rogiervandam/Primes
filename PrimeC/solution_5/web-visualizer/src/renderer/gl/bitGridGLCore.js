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
uniform float u_tiltXDeg;      // shader-space tilt around X axis (degrees)
uniform float u_tiltYDeg;      // shader-space tilt around Y axis (degrees)
uniform float u_perspective;   // camera perspective distance in CSS px
uniform int u_enableGlTilt;    // 0 = legacy 2D path, 1 = shader 3D path
uniform sampler2D u_state;     // RGBA8: per-bit packed flag byte in .r (normalized 0-1)
uniform sampler2D u_anim;      // RGBA32F: per-bit (xDelta, yDelta, sizeScale, _unused)
uniform ivec2 u_texSize;
uniform int u_bitCount;

// Per-instance position: computed from gl_InstanceID + layout params.
// Eliminates the 8 MB RG32F position texture; all arithmetic is integer.
uniform int   u_bitsPerCL;    // bits per cacheline
uniform int   u_u64sPerCL;    // u64s per cacheline = ceil(bitsPerCL / 64)
uniform int   u_vectorGroup;  // u64s per vector group
uniform int   u_numVecsPerCL; // vector groups per cacheline = ceil(u64sPerCL / vectorGroup)
uniform int   u_vecPerRow;    // vector groups per visual row
uniform float u_vecStep;      // CSS px: step between vector-group origins (x)
uniform float u_u64Step;      // CSS px: step between u64 origins within a vector (x)
uniform float u_byteStepX;    // CSS px: step between byte origins (x)
uniform float u_byteStepY;    // CSS px: step between byte origins (y)
uniform float u_bitStepX;     // CSS px: step between bit origins (x)
uniform float u_bitStepY;     // CSS px: step between bit origins (y)
uniform float u_labelH;       // CSS px: label row height
uniform float u_vRowHeight;   // CSS px: full visual row height
uniform float u_pxHalf;       // CSS px: half a bit cell (= cellSize / 2 at layout zoom)
uniform vec2  u_bytePos[8];   // per-byte-index (col, row) in the u64 grid
uniform vec2  u_bitPos[8];    // per-bit-in-byte-index (col, row) in the byte grid
uniform int   u_firstBit;     // first bit index to render (viewport culling: skip off-screen rows)
uniform int   u_bitStride;    // downsampling stride: draw every N-th bit (1 = all bits)

flat out uint v_state;
out vec2 v_uv;                 // [0,1]x[0,1] within the cell; used by FS for border detection

void main() {
  int bit = gl_InstanceID * max(1, u_bitStride) + u_firstBit;
  v_uv = a_corner + 0.5;
  if (bit >= u_bitCount) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0); // off-screen
    return;
  }
  int tx = bit % u_texSize.x;
  int ty = bit / u_texSize.x;
  // State byte stored as normalized R in RGBA8 texture; decode to uint.
  v_state = uint(round(texelFetch(u_state, ivec2(tx, ty), 0).r * 255.0));
  vec4 animData = texelFetch(u_anim, ivec2(tx, ty), 0);
  float animScale = max(0.01, animData.z);  // sizeScale (default 1.0 when not lowered)

  // Compute bit position from gl_InstanceID using layout params.
  int clIdx    = bit / u_bitsPerCL;
  int bitInRow = bit % u_bitsPerCL;
  int u64Idx   = bitInRow / 64;
  if (u64Idx >= u_u64sPerCL) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    return;
  }
  int bitInU64  = bitInRow % 64;
  int byteIdx   = bitInU64 / 8;
  int bitInByte = bitInU64 % 8;
  int vecIdx    = u64Idx / u_vectorGroup;
  int gvi       = clIdx * u_numVecsPerCL + vecIdx;
  int vRow      = gvi / u_vecPerRow;
  int vecInRow  = gvi % u_vecPerRow;
  int intraIdx  = u64Idx % u_vectorGroup;

  vec2 basePos = vec2(
    float(vecInRow) * u_vecStep + float(intraIdx) * u_u64Step
      + u_bytePos[byteIdx].x * u_byteStepX + u_bitPos[bitInByte].x * u_bitStepX + u_pxHalf,
    float(vRow) * u_vRowHeight + u_labelH
      + u_bytePos[byteIdx].y * u_byteStepY + u_bitPos[bitInByte].y * u_bitStepY + u_pxHalf
  );

  vec2 centre = basePos + u_pan + animData.xy;  // apply per-bit position delta
  vec2 corner = centre + a_corner * u_cellSize * animScale;  // apply per-bit size scale
  // DPR snap to device-pixel grid. At DPR=1 this introduces quantization
  // drift versus Canvas2D subpixel geometry over long rows, so only apply
  // snapping when DPR is meaningfully above 1.
  if (u_dpr > 1.01) {
    corner = floor(corner * u_dpr + 0.5) / u_dpr;
  }

  if (u_enableGlTilt != 0) {
    // Transform in view-space centered on the canvas, then perspective project
    // back to CSS pixel coordinates before converting to clip space.
    float cx = u_canvasSize.x * 0.5;
    float cy = u_canvasSize.y * 0.5;

    float rx = radians(u_tiltXDeg);
    float ry = radians(u_tiltYDeg);
    float sx = sin(rx);
    float cxr = cos(rx);
    float sy = sin(ry);
    float cyr = cos(ry);

    vec3 p = vec3(corner.x - cx, -(corner.y - cy), 0.0);

    vec3 px = vec3(
      p.x,
      p.y * cxr - p.z * sx,
      p.y * sx + p.z * cxr
    );

    vec3 py = vec3(
      px.x * cyr + px.z * sy,
      px.y,
      -px.x * sy + px.z * cyr
    );

    float perspective = max(1.0, u_perspective);
    float depth = perspective / max(1.0, perspective - py.z);
    vec2 proj = py.xy * depth;

    float screenX = proj.x + cx;
    float screenY = cy - proj.y;
    vec2 clip = (vec2(screenX, screenY) / u_canvasSize) * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
  } else {
    vec2 clip = (corner / u_canvasSize) * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
  }
}`;

const FS = `#version 300 es
precision highp float;
precision highp int;

uniform vec3 u_setColor;
uniform vec3 u_clearedColor;
uniform vec3 u_changedColor;
uniform vec3 u_repeatedColor;
uniform vec3 u_bgColor;
uniform float u_baseAlpha;
uniform float u_cellSize;      // CSS px cell size; used for border-width fractions
uniform int u_bitStride;       // downsampling stride (shared with VS); > 1 at sub-pixel zoom

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
  }

  // Soft-cell alpha: at sub-pixel zoom (stride > 1) modulate output alpha by
  // coverage area (cellSize²) so overlapping/adjacent cells accumulate
  // brightness via SRC_ALPHA blending rather than all appearing at full
  // intensity against an already-drawn background.
  float coverageAlpha = (u_bitStride > 1) ? clamp(u_cellSize * u_cellSize, 0.04, 1.0) : 1.0;
  outColor = vec4(composed, coverageAlpha);
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
      tiltXDeg: u('u_tiltXDeg'),
      tiltYDeg: u('u_tiltYDeg'),
      perspective: u('u_perspective'),
      enableGlTilt: u('u_enableGlTilt'),
      state: u('u_state'),
      anim: u('u_anim'),
      texSize: u('u_texSize'),
      bitCount: u('u_bitCount'),
      // Layout params for per-instance position computation in VS.
      bitsPerCL:    u('u_bitsPerCL'),
      u64sPerCL:    u('u_u64sPerCL'),
      vectorGroup:  u('u_vectorGroup'),
      numVecsPerCL: u('u_numVecsPerCL'),
      vecPerRow:    u('u_vecPerRow'),
      vecStep:      u('u_vecStep'),
      u64Step:      u('u_u64Step'),
      byteStepX:    u('u_byteStepX'),
      byteStepY:    u('u_byteStepY'),
      bitStepX:     u('u_bitStepX'),
      bitStepY:     u('u_bitStepY'),
      labelH:       u('u_labelH'),
      vRowHeight:   u('u_vRowHeight'),
      pxHalf:       u('u_pxHalf'),
      bytePos:      u('u_bytePos'),
      bitPos:       u('u_bitPos'),
      firstBit:     u('u_firstBit'),
      bitStride:    u('u_bitStride'),
      // Fragment shader colors.
      setColor: u('u_setColor'),
      clearedColor: u('u_clearedColor'),
      changedColor: u('u_changedColor'),
      repeatedColor: u('u_repeatedColor'),
      bgColor: u('u_bgColor'),
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
    if (this.bitCount === bitCount && this.stateTex) return;
    this.bitCount = bitCount;
    const { texW, texH } = BitGridGLCore.texDims(bitCount);
    this.texW = texW;
    this.texH = texH;

    const gl = this.gl;
    if (this.stateTex) gl.deleteTexture(this.stateTex);
    if (this.animTex) gl.deleteTexture(this.animTex);
    // Invalidate the state-expansion buffer so uploadStateBuffer reallocates
    // it at the new slot count.
    this._stateRgbaBuffer = null;

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
   * Upload a pre-packed Uint8Array of state bytes. Caller is
   * responsible for sizing `buf` to `texW*texH`.
   */
  uploadStateBuffer(buf) {
    if (this._lost || !this.gl || !this.stateTex) return;
    const gl = this.gl;
    // Expand the 1-byte-per-slot state buffer into RGBA8 (state in R, zeros in GBA).
    // Using RGBA8 rather than R8UI avoids INVALID_OPERATION on OffscreenCanvas.
    // Reuse a cached buffer to avoid a 4× allocation on every state upload.
    const slots = this.texW * this.texH;
    if (!this._stateRgbaBuffer || this._stateRgbaBuffer.length !== slots * 4) {
      this._stateRgbaBuffer = new Uint8Array(slots * 4);
      // G, B, A channels are always zero; they only need initialising once.
    }
    const rgba = this._stateRgbaBuffer;
    const n = Math.min(buf.length, slots);
    for (let i = 0; i < n; i++) rgba[i * 4] = buf[i];
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
    if (this._lost || !this.gl || !this.program || !this.stateTex) return;
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
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex);
    gl.uniform1i(this._uniforms.state, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.animTex);
    gl.uniform1i(this._uniforms.anim, 1);

    const u = this._uniforms;
    gl.uniform2f(u.canvasSize, cssW, cssH);
    gl.uniform2f(u.pan, params.panX || 0, params.panY || 0);
    gl.uniform1f(u.cellSize, Math.max(1, params.cellSize || 1));
    gl.uniform1f(u.dpr, Math.max(1, params.snapDpr || params.dpr || this._dpr || 1));
    gl.uniform1f(u.tiltXDeg, Number(params.tiltXDeg) || 0);
    gl.uniform1f(u.tiltYDeg, Number(params.tiltYDeg) || 0);
    gl.uniform1f(u.perspective, Math.max(1, Number(params.perspective) || 1500));
    gl.uniform1i(u.enableGlTilt, params.enableGlTilt ? 1 : 0);
    gl.uniform2i(u.texSize, this.texW, this.texH);
    gl.uniform1i(u.bitCount, this.bitCount);

    // Layout params for per-instance position computation in VS.
    gl.uniform1i(u.bitsPerCL,    params.bitsPerCL    | 0);
    gl.uniform1i(u.u64sPerCL,    params.u64sPerCL    | 0);
    gl.uniform1i(u.vectorGroup,  params.vectorGroup   | 0);
    gl.uniform1i(u.numVecsPerCL, params.numVecsPerCL | 0);
    gl.uniform1i(u.vecPerRow,    Math.max(1, params.vecPerRow | 0));
    gl.uniform1f(u.vecStep,      params.vecStep      || 0);
    gl.uniform1f(u.u64Step,      params.u64Step      || 0);
    gl.uniform1f(u.byteStepX,    params.byteStepX    || 0);
    gl.uniform1f(u.byteStepY,    params.byteStepY    || 0);
    gl.uniform1f(u.bitStepX,     params.bitStepX     || 0);
    gl.uniform1f(u.bitStepY,     params.bitStepY     || 0);
    gl.uniform1f(u.labelH,       params.labelH       || 0);
    gl.uniform1f(u.vRowHeight,   params.vRowHeight   || 1);
    gl.uniform1f(u.pxHalf,       params.pxHalf       || 0);
    if (params.bytePos) gl.uniform2fv(u.bytePos, params.bytePos);
    if (params.bitPos)  gl.uniform2fv(u.bitPos,  params.bitPos);
    gl.uniform1i(u.firstBit,  params.firstBit  | 0);
    gl.uniform1i(u.bitStride, Math.max(1, params.bitStride | 0) || 1);

    gl.uniform3f(u.setColor, params.setColor[0] / 255, params.setColor[1] / 255, params.setColor[2] / 255);
    gl.uniform3f(u.clearedColor, params.clearedColor[0] / 255, params.clearedColor[1] / 255, params.clearedColor[2] / 255);
    gl.uniform3f(u.changedColor, params.changedColor[0] / 255, params.changedColor[1] / 255, params.changedColor[2] / 255);
    const rep = params.repeatedColor || [245, 158, 11];
    gl.uniform3f(u.repeatedColor, rep[0] / 255, rep[1] / 255, rep[2] / 255);
    gl.uniform3f(u.bgColor, bg[0] / 255, bg[1] / 255, bg[2] / 255);
    gl.uniform1f(u.baseAlpha, params.baseAlpha == null ? 1 : params.baseAlpha);

    const instanceCount = params.instanceCount != null ? params.instanceCount : this.bitCount;
    // Enable SRC_ALPHA blending for soft-cell coverage-alpha compositing (fix 4).
    // When stride == 1 the FS outputs alpha=1 so blending is a no-op; enabling
    // it unconditionally avoids a CPU branch on every frame.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, Math.max(0, instanceCount));
    gl.disable(gl.BLEND);
  }

  /**
   * Mark resources lost (e.g. on `webglcontextlost`). The facade is
   * expected to call `init` again on restore.
   */
  markLost() {
    this._lost = true;
    this.program = null;
    this.vao = null;
    this.stateTex = null;
    this.animTex = null;
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.stateTex) gl.deleteTexture(this.stateTex);
    if (this.animTex) gl.deleteTexture(this.animTex);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.stateTex = null;
    this.animTex = null;
    this.program = null;
    this.vao = null;
    this.gl = null;
    this.canvas = null;
  }
}

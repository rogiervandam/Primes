/**
 * Canvas-based renderer for sieve bitstorage visualization.
 *
 * Supports configurable layouts, adjustable spacing, light/dark themes,
 * operation-colored highlighting, vector grouping, and vector labels.
 *
 * Constants (THEMES / COLOR_PRESETS / layouts / cache presets / storage
 * models) live in `./renderer/constants` and are re-exported below to keep
 * existing import sites working.
 */
import { SearchOverlay } from './renderer/overlays/SearchOverlay';
import { MaskWriteOverlay } from './renderer/overlays/MaskWriteOverlay';
import { VectorTouchOrderOverlay } from './renderer/overlays/VectorTouchOrderOverlay';
import { CachelineAnnotationsOverlay } from './renderer/overlays/CachelineAnnotationsOverlay';
import { MinimapRenderer } from './renderer/MinimapRenderer';

import {
  THEMES,
  COLOR_PRESETS,
  BIT_LAYOUTS,
  BYTE_LAYOUTS,
  VECTOR_GROUPS,
  CACHELINE_SIZES,
  CACHE_PRESETS,
  GRID3X3_MAP,
  STORAGE_MODELS,
} from './renderer/constants';
import { bitToNumber, numberToBit, describeWheelBit, wheelSignature } from './renderer/bitMath';
import {
  hexToRgb,
  mixRgb,
  labelTextColor,
  fitLabelFontSize,
  truncateTextToWidth,
  glMeasureAdapter,
} from './renderer/drawingHelpers';
import { requestPrimeOverlay } from './renderer/workers/bitPrePassClient';
import { GlyphCommandBuffer } from './renderer/gl/GlyphCommandBuffer';

export {
  THEMES,
  COLOR_PRESETS,
  BIT_LAYOUTS,
  BYTE_LAYOUTS,
  VECTOR_GROUPS,
  CACHELINE_SIZES,
  CACHE_PRESETS,
  STORAGE_MODELS,
  bitToNumber,
  numberToBit,
  describeWheelBit,
  wheelSignature,
};

export class SieveRenderer {
  constructor() {
    this.debugAllCellOutlines = false;
    this.debugAllCellOutlineColor = 'rgba(255,255,255,0.82)';
    this.bitCount = 0;
    this.sieveSize = 0;
    this.storageModel = 'half';
    this.wheelDefinition = null;
    this.bitState = null;
    this.changedBits = null;
    this.targetBits = null;
    this.targetHitCounts = null;
    this.repeatedChangedBits = null;
    this.focusStart = null;
    this.focusStop = null;
    this.maskWordBits = null;
    this.maskWriteOrderWords = null;
    this.maskWriteOrderSlots = null;
    this.maskWriteOrderEventIds = null;
    this.maskSlotBits = null;
    this.maskGhostBits = null;
    this.suppressMaskWriteOverlay = false;
    this.searchOverlay = new SearchOverlay(this);
    this.maskWriteOverlay = new MaskWriteOverlay(this);
    this.vectorTouchOrderOverlay = new VectorTouchOrderOverlay(this);
    this.cachelineAnnotationsOverlay = new CachelineAnnotationsOverlay(this);
    this.minimapRenderer = new MinimapRenderer(this);
    this.primeOverlay = false;
    this._primeBitFlags = null;
    this._primeOverlayKey = '';
    // Range overlay: highlight bits in [rangeOverlayStart, rangeOverlayEnd] (bit indices)
    this.rangeOverlay = false;
    this.rangeOverlayStart = 0;
    this.rangeOverlayEnd = 0;
    // Multiples overlay: highlight bits whose number is a multiple of multiplesOverlayPrime
    this.multiplesOverlay = false;
    this.multiplesOverlayPrime = 2;
    this.animationFocusBits = new Set();
    this.bitMotionTrails = [];
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.gridOpacity = 1;
    // Dirty flag: true whenever bitState / changedBits / overlays change and
    // the GL texture needs re-uploading.  Cleared by the patched render in
    // Visualizer.jsx after calling g.uploadState().  Starts true so the first
    // render always uploads.
    this._stateDirty = true;

    // Viewport dimensions (canvas-container visible area, not oversized canvas).
    // Set by Visualizer.jsx on every container resize so renderMinimap and
    // updateMinimapAvailability always use the correct visible size.
    this.viewportW = 0;
    this.viewportH = 0;
    // Right-side inset (px) for the minimap so it doesn't hide behind the
    // settings sidebar when it is expanded.  Updated by Visualizer.jsx.
    this.minimapRightInset = 0;

    // Layout config
    this.pixelSize = 2;
    this.bitLayout = '4x2';
    this.byteLayout = '4x2';
    this.bitSpacingH = 1;
    this.bitSpacingV = 1;
    this.byteSpacingH = 2;
    this.byteSpacingV = 2;
    this.u64SpacingH = 4;
    this.u64SpacingV = 4;
    this.theme = 'dark';

    // Operation-based coloring
    this.currentOperation = null;

    // Color preset: null = use theme defaults, or a preset key from COLOR_PRESETS
    this.colorPreset = null;
    // Custom colors override preset (each is [r,g,b] or null)
    this.customSetBit = null;
    this.customClearedBit = null;
    this.customUnchangedBit = null;

    // Vector grouping
    this.vectorGroup = 1;  // 1, 2, 4, or 8 uint64s per vector
    this.vectorLabel = 'uint64';
    this.vectorBaseBits = 64;
    this.vectorLanes = 1;
    this.currentAnnotation = '';

    // Label toggles
    this.showBitLabels = false;
    this.showNumberLabels = false;
    this.showByteLabels = false;
    this.showVectorLabels = true;
    this.showVectorTouchOrder = false;
    this.bitLabelMode = 'global';
    this.byteLabelMode = 'group';
    this.transparentBackground = false;
    // Optional override for the canvas background color. When set (as an
    // [r,g,b] array), it replaces the theme's default BACKGROUND color.
    this.canvasBackground = null;

    // Optional grouping outlines
    this.outlineEnabled = false;
    this.outlineTargets = new Set(); // Set of: 'byte' | 'vector' | 'cacheline'
    this.outlineStyle = 'thin'; // 'thin' | 'thick' | 'dashed' | 'dotted'
    this.outlineColor = '#5ccf8d';
    this.outlineRounded = false;
    this.minimapEnabled = true;

    // Storage model for bit-to-number mapping
    this.storageModel = 'half';

    // Canvas width for wrapping (set by resize)
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.canvasDpr = 1;

    // Cacheline size in bytes (default 64)
    this.cachelineSize = 64;
    this.customGroupingBits = 0;
    this.horizontalGroups = 0;

    // Heat map: tracks recency of access per bit and per cacheline
    this.heatMapEnabled = false;
    this.lastAccessStep = null;   // Int32Array, per-bit last step index (-1 = never)
    this.heatMapCurrentStep = 0;
    this.clHitCount = null;       // Int32Array, per-physical-cacheline hit count
    this.clLastHitStep = null;    // Int32Array, per-physical-cacheline last step (-1 = never)
    this.clMaxHitCount = 0;
    // Annotation mode: 'none' | 'hits' | 'age' | 'both'
    this.cachelineAnnotation = 'none';

    // Frozen wrapping: once set, zoom doesn't change layout
    this._frozenClPerVRow = 0;

    // Render-performance samples. The debug-tools window reads these through
    // getPerformanceSnapshot(); SieveRenderer does not draw UI chrome for them.
    this._perfFrameTimes = new Float32Array(60); // ring buffer of frame durations (ms)
    this._perfFrameIdx = 0;
    this._perfLastTs = 0;

    // WebGL glyph-text feature toggle. When true, per-cell text and dots
    // are rendered via `_glyphCtx` (a GlyphTextGLCore) instead of Canvas 2D.
    // Set by Visualizer.jsx from layoutSettings.webglText.
    this.webglText = false;
    /** @type {import('./renderer/gl/GlyphTextGLCore').GlyphTextGLCore|null} */
    this._glyphCtx = null;
    /** @type {GlyphCommandBuffer|null} Used in worker-mode instead of _glyphCtx. */
    this._glyphBuf = null;
    /** @type {import('./renderer/gl/BitGridGLWorker').BitGridGLWorker|null} */
    this._glWorker = null;
    this._glyphFramePrimed = false;
    /** Encoded glyph commands for the current frame; consumed by Visualizer.jsx. */
    this._pendingGlyphCmds = null;
    // Measurement adapter: set in attachGlyphRenderer() once the GL atlas is ready.
    // Delegates measureText() to the glyph atlas advance widths.
    this._measureCtx = null;
  }

  /** Returns the glyph canvas element (used for export/metadata). */
  get canvas() { return this._glyphCtx?.canvas ?? null; }

  /** Active glyph draw target: buffer (worker mode) or direct context (Safari/direct mode). */
  get _glyph() { return this._glyphBuf || this._glyphCtx || null; }

  /** Returns the canvas background color — user override if set, else theme default. */
  get colors() { return THEMES[this.theme] || THEMES.dark; }

  /** Returns the canvas background color — user override if set, else theme default. */
  get effectiveBackground() {
    return this.canvasBackground || this.colors.BACKGROUND;
  }
  _bitColors() {
    const C = this.colors;
    const preset = this.colorPreset && COLOR_PRESETS[this.colorPreset];
    return {
      set:       this.customSetBit || (preset ? preset.setBit : C.BIT_ONE),
      cleared:   this.customClearedBit || (preset ? preset.clearedBit : C.BIT_ZERO),
      unchanged: this.customUnchangedBit || (preset ? preset.unchangedBit : C.BIT_ZERO),
    };
  }

  _opColor() {
    const C = this.colors;
    if (Number.isFinite(this.maskWordBits) && this.maskWordBits > 0 && C.OPERATION_COLORS.applyMask) {
      return C.OPERATION_COLORS.applyMask;
    }
    if (this.currentOperation && C.OPERATION_COLORS[this.currentOperation]) {
      return C.OPERATION_COLORS[this.currentOperation];
    }
    return C.BIT_CHANGED;
  }

  _outlineConfig() {
    const zoom = Math.max(0.18, this.zoom || 1);
    const scale = Math.max(0.24, Math.min(1.18, Math.pow(zoom, 0.42)));
    return {
      lineWidth: Math.max(0.45, 1.2 * scale),
      dash: [Math.max(2.25, 5 * scale), Math.max(1.8, 3.6 * scale)],
      radius: Math.max(3, 7 * scale),
    };
  }

  _groupLabelBase() {
    if (this.customGroupingBits > 0) return 'group';

    const label = this.vectorLabel || `uint64v${this.vectorGroup}`;
    const uintMatch = label.match(/^uint(\d+)(?:v(\d+))?$/);
    if (uintMatch) {
      const [, bits, lanes] = uintMatch;
      return lanes ? `${bits}x${lanes} group` : `${bits}bit group`;
    }

    const simpleMatch = label.match(/^(bit|byte)(?:v(\d+))?$/);
    if (simpleMatch) {
      const [, kind, lanes] = simpleMatch;
      return lanes ? `${kind}x${lanes} group` : `${kind} group`;
    }

    return `${label} group`;
  }

  _groupLabel(index) {
    return `${this._groupLabelBase()} ${index + 1}`;
  }

  _vectorLabelYOffset() {
    return Math.max(8, Math.min(18, 8 + this.zoom * 0.45));
  }

  _outlinePadding() {
    // Keep a visible gap between pixels and the outline border.
    return Math.max(4, Math.min(7, 4 + this.zoom * 0.35));
  }

  _outlineTopExtra(kind) {
    const bands = this._labelBands();
    if (kind === 'byte') return bands.byte;
    if (kind === 'vector') return bands.total;
    return 0;
  }

  // Pure helpers below delegate to the shared `renderer/drawingHelpers` module.
  // They remain on the class for call-site convenience (`this._foo(...)`).
  _hexToRgb(hex)                                                                   { return hexToRgb(hex); }
  _mixRgb(a, b, t)                                                                 { return mixRgb(a, b, t); }
  _labelTextColor(fillRgb)                                                         { return labelTextColor(fillRgb); }
  /**
   * Same as `_labelTextColor` but returns a normalised [r, g, b, a] array
   * suitable for passing to `GlyphTextGLCore.drawText`.
   */
  _labelTextColorGL(fillRgb) {
    const [r, g, b] = fillRgb;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 150
      ? [17 / 255, 24 / 255, 39 / 255, 0.95]
      : [249 / 255, 250 / 255, 251 / 255, 0.96];
  }

  /**
   * Parse a CSS colour string ('rgba(r,g,b,a)' or '#rrggbb') into the
   * [r,g,b,a] float array expected by GlyphTextGLCore draw methods.
   */
  _parseCssColorGL(cssColor) {
    if (!cssColor) return [1, 1, 1, 1];
    if (cssColor[0] === '#') {
      const rgb = this._hexToRgb(cssColor);
      if (!rgb) return [1, 1, 1, 1];
      return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1.0];
    }
    const m = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] != null ? +m[4] : 1.0];
    return [1, 1, 1, 1];
  }

  /** Return the outline colour as [r,g,b,a] float array for GL. */
  _outlineColorGL() {
    const rgb = this._hexToRgb(this.outlineColor || '#3b82f6');
    if (!rgb) return [0.23, 0.51, 0.96, 1.0];
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1.0];
  }
  _fitLabelFontSize(ctx, text, maxWidth, preferredSize, minSize = 4, style = '')   { return fitLabelFontSize(ctx, text, maxWidth, preferredSize, minSize, style); }
  _truncateTextToWidth(ctx, text, maxWidth, style = '')                            { return truncateTextToWidth(ctx, text, maxWidth, style); }

  attach(_canvas) { /* no-op: GL handles all rendering */ }

  setGlCompositeSourceCanvas(_canvas) {}
  setCompositeGLInto2D(_enabled) {}
  setGlCompositeOffsetX(_offsetX) {}
  setGlCompositeOffsetY(_offsetY) {}

  attachMinimapCanvas(canvas) {
    this.minimapRenderer.attach(canvas);
  }

  /**
   * Attach the WebGL glyph-text canvas. Called once from Visualizer.jsx when
   * the GlyphTextGLCore has been initialised on the glyph canvas element.
   * @param {import('./renderer/gl/GlyphTextGLCore').GlyphTextGLCore} glyphRenderer
   */
  attachGlyphRenderer(glyphRenderer) {
    this._glyphCtx = glyphRenderer || null;
    this._glyphBuf = null;
    this._glWorker = null;
    if (this._glyphCtx) {
      this.webglText = true;
      this._measureCtx = glMeasureAdapter(this._glyphCtx);
    }
  }

  /**
   * Attach the bit-grid GL worker as the glyph renderer (worker mode).
   * Uses atlas data from the worker's ready message to build a GlyphCommandBuffer
   * for encoding draw commands on the main thread.
   * @param {import('./renderer/gl/BitGridGLWorker').BitGridGLWorker} worker
   */
  attachGLWorker(worker) {
    this._glWorker = worker || null;
    this._glyphCtx = null;
    if (this._glWorker) {
      const atlasData = this._glWorker.getAtlasData();
      if (atlasData?.advances) {
        this._glyphBuf = new GlyphCommandBuffer(atlasData);
        this.webglText = true;
        this._measureCtx = glMeasureAdapter(this._glyphBuf);
      } else {
        // Atlas data not yet available (worker not ready). Will be retried
        // by Visualizer.jsx once the worker fires its ready event.
        this._glyphBuf = null;
        this._measureCtx = null;
      }
    }
  }

  init(bitCount, sieveSize) {
    this.bitCount = bitCount;
    this.sieveSize = sieveSize;
    this.bitState = new Uint8Array(bitCount);
    this.changedBits = new Set();
    this.targetBits = new Set();
    this.targetHitCounts = new Map();
    this.repeatedChangedBits = new Set();
    this.focusStart = null;
    this.focusStop = null;
    this.maskWordBits = null;
    this.maskWriteOrderWords = new Uint32Array(0);
    this.maskWriteOrderSlots = new Uint8Array(0);
    this.maskWriteOrderEventIds = new Int32Array(0);
    this.maskSlotBits = [];
    this.maskGhostBits = new Set();
    this.suppressMaskWriteOverlay = false;
    this.searchOverlay.clear();
    this.lastAccessStep = new Int32Array(bitCount).fill(-1);
    this.clHitCount = null;   // allocated lazily in rebuildHeatMap
    this.clLastHitStep = null;
    this.clMaxHitCount = 0;
    this.animationFocusBits = new Set();
    this.bitMotionTrails = [];
    this.transparentBackground = false;
    this._frozenClPerVRow = 0;
  }

  get bitsPerCacheLine() {
    const groupBits = this._logicalGroupBits();
    if (groupBits > 0) return groupBits;
    return this.cachelineSize * 8;
  }

  setState(bitState, changedBits, targetBits = null, targetHitCounts = null, focusRange = null, maskMetadata = null, highlightMetadata = null) {
    this._stateDirty = true;
    this.bitState = bitState;
    this.changedBits = changedBits;
    this.targetBits = targetBits || new Set();
    this.targetHitCounts = targetHitCounts || new Map();
    this.repeatedChangedBits = highlightMetadata?.repeatedBits instanceof Set
      ? highlightMetadata.repeatedBits
      : new Set(highlightMetadata?.repeatedBits || []);
    this.focusStart = focusRange?.focusStart ?? null;
    this.focusStop = focusRange?.focusStop ?? null;
    this.maskWordBits = maskMetadata?.wordBits ?? null;
    this.maskWriteOrderWords = maskMetadata?.targetWords || new Uint32Array(0);
    this.maskWriteOrderSlots = maskMetadata?.targetSlots || new Uint8Array(0);
    this.maskWriteOrderEventIds = maskMetadata?.targetEventIds || new Int32Array(0);
    this.maskSlotBits = maskMetadata?.slotBits || [];
    this.maskGhostBits = new Set();
    this.suppressMaskWriteOverlay = false;
    this.bitMotionTrails = [];
  }

  setMaskGhostBits(bits) {
    this.maskGhostBits = bits instanceof Set ? bits : new Set(bits || []);
    this._stateDirty = true;
  }

  clearBitMotionTrails() {
    this.bitMotionTrails = [];
  }

  addBitMotionTrail(fromBit, toBit, options = {}) {
    if (!Number.isFinite(fromBit) || !Number.isFinite(toBit) || fromBit === toBit) return;
    this.bitMotionTrails.push({
      fromBit,
      toBit,
      createdAt: performance.now(),
      duration: Math.max(180, Math.min(1200, options.duration || 420)),
      intensity: Math.max(0.8, Math.min(1.8, options.intensity || 1)),
    });
    if (this.bitMotionTrails.length > 18) {
      this.bitMotionTrails.splice(0, this.bitMotionTrails.length - 18);
    }
  }

  renderBitMotionTrails(now = performance.now()) {
    if (!Array.isArray(this.bitMotionTrails) || this.bitMotionTrails.length === 0) return;

    const glCtx = this._beginGLAnim();
    if (!glCtx) return;

    const px = this.pixelSize * this.zoom;
    const color = this._opColor();
    const cr = color[0] / 255;
    const cg = color[1] / 255;
    const cb = color[2] / 255;
    const alive = [];

    for (const trail of this.bitMotionTrails) {
      const age = now - trail.createdAt;
      const progress = Math.max(0, Math.min(1, age / Math.max(1, trail.duration)));
      if (progress >= 1) continue;

      const from = this.bitIndexToCanvas(trail.fromBit);
      const to = this.bitIndexToCanvas(trail.toBit);
      if (!from || !to) continue;

      alive.push(trail);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const lift = Math.max(px * 2.4, Math.min(distance * 0.18, px * 9));
      const alpha = Math.max(0, (1 - progress) * 0.72 * trail.intensity);
      const headAlpha = Math.max(0, (1 - progress) * 0.94);
      const controlX = from.x + dx * 0.5;
      const controlY = Math.min(from.y, to.y) - lift;

      // Keep curved trails continuous at all zoom levels by enforcing overlap
      // between consecutive sample dots.
      const lineRadius = Math.max(1.35, px * 0.11 * (1 + trail.intensity * 0.35));
      const spacing = Math.max(0.35, lineRadius * 0.55);
      const samples = Math.max(18, Math.min(240, Math.ceil(distance / spacing)));
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const omt = 1 - t;
        const qx = omt * omt * from.x + 2 * omt * t * controlX + t * t * to.x;
        const qy = omt * omt * from.y + 2 * omt * t * controlY + t * t * to.y;
        const taper = 0.9 + 0.1 * (1 - t);
        glCtx.drawDot(qx, qy, lineRadius, cr, cg, cb, alpha * taper);
      }

      glCtx.drawDot(to.x, to.y, Math.max(1.2, px * 0.22), 1, 1, 1, headAlpha);
    }

    this._endGLAnim(glCtx);
    this.bitMotionTrails = alive;
  }

  setSearchHighlight(type, index, bitIndex = null) {
    this.searchOverlay.set(type, index, bitIndex);
  }

  clearSearchHighlight() {
    this.searchOverlay.clear();
  }

  _recordFrameTiming(now = performance.now()) {
    if (this._perfLastTs > 0) {
      const frameMs = now - this._perfLastTs;
      // Ignore idle gaps; the debug panel reports active render cadence.
      if (Number.isFinite(frameMs) && frameMs >= 0 && frameMs <= 1000) {
        this._perfFrameTimes[this._perfFrameIdx % this._perfFrameTimes.length] = frameMs;
        this._perfFrameIdx++;
      }
    }
    this._perfLastTs = now;
  }

  getPerformanceSnapshot() {
    const size = this._perfFrameTimes.length;
    const count = Math.min(this._perfFrameIdx, size);
    const frameTimes = [];
    let sumMs = 0;
    let maxMs = 0;

    for (let i = 0; i < count; i++) {
      const bufIdx = (this._perfFrameIdx - count + i + size * 100) % size;
      const frameMs = this._perfFrameTimes[bufIdx] || 0;
      frameTimes.push(frameMs);
      sumMs += frameMs;
      if (frameMs > maxMs) maxMs = frameMs;
    }

    const avgMs = count > 0 ? sumMs / count : 0;
    const latestMs = count > 0 ? frameTimes[frameTimes.length - 1] : 0;
    return {
      fps: avgMs > 0 ? Math.round(1000 / avgMs) : 0,
      avgMs,
      latestMs,
      maxMs,
      sampleCount: count,
      budgetMs: 16.67,
      frameTimes,
    };
  }

  _logicalGroupBits() {
    const customBits = Math.floor(this.customGroupingBits || 0);
    if (customBits > 0) return customBits;
    const baseBits = Math.max(1, Math.floor(this.vectorBaseBits || 64));
    const lanes = Math.max(1, Math.floor(this.vectorLanes || 1));
    return Math.max(1, baseBits * lanes);
  }

  _logicalBytesPerWord() {
    return Math.max(1, Math.min(8, Math.ceil(this._logicalGroupBits() / 8)));
  }

  _bitLabelValue(globalBit, bitInByte) {
    if (this.bitLabelMode === 'byte') return bitInByte;
    if (this.bitLabelMode === 'group') {
      const groupBits = this._logicalGroupBits();
      return globalBit % groupBits;
    }
    return globalBit;
  }

  _byteLabelValue(globalBit) {
    const globalByte = Math.floor(globalBit / 8);
    if (this.byteLabelMode === 'global') return globalByte;
    const groupBits = this._logicalGroupBits();
    const groupBytes = Math.max(1, Math.floor(groupBits / 8));
    return globalByte % groupBytes;
  }

  _isInFocusRange(globalBit) {
    return this.focusStart != null && this.focusStop != null && globalBit >= this.focusStart && globalBit <= this.focusStop;
  }

  _multiBitBounds(startBit, count) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const px = this.pixelSize * this.zoom;

    for (let offset = 0; offset < count; offset++) {
      const pos = this.bitIndexToCanvas(startBit + offset);
      if (!pos) continue;
      minX = Math.min(minX, pos.x - px / 2);
      minY = Math.min(minY, pos.y - px / 2);
      maxX = Math.max(maxX, pos.x + px / 2);
      maxY = Math.max(maxY, pos.y + px / 2);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      w: Math.max(px, maxX - minX),
      h: Math.max(px, maxY - minY),
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }

  _bitVisualRow(bitIdx) {
    if (bitIdx < 0 || bitIdx >= this.bitCount) return -1;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const numVec = this._numVectorsPerRow();
    const vecPerRow = this._vectorGroupsPerVisualRow();
    const clIdx = Math.floor(bitIdx / bitsPerCacheLine);
    const bitInRow = bitIdx % bitsPerCacheLine;
    const u64Idx = Math.floor(bitInRow / 64);
    const vecIdx = Math.floor(u64Idx / this.vectorGroup);
    const globalVectorIndex = clIdx * numVec + vecIdx;
    return Math.floor(globalVectorIndex / vecPerRow);
  }

  _multiBitBoundsSegments(startBit, count) {
    const endBit = Math.min(this.bitCount, startBit + count);
    if (startBit < 0 || endBit <= startBit) return [];

    const segments = [];
    let segmentStart = startBit;
    let previousRow = this._bitVisualRow(startBit);

    for (let bit = startBit + 1; bit < endBit; bit++) {
      const row = this._bitVisualRow(bit);
      if (row !== previousRow) {
        const segmentCount = bit - segmentStart;
        const bounds = this._multiBitBounds(segmentStart, segmentCount);
        if (bounds) segments.push({ startBit: segmentStart, count: segmentCount, bounds, row: previousRow });
        segmentStart = bit;
        previousRow = row;
      }
    }

    const finalCount = endBit - segmentStart;
    const finalBounds = this._multiBitBounds(segmentStart, finalCount);
    if (finalBounds) segments.push({ startBit: segmentStart, count: finalCount, bounds: finalBounds, row: previousRow });

    return segments;
  }

  _maskTintColor(slotIndex = 0) {
    const base = this._opColor();
    return slotIndex % 2 === 0 ? base : this._mixRgb(base, [245, 158, 11], 0.45);
  }

  _maskWriteEntries() {
    if (!this.maskWriteOrderWords || this.maskWriteOrderWords.length === 0) return [];
    if (!Number.isFinite(this.maskWordBits) || this.maskWordBits <= 0) return [];

    const entries = [];
    for (let index = 0; index < this.maskWriteOrderWords.length; index++) {
      const wordIndex = Number(this.maskWriteOrderWords[index]);
      const slotIndex = Number(this.maskWriteOrderSlots?.[index] ?? 0);
      if (!Number.isFinite(wordIndex) || wordIndex < 0) continue;

      const startBit = wordIndex * this.maskWordBits;
      const count = Math.max(1, Math.min(this.maskWordBits, this.bitCount - startBit));
      if (count <= 0) continue;

      const segments = this._multiBitBoundsSegments(startBit, count);
      if (segments.length === 0) continue;

      for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
        const segment = segments[segmentIndex];
        entries.push({
          order: entries.length,
          wordIndex,
          slotIndex,
          eventId: Number(this.maskWriteOrderEventIds?.[index] ?? -1),
          startBit: segment.startBit,
          count: segment.count,
          bounds: segment.bounds,
          wordStartBit: startBit,
          wordCount: count,
          segmentIndex,
          segmentCount: segments.length,
          slot: this._vectorSlotLayout(Math.floor(segment.startBit / Math.max(1, this._logicalGroupBits()))),
        });
      }
    }

    return entries;
  }

  _maskWordOrderSummary() {
    const entries = this._maskWriteEntries();
    if (entries.length === 0) return [];

    const perWord = new Map();
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const existing = perWord.get(entry.wordIndex);
      if (existing) {
        existing.orders.push(entry.order + 1);
        if (Number.isFinite(entry.eventId) && entry.eventId >= 0 && !existing.eventIds.includes(entry.eventId)) {
          existing.eventIds.push(entry.eventId);
        }
        continue;
      }
      perWord.set(entry.wordIndex, {
        ...entry,
        orders: [entry.order + 1],
        eventIds: Number.isFinite(entry.eventId) && entry.eventId >= 0 ? [entry.eventId] : [],
      });
    }

    return Array.from(perWord.values()).sort((a, b) => a.wordIndex - b.wordIndex);
  }

  _maskEntriesBySlot() {
    const grouped = new Map();
    const entries = this._maskWriteEntries();
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (!grouped.has(entry.slotIndex)) grouped.set(entry.slotIndex, []);
      grouped.get(entry.slotIndex).push(entry);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, slotEntries]) => slotEntries);
  }

  _maskEntryBits(entry) {
    if (!entry) return [];
    const slotBits = this.maskSlotBits?.[entry.slotIndex] || [];
    const bits = [];
    const wordStart = Number.isFinite(entry.wordStartBit) ? entry.wordStartBit : entry.startBit;
    const rangeStart = entry.startBit;
    const rangeStop = entry.startBit + entry.count;
    for (let index = 0; index < slotBits.length; index++) {
      const absoluteBit = wordStart + Number(slotBits[index]);
      if (!Number.isFinite(absoluteBit) || absoluteBit < 0 || absoluteBit >= this.bitCount) continue;
      if (absoluteBit < rangeStart || absoluteBit >= rangeStop) continue;
      bits.push(absoluteBit);
    }
    return bits;
  }

  _maskEntryGroupBounds(entry) {
    if (!entry) return null;
    const groupBits = Math.max(1, this._logicalGroupBits());
    const groupStart = Math.floor(entry.startBit / groupBits) * groupBits;
    const groupCount = Math.max(1, Math.min(groupBits, this.bitCount - groupStart));
    const groupSegments = this._multiBitBoundsSegments(groupStart, groupCount);
    if (groupSegments.length === 0) return null;
    for (let index = 0; index < groupSegments.length; index++) {
      const segment = groupSegments[index];
      if (entry.startBit >= segment.startBit && entry.startBit < segment.startBit + segment.count) {
        return segment.bounds;
      }
    }
    return groupSegments[0].bounds;
  }

  _drawMaskImprint(entry, x, y, options = {}, glCtx) {
    if (!entry || !glCtx) return;
    const px = this.pixelSize * this.zoom;
    const tint = this._maskTintColor(entry.slotIndex);
    const alpha = Math.max(0, Math.min(1, options.alpha ?? 1));
    const liftBlend = Math.max(0, Math.min(1, options.liftBlend ?? 0));
    const cutoutStrength = Math.max(0, Math.min(1, options.cutoutStrength ?? 0.72));
    const bounds = entry.bounds;
    const groupBounds = this._maskEntryGroupBounds(entry);
    const dx = x - bounds.cx;
    const dy = y - bounds.cy;
    const wordInset = this.maskWordBits && this.maskWordBits <= 32
      ? Math.max(0.8, Math.min(2.1, px * 0.18))
      : Math.max(1.2, Math.min(3.6, px * 0.34));

    const groupingBits = this._logicalGroupBits();
    const maskSizeBits = Number.isFinite(this.maskWordBits) && this.maskWordBits > 0
      ? this.maskWordBits
      : entry.count;
    const tr = tint[0] / 255, tg = tint[1] / 255, tb = tint[2] / 255;
    const bg = this.effectiveBackground || this.colors.BACKGROUND;
    const br = bg[0] / 255, bgc = bg[1] / 255, bb = bg[2] / 255;

    if (groupBounds && groupingBits <= maskSizeBits) {
      glCtx.drawOutlineRect(
        groupBounds.x + dx - wordInset * 1.2,
        groupBounds.y + dy - wordInset * 1.2,
        groupBounds.w + wordInset * 2.4,
        groupBounds.h + wordInset * 2.4,
        tr, tg, tb, 0.92 * alpha,
        Math.max(1.2, px * 0.14),
      );
    }

    glCtx.drawFilledRect(
      bounds.x + dx - wordInset,
      bounds.y + dy - wordInset,
      bounds.w + wordInset * 2,
      bounds.h + wordInset * 2,
      tr, tg, tb, 0.16 * alpha,
    );
    glCtx.drawOutlineRect(
      bounds.x + dx - wordInset,
      bounds.y + dy - wordInset,
      bounds.w + wordInset * 2,
      bounds.h + wordInset * 2,
      tr, tg, tb, alpha,
      Math.max(1.2, px * 0.13),
    );

    const bits = this._maskEntryBits(entry);
    for (let index = 0; index < bits.length; index++) {
      const pos = this.bitIndexToCanvas(bits[index]);
      if (!pos) continue;
      const bx = pos.x - px / 2 + dx;
      const by = pos.y - px / 2 + dy;
      glCtx.drawFilledRect(bx, by, px, px, tr, tg, tb, 0.48 * alpha);
      if (cutoutStrength > 0) {
        const inset = Math.max(0.45, px * 0.22);
        const iw = Math.max(0.4, px - inset * 2);
        const ih = Math.max(0.4, px - inset * 2);
        glCtx.drawFilledRect(
          bx + inset,
          by + inset,
          iw,
          ih,
          br,
          bgc,
          bb,
          Math.max(0.12, 0.78 * alpha * cutoutStrength),
        );
      }
      glCtx.drawOutlineRect(bx, by, px, px, 1, 1, 1, 0.92 * alpha, Math.max(0.95, px * 0.11));
    }

    if (liftBlend > 0) {
      glCtx.drawFilledRect(
        bounds.x + dx - wordInset * 1.2,
        bounds.y + dy - wordInset * 1.2,
        bounds.w + wordInset * 2.4,
        bounds.h + wordInset * 2.4,
        1, 1, 1, 0.08 * alpha * liftBlend,
      );
    }
  }

  _drawCurvedTrail(fromX, fromY, toX, toY, color, alpha, px, travelLift, glCtx) {
    if (!glCtx) return;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.6 || alpha <= 0) return;

    const tr = color[0] / 255;
    const tg = color[1] / 255;
    const tb = color[2] / 255;
    const controlX = fromX + dx * 0.5;
    const lift = Math.max(px * 2.2, Math.min(distance * 0.24, travelLift * 0.95));
    const controlY = Math.min(fromY, toY) - lift;

    // Keep the mask trail visually continuous at low zoom with overlapping samples.
    const lineRadius = Math.max(1.25, px * 0.11);
    const spacing = Math.max(0.35, lineRadius * 0.54);
    const samples = Math.max(20, Math.min(220, Math.ceil(distance / spacing)));
    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const omt = 1 - u;
      const qx = omt * omt * fromX + 2 * omt * u * controlX + u * u * toX;
      const qy = omt * omt * fromY + 2 * omt * u * controlY + u * u * toY;
      const fade = 0.3 + 0.7 * u;
      glCtx.drawDot(qx, qy, lineRadius, tr, tg, tb, Math.max(0.04, alpha * fade));
    }
  }

  /**
   * Draw the cacheline heat-map overlay.
   *
   * Iterates over PHYSICAL cachelines (cachelineSize bytes each).  For every
   * physical CL the logical groups (vectors) that belong to it are collected
   * and grouped into contiguous row-segments.  Each segment gets a filled
   * rectangle with a fully-stroked border, so the result is one properly
   * shaped outline per physical cacheline regardless of how the layout wraps.
   */
  _renderCachelineHeatOverlay() {
    if (!this.heatMapEnabled || !this.clHitCount) return;

    const phyBitsPerCL  = this.cachelineSize * 8;
    const bitsPerCacheLine = this.bitsPerCacheLine;   // logical group bits
    const numPhyCL      = this.clHitCount.length;
    const totalLogCL    = Math.ceil(this.bitCount / bitsPerCacheLine);

    const vecD       = this._vectorDims();
    const rowD       = this._rowDims();
    const labelH     = this._labelHeight();
    const numVec     = this._numVectorsPerRow();
    const vecPerVRow = this._vectorGroupsPerVisualRow();
    const vRowHeight = labelH + rowD.h + this._u64GapY();
    const vecStep    = vecD.w + this._u64GapX();
    const px         = this.pixelSize * this.zoom;
    const pad        = 1;

    const ch = this.canvasHeight || 0;
    const startVRow = Math.max(0, Math.floor(-this.panY / vRowHeight));
    const endVRow   = Math.ceil((ch - this.panY) / vRowHeight) + 1;

    // Map logical CLs to physical CL index
    // Clamp visible physical CL range so we skip off-screen ones
    const firstVisLogCL = startVRow * vecPerVRow / numVec;
    const lastVisLogCL  = endVRow   * vecPerVRow / numVec;
    const firstVisPhy   = Math.max(0,          Math.floor(firstVisLogCL * bitsPerCacheLine / phyBitsPerCL));
    const lastVisPhy    = Math.min(numPhyCL - 1, Math.ceil(lastVisLogCL  * bitsPerCacheLine / phyBitsPerCL));

    const lw = Math.max(0.8, Math.min(2.4, px * 0.10));

    for (let phyClIdx = firstVisPhy; phyClIdx <= lastVisPhy; phyClIdx++) {
      const oc = this._cachelineHeatOverlayColor(phyClIdx);
      if (!oc) continue;

      const bAlpha = Math.max(0.30, Math.min(0.92, oc.alpha * 1.8 + 0.22));

      // Logical CL range owned by this physical CL
      const phyBitStart = phyClIdx * phyBitsPerCL;
      const phyBitEnd   = Math.min(this.bitCount, phyBitStart + phyBitsPerCL);
      const firstLogCL  = Math.floor(phyBitStart / bitsPerCacheLine);
      const lastLogCL   = Math.min(totalLogCL - 1, Math.floor((phyBitEnd - 1) / bitsPerCacheLine));

      // Group consecutive logical CLs that share the same visual row into segments.
      // Each segment will be drawn as one rectangle.
      const segments = [];
      let segVRow = -1, segVecStart = -1, segVecEnd = -1;

      for (let logCL = firstLogCL; logCL <= lastLogCL; logCL++) {
        const globalVecIdx = logCL * numVec;
        const vRow      = Math.floor(globalVecIdx / vecPerVRow);
        const vecInRow  = globalVecIdx % vecPerVRow;
        const vecInRowEnd = vecInRow + numVec - 1;   // last vector column of this logical CL

        if (vRow !== segVRow) {
          // Save completed segment (only if it falls in the visible vRow range)
          if (segVRow >= 0 && segVRow >= startVRow && segVRow < endVRow) {
            segments.push({ vRow: segVRow, vecStart: segVecStart, vecEnd: segVecEnd });
          }
          segVRow     = vRow;
          segVecStart = vecInRow;
        }
        segVecEnd = vecInRowEnd;
      }
      // Flush last segment
      if (segVRow >= 0 && segVRow >= startVRow && segVRow < endVRow) {
        segments.push({ vRow: segVRow, vecStart: segVecStart, vecEnd: segVecEnd });
      }

      if (segments.length === 0) continue;

      const g = this._glyph;
      for (const seg of segments) {
        const rx = Math.round(this.panX + seg.vecStart * vecStep - pad);
        const ry = Math.round(this.panY + seg.vRow * vRowHeight + labelH - pad);
        const rw = Math.max(1, Math.round((seg.vecEnd - seg.vecStart + 1) * vecStep - this._u64GapX() + pad * 2));
        const rh = Math.max(1, Math.round(rowD.h + pad * 2));

        if (oc.alpha > 0.01) {
          g.drawFilledRect(rx, ry, rw, rh, oc.r / 255, oc.g / 255, oc.b / 255, oc.alpha);
        }
        g.drawOutlineRect(rx + 0.5, ry + 0.5, Math.max(1, rw - 1), Math.max(1, rh - 1),
          oc.r / 255, oc.g / 255, oc.b / 255, bAlpha, lw);
      }
    }
  }

  /**
   * Draw the dashed cacheline-boundary outline (same visual style as byte/vector
   * outlines) at PHYSICAL cacheline granularity (cachelineSize bytes).
   *
   * Uses the same segment-grouping logic as _renderCachelineHeatOverlay so that
   * each physical CL gets one outlined rectangle per visual row it occupies.
   */
  _renderCachelineOutline() {
    if (!this.outlineEnabled || !this.outlineTargets?.has('cacheline')) return;

    const phyBitsPerCL  = this.cachelineSize * 8;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const numPhyCL      = Math.ceil(this.bitCount / phyBitsPerCL);
    const totalLogCL    = Math.ceil(this.bitCount / bitsPerCacheLine);

    const vecD       = this._vectorDims();
    const rowD       = this._rowDims();
    const labelH     = this._labelHeight();
    const numVec     = this._numVectorsPerRow();
    const vecPerVRow = this._vectorGroupsPerVisualRow();
    const vRowHeight = labelH + rowD.h + this._u64GapY();
    const vecStep    = vecD.w + this._u64GapX();

    const pad      = this._outlinePadding();
    const topExtra = this._outlineTopExtra('cacheline');
    // When annotations are active (regardless of heatmap state), extend the outline bottom to include the badge area.
    const annotActive = this.cachelineAnnotation && this.cachelineAnnotation !== 'none';
    const annotBottomExtra = annotActive ? Math.min(22, Math.max(14, rowD.h * 0.18)) : 0;
    const ch = this.canvasHeight || 0;
    const startVRow = Math.max(0, Math.floor(-this.panY / vRowHeight));
    const endVRow   = Math.ceil((ch - this.panY) / vRowHeight) + 1;

    const firstVisPhy = Math.max(0,          Math.floor(startVRow * vecPerVRow / numVec * bitsPerCacheLine / phyBitsPerCL));
    const lastVisPhy  = Math.min(numPhyCL - 1, Math.ceil(endVRow   * vecPerVRow / numVec * bitsPerCacheLine / phyBitsPerCL));

    for (let phyClIdx = firstVisPhy; phyClIdx <= lastVisPhy; phyClIdx++) {
      const phyBitStart = phyClIdx * phyBitsPerCL;
      const phyBitEnd   = Math.min(this.bitCount, phyBitStart + phyBitsPerCL);
      const firstLogCL  = Math.floor(phyBitStart / bitsPerCacheLine);
      const lastLogCL   = Math.min(totalLogCL - 1, Math.floor((phyBitEnd - 1) / bitsPerCacheLine));

      // Group consecutive logical CLs that share the same visual row
      const segments = [];
      let segVRow = -1, segVecStart = -1, segVecEnd = -1;

      for (let logCL = firstLogCL; logCL <= lastLogCL; logCL++) {
        const globalVecIdx = logCL * numVec;
        const vRow     = Math.floor(globalVecIdx / vecPerVRow);
        const vecInRow = globalVecIdx % vecPerVRow;
        const vecInRowEnd = vecInRow + numVec - 1;

        if (vRow !== segVRow) {
          if (segVRow >= 0 && segVRow >= startVRow && segVRow < endVRow) {
            segments.push({ vRow: segVRow, vecStart: segVecStart, vecEnd: segVecEnd });
          }
          segVRow     = vRow;
          segVecStart = vecInRow;
        }
        segVecEnd = vecInRowEnd;
      }
      if (segVRow >= 0 && segVRow >= startVRow && segVRow < endVRow) {
        segments.push({ vRow: segVRow, vecStart: segVecStart, vecEnd: segVecEnd });
      }

      for (const seg of segments) {
        const x = this.panX + seg.vecStart * vecStep - pad;
        const y = this.panY + seg.vRow * vRowHeight + labelH - pad - topExtra;
        const w = (seg.vecEnd - seg.vecStart + 1) * vecStep - this._u64GapX() + pad * 2;
        const h = rowD.h + pad * 2 + topExtra + annotBottomExtra;
        if (this._glyph) {
          const [or, og, ob, oa] = this._outlineColorGL();
          const cfg = this._outlineConfig();
          this._glyph.drawOutlineRect(x, y, w, h, or, og, ob, oa, cfg.lineWidth);
        }
      }
    }
  }
  /** Ensure per-physical-cacheline arrays are allocated for the current cachelineSize */
  _ensureCLArrays() {
    const numPhyCL = Math.max(1, Math.ceil(this.bitCount / (this.cachelineSize * 8)));
    if (!this.clHitCount || this.clHitCount.length !== numPhyCL) {
      this.clHitCount = new Int32Array(numPhyCL).fill(0);
      this.clLastHitStep = new Int32Array(numPhyCL).fill(-1);
      this.clMaxHitCount = 0;
    }
  }

  /** Update heat map tracking: mark changed bits and cachelines with current step */
  updateHeatMap(changedBits, stepIndex) {
    if (!this.lastAccessStep) return;
    this.heatMapCurrentStep = stepIndex;
    const phyBitsPerCL = this.cachelineSize * 8;
    this._ensureCLArrays();
    const touchedCL = new Set();
    for (const bit of changedBits) {
      if (bit < this.lastAccessStep.length) {
        this.lastAccessStep[bit] = stepIndex;
      }
      const clIdx = Math.floor(bit / phyBitsPerCL);
      touchedCL.add(clIdx);
    }
    for (const clIdx of touchedCL) {
      if (clIdx < this.clHitCount.length) {
        this.clHitCount[clIdx]++;
        this.clLastHitStep[clIdx] = stepIndex;
        if (this.clHitCount[clIdx] > this.clMaxHitCount) {
          this.clMaxHitCount = this.clHitCount[clIdx];
        }
      }
    }
  }

  /** Rebuild heat map from scratch up to targetStep */
  rebuildHeatMap(steps, targetStep) {
    if (!this.lastAccessStep) return;
    this.lastAccessStep.fill(-1);
    const phyBitsPerCL = this.cachelineSize * 8;
    this._ensureCLArrays();
    this.clHitCount.fill(0);
    this.clLastHitStep.fill(-1);
    this.clMaxHitCount = 0;
    for (let i = 0; i <= targetStep && i < steps.length; i++) {
      const s = steps[i];
      const touchedCL = new Set();
      for (let j = 0; j < s.changedBits.length; j++) {
        const bit = s.changedBits[j];
        if (bit < this.lastAccessStep.length) {
          this.lastAccessStep[bit] = i;
        }
        const clIdx = Math.floor(bit / phyBitsPerCL);
        touchedCL.add(clIdx);
      }
      for (const clIdx of touchedCL) {
        if (clIdx < this.clHitCount.length) {
          this.clHitCount[clIdx]++;
          this.clLastHitStep[clIdx] = i;
          if (this.clHitCount[clIdx] > this.clMaxHitCount) {
            this.clMaxHitCount = this.clHitCount[clIdx];
          }
        }
      }
    }
    this.heatMapCurrentStep = targetStep;
  }

  /**
   * Compute cacheline overlay color based on hit count and recency.
   * Returns { r, g, b, alpha } or null.
   * Color hue = recency (red=recent, blue=old).
   * Alpha = hit count intensity (log-normalized).
   */
  _cachelineHeatOverlayColor(phyClIdx) {
    if (!this.clHitCount || phyClIdx < 0 || phyClIdx >= this.clHitCount.length) return null;
    const hitCount = this.clHitCount[phyClIdx];
    const lastStep = this.clLastHitStep[phyClIdx];

    if (lastStep < 0) {
      // Never accessed — draw very subtle neutral boundary
      return { r: 80, g: 90, b: 130, alpha: 0.06 };
    }

    // Recency: ageT in [0,1], 0=just hit, 1=long ago
    const age = this.heatMapCurrentStep - lastStep;
    const coldThreshold = Math.max(15, this.heatMapCurrentStep * 0.12 + 8);
    const ageT = Math.min(1, age / coldThreshold);

    // Hit count intensity: log-normalized against max
    const maxForNorm = Math.max(1, this.clMaxHitCount);
    const countScore = Math.min(1, Math.log(hitCount + 1) / Math.log(maxForNorm + 1));

    // Color hue based on recency (hot=red, warm=orange/yellow, cold=blue)
    let r, g, b;
    if (ageT < 0.30) {
      // Red -> Orange-red
      const t = ageT / 0.30;
      r = 255;
      g = Math.round(40 + t * 130);
      b = Math.round(15 * (1 - t));
    } else if (ageT < 0.62) {
      // Orange -> Yellow-green
      const t = (ageT - 0.30) / 0.32;
      r = Math.round(255 * (1 - t) + 60 * t);
      g = Math.round(170 + t * 40);
      b = Math.round(0 + t * 50);
    } else {
      // Yellow-green -> Cool blue
      const t = (ageT - 0.62) / 0.38;
      r = Math.round(60 * (1 - t) + 30 * t);
      g = Math.round(210 * (1 - t) + 70 * t);
      b = Math.round(50 + t * 195);
    }

    // Alpha: minimum visibility for any touched CL, scales with count
    const alpha = Math.min(0.60, 0.10 + countScore * 0.50);

    return { r, g, b, alpha };
  }

  /**
   * Build (or rebuild) the prime bit flags array.
   * Uses a Sieve of Eratosthenes up to sieveSize, then maps each bit index
   * to the number it represents (via the current storageModel) and marks it
   * as prime when applicable.  Results are cached by (sieveSize, bitCount,
   * storageModel) so repeated calls with the same parameters are instant.
   *
   * Synchronous by contract — callers (e.g. the settings effect in
   * `Visualizer.jsx`) immediately read `_primeBitFlags` on the next line.
   * For async pre-warming via the worker pre-pass, see
   * `prefetchPrimeOverlay()`.
   */
  buildPrimeOverlay() {
    const limit = Math.max(2, this.sieveSize > 0
      ? this.sieveSize
      : (bitToNumber(Math.max(0, this.bitCount - 1), this.storageModel, this.wheelDefinition) || 0));
    const key = `${limit}:${this.bitCount}:${this.storageModel}:${wheelSignature(this.wheelDefinition)}`;
    if (this._primeOverlayKey === key && this._primeBitFlags) return;
    this._primeOverlayKey = key;
    this._stateDirty = true;

    // Sieve of Eratosthenes
    const sieve = new Uint8Array(limit + 1);
    if (limit >= 2) sieve[2] = 1;
    for (let i = 3; i <= limit; i += 2) sieve[i] = 1;
    for (let p = 3; p * p <= limit; p += 2) {
      if (!sieve[p]) continue;
      for (let j = p * p; j <= limit; j += p * 2) sieve[j] = 0;
    }

    // Build per-bit lookup
    const flags = new Uint8Array(this.bitCount);
    for (let i = 0; i < this.bitCount; i++) {
      const num = bitToNumber(i, this.storageModel, this.wheelDefinition);
      if (num >= 2 && num <= limit && sieve[num]) flags[i] = 1;
    }
    this._primeBitFlags = flags;
  }

  /**
   * Fire-and-forget pre-pass: ask the worker to compute the prime flags
   * for the current `(sieveSize, bitCount, storageModel)` so that a later
   * synchronous `buildPrimeOverlay()` call is a cache hit.
   *
   * Safe to call frequently; it no-ops when the cache is already warm and
   * silently degrades to a no-op when no Worker is available (the caller
   * will fall back to the synchronous path).
   */
  prefetchPrimeOverlay(onReady = null) {
    const sieveSize = this.sieveSize;
    const bitCount = this.bitCount;
    const storageModel = this.storageModel;
    const wheelDefinition = this.wheelDefinition;
    if (!bitCount) return;
    const limit = Math.max(2, sieveSize > 0
      ? sieveSize
      : (bitToNumber(Math.max(0, bitCount - 1), storageModel, wheelDefinition) || 0));
    const key = `${limit}:${bitCount}:${storageModel}:${wheelSignature(wheelDefinition)}`;
    if (this._primeOverlayKey === key && this._primeBitFlags) return;
    const promise = requestPrimeOverlay({ sieveSize, bitCount, storageModel, wheelDefinition });
    if (!promise) return;
    promise.then((reply) => {
      if (!reply || reply.key !== key) return; // stale
      // If the synchronous path beat us to it with the same key, drop the
      // worker result; otherwise install it as the cached flags.
      if (this._primeOverlayKey === key && this._primeBitFlags) return;
      this._primeOverlayKey = key;
      this._primeBitFlags = reply.flags;
      if (typeof onReady === 'function') onReady();
    });
  }

  resize(width, height, dprOverride = null) {
    const dpr = Math.max(0.1, dprOverride != null ? dprOverride : (window.devicePixelRatio || 1));
    if (this._glyphCtx) {
      this._glyphCtx.resize(width, height, dpr);
    }
    // Worker-mode glyph resize is handled by the worker's resize message.
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvasDpr = dpr;
    // Recompute frozen layout on resize
    if (this._frozenClPerVRow > 0) {
      this._frozenClPerVRow = this._computeClPerVRow();
    }
  }

  _bitPosInByte(bitInByte) {
    const bl = BIT_LAYOUTS[this.bitLayout];
    if (bl.grid3x3) {
      const cell = GRID3X3_MAP[bitInByte];
      return { col: cell % 3, row: Math.floor(cell / 3) };
    }
    return { col: bitInByte % bl.cols, row: Math.floor(bitInByte / bl.cols) };
  }

  _bytePosInU64(byteInU64) {
    const bl = BYTE_LAYOUTS[this.byteLayout];
    if (bl.grid3x3) {
      const cell = GRID3X3_MAP[byteInU64];
      return { col: cell % 3, row: Math.floor(cell / 3) };
    }
    return { col: byteInU64 % bl.cols, row: Math.floor(byteInU64 / bl.cols) };
  }

  _bitStepX() {
    return this.pixelSize * this.zoom + this.bitSpacingH * this.zoom;
  }

  _bitStepY() {
    return this.pixelSize * this.zoom + this.bitSpacingV * this.zoom;
  }

  _byteGapX() {
    return (this.bitSpacingH + this.byteSpacingH) * this.zoom;
  }

  _byteGapY() {
    return (this.bitSpacingV + this.byteSpacingV) * this.zoom;
  }

  _u64GapX() {
    return (this.bitSpacingH + this.byteSpacingH + this.u64SpacingH) * this.zoom;
  }

  _u64GapY() {
    return (this.bitSpacingV + this.byteSpacingV + this.u64SpacingV) * this.zoom;
  }

  _byteDims() {
    const bl = BIT_LAYOUTS[this.bitLayout];
    const px = this.pixelSize * this.zoom;
    const cols = bl.grid3x3 ? 3 : bl.cols;
    const rows = bl.grid3x3 ? 3 : bl.rows;
    return {
      w: cols * px + (cols - 1) * this.bitSpacingH * this.zoom,
      h: rows * px + (rows - 1) * this.bitSpacingV * this.zoom,
    };
  }

  _u64Dims() {
    const byteD = this._byteDims();
    const bl = BYTE_LAYOUTS[this.byteLayout];
    const activeBytes = this._logicalBytesPerWord();
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    for (let byteIndex = 0; byteIndex < activeBytes; byteIndex++) {
      const pos = this._bytePosInU64(byteIndex);
      minCol = Math.min(minCol, pos.col);
      maxCol = Math.max(maxCol, pos.col);
      minRow = Math.min(minRow, pos.row);
      maxRow = Math.max(maxRow, pos.row);
    }
    const cols = Number.isFinite(minCol) ? (maxCol - minCol + 1) : (bl.grid3x3 ? 3 : bl.cols);
    const rows = Number.isFinite(minRow) ? (maxRow - minRow + 1) : (bl.grid3x3 ? 3 : bl.rows);
    return {
      w: cols * byteD.w + (cols - 1) * this._byteGapX(),
      h: rows * byteD.h + (rows - 1) * this._byteGapY(),
    };
  }

  // Dimensions of one vector group (vectorGroup uint64s side by side)
  _vectorDims() {
    const u64D = this._u64Dims();
    const n = this.vectorGroup;
    const intraGap = this._u64GapX();
    return {
      w: n * u64D.w + (n - 1) * intraGap,
      h: u64D.h,
      intraGap,
    };
  }

  _numVectorsPerRow() {
    const u64sPerCL = Math.max(1, Math.ceil(this.bitsPerCacheLine / 64));
    return Math.max(1, Math.ceil(u64sPerCL / this.vectorGroup));
  }

  _totalVectorSlots() {
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const totalCacheLines = Math.max(1, Math.ceil(this.bitCount / bitsPerCacheLine));
    return totalCacheLines * this._numVectorsPerRow();
  }

  _vectorGroupsPerVisualRow() {
    if (this.horizontalGroups > 0) return Math.max(1, this.horizontalGroups);
    return Math.max(1, this._cacheLinesPerVisualRow() * this._numVectorsPerRow());
  }

  _vectorSlotLayout(globalVectorIndex) {
    const numVec = this._numVectorsPerRow();
    const vecPerRow = this._vectorGroupsPerVisualRow();
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const vecD = this._vectorDims();
    const vRowHeight = labelH + rowD.h + this._u64GapY();
    const vRow = Math.floor(globalVectorIndex / vecPerRow);
    const vecInRow = globalVectorIndex % vecPerRow;
    const clIdx = Math.floor(globalVectorIndex / numVec);
    const vecIdxInCL = globalVectorIndex % numVec;
    const rowDataY = this.panY + vRow * vRowHeight + labelH;
    const vecX = this.panX + vecInRow * (vecD.w + this._u64GapX());
    return { numVec, vecPerRow, rowD, labelH, vecD, vRowHeight, vRow, vecInRow, clIdx, vecIdxInCL, rowDataY, vecX };
  }

  // How many cache lines to wrap per visual row based on canvas width
  // When frozen, zoom changes don't alter the wrapping layout
  _cacheLinesPerVisualRow() {
    if (this._frozenClPerVRow > 0) return this._frozenClPerVRow;
    return this._computeClPerVRow();
  }

  _computeClPerVRow() {
    if (this.horizontalGroups > 0) return Math.max(1, this.horizontalGroups);
    // Layout column-count must follow the VISIBLE viewport, not the
    // (potentially oversized) drawing buffer. The canvas is sized to
    // ~3.2× the viewport so the rotated 3D plane has drag headroom
    // — but the grid the user sees should fit the visible container.
    // `layoutAvailWidth`/`layoutAvailHeight` are set by the host every
    // resize; they fall back to canvasWidth/Height for compatibility.
    const avail = (this.layoutAvailWidth && this.layoutAvailWidth > 0)
      ? this.layoutAvailWidth
      : this.canvasWidth;
    const availH0 = (this.layoutAvailHeight && this.layoutAvailHeight > 0)
      ? this.layoutAvailHeight
      : (this.canvasHeight || 0);
    if (!avail || avail <= 0) return 1;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const totalCacheLines = Math.max(1, Math.ceil(this.bitCount / bitsPerCacheLine));
    // Compute dimensions at zoom=1 for stable wrapping independent of zoom.
    const savedZoom = this.zoom;
    this.zoom = 1;
    const rowW = this._rowDims().w;
    const rowH = this._rowDims().h;
    const labelH = this._labelHeight();
    this.zoom = savedZoom;

    if (rowW <= 0 || rowH <= 0) return 1;
    const availH = Math.max(1, availH0);
    const clStepX = rowW + this.bitSpacingH + this.byteSpacingH + this.u64SpacingH;
    const vRowH = labelH + rowH + this.bitSpacingV + this.byteSpacingV + this.u64SpacingV;
    const maxByWidth = Math.max(1, Math.floor(avail / clStepX));
    const maxCandidate = Math.min(totalCacheLines, Math.max(1, maxByWidth));

    let best = 1;
    let bestScore = Number.POSITIVE_INFINITY;
    const targetAspect = Math.max(0.2, Math.min(5, avail / availH));

    const sectionAnchors = [maxCandidate, Math.floor(maxCandidate / 2), Math.floor(maxCandidate / 4), Math.floor(maxCandidate / 8)]
      .filter((v, i, arr) => v >= 1 && arr.indexOf(v) === i);

    for (let n = 1; n <= maxCandidate; n++) {
      const visualRows = Math.ceil(totalCacheLines / n);
      const layoutW = n * rowW + Math.max(0, n - 1) * (this.bitSpacingH + this.byteSpacingH + this.u64SpacingH);
      const layoutH = visualRows * vRowH;
      if (layoutW <= 0 || layoutH <= 0) continue;

      const layoutAspect = layoutW / layoutH;
      const aspectPenalty = Math.abs(Math.log(layoutAspect / targetAspect));

      const widthFill = Math.min(1, layoutW / avail);
      const heightFill = Math.min(1, layoutH / availH);
      const fillPenalty = 1 - (widthFill * heightFill);

      let sectionBias = 0;
      for (const anchor of sectionAnchors) {
        const dist = Math.abs(n - anchor);
        sectionBias = Math.max(sectionBias, Math.exp(-dist / 2));
      }

      const score = aspectPenalty + fillPenalty * 0.7 - sectionBias * 0.12;
      if (score < bestScore) {
        bestScore = score;
        best = n;
      }
    }

    return Math.max(1, Math.min(maxCandidate, best));
  }

  /** Freeze the current wrapping layout so zoom doesn't change it */
  freezeLayout() {
    this._frozenClPerVRow = this._computeClPerVRow();
  }

  /** Unfreeze layout (e.g. when window is resized or layout settings change) */
  unfreezeLayout() {
    this._frozenClPerVRow = 0;
  }

  // Row = one cache line = numVectors vector groups
  _rowDims() {
    const vecD = this._vectorDims();
    const n = this._numVectorsPerRow();
    return {
      w: n * vecD.w + (n - 1) * this._u64GapX(),
      h: vecD.h,
    };
  }

  // Height of stacked label bands above each row.
  // Vector labels are above byte labels; byte labels stay closer to bits.
  _labelBands() {
    const showByte = this.showByteLabels && this.zoom >= 4;
    const showVector = this.showVectorLabels;
    const vectorFont = Math.max(4, Math.min(13, this.zoom * 0.84));
    const byteFont = Math.max(4, Math.min(11, this.zoom * 0.72));
    const vector = showVector ? Math.ceil(vectorFont + 6) : 0;
    const byte = showByte ? Math.ceil(byteFont + 5) : 0;
    const byteRows = byte;
    const byteLine = showByte ? Math.ceil(byteFont + 2) : 0;
    return {
      vector,
      byte,
      total: vector + byte,
      vectorFont,
      byteFont,
      byteRows,
      byteLine,
      showVector,
      showByte,
    };
  }

  _labelHeight() {
    return this._labelBands().total;
  }

  /**
   * Top-level frame render. Coordinator only — the heavy lifting is split
   * into small private methods (`_buildFrameContext`, `_renderClear`,
   * `_renderVisualRow` → `_renderVector` → `_renderVectorU64` →
   * `_renderVectorByte` → `_renderBitCell` → bit-body / decorations / labels).
   * Behaviour is byte-for-byte identical to the original monolithic version;
   * the split is purely structural.
   */
  render() {
    if (!this._measureCtx || !this.bitState || this.bitCount === 0) return;

    this._glyphFramePrimed = false;

    this._recordFrameTiming();

    const f = this._buildFrameContext();

    // Begin the WebGL glyph-text frame. In worker mode (_glyphBuf) this just
    // resets the command buffer. In direct mode (_glyphCtx) it clears the
    // separate glyph canvas every frame so stale text is removed.
    const glCtx = this._glyphBuf || this._glyphCtx || null;
    if (glCtx) {
      const canvasDpr = Math.max(0.1, this.canvasDpr || 1);
      const cw = this.canvasWidth  || 0;
      const ch = this.canvasHeight || 0;
      glCtx.beginFrame(cw, ch, canvasDpr);
    }

    this._renderClear(f);

    // Draw cacheline-level overlays before bits so bits render on top
    this._renderCachelineHeatOverlay();
    this._renderCachelineOutline();

    for (let vRow = f.startVRow; vRow < f.endVRow; vRow++) {
      this._renderVisualRow(f, vRow);
    }

    if (!this.suppressMaskWriteOverlay) {
      this.maskWriteOverlay.render(glCtx);
    }
    this.vectorTouchOrderOverlay.render(f.ctx, glCtx);
    this.cachelineAnnotationsOverlay.render(f.ctx, glCtx);
    this.searchOverlay.render(f.cw, f.ch, glCtx);

    // Flush the WebGL glyph-text batch.
    // Worker mode: store commands for Visualizer.jsx to pass to g.render().
    // Direct mode: endFrame() uploads to GL immediately.
    if (glCtx) {
      if (this._glyphBuf) {
        this._pendingGlyphCmds = glCtx.endFrame();
      } else {
        glCtx.endFrame();
      }
      this._glyphFramePrimed = true;
    }
  }

  /**
   * Precompute every per-frame constant once. The returned object is the
   * shared "frame context" passed down through the row/vector/byte/bit chain
   * so each method can read everything via `f.foo` without recomputing.
   */
  _buildFrameContext() {
    const C = this.colors;
    const ctx = this._measureCtx;
    const canvasDpr = Math.max(0.1, this.canvasDpr || 1);
    const cw = this.canvasWidth || 0;
    const ch = this.canvasHeight || 0;

    const px = this.pixelSize * this.zoom;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const totalCacheLines = Math.ceil(this.bitCount / bitsPerCacheLine);
    const rowD = this._rowDims();
    const labelBands = this._labelBands();
    const labelH = this._labelHeight();
    const numVec = this._numVectorsPerRow();
    const totalVectorSlots = totalCacheLines * numVec;
    const vecPerVRow = this._vectorGroupsPerVisualRow();
    const vRowHeight = labelH + rowD.h + this._u64GapY();
    const totalVRows = Math.ceil(totalVectorSlots / vecPerVRow);

    const startVRow = Math.max(0, Math.floor(-this.panY / vRowHeight));
    const endVRow = Math.min(totalVRows, Math.ceil((ch - this.panY) / vRowHeight) + 1);

    const u64D = this._u64Dims();
    const vecD = this._vectorDims();
    const byteD = this._byteDims();
    const bitBl = BIT_LAYOUTS[this.bitLayout];
    const changedColor = this._opColor();
    const bitColors = this._bitColors();

    const showBitLabels = this.showBitLabels && this.zoom >= 6;
    const showNumberLabels = this.showNumberLabels && this.zoom >= 6;
    const showByteLabels = labelBands.showByte;
    const showVectorLabels = labelBands.showVector;

    const u64sPerCL = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
    const u64GapX = this._u64GapX();
    const byteGapX = this._byteGapX();
    const byteGapY = this._byteGapY();
    const bitStepX = this._bitStepX();
    const bitStepY = this._bitStepY();
    const baseAlpha = Math.max(0.12, Math.min(1, this.gridOpacity ?? 1));

    return {
      C, ctx, cw, ch, px,
      bitsPerCacheLine, totalCacheLines, rowD, labelBands, labelH,
      numVec, totalVectorSlots, vecPerVRow, vRowHeight, totalVRows,
      startVRow, endVRow,
      u64D, vecD, byteD, bitBl, changedColor, bitColors,
      showBitLabels, showNumberLabels, showByteLabels, showVectorLabels,
      u64sPerCL, u64GapX, byteGapX, byteGapY, bitStepX, bitStepY, baseAlpha,
      vectorLabelY: vRow => this.panY + vRow * vRowHeight + 1,
      byteLabelY: (vRowBaseY, byteTopY) => Math.max(vRowBaseY + labelBands.vector + 1, byteTopY - labelBands.byteFont - 1),
    };
  }

  /** Canvas 2D layers are no longer used for rendering; GL handles all drawing. */
  _renderClear(_f) {}

  /** Render one visual row (a horizontal strip of vectors). */
  _renderVisualRow(f, vRow) {
    const vRowBaseY = this.panY + vRow * f.vRowHeight;
    const vRowDataY = vRowBaseY + f.labelH;
    if (vRowDataY + f.rowD.h < 0 || vRowBaseY > f.ch) return;

    for (let vecInRow = 0; vecInRow < f.vecPerVRow; vecInRow++) {
      const globalVectorIndex = vRow * f.vecPerVRow + vecInRow;
      if (globalVectorIndex >= f.totalVectorSlots) break;
      if (this._renderVector(f, vRow, vecInRow, globalVectorIndex, vRowBaseY, vRowDataY) === false) break;
    }
  }

  /**
   * Render one vector group: the vector label and all u64s belonging to it.
   * Returns `false` to signal the outer loop to stop (cacheline index out of range).
   */
  _renderVector(f, vRow, vecInRow, globalVectorIndex, vRowBaseY, vRowDataY) {
    const clIdx = Math.floor(globalVectorIndex / f.numVec);
    if (clIdx >= f.totalCacheLines) return false;

    const vecIdxInCL = globalVectorIndex % f.numVec;
    const vecX = this.panX + vecInRow * (f.vecD.w + f.u64GapX);
    const rowBitStart = clIdx * f.bitsPerCacheLine;
    const rowBitStop = Math.min(rowBitStart + f.bitsPerCacheLine, this.bitCount);
    const u64Start = vecIdxInCL * this.vectorGroup;
    const bitStart = rowBitStart + u64Start * 64;
    const bitEnd = Math.min(bitStart + this.vectorGroup * 64 - 1, rowBitStop - 1, this.bitCount - 1);
    if (bitStart >= rowBitStop) return true;

    if (f.showVectorLabels) {
      const label = `${this._groupLabel(globalVectorIndex)} bits ${bitStart}-${bitEnd}`;
      const labelX = Math.round(vecX);
      const labelY = Math.round(f.vectorLabelY(vRow));
      if (labelX + f.vecD.w > 0 && labelX < f.cw && vRowBaseY >= -f.labelH && vRowBaseY < f.ch) {
        if (this._glyph) {
          const [lr, lg, lb, la] = this._parseCssColorGL(f.C.LABEL_COLOR);
          this._glyph.drawFittedText(label, labelX + 1, labelY, f.labelBands.vectorFont, Math.max(8, f.vecD.w - 4), lr, lg, lb, la, 'left', 'top', 3.5);
        }
      }
    }

    for (let intraIdx = 0; intraIdx < this.vectorGroup; intraIdx++) {
      const u64Idx = u64Start + intraIdx;
      if (u64Idx >= f.u64sPerCL) break;
      const u64BitStart = rowBitStart + u64Idx * 64;
      if (u64BitStart >= rowBitStop) break;
      this._renderVectorU64(f, vecX, vRowDataY, vRowBaseY, intraIdx, u64BitStart, rowBitStop);
    }
    return true;
  }

  /** Render one u64 within a vector: optional vector outline (intraIdx===0) and all 8 bytes. */
  _renderVectorU64(f, vecX, vRowDataY, vRowBaseY, intraIdx, u64BitStart, rowBitStop) {
    const u64X = vecX + intraIdx * (f.u64D.w + f.vecD.intraGap);

    if (this.outlineEnabled && this.outlineTargets?.has('vector') && intraIdx === 0 && this._glyph) {
      const pad = this._outlinePadding();
      const topExtra = this._outlineTopExtra('vector');
      const [or, og, ob, oa] = this._outlineColorGL();
      const cfg = this._outlineConfig();
      this._glyph.drawOutlineRect(vecX - pad, vRowDataY - pad - topExtra, f.vecD.w + 2 * pad, f.vecD.h + 2 * pad + topExtra, or, og, ob, oa, cfg.lineWidth);
    }

    for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
      const byteBitStart = u64BitStart + byteIdx * 8;
      if (byteBitStart >= rowBitStop) break;
      this._renderVectorByte(f, u64X, vRowDataY, vRowBaseY, byteIdx, byteBitStart, rowBitStop);
    }
  }

  /** Render one byte: optional outline + label + the 8 bits inside it. */
  _renderVectorByte(f, u64X, vRowDataY, vRowBaseY, byteIdx, byteBitStart, rowBitStop) {
    const bytePos = this._bytePosInU64(byteIdx);
    const byteX = u64X + bytePos.col * (f.byteD.w + f.byteGapX);
    const byteY = vRowDataY + bytePos.row * (f.byteD.h + f.byteGapY);

    if (this.outlineEnabled && this.outlineTargets?.has('byte') && this._glyph) {
      const pad = this._outlinePadding();
      const topExtra = this._outlineTopExtra('byte');
      const [or, og, ob, oa] = this._outlineColorGL();
      const cfg = this._outlineConfig();
      this._glyph.drawOutlineRect(byteX - pad, byteY - pad - topExtra, f.byteD.w + 2 * pad, f.byteD.h + 2 * pad + topExtra, or, og, ob, oa, cfg.lineWidth);
    }

    if (f.showByteLabels && this._glyph) {
      const byteLabel = `Byte ${this._byteLabelValue(byteBitStart)}`;
      const [lr, lg, lb, la] = this._parseCssColorGL(f.C.LABEL_COLOR);
      this._glyph.drawFittedText(byteLabel, Math.round(byteX) + 1, Math.round(f.byteLabelY(vRowBaseY, byteY)), f.labelBands.byteFont, Math.max(8, f.byteD.w - 4), lr, lg, lb, la, 'left', 'top', 3.5);
    }

    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const globalBit = byteBitStart + bitIdx;
      if (globalBit >= rowBitStop || globalBit >= this.bitCount) break;
      if (f.bitBl.grid3x3 && bitIdx >= 8) continue;

      const bitPos = this._bitPosInByte(bitIdx);
      const bitX = byteX + bitPos.col * f.bitStepX;
      const bitY = byteY + bitPos.row * f.bitStepY;
      if (bitX + f.px < 0 || bitX > f.cw || bitY + f.px < 0 || bitY > f.ch) continue;

      this._renderBitCell(f, globalBit, bitIdx, bitX, bitY);
    }
  }

  /**
   * Render one bit cell: classify → compute geometry/depth → draw body
   * → draw all per-bit decorations (ghost mask, focus, target, prime,
   * range, multiples) → draw labels.
   */
  _renderBitCell(f, globalBit, bitIdx, bitX, bitY) {
    const cls = this._classifyBit(f, globalBit);
    const draw = this._computeBitDrawState(f, globalBit, cls.isSetBit, cls.isChangedBit, bitX, bitY);
    this._drawBitBody(f, cls, draw, bitX, bitY);
    this._drawDebugCellOutline(f, draw, bitX, bitY);
    if (cls.isGhostMaskedBit) this._drawGhostMaskHighlight(f, draw);
    if (cls.inFocusRange) this._drawBitFocusRange(f, bitX, bitY);
    this._drawBitTargetOutline(f, globalBit, draw, cls.targetHitCount);
    this._drawBitPrimeOverlay(f, globalBit, bitX, bitY);
    this._drawBitRangeOverlay(f, globalBit, bitX, bitY);
    this._drawBitMultiplesOverlay(f, globalBit, bitX, bitY);
    this._drawBitLabels(f, globalBit, bitIdx, cls, draw, bitX, bitY);
  }

  _drawDebugCellOutline(f, draw, bitX, bitY) {
    if (!this.debugAllCellOutlines) return;
    const x = Number.isFinite(draw?.drawX) ? draw.drawX : bitX;
    const y = Number.isFinite(draw?.drawY) ? draw.drawY : bitY;
    const size = Math.max(1, Number.isFinite(draw?.drawSize) ? draw.drawSize : f.px);
    const lw = Math.max(0.75, Math.min(1.25, 0.85 + (this.zoom || 1) * 0.015));
    const _gc = this._glyph;
    if (!_gc) return;
    const [cr, cg, cb, ca] = this._parseCssColorGL(this.debugAllCellOutlineColor || 'rgba(255,255,255,0.82)');
    _gc.drawOutlineRect(x + 0.5, y + 0.5, Math.max(0, size - 1), Math.max(0, size - 1), cr, cg, cb, ca, lw);
  }

  /** Decide the bit's color and per-bit boolean flags (ghost / changed / set / repeated / focus). */
  _classifyBit(f, globalBit) {
    const inFocusRange = this._isInFocusRange(globalBit);
    const targetHitCount = this.targetHitCounts?.get(globalBit) || 0;
    const isSetBit = !!this.bitState[globalBit];
    const isGhostMaskedBit = this.maskGhostBits?.has(globalBit) && isSetBit;
    const isChangedBit = this.changedBits.has(globalBit);
    const isRepeatedWrite = (targetHitCount > 1) || this.repeatedChangedBits?.has(globalBit);

    let color;
    if (isGhostMaskedBit) {
      color = f.bitColors.cleared;
    } else if (isChangedBit) {
      color = isRepeatedWrite ? [245, 158, 11] : f.changedColor;
    } else if (isSetBit) {
      color = f.bitColors.set;
    } else {
      color = f.bitColors.cleared;
    }
    const bitAlpha = (!isChangedBit && !isGhostMaskedBit && !isRepeatedWrite) ? f.baseAlpha : 1;
    return { color, inFocusRange, targetHitCount, isGhostMaskedBit, isChangedBit, isRepeatedWrite, isSetBit, bitAlpha };
  }

  /**
   * Compute the geometry the bit cell will be drawn at: the draw box
   * (`drawX`, `drawY`, `drawSize`).
   */
  _computeBitDrawState(f, globalBit, isSetBit, isChangedBit, bitX, bitY) {
    const px = f.px;
    const drawSize = Math.max(1, Math.round(px));
    const drawX = Math.round(bitX);
    const drawY = Math.round(bitY);
    return { drawX, drawY, drawSize };
  }

  /** Dispatch to the bit-body drawing method. */
  _drawBitBody(f, cls, draw, bitX, bitY) {
    this._drawBitBodyNormal(f, cls, draw);
  }

  /** Normal flat bit fill — handled entirely by GL instanced quads. Canvas2D no-op. */
  _drawBitBodyNormal(f, cls, draw) {
    // GL fills the cell via the instanced quad shader (stateTex color lookup).
  }

  /** Tinted overlay + outline drawn on top of a ghost-masked set bit. */
  _drawGhostMaskHighlight(f, draw) {
    const { drawX, drawY, drawSize } = draw;
    const px = f.px;
    const set = f.bitColors.set;
    if (!this._glyph) return;
    const g = this._glyph;
    const lw = Math.max(0.7, Math.min(1.6, px * 0.12));
    g.drawFilledRect(drawX, drawY, drawSize, drawSize, set[0] / 255, set[1] / 255, set[2] / 255, 0.2);
    g.drawOutlineRect(
      Math.round(drawX - 0.5), Math.round(drawY - 0.5),
      Math.max(2, Math.round(drawSize + 1)), Math.max(2, Math.round(drawSize + 1)),
      set[0] / 255, set[1] / 255, set[2] / 255, 0.95, lw
    );
  }

  /** Focus-range tint — handled by GL via bit 7 in stateTex. Canvas2D no-op. */
  _drawBitFocusRange(f, bitX, bitY) {
    // GL applies the focus-range tint via the fragment shader (state bit 7).
  }

  /** Blue (and orange-on-repeat) outline around target bits. */
  _drawBitTargetOutline(f, globalBit, draw, targetHitCount) {
    const showTargetOutline = this.targetBits?.has(globalBit)
      && !this.maskGhostBits?.has(globalBit)
      && this.zoom >= 1.4
      && f.px >= 2.5;
    if (!showTargetOutline) return;
    const { drawX, drawY, drawSize } = draw;
    const px = f.px;
    const lw1 = Math.max(0.35, Math.min(1.25, px * 0.08));
    if (!this._glyph) return;
    const g = this._glyph;
    g.drawOutlineRect(
      Math.round(drawX - 0.5), Math.round(drawY - 0.5),
      Math.max(2, Math.round(drawSize + 1)), Math.max(2, Math.round(drawSize + 1)),
      59 / 255, 130 / 255, 246 / 255, 0.95, lw1
    );
    if (targetHitCount > 1 && this.zoom >= 2.2 && px >= 4) {
      const lw2 = Math.max(0.5, Math.min(1.6, px * 0.11));
      g.drawOutlineRect(
        Math.round(drawX + 1), Math.round(drawY + 1),
        Math.max(1, Math.round(drawSize - 2)), Math.max(1, Math.round(drawSize - 2)),
        245 / 255, 158 / 255, 11 / 255, 0.95, lw2
      );
    }
  }

  /** Gold tint + dot + (at zoom) 'p' label for prime bits. Tint and border handled by GL. */
  _drawBitPrimeOverlay(f, globalBit, bitX, bitY) {
    if (!(this.primeOverlay && this._primeBitFlags?.[globalBit])) return;
    const px = f.px;
    const dotR = Math.max(0.8, Math.min(px * 0.22, 4));

    if (!this._glyph) return;
    // GL path: dot at top-right, optional 'p' label at top-left.
    const g = this._glyph;
    const dcx = Math.round(bitX + px) - dotR * 0.75;
    const dcy = Math.round(bitY) + dotR * 0.75;
    g.drawDot(dcx, dcy, dotR, 251 / 255, 191 / 255, 36 / 255, 0.92);
    if (px >= 16) {
      const pSize = Math.max(4, Math.min(px * 0.22, 9));
      g.drawText('p', Math.round(bitX + 1), Math.round(bitY + 1), pSize,
        251 / 255, 191 / 255, 36 / 255, 0.90, 'left', 'top');
    }
  }

  /** Cyan/teal dot + (at zoom) 'r' label for bits within [rangeOverlayStart, rangeOverlayEnd]. Tint and border handled by GL. */
  _drawBitRangeOverlay(f, globalBit, bitX, bitY) {
    if (!(this.rangeOverlay && globalBit >= this.rangeOverlayStart && globalBit <= this.rangeOverlayEnd)) return;
    const px = f.px;
    const dotR2 = Math.max(0.8, Math.min(px * 0.20, 3.5));

    if (!this._glyph) return;
    // GL path: dot at top-left, optional 'r' label at top-right.
    const g = this._glyph;
    g.drawDot(Math.round(bitX) + dotR2 * 0.75, Math.round(bitY) + dotR2 * 0.75, dotR2,
      34 / 255, 211 / 255, 238 / 255, 0.88);
    if (px >= 16) {
      const rSize = Math.max(4, Math.min(px * 0.20, 8));
      g.drawText('r', Math.round(bitX + px - 1), Math.round(bitY + 1), rSize,
        34 / 255, 211 / 255, 238 / 255, 0.90, 'right', 'top');
    }
  }

  /** Purple dot + (at zoom) '×' label for multiples. Tint and border handled by GL. */
  _drawBitMultiplesOverlay(f, globalBit, bitX, bitY) {
    if (!(this.multiplesOverlay && this.multiplesOverlayPrime >= 2)) return;
    const num = bitToNumber(globalBit, this.storageModel, this.wheelDefinition);
    if (!(num >= 2 && num % this.multiplesOverlayPrime === 0)) return;
    const px = f.px;
    const dotR3 = Math.max(0.8, Math.min(px * 0.20, 3.5));

    if (!this._glyphCtx) return;
    // GL path: dot at bottom-right, optional '×' label at bottom-right.
    const g = this._glyphCtx;
    g.drawDot(Math.round(bitX + px) - dotR3 * 0.75, Math.round(bitY + px) - dotR3 * 0.75, dotR3,
      167 / 255, 139 / 255, 250 / 255, 0.90);
    if (px >= 16) {
      const mSize = Math.max(4, Math.min(px * 0.20, 8));
      g.drawText('\u00d7', Math.round(bitX + px - 1), Math.round(bitY + px - 1), mSize,
        167 / 255, 139 / 255, 250 / 255, 0.90, 'right', 'bottom');
    }
  }

  /**
   * Draw bit/number labels inside the cell. Honours dual-line mode, the
   * lowered-position label shrink, and the high-zoom font boost.
   */
  _drawBitLabels(f, globalBit, bitIdx, cls, draw, bitX, bitY) {
    const { showBitLabels, showNumberLabels, px } = f;
    const dualLabelMode = showBitLabels && showNumberLabels;
    if (!((dualLabelMode && px >= 22) || (!dualLabelMode && (showBitLabels || showNumberLabels) && px >= 12))) return;

    const lines = [];
    if (showBitLabels) lines.push(String(this._bitLabelValue(globalBit, bitIdx)));
    if (showNumberLabels) {
      const number = bitToNumber(globalBit, this.storageModel, this.wheelDefinition);
      lines.push(number == null ? 'unmapped' : String(number));
    }

    const dualLine = lines.length > 1;
    const zoomBoost = this.zoom > 20 ? 1 + Math.min(1, (this.zoom - 20) / 24) : 1;

    const baseFontSize = dualLine
      ? Math.max(5, Math.min(8, px * 0.2))
      : Math.max(5, Math.min(9, px * 0.34));
    const fontSize = baseFontSize * zoomBoost;
    const centerX = Math.round(bitX + px / 2);
    const centerY = Math.round(bitY + px / 2);

    if (!this._glyph) return;
    // GL glyph path — skip the Canvas 2D context entirely.
    const g = this._glyph;
    const [tr, tg, tb, ta] = this._labelTextColorGL(cls.color);
    if (dualLine) {
      g.drawText(lines[0], centerX, Math.round(bitY + px * 0.32), fontSize,
        tr, tg, tb, ta, 'center', 'middle');
      g.drawText(lines[1], centerX, Math.round(bitY + px * 0.7),
        Math.max(4.5, fontSize - 0.25), tr, tg, tb, ta, 'center', 'middle');
    } else {
      g.drawText(lines[0], centerX, centerY, fontSize,
        tr, tg, tb, ta, 'center', 'middle');
    }
  }


  canvasToBitIndex(canvasX, canvasY) {
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const vRowHeight = labelH + rowD.h + this._u64GapY();
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const vecD = this._vectorDims();
    const px = this.pixelSize * this.zoom;
    const numVec = this._numVectorsPerRow();
    const vecPerRow = this._vectorGroupsPerVisualRow();
    const vecStep = vecD.w + this._u64GapX();

    const vRow = Math.floor((canvasY - this.panY) / vRowHeight);
    if (vRow < 0) return -1;

    const localY = canvasY - this.panY - vRow * vRowHeight - labelH;
    const localX = canvasX - this.panX;
    if (localX < 0 || localY < 0 || localY > rowD.h) return -1;

    const vecInRow = Math.floor(localX / vecStep);
    if (vecInRow < 0 || vecInRow >= vecPerRow) return -1;
    const globalVectorIndex = vRow * vecPerRow + vecInRow;
    const clIdx = Math.floor(globalVectorIndex / numVec);
    const vecIdx = globalVectorIndex % numVec;
    const rowBitStart = clIdx * bitsPerCacheLine;
    const rowBitStop = Math.min(rowBitStart + bitsPerCacheLine, this.bitCount);
    const inVecX = localX - vecInRow * vecStep;

    // Find which u64 within the vector
    const u64InVecStep = u64D.w + vecD.intraGap;
    const intraIdx = Math.floor(inVecX / u64InVecStep);
    if (intraIdx < 0 || intraIdx >= this.vectorGroup) return -1;

    const u64Idx = vecIdx * this.vectorGroup + intraIdx;
    const u64sPerCL = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
    if (u64Idx >= u64sPerCL) return -1;

    const inU64X = inVecX - intraIdx * u64InVecStep;

    // Find byte within u64
    const byteStep_w = byteD.w + this._byteGapX();
    const byteStep_h = byteD.h + this._byteGapY();
    const byteBl = BYTE_LAYOUTS[this.byteLayout];
    const bCols = byteBl.grid3x3 ? 3 : byteBl.cols;

    const byteCol = Math.floor(inU64X / byteStep_w);
    const byteRow = Math.floor(localY / byteStep_h);
    if (byteCol < 0 || byteCol >= bCols || byteRow < 0) return -1;

    let byteIdx = -1;
    for (let i = 0; i < 8; i++) {
      const pos = this._bytePosInU64(i);
      if (pos.col === byteCol && pos.row === byteRow) { byteIdx = i; break; }
    }
    if (byteIdx < 0) return -1;

    // Find bit within byte
    const inByteX = inU64X - byteCol * byteStep_w;
    const inByteY = localY - byteRow * byteStep_h;
    const bitStep_w = this._bitStepX();
    const bitStep_h = this._bitStepY();
    const bitBl = BIT_LAYOUTS[this.bitLayout];
    const bitCols = bitBl.grid3x3 ? 3 : bitBl.cols;

    const bitCol = Math.floor(inByteX / bitStep_w);
    const bitRow = Math.floor(inByteY / bitStep_h);
    if (bitCol < 0 || bitCol >= bitCols || bitRow < 0) return -1;

    let bitInByte = -1;
    for (let i = 0; i < 8; i++) {
      const pos = this._bitPosInByte(i);
      if (pos.col === bitCol && pos.row === bitRow) { bitInByte = i; break; }
    }
    if (bitInByte < 0) return -1;

    const globalBit = clIdx * bitsPerCacheLine + u64Idx * 64 + byteIdx * 8 + bitInByte;
    if (globalBit >= rowBitStop) return -1;
    if (globalBit < 0 || globalBit >= this.bitCount) return -1;
    return globalBit;
  }

  bitIndexToCanvas(bitIdx) {
    if (bitIdx < 0 || bitIdx >= this.bitCount) return null;

    const bitsPerCacheLine = this.bitsPerCacheLine;
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const vRowHeight = labelH + rowD.h + this._u64GapY();
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const vecD = this._vectorDims();
    const vecPerRow = this._vectorGroupsPerVisualRow();

    const clIdx = Math.floor(bitIdx / bitsPerCacheLine);
    const bitInRow = bitIdx % bitsPerCacheLine;
    const u64Idx = Math.floor(bitInRow / 64);
    const bitInU64 = bitInRow % 64;
    const byteIdx = Math.floor(bitInU64 / 8);
    const bitInByte = bitInU64 % 8;

    const u64sPerCL = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
    if (u64Idx < 0 || u64Idx >= u64sPerCL) return null;

    const vecIdx = Math.floor(u64Idx / this.vectorGroup);
    const globalVectorIndex = clIdx * this._numVectorsPerRow() + vecIdx;
    const vRow = Math.floor(globalVectorIndex / vecPerRow);
    const vecInRow = globalVectorIndex % vecPerRow;
    const rowDataY = this.panY + vRow * vRowHeight + labelH;

    const intraIdx = u64Idx % this.vectorGroup;
    const vecX = this.panX + vecInRow * (vecD.w + this._u64GapX());
    const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);

    const bytePos = this._bytePosInU64(byteIdx);
    const byteX = u64X + bytePos.col * (byteD.w + this._byteGapX());
    const byteY = rowDataY + bytePos.row * (byteD.h + this._byteGapY());

    const px = this.pixelSize * this.zoom;
    const bitPos = this._bitPosInByte(bitInByte);
    const x = byteX + bitPos.col * this._bitStepX() + px / 2;
    const y = byteY + bitPos.row * this._bitStepY() + px / 2;

    return { x, y };
  }

  /**
   * Return the layout parameters consumed by the WebGL vertex shader to
   * compute per-bit (x, y) positions directly on the GPU from
   * `gl_InstanceID`. All values are pan-independent CSS-px scalars or
   * small lookup arrays; no position texture is needed.
   *
   * The returned object is spread into the `renderParams` passed to
   * `BitGridGLWorker.render()` / `BitGridGLCore.render()`.
   *
   * @returns {{
   *   bitsPerCL: number, u64sPerCL: number, vectorGroup: number,
   *   numVecsPerCL: number, vecPerRow: number,
   *   vecStep: number, u64Step: number,
   *   byteStepX: number, byteStepY: number,
   *   bitStepX: number, bitStepY: number,
   *   labelH: number, vRowHeight: number, pxHalf: number,
   *   bytePos: Float32Array,  // 16 floats: (col,row) × 8 bytes
   *   bitPos:  Float32Array,  // 16 floats: (col,row) × 8 bit positions
   * }}
   */
  glLayoutParams() {
    // ── Invariant layout values ──────────────────────────────────────────
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const u64sPerCL  = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
    const vectorGroup = this.vectorGroup;

    const zoom       = this.zoom;
    const pixelSize  = this.pixelSize;
    const px         = pixelSize * zoom;

    const bitSpacingH  = this.bitSpacingH;
    const bitSpacingV  = this.bitSpacingV;
    const byteSpacingH = this.byteSpacingH;
    const byteSpacingV = this.byteSpacingV;
    const u64SpacingH  = this.u64SpacingH;
    const u64SpacingV  = this.u64SpacingV;

    const bitStepX  = (pixelSize + bitSpacingH) * zoom;
    const bitStepY  = (pixelSize + bitSpacingV) * zoom;
    const byteGapX  = (bitSpacingH + byteSpacingH) * zoom;
    const byteGapY  = (bitSpacingV + byteSpacingV) * zoom;
    const u64GapX   = (bitSpacingH + byteSpacingH + u64SpacingH) * zoom;
    const u64GapY   = (bitSpacingV + byteSpacingV + u64SpacingV) * zoom;

    // byteDims
    const bitBl    = BIT_LAYOUTS[this.bitLayout];
    const bitCols  = bitBl.grid3x3 ? 3 : bitBl.cols;
    const bitRows  = bitBl.grid3x3 ? 3 : bitBl.rows;
    const byteDimW = bitCols * px + (bitCols - 1) * bitSpacingH * zoom;
    const byteDimH = bitRows * px + (bitRows - 1) * bitSpacingV * zoom;

    // Build byte-in-u64 lookup tables (8 entries max)
    const byteBl      = BYTE_LAYOUTS[this.byteLayout];
    const activeBytes = Math.max(1, Math.min(8, Math.ceil(this._logicalGroupBits() / 8)));
    const byteColLookup = new Int32Array(8);
    const byteRowLookup = new Int32Array(8);
    let minBCol = Infinity, maxBCol = -Infinity;
    let minBRow = Infinity, maxBRow = -Infinity;
    for (let b = 0; b < activeBytes; b++) {
      let col, row;
      if (byteBl.grid3x3) {
        const cell = GRID3X3_MAP[b];
        col = cell % 3;
        row = Math.floor(cell / 3);
      } else {
        col = b % byteBl.cols;
        row = Math.floor(b / byteBl.cols);
      }
      byteColLookup[b] = col;
      byteRowLookup[b] = row;
      if (col < minBCol) minBCol = col;
      if (col > maxBCol) maxBCol = col;
      if (row < minBRow) minBRow = row;
      if (row > maxBRow) maxBRow = row;
    }

    // u64Dims (derived from byte layout extents)
    const u64Cols  = Number.isFinite(minBCol) ? (maxBCol - minBCol + 1) : (byteBl.grid3x3 ? 3 : byteBl.cols);
    const u64Rows  = Number.isFinite(minBRow) ? (maxBRow - minBRow + 1) : (byteBl.grid3x3 ? 3 : byteBl.rows);
    const u64DimW  = u64Cols * byteDimW + (u64Cols - 1) * byteGapX;
    const u64DimH  = u64Rows * byteDimH + (u64Rows - 1) * byteGapY;

    // vectorDims / steps
    const vecDimW  = vectorGroup * u64DimW + (vectorGroup - 1) * u64GapX;
    const vecStep  = vecDimW + u64GapX;
    const u64Step  = u64DimW + u64GapX;

    // byteSteps
    const byteStepX = byteDimW + byteGapX;
    const byteStepY = byteDimH + byteGapY;

    // numVectorsPerCL and vecPerRow
    const numVecsPerCL = Math.max(1, Math.ceil(u64sPerCL / vectorGroup));
    const vecPerRow    = this._vectorGroupsPerVisualRow();

    // label height and row height
    const labelH     = this._labelHeight();
    const vRowHeight = labelH + u64DimH + u64GapY;

    // Build bit-in-byte lookup tables (always 8 entries)
    const bitColLookup = new Int32Array(8);
    const bitRowLookup = new Int32Array(8);
    for (let b = 0; b < 8; b++) {
      if (bitBl.grid3x3) {
        const cell = GRID3X3_MAP[b];
        bitColLookup[b] = cell % 3;
        bitRowLookup[b] = Math.floor(cell / 3);
      } else {
        bitColLookup[b] = b % bitBl.cols;
        bitRowLookup[b] = Math.floor(b / bitBl.cols);
      }
    }

    // Pack lookup tables as flat Float32Array(16) for gl.uniform2fv().
    const bytePos = new Float32Array(16);
    const bitPos  = new Float32Array(16);
    for (let i = 0; i < 8; i++) {
      bytePos[i * 2]     = byteColLookup[i];
      bytePos[i * 2 + 1] = byteRowLookup[i];
      bitPos[i * 2]      = bitColLookup[i];
      bitPos[i * 2 + 1]  = bitRowLookup[i];
    }

    // ── Viewport culling: compute the visible bit range ─────────────────
    // Only render bits that belong to visual rows currently on screen.
    // This reduces the GL instance count dramatically when zoomed in or
    // when a large grid is only partially scrolled into view.
    // Falls back to the full bit range when canvas height is not yet set
    // (e.g. during parity testing or first-frame setup).
    const totalCacheLines = Math.max(1, Math.ceil(this.bitCount / bitsPerCacheLine));
    const totalVectorSlots = totalCacheLines * numVecsPerCL;
    const totalVRows = Math.ceil(totalVectorSlots / vecPerRow);
    const ch = this.canvasHeight || 0;
    let firstBit = 0;
    let endBit = this.bitCount;
    if (ch > 0 && vRowHeight > 0) {
      const startVRow = Math.max(0, Math.floor(-this.panY / vRowHeight));
      const endVRow   = Math.min(totalVRows, Math.ceil((ch - this.panY) / vRowHeight) + 1);
      // Map vRow range → cacheline range → bit range.
      // firstCL = first cacheline of startVRow; lastCL = first cacheline past endVRow.
      const firstCL = Math.floor(startVRow * vecPerRow / numVecsPerCL);
      const lastCL  = Math.min(Math.ceil(endVRow * vecPerRow / numVecsPerCL), totalCacheLines);
      firstBit = Math.max(0, firstCL * bitsPerCacheLine);
      endBit   = Math.min(lastCL * bitsPerCacheLine, this.bitCount);
    }

    // ── Downsampling: skip every N-th bit when zoomed out far enough ─────
    // When cellSize < 1 px each bit occupies sub-pixel area; bits overlap
    // on screen. Rendering every N-th bit gives the same visual result
    // while cutting GPU vertex-shader work by N×.
    const cellSize = px; // already = pixelSize * zoom
    const bitStride = Math.max(1, Math.min(16, Math.floor(1 / Math.max(0.0625, cellSize))));
    // instanceCount must cover the full [firstBit, endBit) range at the chosen stride.
    const instanceCount = Math.max(0, Math.ceil((endBit - firstBit) / bitStride));

    return {
      bitsPerCL:    bitsPerCacheLine,
      u64sPerCL,
      vectorGroup,
      numVecsPerCL,
      vecPerRow,
      vecStep,
      u64Step,
      byteStepX,
      byteStepY,
      bitStepX,
      bitStepY,
      labelH,
      vRowHeight,
      pxHalf: px / 2,
      bytePos,
      bitPos,
      firstBit,
      instanceCount,
      bitStride,
    };
  }

  getBitInfo(bitIdx) {
    if (bitIdx < 0 || bitIdx >= this.bitCount) return '';
    const number = bitToNumber(bitIdx, this.storageModel, this.wheelDefinition);
    const numberLabel = number == null ? 'unmapped' : number;
    const byteIdx = Math.floor(bitIdx / 8);
    const u64Idx = Math.floor(bitIdx / 64);
    const cacheLineIdx = Math.floor(bitIdx / this.bitsPerCacheLine);
    const vectorIdx = Math.floor(u64Idx / this.vectorGroup);
    const u64InVector = u64Idx % this.vectorGroup;
    const byteInVector = byteIdx % (this.vectorGroup * 8);
    const groupLabel = this._groupLabel(vectorIdx);
    const state = this.bitState[bitIdx] ? 'composite' : 'prime candidate';
    const changed = this.changedBits.has(bitIdx) ? ' [CHANGED]' : '';
    const focused = this.targetBits?.has(bitIdx) ? ' [FOCUS]' : '';
    const hitCount = this.targetHitCounts?.get(bitIdx) || 0;
    return `Bit ${bitIdx} -> Number ${numberLabel} | byte ${byteInVector} in ${groupLabel}, ${byteIdx} from start | uint64 ${u64InVector} in ${groupLabel}, ${u64Idx} from start | Cache line ${cacheLineIdx} | target hits ${hitCount} | ${state}${changed}${focused}`;
  }

  toDataURL() {
    return this._glyphCtx?.canvas?.toDataURL('image/png') ?? '';
  }

  /** Start a standalone GL animation frame for animation methods called outside render(). */
  _beginGLAnim() {
    // Worker mode: begin a new command-buffer frame (appended to GL canvas
    // on the worker side without clearing — bit-grid pixels stay visible).
    if (this._glyphBuf && this._glWorker) {
      const canvasDpr = Math.max(0.1, this.canvasDpr || 1);
      const cw = this.canvasWidth || 0;
      const ch = this.canvasHeight || 0;
      this._glyphBuf.beginFrame(cw, ch, canvasDpr);
      return this._glyphBuf;
    }
    // Direct mode: begin a non-clearing pass on the glyph canvas.
    if (!this._glyphCtx) return null;
    if (this._glyphFramePrimed && typeof this._glyphCtx.beginOverlayPass === 'function') {
      this._glyphCtx.beginOverlayPass();
      return this._glyphCtx;
    }
    const canvasDpr = Math.max(0.1, this.canvasDpr || 1);
    const cw = this.canvasWidth || 0;
    const ch = this.canvasHeight || 0;
    // Animation methods run after render(); keep previously drawn text/labels.
    this._glyphCtx.beginFrame(cw, ch, canvasDpr, false);
    return this._glyphCtx;
  }

  /** Flush a standalone GL animation frame started with _beginGLAnim(). */
  _endGLAnim(glCtx) {
    if (!glCtx) return;
    if (this._glyphBuf && glCtx === this._glyphBuf) {
      // Worker mode: send commands without re-rendering the bit-grid.
      const glyphCmds = this._glyphBuf.endFrame();
      if (glyphCmds.count > 0) this._glWorker.renderGlyph(glyphCmds);
    } else {
      glCtx.endFrame();
    }
    this._glyphFramePrimed = false;
  }

  /**
   * Render a contracting ripple overlay on changed bits.
   * A large circle contracts to each changed bit while fading.
   * @param {number} progress 0..1 animation progress
   */
  renderRipple(progress, focusBits = null, options = {}) {
    const sourceBits = focusBits && focusBits.size ? focusBits : this.animationFocusBits?.size ? this.animationFocusBits : this.changedBits;
    if (!sourceBits || sourceBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const canvasDpr = Math.max(0.1, this.canvasDpr || 1);
    const cw = this.canvasWidth || 0;
    const ch = this.canvasHeight || 0;
    const px = this.pixelSize * this.zoom;
    const intensity = Math.max(0.4, Math.min(1.2, options.intensity || 1));

    const color = this._opColor();
    const ease = 1 - Math.pow(1 - progress, 3);
    const maxRadius = Math.max(8, px * 3.8 * intensity);
    const outerRadius = maxRadius * (1 - ease * 0.72);
    const innerRadius = Math.max(px * 0.55, outerRadius * 0.48);
    const coreRadius = Math.max(px * 0.36, px * (0.55 + 0.24 * (1 - progress)));
    const ringWidth = Math.max(0.8, 1.7 * intensity * (1 - ease * 0.45));
    const ringAlpha = Math.max(0, 0.5 * Math.pow(1 - progress, 0.72));
    const haloAlpha = Math.max(0, 0.1 * intensity * Math.pow(1 - progress, 1.18));
    const coreAlpha = Math.max(0, 0.6 * Math.pow(1 - progress, 0.56));
    const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

    const glCtx = this._beginGLAnim();
    if (!glCtx) return;

    for (const globalBit of sourceBits) {
      const pos = this.bitIndexToCanvas(globalBit);
      if (!pos) continue;
      const bitCx = pos.x;
      const bitCy = pos.y;

      if (bitCx + maxRadius < 0 || bitCx - maxRadius > cw || bitCy + maxRadius < 0 || bitCy - maxRadius > ch) continue;

      if (haloAlpha > 0.01) glCtx.drawDot(bitCx, bitCy, outerRadius, cr, cg, cb, haloAlpha);
      if (ringAlpha > 0.01) {
        glCtx.drawDot(bitCx, bitCy, innerRadius + ringWidth, cr, cg, cb, ringAlpha * 0.55);
        glCtx.drawDot(bitCx, bitCy, innerRadius, cr, cg, cb, ringAlpha);
      }
      if (coreAlpha > 0.01) glCtx.drawDot(bitCx, bitCy, coreRadius, cr, cg, cb, coreAlpha);
      if (options.showBeacon) {
        const beacon = Math.max(px * 0.9, 4.5 * intensity);
        glCtx.drawOutlineRect(bitCx - beacon / 2, bitCy - beacon / 2, beacon, beacon,
          1, 1, 1, Math.max(0.16, ringAlpha * 0.68), Math.max(0.75, px * 0.1));
      }
    }

    this._endGLAnim(glCtx);
  }

  /** Fade animation: changed bits fade from transparent to full color */
  renderFade(progress) {
    if (!this.changedBits || this.changedBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const px = this.pixelSize * this.zoom;
    const color = this._opColor();
    const alpha = 1 - progress;
    const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

    const glCtx = this._beginGLAnim();
    if (!glCtx) return;

    for (const globalBit of this.changedBits) {
      const pos = this.bitIndexToCanvas(globalBit);
      if (!pos) continue;
      glCtx.drawFilledRect(pos.x - px / 2 - 1, pos.y - px / 2 - 1, px + 2, px + 2, cr, cg, cb, alpha);
    }
    this._endGLAnim(glCtx);
  }

  /** Pulse animation: changed bits scale up then back down */
  renderPulse(progress, focusBits = null, options = {}) {
    const sourceBits = focusBits && focusBits.size ? focusBits : this.animationFocusBits?.size ? this.animationFocusBits : this.changedBits;
    if (!sourceBits || sourceBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const px = this.pixelSize * this.zoom;
    const color = this._opColor();
    const intensity = Math.max(0.8, Math.min(1.8, options.intensity || 1));

    const peak = 0.3;
    const scale = progress < peak
      ? 1 + 1.15 * intensity * (progress / peak)
      : 1 + 1.15 * intensity * (1 - (progress - peak) / (1 - peak));
    const alpha = Math.max(0, progress < 0.75 ? 0.92 : 0.92 * (1 - (progress - 0.75) / 0.25));
    const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

    const glCtx = this._beginGLAnim();
    if (!glCtx) return;

    for (const globalBit of sourceBits) {
      const pos = this.bitIndexToCanvas(globalBit);
      if (!pos) continue;
      const s = px * scale;
      glCtx.drawFilledRect(pos.x - s / 2, pos.y - s / 2, s, s, cr, cg, cb, alpha);
      if (options.showHalo) {
        const hs = s * 1.36;
        glCtx.drawOutlineRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs,
          1, 1, 1, Math.max(0.2, alpha * 0.72), Math.max(1.1, px * 0.15));
      }
    }

    this._endGLAnim(glCtx);
  }

  /**
   * Stamp animation for applyMask: a mask rectangle moves over each grouping
   * and lowers where bits are affected.
   */
  renderMaskStamp(progress) {
    if (!this.changedBits || this.changedBits.size === 0) return;
    const t = Math.max(0, Math.min(1, progress));

    const color = this._opColor();
    const px = this.pixelSize * this.zoom;
    const lift = Math.max(7, Math.min(18, px * 3.1));
    const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

    const orderedEntries = this._maskWriteEntries();
    const stampProgress = t * (orderedEntries.length > 0 ? orderedEntries.length : 0);

    const glCtx = this._beginGLAnim();
    if (!glCtx) return;

    if (orderedEntries.length > 0) {
      for (let i = 0; i < orderedEntries.length; i++) {
        const local = stampProgress - i;
        if (local < -0.25 || local > 1.2) continue;

        const phase = Math.max(0, Math.min(1, local));
        let yOffset;
        if (phase < 0.58) {
          yOffset = -lift * (1 - phase / 0.58);
        } else if (phase < 0.73) {
          yOffset = Math.sin(((phase - 0.58) / 0.15) * Math.PI) * 1.5;
        } else {
          yOffset = -4 * ((phase - 0.73) / 0.27);
        }

        const entry = orderedEntries[i];
        const tint = this._maskTintColor(entry.slotIndex);
        const bounds = entry.bounds;
        const groupBounds = this._maskEntryGroupBounds(entry);
        const groupingBits = this._logicalGroupBits();
        const maskSizeBits = Number.isFinite(this.maskWordBits) && this.maskWordBits > 0
          ? this.maskWordBits
          : entry.count;
        const stampBounds = (groupBounds && groupingBits <= maskSizeBits) ? groupBounds : bounds;
        const alpha = local < 0 ? Math.max(0, 0.28 + local * 1.1) : Math.max(0.22, 0.84 - phase * 0.42);
        const inset = Math.max(2, Math.min(6, px * 0.7));
        const stampPad = this.outlineEnabled ? Math.max(inset, this._outlinePadding()) : inset;
        const topExtra = this._labelBands().total;
        const rx = stampBounds.x - stampPad;
        const ry = stampBounds.y - stampPad - topExtra + yOffset;
        const rw = stampBounds.w + stampPad * 2;
        const rh = stampBounds.h + stampPad * 2 + topExtra;
        const ttr = tint[0] / 255, ttg = tint[1] / 255, ttb = tint[2] / 255;

        glCtx.drawFilledRect(rx, ry, rw, rh, ttr, ttg, ttb, alpha * 0.14);
        glCtx.drawOutlineRect(rx, ry, rw, rh, ttr, ttg, ttb, alpha, Math.max(0.8, Math.min(2.2, px * 0.11)));

        const bits = this._maskEntryBits(entry);
        const bg = this.effectiveBackground || this.colors.BACKGROUND;
        const br = bg[0] / 255, bgc = bg[1] / 255, bb = bg[2] / 255;
        for (let bitIndex = 0; bitIndex < bits.length; bitIndex++) {
          const pos = this.bitIndexToCanvas(bits[bitIndex]);
          if (!pos) continue;
          const bx = pos.x - px / 2;
          const by = pos.y - px / 2 + yOffset;
          const cutInset = Math.max(0.45, px * 0.22);
          const cutW = Math.max(0.4, px - cutInset * 2);
          const cutH = Math.max(0.4, px - cutInset * 2);
          glCtx.drawFilledRect(bx, by, px, px, ttr, ttg, ttb, alpha * 0.36);
          glCtx.drawFilledRect(bx + cutInset, by + cutInset, cutW, cutH, br, bgc, bb, Math.max(0.16, alpha * 0.64));
          glCtx.drawOutlineRect(bx, by, px, px, 1, 1, 1, Math.max(0.2, alpha * 0.64), Math.max(0.7, px * 0.09));
        }
      }

      this._endGLAnim(glCtx);
      return;
    }

    const groupBits = this.customGroupingBits > 0 ? this.customGroupingBits : Math.max(1, this.vectorGroup * 64);
    const groupMap = new Map();
    for (const bit of this.changedBits) {
      const gid = Math.floor(bit / groupBits);
      const arr = groupMap.get(gid);
      if (arr) arr.push(bit);
      else groupMap.set(gid, [bit]);
    }
    const groups = Array.from(groupMap.keys()).sort((a, b) => a - b);
    if (groups.length === 0) {
      this._endGLAnim(glCtx);
      return;
    }

    const legacyStampProgress = t * groups.length;

    for (let i = 0; i < groups.length; i++) {
      const local = legacyStampProgress - i;
      if (local < -0.25 || local > 1.2) continue;

      const phase = Math.max(0, Math.min(1, local));
      let yOffset;
      if (phase < 0.58) {
        yOffset = -lift * (1 - phase / 0.58);
      } else if (phase < 0.73) {
        yOffset = Math.sin(((phase - 0.58) / 0.15) * Math.PI) * 1.5;
      } else {
        yOffset = -4 * ((phase - 0.73) / 0.27);
      }

      const gid = groups[i];
      const startBit = gid * groupBits;
      const count = Math.max(1, Math.min(groupBits, this.bitCount - startBit));
      if (count <= 0) continue;
      const bounds = this._multiBitBounds(startBit, count);
      if (!bounds) continue;

      const alpha = local < 0 ? Math.max(0, 0.28 + local * 1.1) : Math.max(0.22, 0.84 - phase * 0.42);
      const inset = Math.max(2, Math.min(6, px * 0.7));
      const rx = bounds.x - inset;
      const ry = bounds.y - inset + yOffset;
      const rw = bounds.w + inset * 2;
      const rh = bounds.h + inset * 2;

      glCtx.drawFilledRect(rx, ry, rw, rh, cr, cg, cb, alpha * 0.14);
      glCtx.drawOutlineRect(rx, ry, rw, rh, cr, cg, cb, alpha, Math.max(0.8, Math.min(2.2, px * 0.11)));

      const hitBits = groupMap.get(gid) || [];
      const markSize = Math.max(1.8, Math.min(6.2, px * 0.56));
      const bg = this.effectiveBackground || this.colors.BACKGROUND;
      const br = bg[0] / 255, bgc = bg[1] / 255, bb = bg[2] / 255;
      for (let j = 0; j < hitBits.length; j++) {
        const pos = this.bitIndexToCanvas(hitBits[j]);
        if (!pos) continue;
        const bx = pos.x - markSize / 2;
        const by = pos.y - markSize / 2 + yOffset;
        glCtx.drawFilledRect(bx, by, markSize, markSize, cr, cg, cb, Math.max(0.26, alpha * 0.78));
        const cutInset = Math.max(0.35, markSize * 0.22);
        glCtx.drawFilledRect(
          bx + cutInset,
          by + cutInset,
          Math.max(0.3, markSize - cutInset * 2),
          Math.max(0.3, markSize - cutInset * 2),
          br,
          bgc,
          bb,
          Math.max(0.18, alpha * 0.65),
        );
        glCtx.drawOutlineRect(bx, by, markSize, markSize, 1, 1, 1, Math.max(0.2, alpha * 0.42), Math.max(0.45, Math.min(1.1, px * 0.07)));
      }
    }

    this._endGLAnim(glCtx);
  }

  renderMaskHover(progress, precomputedSlotGroups = null) {
    const slotGroups = precomputedSlotGroups || this._maskEntriesBySlot();
    if (slotGroups.length === 0) return;

    const px = this.pixelSize * this.zoom;
    const t = Math.max(0, Math.min(1, progress));
    const travelLift = Math.max(16, Math.min(52, px * 5.8));

    const glCtx = this._beginGLAnim();
    if (!glCtx) return;

    for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
      const entries = slotGroups[groupIndex];
      const segmentCount = Math.max(1, entries.length);
      const unit = t * segmentCount;
      const index = Math.min(entries.length - 1, Math.floor(unit));
      const local = Math.max(0, Math.min(1, unit - index));
      const from = entries[index];
      const to = entries[Math.min(entries.length - 1, index + 1)];

      for (let previous = 0; previous < index; previous++) {
        this._drawMaskImprint(entries[previous], entries[previous].bounds.cx, entries[previous].bounds.cy, {
          alpha: 0.52,
        }, glCtx);
      }

      const rise = local < 0.35 ? local / 0.35 : local > 0.68 ? (1 - local) / 0.32 : 1;
      const smooth = local * local * (3 - 2 * local);
      const currentX = from.bounds.cx + (to.bounds.cx - from.bounds.cx) * smooth;
      const currentY = from.bounds.cy + (to.bounds.cy - from.bounds.cy) * smooth - travelLift * rise;
      const stampingAlpha = local < 0.18 ? 1 : local > 0.82 ? 1 : 0.92;

      // Render the full planned path so the route remains visible mid-flight.
      if (from !== to) {
        const tint = this._maskTintColor(from.slotIndex);
        const routeAlpha = Math.max(0.16, stampingAlpha * 0.44);
        this._drawCurvedTrail(from.bounds.cx, from.bounds.cy, to.bounds.cx, to.bounds.cy, tint, routeAlpha, px, travelLift, glCtx);
      }

      this._drawMaskImprint(from, currentX, currentY, {
        alpha: stampingAlpha,
        liftBlend: rise,
        cutoutStrength: 0.9,
      }, glCtx);

      if (local > 0.78 && index < entries.length - 1) {
        this._drawMaskImprint(to, to.bounds.cx, to.bounds.cy, {
          alpha: (local - 0.78) / 0.22,
        }, glCtx);
      }
    }

    this._endGLAnim(glCtx);
  }

  /** Content dimensions at current zoom */
  contentDimensions() {
    const totalVectorSlots = this._totalVectorSlots();
    const vecPerVRow = this._vectorGroupsPerVisualRow();
    const totalVRows = Math.ceil(totalVectorSlots / vecPerVRow);
    const vecD = this._vectorDims();
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const visibleVectors = Math.max(1, Math.min(vecPerVRow, totalVectorSlots));
    const w = visibleVectors * (vecD.w + this._u64GapX()) - this._u64GapX();
    const h = totalVRows * (labelH + rowD.h + this._u64GapY());
    return { width: Math.max(1, w), height: Math.max(1, h) };
  }

  /** Set zoom & pan so all content fits with a border */
  zoomToFit(canvasW, canvasH, options = {}) {
    if (this.bitCount === 0 || canvasW <= 0 || canvasH <= 0) return;

    // Measure base dimensions at zoom=1
    const saved = this.zoom;
    this.zoom = 1;
    const dims = this.contentDimensions();
    this.zoom = saved;

    // Everything scales linearly with zoom
    const margin = 0.96;
    const fitZoom = Math.min(
      (canvasW * margin) / dims.width,
      (canvasH * margin) / dims.height
    );
    this.zoom = Math.max(0.1, Math.min(fitZoom, 32));

    // Center content
    const finalDims = this.contentDimensions();
    this.panX = (canvasW - finalDims.width) / 2;
    this.panY = options.alignTop ? 12 : (canvasH - finalDims.height) / 2;
  }

  /** Viewport info for scrollbars/minimap */
  viewportInfo(canvasW, canvasH) {
    const dims = this.contentDimensions();
    return {
      contentW: dims.width,
      contentH: dims.height,
      viewX: -this.panX,
      viewY: -this.panY,
      viewW: canvasW,
      viewH: canvasH,
    };
  }

  /** True when the current viewport already contains the full content bounds. */
  isContentFullyVisible(viewportW, viewportH) {
    return this.minimapRenderer.isContentFullyVisible(viewportW, viewportH);
  }

  /** Render minimap overlay in bottom-right corner, offset above detailH */
  renderMinimap(canvasW, canvasH, detailH = 0) {
    this.minimapRenderer.render(canvasW, canvasH, detailH);
  }

  /** Test if (x,y) in viewport coords is inside the minimap; returns {panX, panY} to center there */
  minimapHitTest(x, y) {
    return this.minimapRenderer.hitTest(x, y);
  }

  /**
   * Get bounding box of an element (bit, byte, vector, cacheline) for camera targeting.
   * @param {'bit'|'byte'|'vector'|'cacheline'} type
   * @param {number} index - global index of the element
   * @returns {{ x: number, y: number, w: number, h: number, cx: number, cy: number } | null}
   */
  getElementBounds(type, index) {
    if (this.bitCount === 0) return null;
    const px = this.pixelSize * this.zoom;
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const rowD = this._rowDims();
    const labelH = this._labelHeight();
    const vRowHeight = labelH + rowD.h + this._u64GapY();
    const u64D = this._u64Dims();
    const byteD = this._byteDims();
    const vecD = this._vectorDims();
    const vecPerVRow = this._vectorGroupsPerVisualRow();

    if (type === 'bit') {
      const pos = this.bitIndexToCanvas(index);
      if (!pos) return null;
      return { x: pos.x - px / 2, y: pos.y - px / 2, w: px, h: px, cx: pos.x, cy: pos.y };
    }

    if (type === 'byte') {
      return this._multiBitBounds(index * 8, 8);
    }

    if (type === 'uint32') {
      return this._multiBitBounds(index * 32, 32);
    }

    if (type === 'uint64') {
      return this._multiBitBounds(index * 64, 64);
    }

    if (type === 'byte-legacy') {
      const bitStart = index * 8;
      if (bitStart >= this.bitCount) return null;
      const clIdx = Math.floor(bitStart / bitsPerCacheLine);
      const bitInRow = bitStart % bitsPerCacheLine;
      const u64Idx = Math.floor(bitInRow / 64);
      const byteIdx = Math.floor((bitInRow % 64) / 8);
      const vecIdx = Math.floor(u64Idx / this.vectorGroup);
      const intraIdx = u64Idx % this.vectorGroup;
      const globalVectorIndex = clIdx * this._numVectorsPerRow() + vecIdx;
      const vRow = Math.floor(globalVectorIndex / vecPerVRow);
      const vecInRow = globalVectorIndex % vecPerVRow;
      const rowDataY = this.panY + vRow * vRowHeight + labelH;
      const vecX = this.panX + vecInRow * (vecD.w + this._u64GapX());
      const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);
      const bytePos = this._bytePosInU64(byteIdx);
      const bx = u64X + bytePos.col * (byteD.w + this._byteGapX());
      const by = rowDataY + bytePos.row * (byteD.h + this._byteGapY());
      return { x: bx, y: by, w: byteD.w, h: byteD.h, cx: bx + byteD.w / 2, cy: by + byteD.h / 2 };
    }

    if (type === 'vector') {
      const u64Start = index * this.vectorGroup;
      const bitStart = u64Start * 64;
      if (bitStart >= this.bitCount) return null;
      const vRow = Math.floor(index / vecPerVRow);
      const vecInRow = index % vecPerVRow;
      const rowDataY = this.panY + vRow * vRowHeight + labelH;
      const vecX = this.panX + vecInRow * (vecD.w + this._u64GapX());
      return { x: vecX, y: rowDataY, w: vecD.w, h: vecD.h, cx: vecX + vecD.w / 2, cy: rowDataY + vecD.h / 2 };
    }

    if (type === 'cacheline') {
      if (index * bitsPerCacheLine >= this.bitCount) return null;
      const startVectorIndex = index * this._numVectorsPerRow();
      const vRow = Math.floor(startVectorIndex / vecPerVRow);
      const vecInRow = startVectorIndex % vecPerVRow;
      const rowDataY = this.panY + vRow * vRowHeight + labelH;
      const rx = this.panX + vecInRow * (vecD.w + this._u64GapX());
      return { x: rx, y: rowDataY, w: rowD.w, h: rowD.h, cx: rx + rowD.w / 2, cy: rowDataY + rowD.h / 2 };
    }

    return null;
  }

  /** Identify what kind of element a bit belongs to, for click-to-focus */
  identifyElement(bitIdx) {
    if (bitIdx < 0 || bitIdx >= this.bitCount) return null;
    const byteIdx = Math.floor(bitIdx / 8);
    const u64Idx = Math.floor(bitIdx / 64);
    const vectorIdx = Math.floor(u64Idx / this.vectorGroup);
    const clIdx = Math.floor(bitIdx / this.bitsPerCacheLine);
    return { bitIdx, byteIdx, u64Idx, vectorIdx, clIdx };
  }
}

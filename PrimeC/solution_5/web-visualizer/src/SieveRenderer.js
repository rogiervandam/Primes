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
import { RenderStateController } from './renderer/core/RenderState';
import { HeatMapStateController } from './renderer/core/HeatMapState';
import { FrameContextBuilder } from './renderer/core/FrameContextBuilder';
import { RenderEngine } from './renderer/core/RenderEngine';
import { MotionTrailRenderer } from './renderer/effects/MotionTrailRenderer';
import { CachelineOverlayRenderer } from './renderer/effects/CachelineOverlayRenderer';
import { VectorRenderPipeline } from './renderer/pipeline/VectorRenderPipeline';
import { LayoutMetricsEngine } from './renderer/layout/LayoutMetricsEngine';
import {
  bitVisualRow,
  getElementBounds,
  multiBitBounds,
  multiBitBoundsSegments,
} from './renderer/layout/geometry';
import {
  bitIndexToCanvas as _bitIndexToCanvas,
  canvasToBitIndex as _canvasToBitIndex,
} from './renderer/layout/transforms';
import {
  maskEntriesBySlot,
  maskEntryBits,
  maskEntryGroupBounds,
  maskTintColor,
  maskWordOrderSummary,
  maskWriteEntries,
} from './renderer/mask/maskMetadata';

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
    this.showMaskWriteOverlay = true;
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

    // Canvas width for wrapping (set by resize)
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.canvasDpr = 1;

    // Cacheline size in bytes (default 64)
    this.cachelineSize = 64;
    this.customGroupingBits = 0;
    this.horizontalGroups = 0;

    // Heat map: tracks recency of access per bit and per cacheline
    this.isHeatMapEnabled = false;
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

    this.renderState = new RenderStateController(this);
    this.heatMapState = new HeatMapStateController(this);
    this.frameContextBuilder = new FrameContextBuilder(this);
    this.renderEngine = new RenderEngine(this);
    this.motionTrails = new MotionTrailRenderer(this);
    this.cachelineOverlayRenderer = new CachelineOverlayRenderer(this);
    this.vectorRenderPipeline = new VectorRenderPipeline(this);
    this.layoutMetrics = new LayoutMetricsEngine(this);
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
  determineBitPalette() {
    const C = this.colors;
    const preset = this.colorPreset && COLOR_PRESETS[this.colorPreset];
    return {
      set:       this.customSetBit || (preset ? preset.setBit : C.BIT_ONE),
      cleared:   this.customClearedBit || (preset ? preset.clearedBit : C.BIT_ZERO),
      unchanged: this.customUnchangedBit || (preset ? preset.unchangedBit : C.BIT_ZERO),
    };
  }

  _bitColors() {
    return this.determineBitPalette();
  }

  getOperationHighlightColor() {
    const C = this.colors;
    if (Number.isFinite(this.maskWordBits) && this.maskWordBits > 0 && C.OPERATION_COLORS.applyMask) {
      return C.OPERATION_COLORS.applyMask;
    }
    if (this.currentOperation && C.OPERATION_COLORS[this.currentOperation]) {
      return C.OPERATION_COLORS[this.currentOperation];
    }
    return C.BIT_CHANGED;
  }

  _opColor() {
    return this.getOperationHighlightColor();
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
    this.renderState.initialize(bitCount, sieveSize);
  }

  get bitsPerCacheLine() {
    const groupBits = this._logicalGroupBits();
    if (groupBits > 0) return groupBits;
    return this.cachelineSize * 8;
  }

  setState(bitState, changedBits, targetBits = null, targetHitCounts = null, focusRange = null, maskMetadata = null, highlightMetadata = null) {
    this.renderState.applyState(
      bitState,
      changedBits,
      targetBits,
      targetHitCounts,
      focusRange,
      maskMetadata,
      highlightMetadata,
    );
  }

  setMaskGhostBits(bits) {
    this.renderState.setMaskGhostBits(bits);
  }

  clearBitMotionTrails() {
    this.motionTrails.clear();
  }

  addBitMotionTrail(fromBit, toBit, options = {}) {
    this.motionTrails.add(fromBit, toBit, options);
  }

  renderBitMotionTrails(now = performance.now()) {
    this.motionTrails.render(now);
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
    return this.renderState.isBitInFocusRange(globalBit);
  }

  _multiBitBounds(startBit, count) {
    return multiBitBounds(this, startBit, count);
  }

  _bitVisualRow(bitIdx) {
    return bitVisualRow(this, bitIdx);
  }

  _multiBitBoundsSegments(startBit, count) {
    return multiBitBoundsSegments(this, startBit, count);
  }

  _maskTintColor(slotIndex = 0) {
    return maskTintColor(this, slotIndex);
  }

  _maskWriteEntries() {
    return maskWriteEntries(this);
  }

  _maskWordOrderSummary() {
    return maskWordOrderSummary(this);
  }

  _maskEntriesBySlot() {
    return maskEntriesBySlot(this);
  }

  _maskEntryBits(entry) {
    return maskEntryBits(this, entry);
  }

  _maskEntryGroupBounds(entry) {
    return maskEntryGroupBounds(this, entry);
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
    this.cachelineOverlayRenderer.renderHeatOverlay();
  }

  /**
   * Draw the dashed cacheline-boundary outline (same visual style as byte/vector
   * outlines) at PHYSICAL cacheline granularity (cachelineSize bytes).
   *
   * Uses the same segment-grouping logic as _renderCachelineHeatOverlay so that
   * each physical CL gets one outlined rectangle per visual row it occupies.
   */
  _renderCachelineOutline() {
    this.cachelineOverlayRenderer.renderOutline();
  }
  /** Ensure per-physical-cacheline arrays are allocated for the current cachelineSize */
  _ensureCLArrays() {
    this.heatMapState.ensureCachelineArrays();
  }

  /** Update heat map tracking: mark changed bits and cachelines with current step */
  updateHeatMap(changedBits, stepIndex) {
    this.heatMapState.update(changedBits, stepIndex);
  }

  /** Rebuild heat map from scratch up to targetStep */
  rebuildHeatMap(steps, targetStep) {
    this.heatMapState.rebuild(steps, targetStep);
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
    return this.layoutMetrics.bitPosInByte(bitInByte);
  }

  _bytePosInU64(byteInU64) {
    return this.layoutMetrics.bytePosInU64(byteInU64);
  }

  _bitStepX() {
    return this.layoutMetrics.bitStepX();
  }

  _bitStepY() {
    return this.layoutMetrics.bitStepY();
  }

  _byteGapX() {
    return this.layoutMetrics.byteGapX();
  }

  _byteGapY() {
    return this.layoutMetrics.byteGapY();
  }

  _u64GapX() {
    return this.layoutMetrics.u64GapX();
  }

  _u64GapY() {
    return this.layoutMetrics.u64GapY();
  }

  _byteDims() {
    return this.layoutMetrics.byteDims();
  }

  _u64Dims() {
    return this.layoutMetrics.u64Dims();
  }

  // Dimensions of one vector group (vectorGroup uint64s side by side)
  _vectorDims() {
    return this.layoutMetrics.vectorDims();
  }

  _numVectorsPerRow() {
    return this.layoutMetrics.numVectorsPerRow();
  }

  _totalVectorSlots() {
    return this.layoutMetrics.totalVectorSlots();
  }

  _vectorGroupsPerVisualRow() {
    return this.layoutMetrics.vectorGroupsPerVisualRow();
  }

  _vectorSlotLayout(globalVectorIndex) {
    return this.layoutMetrics.vectorSlotLayout(globalVectorIndex);
  }

  // How many cache lines to wrap per visual row based on canvas width
  // When frozen, zoom changes don't alter the wrapping layout
  _cacheLinesPerVisualRow() {
    return this.layoutMetrics.cacheLinesPerVisualRow();
  }

  _computeClPerVRow() {
    return this.layoutMetrics.computeCacheLinesPerVisualRow();
  }

  /** Freeze the current wrapping layout so zoom doesn't change it */
  freezeLayout() {
    this.layoutMetrics.freezeLayout();
  }

  /** Unfreeze layout (e.g. when window is resized or layout settings change) */
  unfreezeLayout() {
    this.layoutMetrics.unfreezeLayout();
  }

  // Row = one cache line = numVectors vector groups
  _rowDims() {
    return this.layoutMetrics.rowDims();
  }

  // Height of stacked label bands above each row.
  // Vector labels are above byte labels; byte labels stay closer to bits.
  _labelBands() {
    return this.layoutMetrics.labelBands();
  }

  _labelHeight() {
    return this.layoutMetrics.labelHeight();
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
    this.renderEngine.renderFrame();
  }

  /**
   * Precompute every per-frame constant once. The returned object is the
   * shared "frame context" passed down through the row/vector/byte/bit chain
   * so each method can read everything via `f.foo` without recomputing.
   */
  _buildFrameContext() {
    return this.frameContextBuilder.build();
  }

  /** Render one visual row (a horizontal strip of vectors). */
  _renderVisualRow(f, vRow) {
    this.vectorRenderPipeline.renderVisualRow(f, vRow);
  }


  canvasToBitIndex(canvasX, canvasY) {
    return _canvasToBitIndex(this, canvasX, canvasY);
  }

  bitIndexToCanvas(bitIdx) {
    return _bitIndexToCanvas(this, bitIdx);
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
    return getElementBounds(this, type, index);
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

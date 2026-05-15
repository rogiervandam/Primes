/**
 * Canvas-based renderer for sieve bitstorage visualization.
 *
 * Supports configurable layouts, adjustable spacing, light/dark themes,
 * operation-colored highlighting, vector grouping, and vector labels.
 *
 * Constants (THEMES / COLOR_PRESETS / layouts / cache presets / storage
 * models) live in `./constants` and are re-exported below to keep
 * existing import sites working.
 */
import { SearchOverlay } from './overlays/SearchOverlay';
import { MaskWriteOverlay } from './overlays/MaskWriteOverlay';
import { VectorTouchOrderOverlay } from './overlays/VectorTouchOrderOverlay';
import { CachelineAnnotationsOverlay } from './overlays/CachelineAnnotationsOverlay';
import { MinimapRenderer } from './MinimapRenderer';

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
} from './constants';
import { bitToNumber, numberToBit, describeWheelBit, wheelSignature } from './bitMath';
import {
  hexToRgb,
  mixRgb,
  labelTextColor,
  fitLabelFontSize,
  truncateTextToWidth,
  glMeasureAdapter,
} from './drawingHelpers';
import { requestPrimeOverlay } from './workers/bitPrePassClient';
import { GlyphCommandBuffer } from './gl/GlyphCommandBuffer';
import { RenderStateController } from './core/RenderState';
import { HeatMapStateController } from './core/HeatMapState';
import { FrameContextBuilder } from './core/FrameContextBuilder';
import { RenderEngine } from './core/RenderEngine';
import { MotionTrailRenderer } from './effects/MotionTrailRenderer';
import { CachelineOverlayRenderer } from './effects/CachelineOverlayRenderer';
import { VectorRenderPipeline } from './pipeline/VectorRenderPipeline';
import { LayoutMetricsEngine } from './layout/LayoutMetricsEngine';
import {
  bitVisualRow,
  getElementBounds,
  multiBitBounds,
  multiBitBoundsSegments,
} from './layout/geometry';
import {
  bitIndexToCanvas as _bitIndexToCanvas,
  canvasToBitIndex as _canvasToBitIndex,
} from './layout/transforms';
import {
  maskEntriesBySlot,
  maskEntryBits,
  maskEntryGroupBounds,
  maskTintColor,
  maskWordOrderSummary,
  maskWriteEntries,
} from './mask/maskMetadata';
import {
  drawMaskImprint,
  drawCurvedTrail,
  renderRipple as _renderRipple,
  renderFade as _renderFade,
  renderPulse as _renderPulse,
  renderMaskStamp as _renderMaskStamp,
  renderMaskHover as _renderMaskHover,
} from './effects/RendererAnimations';
import { computeGlLayoutParams } from './layout/glLayoutComputer';

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
    this.maskSlotBitsPerEvent = null;
    this.maskGhostBits = null;
    // item 270: flag set when the mask pattern changes between steps; used by
    // overlays to draw a brief "new mask" flash. maskIsNewTime is performance.now()
    // at the moment the flag was set (for fade-out timing).
    this.maskIsNew = false;
    this.maskIsNewTime = 0;
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
    this.multiplesOverlayMode = 'number';  // item 425: 'number' or 'bit'
    this.bitsGridView = {};  // item 426: {changed, targeted, alreadySet, newlySet} boolean flags
    this.showAnimVisuals = true;  // item 445: false hides masks, lines, highlighted bits
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
    // item 438: container's window-relative offset, used by MinimapRenderer to
    // position the position:fixed minimap canvas inside the canvas area.
    this.viewportLeft = 0;
    this.viewportTop = 0;
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
    this.canvasSnapDpr = 1;  // forcedDpr without SSAA multiplier (used for u_dpr uniform)

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
    /** @type {import('./gl/GlyphTextGLCore').GlyphTextGLCore|null} */
    this._glyphCtx = null;
    /** @type {GlyphCommandBuffer|null} Used in worker-mode instead of _glyphCtx. */
    this._glyphBuf = null;
    /** @type {import('./gl/BitGridGLWorker').BitGridGLWorker|null} */
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

  _bitColors() { return this.determineBitPalette(); }

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

  _opColor() { return this.getOperationHighlightColor(); }

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
    return `${this._groupLabelBase()} ${index}`;
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
      if (kind === 'cacheline') return bands.total;
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
  * @param {import('./gl/GlyphTextGLCore').GlyphTextGLCore} glyphRenderer
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
  * @param {import('./gl/BitGridGLWorker').BitGridGLWorker} worker
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

  setMaskGhostBits(bits)              { this.renderState.setMaskGhostBits(bits); }
  clearBitMotionTrails()               { this.motionTrails.clear(); }
  addBitMotionTrail(fromBit, toBit, options = {}) { this.motionTrails.add(fromBit, toBit, options); }
  renderBitMotionTrails(now = performance.now()) { this.motionTrails.render(now); }
  setSearchHighlight(type, index, bitIndex = null) { this.searchOverlay.set(type, index, bitIndex); }
  clearSearchHighlight()               { this.searchOverlay.clear(); }

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

  _isInFocusRange(globalBit) { return this.renderState.isBitInFocusRange(globalBit); }

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

  _maskEntriesBySlot()                 { return maskEntriesBySlot(this); }
  _maskEntryBits(entry)                { return maskEntryBits(this, entry); }
  _maskEntryGroupBounds(entry)         { return maskEntryGroupBounds(this, entry); }

  /** item 408: delegates to RendererAnimations.drawMaskImprint */
  _drawMaskImprint(entry, x, y, options = {}, glCtx) { drawMaskImprint(this, entry, x, y, options, glCtx); }

  /** item 408: delegates to RendererAnimations.drawCurvedTrail */
  _drawCurvedTrail(fromX, fromY, toX, toY, color, alpha, px, travelLift, glCtx) { drawCurvedTrail(this, fromX, fromY, toX, toY, color, alpha, px, travelLift, glCtx); }

  _renderCachelineHeatOverlay() { this.cachelineOverlayRenderer.renderHeatOverlay(); }
  _renderCachelineOutline()     { this.cachelineOverlayRenderer.renderOutline(); }

  /** Ensure per-physical-cacheline arrays are allocated for the current cachelineSize */
  _ensureCLArrays() { this.heatMapState.ensureCachelineArrays(); }

  /** Update heat map tracking: mark changed bits and cachelines with current step */
  updateHeatMap(changedBits, stepIndex)    { this.heatMapState.update(changedBits, stepIndex); }

  /** Rebuild heat map from scratch up to targetStep */
  rebuildHeatMap(steps, targetStep)        { this.heatMapState.rebuild(steps, targetStep); }

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

  resize(width, height, dprOverride = null, snapDprOverride = null) {
    const dpr = Math.max(0.1, dprOverride != null ? dprOverride : (window.devicePixelRatio || 1));
    const snapDpr = Math.max(0.1, snapDprOverride != null ? snapDprOverride : dpr);
    if (this._glyphCtx) {
      this._glyphCtx.resize(width, height, dpr, snapDpr);
    }
    // Worker-mode glyph resize is handled by the worker's resize message.
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvasDpr = dpr;
    this.canvasSnapDpr = snapDpr;
    // Recompute frozen layout on resize
    if (this._frozenClPerVRow > 0) {
      this._frozenClPerVRow = this._computeClPerVRow();
    }
  }

  _bitPosInByte(bitInByte)             { return this.layoutMetrics.bitPosInByte(bitInByte); }
  _bytePosInU64(byteInU64)             { return this.layoutMetrics.bytePosInU64(byteInU64); }
  _bitStepX()                          { return this.layoutMetrics.bitStepX(); }
  _bitStepY()                          { return this.layoutMetrics.bitStepY(); }
  _byteGapX()                          { return this.layoutMetrics.byteGapX(); }
  _byteGapY()                          { return this.layoutMetrics.byteGapY(); }
  _u64GapX()                           { return this.layoutMetrics.u64GapX(); }
  _u64GapY()                           { return this.layoutMetrics.u64GapY(); }
  _byteDims()                          { return this.layoutMetrics.byteDims(); }
  _u64Dims()                           { return this.layoutMetrics.u64Dims(); }
  _vectorDims()                        { return this.layoutMetrics.vectorDims(); }
  _numVectorsPerRow()                  { return this.layoutMetrics.numVectorsPerRow(); }
  _totalVectorSlots()                  { return this.layoutMetrics.totalVectorSlots(); }
  _vectorGroupsPerVisualRow()          { return this.layoutMetrics.vectorGroupsPerVisualRow(); }
  _vectorSlotLayout(globalVectorIndex) { return this.layoutMetrics.vectorSlotLayout(globalVectorIndex); }
  _cacheLinesPerVisualRow()            { return this.layoutMetrics.cacheLinesPerVisualRow(); }
  _computeClPerVRow()                  { return this.layoutMetrics.computeCacheLinesPerVisualRow(); }
  freezeLayout()                       { this.layoutMetrics.freezeLayout(); }
  unfreezeLayout()                     { this.layoutMetrics.unfreezeLayout(); }
  _rowDims()                           { return this.layoutMetrics.rowDims(); }
  _labelBands()                        { return this.layoutMetrics.labelBands(); }
  _labelHeight()                       { return this.layoutMetrics.labelHeight(); }

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

  /** item 408: GL layout params computation extracted to renderer/layout/glLayoutComputer.js */
  glLayoutParams() { return computeGlLayoutParams(this); }

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
      const snapDpr = Math.max(0.1, this.canvasSnapDpr || canvasDpr);
      const cw = this.canvasWidth || 0;
      const ch = this.canvasHeight || 0;
      this._glyphBuf.beginFrame(cw, ch, canvasDpr, true, snapDpr);
      return this._glyphBuf;
    }
    // Direct mode: begin a non-clearing pass on the glyph canvas.
    if (!this._glyphCtx) return null;
    if (this._glyphFramePrimed && typeof this._glyphCtx.beginOverlayPass === 'function') {
      this._glyphCtx.beginOverlayPass();
      return this._glyphCtx;
    }
    const canvasDpr = Math.max(0.1, this.canvasDpr || 1);
    const snapDpr = Math.max(0.1, this.canvasSnapDpr || canvasDpr);
    const cw = this.canvasWidth || 0;
    const ch = this.canvasHeight || 0;
    // Animation methods run after render(); keep previously drawn text/labels.
    this._glyphCtx.beginFrame(cw, ch, canvasDpr, false, snapDpr);
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

  /** item 408: delegates to RendererAnimations.renderRipple */
  renderRipple(progress, focusBits = null, options = {})         { return _renderRipple(this, progress, focusBits, options); }

  /** item 408: delegates to RendererAnimations.renderFade */
  renderFade(progress)                                            { return _renderFade(this, progress); }

  /** item 408: delegates to RendererAnimations.renderPulse */
  renderPulse(progress, focusBits = null, options = {})          { return _renderPulse(this, progress, focusBits, options); }

  /** item 408: delegates to RendererAnimations.renderMaskStamp */
  renderMaskStamp(progress)                                       { return _renderMaskStamp(this, progress); }

  /** item 408: delegates to RendererAnimations.renderMaskHover */
  renderMaskHover(progress, precomputedSlotGroups = null)         { return _renderMaskHover(this, progress, precomputedSlotGroups); }

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

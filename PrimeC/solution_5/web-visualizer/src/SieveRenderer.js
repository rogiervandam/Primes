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
import { bitToNumber, numberToBit } from './renderer/bitMath';
import {
  hexToRgb,
  mixRgb,
  labelTextColor,
  fitLabelFontSize,
  truncateTextToWidth,
  drawFittedLabel,
} from './renderer/drawingHelpers';
import { requestPrimeOverlay } from './renderer/workers/bitPrePassClient';

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
};

export class SieveRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.settledCanvas = null;
    this.settledCtx = null;
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this.bitCount = 0;
    this.sieveSize = 0;
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
    this.loweredSetBits = false;
    this.loweredSetBits3D = false;
    this.transparentBackground = false;
    // See `_buildFrameContext`. When true, the per-bit cell-fill
    // rectangles and the background fill are skipped (the GL renderer
    // paints them into a sibling canvas mounted underneath).
    this.skipBitFill = false;
    this.loweredDepthStrength = 1;
    this.loweredDepthAngle = 38;
    this.changedBitRiseAt = new Map();

    // Optional grouping outlines
    this.outlineEnabled = false;
    this.outlineTarget = 'byte'; // 'byte' | 'vector' | 'cacheline'
    this.outlineStyle = 'thin'; // 'thin' | 'thick' | 'dashed' | 'dotted'
    this.outlineColor = '#5ccf8d';
    this.outlineRounded = false;
    this.minimapEnabled = true;

    // Storage model for bit-to-number mapping
    this.storageModel = 'half';

    // Canvas width for wrapping (set by resize)
    this.canvasWidth = 0;
    this.canvasHeight = 0;

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
  }

  get colors() { return THEMES[this.theme] || THEMES.dark; }

  // Get effective bit colors (preset > custom > theme default)
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
  _fitLabelFontSize(ctx, text, maxWidth, preferredSize, minSize = 4, style = '')   { return fitLabelFontSize(ctx, text, maxWidth, preferredSize, minSize, style); }
  _truncateTextToWidth(ctx, text, maxWidth, style = '')                            { return truncateTextToWidth(ctx, text, maxWidth, style); }
  _drawFittedLabel(ctx, text, x, y, maxWidth, preferredSize, color, options = {})  { return drawFittedLabel(ctx, text, x, y, maxWidth, preferredSize, color, options); }

  _drawOutlineRect(ctx, x, y, w, h) {
    const cfg = this._outlineConfig();
    const lineWidth = cfg.lineWidth;
    const dash = cfg.dash;
    const radius = cfg.radius;
    const strokeRgb = this._hexToRgb(this.outlineColor || '#5ccf8d');
    const inflate = 0;

    x -= inflate;
    y -= inflate;
    w += inflate * 2;
    h += inflate * 2;

    ctx.save();
    ctx.strokeStyle = `rgb(${strokeRgb[0]},${strokeRgb[1]},${strokeRgb[2]})`;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    if (radius > 0) {
      const rr = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    }
    ctx.restore();
  }

  attach(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
  }

  attachSettledCanvas(canvas) {
    this.settledCanvas = canvas;
    this.settledCtx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  }

  attachMinimapCanvas(canvas) {
    this.minimapCanvas = canvas;
    this.minimapCtx = canvas ? canvas.getContext('2d') : null;
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
    this.loweredSetBits = false;
    this.loweredSetBits3D = false;
    this.transparentBackground = false;
    // When true, the per-bit cell-fill rectangles AND the background
    // fill are skipped. Used by Visualizer.jsx when the WebGL renderer
    // is the active bit-grid backend (it paints the fills + background
    // into a sibling canvas mounted UNDER this one). Overlays, labels,
    // outlines and ghost-mask highlights still draw on top. Forced to
    // `false` while `loweredSetBits` is on — GL has no parity for the
    // depth-shaded path, so Canvas2D takes over the bit fill.
    // See docs/AI_MAINTENANCE.md §8 item 2.
    this.skipBitFill = false;
    this.changedBitRiseAt = new Map();
    this._frozenClPerVRow = 0;
  }

  get bitsPerCacheLine() {
    const groupBits = this._logicalGroupBits();
    if (groupBits > 0) return groupBits;
    return this.cachelineSize * 8;
  }

  setState(bitState, changedBits, targetBits = null, targetHitCounts = null, focusRange = null, maskMetadata = null, highlightMetadata = null) {
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
    this.changedBitRiseAt = new Map();
    const now = performance.now();
    if (changedBits && changedBits.size > 0) {
      for (const bit of changedBits) this.changedBitRiseAt.set(bit, now);
    }
  }

  setMaskGhostBits(bits) {
    this.maskGhostBits = bits instanceof Set ? bits : new Set(bits || []);
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
    if (!this.ctx || !Array.isArray(this.bitMotionTrails) || this.bitMotionTrails.length === 0) return;

    const ctx = this.ctx;
    const px = this.pixelSize * this.zoom;
    const color = this._opColor();
    const alive = [];

    ctx.save();
    ctx.setLineDash([]);
    ctx.lineCap = 'round';

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

      ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
      ctx.lineWidth = Math.max(1.2, px * 0.12 * (1 + trail.intensity * 0.35));
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
      ctx.stroke();

      ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
      ctx.beginPath();
      ctx.arc(to.x, to.y, Math.max(1.2, px * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    this.bitMotionTrails = alive;
  }

  setSearchHighlight(type, index, bitIndex = null) {
    this.searchOverlay.set(type, index, bitIndex);
  }

  clearSearchHighlight() {
    this.searchOverlay.clear();
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

  _drawMaskImprint(ctx, entry, x, y, options = {}) {
    if (!entry) return;
    const px = this.pixelSize * this.zoom;
    const tint = this._maskTintColor(entry.slotIndex);
    const alpha = Math.max(0, Math.min(1, options.alpha ?? 1));
    const liftBlend = Math.max(0, Math.min(1, options.liftBlend ?? 0));
    const showConnector = options.showConnector === true;
    const bounds = entry.bounds;
    const groupBounds = this._maskEntryGroupBounds(entry);
    const dx = x - bounds.cx;
    const dy = y - bounds.cy;
    const wordInset = this.maskWordBits && this.maskWordBits <= 32
      ? Math.max(0.8, Math.min(2.1, px * 0.18))
      : Math.max(1.2, Math.min(3.6, px * 0.34));

    if (groupBounds) {
      ctx.save();
      ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${0.92 * alpha})`;
      ctx.lineWidth = Math.max(1.2, px * 0.14);
      ctx.setLineDash([Math.max(4, px * 0.7), Math.max(2, px * 0.36)]);
      ctx.beginPath();
      ctx.roundRect(
        groupBounds.x + dx - wordInset * 1.2,
        groupBounds.y + dy - wordInset * 1.2,
        groupBounds.w + wordInset * 2.4,
        groupBounds.h + wordInset * 2.4,
        Math.max(5, 5 + px * 0.18),
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${0.16 * alpha})`;
    ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha})`;
    ctx.lineWidth = Math.max(1.2, px * 0.13);
    ctx.beginPath();
    ctx.roundRect(
      bounds.x + dx - wordInset,
      bounds.y + dy - wordInset,
      bounds.w + wordInset * 2,
      bounds.h + wordInset * 2,
      Math.max(4, 4 + px * 0.14),
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const bits = this._maskEntryBits(entry);
    ctx.save();
    for (let index = 0; index < bits.length; index++) {
      const pos = this.bitIndexToCanvas(bits[index]);
      if (!pos) continue;
      const bx = pos.x - px / 2 + dx;
      const by = pos.y - px / 2 + dy;
      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${0.48 * alpha})`;
      ctx.strokeStyle = `rgba(255,255,255,${0.92 * alpha})`;
      ctx.lineWidth = Math.max(0.95, px * 0.11);
      ctx.fillRect(bx, by, px, px);
      ctx.strokeRect(bx, by, px, px);
    }

    if (showConnector) {
      const connectorAlpha = Math.max(0.3, 0.72 * alpha);
      ctx.strokeStyle = `rgba(255,255,255,${connectorAlpha})`;
      ctx.lineWidth = Math.max(1.2, px * 0.1);
      ctx.setLineDash([Math.max(4, px * 0.64), Math.max(2, px * 0.28)]);
      ctx.beginPath();
      ctx.moveTo(x, y + bounds.h * 0.12);
      ctx.lineTo(bounds.cx, bounds.cy);
      ctx.stroke();
    }
    ctx.restore();

    if (liftBlend > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.08 * alpha * liftBlend})`;
      ctx.beginPath();
      ctx.roundRect(
        bounds.x + dx - wordInset * 1.2,
        bounds.y + dy - wordInset * 1.2,
        bounds.w + wordInset * 2.4,
        bounds.h + wordInset * 2.4,
        Math.max(4, 4 + px * 0.14),
      );
      ctx.fill();
      ctx.restore();
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
  _renderCachelineHeatOverlay(ctx) {
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

    const ch = this.canvas.height / (window.devicePixelRatio || 1);
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

      ctx.save();
      ctx.setLineDash([]);

      for (const seg of segments) {
        const rx = Math.round(this.panX + seg.vecStart * vecStep - pad);
        const ry = Math.round(this.panY + seg.vRow * vRowHeight + labelH - pad);
        const rw = Math.max(1, Math.round((seg.vecEnd - seg.vecStart + 1) * vecStep - this._u64GapX() + pad * 2));
        const rh = Math.max(1, Math.round(rowD.h + pad * 2));

        if (oc.alpha > 0.01) {
          ctx.fillStyle = `rgba(${oc.r},${oc.g},${oc.b},${oc.alpha})`;
          ctx.fillRect(rx, ry, rw, rh);
        }

        ctx.strokeStyle = `rgba(${oc.r},${oc.g},${oc.b},${bAlpha})`;
        ctx.lineWidth = lw;
        ctx.strokeRect(rx + 0.5, ry + 0.5, Math.max(1, rw - 1), Math.max(1, rh - 1));
      }

      ctx.restore();
    }
  }

  /**
   * Draw the dashed cacheline-boundary outline (same visual style as byte/vector
   * outlines) at PHYSICAL cacheline granularity (cachelineSize bytes).
   *
   * Uses the same segment-grouping logic as _renderCachelineHeatOverlay so that
   * each physical CL gets one outlined rectangle per visual row it occupies.
   */
  _renderCachelineOutline(ctx) {
    if (!this.outlineEnabled || this.outlineTarget !== 'cacheline') return;

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
    const ch = this.canvas.height / (window.devicePixelRatio || 1);
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
        const h = rowD.h + pad * 2 + topExtra;
        this._drawOutlineRect(ctx, x, y, w, h);
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
      : bitToNumber(Math.max(0, this.bitCount - 1), this.storageModel));
    const key = `${limit}:${this.bitCount}:${this.storageModel}`;
    if (this._primeOverlayKey === key && this._primeBitFlags) return;
    this._primeOverlayKey = key;

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
      const num = bitToNumber(i, this.storageModel);
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
    if (!bitCount) return;
    const limit = Math.max(2, sieveSize > 0
      ? sieveSize
      : bitToNumber(Math.max(0, bitCount - 1), storageModel));
    const key = `${limit}:${bitCount}:${storageModel}`;
    if (this._primeOverlayKey === key && this._primeBitFlags) return;
    const promise = requestPrimeOverlay({ sieveSize, bitCount, storageModel });
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

  resize(width, height) {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.settledCanvas && this.settledCtx) {
      this.settledCanvas.width = width * dpr;
      this.settledCanvas.height = height * dpr;
      this.settledCanvas.style.width = width + 'px';
      this.settledCanvas.style.height = height + 'px';
      this.settledCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.canvasWidth = width;
    this.canvasHeight = height;
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
    if (!this.canvasWidth || this.canvasWidth <= 0) return 1;
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
    const avail = this.canvasWidth;
    const availH = Math.max(1, this.canvasHeight || this.canvas.width / (window.devicePixelRatio || 1));
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
    if (!this.ctx || !this.bitState || this.bitCount === 0) return;
    const f = this._buildFrameContext();
    this._renderClear(f);

    // Draw cacheline-level overlays before bits so bits render on top
    this._renderCachelineHeatOverlay(f.ctx);
    this._renderCachelineOutline(f.ctx);

    for (let vRow = f.startVRow; vRow < f.endVRow; vRow++) {
      this._renderVisualRow(f, vRow);
    }

    if (!this.suppressMaskWriteOverlay) {
      this.maskWriteOverlay.render(f.ctx);
    }
    this.vectorTouchOrderOverlay.render(f.ctx);
    this.cachelineAnnotationsOverlay.render(f.ctx);
    this.searchOverlay.render(f.ctx, f.cw, f.ch);
  }

  /**
   * Precompute every per-frame constant once. The returned object is the
   * shared "frame context" passed down through the row/vector/byte/bit chain
   * so each method can read everything via `f.foo` without recomputing.
   */
  _buildFrameContext() {
    const C = this.colors;
    const ctx = this.ctx;
    const settledCtx = this.settledCtx;
    const cw = this.canvas.width / (window.devicePixelRatio || 1);
    const ch = this.canvas.height / (window.devicePixelRatio || 1);
    const layeredLoweredBits = this.loweredSetBits && !!settledCtx;

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
    // GL takeover: when the WebGL renderer is active and depth mode is
    // off, GL is painting the cell fills and the background into the
    // sibling canvas underneath; skip those here so they don't double-
    // paint and so GL output isn't covered. Lowered-3D forces this
    // back to false because GL has no parity for that path.
    const skipBitFill = !!this.skipBitFill && !this.loweredSetBits;

    return {
      C, ctx, settledCtx, cw, ch, layeredLoweredBits, px,
      bitsPerCacheLine, totalCacheLines, rowD, labelBands, labelH,
      numVec, totalVectorSlots, vecPerVRow, vRowHeight, totalVRows,
      startVRow, endVRow,
      u64D, vecD, byteD, bitBl, changedColor, bitColors,
      showBitLabels, showNumberLabels, showByteLabels, showVectorLabels,
      u64sPerCL, u64GapX, byteGapX, byteGapY, bitStepX, bitStepY, baseAlpha,
      skipBitFill,
      vectorLabelY: vRow => this.panY + vRow * vRowHeight + 1,
      byteLabelY: (vRowBaseY, byteTopY) => Math.max(vRowBaseY + labelBands.vector + 1, byteTopY - labelBands.byteFont - 1),
    };
  }

  /** Clear the canvas (and the layered settled canvas, if active) and paint the background. */
  _renderClear(f) {
    const { ctx, settledCtx, cw, ch, layeredLoweredBits, C, skipBitFill } = f;
    if (layeredLoweredBits) {
      settledCtx.clearRect(0, 0, cw, ch);
      if (!this.transparentBackground) {
        settledCtx.fillStyle = `rgb(${C.BACKGROUND.join(',')})`;
        settledCtx.fillRect(0, 0, cw, ch);
      }
      ctx.clearRect(0, 0, cw, ch);
    } else {
      ctx.clearRect(0, 0, cw, ch);
      // GL takeover paints the background into the sibling canvas; skip
      // the bg fill here so GL shows through. (Always honour the
      // user-facing `transparentBackground` toggle too.)
      if (!this.transparentBackground && !skipBitFill) {
        ctx.fillStyle = `rgb(${C.BACKGROUND.join(',')})`;
        ctx.fillRect(0, 0, cw, ch);
      }
      if (settledCtx) settledCtx.clearRect(0, 0, cw, ch);
    }
  }

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
        this._drawFittedLabel(f.ctx, label, labelX, labelY, Math.max(8, f.vecD.w - 2), f.labelBands.vectorFont, f.C.LABEL_COLOR, {
          minSize: 3.5,
          paddingX: 1,
          clipHeight: f.labelBands.vector,
        });
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

    if (this.outlineEnabled && this.outlineTarget === 'vector' && intraIdx === 0) {
      const pad = this._outlinePadding();
      const topExtra = this._outlineTopExtra('vector');
      this._drawOutlineRect(f.ctx, vecX - pad, vRowDataY - pad - topExtra, f.vecD.w + 2 * pad, f.vecD.h + 2 * pad + topExtra);
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

    if (this.outlineEnabled && this.outlineTarget === 'byte') {
      const pad = this._outlinePadding();
      const topExtra = this._outlineTopExtra('byte');
      this._drawOutlineRect(f.ctx, byteX - pad, byteY - pad - topExtra, f.byteD.w + 2 * pad, f.byteD.h + 2 * pad + topExtra);
    }

    if (f.showByteLabels) {
      const byteLabel = `Byte ${this._byteLabelValue(byteBitStart)}`;
      this._drawFittedLabel(
        f.ctx,
        byteLabel,
        Math.round(byteX),
        Math.round(f.byteLabelY(vRowBaseY, byteY)),
        Math.max(8, f.byteD.w - 2),
        f.labelBands.byteFont,
        f.C.LABEL_COLOR,
        { minSize: 3.5, paddingX: 1, clipHeight: Math.max(7, f.labelBands.byteFont + 4) }
      );
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
    if (cls.isGhostMaskedBit) this._drawGhostMaskHighlight(f, draw);
    if (cls.inFocusRange) this._drawBitFocusRange(f, bitX, bitY);
    this._drawBitTargetOutline(f, globalBit, draw, cls.targetHitCount);
    this._drawBitPrimeOverlay(f, globalBit, bitX, bitY);
    this._drawBitRangeOverlay(f, globalBit, bitX, bitY);
    this._drawBitMultiplesOverlay(f, globalBit, bitX, bitY);
    this._drawBitLabels(f, globalBit, bitIdx, cls, draw, bitX, bitY);
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
   * Compute the geometry the bit cell will be drawn at: the static draw box
   * (`drawX`, `drawY`, `drawSize`) plus the depth-mode metadata
   * (`isLoweredCell`, `isRaisedCell`, `baseDrop`, `baseShiftX`, `drawCtx`).
   * The "rise then settle" animation for changed lowered bits lives here too.
   */
  _computeBitDrawState(f, globalBit, isSetBit, isChangedBit, bitX, bitY) {
    const px = f.px;
    const depthModeEnabled = this.loweredSetBits;
    const depthStrength = Math.max(0, Math.min(1.0, this.loweredDepthStrength ?? 0.8));
    const depthAngleRad = (Math.max(0, Math.min(90, this.loweredDepthAngle ?? 38)) * Math.PI) / 180;
    const depthScale = this.loweredSetBits3D ? 1.18 : 1;
    const baseDrop = px * Math.sin(depthAngleRad) * 1.05 * depthStrength * depthScale;
    const baseShiftX = px * Math.cos(depthAngleRad) * 0.55 * depthStrength * depthScale;
    // In depth mode, only set bits sink to the lowered plane; cleared bits
    // remain "raised" and are drawn as 3D boxes standing on the lowered plane.
    const isLoweredCell = depthModeEnabled && isSetBit;
    const isRaisedCell = depthModeEnabled && !isSetBit;
    const isDepthBucket = isLoweredCell;

    let sinkDrop = isLoweredCell ? baseDrop : 0;
    let sinkShiftX = isLoweredCell ? baseShiftX : 0;
    let sinkScale = isLoweredCell ? (this.loweredSetBits3D ? 0.56 : 0.68) : 1;

    if (isLoweredCell && isChangedBit) {
      const startedAt = this.changedBitRiseAt.get(globalBit) || performance.now();
      const elapsed = performance.now() - startedAt;
      const durationMs = 700;
      const progress = Math.max(0, Math.min(1, elapsed / durationMs));
      const peakLift = px * 0.42 * depthStrength;
      let riseLift = 0;
      if (progress < 0.32) {
        riseLift = peakLift * (progress / 0.32);
        sinkDrop = 0;
        sinkShiftX = 0;
      } else if (progress < 0.56) {
        riseLift = peakLift * (1 - (progress - 0.32) / 0.24);
        sinkDrop = 0;
        sinkShiftX = 0;
      } else {
        const settleT = (progress - 0.56) / 0.44;
        sinkDrop = baseDrop * settleT;
        sinkShiftX = baseShiftX * settleT;
      }
      sinkScale = 1 - (1 - sinkScale) * Math.max(0, Math.min(1, (progress - 0.56) / 0.44));
      sinkDrop -= riseLift;
    }

    const drawSize = Math.max(1, Math.round(px * sinkScale));
    const drawX = Math.round(bitX + sinkShiftX + (px - drawSize) * 0.5);
    const drawY = Math.round(bitY + sinkDrop + (px - drawSize) * 0.5);
    const drawCtx = f.layeredLoweredBits && isDepthBucket ? f.settledCtx : f.ctx;
    return { drawX, drawY, drawSize, drawCtx, baseDrop, baseShiftX, isLoweredCell, isRaisedCell, isDepthBucket };
  }

  /**
   * Draw the bit's body. Three branches:
   *  - layered + lowered: sunken square with shadow + inner highlight on the settled canvas.
   *  - layered + raised: 3D box with two side faces + a top face on the live canvas.
   *  - default: a single filled square on the appropriate context.
   */
  _drawBitBody(f, cls, draw, bitX, bitY) {
    const px = f.px;
    const { color, bitAlpha } = cls;
    const { drawX, drawY, drawSize, drawCtx, isLoweredCell, isRaisedCell, baseDrop, baseShiftX } = draw;

    if (f.layeredLoweredBits && isLoweredCell) {
      // Lowered (set) bit: only the sunken square, with optional drop
      // shadow and inner highlight. No top-position box is drawn so the
      // raised neighbours visually stand higher above the bottom plane.
      const sCtx = f.settledCtx;
      sCtx.save();
      sCtx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      sCtx.fillRect(
        Math.round(drawX - Math.max(1, px * 0.08)),
        Math.round(drawY - Math.max(1, px * 0.08)),
        Math.max(1, Math.round(drawSize + Math.max(2, px * 0.16))),
        Math.max(1, Math.round(drawSize + Math.max(2, px * 0.16)))
      );
      sCtx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${bitAlpha})`;
      sCtx.fillRect(drawX, drawY, drawSize, drawSize);
      sCtx.strokeStyle = `rgba(255, 255, 255, ${this.loweredSetBits3D ? '0.16' : '0.12'})`;
      sCtx.lineWidth = Math.max(0.3, Math.min(0.8, px * 0.055));
      sCtx.strokeRect(
        Math.round(drawX) + 0.5,
        Math.round(drawY) + 0.5,
        Math.max(1, Math.round(drawSize - 1)),
        Math.max(1, Math.round(drawSize - 1))
      );
      sCtx.restore();
      return;
    }

    if (f.layeredLoweredBits && isRaisedCell) {
      // Raised (cleared) bit: render as a 3D box standing on the lowered
      // plane. The box's bottom face sits at the sunken footprint
      // (baseDrop / baseShiftX, scaled), and the top face sits at the
      // original bit position with full size. Side faces connect them.
      const baseSize = Math.max(1, Math.round(px * (this.loweredSetBits3D ? 0.56 : 0.68)));
      const baseX = Math.round(bitX + baseShiftX + (px - baseSize) * 0.5);
      const baseY = Math.round(bitY + baseDrop + (px - baseSize) * 0.5);
      const topX = Math.round(bitX);
      const topY = Math.round(bitY);
      const topSize = Math.max(1, Math.round(px));
      const ctx = f.ctx;
      ctx.save();
      // Right side face (darker)
      ctx.fillStyle = `rgba(${Math.round(color[0] * 0.62)}, ${Math.round(color[1] * 0.62)}, ${Math.round(color[2] * 0.62)}, ${bitAlpha})`;
      ctx.beginPath();
      ctx.moveTo(topX + topSize, topY);
      ctx.lineTo(topX + topSize, topY + topSize);
      ctx.lineTo(baseX + baseSize, baseY + baseSize);
      ctx.lineTo(baseX + baseSize, baseY);
      ctx.closePath();
      ctx.fill();
      // Bottom-front side face (slightly darker than right)
      ctx.fillStyle = `rgba(${Math.round(color[0] * 0.5)}, ${Math.round(color[1] * 0.5)}, ${Math.round(color[2] * 0.5)}, ${bitAlpha})`;
      ctx.beginPath();
      ctx.moveTo(topX, topY + topSize);
      ctx.lineTo(topX + topSize, topY + topSize);
      ctx.lineTo(baseX + baseSize, baseY + baseSize);
      ctx.lineTo(baseX, baseY + baseSize);
      ctx.closePath();
      ctx.fill();
      // Top face (original color, full size)
      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${bitAlpha})`;
      ctx.fillRect(topX, topY, topSize, topSize);
      // Subtle edge highlight on the top face
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = Math.max(0.3, Math.min(0.8, px * 0.055));
      ctx.strokeRect(topX + 0.5, topY + 0.5, Math.max(1, topSize - 1), Math.max(1, topSize - 1));
      ctx.restore();
      return;
    }

    drawCtx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${bitAlpha})`;
    if (f.skipBitFill) return;
    drawCtx.fillRect(drawX, drawY, drawSize, drawSize);
  }

  /** Tinted overlay + outline drawn on top of a ghost-masked set bit. */
  _drawGhostMaskHighlight(f, draw) {
    const { drawX, drawY, drawSize, drawCtx } = draw;
    const px = f.px;
    const set = f.bitColors.set;
    drawCtx.save();
    drawCtx.fillStyle = `rgba(${set[0]},${set[1]},${set[2]},0.2)`;
    drawCtx.fillRect(drawX, drawY, drawSize, drawSize);
    drawCtx.strokeStyle = `rgba(${set[0]},${set[1]},${set[2]},0.95)`;
    drawCtx.lineWidth = Math.max(0.7, Math.min(1.6, px * 0.12));
    drawCtx.strokeRect(
      Math.round(drawX - 0.5), Math.round(drawY - 0.5),
      Math.max(2, Math.round(drawSize + 1)), Math.max(2, Math.round(drawSize + 1))
    );
    drawCtx.restore();
  }

  /** Faint blue tint over bits inside the active focus range. */
  _drawBitFocusRange(f, bitX, bitY) {
    if (f.skipBitFill) return;
    const px = f.px;
    f.ctx.fillStyle = 'rgba(96, 165, 250, 0.16)';
    f.ctx.fillRect(
      Math.round(bitX - 1), Math.round(bitY - 1),
      Math.max(2, Math.round(px + 2)), Math.max(2, Math.round(px + 2))
    );
  }

  /** Blue (and orange-on-repeat) outline around target bits. */
  _drawBitTargetOutline(f, globalBit, draw, targetHitCount) {
    const showTargetOutline = this.targetBits?.has(globalBit)
      && !this.maskGhostBits?.has(globalBit)
      && this.zoom >= 1.4
      && f.px >= 2.5;
    if (!showTargetOutline) return;
    const { drawX, drawY, drawSize } = draw;
    const ctx = f.ctx;
    const px = f.px;
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.95)';
    ctx.lineWidth = Math.max(0.35, Math.min(1.25, px * 0.08));
    ctx.strokeRect(
      Math.round(drawX - 0.5), Math.round(drawY - 0.5),
      Math.max(2, Math.round(drawSize + 1)), Math.max(2, Math.round(drawSize + 1))
    );
    if (targetHitCount > 1 && this.zoom >= 2.2 && px >= 4) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
      ctx.lineWidth = Math.max(0.5, Math.min(1.6, px * 0.11));
      ctx.strokeRect(
        Math.round(drawX + 1), Math.round(drawY + 1),
        Math.max(1, Math.round(drawSize - 2)), Math.max(1, Math.round(drawSize - 2))
      );
    }
    ctx.restore();
  }

  /** Gold tint + dot + (at zoom) border + 'p' label for prime bits. */
  _drawBitPrimeOverlay(f, globalBit, bitX, bitY) {
    if (!(this.primeOverlay && this._primeBitFlags?.[globalBit])) return;
    const ctx = f.ctx;
    const px = f.px;
    ctx.save();
    // Subtle gold tint over the bit cell (GL paints this when active)
    if (!f.skipBitFill) {
      ctx.fillStyle = 'rgba(251,191,36,0.20)';
      ctx.fillRect(Math.round(bitX), Math.round(bitY), Math.max(1, Math.round(px)), Math.max(1, Math.round(px)));
    }
    // Small gold dot in the top-right corner — visible even at low zoom
    const dotR = Math.max(0.8, Math.min(px * 0.22, 4));
    ctx.fillStyle = 'rgba(251,191,36,0.92)';
    ctx.beginPath();
    ctx.arc(Math.round(bitX + px) - dotR * 0.75, Math.round(bitY) + dotR * 0.75, dotR, 0, Math.PI * 2);
    ctx.fill();
    // Gold border at moderate zoom
    if (px >= 4) {
      ctx.strokeStyle = 'rgba(251,191,36,0.68)';
      ctx.lineWidth = Math.max(0.35, Math.min(1.3, px * 0.075));
      ctx.setLineDash([]);
      ctx.strokeRect(Math.round(bitX) - 0.5, Math.round(bitY) - 0.5, Math.max(2, Math.round(px) + 1), Math.max(2, Math.round(px) + 1));
    }
    // Small "p" label at high zoom so the meaning is unmistakable
    if (px >= 16) {
      const pSize = Math.max(4, Math.min(px * 0.22, 9));
      ctx.font = `bold ${pSize}px monospace`;
      ctx.fillStyle = 'rgba(251,191,36,0.90)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('p', Math.round(bitX + 1), Math.round(bitY + 1));
      ctx.textAlign = 'start';
    }
    ctx.restore();
  }

  /** Cyan/teal highlight for bits within [rangeOverlayStart, rangeOverlayEnd]. */
  _drawBitRangeOverlay(f, globalBit, bitX, bitY) {
    if (!(this.rangeOverlay && globalBit >= this.rangeOverlayStart && globalBit <= this.rangeOverlayEnd)) return;
    const ctx = f.ctx;
    const px = f.px;
    ctx.save();
    if (!f.skipBitFill) {
      ctx.fillStyle = 'rgba(34,211,238,0.22)';
      ctx.fillRect(Math.round(bitX), Math.round(bitY), Math.max(1, Math.round(px)), Math.max(1, Math.round(px)));
    }
    const dotR2 = Math.max(0.8, Math.min(px * 0.20, 3.5));
    ctx.fillStyle = 'rgba(34,211,238,0.88)';
    ctx.beginPath();
    ctx.arc(Math.round(bitX) + dotR2 * 0.75, Math.round(bitY) + dotR2 * 0.75, dotR2, 0, Math.PI * 2);
    ctx.fill();
    if (px >= 4) {
      ctx.strokeStyle = 'rgba(34,211,238,0.60)';
      ctx.lineWidth = Math.max(0.35, Math.min(1.3, px * 0.07));
      ctx.setLineDash([]);
      ctx.strokeRect(Math.round(bitX) - 0.5, Math.round(bitY) - 0.5, Math.max(2, Math.round(px) + 1), Math.max(2, Math.round(px) + 1));
    }
    if (px >= 16) {
      const rSize = Math.max(4, Math.min(px * 0.20, 8));
      ctx.font = `bold ${rSize}px monospace`;
      ctx.fillStyle = 'rgba(34,211,238,0.90)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('r', Math.round(bitX + px - 1), Math.round(bitY + 1));
      ctx.textAlign = 'start';
    }
    ctx.restore();
  }

  /** Purple highlight for bits whose number is a multiple of multiplesOverlayPrime. */
  _drawBitMultiplesOverlay(f, globalBit, bitX, bitY) {
    if (!(this.multiplesOverlay && this.multiplesOverlayPrime >= 2)) return;
    const num = bitToNumber(globalBit, this.storageModel);
    if (!(num >= 2 && num % this.multiplesOverlayPrime === 0)) return;
    const ctx = f.ctx;
    const px = f.px;
    ctx.save();
    if (!f.skipBitFill) {
      ctx.fillStyle = 'rgba(167,139,250,0.30)';
      ctx.fillRect(Math.round(bitX), Math.round(bitY), Math.max(1, Math.round(px)), Math.max(1, Math.round(px)));
    }
    const dotR3 = Math.max(0.8, Math.min(px * 0.20, 3.5));
    ctx.fillStyle = 'rgba(167,139,250,0.90)';
    ctx.beginPath();
    ctx.arc(Math.round(bitX + px) - dotR3 * 0.75, Math.round(bitY + px) - dotR3 * 0.75, dotR3, 0, Math.PI * 2);
    ctx.fill();
    if (px >= 4) {
      ctx.strokeStyle = 'rgba(167,139,250,0.88)';
      ctx.lineWidth = Math.max(1.0, Math.min(2.5, px * 0.14));
      ctx.setLineDash([]);
      ctx.strokeRect(Math.round(bitX) - 0.5, Math.round(bitY) - 0.5, Math.max(2, Math.round(px) + 1), Math.max(2, Math.round(px) + 1));
    }
    if (px >= 16) {
      const mSize = Math.max(4, Math.min(px * 0.20, 8));
      ctx.font = `bold ${mSize}px monospace`;
      ctx.fillStyle = 'rgba(167,139,250,0.90)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('×', Math.round(bitX + px - 1), Math.round(bitY + px - 1));
      ctx.textAlign = 'start';
    }
    ctx.restore();
  }

  /**
   * Draw bit/number labels inside the cell. Honours dual-line mode, the
   * lowered-position label shrink, and the high-zoom font boost.
   */
  _drawBitLabels(f, globalBit, bitIdx, cls, draw, bitX, bitY) {
    const { showBitLabels, showNumberLabels, layeredLoweredBits, settledCtx, ctx, px } = f;
    const dualLabelMode = showBitLabels && showNumberLabels;
    if (!((dualLabelMode && px >= 22) || (!dualLabelMode && (showBitLabels || showNumberLabels) && px >= 12))) return;

    const lines = [];
    if (showBitLabels) lines.push(String(this._bitLabelValue(globalBit, bitIdx)));
    if (showNumberLabels) lines.push(String(bitToNumber(globalBit, this.storageModel)));

    const dualLine = lines.length > 1;
    const zoomBoost = this.zoom > 20 ? 1 + Math.min(1, (this.zoom - 20) / 24) : 1;

    // Set bits follow the lowered position; cleared bits remain raised at normal position
    const isLoweredLabel = draw.isDepthBucket && cls.isSetBit;
    const labelPx = isLoweredLabel ? draw.drawSize : px;
    const labelX = isLoweredLabel ? draw.drawX : bitX;
    const labelY = isLoweredLabel ? draw.drawY : bitY;
    const labelCtx = (layeredLoweredBits && isLoweredLabel) ? settledCtx : ctx;

    const baseFontSize = dualLine
      ? Math.max(5, Math.min(8, labelPx * 0.2))
      : Math.max(5, Math.min(9, labelPx * 0.34));
    // Slightly shrink labels on lowered bits so the raised bits read as taller.
    const loweredLabelScale = isLoweredLabel ? 0.85 : 1;
    const fontSize = baseFontSize * zoomBoost * loweredLabelScale;
    const centerX = Math.round(labelX + labelPx / 2);
    const centerY = Math.round(labelY + labelPx / 2);
    const textColor = this._labelTextColor(cls.color);

    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'middle';
    if (dualLine) {
      labelCtx.fillStyle = textColor;
      labelCtx.font = `${fontSize}px monospace`;
      labelCtx.fillText(lines[0], centerX, Math.round(labelY + labelPx * 0.32));
      labelCtx.font = `italic ${Math.max(4.5, fontSize - 0.25)}px monospace`;
      labelCtx.fillText(lines[1], centerX, Math.round(labelY + labelPx * 0.7));
    } else {
      labelCtx.fillStyle = textColor;
      labelCtx.font = `${showNumberLabels ? 'italic ' : ''}${fontSize}px monospace`;
      labelCtx.fillText(lines[0], centerX, centerY);
    }
    labelCtx.textAlign = 'start';
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

  getBitInfo(bitIdx) {
    if (bitIdx < 0 || bitIdx >= this.bitCount) return '';
    const number = bitToNumber(bitIdx, this.storageModel);
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
    return `Bit ${bitIdx} -> Number ${number} | byte ${byteInVector} in ${groupLabel}, ${byteIdx} from start | uint64 ${u64InVector} in ${groupLabel}, ${u64Idx} from start | Cache line ${cacheLineIdx} | target hits ${hitCount} | ${state}${changed}${focused}`;
  }

  toDataURL() {
    if (!this.canvas) return '';
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Render a contracting ripple overlay on changed bits.
   * A large circle contracts to each changed bit while fading.
   * @param {number} progress 0..1 animation progress
   */
  renderRipple(progress, focusBits = null, options = {}) {
    const sourceBits = focusBits && focusBits.size ? focusBits : this.animationFocusBits?.size ? this.animationFocusBits : this.changedBits;
    if (!this.ctx || !sourceBits || sourceBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const ctx = this.ctx;
    const cw = this.canvas.width / (window.devicePixelRatio || 1);
    const ch = this.canvas.height / (window.devicePixelRatio || 1);
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

    ctx.save();

    for (const globalBit of sourceBits) {
      const pos = this.bitIndexToCanvas(globalBit);
      if (!pos) continue;
      const cx = pos.x;
      const cy = pos.y;

      // Skip off-screen bits
      if (cx + maxRadius < 0 || cx - maxRadius > cw || cy + maxRadius < 0 || cy - maxRadius > ch) continue;

      if (haloAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${haloAlpha})`;
        ctx.fill();
      }

      if (ringAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${ringAlpha})`;
        ctx.lineWidth = ringWidth;
        ctx.stroke();
      }

      if (coreAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${coreAlpha})`;
        ctx.fill();
      }

      if (options.showBeacon) {
        const beacon = Math.max(px * 0.9, 4.5 * intensity);
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0.16, ringAlpha * 0.68)})`;
        ctx.lineWidth = Math.max(0.75, px * 0.1);
        ctx.strokeRect(cx - beacon / 2, cy - beacon / 2, beacon, beacon);
      }
    }

    ctx.restore();
  }

  /** Fade animation: changed bits fade from transparent to full color */
  renderFade(progress) {
    if (!this.ctx || !this.changedBits || this.changedBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const ctx = this.ctx;
    const px = this.pixelSize * this.zoom;
    const color = this._opColor();
    const alpha = 1 - progress; // fades out over time

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;

    for (const globalBit of this.changedBits) {
      const pos = this.bitIndexToCanvas(globalBit);
      if (!pos) continue;
      const bx = pos.x - px / 2;
      const by = pos.y - px / 2;

      ctx.fillRect(bx - 1, by - 1, px + 2, px + 2);
    }
    ctx.restore();
  }

  /** Pulse animation: changed bits scale up then back down */
  renderPulse(progress, focusBits = null, options = {}) {
    const sourceBits = focusBits && focusBits.size ? focusBits : this.animationFocusBits?.size ? this.animationFocusBits : this.changedBits;
    if (!this.ctx || !sourceBits || sourceBits.size === 0) return;
    if (progress <= 0 || progress > 1) return;

    const ctx = this.ctx;
    const px = this.pixelSize * this.zoom;
    const color = this._opColor();
    const intensity = Math.max(0.8, Math.min(1.8, options.intensity || 1));

    // Scale: grow aggressively, then shrink back with a bright halo.
    const peak = 0.3;
    const scale = progress < peak
      ? 1 + 1.15 * intensity * (progress / peak)
      : 1 + 1.15 * intensity * (1 - (progress - peak) / (1 - peak));
    const alpha = progress < 0.75 ? 0.92 : 0.92 * (1 - (progress - 0.75) / 0.25);

    ctx.save();
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, alpha)})`;

    for (const globalBit of sourceBits) {
      const pos = this.bitIndexToCanvas(globalBit);
      if (!pos) continue;
      const cx = pos.x;
      const cy = pos.y;

      const s = px * scale;
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      if (options.showHalo) {
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0.2, alpha * 0.72)})`;
        ctx.lineWidth = Math.max(1.1, px * 0.15);
        ctx.strokeRect(cx - s * 0.68, cy - s * 0.68, s * 1.36, s * 1.36);
      }
    }
    ctx.restore();
  }

  /**
   * Stamp animation for applyMask: a mask rectangle moves over each grouping
   * and lowers where bits are affected.
   */
  renderMaskStamp(progress) {
    if (!this.ctx || !this.changedBits || this.changedBits.size === 0) return;
    const t = Math.max(0, Math.min(1, progress));

    const ctx = this.ctx;
    const color = this._opColor();
    const px = this.pixelSize * this.zoom;
    const lift = Math.max(7, Math.min(18, px * 3.1));

    const orderedEntries = this._maskWriteEntries();
    const stampProgress = t * (orderedEntries.length > 0 ? orderedEntries.length : 0);

    ctx.save();
    ctx.setLineDash([]);

    if (orderedEntries.length > 0) {
      for (let i = 0; i < orderedEntries.length; i++) {
        const local = stampProgress - i;
        if (local < -0.25 || local > 1.2) continue;

        const phase = Math.max(0, Math.min(1, local));
        let yOffset;
        if (phase < 0.45) {
          yOffset = -lift * (1 - phase / 0.45);
        } else if (phase < 0.75) {
          yOffset = Math.sin(((phase - 0.45) / 0.3) * Math.PI) * 2;
        } else {
          yOffset = -lift * ((phase - 0.75) / 0.25);
        }

        const entry = orderedEntries[i];
        const tint = this._maskTintColor(entry.slotIndex);
        const bounds = entry.bounds;
        const groupBounds = this._maskEntryGroupBounds(entry);
        const stampBounds = groupBounds || bounds;
        const alpha = local < 0 ? Math.max(0, 0.28 + local * 1.1) : Math.max(0.22, 0.84 - phase * 0.42);
        // Expand stamp to cover visible label bands (byte title, vector grouping
        // title) above the bit group, and match the annotation outline padding
        // when outlines are enabled.
        const inset = Math.max(2, Math.min(6, px * 0.7));
        const stampPad = this.outlineEnabled ? Math.max(inset, this._outlinePadding()) : inset;
        const topExtra = this._labelBands().total;
        const rx = stampBounds.x - stampPad;
        const ry = stampBounds.y - stampPad - topExtra + yOffset;
        const rw = stampBounds.w + stampPad * 2;
        const rh = stampBounds.h + stampPad * 2 + topExtra;

        ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha * 0.14})`;
        ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha})`;
        ctx.lineWidth = Math.max(0.8, Math.min(2.2, px * 0.11));
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, Math.max(4, Math.min(10, 4 + px * 0.16)));
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
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
      ctx.restore();
      return;
    }

    const legacyStampProgress = t * groups.length;

    for (let i = 0; i < groups.length; i++) {
      const local = legacyStampProgress - i;
      if (local < -0.25 || local > 1.2) continue;

      const phase = Math.max(0, Math.min(1, local));
      let yOffset;
      if (phase < 0.45) {
        yOffset = -lift * (1 - phase / 0.45);
      } else if (phase < 0.75) {
        yOffset = Math.sin(((phase - 0.45) / 0.3) * Math.PI) * 2;
      } else {
        yOffset = -lift * ((phase - 0.75) / 0.25);
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

      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha * 0.14})`;
      ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
      ctx.lineWidth = Math.max(0.8, Math.min(2.2, px * 0.11));
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, Math.max(4, Math.min(10, 4 + px * 0.16)));
      ctx.fill();
      ctx.stroke();

      const hitBits = groupMap.get(gid) || [];
      const markSize = Math.max(1.5, Math.min(5, px * 0.42));
      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0.26, alpha * 0.78)})`;
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0.2, alpha * 0.42)})`;
      ctx.lineWidth = Math.max(0.45, Math.min(1.1, px * 0.07));
      for (let j = 0; j < hitBits.length; j++) {
        const pos = this.bitIndexToCanvas(hitBits[j]);
        if (!pos) continue;
        const bx = pos.x - markSize / 2;
        const by = pos.y - markSize / 2 + yOffset;
        ctx.fillRect(bx, by, markSize, markSize);
        ctx.strokeRect(bx, by, markSize, markSize);
      }
    }

    ctx.restore();
  }

  renderMaskHover(progress) {
    if (!this.ctx) return;
    const slotGroups = this._maskEntriesBySlot();
    if (slotGroups.length === 0) return;

    const ctx = this.ctx;
    const px = this.pixelSize * this.zoom;
    const t = Math.max(0, Math.min(1, progress));
    const travelLift = Math.max(16, Math.min(52, px * 5.8));

    ctx.save();

    for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
      const entries = slotGroups[groupIndex];
      const segmentCount = Math.max(1, entries.length);
      const unit = t * segmentCount;
      const index = Math.min(entries.length - 1, Math.floor(unit));
      const local = Math.max(0, Math.min(1, unit - index));
      const from = entries[index];
      const to = entries[Math.min(entries.length - 1, index + 1)];
      const fromTint = this._maskTintColor(from.slotIndex);

      for (let previous = 0; previous < index; previous++) {
        this._drawMaskImprint(ctx, entries[previous], entries[previous].bounds.cx, entries[previous].bounds.cy, {
          alpha: 0.52,
        });
      }

      const rise = local < 0.35 ? local / 0.35 : local > 0.68 ? (1 - local) / 0.32 : 1;
      const smooth = local * local * (3 - 2 * local);
      const currentX = from.bounds.cx + (to.bounds.cx - from.bounds.cx) * smooth;
      const currentY = from.bounds.cy + (to.bounds.cy - from.bounds.cy) * smooth - travelLift * rise;
      const stampingAlpha = local < 0.18 ? 1 : local > 0.82 ? 1 : 0.92;

      if (index < entries.length - 1 && from !== to) {
        ctx.strokeStyle = `rgba(${fromTint[0]},${fromTint[1]},${fromTint[2]},0.88)`;
        ctx.lineWidth = Math.max(1.6, px * 0.13);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.bounds.cx, from.bounds.cy - Math.max(4, px * 0.35));
        ctx.quadraticCurveTo(
          (from.bounds.cx + to.bounds.cx) / 2,
          Math.min(from.bounds.cy, to.bounds.cy) - travelLift * 1.25,
          to.bounds.cx,
          to.bounds.cy - Math.max(4, px * 0.35),
        );
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = Math.max(0.9, px * 0.07);
        ctx.setLineDash([Math.max(4, px * 0.62), Math.max(3, px * 0.34)]);
        ctx.stroke();
      }

      this._drawMaskImprint(ctx, from, currentX, currentY, {
        alpha: stampingAlpha,
        liftBlend: rise,
        showConnector: rise > 0.05,
      });

      if (local > 0.78 && index < entries.length - 1) {
        this._drawMaskImprint(ctx, to, to.bounds.cx, to.bounds.cy, {
          alpha: (local - 0.78) / 0.22,
        });
      }
    }

    ctx.restore();
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
    if (this.bitCount === 0) return true;
    const dims = this.contentDimensions();
    const viewX = -this.panX;
    const viewY = -this.panY;
    const eps = 0.5;
    return (
      viewX <= eps &&
      viewY <= eps &&
      viewX + viewportW >= dims.width - eps &&
      viewY + viewportH >= dims.height - eps
    );
  }

  /** Render minimap overlay in bottom-right corner, offset above detailH */
  renderMinimap(canvasW, canvasH, detailH = 0) {
    let ctx = this.ctx;
    let viewportW = canvasW;
    let viewportH = canvasH;
    if (this.minimapCanvas && this.minimapCtx) {
      const dpr = window.devicePixelRatio || 1;
      const overlayW = this.minimapCanvas.clientWidth || canvasW;
      const overlayH = this.minimapCanvas.clientHeight || canvasH;
      viewportW = this.canvas?.clientWidth || overlayW || canvasW;
      viewportH = this.canvas?.clientHeight || overlayH || canvasH;
      canvasW = overlayW;
      canvasH = overlayH;
      if (this.minimapCanvas.width !== Math.round(overlayW * dpr) || this.minimapCanvas.height !== Math.round(overlayH * dpr)) {
        this.minimapCanvas.width = Math.round(overlayW * dpr);
        this.minimapCanvas.height = Math.round(overlayH * dpr);
        this.minimapCanvas.style.width = `${overlayW}px`;
        this.minimapCanvas.style.height = `${overlayH}px`;
      }
      ctx = this.minimapCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasW, canvasH);
    }

    if (!this.minimapEnabled) {
      this._minimapRect = null;
      return;
    }
    if (this.bitCount === 0) return;
    if (this.isContentFullyVisible(viewportW, viewportH)) {
      this._minimapRect = null;
      return;
    }
    const dims = this.contentDimensions();
    const pad = 4;

    const scale = Math.min(
      (130) / dims.width,
      (130) / dims.height
    );
    const mapW = dims.width * scale + 2 * pad;
    const mapH = dims.height * scale + 2 * pad;
    const edgePad = 10;
    const mx = Math.max(edgePad, canvasW - mapW - edgePad);
    const panelClearance = Math.max(0, detailH) + edgePad;
    const my = Math.max(edgePad, canvasH - mapH - panelClearance);

    // Store minimap geometry for hit testing
    this._minimapRect = { mx, my, mapW, mapH, scale, pad, dims };

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(mx, my, mapW, mapH);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mapW, mapH);

    // Content outline only (no per-bit colors)
    const bitsPerCacheLine = this.bitsPerCacheLine;
    const totalCL = Math.ceil(this.bitCount / bitsPerCacheLine);
    const clPerVRow = this._cacheLinesPerVisualRow();
    const totalVRows = Math.ceil(totalCL / clPerVRow);
    const contentW = mapW - 2 * pad;
    const contentH = mapH - 2 * pad;

    // Draw a simple filled rectangle for the content area
    ctx.fillStyle = 'rgba(180,180,180,0.15)';
    ctx.fillRect(mx + pad, my + pad, contentW, contentH);

    // Draw outline of the content boundary
    ctx.strokeStyle = 'rgba(200,200,200,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + pad, my + pad, contentW, contentH);

    // Viewport rectangle
    const vpX = mx + pad + (-this.panX) * scale;
    const vpY = my + pad + (-this.panY) * scale;
    const vpW = viewportW * scale;
    const vpH = viewportH * scale;

    ctx.strokeStyle = 'rgba(255,68,68,0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      Math.max(mx + pad, Math.min(vpX, mx + mapW - pad)),
      Math.max(my + pad, Math.min(vpY, my + mapH - pad)),
      Math.min(vpW, mapW - 2 * pad),
      Math.min(vpH, mapH - 2 * pad)
    );
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

  /** Test if (x,y) in canvas coords is inside the minimap; returns {panX, panY} to center there */
  minimapHitTest(x, y, canvasW, canvasH) {
    const r = this._minimapRect;
    if (!r) return null;
    const { mx, my, mapW, mapH, scale, pad } = r;
    if (x < mx || x > mx + mapW || y < my || y > my + mapH) return null;
    // Map click position to content coordinates
    const contentX = (x - mx - pad) / scale;
    const contentY = (y - my - pad) / scale;
    // Center the viewport on that content point
    return {
      panX: -(contentX - canvasW / 2),
      panY: -(contentY - canvasH / 2),
    };
  }
}

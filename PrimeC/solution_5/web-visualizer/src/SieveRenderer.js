/**
 * Canvas-based renderer for sieve bitstorage visualization.
 *
 * Supports configurable layouts, adjustable spacing, light/dark themes,
 * operation-colored highlighting, vector grouping, and vector labels.
 */

// Theme palettes with per-operation changed-bit colors
export const THEMES = {
  dark: {
    BIT_ZERO:     [232, 232, 232],
    BIT_ONE:      [85,  85,  85],
    BIT_CHANGED:  [46,  204, 113],
    BACKGROUND:   [26,  26,  26],
    BYTE_BORDER:  [50,  50,  50],
    U64_BORDER:   [70,  70,  70],
    CACHE_BORDER: [100, 100, 100],
    LABEL_COLOR:  'rgba(200,200,200,0.7)',
    OPERATION_COLORS: {
      markFactors:     [72,  201, 176],
      extend:          [68,  136, 255],  // blue
      continuePattern: [68,  220, 136],  // green
      setBitsTrue:     [46,  204, 113],
      applyMask:       [39,  174, 96],
    },
  },
  light: {
    BIT_ZERO:     [240, 240, 240],
    BIT_ONE:      [60,  60,  60],
    BIT_CHANGED:  [46,  160, 67],
    BACKGROUND:   [245, 245, 245],
    BYTE_BORDER:  [200, 200, 200],
    U64_BORDER:   [170, 170, 170],
    CACHE_BORDER: [130, 130, 130],
    LABEL_COLOR:  'rgba(60,60,60,0.7)',
    OPERATION_COLORS: {
      markFactors:     [34,  139, 34],
      extend:          [30,  90,  200],
      continuePattern: [20,  160, 80],
      setBitsTrue:     [46,  160, 67],
      applyMask:       [27,  120, 54],
    },
  },
};

// Color presets for set/cleared/unchanged bits
export const COLOR_PRESETS = {
  default: {
    label: 'Default',
    setBit:       [76, 175, 80],   // green
    clearedBit:   [244, 67, 54],   // red
    unchangedBit: [158, 158, 158], // gray
  },
  highContrast: {
    label: 'High Contrast',
    setBit:       [0, 255, 0],     // bright green
    clearedBit:   [255, 0, 0],     // bright red
    unchangedBit: [0, 0, 0],       // black
  },
  pastel: {
    label: 'Pastel',
    setBit:       [165, 214, 167], // pastel green
    clearedBit:   [239, 154, 154], // pastel red
    unchangedBit: [224, 224, 224], // pastel gray
  },
  darkMode: {
    label: 'Dark Mode',
    setBit:       [129, 199, 132], // light green
    clearedBit:   [229, 115, 115], // light red
    unchangedBit: [66, 66, 66],    // dark gray
  },
};

// Bit-in-byte layout modes
export const BIT_LAYOUTS = {
  '8x1': { label: '8 bits in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bits in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bits in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3Ã—3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
};

// Byte-in-uint64 layout modes
export const BYTE_LAYOUTS = {
  '8x1': { label: '8 bytes in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bytes in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bytes in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3Ã—3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
};

// Vector grouping options
export const VECTOR_GROUPS = {
  1:  { label: 'uint64 (no grouping)', u64sPerGroup: 1 },
  2:  { label: 'uint64v2 (SSE/128-bit)', u64sPerGroup: 2 },
  4:  { label: 'uint64v4 (AVX2/256-bit)', u64sPerGroup: 4 },
  8:  { label: 'uint64v8 (AVX-512/512-bit)', u64sPerGroup: 8 },
};

// Cacheline size presets
export const CACHELINE_SIZES = {
  32:  { label: '32 bytes (256 bits)' },
  64:  { label: '64 bytes (512 bits)' },
  128: { label: '128 bytes (1024 bits)' },
};

// Processor cache presets with L1/L2 sizes and cacheline size
export const CACHE_PRESETS = {
  custom:              { label: 'Custom',                         l1: 0,          l2: 0,            cachelineSize: 64 },
  'intel-alder-lake':  { label: 'Intel Alder Lake (12th Gen)',    l1: 48*1024,    l2: 1280*1024,    cachelineSize: 64 },
  'intel-raptor-lake': { label: 'Intel Raptor Lake (13/14th Gen)',l1: 48*1024,    l2: 2048*1024,    cachelineSize: 64 },
  'amd-zen3':          { label: 'AMD Zen 3 (Ryzen 5000)',        l1: 32*1024,    l2: 512*1024,     cachelineSize: 64 },
  'amd-zen4':          { label: 'AMD Zen 4 (Ryzen 7000)',        l1: 32*1024,    l2: 1024*1024,    cachelineSize: 64 },
  'amd-zen5':          { label: 'AMD Zen 5 (Ryzen 9000)',        l1: 32*1024,    l2: 1024*1024,    cachelineSize: 64 },
  'apple-m1':          { label: 'Apple M1',                      l1: 192*1024,   l2: 12*1024*1024, cachelineSize: 128 },
  'apple-m2':          { label: 'Apple M2',                      l1: 192*1024,   l2: 16*1024*1024, cachelineSize: 128 },
  'apple-m3':          { label: 'Apple M3',                      l1: 192*1024,   l2: 16*1024*1024, cachelineSize: 128 },
  'apple-m4':          { label: 'Apple M4',                      l1: 192*1024,   l2: 16*1024*1024, cachelineSize: 128 },
  'arm-cortex-a78':    { label: 'ARM Cortex-A78',                l1: 64*1024,    l2: 512*1024,     cachelineSize: 64 },
  'snapdragon-8gen3':  { label: 'Snapdragon 8 Gen 3',            l1: 64*1024,    l2: 2048*1024,    cachelineSize: 64 },
};

// Map a linear index (0-7) to a position in a 3x3 grid skipping center (4)
const GRID3X3_MAP = [0, 1, 2, 3, /*skip 4*/ 5, 6, 7, 8];

// Storage model definitions
export const STORAGE_MODELS = {
  half:  { label: 'Half (odd only)',   description: 'bit i â†’ 2i+1' },
  full:  { label: 'Full (all)',        description: 'bit i â†’ i' },
  wheel: { label: 'Wheel 8-of-30',    description: 'bit i â†’ wheel30 residue' },
};

const WHEEL30_RESIDUES = [1, 7, 11, 13, 17, 19, 23, 29];

/** Convert a bit index to a number for the given storage model */
export function bitToNumber(bitIdx, model) {
  switch (model) {
    case 'full':  return bitIdx;
    case 'wheel': return Math.floor(bitIdx / 8) * 30 + WHEEL30_RESIDUES[bitIdx % 8];
    case 'half':
    default:      return bitIdx * 2 + 1;
  }
}

/** Convert a number to a bit index, or -1 if not representable */
export function numberToBit(num, model) {
  switch (model) {
    case 'full':  return num;
    case 'wheel': {
      const group = Math.floor(num / 30);
      const rem = num % 30;
      const idx = WHEEL30_RESIDUES.indexOf(rem);
      return idx >= 0 ? group * 8 + idx : -1;
    }
    case 'half':
    default:
      return (num < 1 || num % 2 === 0) ? -1 : (num - 1) / 2;
  }
}

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
    this.focusStart = null;
    this.focusStop = null;
    this.maskWordBits = null;
    this.maskWriteOrderWords = null;
    this.maskWriteOrderSlots = null;
    this.maskWriteOrderEventIds = null;
    this.maskSlotBits = null;
    this.maskGhostBits = null;
    this.searchHighlight = null;
    this.animationFocusBits = new Set();
    this.bitMotionTrails = [];
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

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

    // Heat map: tracks recency of access per bit
    this.heatMapEnabled = false;
    this.lastAccessStep = null;   // Int32Array, per-bit last step index (-1 = never)
    this.heatMapCurrentStep = 0;

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

  _hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return [92, 207, 141];
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return [92, 207, 141];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  _mixRgb(a, b, t) {
    return [
      Math.round(a[0] * (1 - t) + b[0] * t),
      Math.round(a[1] * (1 - t) + b[1] * t),
      Math.round(a[2] * (1 - t) + b[2] * t),
    ];
  }

  _labelTextColor(fillRgb) {
    const [r, g, b] = fillRgb;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 150 ? 'rgba(17, 24, 39, 0.95)' : 'rgba(249, 250, 251, 0.96)';
  }

  _fitLabelFontSize(ctx, text, maxWidth, preferredSize, minSize = 4, style = '') {
    if (!text || maxWidth <= 0) return 0;
    let size = preferredSize;
    while (size > minSize) {
      ctx.font = `${style}${size}px monospace`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 0.5;
    }
    ctx.font = `${style}${minSize}px monospace`;
    return ctx.measureText(text).width <= maxWidth ? minSize : 0;
  }

  _truncateTextToWidth(ctx, text, maxWidth, style = '') {
    if (!text || maxWidth <= 0) return '';
    ctx.save();
    ctx.font = style;
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.restore();
      return text;
    }
    const ellipsis = '...';
    if (ctx.measureText(ellipsis).width > maxWidth) {
      ctx.restore();
      return '';
    }
    let end = text.length;
    while (end > 0) {
      const candidate = `${text.slice(0, end)}${ellipsis}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        ctx.restore();
        return candidate;
      }
      end -= 1;
    }
    ctx.restore();
    return ellipsis;
  }

  _drawFittedLabel(ctx, text, x, y, maxWidth, preferredSize, color, options = {}) {
    const {
      minSize = 4,
      style = '',
      paddingX = 0,
      clipHeight = preferredSize + 4,
    } = options;

    const fitWidth = Math.max(0, maxWidth - paddingX * 2);
    const size = this._fitLabelFontSize(ctx, text, fitWidth, preferredSize, minSize, style);
    if (size <= 0) return;

    ctx.save();
    ctx.font = `${style}${size}px monospace`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.beginPath();
    ctx.rect(x, y, maxWidth, clipHeight);
    ctx.clip();
    ctx.fillText(text, x + paddingX, Math.round(y));
    ctx.restore();
  }

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
    this.focusStart = null;
    this.focusStop = null;
    this.maskWordBits = null;
    this.maskWriteOrderWords = new Uint32Array(0);
    this.maskWriteOrderSlots = new Uint8Array(0);
    this.maskWriteOrderEventIds = new Int32Array(0);
    this.maskSlotBits = [];
    this.maskGhostBits = new Set();
    this.searchHighlight = null;
    this.lastAccessStep = new Int32Array(bitCount).fill(-1);
    this.animationFocusBits = new Set();
    this.bitMotionTrails = [];
    this.loweredSetBits = false;
    this.loweredSetBits3D = false;
    this.changedBitRiseAt = new Map();
    this._frozenClPerVRow = 0;
  }

  get bitsPerCacheLine() {
    const groupBits = this._logicalGroupBits();
    if (groupBits > 0) return groupBits;
    return this.cachelineSize * 8;
  }

  setState(bitState, changedBits, targetBits = null, targetHitCounts = null, focusRange = null, maskMetadata = null) {
    this.bitState = bitState;
    this.changedBits = changedBits;
    this.targetBits = targetBits || new Set();
    this.targetHitCounts = targetHitCounts || new Map();
    this.focusStart = focusRange?.focusStart ?? null;
    this.focusStop = focusRange?.focusStop ?? null;
    this.maskWordBits = maskMetadata?.wordBits ?? null;
    this.maskWriteOrderWords = maskMetadata?.targetWords || new Uint32Array(0);
    this.maskWriteOrderSlots = maskMetadata?.targetSlots || new Uint8Array(0);
    this.maskWriteOrderEventIds = maskMetadata?.targetEventIds || new Int32Array(0);
    this.maskSlotBits = maskMetadata?.slotBits || [];
    this.maskGhostBits = new Set();
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
    this.searchHighlight = {
      type,
      index,
      bitIndex,
    };
  }

  clearSearchHighlight() {
    this.searchHighlight = null;
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

      const bounds = this._multiBitBounds(startBit, count);
      if (!bounds) continue;

      entries.push({
        order: index,
        wordIndex,
        slotIndex,
        eventId: Number(this.maskWriteOrderEventIds?.[index] ?? -1),
        startBit,
        count,
        bounds,
        slot: this._vectorSlotLayout(Math.floor(startBit / Math.max(1, this._logicalGroupBits()))),
      });
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
    for (let index = 0; index < slotBits.length; index++) {
      const absoluteBit = entry.startBit + Number(slotBits[index]);
      if (Number.isFinite(absoluteBit) && absoluteBit >= 0 && absoluteBit < this.bitCount) bits.push(absoluteBit);
    }
    return bits;
  }

  _maskEntryGroupBounds(entry) {
    if (!entry) return null;
    const groupBits = Math.max(1, this._logicalGroupBits());
    const groupStart = Math.floor(entry.startBit / groupBits) * groupBits;
    const groupCount = Math.max(1, Math.min(groupBits, this.bitCount - groupStart));
    return this._multiBitBounds(groupStart, groupCount);
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

  _renderMaskWriteOverlay(ctx) {
    const entries = this._maskWriteEntries();
    if (entries.length === 0) return;

    const px = this.pixelSize * this.zoom;

    ctx.save();
    ctx.setLineDash([]);

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const bounds = entry.bounds;
      const tint = this._maskTintColor(entry.slotIndex);
      const inset = this.maskWordBits && this.maskWordBits <= 32
        ? Math.max(0.8, Math.min(2.2, px * 0.2))
        : Math.max(1.2, Math.min(4.2, px * 0.42));
      const radius = Math.max(4, Math.min(10, 4 + px * 0.18));
      const rx = bounds.x - inset;
      const ry = bounds.y - inset;
      const rw = bounds.w + inset * 2;
      const rh = bounds.h + inset * 2;

      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${this.maskWordBits && this.maskWordBits <= 32 ? 0.025 : 0.055})`;
      ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.76)`;
      ctx.lineWidth = Math.max(0.9, Math.min(2.2, px * 0.11));
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, radius);
      ctx.fill();
      ctx.stroke();

      if (this.maskWordBits && this.maskWordBits <= 32) {
        ctx.strokeStyle = `rgba(255,255,255,0.42)`;
        ctx.lineWidth = Math.max(0.45, Math.min(1.1, px * 0.06));
        ctx.strokeRect(rx + inset * 0.45, ry + inset * 0.45, Math.max(1, rw - inset * 0.9), Math.max(1, rh - inset * 0.9));
      }
    }

    ctx.restore();
  }

  _renderVectorTouchOrder(ctx) {
    if (!this.showVectorTouchOrder) return;

    const entries = this._maskWordOrderSummary();
    if (entries.length === 0) return;

    const px = this.pixelSize * this.zoom;
    const fontSize = Math.max(10, Math.min(17, 8 + px * 0.24));
    const detailFont = Math.max(7, Math.min(11, 5.2 + px * 0.06));
    const padX = Math.max(4, Math.min(10, px * 0.42));
    const padY = Math.max(2, Math.min(6, px * 0.18));
    const usedRects = [];

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const label = entry.orders.join(',');
      const tint = this._maskTintColor(entry.slotIndex);
      const groupBounds = this._maskEntryGroupBounds(entry);
      const slotWidth = entry.slot?.vecD?.w || groupBounds?.w || entry.bounds.w;
      const maxBoxW = Math.max(28, Math.min(this.canvasWidth - 6, slotWidth));
      ctx.font = `600 ${fontSize}px monospace`;
      const textWidth = ctx.measureText(label).width;
      ctx.font = `500 ${detailFont}px monospace`;
      const eventLabel = entry.eventIds && entry.eventIds.length > 0
        ? `(${entry.eventIds.length === 1 ? 'event' : 'events'} ${entry.eventIds.join(',')})`
        : '';
      const annotation = this._truncateTextToWidth(ctx, eventLabel, Math.max(0, maxBoxW - padX * 2), `500 ${detailFont}px monospace`);
      const detailWidth = annotation ? ctx.measureText(annotation).width : 0;
      const boxW = Math.min(maxBoxW, Math.max(textWidth, detailWidth) + padX * 2);
      const labelSize = this._fitLabelFontSize(ctx, label, Math.max(0, boxW - padX * 2), fontSize, 6, '600 ');
      const detailSize = annotation ? this._fitLabelFontSize(ctx, annotation, Math.max(0, boxW - padX * 2), detailFont, 5, '500 ') : 0;
      const showAnnotation = annotation && detailSize > 0;
      const boxH = (labelSize || fontSize) + padY * 2 + (showAnnotation ? detailSize + 3 : 0);
      const slot = entry.slot;
      const slotTop = slot?.vRowHeight != null ? this.panY + slot.vRow * slot.vRowHeight : entry.bounds.y - (boxH + 12);
      const candidateX = slot
        ? Math.min(slot.vecX + slot.vecD.w - boxW / 2 - 3, Math.max(slot.vecX + boxW / 2 + 3, entry.bounds.cx))
        : entry.bounds.cx;
      let x = candidateX;
      let y = Math.max(slotTop + boxH / 2 + 2, entry.bounds.y - boxH / 2 - 10);
      for (let pass = 0; pass < 6; pass++) {
        const collides = usedRects.some((rect) => !(x + boxW / 2 < rect.x || x - boxW / 2 > rect.x + rect.w || y + boxH / 2 < rect.y || y - boxH / 2 > rect.y + rect.h));
        if (!collides) break;
        y = Math.max(slotTop + boxH / 2 + 2, y - (boxH + 4));
        x = Math.max(boxW / 2 + 2, Math.min(candidateX + (pass % 2 === 0 ? -1 : 1) * (Math.ceil(pass / 2) * (boxW * 0.35)), this.canvasWidth - boxW / 2 - 2));
      }
      usedRects.push({ x: x - boxW / 2, y: y - boxH / 2, w: boxW, h: boxH });

      ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.52)`;
      ctx.lineWidth = Math.max(0.7, Math.min(1.4, px * 0.08));
      ctx.beginPath();
      ctx.moveTo(x, y + boxH / 2 - 1);
      ctx.lineTo(entry.bounds.cx, entry.bounds.y - Math.max(4, px * 0.35));
      ctx.stroke();

      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.94)`;
      ctx.beginPath();
      ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, Math.max(5, Math.min(12, boxH * 0.35)));
      ctx.fill();

      ctx.strokeStyle = 'rgba(15, 23, 42, 0.38)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = this._labelTextColor(tint);
      if (labelSize > 0) {
        ctx.font = `600 ${labelSize}px monospace`;
        const labelY = showAnnotation ? y - detailSize * 0.5 : y + 0.5;
        ctx.fillText(label, x, labelY);
      }
      if (showAnnotation) {
        ctx.font = `500 ${detailSize}px monospace`;
        ctx.fillText(annotation, x, y + (labelSize || fontSize) * 0.45);
      }
    }

    ctx.restore();
  }

  _renderSearchHighlight(ctx, canvasW, canvasH) {
    if (!this.searchHighlight) return;

    const bounds = this.getElementBounds(this.searchHighlight.type, this.searchHighlight.index);
    if (!bounds) return;

    const pad = Math.max(6, Math.min(16, 8 + this.zoom * 0.45));
    const x = bounds.x - pad;
    const y = bounds.y - pad;
    const w = bounds.w + pad * 2;
    const h = bounds.h + pad * 2;

    if (x > canvasW || y > canvasH || x + w < 0 || y + h < 0) return;

    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.96)';
    ctx.lineWidth = Math.max(1.5, 1.8 + this.zoom * 0.08);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.max(6, Math.min(16, 10 + this.zoom * 0.2)));
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
    ctx.lineWidth = Math.max(1, 1.1 + this.zoom * 0.04);
    ctx.setLineDash([Math.max(3, 5 + this.zoom * 0.08), Math.max(2, 4 + this.zoom * 0.04)]);
    ctx.stroke();

    if (this.searchHighlight.bitIndex != null) {
      const anchor = this.bitIndexToCanvas(this.searchHighlight.bitIndex);
      if (anchor) {
        const markerRadius = Math.max(4, Math.min(12, this.pixelSize * this.zoom * 1.8));
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.92)';
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, markerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /** Update heat map tracking: mark changed bits with current step */
  updateHeatMap(changedBits, stepIndex) {
    if (!this.lastAccessStep) return;
    this.heatMapCurrentStep = stepIndex;
    for (const bit of changedBits) {
      if (bit < this.lastAccessStep.length) {
        this.lastAccessStep[bit] = stepIndex;
      }
    }
  }

  /** Rebuild heat map from scratch up to targetStep */
  rebuildHeatMap(steps, targetStep) {
    if (!this.lastAccessStep) return;
    this.lastAccessStep.fill(-1);
    for (let i = 0; i <= targetStep && i < steps.length; i++) {
      const s = steps[i];
      for (let j = 0; j < s.changedBits.length; j++) {
        const bit = s.changedBits[j];
        if (bit < this.lastAccessStep.length) {
          this.lastAccessStep[bit] = i;
        }
      }
    }
    this.heatMapCurrentStep = targetStep;
  }

  /** Compute heat color for a bit based on recency */
  _heatColor(bitIdx) {
    const lastStep = this.lastAccessStep[bitIdx];
    if (lastStep < 0) return [40, 40, 80]; // never accessed - dark blue-gray

    const age = this.heatMapCurrentStep - lastStep;
    if (age === 0) return [255, 50, 50];     // hot - red
    if (age <= 2) {
      // transition red -> orange
      const t = age / 2;
      return [255, Math.round(50 + t * 130), Math.round(50 * (1 - t))];
    }
    // transition orange -> blue over ~20 steps
    const t = Math.min(1, (age - 2) / 20);
    return [
      Math.round(255 * (1 - t) + 40 * t),
      Math.round(180 * (1 - t) + 80 * t),
      Math.round(0 * (1 - t) + 220 * t),
    ];
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

  render() {
    if (!this.ctx || !this.bitState || this.bitCount === 0) return;

    const C = this.colors;
    const ctx = this.ctx;
    const settledCtx = this.settledCtx;
    const cw = this.canvas.width / (window.devicePixelRatio || 1);
    const ch = this.canvas.height / (window.devicePixelRatio || 1);
    const layeredLoweredBits = this.loweredSetBits && !!settledCtx;

    if (layeredLoweredBits) {
      settledCtx.clearRect(0, 0, cw, ch);
      settledCtx.fillStyle = `rgb(${C.BACKGROUND.join(',')})`;
      settledCtx.fillRect(0, 0, cw, ch);
      ctx.clearRect(0, 0, cw, ch);
    } else {
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = `rgb(${C.BACKGROUND.join(',')})`;
      ctx.fillRect(0, 0, cw, ch);
      if (settledCtx) settledCtx.clearRect(0, 0, cw, ch);
    }

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

    // Font for labels (bit/byte labels need higher zoom)
    const bitLabelFontSize = Math.max(6, Math.min(10, 2 * this.zoom));
    const showBitLabels = this.showBitLabels && this.zoom >= 6;
    const showNumberLabels = this.showNumberLabels && this.zoom >= 6;
    const showByteLabels = labelBands.showByte;
    const showVectorLabels = labelBands.showVector;
    const vectorLabelY = vRow => this.panY + vRow * vRowHeight + 1;
    const byteLabelY = (vRowBaseY, byteTopY) => Math.max(vRowBaseY + labelBands.vector + 1, byteTopY - labelBands.byteFont - 1);

    for (let vRow = startVRow; vRow < endVRow; vRow++) {
      const vRowBaseY = this.panY + vRow * vRowHeight;
      const vRowDataY = vRowBaseY + labelH;
      if (vRowDataY + rowD.h < 0 || vRowBaseY > ch) continue;

      for (let vecInRow = 0; vecInRow < vecPerVRow; vecInRow++) {
        const globalVectorIndex = vRow * vecPerVRow + vecInRow;
        if (globalVectorIndex >= totalVectorSlots) break;

        const clIdx = Math.floor(globalVectorIndex / numVec);
        if (clIdx >= totalCacheLines) break;
        const vecIdxInCL = globalVectorIndex % numVec;
        const vecX = this.panX + vecInRow * (vecD.w + this._u64GapX());
        const rowBitStart = clIdx * bitsPerCacheLine;
        const rowBitStop = Math.min(rowBitStart + bitsPerCacheLine, this.bitCount);
        const u64Start = vecIdxInCL * this.vectorGroup;
        const bitStart = rowBitStart + u64Start * 64;
        const bitEnd = Math.min(bitStart + this.vectorGroup * 64 - 1, rowBitStop - 1, this.bitCount - 1);
        if (bitStart >= rowBitStop) continue;

        if (this.outlineEnabled && this.outlineTarget === 'cacheline' && vecIdxInCL === 0) {
          const remainingVectorsInCL = Math.max(0, numVec - vecIdxInCL);
          const remainingVectorsInRow = Math.max(0, vecPerVRow - vecInRow);
          const visibleVectors = Math.min(remainingVectorsInCL, remainingVectorsInRow);
          const visibleWidth = visibleVectors * vecD.w + Math.max(0, visibleVectors - 1) * this._u64GapX();
          const pad = this._outlinePadding();
          const topExtra = this._outlineTopExtra('cacheline');
          this._drawOutlineRect(ctx, vecX - pad, vRowDataY - pad - topExtra, visibleWidth + 2 * pad, rowD.h + 2 * pad + topExtra);
        }

        if (showVectorLabels) {
          const label = `${this._groupLabel(globalVectorIndex)} bits ${bitStart}-${bitEnd}`;
          const labelX = Math.round(vecX);
          const labelY = Math.round(vectorLabelY(vRow));
          if (labelX + vecD.w > 0 && labelX < cw && vRowBaseY >= -labelH && vRowBaseY < ch) {
            this._drawFittedLabel(ctx, label, labelX, labelY, Math.max(8, vecD.w - 2), labelBands.vectorFont, C.LABEL_COLOR, {
              minSize: 3.5,
              paddingX: 1,
              clipHeight: labelBands.vector,
            });
          }
        }

        const u64sPerCL = Math.max(1, Math.ceil(bitsPerCacheLine / 64));
        for (let intraIdx = 0; intraIdx < this.vectorGroup; intraIdx++) {
          const u64Idx = u64Start + intraIdx;
          if (u64Idx >= u64sPerCL) break;
          const u64BitStart = rowBitStart + u64Idx * 64;
          if (u64BitStart >= rowBitStop) break;

          const u64X = vecX + intraIdx * (u64D.w + vecD.intraGap);

          if (this.outlineEnabled && this.outlineTarget === 'vector' && intraIdx === 0) {
            const pad = this._outlinePadding();
            const topExtra = this._outlineTopExtra('vector');
            this._drawOutlineRect(ctx, vecX - pad, vRowDataY - pad - topExtra, vecD.w + 2 * pad, vecD.h + 2 * pad + topExtra);
          }

          for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
            const byteBitStart = u64BitStart + byteIdx * 8;
            if (byteBitStart >= rowBitStop) break;

            const bytePos = this._bytePosInU64(byteIdx);
            const byteX = u64X + bytePos.col * (byteD.w + this._byteGapX());
            const byteY = vRowDataY + bytePos.row * (byteD.h + this._byteGapY());

            if (this.outlineEnabled && this.outlineTarget === 'byte') {
              const pad = this._outlinePadding();
              const topExtra = this._outlineTopExtra('byte');
              this._drawOutlineRect(ctx, byteX - pad, byteY - pad - topExtra, byteD.w + 2 * pad, byteD.h + 2 * pad + topExtra);
            }

            // Byte label
            if (showByteLabels) {
              const byteLabel = `Byte ${this._byteLabelValue(byteBitStart)}`;
              this._drawFittedLabel(
                ctx,
                byteLabel,
                Math.round(byteX),
                Math.round(byteLabelY(vRowBaseY, byteY)),
                Math.max(8, byteD.w - 2),
                labelBands.byteFont,
                C.LABEL_COLOR,
                { minSize: 3.5, paddingX: 1, clipHeight: Math.max(7, labelBands.byteFont + 4) }
              );
            }

            for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
              const globalBit = byteBitStart + bitIdx;
              if (globalBit >= rowBitStop || globalBit >= this.bitCount) break;

              if (bitBl.grid3x3 && bitIdx >= 8) continue;

              const bitPos = this._bitPosInByte(bitIdx);
              const bitX = byteX + bitPos.col * this._bitStepX();
              const bitY = byteY + bitPos.row * this._bitStepY();

              if (bitX + px < 0 || bitX > cw || bitY + px < 0 || bitY > ch) continue;

              let color;
              const inFocusRange = this._isInFocusRange(globalBit);
              const targetHitCount = this.targetHitCounts?.get(globalBit) || 0;
              const isGhostMaskedBit = this.maskGhostBits?.has(globalBit) && this.bitState[globalBit];
              if (this.heatMapEnabled && this.lastAccessStep && !isGhostMaskedBit) {
                color = this._heatColor(globalBit);
              } else if (isGhostMaskedBit) {
                color = bitColors.cleared;
              } else if (this.changedBits.has(globalBit)) {
                color = changedColor;
              } else if (this.bitState[globalBit]) {
                color = bitColors.set;
              } else {
                color = bitColors.cleared;
              }

              const isSetBit = !!this.bitState[globalBit];
              const isChangedBit = this.changedBits.has(globalBit);
              const isSettledBit = isSetBit && !isChangedBit;
              const depthModeEnabled = this.loweredSetBits;
              const depthStrength = Math.max(0, Math.min(1.0, this.loweredDepthStrength ?? 0.8));
              const depthAngleRad = (Math.max(0, Math.min(90, this.loweredDepthAngle ?? 38)) * Math.PI) / 180;
              const depthScale = this.loweredSetBits3D ? 1.18 : 1;
              const baseDrop = px * Math.sin(depthAngleRad) * 1.05 * depthStrength * depthScale;
              const baseShiftX = px * Math.cos(depthAngleRad) * 0.55 * depthStrength * depthScale;
              const isDepthBucket = depthModeEnabled && (isSettledBit || !isSetBit || (isSetBit && isChangedBit));

              let sinkDrop = isDepthBucket ? baseDrop : 0;
              let sinkShiftX = isDepthBucket ? baseShiftX : 0;
              let sinkScale = isDepthBucket ? (this.loweredSetBits3D ? 0.56 : 0.68) : 1;

              if (isDepthBucket && isSetBit && isChangedBit) {
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
              const drawCtx = layeredLoweredBits && isDepthBucket ? settledCtx : ctx;

              if (layeredLoweredBits && isDepthBucket) {
                const topX = Math.round(bitX);
                const topY = Math.round(bitY);
                const topSize = Math.max(1, Math.round(px));

                // Side faces make the lowered layer read as depth instead of a flat duplicate.
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
                ctx.beginPath();
                ctx.moveTo(topX + topSize, topY);
                ctx.lineTo(topX + topSize, topY + topSize);
                ctx.lineTo(drawX + drawSize, drawY + drawSize);
                ctx.lineTo(drawX + drawSize, drawY);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
                ctx.beginPath();
                ctx.moveTo(topX, topY + topSize);
                ctx.lineTo(topX + topSize, topY + topSize);
                ctx.lineTo(drawX + drawSize, drawY + drawSize);
                ctx.lineTo(drawX, drawY + drawSize);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                settledCtx.save();
                settledCtx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.38)`;
                settledCtx.lineWidth = Math.max(0.3, Math.min(0.8, px * 0.055));
                settledCtx.strokeRect(
                  Math.round(drawX) + 0.5,
                  Math.round(drawY) + 0.5,
                  Math.max(1, Math.round(drawSize - 1)),
                  Math.max(1, Math.round(drawSize - 1))
                );
                if (isSetBit) {
                  settledCtx.fillStyle = 'rgba(0, 0, 0, 0.24)';
                  settledCtx.fillRect(
                    Math.round(drawX - Math.max(1, px * 0.08)),
                    Math.round(drawY - Math.max(1, px * 0.08)),
                    Math.max(1, Math.round(drawSize + Math.max(2, px * 0.16))),
                    Math.max(1, Math.round(drawSize + Math.max(2, px * 0.16)))
                  );
                  settledCtx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                  settledCtx.fillRect(drawX, drawY, drawSize, drawSize);
                  settledCtx.strokeStyle = `rgba(255, 255, 255, ${this.loweredSetBits3D ? '0.16' : '0.12'})`;
                  settledCtx.lineWidth = Math.max(0.3, Math.min(0.8, px * 0.055));
                  settledCtx.strokeRect(
                    Math.round(drawX) + 0.5,
                    Math.round(drawY) + 0.5,
                    Math.max(1, Math.round(drawSize - 1)),
                    Math.max(1, Math.round(drawSize - 1))
                  );
                }
                settledCtx.restore();

                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
                ctx.fillRect(
                  Math.round(bitX),
                  Math.round(bitY),
                  Math.max(1, Math.round(px)),
                  Math.max(1, Math.round(px))
                );
                ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},0.28)`;
                ctx.lineWidth = Math.max(0.3, Math.min(0.8, px * 0.055));
                ctx.strokeRect(
                  Math.round(bitX) + 0.5,
                  Math.round(bitY) + 0.5,
                  Math.max(1, Math.round(px - 1)),
                  Math.max(1, Math.round(px - 1))
                );
                ctx.restore();
              } else {
                drawCtx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                drawCtx.fillRect(drawX, drawY, drawSize, drawSize);
              }

              if (isGhostMaskedBit) {
                drawCtx.save();
                drawCtx.fillStyle = `rgba(${bitColors.set[0]},${bitColors.set[1]},${bitColors.set[2]},0.2)`;
                drawCtx.fillRect(
                  drawX,
                  drawY,
                  drawSize,
                  drawSize
                );
                drawCtx.strokeStyle = `rgba(${bitColors.set[0]},${bitColors.set[1]},${bitColors.set[2]},0.95)`;
                drawCtx.lineWidth = Math.max(0.7, Math.min(1.6, px * 0.12));
                drawCtx.strokeRect(
                  Math.round(drawX - 0.5), Math.round(drawY - 0.5),
                  Math.max(2, Math.round(drawSize + 1)), Math.max(2, Math.round(drawSize + 1))
                );
                drawCtx.restore();
              }

              if (inFocusRange) {
                ctx.fillStyle = 'rgba(96, 165, 250, 0.16)';
                ctx.fillRect(
                  Math.round(bitX - 1), Math.round(bitY - 1),
                  Math.max(2, Math.round(px + 2)), Math.max(2, Math.round(px + 2))
                );
              }

              const showTargetOutline = this.targetBits?.has(globalBit) && this.zoom >= 1.4 && px >= 2.5;
              if (showTargetOutline) {
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

              const dualLabelMode = showBitLabels && showNumberLabels;
              if (((dualLabelMode && px >= 22) || (!dualLabelMode && (showBitLabels || showNumberLabels) && px >= 12))) {
                const lines = [];
                if (showBitLabels) lines.push(String(this._bitLabelValue(globalBit, bitIdx)));
                if (showNumberLabels) lines.push(String(bitToNumber(globalBit, this.storageModel)));

                const dualLine = lines.length > 1;
                const zoomBoost = this.zoom > 20
                  ? 1 + Math.min(1, (this.zoom - 20) / 24)
                  : 1;
                const baseFontSize = dualLine
                  ? Math.max(5, Math.min(8, px * 0.2))
                  : Math.max(5, Math.min(9, px * 0.34));
                const fontSize = baseFontSize * zoomBoost;
                const centerX = Math.round(bitX + px / 2);
                const centerY = Math.round(bitY + px / 2);
                const textColor = this._labelTextColor(color);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (dualLine) {
                  ctx.fillStyle = textColor;
                  ctx.font = `${fontSize}px monospace`;
                  ctx.fillText(lines[0], centerX, Math.round(bitY + px * 0.32));
                  ctx.font = `italic ${Math.max(4.5, fontSize - 0.25)}px monospace`;
                  ctx.fillText(lines[1], centerX, Math.round(bitY + px * 0.7));
                } else {
                  ctx.fillStyle = textColor;
                  ctx.font = `${showNumberLabels ? 'italic ' : ''}${fontSize}px monospace`;
                  ctx.fillText(lines[0], centerX, centerY);
                }
                ctx.textAlign = 'start';
              }
            }
          }
        }
      }
      // No separator line â€” spacing between rows is transparent (background color)
    }

    this._renderMaskWriteOverlay(ctx);
    this._renderVectorTouchOrder(ctx);
    this._renderSearchHighlight(ctx, cw, ch);
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
        const alpha = local < 0 ? Math.max(0, 0.28 + local * 1.1) : Math.max(0.22, 0.84 - phase * 0.42);
        const inset = Math.max(2, Math.min(6, px * 0.7));
        const rx = bounds.x - inset;
        const ry = bounds.y - inset + yOffset;
        const rw = bounds.w + inset * 2;
        const rh = bounds.h + inset * 2;

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

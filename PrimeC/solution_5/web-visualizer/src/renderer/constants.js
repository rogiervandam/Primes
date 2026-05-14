/**
 * Renderer-level constants. These are pure data tables (palettes, layouts,
 * presets) used by `SieveRenderer` and by UI components that need to render
 * picker/preview tiles. Kept dependency-free so they can be imported by any
 * module without pulling in canvas code.
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
// item 342: each preset now also defines timelineColors, floaterBg, draggerColor, timelineBg for cohesive theming
export const COLOR_PRESETS = {
  default: {
    label: 'Default',
    setBit:       [76, 175, 80],   // green
    clearedBit:   [244, 67, 54],   // red
    unchangedBit: [158, 158, 158], // gray
    timelineColors: { events: '#4caf50', animation: '#2196f3', textColor: '#e8e8e8' },
    floaterBg:    '#0a0a0a',
    draggerColor: '#1a2e1a',
    timelineBg:   '#0a120a',       // dark green-black zone tint
  },
  highContrast: {
    label: 'High Contrast',
    setBit:       [0, 255, 0],     // bright green
    clearedBit:   [255, 0, 0],     // bright red
    unchangedBit: [0, 0, 0],       // black
    timelineColors: { events: '#00ff00', animation: '#0080ff', textColor: '#e8e8e8' },
    floaterBg:    '#000000',
    draggerColor: '#001a00',
    timelineBg:   '#000000',       // pure black zone
  },
  pastel: {
    label: 'Pastel',
    setBit:       [165, 214, 167], // pastel green
    clearedBit:   [239, 154, 154], // pastel red
    unchangedBit: [224, 224, 224], // pastel gray
    timelineColors: { events: '#a5d6a7', animation: '#90caf9', textColor: '#e8e8e8' },
    floaterBg:    '#1a1a2e',
    draggerColor: '#1a2e1a',
    timelineBg:   '#12101e',       // soft dark lavender zone
  },
  darkMode: {
    label: 'Dark Mode',
    setBit:       [129, 199, 132], // light green
    clearedBit:   [229, 115, 115], // light red
    unchangedBit: [66, 66, 66],    // dark gray
    timelineColors: { events: '#81c784', animation: '#64b5f6', textColor: '#e8e8e8' },
    floaterBg:    '#0a0a0a',
    draggerColor: '#1a2a1a',
    timelineBg:   '#080c08',       // near-black with green warmth
  },
  neon: {
    label: 'Neon',
    setBit:       [0, 255, 200],   // neon cyan-green
    clearedBit:   [255, 30, 120],  // neon pink-red
    unchangedBit: [50, 50, 80],    // dark indigo
    timelineColors: { events: '#00ffc8', animation: '#ff1e78', textColor: '#e8e8e8' },
    floaterBg:    '#050510',
    draggerColor: '#100028',
    timelineBg:   '#040510',       // deep indigo zone
  },
  ocean: {
    label: 'Ocean',
    setBit:       [0, 200, 220],   // teal
    clearedBit:   [255, 160, 50],  // amber
    unchangedBit: [60, 80, 110],   // deep slate blue
    timelineColors: { events: '#00c8dc', animation: '#ffa032', textColor: '#e8e8e8' },
    floaterBg:    '#060a14',
    draggerColor: '#0a1e2e',
    timelineBg:   '#040810',       // deep ocean navy zone
  },
  sunset: {
    label: 'Sunset',
    setBit:       [255, 180, 0],   // golden yellow
    clearedBit:   [180, 40, 120],  // deep rose
    unchangedBit: [90, 55, 80],    // muted plum
    timelineColors: { events: '#ffb400', animation: '#b428a0', textColor: '#e8e8e8' },
    floaterBg:    '#140808',
    draggerColor: '#28140a',
    timelineBg:   '#100508',       // deep wine-maroon zone
  },
  ice: {
    label: 'Ice',
    setBit:       [180, 230, 255], // pale ice blue
    clearedBit:   [255, 120, 80],  // coral
    unchangedBit: [120, 160, 200], // steel blue
    timelineColors: { events: '#b4e6ff', animation: '#ff7850', textColor: '#e8e8e8' },
    floaterBg:    '#060c14',
    draggerColor: '#0e1a28',
    timelineBg:   '#050a12',       // dark ice-blue zone
  },
  // ── item 343: 8 new presets ────────────────────────────────────────────────
  forest: {
    label: 'Forest',
    setBit:       [46, 125, 50],   // deep green
    clearedBit:   [255, 160, 0],   // amber
    unchangedBit: [66, 100, 60],   // muted olive
    timelineColors: { events: '#2e7d32', animation: '#ffa000', textColor: '#e8e8e8' },
    floaterBg:    '#071a05',
    draggerColor: '#0d2b09',
    timelineBg:   '#050e04',       // deep forest-dark zone
  },
  crimson: {
    label: 'Crimson',
    setBit:       [198, 40, 40],   // deep red
    clearedBit:   [25, 118, 210],  // royal blue
    unchangedBit: [80, 60, 60],    // dark muted red
    timelineColors: { events: '#c62828', animation: '#1976d2', textColor: '#e8e8e8' },
    floaterBg:    '#1a0505',
    draggerColor: '#2a0808',
    timelineBg:   '#120202',       // deep blood-red zone
  },
  arctic: {
    label: 'Arctic',
    setBit:       [0, 172, 193],   // cyan
    clearedBit:   [255, 87, 34],   // deep orange
    unchangedBit: [200, 230, 240], // light blue-grey
    timelineColors: { events: '#00acc1', animation: '#ff5722', textColor: '#e8e8e8' },
    floaterBg:    '#030e14',
    draggerColor: '#051a24',
    timelineBg:   '#02090e',       // deep arctic teal zone
  },
  lavender: {
    label: 'Lavender',
    setBit:       [123, 31, 162],  // deep purple
    clearedBit:   [245, 127, 23],  // deep orange
    unchangedBit: [180, 160, 200], // light purple-grey
    timelineColors: { events: '#7b1fa2', animation: '#f57f17', textColor: '#e8e8e8' },
    floaterBg:    '#0d0514',
    draggerColor: '#190828',
    timelineBg:   '#09040e',       // deep purple-black zone
  },
  ember: {
    label: 'Ember',
    setBit:       [230, 81, 0],    // deep orange
    clearedBit:   [1, 87, 155],    // deep blue
    unchangedBit: [120, 80, 50],   // warm brown-grey
    timelineColors: { events: '#e65100', animation: '#01579b', textColor: '#e8e8e8' },
    floaterBg:    '#140500',
    draggerColor: '#200800',
    timelineBg:   '#0e0300',       // deep ember-dark zone
  },
  chrome: {
    label: 'Chrome (Light)',
    setBit:       [33, 150, 243],  // blue
    clearedBit:   [244, 67, 54],   // red
    unchangedBit: [160, 160, 165], // medium grey
    timelineColors: { events: '#2196f3', animation: '#f44336', textColor: '#1a1a1a' },
    floaterBg:    '#e8e8e8',
    draggerColor: '#c0c0c0',
    chartActiveColor: '#1a1a1a',   // dark bar for light background
    timelineBg:   '#d8d8d8',       // light grey zone (light preset)
  },
  midnight: {
    label: 'Midnight',
    setBit:       [100, 181, 246], // light blue
    clearedBit:   [255, 138, 101], // light orange
    unchangedBit: [40, 60, 90],    // dark navy
    timelineColors: { events: '#64b5f6', animation: '#ff8a65', textColor: '#e8e8e8' },
    floaterBg:    '#010510',
    draggerColor: '#020a1e',
    timelineBg:   '#010314',       // deep midnight-blue zone
  },
  dawn: {
    label: 'Dawn (Light)',
    setBit:       [56, 142, 60],   // mid green
    clearedBit:   [211, 47, 47],   // mid red
    unchangedBit: [140, 140, 140], // medium grey
    timelineColors: { events: '#388e3c', animation: '#d32f2f', textColor: '#1a1a1a' },
    floaterBg:    '#f5f5f0',
    draggerColor: '#d0d0c8',
    chartActiveColor: '#1a1a1a',   // dark bar for light background
    timelineBg:   '#eeede8',       // warm cream zone (light preset)
  },
};

// Bit-in-byte layout modes
export const BIT_LAYOUTS = {
  '8x1': { label: '8 bits in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bits in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bits in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3×3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
};

// Byte-in-uint64 layout modes
export const BYTE_LAYOUTS = {
  '8x1': { label: '8 bytes in a row',  cols: 8, rows: 1, grid3x3: false },
  '4x2': { label: '4 bytes in a row',  cols: 4, rows: 2, grid3x3: false },
  '1x8': { label: '8 bytes in a column', cols: 1, rows: 8, grid3x3: false },
  '3x3': { label: '3×3 grid (center empty)', cols: 3, rows: 3, grid3x3: true },
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
export const GRID3X3_MAP = [0, 1, 2, 3, /*skip 4*/ 5, 6, 7, 8];

// Storage model definitions
export const STORAGE_MODELS = {
  half:  { label: 'Half (odd only)',   description: 'bit i → 2i+1' },
  full:  { label: 'Full (all)',        description: 'bit i → i' },
  wheel: { label: 'Wheel',            description: 'bit i → wheel30 residue' },
};

// 8-of-30 wheel factorization residues (used by `bitMath.js`).
export const WHEEL30_RESIDUES = [1, 7, 11, 13, 17, 19, 23, 29];
